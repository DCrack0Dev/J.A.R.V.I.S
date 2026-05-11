import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class ResponseStyleService {
  private readonly logger = new Logger(ResponseStyleService.name);

  constructor(
    private prisma: PrismaService,
    @InjectQueue('diagram-rendering') private diagramQueue: Queue,
  ) {}

  async getLearningStyleBlock(userId: string) {
    // We could potentially fetch user-specific preferences here
    // but the prompt requires this specific block for the owner
    return `
      [LEARNING STYLE INSTRUCTIONS]
      Always explain concepts using ALL of the following:
      1. Step-by-step breakdown — number each step clearly
      2. Real-world example or analogy — relate it to something familiar (crypto, trading, cybersecurity, or tech)
      3. Visual suggestion — if a diagram would help, describe it in text as: [DIAGRAM: <description>] so the frontend can render it
    `;
  }

  async triggerDiagramRender(userId: string, description: string) {
    await this.diagramQueue.add('render-diagram', { userId, description });
  }

  async getDiagramFromCache(description: string) {
    return this.prisma.diagramCache.findFirst({
      where: { description },
      orderBy: { renderedAt: 'desc' },
    });
  }
}
