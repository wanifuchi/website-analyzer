import React, { useState } from 'react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import ScoreChart from '../charts/ScoreChart';
import PerformanceChart from '../charts/PerformanceChart';
import { AnalysisResults as AnalysisResultsType } from '../../types/analysis';
import ja from '../../i18n/ja.json';
import html2canvas from 'html2canvas';

interface AnalysisResultsProps {
  results: AnalysisResultsType;
  url: string;
  onReAnalyze?: () => void;
  onScreenshot?: () => void;
}

const AnalysisResults: React.FC<AnalysisResultsProps> = ({
  results,
  url,
  onReAnalyze,
  onScreenshot
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'seo' | 'performance' | 'security' | 'accessibility' | 'mobile' | 'technology'>('overview');

  const handleScreenshot = async () => {
    try {
      const element = document.querySelector('.analysis-results-container') || document.body;
      const canvas = await html2canvas(element as HTMLElement, {
        backgroundColor: '#0f172a',
        scale: 1,
        useCORS: true
      });
      
      const link = document.createElement('a');
      link.download = `analysis-results-${url.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL();
      link.click();
      
      if (onScreenshot) {
        onScreenshot();
      }
    } catch (error) {
      console.error('スクリーンショットエラー:', error);
      alert('スクリーンショットの保存に失敗しました');
    }
  };

  const getScoreVariant = (score: number) => {
    if (score >= 90) return 'success';
    if (score >= 70) return 'warning';
    return 'error';
  };

  const getSeverityVariant = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'error';
      case 'serious':
      case 'high':
        return 'error';
      case 'moderate':
      case 'medium':
        return 'warning';
      case 'minor':
      case 'low':
        return 'info';
      default:
        return 'neutral';
    }
  };

  const tabs = [
    { id: 'overview', label: '概要', icon: '📊' },
    { id: 'seo', label: 'SEO', icon: '🔍' },
    { id: 'performance', label: 'パフォーマンス', icon: '⚡' },
    { id: 'security', label: 'セキュリティ', icon: '🔒' },
    { id: 'accessibility', label: 'アクセシビリティ', icon: '♿' },
    { id: 'mobile', label: 'モバイル', icon: '📱' },
    { id: 'technology', label: '技術', icon: '🛠️' }
  ] as const;

  const renderOverview = () => (
    <div className="space-y-6">
      {/* 総合スコア */}
      <Card title={ja.results.overall.title}>
        <div className="text-center">
          <div className="text-6xl font-bold text-blue-600 mb-2">
            {results.overall.score}
          </div>
          <div className="text-lg text-gray-600 mb-4">
            ランク: <Badge variant={getScoreVariant(results.overall.score)} size="lg">
              {results.overall.grade}
            </Badge>
          </div>
          <p className="text-gray-700">{results.overall.summary}</p>
        </div>
      </Card>

      {/* スコアチャート */}
      <ScoreChart
        scores={{
          seo: results.seo.score,
          performance: results.performance.score,
          security: results.security.score,
          accessibility: results.accessibility.score,
          mobile: results.mobile.score
        }}
      />

      {/* 優先的な改善提案 */}
      {results.overall.prioritySuggestions.length > 0 && (
        <Card title="優先的な改善提案">
          <ul className="space-y-2">
            {results.overall.prioritySuggestions.map((suggestion, index) => (
              <li key={index} className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                <span className="text-gray-700">{suggestion}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );

  const renderSEO = () => (
    <div className="space-y-6">
      <Card title={ja.results.seo.title}>
        <div className="mb-4">
          <div className="text-3xl font-bold text-blue-600">
            {results.seo.score} / 100
          </div>
        </div>

        {/* メタタグ分析 */}
        <div className="mb-6">
          <h4 className="text-lg font-semibold mb-3">{ja.results.seo.metaTags}</h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span>タイトルタグ</span>
              <div className="flex items-center space-x-2">
                <Badge variant={results.seo.metaTags.title.optimal ? 'success' : 'warning'}>
                  {results.seo.metaTags.title.optimal ? '最適' : '要改善'}
                </Badge>
                <span className="text-sm text-gray-600">
                  {results.seo.metaTags.title.length}文字
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span>メタディスクリプション</span>
              <div className="flex items-center space-x-2">
                <Badge variant={results.seo.metaTags.description.optimal ? 'success' : 'warning'}>
                  {results.seo.metaTags.description.optimal ? '最適' : '要改善'}
                </Badge>
                <span className="text-sm text-gray-600">
                  {results.seo.metaTags.description.length}文字
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 見出し構造 */}
        <div className="mb-6">
          <h4 className="text-lg font-semibold mb-3">{ja.results.seo.headings}</h4>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const).map((heading, index) => (
              <div key={heading} className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {results.seo.headingStructure[`${heading}Count` as keyof typeof results.seo.headingStructure]}
                </div>
                <div className="text-sm text-gray-600">{heading.toUpperCase()}</div>
              </div>
            ))}
          </div>
          {!results.seo.headingStructure.hasProperHierarchy && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800 text-sm">⚠️ 見出しの階層構造に問題があります</p>
            </div>
          )}
        </div>

        {/* SEO課題 */}
        {results.seo.issues.length > 0 && (
          <div>
            <h4 className="text-lg font-semibold mb-3">{ja.results.seo.issues}</h4>
            <div className="space-y-2">
              {results.seo.issues.map((issue, index) => (
                <div key={index} className="flex items-start p-3 bg-gray-50 rounded-lg">
                  <Badge variant={getSeverityVariant(issue.type)} size="sm" className="mr-3 mt-0.5">
                    {issue.type}
                  </Badge>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{issue.category}</p>
                    <p className="text-sm text-gray-600">{issue.message}</p>
                    {issue.url && (
                      <p className="text-xs text-blue-600 break-all">{issue.url}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );

  const renderPerformance = () => (
    <div className="space-y-6">
      <PerformanceChart performance={results.performance} />
    </div>
  );

  const renderSecurity = () => (
    <div className="space-y-6">
      <Card title={ja.results.security.title}>
        <div className="mb-4">
          <div className="text-3xl font-bold text-blue-600">
            {results.security.score} / 100
          </div>
        </div>

        {/* セキュリティ基本項目 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span>{ja.results.security.httpsUsage}</span>
            <Badge variant={results.security.httpsUsage ? 'success' : 'error'}>
              {results.security.httpsUsage ? '使用中' : '未使用'}
            </Badge>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span>{ja.results.security.mixedContent}</span>
            <Badge variant={results.security.mixedContent ? 'error' : 'success'}>
              {results.security.mixedContent ? 'あり' : 'なし'}
            </Badge>
          </div>
        </div>

        {/* セキュリティヘッダー */}
        <div className="mb-6">
          <h4 className="text-lg font-semibold mb-3">{ja.results.security.securityHeaders}</h4>
          <div className="space-y-2">
            {Object.entries(results.security.securityHeaders).map(([header, present]) => (
              <div key={header} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="capitalize">{header.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
                <Badge variant={present ? 'success' : 'warning'}>
                  {present ? '設定済み' : '未設定'}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* 脆弱性 */}
        {results.security.vulnerabilities.length > 0 && (
          <div>
            <h4 className="text-lg font-semibold mb-3">{ja.results.security.vulnerabilities}</h4>
            <div className="space-y-2">
              {results.security.vulnerabilities.map((vuln, index) => (
                <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-medium text-red-900">{vuln.type}</span>
                    <Badge variant="error" size="sm">{vuln.severity}</Badge>
                  </div>
                  <p className="text-sm text-red-800 mb-2">{vuln.description}</p>
                  <p className="text-sm text-red-700">{vuln.recommendation}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );

  const renderAccessibility = () => (
    <div className="space-y-6">
      <Card title={ja.results.accessibility.title}>
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold text-blue-600">
              {results.accessibility.score} / 100
            </div>
            <Badge variant="info" size="lg">
              WCAG {results.accessibility.wcagLevel}
            </Badge>
          </div>
        </div>

        {/* アクセシビリティ違反 */}
        {results.accessibility.violations.length > 0 && (
          <div>
            <h4 className="text-lg font-semibold mb-3">{ja.results.accessibility.violations}</h4>
            <div className="space-y-3">
              {results.accessibility.violations.map((violation, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-medium text-gray-900">{violation.description}</span>
                    <Badge variant={getSeverityVariant(violation.impact)} size="sm">
                      {ja.severity[violation.impact as keyof typeof ja.severity]}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{violation.help}</p>
                  <div className="flex flex-wrap gap-1">
                    {violation.tags.map((tag, tagIndex) => (
                      <Badge key={tagIndex} variant="neutral" size="sm">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );

  const renderMobile = () => (
    <div className="space-y-6">
      <Card title={ja.results.mobile.title}>
        <div className="mb-4">
          <div className="text-3xl font-bold text-blue-600">
            {results.mobile.score} / 100
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span>{ja.results.mobile.viewport}</span>
            <Badge variant={results.mobile.hasViewportMeta ? 'success' : 'error'}>
              {results.mobile.hasViewportMeta ? '設定済み' : '未設定'}
            </Badge>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span>{ja.results.mobile.responsive}</span>
            <Badge variant={results.mobile.isResponsive ? 'success' : 'error'}>
              {results.mobile.isResponsive ? '対応済み' : '未対応'}
            </Badge>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span>{ja.results.mobile.touchTargets}</span>
            <Badge variant={results.mobile.touchTargetSize ? 'success' : 'warning'}>
              {results.mobile.touchTargetSize ? '適切' : '要改善'}
            </Badge>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span>{ja.results.mobile.textSize}</span>
            <Badge variant={results.mobile.textSize ? 'success' : 'warning'}>
              {results.mobile.textSize ? '適切' : '要改善'}
            </Badge>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderTechnology = () => (
    <div className="space-y-6">
      <Card title={ja.results.technology.title}>
        <div className="space-y-6">
          {Object.entries(results.technology).map(([category, items]) => (
            <div key={category}>
              <h4 className="text-lg font-semibold mb-3 capitalize">
                {ja.results.technology[category as keyof typeof ja.results.technology]}
              </h4>
              {items.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {items.map((item, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-medium text-gray-900">{item.name}</span>
                          {item.version && (
                            <span className="text-sm text-gray-600 ml-2">v{item.version}</span>
                          )}
                        </div>
                        <Badge variant="info" size="sm">
                          {Math.round(item.confidence)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic">検出されませんでした</p>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'seo':
        return renderSEO();
      case 'performance':
        return renderPerformance();
      case 'security':
        return renderSecurity();
      case 'accessibility':
        return renderAccessibility();
      case 'mobile':
        return renderMobile();
      case 'technology':
        return renderTechnology();
      default:
        return renderOverview();
    }
  };

  return (
    <div className="analysis-results-container space-y-6">
      {/* ヘッダー */}
      <Card>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">分析結果</h2>
            <p className="text-gray-600 break-all">{url}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={handleScreenshot}>
              📸 スクリーンショット
            </Button>
            {onReAnalyze && (
              <Button onClick={onReAnalyze}>
                {ja.actions.reAnalyze}
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* タブナビゲーション */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* タブコンテンツ */}
      {renderTabContent()}
    </div>
  );
};

export default AnalysisResults;