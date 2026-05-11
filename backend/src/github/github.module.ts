import { Module } from '@nestjs/common';
import { GitHubSyncService } from './github-sync.service';
import { GitHubIntelligenceService } from './github-intelligence.service';
import { GitHubController } from './github.controller';
import { PrismaService } from '../prisma.service';

@Module({
  providers: [GitHubSyncService, GitHubIntelligenceService, PrismaService],
  controllers: [GitHubController],
  exports: [GitHubSyncService, GitHubIntelligenceService],
})
export class GitHubModule {}
