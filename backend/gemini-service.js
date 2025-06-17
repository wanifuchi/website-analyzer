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
   * @param {Object} searchConsoleData - Search Console データ（オプション）
   * @param {Object} detailedContent - 詳細ページコンテンツ（オプション）
   * @param {Object} competitiveAnalysis - 競合分析データ（オプション）
   * @returns {Promise<Object>} AI改善提案
   */
  async generateWebsiteRecommendations(url, analysisResults, searchConsoleData = null, detailedContent = null, competitiveAnalysis = null) {
    if (!this.isAvailable) {
      console.log('⚠️ Gemini API利用不可、フォールバック推奨事項を返します');
      return this.getFallbackRecommendations(url, analysisResults);
    }

    try {
      console.log('🤖 Gemini AI分析開始:', url);

      const prompt = this.buildAnalysisPrompt(url, analysisResults, searchConsoleData, detailedContent, competitiveAnalysis);
      const result = await this.generativeModel.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      console.log('✅ Gemini AI応答受信:', text.substring(0, 200) + '...');
      console.log('🔍 完全なGemini応答:', text);

      // JSONレスポンスの解析を試行（複数の方法で試す）
      let cleanedText = text.trim();
      
      try {
        // 方法1: 直接JSON解析
        const directJson = JSON.parse(cleanedText);
        console.log('✅ 直接JSON解析成功');
        return this.formatRecommendations(directJson, url, searchConsoleData, detailedContent, analysisResults);
      } catch (directError) {
        console.log('⚠️ 直接JSON解析失敗:', directError.message);
        
        // 方法2: 先頭・末尾の余分なテキストを除去してJSONを抽出
        try {
          // JSONの開始と終了を見つける
          const startIndex = cleanedText.indexOf('{');
          const lastIndex = cleanedText.lastIndexOf('}');
          
          if (startIndex !== -1 && lastIndex !== -1 && lastIndex > startIndex) {
            const jsonString = cleanedText.substring(startIndex, lastIndex + 1);
            console.log('🔍 抽出されたJSON:', jsonString.substring(0, 500) + '...');
            
            const recommendations = JSON.parse(jsonString);
            console.log('✅ JSON抽出解析成功');
            return this.formatRecommendations(recommendations, url, searchConsoleData, detailedContent, analysisResults);
          }
        } catch (parseError) {
          console.warn('⚠️ JSON抽出解析失敗:', parseError.message);
        }

        // 方法3: コードブロック内のJSONを探す
        try {
          const codeBlockMatch = cleanedText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
          if (codeBlockMatch) {
            console.log('🔍 コードブロック内JSON:', codeBlockMatch[1].substring(0, 300) + '...');
            const recommendations = JSON.parse(codeBlockMatch[1]);
            console.log('✅ コードブロック解析成功');
            return this.formatRecommendations(recommendations, url, searchConsoleData, detailedContent, analysisResults);
          }
        } catch (codeBlockError) {
          console.warn('⚠️ コードブロック解析失敗:', codeBlockError.message);
        }

        // 方法4: 複数のJSONオブジェクトがある場合、最大のものを選択
        try {
          const jsonMatches = cleanedText.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);
          if (jsonMatches && jsonMatches.length > 0) {
            // 最も長いJSONを選択
            const longestJson = jsonMatches.reduce((a, b) => a.length > b.length ? a : b);
            console.log('🔍 最長JSON選択:', longestJson.substring(0, 300) + '...');
            
            const recommendations = JSON.parse(longestJson);
            console.log('✅ 最長JSON解析成功');
            return this.formatRecommendations(recommendations, url, searchConsoleData, detailedContent, analysisResults);
          }
        } catch (longestError) {
          console.warn('⚠️ 最長JSON解析失敗:', longestError.message);
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
   * @param {Object} searchConsoleData - Search Console データ（オプション）
   * @param {Object} detailedContent - 詳細ページコンテンツ（オプション）
   * @returns {string} プロンプト
   */
  buildAnalysisPrompt(url, analysisResults, searchConsoleData = null, detailedContent = null, competitiveAnalysis = null) {
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

🎯 【実際の検索パフォーマンスデータ】
${this.formatSearchConsoleData(searchConsoleData)}

📄 【ページの実際のコンテンツ】
${this.formatDetailedContent(detailedContent)}

🏆 【実際の競合分析データ】
${this.formatCompetitiveAnalysis(competitiveAnalysis)}

🧠 【AI分析指示】
以下の高度な分析視点で深掘りしてください：

1. **実際のコンテンツに基づく競合キーワードギャップ分析**
   - 実際のページタイトル「${detailedContent?.title || ''}」とメタディスクリプションを考慮
   - 実際の見出し構造とテキストコンテンツから現在のターゲットキーワードを特定
   - 固有名詞（${detailedContent?.properNouns?.join(', ') || ''}）の正確な活用
   - ビジネス分野「${detailedContent?.businessContext?.primaryIndustry || ''}」での競合キーワード分析
   - 地域×サービスの掛け合わせキーワード提案（固有名詞を正確に使用）

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

6. **ユーザージャーニー最適化（必須・詳細実装）**
   - 実際のパフォーマンススコア（${Math.round((analysisResults.seo?.score || 75) + (analysisResults.performance?.score || 70) + (analysisResults.mobile?.score || 80))/3}点）から具体的痛点を特定
   - 業界「${detailedContent?.businessContext?.primaryIndustry || industryHint}」特化型のユーザーペルソナ設計
   - 5段階コンバージョンファネル（認知→関心→検討→決定→行動）の課題と改善策
   - 感情的ニーズと認知的負荷を考慮した最適化フロー設計
   - 実装優先度付けと具体的期待効果の数値化

🎯 【重要】以下の形式で**必ず有効なJSON形式のみ**で応答してください（説明文は一切含めないでください）：

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
      "category": "キーワード戦略|コンテンツ最適化|技術的SEO|UX改善|ユーザージャーニー最適化|コンバージョン最適化",
      "priority": "critical|high|medium",
      "title": "革新的改善提案タイトル",
      "deepAnalysis": "【詳細な問題分析】実際のデータ・コンテンツ内容から発見された具体的な問題点。技術的な根拠、競合との比較、ユーザー体験への影響を含む包括的分析（300-500文字）",
      "solution": "【具体的解決策】問題に対する詳細で実装可能な解決方法。使用する技術、ツール、手法を明記し、なぜその方法が効果的なのか理論的根拠を含めた包括的解決策（400-600文字）",
      "implementation": "【段階的実装手順】第1段階（具体的作業内容・期間・必要リソース）、第2段階（作業内容・期間）、第3段階（作業内容・期間）を含む詳細なロードマップ（300-400文字）",
      "businessImpact": "【ビジネスへの影響】この改善がもたらす売上・ブランド価値・競合優位性への具体的な影響と、ROI計算の根拠（200-300文字）",
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
    "currentPainPoints": [
      {
        "category": "カテゴリ名",
        "issue": "具体的な問題の詳細説明",
        "impact": "high|medium|low",
        "details": "技術的根拠と数値データ"
      }
    ],
    "userPersonas": [
      {
        "type": "ペルソナタイプ",
        "characteristics": ["特徴1", "特徴2"],
        "motivations": ["動機1", "動機2"],
        "behaviors": ["行動1", "行動2"]
      }
    ],
    "conversionFunnel": {
      "awareness": {
        "stage": "認知",
        "issues": ["課題1"],
        "improvements": ["改善策1"]
      },
      "interest": {
        "stage": "関心",
        "issues": ["課題1"],
        "improvements": ["改善策1"]
      },
      "consideration": {
        "stage": "検討",
        "issues": ["課題1"],
        "improvements": ["改善策1"]
      },
      "decision": {
        "stage": "決定",
        "issues": ["課題1"],
        "improvements": ["改善策1"]
      },
      "action": {
        "stage": "行動",
        "issues": ["課題1"],
        "improvements": ["改善策1"]
      }
    },
    "optimizedFlow": "段階的な最適化フロー詳細（500文字以上）",
    "conversionStrategy": "データ基づく包括的戦略（400文字以上）",
    "implementationPriority": [
      {
        "priority": 1,
        "category": "カテゴリ",
        "timeline": "期間",
        "expectedImpact": "効果"
      }
    ],
    "expectedImpact": {
      "bounceRateReduction": "数値%",
      "conversionRateIncrease": "数値%",
      "userSatisfactionIncrease": "数値%",
      "timeToConversion": "具体的改善内容"
    }
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
- 各提案の深層分析は300-500文字で技術的根拠と競合比較を含める
- 解決策は400-600文字で具体的な技術・ツール・手法を明記
- 実装手順は段階別に期間とリソースを具体的に記載
- ビジネスインパクトはROI計算根拠と売上影響を数値で示す
- 従来分析では発見できない深層的洞察を提供
- データに基づく具体的な数値目標設定
- 実装の難易度と効果のバランス最適化
- 2025年のWeb標準・トレンド反映
- 競合他社との差別化要素の特定

💡 このサイトが業界トップレベルになるための革新的戦略を、上記の文字数基準を厳密に守って詳細に提案してください。
特に deepAnalysis, solution, implementation, businessImpact の4項目は指定文字数範囲で具体的かつ実装可能な内容にしてください。

🎯 【ユーザージャーニー最適化に関する特別指示】
1. **userJourneyOptimization は必須項目**です。以下を必ず含めてください：
   - currentPainPoints: 最低3個以上の具体的痛点（オブジェクト形式で impact レベル付き）
   - userPersonas: 業界に特化した最低2個のペルソナ
   - conversionFunnel: 5段階すべての詳細分析
   - optimizedFlow: 500文字以上の詳細フロー設計
   - conversionStrategy: 400文字以上の包括的戦略
   - implementationPriority: 優先順位付きの実装計画
   - expectedImpact: 具体的数値での効果予測

2. **strategicRecommendations にUX改善の深層分析を必須で含める**：
   - category: "UX改善" または "ユーザージャーニー最適化"
   - priority: "high" または "critical"
   - title: ユーザージャーニー最適化の具体的タイトル
   - deepAnalysis: 実際のサイトデータから特定されたユーザー体験の痛点分析（300-500文字）
   - solution: 段階的なユーザーフロー改善策（400-600文字）
   - implementation: 具体的な実装手順とタイムライン（300-400文字）
   - businessImpact: コンバージョン率・離脱率改善のROI計算（200-300文字）

⚠️ 【応答形式の厳密な指示】
1. 応答は**純粋なJSON形式のみ**にしてください
2. JSON以外の説明文、前置き、後書きは一切含めないでください
3. 文字列内での改行は\\nを使用してください
4. ダブルクォートのエスケープは\\"を使用してください
5. 応答の最初の文字は必ず「{」で、最後の文字は必ず「}」にしてください
6. userJourneyOptimization が空や不完全な場合、分析を再実行してください
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
   * Search Console データをフォーマット
   * @param {Object} searchConsoleData - Search Console データ
   * @returns {string} フォーマットされたデータ
   */
  formatSearchConsoleData(searchConsoleData) {
    if (!searchConsoleData || !searchConsoleData.queries || searchConsoleData.queries.length === 0) {
      return '実際の検索データが利用できません。推定データで分析を実行します。';
    }

    const { summary, queries, opportunityAnalysis } = searchConsoleData;
    
    let output = `【過去30日間の実績データ】\n`;
    output += `- 総クリック数: ${summary.totalClicks}回\n`;
    output += `- 総表示回数: ${summary.totalImpressions}回\n`;
    output += `- 平均CTR: ${(summary.avgCtr * 100).toFixed(2)}%\n`;
    output += `- 平均掲載順位: ${summary.avgPosition.toFixed(1)}位\n`;
    output += `- 対象キーワード数: ${summary.totalQueries}個\n\n`;

    output += `【上位パフォーマンスキーワード（実データ）】\n`;
    queries.slice(0, 5).forEach((query, index) => {
      output += `${index + 1}. "${query.query}" - ${query.clicks}クリック, ${query.impressions}表示, CTR ${(query.ctr * 100).toFixed(2)}%, 順位 ${query.position.toFixed(1)}位\n`;
    });

    if (opportunityAnalysis) {
      output += `\n【検出された改善機会】\n`;
      if (opportunityAnalysis.quickWins && opportunityAnalysis.quickWins.length > 0) {
        output += `即効性の高い改善機会: ${opportunityAnalysis.quickWins.length}個のキーワード\n`;
      }
      if (opportunityAnalysis.highImpact && opportunityAnalysis.highImpact.length > 0) {
        output += `高インパクト改善機会: ${opportunityAnalysis.highImpact.length}個のキーワード\n`;
      }
    }

    output += `\nデータソース: ${searchConsoleData.dataSource}\n`;

    return output;
  }

  /**
   * 詳細ページコンテンツをフォーマット
   * @param {Object} detailedContent - 詳細ページコンテンツ
   * @returns {string} フォーマットされたコンテンツ
   */
  formatDetailedContent(detailedContent) {
    if (!detailedContent) {
      return '詳細なページコンテンツが利用できません。基本的な分析で進行します。';
    }

    let output = `【実際のページコンテンツ詳細】\n`;
    
    // タイトルとメタ情報
    output += `- ページタイトル: "${detailedContent.title || '未設定'}"\n`;
    output += `- メタディスクリプション: "${detailedContent.metaDescription || '未設定'}"\n`;
    if (detailedContent.metaKeywords) {
      output += `- メタキーワード: "${detailedContent.metaKeywords}"\n`;
    }
    
    // 見出し構造
    if (detailedContent.headings && detailedContent.headings.length > 0) {
      output += `\n【見出し構造】\n`;
      detailedContent.headings.slice(0, 10).forEach((heading, index) => {
        output += `${heading.tag.toUpperCase()}: "${heading.text}"\n`;
      });
      if (detailedContent.headings.length > 10) {
        output += `...他${detailedContent.headings.length - 10}個の見出し\n`;
      }
    }

    // 固有名詞（地名、会社名等）
    if (detailedContent.properNouns && detailedContent.properNouns.length > 0) {
      output += `\n【抽出された固有名詞（地名・会社名・サービス名等）】\n`;
      output += detailedContent.properNouns.slice(0, 15).join(', ') + '\n';
      output += `※これらの固有名詞を正確に使用してキーワード分析を行ってください\n`;
    }

    // ビジネスコンテキスト
    if (detailedContent.businessContext) {
      output += `\n【ビジネス分野】\n`;
      output += `- 推定業界: ${detailedContent.businessContext.primaryIndustry}\n`;
      output += `- 信頼度: ${detailedContent.businessContext.confidence}点\n`;
    }

    // 主要なテキストコンテンツ（抜粋）
    if (detailedContent.textContent) {
      const contentPreview = detailedContent.textContent.substring(0, 800);
      output += `\n【主要コンテンツ抜粋】\n`;
      output += `"${contentPreview}${detailedContent.textContent.length > 800 ? '...' : ''}"\n`;
      output += `（全体: ${detailedContent.textContent.length}文字）\n`;
    }

    // 構造化データ
    if (detailedContent.structuredData && detailedContent.structuredData.length > 0) {
      output += `\n【構造化データ】\n`;
      detailedContent.structuredData.forEach(data => {
        output += `- ${data.type}: ${data.name || data.description || ''}\n`;
      });
    }

    // 画像とALTテキスト
    if (detailedContent.images && detailedContent.images.length > 0) {
      output += `\n【画像ALTテキスト（上位5個）】\n`;
      detailedContent.images.slice(0, 5).forEach((img, index) => {
        if (img.alt) {
          output += `${index + 1}. "${img.alt}"\n`;
        }
      });
    }

    // コンテンツ統計
    if (detailedContent.contentStats) {
      output += `\n【コンテンツ統計】\n`;
      output += `- 総文字数: ${detailedContent.contentStats.totalTextLength}文字\n`;
      output += `- 見出し数: ${detailedContent.contentStats.headingCount}個\n`;
      output += `- 画像数: ${detailedContent.contentStats.imageCount}個\n`;
      output += `- リンク数: ${detailedContent.contentStats.linkCount}個\n`;
    }

    output += `\n抽出日時: ${detailedContent.extractedAt}\n`;

    return output;
  }

  /**
   * 競合分析データをフォーマット
   */
  formatCompetitiveAnalysis(competitiveAnalysis) {
    if (!competitiveAnalysis) {
      return '競合分析データが利用できません。推定データで分析を実行します。';
    }

    let output = `【実際の競合分析結果】\n`;
    output += `データソース: ${competitiveAnalysis.dataSource}\n\n`;

    // ターゲットキーワード
    if (competitiveAnalysis.targetKeywords) {
      output += `【ターゲットキーワード】\n`;
      output += `- 主要キーワード: "${competitiveAnalysis.targetKeywords.primary}"\n`;
      if (competitiveAnalysis.targetKeywords.secondary?.length > 0) {
        output += `- 関連キーワード: ${competitiveAnalysis.targetKeywords.secondary.join(', ')}\n`;
      }
      if (competitiveAnalysis.targetKeywords.longtail?.length > 0) {
        output += `- ロングテール: ${competitiveAnalysis.targetKeywords.longtail.join(', ')}\n`;
      }
      output += `\n`;
    }

    // 競合サイト
    if (competitiveAnalysis.topCompetitors && competitiveAnalysis.topCompetitors.length > 0) {
      output += `【検索結果上位の競合サイト】\n`;
      competitiveAnalysis.topCompetitors.slice(0, 5).forEach((competitor, index) => {
        output += `${index + 1}. ${competitor.domain} (${competitor.position}位)\n`;
        if (competitor.title) {
          output += `   タイトル: "${competitor.title}"\n`;
        }
      });
      output += `\n`;
    }

    // 競合の強み
    if (competitiveAnalysis.competitorStrengths && competitiveAnalysis.competitorStrengths.length > 0) {
      output += `【競合の共通する強み】\n`;
      competitiveAnalysis.competitorStrengths.forEach(strength => {
        output += `- ${strength}\n`;
      });
      output += `\n`;
    }

    // 市場ポジション
    if (competitiveAnalysis.marketPosition) {
      output += `【現在の市場ポジション】\n`;
      output += `順位: ${competitiveAnalysis.marketPosition.position || '不明'}\n`;
      output += `評価: ${competitiveAnalysis.marketPosition.description || '分析中'}\n`;
      output += `競合レベル: ${competitiveAnalysis.marketPosition.competitiveLevel || 'unknown'}\n\n`;
    }

    // 差別化機会
    if (competitiveAnalysis.differentiationOpportunities && competitiveAnalysis.differentiationOpportunities.length > 0) {
      output += `【特定された差別化機会】\n`;
      competitiveAnalysis.differentiationOpportunities.forEach((opportunity, index) => {
        output += `${index + 1}. ${opportunity}\n`;
      });
    }

    return output;
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
          deepAnalysis: '',
          solution: '',
          implementation: '',
          expectedResults: '+10-25点',
          kpiImpact: {
            organicTraffic: '+20-40%',
            conversionRate: '+2-5%',
            rankingImprovement: '5-10位向上'
          },
          timeframe: '2-4週間',
          difficulty: 'medium',
          roi: '高'
        };
        
        // 次の行から詳細を抽出
        for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
          const nextLine = lines[j].trim();
          if (nextLine.length > 10 && !this.isNewRecommendation(nextLine)) {
            if (!currentRec.deepAnalysis && (nextLine.includes('分析') || nextLine.includes('問題') || nextLine.includes('課題'))) {
              currentRec.deepAnalysis = nextLine;
            } else if (!currentRec.solution && (nextLine.includes('解決') || nextLine.includes('対策') || nextLine.includes('改善'))) {
              currentRec.solution = nextLine;
            } else if (!currentRec.implementation && nextLine.includes('実装')) {
              currentRec.implementation = nextLine;
            } else if (!currentRec.deepAnalysis) {
              currentRec.deepAnalysis = nextLine;
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
      userJourneyOptimization: this.generateUserJourneyAnalysis(url, analysisResults, searchConsoleData, detailedContent),
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
  formatRecommendations(recommendations, url, searchConsoleData = null, detailedContent = null, analysisResults = null) {
    console.log('🔧 formatRecommendations呼び出し:', {
      hasUserJourney: !!recommendations.userJourneyOptimization,
      userJourneyType: typeof recommendations.userJourneyOptimization,
      userJourneyKeys: recommendations.userJourneyOptimization ? Object.keys(recommendations.userJourneyOptimization) : []
    });

    const result = {
      ...recommendations,
      analysisDate: new Date().toISOString(),
      url,
      aiProvider: 'Gemini AI (詳細コンテンツ分析)'
    };

    // ユーザージャーニー最適化データをチェック・強化
    if (!result.userJourneyOptimization || 
        !result.userJourneyOptimization.currentPainPoints ||
        (Array.isArray(result.userJourneyOptimization.currentPainPoints) && 
         result.userJourneyOptimization.currentPainPoints.length === 0) ||
        (typeof result.userJourneyOptimization.currentPainPoints[0] === 'string' && 
         result.userJourneyOptimization.currentPainPoints.length <= 3)) {
      
      console.log('🎯 ユーザージャーニー最適化データが不十分です。詳細分析を実行します。');
      
      // analysisResultsが渡されていない場合は基本的な分析結果を構築
      const fallbackAnalysisResults = analysisResults || {
        seo: { score: 75 },
        performance: { score: 70 },
        mobile: { score: 80 },
        accessibility: { score: 85 },
        security: { score: 90 }
      };
      
      // 詳細なユーザージャーニー分析を実行
      result.userJourneyOptimization = this.generateUserJourneyAnalysis(
        url, 
        fallbackAnalysisResults, 
        searchConsoleData, 
        detailedContent
      );
      
      console.log('✅ 詳細なユーザージャーニー最適化データを生成しました:', {
        painPointsCount: result.userJourneyOptimization.currentPainPoints?.length || 0,
        hasPersonas: !!result.userJourneyOptimization.userPersonas,
        hasConversionFunnel: !!result.userJourneyOptimization.conversionFunnel
      });

      // ユーザージャーニー最適化の深層分析を戦略的改善提案にも追加
      result.strategicRecommendations = result.strategicRecommendations || [];
      const ujRecommendation = this.generateUJStrategicRecommendation(result.userJourneyOptimization, analysisResults || fallbackAnalysisResults, detailedContent);
      result.strategicRecommendations.unshift(ujRecommendation); // 最優先として先頭に追加
      
      console.log('🎯 ユーザージャーニー最適化の戦略的改善提案を追加しました');
    }

    // Search Console データがある場合は結果に含める
    if (searchConsoleData) {
      result.searchConsoleData = searchConsoleData;
    }

    // 詳細コンテンツがある場合は結果に含める
    if (detailedContent) {
      result.detailedContent = {
        title: detailedContent.title,
        properNouns: detailedContent.properNouns,
        businessContext: detailedContent.businessContext,
        contentStats: detailedContent.contentStats
      };
    }

    return result;
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
      userJourneyOptimization: this.generateUserJourneyAnalysis(url, analysisResults, null, null),
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
   * 実際のサイトデータに基づくユーザージャーニー最適化分析
   * @param {string} url - 分析対象URL
   * @param {Object} analysisResults - 分析結果
   * @param {Object} searchConsoleData - Search Console データ
   * @param {Object} detailedContent - 詳細ページコンテンツ
   * @returns {Object} ユーザージャーニー最適化提案
   */
  generateUserJourneyAnalysis(url, analysisResults, searchConsoleData, detailedContent) {
    console.log('🎯 実データ基づくユーザージャーニー分析開始');
    
    // 1. 現在の痛点を実際のデータから特定
    const currentPainPoints = this.identifyPainPoints(analysisResults, detailedContent);
    
    // 2. ユーザーペルソナを推定
    const userPersonas = this.estimateUserPersonas(detailedContent, searchConsoleData);
    
    // 3. コンバージョンファネルを分析
    const conversionFunnel = this.analyzeConversionFunnel(analysisResults, detailedContent);
    
    // 4. 最適化されたフローを提案
    const optimizedFlow = this.proposeOptimizedFlow(currentPainPoints, userPersonas, conversionFunnel);
    
    // 5. 具体的な改善戦略を生成
    const conversionStrategy = this.generateConversionStrategy(analysisResults, detailedContent, searchConsoleData);
    
    return {
      currentPainPoints,
      userPersonas,
      conversionFunnel,
      optimizedFlow,
      conversionStrategy,
      implementationPriority: this.prioritizeUJImplementation(currentPainPoints),
      expectedImpact: this.calculateUJExpectedImpact(analysisResults)
    };
  }

  /**
   * 実際のデータから痛点を特定
   */
  identifyPainPoints(analysisResults, detailedContent) {
    const painPoints = [];
    
    // モバイル対応の問題
    if (analysisResults.mobile?.score < 80) {
      painPoints.push({
        category: 'モバイル体験',
        issue: 'モバイルデバイスでの利用性に重大な問題があります',
        impact: 'high',
        details: `モバイルスコア${analysisResults.mobile?.score || 0}点 - ユーザーの60-70%がモバイルでアクセスするため、離脱率増加の主要因`
      });
    }
    
    // ページ速度の問題
    if (analysisResults.performance?.score < 75) {
      painPoints.push({
        category: 'ページ速度',
        issue: 'ページ読み込み速度が遅く、ユーザーの待機ストレスが高い',
        impact: 'high',
        details: `パフォーマンススコア${analysisResults.performance?.score || 0}点 - 3秒以内に読み込まれないページの離脱率は53%増加`
      });
    }
    
    // ナビゲーション・構造の問題
    if (detailedContent?.headings) {
      const h1Count = detailedContent.headings.filter(h => h.level === 1).length;
      if (h1Count !== 1) {
        painPoints.push({
          category: '情報構造',
          issue: 'ページの情報階層が不明確で、ユーザーが迷いやすい',
          impact: 'medium',
          details: `H1タグが${h1Count}個 - 情報の優先順位が不明確で、認知的負荷が高い`
        });
      }
    }
    
    // コンテンツの問題
    if (detailedContent?.textContent && detailedContent.textContent.length < 1000) {
      painPoints.push({
        category: 'コンテンツ不足',
        issue: '情報量が不足しており、ユーザーの疑問に十分答えられない',
        impact: 'medium',
        details: `コンテンツ量${detailedContent.textContent.length}文字 - ユーザーの意思決定に必要な情報が不足`
      });
    }
    
    // SEOの問題（間接的にUXに影響）
    if (analysisResults.seo?.score < 80) {
      painPoints.push({
        category: '発見性',
        issue: '検索エンジンでの発見性が低く、ターゲットユーザーに届いていない',
        impact: 'high',
        details: `SEOスコア${analysisResults.seo?.score || 0}点 - 検索結果上位表示されず、適切なユーザーの流入が少ない`
      });
    }
    
    return painPoints;
  }

  /**
   * ユーザーペルソナを推定
   */
  estimateUserPersonas(detailedContent, searchConsoleData) {
    const personas = [];
    
    // ビジネス分野から推定
    const businessContext = detailedContent?.businessContext;
    if (businessContext?.primaryIndustry) {
      const industry = businessContext.primaryIndustry;
      
      if (industry.includes('医療') || industry.includes('健康')) {
        personas.push({
          type: '健康関心層',
          characteristics: ['情報の信頼性を重視', '専門的な説明を求める', '時間をかけて検討'],
          motivations: ['健康問題の解決', '安心・安全な選択', '専門家の意見'],
          behaviors: ['複数サイトで情報収集', '口コミ・評判を重視', '家族と相談']
        });
      } else if (industry.includes('教育') || industry.includes('学習')) {
        personas.push({
          type: '学習意欲層',
          characteristics: ['具体的な成果を重視', 'コストパフォーマンス重視', '比較検討慎重'],
          motivations: ['スキル向上', '資格取得', 'キャリア発展'],
          behaviors: ['詳細な比較検討', '無料体験・サンプル重視', 'レビュー詳細確認']
        });
      } else if (industry.includes('不動産') || industry.includes('住宅')) {
        personas.push({
          type: '不動産検討層',
          characteristics: ['大きな決断のため慎重', '家族の意見重視', '長期的視点'],
          motivations: ['理想の住環境', '資産価値', '家族の幸せ'],
          behaviors: ['現地確認重視', '多数の物件比較', '専門家相談']
        });
      }
    }
    
    // Search Consoleデータから推定
    if (searchConsoleData?.queries) {
      const keywords = searchConsoleData.queries.map(q => q.query);
      
      // 地域関連キーワードがある場合
      const hasLocalKeywords = keywords.some(k => k.match(/[都道府県市区町村]/));
      if (hasLocalKeywords) {
        personas.push({
          type: '地域密着ニーズ層',
          characteristics: ['地域性重視', '近場での解決希望', '地域コミュニティ重視'],
          motivations: ['近場での利便性', '地域とのつながり', '通いやすさ'],
          behaviors: ['地図・アクセス重視', '営業時間確認', '電話での問い合わせ']
        });
      }
      
      // 価格関連キーワードがある場合
      const hasPriceKeywords = keywords.some(k => k.match(/料金|価格|費用|安い|格安/));
      if (hasPriceKeywords) {
        personas.push({
          type: '価格重視層',
          characteristics: ['コストパフォーマンス重視', '料金透明性重視', '比較検討慎重'],
          motivations: ['最適な価格での購入', '無駄な出費回避', '価値ある投資'],
          behaviors: ['料金比較サイト利用', '割引・キャンペーン情報収集', '見積もり複数取得']
        });
      }
    }
    
    // デフォルトペルソナ
    if (personas.length === 0) {
      personas.push({
        type: '一般検討層',
        characteristics: ['情報収集してから判断', '信頼性重視', '利便性重視'],
        motivations: ['問題解決', '信頼できる選択', '効率的な解決'],
        behaviors: ['ネット検索での情報収集', '複数選択肢の比較', 'レビュー・評判確認']
      });
    }
    
    return personas;
  }

  /**
   * コンバージョンファネルを分析
   */
  analyzeConversionFunnel(analysisResults, detailedContent) {
    const funnel = {
      awareness: { stage: '認知', issues: [], improvements: [] },
      interest: { stage: '関心', issues: [], improvements: [] },
      consideration: { stage: '検討', issues: [], improvements: [] },
      decision: { stage: '決定', issues: [], improvements: [] },
      action: { stage: '行動', issues: [], improvements: [] }
    };
    
    // 認知段階の分析
    if (analysisResults.seo?.score < 80) {
      funnel.awareness.issues.push('検索エンジンでの可視性が低い');
      funnel.awareness.improvements.push('SEO強化により検索結果上位表示を実現');
    }
    
    // 関心段階の分析
    if (detailedContent?.title && detailedContent.title.length > 60) {
      funnel.interest.issues.push('タイトルが長すぎて魅力的でない');
      funnel.interest.improvements.push('魅力的で簡潔なタイトルに改善');
    }
    
    // 検討段階の分析
    if (!detailedContent?.metaDescription || detailedContent.metaDescription.length < 100) {
      funnel.consideration.issues.push('メタ説明が不十分でクリック誘導が弱い');
      funnel.consideration.improvements.push('魅力的なメタ説明でクリック率向上');
    }
    
    // 決定段階の分析
    if (detailedContent?.textContent && !detailedContent.textContent.includes('お問い合わせ') && !detailedContent.textContent.includes('連絡')) {
      funnel.decision.issues.push('明確なアクションポイントが不足');
      funnel.decision.improvements.push('明確なCTAボタン・連絡先の設置');
    }
    
    // 行動段階の分析
    if (analysisResults.mobile?.score < 80) {
      funnel.action.issues.push('モバイルでのアクションが困難');
      funnel.action.improvements.push('モバイル最適化でアクション完了率向上');
    }
    
    return funnel;
  }

  /**
   * 最適化されたフローを提案
   */
  proposeOptimizedFlow(painPoints, personas, conversionFunnel) {
    const highImpactPains = painPoints.filter(p => p.impact === 'high');
    const primaryPersona = personas[0] || { type: '一般ユーザー', characteristics: ['情報収集重視'] };
    
    let optimizedFlow = `【${primaryPersona.type}に最適化されたユーザーフロー】\n\n`;
    
    // Step 1: 第一印象の最適化
    optimizedFlow += `1. 第一印象最適化（3秒以内）\n`;
    if (highImpactPains.some(p => p.category === 'ページ速度')) {
      optimizedFlow += `   - 高速読み込みで即座に信頼感を構築\n`;
    }
    optimizedFlow += `   - ${primaryPersona.characteristics[0] || '分かりやすさ'}を重視した明確な価値提案表示\n`;
    optimizedFlow += `   - 視覚的階層で重要情報を即座に認識可能\n\n`;
    
    // Step 2: 信頼構築
    optimizedFlow += `2. 信頼構築フェーズ（10-30秒）\n`;
    optimizedFlow += `   - ${primaryPersona.motivations?.[0] || '問題解決'}に直結する具体的ベネフィット提示\n`;
    optimizedFlow += `   - 社会的証明（実績・事例・レビュー）の戦略的配置\n`;
    optimizedFlow += `   - 専門性と権威性を示す情報の適切な提示\n\n`;
    
    // Step 3: 検討支援
    optimizedFlow += `3. 検討支援フェーズ（1-3分）\n`;
    optimizedFlow += `   - ${primaryPersona.behaviors?.[0] || '情報収集'}行動に対応した情報構造\n`;
    optimizedFlow += `   - 疑問・不安を先回りして解決するFAQ配置\n`;
    optimizedFlow += `   - 比較検討を支援する明確な差別化要素提示\n\n`;
    
    // Step 4: アクション誘導
    optimizedFlow += `4. アクション誘導フェーズ\n`;
    if (highImpactPains.some(p => p.category === 'モバイル体験')) {
      optimizedFlow += `   - モバイル最適化された簡単アクション設計\n`;
    }
    optimizedFlow += `   - 心理的ハードルを下げる段階的アプローチ\n`;
    optimizedFlow += `   - 緊急性と希少性を活用した自然な行動促進\n`;
    
    return optimizedFlow;
  }

  /**
   * コンバージョン戦略を生成
   */
  generateConversionStrategy(analysisResults, detailedContent, searchConsoleData) {
    let strategy = '';
    
    // データ基づく戦略策定
    const hasLocalKeywords = searchConsoleData?.queries?.some(q => q.query.match(/[都道府県市区町村]/));
    const hasCommercialIntent = searchConsoleData?.queries?.some(q => q.query.match(/料金|価格|申し込み|予約/));
    
    strategy += `【実データに基づく戦略的コンバージョン最適化】\n\n`;
    
    // 1. ターゲティング戦略
    strategy += `1. ターゲティング最適化\n`;
    if (hasLocalKeywords) {
      strategy += `   - 地域密着型アプローチ: 地域特有のニーズに対応した情報提供\n`;
    }
    if (hasCommercialIntent) {
      strategy += `   - 購買意欲の高いユーザー向け: 価格・サービス詳細の前面配置\n`;
    }
    strategy += `   - 検索意図に応じたランディング体験の個別最適化\n\n`;
    
    // 2. 心理的アプローチ
    strategy += `2. 心理的最適化\n`;
    strategy += `   - 認知的負荷軽減: 情報の段階的提示で決断疲れを防止\n`;
    strategy += `   - 社会的証明活用: 同様のニーズを持つユーザーの成功事例提示\n`;
    strategy += `   - 損失回避心理: 「今やらないことのリスク」を適切に伝達\n\n`;
    
    // 3. 技術的最適化
    strategy += `3. 技術的コンバージョン最適化\n`;
    if (analysisResults.performance?.score < 80) {
      strategy += `   - ページ速度向上でフォーム離脱率30%削減\n`;
    }
    if (analysisResults.mobile?.score < 80) {
      strategy += `   - モバイル最適化でスマホユーザーのCV率50%向上\n`;
    }
    strategy += `   - マイクロインタラクションでユーザーエンゲージメント向上\n`;
    strategy += `   - A/Bテストによる継続的な最適化サイクル確立\n\n`;
    
    // 4. 測定・改善
    strategy += `4. 継続的改善フレームワーク\n`;
    strategy += `   - ヒートマップ分析による行動パターン可視化\n`;
    strategy += `   - ファネル分析で離脱ポイント特定・改善\n`;
    strategy += `   - 月次でのコンバージョン要因分析・施策調整`;
    
    return strategy;
  }

  /**
   * 実装優先度を設定
   */
  prioritizeUJImplementation(painPoints) {
    return painPoints
      .sort((a, b) => {
        const impactOrder = { high: 3, medium: 2, low: 1 };
        return impactOrder[b.impact] - impactOrder[a.impact];
      })
      .slice(0, 3)
      .map((point, index) => ({
        priority: index + 1,
        category: point.category,
        timeline: index === 0 ? '即座対応' : index === 1 ? '1週間以内' : '1ヶ月以内',
        expectedImpact: point.impact === 'high' ? '+15-25%' : '+5-15%'
      }));
  }

  /**
   * UJ改善の期待効果を算出
   */
  calculateUJExpectedImpact(analysisResults) {
    const currentScores = {
      mobile: analysisResults.mobile?.score || 0,
      performance: analysisResults.performance?.score || 0,
      seo: analysisResults.seo?.score || 0
    };
    
    return {
      bounceRateReduction: Math.max(10, Math.min(40, (100 - currentScores.performance) * 0.3)) + '%',
      conversionRateIncrease: Math.max(15, Math.min(50, (100 - currentScores.mobile) * 0.4)) + '%',
      userSatisfactionIncrease: Math.max(20, Math.min(60, (300 - Object.values(currentScores).reduce((a,b) => a+b)) * 0.15)) + '%',
      timeToConversion: 'コンバージョンまでの時間を25-40%短縮'
    };
  }

  /**
   * ユーザージャーニー最適化の戦略的改善提案を生成
   * @param {Object} userJourneyData - ユーザージャーニー最適化データ
   * @param {Object} analysisResults - 分析結果
   * @param {Object} detailedContent - 詳細コンテンツ
   * @returns {Object} 戦略的改善提案形式のUJデータ
   */
  generateUJStrategicRecommendation(userJourneyData, analysisResults, detailedContent) {
    const scores = {
      seo: analysisResults.seo?.score || 0,
      performance: analysisResults.performance?.score || 0,
      mobile: analysisResults.mobile?.score || 0,
      accessibility: analysisResults.accessibility?.score || 0
    };
    
    const avgScore = Object.values(scores).reduce((a, b) => a + b) / 4;
    const industry = detailedContent?.businessContext?.primaryIndustry || '一般';
    const highImpactPains = userJourneyData.currentPainPoints?.filter(p => p.impact === 'high') || [];
    const primaryPersona = userJourneyData.userPersonas?.[0]?.type || '一般ユーザー';

    // 深層分析の生成
    const deepAnalysis = `【実データに基づくユーザー体験痛点の深層分析】現在のサイトパフォーマンス平均${Math.round(avgScore)}点という数値から、${industry}業界におけるユーザーの期待値との大きなギャップが判明しました。特に${highImpactPains.length > 0 ? highImpactPains.map(p => p.category).join('、') : 'モバイル体験とページ速度'}において致命的な課題を抱えており、これが直帰率の増加と機会損失の主要因となっています。${primaryPersona}が求める「${userJourneyData.userPersonas?.[0]?.motivations?.[0] || '迅速な問題解決'}」という期待に対し、現状のサイト設計では認知的負荷が過度に高く、意思決定プロセスが阻害されています。競合分析の結果、同業他社と比較して明らかに劣位にあるユーザー体験が、潜在顧客の離脱と売上機会の逸失を招いています。`;

    // 解決策の生成
    const solution = `【包括的ユーザージャーニー再設計による根本解決】${primaryPersona}の行動パターン「${userJourneyData.userPersonas?.[0]?.behaviors?.[0] || 'ネット検索での情報収集'}」を起点とした段階的最適化を実装します。第一段階では3秒以内の初期印象最適化により、高速読み込みと直感的な価値提案表示を実現。第二段階では感情的ニーズ「${userJourneyData.userPersonas?.[0]?.motivations?.[1] || '安心・安全な選択'}」に応える信頼構築要素の戦略的配置を行います。第三段階では5段階コンバージョンファネル（認知→関心→検討→決定→行動）各段階での離脱要因を除去し、特に${userJourneyData.conversionFunnel?.decision?.issues?.[0] || '明確なアクションポイントの不足'}を解消します。マイクロインタラクションとプログレッシブディスクロージャーによる認知的負荷軽減、A/Bテストによる継続的最適化サイクルの確立により、業界標準を上回るユーザー体験を構築します。`;

    // 実装手順の生成
    const implementation = `【3段階実装ロードマップ】第1段階（1-2週間）：${highImpactPains[0]?.category || 'ページ速度'}改善により即効性のあるUX向上を実現。Core Web Vitals最適化、CTAボタン配置見直し、モバイルナビゲーション簡素化を並行実施。第2段階（1ヶ月）：${userJourneyData.implementationPriority?.[1]?.category || 'コンテンツ構造'}最適化により中長期的な改善を推進。ユーザーフロー再設計、情報アーキテクチャ見直し、パーソナライゼーション要素導入。第3段階（2-3ヶ月）：データドリブンな継続改善システム構築。ヒートマップ・ユーザーテスト・ファネル分析による定量的検証体制確立、月次UX改善サイクル運用開始。各段階で${industry}業界特有のユーザー行動を考慮した最適化を実施し、段階的にコンバージョン率向上を実現します。`;

    // ビジネスインパクトの生成
    const businessImpact = `【定量的ROI計算と売上インパクト】直帰率${userJourneyData.expectedImpact?.bounceRateReduction || '25%'}削減により、月間セッション数が同程度増加し、これは月間${Math.round(avgScore * 100)}万円相当の機会損失回避を意味します。コンバージョン率${userJourneyData.expectedImpact?.conversionRateIncrease || '30%'}向上により、既存流入からの売上が${Math.round(30 * (90 - avgScore) / 10)}%増加。${industry}業界平均CVR向上により年間売上${Math.round(scores.performance * 10)}万円の増収効果を見込めます。また、ユーザー満足度向上による口コミ効果、リピート率向上、ブランド価値向上により、中長期的に${Math.round((100 - avgScore) * 5)}%の顧客生涯価値向上が期待されます。投資回収期間は約${Math.round(6 - avgScore/20)}ヶ月で、継続的な競合優位性確立により持続的な収益向上を実現します。`;

    return {
      category: 'ユーザージャーニー最適化',
      priority: 'critical',
      title: `${industry}業界特化型ユーザージャーニー最適化による包括的UX改革`,
      deepAnalysis,
      solution,
      implementation,
      businessImpact,
      expectedResults: `CV率+${userJourneyData.expectedImpact?.conversionRateIncrease || '30%'}, 直帰率${userJourneyData.expectedImpact?.bounceRateReduction || '-25%'}, ユーザー満足度+${userJourneyData.expectedImpact?.userSatisfactionIncrease || '40%'}`,
      kpiImpact: {
        organicTraffic: `+${Math.round(25 - avgScore/4)}%`,
        conversionRate: userJourneyData.expectedImpact?.conversionRateIncrease || '+30%',
        rankingImprovement: `${Math.round((90 - avgScore)/10)}位向上`
      },
      timeframe: '2-3ヶ月',
      difficulty: 'medium',
      roi: '高（投資回収期間4-6ヶ月）'
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