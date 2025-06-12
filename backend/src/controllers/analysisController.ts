import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Analysis } from '../models/Analysis';
import { validateAnalysisRequest } from '../utils/validators';
import { logger } from '../utils/logger';
import { analysisQueue } from '../workers/analysisQueue';
import { AnalysisRequest } from '../types/analysis';

export class AnalysisController {
  private analysisRepository = AppDataSource.getRepository(Analysis);

  async startAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = validateAnalysisRequest(req.body) as AnalysisRequest;
      
      const analysis = this.analysisRepository.create({
        url: validatedData.url,
        status: 'pending',
        totalPages: 0,
        crawledPages: 0,
        errorCount: 0,
        options: {
          maxDepth: validatedData.options?.maxDepth ?? 3,
          maxPages: validatedData.options?.maxPages ?? 100,
          skipImages: validatedData.options?.skipImages ?? false,
          skipCSS: validatedData.options?.skipCSS ?? false,
          skipJS: validatedData.options?.skipJS ?? false,
        }
      });

      const savedAnalysis = await this.analysisRepository.save(analysis);
      
      await analysisQueue.add('analyze-website', {
        analysisId: savedAnalysis.id,
        url: savedAnalysis.url,
        options: savedAnalysis.options
      });

      logger.info(`Analysis started for ${validatedData.url}`, {
        analysisId: savedAnalysis.id,
        url: validatedData.url
      });

      res.status(201).json({
        success: true,
        data: {
          id: savedAnalysis.id,
          url: savedAnalysis.url,
          status: savedAnalysis.status,
          startedAt: savedAnalysis.startedAt
        }
      });
    } catch (error) {
      logger.error('Error starting analysis:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : '分析の開始に失敗しました'
      });
    }
  }

  async getAnalysis(req: Request, res: Response): Promise<void> {
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

      res.json({
        success: true,
        data: analysis
      });
    } catch (error) {
      logger.error('Error retrieving analysis:', error);
      res.status(500).json({
        success: false,
        error: '分析結果の取得に失敗しました'
      });
    }
  }

  async getAnalysisStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const analysis = await this.analysisRepository.findOne({
        where: { id },
        select: ['id', 'url', 'status', 'startedAt', 'completedAt', 'totalPages', 'crawledPages', 'errorCount']
      });

      if (!analysis) {
        res.status(404).json({
          success: false,
          error: '分析が見つかりません'
        });
        return;
      }

      res.json({
        success: true,
        data: analysis
      });
    } catch (error) {
      logger.error('Error retrieving analysis status:', error);
      res.status(500).json({
        success: false,
        error: 'ステータスの取得に失敗しました'
      });
    }
  }

  async getAnalysisHistory(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;

      const [analyses, total] = await this.analysisRepository.findAndCount({
        select: ['id', 'url', 'status', 'startedAt', 'completedAt', 'totalPages', 'crawledPages'],
        order: { startedAt: 'DESC' },
        skip,
        take: limit
      });

      res.json({
        success: true,
        data: {
          analyses,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      logger.error('Error retrieving analysis history:', error);
      res.status(500).json({
        success: false,
        error: '履歴の取得に失敗しました'
      });
    }
  }

  async deleteAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const result = await this.analysisRepository.delete({ id });

      if (result.affected === 0) {
        res.status(404).json({
          success: false,
          error: '削除対象の分析が見つかりません'
        });
        return;
      }

      logger.info(`Analysis deleted: ${id}`);

      res.json({
        success: true,
        message: '分析結果を削除しました'
      });
    } catch (error) {
      logger.error('Error deleting analysis:', error);
      res.status(500).json({
        success: false,
        error: '分析結果の削除に失敗しました'
      });
    }
  }
}