import React from 'react';
import Card from '../ui/Card';
import ja from '../../i18n/ja.json';

interface ScoreData {
  category: string;
  score: number;
  maxScore: number;
  color: string;
}

interface ScoreChartProps {
  scores: {
    seo: number;
    performance: number;
    security: number;
    accessibility: number;
    mobile: number;
  };
  className?: string;
}

const ScoreChart: React.FC<ScoreChartProps> = ({ scores, className = '' }) => {
  const getScoreColor = (score: number): string => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 70) return 'bg-yellow-500';
    if (score >= 50) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getScoreGrade = (score: number): string => {
    if (score >= 90) return ja.grades.A;
    if (score >= 80) return ja.grades.B;
    if (score >= 70) return ja.grades.C;
    if (score >= 60) return ja.grades.D;
    return ja.grades.F;
  };

  const scoreData: ScoreData[] = [
    {
      category: ja.results.seo.title,
      score: scores.seo,
      maxScore: 100,
      color: getScoreColor(scores.seo)
    },
    {
      category: ja.results.performance.title,
      score: scores.performance,
      maxScore: 100,
      color: getScoreColor(scores.performance)
    },
    {
      category: ja.results.security.title,
      score: scores.security,
      maxScore: 100,
      color: getScoreColor(scores.security)
    },
    {
      category: ja.results.accessibility.title,
      score: scores.accessibility,
      maxScore: 100,
      color: getScoreColor(scores.accessibility)
    },
    {
      category: ja.results.mobile.title,
      score: scores.mobile,
      maxScore: 100,
      color: getScoreColor(scores.mobile)
    }
  ];

  const overallScore = Math.round(
    (scores.seo + scores.performance + scores.security + scores.accessibility + scores.mobile) / 5
  );

  return (
    <Card title={ja.charts.scoreComparison} className={className}>
      <div className="space-y-6">
        {/* 総合スコア */}
        <div className="text-center">
          <div className="relative inline-flex items-center justify-center w-24 h-24 mb-4">
            <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 96 96">
              {/* 背景の円 */}
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                className="text-gray-200"
              />
              {/* スコアの円 */}
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={`${(overallScore * 251.2) / 100} 251.2`}
                className={getScoreColor(overallScore).replace('bg-', 'text-')}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold text-gray-900">{overallScore}</span>
            </div>
          </div>
          <div className="text-lg font-semibold text-gray-900">
            {ja.results.overall.score}
          </div>
          <div className="text-sm text-gray-600">
            ランク: <span className="font-medium">{getScoreGrade(overallScore)}</span>
          </div>
        </div>

        {/* 各カテゴリーのスコア */}
        <div className="space-y-4">
          {scoreData.map((data, index) => (
            <div key={index} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">
                  {data.category}
                </span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-bold text-gray-900">
                    {data.score}
                  </span>
                  <span className="text-xs text-gray-500">
                    / {data.maxScore}
                  </span>
                  <span className="text-xs font-medium text-gray-600">
                    ({getScoreGrade(data.score)})
                  </span>
                </div>
              </div>
              
              {/* プログレスバー */}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${data.color}`}
                  style={{ width: `${(data.score / data.maxScore) * 100}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>

        {/* スコア凡例 */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">スコア評価基準</h4>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>90+ (A)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-yellow-500 rounded"></div>
              <span>70-89 (B-C)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-orange-500 rounded"></div>
              <span>50-69 (D)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span>0-49 (F)</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ScoreChart;