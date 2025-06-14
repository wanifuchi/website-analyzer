import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { Analysis } from '../types/analysis';
import { useAnalysisHistory, useDeleteAnalysis, useGeneratePDFReport, useExportCSV } from '../hooks/useAnalysis';

const HistoryPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const { data: historyData, isLoading, error } = useAnalysisHistory(page, 20);
  const deleteAnalysisMutation = useDeleteAnalysis();
  const generatePDFMutation = useGeneratePDFReport();
  const exportCSVMutation = useExportCSV();

  const [filteredAnalyses, setFilteredAnalyses] = useState<Analysis[]>([]);

  useEffect(() => {
    if (historyData?.analyses) {
      filterAndSortAnalyses(historyData.analyses);
    }
  }, [historyData, statusFilter, sortBy, searchQuery]);

  const filterAndSortAnalyses = (analyses: Analysis[]) => {
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
    deleteAnalysisMutation.mutate(id);
  };

  const handleDownloadPDF = (id: string) => {
    generatePDFMutation.mutate(id);
  };

  const handleExportCSV = (id: string) => {
    exportCSVMutation.mutate(id);
  };

  const getStatusBadge = (status: Analysis['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="neutral" size="sm">待機中</Badge>;
      case 'processing':
        return <Badge variant="info" size="sm">処理中</Badge>;
      case 'completed':
        return <Badge variant="success" size="sm">完了</Badge>;
      case 'failed':
        return <Badge variant="error" size="sm">失敗</Badge>;
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mb-4 mx-auto"></div>
          <p className="text-slate-400">履歴を読み込んでいます...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">履歴の取得に失敗しました</p>
          <Button onClick={() => window.location.reload()}>再読み込み</Button>
        </div>
      </div>
    );
  }

  const analyses = historyData?.analyses || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* 近未来的背景装飾 */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(6,182,212,0.1),transparent_50%)] -z-10" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(168,85,247,0.1),transparent_50%)] -z-10" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(34,197,94,0.1),transparent_50%)] -z-10" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-300 to-purple-300 bg-clip-text text-transparent mb-4">
            分析履歴
          </h1>
          <p className="text-lg text-slate-400">
            過去に実行した分析結果を確認できます
          </p>
        </div>

        {/* フィルタとソート */}
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-gradient-to-r from-slate-800/40 to-slate-700/40 rounded-2xl blur-sm"></div>
          <div className="relative backdrop-blur-xl bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* 検索 */}
              <div>
                <label htmlFor="search" className="block text-sm font-medium text-slate-300 mb-2">
                  URL検索
                </label>
                <input
                  type="text"
                  id="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="URLで検索..."
                  className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-xl text-slate-200 placeholder-slate-400 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
                />
              </div>

              {/* ステータスフィルタ */}
              <div>
                <label htmlFor="status-filter" className="block text-sm font-medium text-slate-300 mb-2">
                  ステータス
                </label>
                <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-xl text-slate-200 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
                >
                  <option value="all">すべて</option>
                  <option value="completed">完了</option>
                  <option value="processing">処理中</option>
                  <option value="pending">待機中</option>
                  <option value="failed">失敗</option>
                </select>
              </div>

              {/* ソート */}
              <div>
                <label htmlFor="sort-by" className="block text-sm font-medium text-slate-300 mb-2">
                  並び順
                </label>
                <select
                  id="sort-by"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-xl text-slate-200 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
                >
                  <option value="newest">新しい順</option>
                  <option value="oldest">古い順</option>
                  <option value="url">URL順</option>
                  <option value="score">スコア順</option>
                </select>
              </div>

              {/* 結果数 */}
              <div className="flex items-end">
                <div className="text-sm text-slate-400">
                  {filteredAnalyses.length} / {analyses.length} 件
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 分析履歴リスト */}
        {filteredAnalyses.length === 0 ? (
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-slate-800/40 to-slate-700/40 rounded-2xl blur-sm"></div>
            <div className="relative backdrop-blur-xl bg-slate-800/40 border border-slate-700/50 rounded-2xl p-12 text-center">
              <div className="text-slate-500 text-6xl mb-4">📊</div>
              <h3 className="text-xl font-semibold text-slate-200 mb-2">
                {analyses.length === 0 ? '分析履歴がありません' : '該当する分析が見つかりません'}
              </h3>
              <p className="text-slate-400 mb-6">
                {analyses.length === 0 
                  ? 'ウェブサイトの分析を開始してみましょう' 
                  : 'フィルタ条件を変更してお試しください'
                }
              </p>
              <Link to="/">
                <Button className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500">分析を開始</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAnalyses.map((analysis) => (
              <div key={analysis.id} className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-slate-800/40 to-slate-700/40 rounded-2xl blur-sm"></div>
                <div className="relative backdrop-blur-xl bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 hover:bg-slate-800/60 transition-all duration-300">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
                  {/* 左側: URL と基本情報 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-medium text-cyan-400 hover:text-cyan-300 truncate">
                        <Link to={`/analysis/${analysis.id}`}>
                          {analysis.url}
                        </Link>
                      </h3>
                      {getStatusBadge(analysis.status)}
                    </div>
                    
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm text-slate-400">
                      <div>
                        <span className="font-medium text-slate-300">開始日時:</span><br />
                        {formatDate(analysis.startedAt)}
                      </div>
                      <div>
                        <span className="font-medium text-slate-300">ページ数:</span><br />
                        {analysis.crawledPages || 1} / {analysis.totalPages || 1}
                      </div>
                      <div>
                        <span className="font-medium text-slate-300">処理時間:</span><br />
                        {getElapsedTime(analysis)}
                      </div>
                      <div>
                        <span className="font-medium text-slate-300">エラー数:</span><br />
                        {analysis.errorCount || 0}
                      </div>
                    </div>
                  </div>

                  {/* 右側: スコアとアクション */}
                  <div className="flex items-center space-x-4">
                    {/* スコア表示 */}
                    {analysis.status === 'completed' && analysis.results && (
                      <div className="text-center">
                        <div className="text-2xl font-bold text-slate-200 mb-1">
                          {analysis.results.overall.score}
                        </div>
                        <div className="text-xs">
                          {getScoreBadge(analysis.results.overall.score)}
                        </div>
                      </div>
                    )}

                    {/* アクションボタン */}
                    <div className="flex flex-wrap gap-2">
                      <Link to={`/analysis/${analysis.id}`}>
                        <Button size="sm" className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500">
                          詳細表示
                        </Button>
                      </Link>
                      {analysis.status === 'completed' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleDownloadPDF(analysis.id)}
                            disabled={generatePDFMutation.isPending}
                            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500"
                          >
                            {generatePDFMutation.isPending ? '生成中...' : 'PDF'}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleExportCSV(analysis.id)}
                            disabled={exportCSVMutation.isPending}
                            className="bg-gradient-to-r from-orange-500 to-yellow-600 hover:from-orange-400 hover:to-yellow-500"
                          >
                            {exportCSVMutation.isPending ? 'エクスポート中...' : 'CSV'}
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(analysis.id)}
                        disabled={deleteAnalysisMutation.isPending}
                        className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                      >
                        削除
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ページング（将来的に実装） */}
        {filteredAnalyses.length > 20 && (
          <div className="mt-8 flex justify-center">
            <p className="text-slate-500 text-sm">
              ページング機能は今後実装予定です
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryPage;