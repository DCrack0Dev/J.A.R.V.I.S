import { Module } from '@nestjs/common';
import { GithubController } from './github.controller';
import { GithubSyncService } from './github-sync.service';
import { GithubEditService } from './github-edit.service';
import { GithubClientService } from './github-client.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [GithubController],
  providers: [
    GithubSyncService,
    GithubEditService,
    GithubClientService,
    PrismaService,
  ],
  exports: [GithubSyncService, GithubEditService],
})
export class GithubModule {}
