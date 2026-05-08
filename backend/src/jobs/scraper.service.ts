import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { JobsService } from './jobs.service';
import { LinkedInScraper } from './scrapers/linkedin.scraper';
import { PNetScraper } from './scrapers/pnet.scraper';
import { Careers24Scraper } from './scrapers/careers24.scraper';
import { IndeedScraper } from './scrapers/indeed.scraper';

@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);

  constructor(
    private jobsService: JobsService,
    private linkedin: LinkedInScraper,
    private pnet: PNetScraper,
    private careers24: Careers24Scraper,
    private indeed: IndeedScraper,
  ) {}

  @Cron(CronExpression.EVERY_12_HOURS)
  async handleCron() {
    this.logger.debug('Running scheduled job scraping');
    const profile = await this.jobsService.getProfile();
    const roles = profile?.targetRoles?.length ? profile.targetRoles : ['Software Engineer', 'Full Stack Developer'];
    await this.scrapeAll(roles, 'South Africa');
  }

  async scrapeAll(keywords: string[], location: string) {
    const scrapers = [this.linkedin, this.pnet, this.careers24, this.indeed];
    
    for (const scraper of scrapers) {
      try {
        const jobs = await scraper.scrape(keywords, location);
        if (jobs.length > 0) {
          await this.jobsService.saveScrapedJobs(jobs);
          this.logger.log(`Saved ${jobs.length} jobs from ${scraper.constructor.name}`);
        }
      } catch (error) {
        this.logger.error(`Error in ${scraper.constructor.name}: ${error.message}`);
      }
    }
  }
}
