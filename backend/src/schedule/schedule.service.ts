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
            'HTTP-Referer': 'https://j-a-r-v-i-s-liard.vercel.app',
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

  async editSchedule(command: string, currentSchedule: any, targetDay: string) {
    const prompt = `
      You are editing a daily schedule based on a user command. 
      
      Current ${targetDay} schedule: ${JSON.stringify(currentSchedule)} 
      
      User command: ${command} 
      
      Rules: 
      - Preserve all blocks not mentioned in the command 
      - Keep total day coverage sensible (no overlaps, no gaps > 30 min) 
      - If adding a block, fit it without destroying the whole day 
      - If user says 'redesign today' or 'restructure', rebuild the whole day intelligently based on the existing block themes 
      - Respect typical human needs: sleep, meals, breaks 
      
      Return ONLY valid JSON in this exact format: 
      { 
        "updatedSchedule": { "theme": "...", "blocks": [{ "start": "HH:MM", "end": "HH:MM", "icon": "...", "label": "...", "detail": "..." }] }, 
        "summary": "One sentence describing what changed", 
        "changes": ["change 1", "change 2"] 
      }
    `;

    try {
      const response = await axios.post(
        this.openRouterUrl,
        {
          model: 'openai/gpt-4o',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' }
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'HTTP-Referer': 'https://j-a-r-v-i-s-liard.vercel.app',
            'X-Title': 'Jarvis Schedule Editor',
          },
        },
      );

      const result = JSON.parse(response.data.choices[0].message.content);
      
      // Save updated schedule to DB
      await this.updateSchedule(targetDay, result.updatedSchedule.theme, result.updatedSchedule.blocks);

      return result;
    } catch (error) {
      this.logger.error(`AI Schedule Edit failed: ${error.message}`);
      throw new Error('Failed to edit schedule');
    }
  }

  async resetSchedule(day: string) {
    // Default schedule for reset (could be moved to a config file)
    const defaults: Record<string, any> = {
      mon: { theme: 'Productivity', blocks: [{ start: '08:00', end: '09:00', icon: '☕', label: 'Morning Prep', detail: 'Planning and coffee' }] },
      tue: { theme: 'Deep Work', blocks: [{ start: '08:00', end: '09:00', icon: '☕', label: 'Morning Prep', detail: 'Planning and coffee' }] },
      wed: { theme: 'Deep Work', blocks: [{ start: '08:00', end: '09:00', icon: '☕', label: 'Morning Prep', detail: 'Planning and coffee' }] },
      thu: { theme: 'Deep Work', blocks: [{ start: '08:00', end: '09:00', icon: '☕', label: 'Morning Prep', detail: 'Planning and coffee' }] },
      fri: { theme: 'Collaboration', blocks: [{ start: '08:00', end: '09:00', icon: '☕', label: 'Morning Prep', detail: 'Planning and coffee' }] },
      sat: { theme: 'Rest & Play', blocks: [{ start: '09:00', end: '10:00', icon: '🍳', label: 'Brunch', detail: 'Relaxed start' }] },
      sun: { theme: 'Planning & Rest', blocks: [{ start: '09:00', end: '10:00', icon: '🍳', label: 'Brunch', detail: 'Relaxed start' }] },
    };

    const defaultData = defaults[day] || defaults['mon'];
    await this.updateSchedule(day, defaultData.theme, defaultData.blocks);
    return { updatedSchedule: defaultData, summary: `Reset ${day} to default.` };
  }
}
