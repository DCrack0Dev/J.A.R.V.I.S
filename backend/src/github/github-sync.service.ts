import { Injectable, Logger } from '@nestjs/common';
import { GithubClientService } from './github-client.service';
import { PrismaService } from '../prisma.service';

@Injectable()
export class GithubSyncService {
  private readonly logger = new Logger(GithubSyncService.name);

  constructor(
    private githubClient: GithubClientService,
    private prisma: PrismaService,
  ) {}

  async syncProfile() {
    const octokit = this.githubClient.getClient();
    const { data: profile } = await octokit.rest.users.getAuthenticated();
    
    // Fetch profile README
    let profileReadme = '';
    let profileReadmeSha = '';
    try {
      const { data: readme } = await octokit.rest.repos.getContent({
        owner: profile.login,
        repo: profile.login,
        path: 'README.md',
      });
      if ('content' in readme) {
        profileReadme = Buffer.from(readme.content, 'base64').toString();
        profileReadmeSha = readme.sha;
      }
    } catch (e) {
      this.logger.warn(`No profile README found for ${profile.login}`);
    }

    // Fetch all repos to compute stats
    const repos = await this.fetchAllRepos();
    const totalStars = repos.reduce((acc, repo) => acc + (repo.stargazers_count || 0), 0);
    
    const languages: Record<string, number> = {};
    repos.forEach(repo => {
      if (repo.language) {
        languages[repo.language] = (languages[repo.language] || 0) + 1;
      }
    });

    return this.prisma.githubProfile.upsert({
      where: { username: profile.login },
      update: {
        displayName: profile.name,
        bio: profile.bio,
        avatarUrl: profile.avatar_url,
        followers: profile.followers,
        following: profile.following,
        publicRepos: profile.public_repos,
        profileReadme,
        profileReadmeSha,
        totalStars,
        topLanguages: languages as any,
        lastSyncedAt: new Date(),
      },
      create: {
        username: profile.login,
        displayName: profile.name,
        bio: profile.bio,
        avatarUrl: profile.avatar_url,
        followers: profile.followers,
        following: profile.following,
        publicRepos: profile.public_repos,
        profileReadme,
        profileReadmeSha,
        totalStars,
        topLanguages: languages as any,
      },
    });
  }

  async syncAllRepos() {
    const repos = await this.fetchAllRepos();
    const results = [];

    for (const repo of repos) {
      const syncedRepo = await this.syncRepo(repo.full_name);
      results.push(syncedRepo);
    }

    return results;
  }

  async syncRepo(fullName: string) {
    const octokit = this.githubClient.getClient();
    const [owner, repoName] = fullName.split('/');
    
    const { data: repo } = await octokit.rest.repos.get({ owner, repo: repoName });
    
    let readmeContent = '';
    let readmeSha = '';
    try {
      const { data: readme } = await octokit.rest.repos.getReadme({ owner, repo: repoName });
      readmeContent = Buffer.from(readme.content, 'base64').toString();
      readmeSha = readme.sha;
    } catch (e) {
      // No readme
    }

    return this.prisma.githubRepo.upsert({
      where: { repoId: BigInt(repo.id) },
      update: {
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        url: repo.html_url,
        isPrivate: repo.private,
        language: repo.language,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        openIssues: repo.open_issues_count,
        topics: repo.topics,
        readmeContent,
        readmeSha,
        lastPushedAt: repo.pushed_at ? new Date(repo.pushed_at) : null,
        lastSyncedAt: new Date(),
      },
      create: {
        repoId: BigInt(repo.id),
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        url: repo.html_url,
        isPrivate: repo.private,
        language: repo.language,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        openIssues: repo.open_issues_count,
        topics: repo.topics || [],
        readmeContent,
        readmeSha,
        lastPushedAt: repo.pushed_at ? new Date(repo.pushed_at) : null,
      },
    });
  }

  private async fetchAllRepos() {
    const octokit = this.githubClient.getClient();
    return octokit.paginate(octokit.rest.repos.listForAuthenticatedUser, {
      per_page: 100,
      affiliation: 'owner',
    });
  }
}
