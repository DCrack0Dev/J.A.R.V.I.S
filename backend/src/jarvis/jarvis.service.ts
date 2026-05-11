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
    const basePersona = `You are JARVIS, Tebogo's elite, all-purpose personal AI assistant. You are highly intelligent, proactive, and capable of discussing ANY topic—from deep technical engineering to philosophy, trading, or daily life. While you are a polymath, your TOP priority is Tebogo's time and schedule management. You act as his second brain, ensuring he stays on track with his routine while providing expert-level insights on whatever he asks.`;
    
    const systemPrompt = `
      ${basePersona}
      
      ${scheduleContext}
      
      ${styleBlock}
      
      ${intelligenceBlock}
      
      Rules:
      - Always keep Tebogo's current schedule in mind. If he's supposed to be working, keep answers extremely concise unless he asks for deep detail.
      - Be proactive: if a block is ending soon, remind him.
      - Sound like a high-level engineer and mentor: precise, calm, and sophisticated.
      - If a diagram is helpful, use the [DIAGRAM: description] tag.
    `;

    // 5. Call OpenAI GPT-4o with assembled prompt + conversation history
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
