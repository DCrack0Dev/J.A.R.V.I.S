import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { CryptoPriceTool } from './tools/crypto-price.tool';
import { CyberThreatsTool } from './tools/cyber-threats.tool';
import { TradingSignalsTool } from './tools/trading-signals.tool';
import { NewsTool } from './tools/news.tool';
import { WeatherTool } from './tools/weather.tool';
import { Logger } from '@nestjs/common';

@Processor('tool-execution')
export class ToolProcessor extends WorkerHost {
  private readonly logger = new Logger(ToolProcessor.name);

  constructor(
    private cryptoTool: CryptoPriceTool,
    private cyberTool: CyberThreatsTool,
    private tradingTool: TradingSignalsTool,
    private newsTool: NewsTool,
    private weatherTool: WeatherTool,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<string> {
    const { toolName, userId, messageId, message } = job.data;
    this.logger.log(`Executing tool ${toolName} for message ${messageId}`);

    switch (toolName) {
      case 'crypto_price':
        return this.cryptoTool.execute(userId, messageId, message);
      case 'cyber_threats':
        return this.cyberTool.execute(userId, messageId);
      case 'trading_signals':
        return this.tradingTool.execute(userId, messageId, message);
      case 'news':
        return this.newsTool.execute(userId, messageId, message);
      case 'weather':
        return this.weatherTool.execute(userId, messageId, message);
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }
}
