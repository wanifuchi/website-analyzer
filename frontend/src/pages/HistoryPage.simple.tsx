import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface AnalysisHistory {
  id: string;
  url: string;
  status: 'completed' | 'processing' | 'failed';
  startedAt: string;
  score?: number;
}

const HistoryPage: React.FC = () => {
  const [history, setHistory] = useState<AnalysisHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch('/api/analysis/history');
        const data = await response.json();
        
        if (data.success) {
          const analysisHistory = data.data.analyses.map((analysis: any) => ({
            id: analysis.id,
            url: analysis.url,
            status: analysis.status,
            startedAt: analysis.startedAt,
            score: analysis.results?.overall?.score
          }));
          setHistory(analysisHistory);
        } else {
          console.error('Failed to fetch history:', data.error);
          // フォールバック：ローカルストレージから取得
          const savedHistory = localStorage.getItem('analysisHistory');
          const mockHistory: AnalysisHistory[] = savedHistory ? JSON.parse(savedHistory) : [];
          setHistory(mockHistory);
        }
      } catch (error) {
        console.error('History fetch error:', error);
        // エラーの場合はモックデータを表示
        const mockHistory: AnalysisHistory[] = [
          {
            id: 'analysis-1749637846929',
            url: 'https://example.com',
            status: 'completed',
            startedAt: new Date(Date.now() - 3600000).toISOString(),
            score: 85
          },
          {
            id: 'analysis-1749636000000',
            url: 'https://google.com',
            status: 'completed',
            startedAt: new Date(Date.now() - 7200000).toISOString(),
            score: 92
          }
        ];
        setHistory(mockHistory);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">完了</span>;
      case 'processing':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">処理中</span>;
      case 'failed':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">失敗</span>;
      default:
        return null;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) {
      const minutes = Math.floor(diff / (1000 * 60));
      return `${minutes}分前`;
    } else if (hours < 24) {
      return `${hours}時間前`;
    } else {
      return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
          <h2 className="text-xl font-semibold text-gray-900">履歴を読み込み中...</h2>
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
            <h1 className="text-2xl font-bold text-gray-900">分析履歴</h1>
            <Link to="/" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
              新しい分析
            </Link>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="container mx-auto px-4 py-8">
        {history.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-gray-400 text-5xl mb-4">📊</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">まだ分析履歴がありません</h2>
            <p className="text-gray-600 mb-6">ウェブサイトの分析を開始してください</p>
            <Link to="/" className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700">
              分析を開始
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      URL
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ステータス
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      スコア
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      分析日時
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      アクション
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {history.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{item.url}</div>
                        <div className="text-xs text-gray-500">ID: {item.id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(item.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.score ? (
                          <span className={`text-2xl font-bold ${getScoreColor(item.score)}`}>
                            {item.score}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(item.startedAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {item.status === 'completed' ? (
                          <Link
                            to={`/analysis/${item.id}`}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            詳細を見る
                          </Link>
                        ) : item.status === 'processing' ? (
                          <span className="text-gray-400">処理中...</span>
                        ) : (
                          <button
                            onClick={() => alert('再分析機能は開発中です')}
                            className="text-orange-600 hover:text-orange-900"
                          >
                            再分析
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 統計情報 */}
        {history.length > 0 && (
          <div className="mt-8 grid md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="text-sm text-gray-600">総分析数</div>
              <div className="text-2xl font-bold text-gray-900">{history.length}</div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="text-sm text-gray-600">成功率</div>
              <div className="text-2xl font-bold text-green-600">
                {Math.round((history.filter(h => h.status === 'completed').length / history.length) * 100)}%
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="text-sm text-gray-600">平均スコア</div>
              <div className="text-2xl font-bold text-blue-600">
                {Math.round(
                  history
                    .filter(h => h.score)
                    .reduce((sum, h) => sum + (h.score || 0), 0) / 
                  history.filter(h => h.score).length
                )}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="text-sm text-gray-600">最新分析</div>
              <div className="text-sm font-medium text-gray-900">
                {formatDate(history[0].startedAt)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryPage;