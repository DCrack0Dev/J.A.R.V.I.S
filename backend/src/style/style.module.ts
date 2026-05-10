import { Module } from '@nestjs/common';
import { ResponseStyleService } from './style.service';
import { DiagramProcessor } from './diagram.processor';
import { PrismaService } from '../prisma.service';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'diagram-rendering',
    }),
  ],
  providers: [ResponseStyleService, DiagramProcessor, PrismaService],
  exports: [ResponseStyleService],
})
export class StyleModule {}
