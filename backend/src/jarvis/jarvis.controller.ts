import { Controller, Post, Body, Param } from '@nestjs/common';
import { JarvisService } from './jarvis.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('jarvis')
@Controller('jarvis')
export class JarvisController {
  constructor(private readonly jarvisService: JarvisService) {}

  @Post('query/:sessionId')
  @ApiOperation({ summary: 'Process a user query through the unified JARVIS pipeline' })
  async processQuery(
    @Param('sessionId') sessionId: string,
    @Body() body: { userId?: string; query: string }
  ) {
    const userId = body.userId || '00000000-0000-0000-0000-000000000001';
    try {
      return await this.jarvisService.query(userId, sessionId, body.query);
    } catch (error) {
      return { reply: "I'm having a bit of trouble connecting to my cognitive cores right now, Boss. Give me a second." };
    }
  }
}
