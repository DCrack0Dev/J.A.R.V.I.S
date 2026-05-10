import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { LearningService } from './learning.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('learning')
@Controller('learning')
export class LearningController {
  constructor(private readonly learningService: LearningService) {}

  @Get('memory/:userId')
  @ApiOperation({ summary: 'Get user personality profile and preferences' })
  async getMemory(@Param('userId') userId: string) {
    return this.learningService.getUserMemory(userId);
  }

  @Post('memory/:userId/preferences')
  @ApiOperation({ summary: 'Update user preferences' })
  async updatePrefs(
    @Param('userId') userId: string,
    @Body() prefs: { tone?: string; length?: string; topicWeights?: any }
  ) {
    return this.learningService.updatePreferences(userId, prefs);
  }

  @Post('memory/:userId/correction')
  @ApiOperation({ summary: 'Record a user correction' })
  async recordCorrection(
    @Param('userId') userId: string,
    @Body() body: { original: string; corrected: string; topic?: string }
  ) {
    return this.learningService.recordCorrection(userId, body.original, body.corrected, body.topic);
  }
}
