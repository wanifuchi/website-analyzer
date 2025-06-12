import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { analysisApi } from '../utils/api';
import { AnalysisRequest, Analysis } from '../types/analysis';
import toast from 'react-hot-toast';

// 分析開始
export const useStartAnalysis = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: AnalysisRequest) => analysisApi.startAnalysis(request),
    onSuccess: (data) => {
      toast.success('分析を開始しました');
      queryClient.invalidateQueries({ queryKey: ['analysis', 'history'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || '分析の開始に失敗しました');
    },
  });
};

// 分析結果取得
export const useAnalysis = (id: string | null, enabled = true) => {
  return useQuery({
    queryKey: ['analysis', id],
    queryFn: () => analysisApi.getAnalysis(id!),
    enabled: enabled && !!id,
    refetchInterval: (data) => {
      if (data?.status === 'processing' || data?.status === 'pending') {
        return 2000; // 2秒間隔でポーリング
      }
      return false;
    },
    staleTime: 5 * 60 * 1000, // 5分間はキャッシュを使用
  });
};

// 分析ステータス確認
export const useAnalysisStatus = (id: string | null, enabled = true) => {
  return useQuery({
    queryKey: ['analysis', 'status', id],
    queryFn: () => analysisApi.getAnalysisStatus(id!),
    enabled: enabled && !!id,
    refetchInterval: (data) => {
      if (data?.status === 'processing' || data?.status === 'pending') {
        return 1000; // 1秒間隔でポーリング
      }
      return false;
    },
    staleTime: 0, // 常に最新のステータスを取得
  });
};

// 分析履歴取得
export const useAnalysisHistory = (page = 1, limit = 20) => {
  return useQuery({
    queryKey: ['analysis', 'history', page, limit],
    queryFn: () => analysisApi.getAnalysisHistory(page, limit),
    staleTime: 30 * 1000, // 30秒間はキャッシュを使用
  });
};

// 分析削除
export const useDeleteAnalysis = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => analysisApi.deleteAnalysis(id),
    onSuccess: () => {
      toast.success('分析結果を削除しました');
      queryClient.invalidateQueries({ queryKey: ['analysis', 'history'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || '分析結果の削除に失敗しました');
    },
  });
};

// PDFレポート生成
export const useGeneratePDFReport = () => {
  return useMutation({
    mutationFn: (id: string) => analysisApi.generatePDFReport(id),
    onSuccess: (blob, id) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `website-analysis-report-${id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('PDFレポートをダウンロードしました');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'PDFレポートの生成に失敗しました');
    },
  });
};

// CSVエクスポート
export const useExportCSV = () => {
  return useMutation({
    mutationFn: (id: string) => analysisApi.exportCSV(id),
    onSuccess: (blob, id) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `website-analysis-data-${id}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('CSVデータをエクスポートしました');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'CSVエクスポートに失敗しました');
    },
  });
};