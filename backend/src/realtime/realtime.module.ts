import { Module } from '@nestjs/common';
import { RealTimeDataService } from './realtime.service';
import { RedisService } from '../redis.service';

@Module({
  providers: [RealTimeDataService, RedisService],
  exports: [RealTimeDataService],
})
export class RealTimeModule {}
