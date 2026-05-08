import { Injectable, Logger } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import { ScrapedJob } from '../types';

@Injectable()
export abstract class BaseScraper {
  protected abstract source: string;
  protected readonly logger = new Logger(this.constructor.name);

  abstract scrape(keywords: string[], location: string): Promise<ScrapedJob[]>;

  protected async withBrowser<T>(fn: (page: puppeteer.Page) => Promise<T>): Promise<T> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    try {
      const page = await browser.newPage();
      return await fn(page);
    } finally {
      await browser.close();
    }
  }
}
