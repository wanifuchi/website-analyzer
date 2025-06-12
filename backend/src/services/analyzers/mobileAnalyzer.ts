import * as cheerio from 'cheerio';
import { PageData, MobileResults } from '../../types/analysis';
import { logger } from '../../utils/logger';
import puppeteer from 'puppeteer';

export class MobileAnalyzer {
  async analyze(pages: PageData[], homePage: PageData): Promise<MobileResults> {
    try {
      logger.info(`Starting mobile analysis for ${pages.length} pages`);

      // モバイル環境でのページ分析
      const mobileAnalysis = await this.analyzeMobileCompatibility(homePage.url);
      
      // スコア計算
      const score = this.calculateMobileScore(mobileAnalysis);
      
      // 改善提案生成
      const suggestions = this.generateSuggestions(mobileAnalysis);

      const results: MobileResults = {
        score,
        hasViewportMeta: mobileAnalysis.hasViewportMeta,
        isResponsive: mobileAnalysis.isResponsive,
        touchTargetSize: mobileAnalysis.touchTargetSize,
        textSize: mobileAnalysis.textSize,
        loadTime: mobileAnalysis.loadTime,
        suggestions
      };

      logger.info(`Mobile analysis completed with score: ${score}`);
      return results;
    } catch (error) {
      logger.error('Error in mobile analysis:', error);
      throw error;
    }
  }

  private async analyzeMobileCompatibility(url: string): Promise<{
    hasViewportMeta: boolean;
    isResponsive: boolean;
    touchTargetSize: boolean;
    textSize: boolean;
    loadTime: number;
    viewportWidth: number;
    hasOverflow: boolean;
    usesMediaQueries: boolean;
  }> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      
      // モバイルデバイスをエミュレート
      await page.emulate({
        name: 'iPhone 12',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
        viewport: {
          width: 390,
          height: 844,
          deviceScaleFactor: 3,
          isMobile: true,
          hasTouch: true,
          isLandscape: false
        }
      });

      const startTime = Date.now();
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      const loadTime = Date.now() - startTime;

      const content = await page.content();
      const $ = cheerio.load(content);

      // ビューポートメタタグのチェック
      const hasViewportMeta = this.checkViewportMeta($);
      
      // レスポンシブデザインのチェック
      const responsiveChecks = await this.checkResponsiveDesign(page);
      
      // タッチターゲットサイズのチェック
      const touchTargetSize = await this.checkTouchTargetSize(page);
      
      // テキストサイズのチェック
      const textSize = await this.checkTextSize(page);
      
      // CSS メディアクエリの使用チェック
      const usesMediaQueries = this.checkMediaQueries(content);

