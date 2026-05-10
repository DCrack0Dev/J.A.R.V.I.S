import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { RedisService } from '../redis.service';
import axios from 'axios';

@Injectable()
export class ContextService {
  private readonly logger = new Logger(ContextService.name);
  private readonly openRouterUrl = 'https://openrouter.ai/api/v1/chat/completions';
  private readonly apiKey = process.env.OPENROUTER_API_KEY;

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async getSessionContext(sessionId: string) {
    const redis = this.redis.getClient();
    const key = `context:${sessionId}`;
    const messages = await redis.lrange(key, 0, 19);
    return messages.map(m => JSON.parse(m));
  }

  async addMessageToContext(sessionId: string, message: { role: string; content: string }) {
    const redis = this.redis.getClient();
    const key = `context:${sessionId}`;
    
    await redis.rpush(key, JSON.stringify(message));
    await redis.ltrim(key, -20, -1);
    await redis.expire(key, 7200); // 2 hours

    // Analyze intent/sentiment/entities if it's a user message
    if (message.role === 'user') {
      return await this.analyzeAndStoreContext(sessionId, message.content);
    }
  }

  private async analyzeAndStoreContext(sessionId: string, content: string) {
    const prompt = `
      Analyze the following user message and extract:
      1. Intent (short label, e.g., "ask_weather", "greet", "schedule_change")
      2. Sentiment (one of: calm, curious, urgent, frustrated, happy)
      3. Entities (array of names, dates, topics, or technical terms)
      4. Topic (short string describing the main topic)

      Message: "${content}"

      Respond ONLY with a valid JSON:
      {
        "intent": "...",
        "sentiment": "...",
        "entities": ["...", "..."],
        "topic": "..."
      }
    `;

    try {
      const response = await axios.post(
        this.openRouterUrl,
        {
          model: 'openai/gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' }
        },
        {
          headers: { 
            Authorization: `Bearer ${this.apiKey}`,
            'X-Title': 'Jarvis Context Engine'
          },
        },
      );

      const analysis = JSON.parse(response.data.choices[0].message.content);
      
      // Ensure session exists
      let session = await this.prisma.conversationSession.findUnique({ where: { id: sessionId } });
      if (!session) {
        session = await this.prisma.conversationSession.create({
          data: { id: sessionId }
        });
      }

      // Store in DB
      await this.prisma.contextSnapshot.create({
        data: {
          sessionId: sessionId,
          messageIndex: (await this.redis.getClient().llen(`context:${sessionId}`)) - 1,
          intentLabel: analysis.intent,
          sentiment: analysis.sentiment,
          entities: analysis.entities,
        }
      });

      // Update session tags
      await this.prisma.conversationSession.update({
        where: { id: sessionId },
        data: {
          topicTags: {
            push: analysis.topic
          }
        }
      });

      return analysis;
    } catch (error) {
      this.logger.error(`Context analysis failed: ${error.message}`);
      return null;
    }
  }

  async getLatestAnalysis(sessionId: string) {
    return this.prisma.contextSnapshot.findFirst({
      where: { sessionId },
      orderBy: { timestamp: 'desc' }
    });
  }

  async getSessionSummary(sessionId: string) {
    return this.prisma.conversationSession.findUnique({
      where: { id: sessionId },
      include: {
        snapshots: {
          orderBy: { timestamp: 'desc' },
          take: 5
        }
      }
    });
  }
}
