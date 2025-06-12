# Vercel環境変数設定手順

## 🚨 現在の問題
フロントエンドからバックエンドAPIに接続できない

## 🔧 解決手順

### 1. Vercelダッシュボードにアクセス
1. https://vercel.com/dashboard にアクセス
2. **website-analyzer-khaki** プロジェクトをクリック

### 2. 環境変数を設定
1. **Settings** タブをクリック
2. **Environment Variables** セクションを探す
3. **Add New** をクリック
4. 以下の環境変数を追加：

```
Name: VITE_API_BASE_URL
Value: https://website-analyzer-production-c933.up.railway.app
Environment: Production, Preview, Development (全てチェック)
```

### 3. 再デプロイ実行
1. **Deployments** タブに移動
2. 最新のデプロイの **...** メニューから **Redeploy** をクリック
3. **Use existing Build Cache** のチェックを**外す**
4. **Redeploy** をクリック

## 🔍 確認方法

再デプロイ完了後：
1. https://website-analyzer-khaki.vercel.app にアクセス
2. 開発者ツール（F12）→ Console タブでエラーを確認
3. Network タブでAPI呼び出しを確認
4. 実際にURL分析をテスト

## 📋 環境変数チェックリスト

- [ ] VITE_API_BASE_URL が正しく設定されている
- [ ] Production環境にも適用されている
- [ ] Build Cacheをクリアして再デプロイした
- [ ] APIが正常に応答している

## 🌐 正しい設定値

```bash
# フロントエンド（Vercel）
VITE_API_BASE_URL=https://website-analyzer-production-c933.up.railway.app

# バックエンド確認用
# https://website-analyzer-production-c933.up.railway.app/api/health
```

## ⚡ 緊急時の対処法

もし環境変数設定がうまくいかない場合：
1. プロジェクトを削除して再作成
2. GitHubから再インポート
3. 設定を最初からやり直す