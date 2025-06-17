const SerpAnalysisService = require('./serp-analysis-service');
const axios = require('axios');
require('dotenv').config();

// server.jsから抽出した関数（簡略版）
async function extractDetailedPageContent(url) {
  try {
    const response = await axios.get(url, { timeout: 10000 });
    const title = response.data.match(/<title>(.*?)<\/title>/i)?.[1] || 'No Title';
    return {
      title: title.trim(),
      textContent: response.data.substring(0, 1000),
      properNouns: []
    };
  } catch (error) {
    return {
      title: '',
      textContent: '',
      properNouns: []
    };
  }
}

async function debugSerpAnalysis() {
  const service = new SerpAnalysisService();
  
  console.log('🔍 SERP分析サービス設定確認:');
  console.log('- isAvailable:', service.isAvailable);
  console.log('- hasApiKey:', !!process.env.GOOGLE_API_KEY);
  console.log('- hasSearchEngineId:', !!process.env.GOOGLE_SEARCH_ENGINE_ID);
  console.log('- apiKeyLength:', process.env.GOOGLE_API_KEY?.length || 0);
  console.log('- searchEngineId:', process.env.GOOGLE_SEARCH_ENGINE_ID);
  
  // サーバーと同じ方法でキーワード取得をテスト
  const url = 'https://google.com';
  
  try {
    console.log('\n🔍 サーバーと同じ方法でコンテンツ抽出:');
    const tempContent = await extractDetailedPageContent(url).catch(() => ({
      title: '', textContent: '', properNouns: []
    }));
    
    console.log('- title:', tempContent.title);
    console.log('- textContentLength:', tempContent.textContent?.length || 0);
    console.log('- properNouns:', tempContent.properNouns?.slice(0, 5) || []);
    
    const keywords = [];
    if (tempContent.title) {
      keywords.push(tempContent.title.replace(/[｜|\-\s].*/g, '').trim());
    }
    
    console.log('- extractedKeywords:', keywords);
    
    if (keywords.length === 0) {
      console.log('⚠️ キーワードが抽出されていません - これがSERP分析が実行されない原因です');
      // 手動でテストキーワードを追加
      keywords.push('Example Domain');
    }
    
    console.log('\n🔍 SERP分析実行:');
    const result = await service.analyzeSerpFeatures(url, keywords);
    
    console.log('- dataSource:', result.dataSource);
    console.log('- analyzedKeywords:', result.summary?.analyzedKeywords || 0);
    console.log('- keywordsCount:', result.keywords?.length || 0);
    console.log('- hasRecommendations:', !!result.recommendations?.length);
    
    if (result.keywords && result.keywords.length > 0) {
      console.log('- firstKeywordResult:', {
        keyword: result.keywords[0].keyword,
        totalResults: result.keywords[0].totalResults,
        position: result.keywords[0].position,
        hasError: !!result.keywords[0].error
      });
    }
    
  } catch (error) {
    console.error('❌ デバッグエラー:', error.message);
    console.error('❌ スタックトレース:', error.stack);
  }
}

debugSerpAnalysis();