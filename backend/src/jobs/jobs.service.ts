import { Injectable, Logger, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import OpenAI from 'openai';
import * as pdf from 'pdf-parse';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);
  private openai: OpenAI;

  constructor(private prisma: PrismaService) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
    });
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
}
