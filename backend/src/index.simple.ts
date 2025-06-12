import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] 
    : ['http://localhost:3000'],
  credentials: true
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 基本的なルート
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Toneya Analysis V1 API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// 分析開始のモックエンドポイント
app.post('/api/analysis/start', (req, res) => {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({
      success: false,
      error: 'URLは必須です'
    });
  }

  // URLバリデーション
  try {
    new URL(url);
  } catch {
    return res.status(400).json({
      success: false,
      error: '有効なURLを入力してください'
    });
  }

  const analysisId = `analysis-${Date.now()}`;
  
  res.status(201).json({
    success: true,
    data: {
      id: analysisId,
      url: url,
      status: 'pending',
      startedAt: new Date().toISOString()
    }
  });
});

// 分析履歴のモック
app.get('/api/analysis/history', (req, res) => {
  res.json({
    success: true,
    data: {
      analyses: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0
      }
    }
  });
});

// 404ハンドラー
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'エンドポイントが見つかりません'
  });
});

// エラーハンドラー
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('API Error:', err);
  res.status(500).json({
    success: false,
    error: 'サーバー内部エラーが発生しました'
  });
});

const startServer = (): void => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
  });
};

startServer();