const axios = require('axios');

// 環境変数の確実な読み込み
if (!process.env.GOOGLE_PAGESPEED_API_KEY) {
  require('dotenv').config();
}

/**
 * Google PageSpeed Insights API クライアント
 * リアルタイムでのパフォーマンス測定とCore Web Vitals取得
 */
class PageSpeedInsightsClient {
  constructor() {
    // 環境変数からAPIキーを取得（再読み込み後）
    this.apiKey = process.env.GOOGLE_PAGESPEED_API_KEY;
    this.endpoint = process.env.PAGESPEED_API_ENDPOINT || 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
    this.timeout = 60000; // 60秒タイムアウト
    
    console.log('🔍 PageSpeedInsightsClient Constructor:', {
      hasApiKey: !!this.apiKey,
      apiKeyLength: this.apiKey ? this.apiKey.length : 0,
      apiKeyPrefix: this.apiKey ? this.apiKey.substring(0, 10) + '...' : 'null',
      endpoint: this.endpoint,
      envApiKey: !!process.env.GOOGLE_PAGESPEED_API_KEY
    });
    
    if (!this.apiKey) {
      console.warn('⚠️ Google PageSpeed Insights API キーが設定されていません。フォールバック機能を使用します。');
    }
  }

  /**
   * URLのパフォーマンス分析を実行
   * @param {string} url - 分析対象URL
   * @param {Object} options - オプション設定
   * @returns {Object} パフォーマンス分析結果
   */
  async analyzeUrl(url, options = {}) {
    const {
      strategy = 'mobile', // 'mobile' または 'desktop'
      category = 'performance', // 'performance', 'accessibility', 'best-practices', 'seo'
      locale = 'ja'
    } = options;

    if (!this.apiKey) {
      return this.getFallbackResults(url, strategy);
    }

    try {
      console.log(`🔍 PageSpeed Insights 分析開始: ${url} (${strategy})`);
      
      const params = {
        url: url,
        key: this.apiKey,
        strategy: strategy,
        locale: locale,
        category: category
      };

      const response = await axios.get(this.endpoint, {
        params,
        timeout: this.timeout,
        headers: {
          'User-Agent': 'Toneya-Analysis-V1/1.0'
        }
      });

      const data = response.data;
      return this.parsePageSpeedResults(data, strategy);

    } catch (error) {
      console.error(`❌ PageSpeed Insights API エラー:`, error.message);
      console.error('詳細なエラー情報:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          params: error.config?.params
        }
      });
      
      // API制限エラーの場合
      if (error.response?.status === 429) {
        throw new Error('PageSpeed Insights API の制限に達しました。しばらく待ってから再試行してください。');
      }
      
      // API キーエラーの場合
      if (error.response?.status === 400 || error.response?.status === 403) {
        const errorDetail = error.response?.data?.error?.message || '不明';
        throw new Error(`PageSpeed Insights API キーエラー: ${errorDetail} (Status: ${error.response?.status})`);
      }

