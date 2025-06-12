#!/bin/bash

# Toneya Analysis V1 - クイックスタート

echo "🚀 Toneya Analysis V1を起動しています..."

# プロジェクトディレクトリに移動
cd "$(dirname "$0")"

# 既存のプロセスを停止
echo "🔄 既存のプロセスを確認・停止中..."
pkill -f "node server.js" 2>/dev/null || true
pkill -f "npm run dev" 2>/dev/null || true

# バックエンドを起動
echo "⚙️  バックエンドサーバーを起動中..."
cd backend
nohup node server.js > server.log 2>&1 &
BACKEND_PID=$!

# バックエンドの起動を待つ
sleep 3

# バックエンドの確認
if curl -s http://localhost:3002/api/health > /dev/null; then
  echo "✅ バックエンドサーバーが正常に起動しました (Port 3002)"
else
  echo "❌ バックエンドサーバーの起動に失敗しました"
  exit 1
fi

# フロントエンドを起動
echo "🎨 フロントエンドサーバーを起動中..."
cd ../frontend
nohup npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!

# フロントエンドの起動を待つ
sleep 5

# フロントエンドの確認
if curl -s http://localhost:3000 > /dev/null; then
  echo "✅ フロントエンドサーバーが正常に起動しました (Port 3000)"
else
  echo "❌ フロントエンドサーバーの起動に失敗しました"
fi

echo ""
echo "🎉 Toneya Analysis V1が起動しました！"
echo ""
echo "📱 フロントエンド: http://localhost:3000"
echo "🔧 バックエンドAPI: http://localhost:3002"
echo "🏥 ヘルスチェック: http://localhost:3002/api/health"
echo ""
echo "🌐 ブラウザで http://localhost:3000 を開いてください"
echo ""
echo "🛑 停止する場合は以下のコマンドを実行してください:"
echo "   pkill -f 'node server.js'"
echo "   pkill -f 'npm run dev'"
echo ""

# ブラウザを自動で開く (macOS)
if command -v open > /dev/null; then
  echo "🌐 ブラウザを開いています..."
  open http://localhost:3000
fi