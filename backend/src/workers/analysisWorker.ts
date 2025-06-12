import { Job } from 'bull';
import { AppDataSource } from '../config/database';
import { Analysis } from '../models/Analysis';
import { PageData as PageDataEntity } from '../models/PageData';
import { CrawlerService } from '../services/crawlerService';
import { AnalysisService } from '../services/analysisService';
import { logger } from '../utils/logger';
import { analysisQueue } from './analysisQueue';
import { AnalysisOptions } from '../types/analysis';

interface AnalysisJobData {
  analysisId: string;
  url: string;
  options: AnalysisOptions;
}

analysisQueue.process('analyze-website', 1, async (job: Job<AnalysisJobData>) => {
  const { analysisId, url, options } = job.data;
  
  logger.info(`Starting analysis job for ${url}`, { analysisId, jobId: job.id });
  
  const analysisRepository = AppDataSource.getRepository(Analysis);
  const pageDataRepository = AppDataSource.getRepository(PageDataEntity);
  
  let crawler: CrawlerService | null = null;
  
  try {
    // 分析ステータスを「処理中」に更新
    await analysisRepository.update(analysisId, { 
      status: 'processing' 
    });

    // クローラーサービスを初期化
    crawler = new CrawlerService(options, url);
    await crawler.initialize();

    // プログレス更新のためのインターバル設定
    const progressInterval = setInterval(async () => {
      const progress = crawler!.getProgress();
      await analysisRepository.update(analysisId, {
        crawledPages: progress.crawled,
        totalPages: progress.total
      });
      
      job.progress(progress.percentage);
    }, 2000);

    // ウェブサイトをクロール
    logger.info(`Starting crawl for ${url}`);
    const pageDataList = await crawler.crawlWebsite(url);
    
    clearInterval(progressInterval);

    // ページデータをデータベースに保存
    for (const pageData of pageDataList) {
      const pageEntity = pageDataRepository.create({
        ...pageData,
        analysisId,
        crawledAt: new Date()
      });
      await pageDataRepository.save(pageEntity);
    }

    // 分析サービスを使用して詳細分析を実行
    const analysisService = new AnalysisService();
    const analysisResults = await analysisService.analyzePages(pageDataList, url);

    // 分析結果をデータベースに保存
    await analysisRepository.update(analysisId, {
      status: 'completed',
      completedAt: new Date(),
      totalPages: pageDataList.length,
      crawledPages: pageDataList.length,
      errorCount: pageDataList.filter(p => p.errors.length > 0).length,
      results: analysisResults
    });

    logger.info(`Analysis completed for ${url}`, { 
      analysisId, 
      totalPages: pageDataList.length,
      errorCount: pageDataList.filter(p => p.errors.length > 0).length
    });

    return {
      success: true,
      analysisId,
      url,
      totalPages: pageDataList.length,
      results: analysisResults
    };
    
  } catch (error) {
    logger.error(`Analysis failed for ${url}:`, { 
      analysisId, 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    // エラー時は分析ステータスを「失敗」に更新
    await analysisRepository.update(analysisId, {
      status: 'failed',
      completedAt: new Date()
    });

    throw error;
  } finally {
    // リソースをクリーンアップ
    if (crawler) {
      await crawler.close();
    }
  }
});

logger.info('Analysis worker started');