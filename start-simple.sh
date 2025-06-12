#!/bin/bash

# 簡単な起動スクリプト

echo "Toneya Analysis V1（簡易版）を起動します..."

# 必要なディレクトリを作成
mkdir -p backend/logs

# バックエンドサーバーを起動
echo "バックエンドサーバーを起動中..."
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# フロントエンドサーバーを起動
echo "フロントエンドサーバーを起動中..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "==============================================="
echo "Toneya Analysis V1（簡易版）が起動しました！"
echo ""
echo "フロントエンド: http://localhost:3000"
echo "バックエンドAPI: http://localhost:3001"
echo "ヘルスチェック: http://localhost:3001/api/health"
echo ""
echo "終了するには Ctrl+C を押してください"
echo "==============================================="
echo ""

# シグナルハンドラーを設定してプロセスを終了
trap 'echo ""; echo "サーバーを停止中..."; kill $BACKEND_PID $FRONTEND_PID; exit' INT

# プロセスが終了するまで待機
wait $BACKEND_PID $FRONTEND_PID