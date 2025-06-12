import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Analysis } from '../models/Analysis';
import { ReportService } from '../services/reportService';
import { logger } from '../utils/logger';

export class ReportController {
  private analysisRepository = AppDataSource.getRepository(Analysis);
  private reportService = new ReportService();

  async generatePDFReport(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const analysis = await this.analysisRepository.findOne({
        where: { id }
      });

      if (!analysis) {
        res.status(404).json({
          success: false,
          error: '分析結果が見つかりません'
        });
        return;
      }

      if (analysis.status !== 'completed') {
        res.status(400).json({
          success: false,
          error: '分析が完了していません'
        });
        return;
      }

      if (!analysis.results) {
        res.status(400).json({
          success: false,
          error: '分析結果データが見つかりません'
        });
        return;
      }

      logger.info(`Generating PDF report for analysis ${id}`);
      
      const pdfBuffer = await this.reportService.generatePDFReport(analysis);
      
      const filename = `website-analysis-report-${id}.pdf`;
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      
      res.send(pdfBuffer);
      
      logger.info(`PDF report generated successfully for analysis ${id}`);
    } catch (error) {
      logger.error('Error generating PDF report:', error);
      res.status(500).json({
        success: false,
        error: 'PDFレポートの生成に失敗しました'
      });
    }
  }

  async exportCSV(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const analysis = await this.analysisRepository.findOne({
        where: { id }
      });

      if (!analysis) {
        res.status(404).json({
          success: false,
          error: '分析結果が見つかりません'
        });
        return;
      }

      if (analysis.status !== 'completed') {
        res.status(400).json({
          success: false,
          error: '分析が完了していません'
        });
        return;
      }

      if (!analysis.results) {
        res.status(400).json({
          success: false,
          error: '分析結果データが見つかりません'
        });
        return;
      }

      logger.info(`Generating CSV export for analysis ${id}`);
      
      const csvBuffer = await this.reportService.generateCSVReport(analysis);
      
      const filename = `website-analysis-data-${id}.csv`;
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', csvBuffer.length);
      
      res.send(csvBuffer);
      
      logger.info(`CSV export generated successfully for analysis ${id}`);
    } catch (error) {
      logger.error('Error generating CSV export:', error);
      res.status(500).json({
        success: false,
        error: 'CSVエクスポートに失敗しました'
      });
    }
  }

  async getReportPreview(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const analysis = await this.analysisRepository.findOne({
        where: { id }
      });

      if (!analysis) {
        res.status(404).json({
          success: false,
          error: '分析結果が見つかりません'
        });
        return;
      }

      if (analysis.status !== 'completed' || !analysis.results) {
        res.status(400).json({
          success: false,
          error: '分析が完了していないか、結果データがありません'
        });
        return;
      }

      // レポートのプレビュー用データを生成
      const preview = {
        basic: {
          url: analysis.url,
          analyzedAt: analysis.startedAt,
          completedAt: analysis.completedAt,
          totalPages: analysis.totalPages,
          errorCount: analysis.errorCount,
          duration: this.calculateDuration(analysis.startedAt, analysis.completedAt || new Date().toISOString())
        },
        scores: {
          overall: analysis.results.overall.score,
          seo: analysis.results.seo.score,
          performance: analysis.results.performance.score,
          security: analysis.results.security.score,
          accessibility: analysis.results.accessibility.score,
          mobile: analysis.results.mobile.score
        },
        summary: {
          grade: analysis.results.overall.grade,
          topIssues: [
            ...analysis.results.seo.issues.slice(0, 3),
            ...analysis.results.security.vulnerabilities.slice(0, 2),
            ...analysis.results.accessibility.violations.slice(0, 2)
          ].slice(0, 5),
          prioritySuggestions: analysis.results.overall.prioritySuggestions.slice(0, 5)
        },
        technology: {
          frameworks: analysis.results.technology.frameworks.slice(0, 5),
          libraries: analysis.results.technology.libraries.slice(0, 5),
          cms: analysis.results.technology.cms.slice(0, 3)
        }
      };

      res.json({
        success: true,
        data: preview
      });
    } catch (error) {
      logger.error('Error generating report preview:', error);
      res.status(500).json({
        success: false,
        error: 'レポートプレビューの生成に失敗しました'
      });
    }
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