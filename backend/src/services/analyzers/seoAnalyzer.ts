import * as cheerio from 'cheerio';
import { PageData, SEOResults, SEOIssue, MetaTagAnalysis, HeadingStructure, KeywordAnalysis, StructuredDataAnalysis } from '../../types/analysis';
import { logger } from '../../utils/logger';
import puppeteer from 'puppeteer';

export class SEOAnalyzer {
  async analyze(pages: PageData[], homePage: PageData): Promise<SEOResults> {
    try {
      logger.info(`Starting SEO analysis for ${pages.length} pages`);

      const issues: SEOIssue[] = [];
      const suggestions: string[] = [];
      let totalScore = 0;
      let scoreCount = 0;

      // ホームページの詳細分析
      const homePageAnalysis = await this.analyzePageContent(homePage);
      issues.push(...homePageAnalysis.issues);
      suggestions.push(...homePageAnalysis.suggestions);
      totalScore += homePageAnalysis.score;
      scoreCount++;

      // 他のページの簡易分析
      for (const page of pages.slice(0, 10)) { // 最大10ページまで詳細分析
        if (page.url === homePage.url) continue;
        
        const pageAnalysis = await this.analyzePageContent(page);
        issues.push(...pageAnalysis.issues);
        suggestions.push(...pageAnalysis.suggestions);
        totalScore += pageAnalysis.score;
        scoreCount++;
      }

      // 全体的なSEO分析
      const duplicateTitles = this.findDuplicateTitles(pages);
      if (duplicateTitles.length > 0) {
        issues.push({
          type: 'warning',
          category: 'タイトル',
          message: `重複するタイトルが${duplicateTitles.length}件見つかりました`,
        });
        suggestions.push('各ページに固有のタイトルを設定してください');
      }

      const averageScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0;
      
      const results: SEOResults = {
        score: averageScore,
        issues: this.removeDuplicateIssues(issues),
        suggestions: Array.from(new Set(suggestions)).slice(0, 10),
        metaTags: homePageAnalysis.metaTags,
        headingStructure: homePageAnalysis.headingStructure,
        keywords: homePageAnalysis.keywords,
        structuredData: homePageAnalysis.structuredData
      };

      logger.info(`SEO analysis completed with score: ${averageScore}`);
      return results;
    } catch (error) {
      logger.error('Error in SEO analysis:', error);
      throw error;
    }
  }

