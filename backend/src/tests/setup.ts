import 'dotenv/config';

// テスト環境の設定
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_analyzer';
process.env.REDIS_URL = 'redis://localhost:6379/1';
process.env.LOG_LEVEL = 'error';

// タイムアウト設定
jest.setTimeout(30000);