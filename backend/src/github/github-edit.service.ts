import { Injectable, Logger } from '@nestjs/common';
import { GithubClientService } from './github-client.service';
import { PrismaService } from '../prisma.service';
import axios from 'axios';

@Injectable()
export class GithubEditService {
  private readonly logger = new Logger(GithubEditService.name);
  private readonly openRouterUrl = 'https://openrouter.ai/api/v1/chat/completions';
  private readonly apiKey = process.env.OPENROUTER_API_KEY;

  constructor(
    private githubClient: GithubClientService,
    private prisma: PrismaService,
  ) {}

  async generateReadme(repoFullName: string, instructions?: string) {
    const repo = await this.prisma.githubRepo.findFirst({
      where: { fullName: repoFullName },
    });

    if (!repo) throw new Error('Repository not found in cache');

    const prompt = `
      System: You are a senior technical writer and developer. 
      Write a clean, professional README.md for a GitHub repository. 
      Use proper markdown: include sections for Description, Features, Tech Stack, 
      Installation, Usage, and Contributing. 
      Be specific — use the actual project details provided. 
      Do not use placeholder text. Keep it under 400 words unless the project is complex. 
      Output only the markdown, no explanation. 

      User: Repository name: ${repo.name}
      Description: ${repo.description || 'No description provided'}
      Primary language: ${repo.language || 'Not specified'}
      Topics/tags: ${repo.topics.join(', ')}
      Current README (if any): ${repo.readmeContent || 'None'}
      Additional instructions: ${instructions || 'None'}
    `;

    const markdown = await this.callAI(prompt);

    await this.prisma.githubEdit.create({
      data: {
        repoFullName,
        editType: 'readme',
        originalContent: repo.readmeContent,
        newContent: markdown,
        aiPromptUsed: prompt,
        status: 'pending',
      },
    });

    return markdown;
  }

  async applyReadmeEdit(repoFullName: string, newContent: string) {
    const octokit = this.githubClient.getClient();
    const [owner, repoName] = repoFullName.split('/');
    const repo = await this.prisma.githubRepo.findFirst({
      where: { fullName: repoFullName },
    });

    if (!repo || !repo.readmeSha) throw new Error('Repository or README SHA not found');

    const { data: commit } = await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo: repoName,
      path: 'README.md',
      message: 'docs: update README.md via Jarvis AI',
      content: Buffer.from(newContent).toString('base64'),
      sha: repo.readmeSha,
    });

    await this.prisma.githubEdit.updateMany({
      where: { repoFullName, editType: 'readme', status: 'pending' },
      data: {
        status: 'applied',
        committedAt: new Date(),
        commitSha: commit.commit.sha,
      },
    });

    return commit;
  }

  async scoreRepoHealth(repoFullName: string) {
    const repo = await this.prisma.githubRepo.findFirst({
      where: { fullName: repoFullName },
    });

    if (!repo) throw new Error('Repository not found');

    const lastPushDays = repo.lastPushedAt 
      ? Math.floor((new Date().getTime() - repo.lastPushedAt.getTime()) / (1000 * 3600 * 24))
      : 0;

    const prompt = `
      System: You are a code quality reviewer evaluating a GitHub repository's presentation. 
      Score it from 0-100 and provide 3 specific, actionable improvement suggestions. 
      Respond ONLY in JSON: { "score": number, "suggestions": string[] } 

      User: Repo name: ${repo.name}
      Has README: ${!!repo.readmeContent}
      README word count: ${repo.readmeContent?.split(' ').length || 0}
      Has description: ${!!repo.description}
      Has topics: ${repo.topics.length > 0}
      Stars: ${repo.stars}
      Open issues: ${repo.openIssues}
      Days since last push: ${lastPushDays}
    `;

    const response = await this.callAI(prompt);
    const result = JSON.parse(response);

    await this.prisma.githubRepo.update({
      where: { id: repo.id },
      data: {
        aiHealthScore: result.score,
        aiSuggestions: result.suggestions as any,
      },
    });

    return result;
  }

  private async callAI(prompt: string): Promise<string> {
    try {
      const response = await axios.post(
        this.openRouterUrl,
        {
          model: 'anthropic/claude-3.5-sonnet',
          messages: [{ role: 'user', content: prompt }],
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'HTTP-Referer': 'http://localhost:3000',
            'X-Title': 'Jarvis GitHub Intelligence',
          },
        },
      );

      return response.data.choices[0].message.content;
    } catch (error) {
      this.logger.error(`OpenRouter API error: ${error.response?.data?.error?.message || error.message}`);
      throw new Error('AI generation failed');
    }
  }
}
