import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { RedisService } from '../redis.service';

@Injectable()
export class RealTimeDataService {
  private readonly logger = new Logger(RealTimeDataService.name);

  constructor(private redis: RedisService) {}

  async getCryptoPrice(symbol: string) {
    const redis = this.redis.getClient();
    const cacheKey = `crypto:${symbol}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    try {
      // Mapping common symbols to coingecko IDs
      const symbolMap: Record<string, string> = {
        'btc': 'bitcoin',
        'eth': 'ethereum',
        'sol': 'solana',
        'xrp': 'ripple',
        'gold': 'pax-gold'
      };
      const id = symbolMap[symbol.toLowerCase()] || symbol.toLowerCase();
      
      const res = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd&include_24hr_change=true`);
      const data = res.data;
      await redis.set(cacheKey, JSON.stringify(data), 'EX', 60);
      return data;
    } catch (e) {
      this.logger.error(`Failed to fetch crypto (${symbol}): ${e.message}`);
      return null;
    }
  }

  async getNews(topic: string) {
    const redis = this.redis.getClient();
    const cacheKey = `news:${topic}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const apiKey = process.env.NEWS_API_KEY;
    if (!apiKey) return null;

    try {
      const res = await axios.get(`https://newsapi.org/v2/everything?q=${topic}&apiKey=${apiKey}&pageSize=5`);
      const data = res.data.articles;
      await redis.set(cacheKey, JSON.stringify(data), 'EX', 600);
      return data;
    } catch (e) {
      this.logger.error(`Failed to fetch news (${topic}): ${e.message}`);
      return null;
    }
  }

  async getWeather(location: string) {
    const redis = this.redis.getClient();
    const cacheKey = `weather:${location}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) return null;

    try {
      const res = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${apiKey}&units=metric`);
      const data = res.data;
      await redis.set(cacheKey, JSON.stringify(data), 'EX', 1800);
      return data;
    } catch (e) {
      this.logger.error(`Failed to fetch weather (${location}): ${e.message}`);
      return null;
    }
  }

  async detectAndFetch(query: string) {
    const results: Record<string, any> = {};
    
    // Simple regex-based detection for now
    if (/price of (btc|eth|sol|xrp|gold|bitcoin|ethereum)/i.test(query)) {
      const match = query.match(/price of (btc|eth|sol|xrp|gold|bitcoin|ethereum)/i);
      if (match) {
        results.crypto = await this.getCryptoPrice(match[1]);
      }
    }

    if (/news (on|about) (.+)/i.test(query)) {
      const match = query.match(/news (on|about) (.+)/i);
      if (match) {
        results.news = await this.getNews(match[2]);
      }
    }

    if (/weather (in|at) (.+)/i.test(query)) {
      const match = query.match(/weather (in|at) (.+)/i);
      if (match) {
        results.weather = await this.getWeather(match[2]);
      }
    }

    return Object.keys(results).length > 0 ? results : null;
  }
}
