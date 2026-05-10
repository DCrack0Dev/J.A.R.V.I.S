import { Controller, Get, Post, Body, Param, Query, Delete } from '@nestjs/common';
import { PermanentMemoryService } from './memory.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('memory')
@Controller('memory')
export class MemoryController {
  constructor(private readonly memoryService: PermanentMemoryService) {}

  @Get('timeline/:userId')
  @ApiOperation({ summary: 'Get a timeline of all recorded messages' })
  async getTimeline(@Param('userId') userId: string) {
    return this.memoryService.getMemoryTimeline(userId);
  }

  @Get('search/:userId')
  @ApiOperation({ summary: 'Search through indexed memories' })
  async search(@Param('userId') userId: string, @Query('q') query: string) {
    return this.memoryService.searchMemories(userId, query);
  }

  @Get('ask/:userId')
  @ApiOperation({ summary: 'Ask JARVIS what it remembers about a specific topic' })
  async ask(@Param('userId') userId: string, @Query('q') query: string) {
    return this.memoryService.askJarvisMemory(userId, query);
  }

  @Get('stats/:userId')
  @ApiOperation({ summary: 'Get memory usage statistics' })
  async getStats(@Param('userId') userId: string) {
    return this.memoryService.getMemoryStats(userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a specific memory entry' })
  async deleteMemory(@Param('id') id: string) {
    return this.memoryService.deleteMemory(id);
  }

  @Post('forget/:userId')
  @ApiOperation({ summary: 'Forget all memories before a specific date' })
  async forgetBefore(@Param('userId') userId: string, @Body('date') date: string) {
    return this.memoryService.forgetBeforeDate(userId, new Date(date));
  }
}
