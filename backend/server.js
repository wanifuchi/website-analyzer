const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const { jsPDF } = require('jspdf');
require('dotenv').config();

// データベース接続
const database = require('./database');

const app = express();
const PORT = process.env.PORT || 3002;

// 分析結果を一時保存（データベース初期化前のフォールバック）
const analyses = new Map();

// データベース利用可能かチェック
let isDatabaseConnected = false;

// データベースまたはメモリから分析データを取得
async function getAnalysisData(analysisId) {
  if (isDatabaseConnected) {
    try {
      return await database.getAnalysis(analysisId);
    } catch (error) {
      console.error('Database get error:', error);
      return analyses.get(analysisId) || null;
    }
  }
  return analyses.get(analysisId) || null;
}

// データベースまたはメモリに分析データを保存
async function saveAnalysisData(analysisData) {
  if (isDatabaseConnected) {
    try {
      await database.saveAnalysis(analysisData);
    } catch (error) {
      console.error('Database save error:', error);
    }
  }
  
  // フォールバックとして常にメモリにも保存
  analyses.set(analysisData.id, analysisData);
}

// 分析履歴を取得
async function getAnalysisHistory(limit = 50, offset = 0, url = null) {
  if (isDatabaseConnected) {
    try {
      return await database.getAnalysisHistory(limit, offset, url);
    } catch (error) {
      console.error('Database history error:', error);
    }
  }
  
  // フォールバック: メモリから取得
  const analysesList = Array.from(analyses.values())
    .filter(analysis => !url || analysis.url.includes(url))
    .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))
    .slice(offset, offset + limit);
    
  return {
    analyses: analysesList,
    total: analysesList.length,
    limit,
    offset
  };
}

// 緊急修正: CORS をすべて許可
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  preflightContinue: false,
  optionsSuccessStatus: 200
}));
app.use(express.json());

// ヘルスチェック
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Website Analyzer API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    database: {
      connected: isDatabaseConnected,
      type: isDatabaseConnected ? 'PostgreSQL' : 'In-memory'
    }
  });
});

// 分析開始
app.post('/api/analysis/start', async (req, res) => {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({
      success: false,
      error: 'URLは必須です'
    });
  }

  // URLバリデーション
  try {
    new URL(url);
  } catch {
    return res.status(400).json({
      success: false,
      error: '有効なURLを入力してください'
    });
  }

  const analysisId = `analysis-${Date.now()}`;
  const startedAt = new Date().toISOString();
  
  // 分析データを初期化
  const initialAnalysis = {
    id: analysisId,
    url: url,
    status: 'processing',
    startedAt: startedAt,
    results: null
  };
  
  await saveAnalysisData(initialAnalysis);
  
  // バックグラウンドで分析を実行
  performAnalysis(analysisId, url).catch(async error => {
    console.error(`Analysis failed for ${analysisId}:`, error);
    
    // エラーの種類に応じて部分的な結果を提供
    let partialResults = null;
    if (error.message.includes('timeout') || error.message.includes('Navigation timeout')) {
      partialResults = {
        overall: { score: 0, grade: 'F' },
        seo: { score: 0, issues: [{ type: 'error', message: 'サイトにアクセスできないため分析できませんでした' }] },
        performance: { score: 0, loadTime: null, firstContentfulPaint: null },
        security: { score: 0, httpsUsage: url.startsWith('https://'), issues: [{ type: 'error', message: 'タイムアウトのため詳細分析ができませんでした' }] },
        accessibility: { score: 0, wcagLevel: 'Unknown', violations: null },
        mobile: { score: 0, isResponsive: null, hasViewportMeta: null }
      };
    }
    
    const failedAnalysis = {
      id: analysisId,
      url: url,
      status: 'failed',
      startedAt: startedAt,
      error: error.message,
      results: partialResults,
      completedAt: new Date().toISOString()
    };
    
    await saveAnalysisData(failedAnalysis);
  });
  
  res.status(201).json({
    success: true,
    data: {
      id: analysisId,
      url: url,
      status: 'processing',
      startedAt: startedAt
    }
  });
});

// 分析履歴（個別IDルートより前に配置）
app.get('/api/analysis/history', async (req, res) => {
  try {
    const { page = 1, limit = 20, url = null } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const history = await getAnalysisHistory(parseInt(limit), offset, url);
    
    res.json({
      success: true,
      data: {
        analyses: history.analyses,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: history.total,
          totalPages: Math.ceil(history.total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('History fetch error:', error);
    res.status(500).json({
      success: false,
      error: '履歴の取得に失敗しました'
    });
  }
});

// 分析結果取得
app.get('/api/analysis/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const analysis = await getAnalysisData(id);
    
    if (!analysis) {
      return res.status(404).json({
        success: false,
        error: '分析結果が見つかりません'
      });
    }
    
    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('Analysis fetch error:', error);
    res.status(500).json({
      success: false,
      error: '分析結果の取得に失敗しました'
    });
  }
});

// PDFレポート生成
app.get('/api/analysis/:id/pdf', async (req, res) => {
  try {
    const { id } = req.params;
    const analysis = await getAnalysisData(id);
    
    if (!analysis) {
      return res.status(404).json({
        success: false,
        error: '分析結果が見つかりません'
      });
    }
  
    if (analysis.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: '分析が完了していません'
      });
    }
    
    const pdfArrayBuffer = await generatePDFReport(analysis);
    const pdfBuffer = Buffer.from(pdfArrayBuffer);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="website-analysis-${id}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({
      success: false,
      error: 'PDFレポート生成に失敗しました'
    });
  }
});

