// Version: 1.0.2 - PageSpeed Integration Enabled with Environment Fix
// Last Updated: 2025-06-14T03:45:00Z
const axios = require('axios');
const cheerio = require('cheerio');

// 環境変数の確実な読み込み
if (!process.env.GOOGLE_PAGESPEED_API_KEY) {
  require('dotenv').config();
}

const PageSpeedInsightsClient = require('./pagespeed-client');

// 軽量で確実なウェブサイト分析エンジン
class SimpleWebAnalyzer {
  constructor() {
    this.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    
    // PageSpeedClient初期化デバッグ
    console.log('🔍 SimpleWebAnalyzer Constructor Debug:', {
      hasApiKey: !!process.env.GOOGLE_PAGESPEED_API_KEY,
      apiKeyLength: process.env.GOOGLE_PAGESPEED_API_KEY?.length || 0
    });
    
    this.pageSpeedClient = new PageSpeedInsightsClient();
    
    console.log('🔍 PageSpeed Client After Init:', {
      isAvailable: this.pageSpeedClient.isApiAvailable()
    });
  }

  async analyzeWebsite(url) {
    console.log(`🔍 Starting simple analysis for: ${url}`);
    
    try {
      // ページのHTMLを取得
      const response = await axios.get(url, {
        headers: { 'User-Agent': this.userAgent },
        timeout: 60000, // 60秒に延長
        maxRedirects: 5,
        maxContentLength: 50 * 1024 * 1024, // 50MBまで許可
        maxBodyLength: 50 * 1024 * 1024
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

      // 並列で分析を実行
      console.log('🔍 Starting parallel analysis...');
      const [
        seoResults,
        performanceResults,
        securityResults,
        accessibilityResults,
        mobileResults,
        pageSpeedResults
      ] = await Promise.allSettled([
        Promise.resolve(this.analyzeSEO($, pageInfo)),
        Promise.resolve(this.analyzePerformance($, pageInfo)),
        Promise.resolve(this.analyzeSecurity($, pageInfo)),
        Promise.resolve(this.analyzeAccessibility($, pageInfo)),
        Promise.resolve(this.analyzeMobile($, pageInfo)),
        this.analyzeWithPageSpeed(pageInfo.url)
      ]);
      
      console.log('🔍 Promise.allSettled Results:', {
        seo: seoResults.status,
        performance: performanceResults.status,
        security: securityResults.status,
        accessibility: accessibilityResults.status,
        mobile: mobileResults.status,
        pageSpeed: pageSpeedResults.status,
        pageSpeedError: pageSpeedResults.status === 'rejected' ? pageSpeedResults.reason?.message : null
      });

      // 結果を取得（エラーの場合はデフォルト値）
      const seo = seoResults.status === 'fulfilled' ? seoResults.value : this.getDefaultSeoResults();
      const performance = performanceResults.status === 'fulfilled' ? performanceResults.value : this.getDefaultPerformanceResults();
      const security = securityResults.status === 'fulfilled' ? securityResults.value : this.getDefaultSecurityResults();
      const accessibility = accessibilityResults.status === 'fulfilled' ? accessibilityResults.value : this.getDefaultAccessibilityResults();
      const mobile = mobileResults.status === 'fulfilled' ? mobileResults.value : this.getDefaultMobileResults();
      const pageSpeed = pageSpeedResults.status === 'fulfilled' ? pageSpeedResults.value : null;

      console.log('🔍 Final PageSpeed Value:', {
        hasPageSpeed: !!pageSpeed,
        pageSpeedType: typeof pageSpeed,
        pageSpeedKeys: pageSpeed ? Object.keys(pageSpeed) : null
      });

      // PageSpeed Insights データでパフォーマンス分析を強化
      const enhancedPerformance = this.enhancePerformanceWithPageSpeed(performance, pageSpeed);

      // 総合スコア計算（PageSpeed データを考慮）
      const finalPerformanceScore = pageSpeed && pageSpeed.mobile.scores.performance !== null 
        ? pageSpeed.mobile.scores.performance 
        : enhancedPerformance.score;

      const overallScore = Math.round((
        seo.score + 
        finalPerformanceScore + 
        security.score + 
        accessibility.score + 
        mobile.score
      ) / 5);

      const grade = this.getGrade(overallScore);

      return {
        overall: { score: overallScore, grade },
        seo: seo,
        performance: enhancedPerformance,
        security: security,
        accessibility: accessibility,
        mobile: mobile,
        pageSpeed: pageSpeed,
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
      issues.push({ 
        type: 'error', 
        message: 'HTTPSが使用されていません',
        location: 'サイト全体のプロトコル設定',
        impact: 'データ通信が暗号化されず、ユーザー情報が盗聴される危険性があります。Googleはランキング要因としてHTTPSを重視しています',
        recommendation: 'SSL証明書を取得してHTTPSに移行してください。リダイレクト設定も必要です: HTTP → HTTPS',
        priority: 'high'
      });
      score -= 40;
    }

    // mixedコンテンツチェック
    const httpResources = [];
    const httpImages = [];
    const httpScripts = [];
    const httpStyles = [];
    
    $('img, script, link').each((i, elem) => {
      const src = $(elem).attr('src') || $(elem).attr('href');
      if (src && src.startsWith('http://')) {
        httpResources.push(src);
        if (elem.tagName === 'IMG') httpImages.push(src);
        if (elem.tagName === 'SCRIPT') httpScripts.push(src);
        if (elem.tagName === 'LINK') httpStyles.push(src);
      }
    });

    if (httpResources.length > 0 && isHttps) {
      issues.push({ 
        type: 'error', 
        message: `Mixed Content: ${httpResources.length}個のHTTPリソースがあります`,
        location: `HTTP リソース: ${httpResources.slice(0, 3).join(', ')}${httpResources.length > 3 ? '...' : ''}`,
        impact: 'ブラウザが一部コンテンツをブロックし、ページが正しく表示されない可能性があります',
        recommendation: `すべてのリソースをHTTPSに変更してください。画像:${httpImages.length}個、スクリプト:${httpScripts.length}個、CSS:${httpStyles.length}個`,
        priority: 'high'
      });
      score -= 25;
    }

    // フォームのaction属性チェック
    const forms = $('form');
    const unsecureForms = [];
    const formsWithoutAction = [];
    
    forms.each((i, form) => {
      const $form = $(form);
      const action = $form.attr('action');
      const method = $form.attr('method');
      
      if (!action) {
        formsWithoutAction.push(`フォーム${i + 1}`);
      } else if (action.startsWith('http://')) {
        unsecureForms.push(action);
      }
    });

    if (unsecureForms.length > 0) {
      issues.push({ 
        type: 'error', 
        message: `${unsecureForms.length}個のフォームが非セキュアです`,
        location: `フォーム送信先: ${unsecureForms.join(', ')}`,
        impact: 'フォーム送信時にユーザーデータが暗号化されず、個人情報漏洩のリスクがあります',
        recommendation: 'フォームのaction属性をHTTPSのURLに変更してください',
        priority: 'high'
      });
      score -= 30;
    }

    // セキュリティヘッダーのチェック（簡易版では推測）
    const hasSecurityHeaders = false; // 実際のレスポンスヘッダーは取得できないため
    if (!hasSecurityHeaders) {
      issues.push({
        type: 'warning',
        message: 'セキュリティヘッダーの設定が推奨されます',
        location: 'サーバー設定',
        impact: 'XSS攻撃、クリックジャッキング等の脆弱性に対する防御が不十分です',
        recommendation: 'X-Frame-Options, X-XSS-Protection, Content-Security-Policy等のヘッダーを設定してください',
        priority: 'medium'
      });
      score -= 10;
    }

    // 外部リンクのrel属性チェック
    const externalLinks = $('a[href^="http"]').filter((i, link) => {
      const href = $(link).attr('href');
      return href && !href.includes(new URL(pageInfo.url).hostname);
    });

    const unsafeExternalLinks = [];
    externalLinks.each((i, link) => {
      const $link = $(link);
      const rel = $link.attr('rel');
      if (!rel || !rel.includes('noopener')) {
        unsafeExternalLinks.push($link.attr('href'));
      }
    });

    if (unsafeExternalLinks.length > 0) {
      issues.push({
        type: 'warning',
        message: `${unsafeExternalLinks.length}個の外部リンクにrel="noopener"が設定されていません`,
        location: `外部リンク: ${unsafeExternalLinks.slice(0, 3).join(', ')}${unsafeExternalLinks.length > 3 ? '...' : ''}`,
        impact: 'target="_blank"の外部リンクでwindow.openerを通じた攻撃を受ける可能性があります',
        recommendation: '外部リンクにrel="noopener noreferrer"を追加してください',
        priority: 'medium'
      });
      score -= 10;
    }

    return {
      score: Math.max(score, 0),
      httpsUsage: isHttps,
      issues,
      details: {
        protocol: isHttps ? 'HTTPS' : 'HTTP',
        mixedContentCount: httpResources.length,
        unsecureFormsCount: unsecureForms.length,
        totalForms: forms.length,
        externalLinksCount: externalLinks.length,
        unsafeExternalLinksCount: unsafeExternalLinks.length
      }
    };
  }

  analyzeAccessibility($, pageInfo) {
    const issues = [];
    let score = 100;
    let violations = 0;

    // alt属性のない画像の詳細分析
    const images = $('img');
    const imagesWithoutAlt = [];
    const decorativeImages = [];
    
    images.each((i, img) => {
      const $img = $(img);
      const alt = $img.attr('alt');
      const src = $img.attr('src') || 'unknown';
      const id = $img.attr('id');
      const className = $img.attr('class');
      const title = $img.attr('title');
      
      // 具体的な要素識別情報を構築
      let elementInfo = '<img';
      if (id) elementInfo += ` id="${id}"`;
      if (className) elementInfo += ` class="${className}"`;
      elementInfo += ` src="${src}"`;
      if (title) elementInfo += ` title="${title}"`;
      
      if (alt === undefined) {
        elementInfo += '>'; // alt属性なし
        imagesWithoutAlt.push({
          src: src,
          elementInfo: elementInfo,
          identifier: id || className || src.split('/').pop() || `画像${i + 1}`
        });
      } else if (alt === '') {
        elementInfo += ' alt="">'; // 装飾画像
        decorativeImages.push({
          src: src,
          elementInfo: elementInfo,
          identifier: id || className || src.split('/').pop() || `装飾画像${i + 1}`
        });
      }
    });

    if (imagesWithoutAlt.length > 0) {
      const elementDetails = imagesWithoutAlt.slice(0, 3).map(item => item.elementInfo).join('\n');
      
      issues.push({ 
        type: 'error', 
        message: `${imagesWithoutAlt.length}個の画像にalt属性がありません`,
        location: `具体的な要素:\n${elementDetails}${imagesWithoutAlt.length > 3 ? '\n...' : ''}`,
        impact: 'スクリーンリーダーが画像内容を読み上げられず、視覚障害者がコンテンツを理解できません',
        recommendation: `各画像に適切なalt属性を追加してください。例:\n${imagesWithoutAlt[0].elementInfo.replace('>', ' alt="画像の内容説明">')}\n\n装飾的な画像の場合は:\n${imagesWithoutAlt[0].elementInfo.replace('>', ' alt="">')}`,
        priority: 'high'
      });
      score -= Math.min(imagesWithoutAlt.length * 5, 30);
      violations += imagesWithoutAlt.length;
    }

    // ラベルのないinput要素の詳細分析
    const inputs = $('input');
    const unlabeledInputs = [];
    
    inputs.each((i, input) => {
      const $input = $(input);
      const type = $input.attr('type') || 'text';
      const id = $input.attr('id');
      const name = $input.attr('name');
      const className = $input.attr('class');
      const placeholder = $input.attr('placeholder');
      const hasLabel = id && $(`label[for="${id}"]`).length > 0;
      const hasAriaLabel = $input.attr('aria-label') || $input.attr('aria-labelledby');
      
      if (!hasLabel && !hasAriaLabel && type !== 'hidden' && type !== 'submit' && type !== 'button') {
        // 具体的な要素識別情報を構築
        let elementInfo = `<input type="${type}"`;
        if (id) elementInfo += ` id="${id}"`;
        if (name) elementInfo += ` name="${name}"`;
        if (className) elementInfo += ` class="${className}"`;
        if (placeholder) elementInfo += ` placeholder="${placeholder}"`;
        elementInfo += '>';
        
        unlabeledInputs.push({
          type: type,
          elementInfo: elementInfo,
          identifier: id || name || className || `要素${i + 1}`
        });
      }
    });

    if (unlabeledInputs.length > 0) {
      const identifiers = unlabeledInputs.map(item => item.identifier).slice(0, 3).join(', ');
      const elementDetails = unlabeledInputs.slice(0, 2).map(item => item.elementInfo).join('\n');
      
      issues.push({ 
        type: 'error', 
        message: `${unlabeledInputs.length}個の入力要素にラベルがありません`,
        location: `具体的な要素:\n${elementDetails}${unlabeledInputs.length > 2 ? '\n...' : ''}`,
        impact: 'スクリーンリーダーユーザーが入力フィールドの目的を理解できません',
        recommendation: `各入力要素に<label for="id">または aria-label属性を追加してください。例:\n<label for="${unlabeledInputs[0].identifier}">フィールド名</label>\n${unlabeledInputs[0].elementInfo.replace('>', ` aria-label="フィールド名">`)}`,
        priority: 'high'
      });
      score -= Math.min(unlabeledInputs.length * 8, 40);
      violations += unlabeledInputs.length;
    }

    // 空のリンクの詳細分析
    const links = $('a[href]');
    const emptyLinks = [];
    const ambiguousLinks = [];
    
    links.each((i, link) => {
      const $link = $(link);
      const text = $link.text().trim();
      const href = $link.attr('href');
      const id = $link.attr('id');
      const className = $link.attr('class');
      const ariaLabel = $link.attr('aria-label');
      const hasImageAlt = $link.find('img[alt]').length > 0;
      
      // 具体的な要素識別情報を構築
      let elementInfo = `<a href="${href}"`;
      if (id) elementInfo += ` id="${id}"`;
      if (className) elementInfo += ` class="${className}"`;
      elementInfo += '>';
      
      if (!text && !ariaLabel && !hasImageAlt) {
        emptyLinks.push({
          href: href,
          elementInfo: elementInfo,
          identifier: id || className || `リンク${i + 1}`
        });
      } else if (text && (text === 'こちら' || text === 'クリック' || text === 'more' || text === 'read more' || text === 'もっと見る' || text === '詳細')) {
        ambiguousLinks.push({
          text: text,
          href: href,
          elementInfo: elementInfo + text + '</a>',
          identifier: id || className || `"${text}"リンク`
        });
      }
    });

    if (emptyLinks.length > 0) {
      const elementDetails = emptyLinks.slice(0, 2).map(item => item.elementInfo + '(空のリンク)</a>').join('\n');
      
      issues.push({ 
        type: 'error', 
        message: `${emptyLinks.length}個の空のリンクがあります`,
        location: `具体的な要素:\n${elementDetails}${emptyLinks.length > 2 ? '\n...' : ''}`,
        impact: 'スクリーンリーダーユーザーがリンクの目的を理解できません',
        recommendation: `リンクに説明的なテキストまたはaria-label属性を追加してください。例:\n${emptyLinks[0].elementInfo}商品詳細</a>\nまたは\n${emptyLinks[0].elementInfo.replace('>', ' aria-label="商品詳細ページへ">')}`,
        priority: 'high'
      });
      score -= Math.min(emptyLinks.length * 5, 25);
      violations += emptyLinks.length;
    }

    if (ambiguousLinks.length > 0) {
      const elementDetails = ambiguousLinks.slice(0, 2).map(item => item.elementInfo).join('\n');
      
      issues.push({
        type: 'warning',
        message: `${ambiguousLinks.length}個のリンクテキストが曖昧です`,
        location: `具体的な要素:\n${elementDetails}${ambiguousLinks.length > 2 ? '\n...' : ''}`,
        impact: 'リンクの目的が不明確で、ユーザビリティが低下します',
        recommendation: `具体的なリンクテキストに変更してください。例:\n「${ambiguousLinks[0].text}」→「商品詳細を見る」\n「${ambiguousLinks[0].text}」→「お問い合わせフォームへ」`,
        priority: 'medium'
      });
      score -= Math.min(ambiguousLinks.length * 2, 15);
      violations += ambiguousLinks.length;
    }

    // ページの言語設定
    const lang = $('html').attr('lang');
    if (!lang) {
      issues.push({ 
        type: 'error', 
        message: 'HTMLにlang属性が設定されていません',
        location: '<html>タグ',
        impact: 'スクリーンリーダーが適切な言語で読み上げられません',
        recommendation: '<html lang="ja">のように言語コードを設定してください',
        priority: 'high'
      });
      score -= 15;
      violations += 1;
    }

    // 見出し構造のアクセシビリティチェック
    const headings = $('h1, h2, h3, h4, h5, h6');
    if (headings.length === 0) {
      issues.push({
        type: 'warning',
        message: '見出し要素が見つかりません',
        location: 'ページ全体',
        impact: 'コンテンツの構造が不明確で、ナビゲーションが困難です',
        recommendation: 'ページ内容に応じて適切な見出し(h1-h6)を設定してください',
        priority: 'medium'
      });
      score -= 10;
      violations += 1;
    }

    // フォーカス可能要素のチェック
    const focusableElements = $('a, button, input, select, textarea, [tabindex]');
    const elementsWithNegativeTabindex = $('[tabindex="-1"]');
    
    if (elementsWithNegativeTabindex.length > focusableElements.length * 0.5) {
      issues.push({
        type: 'warning',
        message: 'キーボードナビゲーションが制限されている可能性があります',
        location: 'tabindex="-1"の要素が多数',
        impact: 'キーボードユーザーが要素にアクセスできません',
        recommendation: 'tabindex="-1"の使用を最小限に抑え、適切なフォーカス順序を確保してください',
        priority: 'medium'
      });
      score -= 10;
      violations += 1;
    }

    // 色に依存した情報提供のチェック（簡易）
    const colorKeywords = ['red', 'green', 'blue', 'yellow', 'orange', 'purple', 'pink'];
    const colorDependentText = [];
    
    $('*').each((i, elem) => {
      const text = $(elem).text().toLowerCase();
      colorKeywords.forEach(color => {
        if (text.includes(`${color}の`) || text.includes(`${color}で`)) {
          colorDependentText.push($(elem).text().substring(0, 50));
        }
      });
    });

    if (colorDependentText.length > 0) {
      issues.push({
        type: 'warning',
        message: '色に依存した情報提供が検出されました',
        location: `色を参照するテキスト: ${colorDependentText.slice(0, 2).join(', ')}...`,
        impact: '色覚障害者や視覚障害者が情報を理解できない可能性があります',
        recommendation: '色だけでなく、テキスト、アイコン、パターンなど複数の手段で情報を提供してください',
        priority: 'medium'
      });
      score -= 5;
      violations += 1;
    }

    return {
      score: Math.max(score, 0),
      wcagLevel: violations === 0 ? 'AAA' : violations < 5 ? 'AA' : violations < 10 ? 'A' : '不適合',
      violations,
      issues,
      details: {
        totalImages: images.length,
        imagesWithoutAlt: imagesWithoutAlt.length,
        decorativeImages: decorativeImages.length,
        totalInputs: inputs.length,
        unlabeledInputs: unlabeledInputs.length,
        totalLinks: links.length,
        emptyLinks: emptyLinks.length,
        ambiguousLinks: ambiguousLinks.length,
        hasLangAttribute: !!lang,
        totalHeadings: headings.length,
        focusableElements: focusableElements.length
      }
    };
  }

  analyzeMobile($, pageInfo) {
    const issues = [];
    let score = 100;

    // ビューポートメタタグの詳細分析
    const viewport = $('meta[name="viewport"]').attr('content');
    const hasViewportMeta = !!viewport;
    
    if (!hasViewportMeta) {
      issues.push({ 
        type: 'error', 
        message: 'ビューポートメタタグが設定されていません',
        location: '<head>セクション',
        impact: 'モバイルデバイスでページが適切にスケールされず、ユーザビリティが大幅に低下します',
        recommendation: '<meta name="viewport" content="width=device-width, initial-scale=1.0">をheadタグ内に追加してください',
        priority: 'high'
      });
      score -= 30;
    } else {
      // ビューポート設定の詳細チェック
      if (!viewport.includes('width=device-width')) {
        issues.push({ 
          type: 'error', 
          message: 'ビューポートにwidth=device-widthが設定されていません',
          location: '<meta name="viewport">',
          impact: 'モバイルデバイスでページ幅が適切に調整されません',
          recommendation: `現在「${viewport}」ですが、width=device-widthを含めてください`,
          priority: 'high'
        });
        score -= 20;
      }
      
      if (!viewport.includes('initial-scale=1')) {
        issues.push({
          type: 'warning',
          message: 'ビューポートに初期スケールが設定されていません',
          location: '<meta name="viewport">',
          impact: 'ページの初期表示倍率が不適切になる可能性があります',
          recommendation: `「${viewport}」にinitial-scale=1.0を追加することを推奨します`,
          priority: 'medium'
        });
        score -= 10;
      }
      
      if (viewport.includes('user-scalable=no')) {
        issues.push({
          type: 'warning',
          message: 'ユーザーのズーム操作が無効化されています',
          location: '<meta name="viewport">',
          impact: 'アクセシビリティが低下し、視覚障害者がページを拡大できません',
          recommendation: 'user-scalable=noを削除し、ユーザーによるズームを許可してください',
          priority: 'medium'
        });
        score -= 15;
      }
    }

    // タッチターゲットサイズの分析
    const clickableElements = $('a, button, input[type="button"], input[type="submit"], [onclick], [role="button"]');
    let smallTouchTargets = 0;
    const smallTargetElements = [];
    
    clickableElements.each((i, elem) => {
      const $elem = $(elem);
      const text = $elem.text().trim();
      const id = $elem.attr('id');
      const className = $elem.attr('class');
      const href = $elem.attr('href');
      const type = $elem.attr('type');
      const tagName = elem.tagName.toLowerCase();
      
      // 44px未満と推定される小さなタッチターゲット
      const isPotentiallySmall = text.length < 2 || (text.length < 5 && !$elem.find('img').length);
      
      if (isPotentiallySmall) {
        smallTouchTargets++;
        
        // 具体的な要素識別情報を構築
        let elementInfo = `<${tagName}`;
        if (id) elementInfo += ` id="${id}"`;
        if (className) elementInfo += ` class="${className}"`;
        if (href) elementInfo += ` href="${href}"`;
        if (type) elementInfo += ` type="${type}"`;
        elementInfo += '>';
        
        if (text) {
          elementInfo += text + `</${tagName}>`;
        } else {
          elementInfo += `(テキストなし)</${tagName}>`;
        }
        
        smallTargetElements.push({
          text: text || '(テキストなし)',
          elementInfo: elementInfo,
          identifier: id || className || text || `${tagName}${i + 1}`,
          tagName: tagName
        });
      }
    });
    
    if (smallTouchTargets > 0) {
      const elementDetails = smallTargetElements.slice(0, 3).map(item => item.elementInfo).join('\n');
      const identifiers = smallTargetElements.slice(0, 3).map(item => item.identifier).join(', ');
      
      issues.push({
        type: 'warning',
        message: `${smallTouchTargets}個の要素がタッチターゲットサイズ不足の可能性があります`,
        location: `具体的な要素:\n${elementDetails}${smallTargetElements.length > 3 ? '\n...' : ''}`,
        impact: 'モバイルユーザーが正確にタップできず、操作ミスが発生しやすくなります。特に高齢者や運動機能に制約のあるユーザーに影響があります',
        recommendation: `各要素のサイズを最低44x44px以上に設定してください。CSSで以下のように指定:\n.${smallTargetElements[0].identifier.replace(/[^a-zA-Z0-9]/g, '')} {\n  min-height: 44px;\n  min-width: 44px;\n  padding: 12px;\n}`,
        priority: 'medium'
      });
      score -= Math.min(smallTouchTargets * 3, 20);
    }

    // レスポンシブデザインの詳細分析
    const responsiveAnalysis = this.analyzeResponsiveDesign($, pageInfo);
    
    // レスポンシブデザインの総合評価
    if (!responsiveAnalysis.isResponsive) {
      issues.push({
        type: 'error',
        message: 'レスポンシブデザインが実装されていません',
        location: 'CSS設定・HTML構造',
        impact: '異なる画面サイズのデバイスでレイアウトが崩れ、ユーザビリティが大幅に低下します',
        recommendation: responsiveAnalysis.recommendation,
        priority: 'high'
      });
      score -= 25;
    } else if (responsiveAnalysis.score < 80) {
      issues.push({
        type: 'warning',
        message: `レスポンシブデザインの実装が不完全です（評価: ${responsiveAnalysis.score}%）`,
        location: 'CSS設定・HTML構造',
        impact: '一部のデバイスサイズでレイアウトが最適化されていない可能性があります',
        recommendation: responsiveAnalysis.recommendation,
        priority: 'medium'
      });
      score -= Math.round((100 - responsiveAnalysis.score) * 0.15);
    }
    
    // レスポンシブ分析の詳細を保存
    const hasMediaQueries = responsiveAnalysis.hasMediaQueries;
    const responsiveFrameworks = responsiveAnalysis.responsiveFrameworks;

    // フォントサイズの分析
    const textElements = $('p, div, span, h1, h2, h3, h4, h5, h6, li, td, th').filter((i, elem) => {
      return $(elem).text().trim().length > 0;
    });
    
    if (textElements.length === 0) {
      issues.push({
        type: 'warning',
        message: 'テキストコンテンツが検出されませんでした',
        location: 'ページ全体',
        impact: 'フォントサイズの適切性を評価できません',
        recommendation: 'テキストコンテンツがある場合は、16px以上のフォントサイズを推奨します',
        priority: 'low'
      });
      score -= 5;
    }

    // 画像の最適化チェック
    const images = $('img');
    const unoptimizedImages = [];
    const imagesWithoutSrcset = [];
    
    images.each((i, img) => {
      const $img = $(img);
      const src = $img.attr('src');
      const srcset = $img.attr('srcset');
      
      if (src) {
        // 高解像度画像の検出
        if (!srcset && src.match(/\.(jpg|jpeg|png|gif)$/i)) {
          imagesWithoutSrcset.push(src);
        }
        
        // レスポンシブ画像でない可能性
        if (!srcset && !$img.attr('sizes')) {
          unoptimizedImages.push(src);
        }
      }
    });
    
    if (imagesWithoutSrcset.length > 3) {
      issues.push({
        type: 'info',
        message: `${imagesWithoutSrcset.length}個の画像がレスポンシブ画像に最適化されていません`,
        location: `画像ファイル: ${imagesWithoutSrcset.slice(0, 3).join(', ')}${imagesWithoutSrcset.length > 3 ? '...' : ''}`,
        impact: 'モバイルデバイスで不要に大きな画像が読み込まれ、通信量と読み込み時間が増加します',
        recommendation: 'srcset属性とsizes属性を使用して、デバイスに応じた適切なサイズの画像を配信してください',
        priority: 'medium'
      });
      score -= 10;
    }

    // ホリゾンタルスクロールの可能性チェック
    const wideElements = $('table, pre, code').filter((i, elem) => {
      const $elem = $(elem);
      return $elem.text().length > 100 || $elem.find('tr td').length > 5;
    });
    
    if (wideElements.length > 0) {
      issues.push({
        type: 'warning',
        message: `${wideElements.length}個の要素で横スクロールが発生する可能性があります`,
        location: 'テーブル、コードブロック等の横幅の大きな要素',
        impact: 'モバイルデバイスで横スクロールが必要になり、閲覧性が低下します',
        recommendation: 'テーブルにoverflow-x: autoを設定するか、レスポンシブテーブルライブラリを使用してください',
        priority: 'medium'
      });
      score -= 10;
    }

    // モバイル特有の機能チェック
    const hasTelLinks = $('a[href^="tel:"]').length;
    const hasEmailLinks = $('a[href^="mailto:"]').length;
    const hasMapLinks = $('a[href*="maps.google"], a[href*="goo.gl/maps"]').length;
    
    let mobileFeatureScore = 0;
    if (hasTelLinks > 0) mobileFeatureScore += 5;
    if (hasEmailLinks > 0) mobileFeatureScore += 3;
    if (hasMapLinks > 0) mobileFeatureScore += 2;
    
    if (mobileFeatureScore === 0) {
      issues.push({
        type: 'info',
        message: 'モバイル向けの便利機能が検出されませんでした',
        location: 'ページ全体のリンク設定',
        impact: 'ユーザビリティ向上の機会を逃している可能性があります',
        recommendation: '電話番号はtel:、メールアドレスはmailto:リンクとして設定することを推奨します',
        priority: 'low'
      });
    } else {
      score += Math.min(mobileFeatureScore, 10); // 最大10点のボーナス
    }

    // PWA関連の基本チェック
    const hasManifest = $('link[rel="manifest"]').length > 0;
    const hasServiceWorker = $.html().includes('serviceWorker') || $.html().includes('service-worker');
    
    if (!hasManifest && !hasServiceWorker) {
      issues.push({
        type: 'info',
        message: 'PWA（Progressive Web App）機能が実装されていません',
        location: 'HTML head セクション',
        impact: 'モバイルアプリのような体験を提供できず、ユーザーエンゲージメントの向上機会を逃しています',
        recommendation: 'Web App ManifestとService Workerを実装してPWA化を検討してください',
        priority: 'low'
      });
    }

    const isResponsive = responsiveAnalysis.isResponsive;

    return {
      score: Math.max(Math.min(score, 100), 0),
      isResponsive,
      hasViewportMeta,
      issues,
      details: {
        viewport: viewport || '未設定',
        hasMediaQueries,
        responsiveFrameworks,
        responsiveAnalysis: responsiveAnalysis.details,
        detectedFrameworks: responsiveAnalysis.detectedFrameworks,
        responsiveIndicators: responsiveAnalysis.responsiveIndicators,
        clickableElements: clickableElements.length,
        smallTouchTargets,
        totalImages: images.length,
        imagesWithoutSrcset: imagesWithoutSrcset.length,
        wideElements: wideElements.length,
        mobileFeatures: {
          telLinks: hasTelLinks,
          emailLinks: hasEmailLinks,
          mapLinks: hasMapLinks
        },
        pwaFeatures: {
          hasManifest,
          hasServiceWorker
        }
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

  /**
   * PageSpeed Insights APIを使用した分析
   * @param {string} url - 分析対象URL
   * @returns {Object} PageSpeed分析結果
   */
  async analyzeWithPageSpeed(url) {
    console.log('🔍 PageSpeed API Check:', {
      hasClient: !!this.pageSpeedClient,
      isAvailable: this.pageSpeedClient ? this.pageSpeedClient.isApiAvailable() : false,
      apiKey: this.pageSpeedClient ? this.pageSpeedClient.apiKey : 'no client',
      hasApiKey: !!(this.pageSpeedClient && this.pageSpeedClient.apiKey)
    });
    
    if (!this.pageSpeedClient.isApiAvailable()) {
      console.log('📋 PageSpeed Insights API が利用できません');
      return null;
    }

    try {
      console.log('🚀 PageSpeed Insights 分析開始...');
      const results = await this.pageSpeedClient.analyzeBothStrategies(url);
      console.log('✅ PageSpeed Insights 分析完了');
      
      // デバッグログ: 結果の構造を確認
      console.log('🔍 PageSpeed Results Structure:', {
        hasResults: !!results,
        hasMobile: !!results?.mobile,
        hasDesktop: !!results?.desktop,
        mobilePerformanceScore: results?.mobile?.scores?.performance,
        desktopPerformanceScore: results?.desktop?.scores?.performance,
        hasCoreWebVitals: !!results?.mobile?.coreWebVitals
      });
      
      return results;
    } catch (error) {
      console.error('❌ PageSpeed Insights 分析エラー:', error.message);
      console.error('❌ PageSpeed Error Details:', error.stack);
      return null;
    }
  }

  /**
   * PageSpeed データでパフォーマンス分析を強化
   * @param {Object} basePerformance - 基本パフォーマンス分析結果
   * @param {Object} pageSpeedData - PageSpeed Insights データ
   * @returns {Object} 強化されたパフォーマンス分析結果
   */
  enhancePerformanceWithPageSpeed(basePerformance, pageSpeedData) {
    if (!pageSpeedData) {
      return basePerformance;
    }

    const mobileData = pageSpeedData.mobile;
    const desktopData = pageSpeedData.desktop;

    // PageSpeed データから課題を抽出
    const pageSpeedIssues = this.extractPageSpeedIssues(mobileData, desktopData);

    // 強化されたパフォーマンス結果
    return {
      ...basePerformance,
      score: mobileData.scores.performance || basePerformance.score,
      pageSpeedScore: {
        mobile: mobileData.scores.performance,
        desktop: desktopData.scores.performance
      },
      coreWebVitals: mobileData.coreWebVitals,
      loadTime: mobileData.coreWebVitals.fcp.value ? mobileData.coreWebVitals.fcp.value / 1000 : basePerformance.loadTime,
      firstContentfulPaint: mobileData.coreWebVitals.fcp.value ? mobileData.coreWebVitals.fcp.value / 1000 : null,
      issues: [...basePerformance.issues, ...pageSpeedIssues],
      opportunities: mobileData.opportunities || [],
      diagnostics: mobileData.diagnostics || [],
      details: {
        ...basePerformance.details,
        pageSpeedAvailable: true,
        mobileStrategy: mobileData.strategy,
        desktopStrategy: desktopData.strategy,
        lighthouseVersion: mobileData.lighthouseVersion
      }
    };
  }

  /**
   * PageSpeed データから課題を抽出
   * @param {Object} mobileData - モバイル分析データ
   * @param {Object} desktopData - デスクトップ分析データ
   * @returns {Array} 課題リスト
   */
  extractPageSpeedIssues(mobileData, desktopData) {
    const issues = [];

    // Core Web Vitals の問題をチェック
    if (mobileData.coreWebVitals.lcp.score !== null && mobileData.coreWebVitals.lcp.score < 0.5) {
      issues.push({
        type: 'error',
        message: `Largest Contentful Paint が遅いです (${mobileData.coreWebVitals.lcp.displayValue})`,
        location: 'ページ全体の読み込み性能',
        impact: '主要コンテンツの表示が遅く、ユーザーの離脱率が高くなります',
        recommendation: '画像の最適化、不要なJavaScriptの削除、サーバー応答時間の改善を行ってください',
        priority: 'high'
      });
    }

    if (mobileData.coreWebVitals.cls.score !== null && mobileData.coreWebVitals.cls.score < 0.5) {
      issues.push({
        type: 'warning',
        message: `Cumulative Layout Shift が大きいです (${mobileData.coreWebVitals.cls.displayValue})`,
        location: 'ページレイアウトの安定性',
        impact: 'ページ読み込み時にレイアウトが崩れ、ユーザビリティが低下します',
        recommendation: '画像のwidth/height属性の設定、フォントの最適化、動的コンテンツの事前確保を行ってください',
        priority: 'medium'
      });
    }

    if (mobileData.coreWebVitals.fcp.score !== null && mobileData.coreWebVitals.fcp.score < 0.5) {
      issues.push({
        type: 'warning',
        message: `First Contentful Paint が遅いです (${mobileData.coreWebVitals.fcp.displayValue})`,
        location: '初期コンテンツの表示性能',
        impact: '最初のコンテンツ表示が遅く、ユーザーが待機時間を長く感じます',
        recommendation: 'クリティカルなCSS・JavaScriptの最適化、サーバー応答時間の改善を行ってください',
        priority: 'medium'
      });
    }

    // パフォーマンススコアの差をチェック
    if (mobileData.scores.performance && desktopData.scores.performance) {
      const scoreDiff = desktopData.scores.performance - mobileData.scores.performance;
      if (scoreDiff > 20) {
        issues.push({
          type: 'warning',
          message: `モバイルとデスクトップのパフォーマンス差が大きいです (${scoreDiff}点差)`,
          location: 'モバイル最適化',
          impact: 'モバイルユーザーの体験が大幅に劣化しています',
          recommendation: 'モバイル向けの画像最適化、JavaScriptの最適化、レスポンシブ対応の改善を行ってください',
          priority: 'high'
        });
      }
    }

    return issues;
  }

  // デフォルト結果を返すメソッド群
  getDefaultSeoResults() {
    return { score: 50, issues: [], details: {} };
  }

  getDefaultPerformanceResults() {
    return { score: 50, issues: [], details: {}, loadTime: null };
  }

  getDefaultSecurityResults() {
    return { score: 50, issues: [], details: {} };
  }

  getDefaultAccessibilityResults() {
    return { score: 50, issues: [], details: {}, violations: 0 };
  }

  getDefaultMobileResults() {
    return { score: 50, issues: [], details: {}, isResponsive: false };
  }

  /**
   * レスポンシブデザインの詳細分析
   * @param {object} $ - Cheerio オブジェクト
   * @param {object} pageInfo - ページ情報
   * @returns {object} レスポンシブ分析結果
   */
  analyzeResponsiveDesign($, pageInfo) {
    let score = 0;
    let responsiveIndicators = [];
    let recommendations = [];

    // 1. ビューポートメタタグの確認（必須条件）
    const viewport = $('meta[name="viewport"]').attr('content');
    const hasViewportMeta = !!viewport;
    
    if (hasViewportMeta) {
      score += 25;
      responsiveIndicators.push('ビューポートメタタグ設定済み');
      
      if (viewport.includes('width=device-width')) {
        score += 15;
        responsiveIndicators.push('適切なビューポート幅設定');
      }
    } else {
      recommendations.push('ビューポートメタタグを追加してください: <meta name="viewport" content="width=device-width, initial-scale=1.0">');
    }

    // 2. CSSメディアクエリの検出（複数の方法）
    const html = $.html();
    let hasMediaQueries = false;
    
    // 内部スタイルのメディアクエリ
    const inlineMediaQueries = /<style[^>]*>[\s\S]*?@media[^{]*\{[\s\S]*?\}[\s\S]*?<\/style>/gi.test(html);
    
    // CSSファイルのリンクから推測
    const cssLinks = $('link[rel="stylesheet"]');
    const hasCssFiles = cssLinks.length > 0;
    
    // レスポンシブを示唆するCSSクラス名の検出
    const responsiveClassPatterns = [
      /\b(col-|row-|grid-|flex-|responsive|mobile|tablet|desktop)\b/gi,
      /\b(sm-|md-|lg-|xl-|xs-)\b/gi,
      /\b(container|wrapper|layout)\b/gi
    ];
    
    let hasResponsiveClasses = false;
    responsiveClassPatterns.forEach(pattern => {
      if (pattern.test(html)) {
        hasResponsiveClasses = true;
      }
    });

    if (inlineMediaQueries) {
      hasMediaQueries = true;
      score += 20;
      responsiveIndicators.push('内部CSSメディアクエリ検出');
    }
    
    if (hasCssFiles) {
      // 外部CSSファイルがある場合、レスポンシブの可能性が高い
      score += 10;
      responsiveIndicators.push('外部CSSファイル使用');
    }
    
    if (hasResponsiveClasses) {
      score += 15;
      responsiveIndicators.push('レスポンシブクラス名検出');
    }

    // 3. レスポンシブフレームワークの詳細検出
    const frameworkPatterns = {
      'Bootstrap': ['bootstrap', 'bs-', 'container-fluid'],
      'Foundation': ['foundation', 'row', 'columns'],
      'Bulma': ['bulma', 'is-', 'has-'],
      'Tailwind CSS': ['tailwind', 'sm:', 'md:', 'lg:', 'xl:'],
      'Material UI': ['mui-', 'material-ui'],
      'Semantic UI': ['ui container', 'ui grid'],
      'CSS Grid': ['grid-template', 'grid-area'],
      'Flexbox': ['flex', 'justify-', 'align-']
    };

    let detectedFrameworks = [];
    let responsiveFrameworks = 0;

    Object.entries(frameworkPatterns).forEach(([framework, patterns]) => {
      const hasFramework = patterns.some(pattern => 
        html.toLowerCase().includes(pattern.toLowerCase()) ||
        $(`link[href*="${pattern}"], script[src*="${pattern}"]`).length > 0
      );
      
      if (hasFramework) {
        detectedFrameworks.push(framework);
        responsiveFrameworks++;
        score += 15;
      }
    });

    if (detectedFrameworks.length > 0) {
      responsiveIndicators.push(`フレームワーク: ${detectedFrameworks.join(', ')}`);
    }

    // 4. モダンCSS技術の検出
    const modernCssFeatures = [
      { name: 'CSS Grid', pattern: /grid-template|display:\s*grid/gi },
      { name: 'Flexbox', pattern: /display:\s*flex|flex-direction/gi },
      { name: 'CSS Variables', pattern: /--[\w-]+:|var\(/gi },
      { name: 'Container Queries', pattern: /@container/gi }
    ];

    modernCssFeatures.forEach(feature => {
      if (feature.pattern.test(html)) {
        score += 8;
        responsiveIndicators.push(`${feature.name}使用`);
      }
    });

    // 5. HTML構造からの推測
    const layoutElements = $('header, nav, main, section, article, aside, footer');
    if (layoutElements.length >= 3) {
      score += 5;
      responsiveIndicators.push('セマンティックHTML構造');
    }

    // 6. 画像のレスポンシブ対応チェック
    const responsiveImages = $('img[srcset], img[sizes], picture source').length;
    const totalImages = $('img').length;
    
    if (totalImages > 0) {
      const responsiveImageRatio = responsiveImages / totalImages;
      if (responsiveImageRatio > 0.5) {
        score += 10;
        responsiveIndicators.push('レスポンシブ画像使用');
      } else if (responsiveImageRatio > 0) {
        score += 5;
        responsiveIndicators.push('一部レスポンシブ画像使用');
      }
    }

    // 最終的な判定
    const isResponsive = score >= 40 && hasViewportMeta;
    
    // 推奨事項の生成
    if (!isResponsive) {
      if (!hasViewportMeta) {
        recommendations.push('ビューポートメタタグを追加してください');
      }
      if (!hasMediaQueries && responsiveFrameworks === 0) {
        recommendations.push('CSSメディアクエリまたはレスポンシブフレームワークを実装してください');
      }
      if (detectedFrameworks.length === 0) {
        recommendations.push('Bootstrap、Tailwind CSS等のレスポンシブフレームワークの採用を検討してください');
      }
    } else if (score < 80) {
      if (responsiveImages === 0 && totalImages > 0) {
        recommendations.push('画像のレスポンシブ対応（srcset、sizes属性）を追加してください');
      }
      if (!hasResponsiveClasses) {
        recommendations.push('レスポンシブグリッドシステムの活用を検討してください');
      }
    }

    return {
      isResponsive,
      score: Math.min(score, 100),
      hasMediaQueries: hasMediaQueries || responsiveFrameworks > 0,
      responsiveFrameworks,
      detectedFrameworks,
      responsiveIndicators,
      recommendation: recommendations.length > 0 ? recommendations.join(' ') : 'レスポンシブデザインが適切に実装されています',
      details: {
        viewport: viewport || '未設定',
        hasViewportMeta,
        inlineMediaQueries,
        hasCssFiles,
        hasResponsiveClasses,
        responsiveImages,
        totalImages,
        modernCssFeatures: modernCssFeatures.filter(f => f.pattern.test(html)).map(f => f.name)
      }
    };
  }
}

module.exports = SimpleWebAnalyzer;