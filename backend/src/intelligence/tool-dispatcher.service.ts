import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class ToolDispatcherService {
  private readonly logger = new Logger(ToolDispatcherService.name);

  constructor(
    @InjectQueue('tool-execution') private toolQueue: Queue,
  ) {}

  async dispatch(intents: string[], userId: string, messageId: string, message: string): Promise<string[]> {
    const jobs = intents.map(intent => 
      this.toolQueue.add(intent, { toolName: intent, userId, messageId, message })
    );

    const results = await Promise.all(jobs);
    return Promise.all(results.map(job => job.waitUntilFinished(new (require('bullmq').QueueEvents)('tool-execution'))));
  }
}
