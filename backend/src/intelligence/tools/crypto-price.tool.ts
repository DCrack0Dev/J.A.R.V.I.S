import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { RedisService } from '../../redis.service';
import { PrismaService } from '../../prisma.service';
import OpenAI from 'openai';

@Injectable()
export class CryptoPriceTool {
  private readonly logger = new Logger(CryptoPriceTool.name);
  private openai: OpenAI;

  constructor(
    private redis: RedisService,
    private prisma: PrismaService,
  ) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
    });
  }

  async execute(userId: string, messageId: string, userMessage: string): Promise<string> {
    const startTime = Date.now();
    try {
      // 1. Extract coin IDs
      const coinIds = await this.extractCoinIds(userMessage);
      const cacheKey = `crypto:prices:${coinIds.join('-')}`;
      const redis = this.redis.getClient();
      
      // 2. Check cache
      const cached = await redis.get(cacheKey);
      if (cached) {
        await this.logToolCall(userId, messageId, true, startTime);
        return cached;
      }

      // 3. Fetch from CoinGecko
      const ids = coinIds.join(',');
      const res = await axios.get(`https://api.coingecko.com/api/v3/simple/price`, {
        params: {
          ids,
          vs_currencies: 'usd',
          include_24hr_change: true,
          include_market_cap: true,
          include_24hr_vol: true,
        },
      });

      // 4. Format output
      const timestamp = new Date().toLocaleTimeString();
      let output = `[CRYPTO PRICES — ${timestamp}]\n`;
      
      for (const [id, data] of Object.entries(res.data)) {
        const symbol = id.toUpperCase().substring(0, 3); // Simplified for format
        const price = (data as any).usd.toLocaleString();
        const change = (data as any).usd_24h_change.toFixed(1);
        const mcap = this.formatNumber((data as any).usd_market_cap);
        const vol = this.formatNumber((data as any).usd_24h_vol);
        output += `${id.toUpperCase()}: $${price} | ${change}% (24h) | MCap: $${mcap} | Vol: $${vol}\n`;
      }

      // 5. Cache and Log
      await redis.set(cacheKey, output, 'EX', 60);
      await this.logToolCall(userId, messageId, false, startTime);
      
      return output;
    } catch (error) {
      this.logger.error(`CryptoPriceTool failed: ${error.message}`);
      await this.logToolCall(userId, messageId, false, startTime, 'FAILED');
      return `[CRYPTO PRICES — UNAVAILABLE]\nLive crypto data could not be fetched. Jarvis will answer from last known data if available.`;
    }
  }

  private async extractCoinIds(message: string): Promise<string[]> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'openai/gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Extract all cryptocurrency names or symbols from this message. Return only a JSON array of CoinGecko coin IDs (e.g. bitcoin, ethereum, solana). Return [] if none found.`,
          },
          { role: 'user', content: message },
        ],
        response_format: { type: 'json_object' },
      });

      const parsed = JSON.parse(response.choices[0].message.content);
      const ids = parsed.ids || parsed.coinIds || [];
      return ids.length > 0 ? ids : ['bitcoin', 'ethereum', 'solana', 'binancecoin'];
    } catch (e) {
      return ['bitcoin', 'ethereum', 'solana', 'binancecoin'];
    }
  }

  private formatNumber(num: number): string {
    if (num >= 1e12) return (num / 1e12).toFixed(1) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    return num.toLocaleString();
  }

  private async logToolCall(userId: string, messageId: string, cacheHit: boolean, startTime: number, status: string = 'SUCCESS') {
    await this.prisma.toolCall.create({
      data: {
        userId,
        messageId,
        toolName: 'crypto_price',
        cacheHit,
        responseTimeMs: Date.now() - startTime,
        status,
      },
    });
  }
}
