import { Injectable, Logger } from '@nestjs/common';
import { ContextService } from '../context/context.service';
import { ResponseStyleService } from '../style/style.service';
import { RealTimeIntelligenceService } from '../intelligence/intelligence.service';
import { IntelligenceGateway } from '../intelligence/intelligence.gateway';
import { ScheduleService } from '../schedule/schedule.service';
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
    private scheduleService: ScheduleService,
  ) {}

  async processQuery(userId: string, sessionId: string, query: string) {
    this.logger.log(`Processing query for user ${userId}, session ${sessionId}`);

    // 1. Get Today's Schedule context
    const fullSchedule = await this.scheduleService.getFullSchedule();
    const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const todayKey = days[new Date().getDay()];
    const todaySchedule = fullSchedule[todayKey] || { theme: 'General', blocks: [] };
    
    const now = new Date();
    const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
    
    const currentBlock = todaySchedule.blocks.find((b: any) => {
      const [sh, sm] = b.start.split(':').map(Number);
      const [eh, em] = b.end.split(':').map(Number);
      const start = sh * 60 + sm;
      const end = eh * 60 + em;
      return currentTimeMinutes >= start && currentTimeMinutes < end;
    });

    const scheduleContext = `
      [TODAY'S SCHEDULE: ${todayKey.toUpperCase()}]
      Theme: ${todaySchedule.theme}
      Current Time: ${now.toLocaleTimeString()}
      Current Block: ${currentBlock ? `${currentBlock.label} (${currentBlock.start} - ${currentBlock.end}) - ${currentBlock.detail}` : 'Between blocks'}
      Upcoming blocks: ${todaySchedule.blocks.filter((b: any) => {
        const [sh, sm] = b.start.split(':').map(Number);
        return (sh * 60 + sm) > currentTimeMinutes;
      }).map((b: any) => `${b.start}: ${b.label}`).join(', ')}
    `;

    // 2. ResponseStyleService — load LearningStyleBlock
    const styleBlock = await this.styleService.getLearningStyleBlock(userId);

    // 3. DataRouter — detect if live data is needed, fetch in parallel
    const intelligenceBlock = await this.intelligenceService.getIntelligenceBlock();

    // 4. Assemble final OpenAI system prompt
    const basePersona = `You are JARVIS, Tebogo's elite, all-purpose personal AI assistant. You are a polymath with expert-level knowledge in Cybersecurity, Trading, Software Engineering, Philosophy, and general history. 
    
    Your primary directive is to be Tebogo's most intelligent partner. You never ignore a question. You provide deep, insightful, and sophisticated answers to ANY topic he raises.
    
    Your secondary directive is to prioritize his schedule. You act as his second brain, keeping track of his time. If he asks a general question, answer it brilliantly, but then briefly mention if he is currently in a scheduled block and how much time remains. If he is supposed to be working on something critical, keep your response high-density and efficient.`;
    
    const systemPrompt = `
      ${basePersona}
      
      ${scheduleContext}
      
      ${styleBlock}
      
      ${intelligenceBlock}
      
      Rules:
      - NEVER ignore the user's question. Answer it fully and intelligently.
      - After answering, provide a "Status Check" if he is in a scheduled block.
      - Sound like a high-level engineer and mentor: precise, calm, and sophisticated.
      - Use [DIAGRAM: description] for complex concepts.
      - If he is supposed to be in a "House Cleaning" or "Rest" block, you can be more conversational. If he is in a "Deep Work" or "IT Cert" block, be more concise.
    `;

    // 5. Call OpenAI GPT-4o with assembled prompt + conversation history
    const history = await this.contextService.getSessionContext(sessionId);
    
    try {
      this.logger.log(`Calling OpenRouter with model: anthropic/claude-3.5-sonnet`);
      const response = await axios.post(
        this.openRouterUrl,
        {
          model: 'anthropic/claude-3.5-sonnet',
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
            'X-Title': 'Jarvis Unified Pipeline',
            'HTTP-Referer': 'http://localhost:3000', // Added for OpenRouter
            'Content-Type': 'application/json'
          },
          responseType: 'stream',
          timeout: 30000, // 30 second timeout
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