      // その他のエラーの場合はフォールバック
      console.log('🔄 フォールバック機能を使用します');
      return this.getFallbackResults(url, strategy);
    }
  }

  /**
   * PageSpeed Insights APIの結果を解析
   * @param {Object} data - API レスポンスデータ
   * @param {string} strategy - 'mobile' または 'desktop'
   * @returns {Object} 解析済み結果
   */
  parsePageSpeedResults(data, strategy) {
    const lighthouse = data.lighthouseResult;
    const categories = lighthouse.categories;
    const audits = lighthouse.audits;

    // Core Web Vitals の取得
    const coreWebVitals = this.extractCoreWebVitals(audits);
    
    // カテゴリスコアの取得
    const scores = {
      performance: categories.performance ? Math.round(categories.performance.score * 100) : null,
      accessibility: categories.accessibility ? Math.round(categories.accessibility.score * 100) : null,
      bestPractices: categories['best-practices'] ? Math.round(categories['best-practices'].score * 100) : null,
      seo: categories.seo ? Math.round(categories.seo.score * 100) : null
    };

    // 改善提案の抽出
    const opportunities = this.extractOpportunities(audits);
    const diagnostics = this.extractDiagnostics(audits);

    return {
      strategy,
      timestamp: new Date().toISOString(),
      scores,
      coreWebVitals,
      opportunities,
      diagnostics,
      metrics: this.extractMetrics(audits),
      finalUrl: lighthouse.finalUrl,
      lighthouseVersion: lighthouse.lighthouseVersion,
      userAgent: lighthouse.userAgent,
      fetchTime: lighthouse.fetchTime
    };
  }

  /**
   * Core Web Vitals データの抽出
   * @param {Object} audits - Lighthouse audits データ
   * @returns {Object} Core Web Vitals
   */
  extractCoreWebVitals(audits) {
    return {
      // Largest Contentful Paint
      lcp: {
        value: audits['largest-contentful-paint']?.numericValue || null,
        displayValue: audits['largest-contentful-paint']?.displayValue || null,
        score: audits['largest-contentful-paint']?.score || null,
        description: 'ページの主要コンテンツが読み込まれるまでの時間'
      },
      
      // First Input Delay (実際のユーザーデータが必要)
      fid: {
        value: audits['max-potential-fid']?.numericValue || null,
        displayValue: audits['max-potential-fid']?.displayValue || null,
        score: audits['max-potential-fid']?.score || null,
        description: 'ユーザーの最初の操作に対する応答時間'
      },
      
      // Cumulative Layout Shift
      cls: {
        value: audits['cumulative-layout-shift']?.numericValue || null,
        displayValue: audits['cumulative-layout-shift']?.displayValue || null,
        score: audits['cumulative-layout-shift']?.score || null,
        description: 'ページ読み込み時のレイアウトの安定性'
      },

      // First Contentful Paint
      fcp: {
        value: audits['first-contentful-paint']?.numericValue || null,
        displayValue: audits['first-contentful-paint']?.displayValue || null,
        score: audits['first-contentful-paint']?.score || null,
        description: '最初のコンテンツが表示されるまでの時間'
      },

      // Total Blocking Time
      tbt: {
        value: audits['total-blocking-time']?.numericValue || null,
        displayValue: audits['total-blocking-time']?.displayValue || null,
        score: audits['total-blocking-time']?.score || null,
        description: 'メインスレッドがブロックされた時間の合計'
      },

      // Interaction to Next Paint (新しい指標)
      inp: {
        value: audits['interaction-to-next-paint']?.numericValue || null,
        displayValue: audits['interaction-to-next-paint']?.displayValue || 'データなし',
        score: audits['interaction-to-next-paint']?.score || null,
        description: 'ユーザー操作に対する応答性の指標'
      },

      // Time to First Byte (サーバー応答時間)
      ttfb: {
        value: audits['server-response-time']?.numericValue || null,
        displayValue: audits['server-response-time']?.displayValue || 'データなし',
        score: audits['server-response-time']?.score || null,
        description: 'サーバーからの最初の応答までの時間'
      }
    };
  }

  /**
   * パフォーマンス改善提案の抽出
   * @param {Object} audits - Lighthouse audits データ
   * @returns {Array} 改善提案リスト
   */
  extractOpportunities(audits) {
    const opportunities = [];
    
    for (const [key, audit] of Object.entries(audits)) {
      if (audit.details && audit.details.type === 'opportunity' && audit.numericValue > 0) {
        opportunities.push({
          id: key,
          title: audit.title,
          description: audit.description,
          savings: audit.displayValue,
          numericValue: audit.numericValue,
          score: audit.score,
          details: audit.details
        });
      }
    }
    
    // 節約効果の大きい順にソート
    return opportunities.sort((a, b) => b.numericValue - a.numericValue);
  }

  /**
   * 診断情報の抽出
   * @param {Object} audits - Lighthouse audits データ
   * @returns {Array} 診断情報リスト
   */
  extractDiagnostics(audits) {
    const diagnostics = [];
    
    const diagnosticAudits = [
      'unused-css-rules',
      'unused-javascript',
      'modern-image-formats',
      'uses-webp-images',
      'efficient-animated-content',
      'duplicated-javascript',
      'legacy-javascript'
    ];

    for (const auditId of diagnosticAudits) {
      const audit = audits[auditId];
      if (audit && audit.score !== null && audit.score < 1) {
        diagnostics.push({
          id: auditId,
          title: audit.title,
          description: audit.description,
          displayValue: audit.displayValue,
          score: audit.score,
          details: audit.details
        });
      }
    }

    return diagnostics;
  }

  /**
   * 基本メトリクスの抽出
   * @param {Object} audits - Lighthouse audits データ
   * @returns {Object} メトリクス情報
   */
  extractMetrics(audits) {
    return {
      speedIndex: {
        value: audits['speed-index']?.numericValue || null,
        displayValue: audits['speed-index']?.displayValue || null,
        score: audits['speed-index']?.score || null
      },
      timeToInteractive: {
        value: audits['interactive']?.numericValue || null,
        displayValue: audits['interactive']?.displayValue || null,
        score: audits['interactive']?.score || null
      },
      serverResponseTime: {
        value: audits['server-response-time']?.numericValue || null,
        displayValue: audits['server-response-time']?.displayValue || null,
        score: audits['server-response-time']?.score || null
      }
    };
  }

  /**
   * API が利用できない場合のフォールバック結果
   * @param {string} url - 分析対象URL
   * @param {string} strategy - 'mobile' または 'desktop'
   * @returns {Object} フォールバック結果
   */
  getFallbackResults(url, strategy) {
    console.log(`📋 フォールバック結果を生成: ${url} (${strategy})`);
    
    return {
      strategy,
      timestamp: new Date().toISOString(),
      isApiAvailable: false,
      fallbackMessage: 'Google PageSpeed Insights API が利用できないため、簡易分析結果を表示しています',
      scores: {
        performance: null,
        accessibility: null,
        bestPractices: null,
        seo: null
      },
      coreWebVitals: {
        lcp: { value: null, displayValue: 'データなし', score: null, description: 'ページの主要コンテンツが読み込まれるまでの時間' },
        fid: { value: null, displayValue: 'データなし', score: null, description: 'ユーザーの最初の操作に対する応答時間' },
        cls: { value: null, displayValue: 'データなし', score: null, description: 'ページ読み込み時のレイアウトの安定性' },
        fcp: { value: null, displayValue: 'データなし', score: null, description: '最初のコンテンツが表示されるまでの時間' },
        tbt: { value: null, displayValue: 'データなし', score: null, description: 'メインスレッドがブロックされた時間の合計' },
        inp: { value: null, displayValue: 'データなし', score: null, description: 'ユーザー操作に対する応答性の指標' },
        ttfb: { value: null, displayValue: 'データなし', score: null, description: 'サーバーからの最初の応答までの時間' }
      },
      opportunities: [],
      diagnostics: [],
      metrics: {},
      finalUrl: url
    };
  }

  /**
   * モバイルとデスクトップ両方の分析を実行
   * @param {string} url - 分析対象URL
   * @returns {Object} 両方の結果
   */
  async analyzeBothStrategies(url) {
    console.log(`🔍 PageSpeed Insights 詳細分析開始: ${url}`);
    
    try {
      const [mobileResults, desktopResults] = await Promise.all([
        this.analyzeUrl(url, { strategy: 'mobile' }),
        this.analyzeUrl(url, { strategy: 'desktop' })
      ]);

      return {
        mobile: mobileResults,
        desktop: desktopResults,
        timestamp: new Date().toISOString(),
        url: url
      };
    } catch (error) {
      console.error('❌ PageSpeed Insights 詳細分析エラー:', error.message);
      throw error;
    }
  }

  /**
   * API 使用量の確認
   * @returns {boolean} API が利用可能かどうか
   */
  isApiAvailable() {
    return !!this.apiKey;
  }
}

module.exports = PageSpeedInsightsClient;