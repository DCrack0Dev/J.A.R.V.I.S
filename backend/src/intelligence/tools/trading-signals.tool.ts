import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { RedisService } from '../../redis.service';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class TradingSignalsTool {
  private readonly logger = new Logger(TradingSignalsTool.name);

  constructor(
    private redis: RedisService,
    private prisma: PrismaService,
  ) {}

  async execute(userId: string, messageId: string, userMessage: string): Promise<string> {
    const startTime = Date.now();
    const symbol = this.extractSymbol(userMessage);
    const cacheKey = `trading:signals:${symbol}`;
    const redis = this.redis.getClient();

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        await this.logToolCall(userId, messageId, true, startTime);
        return cached;
      }

      // 1. Fetch Binance Candles
      const binanceRes = await axios.get(`https://api.binance.com/api/v3/klines`, {
        params: { symbol: `${symbol}USDT`, interval: '4h', limit: 100 },
      });
      const closes = binanceRes.data.map((k: any) => parseFloat(k[4]));

      // 2. Calculate RSI (14)
      const rsi = this.calculateRSI(closes, 14);
      const rsiSignal = rsi < 30 ? '⚠️ Oversold (Potential Buy)' : rsi > 70 ? '⚠️ Overbought (Potential Sell)' : 'Neutral';

      // 3. Calculate MACD (12, 26, 9)
      const { macdLine, signalLine, crossover } = this.calculateMACD(closes);

      // 4. Fetch Fear & Greed
      const fngRes = await axios.get('https://api.alternative.me/fng/?limit=1');
      const fng = fngRes.data.data[0];

      // 5. Format Output
      const timestamp = new Date().toLocaleTimeString();
      let output = `[TRADING SIGNALS — ${symbol}/USDT — ${timestamp}]\n`;
      output += `RSI (14, 4h): ${rsi.toFixed(2)} — ${rsiSignal}\n`;
      output += `MACD: ${crossover}\n`;
      output += `Fear & Greed: ${fng.value} — ${fng.value_classification}\n`;
      output += `Signal summary: ${this.getSummary(rsi, crossover, fng.value_classification)}\n`;
      output += `⚠️ Not financial advice. For informational purposes only.`;

      await redis.set(cacheKey, output, 'EX', 120); // 2 min
      await this.logToolCall(userId, messageId, false, startTime);
      
      return output;
    } catch (error) {
      this.logger.error(`TradingSignalsTool failed: ${error.message}`);
      await this.logToolCall(userId, messageId, false, startTime, 'FAILED');
      return `[TRADING SIGNALS — UNAVAILABLE]\nTrading signal data could not be fetched.`;
    }
  }

  private extractSymbol(message: string): string {
    const match = message.match(/(BTC|ETH|SOL|BNB|XRP|ADA|DOT|MATIC|LINK|LTC)/i);
    return match ? match[0].toUpperCase() : 'BTC';
  }

  private calculateRSI(closes: number[], period: number): number {
    let gains = 0;
    let losses = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
      const diff = closes[i] - closes[i - 1];
      if (diff >= 0) gains += diff;
      else losses -= diff;
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  private calculateMACD(closes: number[]) {
    const ema12 = this.calculateEMA(closes, 12);
    const ema26 = this.calculateEMA(closes, 26);
    
    const macdLine = ema12.map((v, i) => v - ema26[i]);
    const signalLine = this.calculateEMA(macdLine, 9);
    
    const lastMacd = macdLine[macdLine.length - 1];
    const prevMacd = macdLine[macdLine.length - 2];
    const lastSignal = signalLine[signalLine.length - 1];
    const prevSignal = signalLine[signalLine.length - 2];

    let crossover = 'Neutral';
    if (prevMacd <= prevSignal && lastMacd > lastSignal) crossover = 'Bullish crossover detected';
    if (prevMacd >= prevSignal && lastMacd < lastSignal) crossover = 'Bearish crossover detected';

    return { macdLine, signalLine, crossover };
  }

  private calculateEMA(data: number[], period: number): number[] {
    const k = 2 / (period + 1);
    const ema = [data[0]];
    for (let i = 1; i < data.length; i++) {
      ema.push(data[i] * k + ema[i - 1] * (1 - k));
    }
    return ema;
  }

  private getSummary(rsi: number, macd: string, fng: string): string {
    if (rsi > 70 && fng.includes('Greed')) return 'Caution — overbought conditions with extreme greed. Watch for reversal.';
    if (rsi < 30 && fng.includes('Fear')) return 'Potential opportunity — oversold conditions with extreme fear.';
    if (macd.includes('Bullish')) return 'Momentum shifting bullish. Watch for confirmation.';
    return 'Markets are showing mixed or neutral signals. Stick to the plan.';
  }

  private async logToolCall(userId: string, messageId: string, cacheHit: boolean, startTime: number, status: string = 'SUCCESS') {
    await this.prisma.toolCall.create({
      data: {
        userId,
        messageId,
        toolName: 'trading_signals',
        cacheHit,
        responseTimeMs: Date.now() - startTime,
        status,
      },
    });
  }
}
