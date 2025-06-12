import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AnalysisProgress from '../components/analysis/AnalysisProgress';
import AnalysisResults from '../components/analysis/AnalysisResults';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Analysis } from '../types/analysis';
import { useAnalysis } from '../hooks/useAnalysis';
import ja from '../i18n/ja.json';

const AnalysisPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getAnalysis, startAnalysis, loading } = useAnalysis();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      navigate('/');
      return;
    }

    loadAnalysis();
  }, [id]);

  const loadAnalysis = async () => {
    if (!id) return;

    try {
      const analysisData = await getAnalysis(id);
      setAnalysis(analysisData);
      setError(null);
    } catch (err) {
      console.error('分析の取得に失敗しました:', err);
      setError(ja.errors.analysisNotFound);
    }
  };

  const handleReAnalyze = async () => {
    if (!analysis) return;

    try {
      const newAnalysis = await startAnalysis({
        url: analysis.url,
        options: analysis.options
      });
      
      if (newAnalysis) {
        navigate(`/analysis/${newAnalysis.id}`);
      }
    } catch (err) {
      console.error('再分析の開始に失敗しました:', err);
      setError(ja.errors.networkError);
    }
  };

  const handleDownloadReport = () => {
    // PDF レポートのダウンロード機能を実装
    console.log('PDF レポートをダウンロード');
  };

  const handleExportCSV = () => {
    // CSV エクスポート機能を実装
    console.log('CSV データをエクスポート');
  };

  if (loading && !analysis) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" text={ja.loading.loadingResults} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="text-center">
            <div className="py-12">
              <div className="text-red-600 text-6xl mb-4">⚠️</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                エラーが発生しました
              </h2>
              <p className="text-gray-600 mb-6">{error}</p>
              <div className="space-x-4">
                <Button onClick={() => navigate('/')}>
                  ホームに戻る
                </Button>
                <Button variant="secondary" onClick={loadAnalysis}>
                  再試行
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="text-center">
            <div className="py-12">
              <div className="text-gray-400 text-6xl mb-4">🔍</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                分析が見つかりません
              </h2>
              <p className="text-gray-600 mb-6">
                指定された分析IDが見つかりませんでした。
              </p>
              <Button onClick={() => navigate('/')}>
                ホームに戻る
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 分析進捗または結果表示 */}
        {analysis.status === 'completed' && analysis.results ? (
          <AnalysisResults
            results={analysis.results}
            url={analysis.url}
            onDownloadReport={handleDownloadReport}
            onExportCSV={handleExportCSV}
            onReAnalyze={handleReAnalyze}
          />
        ) : (
          <div className="space-y-6">
            <AnalysisProgress analysis={analysis} />
            
            {/* 分析失敗時の再試行ボタン */}
            {analysis.status === 'failed' && (
              <Card className="text-center">
                <div className="py-8">
                  <div className="text-red-600 text-4xl mb-4">❌</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">
                    分析に失敗しました
                  </h3>
                  <p className="text-gray-600 mb-6">
                    分析中にエラーが発生しました。再度お試しください。
                  </p>
                  <div className="space-x-4">
                    <Button onClick={handleReAnalyze} loading={loading}>
                      再分析を実行
                    </Button>
                    <Button variant="secondary" onClick={() => navigate('/')}>
                      ホームに戻る
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* 分析中の自動更新 */}
            {(analysis.status === 'pending' || analysis.status === 'processing') && (
              <Card className="text-center">
                <div className="py-6">
                  <p className="text-gray-600 mb-4">
                    分析は自動的に更新されます。このページを開いたままお待ちください。
                  </p>
                  <Button variant="ghost" onClick={loadAnalysis}>
                    手動で更新
                  </Button>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisPage;