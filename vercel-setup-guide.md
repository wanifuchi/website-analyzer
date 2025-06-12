# Vercel フロントエンドデプロイガイド

## 🚀 Vercel デプロイ手順

### Step 1: Vercelアカウント作成
1. https://vercel.com/ にアクセス
2. "Start Deploying" または "Login with GitHub"
3. GitHubアカウントでログイン

### Step 2: プロジェクトインポート
1. Vercelダッシュボードで "Add New..." → "Project"
2. "Import Git Repository" を選択
3. **wanifuchi/toneya-analysis-v1** を選択
4. "Import" をクリック

### Step 3: プロジェクト設定
**Configure Project 画面で以下を設定：**

- **Project Name**: `website-analyzer` (または任意の名前)
- **Framework Preset**: `Vite` を選択
- **Root Directory**: `frontend` に設定
- **Build and Output Settings**:
  - Build Command: `npm run build`
  - Output Directory: `dist`
  - Install Command: `npm install`

### Step 4: 環境変数設定
**Environment Variables セクションで以下を追加：**

```
VITE_API_BASE_URL=https://website-analyzer-production-c933.up.railway.app
```

### Step 5: デプロイ実行
1. "Deploy" ボタンをクリック
2. ビルドプロセスを監視
3. 成功すると緑色の "Success" が表示

## 📋 重要な設定項目

### Root Directory設定
- Vercelは `frontend` ディレクトリをルートとして認識する必要があります
- "Settings" → "General" → "Root Directory" で `frontend` を指定

### 環境変数
```bash
# 本番環境用API URL
VITE_API_BASE_URL=https://website-analyzer-production-c933.up.railway.app
```

### Build設定
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install"
}
```

## 🔧 トラブルシューティング

### エラー1: "No Build Output Directory"
**解決**: Output Directory を `dist` に設定

### エラー2: "Framework not detected"
**解決**: Framework Preset を `Vite` に変更

### エラー3: "API connection failed"
**解決**: 環境変数 `VITE_API_BASE_URL` が正しく設定されているか確認

## ✅ 確認手順

1. **デプロイ成功**: Vercelダッシュボードで "Ready" 状態を確認
2. **サイトアクセス**: 公開URLにアクセス
3. **API接続**: ウェブサイト分析機能をテスト
4. **機能確認**: URLを入力して分析が実行されることを確認

## 🌐 予想される公開URL
```
https://website-analyzer-wanifuchi.vercel.app
```
または
```
https://website-analyzer-git-main-wanifuchi.vercel.app
```

## 📝 メモ
- バックエンドAPI: ✅ https://website-analyzer-production-c933.up.railway.app
- PostgreSQL: ✅ 接続成功
- フロントエンド: 🚧 Vercelデプロイ中