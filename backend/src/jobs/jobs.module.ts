import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { PrismaService } from '../prisma.service';

@Module({
  providers: [JobsService, PrismaService],
  controllers: [JobsController],
  exports: [JobsService],
})
export class JobsModule {}
