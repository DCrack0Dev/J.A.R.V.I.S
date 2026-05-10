import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { RealTimeIntelligenceService } from './intelligence.service';
import { Logger } from '@nestjs/common';

@Processor('intelligence-cron')
export class IntelligenceProcessor extends WorkerHost {
  private readonly logger = new Logger(IntelligenceProcessor.name);

  constructor(private intelligenceService: RealTimeIntelligenceService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log('Running proactive alert check...');
    const userId = '00000000-0000-0000-0000-000000000001'; // Default owner ID
    await this.intelligenceService.checkProactiveAlerts(userId);
  }
}
