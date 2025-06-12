import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { Analysis } from '../types/analysis';
import { useAnalysis } from '../hooks/useAnalysis';
import ja from '../i18n/ja.json';

const HistoryPage: React.FC = () => {
  const { getAnalysisHistory, deleteAnalysis, loading } = useAnalysis();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [filteredAnalyses, setFilteredAnalyses] = useState<Analysis[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    filterAndSortAnalyses();
  }, [analyses, statusFilter, sortBy, searchQuery]);

  const loadHistory = async () => {
    try {
      const history = await getAnalysisHistory();
      setAnalyses(history);
    } catch (error) {
      console.error('履歴の取得に失敗しました:', error);
    }
  };

  const filterAndSortAnalyses = () => {
    let filtered = [...analyses];

    // ステータスフィルタ
    if (statusFilter !== 'all') {
      filtered = filtered.filter(analysis => analysis.status === statusFilter);
    }

    // 検索フィルタ
    if (searchQuery) {
      filtered = filtered.filter(analysis =>
        analysis.url.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // ソート
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
        case 'oldest':
          return new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime();
        case 'url':
          return a.url.localeCompare(b.url);
        case 'score':
          const scoreA = a.results?.overall.score || 0;
          const scoreB = b.results?.overall.score || 0;
          return scoreB - scoreA;
        default:
          return 0;
      }
    });

    setFilteredAnalyses(filtered);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('この分析結果を削除しますか？')) {
      return;
    }

    try {
      await deleteAnalysis(id);
      setAnalyses(prev => prev.filter(analysis => analysis.id !== id));
    } catch (error) {
      console.error('削除に失敗しました:', error);
    }
  };

  const getStatusBadge = (status: Analysis['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="neutral" size="sm">{ja.analysis.pending}</Badge>;
      case 'processing':
        return <Badge variant="info" size="sm">{ja.analysis.processing}</Badge>;
      case 'completed':
        return <Badge variant="success" size="sm">{ja.analysis.completed}</Badge>;
      case 'failed':
        return <Badge variant="error" size="sm">{ja.analysis.failed}</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{status}</Badge>;
    }
  };

  const getScoreBadge = (score: number) => {
    let variant: 'success' | 'warning' | 'error' = 'error';
    if (score >= 80) variant = 'success';
    else if (score >= 60) variant = 'warning';

    return <Badge variant={variant} size="sm">{score}</Badge>;
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

  const getElapsedTime = (analysis: Analysis) => {
    if (!analysis.completedAt) return '-';
    const start = new Date(analysis.startedAt);
    const end = new Date(analysis.completedAt);
    const diff = end.getTime() - start.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes > 0) {
      return `${minutes}分${seconds % 60}秒`;
    }
    return `${seconds}秒`;
  };

  if (loading && analyses.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" text="履歴を読み込んでいます..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {ja.history.title}
          </h1>
          <p className="text-lg text-gray-600">
            過去に実行した分析結果を確認できます
          </p>
        </div>

        {/* フィルタとソート */}
        <Card className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* 検索 */}
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                URL検索
              </label>
              <input
                type="text"
                id="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="URLで検索..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* ステータスフィルタ */}
            <div>
              <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
                {ja.history.status}
              </label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">すべて</option>
                <option value="completed">{ja.analysis.completed}</option>
                <option value="processing">{ja.analysis.processing}</option>
                <option value="pending">{ja.analysis.pending}</option>
                <option value="failed">{ja.analysis.failed}</option>
              </select>
            </div>

            {/* ソート */}
            <div>
              <label htmlFor="sort-by" className="block text-sm font-medium text-gray-700 mb-1">
                {ja.history.sortBy}
              </label>
              <select
                id="sort-by"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="newest">新しい順</option>
                <option value="oldest">古い順</option>
                <option value="url">URL順</option>
                <option value="score">スコア順</option>
              </select>
            </div>

            {/* 結果数 */}
            <div className="flex items-end">
              <div className="text-sm text-gray-600">
                {filteredAnalyses.length} / {analyses.length} 件
              </div>
            </div>
          </div>
        </Card>

        {/* 分析履歴リスト */}
        {filteredAnalyses.length === 0 ? (
          <Card className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {analyses.length === 0 ? ja.history.noHistory : '該当する分析が見つかりません'}
            </h3>
            <p className="text-gray-600 mb-6">
              {analyses.length === 0 
                ? 'ウェブサイトの分析を開始してみましょう' 
                : 'フィルタ条件を変更してお試しください'
              }
            </p>
            <Link to="/">
              <Button>分析を開始</Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredAnalyses.map((analysis) => (
              <Card key={analysis.id} hoverable className="p-6">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
                  {/* 左側: URL と基本情報 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-medium text-blue-600 hover:text-blue-800 truncate">
                        <Link to={`/analysis/${analysis.id}`}>
                          {analysis.url}
                        </Link>
                      </h3>
                      {getStatusBadge(analysis.status)}
                    </div>
                    
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">開始日時:</span><br />
                        {formatDate(analysis.startedAt)}
                      </div>
                      <div>
                        <span className="font-medium">ページ数:</span><br />
                        {analysis.crawledPages} / {analysis.totalPages}
                      </div>
                      <div>
                        <span className="font-medium">処理時間:</span><br />
                        {getElapsedTime(analysis)}
                      </div>
                      <div>
                        <span className="font-medium">エラー数:</span><br />
                        {analysis.errorCount}
                      </div>
                    </div>
                  </div>

                  {/* 右側: スコアとアクション */}
                  <div className="flex items-center space-x-4">
                    {/* スコア表示 */}
                    {analysis.status === 'completed' && analysis.results && (
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900 mb-1">
                          {analysis.results.overall.score}
                        </div>
                        <div className="text-xs text-gray-600">
                          {getScoreBadge(analysis.results.overall.score)}
                        </div>
                      </div>
                    )}

                    {/* アクションボタン */}
                    <div className="flex space-x-2">
                      <Link to={`/analysis/${analysis.id}`}>
                        <Button size="sm">
                          {ja.actions.viewDetails}
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDelete(analysis.id)}
                      >
                        {ja.actions.delete}
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* ページング（将来的に実装） */}
        {filteredAnalyses.length > 20 && (
          <div className="mt-8 flex justify-center">
            <p className="text-gray-500 text-sm">
              ページング機能は今後実装予定です
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryPage;