# Google PageSpeed Insights API セットアップガイド

## 重要なセキュリティ警告

**APIキーを絶対にソースコードにハードコードしないでください！**

## APIキーの取得方法

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. プロジェクトを作成または選択
3. 「APIとサービス」→「ライブラリ」から「PageSpeed Insights API」を検索
4. 「有効にする」をクリック
5. 「認証情報」→「認証情報を作成」→「APIキー」を選択
6. APIキーをコピー

## 環境変数の設定

### ローカル開発環境

1. `backend/.env` ファイルを作成（.env.exampleをコピー）
2. 以下の行を追加：
   ```
   GOOGLE_PAGESPEED_API_KEY=your_actual_api_key_here
   ```
   
**重要**: APIキーは絶対にGitにコミットしないでください！

### Railway（本番環境）

1. Railwayダッシュボードにログイン
2. プロジェクトを選択
3. 「Variables」タブを開く
4. 「+ New Variable」をクリック
5. 以下を設定：
   - Name: `GOOGLE_PAGESPEED_API_KEY`
   - Value: あなたのAPIキー
6. 「Add」をクリック

### Vercel（フロントエンド）

フロントエンドでは直接APIキーを使用しないため、設定は不要です。

## APIキーのセキュリティベストプラクティス

1. **リポジトリにコミットしない**
   - `.env` ファイルは `.gitignore` に含まれていることを確認
   - 誤ってコミットした場合は、即座にキーを無効化し、新しいキーを生成

2. **APIキーの制限**
   - Google Cloud Consoleで以下の制限を設定：
     - アプリケーションの制限：「HTTPリファラー」
     - 許可するリファラー：本番環境のドメインのみ
     - API制限：「PageSpeed Insights API」のみ

3. **定期的なローテーション**
   - 3ヶ月ごとにAPIキーを更新
   - 古いキーは即座に無効化

## トラブルシューティング

### APIキーが機能しない場合

1. 環境変数が正しく設定されているか確認：
   ```bash
   echo $GOOGLE_PAGESPEED_API_KEY
   ```

2. APIが有効になっているか確認：
   - Google Cloud ConsoleでPageSpeed Insights APIが有効か確認

3. 料金制限を確認：
   - 無料枠：1日あたり25,000リクエスト
   - それ以上は課金が必要

### エラーメッセージ

- `401 Unauthorized`: APIキーが無効または設定されていない
- `403 Forbidden`: APIキーの制限に違反している
- `429 Too Many Requests`: レート制限に達した

## 参考リンク

- [PageSpeed Insights API ドキュメント](https://developers.google.com/speed/docs/insights/v5/get-started)
- [Google Cloud Console](https://console.cloud.google.com/)
- [APIキーのベストプラクティス](https://cloud.google.com/docs/authentication/api-keys)