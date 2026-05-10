import { Module } from '@nestjs/common';
import { PermanentMemoryService } from './memory.service';
import { MemoryController } from './memory.controller';
import { MemoryProcessor } from './memory.processor';
import { PrismaService } from '../prisma.service';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'memory-summarization',
    }),
  ],
  controllers: [MemoryController],
  providers: [PermanentMemoryService, MemoryProcessor, PrismaService],
  exports: [PermanentMemoryService],
})
export class MemoryModule {}
