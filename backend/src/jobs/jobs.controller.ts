import { Controller, Get, Post, Body, Patch, Param, Query, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JobsService } from './jobs.service';
import { ScraperService } from './scraper.service';
import type { SearchCriteria, ApplicationStatus } from './types';

@Controller('jobs')
export class JobsController {
  constructor(
    private readonly jobsService: JobsService,
    private readonly scraperService: ScraperService,
  ) {}

  @Post('resume/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadResume(@UploadedFile() file: Express.Multer.File) {
    return this.jobsService.processResume(file);
  }

  @Get()
  async findAll(@Query() criteria: SearchCriteria) {
    return this.jobsService.findAll(criteria);
  }

  @Post('scan')
  async scan() {
    const profile = await this.jobsService.getProfile();
    const roles = profile?.targetRoles?.length ? profile.targetRoles : ['Software Engineer', 'Full Stack Developer'];
    this.scraperService.scrapeAll(roles, 'South Africa');
    return { message: 'Scan initiated', roles };
  }

  @Post('apply/:id')
  async apply(@Param('id') id: string) {
    return this.jobsService.createApplication(id);
  }

  @Patch('applications/:id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: ApplicationStatus,
  ) {
    return this.jobsService.updateApplicationStatus(id, status);
  }

  @Get('profile')
  async getProfile() {
    return this.jobsService.getProfile();
  }

  @Post('profile')
  async updateProfile(@Body() data: any) {
    return this.jobsService.updateProfile(data);
  }
}