      return {
        hasViewportMeta,
        isResponsive: responsiveChecks.isResponsive,
        touchTargetSize,
        textSize,
        loadTime,
        viewportWidth: responsiveChecks.viewportWidth,
        hasOverflow: responsiveChecks.hasOverflow,
        usesMediaQueries
      };
    } finally {
      await browser.close();
    }
  }

  private checkViewportMeta($: cheerio.CheerioAPI): boolean {
    const viewportMeta = $('meta[name="viewport"]');
    
    if (viewportMeta.length === 0) {
      return false;
    }

    const content = viewportMeta.attr('content') || '';
    
    // 適切なビューポート設定をチェック
    const hasWidth = content.includes('width=device-width');
    const hasInitialScale = content.includes('initial-scale=1');
    
    return hasWidth && hasInitialScale;
  }

  private async checkResponsiveDesign(page: any): Promise<{
    isResponsive: boolean;
    viewportWidth: number;
    hasOverflow: boolean;
  }> {
    // ページの幅を取得
    const dimensions = await page.evaluate(() => {
      return {
        bodyWidth: document.body.scrollWidth,
        windowWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth
      };
    });

    const viewportWidth = 390; // iPhone 12の幅
    const hasOverflow = dimensions.bodyWidth > viewportWidth + 10; // 10pxの余裕
    
    // デスクトップサイズでも確認
    await page.setViewport({ width: 1366, height: 768 });
    await page.reload({ waitUntil: 'domcontentloaded' });
    
    const desktopDimensions = await page.evaluate(() => {
      return {
        bodyWidth: document.body.scrollWidth,
        windowWidth: window.innerWidth
      };
    });

    // モバイルとデスクトップでレイアウトが変わるかチェック
    const isResponsive = Math.abs(dimensions.bodyWidth - desktopDimensions.bodyWidth) > 100;

    // モバイルビューに戻す
    await page.setViewport({ width: 390, height: 844 });

    return {
      isResponsive,
      viewportWidth: dimensions.bodyWidth,
      hasOverflow
    };
  }

  private async checkTouchTargetSize(page: any): Promise<boolean> {
    const touchTargets = await page.evaluate(() => {
      const targets = document.querySelectorAll('a, button, input[type="button"], input[type="submit"], [onclick], [role="button"]');
      const smallTargets: any[] = [];

      targets.forEach(target => {
        const rect = target.getBoundingClientRect();
        const size = Math.min(rect.width, rect.height);
        
        // 44px未満のタッチターゲットは小さすぎる
        if (size > 0 && size < 44) {
          smallTargets.push({
            width: rect.width,
            height: rect.height,
            tagName: target.tagName
          });
        }
      });

      return smallTargets;
    });

    // 小さなタッチターゲットが全体の20%以下なら合格
    const totalTargets = await page.$$eval('a, button, input[type="button"], input[type="submit"], [onclick], [role="button"]', elements => elements.length);
    
    return touchTargets.length < totalTargets * 0.2;
  }

  private async checkTextSize(page: any): Promise<boolean> {
    const textSizes = await page.evaluate(() => {
      const textElements = document.querySelectorAll('p, span, div, li, td, th, h1, h2, h3, h4, h5, h6');
      const smallTexts: any[] = [];

      textElements.forEach(element => {
        const style = window.getComputedStyle(element);
        const fontSize = parseFloat(style.fontSize);
        
        // 16px未満のテキストは小さすぎる（モバイルでは）
        if (fontSize > 0 && fontSize < 16 && element.textContent?.trim()) {
          smallTexts.push({
            fontSize,
            tagName: element.tagName,
            textContent: element.textContent?.substring(0, 50)
          });
        }
      });

      return smallTexts;
    });

    // 小さなテキストが全体の30%以下なら合格
    const totalTextElements = await page.$$eval('p, span, div, li, td, th, h1, h2, h3, h4, h5, h6', elements => 
      elements.filter(el => el.textContent?.trim()).length
    );
    
    return textSizes.length < totalTextElements * 0.3;
  }

  private checkMediaQueries(content: string): boolean {
    // CSSメディアクエリの使用をチェック
    const mediaQueryPatterns = [
      /@media\s*\([^)]*max-width/gi,
      /@media\s*\([^)]*min-width/gi,
      /@media\s*\([^)]*screen/gi,
      /@media\s*\([^)]*mobile/gi
    ];

    return mediaQueryPatterns.some(pattern => pattern.test(content));
  }

  private calculateMobileScore(analysis: {
    hasViewportMeta: boolean;
    isResponsive: boolean;
    touchTargetSize: boolean;
    textSize: boolean;
    loadTime: number;
    hasOverflow: boolean;
    usesMediaQueries: boolean;
  }): number {
    let score = 100;

    // ビューポートメタタグ
    if (!analysis.hasViewportMeta) {
      score -= 20;
    }

    // レスポンシブデザイン
    if (!analysis.isResponsive) {
      score -= 25;
    }

    // 横スクロール
    if (analysis.hasOverflow) {
      score -= 15;
    }

    // タッチターゲットサイズ
    if (!analysis.touchTargetSize) {
      score -= 15;
    }

    // テキストサイズ
    if (!analysis.textSize) {
      score -= 10;
    }

    // 読み込み時間（モバイルでは特に重要）
    if (analysis.loadTime > 5000) {
      score -= 20;
    } else if (analysis.loadTime > 3000) {
      score -= 10;
    } else if (analysis.loadTime > 2000) {
      score -= 5;
    }

    // メディアクエリの使用
    if (!analysis.usesMediaQueries) {
      score -= 10;
    }

    return Math.max(0, Math.round(score));
  }

  private generateSuggestions(analysis: {
    hasViewportMeta: boolean;
    isResponsive: boolean;
    touchTargetSize: boolean;
    textSize: boolean;
    loadTime: number;
    hasOverflow: boolean;
    usesMediaQueries: boolean;
  }): string[] {
    const suggestions: string[] = [];

    if (!analysis.hasViewportMeta) {
      suggestions.push('ビューポートメタタグを追加してください: <meta name="viewport" content="width=device-width, initial-scale=1">');
    }

    if (!analysis.isResponsive) {
      suggestions.push('レスポンシブデザインを実装してください。CSSメディアクエリを使用して異なる画面サイズに対応させてください。');
    }

    if (analysis.hasOverflow) {
      suggestions.push('横スクロールが発生しています。コンテンツ幅をモバイル画面に収まるよう調整してください。');
    }

    if (!analysis.touchTargetSize) {
      suggestions.push('タッチターゲット（ボタンやリンク）のサイズを44px以上にしてください。');
    }

    if (!analysis.textSize) {
      suggestions.push('モバイルでの可読性向上のため、フォントサイズを16px以上にしてください。');
    }

    if (analysis.loadTime > 3000) {
      suggestions.push('モバイルでの読み込み時間が遅いです。画像の最適化やファイルサイズの削減を検討してください。');
    }

    if (!analysis.usesMediaQueries) {
      suggestions.push('CSSメディアクエリを使用してモバイル専用のスタイルを定義してください。');
    }

    // 一般的なモバイル最適化提案
    suggestions.push('モバイルファーストデザインを採用してください。');
    suggestions.push('画像をレスポンシブにして、異なる画面密度に対応してください。');
    suggestions.push('モバイルでのユーザビリティテストを実施してください。');
    suggestions.push('AMP（Accelerated Mobile Pages）の導入を検討してください。');

    return suggestions.slice(0, 8); // 最大8つの提案
  }
}