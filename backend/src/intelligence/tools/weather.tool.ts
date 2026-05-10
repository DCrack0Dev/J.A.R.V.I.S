import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { RedisService } from '../../redis.service';
import { PrismaService } from '../../prisma.service';
import OpenAI from 'openai';

@Injectable()
export class WeatherTool {
  private readonly logger = new Logger(WeatherTool.name);
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
      const city = await this.extractCity(userMessage);
      const cacheKey = `weather:${city.toLowerCase()}`;
      const redis = this.redis.getClient();

      const cached = await redis.get(cacheKey);
      if (cached) {
        await this.logToolCall(userId, messageId, true, startTime);
        return cached;
      }

      const apiKey = process.env.OPENWEATHERMAP_API_KEY;
      if (!apiKey) throw new Error('OPENWEATHERMAP_API_KEY not configured');

      const res = await axios.get(`https://api.openweathermap.org/data/2.5/weather`, {
        params: { q: city, appid: apiKey, units: 'metric' },
      });

      const data = res.data;
      const timestamp = new Date().toLocaleTimeString();
      let output = `[WEATHER — ${city} — ${timestamp}]\n`;
      output += `Now: ${Math.round(data.main.temp)}°C, ${data.weather[0].description}, Humidity: ${data.main.humidity}%\n`;
      output += `Today: High ${Math.round(data.main.temp_max)}°C / Low ${Math.round(data.main.temp_min)}°C\n`;

      await redis.set(cacheKey, output, 'EX', 1800); // 30 min
      await this.logToolCall(userId, messageId, false, startTime);
      
      return output;
    } catch (error) {
      this.logger.error(`WeatherTool failed: ${error.message}`);
      await this.logToolCall(userId, messageId, false, startTime, 'FAILED');
      return `[WEATHER — UNAVAILABLE]\nWeather data could not be fetched.`;
    }
  }

  private async extractCity(message: string): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'openai/gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Extract the city from this message. Return only the city name. If none found, return "Durban".`,
          },
          { role: 'user', content: message },
        ],
      });
      return response.choices[0].message.content.trim();
    } catch (e) {
      return 'Durban';
    }
  }

  private async logToolCall(userId: string, messageId: string, cacheHit: boolean, startTime: number, status: string = 'SUCCESS') {
    await this.prisma.toolCall.create({
      data: {
        userId,
        messageId,
        toolName: 'weather',
        cacheHit,
        responseTimeMs: Date.now() - startTime,
        status,
      },
    });
  }
}
