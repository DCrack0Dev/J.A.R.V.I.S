import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import OpenAI from 'openai';

@Injectable()
export class PermanentMemoryService {
  private readonly logger = new Logger(PermanentMemoryService.name);
  private openai: OpenAI;

  constructor(private prisma: PrismaService) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY, // Using OpenRouter for embeddings too if possible, or direct OpenAI
      baseURL: 'https://openrouter.ai/api/v1',
    });
  }

  async recordMessage(userId: string, sessionId: string, role: string, content: string) {
    return this.prisma.memoryRecord.create({
      data: {
        userId,
        sessionId,
        role,
        content,
      },
    });
  }

  async recordCorrection(userId: string, originalFact: string, correctedFact: string) {
    return this.prisma.memoryCorrection.create({
      data: {
        userId,
        originalFact,
        correctedFact,
      },
    });
  }

  async getRelevantMemories(userId: string, query: string, limit: number = 5) {
    try {
      const embedding = await this.getEmbedding(query);
      
      // pgvector cosine similarity search: 1 - (embedding <=> column)
      const memories = await this.prisma.$queryRawUnsafe<any[]>(`
        SELECT id, summary, tags, (1 - (embedding <=> '[${embedding.join(',')}]'::vector)) as similarity
        FROM memory_index
        WHERE user_id = '${userId}'::uuid
        ORDER BY similarity DESC
        LIMIT ${limit}
      `);

      return memories;
    } catch (error) {
      this.logger.error(`Failed to get relevant memories: ${error.message}`);
      return [];
    }
  }

  async askJarvisMemory(userId: string, query: string) {
    const relevant = await this.getRelevantMemories(userId, query, 5);
    if (relevant.length === 0) return "I don't recall anything specific about that yet.";
    
    return `Based on what I remember:\n${relevant.map(m => `- ${m.summary}`).join('\n')}`;
  }

  async deleteMemory(memoryId: string) {
    return this.prisma.memoryIndex.delete({
      where: { id: memoryId },
    });
  }

  async forgetBeforeDate(userId: string, date: Date) {
    return this.prisma.memoryIndex.deleteMany({
      where: {
        userId,
        createdAt: { lt: date },
      }
    });
  }

  async getMemoryStats(userId: string) {
    const totalFacts = await this.prisma.memoryIndex.count({ where: { userId } });
    const latest = await this.prisma.memoryIndex.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    const oldest = await this.prisma.memoryIndex.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    return {
      totalFacts,
      latestMemory: latest?.createdAt,
      oldestMemory: oldest?.createdAt,
    };
  }

  async indexMemory(userId: string, sessionId: string, summary: string, tags: string[]) {
    try {
      const embedding = await this.getEmbedding(summary);
      
      // We use $executeRaw for the embedding column since it's "Unsupported" in Prisma
      await this.prisma.$executeRawUnsafe(`
        INSERT INTO memory_index (id, user_id, summary, tags, embedding, source_session_id, created_at)
        VALUES (gen_random_uuid(), '${userId}'::uuid, $1, $2, '[${embedding.join(',')}]'::vector, '${sessionId}', now())
      `, summary, tags);
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to index memory: ${error.message}`);
      return false;
    }
  }

  private async getEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });
      return response.data[0].embedding;
    } catch (error) {
      this.logger.error(`Embedding generation failed: ${error.message}`);
      throw error;
    }
  }

  async getMemoryTimeline(userId: string) {
    return this.prisma.memoryRecord.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });
  }

  async searchMemories(userId: string, query: string) {
    return this.prisma.memoryIndex.findMany({
      where: {
        userId,
        OR: [
          { summary: { contains: query, mode: 'insensitive' } },
          { tags: { has: query } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
