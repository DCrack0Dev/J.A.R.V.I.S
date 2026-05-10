import { Injectable, Logger } from '@nestjs/common';
import { ContextService } from '../context/context.service';
import { LearningService } from '../learning/learning.service';
import { RealTimeDataService } from '../realtime/realtime.service';
import { PermanentMemoryService } from '../memory/memory.service';
import { ResponseStyleService } from '../style/style.service';
import { RealTimeIntelligenceService } from '../intelligence/intelligence.service';
import { IntentDetectorService } from '../intelligence/intent-detector.service';
import { ToolDispatcherService } from '../intelligence/tool-dispatcher.service';
import { PromptAssemblerService } from '../intelligence/prompt-assembler.service';
import { IntelligenceGateway } from '../intelligence/intelligence.gateway';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
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
    private memoryService: PermanentMemoryService,
    private styleService: ResponseStyleService,
    private intelligenceService: RealTimeIntelligenceService,
    private intentDetector: IntentDetectorService,
    private toolDispatcher: ToolDispatcherService,
    private promptAssembler: PromptAssemblerService,
    private gateway: IntelligenceGateway,
    @InjectQueue('memory-summarization') private memoryQueue: Queue,
  ) {}

  async processQuery(userId: string, sessionId: string, query: string) {
    this.logger.log(`Processing query for user ${userId}, session ${sessionId}`);
    const messageId = Date.now().toString();

    // 1. Intent Detection
    const intents = await this.intentDetector.detectIntents(query);

    // 2. Parallel Tool Execution
    const toolResults = await this.toolDispatcher.dispatch(intents, userId, messageId, query);

    // 3. Memory Retrieval
    const memories = await this.memoryService.getRelevantMemories(userId, query, 5);

    // 4. Learning Style Retrieval
    const styleBlock = await this.styleService.getLearningStyleBlock(userId);

    // 5. Prompt Assembly
    const systemPrompt = this.promptAssembler.assemblePrompt(query, toolResults, memories, styleBlock);

    // 6. Call OpenAI GPT-4o
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
          stream: true, // Supporting streaming as requested
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
      
      // 8. Stream response back to frontend via WebSocket
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
          // 7. Parse response for [DIAGRAM] tags — trigger DiagramRenderJob
          if (fullReply.includes('[DIAGRAM:')) {
            const match = fullReply.match(/\[DIAGRAM:\s*(.+?)\]/);
            if (match) {
              await this.styleService.triggerDiagramRender(userId, match[1]);
            }
          }

          // 9. Save message to MemoryRecord
          await this.memoryService.recordMessage(userId, sessionId, 'user', query);
          await this.memoryService.recordMessage(userId, sessionId, 'assistant', fullReply);

          // 10. Run async background jobs
          // - Session summarization
          await this.memoryQueue.add('summarize', { userId, sessionId });
          
          resolve({ 
            reply: fullReply, 
            intents, 
            toolResults 
          });
        });
      });

    } catch (error) {
      this.logger.error(`Unified pipeline failed: ${error.message}`);
      return { reply: "I encountered an error. My systems are currently undergoing maintenance." };
    }
  }
}
