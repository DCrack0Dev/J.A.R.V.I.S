import { Injectable, Logger } from '@nestjs/common';
import { ContextService } from '../context/context.service';
import { ResponseStyleService } from '../style/style.service';
import { RealTimeIntelligenceService } from '../intelligence/intelligence.service';
import { IntelligenceGateway } from '../intelligence/intelligence.gateway';
import axios from 'axios';

@Injectable()
export class JarvisService {
  private readonly logger = new Logger(JarvisService.name);
  private readonly openRouterUrl = 'https://openrouter.ai/api/v1/chat/completions';
  private readonly apiKey = process.env.OPENROUTER_API_KEY;

  constructor(
    private contextService: ContextService,
    private styleService: ResponseStyleService,
    private intelligenceService: RealTimeIntelligenceService,
    private gateway: IntelligenceGateway,
  ) {}

  async processQuery(userId: string, sessionId: string, query: string) {
    this.logger.log(`Processing query for user ${userId}, session ${sessionId}`);

    // 1. ResponseStyleService — load LearningStyleBlock
    const styleBlock = await this.styleService.getLearningStyleBlock(userId);

    // 2. DataRouter — detect if live data is needed, fetch in parallel
    const intelligenceBlock = await this.intelligenceService.getIntelligenceBlock();

    // 3. Assemble final OpenAI system prompt
    const basePersona = `You are JARVIS, Tebogo's elite personal AI assistant. You are more than a coach; you are his partner in his journey to master Cybersecurity, Trading, and Dev.`;
    
    const systemPrompt = `
      ${basePersona}
      
      ${styleBlock}
      
      ${intelligenceBlock}
      
      Rules:
      - Keep replies short (2-5 sentences).
      - Sound like a mentor and high-level engineer.
      - If a diagram is helpful, use the [DIAGRAM: description] tag.
    `;

    // 4. Call OpenAI GPT-4o with assembled prompt + conversation history
    const history = await this.contextService.getSessionContext(sessionId);
    
    try {
      const response = await axios.post(
        this.openRouterUrl,
        {
          model: 'openai/gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            ...history.slice(-10),
            { role: 'user', content: query }
          ],
          stream: true,
        },
        {
          headers: { 
            Authorization: `Bearer ${this.apiKey}`,
            'X-Title': 'Jarvis Unified Pipeline'
          },
          responseType: 'stream',
        },
      );

      let fullReply = '';
      
      response.data.on('data', (chunk: Buffer) => {
        const lines = chunk.toString().split('\n').filter(line => line.trim() !== '');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.replace('data: ', '');
            if (data === '[DONE]') break;
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0].delta?.content || '';
              if (content) {
                fullReply += content;
                this.gateway.streamJarvisResponse(content);
              }
            } catch (e) {}
          }
        }
      });

      return new Promise((resolve) => {
        response.data.on('end', async () => {
          if (fullReply.includes('[DIAGRAM:')) {
            const match = fullReply.match(/\[DIAGRAM:\s*(.+?)\]/);
            if (match) {
              await this.styleService.triggerDiagramRender(userId, match[1]);
            }
          }
          
          resolve({ reply: fullReply });
        });
      });

    } catch (error) {
      this.logger.error(`Unified pipeline failed: ${error.message}`);
      return { reply: "I encountered an error. My systems are currently undergoing maintenance." };
    }
  }
}
