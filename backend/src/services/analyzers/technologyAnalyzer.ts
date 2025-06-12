import * as cheerio from 'cheerio';
import { PageData, TechnologyResults, TechnologyItem } from '../../types/analysis';
import { logger } from '../../utils/logger';
import axios from 'axios';

export class TechnologyAnalyzer {
  async analyze(pages: PageData[], homePage: PageData): Promise<TechnologyResults> {
    try {
      logger.info(`Starting technology analysis for ${pages.length} pages`);

      // ホームページの詳細分析
      const technologies = await this.detectTechnologies(homePage.url);
      
      const results: TechnologyResults = {
        frameworks: technologies.filter(t => t.category === 'framework'),
        libraries: technologies.filter(t => t.category === 'library'),
        cms: technologies.filter(t => t.category === 'cms'),
        servers: technologies.filter(t => t.category === 'server'),
        analytics: technologies.filter(t => t.category === 'analytics')
      };

      logger.info(`Technology analysis completed. Found ${technologies.length} technologies`);
      return results;
    } catch (error) {
      logger.error('Error in technology analysis:', error);
      throw error;
    }
  }

  private async detectTechnologies(url: string): Promise<TechnologyItem[]> {
    const technologies: TechnologyItem[] = [];

    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; WebsiteAnalyzer/1.0)'
        }
      });

      const content = response.data;
      const headers = response.headers;
      const $ = cheerio.load(content);

      // サーバー技術の検出
      technologies.push(...this.detectServerTechnologies(headers));
      
      // JavaScriptフレームワークの検出
      technologies.push(...this.detectJavaScriptFrameworks($, content));
      
      // CSSフレームワークの検出
      technologies.push(...this.detectCSSFrameworks($, content));
      
      // CMSの検出
      technologies.push(...this.detectCMS($, content, headers));
      
      // ライブラリの検出
      technologies.push(...this.detectLibraries($, content));
      
      // アナリティクスツールの検出
      technologies.push(...this.detectAnalytics($, content));
      
      // その他のツール検出
      technologies.push(...this.detectOtherTools($, content, headers));

    } catch (error) {
      logger.error(`Error detecting technologies for ${url}:`, error);
    }

    return this.removeDuplicates(technologies);
  }

  private detectServerTechnologies(headers: any): TechnologyItem[] {
    const technologies: TechnologyItem[] = [];

    // サーバー情報
    const server = headers['server'];
    if (server) {
      const serverMatch = server.match(/^([^\/\s]+)(?:\/([^\s]+))?/);
      if (serverMatch) {
        technologies.push({
          name: serverMatch[1],
          version: serverMatch[2],
          confidence: 100,
          category: 'server'
        });
      }
    }

    // プログラミング言語の推測
    const poweredBy = headers['x-powered-by'];
    if (poweredBy) {
      if (poweredBy.includes('PHP')) {
        const phpMatch = poweredBy.match(/PHP\/([^\s]+)/);
        technologies.push({
          name: 'PHP',
          version: phpMatch ? phpMatch[1] : undefined,
          confidence: 90,
          category: 'server'
        });
      } else if (poweredBy.includes('ASP.NET')) {
        technologies.push({
          name: 'ASP.NET',
          confidence: 90,
          category: 'server'
        });
      }
    }

    return technologies;
  }

  private detectJavaScriptFrameworks($: cheerio.CheerioAPI, content: string): TechnologyItem[] {
    const technologies: TechnologyItem[] = [];

    // React
    if (content.includes('__REACT_DEVTOOLS_GLOBAL_HOOK__') || 
        content.includes('react') && content.includes('ReactDOM')) {
      const reactVersion = this.extractVersion(content, /react.*?([0-9]+\.[0-9]+\.[0-9]+)/gi);
      technologies.push({
        name: 'React',
        version: reactVersion,
        confidence: 90,
        category: 'framework'
      });
    }

    // Vue.js
    if (content.includes('Vue.config') || content.includes('__VUE__')) {
      const vueVersion = this.extractVersion(content, /vue.*?([0-9]+\.[0-9]+\.[0-9]+)/gi);
      technologies.push({
        name: 'Vue.js',
        version: vueVersion,
        confidence: 90,
        category: 'framework'
      });
    }

    // Angular
    if (content.includes('ng-version') || content.includes('angular')) {
      const angularVersion = this.extractVersion(content, /angular.*?([0-9]+\.[0-9]+\.[0-9]+)/gi);
      technologies.push({
        name: 'Angular',
        version: angularVersion,
        confidence: 85,
        category: 'framework'
      });
    }

    // Next.js
    if (content.includes('__NEXT_DATA__') || content.includes('next.js')) {
      technologies.push({
        name: 'Next.js',
        confidence: 95,
        category: 'framework'
      });
    }

    // Nuxt.js
    if (content.includes('__NUXT__')) {
      technologies.push({
        name: 'Nuxt.js',
        confidence: 95,
        category: 'framework'
      });
    }

    return technologies;
  }

  private detectCSSFrameworks($: cheerio.CheerioAPI, content: string): TechnologyItem[] {
    const technologies: TechnologyItem[] = [];

    // Bootstrap
    if (content.includes('bootstrap') || $('.container, .row, .col').length > 0) {
      const bootstrapVersion = this.extractVersion(content, /bootstrap.*?([0-9]+\.[0-9]+\.[0-9]+)/gi);
      technologies.push({
        name: 'Bootstrap',
        version: bootstrapVersion,
        confidence: 80,
        category: 'framework'
      });
    }

    // Tailwind CSS
    if (content.includes('tailwindcss') || $('.flex, .grid, .bg-').length > 0) {
      technologies.push({
        name: 'Tailwind CSS',
        confidence: 75,
        category: 'framework'
      });
    }

    // Bulma
    if (content.includes('bulma') || $('.column, .columns').length > 0) {
      technologies.push({
        name: 'Bulma',
        confidence: 70,
        category: 'framework'
      });
    }

    // Foundation
    if (content.includes('foundation') || $('.grid-x, .cell').length > 0) {
      technologies.push({
        name: 'Foundation',
        confidence: 70,
        category: 'framework'
      });
    }

    return technologies;
  }

  private detectCMS($: cheerio.CheerioAPI, content: string, headers: any): TechnologyItem[] {
    const technologies: TechnologyItem[] = [];

    // WordPress
    if (content.includes('wp-content') || 
        content.includes('wordpress') ||
        $('link[href*="wp-content"]').length > 0) {
      const wpVersion = this.extractVersion(content, /wordpress.*?([0-9]+\.[0-9]+(?:\.[0-9]+)?)/gi);
      technologies.push({
        name: 'WordPress',
        version: wpVersion,
        confidence: 95,
        category: 'cms'
      });
    }

    // Drupal
    if (content.includes('Drupal') || 
        $('script[src*="drupal"], link[href*="drupal"]').length > 0) {
      technologies.push({
        name: 'Drupal',
        confidence: 90,
        category: 'cms'
      });
    }

    // Joomla
    if (content.includes('joomla') || 
        content.includes('/components/com_')) {
      technologies.push({
        name: 'Joomla',
        confidence: 90,
        category: 'cms'
      });
    }

    // Shopify
    if (content.includes('shopify') || 
        content.includes('cdn.shopify.com')) {
      technologies.push({
        name: 'Shopify',
        confidence: 95,
        category: 'cms'
      });
    }

    // Wix
    if (content.includes('wixstatic.com') || 
        content.includes('wix.com')) {
      technologies.push({
        name: 'Wix',
        confidence: 95,
        category: 'cms'
      });
    }

    return technologies;
  }

  private detectLibraries($: cheerio.CheerioAPI, content: string): TechnologyItem[] {
    const technologies: TechnologyItem[] = [];

    // jQuery
    if (content.includes('jquery') || typeof (global as any).$ !== 'undefined') {
      const jqueryVersion = this.extractVersion(content, /jquery.*?([0-9]+\.[0-9]+\.[0-9]+)/gi);
      technologies.push({
        name: 'jQuery',
        version: jqueryVersion,
        confidence: 90,
        category: 'library'
      });
    }

    // Lodash
    if (content.includes('lodash')) {
      const lodashVersion = this.extractVersion(content, /lodash.*?([0-9]+\.[0-9]+\.[0-9]+)/gi);
      technologies.push({
        name: 'Lodash',
        version: lodashVersion,
        confidence: 85,
        category: 'library'
      });
    }

    // Moment.js
    if (content.includes('moment.js') || content.includes('moment.min.js')) {
      technologies.push({
        name: 'Moment.js',
        confidence: 90,
        category: 'library'
      });
    }

    // Chart.js
    if (content.includes('chart.js')) {
      technologies.push({
        name: 'Chart.js',
        confidence: 90,
        category: 'library'
      });
    }

    // D3.js
    if (content.includes('d3.js') || content.includes('d3.min.js')) {
      technologies.push({
        name: 'D3.js',
        confidence: 90,
        category: 'library'
      });
    }

    return technologies;
  }

  private detectAnalytics($: cheerio.CheerioAPI, content: string): TechnologyItem[] {
    const technologies: TechnologyItem[] = [];

    // Google Analytics
    if (content.includes('google-analytics.com') || 
        content.includes('googletagmanager.com') ||
        content.includes('gtag(')) {
      technologies.push({
        name: 'Google Analytics',
        confidence: 95,
        category: 'analytics'
      });
    }

    // Google Tag Manager
    if (content.includes('googletagmanager.com')) {
      technologies.push({
        name: 'Google Tag Manager',
        confidence: 95,
        category: 'analytics'
      });
    }

    // Adobe Analytics
    if (content.includes('omniture.com') || 
        content.includes('adobe.com/analytics')) {
      technologies.push({
        name: 'Adobe Analytics',
        confidence: 90,
        category: 'analytics'
      });
    }

    // Facebook Pixel
    if (content.includes('facebook.net/tr') || 
        content.includes('fbevents.js')) {
      technologies.push({
        name: 'Facebook Pixel',
        confidence: 90,
        category: 'analytics'
      });
    }

    // Hotjar
    if (content.includes('hotjar.com')) {
      technologies.push({
        name: 'Hotjar',
        confidence: 90,
        category: 'analytics'
      });
    }

    return technologies;
  }

  private detectOtherTools($: cheerio.CheerioAPI, content: string, headers: any): TechnologyItem[] {
    const technologies: TechnologyItem[] = [];

    // CDN
    if (content.includes('cloudflare.com')) {
      technologies.push({
        name: 'Cloudflare',
        confidence: 95,
        category: 'server'
      });
    }

    if (content.includes('amazonaws.com')) {
      technologies.push({
        name: 'Amazon CloudFront',
        confidence: 85,
        category: 'server'
      });
    }

    // Cookie管理
    if (content.includes('cookiebot') || content.includes('cookie consent')) {
      technologies.push({
        name: 'Cookie Consent',
        confidence: 80,
        category: 'library'
      });
    }

    // フォント
    if (content.includes('fonts.googleapis.com')) {
      technologies.push({
        name: 'Google Fonts',
        confidence: 95,
        category: 'library'
      });
    }

    if (content.includes('typekit.net') || content.includes('use.typekit.net')) {
      technologies.push({
        name: 'Adobe Fonts (Typekit)',
        confidence: 90,
        category: 'library'
      });
    }

    return technologies;
  }

  private extractVersion(content: string, pattern: RegExp): string | undefined {
    const matches = content.match(pattern);
    if (matches && matches.length > 0) {
      const versionMatch = matches[0].match(/([0-9]+\.[0-9]+(?:\.[0-9]+)?)/);
      return versionMatch ? versionMatch[1] : undefined;
    }
    return undefined;
  }

  private removeDuplicates(technologies: TechnologyItem[]): TechnologyItem[] {
    const seen = new Map<string, TechnologyItem>();
    
    technologies.forEach(tech => {
      const key = `${tech.name}-${tech.category}`;
      const existing = seen.get(key);
      
      if (!existing || tech.confidence > existing.confidence) {
        seen.set(key, tech);
      }
    });

    return Array.from(seen.values()).sort((a, b) => b.confidence - a.confidence);
  }
}