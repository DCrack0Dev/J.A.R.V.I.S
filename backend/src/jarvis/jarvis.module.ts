import { Module } from '@nestjs/common';
import { JarvisService } from './jarvis.service';
import { JarvisController } from './jarvis.controller';
import { ContextModule } from '../context/context.module';
import { LearningModule } from '../learning/learning.module';
import { RealTimeModule } from '../realtime/realtime.module';

@Module({
  imports: [ContextModule, LearningModule, RealTimeModule],
  controllers: [JarvisController],
  providers: [JarvisService],
})
export class JarvisModule {}
