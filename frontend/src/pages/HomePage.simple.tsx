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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* 近未来的背景装飾 */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(6,182,212,0.1),transparent_50%)] -z-10" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(168,85,247,0.1),transparent_50%)] -z-10" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(34,197,94,0.1),transparent_50%)] -z-10" />
      
      {/* アニメーション背景要素 */}
      <div className="absolute top-20 right-20 w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
      <div className="absolute top-40 left-20 w-1 h-1 bg-purple-400 rounded-full animate-ping" />
      <div className="absolute bottom-40 right-40 w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
      
      {/* ホログラフィック効果 */}
      <div className="absolute top-0 right-0 -translate-y-24 translate-x-24 w-96 h-96 bg-gradient-to-br from-cyan-500/10 via-blue-500/10 to-purple-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 left-0 translate-y-24 -translate-x-24 w-96 h-96 bg-gradient-to-tr from-purple-500/10 via-pink-500/10 to-cyan-500/10 rounded-full blur-3xl animate-pulse" />
      
      <div className="container mx-auto px-4 py-20 relative">
        <div className="max-w-5xl mx-auto">
          {/* ヒーローセクション */}
          <div className="text-center mb-20">
            <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 backdrop-blur-sm border border-cyan-400/30 rounded-2xl text-sm font-medium mb-10">
              <div className="w-2 h-2 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full mr-3 animate-ping"></div>
              <span className="bg-gradient-to-r from-cyan-300 to-purple-300 bg-clip-text text-transparent font-semibold">
                AI駆動リアルタイム分析システム稼働中
              </span>
            </div>
            
            <h1 className="text-6xl md:text-8xl font-bold mb-8 leading-none tracking-tight">
              <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                Toneya
              </span>
              <br />
              <span className="bg-gradient-to-r from-slate-200 via-slate-300 to-slate-400 bg-clip-text text-transparent">
                Website Analyzer
              </span>
            </h1>
            
            <div className="space-y-4 mb-12">
              <p className="text-xl md:text-2xl text-slate-300 max-w-3xl mx-auto leading-relaxed font-light">
                次世代ウェブサイト分析プラットフォーム
              </p>
              <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                AI技術とリアルタイム解析でウェブサイトの真の潜在能力を解き放つ
              </p>
            </div>
            
            {/* ネオンアクセント */}
            <div className="flex justify-center space-x-8 mb-8">
              <div className="w-1 h-16 bg-gradient-to-b from-cyan-400 to-transparent rounded-full"></div>
              <div className="w-1 h-20 bg-gradient-to-b from-blue-400 to-transparent rounded-full"></div>
              <div className="w-1 h-16 bg-gradient-to-b from-purple-400 to-transparent rounded-full"></div>
            </div>
          </div>

          {/* メイン分析フォーム */}
          <div className="relative mb-20">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20 rounded-3xl blur-xl"></div>
            <Card variant="elevated" className="relative backdrop-blur-xl bg-slate-800/40 border border-slate-700/50 shadow-2xl">
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-4">
                  <label htmlFor="url" className="block text-lg font-semibold text-slate-200">
                    分析対象URL
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      id="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://example.com"
                      className={cn(
                        "w-full px-6 py-4 text-lg rounded-2xl border-2 transition-all duration-300",
                        "focus:ring-4 focus:ring-cyan-500/30 focus:border-cyan-400",
                        "bg-slate-900/50 backdrop-blur-sm text-slate-200 placeholder-slate-400",
                        error ? "border-red-400/50 focus:border-red-400" : "border-slate-600/50"
                      )}
                      required
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-6">
                      <div className="w-6 h-6 text-cyan-400">
                        🌐
                      </div>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-900/30 border border-red-500/50 text-red-300 px-4 py-3 rounded-xl backdrop-blur-sm">
                    <div className="flex items-center">
                      <span className="mr-2">⚠️</span>
                      {error}
                    </div>
                  </div>
                )}

                {/* サンプルURL */}
                <div className="text-center">
                  <p className="text-sm text-slate-400 mb-4">サンプルURL:</p>
                  <div className="flex flex-wrap gap-3 justify-center">
                    {['google.com', 'github.com', 'stackoverflow.com', 'wikipedia.org'].map((sampleUrl) => (
                      <button
                        key={sampleUrl}
                        type="button"
                        onClick={() => setUrl(`https://${sampleUrl}`)}
                        className="px-4 py-2 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 rounded-xl text-sm transition-all duration-300 hover:scale-105 border border-slate-600/50 hover:border-slate-500/50 backdrop-blur-sm"
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
                  className="h-16 text-lg font-semibold bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 border-0 shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300"
                >
                  {isLoading ? (
                    <span className="flex items-center">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3"></div>
                      AI分析実行中...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <span className="mr-3">⚡</span>
                      分析を開始する
                    </span>
                  )}
                </Button>
              </form>
            </Card>
          </div>

          {/* 機能紹介 */}
          <div className="grid md:grid-cols-3 gap-8 mb-20">
            {[
              {
                icon: '🔍',
                title: 'SEO最適化分析',
                description: 'メタタグ、見出し構造、キーワード配置、構造化データを検索エンジン向けに総合分析',
                accent: 'from-cyan-400 to-blue-500',
                border: 'border-cyan-500/30'
              },
              {
                icon: '⚡',
                title: 'リアルタイム性能測定',
                description: 'ページ読み込み速度やユーザー体験指標（LCP、FCP、CLS、TBT）を高精度で測定',
                accent: 'from-blue-400 to-purple-500',
                border: 'border-blue-500/30'
              },
              {
                icon: '🛡️',
                title: '総合セキュリティ診断',
                description: 'HTTPS設定、セキュリティヘッダー、脆弱性を包括的にチェックして安全性を評価',
                accent: 'from-purple-400 to-pink-500',
                border: 'border-purple-500/30'
              }
            ].map((feature, index) => (
              <div key={index} className="relative group">
                <div className={cn(
                  "absolute inset-0 bg-gradient-to-br opacity-20 rounded-3xl blur-xl transition-opacity duration-500 group-hover:opacity-40",
                  feature.accent
                )} />
                <Card 
                  variant="elevated" 
                  hoverable 
                  className={cn(
                    "relative backdrop-blur-xl bg-slate-800/60 border-2 group-hover:bg-slate-700/80 transition-all duration-500",
                    feature.border
                  )}
                >
                  <div className="text-center space-y-6">
                    <div className="relative">
                      <div className={cn(
                        "w-20 h-20 rounded-3xl flex items-center justify-center mx-auto text-3xl bg-gradient-to-br transition-all duration-500 group-hover:scale-110 group-hover:rotate-3",
                        feature.accent
                      )}>
                        <div className="absolute inset-0 bg-white/10 rounded-3xl backdrop-blur-sm"></div>
                        <span className="relative z-10">{feature.icon}</span>
                      </div>
                      {/* ホログラフィック効果 */}
                      <div className={cn(
                        "absolute -inset-2 bg-gradient-to-r opacity-0 rounded-3xl blur-md transition-opacity duration-500 group-hover:opacity-30",
                        feature.accent
                      )} />
                    </div>
                    <h3 className="text-2xl font-bold text-white group-hover:text-cyan-200 transition-colors duration-300">
                      {feature.title}
                    </h3>
                    <p className="text-lg text-white leading-relaxed group-hover:text-cyan-100 transition-colors duration-300 font-semibold">
                      {feature.description}
                    </p>
                  </div>
                </Card>
              </div>
            ))}
          </div>

          {/* 追加機能 */}
          <div className="grid md:grid-cols-2 gap-8 mb-20">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-green-400/20 to-emerald-500/20 rounded-3xl blur-xl opacity-50 group-hover:opacity-70 transition-opacity duration-500" />
              <Card variant="elevated" className="relative backdrop-blur-xl bg-slate-800/60 border border-green-500/30 group-hover:bg-slate-700/80 transition-all duration-500">
                <div className="flex items-center space-x-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <div className="absolute inset-0 bg-white/10 rounded-2xl backdrop-blur-sm"></div>
                    <span className="relative z-10">♿</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-white group-hover:text-green-200 transition-colors duration-300">
                      アクセシビリティ診断
                    </h3>
                    <p className="text-lg text-white font-semibold group-hover:text-green-100 transition-colors duration-300">
                      WCAG 2.1ガイドラインに基づく障害者対応度チェック
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-400/20 to-yellow-500/20 rounded-3xl blur-xl opacity-50 group-hover:opacity-70 transition-opacity duration-500" />
              <Card variant="elevated" className="relative backdrop-blur-xl bg-slate-800/60 border border-orange-500/30 group-hover:bg-slate-700/80 transition-all duration-500">
                <div className="flex items-center space-x-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-yellow-500 rounded-2xl flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <div className="absolute inset-0 bg-white/10 rounded-2xl backdrop-blur-sm"></div>
                    <span className="relative z-10">📱</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-white group-hover:text-orange-200 transition-colors duration-300">
                      モバイル対応分析
                    </h3>
                    <p className="text-lg text-white font-semibold group-hover:text-orange-100 transition-colors duration-300">
                      スマートフォン・タブレットでの表示や操作性を詳細評価
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* アクションエリア */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-12">
            <Link to="/history">
              <Button 
                variant="outline" 
                size="lg" 
                className="h-14 px-8 border-2 border-slate-600/50 bg-slate-800/40 text-slate-200 hover:bg-slate-700/50 hover:border-cyan-500/50 transition-all duration-300 backdrop-blur-sm"
              >
                <span className="mr-3 text-cyan-400">📊</span>
                分析履歴を見る
              </Button>
            </Link>
            
            <Link to="/about">
              <Button 
                variant="ghost" 
                size="lg" 
                className="h-14 px-8 text-slate-300 hover:text-slate-100 hover:bg-slate-700/30 transition-all duration-300"
              >
                <span className="mr-3 text-purple-400">ℹ️</span>
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