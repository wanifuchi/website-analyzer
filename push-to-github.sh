#!/bin/bash

echo "🚀 GitHub Repository Setup Script"
echo "================================"
echo ""
echo "1. GitHubでリポジトリを作成してください: https://github.com/new"
echo "   Repository name: toneya-analysis-v1"
echo "   Visibility: Public"
echo ""
echo "2. 作成後、以下のコマンドを実行してください:"
echo ""

# ユーザー名を入力してもらう
read -p "GitHubユーザー名を入力してください: " GITHUB_USERNAME

echo ""
echo "実行するコマンド:"
echo "=================="
echo "git remote add origin https://github.com/$GITHUB_USERNAME/toneya-analysis-v1.git"
echo "git branch -M main"
echo "git push -u origin main"
echo ""

# 実際に実行するかを確認
read -p "今すぐ実行しますか？ (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 リポジトリをpushしています..."
    
    git remote add origin https://github.com/$GITHUB_USERNAME/toneya-analysis-v1.git
    git branch -M main
    git push -u origin main
    
    echo ""
    echo "✅ 完了! リポジトリURL: https://github.com/$GITHUB_USERNAME/toneya-analysis-v1"
    echo ""
    echo "次のステップ:"
    echo "=============="
    echo "1. Railway: https://railway.app/ でバックエンドをデプロイ"
    echo "2. Vercel: https://vercel.com/ でフロントエンドをデプロイ"
    echo ""
    echo "詳細はDEPLOYMENT.mdを参照してください。"
else
    echo "手動で実行してください:"
    echo "git remote add origin https://github.com/$GITHUB_USERNAME/toneya-analysis-v1.git"
    echo "git branch -M main"
    echo "git push -u origin main"
fi