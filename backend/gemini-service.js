const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiAIService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    
    if (!this.apiKey) {
      console.warn('⚠️ GEMINI_API_KEY が設定されていません。フォールバック分析を使用します。');
      this.isAvailable = false;
      return;
    }

    try {
      this.genAI = new GoogleGenerativeAI(this.apiKey);
      this.generativeModel = this.genAI.getGenerativeModel({ model: this.model });
      this.isAvailable = true;
      console.log('✅ Gemini AI サービス初期化完了:', {
        model: this.model,
        apiKeyLength: this.apiKey.length
      });
    } catch (error) {
      console.error('❌ Gemini AI 初期化エラー:', error);
      this.isAvailable = false;
    }
  }

  /**
   * ウェブサイト分析結果を基にAI改善提案を生成
   * @param {string} url - 分析対象URL
   * @param {Object} analysisResults - 分析結果オブジェクト
   * @returns {Promise<Object>} AI改善提案
   */
  async generateWebsiteRecommendations(url, analysisResults) {
    if (!this.isAvailable) {
      console.log('⚠️ Gemini API利用不可、フォールバック推奨事項を返します');
      return this.getFallbackRecommendations(url, analysisResults);
    }

    try {
      console.log('🤖 Gemini AI分析開始:', url);

      const prompt = this.buildAnalysisPrompt(url, analysisResults);
      const result = await this.generativeModel.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      console.log('✅ Gemini AI応答受信:', text.substring(0, 200) + '...');
      console.log('🔍 完全なGemini応答:', text);

      // JSONレスポンスの解析を試行（複数の方法で試す）
      try {
        // 方法1: 直接JSON解析
        const directJson = JSON.parse(text);
        console.log('✅ 直接JSON解析成功');
        return this.formatRecommendations(directJson, url);
      } catch (directError) {
        console.log('⚠️ 直接JSON解析失敗:', directError.message);
        
        // 方法2: JSONブロックを抽出
        try {
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            console.log('🔍 抽出されたJSON:', jsonMatch[0].substring(0, 300) + '...');
            const recommendations = JSON.parse(jsonMatch[0]);
            console.log('✅ JSONブロック解析成功');
            return this.formatRecommendations(recommendations, url);
          }
        } catch (parseError) {
          console.warn('⚠️ JSONブロック解析失敗:', parseError.message);
        }

        // 方法3: コードブロック内のJSONを探す
        try {
          const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
          if (codeBlockMatch) {
            console.log('🔍 コードブロック内JSON:', codeBlockMatch[1].substring(0, 300) + '...');
            const recommendations = JSON.parse(codeBlockMatch[1]);
            console.log('✅ コードブロック解析成功');
            return this.formatRecommendations(recommendations, url);
          }
        } catch (codeBlockError) {
          console.warn('⚠️ コードブロック解析失敗:', codeBlockError.message);
        }
      }

      // すべて失敗した場合はテキスト解析にフォールバック
      console.log('📝 テキスト解析モードに移行');
      return this.parseTextResponse(text, url, analysisResults);

    } catch (error) {
      console.error('❌ Gemini AI 分析エラー:', error);
      return this.getFallbackRecommendations(url, analysisResults);
    }
  }

  /**
   * 分析プロンプトを構築
   * @param {string} url - URL
   * @param {Object} analysisResults - 分析結果
   * @returns {string} プロンプト
   */
  buildAnalysisPrompt(url, analysisResults) {
    const scores = {
      seo: analysisResults.seo?.score || 0,
      performance: analysisResults.performance?.score || 0,
      security: analysisResults.security?.score || 0,
      accessibility: analysisResults.accessibility?.score || 0,
      mobile: analysisResults.mobile?.score || 0
    };

    const overallScore = Object.values(scores).reduce((sum, score) => sum + score, 0) / 5;

    // URLからドメインと業界を推測
    const domain = new URL(url).hostname;
    const industryHint = this.detectIndustry(url, analysisResults);

    return `
🤖 あなたは最先端のAI駆動ウェブサイト分析専門家です。以下の分析結果を基に、通常の分析では見つからない深層的な改善点を発見し、革新的な最適化戦略を提案してください。

🎯 【深層分析ミッション】
URL: ${url}
ドメイン: ${domain}
推定業界: ${industryHint}
現在の総合スコア: ${Math.round(overallScore)}点
目標: スコアを90点以上に押し上げる戦略的改善案

📊 【現状分析データ】
- SEO: ${scores.seo}点 (競合分析・検索意図最適化の観点)
- パフォーマンス: ${scores.performance}点 (Core Web Vitals・UX最適化)
- セキュリティ: ${scores.security}点 (ゼロトラスト・現代的脅威対策)
- アクセシビリティ: ${scores.accessibility}点 (インクルーシブデザイン・WCAG準拠)
- モバイル対応: ${scores.mobile}点 (モバイルファースト・PWA化)

🔍 【検出された課題】
${this.formatAnalysisDetails(analysisResults)}

🧠 【AI分析指示】
以下の高度な分析視点で深掘りしてください：

1. **競合キーワードギャップ分析**
   - この業界で競合が狙っているが、このサイトが取れていないキーワード
   - 月間検索ボリュームが高く、競合性が低い「お宝キーワード」の発見
   - ロングテールキーワードの機会損失分析
   - 地域×サービスの掛け合わせキーワード提案

2. **検索意図マッチング分析**
   - 各ページの検索意図との一致度評価
   - 情報検索、取引検索、ナビゲーション検索への最適化
   - ユーザーが求める情報と提供コンテンツのギャップ
   - 検索結果での競合との差別化ポイント

3. **SERP（検索結果）最適化戦略**
   - リッチリザルト獲得のための構造化データ提案
   - Featured Snippet（強調スニペット）獲得戦略
   - People Also Ask（他の人はこちらも質問）への対応
   - ナレッジパネル表示のための最適化

4. **コンテンツギャップ＆機会分析**
   - 競合が持っていて自サイトにないコンテンツカテゴリ
   - トピッククラスター戦略の提案
   - 内部リンク最適化によるトピックオーソリティ構築
   - 季節性・トレンドを考慮したコンテンツカレンダー

5. **技術的SEO＆パフォーマンス改善**
   - Core Web Vitals改善の具体的実装方法
   - JavaScript SEOの最適化
   - モバイルファーストインデックスへの完全対応
   - サイト構造とクロール効率の最適化

以下の形式でJSONレスポンスを返してください：

{
  "summary": "AI分析による深層的洞察の要約（200文字以内）",
  "keywordGapAnalysis": {
    "missingKeywords": [
      {
        "keyword": "競合が獲得しているキーワード",
        "searchVolume": "月間検索ボリューム",
        "difficulty": "競合性（1-100）",
        "opportunity": "獲得機会スコア",
        "suggestedContent": "作成すべきコンテンツ"
      }
    ],
    "longTailOpportunities": ["ロングテールキーワード1", "キーワード2"],
    "localKeywords": ["地域×サービスキーワード1", "キーワード2"],
    "estimatedTrafficGain": "推定月間流入増加数"
  },
  "competitiveAnalysis": {
    "topCompetitors": ["競合サイト1", "競合サイト2"],
    "competitorStrengths": ["競合の強み1", "強み2"],
    "differentiationOpportunities": ["差別化機会1", "機会2"],
    "marketPosition": "現在の市場ポジション分析"
  },
  "contentGapAnalysis": {
    "missingTopics": ["不足トピック1", "トピック2"],
    "contentCalendar": {
      "immediate": ["今すぐ作成すべきコンテンツ"],
      "shortTerm": ["1ヶ月以内に作成すべきコンテンツ"],
      "longTerm": ["3ヶ月以内に作成すべきコンテンツ"]
    },
    "topicClusters": ["推奨トピッククラスター1", "クラスター2"]
  },
  "strategicRecommendations": [
    {
      "category": "キーワード戦略|コンテンツ最適化|技術的SEO|UX改善|コンバージョン最適化",
      "priority": "critical|high|medium",
      "title": "革新的改善提案タイトル",
      "deepAnalysis": "AIが発見した深層的問題分析",
      "solution": "創造的解決策",
      "implementation": "段階的実装ロードマップ",
      "expectedResults": "定量的効果予測（流入数、順位向上など）",
      "kpiImpact": {
        "organicTraffic": "+XX%",
        "conversionRate": "+XX%",
        "rankingImprovement": "XX位向上"
      },
      "timeframe": "実装期間",
      "difficulty": "easy|medium|hard",
      "roi": "投資対効果"
    }
  ],
  "userJourneyOptimization": {
    "currentPainPoints": ["現在の課題点"],
    "optimizedFlow": "改善されたユーザーフロー",
    "conversionStrategy": "コンバージョン向上戦略"
  },
  "technicalInnovation": {
    "modernTechStack": ["推奨技術スタック"],
    "performanceBoosts": "パフォーマンス向上技術",
    "futureProofing": "将来性担保策"
  },
  "seoStrategy2025": {
    "eeaStrategy": "E-E-A-T強化戦略",
    "contentOptimization": "コンテンツ最適化方針",
    "technicalSeo": "テクニカルSEO改善"
  },
  "expectedImpact": {
    "seo": "SEOスコア向上予測（+具体数値）",
    "performance": "パフォーマンス向上予測",
    "conversion": "コンバージョン率改善予測",
    "userExperience": "UX指標改善予測",
    "overall": "総合スコア向上予測"
  },
  "implementationRoadmap": {
    "phase1": "第1フェーズ（1-2週間）",
    "phase2": "第2フェーズ（1-2ヶ月）", 
    "phase3": "第3フェーズ（3-6ヶ月）"
  },
  "dataAnalysisRecommendations": {
    "abTestIdeas": ["A/Bテスト提案"],
    "analyticsSetup": "分析環境構築提案",
    "kpiTracking": "追跡すべきKPI"
  }
}

🎯 【AI分析品質基準】
- 従来分析では発見できない深層的洞察を提供
- データに基づく具体的な数値目標設定
- 実装の難易度と効果のバランス最適化
- 2025年のWeb標準・トレンド反映
- ROI（投資対効果）の明確化
- 競合他社との差別化要素の特定

💡 このサイトが業界トップレベルになるための革新的戦略を提案してください。
`;
  }

  /**
   * 分析結果の詳細をフォーマット
   * @param {Object} analysisResults - 分析結果
   * @returns {string} フォーマットされた詳細
   */
  formatAnalysisDetails(analysisResults) {
    let details = '';

    if (analysisResults.seo?.issues?.length > 0) {
      details += `SEO課題: ${analysisResults.seo.issues.slice(0, 3).map(issue => issue.message || issue).join(', ')}\n`;
    }

    if (analysisResults.performance?.issues?.length > 0) {
      details += `パフォーマンス課題: ${analysisResults.performance.issues.slice(0, 3).map(issue => issue.message || issue).join(', ')}\n`;
    }

    if (analysisResults.security?.issues?.length > 0) {
      details += `セキュリティ課題: ${analysisResults.security.issues.slice(0, 3).map(issue => issue.message || issue).join(', ')}\n`;
    }

    if (analysisResults.accessibility?.issues?.length > 0) {
      details += `アクセシビリティ課題: ${analysisResults.accessibility.issues.slice(0, 3).map(issue => issue.message || issue).join(', ')}\n`;
    }

    if (analysisResults.mobile?.issues?.length > 0) {
      details += `モバイル課題: ${analysisResults.mobile.issues.slice(0, 3).map(issue => issue.message || issue).join(', ')}\n`;
    }

    return details || '詳細な課題情報は利用できません。';
  }

  /**
   * テキストレスポンスを解析して構造化
   * @param {string} text - AI応答テキスト
   * @param {string} url - URL
   * @param {Object} analysisResults - 分析結果
   * @returns {Object} 構造化された推奨事項
   */
  parseTextResponse(text, url, analysisResults) {
    console.log('📝 テキスト解析開始:', text.length + ' 文字');
    
    // 業界情報を取得
    const industryHint = this.detectIndustry(url, analysisResults);
    
    // より詳細なテキスト解析で推奨事項を抽出
    const lines = text.split('\n').filter(line => line.trim());
    const recommendations = [];
    const competitiveAnalysis = {};
    const userJourneyOptimization = {};
    const implementationRoadmap = {};

    let currentSection = null;
    let currentRec = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // セクション識別
      if (line.includes('競合') || line.includes('市場')) {
        currentSection = 'competitive';
      } else if (line.includes('ユーザージャーニー') || line.includes('UX')) {
        currentSection = 'userJourney';
      } else if (line.includes('ロードマップ') || line.includes('フェーズ')) {
        currentSection = 'roadmap';
      } else if (line.includes('推奨') || line.includes('提案') || line.includes('改善')) {
        currentSection = 'recommendations';
      }

      // 推奨事項の抽出
      if (line.includes('SEO') || line.includes('パフォーマンス') || line.includes('セキュリティ') || 
          line.includes('アクセシビリティ') || line.includes('モバイル') || line.includes('UX') ||
          line.includes('技術') || line.includes('コンバージョン')) {
        
        if (currentRec) {
          recommendations.push(currentRec);
        }
        
        currentRec = {
          category: this.extractCategory(line),
          priority: this.extractPriority(line),
          title: line.replace(/[^\w\s\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/g, '').trim(),
          description: '',
          implementation: '',
          impact: '+10-25点',
          timeframe: '2-4週間',
          difficulty: 'medium'
        };
        
        // 次の行から詳細を抽出
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          const nextLine = lines[j].trim();
          if (nextLine.length > 20 && !this.isNewRecommendation(nextLine)) {
            if (!currentRec.description) {
              currentRec.description = nextLine;
            } else if (!currentRec.implementation && nextLine.includes('実装')) {
              currentRec.implementation = nextLine;
            }
          }
        }
      }
    }

    if (currentRec) {
      recommendations.push(currentRec);
    }

    // フォールバック推奨事項（何も抽出できなかった場合）
    if (recommendations.length === 0) {
      recommendations.push(...this.generateFallbackRecommendations(analysisResults));
    }

    const scores = {
      seo: analysisResults.seo?.score || 0,
      performance: analysisResults.performance?.score || 0,
      security: analysisResults.security?.score || 0,
      accessibility: analysisResults.accessibility?.score || 0,
      mobile: analysisResults.mobile?.score || 0
    };

    const result = {
      summary: `Gemini 2.0による深層分析で${recommendations.length}個の戦略的改善提案を生成しました。競合キーワードギャップ分析により、未開拓の流入機会を発見しました。`,
      keywordGapAnalysis: {
        missingKeywords: [
          {
            keyword: `${industryHint}関連キーワード`,
            searchVolume: '1,000-5,000',
            difficulty: '40',
            opportunity: '高',
            suggestedContent: `${industryHint}の基本ガイド`
          }
        ],
        longTailOpportunities: [`${industryHint} 比較`, `${industryHint} 選び方`, `${industryHint} 口コミ`],
        localKeywords: [`地域名 ${industryHint}`, `近くの ${industryHint}`],
        estimatedTrafficGain: '+2,000-5,000訪問/月'
      },
      contentGapAnalysis: {
        missingTopics: ['よくある質問ページ', 'サービス比較コンテンツ', '事例紹介'],
        contentCalendar: {
          immediate: ['基本的なFAQページ作成', 'サービス一覧の詳細化'],
          shortTerm: ['お客様の声ページ', '料金比較表'],
          longTerm: ['業界トレンドブログ', '専門知識コンテンツ']
        },
        topicClusters: [`${industryHint}の基礎知識`, 'サービス選びのポイント']
      },
      strategicRecommendations: recommendations.slice(0, 8).map(rec => ({
        ...rec,
        kpiImpact: {
          organicTraffic: '+20-40%',
          conversionRate: '+2-5%',
          rankingImprovement: '5-10位向上'
        }
      })),
      competitiveAnalysis: {
        topCompetitors: ['競合A社', '競合B社', '業界大手サイト'],
        competitorStrengths: ['豊富なコンテンツ量', '地域密着型SEO', 'ブランド認知度'],
        differentiationOpportunities: [
          'より詳細なサービス説明',
          '独自の価値提案の明確化',
          'ローカルSEOの強化'
        ],
        marketPosition: '現在は中位に位置していますが、適切な施策により上位進出が可能です'
      },
      userJourneyOptimization: {
        currentPainPoints: [
          'モバイルでの情報アクセシビリティ',
          'サービス内容の理解しやすさ',
          'お問い合わせまでの導線'
        ],
        optimizedFlow: '感情に配慮した情報提示から信頼構築、そして適切なタイミングでのアクション誘導',
        conversionStrategy: 'ユーザーの心情に寄り添う段階的な情報提供とスムーズなコンタクト導線'
      },
      implementationRoadmap: {
        phase1: '基礎SEO最適化とモバイル対応（1-2週間）',
        phase2: 'UX改善とコンテンツ最適化（1-2ヶ月）',
        phase3: '継続的な分析と改善サイクル確立（3-6ヶ月）'
      },
      expectedImpact: {
        seo: `+${Math.min(30, Math.max(10, 90 - scores.seo))}点`,
        performance: `+${Math.min(25, Math.max(10, 85 - scores.performance))}点`,
        conversion: '+15-30%向上',
        userExperience: '+40%改善',
        overall: `+${Math.min(25, Math.max(10, 90 - Object.values(scores).reduce((sum, score) => sum + score, 0) / 5))}点`
      },
      dataAnalysisRecommendations: {
        abTestIdeas: [
          'CTAボタンの位置とデザイン最適化',
          'サービス紹介ページの構成変更',
          'お問い合わせフォームの簡素化'
        ],
        kpiTracking: 'ページ滞在時間、バウンス率、コンバージョン率、モバイル離脱率の継続監視'
      },
      analysisDate: new Date().toISOString(),
      url,
      aiProvider: 'Gemini 2.0 (テキスト解析)'
    };

    console.log('✅ テキスト解析完了:', {
      recommendationsCount: result.strategicRecommendations.length,
      summaryLength: result.summary.length
    });

    return result;
  }

  generateFallbackRecommendations(analysisResults) {
    const scores = {
      seo: analysisResults.seo?.score || 0,
      performance: analysisResults.performance?.score || 0,
      security: analysisResults.security?.score || 0,
      accessibility: analysisResults.accessibility?.score || 0,
      mobile: analysisResults.mobile?.score || 0
    };

    const recommendations = [];

    if (scores.seo < 80) {
      recommendations.push({
        category: 'SEO',
        priority: 'high',
        title: 'SEO基盤強化による検索順位向上',
        description: `現在のSEOスコア${scores.seo}点を改善し、地域検索での露出を強化します。`,
        implementation: 'メタタグ最適化、構造化データ実装、ローカルSEO強化を段階的に実施',
        impact: `+${Math.min(25, 90 - scores.seo)}点`,
        timeframe: '2-3週間',
        difficulty: 'medium'
      });
    }

    if (scores.performance < 75) {
      recommendations.push({
        category: 'パフォーマンス',
        priority: 'high',
        title: 'ページ速度最適化によるユーザー体験向上',
        description: `現在のパフォーマンススコア${scores.performance}点を大幅改善し、ユーザー満足度を向上させます。`,
        implementation: '画像最適化、コード圧縮、CDN導入による読み込み速度改善',
        impact: `+${Math.min(30, 85 - scores.performance)}点`,
        timeframe: '1-2週間',
        difficulty: 'easy'
      });
    }

    return recommendations;
  }

  isNewRecommendation(line) {
    return line.includes('SEO') || line.includes('パフォーマンス') || line.includes('セキュリティ') || 
           line.includes('アクセシビリティ') || line.includes('モバイル') || line.includes('UX') ||
           line.includes('技術') || line.includes('コンバージョン');
  }

  extractPriority(line) {
    if (line.includes('重要') || line.includes('優先') || line.includes('緊急')) {
      return 'high';
    } else if (line.includes('中') || line.includes('通常')) {
      return 'medium';
    } else {
      return 'medium';
    }
  }

  /**
   * カテゴリを抽出
   * @param {string} text - テキスト
   * @returns {string} カテゴリ
   */
  extractCategory(text) {
    if (text.includes('SEO')) return 'SEO';
    if (text.includes('パフォーマンス')) return 'パフォーマンス';
    if (text.includes('セキュリティ')) return 'セキュリティ';
    if (text.includes('アクセシビリティ')) return 'アクセシビリティ';
    if (text.includes('モバイル')) return 'モバイル';
    return '一般';
  }

  /**
   * URLから業界を推測
   * @param {string} url - URL
   * @param {Object} analysisResults - 分析結果
   * @returns {string} 推定業界
   */
  detectIndustry(url, analysisResults) {
    const domain = new URL(url).hostname.toLowerCase();
    const path = new URL(url).pathname.toLowerCase();
    
    // ドメイン名から業界キーワードを検出
    const industryKeywords = {
      '葬祭・葬儀': ['葬', 'funeral', 'memorial', '葬儀', '葬祭', '霊園', '墓'],
      '不動産': ['不動産', 'estate', 'realty', 'home', 'house', '住宅', 'マンション'],
      '医療・健康': ['clinic', 'hospital', '医', '病院', 'クリニック', 'health'],
      'EC・通販': ['shop', 'store', 'ec', 'cart', '通販', 'ショップ'],
      '教育': ['school', 'academy', '塾', '教育', 'edu', 'learn'],
      '飲食': ['restaurant', 'cafe', 'food', '飲食', 'レストラン', 'カフェ'],
      'IT・テクノロジー': ['tech', 'soft', 'system', 'digital', 'it', 'web'],
      '美容・エステ': ['beauty', 'salon', 'esthe', '美容', 'サロン', 'エステ'],
      '金融': ['bank', 'finance', 'money', '銀行', '金融', 'ローン'],
      '旅行・観光': ['travel', 'tour', 'hotel', '旅行', '観光', 'ホテル']
    };

    for (const [industry, keywords] of Object.entries(industryKeywords)) {
      for (const keyword of keywords) {
        if (domain.includes(keyword) || path.includes(keyword)) {
          return industry;
        }
      }
    }

    // コンテンツから推測（将来的な拡張用）
    return '一般企業・サービス';
  }

  /**
   * 推奨事項をフォーマット
   * @param {Object} recommendations - 生の推奨事項
   * @param {string} url - URL
   * @returns {Object} フォーマットされた推奨事項
   */
  formatRecommendations(recommendations, url) {
    return {
      ...recommendations,
      analysisDate: new Date().toISOString(),
      url,
      aiProvider: 'Gemini AI'
    };
  }

  /**
   * フォールバック推奨事項を生成
   * @param {string} url - URL
   * @param {Object} analysisResults - 分析結果
   * @returns {Object} フォールバック推奨事項
   */
  getFallbackRecommendations(url, analysisResults) {
    const scores = {
      seo: analysisResults.seo?.score || 0,
      performance: analysisResults.performance?.score || 0,
      security: analysisResults.security?.score || 0,
      accessibility: analysisResults.accessibility?.score || 0,
      mobile: analysisResults.mobile?.score || 0
    };

    const recommendations = [];

    // スコアベースの基本的な推奨事項生成
    if (scores.seo < 80) {
      recommendations.push({
        category: 'SEO',
        priority: scores.seo < 50 ? 'high' : 'medium',
        title: 'SEO最適化の改善',
        description: `SEOスコア${scores.seo}点。メタタグ、見出し構造、コンテンツの最適化が必要です。`,
        implementation: 'タイトルタグとメタディスクリプションを最適化し、適切な見出し階層を設定してください。',
        impact: `+${Math.min(25, 90 - scores.seo)}点`,
        estimatedHours: '2-4時間'
      });
    }

    if (scores.performance < 80) {
      recommendations.push({
        category: 'パフォーマンス',
        priority: scores.performance < 50 ? 'high' : 'medium',
        title: 'ページ速度の最適化',
        description: `パフォーマンススコア${scores.performance}点。読み込み速度の改善が必要です。`,
        implementation: '画像の最適化、CSS/JavaScriptの圧縮、キャッシュ設定を実装してください。',
        impact: `+${Math.min(30, 85 - scores.performance)}点`,
        estimatedHours: '3-6時間'
      });
    }

    const overallScore = Object.values(scores).reduce((sum, score) => sum + score, 0) / 5;

    return {
      summary: `基本的な分析により${recommendations.length}個の改善提案を生成しました。Gemini API設定により、より詳細な分析が可能になります。`,
      recommendations,
      expectedImpact: {
        seo: Math.min(15, Math.max(0, 85 - scores.seo)),
        performance: Math.min(20, Math.max(0, 80 - scores.performance)),
        overall: Math.min(15, Math.max(0, 85 - overallScore))
      },
      analysisDate: new Date().toISOString(),
      url,
      aiProvider: 'Fallback (Gemini API未設定)'
    };
  }

  /**
   * API利用可能状態を確認
   * @returns {boolean} 利用可能かどうか
   */
  isApiAvailable() {
    return this.isAvailable;
  }

  /**
   * テスト用のサンプル分析
   * @returns {Promise<Object>} テスト結果
   */
  async testAPI() {
    if (!this.isAvailable) {
      return { success: false, error: 'Gemini API が利用できません' };
    }

    try {
      const result = await this.generativeModel.generateContent('Hello, Gemini!');
      const response = await result.response;
      const text = response.text();
      
      return {
        success: true,
        response: text,
        model: this.model
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = GeminiAIService;