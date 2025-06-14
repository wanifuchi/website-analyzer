import axios from 'axios';
import { AnalysisRequest, Analysis, ApiResponse } from '../types/analysis';

// 環境変数または本番URLを使用
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://website-analyzer-production-c933.up.railway.app';

// デバッグ用ログ
console.log('API_BASE_URL:', API_BASE_URL);
console.log('VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// レスポンスインターセプター
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    } else if (error.code === 'ECONNABORTED') {
      throw new Error('リクエストがタイムアウトしました');
    } else if (error.code === 'ERR_NETWORK') {
      throw new Error('ネットワークエラーが発生しました');
    } else {
      throw new Error('サーバーエラーが発生しました');
    }
  }
);

export const analysisApi = {
  // 分析開始
  startAnalysis: async (request: AnalysisRequest): Promise<Analysis> => {
    const response = await api.post<ApiResponse<Analysis>>('/api/analysis/start', request);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || '分析の開始に失敗しました');
    }
    return response.data.data;
  },

  // 分析結果取得
  getAnalysis: async (id: string): Promise<Analysis> => {
    const response = await api.get<ApiResponse<Analysis>>(`/api/analysis/${id}`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || '分析結果の取得に失敗しました');
    }
    return response.data.data;
  },

  // 分析ステータス確認
  getAnalysisStatus: async (id: string): Promise<Analysis> => {
    const response = await api.get<ApiResponse<Analysis>>(`/api/analysis/${id}/status`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'ステータスの取得に失敗しました');
    }
    return response.data.data;
  },

  // 分析履歴取得
  getAnalysisHistory: async (page = 1, limit = 20): Promise<{
    analyses: Analysis[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> => {
    try {
      const response = await api.get(`/api/analysis/history?page=${page}&limit=${limit}`);
      
      // レスポンスデータの構造確認
      console.log('History API response:', response.data);
      
      if (response.data.success && response.data.data && response.data.data.analyses) {
        // バックエンドの実際のレスポンス形式に合わせる
        return {
          analyses: response.data.data.analyses || [],
          pagination: response.data.data.pagination || {
            page,
            limit,
            total: 0,
            totalPages: 0
          }
        };
      } else if (response.data.success && response.data.analyses) {
        // フォールバック: 古いAPIレスポンス形式に対応
        return {
          analyses: response.data.analyses || [],
          pagination: {
            page: response.data.page || page,
            limit: response.data.limit || limit,
            total: response.data.total || 0,
            totalPages: Math.ceil((response.data.total || 0) / limit)
          }
        };
      }
      
      // フォールバック: 空の履歴を返す
      return {
        analyses: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0
        }
      };
    } catch (error: any) {
      console.error('History API error:', error);
      
      // エラー時もフォールバックで空の履歴を返す
      return {
        analyses: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0
        }
      };
    }
  },

  // 分析結果削除
  deleteAnalysis: async (id: string): Promise<void> => {
    const response = await api.delete<ApiResponse<void>>(`/api/analysis/${id}`);
    if (!response.data.success) {
      throw new Error(response.data.error || '分析結果の削除に失敗しました');
    }
  },

  // PDFレポート生成
  generatePDFReport: async (id: string): Promise<Blob> => {
    try {
      const response = await api.get(`/api/analysis/${id}/pdf`, {
        responseType: 'blob',
        timeout: 60000, // 60秒のタイムアウト
      });
      
      if (!response.data || response.data.size === 0) {
        throw new Error('PDFファイルが生成されませんでした');
      }
      
      return response.data;
    } catch (error: any) {
      console.error('PDF generation API error:', error);
      if (error.response?.status === 404) {
        throw new Error('分析結果が見つかりません');
      } else if (error.response?.status === 400) {
        throw new Error('分析が完了していません');
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('PDF生成がタイムアウトしました');
      }
      throw new Error('PDFレポートの生成に失敗しました');
    }
  },

  // CSVエクスポート
  exportCSV: async (id: string): Promise<Blob> => {
    try {
      const response = await api.get(`/api/analysis/${id}/csv`, {
        responseType: 'blob',
        timeout: 30000, // 30秒のタイムアウト
      });
      
      if (!response.data || response.data.size === 0) {
        throw new Error('CSVファイルが生成されませんでした');
      }
      
      return response.data;
    } catch (error: any) {
      console.error('CSV export API error:', error);
      if (error.response?.status === 404) {
        throw new Error('分析結果が見つかりません');
      } else if (error.response?.status === 400) {
        throw new Error('分析が完了していません');
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('CSVエクスポートがタイムアウトしました');
      }
      throw new Error('CSVエクスポートに失敗しました');
    }
  },
};

// ヘルスチェック
export const healthCheck = async (): Promise<boolean> => {
  try {
    const response = await api.get('/health');
    return response.data.success;
  } catch {
    return false;
  }
};

export default api;