import { Controller, Get, Post, Body, Logger } from '@nestjs/common';
import { ScheduleService } from './schedule.service';

@Controller('schedule')
export class ScheduleController {
  private readonly logger = new Logger(ScheduleController.name);

  constructor(private readonly scheduleService: ScheduleService) {}

  @Get()
  async getSchedule() {
    return this.scheduleService.getFullSchedule();
  }

  @Post('redesign')
  async redesign(@Body('instructions') instructions: string) {
    return this.scheduleService.redesignSchedule(instructions);
  }

  @Post('seed')
  async seed(@Body() schedule: any) {
    await this.scheduleService.seedInitialSchedule(schedule);
    return { message: 'Schedule seeded' };
  }
}
