import { Module } from '@nestjs/common';
import { JarvisService } from './jarvis.service';
import { JarvisController } from './jarvis.controller';
import { ContextModule } from '../context/context.module';
import { LearningModule } from '../learning/learning.module';
import { RealTimeModule } from '../realtime/realtime.module';
import { MemoryModule } from '../memory/memory.module';
import { StyleModule } from '../style/style.module';
import { IntelligenceModule } from '../intelligence/intelligence.module';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    ContextModule, 
    LearningModule, 
    RealTimeModule, 
    MemoryModule, 
    StyleModule, 
    IntelligenceModule,
    BullModule.registerQueue({
      name: 'memory-summarization',
    }),
  ],
  controllers: [JarvisController],
  providers: [JarvisService],
})
export class JarvisModule {}
