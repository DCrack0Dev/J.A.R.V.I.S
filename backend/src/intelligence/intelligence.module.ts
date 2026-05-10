import { Module } from '@nestjs/common';
import { RealTimeIntelligenceService } from './intelligence.service';
import { IntelligenceController } from './intelligence.controller';
import { IntelligenceGateway } from './intelligence.gateway';
import { PrismaService } from '../prisma.service';
import { RedisService } from '../redis.service';
import { BullModule } from '@nestjs/bullmq';
import { SessionStateService } from '../jarvis/session-state.service';
import { IntentDetectorService } from './intent-detector.service';
import { PromptAssemblerService } from './prompt-assembler.service';
import { ToolDispatcherService } from './tool-dispatcher.service';
import { CryptoPriceTool } from './tools/crypto-price.tool';
import { CyberThreatsTool } from './tools/cyber-threats.tool';
import { TradingSignalsTool } from './tools/trading-signals.tool';
import { NewsTool } from './tools/news.tool';
import { WeatherTool } from './tools/weather.tool';
import { ToolProcessor } from './tool.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'intelligence-cron',
    }),
    BullModule.registerQueue({
      name: 'tool-execution',
    }),
  ],
  controllers: [IntelligenceController],
  providers: [
    RealTimeIntelligenceService, 
    IntelligenceGateway, 
    PrismaService, 
    RedisService,
    SessionStateService,
    IntentDetectorService,
    PromptAssemblerService,
    ToolDispatcherService,
    CryptoPriceTool,
    CyberThreatsTool,
    TradingSignalsTool,
    NewsTool,
    WeatherTool,
    ToolProcessor,
  ],
  exports: [
    RealTimeIntelligenceService, 
    IntelligenceGateway,
    IntentDetectorService,
    PromptAssemblerService,
    ToolDispatcherService,
    CryptoPriceTool,
    CyberThreatsTool,
    TradingSignalsTool,
    NewsTool,
    WeatherTool,
  ],
})
export class IntelligenceModule {}
