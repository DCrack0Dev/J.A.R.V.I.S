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
import { ScheduleModule as NestScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    NestScheduleModule.forRoot(),
    JobsModule,
    GithubModule,
    ScheduleModule,
    ContextModule,
    LearningModule,
    RealTimeModule,
    FeedbackModule,
    JarvisModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
