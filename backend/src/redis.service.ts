import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;

  onModuleInit() {
    const isRedisDisabled = process.env.DISABLE_REDIS === 'true';

    if (isRedisDisabled) {
      this.logger.warn('Redis is explicitly disabled. Using mock client.');
      this.client = this.createMockClient();
      return;
    }

    this.client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      retryStrategy: (times) => {
        if (times > 1) {
          this.logger.error('Redis connection failed. Switching to mock client.');
          this.client = this.createMockClient();
          return null; 
        }
        return 10;
      },
    });

    this.client.on('error', (err) => {
      // Handled by retryStrategy
    });
  }

  private createMockClient(): any {
    return {
      get: async () => null,
      set: async () => 'OK',
      del: async () => 0,
      lrange: async () => [],
      rpush: async () => 0,
      ltrim: async () => 'OK',
      expire: async () => 0,
      llen: async () => 0,
      disconnect: () => {},
      on: () => {},
    };
  }

  onModuleDestroy() {
    this.client.disconnect();
  }

  getClient(): Redis {
    return this.client;
  }
}
