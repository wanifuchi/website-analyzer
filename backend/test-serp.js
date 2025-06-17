const SerpAnalysisService = require('./serp-analysis-service');
require('dotenv').config();

const service = new SerpAnalysisService();
console.log('SERP Service Configuration:', {
  isAvailable: service.isAvailable,
  hasApiKey: !!process.env.GOOGLE_API_KEY,
  hasSearchEngineId: !!process.env.GOOGLE_SEARCH_ENGINE_ID,
  apiKeyPreview: process.env.GOOGLE_API_KEY ? 
    process.env.GOOGLE_API_KEY.substring(0, 10) + '...' : 'Not set',
  searchEngineIdPreview: process.env.GOOGLE_SEARCH_ENGINE_ID ? 
    process.env.GOOGLE_SEARCH_ENGINE_ID.substring(0, 10) + '...' : 'Not set'
});

// テスト実行
async function testSerpAnalysis() {
  try {
    const result = await service.analyzeSerpFeatures('https://example.com', ['test keyword']);
    console.log('SERP Analysis Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('SERP Analysis Error:', error.message);
  }
}

testSerpAnalysis();