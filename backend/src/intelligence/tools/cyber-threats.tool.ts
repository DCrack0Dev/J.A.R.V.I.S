import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { RedisService } from '../../redis.service';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class CyberThreatsTool {
  private readonly logger = new Logger(CyberThreatsTool.name);

  constructor(
    private redis: RedisService,
    private prisma: PrismaService,
  ) {}

  async execute(userId: string, messageId: string): Promise<string> {
    const startTime = Date.now();
    const cacheKey = 'cyber:threats:latest';
    const redis = this.redis.getClient();

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        await this.logToolCall(userId, messageId, true, startTime);
        return cached;
      }

      // 1. Fetch CISA KEV
      const cisaRes = await axios.get('https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json');
      const latestKev = cisaRes.data.vulnerabilities
        .sort((a: any, b: any) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime())
        .slice(0, 5);

      // 2. Fetch NVD Recent CVEs (Simplified due to API complexity, using a common filter)
      // Note: Real NVD API might require keys or specific params, using a placeholder logic for criticals
      const nvdRes = await axios.get('https://services.nvd.nist.gov/rest/json/cves/2.0?resultsPerPage=5');
      const criticalCves = nvdRes.data.vulnerabilities
        .filter((v: any) => v.cve.metrics?.cvssMetricV31?.[0]?.cvssData?.baseScore >= 9.0)
        .slice(0, 3);

      // 3. Format Output
      const timestamp = new Date().toLocaleTimeString();
      let output = `[CYBERSECURITY THREATS — ${timestamp}]\n`;

      latestKev.forEach((v: any) => {
        output += `🔴 CRITICAL: ${v.cveID} — ${v.vulnerabilityName} — Added to CISA KEV on ${v.dateAdded}\n`;
      });

      criticalCves.forEach((v: any) => {
        const cve = v.cve;
        const score = cve.metrics?.cvssMetricV31?.[0]?.cvssData?.baseScore;
        output += `🔴 CRITICAL: ${cve.id} — ${cve.descriptions[0].value.substring(0, 100)}... — CVSS: ${score}\n`;
      });

      await redis.set(cacheKey, output, 'EX', 900); // 15 min
      await this.logToolCall(userId, messageId, false, startTime);
      
      return output;
    } catch (error) {
      this.logger.error(`CyberThreatsTool failed: ${error.message}`);
      await this.logToolCall(userId, messageId, false, startTime, 'FAILED');
      return `[CYBERSECURITY THREATS — UNAVAILABLE]\nLive cybersecurity threat data could not be fetched.`;
    }
  }

  private async logToolCall(userId: string, messageId: string, cacheHit: boolean, startTime: number, status: string = 'SUCCESS') {
    await this.prisma.toolCall.create({
      data: {
        userId,
        messageId,
        toolName: 'cyber_threats',
        cacheHit,
        responseTimeMs: Date.now() - startTime,
        status,
      },
    });
  }
}
