import { Injectable, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import OpenAI from 'openai';

@Injectable()
export class GitHubIntelligenceService {
  private readonly logger = new Logger(GitHubIntelligenceService.name);
  private openai: OpenAI;

  constructor(private prisma: PrismaService) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': 'https://j-a-r-v-i-s-liard.vercel.app',
        'X-Title': 'Jarvis GitHub Intelligence',
      },
    });
  }

  async scoreRepo(repoId: string) {
    const repo = await this.prisma.gitHubRepo.findUnique({
      where: { id: repoId },
    });

    if (!repo) {
      throw new NotFoundException(`Repository with ID ${repoId} not found`);
    }

    const prompt = `You are a senior developer reviewing a GitHub repo for presentation quality. Score it 0-100 and give 2-3 improvement tips. Repo: name=${repo.name}, description=${repo.description || 'N/A'}, language=${repo.language || 'N/A'}, topics=${repo.topics.join(', ') || 'N/A'}, stars=${repo.stars}, lastPushed=${repo.pushedAt}. Respond ONLY as JSON: { "score": number, "notes": string }`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'openai/gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        max_tokens: 500,
      });

      const content = response.choices[0].message.content;
      this.logger.log(`AI scoring response for ${repo.name}: ${content}`);

      try {
        const result = JSON.parse(content || '{}');
        if (typeof result.score !== 'number' || typeof result.notes !== 'string') {
          throw new Error('Invalid JSON structure');
        }

        const updatedRepo = await this.prisma.gitHubRepo.update({
          where: { id: repoId },
          data: {
            healthScore: result.score,
            healthNotes: result.notes,
            scoredAt: new Date(),
          },
        });

        return {
          repoId: updatedRepo.id,
          score: updatedRepo.healthScore,
          notes: updatedRepo.healthNotes,
        };
      } catch (parseError) {
        this.logger.error(`AI response parse error for ${repo.name}: ${content}`);
        throw new UnprocessableEntityException('AI response parse error');
      }
    } catch (error) {
      this.logger.error(`Error scoring repo ${repo.name}: ${error.message}`);
      throw error;
    }
  }

  async scoreAllRepos() {
    const repos = await this.prisma.gitHubRepo.findMany();
    this.logger.log(`Starting sequential scoring for ${repos.length} repositories...`);

    const results = [];
    for (const repo of repos) {
      try {
        const result = await this.scoreRepo(repo.id);
        results.push(result);
        this.logger.log(`Scored ${repo.name}: ${result.score}`);
        // 1s delay to avoid rate limits
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        this.logger.error(`Failed to score ${repo.name}: ${error.message}`);
      }
    }

    return {
      total: repos.length,
      scored: results.length,
      results,
    };
  }

  async generateReadme(repoId: string) {
    const repo = await this.prisma.gitHubRepo.findUnique({
      where: { id: repoId },
    });

    if (!repo) {
      throw new NotFoundException(`Repository with ID ${repoId} not found`);
    }

    const prompt = `Generate a professional GitHub README.md for this repo. name=${repo.name}, description=${repo.description || 'N/A'}, language=${repo.language || 'N/A'}, topics=${repo.topics.join(', ') || 'N/A'}. Include: title, badges line, description, features, tech stack, installation, usage, contributing, license. Return only the raw markdown, no explanation.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'openai/gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
      });

      const readme = response.choices[0].message.content?.trim() || '';

      await this.prisma.gitHubRepo.update({
        where: { id: repoId },
        data: {
          readmeDraft: readme,
        },
      });

      return {
        repoId: repo.id,
        readme,
      };
    } catch (error) {
      this.logger.error(`Error generating README for ${repo.name}: ${error.message}`);
      throw error;
    }
  }
}
