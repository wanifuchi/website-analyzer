#!/bin/bash

# Toneya Analysis V1起動スクリプト

echo "Toneya Analysis V1を起動します..."

# Docker Composeでサービスを起動
echo "Dockerサービスを起動中..."
docker-compose up -d postgres redis

# データベースの準備を待つ
echo "データベースの準備を待機中..."
sleep 10

# バックエンドの依存関係をインストール
echo "バックエンドの依存関係をインストール中..."
cd backend
npm install
cd ..

# フロントエンドの依存関係をインストール
echo "フロントエンドの依存関係をインストール中..."
cd frontend
npm install
cd ..

# 必要なディレクトリを作成
mkdir -p backend/logs
mkdir -p backend/reports

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
echo "Toneya Analysis V1が起動しました！"
echo ""
echo "フロントエンド: http://localhost:3000"
echo "バックエンドAPI: http://localhost:3001"
echo ""
echo "終了するには Ctrl+C を押してください"
echo "==============================================="
echo ""

# シグナルハンドラーを設定してプロセスを終了
trap 'echo ""; echo "サーバーを停止中..."; kill $BACKEND_PID $FRONTEND_PID; docker-compose down; exit' INT

# プロセスが終了するまで待機
wait $BACKEND_PID $FRONTEND_PID