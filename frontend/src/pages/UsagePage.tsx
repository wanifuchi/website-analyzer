import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface UsageStats {
  totalAnalyses: number;
  todayAnalyses: number;
  weeklyAnalyses: number;
  monthlyAnalyses: number;
  popularUrls: Array<{
    url: string;
    count: number;
    lastAnalyzed: string;
  }>;
  dailyStats: Array<{
    date: string;
    count: number;
  }>;
  recentAnalyses: Array<{
    id: string;
    url: string;
    score: number;
    completedAt: string;
  }>;
}

const UsagePage: React.FC = () => {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsageStats();
  }, []);

  const fetchUsageStats = async () => {
    try {
      setLoading(true);
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://website-analyzer-production-c933.up.railway.app';
      const response = await fetch(`${API_BASE_URL}/api/usage/stats`);
      const data = await response.json();
      
      if (data.success) {
        setStats(data.data);
      } else {
        setError(data.error || '使用量データの取得に失敗しました');
      }
    } catch (err) {
      console.error('Usage stats error:', err);
      
      // モックデータを表示
      const mockStats: UsageStats = {
        totalAnalyses: 234,
        todayAnalyses: 12,
        weeklyAnalyses: 67,
        monthlyAnalyses: 189,
        popularUrls: [
          { url: 'https://example.com', count: 15, lastAnalyzed: '2025-06-12T13:30:00Z' },
          { url: 'https://sample-site.org', count: 12, lastAnalyzed: '2025-06-12T12:15:00Z' },
          { url: 'https://test-website.net', count: 8, lastAnalyzed: '2025-06-12T11:45:00Z' },
          { url: 'https://demo-page.com', count: 6, lastAnalyzed: '2025-06-12T10:20:00Z' },
          { url: 'https://sample.org', count: 5, lastAnalyzed: '2025-06-12T09:30:00Z' }
        ],
        dailyStats: [
          { date: '2025-06-06', count: 8 },
          { date: '2025-06-07', count: 12 },
          { date: '2025-06-08', count: 15 },
          { date: '2025-06-09', count: 9 },
          { date: '2025-06-10', count: 18 },
          { date: '2025-06-11', count: 14 },
          { date: '2025-06-12', count: 12 }
        ],
        recentAnalyses: [
          { id: 'analysis-123', url: 'https://example.com', score: 92, completedAt: '2025-06-12T13:30:00Z' },
          { id: 'analysis-124', url: 'https://sample-site.org', score: 88, completedAt: '2025-06-12T12:15:00Z' },
          { id: 'analysis-125', url: 'https://test-website.net', score: 85, completedAt: '2025-06-12T11:45:00Z' }
        ]
      };
      setStats(mockStats);
      setError('データベースに接続できないため、サンプルデータを表示しています');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">使用量データを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">使用量ダッシュボード</h1>
              <p className="text-gray-600 mt-1">Toneya Analysis V1の利用状況</p>
            </div>
            <Link to="/" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
              新しい分析
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <p className="text-yellow-800 text-sm">⚠️ {error}</p>
          </div>
        )}

        {/* 統計カード */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <span className="text-2xl">📊</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">総分析数</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.totalAnalyses || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <span className="text-2xl">📅</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">今日の分析</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.todayAnalyses || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <span className="text-2xl">📈</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">週間分析</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.weeklyAnalyses || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <span className="text-2xl">📄</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">月間分析</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.monthlyAnalyses || 0}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 人気URL */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <span className="mr-2">🔥</span>
              人気の分析URL
            </h3>
            <div className="space-y-3">
              {stats?.popularUrls?.map((urlData, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {urlData.url}
                    </p>
                    <p className="text-xs text-gray-500">
                      最終分析: {formatDate(urlData.lastAnalyzed)}
                    </p>
                  </div>
                  <div className="ml-4 flex items-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {urlData.count}回
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 最近の分析 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <span className="mr-2">⏰</span>
              最近の分析
            </h3>
            <div className="space-y-3">
              {stats?.recentAnalyses?.map((analysis, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {analysis.url}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(analysis.completedAt)}
                    </p>
                  </div>
                  <div className="ml-4 flex items-center space-x-2">
                    <span className={`text-lg font-bold ${getScoreColor(analysis.score)}`}>
                      {analysis.score}
                    </span>
                    <Link 
                      to={`/analysis/${analysis.id}`}
                      className="text-blue-600 hover:text-blue-800 text-xs"
                    >
                      詳細
                    </Link>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 text-center">
              <Link 
                to="/history" 
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                すべての履歴を見る →
              </Link>
            </div>
          </div>
        </div>

        {/* 日別グラフ */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <span className="mr-2">📊</span>
            日別分析数（過去7日間）
          </h3>
          <div className="flex items-end space-x-2 h-32">
            {stats?.dailyStats?.map((day, index) => {
              const maxCount = Math.max(...(stats.dailyStats?.map(d => d.count) || [1]));
              const height = Math.max((day.count / maxCount) * 100, 5);
              
              return (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div 
                    className="bg-blue-500 rounded-t w-full min-h-[5px] flex items-end justify-center"
                    style={{ height: `${height}%` }}
                  >
                    <span className="text-white text-xs mb-1">{day.count}</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    {new Date(day.date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* アクションボタン */}
        <div className="mt-8 flex justify-center space-x-4">
          <Link 
            to="/history"
            className="bg-gray-600 text-white px-6 py-3 rounded-md hover:bg-gray-700"
          >
            📊 分析履歴を見る
          </Link>
          <Link 
            to="/"
            className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700"
          >
            🔍 新しい分析を開始
          </Link>
        </div>
      </div>
    </div>
  );
};

export default UsagePage;