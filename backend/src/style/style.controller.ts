import { Controller, Post, Body, Get, Param, Query } from '@nestjs/common';
import { ResponseStyleService } from './style.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('style')
@Controller('style')
export class StyleController {
  constructor(private readonly styleService: ResponseStyleService) {}

  @Get('diagram')
  @ApiOperation({ summary: 'Get a rendered diagram from cache' })
  async getDiagram(@Query('description') description: string) {
    return this.styleService.getDiagramFromCache(description);
  }
}
