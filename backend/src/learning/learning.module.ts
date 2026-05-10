import { Module } from '@nestjs/common';
import { LearningService } from './learning.service';
import { LearningController } from './learning.controller';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [LearningController],
  providers: [LearningService, PrismaService],
  exports: [LearningService],
})
export class LearningModule {}
