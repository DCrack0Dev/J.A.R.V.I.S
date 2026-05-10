import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JobsModule } from './jobs/jobs.module';
import { GithubModule } from './github/github.module';
import { ScheduleModule } from './schedule/schedule.module';
import { ContextModule } from './context/context.module';
import { LearningModule } from './learning/learning.module';
import { RealTimeModule } from './realtime/realtime.module';
import { FeedbackModule } from './feedback/feedback.module';
import { JarvisModule } from './jarvis/jarvis.module';
import { MemoryModule } from './memory/memory.module';
import { StyleModule } from './style/style.module';
import { IntelligenceModule } from './intelligence/intelligence.module';
import { ScheduleModule as NestScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    NestScheduleModule.forRoot(),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
      },
    }),
    JobsModule,
    GithubModule,
    ScheduleModule,
    ContextModule,
    LearningModule,
    RealTimeModule,
    FeedbackModule,
    JarvisModule,
    MemoryModule,
    StyleModule,
    IntelligenceModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
