import { Controller, Get, Param } from '@nestjs/common';
import { RealTimeIntelligenceService } from './intelligence.service';
import { PrismaService } from '../prisma.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('intelligence')
@Controller('intelligence')
export class IntelligenceController {
  constructor(
    private readonly intelligenceService: RealTimeIntelligenceService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('latest')
  @ApiOperation({ summary: 'Get the latest intelligence data from all providers' })
  async getLatest() {
    const [crypto, cyber, trading, news] = await Promise.all([
      this.intelligenceService.getCryptoData(),
      this.intelligenceService.getCyberThreats(),
      this.intelligenceService.getTradingSignals(),
      this.intelligenceService.getLatestNews(),
    ]);

    return { crypto, cyber, trading, news };
  }

  @Get('status')
  @ApiOperation({ summary: 'Get the status of all live data tools' })
  async getStatus() {
    const tools = ['crypto_price', 'cyber_threats', 'trading_signals', 'news', 'weather'];
    const status = await Promise.all(tools.map(async (name) => {
      const lastCall = await this.prisma.toolCall.findFirst({
        where: { toolName: name },
        orderBy: { timestamp: 'desc' },
      });
      return {
        name,
        lastFetched: lastCall?.timestamp,
        status: lastCall?.status || 'IDLE',
      };
    }));
    return status;
  }
}
