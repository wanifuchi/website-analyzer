import { PageData, PerformanceResults, ResourceSizes } from '../../types/analysis';
import { logger } from '../../utils/logger';
import puppeteer from 'puppeteer';

export class PerformanceAnalyzer {
  async analyze(pages: PageData[], homePage: PageData): Promise<PerformanceResults> {
    try {
      logger.info(`Starting performance analysis for ${pages.length} pages`);

      // ホームページの詳細パフォーマンス測定
      const performanceMetrics = await this.measurePagePerformance(homePage.url);
      const resourceSizes = await this.analyzeResourceSizes(homePage.url);
      
      // 全ページの平均読み込み時間を計算
      const avgLoadTime = pages.reduce((sum, page) => sum + page.loadTime, 0) / pages.length;
      
      // パフォーマンススコアを計算
      const score = this.calculatePerformanceScore(performanceMetrics, avgLoadTime, resourceSizes);
      
      // 改善提案を生成
      const suggestions = this.generateSuggestions(performanceMetrics, resourceSizes, avgLoadTime);

      const results: PerformanceResults = {
        score,
        loadTime: avgLoadTime,
        firstContentfulPaint: performanceMetrics.firstContentfulPaint,
        largestContentfulPaint: performanceMetrics.largestContentfulPaint,
        timeToInteractive: performanceMetrics.timeToInteractive,
        totalBlockingTime: performanceMetrics.totalBlockingTime,
        resourceSizes,
        suggestions
      };

      logger.info(`Performance analysis completed with score: ${score}`);
      return results;
    } catch (error) {
      logger.error('Error in performance analysis:', error);
      throw error;
    }
  }

  private async measurePagePerformance(url: string): Promise<{
    firstContentfulPaint: number;
    largestContentfulPaint: number;
    timeToInteractive: number;
    totalBlockingTime: number;
  }> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      
      // パフォーマンス測定のための設定
      await page.setCacheEnabled(false);
      await page.setViewport({ width: 1366, height: 768 });

      // パフォーマンス API を有効にする
      await page.evaluateOnNewDocument(() => {
        (window as any).performanceData = {};
      });

      const startTime = Date.now();
      await page.goto(url, { waitUntil: 'domcontentloaded' });

      // Core Web Vitals を測定
      const metrics = await page.evaluate(() => {
        return new Promise<any>((resolve) => {
          let fcp = 0;
          let lcp = 0;
          let tti = 0;
          let tbt = 0;

          // First Contentful Paint
          const paintEntries = performance.getEntriesByType('paint');
          const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
          if (fcpEntry) {
            fcp = fcpEntry.startTime;
          }

          // Largest Contentful Paint
          if ('LargestContentfulPaint' in window) {
            new PerformanceObserver((list) => {
              const entries = list.getEntries();
              if (entries.length > 0) {
                lcp = entries[entries.length - 1].startTime;
              }
            }).observe({ entryTypes: ['largest-contentful-paint'] });
          }

          // Time to Interactive (簡易計算)
          setTimeout(() => {
            tti = Date.now() - performance.navigationStart;
            
            // Total Blocking Time (簡易計算)
            const longTasks = performance.getEntriesByType('longtask');
            tbt = longTasks.reduce((total: number, task: any) => {
              return total + Math.max(0, task.duration - 50);
            }, 0);

            resolve({ fcp, lcp: lcp || tti, tti, tbt });
          }, 1000);
        });
      });

