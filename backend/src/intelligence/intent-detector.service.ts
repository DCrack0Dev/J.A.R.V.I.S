import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class IntentDetectorService {
  private readonly logger = new Logger(IntentDetectorService.name);
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
    });
  }

  async detectIntents(message: string): Promise<string[]> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'openai/gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an intent classifier. Given a user message, return ONLY a JSON array of tool names needed from this list:
- crypto_price (prices, charts, market cap, tokens)
- cyber_threats (CVEs, vulnerabilities, hacks, breaches)
- trading_signals (RSI, MACD, buy/sell signals, fear & greed, oversold, overbought)
- news (headlines, current events, latest news)
- weather (temperature, forecast, conditions)

Return [] if no live data is needed.
Return only the JSON array. No explanation.`,
          },
          { role: 'user', content: message },
        ],
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0].message.content;
      // The prompt asks for a JSON array, but since we use response_format: json_object, 
      // we might get {"intents": [...]} or just the array if the model follows strictly.
      // Let's handle both.
      const parsed = JSON.parse(content);
      const intents = Array.isArray(parsed) ? parsed : (parsed.intents || []);
      
      this.logger.log(`Detected intents for message "${message}": ${intents.join(', ')}`);
      return intents;
    } catch (error) {
      this.logger.error(`Intent detection failed: ${error.message}`);
      return [];
    }
  }
}
