import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JobsService } from './jobs.service';
import { ApiConsumes, ApiBody, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('Jobs')
@Controller('jobs')
export class JobsController {
  private readonly logger = new Logger(JobsController.name);

  constructor(private readonly jobsService: JobsService) {}

  @Post('profile/upload-resume')
  @ApiOperation({ summary: 'Upload a PDF resume and parse it using AI' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadResume(@UploadedFile() file: Express.Multer.File) {
    this.logger.log(`Resume upload received: ${file.originalname}`);
    return await this.jobsService.parseResume(file.buffer);
  }

  @Post('profile')
  @ApiOperation({ summary: 'Manually setup or overwrite the job profile' })
  async setupProfile(@Body() data: any) {
    return await this.jobsService.upsertProfile(data);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get the current job profile' })
  async getProfile() {
    const profile = await this.jobsService.getProfile();
    if (!profile) {
      throw new NotFoundException('No profile set up yet');
    }
    return profile;
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update the existing job profile' })
  async updateProfile(@Body() data: any) {
    const profile = await this.jobsService.updateProfile(data);
    if (!profile) {
      throw new NotFoundException('No profile set up yet');
    }
    return profile;
  }

  // --- JOB LISTINGS ---

  @Post('scan')
  @ApiOperation({ summary: 'Scan all job sources for all target roles' })
  async scanJobs() {
    return await this.jobsService.scanJobs();
  }

  @Post('score-all')
  @ApiOperation({ summary: 'Score all unscored job listings using AI' })
  async scoreAll() {
    return await this.jobsService.scoreAllListings();
  }

  @Get('listings')
  @ApiOperation({ summary: 'Get all job listings ordered by match score' })
  @ApiQuery({ name: 'status', required: false, type: String })
  async getListings(@Query('status') status?: string) {
    return await this.jobsService.getListings(status);
  }

  @Get('listings/:id')
  @ApiOperation({ summary: 'Get a single job listing detail' })
  async getListing(@Param('id') id: string) {
    return await this.jobsService.getListingById(id);
  }

  // --- APPLICATIONS ---

  @Post('listings/:id/apply')
  @ApiOperation({ summary: 'Generate a tailored cover letter and create a draft application' })
  async apply(@Param('id') id: string) {
    return await this.jobsService.generateCoverLetter(id);
  }

  @Get('applications/summary')
  @ApiOperation({ summary: 'Get summary of all applications by status' })
  async getSummary() {
    return await this.jobsService.getApplicationSummary();
  }

  @Get('applications')
  @ApiOperation({ summary: 'Get all job applications' })
  async getApplications() {
    return await this.jobsService.getApplications();
  }

  @Get('applications/:id')
  @ApiOperation({ summary: 'Get a single application detail with job listing' })
  async getApplication(@Param('id') id: string) {
    return await this.jobsService.getApplicationById(id);
  }

  @Put('applications/:id/status')
  @ApiOperation({ summary: 'Update the status of an application' })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Body('notes') notes?: string,
  ) {
    return await this.jobsService.updateApplicationStatus(id, status, notes);
  }

  @Put('applications/:id/cover-letter')
  @ApiOperation({ summary: 'Edit the cover letter content' })
  async updateCoverLetter(@Param('id') id: string, @Body('content') content: string) {
    return await this.jobsService.updateCoverLetter(id, content);
  }
}
