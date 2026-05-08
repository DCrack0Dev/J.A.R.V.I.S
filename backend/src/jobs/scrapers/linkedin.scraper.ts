import { Injectable } from '@nestjs/common';
import { BaseScraper } from './base.scraper';
import { ScrapedJob } from '../types';

@Injectable()
export class LinkedInScraper extends BaseScraper {
  protected source = 'linkedin';

  async scrape(keywords: string[], location: string): Promise<ScrapedJob[]> {
    this.logger.log(`Scraping LinkedIn for ${keywords.join(', ')} in ${location}`);
    
    return this.withBrowser(async (page) => {
      const searchUrl = `https://www.linkedin.com/jobs/search?keywords=${encodeURIComponent(keywords.join(' '))}&location=${encodeURIComponent(location)}`;
      await page.goto(searchUrl, { waitUntil: 'networkidle2' });

      // Basic scraping logic - LinkedIn usually requires login for full data, 
      // but public search pages provide some initial results.
      const jobs: ScrapedJob[] = await page.evaluate((source) => {
        const items = Array.from(document.querySelectorAll('.jobs-search__results-list li'));
        return items.map((item) => {
          const title = item.querySelector('.base-search-card__title')?.textContent?.trim() || '';
          const company = item.querySelector('.base-search-card__subtitle')?.textContent?.trim() || '';
          const loc = item.querySelector('.job-search-card__location')?.textContent?.trim() || '';
          const url = item.querySelector('.base-card__full-link')?.getAttribute('href') || '';
          const externalId = url.split('?')[0].split('-').pop() || Math.random().toString();

          return {
            externalId,
            title,
            company,
            location: loc,
            isRemote: loc.toLowerCase().includes('remote'),
            description: '', // Full description requires another navigation
            url,
            source,
            postedAt: new Date(),
          };
        });
      }, this.source);

      return jobs.filter(j => j.title && j.company);
    });
  }
}