// CSVエクスポート
app.get('/api/analysis/:id/csv', async (req, res) => {
  try {
    const { id } = req.params;
    const analysis = await getAnalysisData(id);
    
    if (!analysis) {
      return res.status(404).json({
        success: false,
        error: '分析結果が見つかりません'
      });
    }
    
    if (analysis.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: '分析が完了していません'
      });
    }
    
    const csvData = generateCSVReport(analysis);
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="website-analysis-${id}.csv"`);
    res.send('\uFEFF' + csvData); // UTF-8 BOM for Excel compatibility
    
  } catch (error) {
    console.error('CSV generation error:', error);
    res.status(500).json({
      success: false,
      error: 'CSVエクスポートに失敗しました'
    });
  }
});

// URL統計取得
app.get('/api/analysis/stats/:url', async (req, res) => {
  try {
    const { url } = req.params;
    const decodedUrl = decodeURIComponent(url);
    
    if (isDatabaseConnected) {
      const stats = await database.getUrlStats(decodedUrl);
      res.json({
        success: true,
        data: stats
      });
    } else {
      // フォールバック: メモリから統計生成
      const urlAnalyses = Array.from(analyses.values())
        .filter(analysis => analysis.url === decodedUrl && analysis.status === 'completed')
        .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
      
      const stats = {
        totalAnalyses: urlAnalyses.length,
        averageScore: urlAnalyses.length > 0 ? 
          Math.round(urlAnalyses.reduce((sum, a) => sum + a.results.overall.score, 0) / urlAnalyses.length) : null,
        maxScore: urlAnalyses.length > 0 ? Math.max(...urlAnalyses.map(a => a.results.overall.score)) : null,
        minScore: urlAnalyses.length > 0 ? Math.min(...urlAnalyses.map(a => a.results.overall.score)) : null,
        lastAnalysis: urlAnalyses.length > 0 ? urlAnalyses[0].completedAt : null,
        scoreHistory: urlAnalyses.slice(0, 20).map(a => ({
          score: a.results.overall.score,
          date: a.completedAt
        }))
      };
      
      res.json({
        success: true,
        data: stats
      });
    }
  } catch (error) {
    console.error('URL stats error:', error);
    res.status(500).json({
      success: false,
      error: 'URL統計の取得に失敗しました'
    });
  }
});

// 実際の分析を実行する関数
async function performAnalysis(analysisId, url) {
  console.log(`🔍 Starting analysis for ${url}...`);
  
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      timeout: 0,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--ignore-certificate-errors',
        '--ignore-ssl-errors',
        '--ignore-certificate-errors-spki-list',
        '--disable-web-security',
        '--allow-running-insecure-content',
        '--disable-features=VizDisplayCompositor',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--memory-pressure-off',
        '--max_old_space_size=4096'
      ]
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    const startTime = Date.now();
    
    // ページアクセス（段階的により寛容な設定でリトライ）
    let response;
    const strategies = [
      { waitUntil: 'domcontentloaded', timeout: 10000 },
      { waitUntil: 'load', timeout: 8000 },
      { waitUntil: 'networkidle2', timeout: 6000 }
    ];
    
    let lastError;
    for (let i = 0; i < strategies.length; i++) {
      const strategy = strategies[i];
      try {
        console.log(`📡 Attempt ${i + 1}: Trying with ${strategy.waitUntil}, timeout: ${strategy.timeout}ms`);
        response = await page.goto(url, strategy);
        console.log(`✅ Success with strategy ${i + 1}`);
        break;
      } catch (error) {
        lastError = error;
        console.log(`❌ Strategy ${i + 1} failed: ${error.message}`);
        
        if (i === strategies.length - 1) {
          // 最後の戦略も失敗した場合
          console.log(`🚨 All strategies failed for ${url}, proceeding with minimal data`);
          // 最低限のレスポンスオブジェクトを作成
          response = { status: () => 0, url: () => url };
        }
      }
    }
    
    const loadTime = (Date.now() - startTime) / 1000;
    
    // SEO分析
    const seoResults = await analyzeSEO(page);
    
    // パフォーマンス分析
    const performanceResults = await analyzePerformance(page, loadTime);
    
    // セキュリティ分析
    const securityResults = await analyzeSecurity(page, response);
    
    // アクセシビリティ分析
    const accessibilityResults = await analyzeAccessibility(page);
    
    // モバイル対応分析
    const mobileResults = await analyzeMobile(page);
    
    // コンテンツ品質分析
    const contentQualityResults = await analyzeContentQuality(page);
    
    // 高度なパフォーマンス分析
    const advancedPerformanceResults = await analyzeAdvancedPerformance(page);
    
    // 高度なセキュリティ分析
    const advancedSecurityResults = await analyzeAdvancedSecurity(page, response);
    
    // ビジネス指標分析
    const businessMetricsResults = await analyzeBusinessMetrics(page, response);
    
    // 総合スコア計算（9カテゴリの平均）
    const overallScore = Math.round((
      seoResults.score + 
      performanceResults.score + 
      securityResults.score + 
      accessibilityResults.score + 
      mobileResults.score +
      contentQualityResults.score +
      advancedPerformanceResults.score +
      advancedSecurityResults.score +
      businessMetricsResults.score
    ) / 9);
    
    const grade = getGrade(overallScore);
    
    // 優先順位付き改修提案を生成
    const prioritizedRecommendations = generatePrioritizedRecommendations({
      seo: seoResults,
      performance: performanceResults,
      security: securityResults,
      accessibility: accessibilityResults,
      mobile: mobileResults,
      contentQuality: contentQualityResults,
      advancedPerformance: advancedPerformanceResults,
      advancedSecurity: advancedSecurityResults,
      businessMetrics: businessMetricsResults
    });
    
    const results = {
      overall: { score: overallScore, grade },
      seo: seoResults,
      performance: performanceResults,
      security: securityResults,
      accessibility: accessibilityResults,
      mobile: mobileResults,
      contentQuality: contentQualityResults,
      advancedPerformance: advancedPerformanceResults,
      advancedSecurity: advancedSecurityResults,
      businessMetrics: businessMetricsResults,
      prioritizedRecommendations: prioritizedRecommendations
    };
    
    // 分析完了
    const completedAnalysis = {
      id: analysisId,
      url: url,
      status: 'completed',
      startedAt: analyses.get(analysisId)?.startedAt || new Date().toISOString(),
      results: results,
      completedAt: new Date().toISOString()
    };
    
    await saveAnalysisData(completedAnalysis);
    
    console.log(`✅ Analysis completed for ${url} (Score: ${overallScore})`);
    
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// SEO分析
async function analyzeSEO(page) {
  const issues = [];
  let score = 100;
  
  try {
    // タイトルタグ
    const titleInfo = await page.evaluate(() => {
      const titleEl = document.querySelector('title');
      if (!titleEl) return null;
      
      return {
        content: titleEl.textContent,
        location: {
          selector: 'title',
          tagName: 'TITLE',
          parentTag: titleEl.parentElement ? titleEl.parentElement.tagName : 'HEAD',
          innerHTML: titleEl.innerHTML,
          outerHTML: titleEl.outerHTML
        }
      };
    }).catch(() => null);
    
    if (!titleInfo) {
      issues.push({ 
        type: 'error', 
        message: 'タイトルタグが見つかりません',
        impact: '検索結果でタイトルが表示されず、SEO効果が大幅に失われます',
        solution: '<title>ページの内容を表すタイトル（30-60文字）</title>を<head>内に追加してください',
        priority: 'critical',
        location: {
          section: '<head>',
          element: 'タイトルタグなし',
          action: '追加が必要',
          code: '<title>ページタイトルを入力</title>'
        }
      });
      score -= 20;
    } else if (titleInfo.content.length > 60) {
      issues.push({ 
        type: 'warning', 
        message: `タイトルが長すぎます（${titleInfo.content.length}文字）`,
        impact: '検索結果でタイトルが途切れて表示される可能性があります',
        solution: 'タイトルを30-60文字以内に短縮し、重要なキーワードを前半に配置してください',
        priority: 'medium',
        location: {
          section: '<head>',
          element: 'title',
          currentValue: titleInfo.content,
          action: '文字数を短縮',
          code: titleInfo.location.outerHTML
        }
      });
      score -= 10;
    } else if (titleInfo.content.length < 30) {
      issues.push({ 
        type: 'warning', 
        message: `タイトルが短すぎます（${titleInfo.content.length}文字）`,
        impact: 'SEOキーワードが不十分で、検索順位が低下する可能性があります',
        solution: 'タイトルを30-60文字で構成し、ターゲットキーワードを含めてください',
        priority: 'medium',
        location: {
          section: '<head>',
          element: 'title',
          currentValue: titleInfo.content,
          action: 'キーワードを追加して延長',
          code: titleInfo.location.outerHTML
        }
      });
      score -= 5;
    }
    
    // メタ説明
    const descriptionInfo = await page.evaluate(() => {
      const descEl = document.querySelector('meta[name="description"]');
      if (!descEl) return null;
      
      return {
        content: descEl.getAttribute('content') || '',
        location: {
          selector: 'meta[name="description"]',
          tagName: 'META',
          attributes: {
            name: descEl.getAttribute('name'),
            content: descEl.getAttribute('content')
          },
          outerHTML: descEl.outerHTML
        }
      };
    }).catch(() => null);
    
    if (!descriptionInfo) {
      issues.push({ 
        type: 'error', 
        message: 'メタ説明が見つかりません',
        impact: '検索結果での表示が改善されず、クリック率が低下する可能性があります',
        solution: '<meta name="description" content="サイトの概要を120-160文字で記述">を<head>内に追加してください',
        priority: 'high',
        location: {
          section: '<head>',
          element: 'meta[name="description"]',
          action: '追加が必要',
          code: '<meta name="description" content="ページの説明を120-160文字で入力">'
        }
      });
      score -= 15;
    } else if (descriptionInfo.content.length > 160) {
      issues.push({ 
        type: 'warning', 
        message: `メタ説明が長すぎます（${descriptionInfo.content.length}文字）`,
        impact: '検索結果で説明が途切れて表示される可能性があります',
        solution: 'メタ説明を120-160文字以内に短縮し、重要なキーワードを前半に配置してください',
        priority: 'medium',
        location: {
          section: '<head>',
          element: 'meta[name="description"]',
          currentValue: descriptionInfo.content,
          action: '文字数を短縮',
          code: descriptionInfo.location.outerHTML
        }
      });
      score -= 5;
    }
    
    // H1タグ
    const h1Info = await page.evaluate(() => {
      const h1Elements = Array.from(document.querySelectorAll('h1'));
      return h1Elements.map((el, index) => ({
        text: el.textContent.trim(),
        innerHTML: el.innerHTML,
        outerHTML: el.outerHTML,
        selector: `h1:nth-of-type(${index + 1})`,
        position: {
          top: el.getBoundingClientRect().top + window.scrollY,
          left: el.getBoundingClientRect().left
        },
        parent: el.parentElement ? el.parentElement.tagName : null
      }));
    }).catch(() => []);
    
    if (h1Info.length === 0) {
      issues.push({ 
        type: 'error', 
        message: 'H1タグが見つかりません',
        impact: 'ページの主要コンテンツが不明で、SEO評価が大幅に低下します',
        solution: 'ページの主要見出しを<h1>タグで囲み、ページごとに1つのH1を設置してください',
        priority: 'high',
        location: {
          section: 'メインコンテンツエリア',
          element: 'H1タグなし',
          action: '追加が必要',
          code: '<h1>ページの主要見出し</h1>'
        }
      });
      score -= 15;
    } else if (h1Info.length > 1) {
      issues.push({ 
        type: 'warning', 
        message: `H1タグが複数あります（${h1Info.length}個）`,
        impact: '検索エンジンが主要コンテンツを特定しにくくなる可能性があります',
        solution: 'H1タグは1ページに1つまでとし、重要度に応じてH2、H3タグを使用してください',
        priority: 'medium',
        location: {
          section: 'ページ全体',
          element: 'h1',
          action: '重複するH1を H2, H3 に変更',
          details: h1Info.map((h1, index) => ({
            position: index + 1,
            text: h1.text,
            code: h1.outerHTML,
            selector: h1.selector
          }))
        }
      });
      score -= 5;
    }
    
    // 画像のalt属性
    const imagesWithoutAlt = await page.$$eval('img:not([alt])', imgs => imgs.length).catch(() => 0);
    if (imagesWithoutAlt > 0) {
      issues.push({ 
        type: 'warning', 
        message: `alt属性のない画像が${imagesWithoutAlt}個あります`,
        impact: 'アクセシビリティが低下し、視覚障害者にとって内容が理解困難になります',
        solution: '各<img>タグにalt="画像の説明"を追加してください。装飾画像の場合はalt=""を設定',
        priority: 'medium'
      });
      score -= Math.min(imagesWithoutAlt * 2, 20);
    }
    
    // メタキーワード（現在は非推奨だが確認）
    const keywords = await page.$eval('meta[name="keywords"]', el => el.content).catch(() => null);
    if (keywords && keywords.length > 0) {
      issues.push({ 
        type: 'info', 
        message: 'メタキーワードが設定されています',
        impact: '現在のSEOでは効果がなく、むしろスパム判定のリスクがあります',
        solution: '<meta name="keywords">タグを削除することを推奨します',
        priority: 'low'
      });
    }

    // Open Graph タグの確認
    const ogTitle = await page.$eval('meta[property="og:title"]', el => el.content).catch(() => null);
    const ogDescription = await page.$eval('meta[property="og:description"]', el => el.content).catch(() => null);
    const ogImage = await page.$eval('meta[property="og:image"]', el => el.content).catch(() => null);
    
    if (!ogTitle || !ogDescription || !ogImage) {
      issues.push({ 
        type: 'warning', 
        message: 'Open Graphタグが不完全です',
        impact: 'SNSでのシェア時に適切な表示がされず、クリック率が低下します',
        solution: '<meta property="og:title" content="タイトル">\n<meta property="og:description" content="説明">\n<meta property="og:image" content="画像URL">を追加してください',
        priority: 'medium'
      });
      score -= 8;
    }

    // 見出し構造の確認
    const headings = await page.evaluate(() => {
      const headingTags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
      const structure = {};
      headingTags.forEach(tag => {
        structure[tag] = document.querySelectorAll(tag).length;
      });
      return structure;
    });

    if (headings.h2 === 0 && headings.h3 === 0) {
      issues.push({ 
        type: 'warning', 
        message: '見出し構造が不十分です（H2、H3タグなし）',
        impact: 'コンテンツの構造が不明確で、SEO評価とユーザビリティが低下します',
        solution: 'H1の下にH2、H3タグを使って階層的な見出し構造を作成してください',
        priority: 'medium'
      });
      score -= 10;
    }

    // 内部リンクの確認
    const internalLinks = await page.$$eval('a[href]', links => {
      const currentDomain = window.location.hostname;
      return links.filter(link => {
        const href = link.getAttribute('href');
        return href && (href.startsWith('/') || href.includes(currentDomain));
      }).length;
    }).catch(() => 0);

    if (internalLinks < 3) {
      issues.push({ 
        type: 'info', 
        message: `内部リンクが少ない可能性があります（${internalLinks}個）`,
        impact: 'サイト内の回遊性が低く、SEO評価とユーザーエンゲージメントが低下します',
        solution: '関連ページへの内部リンクを3-10個程度設置してください',
        priority: 'low'
      });
      score -= 3;
    }

  } catch (error) {
    console.error('SEO analysis error:', error);
    score = 50;
    issues.push({ 
      type: 'error', 
      message: 'SEO分析中にエラーが発生しました',
      impact: '技術的な問題により完全な分析ができませんでした',
      solution: 'しばらく時間をおいて再度分析を実行してください',
      priority: 'high'
    });
  }
  
  return { score: Math.max(score, 0), issues };
}

// パフォーマンス分析
async function analyzePerformance(page, loadTime) {
  let score = 100;
  const issues = [];
  
  try {
    // 読み込み時間の評価
    if (loadTime > 5) {
      issues.push({
        type: 'error',
        message: `ページ読み込み時間が非常に遅いです（${loadTime.toFixed(2)}秒）`,
        impact: 'ユーザーの大部分が離脱し、SEO評価も大幅に低下します',
        solution: '画像の最適化、CSS/JSの圧縮、CDNの導入を検討してください',
        priority: 'critical',
        location: {
          section: 'サーバー設定・ファイル最適化',
          element: '画像・CSS・JavaScript ファイル',
          action: '最適化とキャッシュ設定',
          code: '<!-- 画像最適化例 -->\n<img src="image.webp" alt="説明" loading="lazy">',
          optimizations: [
            'WebPフォーマットへの画像変換',
            'CSS/JSの圧縮(minify)',
            'gzip圧縮の有効化',
            'CDNの導入',
            'ブラウザキャッシュの設定'
          ]
        }
      });
      score -= 40;
    } else if (loadTime > 3) {
      issues.push({
        type: 'warning',
        message: `ページ読み込み時間が遅いです（${loadTime.toFixed(2)}秒）`,
        impact: 'ユーザーエクスペリエンスが低下し、コンバージョン率に影響します',
        solution: '画像の圧縮、不要なJavaScriptの削除、サーバーレスポンス時間の改善を行ってください',
        priority: 'high',
        location: {
          section: 'ファイル最適化・サーバー設定',
          element: '大きな画像・JavaScript ファイル',
          action: 'ファイルサイズ削減と遅延読み込み',
          code: '<!-- 遅延読み込み例 -->\n<script src="script.js" defer></script>',
          optimizations: [
            '画像サイズの圧縮',
            '不要なJavaScriptの削除',
            'サーバーレスポンス時間の改善',
            '遅延読み込み(lazy loading)の実装'
          ]
        }
      });
      score -= 25;
    } else if (loadTime > 2) {
      issues.push({
        type: 'info',
        message: `ページ読み込み時間を改善できます（${loadTime.toFixed(2)}秒）`,
        impact: 'さらなる最適化でユーザーエクスペリエンスを向上できます',
        solution: '画像の WebP形式への変換、ブラウザキャッシュの活用を検討してください',
        priority: 'medium'
      });
      score -= 10;
    }
    
    // Core Web Vitalsの詳細計算
    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        const perfData = {
          fcp: null,
          lcp: null,
          cls: null,
          fid: null
        };
        
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.name === 'first-contentful-paint') {
              perfData.fcp = entry.startTime / 1000;
            }
            if (entry.entryType === 'largest-contentful-paint') {
              perfData.lcp = entry.startTime / 1000;
            }
          });
        }).observe({ entryTypes: ['paint', 'largest-contentful-paint'] });
        
        // レイアウトシフトの測定
        new PerformanceObserver((list) => {
          let clsValue = 0;
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
          perfData.cls = clsValue;
        }).observe({ entryTypes: ['layout-shift'] });
        
        setTimeout(() => resolve(perfData), 2000);
      });
    }).catch(() => ({ fcp: null, lcp: null, cls: null, fid: null }));
    
    const firstContentfulPaint = metrics.fcp || loadTime * 0.6;
    const largestContentfulPaint = metrics.lcp || loadTime * 0.9;
    const cumulativeLayoutShift = metrics.cls || 0;
    
    // FCP（First Contentful Paint）の評価
    if (firstContentfulPaint > 3) {
      issues.push({
        type: 'warning',
        message: `First Contentful Paint が遅いです（${firstContentfulPaint.toFixed(2)}秒）`,
        impact: 'ユーザーが最初のコンテンツを見るまでの時間が長く、離脱率が高まります',
        solution: 'クリティカルCSS のインライン化、フォントの最適化を行ってください',
        priority: 'high'
      });
      score -= 15;
    }
    
    // LCP（Largest Contentful Paint）の評価
    if (largestContentfulPaint > 4) {
      issues.push({
        type: 'warning',
        message: `Largest Contentful Paint が遅いです（${largestContentfulPaint.toFixed(2)}秒）`,
        impact: 'メインコンテンツの表示が遅く、Core Web Vitals評価が低下します',
        solution: 'メイン画像の最適化、プリロードの実装を検討してください',
        priority: 'high'
      });
      score -= 15;
    }
    
    // CLS（Cumulative Layout Shift）の評価
    if (cumulativeLayoutShift > 0.25) {
      issues.push({
        type: 'error',
        message: `レイアウトシフトが多発しています（CLS: ${cumulativeLayoutShift.toFixed(3)}）`,
        impact: 'ユーザーが誤操作をする可能性が高く、UXが大幅に低下します',
        solution: '画像に width/height を指定、フォントの事前読み込みを実装してください',
        priority: 'critical'
      });
      score -= 25;
    } else if (cumulativeLayoutShift > 0.1) {
      issues.push({
        type: 'warning',
        message: `軽微なレイアウトシフトが発生しています（CLS: ${cumulativeLayoutShift.toFixed(3)}）`,
        impact: 'Core Web Vitals評価に影響し、ユーザーエクスペリエンスが低下します',
        solution: '動的コンテンツに固定サイズを指定してください',
        priority: 'medium'
      });
      score -= 10;
    }
    
    // リソースサイズの分析
    const resourceStats = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource');
      let totalSize = 0;
      let imageSize = 0;
      let jsSize = 0;
      let cssSize = 0;
      
      resources.forEach(resource => {
        const size = resource.transferSize || 0;
        totalSize += size;
        
        if (resource.name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
          imageSize += size;
        } else if (resource.name.match(/\.js$/i)) {
          jsSize += size;
        } else if (resource.name.match(/\.css$/i)) {
          cssSize += size;
        }
      });
      
      return {
        total: totalSize,
        images: imageSize,
        javascript: jsSize,
        css: cssSize
      };
    }).catch(() => ({ total: 0, images: 0, javascript: 0, css: 0 }));
    
    // リソースサイズの評価（1MB = 1024*1024 bytes）
    if (resourceStats.total > 5 * 1024 * 1024) {
      issues.push({
        type: 'warning',
        message: `総リソースサイズが大きいです（${(resourceStats.total / 1024 / 1024).toFixed(2)}MB）`,
        impact: 'モバイルユーザーの読み込み時間が大幅に増加します',
        solution: '画像圧縮、不要なライブラリの削除、コード分割を実装してください',
        priority: 'high'
      });
      score -= 15;
    }
    
    if (resourceStats.images > 2 * 1024 * 1024) {
      issues.push({
        type: 'info',
        message: `画像サイズが大きいです（${(resourceStats.images / 1024 / 1024).toFixed(2)}MB）`,
        impact: '画像の読み込みが全体のパフォーマンスを低下させています',
        solution: 'WebP形式への変換、適切なサイズでの配信、lazy loading の導入を検討してください',
        priority: 'medium'
      });
      score -= 10;
    }
    
    return {
      score: Math.max(score, 0),
      issues: issues,
      loadTime: loadTime,
      firstContentfulPaint: firstContentfulPaint,
      largestContentfulPaint: largestContentfulPaint,
      cumulativeLayoutShift: cumulativeLayoutShift,
      resourceStats: resourceStats
    };
    
  } catch (error) {
    console.error('Performance analysis error:', error);
    return {
      score: 50,
      issues: [{
        type: 'error',
        message: 'パフォーマンス分析中にエラーが発生しました',
        impact: '技術的な問題により完全な分析ができませんでした',
        solution: 'しばらく時間をおいて再度分析を実行してください',
        priority: 'high'
      }],
      loadTime: loadTime,
      firstContentfulPaint: loadTime
    };
  }
}

// セキュリティ分析
async function analyzeSecurity(page, response) {
  let score = 100;
  const issues = [];
  
  try {
    // HTTPS使用状況
    const url = page.url();
    const httpsUsage = url.startsWith('https://');
    
    if (!httpsUsage) {
      score -= 40;
      issues.push({ 
        type: 'error', 
        message: 'HTTPSが使用されていません',
        impact: 'データ通信が暗号化されず、セキュリティリスクが非常に高くなります',
        solution: 'SSL/TLS証明書を取得し、すべての通信をHTTPSに移行してください',
        priority: 'critical'
      });
    }
    
    // セキュリティヘッダーの確認
    const headers = response.headers();
    
    if (!headers['strict-transport-security']) {
      score -= 10;
      issues.push({ 
        type: 'warning', 
        message: 'HSTS（HTTP Strict Transport Security）ヘッダーが設定されていません',
        impact: 'ブラウザが自動的にHTTPSを強制せず、中間者攻撃のリスクがあります',
        solution: 'Webサーバーで "Strict-Transport-Security: max-age=31536000; includeSubDomains" ヘッダーを設定してください',
        priority: 'medium',
        location: {
          section: 'サーバー設定',
          element: 'HTTPレスポンスヘッダー',
          action: 'HSTSヘッダーを追加',
          code: 'Strict-Transport-Security: max-age=31536000; includeSubDomains; preload',
          serverConfigs: {
            'Apache': 'Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"',
            'Nginx': 'add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;',
            'Express.js': 'app.use(helmet.hsts({ maxAge: 31536000, includeSubDomains: true, preload: true }));'
          }
        }
      });
    }
    
    if (!headers['x-frame-options'] && !headers['content-security-policy']) {
      score -= 10;
      issues.push({ 
        type: 'warning', 
        message: 'クリックジャッキング対策が不十分です',
        impact: '悪意のあるサイトにページが埋め込まれ、ユーザーが騙される可能性があります',
        solution: 'X-Frame-Options: DENY または Content-Security-Policy: frame-ancestors \'none\' ヘッダーを設定してください',
        priority: 'medium'
      });
    }
    
    // Content Security Policy の確認
    if (!headers['content-security-policy']) {
      score -= 8;
      issues.push({ 
        type: 'warning', 
        message: 'Content Security Policy（CSP）が設定されていません',
        impact: 'XSS攻撃やコード挿入攻撃に対する防御が不十分です',
        solution: 'Content-Security-Policy ヘッダーで許可するリソースを制限してください',
        priority: 'medium'
      });
    }

    // Referrer Policy の確認
    if (!headers['referrer-policy']) {
      score -= 5;
      issues.push({ 
        type: 'info', 
        message: 'Referrer Policy が設定されていません',
        impact: 'リファラー情報が意図せず外部に送信される可能性があります',
        solution: 'Referrer-Policy: strict-origin-when-cross-origin ヘッダーを設定してください',
        priority: 'low'
      });
    }

    // X-Content-Type-Options の確認
    if (!headers['x-content-type-options']) {
      score -= 5;
      issues.push({ 
        type: 'warning', 
        message: 'X-Content-Type-Options ヘッダーが設定されていません',
        impact: 'MIME タイプスニッフィング攻撃のリスクがあります',
        solution: 'X-Content-Type-Options: nosniff ヘッダーを設定してください',
        priority: 'medium'
      });
    }

    // 混合コンテンツの確認
    if (httpsUsage) {
      const mixedContent = await page.evaluate(() => {
        const resources = Array.from(document.querySelectorAll('img, script, link, iframe'));
        return resources.filter(el => {
          const src = el.src || el.href;
          return src && src.startsWith('http://');
        }).length;
      }).catch(() => 0);

      if (mixedContent > 0) {
        score -= 20;
        issues.push({ 
          type: 'error', 
          message: `混合コンテンツが検出されました（${mixedContent}個）`,
          impact: 'セキュリティ警告が表示され、ブラウザが一部コンテンツをブロックする可能性があります',
          solution: 'すべてのリソース（画像、CSS、JS）をHTTPS化してください',
          priority: 'critical'
        });
      }
    }

    // フォームのセキュリティ確認
    const formSecurity = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      let insecureForms = 0;
      let formsWithoutCSRF = 0;

      forms.forEach(form => {
        // HTTP action への送信
        if (form.action && form.action.startsWith('http://')) {
          insecureForms++;
        }
        
        // CSRF トークンの確認（基本的なチェック）
        const hasCSRFToken = form.querySelector('input[name*="csrf"], input[name*="token"], input[name="_token"]');
        if (!hasCSRFToken && (form.method && form.method.toLowerCase() === 'post')) {
          formsWithoutCSRF++;
        }
      });

      return { insecureForms, formsWithoutCSRF, totalForms: forms.length };
    }).catch(() => ({ insecureForms: 0, formsWithoutCSRF: 0, totalForms: 0 }));

    if (formSecurity.insecureForms > 0) {
      score -= 25;
      issues.push({ 
        type: 'error', 
        message: `HTTPで送信されるフォームがあります（${formSecurity.insecureForms}個）`,
        impact: 'フォームデータが平文で送信され、情報漏洩のリスクが非常に高いです',
        solution: 'フォームのaction属性をHTTPSに変更してください',
        priority: 'critical'
      });
    }

    if (formSecurity.formsWithoutCSRF > 0) {
      score -= 10;
      issues.push({ 
        type: 'warning', 
        message: `CSRF対策が不十分なフォームがあります（${formSecurity.formsWithoutCSRF}個）`,
        impact: 'クロスサイトリクエストフォージェリ攻撃のリスクがあります',
        solution: 'フォームにCSRFトークンを実装してください',
        priority: 'high'
      });
    }

    // Cookie のセキュリティ確認
    const cookieIssues = await page.evaluate(() => {
      const cookies = document.cookie.split(';');
      return {
        hasCookies: cookies.length > 1 || (cookies.length === 1 && cookies[0].trim() !== ''),
        cookieCount: cookies.filter(c => c.trim() !== '').length
      };
    }).catch(() => ({ hasCookies: false, cookieCount: 0 }));

    if (cookieIssues.hasCookies) {
      // HTTPSサイトでSecureフラグなしのクッキーの警告
      if (httpsUsage) {
        issues.push({ 
          type: 'info', 
          message: 'Cookieのセキュリティ設定を確認してください',
          impact: 'Secure、HttpOnly、SameSite属性が適切に設定されていない可能性があります',
          solution: 'Cookie設定時にSecure、HttpOnly、SameSite属性を適切に設定してください',
          priority: 'medium'
        });
      }
    }

    return {
      score: Math.max(score, 0),
      httpsUsage: httpsUsage,
      issues: issues,
      details: {
        headers: {
          hsts: !!headers['strict-transport-security'],
          csp: !!headers['content-security-policy'],
          frameOptions: !!headers['x-frame-options'],
          referrerPolicy: !!headers['referrer-policy'],
          contentTypeOptions: !!headers['x-content-type-options']
        },
        mixedContent: httpsUsage ? (await page.evaluate(() => {
          const resources = Array.from(document.querySelectorAll('img, script, link, iframe'));
          return resources.filter(el => {
            const src = el.src || el.href;
            return src && src.startsWith('http://');
          }).length;
        }).catch(() => 0)) : 0,
        formSecurity: formSecurity,
        cookieIssues: cookieIssues
      }
    };
    
  } catch (error) {
    console.error('Security analysis error:', error);
    return {
      score: 50,
      httpsUsage: false,
      issues: [{ type: 'error', message: 'セキュリティ分析中にエラーが発生しました' }]
    };
  }
}

// アクセシビリティ分析
async function analyzeAccessibility(page) {
  let score = 100;
  const issues = [];
  
  try {
    // 詳細なアクセシビリティチェック
    const accessibilityChecks = await page.evaluate(() => {
      const results = {
        // 画像のalt属性チェック
        images: {
          total: document.querySelectorAll('img').length,
          missingAlt: document.querySelectorAll('img:not([alt])').length,
          emptyAlt: document.querySelectorAll('img[alt=""]').length,
          decorativeImages: document.querySelectorAll('img[role="presentation"], img[alt=""]').length
        },
        
        // フォーム要素のラベリング
        forms: {
          inputs: document.querySelectorAll('input, textarea, select').length,
          unlabeledInputs: 0,
          missingLabels: 0
        },
        
        // 見出し構造
        headings: {
          h1: document.querySelectorAll('h1').length,
          h2: document.querySelectorAll('h2').length,
          h3: document.querySelectorAll('h3').length,
          h4: document.querySelectorAll('h4').length,
          h5: document.querySelectorAll('h5').length,
          h6: document.querySelectorAll('h6').length,
          skippedLevels: false,
          emptyHeadings: document.querySelectorAll('h1:empty, h2:empty, h3:empty, h4:empty, h5:empty, h6:empty').length
        },
        
        // ARIA属性
        aria: {
          landmarksCount: document.querySelectorAll('[role="main"], [role="navigation"], [role="banner"], [role="contentinfo"], main, nav, header, footer').length,
          hasSkipLinks: document.querySelectorAll('a[href^="#"]:first-child').length > 0,
          focusableElements: document.querySelectorAll('a, button, input, textarea, select, [tabindex]').length,
          negativeTabindex: document.querySelectorAll('[tabindex="-1"]').length
        },
        
        // リンクと、ボタン
        links: {
          total: document.querySelectorAll('a').length,
          emptyLinks: document.querySelectorAll('a:empty, a:not([aria-label]):not([title])').length,
          missingHref: document.querySelectorAll('a:not([href])').length
        },
        
        // 色とコントラスト（基本チェック）
        colors: {
          hasColorOnlyInfo: false, // より高度な分析が必要
          contrastIssues: 0 // 実際のコントラスト計算は複雑
        },
        
        // キーボードナビゲーション
        keyboard: {
          hasTabindex: document.querySelectorAll('[tabindex]').length,
          hasAccessKey: document.querySelectorAll('[accesskey]').length,
          focusableCount: document.querySelectorAll('a, button, input, textarea, select, [tabindex="0"]').length
        },
        
        // ページ構造
        structure: {
          hasMainLandmark: document.querySelectorAll('main, [role="main"]').length > 0,
          hasNavLandmark: document.querySelectorAll('nav, [role="navigation"]').length > 0,
          hasPageTitle: document.title && document.title.trim().length > 0,
          hasLang: document.documentElement.lang && document.documentElement.lang.length > 0
        }
      };
      
      // フォーム要素のラベリング詳細チェック
      const formElements = document.querySelectorAll('input, textarea, select');
      formElements.forEach(element => {
        const hasLabel = element.labels && element.labels.length > 0;
        const hasAriaLabel = element.getAttribute('aria-label');
        const hasAriaLabelledby = element.getAttribute('aria-labelledby');
        const hasTitle = element.getAttribute('title');
        
        if (!hasLabel && !hasAriaLabel && !hasAriaLabelledby && !hasTitle && element.type !== 'hidden' && element.type !== 'submit') {
          results.forms.unlabeledInputs++;
        }
      });
      
      // 見出し階層の検証
      const headingLevels = [];
      ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach((tag, index) => {
        if (results.headings[tag] > 0) {
          headingLevels.push(index + 1);
        }
      });
      
      for (let i = 1; i < headingLevels.length; i++) {
        if (headingLevels[i] - headingLevels[i-1] > 1) {
          results.headings.skippedLevels = true;
          break;
        }
      }
      
      return results;
    });
    
    // 画像のalt属性チェック
    if (accessibilityChecks.images.missingAlt > 0) {
      issues.push({
        type: 'error',
        message: `alt属性が設定されていない画像が${accessibilityChecks.images.missingAlt}個あります`,
        impact: '視覚障害者がスクリーンリーダーで画像の内容を理解できません',
        solution: '各画像に適切なalt属性を追加してください。装飾画像の場合はalt=""を設定',
        priority: 'high'
      });
      score -= accessibilityChecks.images.missingAlt * 3;
    }
    
    // フォーム要素のラベリング
    if (accessibilityChecks.forms.unlabeledInputs > 0) {
      issues.push({
        type: 'error',
        message: `ラベルが設定されていないフォーム要素が${accessibilityChecks.forms.unlabeledInputs}個あります`,
        impact: 'フォーム要素の目的が不明で、支援技術を使用するユーザーが操作できません',
        solution: '<label>タグまたはaria-label属性を使用してフォーム要素にラベルを設定してください',
        priority: 'critical'
      });
      score -= accessibilityChecks.forms.unlabeledInputs * 5;
    }
    
    // 見出し構造の確認
    if (accessibilityChecks.headings.h1 === 0) {
      issues.push({
        type: 'error',
        message: 'H1見出しが設定されていません',
        impact: 'ページの主要コンテンツが不明で、構造的なナビゲーションができません',
        solution: 'ページの主要見出しをH1タグで設定してください',
        priority: 'high',
        location: {
          section: 'メインコンテンツエリア',
          element: 'H1見出し',
          action: '主要見出しを追加',
          code: '<h1>ページのメインタイトル</h1>',
          wcagGuideline: 'WCAG 2.1 - 2.4.6 見出しおよびラベル'
        }
      });
      score -= 15;
    } else if (accessibilityChecks.headings.h1 > 1) {
      issues.push({
        type: 'warning',
        message: `H1見出しが複数設定されています（${accessibilityChecks.headings.h1}個）`,
        impact: 'ページの主要見出しが曖昧になり、支援技術での理解が困難になります',
        solution: 'H1見出しは1ページに1つのみ設定し、階層構造を適切に使用してください',
        priority: 'medium'
      });
      score -= 8;
    }
    
    if (accessibilityChecks.headings.skippedLevels) {
      issues.push({
        type: 'warning',
        message: '見出しレベルが正しい順序になっていません',
        impact: 'コンテンツの論理的構造が不明確で、支援技術でのナビゲーションが困難になります',
        solution: '見出しは順序通り（H1→H2→H3...）に使用し、レベルをスキップしないでください',
        priority: 'medium'
      });
      score -= 10;
    }
    
    if (accessibilityChecks.headings.emptyHeadings > 0) {
      issues.push({
        type: 'warning',
        message: `空の見出しタグが${accessibilityChecks.headings.emptyHeadings}個あります`,
        impact: '意味のない見出しが支援技術で読み上げられ、混乱を招きます',
        solution: '空の見出しタグを削除するか、適切な内容を追加してください',
        priority: 'medium'
      });
      score -= accessibilityChecks.headings.emptyHeadings * 3;
    }
    
    // ARIA ランドマーク
    if (accessibilityChecks.aria.landmarksCount === 0) {
      issues.push({
        type: 'warning',
        message: 'LANDMARKロールやセマンティック要素が使用されていません',
        impact: 'ページの主要部分を素早く識別できず、ナビゲーション効率が低下します',
        solution: 'main, nav, header, footer要素やrole属性を使用してページ構造を明確にしてください',
        priority: 'medium'
      });
      score -= 12;
    }
    
    // スキップリンク
    if (!accessibilityChecks.aria.hasSkipLinks) {
      issues.push({
        type: 'info',
        message: 'スキップリンクが設定されていません',
        impact: 'キーボードユーザーがメインコンテンツに素早くアクセスできません',
        solution: 'ページ先頭に"メインコンテンツへスキップ"リンクを追加してください',
        priority: 'low'
      });
      score -= 5;
    }
    
    // リンクの品質
    if (accessibilityChecks.links.emptyLinks > 0) {
      issues.push({
        type: 'warning',
        message: `リンクテキストが不適切なリンクが${accessibilityChecks.links.emptyLinks}個あります`,
        impact: 'リンクの目的が不明で、支援技術を使用するユーザーが理解できません',
        solution: 'リンクに分かりやすいテキストまたはaria-label属性を設定してください',
        priority: 'medium'
      });
      score -= accessibilityChecks.links.emptyLinks * 2;
    }
    
    // ページ構造の基本要素
    if (!accessibilityChecks.structure.hasPageTitle) {
      issues.push({
        type: 'error',
        message: 'ページタイトルが設定されていません',
        impact: 'ページの内容が不明で、ブラウザタブやブックマークで識別できません',
        solution: '<title>タグでページの内容を表すタイトルを設定してください',
        priority: 'high'
      });
      score -= 15;
    }
    
    if (!accessibilityChecks.structure.hasLang) {
      issues.push({
        type: 'warning',
        message: 'ページの言語が設定されていません',
        impact: 'スクリーンリーダーが適切な音声合成を選択できません',
        solution: '<html>タグにlang="ja"属性を追加してください',
        priority: 'medium'
      });
      score -= 8;
    }
    
    if (!accessibilityChecks.structure.hasMainLandmark) {
      issues.push({
        type: 'warning',
        message: 'メインコンテンツ領域が明示されていません',
        impact: 'ページの主要コンテンツを識別できず、効率的なナビゲーションができません',
        solution: '<main>要素またはrole="main"を使用してメインコンテンツを明示してください',
        priority: 'medium'
      });
      score -= 10;
    }
    
    // フォーカス管理
    if (accessibilityChecks.keyboard.focusableCount === 0) {
      issues.push({
        type: 'info',
        message: 'フォーカス可能な要素が少ない可能性があります',
        impact: 'キーボードでのナビゲーションが制限される可能性があります',
        solution: 'インタラクティブな要素が適切にフォーカス可能か確認してください',
        priority: 'low'
      });
      score -= 3;
    }
    
    // WCAG準拠レベルの判定
    let wcagLevel = 'A';
    if (score >= 85 && issues.filter(i => i.priority === 'critical').length === 0) {
      wcagLevel = 'AA';
    }
    if (score >= 95 && issues.filter(i => i.priority === 'critical' || i.priority === 'high').length === 0) {
      wcagLevel = 'AAA';
    }
    
    return {
      score: Math.max(score, 0),
      wcagLevel: wcagLevel,
      violations: issues.length,
      issues: issues,
      details: {
        images: accessibilityChecks.images,
        forms: accessibilityChecks.forms,
        headings: accessibilityChecks.headings,
        aria: accessibilityChecks.aria,
        links: accessibilityChecks.links,
        structure: accessibilityChecks.structure,
        keyboard: accessibilityChecks.keyboard
      }
    };
    
  } catch (error) {
    console.error('Accessibility analysis error:', error);
    return {
      score: 50,
      wcagLevel: 'A',
      violations: 10,
      issues: [{ 
        type: 'error', 
        message: 'アクセシビリティ分析中にエラーが発生しました',
        impact: '技術的な問題により完全な分析ができませんでした',
        solution: 'しばらく時間をおいて再度分析を実行してください',
        priority: 'high'
      }]
    };
  }
}

// モバイル対応分析
async function analyzeMobile(page) {
  let score = 100;
  const issues = [];
  
  try {
    // ビューポートをモバイルサイズに変更して詳細チェック
    await page.setViewport({ width: 375, height: 667 });
    
    const mobileAnalysis = await page.evaluate(() => {
      const results = {
        // ビューポート設定
        viewport: {
          meta: document.querySelector('meta[name="viewport"]'),
          hasViewportMeta: !!document.querySelector('meta[name="viewport"]'),
          viewportContent: null,
          hasInitialScale: false,
          hasMaximumScale: false,
          hasUserScalable: false
        },
        
        // レスポンシブデザイン
        responsive: {
          hasMediaQueries: false,
          hasFlexbox: false,
          hasGrid: false,
          hasRelativeUnits: false
        },
        
        // タッチ操作
        touch: {
          touchTargets: document.querySelectorAll('button, a, input, [onclick], [role="button"]').length,
          smallTargets: 0,
          overlappingTargets: 0
        },
        
        // フォント・テキスト
        typography: {
          readableTextSize: true,
          hasZoomedText: false,
          minFontSize: 16
        },
        
        // レイアウト
        layout: {
          horizontalScrolling: window.innerWidth < document.body.scrollWidth,
          contentFitsViewport: true,
          hasFixedPositioning: false
        },
        
        // パフォーマンス
        performance: {
          imageOptimization: true,
          cssOptimization: true
        }
      };
      
      // ビューポート詳細分析
      if (results.viewport.meta) {
        results.viewport.viewportContent = results.viewport.meta.getAttribute('content') || '';
        results.viewport.hasInitialScale = results.viewport.viewportContent.includes('initial-scale');
        results.viewport.hasMaximumScale = results.viewport.viewportContent.includes('maximum-scale');
        results.viewport.hasUserScalable = results.viewport.viewportContent.includes('user-scalable');
      }
      
      // CSS メディアクエリの確認
      try {
        const sheets = Array.from(document.styleSheets);
        results.responsive.hasMediaQueries = sheets.some(sheet => {
          try {
            return Array.from(sheet.cssRules).some(rule => 
              rule.type === CSSRule.MEDIA_RULE && 
              (rule.media.mediaText.includes('max-width') || 
               rule.media.mediaText.includes('min-width') ||
               rule.media.mediaText.includes('screen'))
            );
          } catch {
            return false;
          }
        });
        
        // CSS現代レイアウト技術の確認
        const allRules = [];
        sheets.forEach(sheet => {
          try {
            Array.from(sheet.cssRules).forEach(rule => {
              if (rule.style) {
                allRules.push(rule.style.cssText);
              }
            });
          } catch {}
        });
        
        const cssText = allRules.join(' ');
        results.responsive.hasFlexbox = cssText.includes('flex') || cssText.includes('display: flex');
        results.responsive.hasGrid = cssText.includes('grid') || cssText.includes('display: grid');
        results.responsive.hasRelativeUnits = cssText.includes('vw') || cssText.includes('vh') || 
                                            cssText.includes('%') || cssText.includes('em') || cssText.includes('rem');
      } catch (error) {
        console.log('CSS analysis error:', error);
      }
      
      // タッチターゲットサイズの確認
      const touchElements = document.querySelectorAll('button, a, input, [onclick], [role="button"]');
      touchElements.forEach(element => {
        const rect = element.getBoundingClientRect();
        const minSize = 44; // 44px minimum touch target (Apple HIG)
        
        if (rect.width < minSize || rect.height < minSize) {
          results.touch.smallTargets++;
        }
      });
      
      // テキストサイズの確認
      const textElements = document.querySelectorAll('p, span, div, li, td, th');
      let smallTextCount = 0;
      textElements.forEach(element => {
        const computedStyle = window.getComputedStyle(element);
        const fontSize = parseFloat(computedStyle.fontSize);
        if (fontSize < 16) {
          smallTextCount++;
        }
      });
      results.typography.hasZoomedText = smallTextCount > textElements.length * 0.3;
      
      // 水平スクロールの確認
      results.layout.horizontalScrolling = document.body.scrollWidth > window.innerWidth;
      results.layout.contentFitsViewport = document.body.scrollWidth <= window.innerWidth;
      
      // 固定配置要素の確認
      const allElements = document.querySelectorAll('*');
      Array.from(allElements).forEach(element => {
        const computedStyle = window.getComputedStyle(element);
        if (computedStyle.position === 'fixed') {
          results.layout.hasFixedPositioning = true;
        }
      });
      
      return results;
    });
    
    // ビューポートメタタグの評価
    if (!mobileAnalysis.viewport.hasViewportMeta) {
      issues.push({
        type: 'error',
        message: 'ビューポートメタタグが設定されていません',
        impact: 'モバイルデバイスで適切に表示されず、ユーザビリティが大幅に低下します',
        solution: '<meta name="viewport" content="width=device-width, initial-scale=1.0">を<head>内に追加してください',
        priority: 'critical',
        location: {
          section: '<head>',
          element: 'meta[name="viewport"]',
          action: '追加が必要',
          code: '<meta name="viewport" content="width=device-width, initial-scale=1.0">'
        }
      });
      score -= 35;
    } else {
      const viewportContent = mobileAnalysis.viewport.viewportContent;
      
      if (!viewportContent.includes('width=device-width')) {
        issues.push({
          type: 'warning',
          message: 'ビューポートの幅設定が不適切です',
          impact: 'デバイスの画面幅に合わせた表示ができません',
          solution: 'viewport メタタグに width=device-width を追加してください',
          priority: 'high'
        });
        score -= 15;
      }
      
      if (!mobileAnalysis.viewport.hasInitialScale) {
        issues.push({
          type: 'info',
          message: '初期ズーム倍率が設定されていません',
          impact: 'ページの初期表示倍率が不安定になる可能性があります',
          solution: 'viewport メタタグに initial-scale=1.0 を追加することを推奨します',
          priority: 'low'
        });
        score -= 5;
      }
      
      if (viewportContent.includes('user-scalable=no')) {
        issues.push({
          type: 'warning',
          message: 'ユーザーによるズーム操作が無効化されています',
          impact: 'アクセシビリティが低下し、視覚障害者がコンテンツを拡大できません',
          solution: 'user-scalable=no を削除するか、maximum-scale を適切に設定してください',
          priority: 'medium'
        });
        score -= 10;
      }
    }
    
    // レスポンシブデザインの評価
    if (!mobileAnalysis.responsive.hasMediaQueries) {
      issues.push({
        type: 'error',
        message: 'CSSメディアクエリが使用されていません',
        impact: 'デバイスサイズに応じたレイアウト調整ができず、モバイル体験が劣化します',
        solution: '@media (max-width: 768px) {} などのメディアクエリを使用してレスポンシブデザインを実装してください',
        priority: 'high',
        location: {
          section: 'CSS ファイル',
          element: '@media クエリ',
          action: 'レスポンシブデザイン用のメディアクエリを追加',
          code: '@media (max-width: 768px) {\n  /* モバイル用のスタイル */\n}',
          files: ['style.css', 'responsive.css', 'main.css']
        }
      });
      score -= 25;
    }
    
    if (!mobileAnalysis.responsive.hasFlexbox && !mobileAnalysis.responsive.hasGrid) {
      issues.push({
        type: 'warning',
        message: '現代的なCSS レイアウト技術が使用されていません',
        impact: '効果的なレスポンシブレイアウトの実装が困難になります',
        solution: 'Flexbox (display: flex) や CSS Grid (display: grid) の使用を検討してください',
        priority: 'medium'
      });
      score -= 10;
    }
    
    if (!mobileAnalysis.responsive.hasRelativeUnits) {
      issues.push({
        type: 'info',
        message: '相対単位が使用されていない可能性があります',
        impact: 'デバイスサイズに柔軟に対応できず、レスポンシブ性が制限されます',
        solution: 'px の代わりに %, em, rem, vw, vh などの相対単位の使用を検討してください',
        priority: 'low'
      });
      score -= 5;
    }
    
    // タッチターゲットの評価
    if (mobileAnalysis.touch.smallTargets > 0) {
      issues.push({
        type: 'warning',
        message: `タッチターゲットが小さすぎる要素が${mobileAnalysis.touch.smallTargets}個あります`,
        impact: 'モバイルデバイスでのタップ操作が困難になり、ユーザビリティが低下します',
        solution: 'ボタンやリンクのサイズを最小44px x 44px以上にしてください',
        priority: 'medium'
      });
      score -= Math.min(mobileAnalysis.touch.smallTargets * 2, 15);
    }
    
    // テキストサイズの評価
    if (mobileAnalysis.typography.hasZoomedText) {
      issues.push({
        type: 'warning',
        message: '読みにくい小さなテキストが多数あります',
        impact: 'モバイルデバイスでテキストが読みにくく、ユーザビリティが低下します',
        solution: 'テキストサイズを16px以上に設定し、行間も適切に調整してください',
        priority: 'medium'
      });
      score -= 12;
    }
    
    // レイアウトの評価
    if (mobileAnalysis.layout.horizontalScrolling) {
      issues.push({
        type: 'error',
        message: '水平スクロールが必要なコンテンツがあります',
        impact: 'モバイルデバイスで使いにくく、コンテンツが見切れる可能性があります',
        solution: 'コンテンツ幅をビューポート幅以内に収まるよう調整してください',
        priority: 'high'
      });
      score -= 20;
    }
    
    // パフォーマンス関連
    const imageCount = await page.$$eval('img', imgs => imgs.length);
    if (imageCount > 10) {
      issues.push({
        type: 'info',
        message: `多数の画像が読み込まれています（${imageCount}個）`,
        impact: 'モバイルデータ通信での読み込み時間が長くなる可能性があります',
        solution: '画像の遅延読み込み（lazy loading）や WebP形式の使用を検討してください',
        priority: 'low'
      });
      score -= 5;
    }
    
    // モバイル固有機能の確認
    const mobileFeatures = await page.evaluate(() => {
      return {
        hasTelLinks: document.querySelectorAll('a[href^="tel:"]').length > 0,
        hasEmailLinks: document.querySelectorAll('a[href^="mailto:"]').length > 0,
        hasAppLinks: document.querySelectorAll('a[href^="app:"], a[href*="://"]').length > 0
      };
    });
    
    if (mobileFeatures.hasTelLinks || mobileFeatures.hasEmailLinks) {
      // モバイル機能を適切に実装している場合は加点
      score += 3;
    }
    
    // 総合判定
    const isResponsive = mobileAnalysis.viewport.hasViewportMeta && 
                        mobileAnalysis.responsive.hasMediaQueries && 
                        !mobileAnalysis.layout.horizontalScrolling;
    
    return {
      score: Math.max(Math.min(score, 100), 0),
      isResponsive: isResponsive,
      hasViewportMeta: mobileAnalysis.viewport.hasViewportMeta,
      issues: issues,
      details: {
        viewport: mobileAnalysis.viewport,
        responsive: mobileAnalysis.responsive,
        touch: mobileAnalysis.touch,
        typography: mobileAnalysis.typography,
        layout: mobileAnalysis.layout,
        performance: mobileAnalysis.performance,
        mobileFeatures: mobileFeatures
      }
    };
    
  } catch (error) {
    console.error('Mobile analysis error:', error);
    return {
      score: 50,
      isResponsive: false,
      hasViewportMeta: false,
      issues: [{ 
        type: 'error', 
        message: 'モバイル分析中にエラーが発生しました',
        impact: '技術的な問題により完全な分析ができませんでした',
        solution: 'しばらく時間をおいて再度分析を実行してください',
        priority: 'high'
      }]
    };
  }
}

// コンテンツ品質分析
async function analyzeContentQuality(page) {
  let score = 100;
  const issues = [];
  
  try {
    const contentAnalysis = await page.evaluate(() => {
      const results = {
        // テキストコンテンツ分析
        text: {
          totalLength: 0,
          paragraphs: 0,
          averageParagraphLength: 0,
          sentences: 0,
          averageSentenceLength: 0,
          readabilityScore: 0,
          hasStructuredData: false,
          structuredDataTypes: []
        },
        
        // リンク分析
        links: {
          internal: 0,
          external: 0,
          broken: [],
          nofollow: 0,
          affiliate: 0
        },
        
        // メディア分析
        media: {
          images: {
            total: 0,
            withoutAlt: 0,
            largeImages: 0,
            brokenImages: 0
          },
          videos: 0,
          iframes: 0
        },
        
        // コンテンツ構造
        structure: {
          hasProperHeadingHierarchy: true,
          hasTOC: false,
          hasListElements: false,
          hasDataTables: false
        },
        
        // メタデータ
        metadata: {
          hasAuthor: false,
          hasPublishDate: false,
          hasModifiedDate: false,
          hasCanonicalURL: false
        }
      };
      
      // テキストコンテンツの分析
      const textElements = document.querySelectorAll('p, div, span, li, td, th');
      let allText = '';
      textElements.forEach(element => {
        const text = element.textContent.trim();
        if (text.length > 0) {
          allText += text + ' ';
        }
      });
      
      results.text.totalLength = allText.length;
      results.text.paragraphs = document.querySelectorAll('p').length;
      
      // 文章の複雑さを簡易的に評価
      const sentences = allText.match(/[。！？.!?]+/g) || [];
      results.text.sentences = sentences.length;
      
      if (results.text.paragraphs > 0) {
        results.text.averageParagraphLength = Math.round(results.text.totalLength / results.text.paragraphs);
      }
      
      if (results.text.sentences > 0) {
        results.text.averageSentenceLength = Math.round(results.text.totalLength / results.text.sentences);
      }
      
      // 構造化データの確認
      const structuredDataScripts = document.querySelectorAll('script[type="application/ld+json"]');
      results.text.hasStructuredData = structuredDataScripts.length > 0;
      
      structuredDataScripts.forEach(script => {
        try {
          const data = JSON.parse(script.textContent);
          if (data['@type']) {
            results.text.structuredDataTypes.push(data['@type']);
          }
        } catch {}
      });
      
      // リンク分析
      const links = document.querySelectorAll('a[href]');
      const currentDomain = window.location.hostname;
      
      links.forEach(link => {
        const href = link.getAttribute('href');
        const rel = link.getAttribute('rel') || '';
        
        if (href.startsWith('http://') || href.startsWith('https://')) {
          const linkDomain = new URL(href).hostname;
          if (linkDomain === currentDomain) {
            results.links.internal++;
          } else {
            results.links.external++;
            if (href.includes('amazon') || href.includes('affiliate')) {
              results.links.affiliate++;
            }
          }
        } else if (href.startsWith('/') || href.startsWith('./')) {
          results.links.internal++;
        }
        
        if (rel.includes('nofollow')) {
          results.links.nofollow++;
        }
      });
      
      // メディア分析
      const images = document.querySelectorAll('img');
      results.media.images.total = images.length;
      
      images.forEach(img => {
        if (!img.alt) {
          results.media.images.withoutAlt++;
        }
        
        // 大きな画像の検出（ファイルサイズは取得できないので、表示サイズで判断）
        if (img.naturalWidth > 1200 || img.naturalHeight > 1200) {
          results.media.images.largeImages++;
        }
        
        // 壊れた画像の検出
        if (!img.complete || img.naturalHeight === 0) {
          results.media.images.brokenImages++;
        }
      });
      
      results.media.videos = document.querySelectorAll('video').length;
      results.media.iframes = document.querySelectorAll('iframe').length;
      
      // コンテンツ構造の分析
      results.structure.hasListElements = document.querySelectorAll('ul, ol').length > 0;
      results.structure.hasDataTables = document.querySelectorAll('table').length > 0;
      results.structure.hasTOC = document.querySelector('#toc, .toc, .table-of-contents') !== null;
      
      // メタデータの確認
      results.metadata.hasAuthor = !!document.querySelector('meta[name="author"], [rel="author"]');
      results.metadata.hasPublishDate = !!document.querySelector('meta[property="article:published_time"], time[pubdate]');
      results.metadata.hasModifiedDate = !!document.querySelector('meta[property="article:modified_time"]');
      results.metadata.hasCanonicalURL = !!document.querySelector('link[rel="canonical"]');
      
      return results;
    });
    
    // コンテンツ量の評価
    if (contentAnalysis.text.totalLength < 300) {
      issues.push({
        type: 'error',
        message: 'コンテンツが非常に少ないです（300文字未満）',
        impact: 'SEO評価が低く、ユーザーに十分な情報を提供できません',
        solution: '最低でも500文字以上の有益なコンテンツを追加してください',
        priority: 'high'
      });
      score -= 25;
    } else if (contentAnalysis.text.totalLength < 500) {
      issues.push({
        type: 'warning',
        message: 'コンテンツ量が少ないです（500文字未満）',
        impact: '検索エンジンの評価が低くなる可能性があります',
        solution: '1000文字以上のコンテンツを目指してください',
        priority: 'medium'
      });
      score -= 15;
    }
    
    // 読みやすさの評価
    if (contentAnalysis.text.averageSentenceLength > 100) {
      issues.push({
        type: 'warning',
        message: '文章が長すぎて読みにくい可能性があります',
        impact: 'ユーザーの読了率が低下し、情報が伝わりにくくなります',
        solution: '文章を短く区切り、1文50文字以内を目安にしてください',
        priority: 'medium'
      });
      score -= 10;
    }
    
    // 構造化データの評価
    if (!contentAnalysis.text.hasStructuredData) {
      issues.push({
        type: 'info',
        message: '構造化データ（Schema.org）が設定されていません',
        impact: '検索結果でのリッチスニペット表示機会を逃しています',
        solution: 'JSON-LD形式で適切な構造化データを追加してください',
        priority: 'low'
      });
      score -= 5;
    }
    
    // リンク切れの確認（簡易チェック）
    if (contentAnalysis.media.images.brokenImages > 0) {
      issues.push({
        type: 'error',
        message: `読み込めない画像が${contentAnalysis.media.images.brokenImages}個あります`,
        impact: 'ユーザー体験が大幅に低下し、信頼性が損なわれます',
        solution: '画像のURLを確認し、正しいパスに修正してください',
        priority: 'high'
      });
      score -= contentAnalysis.media.images.brokenImages * 5;
    }
    
    // 内部リンクの評価
    if (contentAnalysis.links.internal < 3) {
      issues.push({
        type: 'warning',
        message: '内部リンクが少ないです',
        impact: 'サイト内の回遊性が低く、他のページへの導線が不足しています',
        solution: '関連するページへの内部リンクを3-10個程度追加してください',
        priority: 'medium'
      });
      score -= 8;
    }
    
    // アフィリエイトリンクの警告
    if (contentAnalysis.links.affiliate > 5) {
      issues.push({
        type: 'info',
        message: 'アフィリエイトリンクが多数検出されました',
        impact: '過度な商用リンクは信頼性を損なう可能性があります',
        solution: 'アフィリエイトリンクには適切な開示を行い、バランスを保ってください',
        priority: 'low'
      });
      score -= 5;
    }
    
    // メタデータの評価
    if (!contentAnalysis.metadata.hasCanonicalURL) {
      issues.push({
        type: 'warning',
        message: 'Canonical URLが設定されていません',
        impact: '重複コンテンツとして認識される可能性があります',
        solution: '<link rel="canonical" href="正規URL">を追加してください',
        priority: 'medium'
      });
      score -= 8;
    }
    
    if (!contentAnalysis.metadata.hasAuthor && !contentAnalysis.metadata.hasPublishDate) {
      issues.push({
        type: 'info',
        message: '著者情報や公開日が設定されていません',
        impact: 'コンテンツの信頼性と新鮮さが判断しにくくなります',
        solution: '著者情報と公開日をメタデータまたは構造化データで追加してください',
        priority: 'low'
      });
      score -= 3;
    }
    
    return {
      score: Math.max(score, 0),
      issues: issues,
      details: contentAnalysis
    };
    
  } catch (error) {
    console.error('Content quality analysis error:', error);
    return {
      score: 50,
      issues: [{
        type: 'error',
        message: 'コンテンツ品質分析中にエラーが発生しました',
        impact: '技術的な問題により完全な分析ができませんでした',
        solution: 'しばらく時間をおいて再度分析を実行してください',
        priority: 'high'
      }]
    };
  }
}

// 高度なパフォーマンス分析
async function analyzeAdvancedPerformance(page) {
  let score = 100;
  const issues = [];
  
  try {
    // パフォーマンスメトリクスの収集
    const performanceMetrics = await page.evaluate(() => {
      const results = {
        // JavaScript実行時間
        javascript: {
          totalExecutionTime: 0,
          longTasks: [],
          blockingTime: 0
        },
        
        // メモリ使用量
        memory: {
          usedJSHeapSize: 0,
          totalJSHeapSize: 0,
          jsHeapSizeLimit: 0,
          heapUsagePercent: 0
        },
        
        // Third-partyスクリプト
        thirdParty: {
          scripts: [],
          totalSize: 0,
          totalBlockingTime: 0,
          count: 0
        },
        
        // リソースタイミング
        resources: {
          scripts: [],
          stylesheets: [],
          images: [],
          fonts: []
        },
        
        // キャッシュ状況
        cache: {
          cachedResources: 0,
          totalResources: 0,
          cacheHitRate: 0
        },
        
        // レンダリングメトリクス
        rendering: {
          paintTiming: {},
          layoutShifts: 0,
          largestContentfulPaint: 0
        }
      };
      
      // パフォーマンスAPIからデータ収集
      if (performance.memory) {
        results.memory.usedJSHeapSize = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
        results.memory.totalJSHeapSize = Math.round(performance.memory.totalJSHeapSize / 1024 / 1024);
        results.memory.jsHeapSizeLimit = Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024);
        results.memory.heapUsagePercent = Math.round((performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100);
      }
      
      // Long Tasksの検出（50ms以上のタスク）
      const longTaskEntries = performance.getEntriesByType('longtask') || [];
      results.javascript.longTasks = longTaskEntries.map(task => ({
        duration: Math.round(task.duration),
        startTime: Math.round(task.startTime)
      }));
      results.javascript.totalExecutionTime = longTaskEntries.reduce((sum, task) => sum + task.duration, 0);
      results.javascript.blockingTime = longTaskEntries.filter(task => task.duration > 50).reduce((sum, task) => sum + (task.duration - 50), 0);
      
      // リソースタイミングの分析
      const resourceEntries = performance.getEntriesByType('resource');
      const currentDomain = window.location.hostname;
      
      resourceEntries.forEach(resource => {
        const url = new URL(resource.name);
        const isThirdParty = url.hostname !== currentDomain && !url.hostname.includes(currentDomain);
        
        const resourceData = {
          name: resource.name.split('/').pop() || resource.name,
          duration: Math.round(resource.duration),
          size: resource.transferSize || 0,
          isThirdParty: isThirdParty,
          cached: resource.transferSize === 0 && resource.decodedBodySize > 0
        };
        
        if (resource.name.endsWith('.js') || resource.initiatorType === 'script') {
          results.resources.scripts.push(resourceData);
          if (isThirdParty) {
            results.thirdParty.scripts.push({
              ...resourceData,
              domain: url.hostname
            });
            results.thirdParty.totalSize += resourceData.size;
            results.thirdParty.totalBlockingTime += resourceData.duration;
          }
        } else if (resource.name.endsWith('.css') || resource.initiatorType === 'css') {
          results.resources.stylesheets.push(resourceData);
        } else if (resource.initiatorType === 'img') {
          results.resources.images.push(resourceData);
        } else if (resource.name.match(/\.(woff2?|ttf|otf|eot)$/)) {
          results.resources.fonts.push(resourceData);
        }
        
        results.cache.totalResources++;
        if (resourceData.cached) {
          results.cache.cachedResources++;
        }
      });
      
      results.thirdParty.count = results.thirdParty.scripts.length;
      results.cache.cacheHitRate = results.cache.totalResources > 0 
        ? Math.round((results.cache.cachedResources / results.cache.totalResources) * 100)
        : 0;
      
      // ペイントタイミング
      const paintEntries = performance.getEntriesByType('paint');
      paintEntries.forEach(entry => {
        results.rendering.paintTiming[entry.name] = Math.round(entry.startTime);
      });
      
      // レイアウトシフト
      const layoutShiftEntries = performance.getEntriesByType('layout-shift') || [];
      results.rendering.layoutShifts = layoutShiftEntries.reduce((sum, entry) => sum + entry.value, 0);
      
      // LCP
      const lcpEntries = performance.getEntriesByType('largest-contentful-paint') || [];
      if (lcpEntries.length > 0) {
        results.rendering.largestContentfulPaint = Math.round(lcpEntries[lcpEntries.length - 1].startTime);
      }
      
      return results;
    });
    
    // JavaScript実行時間の評価
    if (performanceMetrics.javascript.totalExecutionTime > 1000) {
      issues.push({
        type: 'error',
        message: `JavaScript実行時間が非常に長いです（${Math.round(performanceMetrics.javascript.totalExecutionTime)}ms）`,
        impact: 'メインスレッドがブロックされ、ユーザー操作への応答が遅くなります',
        solution: 'JavaScriptコードを最適化し、重い処理をWeb Workerに移行してください',
        priority: 'critical'
      });
      score -= 30;
    } else if (performanceMetrics.javascript.totalExecutionTime > 500) {
      issues.push({
        type: 'warning',
        message: `JavaScript実行時間が長いです（${Math.round(performanceMetrics.javascript.totalExecutionTime)}ms）`,
        impact: 'ページのインタラクティブ性が低下します',
        solution: 'コード分割、遅延読み込み、非同期処理を検討してください',
        priority: 'high'
      });
      score -= 15;
    }
    
    // Long Tasksの評価
    if (performanceMetrics.javascript.longTasks.length > 5) {
      issues.push({
        type: 'warning',
        message: `長時間実行されるタスクが${performanceMetrics.javascript.longTasks.length}個検出されました`,
        impact: 'ユーザー入力への応答が遅れ、体験が悪化します',
        solution: 'タスクを小さく分割し、requestIdleCallbackやrequestAnimationFrameを活用してください',
        priority: 'high'
      });
      score -= 10;
    }
    
    // メモリ使用量の評価
    if (performanceMetrics.memory.heapUsagePercent > 80) {
      issues.push({
        type: 'error',
        message: `メモリ使用率が非常に高いです（${performanceMetrics.memory.heapUsagePercent}%）`,
        impact: 'メモリリークの可能性があり、ページがクラッシュする危険があります',
        solution: 'イベントリスナーの解除、DOMノードの適切な削除、大量データの最適化を行ってください',
        priority: 'critical'
      });
      score -= 25;
    } else if (performanceMetrics.memory.usedJSHeapSize > 50) {
      issues.push({
        type: 'warning',
        message: `JavaScriptヒープサイズが大きいです（${performanceMetrics.memory.usedJSHeapSize}MB）`,
        impact: '低スペックデバイスでパフォーマンスが低下する可能性があります',
        solution: '不要なオブジェクトの削除、データ構造の最適化を検討してください',
        priority: 'medium'
      });
      score -= 10;
    }
    
    // Third-partyスクリプトの評価
    if (performanceMetrics.thirdParty.count > 10) {
      issues.push({
        type: 'warning',
        message: `サードパーティスクリプトが多すぎます（${performanceMetrics.thirdParty.count}個）`,
        impact: '外部依存により読み込み速度とセキュリティリスクが増加します',
        solution: '必要最小限のサードパーティスクリプトに絞り、遅延読み込みを実装してください',
        priority: 'high'
      });
      score -= 15;
    }
    
    if (performanceMetrics.thirdParty.totalSize > 500 * 1024) {
      issues.push({
        type: 'warning',
        message: `サードパーティスクリプトのサイズが大きいです（${Math.round(performanceMetrics.thirdParty.totalSize / 1024)}KB）`,
        impact: 'ダウンロード時間が増加し、初期表示が遅れます',
        solution: '軽量な代替ライブラリの検討、バンドルサイズの最適化を行ってください',
        priority: 'medium'
      });
      score -= 10;
    }
    
    // キャッシュ効率の評価
    if (performanceMetrics.cache.cacheHitRate < 50 && performanceMetrics.cache.totalResources > 10) {
      issues.push({
        type: 'info',
        message: `キャッシュヒット率が低いです（${performanceMetrics.cache.cacheHitRate}%）`,
        impact: 'リピート訪問時のパフォーマンスが最適化されていません',
        solution: '適切なCache-Controlヘッダーを設定し、ブラウザキャッシュを活用してください',
        priority: 'low'
      });
      score -= 5;
    }
    
    // レンダリングブロッキングリソース
    const blockingScripts = performanceMetrics.resources.scripts.filter(s => !s.async && !s.defer && s.duration > 100);
    if (blockingScripts.length > 0) {
      issues.push({
        type: 'warning',
        message: `レンダリングをブロックするスクリプトが${blockingScripts.length}個あります`,
        impact: '初期表示が遅れ、ユーザーが白い画面を見る時間が長くなります',
        solution: 'スクリプトタグにasyncまたはdefer属性を追加してください',
        priority: 'high'
      });
      score -= blockingScripts.length * 5;
    }
    
    return {
      score: Math.max(score, 0),
      issues: issues,
      details: performanceMetrics
    };
    
  } catch (error) {
    console.error('Advanced performance analysis error:', error);
    return {
      score: 50,
      issues: [{
        type: 'error',
        message: '高度なパフォーマンス分析中にエラーが発生しました',
        impact: '技術的な問題により完全な分析ができませんでした',
        solution: 'しばらく時間をおいて再度分析を実行してください',
        priority: 'high'
      }]
    };
  }
}

// 高度なセキュリティ分析
async function analyzeAdvancedSecurity(page, response) {
  let score = 100;
  const issues = [];
  
  try {
    const securityAnalysis = await page.evaluate(() => {
      const results = {
        // サブリソース完全性（SRI）
        sri: {
          scripts: 0,
          stylesheets: 0,
          protectedScripts: 0,
          protectedStylesheets: 0
        },
        
        // 個人情報検出
        personalData: {
          emails: [],
          phones: [],
          addresses: [],
          socialSecurityNumbers: []
        },
        
        // 外部依存性
        externalDependencies: {
          domains: new Set(),
          cdnUsage: [],
          thirdPartyTrackingScripts: []
        },
        
        // フォームセキュリティ
        formSecurity: {
          forms: 0,
          httpsSubmission: 0,
          autoCompleteOff: 0,
          passwordFields: 0,
          securePasswordFields: 0
        },
        
        // 脆弱性パターン
        vulnerabilityPatterns: {
          inlineStyles: 0,
          inlineScripts: 0,
          evalUsage: false,
          documentWrite: false
        }
      };
      
      // SRI チェック
      const scripts = document.querySelectorAll('script[src]');
      const stylesheets = document.querySelectorAll('link[rel="stylesheet"]');
      
      results.sri.scripts = scripts.length;
      results.sri.stylesheets = stylesheets.length;
      results.sri.protectedScripts = document.querySelectorAll('script[src][integrity]').length;
      results.sri.protectedStylesheets = document.querySelectorAll('link[rel="stylesheet"][integrity]').length;
      
      // 個人情報検出
      const textContent = document.body.textContent || '';
      
      // メールアドレス検出
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const emails = textContent.match(emailRegex) || [];
      results.personalData.emails = [...new Set(emails)];
      
      // 電話番号検出（日本の形式）
      const phoneRegex = /(\d{2,4}-\d{2,4}-\d{4}|\d{3}-\d{4}-\d{4}|0\d{1,4}-\d{1,4}-\d{4})/g;
      const phones = textContent.match(phoneRegex) || [];
      results.personalData.phones = [...new Set(phones)];
      
      // 外部依存性分析
      const allResources = document.querySelectorAll('script[src], link[href], img[src], iframe[src]');
      const currentDomain = window.location.hostname;
      
      allResources.forEach(element => {
        const src = element.src || element.href;
        if (src) {
          try {
            const url = new URL(src);
            if (url.hostname !== currentDomain) {
              results.externalDependencies.domains.add(url.hostname);
              
              // CDN検出
              if (url.hostname.includes('cdn') || url.hostname.includes('cloudflare') || 
                  url.hostname.includes('googleapis') || url.hostname.includes('jquery')) {
                results.externalDependencies.cdnUsage.push(url.hostname);
              }
              
              // トラッキングスクリプト検出
              if (url.hostname.includes('google-analytics') || url.hostname.includes('facebook') ||
                  url.hostname.includes('tracking') || url.hostname.includes('analytics')) {
                results.externalDependencies.thirdPartyTrackingScripts.push(url.hostname);
              }
            }
          } catch {}
        }
      });
      
      results.externalDependencies.domains = Array.from(results.externalDependencies.domains);
      
      // フォームセキュリティ詳細分析
      const forms = document.querySelectorAll('form');
      results.formSecurity.forms = forms.length;
      
      forms.forEach(form => {
        const action = form.action || window.location.href;
        if (action.startsWith('https://')) {
          results.formSecurity.httpsSubmission++;
        }
        
        if (form.getAttribute('autocomplete') === 'off') {
          results.formSecurity.autoCompleteOff++;
        }
        
        const passwordFields = form.querySelectorAll('input[type="password"]');
        results.formSecurity.passwordFields += passwordFields.length;
        
        passwordFields.forEach(field => {
          if (field.getAttribute('autocomplete') === 'new-password' || 
              field.getAttribute('autocomplete') === 'current-password') {
            results.formSecurity.securePasswordFields++;
          }
        });
      });
      
      // 脆弱性パターン検出
      results.vulnerabilityPatterns.inlineStyles = document.querySelectorAll('[style]').length;
      results.vulnerabilityPatterns.inlineScripts = document.querySelectorAll('script:not([src])').length;
      
      // eval, document.write の使用チェック（コード内の文字列検索）
      const allScripts = document.querySelectorAll('script:not([src])');
      allScripts.forEach(script => {
        const content = script.textContent || '';
        if (content.includes('eval(')) {
          results.vulnerabilityPatterns.evalUsage = true;
        }
        if (content.includes('document.write')) {
          results.vulnerabilityPatterns.documentWrite = true;
        }
      });
      
      return results;
    });
    
    // SRI（Subresource Integrity）の評価
    const sriCoverage = securityAnalysis.sri.scripts > 0 
      ? (securityAnalysis.sri.protectedScripts / securityAnalysis.sri.scripts) * 100 
      : 0;
      
    if (securityAnalysis.sri.scripts > 0 && sriCoverage < 50) {
      issues.push({
        type: 'warning',
        message: `外部スクリプトのSRI保護が不十分です（保護率: ${Math.round(sriCoverage)}%）`,
        impact: 'CDNやサードパーティスクリプトが改ざんされた場合、検出できません',
        solution: '重要な外部スクリプトにintegrity属性を追加してください',
        priority: 'medium'
      });
      score -= 15;
    }
    
    // 個人情報露出の評価
    if (securityAnalysis.personalData.emails.length > 0) {
      issues.push({
        type: 'warning',
        message: `メールアドレスが${securityAnalysis.personalData.emails.length}個検出されました`,
        impact: 'スパムやフィッシング攻撃の対象になる可能性があります',
        solution: 'メールアドレスを画像化するか、JavaScriptで動的生成することを検討してください',
        priority: 'medium'
      });
      score -= Math.min(securityAnalysis.personalData.emails.length * 2, 10);
    }
    
    if (securityAnalysis.personalData.phones.length > 0) {
      issues.push({
        type: 'info',
        message: `電話番号が${securityAnalysis.personalData.phones.length}個検出されました`,
        impact: '自動収集の対象となる可能性があります',
        solution: '必要に応じて表示形式を工夫してください',
        priority: 'low'
      });
      score -= 3;
    }
    
    // 外部依存性の評価
    if (securityAnalysis.externalDependencies.domains.length > 10) {
      issues.push({
        type: 'warning',
        message: `多数の外部ドメインに依存しています（${securityAnalysis.externalDependencies.domains.length}個）`,
        impact: '攻撃の対象範囲が広くなり、セキュリティリスクが増加します',
        solution: '必要最小限の外部依存に絞り、信頼できるドメインのみを使用してください',
        priority: 'medium'
      });
      score -= 10;
    }
    
    // トラッキングスクリプトの評価
    if (securityAnalysis.externalDependencies.thirdPartyTrackingScripts.length > 3) {
      issues.push({
        type: 'info',
        message: `多数のトラッキングスクリプトが検出されました（${securityAnalysis.externalDependencies.thirdPartyTrackingScripts.length}個）`,
        impact: 'ユーザープライバシーに影響し、GDPR等の規制に抵触する可能性があります',
        solution: '必要最小限のトラッキングに絞り、適切な同意取得を実装してください',
        priority: 'medium'
      });
      score -= 8;
    }
    
    // フォームセキュリティの評価
    if (securityAnalysis.formSecurity.forms > 0) {
      const httpsRate = (securityAnalysis.formSecurity.httpsSubmission / securityAnalysis.formSecurity.forms) * 100;
      
      if (httpsRate < 100) {
        issues.push({
          type: 'error',
          message: 'HTTPで送信されるフォームがあります',
          impact: 'フォームデータが平文で送信され、傍受される危険があります',
          solution: 'すべてのフォームをHTTPS経由で送信するよう修正してください',
          priority: 'critical'
        });
        score -= 25;
      }
      
      if (securityAnalysis.formSecurity.passwordFields > 0) {
        const securePasswordRate = (securityAnalysis.formSecurity.securePasswordFields / securityAnalysis.formSecurity.passwordFields) * 100;
        
        if (securePasswordRate < 100) {
          issues.push({
            type: 'warning',
            message: 'パスワードフィールドのautocomplete属性が適切に設定されていません',
            impact: 'パスワード管理が適切に動作しない可能性があります',
            solution: 'パスワードフィールドにautocomplete="current-password"または"new-password"を設定してください',
            priority: 'medium'
          });
          score -= 8;
        }
      }
    }
    
    // 脆弱性パターンの評価
    if (securityAnalysis.vulnerabilityPatterns.evalUsage) {
      issues.push({
        type: 'error',
        message: 'eval()関数の使用が検出されました',
        impact: 'コードインジェクション攻撃の脆弱性を作り出す可能性があります',
        solution: 'eval()の使用を避け、安全な代替手段を使用してください',
        priority: 'critical'
      });
      score -= 30;
    }
    
    if (securityAnalysis.vulnerabilityPatterns.documentWrite) {
      issues.push({
        type: 'warning',
        message: 'document.write()の使用が検出されました',
        impact: 'XSS攻撃の脆弱性を作り出す可能性があります',
        solution: 'document.write()の代わりに安全なDOM操作メソッドを使用してください',
        priority: 'high'
      });
      score -= 15;
    }
    
    if (securityAnalysis.vulnerabilityPatterns.inlineScripts > 5) {
      issues.push({
        type: 'info',
        message: `インラインスクリプトが多数使用されています（${securityAnalysis.vulnerabilityPatterns.inlineScripts}個）`,
        impact: 'CSP（Content Security Policy）の効果的な実装が困難になります',
        solution: 'インラインスクリプトを外部ファイルに移行することを検討してください',
        priority: 'low'
      });
      score -= 5;
    }
    
    return {
      score: Math.max(score, 0),
      issues: issues,
      details: securityAnalysis
    };
    
  } catch (error) {
    console.error('Advanced security analysis error:', error);
    return {
      score: 50,
      issues: [{
        type: 'error',
        message: '高度なセキュリティ分析中にエラーが発生しました',
        impact: '技術的な問題により完全な分析ができませんでした',
        solution: 'しばらく時間をおいて再度分析を実行してください',
        priority: 'high'
      }]
    };
  }
}

// グレード計算
function getGrade(score) {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

// 優先順位付き改修提案を生成
function generatePrioritizedRecommendations(results) {
  const allIssues = [];
  
  // すべてのカテゴリから問題を収集
  Object.entries(results).forEach(([category, data]) => {
    if (data.issues && Array.isArray(data.issues)) {
      data.issues.forEach(issue => {
        allIssues.push({
          ...issue,
          category: category,
          categoryName: getCategoryName(category),
          score: data.score,
          // ビジネスインパクトスコアを計算
          impactScore: calculateImpactScore(issue, category, data.score)
        });
      });
    }
  });
  
  // 優先度でソート（critical > high > medium > low）
  // 同じ優先度の場合はインパクトスコアでソート
  allIssues.sort((a, b) => {
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
    const aPriority = priorityOrder[a.priority] || 0;
    const bPriority = priorityOrder[b.priority] || 0;
    
    if (aPriority !== bPriority) {
      return bPriority - aPriority;
    }
    
    return b.impactScore - a.impactScore;
  });
  
  // 改修提案を構造化
  const recommendations = {
    // 緊急対応が必要な項目（24時間以内）
    immediate: allIssues.filter(issue => issue.priority === 'critical').slice(0, 5),
    
    // 短期対応項目（1週間以内）
    shortTerm: allIssues.filter(issue => issue.priority === 'high').slice(0, 10),
    
    // 中期対応項目（1ヶ月以内）
    mediumTerm: allIssues.filter(issue => issue.priority === 'medium').slice(0, 15),
    
    // 長期対応項目（3ヶ月以内）
    longTerm: allIssues.filter(issue => issue.priority === 'low' || issue.priority === 'info').slice(0, 20),
    
    // 改修によるスコア改善予測
    potentialImprovement: calculatePotentialImprovement(allIssues, results),
    
    // カテゴリ別の改修優先度
    categoryPriority: determineCategoryPriority(results),
    
    // 具体的な改修ロードマップ
    roadmap: generateRoadmap(allIssues, results),
    
    // 総問題数
    totalIssues: allIssues.length,
    
    // ROI（投資対効果）の高い改修トップ10
    highROI: selectHighROIImprovements(allIssues)
  };
  
  return recommendations;
}

// カテゴリ名を日本語で取得
function getCategoryName(category) {
  const names = {
    seo: 'SEO',
    performance: 'パフォーマンス',
    security: 'セキュリティ',
    accessibility: 'アクセシビリティ',
    mobile: 'モバイル対応',
    contentQuality: 'コンテンツ品質',
    advancedPerformance: '高度なパフォーマンス',
    advancedSecurity: '高度なセキュリティ',
    businessMetrics: 'ビジネス指標'
  };
  return names[category] || category;
}

// ビジネスインパクトスコアを計算
function calculateImpactScore(issue, category, categoryScore) {
  let score = 0;
  
  // 優先度による基本スコア
  const priorityScores = { critical: 100, high: 75, medium: 50, low: 25, info: 10 };
  score += priorityScores[issue.priority] || 0;
  
  // カテゴリの重要度
  const categoryWeights = {
    security: 1.5,    // セキュリティは最重要
    performance: 1.3, // パフォーマンスはUXに直結
    seo: 1.2,         // SEOは集客に影響
    mobile: 1.1,      // モバイルは必須
    accessibility: 1.0 // アクセシビリティは法的要件
  };
  score *= categoryWeights[category] || 1.0;
  
  // 現在のカテゴリスコアが低いほど改善の価値が高い
  score *= (100 - categoryScore) / 100;
  
  return Math.round(score);
}

// 改善による潜在的スコアアップを計算
function calculatePotentialImprovement(issues, results) {
  const improvements = {};
  
  Object.keys(results).forEach(category => {
    const categoryIssues = issues.filter(issue => issue.category === category);
    let potentialPoints = 0;
    
    // 各問題の修正による予想スコアアップを合計
    categoryIssues.forEach(issue => {
      if (issue.priority === 'critical') potentialPoints += 15;
      else if (issue.priority === 'high') potentialPoints += 10;
      else if (issue.priority === 'medium') potentialPoints += 5;
      else if (issue.priority === 'low') potentialPoints += 2;
    });
    
    improvements[category] = {
      currentScore: results[category].score,
      potentialScore: Math.min(100, results[category].score + potentialPoints),
      improvement: potentialPoints
    };
  });
  
  return improvements;
}

// カテゴリの改修優先度を決定
function determineCategoryPriority(results) {
  const categories = Object.entries(results)
    .map(([name, data]) => ({
      name: getCategoryName(name),
      score: data.score,
      criticalIssues: data.issues?.filter(i => i.priority === 'critical').length || 0,
      highIssues: data.issues?.filter(i => i.priority === 'high').length || 0,
      totalIssues: data.issues?.length || 0
    }))
    .sort((a, b) => {
      // クリティカルな問題が多いカテゴリを優先
      if (a.criticalIssues !== b.criticalIssues) {
        return b.criticalIssues - a.criticalIssues;
      }
      // 次にスコアが低いカテゴリを優先
      return a.score - b.score;
    });
  
  return categories;
}

// 具体的な改修ロードマップを生成
function generateRoadmap(issues, results) {
  return {
    phase1: {
      title: '第1フェーズ: 緊急対応（1週間）',
      description: 'セキュリティとユーザビリティの重大な問題を解決',
      tasks: issues.filter(i => i.priority === 'critical').slice(0, 5).map(formatTask),
      estimatedHours: 20,
      expectedImprovement: '総合スコア +10-15点'
    },
    phase2: {
      title: '第2フェーズ: 基本改善（2-3週間）',
      description: 'SEOとパフォーマンスの主要問題を解決',
      tasks: issues.filter(i => i.priority === 'high' && (i.category === 'seo' || i.category === 'performance')).slice(0, 8).map(formatTask),
      estimatedHours: 40,
      expectedImprovement: '総合スコア +15-20点'
    },
    phase3: {
      title: '第3フェーズ: 品質向上（1-2ヶ月）',
      description: 'アクセシビリティとモバイル対応の改善',
      tasks: issues.filter(i => i.priority === 'medium').slice(0, 10).map(formatTask),
      estimatedHours: 60,
      expectedImprovement: '総合スコア +10-15点'
    },
    phase4: {
      title: '第4フェーズ: 最適化（2-3ヶ月）',
      description: '細かな調整と継続的な改善',
      tasks: issues.filter(i => i.priority === 'low' || i.priority === 'info').slice(0, 10).map(formatTask),
      estimatedHours: 30,
      expectedImprovement: '総合スコア +5-10点'
    }
  };
}

// タスクをフォーマット
function formatTask(issue) {
  return {
    category: getCategoryName(issue.category),
    task: issue.message,
    solution: issue.solution,
    difficulty: estimateDifficulty(issue),
    estimatedHours: estimateHours(issue)
  };
}

// 実装難易度を推定
function estimateDifficulty(issue) {
  if (issue.solution?.includes('設定') || issue.solution?.includes('追加')) return '簡単';
  if (issue.solution?.includes('実装') || issue.solution?.includes('変更')) return '中程度';
  if (issue.solution?.includes('再構築') || issue.solution?.includes('移行')) return '困難';
  return '中程度';
}

// 作業時間を推定
function estimateHours(issue) {
  const hours = {
    critical: { '簡単': 2, '中程度': 4, '困難': 8 },
    high: { '簡単': 1, '中程度': 3, '困難': 6 },
    medium: { '簡単': 0.5, '中程度': 2, '困難': 4 },
    low: { '簡単': 0.25, '中程度': 1, '困難': 2 }
  };
  
  const difficulty = estimateDifficulty(issue);
  return hours[issue.priority]?.[difficulty] || 1;
}

// ROIの高い改修を選出
function selectHighROIImprovements(issues) {
  return issues
    .map(issue => ({
      ...issue,
      roi: calculateROI(issue)
    }))
    .sort((a, b) => b.roi - a.roi)
    .slice(0, 10)
    .map(issue => ({
      category: getCategoryName(issue.category),
      improvement: issue.message,
      solution: issue.solution,
      estimatedHours: estimateHours(issue),
      expectedImpact: describeImpact(issue),
      roiScore: issue.roi
    }));
}

// ROIスコアを計算
function calculateROI(issue) {
  const impactScore = calculateImpactScore(issue, issue.category, issue.score);
  const effort = estimateHours(issue);
  return Math.round(impactScore / effort * 10);
}

// 影響を説明
function describeImpact(issue) {
  const impacts = {
    critical: '即座にユーザー体験とビジネス指標が改善',
    high: '短期間で明確な改善効果が期待できる',
    medium: '中期的にサイト品質が向上',
    low: '長期的な最適化に貢献',
    info: '将来的な問題を予防'
  };
  return impacts[issue.priority] || '改善効果あり';
}

// ビジネス指標分析
async function analyzeBusinessMetrics(page, response) {
  let score = 100;
  const issues = [];
  
  try {
    const businessAnalysis = await page.evaluate(() => {
      const results = {
        // コンバージョン最適化
        conversion: {
          ctaButtons: [],
          forms: [],
          contactInfo: {
            phone: null,
            email: null,
            address: null
          },
          trustSignals: {
            testimonials: 0,
            certifications: 0,
            reviews: 0,
            securityBadges: 0
          }
        },
        
        // 信頼性指標
        trust: {
          aboutPage: false,
          privacyPolicy: false,
          termsOfService: false,
          contactPage: false,
          socialProof: [],
          companyInfo: {
            founded: null,
            location: null,
            registration: null
          }
        },
        
        // ソーシャル統合
        social: {
          shareButtons: [],
          socialMediaLinks: [],
          ogTags: {
            title: null,
            description: null,
            image: null,
            type: null
          },
          twitterCards: {
            card: null,
            title: null,
            description: null,
            image: null
          }
        },
        
        // ユーザーエクスペリエンス
        userExperience: {
          searchFunctionality: false,
          chatWidget: false,
          helpCenter: false,
          faq: false,
          newsletter: false,
          breadcrumbs: false,
          siteSearch: false
        },
        
        // 技術的SEO
        technicalSeo: {
          structuredData: [],
          canonicalUrl: null,
          hreflang: [],
          sitemap: null,
          robotsTxt: null
        }
      };
      
      // CTA ボタンの分析
      const ctaSelectors = [
        'button', 'input[type="submit"]', 'input[type="button"]',
        'a[class*="cta"]', 'a[class*="button"]', 'a[class*="btn"]',
        '[class*="call-to-action"]', '[role="button"]'
      ];
      
      ctaSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          const text = el.textContent.trim().toLowerCase();
          const classes = el.className.toLowerCase();
          
          if (text && (
            text.includes('購入') || text.includes('申込') || text.includes('登録') || 
            text.includes('問合せ') || text.includes('お問い合わせ') || text.includes('contact') ||
            text.includes('今すぐ') || text.includes('無料') || text.includes('資料請求') ||
            text.includes('ダウンロード') || text.includes('get started') || text.includes('sign up') ||
            classes.includes('cta') || classes.includes('primary')
          )) {
            results.conversion.ctaButtons.push({
              text: el.textContent.trim(),
              position: {
                top: el.getBoundingClientRect().top,
                visible: el.getBoundingClientRect().top < window.innerHeight
              },
              style: {
                backgroundColor: getComputedStyle(el).backgroundColor,
                color: getComputedStyle(el).color,
                size: getComputedStyle(el).fontSize
              }
            });
          }
        });
      });
      
      // フォームの分析
      const forms = document.querySelectorAll('form');
      forms.forEach(form => {
        const inputs = form.querySelectorAll('input, textarea, select');
        const submitButton = form.querySelector('input[type="submit"], button[type="submit"], button:not([type])');
        
        results.conversion.forms.push({
          fieldCount: inputs.length,
          hasSubmitButton: !!submitButton,
          method: form.method || 'GET',
          action: form.action || '',
          requiredFields: form.querySelectorAll('[required]').length,
          hasLabels: form.querySelectorAll('label').length >= inputs.length * 0.8
        });
      });
      
      // 連絡先情報の取得
      const textContent = document.body.textContent;
      const phoneRegex = /(\+?[0-9]{1,4}[-.\s]?)?(\([0-9]{1,4}\)[-.\s]?)?[0-9]{1,4}[-.\s]?[0-9]{1,4}[-.\s]?[0-9]{1,9}/g;
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      
      const phoneMatches = textContent.match(phoneRegex);
      const emailMatches = textContent.match(emailRegex);
      
      if (phoneMatches && phoneMatches.length > 0) {
        results.conversion.contactInfo.phone = phoneMatches[0];
      }
      
      if (emailMatches && emailMatches.length > 0) {
        results.conversion.contactInfo.email = emailMatches[0];
      }
      
      // 信頼性シグナルの分析
      const testimonialSelectors = [
        '[class*="testimonial"]', '[class*="review"]', '[class*="feedback"]',
        '[class*="customer"]', '[class*="client"]'
      ];
      
      testimonialSelectors.forEach(selector => {
        results.conversion.trustSignals.testimonials += document.querySelectorAll(selector).length;
      });
      
      // 認証・セキュリティバッジ
      const securityKeywords = ['ssl', 'secure', 'verified', 'certified', 'trust', 'guarantee'];
      const images = document.querySelectorAll('img');
      images.forEach(img => {
        const alt = (img.alt || '').toLowerCase();
        const src = (img.src || '').toLowerCase();
        
        if (securityKeywords.some(keyword => alt.includes(keyword) || src.includes(keyword))) {
          results.conversion.trustSignals.securityBadges++;
        }
      });
      
      // 信頼性ページの確認
      const links = document.querySelectorAll('a');
      links.forEach(link => {
        const href = (link.href || '').toLowerCase();
        const text = (link.textContent || '').toLowerCase();
        
        if (text.includes('about') || text.includes('会社概要') || text.includes('私たちについて') || 
            href.includes('about')) {
          results.trust.aboutPage = true;
        }
        
        if (text.includes('privacy') || text.includes('プライバシー') || text.includes('個人情報') ||
            href.includes('privacy')) {
          results.trust.privacyPolicy = true;
        }
        
        if (text.includes('terms') || text.includes('利用規約') || text.includes('規約') ||
            href.includes('terms')) {
          results.trust.termsOfService = true;
        }
        
        if (text.includes('contact') || text.includes('お問い合わせ') || text.includes('連絡') ||
            href.includes('contact')) {
          results.trust.contactPage = true;
        }
      });
      
      // ソーシャルメディアリンク
      const socialDomains = ['facebook.com', 'twitter.com', 'instagram.com', 'linkedin.com', 'youtube.com', 'tiktok.com'];
      links.forEach(link => {
        const href = link.href || '';
        socialDomains.forEach(domain => {
          if (href.includes(domain)) {
            results.social.socialMediaLinks.push({
              platform: domain.split('.')[0],
              url: href
            });
          }
        });
      });
      
      // シェアボタン
      const shareButtons = document.querySelectorAll('[class*="share"], [class*="social"]');
      shareButtons.forEach(button => {
        if (button.textContent.toLowerCase().includes('share') || 
            button.textContent.toLowerCase().includes('シェア')) {
          results.social.shareButtons.push({
            text: button.textContent.trim(),
            platform: 'unknown'
          });
        }
      });
      
      // OGタグの取得
      const ogTitle = document.querySelector('meta[property="og:title"]');
      const ogDescription = document.querySelector('meta[property="og:description"]');
      const ogImage = document.querySelector('meta[property="og:image"]');
      const ogType = document.querySelector('meta[property="og:type"]');
      
      if (ogTitle) results.social.ogTags.title = ogTitle.getAttribute('content');
      if (ogDescription) results.social.ogTags.description = ogDescription.getAttribute('content');
      if (ogImage) results.social.ogTags.image = ogImage.getAttribute('content');
      if (ogType) results.social.ogTags.type = ogType.getAttribute('content');
      
      // Twitter Cards
      const twitterCard = document.querySelector('meta[name="twitter:card"]');
      const twitterTitle = document.querySelector('meta[name="twitter:title"]');
      const twitterDescription = document.querySelector('meta[name="twitter:description"]');
      const twitterImage = document.querySelector('meta[name="twitter:image"]');
      
      if (twitterCard) results.social.twitterCards.card = twitterCard.getAttribute('content');
      if (twitterTitle) results.social.twitterCards.title = twitterTitle.getAttribute('content');
      if (twitterDescription) results.social.twitterCards.description = twitterDescription.getAttribute('content');
      if (twitterImage) results.social.twitterCards.image = twitterImage.getAttribute('content');
      
      // UX機能の確認
      results.userExperience.searchFunctionality = !!(
        document.querySelector('input[type="search"]') ||
        document.querySelector('[role="search"]') ||
        document.querySelector('[placeholder*="検索"]') ||
        document.querySelector('[placeholder*="search"]')
      );
      
      results.userExperience.chatWidget = !!(
        document.querySelector('[class*="chat"]') ||
        document.querySelector('[class*="messenger"]') ||
        document.querySelector('[class*="support"]')
      );
      
      results.userExperience.newsletter = !!(
        document.querySelector('[class*="newsletter"]') ||
        document.querySelector('[class*="subscribe"]') ||
        document.querySelector('input[type="email"][placeholder*="メール"]')
      );
      
      results.userExperience.breadcrumbs = !!(
        document.querySelector('[class*="breadcrumb"]') ||
        document.querySelector('nav[aria-label*="breadcrumb"]')
      );
      
      // 構造化データの確認
      const structuredDataScripts = document.querySelectorAll('script[type="application/ld+json"]');
      structuredDataScripts.forEach(script => {
        try {
          const data = JSON.parse(script.textContent);
          results.technicalSeo.structuredData.push({
            type: data['@type'] || 'Unknown',
            context: data['@context'] || ''
          });
        } catch (e) {
          // JSONパース失敗は無視
        }
      });
      
      // Canonical URL
      const canonical = document.querySelector('link[rel="canonical"]');
      if (canonical) {
        results.technicalSeo.canonicalUrl = canonical.getAttribute('href');
      }
      
      // Hreflang
      const hreflangLinks = document.querySelectorAll('link[rel="alternate"][hreflang]');
      hreflangLinks.forEach(link => {
        results.technicalSeo.hreflang.push({
          lang: link.getAttribute('hreflang'),
          href: link.getAttribute('href')
        });
      });
      
      return results;
    });

    // CTAの分析と評価
    if (businessAnalysis.conversion.ctaButtons.length === 0) {
      score -= 20;
      issues.push({
        type: 'error',
        message: 'CTA（Call to Action）ボタンが見つかりません',
        impact: 'ユーザーの行動を促すボタンがないため、コンバージョン率が低下します',
        solution: '「お問い合わせ」「資料請求」「購入」などの明確なCTAボタンを配置してください',
        priority: 'critical',
        location: {
          section: 'ヘッダー・メインコンテンツ・フッター',
          element: 'CTAボタン',
          action: '目立つ位置にアクションボタンを追加',
          code: '<button class="cta-button primary">お問い合わせ</button>',
          examples: [
            'ヘッダーの右上に「お問い合わせ」ボタン',
            'メインビジュアル下に「無料相談」ボタン',
            'サービス説明後に「詳しく見る」ボタン',
            'フッター上部に「今すぐ始める」ボタン'
          ],
          bestPractices: [
            '目立つ色（コントラスト比4.5:1以上）',
            'アクション指向の文言（動詞で始める）',
            '適切なサイズ（44px以上）',
            'ファーストビュー内に1つ以上配置'
          ]
        }
      });
    } else if (businessAnalysis.conversion.ctaButtons.length < 2) {
      score -= 10;
      issues.push({
        type: 'warning',
        message: 'CTAボタンの数が少ない可能性があります',
        impact: 'コンバージョンの機会を逃している可能性があります',
        solution: 'ページの適切な位置に複数のCTAボタンを配置することを検討してください',
        priority: 'medium'
      });
    }

    // フォームの分析
    if (businessAnalysis.conversion.forms.length === 0) {
      score -= 15;
      issues.push({
        type: 'warning',
        message: 'お問い合わせフォームが見つかりません',
        impact: 'ユーザーが直接連絡を取る手段が限定されます',
        solution: 'お問い合わせフォームの設置を検討してください',
        priority: 'medium'
      });
    } else {
      const longForms = businessAnalysis.conversion.forms.filter(form => form.fieldCount > 5);
      if (longForms.length > 0) {
        score -= 8;
        issues.push({
          type: 'warning',
          message: '入力項目が多いフォームがあります',
          impact: 'フォーム入力の負担が大きく、途中離脱率が高くなる可能性があります',
          solution: '必須項目を最小限に絞り、任意項目を明確に分けてください',
          priority: 'medium'
        });
      }
    }

    // 連絡先情報の確認
    if (!businessAnalysis.conversion.contactInfo.phone && !businessAnalysis.conversion.contactInfo.email) {
      score -= 15;
      issues.push({
        type: 'error',
        message: '連絡先情報が見つかりません',
        impact: 'ユーザーが直接連絡を取る方法がわからず、信頼性が低下します',
        solution: '電話番号やメールアドレスを明確に表示してください',
        priority: 'high'
      });
    }

    // 信頼性要素の評価
    const trustElements = [
      businessAnalysis.trust.aboutPage,
      businessAnalysis.trust.privacyPolicy,
      businessAnalysis.trust.termsOfService,
      businessAnalysis.trust.contactPage
    ];
    const trustElementCount = trustElements.filter(Boolean).length;
    
    if (trustElementCount < 2) {
      score -= 20;
      issues.push({
        type: 'error',
        message: '信頼性を示すページが不足しています',
        impact: 'ユーザーの信頼を得ることが困難で、コンバージョン率に影響します',
        solution: '会社概要、プライバシーポリシー、利用規約、お問い合わせページを整備してください',
        priority: 'high'
      });
    } else if (trustElementCount < 4) {
      score -= 10;
      issues.push({
        type: 'warning',
        message: '一部の信頼性ページが不足しています',
        impact: 'ユーザーの信頼性向上のため、追加のページ整備が推奨されます',
        solution: '不足している信頼性ページ（会社概要、プライバシーポリシーなど）を追加してください',
        priority: 'medium'
      });
    }

    // ソーシャルメディア統合の評価
    if (businessAnalysis.social.socialMediaLinks.length === 0) {
      score -= 10;
      issues.push({
        type: 'info',
        message: 'ソーシャルメディアへのリンクがありません',
        impact: 'ブランドの認知度向上とエンゲージメントの機会を逃しています',
        solution: '主要なソーシャルメディアプラットフォームへのリンクを追加してください',
        priority: 'low'
      });
    }

    // OGタグの評価
    const ogTagCount = Object.values(businessAnalysis.social.ogTags).filter(Boolean).length;
    if (ogTagCount < 3) {
      score -= 12;
      issues.push({
        type: 'warning',
        message: 'Open Graphタグが不完全です',
        impact: 'ソーシャルメディアでのシェア時の表示品質が低下します',
        solution: 'og:title、og:description、og:imageの設定を完了してください',
        priority: 'medium'
      });
    }

    // 構造化データの評価
    if (businessAnalysis.technicalSeo.structuredData.length === 0) {
      score -= 8;
      issues.push({
        type: 'info',
        message: '構造化データ（JSON-LD）が設定されていません',
        impact: '検索結果でのリッチスニペット表示の機会を逃しています',
        solution: 'Schema.orgの構造化データを実装してください',
        priority: 'low'
      });
    }

    // UX機能の評価
    const uxFeatures = [
      businessAnalysis.userExperience.searchFunctionality,
      businessAnalysis.userExperience.newsletter,
      businessAnalysis.userExperience.breadcrumbs
    ];
    const uxFeatureCount = uxFeatures.filter(Boolean).length;
    
    if (uxFeatureCount < 2) {
      score -= 8;
      issues.push({
        type: 'info',
        message: 'ユーザビリティ向上機能が不足しています',
        impact: 'ユーザーの利便性とサイト内回遊率の向上余地があります',
        solution: 'サイト内検索、メルマガ登録、パンくずリストなどの機能追加を検討してください',
        priority: 'low'
      });
    }

    return {
      score: Math.max(score, 0),
      issues: issues,
      details: businessAnalysis
    };

  } catch (error) {
    console.error('Business metrics analysis error:', error);
    return {
      score: 0,
      issues: [{
        type: 'error',
        message: 'ビジネス指標分析中にエラーが発生しました',
        impact: 'ビジネス指標の分析ができませんでした',
        solution: 'ページの読み込みを待ってから再度お試しください',
        priority: 'medium'
      }],
      details: {}
    };
  }
}

// PDFレポート生成関数
async function generatePDFReport(analysis) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const margin = 20;
  let yPosition = margin;
  
  // フォント設定
  doc.setFont('helvetica', 'normal');
  
  // ヘッダー
  doc.setFontSize(20);
  doc.text('Website Analysis Report', margin, yPosition);
  yPosition += 15;
  
  doc.setFontSize(12);
  doc.text(`URL: ${analysis.url}`, margin, yPosition);
  yPosition += 10;
  doc.text(`Analysis ID: ${analysis.id}`, margin, yPosition);
  yPosition += 10;
  doc.text(`Date: ${new Date(analysis.startedAt).toLocaleString('ja-JP')}`, margin, yPosition);
  yPosition += 20;
  
  // 総合スコア
  doc.setFontSize(16);
  doc.text('Overall Score', margin, yPosition);
  yPosition += 15;
  
  doc.setFontSize(24);
  doc.text(`${analysis.results.overall.score} (Grade ${analysis.results.overall.grade})`, margin, yPosition);
  yPosition += 20;
  
  // 各カテゴリのスコア
  const categories = [
    { name: 'SEO Analysis', key: 'seo' },
    { name: 'Performance', key: 'performance' },
    { name: 'Security', key: 'security' },
    { name: 'Accessibility', key: 'accessibility' },
    { name: 'Mobile Compatibility', key: 'mobile' }
  ];
  
  doc.setFontSize(14);
  doc.text('Category Scores', margin, yPosition);
  yPosition += 15;
  
  doc.setFontSize(12);
  categories.forEach(category => {
    if (yPosition > 250) {
      doc.addPage();
      yPosition = margin;
    }
    
    const score = analysis.results[category.key].score;
    doc.text(`${category.name}: ${score}/100`, margin, yPosition);
    yPosition += 8;
  });
  
  // SEOの詳細問題
  if (analysis.results.seo.issues.length > 0) {
    yPosition += 10;
    if (yPosition > 240) {
      doc.addPage();
      yPosition = margin;
    }
    
    doc.setFontSize(14);
    doc.text('SEO Issues', margin, yPosition);
    yPosition += 10;
    
    doc.setFontSize(10);
    analysis.results.seo.issues.slice(0, 10).forEach(issue => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = margin;
      }
      doc.text(`• ${issue.message}`, margin, yPosition);
      yPosition += 6;
    });
  }
  
  // パフォーマンス詳細
  yPosition += 10;
  if (yPosition > 240) {
    doc.addPage();
    yPosition = margin;
  }
  
  doc.setFontSize(14);
  doc.text('Performance Details', margin, yPosition);
  yPosition += 10;
  
  doc.setFontSize(10);
  if (analysis.results.performance.loadTime !== null) {
    doc.text(`Load Time: ${analysis.results.performance.loadTime.toFixed(2)} seconds`, margin, yPosition);
    yPosition += 6;
  }
  if (analysis.results.performance.firstContentfulPaint !== null) {
    doc.text(`First Contentful Paint: ${analysis.results.performance.firstContentfulPaint.toFixed(2)} seconds`, margin, yPosition);
  }
  
  return doc.output('arraybuffer');
}

// CSV生成関数
function generateCSVReport(analysis) {
  const headers = [
    'Category',
    'Score',
    'Details'
  ];
  
  const rows = [
    ['Overall', analysis.results.overall.score, `Grade ${analysis.results.overall.grade}`],
    ['SEO', analysis.results.seo.score, `Issues: ${analysis.results.seo.issues.length}`],
    ['Performance', analysis.results.performance.score, `Load Time: ${analysis.results.performance.loadTime.toFixed(2)}s`],
    ['Security', analysis.results.security.score, `HTTPS: ${analysis.results.security.httpsUsage ? 'Yes' : 'No'}`],
    ['Accessibility', analysis.results.accessibility.score, `WCAG Level: ${analysis.results.accessibility.wcagLevel}`],
    ['Mobile', analysis.results.mobile.score, `Responsive: ${analysis.results.mobile.isResponsive ? 'Yes' : 'No'}`]
  ];
  
  // メタデータ
  const metadata = [
    ['URL', analysis.url],
    ['Analysis ID', analysis.id],
    ['Date', new Date(analysis.startedAt).toLocaleString('ja-JP')],
    [''],
    headers
  ];
  
  const allRows = [...metadata, ...rows];
  
  // SEO問題の詳細
  if (analysis.results.seo.issues.length > 0) {
    allRows.push(['']);
    allRows.push(['SEO Issues']);
    analysis.results.seo.issues.forEach(issue => {
      allRows.push([issue.type, issue.message]);
    });
  }
  
  return allRows.map(row => 
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  ).join('\n');
}

// データベース初期化とサーバー起動
async function startServer() {
  try {
    // データベース接続テスト
    isDatabaseConnected = await database.testConnection();
    
    if (isDatabaseConnected) {
      // データベース初期化
      await database.initDatabase();
      console.log('📊 Database successfully initialized');
    } else {
      console.log('⚠️  Database connection failed, using in-memory storage');
    }
    
    app.listen(PORT, () => {
      console.log(`✅ Backend server is running on http://localhost:${PORT}`);
      console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🚀 Analysis API: http://localhost:${PORT}/api/analysis/start`);
      console.log(`📄 PDF/CSV Export: http://localhost:${PORT}/api/analysis/:id/pdf|csv`);
      console.log(`📊 Database: ${isDatabaseConnected ? 'PostgreSQL' : 'In-memory'}`);
    });
    
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
}

// サーバー起動
startServer();