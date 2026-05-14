import { Module } from '@nestjs/common';
import { JarvisService } from './jarvis.service';
import { JarvisController } from './jarvis.controller';
import { ContextModule } from '../context/context.module';
import { IntelligenceModule } from '../intelligence/intelligence.module';
import { ScheduleModule } from '../schedule/schedule.module';
import { WebSearchService } from './web-search.service';

@Module({
  imports: [ContextModule, IntelligenceModule, ScheduleModule],
  controllers: [JarvisController],
  providers: [JarvisService, WebSearchService],
  exports: [JarvisService],
})
export class JarvisModule {}
