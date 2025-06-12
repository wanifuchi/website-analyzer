import React from 'react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import LoadingSpinner from '../ui/LoadingSpinner';
import { Analysis } from '../../types/analysis';
import ja from '../../i18n/ja.json';

interface AnalysisProgressProps {
  analysis: Analysis;
}

const AnalysisProgress: React.FC<AnalysisProgressProps> = ({ analysis }) => {
  const getStatusBadge = (status: Analysis['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="neutral" dot>{ja.analysis.pending}</Badge>;
      case 'processing':
        return <Badge variant="info" dot>{ja.analysis.processing}</Badge>;
      case 'completed':
        return <Badge variant="success" dot>{ja.analysis.completed}</Badge>;
      case 'failed':
        return <Badge variant="error" dot>{ja.analysis.failed}</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const getProgressPercentage = () => {
    if (analysis.status === 'completed') return 100;
    if (analysis.status === 'failed') return 0;
    if (analysis.totalPages === 0) return 0;
    return Math.round((analysis.crawledPages / analysis.totalPages) * 100);
  };

  const getElapsedTime = () => {
    const start = new Date(analysis.startedAt);
    const end = analysis.completedAt ? new Date(analysis.completedAt) : new Date();
    const diff = end.getTime() - start.getTime();
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}分${remainingSeconds}秒`;
    }
    return `${remainingSeconds}秒`;
  };

  const progressPercentage = getProgressPercentage();

  return (
    <Card title="分析進捗" className="max-w-2xl mx-auto">
      <div className="space-y-6">
        {/* 基本情報 */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">分析対象URL</p>
            <p className="font-medium text-gray-900 break-all">{analysis.url}</p>
          </div>
          <div className="ml-4">
            {getStatusBadge(analysis.status)}
          </div>
        </div>

        {/* プログレスバー */}
        {(analysis.status === 'processing' || analysis.status === 'completed') && (
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">{ja.analysis.progress}</span>
              <span className="text-sm text-gray-500">{progressPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  analysis.status === 'completed' ? 'bg-green-600' : 'bg-blue-600'
                }`}
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* 詳細統計 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{analysis.crawledPages}</div>
            <div className="text-xs text-gray-600">{ja.analysis.pagesAnalyzed}</div>
          </div>
          
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{analysis.totalPages}</div>
            <div className="text-xs text-gray-600">{ja.analysis.totalPages}</div>
          </div>
          
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{analysis.errorCount}</div>
            <div className="text-xs text-gray-600">{ja.analysis.errorCount}</div>
          </div>
          
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{getElapsedTime()}</div>
            <div className="text-xs text-gray-600">{ja.analysis.duration}</div>
          </div>
        </div>

        {/* ローディング状態 */}
        {analysis.status === 'processing' && (
          <div className="flex items-center justify-center py-4">
            <LoadingSpinner size="lg" text={ja.loading.analyzing} />
          </div>
        )}

        {/* 分析オプション */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">分析設定</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-600">{ja.options.maxDepth}:</span>
              <span className="ml-2 font-medium">{analysis.options.maxDepth}</span>
            </div>
            <div>
              <span className="text-gray-600">{ja.options.maxPages}:</span>
              <span className="ml-2 font-medium">{analysis.options.maxPages}</span>
            </div>
            <div>
              <span className="text-gray-600">{ja.options.skipImages}:</span>
              <span className="ml-2 font-medium">
                {analysis.options.skipImages ? 'はい' : 'いいえ'}
              </span>
            </div>
            <div>
              <span className="text-gray-600">{ja.options.skipCSS}:</span>
              <span className="ml-2 font-medium">
                {analysis.options.skipCSS ? 'はい' : 'いいえ'}
              </span>
            </div>
          </div>
        </div>

        {/* 開始時刻 */}
        <div className="text-sm text-gray-500">
          <span>開始時刻: </span>
          <span>{new Date(analysis.startedAt).toLocaleString('ja-JP')}</span>
          {analysis.completedAt && (
            <>
              <span className="mx-2">•</span>
              <span>完了時刻: </span>
              <span>{new Date(analysis.completedAt).toLocaleString('ja-JP')}</span>
            </>
          )}
        </div>
      </div>
    </Card>
  );
};

export default AnalysisProgress;