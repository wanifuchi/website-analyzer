FROM ghcr.io/puppeteer/puppeteer:21.0.0

# Puppeteerに必要な環境変数を設定
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

WORKDIR /app

# package.jsonとpackage-lock.jsonをコピー
COPY package*.json ./

# 依存関係をインストール
RUN npm ci --only=production

# ソースコードをコピー
COPY . .

# 権限設定
USER pptruser

# ポートを公開
EXPOSE 3002

# アプリケーションを起動
CMD ["node", "server.js"]