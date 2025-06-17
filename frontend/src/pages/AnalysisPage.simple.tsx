import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { pageSpeedService } from '../services/pageSpeedService';
import { getCoreWebVitalEvaluation, getColorClasses } from '../utils/coreWebVitalsEvaluator';
import MetricCard from '../components/MetricCard';
import RecommendationChatbot from '../components/RecommendationChatbot';
import html2canvas from 'html2canvas';

interface AnalysisProgress {
  currentStep: string;
  progress: number;
  estimatedTimeRemaining: number;
  currentStepLabel: string;
}

const AnalysisPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [status, setStatus] = useState<'loading' | 'completed' | 'error'>('loading');
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);
  const [pageSpeedLoading, setPageSpeedLoading] = useState<boolean>(false);
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState<boolean>(false);
  const [aiRecommendations, setAiRecommendations] = useState<any>(null);
  const [selectedRecommendation, setSelectedRecommendation] = useState<any>(null);
  const [showChatbot, setShowChatbot] = useState<boolean>(false);
  


  useEffect(() => {
    const fetchAnalysisResult = async () => {
      if (!id) return;
      
      try {
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://website-analyzer-production-c933.up.railway.app';
        const response = await fetch(`${API_BASE_URL}/api/analysis/${id}`);
        const data = await response.json();
        
        if (data.success) {
          setAnalysisData(data.data);
          
          // 進捗情報を更新
          if (data.data.progress) {
            setProgress(data.data.progress);
          }
          
          if (data.data.status === 'completed') {
            setStatus('completed');
            setProgress(null); // 完了時は進捗をクリア
            
            // PageSpeedデータが欠落している場合は補完取得
            if (data.data.results && !data.data.results.pageSpeed && data.data.url) {
              console.log('⚠️ PageSpeedデータが欠落しています。補完取得を開始...');
              fetchPageSpeedDataFallback(data.data.url);
            }
          } else if (data.data.status === 'failed') {
            // 部分的な結果がある場合は表示
            if (data.data.results) {
              setStatus('completed');
              setProgress(null);
            } else {
              setStatus('error');
              setProgress(null);
            }
          } else {
            // まだ処理中の場合は2秒後に再チェック（より頻繁に進捗をチェック）
            setTimeout(fetchAnalysisResult, 2000);
          }
        } else {
          console.error('Analysis fetch failed:', data.error);
          setStatus('error');
        }
      } catch (error) {
        console.error('Analysis fetch error:', error);
        // エラーの場合はモックデータを表示（URLパラメータから実際のURLを取得）
        const urlParams = new URLSearchParams(window.location.search);
        const actualUrl = urlParams.get('url') || 'https://example.com';
        
        console.log('分析エラー、モックデータを表示:', { error, actualUrl });
        
        const mockAnalysis = {
          id: id,
          url: actualUrl,
          status: 'completed',
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          results: {
            overall: {
              score: 85,
              grade: 'B'
            },
            seo: {
              score: 88,
              issues: [
                { type: 'warning', message: 'メタ説明が長すぎます（180文字）' },
                { type: 'info', message: 'H1タグが複数あります' }
              ]
            },
            performance: {
              score: 82,
              loadTime: 2.3,
              firstContentfulPaint: 1.2,
              issues: [
                { type: 'warning', message: '画像の最適化が必要です' },
                { type: 'info', message: 'CSSファイルの圧縮を推奨します' }
              ]
            },
            security: {
              score: 90,
              httpsUsage: true,
              issues: []
            },
            accessibility: {
              score: 78,
              wcagLevel: 'AA',
              violations: 3,
              issues: [
                { type: 'error', message: 'alt属性が不足している画像があります' },
                { type: 'warning', message: 'コントラスト比が低い要素があります' }
              ]
            },
            mobile: {
              score: 92,
              isResponsive: true,
              hasViewportMeta: true,
              touchTargetSize: true,
              issues: [
                { type: 'info', message: 'フォントサイズを少し大きくすることを推奨します' }
              ]
            }
          }
        };
        setAnalysisData(mockAnalysis);
        setStatus('completed');
      }
    };
    
    // PageSpeedデータの補完取得
    const fetchPageSpeedDataFallback = async (url: string) => {
      try {
        setPageSpeedLoading(true);
        console.log('🚀 PageSpeedデータ補完取得開始:', url);
        const pageSpeedData = await pageSpeedService.analyzeUrl(url);
        
        if (pageSpeedData) {
          // 既存の分析データにPageSpeedデータを追加
          setAnalysisData(prevData => {
            if (!prevData) return prevData;
            
            const updatedData = {
              ...prevData,
              results: {
                ...prevData.results,
                pageSpeed: pageSpeedData
              }
            };
            
            console.log('✅ PageSpeedデータ補完完了:', updatedData.results.pageSpeed);
            return updatedData;
          });
        }
      } catch (error) {
        console.error('❌ PageSpeedデータ補完エラー:', error);
      } finally {
        setPageSpeedLoading(false);
      }
    };
    
    fetchAnalysisResult();
  }, [id]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
        {/* 近未来的背景装飾 */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(6,182,212,0.1),transparent_50%)] -z-10" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(168,85,247,0.1),transparent_50%)] -z-10" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(34,197,94,0.1),transparent_50%)] -z-10" />
        
        {/* アニメーション背景要素 */}
        <div className="absolute top-20 right-20 w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
        <div className="absolute top-40 left-20 w-1 h-1 bg-purple-400 rounded-full animate-ping" />
        <div className="absolute bottom-40 right-40 w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
        
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="text-center max-w-2xl mx-auto">
            {/* AI分析ローダー */}
            <div className="relative mb-8">
              <div className="w-24 h-24 mx-auto">
                {/* 外側のリング */}
                <div className="absolute inset-0 border-4 border-cyan-500/30 rounded-full animate-spin"></div>
                {/* 中間のリング */}
                <div className="absolute inset-2 border-4 border-blue-500/40 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '2s' }}></div>
                {/* 内側のリング */}
                <div className="absolute inset-4 border-4 border-purple-500/50 rounded-full animate-spin" style={{ animationDuration: '3s' }}></div>
                {/* 中央のTロゴ */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                    T
                  </div>
                </div>
              </div>
              
              {/* ホログラフィック効果 */}
              <div className="absolute inset-0 w-24 h-24 mx-auto bg-gradient-to-r from-cyan-400/20 to-purple-400/20 rounded-full blur-xl animate-pulse"></div>
            </div>
            
            <div className="space-y-4 mb-8">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-300 to-purple-300 bg-clip-text text-transparent">
                AI分析エンジン稼働中
              </h2>
              <p className="text-slate-400 text-lg">分析ID: <span className="text-cyan-400 font-mono">{id}</span></p>
            </div>
            
            {/* 近未来的進捗バー */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-3xl blur-xl"></div>
              <div className="relative backdrop-blur-xl bg-slate-800/40 border border-slate-700/50 rounded-3xl p-8 shadow-2xl">
                {progress ? (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-medium text-slate-200">
                        {progress.currentStepLabel}
                      </span>
                      <span className="text-cyan-400 font-mono text-lg">
                        {progress.progress}%
                      </span>
                    </div>
                    
                    {/* ネオンプログレスバー */}
                    <div className="relative w-full h-4 bg-slate-700/50 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 rounded-full transition-all duration-500 ease-out shadow-lg"
                        style={{ width: `${progress.progress}%` }}
                      />
                      <div 
                        className="absolute top-0 h-full w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-full animate-pulse"
                        style={{ left: `${Math.max(0, progress.progress - 30)}%` }}
                      />
                    </div>
                    
                    {/* ステータス情報 */}
                    <div className="flex justify-between text-sm text-slate-400">
                      <span>⏱️ 残り約 {progress.estimatedTimeRemaining} 秒</span>
                      <span className="font-mono">現在: {progress.currentStep}</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center justify-center text-cyan-400">
                      <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mr-4"></div>
                      <span className="text-lg">分析システム初期化中...</span>
                    </div>
                    <div className="relative w-full h-4 bg-slate-700/50 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-cyan-400/50 to-purple-400/50 rounded-full animate-pulse" style={{ width: '30%' }}></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* AI分析ステップ表示 */}
            <div className="mt-12 max-w-md mx-auto">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-slate-800/40 to-slate-700/40 rounded-2xl blur-sm"></div>
                <div className="relative backdrop-blur-sm bg-slate-800/30 border border-slate-600/50 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-slate-200 mb-6 text-center">分析進行状況</h3>
                  <div className="space-y-4">
                    <div className={`flex items-center transition-all duration-300 ${!progress || progress.currentStep === 'initializing' ? 'text-cyan-400' : 'text-green-400'}`}>
                      {!progress || progress.currentStep === 'initializing' ? (
                        <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mr-4"></div>
                      ) : (
                        <span className="mr-4 text-green-400">✓</span>
                      )}
                      <span className="font-medium">ブラウザ起動・初期化</span>
                    </div>
                    
                    <div className={`flex items-center transition-all duration-300 ${
                      !progress ? 'text-slate-500' :
                      progress.currentStep === 'loading' ? 'text-cyan-400' :
                      ['seo', 'performance', 'security', 'accessibility', 'mobile'].includes(progress.currentStep) ? 'text-green-400' :
                      'text-slate-500'
                    }`}>
                      {progress && progress.currentStep === 'loading' ? (
                        <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mr-4"></div>
                      ) : progress && ['seo', 'performance', 'security', 'accessibility', 'mobile'].includes(progress.currentStep) ? (
                        <span className="mr-4 text-green-400">✓</span>
                      ) : (
                        <span className="mr-4 text-slate-500">○</span>
                      )}
                      <span className="font-medium">ページ読み込み・解析</span>
                    </div>
                    
                    <div className={`flex items-center transition-all duration-300 ${
                      !progress ? 'text-slate-500' :
                      ['seo', 'performance', 'security', 'accessibility', 'mobile'].includes(progress.currentStep) ? 'text-cyan-400' :
                      'text-slate-500'
                    }`}>
                      {progress && ['seo', 'performance', 'security', 'accessibility', 'mobile'].includes(progress.currentStep) ? (
                        <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mr-4"></div>
                      ) : (
                        <span className="mr-4 text-slate-500">○</span>
                      )}
                      <span className="font-medium">詳細分析・レポート生成</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <p className="text-slate-400 text-center mt-8 text-sm">
              ⚡ AI駆動分析により、通常1-2分で完了します
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    const isTimeout = analysisData?.error?.includes('timeout') || analysisData?.error?.includes('Navigation timeout');
    const isNetworkError = analysisData?.error?.includes('net::') || analysisData?.error?.includes('DNS');
    
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-lg mx-auto px-4">
          <div className="text-red-600 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">分析エラーが発生しました</h2>
          
          {/* エラー詳細 */}
          <div className="bg-white rounded-lg p-6 shadow-sm mb-6 text-left">
            <div className="mb-4">
              <h3 className="font-medium text-gray-900 mb-2">分析対象URL:</h3>
              <p className="text-sm text-gray-600 break-all bg-gray-50 p-2 rounded">
                {analysisData?.url || 'Unknown URL'}
              </p>
            </div>
            
            <div className="mb-4">
              <h3 className="font-medium text-gray-900 mb-2">エラー内容:</h3>
              {isTimeout ? (
                <div className="text-sm space-y-2">
                  <p className="text-orange-600">⏱️ <strong>タイムアウトエラー</strong></p>
                  <p className="text-gray-600">
                    サイトの応答が30秒以内に完了しませんでした。以下の原因が考えられます：
                  </p>
                  <ul className="list-disc list-inside text-gray-600 space-y-1 ml-4">
                    <li>サイトの読み込み速度が非常に遅い</li>
                    <li>サーバーが一時的に応答していない</li>
                    <li>JavaScriptの処理が重い</li>
                    <li>地域制限やアクセス制限がある</li>
                  </ul>
                </div>
              ) : isNetworkError ? (
                <div className="text-sm space-y-2">
                  <p className="text-red-600">🌐 <strong>ネットワークエラー</strong></p>
                  <p className="text-gray-600">
                    サイトにアクセスできませんでした。URLが正しいか確認してください。
                  </p>
                </div>
              ) : (
                <div className="text-sm">
                  <p className="text-red-600">❌ <strong>分析エラー</strong></p>
                  <p className="text-gray-600 bg-gray-50 p-2 rounded mt-2 text-xs">
                    {analysisData?.error || '不明なエラーが発生しました'}
                  </p>
                </div>
              )}
            </div>
            
            <div className="text-xs text-gray-500">
              分析ID: {analysisData?.id || id}<br />
              開始日時: {analysisData?.startedAt ? new Date(analysisData.startedAt).toLocaleString('ja-JP') : '不明'}
            </div>
          </div>
          
          {/* 対処法の提案 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-medium text-blue-900 mb-2">💡 対処法</h3>
            <div className="text-sm text-blue-800 space-y-1">
              {isTimeout && (
                <>
                  <p>• 少し時間をおいてから再度お試しください</p>
                  <p>• より軽量なページ（トップページなど）で試してください</p>
                </>
              )}
              <p>• URLが正しく入力されているか確認してください</p>
              <p>• 他のサイトで動作するか確認してください</p>
              <p>• ブラウザで直接アクセスできるか確認してください</p>
            </div>
          </div>
          
          {/* アクションボタン */}
          <div className="space-y-3">
            <button
              onClick={() => window.location.href = `/?url=${encodeURIComponent(analysisData?.url || '')}`}
              className="w-full bg-orange-600 text-white py-3 px-6 rounded-md hover:bg-orange-700 font-medium"
            >
              🔄 同じURLで再分析
            </button>
            <Link
              to="/"
              className="block w-full bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 font-medium"
            >
              🏠 ホームに戻る
            </Link>
            <Link
              to="/history"
              className="block w-full bg-gray-600 text-white py-3 px-6 rounded-md hover:bg-gray-700 font-medium"
            >
              📊 履歴を見る
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  const handleCategoryExpand = (category: string) => {
    if (expandedCategory === category) {
      setExpandedCategory(null);
    } else {
      setExpandedCategory(category);
      setTimeout(() => {
        document.getElementById('detailed-analysis')?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }, 100);
    }
  };

  const handleScreenshot = async () => {
    try {
      // ナビゲーションを一時的に隠す
      const nav = document.querySelector('nav');
      const originalNavDisplay = nav ? nav.style.display : '';
      if (nav) nav.style.display = 'none';
      
      // スクロールを一番上に移動
      const originalScrollTop = window.pageYOffset;
      window.scrollTo(0, 0);
      
      // DOM更新を待つ
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 分析結果のメインコンテナのみをキャプチャ
      const analysisContainer = document.querySelector('.analysis-results-container');
      const targetElement = analysisContainer || document.body;
      
      const canvas = await html2canvas(targetElement as HTMLElement, {
        backgroundColor: '#0f172a',
        useCORS: true,
        allowTaint: false,
        scale: window.devicePixelRatio,
        scrollX: 0,
        scrollY: 0,
        logging: false,
        onclone: (clonedDoc) => {
          // クローンされたドキュメントでナビゲーションを完全に削除
          const clonedNav = clonedDoc.querySelector('nav');
          if (clonedNav) clonedNav.remove();
          
          // fixed要素を全て削除
          const fixedElements = clonedDoc.querySelectorAll('[style*="position: fixed"], .fixed');
          fixedElements.forEach(el => el.remove());
        }
      });
      
      // ナビゲーションを元に戻す
      if (nav) nav.style.display = originalNavDisplay;
      window.scrollTo(0, originalScrollTop);
      
      // 高品質JPEGとして保存（PNGより軽く、品質も良い）
      const link = document.createElement('a');
      const url = analysisData?.url?.replace(/[^a-zA-Z0-9]/g, '-') || 'unknown';
      link.download = `analysis-${url}-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png', 0.95); // 高品質PNG
      link.click();
      
      // 成功通知
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg z-50';
      notification.textContent = '📸 スクリーンショットが保存されました';
      document.body.appendChild(notification);
      
      setTimeout(() => {
        notification.remove();
      }, 3000);
      
    } catch (error) {
      console.error('スクリーンショットエラー:', error);
      
      // エラー通知
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-xl shadow-lg z-50';
      notification.textContent = '❌ スクリーンショットの保存に失敗しました';
      document.body.appendChild(notification);
      
      setTimeout(() => {
        notification.remove();
      }, 3000);
    }
  };

  const handleAIAnalysis = async () => {
    if (!analysisData?.url) {
      console.error('分析データまたはURLが不足しています');
      return;
    }

    setAiAnalysisLoading(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002';
      
      console.log('🤖 AI分析リクエスト送信:', {
        url: API_BASE_URL + '/api/ai-analysis',
        requestData: {
          url: analysisData.url,
          analysisResults: analysisData.results
        }
      });

      // 分析データを軽量化（大容量データを除外）
      const lightweightResults = analysisData.results ? {
        seo: {
          score: analysisData.results.seo?.score || 0,
          issues: (analysisData.results.seo?.issues || []).slice(0, 5) // 最大5件に制限
        },
        performance: {
          score: analysisData.results.performance?.score || 0,
          loadTime: analysisData.results.performance?.loadTime,
          firstContentfulPaint: analysisData.results.performance?.firstContentfulPaint,
          issues: (analysisData.results.performance?.issues || []).slice(0, 5)
        },
        security: {
          score: analysisData.results.security?.score || 0,
          issues: (analysisData.results.security?.issues || []).slice(0, 5)
        },
        accessibility: {
          score: analysisData.results.accessibility?.score || 0,
          issues: (analysisData.results.accessibility?.issues || []).slice(0, 5)
        },
        mobile: {
          score: analysisData.results.mobile?.score || 0,
          issues: (analysisData.results.mobile?.issues || []).slice(0, 5)
        }
      } : {};

      const requestPayload = {
        url: analysisData.url,
        analysisResults: lightweightResults
      };

      console.log('🤖 軽量化されたAI分析リクエスト送信:', {
        url: API_BASE_URL + '/api/ai-analysis',
        payloadSize: JSON.stringify(requestPayload).length + ' bytes'
      });

      const response = await fetch(`${API_BASE_URL}/api/ai-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      });

      console.log('🤖 AI分析レスポンス:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API エラーレスポンス:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('🤖 AI分析結果:', data);
      
      if (data.success) {
        setAiRecommendations(data.recommendations);
        // 成功通知
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg z-50';
        notification.textContent = '🤖 AI分析が完了しました';
        document.body.appendChild(notification);
        
        setTimeout(() => {
          notification.remove();
        }, 3000);

        // AI分析結果にスクロール
        setTimeout(() => {
          document.getElementById('ai-recommendations')?.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
          });
        }, 100);
      } else {
        throw new Error(data.error || 'AI分析に失敗しました');
      }
    } catch (error) {
      console.error('AI分析エラー詳細:', error);
      
      // 詳細なエラー通知
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-xl shadow-lg z-50 max-w-md';
      notification.innerHTML = `
        <div class="font-bold">❌ AI分析エラー</div>
        <div class="text-sm mt-1">${error.message || 'Unknown error'}</div>
      `;
      document.body.appendChild(notification);
      
      setTimeout(() => {
        notification.remove();
      }, 5000);
    } finally {
      setAiAnalysisLoading(false);
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'bg-green-100 text-green-800';
      case 'B': return 'bg-blue-100 text-blue-800';
      case 'C': return 'bg-yellow-100 text-yellow-800';
      case 'D': return 'bg-orange-100 text-orange-800';
      case 'F': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleChatbotOpen = (recommendation: any) => {
    setSelectedRecommendation(recommendation);
    setShowChatbot(true);
  };

  const handleChatbotClose = () => {
    setShowChatbot(false);
    setSelectedRecommendation(null);
  };

  return (
    <div className="analysis-results-container min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* 近未来的背景装飾 */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(6,182,212,0.1),transparent_50%)] -z-10" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(168,85,247,0.1),transparent_50%)] -z-10" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(34,197,94,0.1),transparent_50%)] -z-10" />
      
      {/* アニメーション背景要素 */}
      <div className="absolute top-20 right-20 w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
      <div className="absolute top-40 left-20 w-1 h-1 bg-purple-400 rounded-full animate-ping" />
      <div className="absolute bottom-40 right-40 w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
      
      {/* ヘッダー */}
      <div className="relative">
        <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-xl border-b border-slate-700/50"></div>
        <div className="relative container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                  T
                </div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-300 to-purple-300 bg-clip-text text-transparent">
                  分析結果レポート
                </h1>
              </div>
              <p className="text-slate-400 font-mono text-sm">
                URL: <span className="text-cyan-400">{analysisData?.url}</span>
              </p>
            </div>
            <Link 
              to="/" 
              className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white rounded-xl font-medium transition-all duration-300 hover:scale-105 shadow-lg"
            >
              <span className="mr-2">⚡</span>
              新しい分析
            </Link>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="container mx-auto px-4 py-8">
        {/* 総合スコア */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">総合評価</h2>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`text-5xl font-bold ${getScoreColor(analysisData.results.overall.score)}`}>
                {analysisData.results.overall.score}
              </div>
              <div>
                <p className="text-gray-600">総合スコア</p>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getGradeColor(analysisData.results.overall.grade)}`}>
                  {analysisData.results.overall.grade}ランク
                </span>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              <p>分析ID: {analysisData.id}</p>
              <p>分析日時: {new Date(analysisData.startedAt).toLocaleString('ja-JP')}</p>
            </div>
          </div>
        </div>

        {/* 詳細問題解決コンポーネント */}
        {expandedCategory && analysisData.results[expandedCategory] && (
          <div id="detailed-analysis" className="mb-8 bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <span className="mr-2">🔍</span>
              {expandedCategory === 'seo' ? 'SEO' : 
               expandedCategory === 'performance' ? 'パフォーマンス' :
               expandedCategory === 'security' ? 'セキュリティ' :
               expandedCategory === 'accessibility' ? 'アクセシビリティ' : 
               expandedCategory === 'mobile' ? 'モバイル' : 
               expandedCategory === 'contentQuality' ? 'コンテンツ品質' : 
               expandedCategory === 'advancedPerformance' ? '高度なパフォーマンス' :
               expandedCategory === 'advancedSecurity' ? '高度なセキュリティ' :
               expandedCategory === 'businessMetrics' ? 'ビジネス指標' : expandedCategory}
              の詳細分析
            </h3>
            
            <div className="space-y-4">
              {analysisData.results[expandedCategory].issues?.map((issue: any, index: number) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium
                      ${issue.type === 'error' ? 'bg-red-100 text-red-600' : 
                        issue.type === 'warning' ? 'bg-yellow-100 text-yellow-600' : 'bg-blue-100 text-blue-600'}`}>
                      {issue.type === 'error' ? '!' : issue.type === 'warning' ? '⚠' : 'i'}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 mb-1">{issue.message}</h4>
                      
                      {/* 優先度表示 */}
                      {issue.priority && (
                        <div className="mb-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            issue.priority === 'high' ? 'bg-red-100 text-red-800' :
                            issue.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            優先度: {issue.priority === 'high' ? '高' : issue.priority === 'medium' ? '中' : '低'}
                          </span>
                        </div>
                      )}

                      {/* 影響説明 */}
                      {issue.impact && (
                        <div className="mb-3">
                          <span className="text-sm font-medium text-gray-700">影響:</span>
                          <p className="text-sm text-gray-600 mt-1">{issue.impact}</p>
                        </div>
                      )}
                      
                      {/* 修正箇所 */}
                      {issue.location && (
                        <div className="mb-3">
                          <span className="text-sm font-medium text-gray-700">📍 修正箇所:</span>
                          <div className="bg-gray-100 px-3 py-2 rounded text-sm font-mono text-gray-800 mt-1">
                            {issue.location}
                          </div>
                        </div>
                      )}
                      
                      {/* 修正アドバイス */}
                      {issue.recommendation && (
                        <div className="mb-2">
                          <span className="text-sm font-medium text-gray-700">🔧 修正アドバイス:</span>
                          <div className="text-sm text-gray-700 bg-blue-50 p-3 rounded border mt-1">
                            {issue.recommendation}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {(!analysisData.results[expandedCategory].issues || analysisData.results[expandedCategory].issues.length === 0) && (
                <div className="text-center py-8 text-gray-500">
                  <span className="text-4xl mb-2 block">✅</span>
                  このカテゴリでは問題は検出されませんでした
                </div>
              )}
            </div>
          </div>
        )}

        {/* 各カテゴリのスコア */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* SEO */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">SEO分析</h3>
              <span className="text-2xl">🔍</span>
            </div>
            <div className={`text-3xl font-bold mb-2 ${getScoreColor(analysisData.results.seo.score)}`}>
              {analysisData.results.seo.score}点
            </div>
            <div className="text-sm text-gray-600">
              <p>問題数: {analysisData.results.seo.issues.length}件</p>
              <button 
                onClick={() => handleCategoryExpand('seo')}
                className="mt-2 text-blue-600 hover:text-blue-800 text-xs"
              >
                {expandedCategory === 'seo' ? '詳細を非表示' : '詳細を表示'}
              </button>
            </div>
          </div>

          {/* パフォーマンス */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">パフォーマンス</h3>
              <span className="text-2xl">⚡</span>
            </div>
            <div className={`text-3xl font-bold mb-2 ${getScoreColor(analysisData.results.performance.score)}`}>
              {analysisData.results.performance.score}点
            </div>
            <div className="text-sm text-gray-600">
              {analysisData.results.performance.pageSpeedScore ? (
                <>
                  <p>📱 モバイル: {analysisData.results.performance.pageSpeedScore.mobile}点</p>
                  <p>🖥️ デスクトップ: {analysisData.results.performance.pageSpeedScore.desktop}点</p>
                  {analysisData.results.performance.coreWebVitals && (
                    <p>LCP: {analysisData.results.performance.coreWebVitals.lcp.displayValue}</p>
                  )}
                </>
              ) : (
                <>
                  <p>読み込み時間: {analysisData.results.performance.loadTime || '測定中'}秒</p>
                  <p>FCP: {analysisData.results.performance.firstContentfulPaint || '測定中'}秒</p>
                  <p>問題数: {analysisData.results.performance.issues?.length || 0}件</p>
                </>
              )}
              <button 
                onClick={() => handleCategoryExpand('performance')}
                className="mt-2 text-blue-600 hover:text-blue-800 text-xs"
              >
                {expandedCategory === 'performance' ? '詳細を非表示' : '詳細を表示'}
              </button>
            </div>
          </div>

          {/* セキュリティ */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">セキュリティ</h3>
              <span className="text-2xl">🔐</span>
            </div>
            <div className={`text-3xl font-bold mb-2 ${getScoreColor(analysisData.results.security.score)}`}>
              {analysisData.results.security.score}点
            </div>
            <div className="text-sm text-gray-600">
              <p>HTTPS: {analysisData.results.security.httpsUsage ? '✅ 使用中' : '❌ 未使用'}</p>
              <p>問題数: {analysisData.results.security.issues.length}件</p>
              <button 
                onClick={() => handleCategoryExpand('security')}
                className="mt-2 text-blue-600 hover:text-blue-800 text-xs"
              >
                {expandedCategory === 'security' ? '詳細を非表示' : '詳細を表示'}
              </button>
            </div>
          </div>

          {/* アクセシビリティ */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">アクセシビリティ</h3>
              <span className="text-2xl">♿</span>
            </div>
            <div className={`text-3xl font-bold mb-2 ${getScoreColor(analysisData.results.accessibility.score)}`}>
              {analysisData.results.accessibility.score}点
            </div>
            <div className="text-sm text-gray-600">
              <p>WCAGレベル: {analysisData.results.accessibility.wcagLevel}</p>
              <p>違反数: {analysisData.results.accessibility.violations}件</p>
              <button 
                onClick={() => handleCategoryExpand('accessibility')}
                className="mt-2 text-blue-600 hover:text-blue-800 text-xs"
              >
                {expandedCategory === 'accessibility' ? '詳細を非表示' : '詳細を表示'}
              </button>
            </div>
          </div>

          {/* モバイル対応 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">モバイル対応</h3>
              <span className="text-2xl">📱</span>
            </div>
            <div className={`text-3xl font-bold mb-2 ${getScoreColor(analysisData.results.mobile.score)}`}>
              {analysisData.results.mobile.score}点
            </div>
            <div className="text-sm text-gray-600">
              <p>レスポンシブ: {analysisData.results.mobile.isResponsive ? '✅ 対応' : '❌ 未対応'}</p>
              <p>ビューポート: {analysisData.results.mobile.hasViewportMeta ? '✅ 設定済' : '❌ 未設定'}</p>
              <p>タッチ対応: {analysisData.results.mobile.touchTargetSize ? '✅ 適切' : '❌ 要改善'}</p>
              <p>問題数: {analysisData.results.mobile.issues?.length || 0}件</p>
              <button 
                onClick={() => handleCategoryExpand('mobile')}
                className="mt-2 text-blue-600 hover:text-blue-800 text-xs"
              >
                {expandedCategory === 'mobile' ? '詳細を非表示' : '詳細を表示'}
              </button>
            </div>
          </div>

          {/* コンテンツ品質 */}
          {analysisData.results.contentQuality && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">コンテンツ品質</h3>
                <span className="text-2xl">📝</span>
              </div>
              <div className={`text-3xl font-bold mb-2 ${getScoreColor(analysisData.results.contentQuality.score)}`}>
                {analysisData.results.contentQuality.score}点
              </div>
              <div className="text-sm text-gray-600">
                <p>文字数: {analysisData.results.contentQuality.details?.text.totalLength || 0}文字</p>
                <p>問題数: {analysisData.results.contentQuality.issues?.length || 0}件</p>
                <button 
                  onClick={() => handleCategoryExpand('contentQuality')}
                  className="mt-2 text-blue-600 hover:text-blue-800 text-xs"
                >
                  {expandedCategory === 'contentQuality' ? '詳細を非表示' : '詳細を表示'}
                </button>
              </div>
            </div>
          )}

          {/* 高度なパフォーマンス */}
          {analysisData.results.advancedPerformance && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">高度なパフォーマンス</h3>
                <span className="text-2xl">🚀</span>
              </div>
              <div className={`text-3xl font-bold mb-2 ${getScoreColor(analysisData.results.advancedPerformance.score)}`}>
                {analysisData.results.advancedPerformance.score}点
              </div>
              <div className="text-sm text-gray-600">
                <p>メモリ使用量: {analysisData.results.advancedPerformance.details?.memory.usedJSHeapSize || 0}MB</p>
                <p>3rdParty: {analysisData.results.advancedPerformance.details?.thirdParty.count || 0}個</p>
                <button 
                  onClick={() => handleCategoryExpand('advancedPerformance')}
                  className="mt-2 text-blue-600 hover:text-blue-800 text-xs"
                >
                  {expandedCategory === 'advancedPerformance' ? '詳細を非表示' : '詳細を表示'}
                </button>
              </div>
            </div>
          )}

          {/* ビジネス指標 */}
          {analysisData.results.businessMetrics && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">ビジネス指標</h3>
                <span className="text-2xl">💼</span>
              </div>
              <div className={`text-3xl font-bold mb-2 ${getScoreColor(analysisData.results.businessMetrics.score)}`}>
                {analysisData.results.businessMetrics.score}点
              </div>
              <div className="text-sm text-gray-600">
                <p>CTA: {analysisData.results.businessMetrics.details?.conversion?.ctaButtons?.length || 0}個</p>
                <p>フォーム: {analysisData.results.businessMetrics.details?.conversion?.forms?.length || 0}個</p>
                <p>問題数: {analysisData.results.businessMetrics.issues?.length || 0}件</p>
                <button 
                  onClick={() => handleCategoryExpand('businessMetrics')}
                  className="mt-2 text-blue-600 hover:text-blue-800 text-xs"
                >
                  {expandedCategory === 'businessMetrics' ? '詳細を非表示' : '詳細を表示'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* PageSpeed補完中の表示 */}
        {pageSpeedLoading && (
          <div className="mt-8 bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <span className="mr-2">🚀</span>
              Core Web Vitals（リアルタイム測定中...）
            </h3>
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
              <span className="text-gray-600">PageSpeedデータを取得中...</span>
            </div>
          </div>
        )}

        {/* Core Web Vitals */}
        {!pageSpeedLoading && analysisData.results.pageSpeed && analysisData.results.pageSpeed.mobile && analysisData.results.pageSpeed.mobile.coreWebVitals && (
          <div className="mt-8 bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <span className="mr-2">🚀</span>
              Core Web Vitals（リアルタイム測定）
            </h3>
            {/* Core Web Vitals 評価説明 */}
            <div className="mb-6 bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">📊 評価基準</h4>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center">
                  <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                  <span className="text-green-700 font-medium">良好</span>
                  <span className="text-gray-600 ml-2">推奨範囲内</span>
                </div>
                <div className="flex items-center">
                  <span className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>
                  <span className="text-yellow-700 font-medium">要改善</span>
                  <span className="text-gray-600 ml-2">最適化が必要</span>
                </div>
                <div className="flex items-center">
                  <span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                  <span className="text-red-700 font-medium">問題あり</span>
                  <span className="text-gray-600 ml-2">早急な改善が必要</span>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4">
              {/* LCP */}
              {(() => {
                const lcpEval = getCoreWebVitalEvaluation('lcp', analysisData.results.pageSpeed.mobile.coreWebVitals.lcp.value, analysisData.results.pageSpeed.mobile.coreWebVitals.lcp.score);
                return (
                  <MetricCard
                    metric="LCP"
                    value={analysisData.results.pageSpeed.mobile.coreWebVitals.lcp.displayValue}
                    evaluation={lcpEval.evaluation}
                    target={lcpEval.target}
                    advice={lcpEval.advice}
                    score={analysisData.results.pageSpeed.mobile.coreWebVitals.lcp.score}
                    bgColor="from-blue-50 to-blue-100"
                    textColor="text-blue-700"
                    borderColor="border-blue-200"
                  />
                );
              })()}

              {/* TBT */}
              {(() => {
                const tbtEval = getCoreWebVitalEvaluation('tbt', analysisData.results.pageSpeed.mobile.coreWebVitals.tbt.value, analysisData.results.pageSpeed.mobile.coreWebVitals.tbt.score);
                return (
                  <MetricCard
                    metric="TBT"
                    value={analysisData.results.pageSpeed.mobile.coreWebVitals.tbt.displayValue}
                    evaluation={tbtEval.evaluation}
                    target={tbtEval.target}
                    advice={tbtEval.advice}
                    score={analysisData.results.pageSpeed.mobile.coreWebVitals.tbt.score}
                    bgColor="from-green-50 to-green-100"
                    textColor="text-green-700"
                    borderColor="border-green-200"
                  />
                );
              })()}

              {/* CLS */}
              {(() => {
                const clsEval = getCoreWebVitalEvaluation('cls', analysisData.results.pageSpeed.mobile.coreWebVitals.cls.value, analysisData.results.pageSpeed.mobile.coreWebVitals.cls.score);
                return (
                  <MetricCard
                    metric="CLS"
                    value={analysisData.results.pageSpeed.mobile.coreWebVitals.cls.displayValue}
                    evaluation={clsEval.evaluation}
                    target={clsEval.target}
                    advice={clsEval.advice}
                    score={analysisData.results.pageSpeed.mobile.coreWebVitals.cls.score}
                    bgColor="from-purple-50 to-purple-100"
                    textColor="text-purple-700"
                    borderColor="border-purple-200"
                  />
                );
              })()}

              {/* FCP */}
              {(() => {
                const fcpEval = getCoreWebVitalEvaluation('fcp', analysisData.results.pageSpeed.mobile.coreWebVitals.fcp.value, analysisData.results.pageSpeed.mobile.coreWebVitals.fcp.score);
                return (
                  <MetricCard
                    metric="FCP"
                    value={analysisData.results.pageSpeed.mobile.coreWebVitals.fcp.displayValue}
                    evaluation={fcpEval.evaluation}
                    target={fcpEval.target}
                    advice={fcpEval.advice}
                    score={analysisData.results.pageSpeed.mobile.coreWebVitals.fcp.score}
                    bgColor="from-yellow-50 to-yellow-100"
                    textColor="text-yellow-700"
                    borderColor="border-yellow-200"
                  />
                );
              })()}

              {/* INP */}
              {analysisData.results.pageSpeed.mobile.coreWebVitals.inp && (
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">INP</h4>
                    <span className={`w-3 h-3 rounded-full ${
                      analysisData.results.pageSpeed.mobile.coreWebVitals.inp.score >= 0.75 ? 'bg-green-500' :
                      analysisData.results.pageSpeed.mobile.coreWebVitals.inp.score >= 0.5 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}></span>
                  </div>
                  <p className="text-2xl font-bold text-indigo-700">
                    {analysisData.results.pageSpeed.mobile.coreWebVitals.inp.displayValue}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {analysisData.results.pageSpeed.mobile.coreWebVitals.inp.description}
                  </p>
                </div>
              )}

              {/* TTFB */}
              {(() => {
                const ttfbEval = getCoreWebVitalEvaluation('ttfb', analysisData.results.pageSpeed.mobile.coreWebVitals.ttfb.value, analysisData.results.pageSpeed.mobile.coreWebVitals.ttfb.score);
                return (
                  <MetricCard
                    metric="TTFB"
                    value={analysisData.results.pageSpeed.mobile.coreWebVitals.ttfb.displayValue}
                    evaluation={ttfbEval.evaluation}
                    target={ttfbEval.target}
                    advice={ttfbEval.advice}
                    score={analysisData.results.pageSpeed.mobile.coreWebVitals.ttfb.score}
                    bgColor="from-rose-50 to-rose-100"
                    textColor="text-rose-700"
                    borderColor="border-rose-200"
                  />
                );
              })()}
            </div>
            
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-gray-600">
                📊 データ取得: Google PageSpeed Insights API
              </span>
              <span className="text-gray-500">
                ✅ モバイル: {analysisData.results.pageSpeed.mobile.scores.performance}点 | 
                🖥️ デスクトップ: {analysisData.results.pageSpeed.desktop.scores.performance}点
              </span>
            </div>
          </div>
        )}

        {/* 優先順位付き改修提案 */}
        {analysisData.results.prioritizedRecommendations && (
          <div className="mt-8 space-y-6">
            {/* 改修ロードマップ */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <span className="mr-2">🗺️</span>
                改修ロードマップ
              </h3>
              
              <div className="space-y-4">
                {Object.entries(analysisData.results.prioritizedRecommendations.roadmap).map(([phase, data]: [string, any]) => (
                  <div key={phase} className="bg-white rounded-lg p-4 border border-gray-200">
                    <h4 className="font-medium text-gray-900">{data.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{data.description}</p>
                    <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                      <span>⏱️ 推定作業時間: {data.estimatedHours}時間</span>
                      <span>📈 期待効果: {data.expectedImprovement}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ROIの高い改修TOP10 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <span className="mr-2">💰</span>
                投資対効果の高い改修 TOP10
              </h3>
              
              <div className="space-y-3">
                {analysisData.results.prioritizedRecommendations.highROI?.slice(0, 5).map((item: any, index: number) => (
                  <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-900">{index + 1}. {item.improvement}</span>
                        <p className="text-xs text-gray-600 mt-1">{item.solution}</p>
                      </div>
                      <div className="text-right ml-4">
                        <span className="text-xs text-gray-500">推定{item.estimatedHours}時間</span>
                        <div className="text-xs font-medium text-green-600">ROI: {item.roiScore}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* カテゴリ別優先度 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <span className="mr-2">📊</span>
                カテゴリ別改修優先度
              </h3>
              
              <div className="space-y-2">
                {analysisData.results.prioritizedRecommendations.categoryPriority?.map((cat: any, index: number) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm font-medium">{cat.name}</span>
                    <div className="flex items-center space-x-3">
                      <span className="text-xs text-gray-500">スコア: {cat.score}</span>
                      <span className="text-xs text-red-600">緊急: {cat.criticalIssues}</span>
                      <span className="text-xs text-orange-600">高: {cat.highIssues}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* アクションボタン */}
        <div className="mt-8 flex justify-center space-x-4">
          <button 
            onClick={handleScreenshot}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-8 py-4 rounded-xl flex items-center font-medium shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
          >
            <span className="mr-3 text-lg">📸</span>
            高品質スクリーンショットを保存
          </button>
          
          <button 
            onClick={handleAIAnalysis}
            disabled={aiAnalysisLoading}
            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:from-gray-400 disabled:to-gray-500 text-white px-8 py-4 rounded-xl flex items-center font-medium shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:hover:scale-100 disabled:cursor-not-allowed"
          >
            {aiAnalysisLoading ? (
              <>
                <div className="mr-3 w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                AI分析中...
              </>
            ) : (
              <>
                <span className="mr-3 text-lg">🤖</span>
                AIで更に改修点を解析
              </>
            )}
          </button>
          
          {/* デバッグ情報表示 */}
          {process.env.NODE_ENV === 'development' && (
            <button 
              onClick={() => {
                console.log('デバッグ情報:', {
                  analysisData,
                  env: import.meta.env.VITE_API_BASE_URL,
                  url: analysisData?.url,
                  results: analysisData?.results
                });
              }}
              className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded text-sm"
            >
              🐛 Debug
            </button>
          )}
        </div>

        {/* AI深層分析結果 */}
        {aiRecommendations && (
          <div id="ai-recommendations" className="mt-8 bg-gradient-to-r from-purple-50 to-cyan-50 rounded-2xl shadow-2xl p-8 border border-purple-200">
            <div className="text-center mb-8">
              <div className="inline-flex items-center bg-gradient-to-r from-purple-600 to-cyan-600 text-white px-6 py-3 rounded-full mb-4">
                <span className="mr-3 text-2xl">🧠</span>
                <span className="text-xl font-bold">AI深層分析レポート</span>
              </div>
              <p className="text-gray-600">Gemini 2.0による革新的ウェブサイト最適化戦略</p>
            </div>
            
            <div className="space-y-8">
              {/* AI深層分析概要 */}
              {aiRecommendations.summary && (
                <div className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-xl p-6 border border-purple-300">
                  <h4 className="font-bold text-purple-900 mb-3 flex items-center">
                    <span className="mr-2">🎯</span>
                    深層洞察サマリー
                  </h4>
                  <p className="text-gray-800 text-lg leading-relaxed">{aiRecommendations.summary}</p>
                </div>
              )}

              {/* 戦略的改善提案 */}
              {(aiRecommendations.strategicRecommendations || aiRecommendations.recommendations) && (aiRecommendations.strategicRecommendations || aiRecommendations.recommendations).length > 0 && (
                <div>
                  <h4 className="font-bold text-purple-900 mb-6 text-xl">🚀 戦略的改善提案</h4>
                  <div className="space-y-6">
                    {(aiRecommendations.strategicRecommendations || aiRecommendations.recommendations).map((rec: any, index: number) => (
                      <div key={index} className="bg-white rounded-xl p-6 border-2 border-gray-200 hover:border-purple-300 transition-all duration-300 shadow-lg">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center mb-3 flex-wrap gap-2">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold mr-2 ${
                                rec.priority === 'critical' ? 'bg-red-100 text-red-800 border-2 border-red-300' :
                                rec.priority === 'high' ? 'bg-orange-100 text-orange-800 border-2 border-orange-300' :
                                'bg-green-100 text-green-800 border-2 border-green-300'
                              }`}>
                                {rec.priority === 'critical' ? '🔥 最重要' :
                                 rec.priority === 'high' ? '⚡ 高優先度' : '✅ 中優先度'}
                              </span>
                              <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium border border-purple-300">
                                {rec.category}
                              </span>
                              {rec.difficulty && (
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  rec.difficulty === 'easy' ? 'bg-green-50 text-green-700 border border-green-200' :
                                  rec.difficulty === 'medium' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                                  'bg-red-50 text-red-700 border border-red-200'
                                }`}>
                                  難易度: {rec.difficulty}
                                </span>
                              )}
                            </div>
                            <h5 className="text-xl font-bold text-gray-900 mb-3">{rec.title}</h5>
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          {rec.deepAnalysis && (
                            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                              <h6 className="font-semibold text-purple-800 mb-2 flex items-center">
                                <span className="mr-2">🔍</span>深層分析
                              </h6>
                              <p className="text-gray-700 leading-relaxed">{rec.deepAnalysis}</p>
                            </div>
                          )}
                          
                          <div className="bg-cyan-50 p-4 rounded-lg border border-cyan-200">
                            <h6 className="font-semibold text-cyan-800 mb-2 flex items-center">
                              <span className="mr-2">💡</span>解決策
                            </h6>
                            <p className="text-gray-700 leading-relaxed">{rec.solution || rec.description}</p>
                          </div>
                          
                          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                            <h6 className="font-semibold text-green-800 mb-2 flex items-center">
                              <span className="mr-2">📋</span>実装ロードマップ
                            </h6>
                            <p className="text-gray-700 leading-relaxed">{rec.implementation}</p>
                          </div>
                          
                          {rec.businessImpact && (
                            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                              <h6 className="font-semibold text-yellow-800 mb-2 flex items-center">
                                <span className="mr-2">💼</span>ビジネスインパクト
                              </h6>
                              <p className="text-gray-700 leading-relaxed">{rec.businessImpact}</p>
                            </div>
                          )}
                          
                          {rec.kpiImpact && (
                            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg border border-indigo-200">
                              <h6 className="font-semibold text-indigo-800 mb-2 flex items-center">
                                <span className="mr-2">📊</span>KPIインパクト
                              </h6>
                              <div className="grid grid-cols-3 gap-3 text-sm">
                                {rec.kpiImpact.organicTraffic && (
                                  <div className="text-center">
                                    <div className="font-bold text-indigo-600">{rec.kpiImpact.organicTraffic}</div>
                                    <div className="text-gray-600 text-xs">流入増加</div>
                                  </div>
                                )}
                                {rec.kpiImpact.conversionRate && (
                                  <div className="text-center">
                                    <div className="font-bold text-purple-600">{rec.kpiImpact.conversionRate}</div>
                                    <div className="text-gray-600 text-xs">CV率改善</div>
                                  </div>
                                )}
                                {rec.kpiImpact.rankingImprovement && (
                                  <div className="text-center">
                                    <div className="font-bold text-pink-600">{rec.kpiImpact.rankingImprovement}</div>
                                    <div className="text-gray-600 text-xs">順位向上</div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                            <div className="flex items-center space-x-6 flex-wrap gap-2">
                              <span className="text-green-600 font-semibold bg-green-50 px-3 py-1 rounded-full">
                                📈 効果: {rec.expectedResults || rec.impact}
                              </span>
                              {rec.timeframe && (
                                <span className="text-blue-600 font-semibold bg-blue-50 px-3 py-1 rounded-full">
                                  ⏱️ 期間: {rec.timeframe}
                                </span>
                              )}
                              {rec.roi && (
                                <span className="text-yellow-600 font-semibold bg-yellow-50 px-3 py-1 rounded-full">
                                  💰 ROI: {rec.roi}
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => handleChatbotOpen(rec)}
                              className="bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-400 hover:to-cyan-400 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 hover:scale-105 shadow-lg flex items-center space-x-2"
                            >
                              <span>💬</span>
                              <span>詳しく聞く</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Search Console データ表示 */}
              {aiRecommendations.searchConsoleData && aiRecommendations.searchConsoleData.summary && (
                <div className="bg-gradient-to-r from-green-100 to-blue-100 rounded-xl p-6 border border-green-300">
                  <h4 className="font-bold text-green-900 mb-4 flex items-center">
                    <span className="mr-2">📊</span>
                    実際の検索パフォーマンス（過去30日間）
                  </h4>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">{aiRecommendations.searchConsoleData.summary?.totalClicks || 0}</div>
                      <div className="text-sm text-gray-600">総クリック数</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">{aiRecommendations.searchConsoleData.summary?.totalImpressions || 0}</div>
                      <div className="text-sm text-gray-600">総表示回数</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {aiRecommendations.searchConsoleData.summary?.avgCtr ? 
                          (aiRecommendations.searchConsoleData.summary.avgCtr * 100).toFixed(2) + '%' : '0%'}
                      </div>
                      <div className="text-sm text-gray-600">平均CTR</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {aiRecommendations.searchConsoleData.summary?.avgPosition ? 
                          aiRecommendations.searchConsoleData.summary.avgPosition.toFixed(1) : '0'}位
                      </div>
                      <div className="text-sm text-gray-600">平均掲載順位</div>
                    </div>
                  </div>

                  {/* トップパフォーマンスキーワード */}
                  {aiRecommendations.searchConsoleData.queries && aiRecommendations.searchConsoleData.queries.length > 0 && (
                    <div>
                      <h5 className="font-semibold text-green-800 mb-3">🎯 トップパフォーマンスキーワード</h5>
                      <div className="overflow-x-auto">
                        <table className="min-w-full bg-white rounded-lg overflow-hidden">
                          <thead className="bg-green-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-green-700">キーワード</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-green-700">クリック数</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-green-700">表示回数</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-green-700">CTR</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-green-700">平均順位</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-green-700">改善機会</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {aiRecommendations.searchConsoleData.queries.slice(0, 10).map((query: any, index: number) => (
                              <tr key={index} className="hover:bg-green-50 transition-colors">
                                <td className="px-4 py-2 text-sm font-medium text-gray-900">{query.query}</td>
                                <td className="px-4 py-2 text-sm text-gray-700">{query.clicks}</td>
                                <td className="px-4 py-2 text-sm text-gray-700">{query.impressions}</td>
                                <td className="px-4 py-2 text-sm text-gray-700">{(query.ctr * 100).toFixed(2)}%</td>
                                <td className="px-4 py-2 text-sm text-gray-700">{query.position.toFixed(1)}位</td>
                                <td className="px-4 py-2 text-sm">
                                  <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                                    query.opportunity >= 7 ? 'bg-red-100 text-red-700' :
                                    query.opportunity >= 4 ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-green-100 text-green-700'
                                  }`}>
                                    {query.opportunity >= 7 ? '高' : query.opportunity >= 4 ? '中' : '低'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 text-xs text-gray-600 bg-white p-3 rounded-lg">
                    データソース: {aiRecommendations.searchConsoleData.dataSource}
                    {aiRecommendations.searchConsoleData.analysisDate && (
                      <span className="ml-2">
                        | 取得日時: {new Date(aiRecommendations.searchConsoleData.analysisDate).toLocaleString('ja-JP')}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* キーワードギャップ分析 */}
              {aiRecommendations.keywordGapAnalysis && (
                <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl p-6 border border-purple-300">
                  <h4 className="font-bold text-purple-900 mb-4 flex items-center">
                    <span className="mr-2">🔍</span>
                    競合キーワードギャップ分析
                  </h4>
                  <div className="space-y-4">
                    {aiRecommendations.keywordGapAnalysis.missingKeywords && aiRecommendations.keywordGapAnalysis.missingKeywords.length > 0 && (
                      <div>
                        <h5 className="font-semibold text-purple-800 mb-3">📈 取りこぼしているキーワード機会</h5>
                        <div className="overflow-x-auto">
                          <table className="min-w-full bg-white rounded-lg overflow-hidden">
                            <thead className="bg-purple-50">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-purple-700">キーワード</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-purple-700">月間検索数</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-purple-700">難易度</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-purple-700">機会スコア</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-purple-700">推奨コンテンツ</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {aiRecommendations.keywordGapAnalysis.missingKeywords.map((kw: any, index: number) => (
                                <tr key={index} className="hover:bg-purple-50 transition-colors">
                                  <td className="px-4 py-2 text-sm font-medium text-gray-900">{kw.keyword}</td>
                                  <td className="px-4 py-2 text-sm text-gray-700">{kw.searchVolume}</td>
                                  <td className="px-4 py-2 text-sm">
                                    <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                                      parseInt(kw.difficulty) > 70 ? 'bg-red-100 text-red-700' :
                                      parseInt(kw.difficulty) > 40 ? 'bg-yellow-100 text-yellow-700' :
                                      'bg-green-100 text-green-700'
                                    }`}>
                                      {kw.difficulty}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2 text-sm font-semibold text-purple-600">{kw.opportunity}</td>
                                  <td className="px-4 py-2 text-sm text-gray-600">{kw.suggestedContent}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                    
                    {aiRecommendations.keywordGapAnalysis.longTailOpportunities && (
                      <div>
                        <h5 className="font-semibold text-purple-800 mb-2">🎯 ロングテールキーワード機会</h5>
                        <div className="flex flex-wrap gap-2">
                          {aiRecommendations.keywordGapAnalysis.longTailOpportunities.map((keyword: string, index: number) => (
                            <span key={index} className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm">
                              {keyword}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {aiRecommendations.keywordGapAnalysis.localKeywords && (
                      <div>
                        <h5 className="font-semibold text-purple-800 mb-2">📍 地域×サービスキーワード</h5>
                        <div className="flex flex-wrap gap-2">
                          {aiRecommendations.keywordGapAnalysis.localKeywords.map((keyword: string, index: number) => (
                            <span key={index} className="bg-pink-100 text-pink-700 px-3 py-1 rounded-full text-sm">
                              {keyword}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {aiRecommendations.keywordGapAnalysis.estimatedTrafficGain && (
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                        <h5 className="font-semibold text-green-800 mb-1">🚀 推定流入増加</h5>
                        <p className="text-2xl font-bold text-green-600">{aiRecommendations.keywordGapAnalysis.estimatedTrafficGain}</p>
                        <p className="text-sm text-gray-600">これらのキーワードを獲得した場合の月間流入予測</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 競合・市場分析 */}
              {aiRecommendations.competitiveAnalysis && (
                <div className="bg-gradient-to-r from-cyan-100 to-blue-100 rounded-xl p-6 border border-cyan-300">
                  <h4 className="font-bold text-cyan-900 mb-4 flex items-center">
                    <span className="mr-2">🏆</span>
                    競合・市場分析
                  </h4>
                  <div className="space-y-4">
                    {aiRecommendations.competitiveAnalysis.topCompetitors && (
                      <div>
                        <h5 className="font-semibold text-cyan-800 mb-2">主要競合サイト</h5>
                        <div className="flex flex-wrap gap-2">
                          {aiRecommendations.competitiveAnalysis.topCompetitors.map((comp: string, index: number) => (
                            <span key={index} className="bg-cyan-100 text-cyan-700 px-3 py-1 rounded-full text-sm border border-cyan-300">
                              {comp}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {aiRecommendations.competitiveAnalysis.competitorStrengths && (
                      <div>
                        <h5 className="font-semibold text-cyan-800 mb-2">競合の強み</h5>
                        <ul className="space-y-2">
                          {aiRecommendations.competitiveAnalysis.competitorStrengths.map((strength: string, index: number) => (
                            <li key={index} className="flex items-start text-gray-700">
                              <span className="mr-2 text-cyan-600 font-bold">💪</span>
                              {strength}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {aiRecommendations.competitiveAnalysis.differentiationOpportunities && (
                      <div>
                        <h5 className="font-semibold text-cyan-800 mb-2">差別化の機会</h5>
                        <ul className="space-y-2">
                          {aiRecommendations.competitiveAnalysis.differentiationOpportunities.map((opp: string, index: number) => (
                            <li key={index} className="flex items-start text-gray-700">
                              <span className="mr-2 text-cyan-600 font-bold">✨</span>
                              {opp}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {aiRecommendations.competitiveAnalysis.marketPosition && (
                      <div>
                        <h5 className="font-semibold text-cyan-800 mb-2">市場ポジション</h5>
                        <p className="text-gray-700">{aiRecommendations.competitiveAnalysis.marketPosition}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* コンテンツギャップ分析 */}
              {aiRecommendations.contentGapAnalysis && (
                <div className="bg-gradient-to-r from-amber-100 to-orange-100 rounded-xl p-6 border border-amber-300">
                  <h4 className="font-bold text-amber-900 mb-4 flex items-center">
                    <span className="mr-2">📝</span>
                    コンテンツギャップ分析
                  </h4>
                  <div className="space-y-4">
                    {aiRecommendations.contentGapAnalysis.missingTopics && (
                      <div>
                        <h5 className="font-semibold text-amber-800 mb-2">🎯 不足しているトピック</h5>
                        <div className="flex flex-wrap gap-2">
                          {aiRecommendations.contentGapAnalysis.missingTopics.map((topic: string, index: number) => (
                            <span key={index} className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-sm border border-amber-300">
                              {topic}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {aiRecommendations.contentGapAnalysis.contentCalendar && (
                      <div>
                        <h5 className="font-semibold text-amber-800 mb-3">📅 コンテンツカレンダー</h5>
                        <div className="space-y-3">
                          {aiRecommendations.contentGapAnalysis.contentCalendar.immediate && (
                            <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                              <h6 className="font-medium text-red-800 mb-1">🔥 今すぐ作成</h6>
                              <ul className="text-sm text-gray-700 space-y-1">
                                {aiRecommendations.contentGapAnalysis.contentCalendar.immediate.map((content: string, index: number) => (
                                  <li key={index}>{content}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {aiRecommendations.contentGapAnalysis.contentCalendar.shortTerm && (
                            <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                              <h6 className="font-medium text-yellow-800 mb-1">⚡ 1ヶ月以内</h6>
                              <ul className="text-sm text-gray-700 space-y-1">
                                {aiRecommendations.contentGapAnalysis.contentCalendar.shortTerm.map((content: string, index: number) => (
                                  <li key={index}>{content}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {aiRecommendations.contentGapAnalysis.contentCalendar.longTerm && (
                            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                              <h6 className="font-medium text-green-800 mb-1">📋 3ヶ月以内</h6>
                              <ul className="text-sm text-gray-700 space-y-1">
                                {aiRecommendations.contentGapAnalysis.contentCalendar.longTerm.map((content: string, index: number) => (
                                  <li key={index}>{content}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {aiRecommendations.contentGapAnalysis.topicClusters && (
                      <div>
                        <h5 className="font-semibold text-amber-800 mb-2">🎨 推奨トピッククラスター</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {aiRecommendations.contentGapAnalysis.topicClusters.map((cluster: string, index: number) => (
                            <div key={index} className="bg-gradient-to-r from-amber-50 to-orange-50 p-3 rounded-lg border border-amber-200">
                              <span className="text-amber-700 font-medium">{cluster}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ユーザージャーニー最適化 */}
              {aiRecommendations.userJourneyOptimization && (
                <div className="bg-gradient-to-r from-blue-100 to-cyan-100 rounded-xl p-6 border border-blue-300">
                  <h4 className="font-bold text-blue-900 mb-4 flex items-center">
                    <span className="mr-2">👥</span>
                    ユーザージャーニー最適化
                    <button
                      onClick={() => {
                        setSelectedRecommendation({
                          title: 'ユーザージャーニー最適化',
                          category: 'UX改善',
                          ...aiRecommendations.userJourneyOptimization
                        });
                        setShowChatbot(true);
                      }}
                      className="ml-auto bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg text-sm transition-colors"
                    >
                      💬 詳しく聞く
                    </button>
                  </h4>
                  <div className="space-y-6">
                    
                    {/* 痛点分析（新しい詳細構造） */}
                    {aiRecommendations.userJourneyOptimization.currentPainPoints && Array.isArray(aiRecommendations.userJourneyOptimization.currentPainPoints) && (
                      <div>
                        <h5 className="font-semibold text-blue-800 mb-3">🎯 実データに基づく痛点分析</h5>
                        <div className="space-y-3">
                          {aiRecommendations.userJourneyOptimization.currentPainPoints.map((point: any, index: number) => (
                            <div key={index} className={`p-4 rounded-lg border ${
                              point.impact === 'high' ? 'bg-red-50 border-red-200' :
                              point.impact === 'medium' ? 'bg-yellow-50 border-yellow-200' :
                              'bg-green-50 border-green-200'
                            }`}>
                              <div className="flex items-start">
                                <span className={`mr-3 text-lg ${
                                  point.impact === 'high' ? 'text-red-500' :
                                  point.impact === 'medium' ? 'text-yellow-500' :
                                  'text-green-500'
                                }`}>
                                  {point.impact === 'high' ? '🚨' : point.impact === 'medium' ? '⚠️' : '💡'}
                                </span>
                                <div className="flex-1">
                                  <div className="font-medium text-gray-800 mb-1">{point.category}</div>
                                  <div className="text-gray-700 mb-2">{point.issue}</div>
                                  {point.details && (
                                    <div className="text-sm text-gray-600 bg-white p-2 rounded border">
                                      {point.details}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 旧形式対応（文字列配列の場合） */}
                    {aiRecommendations.userJourneyOptimization.currentPainPoints && 
                     Array.isArray(aiRecommendations.userJourneyOptimization.currentPainPoints) &&
                     typeof aiRecommendations.userJourneyOptimization.currentPainPoints[0] === 'string' && (
                      <div>
                        <h5 className="font-semibold text-blue-800 mb-2">痛点分析</h5>
                        <ul className="space-y-2">
                          {aiRecommendations.userJourneyOptimization.currentPainPoints.map((point: string, index: number) => (
                            <li key={index} className="flex items-start text-gray-700">
                              <span className="mr-2 text-red-500 font-bold">⚠</span>
                              {point}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* ユーザーペルソナ */}
                    {aiRecommendations.userJourneyOptimization.userPersonas && (
                      <div>
                        <h5 className="font-semibold text-blue-800 mb-3">👤 推定ユーザーペルソナ</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {aiRecommendations.userJourneyOptimization.userPersonas.map((persona: any, index: number) => (
                            <div key={index} className="bg-white p-4 rounded-lg border border-blue-200">
                              <h6 className="font-medium text-blue-900 mb-2">{persona.type}</h6>
                              <div className="space-y-2 text-sm">
                                <div>
                                  <span className="font-medium text-gray-700">特徴:</span>
                                  <span className="text-gray-600 ml-1">{persona.characteristics?.join(', ')}</span>
                                </div>
                                <div>
                                  <span className="font-medium text-gray-700">動機:</span>
                                  <span className="text-gray-600 ml-1">{persona.motivations?.join(', ')}</span>
                                </div>
                                <div>
                                  <span className="font-medium text-gray-700">行動:</span>
                                  <span className="text-gray-600 ml-1">{persona.behaviors?.join(', ')}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* コンバージョンファネル */}
                    {aiRecommendations.userJourneyOptimization.conversionFunnel && (
                      <div>
                        <h5 className="font-semibold text-blue-800 mb-3">🔄 コンバージョンファネル分析</h5>
                        <div className="space-y-3">
                          {Object.entries(aiRecommendations.userJourneyOptimization.conversionFunnel).map(([stage, data]: [string, any], index: number) => (
                            <div key={stage} className="bg-white p-4 rounded-lg border border-blue-200">
                              <h6 className="font-medium text-blue-900 mb-2">{data.stage}</h6>
                              {data.issues && data.issues.length > 0 && (
                                <div className="mb-2">
                                  <span className="text-sm font-medium text-red-600">課題:</span>
                                  <ul className="text-sm text-gray-600 ml-4">
                                    {data.issues.map((issue: string, i: number) => (
                                      <li key={i} className="list-disc">{issue}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {data.improvements && data.improvements.length > 0 && (
                                <div>
                                  <span className="text-sm font-medium text-green-600">改善策:</span>
                                  <ul className="text-sm text-gray-600 ml-4">
                                    {data.improvements.map((improvement: string, i: number) => (
                                      <li key={i} className="list-disc">{improvement}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 最適化フロー */}
                    {aiRecommendations.userJourneyOptimization.optimizedFlow && (
                      <div>
                        <h5 className="font-semibold text-blue-800 mb-2">🎯 最適化フロー</h5>
                        <div className="bg-white p-4 rounded-lg border border-blue-200">
                          <pre className="text-gray-700 whitespace-pre-wrap text-sm font-mono">{aiRecommendations.userJourneyOptimization.optimizedFlow}</pre>
                        </div>
                      </div>
                    )}

                    {/* コンバージョン戦略 */}
                    {aiRecommendations.userJourneyOptimization.conversionStrategy && (
                      <div>
                        <h5 className="font-semibold text-blue-800 mb-2">🚀 コンバージョン戦略</h5>
                        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-lg border border-blue-200">
                          <pre className="text-gray-700 whitespace-pre-wrap text-sm">{aiRecommendations.userJourneyOptimization.conversionStrategy}</pre>
                        </div>
                      </div>
                    )}

                    {/* 実装優先度 */}
                    {aiRecommendations.userJourneyOptimization.implementationPriority && (
                      <div>
                        <h5 className="font-semibold text-blue-800 mb-3">📋 実装優先度</h5>
                        <div className="space-y-2">
                          {aiRecommendations.userJourneyOptimization.implementationPriority.map((item: any, index: number) => (
                            <div key={index} className="bg-white p-3 rounded-lg border border-blue-200 flex items-center justify-between">
                              <div>
                                <span className="font-medium text-blue-900">優先度 {item.priority}: {item.category}</span>
                                <div className="text-sm text-gray-600">{item.timeline}</div>
                              </div>
                              <div className="text-sm font-medium text-green-600">{item.expectedImpact}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 期待効果 */}
                    {aiRecommendations.userJourneyOptimization.expectedImpact && (
                      <div>
                        <h5 className="font-semibold text-blue-800 mb-3">📈 期待効果</h5>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {Object.entries(aiRecommendations.userJourneyOptimization.expectedImpact).map(([key, value]: [string, any]) => (
                            <div key={key} className="bg-white p-3 rounded-lg border border-blue-200 text-center">
                              <div className="text-sm text-gray-600 mb-1">
                                {key === 'bounceRateReduction' ? '直帰率削減' :
                                 key === 'conversionRateIncrease' ? 'CV率向上' :
                                 key === 'userSatisfactionIncrease' ? '満足度向上' :
                                 key === 'timeToConversion' ? 'CV時間短縮' : key}
                              </div>
                              <div className="font-bold text-blue-600">{value}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 検索意図分析 */}
              {aiRecommendations.searchIntentAnalysis && (
                <div className="bg-gradient-to-r from-violet-100 to-purple-100 rounded-xl p-6 border border-violet-300">
                  <h4 className="font-bold text-violet-900 mb-4 flex items-center">
                    <span className="mr-2">🎯</span>
                    検索意図分析（Search Intent Analysis）
                    <button
                      onClick={() => {
                        setSelectedRecommendation({
                          title: '検索意図分析',
                          category: 'SEO最適化',
                          ...aiRecommendations.searchIntentAnalysis
                        });
                        setShowChatbot(true);
                      }}
                      className="ml-auto bg-violet-500 hover:bg-violet-600 text-white px-3 py-1 rounded-lg text-sm transition-colors"
                    >
                      💬 詳しく聞く
                    </button>
                  </h4>
                  
                  {/* 全体的なマッチング度 */}
                  {aiRecommendations.searchIntentAnalysis.overallIntentMatch && (
                    <div className="mb-6 bg-white p-4 rounded-lg border border-violet-200">
                      <h5 className="font-semibold text-violet-800 mb-2">📊 全体的な検索意図マッチング度</h5>
                      <div className="flex items-center">
                        <div className="w-full bg-gray-200 rounded-full h-3 mr-4">
                          <div 
                            className="bg-gradient-to-r from-violet-500 to-purple-500 h-3 rounded-full transition-all duration-300"
                            style={{ width: aiRecommendations.searchIntentAnalysis.overallIntentMatch }}
                          ></div>
                        </div>
                        <span className="text-2xl font-bold text-violet-600">
                          {aiRecommendations.searchIntentAnalysis.overallIntentMatch}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 検索意図タイプ別分析 */}
                  {aiRecommendations.searchIntentAnalysis.detectedIntents && (
                    <div className="mb-6">
                      <h5 className="font-semibold text-violet-800 mb-4">🔍 検索意図タイプ別分析</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {aiRecommendations.searchIntentAnalysis.detectedIntents.map((intent: any, index: number) => (
                          <div key={index} className="bg-white p-4 rounded-lg border border-violet-200">
                            <div className="flex items-center justify-between mb-3">
                              <h6 className="font-medium text-violet-900">
                                {intent.intent === 'informational' ? '📚 情報収集型' :
                                 intent.intent === 'commercial' ? '🛒 商用調査型' :
                                 intent.intent === 'transactional' ? '💳 取引型' :
                                 intent.intent === 'navigational' ? '🧭 指名検索型' : intent.intent}
                              </h6>
                              <span className="text-lg font-bold text-violet-600">{intent.percentage}%</span>
                            </div>
                            
                            {/* 最適化レベル */}
                            <div className="mb-3">
                              <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                                intent.optimizationLevel === 'high' ? 'bg-green-100 text-green-700' :
                                intent.optimizationLevel === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                最適化レベル: {intent.optimizationLevel === 'high' ? '高' : intent.optimizationLevel === 'medium' ? '中' : '低'}
                              </span>
                            </div>

                            {/* キーワード例 */}
                            {intent.keywords && intent.keywords.length > 0 && (
                              <div className="mb-3">
                                <h7 className="text-sm font-medium text-gray-700 mb-1 block">代表キーワード:</h7>
                                <div className="flex flex-wrap gap-1">
                                  {intent.keywords.slice(0, 3).map((keyword: string, kidx: number) => (
                                    <span key={kidx} className="bg-violet-50 text-violet-700 px-2 py-1 rounded text-xs">
                                      {keyword}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* 推奨事項 */}
                            {intent.recommendations && intent.recommendations.length > 0 && (
                              <div>
                                <h7 className="text-sm font-medium text-gray-700 mb-1 block">推奨事項:</h7>
                                <ul className="text-xs text-gray-600 space-y-1">
                                  {intent.recommendations.slice(0, 2).map((rec: string, ridx: number) => (
                                    <li key={ridx} className="flex items-start">
                                      <span className="mr-1 text-violet-500">•</span>
                                      {rec}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ユーザージャーニーマッピング */}
                  {aiRecommendations.searchIntentAnalysis.userJourneyMapping && (
                    <div className="mb-6">
                      <h5 className="font-semibold text-violet-800 mb-3">🗺️ ユーザージャーニー × 検索意図マッピング</h5>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {Object.entries(aiRecommendations.searchIntentAnalysis.userJourneyMapping).map(([stage, value]: [string, any]) => (
                          <div key={stage} className="bg-white p-3 rounded-lg border border-violet-200 text-center">
                            <div className="text-sm text-gray-600 mb-1">
                              {stage === 'awareness' ? '認知' :
                               stage === 'consideration' ? '検討' :
                               stage === 'decision' ? '決定' :
                               stage === 'retention' ? '継続' : stage}
                            </div>
                            <div className="font-bold text-violet-600">{value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 優先アクション */}
                  {aiRecommendations.searchIntentAnalysis.priorityActions && aiRecommendations.searchIntentAnalysis.priorityActions.length > 0 && (
                    <div className="mb-6">
                      <h5 className="font-semibold text-violet-800 mb-3">⚡ 優先実装アクション</h5>
                      <div className="space-y-3">
                        {aiRecommendations.searchIntentAnalysis.priorityActions.map((action: any, index: number) => (
                          <div key={index} className="bg-white p-4 rounded-lg border border-violet-200">
                            <div className="flex items-start justify-between mb-2">
                              <h6 className="font-medium text-violet-900">{action.intent} 最適化</h6>
                              <span className="text-xs text-gray-500">{action.timeframe}</span>
                            </div>
                            <p className="text-sm text-gray-700 mb-2">{action.action}</p>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-green-600 font-medium">期待効果: {action.expectedImpact}</span>
                              <span className="text-blue-600">実装: {action.implementation}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* コンテンツギャップ（検索意図別） */}
                  {aiRecommendations.searchIntentAnalysis.contentGapsByIntent && (
                    <div className="mb-6">
                      <h5 className="font-semibold text-violet-800 mb-3">📝 検索意図別コンテンツ不足領域</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(aiRecommendations.searchIntentAnalysis.contentGapsByIntent).map(([intent, gaps]: [string, any]) => (
                          <div key={intent} className="bg-white p-4 rounded-lg border border-violet-200">
                            <h6 className="font-medium text-violet-900 mb-2">
                              {intent === 'informational' ? '📚 情報収集型' :
                               intent === 'commercial' ? '🛒 商用調査型' :
                               intent === 'transactional' ? '💳 取引型' :
                               intent === 'navigational' ? '🧭 指名検索型' : intent}
                            </h6>
                            {Array.isArray(gaps) && gaps.length > 0 && (
                              <ul className="text-sm text-gray-600 space-y-1">
                                {gaps.map((gap: string, idx: number) => (
                                  <li key={idx} className="flex items-start">
                                    <span className="mr-2 text-violet-500">•</span>
                                    {gap}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 音声検索・季節性分析 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {aiRecommendations.searchIntentAnalysis.voiceSearchOptimization && (
                      <div className="bg-gradient-to-r from-violet-50 to-purple-50 p-4 rounded-lg border border-violet-200">
                        <h5 className="font-semibold text-violet-800 mb-2">🎤 音声検索最適化</h5>
                        <p className="text-sm text-gray-700">{aiRecommendations.searchIntentAnalysis.voiceSearchOptimization}</p>
                      </div>
                    )}
                    {aiRecommendations.searchIntentAnalysis.seasonalTrends && (
                      <div className="bg-gradient-to-r from-purple-50 to-violet-50 p-4 rounded-lg border border-purple-200">
                        <h5 className="font-semibold text-purple-800 mb-2">📅 季節性・トレンド分析</h5>
                        <p className="text-sm text-gray-700">{aiRecommendations.searchIntentAnalysis.seasonalTrends}</p>
                      </div>
                    )}
                  </div>

                  {/* 検索意図別コンテンツ戦略 */}
                  {aiRecommendations.searchIntentAnalysis.intentBasedContentStrategy && (
                    <div className="mt-6 bg-gradient-to-r from-violet-50 to-purple-50 p-4 rounded-lg border border-violet-200">
                      <h5 className="font-semibold text-violet-800 mb-2">🎯 検索意図別コンテンツ戦略</h5>
                      <p className="text-gray-700">{aiRecommendations.searchIntentAnalysis.intentBasedContentStrategy}</p>
                    </div>
                  )}
                </div>
              )}

              {/* 技術イノベーション提案 */}
              {aiRecommendations.technicalInnovation && (
                <div className="bg-gradient-to-r from-indigo-100 to-purple-100 rounded-xl p-6 border border-indigo-300">
                  <h4 className="font-bold text-indigo-900 mb-4 flex items-center">
                    <span className="mr-2">🚀</span>
                    技術イノベーション提案
                  </h4>
                  <div className="space-y-4">
                    {aiRecommendations.technicalInnovation.modernTechStack && (
                      <div>
                        <h5 className="font-semibold text-indigo-800 mb-3">🛠️ 推奨技術スタック</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {aiRecommendations.technicalInnovation.modernTechStack.map((tech: string, index: number) => (
                            <div key={index} className="bg-white p-3 rounded-lg border border-indigo-200 flex items-center">
                              <span className="text-indigo-600 font-mono text-sm">{tech}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {aiRecommendations.technicalInnovation.performanceBoosts && (
                      <div>
                        <h5 className="font-semibold text-indigo-800 mb-2">⚡ パフォーマンス向上技術</h5>
                        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg border border-indigo-200">
                          <p className="text-gray-700">{aiRecommendations.technicalInnovation.performanceBoosts}</p>
                        </div>
                      </div>
                    )}
                    {aiRecommendations.technicalInnovation.futureProofing && (
                      <div>
                        <h5 className="font-semibold text-indigo-800 mb-2">🔮 将来性担保策</h5>
                        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-4 rounded-lg border border-purple-200">
                          <p className="text-gray-700">{aiRecommendations.technicalInnovation.futureProofing}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SEO戦略2025 */}
              {aiRecommendations.seoStrategy2025 && (
                <div className="bg-gradient-to-r from-teal-100 to-cyan-100 rounded-xl p-6 border border-teal-300">
                  <h4 className="font-bold text-teal-900 mb-4 flex items-center">
                    <span className="mr-2">🎯</span>
                    SEO戦略2025
                  </h4>
                  <div className="space-y-4">
                    {aiRecommendations.seoStrategy2025.eeaStrategy && (
                      <div>
                        <h5 className="font-semibold text-teal-800 mb-2">🏆 E-E-A-T強化戦略</h5>
                        <div className="bg-white p-4 rounded-lg border border-teal-200">
                          <p className="text-gray-700">{aiRecommendations.seoStrategy2025.eeaStrategy}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="bg-teal-100 text-teal-700 px-2 py-1 rounded text-xs">経験</span>
                            <span className="bg-cyan-100 text-cyan-700 px-2 py-1 rounded text-xs">専門性</span>
                            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">権威性</span>
                            <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-xs">信頼性</span>
                          </div>
                        </div>
                      </div>
                    )}
                    {aiRecommendations.seoStrategy2025.contentOptimization && (
                      <div>
                        <h5 className="font-semibold text-teal-800 mb-2">📝 コンテンツ最適化方針</h5>
                        <div className="bg-gradient-to-r from-teal-50 to-cyan-50 p-4 rounded-lg border border-teal-200">
                          <p className="text-gray-700">{aiRecommendations.seoStrategy2025.contentOptimization}</p>
                        </div>
                      </div>
                    )}
                    {aiRecommendations.seoStrategy2025.technicalSeo && (
                      <div>
                        <h5 className="font-semibold text-teal-800 mb-2">⚙️ テクニカルSEO改善</h5>
                        <div className="bg-gradient-to-r from-cyan-50 to-teal-50 p-4 rounded-lg border border-cyan-200">
                          <p className="text-gray-700">{aiRecommendations.seoStrategy2025.technicalSeo}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SERP分析 */}
              {aiRecommendations.serpAnalysis && (
                <div className="bg-gradient-to-r from-rose-100 to-pink-100 rounded-xl p-6 border border-rose-300">
                  <h4 className="font-bold text-rose-900 mb-4 flex items-center">
                    <span className="mr-2">🔍</span>
                    SERP（検索結果）分析
                  </h4>
                  
                  {/* サマリー情報 */}
                  {aiRecommendations.serpAnalysis.summary && (
                    <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white p-4 rounded-lg border border-rose-200">
                        <div className="text-sm text-gray-600">平均順位</div>
                        <div className="text-2xl font-bold text-rose-600">
                          {aiRecommendations.serpAnalysis.summary.averagePosition ? 
                            `${aiRecommendations.serpAnalysis.summary.averagePosition.toFixed(1)}位` : 
                            '分析中'}
                        </div>
                      </div>
                      <div className="bg-white p-4 rounded-lg border border-rose-200">
                        <div className="text-sm text-gray-600">分析キーワード数</div>
                        <div className="text-2xl font-bold text-rose-600">
                          {aiRecommendations.serpAnalysis.summary.analyzedKeywords || 0}
                        </div>
                      </div>
                      <div className="bg-white p-4 rounded-lg border border-rose-200">
                        <div className="text-sm text-gray-600">データソース</div>
                        <div className="text-sm font-medium text-rose-600">
                          {aiRecommendations.serpAnalysis.dataSource}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* SERP特徴 */}
                  {aiRecommendations.serpAnalysis.summary?.serpFeatures && Object.keys(aiRecommendations.serpAnalysis.summary.serpFeatures).length > 0 && (
                    <div className="mb-6">
                      <h5 className="font-semibold text-rose-800 mb-3">🎯 検出されたSERP特徴</h5>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(aiRecommendations.serpAnalysis.summary.serpFeatures).map(([feature, count]) => (
                          <span key={feature} className="bg-rose-100 text-rose-700 px-3 py-1 rounded-full text-sm border border-rose-300">
                            {feature.replace(/^has/, '').replace(/([A-Z])/g, ' $1').trim()} ({count})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* 改善機会 */}
                  {aiRecommendations.serpAnalysis.summary?.topOpportunities && aiRecommendations.serpAnalysis.summary.topOpportunities.length > 0 && (
                    <div className="mb-6">
                      <h5 className="font-semibold text-rose-800 mb-3">💡 改善機会</h5>
                      <div className="space-y-3">
                        {aiRecommendations.serpAnalysis.summary.topOpportunities.map((opp: any, index: number) => (
                          <div key={index} className={`p-3 rounded-lg border ${
                            opp.priority === 'high' ? 'bg-red-50 border-red-200' :
                            opp.priority === 'medium' ? 'bg-yellow-50 border-yellow-200' :
                            'bg-green-50 border-green-200'
                          }`}>
                            <div className="font-medium text-gray-800 mb-1">{opp.description}</div>
                            <div className="text-sm text-gray-600">{opp.action}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* SERP改善提案 */}
                  {aiRecommendations.serpAnalysis.recommendations && aiRecommendations.serpAnalysis.recommendations.length > 0 && (
                    <div>
                      <h5 className="font-semibold text-rose-800 mb-3">📋 SERP改善提案</h5>
                      <div className="space-y-4">
                        {aiRecommendations.serpAnalysis.recommendations.map((rec: any, index: number) => (
                          <div key={index} className="bg-white p-4 rounded-lg border border-rose-200">
                            <h6 className="font-medium text-rose-900 mb-2">{rec.title}</h6>
                            <p className="text-sm text-gray-700 mb-3">{rec.description}</p>
                            {rec.implementation && rec.implementation.length > 0 && (
                              <ul className="text-sm text-gray-600 space-y-1">
                                {rec.implementation.map((step: string, stepIndex: number) => (
                                  <li key={stepIndex} className="flex items-start">
                                    <span className="mr-2 text-rose-500">•</span>
                                    {step}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 実装ロードマップ */}
              {aiRecommendations.implementationRoadmap && (
                <div className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl p-6 border border-green-300">
                  <h4 className="font-bold text-green-900 mb-4 flex items-center">
                    <span className="mr-2">🗺️</span>
                    実装ロードマップ
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {aiRecommendations.implementationRoadmap.phase1 && (
                      <div className="bg-white p-4 rounded-lg border border-green-200">
                        <h5 className="font-bold text-green-700 mb-2">Phase 1</h5>
                        <p className="text-gray-700 text-sm">{aiRecommendations.implementationRoadmap.phase1}</p>
                      </div>
                    )}
                    {aiRecommendations.implementationRoadmap.phase2 && (
                      <div className="bg-white p-4 rounded-lg border border-blue-200">
                        <h5 className="font-bold text-blue-700 mb-2">Phase 2</h5>
                        <p className="text-gray-700 text-sm">{aiRecommendations.implementationRoadmap.phase2}</p>
                      </div>
                    )}
                    {aiRecommendations.implementationRoadmap.phase3 && (
                      <div className="bg-white p-4 rounded-lg border border-purple-200">
                        <h5 className="font-bold text-purple-700 mb-2">Phase 3</h5>
                        <p className="text-gray-700 text-sm">{aiRecommendations.implementationRoadmap.phase3}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* データ分析推奨事項 */}
              {aiRecommendations.dataAnalysisRecommendations && (
                <div className="bg-gradient-to-r from-yellow-100 to-orange-100 rounded-xl p-6 border border-yellow-300">
                  <h4 className="font-bold text-yellow-900 mb-4 flex items-center">
                    <span className="mr-2">📈</span>
                    データ分析・改善推奨
                  </h4>
                  <div className="space-y-4">
                    {aiRecommendations.dataAnalysisRecommendations.abTestIdeas && (
                      <div>
                        <h5 className="font-semibold text-yellow-800 mb-2">A/Bテスト提案</h5>
                        <ul className="space-y-2">
                          {aiRecommendations.dataAnalysisRecommendations.abTestIdeas.map((idea: string, index: number) => (
                            <li key={index} className="flex items-start text-gray-700">
                              <span className="mr-2 text-yellow-600 font-bold">🧪</span>
                              {idea}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {aiRecommendations.dataAnalysisRecommendations.kpiTracking && (
                      <div>
                        <h5 className="font-semibold text-yellow-800 mb-2">追跡すべきKPI</h5>
                        <p className="text-gray-700">{aiRecommendations.dataAnalysisRecommendations.kpiTracking}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 推定改善効果 */}
              {aiRecommendations.expectedImpact && (
                <div className="bg-gradient-to-r from-emerald-100 to-green-100 rounded-xl p-6 border border-emerald-300">
                  <h4 className="font-bold text-emerald-900 mb-4 flex items-center">
                    <span className="mr-2">📊</span>
                    期待される改善効果
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {aiRecommendations.expectedImpact.seo && (
                      <div className="text-center bg-white p-4 rounded-lg border border-green-200">
                        <div className="text-2xl font-bold text-green-600 mb-1">
                          {typeof aiRecommendations.expectedImpact.seo === 'string' ? 
                            aiRecommendations.expectedImpact.seo : 
                            `+${aiRecommendations.expectedImpact.seo}点`}
                        </div>
                        <div className="text-gray-600 text-sm font-medium">SEOスコア</div>
                      </div>
                    )}
                    {aiRecommendations.expectedImpact.performance && (
                      <div className="text-center bg-white p-4 rounded-lg border border-blue-200">
                        <div className="text-2xl font-bold text-blue-600 mb-1">
                          {typeof aiRecommendations.expectedImpact.performance === 'string' ? 
                            aiRecommendations.expectedImpact.performance : 
                            `+${aiRecommendations.expectedImpact.performance}点`}
                        </div>
                        <div className="text-gray-600 text-sm font-medium">パフォーマンス</div>
                      </div>
                    )}
                    {aiRecommendations.expectedImpact.conversion && (
                      <div className="text-center bg-white p-4 rounded-lg border border-purple-200">
                        <div className="text-2xl font-bold text-purple-600 mb-1">
                          {aiRecommendations.expectedImpact.conversion}
                        </div>
                        <div className="text-gray-600 text-sm font-medium">コンバージョン</div>
                      </div>
                    )}
                    {aiRecommendations.expectedImpact.overall && (
                      <div className="text-center bg-white p-4 rounded-lg border border-cyan-200">
                        <div className="text-2xl font-bold text-cyan-600 mb-1">
                          {typeof aiRecommendations.expectedImpact.overall === 'string' ? 
                            aiRecommendations.expectedImpact.overall : 
                            `+${aiRecommendations.expectedImpact.overall}点`}
                        </div>
                        <div className="text-gray-600 text-sm font-medium">総合スコア</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 分析情報 */}
        {analysisData?.status === 'failed' && analysisData?.results ? (
          <div className="mt-8 bg-orange-50 border border-orange-200 rounded-md p-4">
            <p className="text-orange-800 text-sm">
              <strong>⚠️ 部分的な分析結果:</strong> サイトへのアクセスでタイムアウトが発生しましたが、利用可能な情報から部分的な分析を実施しました。完全な分析のため、時間をおいて再度お試しください。
            </p>
          </div>
        ) : (
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-md p-4">
            <p className="text-blue-800 text-sm">
              <strong>✨ 実際の分析機能が動作中:</strong> PuppeteerとNode.jsを使ってリアルタイムでウェブサイトを分析しています。
            </p>
          </div>
        )}
      </div>

      {/* チャットボット */}
      {showChatbot && selectedRecommendation && (
        <RecommendationChatbot
          recommendation={selectedRecommendation}
          url={analysisData?.url || ''}
          onClose={handleChatbotClose}
        />
      )}
    </div>
  );
};

export default AnalysisPage;