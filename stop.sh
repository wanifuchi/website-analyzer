#!/bin/bash

# Toneya Analysis V1 - 停止スクリプト

echo "🛑 Toneya Analysis V1を停止しています..."

# プロセスを停止
pkill -f "node server.js" 2>/dev/null && echo "✅ バックエンドサーバーを停止しました" || echo "ℹ️  バックエンドサーバーは実行されていませんでした"
pkill -f "npm run dev" 2>/dev/null && echo "✅ フロントエンドサーバーを停止しました" || echo "ℹ️  フロントエンドサーバーは実行されていませんでした"

echo "🏁 すべてのサーバーを停止しました"