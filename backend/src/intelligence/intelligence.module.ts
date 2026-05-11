import { Module } from '@nestjs/common';
import { RealTimeIntelligenceService } from './intelligence.service';
import { IntelligenceGateway } from './intelligence.gateway';
import { PrismaService } from '../prisma.service';
import { RedisService } from '../redis.service';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'intelligence-cron',
    }),
  ],
  providers: [RealTimeIntelligenceService, IntelligenceGateway, PrismaService, RedisService],
  exports: [RealTimeIntelligenceService, IntelligenceGateway],
})
export class IntelligenceModule {}
