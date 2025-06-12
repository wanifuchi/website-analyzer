import rateLimit from 'express-rate-limit';

export const rateLimiter = rateLimit({
  windowMs: parseInt(process.env.API_RATE_LIMIT_WINDOW_MS || '900000'), // 15分
  max: parseInt(process.env.API_RATE_LIMIT_MAX_REQUESTS || '100'),
  message: {
    success: false,
    error: 'リクエスト数が制限を超えました。しばらく時間をおいて再度お試しください。'
  },
  standardHeaders: true,
  legacyHeaders: false,
});