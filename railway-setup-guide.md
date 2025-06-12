# Railway セットアップ詳細ガイド

## 🚄 Railway デプロイ手順（詳細版）

### Step 1: プロジェクト作成
1. https://railway.app/ にアクセス
2. "Login with GitHub" でログイン
3. "New Project" をクリック
4. "Deploy from GitHub repo" を選択
5. "wanifuchi/toneya-analysis-v1" を選択

### Step 2: サービス設定（重要）

#### 方法A: Root Directory 設定（推奨）
1. 作成されたサービスをクリック
2. "Settings" タブをクリック
3. "Source" セクションで "Root Directory" に `backend` と入力
4. "Save" をクリック

#### 方法B: 環境変数設定（代替）
1. "Variables" タブをクリック
2. "+ New Variable" をクリック
3. Name: `RAILWAY_DOCKERFILE_PATH`
4. Value: `backend/Dockerfile`
5. "Add" をクリック

### Step 3: PostgreSQL追加
1. プロジェクトダッシュボードで "+ Add Service"
2. "Database" → "PostgreSQL" を選択

### Step 4: 環境変数設定
Variables タブで以下を設定：

```
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
FRONTEND_URL=https://website-analyzer-wanifuchi.vercel.app
PORT=${{PORT}}
```

### Step 5: デプロイ確認
1. "Deployments" タブでビルドログを確認
2. 成功すると緑色の "Success" が表示
3. "View Logs" でエラーがないか確認

## 🔍 トラブルシューティング

### エラー1: package.json not found
**原因**: Root Directoryが設定されていない
**解決**: Settings → Source → Root Directory を `backend` に設定

### エラー2: Build failed
**原因**: 依存関係のインストールエラー
**解決**: Variables タブで `NPM_CONFIG_PRODUCTION=false` を追加

### エラー3: Port binding error
**原因**: ポート設定の問題
**解決**: server.js で `process.env.PORT` を使用していることを確認

## 📋 確認項目チェックリスト

- [ ] GitHub リポジトリが正しく選択されている
- [ ] Root Directory が `backend` に設定されている
- [ ] PostgreSQL サービスが追加されている
- [ ] 環境変数が正しく設定されている
- [ ] デプロイが成功している（緑色のSuccess表示）
- [ ] ヘルスチェックURL `https://your-railway-url/api/health` が応答している

## 🌐 デプロイ後のURL確認

1. サービス画面で "Settings" タブ
2. "Domains" セクションで公開URLを確認
3. `https://website-analyzer-production-XXXX.up.railway.app/api/health` でテスト

## 💡 よくある質問

**Q: Root Directoryはどこで設定するの？**
A: サービス → Settings → Source → Root Directory

**Q: PostgreSQLの接続情報はどこで確認できる？**
A: PostgreSQLサービス → Variables タブで DATABASE_URL を確認

**Q: デプロイに失敗した場合は？**
A: Deployments → 失敗したデプロイ → "View Logs" でエラー内容を確認