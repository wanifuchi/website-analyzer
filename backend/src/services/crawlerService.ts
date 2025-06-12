import puppeteer, { Browser, Page } from 'puppeteer';
import { URL } from 'url';
import { logger } from '../utils/logger';
import { PageData, AnalysisOptions } from '../types/analysis';

export class CrawlerService {
  private browser: Browser | null = null;
  private visitedUrls = new Set<string>();
  private crawledPages: PageData[] = [];
  private maxDepth: number;
  private maxPages: number;
  private baseUrl: string;
  private crawlDelay: number;

  constructor(options: AnalysisOptions, baseUrl: string) {
    this.maxDepth = options.maxDepth;
    this.maxPages = options.maxPages;
    this.baseUrl = baseUrl;
    this.crawlDelay = parseInt(process.env.CRAWL_DELAY_MS || '1000');
  }

  async initialize(): Promise<void> {
    try {
      this.browser = await puppeteer.launch({
        headless: process.env.PUPPETEER_HEADLESS !== 'false',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ],
        timeout: parseInt(process.env.PUPPETEER_TIMEOUT || '30000')
      });
      
      logger.info('Browser initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize browser:', error);
      throw error;
    }
  }

  async crawlWebsite(startUrl: string): Promise<PageData[]> {
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    try {
      const baseUrlObj = new URL(startUrl);
      this.baseUrl = `${baseUrlObj.protocol}//${baseUrlObj.hostname}`;

      await this.crawlPage(startUrl, 0);
      
      return this.crawledPages;
    } catch (error) {
      logger.error('Error crawling website:', error);
      throw error;
    }
  }

  private async crawlPage(url: string, depth: number, parentUrl?: string): Promise<void> {
    if (this.visitedUrls.has(url) || 
        depth > this.maxDepth || 
        this.crawledPages.length >= this.maxPages) {
      return;
    }

    this.visitedUrls.add(url);

    const page = await this.browser!.newPage();
    const startTime = Date.now();
    
    try {
      await page.setUserAgent('Mozilla/5.0 (compatible; WebsiteAnalyzer/1.0)');
      
      await page.setViewport({ width: 1366, height: 768 });
      
      const response = await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: parseInt(process.env.PUPPETEER_TIMEOUT || '30000')
      });

      if (!response) {
        throw new Error(`Failed to load page: ${url}`);
      }

      const loadTime = Date.now() - startTime;
      const statusCode = response.status();
      
      if (statusCode >= 400) {
        logger.warn(`Page returned error status: ${statusCode} for ${url}`);
        return;
      }

      const pageData = await this.extractPageData(page, url, loadTime, statusCode, depth, parentUrl);
      this.crawledPages.push(pageData);

      logger.info(`Crawled page: ${url} (depth: ${depth}, time: ${loadTime}ms)`);

      if (depth < this.maxDepth && this.crawledPages.length < this.maxPages) {
        const links = await this.extractInternalLinks(page);
        
        for (const link of links) {
          if (this.crawledPages.length >= this.maxPages) break;
          
          await new Promise(resolve => setTimeout(resolve, this.crawlDelay));
          await this.crawlPage(link, depth + 1, url);
        }
      }
    } catch (error) {
      logger.error(`Error crawling page ${url}:`, error);
      
      const errorPageData: PageData = {
        url,
        title: 'Error',
        statusCode: 0,
        loadTime: Date.now() - startTime,
        contentType: 'error',
        size: 0,
        depth,
        parentUrl,
        links: [],
        images: [],
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
      
      this.crawledPages.push(errorPageData);
    } finally {
      await page.close();
    }
  }

  private async extractPageData(
    page: Page, 
    url: string, 
    loadTime: number, 
    statusCode: number, 
    depth: number, 
    parentUrl?: string
  ): Promise<PageData> {
    try {
      const title = await page.title();
      const contentType = await page.evaluate(() => document.contentType);
      
      const content = await page.content();
      const size = Buffer.byteLength(content, 'utf8');
      
      const links = await this.extractInternalLinks(page);
      const images = await this.extractImages(page);
      
      return {
        url,
        title,
        statusCode,
        loadTime,
        contentType,
        size,
        depth,
        parentUrl,
        links,
        images,
        errors: []
      };
    } catch (error) {
      logger.error(`Error extracting page data from ${url}:`, error);
      
      return {
        url,
        title: 'Error extracting data',
        statusCode,
        loadTime,
        contentType: 'unknown',
        size: 0,
        depth,
        parentUrl,
        links: [],
        images: [],
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  private async extractInternalLinks(page: Page): Promise<string[]> {
    try {
      const links = await page.$$eval('a[href]', (anchors, baseUrl) => {
        return anchors
          .map(anchor => {
            const href = anchor.getAttribute('href');
            if (!href) return null;
            
            try {
              const url = new URL(href, window.location.href);
              return url.href;
            } catch {
              return null;
            }
          })
          .filter((url): url is string => url !== null)
          .filter(url => {
            try {
              const urlObj = new URL(url);
              const baseUrlObj = new URL(baseUrl);
              return urlObj.hostname === baseUrlObj.hostname;
            } catch {
              return false;
            }
          });
      }, this.baseUrl);

      return Array.from(new Set(links));
    } catch (error) {
      logger.error('Error extracting links:', error);
      return [];
    }
  }

  private async extractImages(page: Page): Promise<string[]> {
    try {
      const images = await page.$$eval('img[src]', (imgs) => {
        return imgs
          .map(img => img.getAttribute('src'))
          .filter((src): src is string => src !== null)
          .map(src => {
            try {
              return new URL(src, window.location.href).href;
            } catch {
              return src;
            }
          });
      });

      return Array.from(new Set(images));
    } catch (error) {
      logger.error('Error extracting images:', error);
      return [];
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      logger.info('Browser closed');
    }
  }

  getProgress(): { crawled: number; total: number; percentage: number } {
    const crawled = this.crawledPages.length;
    const total = Math.min(this.maxPages, this.visitedUrls.size + 10); // 推定値
    const percentage = Math.round((crawled / total) * 100);
    
    return { crawled, total, percentage };
  }
}