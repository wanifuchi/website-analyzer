const axios = require('axios');
const cheerio = require('cheerio');

/**
 * SERP（検索結果ページ）分析サービス
 * 検索結果ページの詳細分析を行い、SEO改善機会を特定
 */
class SerpAnalysisService {
  constructor() {
    this.googleApiKey = process.env.GOOGLE_API_KEY;
    this.googleSearchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
    this.isAvailable = !!(this.googleApiKey && this.googleSearchEngineId);
    
    console.log('🔍 SERP分析サービス初期化:', {
      apiAvailable: this.isAvailable
    });
  }

  /**
   * SERP分析のメイン関数
   * @param {string} url - 分析対象URL
   * @param {Array} keywords - 分析対象キーワード
   * @returns {Promise<Object>} SERP分析結果
   */
  async analyzeSerpFeatures(url, keywords) {
    console.log('🔍 SERP分析開始:', { url, keywordCount: keywords.length, keywords: keywords.slice(0, 3) });
    
    if (!this.isAvailable) {
      console.log('⚠️ SERP分析API利用不可:', { 
        hasApiKey: !!this.googleApiKey,
        hasSearchEngineId: !!this.googleSearchEngineId 
      });
      return this.getFallbackAnalysis();
    }
    
    if (!keywords || keywords.length === 0) {
      console.log('⚠️ SERP分析キーワードなし');
      return this.getFallbackAnalysis();
    }
    
    try {
      const results = [];
      
      // 主要キーワードでSERP分析（最大3個）
      const targetKeywords = keywords.slice(0, 3);
      
      for (const keyword of targetKeywords) {
        const serpData = await this.analyzeKeywordSerp(keyword, url);
        results.push(serpData);
      }
      
      // 総合分析
      const aggregatedAnalysis = this.aggregateSerpAnalysis(results);
      
      // 推奨事項の生成（空の場合は基本的な推奨事項を追加）
      let recommendations = this.generateSerpRecommendations(aggregatedAnalysis);
      
      // 推奨事項が少ない場合は基本的な最適化提案を追加
      if (recommendations.length < 2) {
        recommendations.push({
          title: '基本的なSERP最適化',
          priority: 'medium',
          description: 'SERP分析によるデータ駆動な最適化で検索結果の表示を改善',
          implementation: [
            'タイトルタグの最適化（32文字以内推奨）',
            'メタディスクリプションの改善（120-160文字）',
            '構造化データ（JSON-LD）の実装',
            'ページの読み込み速度向上'
          ]
        });
      }
      
      // 機会分析が少ない場合は基本的な機会を追加
      if (aggregatedAnalysis.topOpportunities.length === 0) {
        aggregatedAnalysis.topOpportunities.push({
          type: 'meta_optimization',
          priority: 'high',
          description: 'メタタグ最適化でクリック率向上',
          action: 'より魅力的なタイトルとディスクリプションの作成'
        });
      }
      
      const finalResult = {
        keywords: results,
        summary: aggregatedAnalysis,
        recommendations: recommendations,
        dataSource: 'Google Search API'
      };
      
      console.log('✅ SERP分析完了:', {
        url,
        analyzedKeywords: finalResult.summary.analyzedKeywords,
        recommendationsCount: finalResult.recommendations.length,
        hasOpportunities: finalResult.summary.topOpportunities.length > 0
      });
      
      return finalResult;
      
    } catch (error) {
      console.error('❌ SERP分析エラー:', error.message);
      return this.getFallbackAnalysis();
    }
  }

  /**
   * 特定キーワードのSERP分析
   */
  async analyzeKeywordSerp(keyword, targetUrl) {
    try {
      console.log(`🔍 キーワード「${keyword}」のSERP分析`);
      
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
      
      const serpFeatures = {
        keyword,
        totalResults: response.data.searchInformation?.totalResults || '0',
        searchTime: response.data.searchInformation?.searchTime || 0,
        features: this.detectSerpFeatures(response.data),
        position: this.findTargetPosition(response.data.items, targetUrl),
        competitors: this.analyzeCompetitorFeatures(response.data.items),
        opportunities: []
      };
      
      // 機会分析
      serpFeatures.opportunities = this.identifyOpportunities(serpFeatures);
      
      return serpFeatures;
      
    } catch (error) {
      console.error(`キーワード「${keyword}」の分析エラー:`, error.message);
      return {
        keyword,
        error: error.message,
        features: {},
        opportunities: []
      };
    }
  }

