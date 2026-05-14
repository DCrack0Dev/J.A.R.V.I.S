import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JobsModule } from './jobs/jobs.module';
import { GitHubModule } from './github/github.module';
import { ScheduleModule } from './schedule/schedule.module';
import { ContextModule } from './context/context.module';
import { RealTimeModule } from './realtime/realtime.module';
import { JarvisModule } from './jarvis/jarvis.module';
import { StyleModule } from './style/style.module';
import { IntelligenceModule } from './intelligence/intelligence.module';
import { ScheduleModule as NestScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    NestScheduleModule.forRoot(),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
      },
    }),
    JobsModule,
    GitHubModule,
    ScheduleModule,
    ContextModule,
    RealTimeModule,
    JarvisModule,
    StyleModule,
    IntelligenceModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
