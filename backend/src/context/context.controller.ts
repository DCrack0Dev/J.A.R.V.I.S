import { Controller, Get, Param, Post, Body } from '@nestjs/common';
import { ContextService } from './context.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('context')
@Controller('context')
export class ContextController {
  constructor(private readonly contextService: ContextService) {}

  @Get('session/:sessionId')
  @ApiOperation({ summary: 'Get current session context analysis' })
  async getContext(@Param('sessionId') sessionId: string) {
    return this.contextService.getLatestAnalysis(sessionId);
  }

  @Get('session/:sessionId/summary')
  @ApiOperation({ summary: 'Get session summary and topic tags' })
  async getSummary(@Param('sessionId') sessionId: string) {
    return this.contextService.getSessionSummary(sessionId);
  }

  @Post('session/:sessionId/message')
  @ApiOperation({ summary: 'Add a message to session context and trigger analysis' })
  async addMessage(
    @Param('sessionId') sessionId: string,
    @Body() message: { role: string; content: string }
  ) {
    return this.contextService.addMessageToContext(sessionId, message);
  }
}
