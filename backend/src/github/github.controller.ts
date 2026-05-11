import { Controller, Get, Post, Put, Param, Body, Logger } from '@nestjs/common';
import { GitHubSyncService } from './github-sync.service';
import { GitHubIntelligenceService } from './github-intelligence.service';
import { PrismaService } from '../prisma.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('GitHub')
@Controller('github')
export class GitHubController {
  private readonly logger = new Logger(GitHubController.name);

  constructor(
    private readonly githubSyncService: GitHubSyncService,
    private readonly githubIntelligenceService: GitHubIntelligenceService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('sync')
  @ApiOperation({ summary: 'Sync GitHub profile and repositories' })
  @ApiResponse({ status: 201, description: 'Sync completed successfully' })
  async sync() {
    this.logger.log('Manual sync triggered');
    return await this.githubSyncService.syncAll();
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get stored GitHub profile with repo count' })
  async getProfile() {
    const profile = await this.prisma.gitHubProfile.findFirst({
      include: {
        _count: {
          select: { repos: true },
        },
      },
      orderBy: { syncedAt: 'desc' },
    });

    if (!profile) {
      return { message: 'No GitHub profile found. Please sync first.' };
    }

    return {
      ...profile,
      reposCount: profile._count.repos,
    };
  }

  @Get('repos')
  @ApiOperation({ summary: 'Get all stored GitHub repositories ordered by stars' })
  async getRepos() {
    return await this.prisma.gitHubRepo.findMany({
      orderBy: {
        stars: 'desc',
      },
    });
  }

  @Post('repos/:id/score')
  @ApiOperation({ summary: 'Score a specific repository using AI' })
  async scoreRepo(@Param('id') id: string) {
    return await this.githubIntelligenceService.scoreRepo(id);
  }

  @Post('repos/score-all')
  @ApiOperation({ summary: 'Score all repositories sequentially using AI' })
  async scoreAll() {
    return await this.githubIntelligenceService.scoreAllRepos();
  }

  @Post('repos/:id/readme')
  @ApiOperation({ summary: 'Generate a README draft for a specific repository using AI' })
  async generateReadme(@Param('id') id: string) {
    return await this.githubIntelligenceService.generateReadme(id);
  }

  @Post('repos/:id/push-readme')
  @ApiOperation({ summary: 'Push README content to GitHub' })
  async pushReadme(@Param('id') id: string, @Body('content') content: string) {
    return await this.githubSyncService.pushReadme(id, content);
  }

  @Put('repos/:id/readme-draft')
  @ApiOperation({ summary: 'Save README draft to database' })
  async saveReadmeDraft(@Param('id') id: string, @Body('content') content: string) {
    return await this.prisma.gitHubRepo.update({
      where: { id },
      data: { readmeDraft: content },
    });
  }
}
