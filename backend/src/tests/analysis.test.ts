import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { AppDataSource } from '../config/database';
import analysisRoutes from '../routes/analysisRoutes';

const app = express();
app.use(express.json());
app.use('/api/analysis', analysisRoutes);

describe('Analysis API', () => {
  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  describe('POST /api/analysis/start', () => {
    test('有効なURLで分析を開始できる', async () => {
      const response = await request(app)
        .post('/api/analysis/start')
        .send({
          url: 'https://example.com'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('url', 'https://example.com');
      expect(response.body.data).toHaveProperty('status', 'pending');
    });

    test('無効なURLでエラーになる', async () => {
      const response = await request(app)
        .post('/api/analysis/start')
        .send({
          url: 'invalid-url'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('URL');
    });

    test('URLが空の場合エラーになる', async () => {
      const response = await request(app)
        .post('/api/analysis/start')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('必須');
    });

    test('詳細オプション付きで分析を開始できる', async () => {
      const response = await request(app)
        .post('/api/analysis/start')
        .send({
          url: 'https://example.com',
          options: {
            maxDepth: 2,
            maxPages: 50,
            skipImages: true
          }
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.options).toMatchObject({
        maxDepth: 2,
        maxPages: 50,
        skipImages: true
      });
    });
  });

  describe('GET /api/analysis/history', () => {
    test('分析履歴を取得できる', async () => {
      const response = await request(app)
        .get('/api/analysis/history');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('analyses');
      expect(response.body.data).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data.analyses)).toBe(true);
    });

    test('ページネーション付きで履歴を取得できる', async () => {
      const response = await request(app)
        .get('/api/analysis/history?page=1&limit=10');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.pagination).toMatchObject({
        page: 1,
        limit: 10
      });
    });
  });

  describe('GET /api/analysis/:id/status', () => {
    test('存在しない分析IDでエラーになる', async () => {
      const response = await request(app)
        .get('/api/analysis/invalid-id/status');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('見つかりません');
    });
  });

  describe('GET /api/analysis/:id', () => {
    test('存在しない分析IDでエラーになる', async () => {
      const response = await request(app)
        .get('/api/analysis/invalid-id');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('見つかりません');
    });
  });

  describe('DELETE /api/analysis/:id', () => {
    test('存在しない分析IDでエラーになる', async () => {
      const response = await request(app)
        .delete('/api/analysis/invalid-id');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('見つかりません');
    });
  });
});