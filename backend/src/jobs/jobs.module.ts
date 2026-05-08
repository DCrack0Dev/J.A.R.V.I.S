import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { PrismaService } from '../prisma.service';
import { ScraperService } from './scraper.service';
import { LinkedInScraper } from './scrapers/linkedin.scraper';
import { PNetScraper } from './scrapers/pnet.scraper';
import { Careers24Scraper } from './scrapers/careers24.scraper';
import { IndeedScraper } from './scrapers/indeed.scraper';

@Module({
  providers: [
    JobsService, 
    PrismaService, 
    ScraperService,
    LinkedInScraper,
    PNetScraper,
    Careers24Scraper,
    IndeedScraper
  ],
  controllers: [JobsController],
})
export class JobsModule {}
