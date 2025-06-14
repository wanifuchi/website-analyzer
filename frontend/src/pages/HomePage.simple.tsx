import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { cn } from '../lib/utils';

const HomePage: React.FC = () => {
  // URLパラメータから初期値を取得
  const urlParams = new URLSearchParams(window.location.search);
  const initialUrl = urlParams.get('url') || '';
  const [url, setUrl] = useState(initialUrl);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // URLバリデーション（より詳細なエラー情報付き）
      let validatedUrl = url.trim();
      
      // プロトコルがない場合は自動追加
      if (!validatedUrl.startsWith('http://') && !validatedUrl.startsWith('https://')) {
        validatedUrl = 'https://' + validatedUrl;
      }
      
      // URLの妥当性チェック
      new URL(validatedUrl);
      
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://website-analyzer-production-c933.up.railway.app';
      const response = await fetch(`${API_BASE_URL}/api/analysis/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: validatedUrl }),
      });

      const data = await response.json();

      if (data.success) {
        // 分析結果ページへリダイレクト
        navigate(`/analysis/${data.data.id}`);
      } else {
        setError(data.error || '分析の開始に失敗しました');
      }
    } catch (err) {
      console.error('Analysis error:', err);
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('サーバーに接続できません。バックエンドが起動していることを確認してください。');
      } else if (err instanceof TypeError && err.message.includes('URL')) {
        setError(`無効なURL形式です: ${url}。正しいURL（例: https://example.com）を入力してください`);
      } else {
        setError(`エラーが発生しました: ${err.message || err}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* 背景装飾 */}
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,#fff,rgba(255,255,255,0.6))] -z-10" />
      <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-indigo-400/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 translate-y-12 -translate-x-12 w-96 h-96 bg-gradient-to-tr from-purple-400/20 to-pink-400/20 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 py-20 relative">
        <div className="max-w-5xl mx-auto">
          {/* ヒーローセクション */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium mb-8 animate-pulse">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-ping"></span>
              リアルタイム分析エンジン稼働中
            </div>
            
            <h1 className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent mb-6 leading-tight">
              Website Analyzer
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-4 max-w-3xl mx-auto leading-relaxed">
              ウェブサイトの健全性を総合的に分析
            </p>
            <p className="text-lg text-gray-500 mb-12 max-w-2xl mx-auto">
              SEO、パフォーマンス、セキュリティ、アクセシビリティを一括チェック
            </p>
          </div>

          {/* メイン分析フォーム */}
          <Card variant="elevated" className="mb-16 backdrop-blur-sm bg-white/80 border-0 shadow-2xl">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-3">
                <label htmlFor="url" className="block text-lg font-semibold text-gray-800">
                  分析するウェブサイトのURL
                </label>
                <div className="relative">
                  <input
                    type="url"
                    id="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="例: https://example.com"
                    className={cn(
                      "w-full px-6 py-4 text-lg rounded-xl border-2 transition-all duration-200",
                      "focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500",
                      "bg-white/50 backdrop-blur-sm",
                      error ? "border-red-300 focus:border-red-500" : "border-gray-200"
                    )}
                    required
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-6">
                    <div className="w-6 h-6 text-gray-400">
                      🌐
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
                  <div className="flex items-center">
                    <span className="mr-2">⚠️</span>
                    {error}
                  </div>
                </div>
              )}

              {/* サンプルURL */}
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-3">サンプルURL:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {['google.com', 'github.com', 'stackoverflow.com', 'wikipedia.org'].map((sampleUrl) => (
                    <button
                      key={sampleUrl}
                      type="button"
                      onClick={() => setUrl(sampleUrl)}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-all duration-200 hover:scale-105"
                    >
                      {sampleUrl}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                loading={isLoading}
                variant="gradient"
                size="lg"
                fullWidth
                className="h-14 text-lg font-semibold"
              >
                {isLoading ? '分析中...' : '🚀 分析を開始する'}
              </Button>
            </form>
          </Card>

          {/* 機能紹介 */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {[
              {
                icon: '🔍',
                title: 'SEO分析',
                description: 'メタタグ、見出し構造、キーワード密度、構造化データを総合的に分析',
                gradient: 'from-blue-50 to-indigo-50',
                iconBg: 'bg-blue-100 text-blue-600'
              },
              {
                icon: '⚡',
                title: 'パフォーマンス測定',
                description: 'Core Web Vitals（LCP、FCP、CLS、TBT）をリアルタイムで測定',
                gradient: 'from-green-50 to-emerald-50',
                iconBg: 'bg-green-100 text-green-600'
              },
              {
                icon: '🔐',
                title: 'セキュリティ評価',
                description: 'HTTPS使用状況、セキュリティヘッダー、脆弱性を詳細チェック',
                gradient: 'from-red-50 to-orange-50',
                iconBg: 'bg-red-100 text-red-600'
              }
            ].map((feature, index) => (
              <Card 
                key={index} 
                variant="elevated" 
                hoverable 
                className={cn(
                  "bg-gradient-to-br", 
                  feature.gradient,
                  "border-0 backdrop-blur-sm group"
                )}
              >
                <div className="text-center space-y-4">
                  <div className={cn(
                    "w-16 h-16 rounded-2xl flex items-center justify-center mx-auto text-2xl",
                    "group-hover:scale-110 transition-transform duration-200",
                    feature.iconBg
                  )}>
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-800">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </Card>
            ))}
          </div>

          {/* 追加機能 */}
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            <Card variant="elevated" className="bg-gradient-to-br from-purple-50 to-pink-50 border-0">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center text-xl">
                  ♿
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">アクセシビリティ監査</h3>
                  <p className="text-gray-600">WCAG 2.1ガイドラインに基づく詳細チェック</p>
                </div>
              </div>
            </Card>

            <Card variant="elevated" className="bg-gradient-to-br from-yellow-50 to-orange-50 border-0">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-xl flex items-center justify-center text-xl">
                  📱
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">モバイル対応度</h3>
                  <p className="text-gray-600">レスポンシブデザインとモバイルユーザビリティ</p>
                </div>
              </div>
            </Card>
          </div>

          {/* アクションエリア */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Link to="/history">
              <Button variant="outline" size="lg" className="h-12">
                <span className="mr-2">📊</span>
                分析履歴を見る
              </Button>
            </Link>
            
            <Link to="/about">
              <Button variant="ghost" size="lg" className="h-12">
                <span className="mr-2">ℹ️</span>
                詳細情報
              </Button>
            </Link>
          </div>

          {/* サーバー接続状況 */}
          <div className="mt-12 flex justify-center">
            <ConnectionStatus />
          </div>
        </div>
      </div>
    </div>
  );
};

const ConnectionStatus: React.FC = () => {
  const [status, setStatus] = React.useState<'checking' | 'online' | 'offline'>('checking');

  React.useEffect(() => {
    const checkConnection = async () => {
      try {
        console.log('ヘルスチェック開始...');
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://website-analyzer-production-c933.up.railway.app';
        const response = await fetch(`${API_BASE_URL}/api/health`);
        const data = await response.json();
        console.log('ヘルスチェック結果:', data);
        setStatus(data.success ? 'online' : 'offline');
      } catch (error) {
        console.error('ヘルスチェックエラー:', error);
        setStatus('offline');
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 10000); // 10秒ごとにチェック

    return () => clearInterval(interval);
  }, []);

  const statusConfig = {
    checking: { 
      text: '接続確認中...', 
      color: 'text-yellow-700', 
      bg: 'bg-gradient-to-r from-yellow-50 to-amber-50',
      border: 'border-yellow-200',
      dot: 'bg-yellow-500 animate-pulse'
    },
    online: { 
      text: 'サーバー接続正常', 
      color: 'text-green-700', 
      bg: 'bg-gradient-to-r from-green-50 to-emerald-50',
      border: 'border-green-200',
      dot: 'bg-green-500'
    },
    offline: { 
      text: 'サーバー接続エラー', 
      color: 'text-red-700', 
      bg: 'bg-gradient-to-r from-red-50 to-rose-50',
      border: 'border-red-200',
      dot: 'bg-red-500 animate-pulse'
    }
  };

  const config = statusConfig[status];

  return (
    <div className={cn(
      "inline-flex items-center px-4 py-2 rounded-xl text-sm font-medium border backdrop-blur-sm shadow-sm",
      config.color,
      config.bg,
      config.border
    )}>
      <div className={cn("w-2 h-2 rounded-full mr-2", config.dot)}></div>
      {config.text}
    </div>
  );
};

export default HomePage;