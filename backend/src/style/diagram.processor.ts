import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma.service';
import OpenAI from 'openai';
import { Logger } from '@nestjs/common';

@Processor('diagram-rendering')
export class DiagramProcessor extends WorkerHost {
  private readonly logger = new Logger(DiagramProcessor.name);
  private openai: OpenAI;

  constructor(private prisma: PrismaService) {
    super();
    this.openai = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': 'https://j-a-r-v-i-s-liard.vercel.app',
        'X-Title': 'Jarvis Diagram Architect',
      },
    });
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { userId, description } = job.data;
    this.logger.log(`Generating diagram for: ${description}`);

    const prompt = `
      Generate a Mermaid.js diagram code based on the following description:
      "${description}"

      Rules:
      - Use standard Mermaid.js syntax (e.g., graph TD, sequenceDiagram, etc.)
      - Respond ONLY with the mermaid code.
      - Do not include markdown code blocks.
    `;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'openai/gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
      });

      const mermaidCode = response.choices[0].message.content?.trim() || '';
      
      if (mermaidCode) {
        await this.prisma.diagramCache.create({
          data: {
            userId,
            description,
            mermaidCode,
          },
        });
        this.logger.log(`Successfully generated diagram for: ${description}`);
      }
      return mermaidCode;
    } catch (error) {
      this.logger.error(`Diagram generation failed: ${error.message}`);
      throw error;
    }
  }
}
