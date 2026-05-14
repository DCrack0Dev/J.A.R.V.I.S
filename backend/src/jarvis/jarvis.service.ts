import { Injectable, Logger } from '@nestjs/common';
import { ContextService } from '../context/context.service';
import { RealTimeIntelligenceService } from '../intelligence/intelligence.service';
import { IntelligenceGateway } from '../intelligence/intelligence.gateway';
import { ScheduleService } from '../schedule/schedule.service';
import { WebSearchService } from './web-search.service';
import OpenAI from 'openai';

// --- Tool definitions for OpenRouter --- 
const TOOLS: any[] = [ 
  { 
    type: 'function', 
    function: { 
      name: 'search_web', 
      description: 
        'Search the internet for current, real-time information. Use this for: news, sports results, prices, recent events, weather, anything that may have changed recently.', 
      parameters: { 
        type: 'object', 
        properties: { 
          query: { 
            type: 'string', 
            description: 'The search query to look up', 
          }, 
        }, 
        required: ['query'], 
      }, 
    }, 
  }, 
];

@Injectable()
export class JarvisService {
  private readonly logger = new Logger(JarvisService.name);
  private openai: OpenAI;

  constructor(
    private contextService: ContextService,
    private intelligenceService: RealTimeIntelligenceService,
    private gateway: IntelligenceGateway,
    private scheduleService: ScheduleService,
    private webSearchService: WebSearchService,
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
   * Assembles context and calls OpenAI GPT-4o-mini with tool support.
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
 
    SCHEDULE CONTEXT: 
    ${scheduleContext} 
 
    LIVE INTELLIGENCE: 
    ${intelligenceContext} 

    WEB SEARCH CAPABILITY:
    You have access to a web search tool. Use it whenever the user asks about:
    - Current events, news, sports scores, or real-time rankings.
    - Live prices (crypto, stocks, products) that are not in the intelligence context.
    - Recent software releases, updates, or tech launches.
    - Anything time-sensitive that occurred after your training data.
    
    When you search, present the findings naturally. Do not say "according to my search" or "as of my training data." Just give the answer.
 
    If live intelligence is unavailable, answer without it — never mention that systems are offline.`;

      const history = await this.contextService.getSessionContext(sessionId);
      const messages: any[] = [
        { role: 'system', content: systemPrompt },
        ...history.slice(-10),
        { role: 'user', content: message }
      ];

      this.logger.log('Calling OpenRouter (GPT-4o-mini) with tool detection...');
      
      // First call (non-streaming) to check for tool calls
      const firstResponse = await this.openai.chat.completions.create({
        model: 'openai/gpt-4o-mini',
        messages,
        tools: TOOLS,
        tool_choice: 'auto',
        max_tokens: 100, // Keep it low for tool detection
      });

      const firstChoice = firstResponse.choices[0];

      // If the model wants to use a tool
      if (firstChoice.message.tool_calls && firstChoice.message.tool_calls.length > 0) {
        const toolCall = firstChoice.message.tool_calls[0];
        
        if (toolCall.type === 'function') {
          const toolName = toolCall.function.name;
          const toolArgs = JSON.parse(toolCall.function.arguments);

          this.logger.log(`JARVIS is using tool: ${toolName} with query: "${toolArgs.query}"`);

          let toolResult = '';
          if (toolName === 'search_web') {
            toolResult = await this.webSearchService.search(toolArgs.query);
          }

          // Add the tool result to the message history
          messages.push(firstChoice.message);
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: toolResult,
          });

          this.logger.log('Calling OpenRouter again with tool results (streaming)...');
        }
      } else {
        // No tool needed, but we still want to stream the response for consistency
        this.logger.log('No tool needed. Starting streaming response...');
      }

      // Final call (streaming) to get the actual content
      const finalResponse = await this.openai.chat.completions.create({
        model: 'openai/gpt-4o-mini',
        messages,
        stream: true,
        max_tokens: 400, // Reduced to avoid credit issues
      });

      let fullReply = '';
      for await (const chunk of finalResponse) {
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
