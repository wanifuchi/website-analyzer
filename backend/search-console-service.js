const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

/**
 * Google Search Console API サービス
 * 実際の検索パフォーマンスデータを取得してKPI改善に活用
 */
class SearchConsoleService {
  constructor() {
    this.isAvailable = false;
    this.searchconsole = null;
    this.auth = null;
    
    this.initializeService();
  }

  /**
   * サービス初期化
   */
  async initializeService() {
    try {
      // 環境変数またはサービスアカウントキーファイルで認証
      if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
        // 環境変数からサービスアカウント情報を取得
        const serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
        
        this.auth = new google.auth.GoogleAuth({
          credentials: serviceAccountKey,
          scopes: ['https://www.googleapis.com/auth/webmasters.readonly']
        });
        
        this.searchconsole = google.searchconsole({ version: 'v1', auth: this.auth });
        this.isAvailable = true;
        
        console.log('✅ Google Search Console API 初期化完了（環境変数）');
        
      } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        // サービスアカウントキーファイルパスから認証
        this.auth = new google.auth.GoogleAuth({
          keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
          scopes: ['https://www.googleapis.com/auth/webmasters.readonly']
        });
        
        this.searchconsole = google.searchconsole({ version: 'v1', auth: this.auth });
        this.isAvailable = true;
        
        console.log('✅ Google Search Console API 初期化完了（キーファイル）');
        
      } else {
        console.warn('⚠️ Google Search Console API認証情報が設定されていません');
        console.warn('環境変数 GOOGLE_SERVICE_ACCOUNT_KEY または GOOGLE_APPLICATION_CREDENTIALS を設定してください');
      }
      
    } catch (error) {
      console.error('❌ Google Search Console API 初期化エラー:', error.message);
      this.isAvailable = false;
    }
  }

  /**
   * サイトの検索パフォーマンスデータを取得
   * @param {string} siteUrl - サイトURL
   * @param {Object} options - オプション（期間、ディメンション等）
   * @returns {Promise<Object>} 検索パフォーマンスデータ
   */
  async getSearchPerformance(siteUrl, options = {}) {
    if (!this.isAvailable) {
      console.log('⚠️ Search Console API利用不可、データなしを返します');
      return null;
    }

    try {
      // デフォルト設定
      const defaultOptions = {
        startDate: this.getDateString(-30), // 30日前
        endDate: this.getDateString(-1),    // 1日前
        dimensions: ['query', 'page'],
        rowLimit: 1000
      };

      const searchOptions = { ...defaultOptions, ...options };

      console.log('🔍 Search Console データ取得開始:', {
        siteUrl,
        startDate: searchOptions.startDate,
        endDate: searchOptions.endDate
      });

      // Search Console APIクエリ実行
      const response = await this.searchconsole.searchanalytics.query({
        siteUrl: this.normalizeSiteUrl(siteUrl),
        requestBody: {
          startDate: searchOptions.startDate,
          endDate: searchOptions.endDate,
          dimensions: searchOptions.dimensions,
          rowLimit: searchOptions.rowLimit,
          startRow: 0
        }
      });

      const data = response.data;
      
      if (!data.rows || data.rows.length === 0) {
        console.warn('⚠️ Search Console データが見つかりません:', siteUrl);
        return this.getMockSearchPerformance(siteUrl);
      }

      // データを分析用に整形
      const performanceData = this.analyzeSearchPerformanceData(data, siteUrl);
      
      console.log('✅ Search Console データ取得完了:', {
        totalQueries: performanceData.queries.length,
        totalClicks: performanceData.summary.totalClicks,
        avgPosition: performanceData.summary.avgPosition
      });

      return performanceData;

    } catch (error) {
      console.error('❌ Search Console API エラー:', error.message);
      
      // 403エラー（権限不足）の場合は詳細なエラーメッセージ
      if (error.code === 403) {
        console.error('権限エラー: このサイトのSearch Consoleデータにアクセスする権限がありません');
        console.error('サイトの所有者にサービスアカウントを「オーナー」として追加してもらってください');
      }
      
      return null;
    }
  }

  /**
   * 検索パフォーマンスデータを分析
   * @param {Object} rawData - Search Console API生データ
   * @param {string} siteUrl - サイトURL
   * @returns {Object} 分析済みデータ
   */
  analyzeSearchPerformanceData(rawData, siteUrl) {
    const queries = [];
    const pages = new Map();
    let totalClicks = 0;
    let totalImpressions = 0;
    let totalCtr = 0;
    let totalPosition = 0;

    // 各行のデータを処理
    rawData.rows.forEach(row => {
      const [query, page] = row.keys;
      const { clicks, impressions, ctr, position } = row;

      // クエリデータ
      queries.push({
        query,
        page,
        clicks: clicks || 0,
        impressions: impressions || 0,
        ctr: ctr || 0,
        position: position || 0,
        // KPI改善のための追加分析
        opportunity: this.calculateQueryOpportunity(clicks, impressions, ctr, position),
        competitiveness: this.assessCompetitiveness(position, impressions),
        improvementPotential: this.calculateImprovementPotential(position, ctr)
      });

      // ページ別集計
      if (!pages.has(page)) {
        pages.set(page, {
          page,
          totalClicks: 0,
          totalImpressions: 0,
          avgCtr: 0,
          avgPosition: 0,
          queryCount: 0
        });
      }

      const pageData = pages.get(page);
      pageData.totalClicks += clicks || 0;
      pageData.totalImpressions += impressions || 0;
      pageData.queryCount += 1;

      // 全体集計
      totalClicks += clicks || 0;
      totalImpressions += impressions || 0;
      totalCtr += ctr || 0;
      totalPosition += position || 0;
    });

    // ページデータの平均値計算
    pages.forEach((pageData, page) => {
      const relatedQueries = queries.filter(q => q.page === page);
      pageData.avgCtr = relatedQueries.reduce((sum, q) => sum + q.ctr, 0) / relatedQueries.length;
      pageData.avgPosition = relatedQueries.reduce((sum, q) => sum + q.position, 0) / relatedQueries.length;
    });

    // 機会分析
    const opportunityAnalysis = this.identifyOpportunities(queries);
    const competitiveInsights = this.analyzeCompetitivePosition(queries);
    const kpiPredictions = this.predictKpiImprovements(queries);

    return {
      summary: {
        totalClicks,
        totalImpressions,
        avgCtr: totalCtr / rawData.rows.length,
        avgPosition: totalPosition / rawData.rows.length,
        totalQueries: queries.length,
        dateRange: {
          startDate: rawData.responseAggregationType || 'auto',
          endDate: new Date().toISOString().split('T')[0]
        }
      },
      queries: queries.sort((a, b) => b.clicks - a.clicks), // クリック数順
      pages: Array.from(pages.values()).sort((a, b) => b.totalClicks - a.totalClicks),
      opportunityAnalysis,
      competitiveInsights,
      kpiPredictions,
      siteUrl,
      dataSource: 'Google Search Console API',
      analysisDate: new Date().toISOString()
    };
  }

  /**
   * クエリの機会度を計算
   */
  calculateQueryOpportunity(clicks, impressions, ctr, position) {
    // 高い表示回数で低いCTR = 改善機会
    const impressionScore = Math.min(impressions / 1000, 5); // 最大5点
    const positionScore = Math.max(0, (10 - position) / 2); // 順位が高いほど高得点
    const ctrGap = Math.max(0, 0.1 - ctr) * 10; // CTRの改善余地
    
    return Math.round((impressionScore + positionScore + ctrGap) * 10) / 10;
  }

  /**
   * 競合性評価
   */
  assessCompetitiveness(position, impressions) {
    if (position <= 3) return 'high'; // 上位表示 = 高競合
    if (position <= 10 && impressions > 100) return 'medium';
    return 'low';
  }

  /**
   * 改善ポテンシャル計算
   */
  calculateImprovementPotential(position, ctr) {
    const expectedCtr = this.getExpectedCtrByPosition(position);
    const potential = Math.max(0, expectedCtr - ctr);
    return Math.round(potential * 1000) / 10; // パーセント表示
  }

  /**
   * 順位別期待CTR（業界平均）
   */
  getExpectedCtrByPosition(position) {
    const ctrMap = {
      1: 0.28, 2: 0.15, 3: 0.11, 4: 0.08, 5: 0.06,
      6: 0.05, 7: 0.04, 8: 0.03, 9: 0.03, 10: 0.02
    };
    return ctrMap[Math.ceil(position)] || 0.01;
  }

  /**
   * 機会分析の実行
   */
  identifyOpportunities(queries) {
    const opportunities = {
      quickWins: [], // 簡単に改善できる項目
      highImpact: [], // 高インパクト項目
      longTerm: []   // 長期的な取り組み
    };

    queries.forEach(query => {
      // クイックウィン: 4-10位で高い表示回数
      if (query.position >= 4 && query.position <= 10 && query.impressions > 100) {
        opportunities.quickWins.push({
          ...query,
          reason: '順位改善により大幅なクリック増加が期待',
          estimatedImpact: `+${Math.round(query.impressions * 0.1)}クリック/月`
        });
      }

      // 高インパクト: 高表示回数・低CTR
      if (query.impressions > 500 && query.ctr < 0.05) {
        opportunities.highImpact.push({
          ...query,
          reason: 'タイトル・説明文最適化でCTR向上',
          estimatedImpact: `+${Math.round(query.impressions * 0.03)}クリック/月`
        });
      }

      // 長期: 11位以下で潜在性あり
      if (query.position > 10 && query.impressions > 50) {
        opportunities.longTerm.push({
          ...query,
          reason: 'コンテンツ充実化で上位進出可能',
          estimatedImpact: 'コンテンツ強化により上位表示狙い'
        });
      }
    });

    return {
      quickWins: opportunities.quickWins.slice(0, 10),
      highImpact: opportunities.highImpact.slice(0, 10),
      longTerm: opportunities.longTerm.slice(0, 15)
    };
  }

  /**
   * 競合ポジション分析
   */
  analyzeCompetitivePosition(queries) {
    const positionDistribution = { top3: 0, top10: 0, top20: 0, beyond20: 0 };
    const strongQueries = [];
    const improvementNeeded = [];

    queries.forEach(query => {
      if (query.position <= 3) {
        positionDistribution.top3++;
        if (query.clicks > 10) strongQueries.push(query);
      } else if (query.position <= 10) {
        positionDistribution.top10++;
      } else if (query.position <= 20) {
        positionDistribution.top20++;
        if (query.impressions > 100) improvementNeeded.push(query);
      } else {
        positionDistribution.beyond20++;
      }
    });

    return {
      positionDistribution,
      strongQueries: strongQueries.slice(0, 10),
      improvementNeeded: improvementNeeded.slice(0, 10),
      overallStrength: this.calculateOverallStrength(positionDistribution)
    };
  }

  /**
   * 全体的な競合力計算
   */
  calculateOverallStrength(distribution) {
    const total = Object.values(distribution).reduce((sum, count) => sum + count, 0);
    if (total === 0) return 'unknown';

    const top10Ratio = (distribution.top3 + distribution.top10) / total;
    
    if (top10Ratio > 0.6) return 'strong';
    if (top10Ratio > 0.3) return 'moderate';
    return 'weak';
  }

  /**
   * KPI改善予測
   */
  predictKpiImprovements(queries) {
    let potentialClicks = 0;
    let potentialImpressions = 0;
    
    queries.forEach(query => {
      // CTR改善による予測
      const currentCtr = query.ctr;
      const expectedCtr = this.getExpectedCtrByPosition(Math.max(1, query.position - 2));
      const ctrImprovement = Math.max(0, expectedCtr - currentCtr);
      
      potentialClicks += query.impressions * ctrImprovement;
      
      // 順位改善による表示回数増加予測
      if (query.position > 5) {
        potentialImpressions += query.impressions * 0.2; // 20%増加想定
      }
    });

    return {
      clickIncrease: Math.round(potentialClicks),
      impressionIncrease: Math.round(potentialImpressions),
      estimatedTrafficGrowth: `+${Math.round((potentialClicks / queries.reduce((sum, q) => sum + q.clicks, 0)) * 100)}%`,
      timeframe: '3-6ヶ月での実現を想定'
    };
  }

  /**
   * サイトURL正規化
   */
  normalizeSiteUrl(url) {
    // Search Console用のサイトURL形式に正規化
    if (url.startsWith('http://')) {
      return url;
    } else if (url.startsWith('https://')) {
      return url;
    } else {
      // プロトコルが無い場合はhttps://を追加
      return `https://${url}`;
    }
  }

  /**
   * 日付文字列生成（YYYY-MM-DD形式）
   */
  getDateString(daysOffset = 0) {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    return date.toISOString().split('T')[0];
  }

  /**
   * モックデータ生成（API利用できない場合）
   */
  getMockSearchPerformance(siteUrl) {
    console.log('📝 Search Console モックデータを生成:', siteUrl);
    
    const mockQueries = [
      { query: 'ウェブサイト分析', clicks: 45, impressions: 1200, ctr: 0.038, position: 8.5 },
      { query: 'SEO 診断', clicks: 32, impressions: 890, ctr: 0.036, position: 6.2 },
      { query: 'パフォーマンス測定', clicks: 28, impressions: 1450, ctr: 0.019, position: 12.3 },
      { query: 'サイト改善', clicks: 15, impressions: 650, ctr: 0.023, position: 9.8 },
      { query: 'モバイル対応', clicks: 12, impressions: 480, ctr: 0.025, position: 7.1 }
    ].map(q => ({
      ...q,
      page: siteUrl,
      opportunity: this.calculateQueryOpportunity(q.clicks, q.impressions, q.ctr, q.position),
      competitiveness: this.assessCompetitiveness(q.position, q.impressions),
      improvementPotential: this.calculateImprovementPotential(q.position, q.ctr)
    }));

    return {
      summary: {
        totalClicks: 132,
        totalImpressions: 4670,
        avgCtr: 0.028,
        avgPosition: 8.8,
        totalQueries: 5,
        dateRange: {
          startDate: this.getDateString(-30),
          endDate: this.getDateString(-1)
        }
      },
      queries: mockQueries,
      pages: [{
        page: siteUrl,
        totalClicks: 132,
        totalImpressions: 4670,
        avgCtr: 0.028,
        avgPosition: 8.8,
        queryCount: 5
      }],
      opportunityAnalysis: this.identifyOpportunities(mockQueries),
      competitiveInsights: this.analyzeCompetitivePosition(mockQueries),
      kpiPredictions: this.predictKpiImprovements(mockQueries),
      siteUrl,
      dataSource: 'Mock Data (Search Console API 未設定)',
      analysisDate: new Date().toISOString()
    };
  }

  /**
   * API利用可能状態を確認
   */
  isApiAvailable() {
    return this.isAvailable;
  }

  /**
   * API接続テスト
   */
  async testConnection() {
    if (!this.isAvailable) {
      return {
        success: false,
        error: 'Search Console API認証情報が設定されていません'
      };
    }

    try {
      // サイトリスト取得でテスト
      const response = await this.searchconsole.sites.list();
      
      return {
        success: true,
        message: 'Search Console API接続成功',
        sitesCount: response.data.siteEntry?.length || 0
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = SearchConsoleService;