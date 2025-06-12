import React from 'react';
import Card from '../ui/Card';
import { PerformanceResults } from '../../types/analysis';
import ja from '../../i18n/ja.json';

interface PerformanceChartProps {
  performance: PerformanceResults;
  className?: string;
}

const PerformanceChart: React.FC<PerformanceChartProps> = ({ performance, className = '' }) => {
  const formatTime = (time: number): string => {
    if (time < 1000) {
      return `${Math.round(time)} ${ja.units.ms}`;
    }
    return `${(time / 1000).toFixed(1)} ${ja.units.s}`;
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) {
      return `${bytes} ${ja.units.bytes}`;
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} ${ja.units.kb}`;
    } else {
      return `${(bytes / (1024 * 1024)).toFixed(1)} ${ja.units.mb}`;
    }
  };

  const getMetricColor = (value: number, thresholds: { good: number; needs: number }): string => {
    if (value <= thresholds.good) return 'text-green-600';
    if (value <= thresholds.needs) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getMetricBgColor = (value: number, thresholds: { good: number; needs: number }): string => {
    if (value <= thresholds.good) return 'bg-green-100';
    if (value <= thresholds.needs) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  // Core Web Vitals の閾値（ミリ秒）
  const thresholds = {
    fcp: { good: 1800, needs: 3000 },
    lcp: { good: 2500, needs: 4000 },
    tti: { good: 3800, needs: 7300 },
    tbt: { good: 200, needs: 600 }
  };

  const coreMetrics = [
    {
      label: ja.results.performance.fcp,
      value: performance.firstContentfulPaint,
      threshold: thresholds.fcp,
      description: 'ページが最初のコンテンツを表示するまでの時間'
    },
    {
      label: ja.results.performance.lcp,
      value: performance.largestContentfulPaint,
      threshold: thresholds.lcp,
      description: 'ページの主要なコンテンツが読み込まれるまでの時間'
    },
    {
      label: ja.results.performance.tti,
      value: performance.timeToInteractive,
      threshold: thresholds.tti,
      description: 'ページが完全にインタラクティブになるまでの時間'
    },
    {
      label: ja.results.performance.tbt,
      value: performance.totalBlockingTime,
      threshold: thresholds.tbt,
      description: 'メインスレッドがブロックされた合計時間'
    }
  ];

  const resourceData = [
    { label: 'HTML', size: performance.resourceSizes.html, color: 'bg-blue-500' },
    { label: 'CSS', size: performance.resourceSizes.css, color: 'bg-green-500' },
    { label: 'JavaScript', size: performance.resourceSizes.javascript, color: 'bg-yellow-500' },
    { label: '画像', size: performance.resourceSizes.images, color: 'bg-purple-500' },
    { label: 'フォント', size: performance.resourceSizes.fonts, color: 'bg-pink-500' },
    { label: 'その他', size: performance.resourceSizes.other, color: 'bg-gray-500' }
  ].filter(item => item.size > 0);

  const maxResourceSize = Math.max(...resourceData.map(item => item.size));

  return (
    <Card title={ja.charts.performanceMetrics} className={className}>
      <div className="space-y-8">
        {/* Core Web Vitals */}
        <div>
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Core Web Vitals</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {coreMetrics.map((metric, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${getMetricBgColor(metric.value, metric.threshold)}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-medium text-gray-900">{metric.label}</h5>
                  <span className={`text-lg font-bold ${getMetricColor(metric.value, metric.threshold)}`}>
                    {formatTime(metric.value)}
                  </span>
                </div>
                <p className="text-xs text-gray-600">{metric.description}</p>
                
                {/* インジケーター */}
                <div className="mt-3 flex items-center space-x-2 text-xs">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded mr-1"></div>
                    <span>良好: {formatTime(metric.threshold.good)}</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-yellow-500 rounded mr-1"></div>
                    <span>要改善: {formatTime(metric.threshold.needs)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 読み込み時間の概要 */}
        <div>
          <h4 className="text-lg font-semibold text-gray-900 mb-4">読み込み時間の概要</h4>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-gray-700">総読み込み時間</span>
              <span className="text-xl font-bold text-gray-900">
                {formatTime(performance.loadTime)}
              </span>
            </div>
          </div>
        </div>

        {/* リソースサイズの内訳 */}
        <div>
          <h4 className="text-lg font-semibold text-gray-900 mb-4">{ja.charts.resourceBreakdown}</h4>
          <div className="space-y-3">
            {resourceData.map((resource, index) => (
              <div key={index} className="space-y-1">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded ${resource.color}`}></div>
                    <span className="text-sm font-medium text-gray-700">{resource.label}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {formatSize(resource.size)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${resource.color}`}
                    style={{ width: `${(resource.size / maxResourceSize) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-blue-900">総リソースサイズ</span>
              <span className="text-lg font-bold text-blue-900">
                {formatSize(performance.resourceSizes.total)}
              </span>
            </div>
          </div>
        </div>

        {/* パフォーマンススコア */}
        <div className="border-t pt-6">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-semibold text-gray-900">
              {ja.results.performance.score}
            </h4>
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-600">{performance.score}</div>
              <div className="text-sm text-gray-600">/ 100</div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default PerformanceChart;