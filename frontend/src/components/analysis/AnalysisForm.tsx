import React, { useState } from 'react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { AnalysisRequest } from '../../types/analysis';
import ja from '../../i18n/ja.json';

interface AnalysisFormProps {
  onSubmit: (request: AnalysisRequest) => void;
  loading?: boolean;
}

const AnalysisForm: React.FC<AnalysisFormProps> = ({ onSubmit, loading = false }) => {
  const [url, setUrl] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [options, setOptions] = useState({
    maxDepth: 3,
    maxPages: 50,
    skipImages: false,
    skipCSS: false,
    skipJS: false
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // バリデーション
    const newErrors: { [key: string]: string } = {};

    if (!url.trim()) {
      newErrors.url = 'URLを入力してください';
    } else if (!validateUrl(url)) {
      newErrors.url = ja.errors.invalidUrl;
    }

    if (options.maxDepth < 1 || options.maxDepth > 10) {
      newErrors.maxDepth = '深度は1-10の範囲で入力してください';
    }

    if (options.maxPages < 1 || options.maxPages > 1000) {
      newErrors.maxPages = 'ページ数は1-1000の範囲で入力してください';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // フォーム送信
    onSubmit({
      url: url.trim(),
      options
    });
  };

  const handleOptionsChange = (key: keyof typeof options, value: any) => {
    setOptions(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <Card title="ウェブサイト分析を開始" className="max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* URL入力フィールド */}
        <div>
          <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
            {ja.analysis.inputLabel}
          </label>
          <input
            type="url"
            id="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={ja.analysis.inputPlaceholder}
            className={`w-full px-4 py-3 border rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.url ? 'border-red-300' : 'border-gray-300'
            }`}
            disabled={loading}
          />
          {errors.url && (
            <p className="mt-1 text-sm text-red-600">{errors.url}</p>
          )}
        </div>

        {/* 詳細オプション */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            <svg
              className={`w-4 h-4 mr-1 transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {ja.options.advanced}
          </button>

          {showAdvanced && (
            <div className="mt-4 p-4 bg-gray-50 rounded-md space-y-4">
              <h4 className="text-sm font-medium text-gray-900">{ja.options.title}</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 最大深度 */}
                <div>
                  <label htmlFor="maxDepth" className="block text-sm font-medium text-gray-700 mb-1">
                    {ja.options.maxDepth}
                  </label>
                  <input
                    type="number"
                    id="maxDepth"
                    min="1"
                    max="10"
                    value={options.maxDepth}
                    onChange={(e) => handleOptionsChange('maxDepth', parseInt(e.target.value) || 1)}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.maxDepth ? 'border-red-300' : 'border-gray-300'
                    }`}
                    disabled={loading}
                  />
                  {errors.maxDepth && (
                    <p className="mt-1 text-xs text-red-600">{errors.maxDepth}</p>
                  )}
                </div>

                {/* 最大ページ数 */}
                <div>
                  <label htmlFor="maxPages" className="block text-sm font-medium text-gray-700 mb-1">
                    {ja.options.maxPages}
                  </label>
                  <input
                    type="number"
                    id="maxPages"
                    min="1"
                    max="1000"
                    value={options.maxPages}
                    onChange={(e) => handleOptionsChange('maxPages', parseInt(e.target.value) || 1)}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.maxPages ? 'border-red-300' : 'border-gray-300'
                    }`}
                    disabled={loading}
                  />
                  {errors.maxPages && (
                    <p className="mt-1 text-xs text-red-600">{errors.maxPages}</p>
                  )}
                </div>
              </div>

              {/* スキップオプション */}
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={options.skipImages}
                    onChange={(e) => handleOptionsChange('skipImages', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    disabled={loading}
                  />
                  <span className="ml-2 text-sm text-gray-700">{ja.options.skipImages}</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={options.skipCSS}
                    onChange={(e) => handleOptionsChange('skipCSS', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    disabled={loading}
                  />
                  <span className="ml-2 text-sm text-gray-700">{ja.options.skipCSS}</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={options.skipJS}
                    onChange={(e) => handleOptionsChange('skipJS', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    disabled={loading}
                  />
                  <span className="ml-2 text-sm text-gray-700">{ja.options.skipJS}</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* 送信ボタン */}
        <Button
          type="submit"
          size="lg"
          fullWidth
          loading={loading}
          disabled={loading}
        >
          {loading ? ja.analysis.analyzing : ja.analysis.startButton}
        </Button>
      </form>
    </Card>
  );
};

export default AnalysisForm;