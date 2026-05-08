import { Controller, Get, Post, Body, Param, Query, Logger } from '@nestjs/common';
import { GithubSyncService } from './github-sync.service';
import { GithubEditService } from './github-edit.service';
import { PrismaService } from '../prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Controller('github')
export class GithubController {
  private readonly logger = new Logger(GithubController.name);

  constructor(
    private syncService: GithubSyncService,
    private editService: GithubEditService,
    private prisma: PrismaService,
  ) {}

  @Get('profile')
  async getProfile() {
    return this.prisma.githubProfile.findFirst();
  }

  @Post('sync')
  async fullSync() {
    await this.syncService.syncProfile();
    await this.syncService.syncAllRepos();
    return { message: 'Full sync initiated' };
  }

  @Post('sync/:owner/:repo')
  async syncRepo(@Param('owner') owner: string, @Param('repo') repo: string) {
    return this.syncService.syncRepo(`${owner}/${repo}`);
  }

  @Get('repos')
  async getRepos(
    @Query('language') language?: string,
    @Query('minScore') minScore?: string,
  ) {
    const where: any = {};
    if (language) where.language = language;
    if (minScore) where.aiHealthScore = { gte: parseInt(minScore) };

    return this.prisma.githubRepo.findMany({
      where,
      orderBy: { stars: 'desc' },
    });
  }

  @Get('repos/:owner/:repo')
  async getRepoDetail(@Param('owner') owner: string, @Param('repo') repo: string) {
    return this.prisma.githubRepo.findFirst({
      where: { fullName: `${owner}/${repo}` },
    });
  }

  @Post('readme/generate')
  async generateReadme(@Body() body: { repoFullName: string; instructions?: string }) {
    return this.editService.generateReadme(body.repoFullName, body.instructions);
  }

  @Post('readme/apply')
  async applyReadme(@Body() body: { repoFullName: string; content: string }) {
    return this.editService.applyReadmeEdit(body.repoFullName, body.content);
  }

  @Post('health/score/:owner/:repo')
  async scoreHealth(@Param('owner') owner: string, @Param('repo') repo: string) {
    return this.editService.scoreRepoHealth(`${owner}/${repo}`);
  }

  @Get('edits')
  async getEdits() {
    return this.prisma.githubEdit.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  @Get('summary')
  async getSummary() {
    const repos = await this.prisma.githubRepo.findMany();
    const profile = await this.prisma.githubProfile.findFirst();
    const lowScoreRepos = repos.filter(r => r.aiHealthScore !== null && r.aiHealthScore < 50);
    
    let summary = `You have ${repos.length} repositories. `;
    if (profile?.totalStars) summary += `Your total star count is ${profile.totalStars}. `;
    
    if (lowScoreRepos.length > 0) {
      summary += `${lowScoreRepos.length} repositories have a health score below 50. `;
      summary += `${lowScoreRepos[0].name} needs the most attention.`;
    }

    return { summary };
  }

  @Cron(CronExpression.EVERY_12_HOURS)
  async scheduledSync() {
    this.logger.log('Starting scheduled GitHub sync');
    await this.syncService.syncProfile();
    await this.syncService.syncAllRepos();
  }
}
