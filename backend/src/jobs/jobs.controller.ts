import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  UseInterceptors,
  UploadedFile,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JobsService } from './jobs.service';
import { ApiConsumes, ApiBody, ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Jobs')
@Controller('jobs/profile')
export class JobsController {
  private readonly logger = new Logger(JobsController.name);

  constructor(private readonly jobsService: JobsService) {}

  @Post('upload-resume')
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

  @Post()
  @ApiOperation({ summary: 'Manually setup or overwrite the job profile' })
  async setupProfile(@Body() data: any) {
    return await this.jobsService.upsertProfile(data);
  }

  @Get()
  @ApiOperation({ summary: 'Get the current job profile' })
  async getProfile() {
    const profile = await this.jobsService.getProfile();
    if (!profile) {
      throw new NotFoundException('No profile set up yet');
    }
    return profile;
  }

  @Put()
  @ApiOperation({ summary: 'Update the existing job profile' })
  async updateProfile(@Body() data: any) {
    const profile = await this.jobsService.updateProfile(data);
    if (!profile) {
      throw new NotFoundException('No profile set up yet');
    }
    return profile;
  }
}
