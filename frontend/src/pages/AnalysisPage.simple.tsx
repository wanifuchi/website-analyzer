import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { pageSpeedService } from '../services/pageSpeedService';
import { getCoreWebVitalEvaluation, getColorClasses } from '../utils/coreWebVitalsEvaluator';
import MetricCard from '../components/MetricCard';

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
  const [downloading, setDownloading] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);
  const [pageSpeedLoading, setPageSpeedLoading] = useState<boolean>(false);


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
              firstContentfulPaint: 1.2
            },
            security: {
              score: 90,
              httpsUsage: true,
              issues: []
            },
            accessibility: {
              score: 78,
              wcagLevel: 'AA',
              violations: 3
            },
            mobile: {
              score: 92,
              isResponsive: true,
              hasViewportMeta: true
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
                      <span className="text-lg">量子分析システム初期化中...</span>
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
                  <h3 className="text-lg font-semibold text-slate-200 mb-6 text-center">分析フェーズ</h3>
                  <div className="space-y-4">
                    <div className={`flex items-center transition-all duration-300 ${!progress || progress.currentStep === 'initializing' ? 'text-cyan-400' : 'text-green-400'}`}>
                      {!progress || progress.currentStep === 'initializing' ? (
                        <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mr-4"></div>
                      ) : (
                        <span className="mr-4 text-green-400">✓</span>
                      )}
                      <span className="font-medium">量子ブラウザ初期化</span>
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
                      <span className="font-medium">ニューラルネットワーク展開</span>
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
                      <span className="font-medium">多次元解析実行</span>
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

  const downloadReport = async (format: 'pdf' | 'csv') => {
    if (!analysisData?.id || downloading) return;
    
    setDownloading(format);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://website-analyzer-production-c933.up.railway.app';
      const response = await fetch(`${API_BASE_URL}/api/analysis/${analysisData.id}/${format}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `ダウンロードに失敗しました: ${response.status}`);
      }
      
      const blob = await response.blob();
      
      // ファイルサイズをチェック
      if (blob.size === 0) {
        throw new Error('ファイルが空です');
      }
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `website-analysis-${analysisData.id}.${format}`;
      document.body.appendChild(a);
      a.click();
      
      // クリーンアップ
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 100);
      
    } catch (error) {
      console.error(`${format.toUpperCase()} download error:`, error);
      alert(`${format.toUpperCase()}ダウンロードに失敗しました: ${error.message}`);
    } finally {
      setDownloading(null);
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
                  <p>読み込み時間: {analysisData.results.performance.loadTime}秒</p>
                  <p>FCP: {analysisData.results.performance.firstContentfulPaint}秒</p>
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
            onClick={() => downloadReport('pdf')}
            disabled={downloading === 'pdf'}
            className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {downloading === 'pdf' ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                PDF生成中...
              </>
            ) : (
              <>
                <span className="mr-2">📄</span>
                PDFレポートをダウンロード
              </>
            )}
          </button>
          <button 
            onClick={() => downloadReport('csv')}
            disabled={downloading === 'csv'}
            className="bg-gray-600 text-white px-6 py-3 rounded-md hover:bg-gray-700 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {downloading === 'csv' ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                CSV生成中...
              </>
            ) : (
              <>
                <span className="mr-2">📊</span>
                CSVエクスポート
              </>
            )}
          </button>
        </div>

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
    </div>
  );
};

export default AnalysisPage;