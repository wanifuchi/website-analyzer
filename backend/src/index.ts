import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { initializeDatabase } from './config/database';
import { logger } from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import analysisRoutes from './routes/analysisRoutes';
import './workers/analysisWorker';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
// CORS設定 - より包括的に設定
app.use(cors({
  origin: (origin, callback) => {
    // 開発環境では全てのオリジンを許可
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    // 本番環境では特定のドメインのみ許可
    const allowedOrigins = [
      'https://website-analyzer-frontend.vercel.app',
      'https://toneya-analysis-v1-frontend.vercel.app'
    ];
    
    // オリジンが存在しない場合（直接API呼び出し）も許可
    if (!origin) return callback(null, true);
    
    // Vercelのプレビュードメインも許可
    if (origin.includes('.vercel.app')) {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api/analysis', analysisRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Toneya Analysis V1 API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

app.use(notFoundHandler);
app.use(errorHandler);

const startServer = async (): Promise<void> => {
  try {
    await initializeDatabase();
    
    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`, {
        port: PORT,
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
      });
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

startServer();