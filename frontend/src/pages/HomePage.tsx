import React from 'react';
import { useNavigate } from 'react-router-dom';
import AnalysisForm from '../components/analysis/AnalysisForm';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { AnalysisRequest } from '../types/analysis';
import { useAnalysis } from '../hooks/useAnalysis';
import ja from '../i18n/ja.json';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { startAnalysis, loading } = useAnalysis();

  const handleAnalysisSubmit = async (request: AnalysisRequest) => {
    try {
      const analysis = await startAnalysis(request);
      if (analysis) {
        navigate(`/analysis/${analysis.id}`);
      }
    } catch (error) {
      console.error('分析の開始に失敗しました:', error);
    }
  };

  const features = [
    {
      icon: '🔍',
      title: 'SEO分析',
      description: 'メタタグ、見出し構造、キーワード最適化を詳細に分析'
    },
    {
      icon: '⚡',
      title: 'パフォーマンス測定',
      description: 'Core Web Vitals、読み込み速度、リソースサイズを測定'
    },
    {
      icon: '🔒',
      title: 'セキュリティチェック',
      description: 'HTTPS使用、セキュリティヘッダー、脆弱性をチェック'
    },
    {
      icon: '♿',
      title: 'アクセシビリティ評価',
      description: 'WCAG準拠、色彩対比、キーボードナビゲーションを評価'
    },
    {
      icon: '📱',
      title: 'モバイル対応度',
      description: 'レスポンシブデザイン、タッチターゲット、ビューポートを確認'
    },
    {
      icon: '🛠️',
      title: '技術スタック検出',
      description: 'フレームワーク、ライブラリ、CMS、アナリティクスを検出'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヒーローセクション */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              {ja.app.title}
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 mb-8 max-w-3xl mx-auto">
              {ja.app.subtitle}
            </p>
            <p className="text-lg text-blue-200 mb-12 max-w-2xl mx-auto">
              {ja.app.description}
            </p>
          </div>
        </div>
      </div>

      {/* 分析フォーム */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
        <AnalysisForm onSubmit={handleAnalysisSubmit} loading={loading} />
      </div>

      {/* 機能セクション */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            包括的なウェブサイト分析
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            SEOからパフォーマンス、セキュリティまで、ウェブサイトの健全性を総合的に評価します
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="text-center hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-600">
                {feature.description}
              </p>
            </Card>
          ))}
        </div>
      </div>

      {/* 使い方セクション */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              簡単3ステップで分析開始
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                URLを入力
              </h3>
              <p className="text-gray-600">
                分析したいウェブサイトのURLを入力してください
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                分析実行
              </h3>
              <p className="text-gray-600">
                詳細オプションを設定して分析を開始します
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                結果確認
              </h3>
              <p className="text-gray-600">
                詳細な分析結果とアクションプランを確認
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTAセクション */}
      <div className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">
            今すぐウェブサイトを分析しよう
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            無料でご利用いただけます。アカウント登録は不要です。
          </p>
          <Button
            size="lg"
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => document.getElementById('url')?.focus()}
          >
            分析を開始する
          </Button>
        </div>
      </div>
    </div>
  );
};

export default HomePage;