import PDFDocument from 'pdfkit';
import { createObjectCsvWriter } from 'csv-writer';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Analysis, AnalysisResults } from '../types/analysis';
import { logger } from '../utils/logger';
import path from 'path';
import fs from 'fs/promises';

export class ReportService {
  private readonly reportsDir: string;

  constructor() {
    this.reportsDir = process.env.REPORT_STORAGE_PATH || './reports';
    this.ensureReportsDir();
  }

  private async ensureReportsDir(): Promise<void> {
    try {
      await fs.mkdir(this.reportsDir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create reports directory:', error);
    }
  }

  async generatePDFReport(analysis: Analysis): Promise<Buffer> {
    try {
      logger.info(`Generating PDF report for analysis ${analysis.id}`);

      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', (buffer) => buffers.push(buffer));
      
      return new Promise((resolve, reject) => {
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          logger.info(`PDF report generated successfully for analysis ${analysis.id}`);
          resolve(pdfBuffer);
        });

        doc.on('error', reject);

        this.buildPDFContent(doc, analysis);
        doc.end();
      });
    } catch (error) {
      logger.error(`Error generating PDF report for analysis ${analysis.id}:`, error);
      throw error;
    }
  }

  private buildPDFContent(doc: PDFDocument, analysis: Analysis): void {
    const results = analysis.results;
    if (!results) {
      throw new Error('分析結果が見つかりません');
    }

    // ヘッダー
    this.addHeader(doc, analysis);
    
    // サマリー
    this.addSummary(doc, analysis, results);
    
    // SEO分析
    this.addSEOSection(doc, results.seo);
    
    // パフォーマンス分析
    this.addPerformanceSection(doc, results.performance);
    
    // セキュリティ分析
    this.addSecuritySection(doc, results.security);
    
    // アクセシビリティ分析
    this.addAccessibilitySection(doc, results.accessibility);
    
    // モバイル対応度
    this.addMobileSection(doc, results.mobile);
    
    // 技術スタック
    this.addTechnologySection(doc, results.technology);
    
    // 改善提案
    this.addRecommendations(doc, results);
    
    // フッター
    this.addFooter(doc);
  }

  private addHeader(doc: PDFDocument, analysis: Analysis): void {
    doc.fontSize(24).text('ウェブサイト分析レポート', { align: 'center' });
    doc.moveDown();
    
    doc.fontSize(14)
       .text(`分析対象: ${analysis.url}`, { align: 'center' })
       .text(`生成日時: ${format(new Date(), 'yyyy年MM月dd日 HH:mm', { locale: ja })}`, { align: 'center' });
    
    doc.moveDown(2);
  }

  private addSummary(doc: PDFDocument, analysis: Analysis, results: AnalysisResults): void {
    doc.fontSize(18).text('分析サマリー');
    doc.moveDown();

    const summary = [
      `総合スコア: ${results.overall.score}点 (${results.overall.grade}ランク)`,
      `SEOスコア: ${results.seo.score}点`,
      `パフォーマンススコア: ${results.performance.score}点`,
      `セキュリティスコア: ${results.security.score}点`,
      `アクセシビリティスコア: ${results.accessibility.score}点`,
      `モバイルスコア: ${results.mobile.score}点`,
      '',
      `分析ページ数: ${analysis.totalPages}ページ`,
      `エラー数: ${analysis.errorCount}件`,
      `分析時間: ${this.calculateDuration(analysis.startedAt, analysis.completedAt || new Date().toISOString())}`
    ];

    doc.fontSize(12);
    summary.forEach(line => {
      doc.text(line);
    });

    doc.moveDown(2);
  }

  private addSEOSection(doc: PDFDocument, seo: any): void {
    doc.fontSize(16).text('SEO分析');
    doc.moveDown();

    doc.fontSize(12)
       .text(`スコア: ${seo.score}点`)
       .text(`問題数: ${seo.issues.length}件`);

    if (seo.issues.length > 0) {
      doc.moveDown();
      doc.text('主な問題:');
      seo.issues.slice(0, 5).forEach((issue: any) => {
        doc.text(`• ${issue.message}`, { indent: 20 });
      });
    }

    if (seo.suggestions.length > 0) {
      doc.moveDown();
      doc.text('改善提案:');
      seo.suggestions.slice(0, 5).forEach((suggestion: string) => {
        doc.text(`• ${suggestion}`, { indent: 20 });
      });
    }

    doc.moveDown(2);
  }

  private addPerformanceSection(doc: PDFDocument, performance: any): void {
    doc.fontSize(16).text('パフォーマンス分析');
    doc.moveDown();

    doc.fontSize(12)
       .text(`スコア: ${performance.score}点`)
       .text(`読み込み時間: ${this.formatDuration(performance.loadTime)}`)
       .text(`First Contentful Paint: ${this.formatDuration(performance.firstContentfulPaint)}`)
       .text(`Largest Contentful Paint: ${this.formatDuration(performance.largestContentfulPaint)}`);

    if (performance.suggestions.length > 0) {
      doc.moveDown();
      doc.text('最適化提案:');
      performance.suggestions.slice(0, 5).forEach((suggestion: string) => {
        doc.text(`• ${suggestion}`, { indent: 20 });
      });
    }

    doc.moveDown(2);
  }

  private addSecuritySection(doc: PDFDocument, security: any): void {
    doc.fontSize(16).text('セキュリティ分析');
    doc.moveDown();

    doc.fontSize(12)
       .text(`スコア: ${security.score}点`)
       .text(`HTTPS使用: ${security.httpsUsage ? 'あり' : 'なし'}`)
       .text(`Mixed Content: ${security.mixedContent ? 'あり' : 'なし'}`)
       .text(`脆弱性数: ${security.vulnerabilities.length}件`);

    if (security.vulnerabilities.length > 0) {
      doc.moveDown();
      doc.text('検出された脆弱性:');
      security.vulnerabilities.slice(0, 3).forEach((vuln: any) => {
        doc.text(`• ${vuln.description} (${vuln.severity})`, { indent: 20 });
      });
    }

    doc.moveDown(2);
  }

  private addAccessibilitySection(doc: PDFDocument, accessibility: any): void {
    doc.fontSize(16).text('アクセシビリティ分析');
    doc.moveDown();

    doc.fontSize(12)
       .text(`スコア: ${accessibility.score}点`)
       .text(`WCAGレベル: ${accessibility.wcagLevel}`)
       .text(`違反数: ${accessibility.violations.length}件`);

    if (accessibility.violations.length > 0) {
      doc.moveDown();
      doc.text('主な違反:');
      accessibility.violations.slice(0, 5).forEach((violation: any) => {
        doc.text(`• ${violation.description} (${violation.impact})`, { indent: 20 });
      });
    }

    doc.moveDown(2);
  }

  private addMobileSection(doc: PDFDocument, mobile: any): void {
    doc.fontSize(16).text('モバイル対応度');
    doc.moveDown();

    doc.fontSize(12)
       .text(`スコア: ${mobile.score}点`)
       .text(`ビューポート設定: ${mobile.hasViewportMeta ? 'あり' : 'なし'}`)
       .text(`レスポンシブデザイン: ${mobile.isResponsive ? 'あり' : 'なし'}`)
       .text(`タッチターゲットサイズ: ${mobile.touchTargetSize ? '適切' : '要改善'}`)
       .text(`テキストサイズ: ${mobile.textSize ? '適切' : '要改善'}`);

    doc.moveDown(2);
  }

  private addTechnologySection(doc: PDFDocument, technology: any): void {
    doc.fontSize(16).text('技術スタック');
    doc.moveDown();

    const sections = [
      { title: 'フレームワーク', items: technology.frameworks },
      { title: 'ライブラリ', items: technology.libraries },
      { title: 'CMS', items: technology.cms },
      { title: 'サーバー', items: technology.servers },
      { title: 'アナリティクス', items: technology.analytics }
    ];

    sections.forEach(section => {
      if (section.items.length > 0) {
        doc.fontSize(14).text(section.title);
        doc.fontSize(12);
        section.items.forEach((item: any) => {
          const versionText = item.version ? ` (v${item.version})` : '';
          doc.text(`• ${item.name}${versionText}`, { indent: 20 });
        });
        doc.moveDown();
      }
    });

    doc.moveDown();
  }

  private addRecommendations(doc: PDFDocument, results: AnalysisResults): void {
    doc.fontSize(16).text('優先改善提案');
    doc.moveDown();

    doc.fontSize(12);
    results.overall.prioritySuggestions.forEach((suggestion, index) => {
      doc.text(`${index + 1}. ${suggestion}`);
    });

    doc.moveDown(2);
  }

  private addFooter(doc: PDFDocument): void {
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      doc.fontSize(10)
         .text(`Toneya Analysis V1 - ${i + 1} / ${pages.count}`, 
               50, doc.page.height - 50, { align: 'center' });
    }
  }

  async generateCSVReport(analysis: Analysis): Promise<Buffer> {
    try {
      logger.info(`Generating CSV report for analysis ${analysis.id}`);

      const results = analysis.results;
      if (!results) {
        throw new Error('分析結果が見つかりません');
      }

      const csvData = this.buildCSVData(analysis, results);
      const csvFilePath = path.join(this.reportsDir, `analysis-${analysis.id}.csv`);

      const csvWriter = createObjectCsvWriter({
        path: csvFilePath,
        header: [
          { id: 'category', title: 'カテゴリ' },
          { id: 'metric', title: '項目' },
          { id: 'value', title: '値' },
          { id: 'unit', title: '単位' },
          { id: 'status', title: 'ステータス' },
          { id: 'description', title: '説明' }
        ],
        encoding: 'utf8'
      });

      await csvWriter.writeRecords(csvData);
      const csvBuffer = await fs.readFile(csvFilePath);
      
      // 一時ファイルを削除
      await fs.unlink(csvFilePath);

      logger.info(`CSV report generated successfully for analysis ${analysis.id}`);
      return csvBuffer;
    } catch (error) {
      logger.error(`Error generating CSV report for analysis ${analysis.id}:`, error);
      throw error;
    }
  }

  private buildCSVData(analysis: Analysis, results: AnalysisResults): any[] {
    const data: any[] = [];

    // 基本情報
    data.push(
      { category: '基本情報', metric: 'URL', value: analysis.url, unit: '', status: '', description: '分析対象URL' },
      { category: '基本情報', metric: '分析日時', value: format(new Date(analysis.startedAt), 'yyyy-MM-dd HH:mm:ss'), unit: '', status: '', description: '分析開始日時' },
      { category: '基本情報', metric: '総ページ数', value: analysis.totalPages, unit: 'ページ', status: '', description: 'クロールしたページ数' },
      { category: '基本情報', metric: 'エラー数', value: analysis.errorCount, unit: '件', status: '', description: 'クロール中のエラー数' }
    );

    // 総合評価
    data.push(
      { category: '総合評価', metric: 'スコア', value: results.overall.score, unit: '点', status: results.overall.grade, description: '総合評価スコア' }
    );

    // SEO
    data.push(
      { category: 'SEO', metric: 'スコア', value: results.seo.score, unit: '点', status: this.getScoreStatus(results.seo.score), description: 'SEO最適化レベル' },
      { category: 'SEO', metric: '問題数', value: results.seo.issues.length, unit: '件', status: '', description: '検出された問題数' },
      { category: 'SEO', metric: 'タイトル最適化', value: results.seo.metaTags.title.optimal ? '最適' : '要改善', unit: '', status: '', description: 'タイトルタグの最適化状況' },
      { category: 'SEO', metric: 'メタ説明最適化', value: results.seo.metaTags.description.optimal ? '最適' : '要改善', unit: '', status: '', description: 'メタ説明の最適化状況' },
      { category: 'SEO', metric: '構造化データ', value: results.seo.structuredData.hasStructuredData ? 'あり' : 'なし', unit: '', status: '', description: '構造化データの使用状況' }
    );

    // パフォーマンス
    data.push(
      { category: 'パフォーマンス', metric: 'スコア', value: results.performance.score, unit: '点', status: this.getScoreStatus(results.performance.score), description: 'パフォーマンススコア' },
      { category: 'パフォーマンス', metric: '読み込み時間', value: Math.round(results.performance.loadTime), unit: 'ms', status: '', description: 'ページ読み込み時間' },
      { category: 'パフォーマンス', metric: 'FCP', value: Math.round(results.performance.firstContentfulPaint), unit: 'ms', status: '', description: 'First Contentful Paint' },
      { category: 'パフォーマンス', metric: 'LCP', value: Math.round(results.performance.largestContentfulPaint), unit: 'ms', status: '', description: 'Largest Contentful Paint' },
      { category: 'パフォーマンス', metric: '総リソースサイズ', value: Math.round(results.performance.resourceSizes.total / 1024), unit: 'KB', status: '', description: '全リソースの合計サイズ' }
    );

    // セキュリティ
    data.push(
      { category: 'セキュリティ', metric: 'スコア', value: results.security.score, unit: '点', status: this.getScoreStatus(results.security.score), description: 'セキュリティレベル' },
      { category: 'セキュリティ', metric: 'HTTPS使用', value: results.security.httpsUsage ? 'あり' : 'なし', unit: '', status: '', description: 'HTTPS通信の使用状況' },
      { category: 'セキュリティ', metric: 'Mixed Content', value: results.security.mixedContent ? 'あり' : 'なし', unit: '', status: '', description: 'Mixed Contentの有無' },
      { category: 'セキュリティ', metric: '脆弱性数', value: results.security.vulnerabilities.length, unit: '件', status: '', description: '検出された脆弱性数' }
    );

    // アクセシビリティ
    data.push(
      { category: 'アクセシビリティ', metric: 'スコア', value: results.accessibility.score, unit: '点', status: this.getScoreStatus(results.accessibility.score), description: 'アクセシビリティレベル' },
      { category: 'アクセシビリティ', metric: 'WCAGレベル', value: results.accessibility.wcagLevel, unit: '', status: '', description: 'WCAG準拠レベル' },
      { category: 'アクセシビリティ', metric: '違反数', value: results.accessibility.violations.length, unit: '件', status: '', description: 'アクセシビリティ違反数' }
    );

    // モバイル
    data.push(
      { category: 'モバイル', metric: 'スコア', value: results.mobile.score, unit: '点', status: this.getScoreStatus(results.mobile.score), description: 'モバイル対応度' },
      { category: 'モバイル', metric: 'ビューポート設定', value: results.mobile.hasViewportMeta ? 'あり' : 'なし', unit: '', status: '', description: 'ビューポートメタタグの設定' },
      { category: 'モバイル', metric: 'レスポンシブ', value: results.mobile.isResponsive ? 'あり' : 'なし', unit: '', status: '', description: 'レスポンシブデザインの実装' },
      { category: 'モバイル', metric: 'タッチターゲット', value: results.mobile.touchTargetSize ? '適切' : '要改善', unit: '', status: '', description: 'タッチターゲットサイズ' }
    );

    return data;
  }

  private getScoreStatus(score: number): string {
    if (score >= 90) return '優秀';
    if (score >= 80) return '良好';
    if (score >= 70) return '普通';
    if (score >= 60) return '要改善';
    return '不良';
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }

  private calculateDuration(startTime: string, endTime: string): string {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const duration = end.getTime() - start.getTime();
    
    const minutes = Math.floor(duration / (1000 * 60));
    const seconds = Math.floor((duration % (1000 * 60)) / 1000);
    
    if (minutes > 0) {
      return `${minutes}分${seconds}秒`;
    }
    return `${seconds}秒`;
  }
}