  private async analyzePageContent(page: PageData): Promise<{
    score: number;
    issues: SEOIssue[];
    suggestions: string[];
    metaTags: MetaTagAnalysis;
    headingStructure: HeadingStructure;
    keywords: KeywordAnalysis;
    structuredData: StructuredDataAnalysis;
  }> {
    try {
      // Puppeteerでページの詳細な内容を取得
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const puppeteerPage = await browser.newPage();
      await puppeteerPage.goto(page.url, { waitUntil: 'domcontentloaded' });
      const content = await puppeteerPage.content();
      await browser.close();

      const $ = cheerio.load(content);
      
      const issues: SEOIssue[] = [];
      const suggestions: string[] = [];
      let score = 100;

      // メタタグ分析
      const metaTags = this.analyzeMetaTags($, page.url);
      if (!metaTags.title.optimal) {
        score -= 15;
        issues.push({
          type: 'error',
          category: 'タイトル',
          message: `タイトルタグが最適ではありません (${metaTags.title.length}文字)`,
          url: page.url
        });
        suggestions.push('タイトルは30-60文字で設定してください');
      }

      if (!metaTags.description.optimal) {
        score -= 10;
        issues.push({
          type: 'warning',
          category: 'メタ説明',
          message: `メタ説明が最適ではありません (${metaTags.description.length}文字)`,
          url: page.url
        });
        suggestions.push('メタ説明は120-160文字で設定してください');
      }

      // 見出し構造分析
      const headingStructure = this.analyzeHeadingStructure($, page.url);
      if (!headingStructure.hasProperHierarchy) {
        score -= 8;
        issues.push({
          type: 'warning',
          category: '見出し構造',
          message: '見出しの階層構造が適切ではありません',
          url: page.url
        });
        suggestions.push('H1からH6まで順序立てて見出しを使用してください');
      }

      if (headingStructure.h1Count !== 1) {
        score -= 5;
        issues.push({
          type: 'warning',
          category: 'H1タグ',
          message: `H1タグの数が適切ではありません (${headingStructure.h1Count}個)`,
          url: page.url
        });
        suggestions.push('各ページにH1タグを1つだけ設定してください');
      }

      // キーワード分析
      const keywords = this.analyzeKeywords($);
      
      // 構造化データ分析
      const structuredData = this.analyzeStructuredData($);
      if (!structuredData.hasStructuredData) {
        score -= 5;
        suggestions.push('構造化データ（Schema.org）の実装を検討してください');
      }

      // 画像のalt属性チェック
      const imagesWithoutAlt = $('img:not([alt])').length;
      if (imagesWithoutAlt > 0) {
        score -= Math.min(10, imagesWithoutAlt * 2);
        issues.push({
          type: 'warning',
          category: '画像SEO',
          message: `alt属性がない画像が${imagesWithoutAlt}個見つかりました`,
          url: page.url
        });
        suggestions.push('すべての画像にalt属性を設定してください');
      }

      return {
        score: Math.max(0, score),
        issues,
        suggestions,
        metaTags,
        headingStructure,
        keywords,
        structuredData
      };
    } catch (error) {
      logger.error(`Error analyzing page content for ${page.url}:`, error);
      return {
        score: 0,
        issues: [{
          type: 'error',
          category: 'ページ分析',
          message: 'ページ内容の分析に失敗しました',
          url: page.url
        }],
        suggestions: [],
        metaTags: this.getEmptyMetaTags(),
        headingStructure: this.getEmptyHeadingStructure(),
        keywords: this.getEmptyKeywords(),
        structuredData: this.getEmptyStructuredData()
      };
    }
  }

  private analyzeMetaTags($: cheerio.CheerioAPI, url: string): MetaTagAnalysis {
    const title = $('title').text().trim();
    const description = $('meta[name="description"]').attr('content')?.trim() || '';
    const keywords = $('meta[name="keywords"]').attr('content')?.trim();
    const canonical = $('link[rel="canonical"]').attr('href');
    const robots = $('meta[name="robots"]').attr('content');

    return {
      title: {
        present: title.length > 0,
        length: title.length,
        content: title,
        optimal: title.length >= 30 && title.length <= 60
      },
      description: {
        present: description.length > 0,
        length: description.length,
        content: description,
        optimal: description.length >= 120 && description.length <= 160
      },
      keywords: keywords ? {
        present: true,
        content: keywords
      } : undefined,
      canonical: canonical ? {
        present: true,
        url: canonical
      } : undefined,
      robots: robots ? {
        present: true,
        content: robots
      } : undefined
    };
  }

  private analyzeHeadingStructure($: cheerio.CheerioAPI, url: string): HeadingStructure {
    const h1Count = $('h1').length;
    const h2Count = $('h2').length;
    const h3Count = $('h3').length;
    const h4Count = $('h4').length;
    const h5Count = $('h5').length;
    const h6Count = $('h6').length;

    const issues: string[] = [];
    let hasProperHierarchy = true;

    if (h1Count !== 1) {
      hasProperHierarchy = false;
      issues.push(`H1タグが${h1Count}個あります（推奨: 1個）`);
    }

    // 階層の順序をチェック
    const headings = $('h1, h2, h3, h4, h5, h6').map((_, el) => {
      return parseInt($(el).prop('tagName').substring(1));
    }).get();

    for (let i = 1; i < headings.length; i++) {
      const current = headings[i];
      const previous = headings[i - 1];
      
      if (current > previous + 1) {
        hasProperHierarchy = false;
        issues.push(`見出しレベルが飛んでいます (H${previous} → H${current})`);
        break;
      }
    }

    return {
      h1Count,
      h2Count,
      h3Count,
      h4Count,
      h5Count,
      h6Count,
      hasProperHierarchy,
      issues
    };
  }

