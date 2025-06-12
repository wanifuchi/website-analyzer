const axios = require('axios');
const cheerio = require('cheerio');

// 軽量で確実なウェブサイト分析エンジン
class SimpleWebAnalyzer {
  constructor() {
    this.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  }

  async analyzeWebsite(url) {
    console.log(`🔍 Starting simple analysis for: ${url}`);
    
    try {
      // ページのHTMLを取得
      const response = await axios.get(url, {
        headers: { 'User-Agent': this.userAgent },
        timeout: 30000,
        maxRedirects: 5
      });

      const html = response.data;
      const $ = cheerio.load(html);
      const startTime = Date.now();

      // 基本情報
      const pageInfo = {
        url: response.request.res.responseUrl || url,
        statusCode: response.status,
        contentLength: html.length,
        responseTime: Date.now() - startTime
      };

      // 分析を実行
      const seoResults = this.analyzeSEO($, pageInfo);
      const performanceResults = this.analyzePerformance($, pageInfo);
      const securityResults = this.analyzeSecurity($, pageInfo);
      const accessibilityResults = this.analyzeAccessibility($, pageInfo);
      const mobileResults = this.analyzeMobile($, pageInfo);

      // 総合スコア計算
      const overallScore = Math.round((
        seoResults.score + 
        performanceResults.score + 
        securityResults.score + 
        accessibilityResults.score + 
        mobileResults.score
      ) / 5);

      const grade = this.getGrade(overallScore);

      return {
        overall: { score: overallScore, grade },
        seo: seoResults,
        performance: performanceResults,
        security: securityResults,
        accessibility: accessibilityResults,
        mobile: mobileResults,
        pageInfo
      };

    } catch (error) {
      console.error(`❌ Analysis failed for ${url}:`, error.message);
      throw new Error(`サイトの分析に失敗しました: ${error.message}`);
    }
  }

  analyzeSEO($, pageInfo) {
    const issues = [];
    let score = 100;

    // タイトルタグ分析
    const title = $('title').text().trim();
    if (!title) {
      issues.push({ type: 'error', message: 'タイトルタグが見つかりません' });
      score -= 20;
    } else if (title.length < 30) {
      issues.push({ type: 'warning', message: `タイトルが短すぎます (${title.length}文字)` });
      score -= 10;
    } else if (title.length > 60) {
      issues.push({ type: 'warning', message: `タイトルが長すぎます (${title.length}文字)` });
      score -= 5;
    }

    // メタディスクリプション分析
    const description = $('meta[name="description"]').attr('content');
    if (!description) {
      issues.push({ type: 'error', message: 'メタディスクリプションが見つかりません' });
      score -= 15;
    } else if (description.length < 120) {
      issues.push({ type: 'warning', message: `メタディスクリプションが短すぎます (${description.length}文字)` });
      score -= 10;
    } else if (description.length > 160) {
      issues.push({ type: 'warning', message: `メタディスクリプションが長すぎます (${description.length}文字)` });
      score -= 5;
    }

    // 見出し構造分析
    const h1Count = $('h1').length;
    if (h1Count === 0) {
      issues.push({ type: 'error', message: 'H1タグが見つかりません' });
      score -= 15;
    } else if (h1Count > 1) {
      issues.push({ type: 'warning', message: `H1タグが複数あります (${h1Count}個)` });
      score -= 10;
    }

    // 画像のalt属性分析
    const images = $('img');
    const imagesWithoutAlt = images.filter((i, img) => !$(img).attr('alt')).length;
    if (imagesWithoutAlt > 0) {
      issues.push({ type: 'warning', message: `${imagesWithoutAlt}個の画像にalt属性がありません` });
      score -= Math.min(imagesWithoutAlt * 2, 20);
    }

    return {
      score: Math.max(score, 0),
      issues,
      details: {
        title: title || '未設定',
        titleLength: title ? title.length : 0,
        description: description || '未設定',
        descriptionLength: description ? description.length : 0,
        h1Count,
        totalImages: images.length,
        imagesWithoutAlt
      }
    };
  }

  analyzePerformance($, pageInfo) {
    const issues = [];
    let score = 100;

    // レスポンスサイズ評価
    if (pageInfo.contentLength > 1000000) { // 1MB以上
      issues.push({ type: 'warning', message: 'ページサイズが大きすぎます (1MB以上)' });
      score -= 20;
    } else if (pageInfo.contentLength > 500000) { // 500KB以上
      issues.push({ type: 'info', message: 'ページサイズがやや大きめです (500KB以上)' });
      score -= 10;
    }

    // レスポンス時間評価
    if (pageInfo.responseTime > 3000) {
      issues.push({ type: 'warning', message: 'サーバーレスポンスが遅いです (3秒以上)' });
      score -= 15;
    } else if (pageInfo.responseTime > 1000) {
      issues.push({ type: 'info', message: 'サーバーレスポンスがやや遅いです (1秒以上)' });
      score -= 5;
    }

    // CSSファイル数
    const cssFiles = $('link[rel="stylesheet"]').length;
    if (cssFiles > 10) {
      issues.push({ type: 'warning', message: `CSSファイルが多すぎます (${cssFiles}個)` });
      score -= 10;
    }

    // JavaScriptファイル数
    const jsFiles = $('script[src]').length;
    if (jsFiles > 15) {
      issues.push({ type: 'warning', message: `JavaScriptファイルが多すぎます (${jsFiles}個)` });
      score -= 10;
    }

    return {
      score: Math.max(score, 0),
      loadTime: pageInfo.responseTime / 1000,
      firstContentfulPaint: null, // 簡易版では取得不可
      issues,
      details: {
        contentLength: pageInfo.contentLength,
        responseTime: pageInfo.responseTime,
        cssFiles,
        jsFiles
      }
    };
  }

