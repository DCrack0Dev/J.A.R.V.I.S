import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { RedisService } from '../../redis.service';
import { PrismaService } from '../../prisma.service';
import OpenAI from 'openai';

@Injectable()
export class NewsTool {
  private readonly logger = new Logger(NewsTool.name);
  private openai: OpenAI;

  constructor(
    private redis: RedisService,
    private prisma: PrismaService,
  ) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
    });
  }

  async execute(userId: string, messageId: string, userMessage: string): Promise<string> {
    const startTime = Date.now();
    try {
      const topic = await this.extractTopic(userMessage);
      const cacheKey = `news:${topic}:latest`;
      const redis = this.redis.getClient();

      const cached = await redis.get(cacheKey);
      if (cached) {
        await this.logToolCall(userId, messageId, true, startTime);
        return cached;
      }

      const apiKey = process.env.GNEWS_API_KEY;
      if (!apiKey) throw new Error('GNEWS_API_KEY not configured');

      const res = await axios.get(`https://gnews.io/api/v4/search`, {
        params: { q: topic, lang: 'en', max: 5, token: apiKey },
      });

      const timestamp = new Date().toLocaleTimeString();
      let output = `[LATEST NEWS — ${topic.toUpperCase()} — ${timestamp}]\n`;
      
      res.data.articles.forEach((art: any, i: number) => {
        const timeAgo = this.getTimeAgo(art.publishedAt);
        output += `${i + 1}. "${art.title}" — ${art.source.name} — ${timeAgo}\n`;
      });

      await redis.set(cacheKey, output, 'EX', 600); // 10 min
      await this.logToolCall(userId, messageId, false, startTime);
      
      return output;
    } catch (error) {
      this.logger.error(`NewsTool failed: ${error.message}`);
      await this.logToolCall(userId, messageId, false, startTime, 'FAILED');
      return `[LATEST NEWS — UNAVAILABLE]\nNews data could not be fetched.`;
    }
  }

  private async extractTopic(message: string): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'openai/gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `What topic is this news query about? Return one of: crypto, cybersecurity, AI, markets, general. Return only the word.`,
          },
          { role: 'user', content: message },
        ],
      });
      return response.choices[0].message.content.trim().toLowerCase();
    } catch (e) {
      return 'general';
    }
  }

  private getTimeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours === 0) return 'Just now';
    if (hours === 1) return '1h ago';
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  private async logToolCall(userId: string, messageId: string, cacheHit: boolean, startTime: number, status: string = 'SUCCESS') {
    await this.prisma.toolCall.create({
      data: {
        userId,
        messageId,
        toolName: 'news',
        cacheHit,
        responseTimeMs: Date.now() - startTime,
        status,
      },
    });
  }
}
