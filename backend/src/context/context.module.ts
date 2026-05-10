import { Module } from '@nestjs/common';
import { ContextService } from './context.service';
import { ContextController } from './context.controller';
import { PrismaService } from '../prisma.service';
import { RedisService } from '../redis.service';

@Module({
  controllers: [ContextController],
  providers: [ContextService, PrismaService, RedisService],
  exports: [ContextService],
})
export class ContextModule {}
