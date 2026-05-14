import { Injectable, Logger } from '@nestjs/common';
import { tavily } from '@tavily/core';

@Injectable()
export class WebSearchService {
  private readonly logger = new Logger(WebSearchService.name);
  private client: ReturnType<typeof tavily>;

  constructor() {
    this.client = tavily({ apiKey: process.env.TAVILY_API_KEY });
  }

  async search(query: string): Promise<string> {
    try {
      this.logger.log(`Searching web for: "${query}"`);
      const response = await this.client.search(query, {
        searchDepth: 'basic',
        maxResults: 5,
        includeAnswer: true,
      });

      // If Tavily gives a direct AI answer, use it
      if (response.answer) {
        return `Search Answer: ${response.answer}\n\nSources:\n${response.results
          .map((r) => `- ${r.title}: ${r.content.slice(0, 200)}...`)
          .join('\n')}`;
      }

      // Otherwise combine top results
      return response.results
        .map((r) => `[${r.title}]\n${r.content.slice(0, 300)}`)
        .join('\n\n');
    } catch (error) {
      this.logger.error('Web search failed:', error.message);
      return `Search unavailable: ${error.message}`;
    }
  }
}