  private analyzeKeywords($: cheerio.CheerioAPI): KeywordAnalysis {
    const textContent = $('body').text().toLowerCase();
    const words = textContent.match(/[ぁ-んァ-ヶー一-龠a-zA-Z]+/g) || [];
    
    // 文字数カウント
    const wordCount: { [key: string]: number } = {};
    words.forEach(word => {
      if (word.length > 2) { // 2文字以下は除外
        wordCount[word] = (wordCount[word] || 0) + 1;
      }
    });

    // 上位キーワードを抽出
    const topKeywords = Object.entries(wordCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([keyword, count]) => ({
        keyword,
        count,
        density: Math.round((count / words.length) * 100 * 100) / 100
      }));

    // タイトルと見出しからキーワードを抽出
    const titleKeywords = $('title').text().toLowerCase().match(/[ぁ-んァ-ヶー一-龠a-zA-Z]+/g) || [];
    const headingKeywords = $('h1, h2, h3').map((_, el) => $(el).text().toLowerCase()).get().join(' ').match(/[ぁ-んァ-ヶー一-龠a-zA-Z]+/g) || [];

    return {
      topKeywords,
      titleKeywords: Array.from(new Set(titleKeywords)),
      headingKeywords: Array.from(new Set(headingKeywords))
    };
  }

  private analyzeStructuredData($: cheerio.CheerioAPI): StructuredDataAnalysis {
    const jsonLdScripts = $('script[type="application/ld+json"]');
    const microdataElements = $('[itemscope]');
    const rdfa = $('[typeof], [property]');

    const types: string[] = [];
    const errors: string[] = [];
    let count = 0;

    // JSON-LD の分析
    jsonLdScripts.each((_, script) => {
      try {
        const data = JSON.parse($(script).html() || '{}');
        if (data['@type']) {
          types.push(data['@type']);
          count++;
        }
      } catch (error) {
        errors.push('JSON-LDの形式が正しくありません');
      }
    });

    // Microdata の分析
    microdataElements.each((_, element) => {
      const itemtype = $(element).attr('itemtype');
      if (itemtype) {
        types.push(itemtype.split('/').pop() || '');
        count++;
      }
    });

    // RDFa の分析
    if (rdfa.length > 0) {
      types.push('RDFa');
      count += rdfa.length;
    }

    return {
      hasStructuredData: count > 0,
      types: Array.from(new Set(types)),
      count,
      errors
    };
  }

  private findDuplicateTitles(pages: PageData[]): string[] {
    const titleCount: { [key: string]: number } = {};
    
    pages.forEach(page => {
      if (page.title && page.title !== 'Error') {
        titleCount[page.title] = (titleCount[page.title] || 0) + 1;
      }
    });

    return Object.entries(titleCount)
      .filter(([, count]) => count > 1)
      .map(([title]) => title);
  }

  private removeDuplicateIssues(issues: SEOIssue[]): SEOIssue[] {
    const seen = new Set<string>();
    return issues.filter(issue => {
      const key = `${issue.category}-${issue.message}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private getEmptyMetaTags(): MetaTagAnalysis {
    return {
      title: { present: false, length: 0, optimal: false },
      description: { present: false, length: 0, optimal: false }
    };
  }

  private getEmptyHeadingStructure(): HeadingStructure {
    return {
      h1Count: 0,
      h2Count: 0,
      h3Count: 0,
      h4Count: 0,
      h5Count: 0,
      h6Count: 0,
      hasProperHierarchy: false,
      issues: []
    };
  }

  private getEmptyKeywords(): KeywordAnalysis {
    return {
      topKeywords: [],
      titleKeywords: [],
      headingKeywords: []
    };
  }

  private getEmptyStructuredData(): StructuredDataAnalysis {
    return {
      hasStructuredData: false,
      types: [],
      count: 0,
      errors: []
    };
  }
}