import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import type { ScrapedJob, SearchCriteria, ApplicationStatus } from './types';
import axios from 'axios';
const pdf = require('pdf-parse');

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);
  private readonly openRouterUrl = 'https://openrouter.ai/api/v1/chat/completions';
  private readonly apiKey = process.env.OPENROUTER_API_KEY;

  constructor(private prisma: PrismaService) {}

  async processResume(file: Express.Multer.File) {
    this.logger.log(`Processing resume: ${file.originalname} (${file.size} bytes)`);
    try {
      if (!this.apiKey) {
        throw new Error('OPENROUTER_API_KEY is missing in backend .env');
      }

      this.logger.log(`Extracting text from PDF...`);
      let data;
      try {
        data = await pdf(file.buffer);
      } catch (pdfError) {
        this.logger.error(`PDF Parse Error: ${pdfError.message}`);
        throw new Error('Failed to read PDF file. Ensure it is a valid, unencrypted PDF.');
      }
      
      const resumeText = data.text;

      if (!resumeText || resumeText.trim().length < 50) {
        throw new Error('Resume text extraction failed or text too short');
      }

      const prompt = `
        System: You are an expert HR analyst and career coach. 
        Analyze the following resume text and extract structured information.
        Return a JSON object with:
        1. fullName: string
        2. summary: string (a professional 2-3 sentence summary)
        3. skills: string[] (technical and soft skills)
        4. experience: object[] (list of { company, role, duration, description })
        5. targetRoles: string[] (at least 3 suggested job titles based on the resume)

        Resume Text:
        ${resumeText}

        CRITICAL: Respond ONLY with valid JSON.
      `;

      this.logger.log('Calling OpenRouter for resume analysis...');
      const response = await axios.post(
        this.openRouterUrl,
        {
          model: 'anthropic/claude-3.5-sonnet',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' }
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'HTTP-Referer': 'http://localhost:3000',
            'X-Title': 'Jarvis Career Architect',
          },
        },
      );

      const content = response.data.choices[0].message.content;
      this.logger.debug(`AI Response: ${content}`);
      
      const extracted = JSON.parse(content);
      
      return this.updateProfile({
        fullName: extracted.fullName,
        summary: extracted.summary,
        skills: extracted.skills,
        experience: extracted.experience,
        targetRoles: extracted.targetRoles,
      });
    } catch (error) {
      this.logger.error(`Resume processing failed: ${error.message}`);
      if (error.response) {
        this.logger.error(`AI API Error: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  async findAll(criteria?: SearchCriteria) {
    const where: any = { isArchived: false };

    if (criteria?.keywords?.length) {
      where.OR = criteria.keywords.map((k) => ({
        OR: [
          { title: { contains: k, mode: 'insensitive' } },
          { description: { contains: k, mode: 'insensitive' } },
        ],
      }));
    }

    if (criteria?.location) {
      where.location = { contains: criteria.location, mode: 'insensitive' };
    }

    if (criteria?.remoteOnly) {
      where.isRemote = true;
    }

    if (criteria?.sources?.length) {
      where.source = { in: criteria.sources };
    }

    return this.prisma.jobListing.findMany({
      where,
      orderBy: { postedAt: 'desc' },
      include: { applications: true },
    });
  }

  async saveScrapedJobs(jobs: ScrapedJob[]) {
    const results = [];
    for (const job of jobs) {
      try {
        const saved = await this.prisma.jobListing.upsert({
          where: {
            externalId_source: {
              externalId: job.externalId,
              source: job.source,
            },
          },
          update: {
            title: job.title,
            company: job.company,
            location: job.location,
            isRemote: job.isRemote,
            description: job.description,
            url: job.url,
            postedAt: job.postedAt,
          },
          create: {
            externalId: job.externalId,
            title: job.title,
            company: job.company,
            location: job.location,
            isRemote: job.isRemote,
            description: job.description,
            url: job.url,
            source: job.source,
            postedAt: job.postedAt,
          },
        });
        results.push(saved);
      } catch (error) {
        this.logger.error(`Failed to save job ${job.externalId}: ${error.message}`);
      }
    }
    return results;
  }

  async generateCoverLetter(jobId: string) {
    const job = await this.prisma.jobListing.findUnique({ where: { id: jobId } });
    const profile = await this.prisma.userProfile.findFirst();

    if (!job || !profile) {
      throw new Error('Job or profile not found');
    }

    const prompt = `
      Write a professional cover letter for the following job:
      Title: ${job.title}
      Company: ${job.company}
      Description: ${job.description}

      Candidate Profile:
      Name: ${profile.fullName}
      Skills: ${profile.skills.join(', ')}
      Summary: ${profile.summary}
      Experience: ${JSON.stringify(profile.experience)}
    `;

    try {
      const response = await axios.post(
        this.openRouterUrl,
        {
          model: 'openai/gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'HTTP-Referer': 'http://localhost:3000',
            'X-Title': 'Daily Assistant Job Hunter',
          },
        },
      );

      return response.data.choices[0].message.content;
    } catch (error) {
      this.logger.error(`OpenRouter API error: ${error.response?.data?.error?.message || error.message}`);
      throw new Error('Failed to generate cover letter');
    }
  }

  async createApplication(jobId: string) {
    const coverLetter = await this.generateCoverLetter(jobId);
    const profile = await this.prisma.userProfile.findFirst();

    return this.prisma.jobApplication.create({
      data: {
        listingId: jobId,
        status: 'pending_review',
        coverLetter,
        cvSnapshot: profile as any,
        appliedAt: new Date(),
      },
    });
  }

  async updateApplicationStatus(id: string, status: ApplicationStatus) {
    return this.prisma.jobApplication.update({
      where: { id },
      data: {
        status,
        lastStatusChange: new Date(),
      },
    });
  }

  async getProfile() {
    return this.prisma.userProfile.findFirst();
  }

  async updateProfile(data: any) {
    const profile = await this.prisma.userProfile.findFirst();
    if (profile) {
      return this.prisma.userProfile.update({
        where: { id: profile.id },
        data,
      });
    }
    return this.prisma.userProfile.create({ data });
  }
}
