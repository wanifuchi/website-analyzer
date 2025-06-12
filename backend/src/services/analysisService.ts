import * as cheerio from 'cheerio';
import { PageData, AnalysisResults } from '../types/analysis';
import { SEOAnalyzer } from './analyzers/seoAnalyzer';
import { PerformanceAnalyzer } from './analyzers/performanceAnalyzer';
import { SecurityAnalyzer } from './analyzers/securityAnalyzer';
import { AccessibilityAnalyzer } from './analyzers/accessibilityAnalyzer';
import { MobileAnalyzer } from './analyzers/mobileAnalyzer';
import { TechnologyAnalyzer } from './analyzers/technologyAnalyzer';
import { logger } from '../utils/logger';

export class AnalysisService {
  private seoAnalyzer = new SEOAnalyzer();
  private performanceAnalyzer = new PerformanceAnalyzer();
  private securityAnalyzer = new SecurityAnalyzer();
  private accessibilityAnalyzer = new AccessibilityAnalyzer();
  private mobileAnalyzer = new MobileAnalyzer();
  private technologyAnalyzer = new TechnologyAnalyzer();

  async analyzePages(pages: PageData[], baseUrl: string): Promise<AnalysisResults> {
    logger.info(`Starting analysis for ${pages.length} pages from ${baseUrl}`);

    try {
      const homePage = pages.find(p => p.url === baseUrl) || pages[0];
      
      // 各分析モジュールを並列実行
      const [
        seoResults,
        performanceResults,
        securityResults,
        accessibilityResults,
        mobileResults,
        technologyResults
      ] = await Promise.all([
        this.seoAnalyzer.analyze(pages, homePage),
        this.performanceAnalyzer.analyze(pages, homePage),
        this.securityAnalyzer.analyze(pages, homePage),
        this.accessibilityAnalyzer.analyze(pages, homePage),
        this.mobileAnalyzer.analyze(pages, homePage),
        this.technologyAnalyzer.analyze(pages, homePage)
      ]);

      // 総合評価を計算
      const overallScore = this.calculateOverallScore(
        seoResults.score,
        performanceResults.score,
        securityResults.score,
        accessibilityResults.score,
        mobileResults.score
      );

      const overallGrade = this.calculateGrade(overallScore);
      const prioritySuggestions = this.generatePrioritySuggestions([
        ...seoResults.suggestions,
        ...performanceResults.suggestions,
        ...securityResults.suggestions,
        ...accessibilityResults.suggestions,
        ...mobileResults.suggestions
      ]);

      const results: AnalysisResults = {
        seo: seoResults,
        performance: performanceResults,
        security: securityResults,
        accessibility: accessibilityResults,
        mobile: mobileResults,
        technology: technologyResults,
        overall: {
          score: overallScore,
          grade: overallGrade,
          summary: this.generateSummary(overallScore, overallGrade),
          prioritySuggestions
        }
      };

      logger.info(`Analysis completed for ${baseUrl}`, { 
        overallScore, 
        overallGrade,
        totalPages: pages.length 
      });

      return results;
    } catch (error) {
      logger.error('Error during analysis:', error);
      throw error;
    }
  }

  private calculateOverallScore(
    seoScore: number,
    performanceScore: number,
    securityScore: number,
    accessibilityScore: number,
    mobileScore: number
  ): number {
    // 重み付き平均を計算
    const weights = {
      seo: 0.25,
      performance: 0.20,
      security: 0.20,
      accessibility: 0.15,
      mobile: 0.20
    };

    return Math.round(
      seoScore * weights.seo +
      performanceScore * weights.performance +
      securityScore * weights.security +
      accessibilityScore * weights.accessibility +
      mobileScore * weights.mobile
    );
  }

  private calculateGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  private generateSummary(score: number, grade: string): string {
    const gradeMessages = {
      'A': 'ウェブサイトは優秀な状態です。継続的な改善を行い、この品質を維持してください。',
      'B': 'ウェブサイトは良好な状態です。いくつかの改善点を対応することで、さらに良くなります。',
      'C': 'ウェブサイトは平均的な状態です。重要な改善点を優先的に対応することをお勧めします。',
      'D': 'ウェブサイトには多くの改善が必要です。優先度の高い問題から順次対応してください。',
      'F': 'ウェブサイトには重大な問題があります。すぐに改善が必要です。'
    };

    return `総合スコア: ${score}点 (${grade}ランク)\n${gradeMessages[grade as keyof typeof gradeMessages]}`;
  }

  private generatePrioritySuggestions(allSuggestions: string[]): string[] {
    // 重要度の高い提案を抽出・整理
    const priorityKeywords = [
      'セキュリティ',
      'HTTPS',
      'パフォーマンス',
      '読み込み速度',
      'SEO',
      'アクセシビリティ',
      'モバイル'
    ];

    const prioritySuggestions = allSuggestions.filter(suggestion =>
      priorityKeywords.some(keyword => suggestion.includes(keyword))
    );

    // 重複を除去し、最大5つまでに制限
    return Array.from(new Set(prioritySuggestions)).slice(0, 5);
  }
}