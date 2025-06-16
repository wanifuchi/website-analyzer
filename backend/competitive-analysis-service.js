const axios = require('axios');
const cheerio = require('cheerio');

/**
 * 競合・市場分析サービス
 * 実際の検索結果データに基づいて競合サイトを特定・分析
 */
class CompetitiveAnalysisService {
  constructor() {
    this.serpApiKey = process.env.SERP_API_KEY;
    this.googleApiKey = process.env.GOOGLE_API_KEY;
    this.googleSearchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
    
    // 利用可能なAPIを確認
    this.isGoogleSearchAvailable = !!(this.googleApiKey && this.googleSearchEngineId);
    this.isSerpApiAvailable = !!this.serpApiKey;
    
    console.log('🏆 競合分析サービス初期化:', {
      googleSearchAPI: this.isGoogleSearchAvailable,
      serpAPI: this.isSerpApiAvailable
    });
  }

  /**
   * メインの競合分析関数
   * @param {string} url - 分析対象URL
   * @param {Object} siteContent - サイトコンテンツ情報
   * @returns {Promise<Object>} 競合分析結果
   */
  async analyzeCompetitors(url, siteContent) {
    console.log('🔍 競合分析開始:', url);
    
    try {
      // 1. ターゲットキーワードを抽出
      const targetKeywords = this.extractTargetKeywords(siteContent);
      console.log('📌 ターゲットキーワード:', targetKeywords);
      
      // 2. 主要キーワードで検索結果を取得
      const searchResults = await this.getSearchResults(targetKeywords.primary);
      
      if (!searchResults || searchResults.length === 0) {
        console.log('⚠️ 検索結果が取得できませんでした');
        return this.getFallbackAnalysis(url, siteContent);
      }
      
      // 3. 競合サイトを特定（自サイトを除外）
      const competitors = this.identifyCompetitors(searchResults, url);
      console.log('🏢 特定された競合:', competitors.map(c => c.domain));
      
      // 4. 競合サイトの詳細分析
      const competitorAnalysis = await this.analyzeCompetitorSites(competitors.slice(0, 3));
      
      // 5. 市場ポジション分析
      const marketPosition = this.analyzeMarketPosition(url, searchResults);
      
      // 6. 差別化機会の特定
      const differentiationOpportunities = this.identifyDifferentiationOpportunities(
        siteContent,
        competitorAnalysis
      );
      
      return {
        targetKeywords,
        topCompetitors: competitors.slice(0, 5).map(c => ({
          domain: c.domain,
          title: c.title,
          position: c.position,
          snippet: c.snippet
        })),
        competitorStrengths: this.extractCompetitorStrengths(competitorAnalysis),
        differentiationOpportunities,
        marketPosition,
        competitorAnalysis,
        searchResultsAnalyzed: searchResults.length,
        dataSource: this.isGoogleSearchAvailable ? 'Google Search API' : 'フォールバック分析'
      };
      
    } catch (error) {
      console.error('❌ 競合分析エラー:', error.message);
      return this.getFallbackAnalysis(url, siteContent);
    }
  }

  /**
   * ターゲットキーワードを抽出
   */
  extractTargetKeywords(siteContent) {
    const keywords = {
      primary: '',
      secondary: [],
      longtail: []
    };
    
    // タイトルから主要キーワードを抽出
    if (siteContent.title) {
      // 会社名や一般的な語句を除去
      const cleanTitle = siteContent.title
        .replace(/株式会社|有限会社|\(.*?\)|\[.*?\]|｜.*$/g, '')
        .replace(/公式サイト|ホームページ|HP|オフィシャル/g, '')
        .trim();
      
      keywords.primary = cleanTitle;
      
      // タイトルから重要な部分を抽出
      const titleParts = cleanTitle.split(/[\s\-・｜|]/);
      keywords.secondary = titleParts.filter(part => part.length > 2).slice(0, 3);
    }
    
    // メタディスクリプションからもキーワードを抽出
    if (siteContent.metaDescription) {
      const descKeywords = siteContent.metaDescription
        .match(/[一-龯ァ-ヴー]+/g)
        ?.filter(word => word.length > 2 && word.length < 10)
        .slice(0, 5) || [];
      
      keywords.secondary.push(...descKeywords);
    }
    
    // 固有名詞を活用
    if (siteContent.properNouns && siteContent.properNouns.length > 0) {
      const businessKeywords = siteContent.properNouns
        .filter(noun => !noun.match(/^(株式会社|有限会社)/))
        .slice(0, 3);
      
      // 地域×サービスのロングテールキーワード生成
      const locations = siteContent.properNouns.filter(noun => 
        noun.match(/[都道府県市区町村]$/)
      );
      
      if (locations.length > 0 && keywords.secondary.length > 0) {
        locations.forEach(location => {
          keywords.secondary.forEach(service => {
            keywords.longtail.push(`${location} ${service}`);
          });
        });
      }
    }
    
    // 重複を除去
    keywords.secondary = [...new Set(keywords.secondary)];
    keywords.longtail = [...new Set(keywords.longtail)].slice(0, 5);
    
    return keywords;
  }