  /**
   * SERP特徴の検出
   */
  detectSerpFeatures(searchData) {
    const features = {
      hasKnowledgePanel: false,
      hasFeaturedSnippet: false,
      hasPeopleAlsoAsk: false,
      hasLocalPack: false,
      hasImagePack: false,
      hasVideoPack: false,
      hasSitelinks: false,
      hasRichSnippets: false,
      hasAds: false
    };
    
    // Google APIレスポンスから特徴を推定
    if (searchData.items) {
      searchData.items.forEach(item => {
        // リッチスニペット検出
        if (item.pagemap) {
          if (item.pagemap.metatags) features.hasRichSnippets = true;
          if (item.pagemap.imageobject) features.hasImagePack = true;
          if (item.pagemap.videoobject) features.hasVideoPack = true;
          if (item.pagemap.localbusiness) features.hasLocalPack = true;
        }
        
        // サイトリンク検出
        if (item.sitelinks) {
          features.hasSitelinks = true;
        }
      });
    }
    
    return features;
  }

  /**
   * ターゲットURLの順位を検索
   */
  findTargetPosition(items, targetUrl) {
    if (!items) return null;
    
    const targetDomain = new URL(targetUrl).hostname;
    
    for (let i = 0; i < items.length; i++) {
      const itemDomain = new URL(items[i].link).hostname;
      if (itemDomain === targetDomain) {
        return {
          position: i + 1,
          title: items[i].title,
          snippet: items[i].snippet,
          displayLink: items[i].displayLink
        };
      }
    }
    
    return null;
  }

  /**
   * 競合のSERP特徴分析
   */
  analyzeCompetitorFeatures(items) {
    if (!items) return [];
    
    return items.slice(0, 5).map((item, index) => ({
      position: index + 1,
      domain: new URL(item.link).hostname,
      title: item.title,
      hasRichSnippet: !!(item.pagemap && Object.keys(item.pagemap).length > 1),
      snippetLength: item.snippet?.length || 0,
      features: this.extractItemFeatures(item)
    }));
  }

  /**
   * アイテムの特徴抽出
   */
  extractItemFeatures(item) {
    const features = [];
    
    if (item.pagemap) {
      if (item.pagemap.rating) features.push('レビュー評価');
      if (item.pagemap.offer) features.push('価格情報');
      if (item.pagemap.breadcrumb) features.push('パンくずリスト');
      if (item.pagemap.faqpage) features.push('FAQ');
      if (item.pagemap.howto) features.push('ハウツー');
      if (item.pagemap.recipe) features.push('レシピ');
      if (item.pagemap.event) features.push('イベント');
      if (item.pagemap.product) features.push('商品情報');
    }
    
    return features;
  }

  /**
   * 改善機会の特定
   */
  identifyOpportunities(serpData) {
    const opportunities = [];
    
    // Featured Snippet機会
    if (!serpData.features.hasFeaturedSnippet && serpData.position && serpData.position.position <= 5) {
      opportunities.push({
        type: 'featured_snippet',
        priority: 'high',
        description: '上位表示されているため、Featured Snippet獲得の可能性があります',
        action: '回答形式のコンテンツ構造化（箇条書き、表、定義）を実装'
      });
    }
    
    // リッチスニペット機会
    if (!serpData.features.hasRichSnippets) {
      opportunities.push({
        type: 'rich_snippets',
        priority: 'medium',
        description: '構造化データでリッチスニペット表示を獲得できます',
        action: 'Schema.org構造化データの実装（記事、商品、レビュー等）'
      });
    }
    
    // 順位改善機会
    if (serpData.position && serpData.position.position > 10) {
      opportunities.push({
        type: 'ranking',
        priority: 'high',
        description: '2ページ目以降のため、大幅な改善が必要です',
        action: 'コンテンツの拡充、内部リンク強化、ページ速度改善'
      });
    } else if (serpData.position && serpData.position.position > 3) {
      opportunities.push({
        type: 'ranking',
        priority: 'medium',
        description: '上位3位以内を目指す改善余地があります',
        action: 'タイトル最適化、メタディスクリプション改善、コンテンツ更新'
      });
    }
    
    // 競合分析に基づく機会
    const competitorFeatures = new Set(
      serpData.competitors.flatMap(c => c.features)
    );
    
    if (competitorFeatures.has('レビュー評価')) {
      opportunities.push({
        type: 'review_schema',
        priority: 'medium',
        description: '競合がレビュー評価を表示しています',
        action: 'レビュー機能の追加とRating構造化データの実装'
      });
    }
    
    return opportunities;
  }

