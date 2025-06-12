import axios from 'axios';
import { AnalysisRequest, Analysis, ApiResponse } from '../types/analysis';

// 緊急対処: 一時的にハードコード
const API_BASE_URL = 'https://website-analyzer-production-c933.up.railway.app';

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
    const response = await api.get<ApiResponse<Analysis>>(`/analysis/${id}`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || '分析結果の取得に失敗しました');
    }
    return response.data.data;
  },

  // 分析ステータス確認
  getAnalysisStatus: async (id: string): Promise<Analysis> => {
    const response = await api.get<ApiResponse<Analysis>>(`/analysis/${id}/status`);
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
    const response = await api.get<ApiResponse<{
      analyses: Analysis[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>>(`/analysis/history?page=${page}&limit=${limit}`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || '履歴の取得に失敗しました');
    }
    return response.data.data;
  },

  // 分析結果削除
  deleteAnalysis: async (id: string): Promise<void> => {
    const response = await api.delete<ApiResponse<void>>(`/analysis/${id}`);
    if (!response.data.success) {
      throw new Error(response.data.error || '分析結果の削除に失敗しました');
    }
  },

  // PDFレポート生成
  generatePDFReport: async (id: string): Promise<Blob> => {
    const response = await api.get(`/analysis/${id}/report`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // CSVエクスポート
  exportCSV: async (id: string): Promise<Blob> => {
    const response = await api.get(`/analysis/${id}/export`, {
      responseType: 'blob',
    });
    return response.data;
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