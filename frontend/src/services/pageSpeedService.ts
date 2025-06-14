/**
 * フロントエンド直接PageSpeed統合サービス
 * バックエンドでの統合に問題がある場合の代替実装
 */

export interface CoreWebVitals {
  lcp: { value: number | null; displayValue: string; score: number | null; description: string };
  fid: { value: number | null; displayValue: string; score: number | null; description: string };
  cls: { value: number | null; displayValue: string; score: number | null; description: string };
  fcp: { value: number | null; displayValue: string; score: number | null; description: string };
  tbt: { value: number | null; displayValue: string; score: number | null; description: string };
  inp: { value: number | null; displayValue: string; score: number | null; description: string };
  ttfb: { value: number | null; displayValue: string; score: number | null; description: string };
}

export interface PageSpeedResults {
  mobile: {
    strategy: string;
    scores: {
      performance: number | null;
      accessibility: number | null;
      bestPractices: number | null;
      seo: number | null;
    };
    coreWebVitals: CoreWebVitals;
    timestamp: string;
  };
  desktop: {
    strategy: string;
    scores: {
      performance: number | null;
      accessibility: number | null;
      bestPractices: number | null;
      seo: number | null;
    };
    coreWebVitals: CoreWebVitals;
    timestamp: string;
  };
}

class PageSpeedService {
  private readonly apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://website-analyzer-production-c933.up.railway.app';

  /**
   * バックエンド経由でPageSpeedデータを取得（安全な方法）
   */
  async analyzeUrl(url: string): Promise<PageSpeedResults | null> {
    try {
      console.log('🚀 フロントエンド補完PageSpeed分析開始:', url);

      const response = await fetch(`${this.apiBaseUrl}/api/pagespeed/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url })
      });

      if (!response.ok) {
        throw new Error(`PageSpeed補完分析エラー: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success || !data.data) {
        console.error('❌ PageSpeed補完分析に失敗:', data.error);
        return null;
      }

      console.log('✅ PageSpeed補完分析完了:', data.data);
      return data.data;

    } catch (error) {
      console.error('❌ PageSpeed補完分析エラー:', error);
      return null;
    }
  }

}

export const pageSpeedService = new PageSpeedService();