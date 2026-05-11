import { Injectable, Logger, UnprocessableEntityException, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import OpenAI from 'openai';
import axios from 'axios';
const pdf = require('pdf-parse');

@Injectable()
export class JobsService implements OnModuleInit {
  private readonly logger = new Logger(JobsService.name);
  private openai: OpenAI;

  constructor(private prisma: PrismaService) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
    });
  }

  onModuleInit() {
    const adzunaId = process.env.ADZUNA_APP_ID;
    const adzunaKey = process.env.ADZUNA_APP_KEY;

    if (!adzunaId || !adzunaKey) {
      this.logger.warn('ADZUNA_APP_ID or ADZUNA_APP_KEY is missing in .env. Adzuna fetching will be disabled.');
    }
  }

  async parseResume(buffer: Buffer) {
    try {
      this.logger.log('Extracting text from PDF...');
      const data = await pdf(buffer);
      const text = data.text;

      this.logger.log('Sending text to OpenAI for parsing...');
      const prompt = `Parse this resume and return ONLY a JSON object with these fields: { "name": string, "email": string, "phone": string, "summary": string, "skills": string[], "experience": [{ "company": string, "role": string, "duration": string, "description": string }], "education": [{ "institution": string, "degree": string, "year": string }], "targetRoles": string[] }. Resume text: ${text}`;

      const response = await this.openai.chat.completions.create({
        model: 'openai/gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        max_tokens: 2000,
      });

      const content = response.choices[0].message.content;
      this.logger.log('AI parsing completed');

      try {
        const parsed = JSON.parse(content || '{}');
        
        // Upsert into JobProfile (assuming single profile for now)
        const profile = await this.prisma.jobProfile.findFirst();
        
        const dataToSave = {
          name: parsed.name,
          email: parsed.email,
          phone: parsed.phone,
          summary: parsed.summary,
          skills: parsed.skills || [],
          experience: parsed.experience || [],
          education: parsed.education || [],
          targetRoles: parsed.targetRoles || [],
          resumeText: text,
        };

        if (profile) {
          return await this.prisma.jobProfile.update({
            where: { id: profile.id },
            data: dataToSave,
          });
        } else {
          return await this.prisma.jobProfile.create({
            data: dataToSave,
          });
        }
      } catch (parseError) {
        this.logger.error(`AI response parse error: ${content}`);
        throw new UnprocessableEntityException({
          message: 'AI response parse error',
          rawOutput: content,
        });
      }
    } catch (error) {
      this.logger.error(`Error parsing resume: ${error.message}`);
      throw error;
    }
  }

  async upsertProfile(data: any) {
    const profile = await this.prisma.jobProfile.findFirst();
    
    if (profile) {
      return await this.prisma.jobProfile.update({
        where: { id: profile.id },
        data,
      });
    } else {
      return await this.prisma.jobProfile.create({
        data,
      });
    }
  }

  async getProfile() {
    return await this.prisma.jobProfile.findFirst();
  }

  async updateProfile(data: any) {
    const profile = await this.prisma.jobProfile.findFirst();
    if (!profile) return null;

    return await this.prisma.jobProfile.update({
      where: { id: profile.id },
      data,
    });
  }

  // --- JOB SCANNING & SCORING ---

  async scanJobs() {
    const profile = await this.getProfile();
    if (!profile) throw new NotFoundException('No profile found. Please set up profile first.');

    const targetRoles = profile.targetRoles || [];
    let totalAdded = 0;

    for (const role of targetRoles) {
      this.logger.log(`Scanning jobs for role: ${role}`);
      
      // Fetch from Adzuna
      const adzunaJobs = await this.fetchAdzunaJobs(role);
      for (const job of adzunaJobs) {
        const added = await this.saveJobListing(job);
        if (added) totalAdded++;
      }

      // Fetch from Remotive
      const remotiveJobs = await this.fetchRemotiveJobs(role);
      for (const job of remotiveJobs) {
        const added = await this.saveJobListing(job);
        if (added) totalAdded++;
      }
    }

    const totalInDb = await this.prisma.jobListing.count();
    return { added: totalAdded, total: totalInDb };
  }

  private async fetchAdzunaJobs(role: string): Promise<any[]> {
    const appId = process.env.ADZUNA_APP_ID;
    const appKey = process.env.ADZUNA_APP_KEY;
    if (!appId || !appKey) return [];

    try {
      const url = `https://api.adzuna.com/v1/api/jobs/za/search/1?app_id=${appId}&app_key=${appKey}&results_per_page=20&what=${encodeURIComponent(role)}`;
      const response = await axios.get(url);
      const results = response.data.results || [];

      return results.map((j: any) => ({
        source: 'adzuna',
        externalId: j.id.toString(),
        title: j.title,
        company: j.company?.display_name || 'Unknown',
        location: j.location?.display_name || 'N/A',
        description: j.description,
        url: j.redirect_url,
        salary: j.salary_min ? `${j.salary_min} - ${j.salary_max || ''}` : null,
        postedAt: j.created ? new Date(j.created) : new Date(),
      }));
    } catch (error) {
      this.logger.error(`Adzuna fetch failed for ${role}: ${error.message}`);
      return [];
    }
  }

  private async fetchRemotiveJobs(role: string): Promise<any[]> {
    try {
      const url = `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(role)}&limit=20`;
      const response = await axios.get(url);
      const jobs = response.data.jobs || [];

      return jobs.map((j: any) => ({
        source: 'remotive',
        externalId: j.id.toString(),
        title: j.title,
        company: j.company_name,
        location: 'Remote',
        description: j.description,
        url: j.url,
        salary: j.salary || null,
        postedAt: j.publication_date ? new Date(j.publication_date) : new Date(),
      }));
    } catch (error) {
      this.logger.error(`Remotive fetch failed for ${role}: ${error.message}`);
      return [];
    }
  }

  private async saveJobListing(job: any): Promise<boolean> {
    try {
      const exists = await this.prisma.jobListing.findUnique({
        where: {
          source_externalId: {
            source: job.source,
            externalId: job.externalId,
          },
        },
      });

      if (exists) return false;

      await this.prisma.jobListing.create({ data: job });
      return true;
    } catch (error) {
      this.logger.error(`Failed to save job ${job.externalId}: ${error.message}`);
      return false;
    }
  }

  async scoreJobMatch(jobId: string) {
    const job = await this.prisma.jobListing.findUnique({ where: { id: jobId } });
    const profile = await this.getProfile();

    if (!job || !profile) throw new NotFoundException('Job or Profile not found');

    const prompt = `You are a career advisor. Score how well this job matches this candidate. Return ONLY JSON: { "score": number (0-100), "reason": string (1 sentence) }. Candidate skills: ${profile.skills.join(', ')}. Target roles: ${profile.targetRoles.join(', ')}. Job title: ${job.title}. Job description (first 500 chars): ${job.description?.substring(0, 500)}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'openai/gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        max_tokens: 500,
      });

      const content = response.choices[0].message.content;
      const result = JSON.parse(content || '{}');

      return await this.prisma.jobListing.update({
        where: { id: jobId },
        data: {
          matchScore: result.score,
          matchReason: result.reason,
        },
      });
    } catch (error) {
      this.logger.error(`Scoring failed for job ${job.id}: ${error.message}`);
      throw error;
    }
  }

  async scoreAllListings() {
    const listings = await this.prisma.jobListing.findMany({
      where: { matchScore: null },
    });

    this.logger.log(`Scoring ${listings.length} unscored listings...`);
    let scoredCount = 0;

    for (const listing of listings) {
      try {
        await this.scoreJobMatch(listing.id);
        scoredCount++;
        // 500ms delay to avoid rate limits
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        this.logger.error(`Failed to score listing ${listing.id}: ${error.message}`);
      }
    }

    return { scored: scoredCount, total: listings.length };
  }

  async getListings(status?: string) {
    return await this.prisma.jobListing.findMany({
      where: status ? { status } : {},
      orderBy: { matchScore: 'desc' },
    });
  }

  async getListingById(id: string) {
    const listing = await this.prisma.jobListing.findUnique({ where: { id } });
    if (!listing) throw new NotFoundException('Listing not found');
    return listing;
  }

  // --- COVER LETTER & APPLICATIONS ---

  async generateCoverLetter(jobId: string) {
    const job = await this.getListingById(jobId);
    const profile = await this.getProfile();

    if (!profile) throw new NotFoundException('No profile found. Please set up profile first.');

    const prompt = `Write a tailored, professional cover letter for this job application. Sound human, confident, and specific — not generic. Use the candidate's actual skills and experience. 
      Candidate name: ${profile.name} 
      Candidate summary: ${profile.summary} 
      Candidate skills: ${profile.skills.join(', ')} 
      Job title: ${job.title} 
      Company: ${job.company} 
      Job description (first 600 chars): ${job.description?.substring(0, 600)} 
      Format: opening paragraph, 2 body paragraphs, closing paragraph. No placeholders like [Your Name]. Sign off with the candidate's actual name.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'openai/gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
      });

      const coverLetter = response.choices[0].message.content?.trim() || '';

      const application = await this.prisma.jobApplication.upsert({
        where: { jobListingId: jobId },
        update: {
          coverLetter,
        },
        create: {
          jobListingId: jobId,
          coverLetter,
          status: 'draft',
        },
      });

      return {
        jobId,
        applicationId: application.id,
        coverLetter,
      };
    } catch (error) {
      this.logger.error(`Cover letter generation failed for job ${jobId}: ${error.message}`);
      throw error;
    }
  }

  async updateApplicationStatus(applicationId: string, status: string, notes?: string) {
    const validStatuses = ['draft', 'applied', 'interview', 'offer', 'rejected'];
    if (!validStatuses.includes(status)) {
      throw new UnprocessableEntityException(`Invalid status: ${status}`);
    }

    const updateData: any = { status };
    if (notes !== undefined) updateData.notes = notes;
    if (status === 'applied') updateData.appliedAt = new Date();

    return await this.prisma.jobApplication.update({
      where: { id: applicationId },
      data: updateData,
    });
  }

  async getApplications() {
    return await this.prisma.jobApplication.findMany({
      include: { listing: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getApplicationById(id: string) {
    const application = await this.prisma.jobApplication.findUnique({
      where: { id },
      include: { listing: true },
    });
    if (!application) throw new NotFoundException('Application not found');
    return application;
  }

  async updateCoverLetter(id: string, content: string) {
    return await this.prisma.jobApplication.update({
      where: { id },
      data: { coverLetter: content },
    });
  }

  async getApplicationSummary() {
    const total = await this.prisma.jobApplication.count();
    const counts = await this.prisma.jobApplication.groupBy({
      by: ['status'],
      _count: {
        _all: true,
      },
    });

    const byStatus = {
      draft: 0,
      applied: 0,
      interview: 0,
      offer: 0,
      rejected: 0,
    };

    counts.forEach((c) => {
      if (c.status in byStatus) {
        byStatus[c.status as keyof typeof byStatus] = c._count._all;
      }
    });

    return {
      total,
      byStatus,
    };
  }
}
