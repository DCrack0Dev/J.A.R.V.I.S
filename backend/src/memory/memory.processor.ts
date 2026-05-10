import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PermanentMemoryService } from './memory.service';
import { PrismaService } from '../prisma.service';
import OpenAI from 'openai';
import { Logger } from '@nestjs/common';

@Processor('memory-summarization')
export class MemoryProcessor extends WorkerHost {
  private readonly logger = new Logger(MemoryProcessor.name);
  private openai: OpenAI;

  constructor(
    private memoryService: PermanentMemoryService,
    private prisma: PrismaService,
  ) {
    super();
    this.openai = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
    });
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { userId, sessionId } = job.data;
    this.logger.log(`Starting summarization for session ${sessionId}`);

    // 1. Fetch all messages for this session
    const records = await this.prisma.memoryRecord.findMany({
      where: { sessionId },
      orderBy: { timestamp: 'asc' },
    });

    if (records.length === 0) return;

    const conversationText = records
      .map((r) => `${r.role.toUpperCase()}: ${r.content}`)
      .join('\n');

    // 2. Extract key facts, decisions, preferences, etc.
    const prompt = `
      Analyze the following conversation and extract:
      1. Key facts mentioned by the owner
      2. Decisions made
      3. Topics discussed
      4. Preferences revealed
      5. Corrections given to JARVIS

      Conversation:
      ${conversationText}

      Respond ONLY with a valid JSON object:
      {
        "summary": "A concise summary of the key takeaways",
        "tags": ["tag1", "tag2"],
        "facts": ["fact1", "fact2"],
        "preferences": ["pref1", "pref2"]
      }
    `;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'openai/gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      });

      const analysis = JSON.parse(response.choices[0].message.content);
      
      // 3. Index the memory
      const fullSummary = `${analysis.summary}. Facts: ${analysis.facts.join(', ')}. Preferences: ${analysis.preferences.join(', ')}.`;
      await this.memoryService.indexMemory(userId, sessionId, fullSummary, analysis.tags);

      this.logger.log(`Successfully indexed memory for session ${sessionId}`);
    } catch (error) {
      this.logger.error(`Summarization failed for session ${sessionId}: ${error.message}`);
      throw error;
    }
  }
}
