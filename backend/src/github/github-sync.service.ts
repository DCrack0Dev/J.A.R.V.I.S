import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Octokit } from '@octokit/rest';
import { PrismaService } from '../prisma.service';

@Injectable()
export class GitHubSyncService implements OnModuleInit {
  private octokit: Octokit;
  private readonly logger = new Logger(GitHubSyncService.name);

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    const token = process.env.GITHUB_TOKEN || process.env.GITHUB_PAT;
    if (!token) {
      throw new Error('GITHUB_TOKEN or GITHUB_PAT is missing in .env');
    }
    this.octokit = new Octokit({ auth: token });
    this.logger.log('GitHubSyncService initialized with token');
  }

  async syncProfile() {
    try {
      this.logger.log('Fetching GitHub profile...');
      const { data: user } = await this.octokit.users.getAuthenticated();

      const profile = await this.prisma.gitHubProfile.upsert({
        where: { login: user.login },
        update: {
          name: user.name,
          bio: user.bio,
          avatarUrl: user.avatar_url,
          publicRepos: user.public_repos,
          followers: user.followers,
          following: user.following,
          htmlUrl: user.html_url,
          syncedAt: new Date(),
        },
        create: {
          login: user.login,
          name: user.name,
          bio: user.bio,
          avatarUrl: user.avatar_url,
          publicRepos: user.public_repos,
          followers: user.followers,
          following: user.following,
          htmlUrl: user.html_url,
          syncedAt: new Date(),
        },
      });

      this.logger.log(`Synced GitHub profile for ${user.login}`);
      return profile;
    } catch (error) {
      this.logger.error(`Error syncing GitHub profile: ${error.message}`);
      throw error;
    }
  }

  async syncRepos() {
    try {
      this.logger.log('Fetching GitHub repositories...');
      const profile = await this.prisma.gitHubProfile.findFirst({
        orderBy: { syncedAt: 'desc' },
      });

      if (!profile) {
        throw new Error('No GitHub profile found. Sync profile first.');
      }

      // Fetch all repos (paginated, up to 100 as requested)
      const { data: repos } = await this.octokit.repos.listForAuthenticatedUser({
        per_page: 100,
        sort: 'updated',
      });

      this.logger.log(`Found ${repos.length} repositories`);

      for (const repo of repos) {
        await this.prisma.gitHubRepo.upsert({
          where: { fullName: repo.full_name },
          update: {
            name: repo.name,
            description: repo.description,
            htmlUrl: repo.html_url,
            language: repo.language,
            stars: repo.stargazers_count,
            forks: repo.forks_count,
            isPrivate: repo.private,
            topics: repo.topics || [],
            pushedAt: repo.pushed_at ? new Date(repo.pushed_at) : null,
            updatedAt: new Date(),
          },
          create: {
            profileId: profile.id,
            name: repo.name,
            fullName: repo.full_name,
            description: repo.description,
            htmlUrl: repo.html_url,
            language: repo.language,
            stars: repo.stargazers_count,
            forks: repo.forks_count,
            isPrivate: repo.private,
            topics: repo.topics || [],
            pushedAt: repo.pushed_at ? new Date(repo.pushed_at) : null,
          },
        });
      }

      this.logger.log(`Synced ${repos.length} repositories for ${profile.login}`);
      return repos.length;
    } catch (error) {
      this.logger.error(`Error syncing GitHub repositories: ${error.message}`);
      throw error;
    }
  }

  async syncAll() {
    try {
      const profile = await this.syncProfile();
      const reposCount = await this.syncRepos();

      return {
        reposCount,
        login: profile.login,
        syncedAt: profile.syncedAt,
      };
    } catch (error) {
      this.logger.error(`Error during full GitHub sync: ${error.message}`);
      throw error;
    }
  }

  async pushReadme(repoId: string, content: string) {
    try {
      const repo = await this.prisma.gitHubRepo.findUnique({
        where: { id: repoId },
      });

      if (!repo) {
        return { success: false, error: 'Repository not found in database' };
      }

      const [owner, repoName] = repo.fullName.split('/');

      let existingSha: string | undefined;
      try {
        const { data }: any = await this.octokit.repos.getContent({
          owner,
          repo: repoName,
          path: 'README.md',
        });
        if (!Array.isArray(data) && data.type === 'file') {
          existingSha = data.sha;
        }
      } catch (error: any) {
        if (error.status !== 404) throw error;
      }

      await this.octokit.repos.createOrUpdateFileContents({
        owner,
        repo: repoName,
        path: 'README.md',
        message: 'Update README via JARVIS',
        content: Buffer.from(content).toString('base64'),
        sha: existingSha,
      });

      this.logger.log(`Successfully pushed README to ${repo.fullName}`);
      return { success: true, url: repo.htmlUrl };
    } catch (error: any) {
      this.logger.error(`Error pushing README to GitHub: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}