  /**
   * Google検索結果を取得
   */
  async getSearchResults(keyword) {
    if (!keyword) return [];
    
    // Google Custom Search APIを使用
    if (this.isGoogleSearchAvailable) {
      try {
        const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
          params: {
            key: this.googleApiKey,
            cx: this.googleSearchEngineId,
            q: keyword,
            num: 10,
            hl: 'ja',
            gl: 'jp'
          }
        });
        
        if (response.data.items) {
          return response.data.items.map((item, index) => ({
            position: index + 1,
            title: item.title,
            link: item.link,
            domain: new URL(item.link).hostname,
            snippet: item.snippet,
            displayLink: item.displayLink
          }));
        }
      } catch (error) {
        console.error('Google Search APIエラー:', error.message);
      }
    }
    
    // フォールバック: 簡易的な競合推定
    return this.estimateCompetitors(keyword);
  }

  /**
   * 競合サイトを特定
   */
  identifyCompetitors(searchResults, targetUrl) {
    const targetDomain = new URL(targetUrl).hostname;
    
    return searchResults
      .filter(result => {
        // 自サイトを除外
        if (result.domain === targetDomain) return false;
        
        // 大手ポータルサイトを除外
        const portalDomains = [
          'wikipedia.org', 'amazon.co.jp', 'rakuten.co.jp',
          'yahoo.co.jp', 'google.com', 'youtube.com'
        ];
        
        return !portalDomains.some(portal => result.domain.includes(portal));
      })
      .map(result => ({
        ...result,
        competitorScore: this.calculateCompetitorScore(result)
      }))
      .sort((a, b) => b.competitorScore - a.competitorScore);
  }

  /**
   * 競合スコアを計算
   */
  calculateCompetitorScore(result) {
    let score = 100;
    
    // 順位によるスコア
    score -= (result.position - 1) * 10;
    
    // ドメインの信頼性
    if (result.domain.endsWith('.go.jp')) score += 20;
    if (result.domain.endsWith('.ac.jp')) score += 15;
    if (result.domain.endsWith('.or.jp')) score += 10;
    
    return Math.max(0, score);
  }

  /**
   * 競合サイトの詳細分析
   */
  async analyzeCompetitorSites(competitors) {
    const analyses = [];
    
    for (const competitor of competitors) {
      try {
        console.log(`🔍 競合分析中: ${competitor.domain}`);
        
        const response = await axios.get(competitor.link, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; CompetitiveAnalysisBot/1.0)'
          },
          timeout: 10000
        });
        
        const $ = cheerio.load(response.data);
        
        const analysis = {
          domain: competitor.domain,
          position: competitor.position,
          title: $('title').text(),
          metaDescription: $('meta[name="description"]').attr('content') || '',
          h1Count: $('h1').length,
          h2Count: $('h2').length,
          contentLength: $('body').text().length,
          hasStructuredData: $('script[type="application/ld+json"]').length > 0,
          
          // SEO要素
          seoStrengths: [],
          contentFeatures: [],
          technicalFeatures: []
        };
        
        // SEO強みを分析
        if (analysis.h1Count === 1) analysis.seoStrengths.push('適切なH1タグ構造');
        if (analysis.hasStructuredData) analysis.seoStrengths.push('構造化データ実装');
        if (analysis.metaDescription.length > 100) analysis.seoStrengths.push('詳細なメタディスクリプション');
        
        // コンテンツ特徴
        if (analysis.contentLength > 3000) analysis.contentFeatures.push('充実したコンテンツボリューム');
        if ($('img').length > 5) analysis.contentFeatures.push('豊富な画像コンテンツ');
        if ($('ul, ol').length > 3) analysis.contentFeatures.push('構造化された情報提供');
        
        // 技術的特徴
        if ($('link[rel="canonical"]').length > 0) analysis.technicalFeatures.push('canonical設定');
        if ($('meta[property^="og:"]').length > 3) analysis.technicalFeatures.push('OGP設定');
        
        analyses.push(analysis);
        
      } catch (error) {
        console.warn(`⚠️ ${competitor.domain}の分析に失敗:`, error.message);
      }
    }
    
    return analyses;
  }

  /**
   * 市場ポジション分析
   */
  analyzeMarketPosition(targetUrl, searchResults) {
    const targetDomain = new URL(targetUrl).hostname;
    const targetResult = searchResults.find(r => r.domain === targetDomain);
    
    if (!targetResult) {
      return {
        position: '圏外',
        description: '主要キーワードでの検索結果に表示されていません。SEO対策の強化が急務です。',
        competitiveLevel: 'weak'
      };
    }
    
    const position = targetResult.position;
    
    if (position <= 3) {
      return {
        position: `${position}位`,
        description: '上位表示を達成しています。この順位を維持・向上させる戦略が重要です。',
        competitiveLevel: 'strong'
      };
    } else if (position <= 10) {
      return {
        position: `${position}位`,
        description: '1ページ目に表示されています。上位3位以内を目指す改善が必要です。',
        competitiveLevel: 'moderate'
      };
    } else {
      return {
        position: `${position}位`,
        description: '2ページ目以降の表示です。大幅な改善により1ページ目進出を目指しましょう。',
        competitiveLevel: 'weak'
      };
    }
  }

  /**
   * 差別化機会の特定
   */
  identifyDifferentiationOpportunities(siteContent, competitorAnalysis) {
    const opportunities = [];
    
    // コンテンツボリュームでの差別化
    const avgContentLength = competitorAnalysis.reduce((sum, c) => sum + c.contentLength, 0) / competitorAnalysis.length;
    if (siteContent.textContent && siteContent.textContent.length < avgContentLength * 0.7) {
      opportunities.push('競合比でコンテンツボリュームが不足。詳細な情報提供で差別化可能');
    }
    
    // 構造化データでの差別化
    const hasStructuredData = competitorAnalysis.filter(c => c.hasStructuredData).length;
    if (hasStructuredData < competitorAnalysis.length / 2) {
      opportunities.push('構造化データ実装による検索結果での視認性向上');
    }
    
    // 地域特化での差別化
    if (siteContent.properNouns?.some(noun => noun.match(/[都道府県市区町村]$/))) {
      opportunities.push('地域密着型コンテンツの強化による差別化');
    }
    
    // 専門性での差別化
    if (siteContent.businessContext?.confidence > 70) {
      opportunities.push(`${siteContent.businessContext.primaryIndustry}分野の専門性を活かしたコンテンツ展開`);
    }
    
    // 競合が実装していない機能
    const competitorFeatures = new Set(competitorAnalysis.flatMap(c => c.technicalFeatures));
    if (!competitorFeatures.has('PWA')) {
      opportunities.push('PWA実装によるモバイルユーザー体験の向上');
    }
    
    return opportunities;
  }

  /**
   * 競合の強みを抽出
   */
  extractCompetitorStrengths(competitorAnalysis) {
    const strengthsMap = new Map();
    
    // 各競合の強みを集計
    competitorAnalysis.forEach(competitor => {
      [...competitor.seoStrengths, ...competitor.contentFeatures, ...competitor.technicalFeatures]
        .forEach(strength => {
          strengthsMap.set(strength, (strengthsMap.get(strength) || 0) + 1);
        });
    });
    
    // 頻出する強みを抽出
    return Array.from(strengthsMap.entries())
      .filter(([_, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .map(([strength, count]) => `${strength}（${count}社が実装）`)
      .slice(0, 5);
  }

  /**
   * フォールバック分析（API利用不可時）
   */
  getFallbackAnalysis(url, siteContent) {
    console.log('📊 フォールバック競合分析を実行');
    
    const industry = siteContent.businessContext?.primaryIndustry || '一般';
    
    return {
      targetKeywords: this.extractTargetKeywords(siteContent),
      topCompetitors: [],
      competitorStrengths: [
        '実際の検索データが利用できないため、一般的な強みを表示',
        `${industry}分野での標準的なSEO対策`,
        'モバイル最適化とページ速度の改善',
        'ユーザー体験を重視したサイト設計'
      ],
      differentiationOpportunities: [
        'ローカルSEOの強化による地域での優位性確立',
        'E-E-A-T（専門性・権威性・信頼性）を高めるコンテンツ戦略',
        '音声検索・ビジュアル検索への対応',
        'コンテンツの深度と独自性による差別化'
      ],
      marketPosition: {
        position: '分析中',
        description: '実際の検索順位データを取得するには、Google Search Console連携が必要です',
        competitiveLevel: 'unknown'
      },
      dataSource: 'AI推定（実データなし）'
    };
  }

  /**
   * 簡易的な競合推定
   */
  estimateCompetitors(keyword) {
    // 業界別の一般的な競合パターン
    const patterns = {
      '不動産': ['suumo.jp', 'homes.co.jp', 'athome.co.jp'],
      '医療': ['hospita.jp', 'caloo.jp', 'fdoc.jp'],
      '飲食': ['tabelog.com', 'hotpepper.jp', 'gurunavi.com'],
      '美容': ['hotpepper-beauty.jp', 'minimo.jp', 'ozmall.co.jp'],
      'EC': ['amazon.co.jp', 'rakuten.co.jp', 'yahoo-shopping.jp']
    };
    
    // キーワードから業界を推定
    for (const [industry, domains] of Object.entries(patterns)) {
      if (keyword.includes(industry)) {
        return domains.map((domain, index) => ({
          position: index + 1,
          domain,
          title: `${industry}関連サイト`,
          link: `https://${domain}`,
          snippet: `${industry}分野の大手サイト`
        }));
      }
    }
    
    return [];
  }
}

module.exports = CompetitiveAnalysisService;