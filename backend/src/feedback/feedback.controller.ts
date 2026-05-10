import { Controller, Post, Body, Get } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('feedback')
@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  @ApiOperation({ summary: 'Submit feedback for a JARVIS message' })
  async submitFeedback(@Body() body: { userId?: string; messageId: string; rating: string; comment?: string; topic?: string }) {
    return this.feedbackService.recordFeedback(body.userId, body.messageId, body.rating, body.comment, body.topic);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get aggregated feedback statistics' })
  async getStats() {
    return this.feedbackService.getFeedbackStats();
  }
}