  analyzeSecurity($, pageInfo) {
    const issues = [];
    let score = 100;

    // HTTPS使用確認
    const isHttps = pageInfo.url.startsWith('https://');
    if (!isHttps) {
      issues.push({ type: 'error', message: 'HTTPSが使用されていません' });
      score -= 30;
    }

    // mixedコンテンツチェック
    const httpResources = [];
    $('img, script, link').each((i, elem) => {
      const src = $(elem).attr('src') || $(elem).attr('href');
      if (src && src.startsWith('http://')) {
        httpResources.push(src);
      }
    });

    if (httpResources.length > 0 && isHttps) {
      issues.push({ type: 'warning', message: `Mixed Content: ${httpResources.length}個のHTTPリソースがあります` });
      score -= 15;
    }

    // フォームのaction属性チェック
    const unsecureForms = $('form').filter((i, form) => {
      const action = $(form).attr('action');
      return action && action.startsWith('http://');
    }).length;

    if (unsecureForms > 0) {
      issues.push({ type: 'error', message: `${unsecureForms}個のフォームが非セキュアです` });
      score -= 20;
    }

    return {
      score: Math.max(score, 0),
      httpsUsage: isHttps,
      issues,
      details: {
        protocol: isHttps ? 'HTTPS' : 'HTTP',
        mixedContentCount: httpResources.length,
        unsecureFormsCount: unsecureForms
      }
    };
  }

  analyzeAccessibility($, pageInfo) {
    const issues = [];
    let score = 100;
    let violations = 0;

    // alt属性のない画像
    const imagesWithoutAlt = $('img').filter((i, img) => !$(img).attr('alt')).length;
    if (imagesWithoutAlt > 0) {
      issues.push({ type: 'error', message: `${imagesWithoutAlt}個の画像にalt属性がありません` });
      score -= imagesWithoutAlt * 3;
      violations += imagesWithoutAlt;
    }

    // ラベルのないinput要素
    const unlabeledInputs = $('input').filter((i, input) => {
      const $input = $(input);
      const id = $input.attr('id');
      const hasLabel = id && $(`label[for="${id}"]`).length > 0;
      const hasAriaLabel = $input.attr('aria-label') || $input.attr('aria-labelledby');
      return !hasLabel && !hasAriaLabel;
    }).length;

    if (unlabeledInputs > 0) {
      issues.push({ type: 'error', message: `${unlabeledInputs}個の入力要素にラベルがありません` });
      score -= unlabeledInputs * 5;
      violations += unlabeledInputs;
    }

    // 空のリンク
    const emptyLinks = $('a').filter((i, link) => {
      const $link = $(link);
      return !$link.text().trim() && !$link.attr('aria-label') && !$link.find('img[alt]').length;
    }).length;

    if (emptyLinks > 0) {
      issues.push({ type: 'warning', message: `${emptyLinks}個の空のリンクがあります` });
      score -= emptyLinks * 2;
      violations += emptyLinks;
    }

    // ページの言語設定
    const lang = $('html').attr('lang');
    if (!lang) {
      issues.push({ type: 'warning', message: 'HTMLにlang属性が設定されていません' });
      score -= 10;
      violations += 1;
    }

    return {
      score: Math.max(score, 0),
      wcagLevel: violations === 0 ? 'AAA' : violations < 5 ? 'AA' : 'A',
      violations,
      issues,
      details: {
        imagesWithoutAlt,
        unlabeledInputs,
        emptyLinks,
        hasLangAttribute: !!lang
      }
    };
  }

  analyzeMobile($, pageInfo) {
    const issues = [];
    let score = 100;

    // ビューポートメタタグ
    const viewport = $('meta[name="viewport"]').attr('content');
    const hasViewportMeta = !!viewport;
    
    if (!hasViewportMeta) {
      issues.push({ type: 'error', message: 'ビューポートメタタグが設定されていません' });
      score -= 30;
    } else if (!viewport.includes('width=device-width')) {
      issues.push({ type: 'warning', message: 'ビューポートにwidth=device-widthが設定されていません' });
      score -= 15;
    }

    // レスポンシブデザインの指標
    const hasMediaQueries = /<style[^>]*>[\s\S]*@media[^{]*\{[\s\S]*?\}[\s\S]*<\/style>/.test(pageInfo.html) ||
                           $('link[rel="stylesheet"]').length > 0; // CSSファイルがある場合は推定

    // タッチフレンドリーなボタンサイズ（推定）
    const buttons = $('button, input[type="button"], input[type="submit"], .btn, .button').length;
    const smallElements = $('*').filter((i, elem) => {
      const $elem = $(elem);
      return $elem.text().length > 0 && $elem.text().length < 3; // 短いテキストの要素
    }).length;

    if (smallElements > buttons * 2) {
      issues.push({ type: 'warning', message: 'タッチしにくい小さな要素が多数あります' });
      score -= 10;
    }

    // モバイル用のCSSやJSライブラリの検出
    const mobileLibraries = $('script, link').filter((i, elem) => {
      const src = $(elem).attr('src') || $(elem).attr('href') || '';
      return /mobile|responsive|bootstrap|foundation/i.test(src);
    }).length;

    const isResponsive = hasViewportMeta && (hasMediaQueries || mobileLibraries > 0);

    return {
      score: Math.max(score, 0),
      isResponsive,
      hasViewportMeta,
      issues,
      details: {
        viewport: viewport || '未設定',
        hasMediaQueries,
        mobileLibrariesCount: mobileLibraries,
        buttonsCount: buttons
      }
    };
  }

  getGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }
}

module.exports = SimpleWebAnalyzer;