import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import axios from 'axios';

@Injectable()
export class LearningService {
  private readonly logger = new Logger(LearningService.name);
  private readonly openRouterUrl = 'https://openrouter.ai/api/v1/chat/completions';
  private readonly apiKey = process.env.OPENROUTER_API_KEY;

  constructor(private prisma: PrismaService) {}

  async getUserMemory(userId: string) {
    // For now, if no userId is provided, we use a default one
    const id = userId || '00000000-0000-0000-0000-000000000001';
    return this.prisma.userMemory.findUnique({ where: { userId: id } });
  }

  async recordCorrection(userId: string, original: string, corrected: string, topic?: string) {
    const id = userId || '00000000-0000-0000-0000-000000000001';
    await this.prisma.userCorrection.create({
      data: { userId: id, originalResponse: original, correctedResponse: corrected, topic }
    });
    await this.updatePersonalityProfile(id);
  }

  async updatePreferences(userId: string, prefs: { tone?: string; length?: string; topicWeights?: any }) {
    const id = userId || '00000000-0000-0000-0000-000000000001';
    return this.prisma.userMemory.upsert({
      where: { userId: id },
      update: { 
        preferredTone: prefs.tone, 
        responseLength: prefs.length, 
        topicWeights: prefs.topicWeights,
        lastUpdated: new Date()
      },
      create: { 
        userId: id, 
        preferredTone: prefs.tone, 
        responseLength: prefs.length, 
        topicWeights: prefs.topicWeights 
      }
    });
  }

  async updatePersonalityProfile(userId: string) {
    const id = userId || '00000000-0000-0000-0000-000000000001';
    const memory = await this.prisma.userMemory.findUnique({ where: { userId: id } });
    const corrections = await this.prisma.userCorrection.findMany({ 
      where: { userId: id }, 
      take: 10,
      orderBy: { timestamp: 'desc' }
    });

    const prompt = `
      Analyze the following user data and build a Personality Profile JSON for an AI assistant.
      
      Preferences:
      - Tone: ${memory?.preferredTone || 'Neutral'}
      - Length: ${memory?.responseLength || 'Medium'}
      - Interests: ${JSON.stringify(memory?.topicWeights || {})}

      Recent Corrections:
      ${corrections.map(c => `- Corrected "${c.originalResponse}" to "${c.correctedResponse}" on topic "${c.topic}"`).join('\n')}

      Respond ONLY with a valid JSON:
      {
        "style": "string",
        "technicalFocus": ["string"],
        "toneNotes": "string",
        "avoid": ["string"]
      }
    `;

    try {
      const response = await axios.post(
        this.openRouterUrl,
        {
          model: 'openai/gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' }
        },
        {
          headers: { 
            Authorization: `Bearer ${this.apiKey}`,
            'X-Title': 'Jarvis Learning System'
          },
        },
      );

      const profile = JSON.parse(response.data.choices[0].message.content);
      
      await this.prisma.userMemory.update({
        where: { userId: id },
        data: { personalityProfile: profile, lastUpdated: new Date() }
      });

      return profile;
    } catch (error) {
      this.logger.error(`Profile update failed: ${error.message}`);
      return null;
    }
  }

  async getPersonalizedPrompt(userId: string) {
    const id = userId || '00000000-0000-0000-0000-000000000001';
    const memory = await this.prisma.userMemory.findUnique({ where: { userId: id } });
    if (!memory?.personalityProfile) return '';

    const profile = memory.personalityProfile as any;
    return `
      [USER PERSONALITY PROFILE]
      Style: ${profile.style}
      Focus: ${profile.technicalFocus?.join(', ')}
      Tone: ${profile.toneNotes}
      Avoid: ${profile.avoid?.join(', ')}
    `;
  }
}
