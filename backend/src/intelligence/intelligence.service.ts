import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import axios from 'axios';
import { RedisService } from '../redis.service';
import { PrismaService } from '../prisma.service';
import { IntelligenceGateway } from './intelligence.gateway';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class RealTimeIntelligenceService implements OnModuleInit {
  private readonly logger = new Logger(RealTimeIntelligenceService.name);

  constructor(
    private redis: RedisService,
    private prisma: PrismaService,
    private gateway: IntelligenceGateway,
    @InjectQueue('intelligence-cron') private intelligenceQueue: Queue,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing Intelligence Cron Job...');
    // Add repeatable job (every 15 minutes)
    await this.intelligenceQueue.add(
      'proactive-check',
      {},
      {
        repeat: {
          pattern: '*/15 * * * *', // Every 15 minutes
        },
        removeOnComplete: true,
      },
    );
  }

  // PROVIDER 1: CRYPTO
  async getCryptoData() {
    const redis = this.redis.getClient();
    const cached = await redis.get('intelligence:crypto');
    if (cached) return JSON.parse(cached);

    try {
      const res = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true');
      const data = res.data;
      await redis.set('intelligence:crypto', JSON.stringify(data), 'EX', 60);
      return data;
    } catch (e) {
      this.logger.error(`Crypto provider failed: ${e.message}`);
      return null;
    }
  }

  // PROVIDER 2: CYBERSECURITY
  async getCyberThreats() {
    const redis = this.redis.getClient();
    const cached = await redis.get('intelligence:cyber');
    if (cached) return JSON.parse(cached);

    try {
      // Using CISA Known Exploited Vulnerabilities
      const res = await axios.get('https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json');
      const latest = res.data.vulnerabilities.slice(0, 5);
      await redis.set('intelligence:cyber', JSON.stringify(latest), 'EX', 900);
      return latest;
    } catch (e) {
      this.logger.error(`Cyber provider failed: ${e.message}`);
      return null;
    }
  }

  // PROVIDER 3: TRADING SIGNALS
  async getTradingSignals() {
    const redis = this.redis.getClient();
    const cached = await redis.get('intelligence:trading');
    if (cached) return JSON.parse(cached);

    try {
      // Simplified: Using Binance public ticker for 24h change as a basic signal
      const res = await axios.get('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT');
      const data = {
        symbol: 'BTCUSDT',
        priceChangePercent: res.data.priceChangePercent,
        lastPrice: res.data.lastPrice,
      };
      await redis.set('intelligence:trading', JSON.stringify(data), 'EX', 120);
      return data;
    } catch (e) {
      this.logger.error(`Trading provider failed: ${e.message}`);
      return null;
    }
  }

  // PROVIDER 4: NEWS
  async getLatestNews() {
    const redis = this.redis.getClient();
    const cached = await redis.get('intelligence:news');
    if (cached) return JSON.parse(cached);

    const apiKey = process.env.NEWS_API_KEY;
    if (!apiKey) return null;

    try {
      const res = await axios.get(`https://newsapi.org/v2/top-headlines?category=technology&apiKey=${apiKey}&pageSize=5`);
      const data = res.data.articles;
      await redis.set('intelligence:news', JSON.stringify(data), 'EX', 600);
      return data;
    } catch (e) {
      this.logger.error(`News provider failed: ${e.message}`);
      return null;
    }
  }

  async getIntelligenceBlock() {
    const [crypto, cyber, trading, news] = await Promise.all([
      this.getCryptoData(),
      this.getCyberThreats(),
      this.getTradingSignals(),
      this.getLatestNews(),
    ]);

    const timestamp = new Date().toLocaleTimeString();
    
    let block = `[LIVE INTELLIGENCE — as of ${timestamp}]\n`;
    if (crypto) {
      block += `- BTC: $${crypto.bitcoin.usd} (${crypto.bitcoin.usd_24h_change.toFixed(1)}% 24h)\n`;
      block += `- ETH: $${crypto.ethereum.usd} (${crypto.ethereum.usd_24h_change.toFixed(1)}% 24h)\n`;
    }
    if (cyber && cyber[0]) {
      block += `- Top CVE: ${cyber[0].cveID} — ${cyber[0].vulnerabilityName}\n`;
    }
    if (trading) {
      block += `- BTC/USDT Signal: ${parseFloat(trading.priceChangePercent) > 0 ? 'Bullish' : 'Bearish'} (${trading.priceChangePercent}% 24h)\n`;
    }
    if (news && news[0]) {
      block += `- Top News: "${news[0].title}"\n`;
    }

    return block;
  }

  async checkProactiveAlerts(userId: string) {
    // This would be called by a BullMQ cron job
    const crypto = await this.getCryptoData();
    if (crypto && Math.abs(crypto.bitcoin.usd_24h_change) > 5) {
      const alert = {
        provider: 'crypto',
        message: `Bitcoin moved ${crypto.bitcoin.usd_24h_change.toFixed(1)}% in the last 24 hours!`,
        severity: 'high',
      };
      await this.saveAndSendAlert(userId, alert);
    }

    const cyber = await this.getCyberThreats();
    if (cyber && cyber[0]) {
      const alert = {
        provider: 'cyber',
        message: `New critical vulnerability detected: ${cyber[0].cveID}`,
        severity: 'critical',
      };
      await this.saveAndSendAlert(userId, alert);
    }
  }

  private async saveAndSendAlert(userId: string, alert: any) {
    const saved = await this.prisma.intelligenceAlert.create({
      data: {
        userId,
        provider: alert.provider,
        message: alert.message,
        severity: alert.severity,
      },
    });
    this.gateway.sendAlert(userId, saved);
  }
}
