import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { RedisService } from '../redis.service';

@Injectable()
export class SessionStateService {
  private readonly logger = new Logger(SessionStateService.name);

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

  async onSleep(userId: string, sessionId: string, history: any[], context: any) {
    const redis = this.redisService.getClient();
    
    // Save history and context to Redis
    await redis.set(`session:${userId}:history`, JSON.stringify(history));
    await redis.set(`session:${userId}:context`, JSON.stringify(context));
    await redis.set(`session:${userId}:lastSleptAt`, new Date().toISOString());
    
    // Update Prisma session status
    await this.prisma.jarvisSession.upsert({
      where: { id: sessionId }, // Assuming sessionId is the ID
      update: {
        status: 'DORMANT',
        lastSleptAt: new Date(),
      },
      create: {
        id: sessionId,
        userId,
        status: 'DORMANT',
        lastSleptAt: new Date(),
      },
    });

    this.logger.log(`Session ${sessionId} for user ${userId} is now DORMANT`);
  }

  async onWake(userId: string, sessionId: string) {
    const redis = this.redisService.getClient();
    
    const historyJson = await redis.get(`session:${userId}:history`);
    const contextJson = await redis.get(`session:${userId}:context`);
    const lastSleptAtStr = await redis.get(`session:${userId}:lastSleptAt`);
    
    const history = historyJson ? JSON.parse(historyJson) : [];
    const context = contextJson ? JSON.parse(contextJson) : {};
    const lastSleptAt = lastSleptAtStr ? new Date(lastSleptAtStr) : null;
    
    let reorientation = '';
    if (lastSleptAt) {
      const now = new Date();
      const elapsedMinutes = Math.floor((now.getTime() - lastSleptAt.getTime()) / 60000);
      
      if (elapsedMinutes > 30) {
        reorientation = `You were last speaking with the owner about ${context.lastTopic || 'general topics'}. You went dormant ${elapsedMinutes} minutes ago. Resume naturally.`;
      }
    }

    // Update Prisma session status
    await this.prisma.jarvisSession.update({
      where: { id: sessionId },
      data: {
        status: 'ACTIVE',
        lastActiveAt: new Date(),
        totalSessions: { increment: 1 },
      },
    });

    this.logger.log(`Session ${sessionId} for user ${userId} is now ACTIVE`);

    return { history, context, reorientation };
  }

  async getAudioSettings(userId: string) {
    return this.prisma.userAudioSettings.findUnique({
      where: { userId },
    });
  }

  async updateAudioSettings(userId: string, settings: any) {
    return this.prisma.userAudioSettings.upsert({
      where: { userId },
      update: settings,
      create: { userId, ...settings },
    });
  }
}
