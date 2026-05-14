import { Injectable, Logger } from '@nestjs/common';
import { ContextService } from '../context/context.service';
import { RealTimeIntelligenceService } from '../intelligence/intelligence.service';
import { IntelligenceGateway } from '../intelligence/intelligence.gateway';
import { ScheduleService } from '../schedule/schedule.service';
import OpenAI from 'openai';

@Injectable()
export class JarvisService {
  private readonly logger = new Logger(JarvisService.name);
  private openai: OpenAI;

  constructor(
    private contextService: ContextService,
    private intelligenceService: RealTimeIntelligenceService,
    private gateway: IntelligenceGateway,
    private scheduleService: ScheduleService,
  ) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': 'https://j-a-r-v-i-s-liard.vercel.app',
        'X-Title': 'Jarvis Personal Assistant',
      },
    });
  }

  /**
   * Builds the system context by fetching schedule and intelligence data.
   * Gracefully handles failures to ensure AI always has some context.
   */
  private async buildContext() {
    const now = new Date();
    const currentDateTime = now.toLocaleString();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });

    let scheduleContext = 'Schedule data unavailable';
    let intelligenceContext = '';

    // Fetch Schedule Data
    try {
      const fullSchedule = await this.scheduleService.getFullSchedule();
      const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      const todayKey = days[now.getDay()];
      const todaySchedule = fullSchedule[todayKey] || { theme: 'General', blocks: [] };
      
      const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
      
      const currentBlock = todaySchedule.blocks.find((b: any) => {
        const [sh, sm] = b.start.split(':').map(Number);
        const [eh, em] = b.end.split(':').map(Number);
        const start = sh * 60 + sm;
        const end = eh * 60 + em;
        return currentTimeMinutes >= start && currentTimeMinutes < end;
      });

      scheduleContext = `
        Day: ${currentDay}
        Theme: ${todaySchedule.theme}
        Current Block: ${currentBlock ? `${currentBlock.label} (${currentBlock.start} - ${currentBlock.end}) - ${currentBlock.detail}` : 'Between blocks'}
        Upcoming blocks: ${todaySchedule.blocks.filter((b: any) => {
          const [sh, sm] = b.start.split(':').map(Number);
          return (sh * 60 + sm) > currentTimeMinutes;
        }).map((b: any) => `${b.start}: ${b.label}`).join(', ')}
      `;
      this.logger.log('Schedule context built successfully');
    } catch (error) {
      this.logger.warn(`Failed to fetch schedule data: ${error.message}`);
    }

    // Fetch Intelligence Data
    try {
      intelligenceContext = await this.intelligenceService.getIntelligenceBlock();
      this.logger.log('Intelligence context built successfully');
    } catch (error) {
      this.logger.warn(`Failed to fetch intelligence data: ${error.message}`);
    }

    return {
      currentDateTime,
      currentDay,
      scheduleContext,
      intelligenceContext,
    };
  }

  /**
   * Main query method for JARVIS.
   * Assembles context and calls OpenAI GPT-4o.
   */
  async query(userId: string, sessionId: string, message: string) {
    this.logger.log(`JARVIS query received for session ${sessionId}`);

    try {
      const { currentDateTime, currentDay, scheduleContext, intelligenceContext } = await this.buildContext();

      const systemPrompt = `You are JARVIS — a highly intelligent, witty, and deeply capable personal assistant modeled after Tony Stark's AI. You are not limited to schedules. You are an expert in: mathematics, coding (all languages), cybersecurity, trading & finance, fitness, nutrition, productivity, motivation, life advice, general knowledge, science, and anything the user asks. 
 
    Your personality: 
    - Confident, sharp, and direct — never vague or generic 
    - Warm but efficient — like a brilliant friend who respects your time  
    - Occasionally witty, never sarcastic in a mean way 
    - You call the user 'Boss' naturally, not in every sentence 
    - You give REAL answers — not 'I suggest you consult a professional' 
    - For coding: write actual working code with explanations 
    - For math: solve it step by step showing your work 
    - For motivation: be genuine and specific, not generic affirmations 
    - For schedule questions: use the provided schedule context 
    - For market/crypto: use the provided live intelligence data if available 
 
    Current date and time: ${currentDateTime} 
    Current day: ${currentDay} 
 
    SCHEDULE CONTEXT (use this when answering schedule questions): 
    ${scheduleContext} 
 
    LIVE INTELLIGENCE (use if relevant, ignore if not): 
    ${intelligenceContext} 
 
    If live intelligence is unavailable, answer without it — never mention that systems are offline.`;

      const history = await this.contextService.getSessionContext(sessionId);

      this.logger.log('Calling OpenAI GPT-4o...');
      const response = await this.openai.chat.completions.create({
        model: 'openai/gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          ...history.slice(-10),
          { role: 'user', content: message }
        ],
        stream: true,
        max_tokens: 50,
      });

      let fullReply = '';
      
      for await (const chunk of response) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullReply += content;
          this.gateway.streamJarvisResponse(content);
        }
      }

      this.logger.log('JARVIS response complete');
      return { reply: fullReply };

    } catch (error) {
      this.logger.error(`JARVIS query failed: ${error.message}`);
      console.error('Full Error:', error);
      return { 
        reply: "Apologies, Boss. It seems my core communication link is experiencing some interference. I'm still here, but I might need a moment to recalibrate." 
      };
    }
  }
}
