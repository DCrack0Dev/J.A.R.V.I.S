import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import axios from 'axios';

@Injectable()
export class ScheduleService {
  private readonly logger = new Logger(ScheduleService.name);
  private readonly openRouterUrl = 'https://openrouter.ai/api/v1/chat/completions';
  private readonly apiKey = process.env.OPENROUTER_API_KEY;

  constructor(private prisma: PrismaService) {}

  async getFullSchedule() {
    const days = await this.prisma.scheduleDay.findMany({
      include: { blocks: { orderBy: { order: 'asc' } } },
    });
    
    // Transform into the object format the frontend expects
    const schedule: Record<string, any> = {};
    days.forEach(day => {
      schedule[day.day] = {
        theme: day.theme,
        blocks: day.blocks.map(b => ({
          start: b.start,
          end: b.end,
          icon: b.icon,
          label: b.label,
          detail: b.detail
        }))
      };
    });
    return schedule;
  }

  async updateSchedule(day: string, theme: string, blocks: any[], tx: any = this.prisma) {
    const scheduleDay = await tx.scheduleDay.upsert({
      where: { day },
      update: { theme, updatedAt: new Date() },
      create: { day, theme },
    });

    // Delete existing blocks and recreate them
    await tx.scheduleBlock.deleteMany({ where: { dayId: scheduleDay.id } });
    
    await tx.scheduleBlock.createMany({
      data: blocks.map((b, index) => ({
        dayId: scheduleDay.id,
        start: b.start,
        end: b.end,
        icon: b.icon,
        label: b.label,
        detail: b.detail,
        order: index,
      })),
    });

    return scheduleDay;
  }

  async redesignSchedule(instructions: string) {
    const currentSchedule = await this.getFullSchedule();
    
    const prompt = `
      System: You are an elite performance coach and productivity expert. 
      Redesign the user's weekly schedule based on their instructions. 
      The schedule consists of 7 days (mon, tue, wed, thu, fri, sat, sun). 
      Each day has a "theme" and a list of "blocks" with start, end, icon, label, and detail.
      
      Instructions: ${instructions}
      Current Schedule: ${JSON.stringify(currentSchedule)}

      CRITICAL: Respond ONLY with a valid JSON object matching this structure:
      {
        "mon": { "theme": "...", "blocks": [{ "start": "HH:MM", "end": "HH:MM", "icon": "...", "label": "...", "detail": "..." }] },
        ...
      }
      Do not include any other text or markdown formatting.
    `;

    try {
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
            'X-Title': 'Jarvis Schedule Architect',
          },
        },
      );

      const newSchedule = JSON.parse(response.data.choices[0].message.content);
      
      // Bulk update all days in a transaction
      await this.prisma.$transaction(async (tx) => {
        for (const [day, data] of Object.entries(newSchedule)) {
          await this.updateSchedule(day, (data as any).theme, (data as any).blocks, tx);
        }
      });

      return newSchedule;
    } catch (error) {
      this.logger.error(`AI Redesign failed: ${error.message}`);
      throw new Error('Failed to redesign schedule');
    }
  }

  // Seed initial schedule if database is empty
  async seedInitialSchedule(schedule: any) {
    const count = await this.prisma.scheduleDay.count();
    if (count > 0) return;

    for (const [day, data] of Object.entries(schedule)) {
      await this.updateSchedule(day, (data as any).theme, (data as any).blocks);
    }
  }
}
