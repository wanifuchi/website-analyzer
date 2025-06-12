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
      issues.push({ 
        type: 'error', 
        message: 'タイトルタグが見つかりません',
        location: '<head>',
        impact: '検索結果でタイトルが表示されず、SEO効果が大幅に失われます',
        recommendation: '<title>ページ内容を表す30-60文字のタイトル</title>をheadタグ内に追加してください',
        priority: 'high'
      });
      score -= 25;
    } else if (title.length < 30) {
      issues.push({ 
        type: 'warning', 
        message: `タイトルが短すぎます (${title.length}文字)`,
        location: '<head><title>',
        impact: '検索結果でのクリック率が低下する可能性があります',
        recommendation: `現在「${title}」ですが、30-60文字でより詳細な内容を含めることを推奨します`,
        priority: 'medium'
      });
      score -= 15;
    } else if (title.length > 60) {
      issues.push({ 
        type: 'warning', 
        message: `タイトルが長すぎます (${title.length}文字)`,
        location: '<head><title>',
        impact: '検索結果でタイトルが省略される可能性があります',
        recommendation: `現在「${title}」ですが、60文字以内に短縮することを推奨します`,
        priority: 'medium'
      });
      score -= 10;
    }

    // メタディスクリプション分析
    const description = $('meta[name="description"]').attr('content');
    if (!description) {
      issues.push({ 
        type: 'error', 
        message: 'メタディスクリプションが見つかりません',
        location: '<head>',
        impact: '検索結果でのスニペット表示が最適化されず、クリック率が低下します',
        recommendation: '<meta name="description" content="ページ内容を表す120-160文字の説明">をheadタグ内に追加してください',
        priority: 'high'
      });
      score -= 20;
    } else if (description.length < 120) {
      issues.push({ 
        type: 'warning', 
        message: `メタディスクリプションが短すぎます (${description.length}文字)`,
        location: '<head><meta name="description">',
        impact: '検索結果でのスニペットが十分に活用されません',
        recommendation: `現在「${description.substring(0, 50)}...」ですが、120-160文字でより魅力的な説明を追加してください`,
        priority: 'medium'
      });
      score -= 10;
    } else if (description.length > 160) {
      issues.push({ 
        type: 'warning', 
        message: `メタディスクリプションが長すぎます (${description.length}文字)`,
        location: '<head><meta name="description">',
        impact: '検索結果でスニペットが省略される可能性があります',
        recommendation: `現在「${description.substring(0, 50)}...」ですが、160文字以内に要約してください`,
        priority: 'medium'
      });
      score -= 5;
    }

    // 見出し構造分析
    const h1Count = $('h1').length;
    const h1Text = $('h1').first().text().trim();
    if (h1Count === 0) {
      issues.push({ 
        type: 'error', 
        message: 'H1タグが見つかりません',
        location: '<body>',
        impact: 'ページの主要コンテンツが検索エンジンに正しく認識されません',
        recommendation: 'ページの主要見出しを<h1>タグでマークアップしてください',
        priority: 'high'
      });
      score -= 20;
    } else if (h1Count > 1) {
      issues.push({ 
        type: 'warning', 
        message: `H1タグが複数あります (${h1Count}個)`,
        location: '<body>内の複数箇所',
        impact: 'SEO効果が分散し、ページの主要トピックが不明確になります',
        recommendation: 'H1タグは1ページに1つのみ使用し、副見出しはH2、H3等を使用してください',
        priority: 'medium'
      });
      score -= 15;
    }

    // 見出し階層構造チェック
    const headings = [];
    $('h1, h2, h3, h4, h5, h6').each((i, elem) => {
      headings.push({
        level: parseInt(elem.tagName.slice(1)),
        text: $(elem).text().trim().substring(0, 50)
      });
    });

    // 見出し階層の問題をチェック
    let previousLevel = 0;
    let hierarchyIssues = [];
    headings.forEach((heading, index) => {
      if (index > 0 && heading.level > previousLevel + 1) {
        hierarchyIssues.push(`H${previousLevel}の後にH${heading.level}が使用されています`);
      }
      previousLevel = heading.level;
    });

    if (hierarchyIssues.length > 0) {
      issues.push({
        type: 'warning',
        message: '見出し階層が正しくありません',
        location: '<body>内の見出しタグ',
        impact: '検索エンジンがコンテンツ構造を正しく理解できません',
        recommendation: `見出しは段階的に使用してください: ${hierarchyIssues.join(', ')}`,
        priority: 'medium'
      });
      score -= 10;
    }

    // 画像のalt属性分析
    const images = $('img');
    const imagesWithoutAlt = [];
    const emptyAltImages = [];
    
    images.each((i, img) => {
      const $img = $(img);
      const alt = $img.attr('alt');
      const src = $img.attr('src') || 'unknown';
      
      if (!alt) {
        imagesWithoutAlt.push(src);
      } else if (alt.trim() === '') {
        emptyAltImages.push(src);
      }
    });

    if (imagesWithoutAlt.length > 0) {
      issues.push({ 
        type: 'error', 
        message: `${imagesWithoutAlt.length}個の画像にalt属性がありません`,
        location: `画像: ${imagesWithoutAlt.slice(0, 3).join(', ')}${imagesWithoutAlt.length > 3 ? '...' : ''}`,
        impact: 'スクリーンリーダーで画像内容が読み上げられず、SEOでも画像が評価されません',
        recommendation: '各画像に適切なalt属性を追加してください: <img src="..." alt="画像の内容説明">',
        priority: 'high'
      });
      score -= Math.min(imagesWithoutAlt.length * 3, 25);
    }

    if (emptyAltImages.length > 0) {
      issues.push({
        type: 'warning',
        message: `${emptyAltImages.length}個の画像のalt属性が空です`,
        location: `画像: ${emptyAltImages.slice(0, 3).join(', ')}${emptyAltImages.length > 3 ? '...' : ''}`,
        impact: '装飾的な画像以外はSEO効果を失っています',
        recommendation: '内容のある画像にはalt属性で具体的な説明を追加してください',
        priority: 'medium'
      });
      score -= Math.min(emptyAltImages.length * 2, 15);
    }

    // メタキーワード（古い手法）のチェック
    const keywords = $('meta[name="keywords"]').attr('content');
    if (keywords) {
      issues.push({
        type: 'info',
        message: 'メタキーワードタグが使用されています',
        location: '<head><meta name="keywords">',
        impact: '現在のSEOでは効果がなく、古い手法です',
        recommendation: 'メタキーワードタグは削除し、コンテンツの品質向上に注力してください',
        priority: 'low'
      });
    }

    // canonical URLチェック
    const canonical = $('link[rel="canonical"]').attr('href');
    if (!canonical) {
      issues.push({
        type: 'warning',
        message: 'canonical URLが設定されていません',
        location: '<head>',
        impact: '重複コンテンツの問題が発生する可能性があります',
        recommendation: '<link rel="canonical" href="このページの正式URL">を追加してください',
        priority: 'medium'
      });
      score -= 10;
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
        h1Text: h1Text || '未設定',
        totalImages: images.length,
        imagesWithoutAlt: imagesWithoutAlt.length,
        emptyAltImages: emptyAltImages.length,
        headingStructure: headings,
        hasCanonical: !!canonical,
        canonicalUrl: canonical || '未設定'
      }
    };
  }

  analyzePerformance($, pageInfo) {
    const issues = [];
    let score = 100;

    // レスポンスサイズ評価
    const sizeInMB = (pageInfo.contentLength / (1024 * 1024)).toFixed(2);
    const sizeInKB = (pageInfo.contentLength / 1024).toFixed(0);
    
    if (pageInfo.contentLength > 1000000) { // 1MB以上
      issues.push({ 
        type: 'error', 
        message: `ページサイズが大きすぎます (${sizeInMB}MB)`,
        location: 'ページ全体',
        impact: '読み込み時間が長くなり、モバイルユーザーの体験が悪化します',
        recommendation: `現在${sizeInMB}MBです。画像の最適化、不要なJavaScript/CSSの削除、圧縮を行い1MB以下に削減してください`,
        priority: 'high'
      });
      score -= 25;
    } else if (pageInfo.contentLength > 500000) { // 500KB以上
      issues.push({ 
        type: 'warning', 
        message: `ページサイズがやや大きめです (${sizeInKB}KB)`,
        location: 'ページ全体', 
        impact: '読み込み時間がやや長くなる可能性があります',
        recommendation: `現在${sizeInKB}KBです。500KB以下を目標に画像圧縮やリソース最適化を検討してください`,
        priority: 'medium'
      });
      score -= 15;
    }

    // レスポンス時間評価
    const responseTimeS = (pageInfo.responseTime / 1000).toFixed(2);
    if (pageInfo.responseTime > 3000) {
      issues.push({ 
        type: 'error', 
        message: `サーバーレスポンスが遅すぎます (${responseTimeS}秒)`,
        location: 'サーバー応答',
        impact: 'ユーザーが離脱する可能性が高く、SEOランキングにも悪影響があります',
        recommendation: `現在${responseTimeS}秒です。サーバー性能の向上、CDNの利用、キャッシュ設定の最適化を行い1秒以下を目指してください`,
        priority: 'high'
      });
      score -= 20;
    } else if (pageInfo.responseTime > 1000) {
      issues.push({ 
        type: 'warning', 
        message: `サーバーレスポンスがやや遅いです (${responseTimeS}秒)`,
        location: 'サーバー応答',
        impact: 'ユーザー体験がやや悪化し、SEO評価に影響する可能性があります',
        recommendation: `現在${responseTimeS}秒です。1秒以下を目標にサーバー最適化を検討してください`,
        priority: 'medium'
      });
      score -= 10;
    }

    // CSSファイル数と最適化
    const cssFiles = $('link[rel="stylesheet"]');
    const cssCount = cssFiles.length;
    const inlineCss = $('style').length;
    
    if (cssCount > 10) {
      issues.push({ 
        type: 'warning', 
        message: `CSSファイルが多すぎます (${cssCount}個)`,
        location: '<head>内のlinkタグ',
        impact: 'HTTPリクエスト数が増加し、ページ読み込みが遅くなります',
        recommendation: `CSSファイルを統合して5個以下に削減してください。現在: ${cssCount}個`,
        priority: 'medium'
      });
      score -= 10;
    }

    // JavaScriptファイル数と配置
    const jsFiles = $('script[src]');
    const jsCount = jsFiles.length;
    const inlineJs = $('script:not([src])').length;
    const jsInHead = $('head script[src]').length;
    
    if (jsCount > 15) {
      issues.push({ 
        type: 'warning', 
        message: `JavaScriptファイルが多すぎます (${jsCount}個)`,
        location: 'ページ全体のscriptタグ',
        impact: '読み込み時間が増加し、ページレンダリングがブロックされる可能性があります',
        recommendation: `JavaScriptファイルを統合・最小化し、10個以下に削減してください。現在: ${jsCount}個`,
        priority: 'medium'
      });
      score -= 15;
    }

    if (jsInHead > 0) {
      issues.push({
        type: 'warning',
        message: `head内にJavaScriptファイルがあります (${jsInHead}個)`,
        location: '<head>内のscriptタグ',
        impact: 'ページレンダリングがブロックされ、初期表示が遅くなります',
        recommendation: 'JavaScriptファイルは</body>直前に移動するか、async/defer属性を使用してください',
        priority: 'medium'
      });
      score -= 10;
    }

    // 画像最適化チェック
    const images = $('img');
    const unoptimizedImages = [];
    
    images.each((i, img) => {
      const src = $(img).attr('src');
      if (src) {
        // 大きな画像ファイルの推測（拡張子ベース）
        if (src.match(/\.(jpg|jpeg|png|gif|bmp)$/i) && !src.match(/\.(webp|avif)$/i)) {
          unoptimizedImages.push(src);
        }
      }
    });

    if (unoptimizedImages.length > 5) {
      issues.push({
        type: 'info',
        message: `最適化されていない画像が多数あります (${unoptimizedImages.length}個)`,
        location: '画像ファイル',
        impact: 'ページサイズが大きくなり、読み込み時間が増加します',
        recommendation: 'WebP形式への変換、適切なサイズでの配信、遅延読み込みの実装を検討してください',
        priority: 'medium'
      });
      score -= 10;
    }

    return {
      score: Math.max(score, 0),
      loadTime: parseFloat(responseTimeS),
      firstContentfulPaint: null, // 簡易版では取得不可
      issues,
      details: {
        contentLength: pageInfo.contentLength,
        contentSizeMB: parseFloat(sizeInMB),
        responseTime: pageInfo.responseTime,
        responseTimeSeconds: parseFloat(responseTimeS),
        cssFiles: cssCount,
        inlineCssBlocks: inlineCss,
        jsFiles: jsCount,
        inlineJsBlocks: inlineJs,
        jsInHead: jsInHead,
        totalImages: images.length,
        unoptimizedImages: unoptimizedImages.length
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