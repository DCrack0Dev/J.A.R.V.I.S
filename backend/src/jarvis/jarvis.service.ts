import { Injectable, Logger } from '@nestjs/common';
import { ContextService } from '../context/context.service';
import { LearningService } from '../learning/learning.service';
import { RealTimeDataService } from '../realtime/realtime.service';
import axios from 'axios';

@Injectable()
export class JarvisService {
  private readonly logger = new Logger(JarvisService.name);
  private readonly openRouterUrl = 'https://openrouter.ai/api/v1/chat/completions';
  private readonly apiKey = process.env.OPENROUTER_API_KEY;

  constructor(
    private contextService: ContextService,
    private learningService: LearningService,
    private realTimeService: RealTimeDataService,
  ) {}

  async processQuery(userId: string, sessionId: string, query: string) {
    // 1. Add to context and analyze
    const contextAnalysis = await this.contextService.addMessageToContext(sessionId, { role: 'user', content: query });
    
    // 2. Get personality profile
    const personalityPrompt = await this.learningService.getPersonalizedPrompt(userId);
    
    // 3. Detect and fetch live data
    const liveData = await this.realTimeService.detectAndFetch(query);
    const liveDataBlock = liveData ? `\n[LIVE DATA]\n${JSON.stringify(liveData)}\n` : '';

    // 4. Get recent conversation history
    const history = await this.contextService.getSessionContext(sessionId);
    
    // 5. Assemble final prompt
    const systemPrompt = `
      You are JARVIS, Tebogo's elite personal AI assistant. 
      ${personalityPrompt}
      
      [CONTEXT]
      Current Topic: ${contextAnalysis?.topic || 'General'}
      Sentiment: ${contextAnalysis?.sentiment || 'Neutral'}
      
      ${liveDataBlock}
      
      Rules:
      - Keep replies short (2-5 sentences).
      - Sound like a mentor and high-level engineer.
      - Use the live data if provided.
    `;

    try {
      const response = await axios.post(
        this.openRouterUrl,
        {
          model: 'openai/gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            ...history.slice(-5), // Last 5 exchanges for immediate context
            { role: 'user', content: query }
          ]
        },
        {
          headers: { 
            Authorization: `Bearer ${this.apiKey}`,
            'X-Title': 'Jarvis Unified Pipeline'
          },
        },
      );

      const reply = response.data.choices[0].message.content;
      
      // 6. Add assistant response to context
      await this.contextService.addMessageToContext(sessionId, { role: 'assistant', content: reply });

      return {
        reply,
        analysis: contextAnalysis,
        liveDataUsed: !!liveData,
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error(`Unified pipeline failed: ${error.message}`);
      return { reply: "I encountered an error processing your request.", analysis: null };
    }
  }
}
