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
    const feedbacks = await this.prisma.explanationFeedback.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: 10,
    });

    let adjustment = '';
    if (feedbacks.length >= 10) {
      const negativeCount = feedbacks.filter(f => f.rating === 'negative').length;
      const tooLongCount = feedbacks.filter(f => f.feedbackType === 'too_long').length;
      const tooShortCount = feedbacks.filter(f => f.feedbackType === 'too_short').length;

      if (negativeCount > 5) {
        adjustment = "\nNote: User finds recent explanations unclear. Use simpler analogies and more steps.";
      }
      if (tooLongCount > 5) {
        adjustment = "\nNote: User finds explanations too long. Be more concise while keeping all steps.";
      }
      if (tooShortCount > 5) {
        adjustment = "\nNote: User finds explanations too short. Provide more detail in each step.";
      }
    }

    return `
      [LEARNING STYLE INSTRUCTIONS]
      Always explain concepts using ALL of the following:
      1. Step-by-step breakdown — number each step clearly
      2. Real-world example or analogy — relate it to something familiar (crypto, trading, cybersecurity, or tech)
      3. Visual suggestion — if a diagram would help, describe it in text as: [DIAGRAM: <description>] so the frontend can render it
      ${adjustment}
    `;
  }

  async recordStyleFeedback(userId: string, messageId: string, rating: string, feedbackType: string) {
    return this.prisma.explanationFeedback.create({
      data: {
        userId,
        messageId,
        rating,
        feedbackType,
      },
    });
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
