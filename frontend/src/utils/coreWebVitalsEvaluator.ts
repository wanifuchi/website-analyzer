// Core Web Vitals の評価とアドバイスを取得するユーティリティ

export interface EvaluationResult {
  status: string;
  color: string;
  evaluation: string;
  advice: string;
  target: string;
}

export const getCoreWebVitalEvaluation = (metric: string, value: number | null, score: number | null): EvaluationResult => {
  if (value === null || score === null) {
    return {
      status: 'unknown',
      color: 'gray',
      evaluation: 'データなし',
      advice: 'データが取得できませんでした',
      target: '-'
    };
  }

  const evaluations: Record<string, any> = {
    'lcp': {
      good: { evaluation: '優秀', advice: '現在の速度を維持してください', target: '2.5秒以下（推奨）' },
      needsImprovement: { evaluation: '要改善', advice: '画像最適化、サーバー応答改善が必要', target: '2.5秒以下に改善' },
      poor: { evaluation: '問題あり', advice: '画像圧縮、CDN導入、サーバー最適化が急務', target: '2.5秒以下に大幅改善' }
    },
    'fcp': {
      good: { evaluation: '優秀', advice: '初期表示が高速です', target: '1.8秒以下（推奨）' },
      needsImprovement: { evaluation: '要改善', advice: 'CSS・JavaScript最適化が必要', target: '1.8秒以下に改善' },
      poor: { evaluation: '問題あり', advice: 'リソース圧縮、クリティカルCSS適用が急務', target: '1.8秒以下に大幅改善' }
    },
    'cls': {
      good: { evaluation: '優秀', advice: 'レイアウトが安定しています', target: '0.1以下（推奨）' },
      needsImprovement: { evaluation: '要改善', advice: '画像サイズ指定、フォント最適化が必要', target: '0.1以下に改善' },
      poor: { evaluation: '問題あり', advice: 'レイアウトシフト防止策の実装が急務', target: '0.1以下に大幅改善' }
    },
    'tbt': {
      good: { evaluation: '優秀', advice: 'JavaScriptの実行が効率的です', target: '200ms以下（推奨）' },
      needsImprovement: { evaluation: '要改善', advice: 'JavaScript分割、遅延読み込みが必要', target: '200ms以下に改善' },
      poor: { evaluation: '問題あり', advice: 'JavaScript最適化、不要コード削除が急務', target: '200ms以下に大幅改善' }
    },
    'ttfb': {
      good: { evaluation: '優秀', advice: 'サーバー応答が高速です', target: '800ms以下（推奨）' },
      needsImprovement: { evaluation: '要改善', advice: 'サーバー最適化、CDN導入を検討', target: '800ms以下に改善' },
      poor: { evaluation: '問題あり', advice: 'サーバー性能向上、キャッシュ戦略見直しが急務', target: '800ms以下に大幅改善' }
    }
  };

  const metricEval = evaluations[metric];
  if (!metricEval) {
    return { 
      status: 'unknown', 
      color: 'gray', 
      evaluation: '不明', 
      advice: '-', 
      target: '-' 
    };
  }

  if (score >= 0.9) {
    return { status: 'good', color: 'green', ...metricEval.good };
  } else if (score >= 0.5) {
    return { status: 'needsImprovement', color: 'yellow', ...metricEval.needsImprovement };
  } else {
    return { status: 'poor', color: 'red', ...metricEval.poor };
  }
};

export const getColorClasses = (color: string) => ({
  indicator: color === 'green' ? 'bg-green-500' : color === 'yellow' ? 'bg-yellow-500' : 'bg-red-500',
  text: color === 'green' ? 'text-green-700' : color === 'yellow' ? 'text-yellow-700' : 'text-red-700'
});