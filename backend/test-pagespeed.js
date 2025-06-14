const PageSpeedInsightsClient = require('./pagespeed-client');

async function testPageSpeed() {
  // 環境変数をロード
  require('dotenv').config();
  
  console.log('🔍 Environment Variables:');
  console.log('GOOGLE_PAGESPEED_API_KEY:', process.env.GOOGLE_PAGESPEED_API_KEY ? 'Set' : 'Not Set');
  console.log('Key length:', process.env.GOOGLE_PAGESPEED_API_KEY?.length || 0);
  
  const client = new PageSpeedInsightsClient();
  
  console.log('🔍 PageSpeed Client Debug:');
  console.log('API Available:', client.isApiAvailable());
  
  if (!client.isApiAvailable()) {
    console.log('❌ PageSpeed API not available');
    return;
  }
  
  try {
    console.log('Testing with https://example.com...');
    const result = await client.analyzeBothStrategies('https://example.com');
    console.log('✅ Success! Result structure:', {
      hasResult: !!result,
      hasMobile: !!result?.mobile,
      hasDesktop: !!result?.desktop,
      mobilePerformance: result?.mobile?.scores?.performance,
      desktopPerformance: result?.desktop?.scores?.performance,
      hasCoreWebVitals: !!result?.mobile?.coreWebVitals
    });
    
    if (result?.mobile?.coreWebVitals) {
      console.log('📊 Core Web Vitals:', {
        lcp: result.mobile.coreWebVitals.lcp?.displayValue,
        cls: result.mobile.coreWebVitals.cls?.displayValue,
        fcp: result.mobile.coreWebVitals.fcp?.displayValue
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testPageSpeed();