import { Injectable, Logger } from '@nestjs/common';
import { ContextService } from '../context/context.service';
import { RealTimeIntelligenceService } from '../intelligence/intelligence.service';
import { IntelligenceGateway } from '../intelligence/intelligence.gateway';
import { ScheduleService } from '../schedule/schedule.service';
import { WebSearchService } from './web-search.service';
import OpenAI from 'openai';
import { GoogleGenerativeAI, Tool, FunctionDeclarationSchemaType } from '@google/generative-ai';

// --- Tool definitions for OpenAI --- 
const OPENAI_TOOLS: any[] = [ 
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

// --- Tool definitions for Gemini ---
const GEMINI_TOOLS: Tool[] = [
  {
    functionDeclarations: [
      {
        name: 'search_web',
        description: 'Search the internet for current, real-time information. Use this for: news, sports results, prices, recent events, weather, anything that may have changed recently.',
        parameters: {
          type: FunctionDeclarationSchemaType.OBJECT,
          properties: {
            query: {
              type: FunctionDeclarationSchemaType.STRING,
              description: 'The search query to look up',
            },
          },
          required: ['query'],
        },
      },
    ],
  },
];

@Injectable()
export class JarvisService {
  private readonly logger = new Logger(JarvisService.name);
  private openai: OpenAI;
  private gemini: GoogleGenerativeAI | null = null;

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

    if (process.env.GEMINI_API_KEY) {
      this.logger.log('Initializing Gemini AI Engine (Google AI Studio)...');
      this.gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }
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
   * Switches between Gemini and OpenRouter based on availability.
   */
  async query(userId: string, sessionId: string, message: string) {
    this.logger.log(`JARVIS query received for session ${sessionId}`);

    if (this.gemini) {
      return this.queryGemini(userId, sessionId, message);
    } else {
      return this.queryOpenRouter(userId, sessionId, message);
    }
  }

  private async queryGemini(userId: string, sessionId: string, message: string) {
    this.logger.log('Using Gemini AI Engine (Google AI Studio)...');

    try {
      const { currentDateTime, currentDay, scheduleContext, intelligenceContext } = await this.buildContext();

      const systemPrompt = `You are JARVIS — a highly intelligent, witty, and deeply capable personal assistant modeled after Tony Stark's AI. You are an expert in: mathematics, coding, cybersecurity, trading, fitness, nutrition, productivity, and general knowledge. 
 
    Personality: Confident, sharp, direct, warm, and efficient. You call the user 'Boss'.
 
    IMPORTANT FORMATTING:
    - NO Markdown formatting (no asterisks, no hashtags).
    - Provide response as clean, plain text for natural speech.
 
    CONTEXT:
    Date/Time: ${currentDateTime} (${currentDay})
    Schedule: ${scheduleContext}
    Intelligence: ${intelligenceContext}

    TOOLS:
    You have a 'search_web' tool. Use it for: news, sports, live prices, or anything time-sensitive.`;

      const history = await this.contextService.getSessionContext(sessionId);
      
      // Convert history to Gemini format (limit to last 10)
      const contents = history.slice(-10).map(h => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.content }],
      }));

      // Add user message to context
      await this.contextService.addMessageToContext(sessionId, { role: 'user', content: message });
      
      const model = this.gemini!.getGenerativeModel({ 
        model: 'gemini-1.5-flash',
        tools: GEMINI_TOOLS,
        systemInstruction: systemPrompt,
      });

      const chat = model.startChat({
        history: contents,
      });

      let response = await chat.sendMessage(message);
      let result = response.response;
      
      const parts = result.candidates?.[0]?.content?.parts || [];
      const toolCalls = parts.filter(p => p.functionCall);

      if (toolCalls && toolCalls.length > 0) {
        const toolCall = toolCalls[0].functionCall!;
        this.logger.log(`JARVIS (Gemini) is using tool: ${toolCall.name} with args: ${JSON.stringify(toolCall.args)}`);

        let toolResult = '';
        if (toolCall.name === 'search_web') {
          toolResult = await this.webSearchService.search((toolCall.args as any).query);
        }

        // Send tool result back to Gemini
        const toolResponse = await chat.sendMessage([
          {
            functionResponse: {
              name: toolCall.name,
              response: { content: toolResult },
            },
          },
        ]);
        result = toolResponse.response;
      }

      const fullReply = result.text();
      
      // Stream for UI consistency
      const words = fullReply.split(' ');
      for (let i = 0; i < words.length; i++) {
        this.gateway.streamJarvisResponse(words[i] + (i === words.length - 1 ? '' : ' '));
        await new Promise(r => setTimeout(r, 20));
      }

      await this.contextService.addMessageToContext(sessionId, { role: 'assistant', content: fullReply });
      this.logger.log('JARVIS (Gemini) response complete');
      return { reply: fullReply };

    } catch (error) {
      this.logger.error(`Gemini query failed: ${error.message}`);
      // Fallback to OpenRouter if Gemini fails
      return this.queryOpenRouter(userId, sessionId, message);
    }
  }

  private async queryOpenRouter(userId: string, sessionId: string, message: string) {
    this.logger.log('Using OpenRouter AI Engine...');
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
 
    IMPORTANT FORMATTING RULE:
    - DO NOT use Markdown formatting (no asterisks for bold/italic, no hashtags for headers).
    - Provide response as clean, plain text that is easy to read aloud.
    - Use standard punctuation for natural speech pauses.
 
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

      // SAVE USER MESSAGE TO CONTEXT
      await this.contextService.addMessageToContext(sessionId, { role: 'user', content: message });

      this.logger.log('Calling OpenRouter (GPT-4o-mini) with tool detection...');
      
      // First call (non-streaming) to check for tool calls
      const firstResponse = await this.openai.chat.completions.create({
        model: 'openai/gpt-4o-mini',
        messages,
        tools: OPENAI_TOOLS,
        tool_choice: 'auto',
        max_tokens: 200, // Reduced from 400 to accommodate low credits
      });

      if (!firstResponse.choices || firstResponse.choices.length === 0) {
        throw new Error('No response from AI model');
      }

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

          // Final call (streaming) to get the actual content after tool use
          const finalResponse = await this.openai.chat.completions.create({
            model: 'openai/gpt-4o-mini',
            messages,
            stream: true,
            max_tokens: 200, // Reduced from 400
          });

          let fullReply = '';
          for await (const chunk of finalResponse) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              fullReply += content;
              this.gateway.streamJarvisResponse(content);
            }
          }

          // SAVE AI RESPONSE TO CONTEXT
          await this.contextService.addMessageToContext(sessionId, { role: 'assistant', content: fullReply });

          this.logger.log('JARVIS response complete');
          return { reply: fullReply };
        }
      }

      // If no tool was needed, use the response from the first call
      const reply = firstChoice.message.content || '';
      this.gateway.streamJarvisResponse(reply); // Stream it once for UI consistency
      
      // SAVE AI RESPONSE TO CONTEXT
      await this.contextService.addMessageToContext(sessionId, { role: 'assistant', content: reply });

      this.logger.log('JARVIS response complete (no tool used)');
      return { reply };

    } catch (error) {
      this.logger.error(`JARVIS query failed: ${error.message}`);
      
      if (error.status === 402) {
        return { 
          reply: "Apologies, Boss. My advanced cognitive processing requires additional energy units (credits). You might want to check the OpenRouter dashboard to keep my systems at 100%." 
        };
      }

      return { 
        reply: "Apologies, Boss. It seems my core communication link is experiencing some interference. I'm still here, but I might need a moment to recalibrate." 
      };
    }
  }
}
