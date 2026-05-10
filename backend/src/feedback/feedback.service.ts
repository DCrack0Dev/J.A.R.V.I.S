import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class FeedbackService {
  constructor(private prisma: PrismaService) {}

  async recordFeedback(userId: string, messageId: string, rating: string, comment?: string, topic?: string) {
    const id = userId || '00000000-0000-0000-0000-000000000001';
    return this.prisma.jarvisFeedback.create({
      data: {
        userId: id,
        messageId,
        rating,
        comment,
        topic,
      }
    });
  }

  async getFeedbackStats() {
    return this.prisma.jarvisFeedback.groupBy({
      by: ['rating', 'topic'],
      _count: {
        _all: true
      }
    });
  }
}