  /**
   * SERP分析の集約
   */
  aggregateSerpAnalysis(results) {
    const summary = {
      analyzedKeywords: results.length,
      averagePosition: 0,
      serpFeatures: {},
      topOpportunities: [],
      competitorInsights: []
    };
    
    // 平均順位計算
    const positions = results
      .filter(r => r.position)
      .map(r => r.position.position);
    
    if (positions.length > 0) {
      summary.averagePosition = positions.reduce((a, b) => a + b, 0) / positions.length;
    }
    
    // SERP特徴の集計
    const allFeatures = {};
    results.forEach(result => {
      if (result.features) {
        Object.entries(result.features).forEach(([feature, value]) => {
          if (value) {
            allFeatures[feature] = (allFeatures[feature] || 0) + 1;
          }
        });
      }
    });
    summary.serpFeatures = allFeatures;
    
    // 機会の優先順位付け
    const allOpportunities = results.flatMap(r => r.opportunities || []);
    summary.topOpportunities = this.prioritizeOpportunities(allOpportunities);
    
    // 競合インサイト
    summary.competitorInsights = this.generateCompetitorInsights(results);
    
    return summary;
  }

  /**
   * 機会の優先順位付け
   */
  prioritizeOpportunities(opportunities) {
    const grouped = {};
    
    opportunities.forEach(opp => {
      if (!grouped[opp.type]) {
        grouped[opp.type] = {
          ...opp,
          count: 1
        };
      } else {
        grouped[opp.type].count++;
      }
    });
    
    return Object.values(grouped)
      .sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
      })
      .slice(0, 5);
  }

  /**
   * 競合インサイト生成
   */
  generateCompetitorInsights(results) {
    const insights = [];
    
    // 共通して上位に表示される競合
    const competitorPositions = {};
    results.forEach(result => {
      if (result.competitors) {
        result.competitors.forEach(comp => {
          if (!competitorPositions[comp.domain]) {
            competitorPositions[comp.domain] = [];
          }
          competitorPositions[comp.domain].push(comp.position);
        });
      }
    });
    
    // 複数キーワードで上位の競合
    Object.entries(competitorPositions).forEach(([domain, positions]) => {
      if (positions.length >= 2) {
        const avgPosition = positions.reduce((a, b) => a + b, 0) / positions.length;
        insights.push({
          domain,
          avgPosition: avgPosition.toFixed(1),
          keywordCount: positions.length,
          insight: `${positions.length}個のキーワードで平均${avgPosition.toFixed(1)}位`
        });
      }
    });
    
    return insights.sort((a, b) => a.avgPosition - b.avgPosition).slice(0, 3);
  }

  /**
   * SERP改善提案の生成
   */
  generateSerpRecommendations(summary) {
    const recommendations = [];
    
    // Featured Snippet最適化
    if (summary.serpFeatures.hasFeaturedSnippet < summary.analyzedKeywords / 2) {
      recommendations.push({
        title: 'Featured Snippet最適化',
        priority: 'high',
        description: '質問形式の見出しと簡潔な回答を含むコンテンツ構造に改善',
        implementation: [
          '「〜とは」「〜の方法」などの質問形式の見出しを追加',
          '40-60語程度の簡潔な回答段落を配置',
          '番号付きリストや箇条書きで手順を明確化',
          '表形式での比較コンテンツを追加'
        ]
      });
    }
    
    // 構造化データ実装
    if (!summary.serpFeatures.hasRichSnippets || summary.serpFeatures.hasRichSnippets < summary.analyzedKeywords) {
      recommendations.push({
        title: '構造化データ実装',
        priority: 'high',
        description: 'Schema.orgマークアップで検索結果の視認性向上',
        implementation: [
          'Article/BlogPosting構造化データの実装',
          'BreadcrumbList構造化データの追加',
          'Organization構造化データでブランド情報を強化',
          'FAQ構造化データで質問と回答を明示'
        ]
      });
    }
    
    // 順位改善戦略
    if (summary.averagePosition > 5) {
      recommendations.push({
        title: 'コンテンツ深度の強化',
        priority: 'medium',
        description: '上位競合を上回る包括的コンテンツの作成',
        implementation: [
          '現在のコンテンツを30-50%拡張',
          '関連トピックの網羅的カバー',
          '独自の調査データや事例を追加',
          '専門家の意見やインタビューを含める'
        ]
      });
    }
    
    return recommendations;
  }

  /**
   * フォールバック分析
   */
  getFallbackAnalysis() {
    return {
      keywords: [],
      summary: {
        analyzedKeywords: 0,
        averagePosition: null,
        serpFeatures: {},
        topOpportunities: [
          {
            type: 'structured_data',
            priority: 'high',
            description: '構造化データの実装で検索結果の表示を改善',
            action: 'Schema.org構造化データの追加'
          }
        ]
      },
      recommendations: [
        {
          title: 'SERP分析を有効化',
          priority: 'info',
          description: 'Google Search APIを設定することで、実際の検索結果分析が可能になります',
          implementation: ['Google Cloud ConsoleでAPIキーを取得', 'Custom Search Engineを作成']
        }
      ],
      dataSource: 'フォールバック分析'
    };
  }
}

module.exports = SerpAnalysisService;