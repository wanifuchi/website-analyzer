import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          {/* ヘッダー */}
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Toneya Analysis V1
          </h1>
          <p className="text-xl text-gray-600 mb-12">
            URLを入力してサイトの健全性をチェック
          </p>

          {/* メイン分析フォーム */}
          <div className="bg-white rounded-lg shadow-xl p-8 mb-12">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
                  分析するウェブサイトのURL
                </label>
                <input
                  type="url"
                  id="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="例: google.com または https://example.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                  required
                />
              </div>

              {error && (
                <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-md p-3">
                  {error}
                </div>
              )}

              {/* サンプルURL */}
              <div className="text-sm text-gray-600">
                <p className="mb-2">サンプルURL:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {['google.com', 'github.com', 'stackoverflow.com', 'wikipedia.org'].map((sampleUrl) => (
                    <button
                      key={sampleUrl}
                      type="button"
                      onClick={() => setUrl(sampleUrl)}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-xs transition-colors"
                    >
                      {sampleUrl}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-lg font-semibold transition-colors"
              >
                {isLoading ? '分析中...' : '分析開始'}
              </button>
            </form>
          </div>

          {/* 機能紹介 */}
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-lg p-6 shadow-md">
              <div className="text-blue-600 text-3xl mb-4">🔍</div>
              <h3 className="text-lg font-semibold mb-2">SEO分析</h3>
              <p className="text-gray-600 text-sm">
                メタタグ、見出し構造、キーワード密度を分析
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-md">
              <div className="text-green-600 text-3xl mb-4">⚡</div>
              <h3 className="text-lg font-semibold mb-2">パフォーマンス</h3>
              <p className="text-gray-600 text-sm">
                読み込み速度とCore Web Vitalsを測定
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-md">
              <div className="text-red-600 text-3xl mb-4">🔐</div>
              <h3 className="text-lg font-semibold mb-2">セキュリティ</h3>
              <p className="text-gray-600 text-sm">
                HTTPS使用状況と脆弱性をチェック
              </p>
            </div>
          </div>

          {/* 履歴へのリンク */}
          <div className="mt-12 text-center">
            <Link to="/history" className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium">
              <span className="mr-2">📊</span>
              過去の分析履歴を見る
            </Link>
          </div>

          {/* サーバー接続状況 */}
          <div className="mt-8 text-center">
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
    checking: { text: '接続確認中...', color: 'text-yellow-600', bg: 'bg-yellow-100' },
    online: { text: 'サーバー接続正常', color: 'text-green-600', bg: 'bg-green-100' },
    offline: { text: 'サーバー接続エラー', color: 'text-red-600', bg: 'bg-red-100' }
  };

  const config = statusConfig[status];

  return (
    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${config.color} ${config.bg}`}>
      <div className={`w-2 h-2 rounded-full mr-2 ${status === 'online' ? 'bg-green-500' : status === 'offline' ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
      {config.text}
    </div>
  );
};

export default HomePage;