      return {
        firstContentfulPaint: metrics.fcp,
        largestContentfulPaint: metrics.lcp,
        timeToInteractive: metrics.tti,
        totalBlockingTime: metrics.tbt
      };
    } finally {
      await browser.close();
    }
  }

  private async analyzeResourceSizes(url: string): Promise<ResourceSizes> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      
      const responses: any[] = [];
      page.on('response', (response) => {
        responses.push({
          url: response.url(),
          status: response.status(),
          headers: response.headers(),
          resourceType: response.request().resourceType()
        });
      });

      await page.goto(url, { waitUntil: 'networkidle0' });

      // リソースサイズを計算
      const resourceSizes: ResourceSizes = {
        html: 0,
        css: 0,
        javascript: 0,
        images: 0,
        fonts: 0,
        other: 0,
        total: 0
      };

      for (const response of responses) {
        const contentLength = parseInt(response.headers['content-length'] || '0');
        
        switch (response.resourceType) {
          case 'document':
            resourceSizes.html += contentLength;
            break;
          case 'stylesheet':
            resourceSizes.css += contentLength;
            break;
          case 'script':
            resourceSizes.javascript += contentLength;
            break;
          case 'image':
            resourceSizes.images += contentLength;
            break;
          case 'font':
            resourceSizes.fonts += contentLength;
            break;
          default:
            resourceSizes.other += contentLength;
        }
      }

      resourceSizes.total = Object.values(resourceSizes).reduce((sum, size) => sum + size, 0) - resourceSizes.total;

      return resourceSizes;
    } finally {
      await browser.close();
    }
  }

  private calculatePerformanceScore(
    metrics: any,
    avgLoadTime: number,
    resourceSizes: ResourceSizes
  ): number {
    let score = 100;

    // 読み込み時間による減点
    if (avgLoadTime > 3000) score -= 20;
    else if (avgLoadTime > 2000) score -= 10;
    else if (avgLoadTime > 1000) score -= 5;

    // First Contentful Paint による減点
    if (metrics.firstContentfulPaint > 3000) score -= 15;
    else if (metrics.firstContentfulPaint > 1800) score -= 8;

    // Largest Contentful Paint による減点
    if (metrics.largestContentfulPaint > 4000) score -= 15;
    else if (metrics.largestContentfulPaint > 2500) score -= 8;

    // Time to Interactive による減点
    if (metrics.timeToInteractive > 5000) score -= 10;
    else if (metrics.timeToInteractive > 3800) score -= 5;

    // Total Blocking Time による減点
    if (metrics.totalBlockingTime > 600) score -= 10;
    else if (metrics.totalBlockingTime > 300) score -= 5;

    // リソースサイズによる減点
    const totalSizeMB = resourceSizes.total / (1024 * 1024);
    if (totalSizeMB > 5) score -= 15;
    else if (totalSizeMB > 3) score -= 8;
    else if (totalSizeMB > 2) score -= 3;

    return Math.max(0, Math.round(score));
  }

  private generateSuggestions(
    metrics: any,
    resourceSizes: ResourceSizes,
    avgLoadTime: number
  ): string[] {
    const suggestions: string[] = [];

    if (avgLoadTime > 3000) {
      suggestions.push('ページの読み込み時間が遅すぎます。サーバーの応答時間とリソースの最適化を検討してください。');
    }

    if (metrics.firstContentfulPaint > 1800) {
      suggestions.push('First Contentful Paintが遅いです。クリティカルなCSSをインライン化することを検討してください。');
    }

    if (metrics.largestContentfulPaint > 2500) {
      suggestions.push('Largest Contentful Paintが遅いです。画像の最適化やサーバーの応答時間改善を検討してください。');
    }

    if (metrics.timeToInteractive > 3800) {
      suggestions.push('Time to Interactiveが遅いです。JavaScriptの最適化とコード分割を検討してください。');
    }

    if (metrics.totalBlockingTime > 300) {
      suggestions.push('Total Blocking Timeが高いです。長時間実行されるJavaScriptタスクを最適化してください。');
    }

    const totalSizeMB = resourceSizes.total / (1024 * 1024);
    if (totalSizeMB > 3) {
      suggestions.push('総リソースサイズが大きいです。画像の圧縮、CSSとJavaScriptの最小化を検討してください。');
    }

    if (resourceSizes.images > resourceSizes.total * 0.6) {
      suggestions.push('画像ファイルのサイズが大きいです。WebP形式の使用や画像圧縮を検討してください。');
    }

    if (resourceSizes.javascript > 1024 * 1024) {
      suggestions.push('JavaScriptファイルが大きいです。コード分割と未使用コードの削除を検討してください。');
    }

    if (resourceSizes.css > 512 * 1024) {
      suggestions.push('CSSファイルが大きいです。未使用スタイルの削除とCSS最適化を検討してください。');
    }

    // キャッシュ設定の推奨
    suggestions.push('ブラウザキャッシュとCDNの利用を検討してください。');
    
    // 圧縮の推奨
    suggestions.push('Gzip圧縮やBrotli圧縮を有効にしてください。');

    return suggestions.slice(0, 8); // 最大8つの提案
  }
}