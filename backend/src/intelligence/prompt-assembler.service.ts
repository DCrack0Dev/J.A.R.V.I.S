import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PromptAssemblerService {
  private readonly logger = new Logger(PromptAssemblerService.name);

  assemblePrompt(userMessage: string, toolResults: string[], memories: any[], styleBlock: string): string {
    const liveDataBlock = toolResults.length > 0 
      ? `\n[LIVE DATA]\n${toolResults.join('\n')}\n`
      : '';

    const memoryBlock = memories.length > 0
      ? `\n[PERMANENT MEMORY BLOCK]\n${memories.map(m => `- ${m.summary}`).join('\n')}\n`
      : '';

    const basePersona = `You are Jarvis, a highly intelligent personal AI assistant. You are direct, precise, and speak naturally. Always use the live data provided below when answering — never say you don't have access to real-time information.`;

    return `
      ${basePersona}

      ${liveDataBlock}

      ${memoryBlock}

      ${styleBlock}

      Rules:
      - Sound like a mentor and high-level engineer.
      - Use the provided live data to be as accurate as possible.
      - If a diagram is helpful, use the [DIAGRAM: description] tag.
    `;
  }
}
