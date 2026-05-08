import { Injectable } from '@nestjs/common';
import { BaseScraper } from './base.scraper';
import { ScrapedJob } from '../types';

@Injectable()
export class PNetScraper extends BaseScraper {
  protected source = 'pnet';

  async scrape(keywords: string[], location: string): Promise<ScrapedJob[]> {
    this.logger.log(`Scraping PNet for ${keywords.join(', ')} in ${location}`);
    return this.withBrowser(async (page) => {
      const searchUrl = `https://www.pnet.co.za/jobs/${encodeURIComponent(keywords.join('-'))}-in-${encodeURIComponent(location)}`;
      await page.goto(searchUrl, { waitUntil: 'networkidle2' });

      const jobs: ScrapedJob[] = await page.evaluate((source) => {
        const items = Array.from(document.querySelectorAll('.job-item'));
        return items.map((item) => {
          const title = item.querySelector('.job-title')?.textContent?.trim() || '';
          const company = item.querySelector('.company-name')?.textContent?.trim() || '';
          const loc = item.querySelector('.job-location')?.textContent?.trim() || '';
          const url = (item.querySelector('a') as HTMLAnchorElement)?.href || '';
          const externalId = url.split('/').pop() || Math.random().toString();

          return {
            externalId,
            title,
            company,
            location: loc,
            isRemote: loc.toLowerCase().includes('remote'),
            description: '',
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
