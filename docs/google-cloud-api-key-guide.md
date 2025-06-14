# Google Cloud Console APIキー管理ガイド

## 1. Google Cloud Consoleにアクセス

1. https://console.cloud.google.com/ にアクセス
2. Googleアカウントでログイン

## 2. APIキーを確認・無効化する手順

### ステップ1: プロジェクトを選択
- 画面上部のプロジェクト選択ドロップダウンをクリック
- 使用しているプロジェクトを選択（または「プロジェクトを作成」）

### ステップ2: APIキーの管理画面へ
以下のいずれかの方法でアクセス：

**方法A: 左側メニューから**
1. 左側のハンバーガーメニュー（☰）をクリック
2. 「APIとサービス」をクリック
3. 「認証情報」をクリック

**方法B: 検索から**
1. 上部の検索バーに「認証情報」または「credentials」と入力
2. 「APIとサービス > 認証情報」を選択

### ステップ3: 既存のAPIキーを確認
- 「認証情報」ページに既存のAPIキーが一覧表示されます
- 露出したAPIキー（末尾が`...zUk`のもの）を探します

### ステップ4: APIキーを無効化/削除
1. 該当のAPIキーをクリック
2. 以下のいずれかを実行：
   - **無効化**: 「APIキーを無効にする」ボタンをクリック
   - **削除**: ゴミ箱アイコンをクリック → 「削除」を確認

## 3. 新しいAPIキーを作成する手順

### ステップ1: 新規作成
1. 「認証情報」ページで「+ 認証情報を作成」をクリック
2. 「APIキー」を選択

### ステップ2: APIキーの制限を設定（重要！）
1. 作成されたAPIキーの「APIキーを制限」をクリック
2. 以下の設定を行う：

**アプリケーションの制限**
- 「HTTPリファラー（ウェブサイト）」を選択
- 許可するリファラーを追加：
  ```
  https://website-analyzer-production-c933.up.railway.app/*
  https://website-analyzer-backend.up.railway.app/*
  ```

**API制限**
- 「キーを制限」を選択
- 「PageSpeed Insights API」のみを選択

### ステップ3: 保存
- 「保存」ボタンをクリック
- 新しいAPIキーをコピー

## 4. PageSpeed Insights APIを有効化する手順

APIキーを作成する前に、APIを有効化する必要があります：

1. 左メニューから「APIとサービス」→「ライブラリ」
2. 検索バーに「PageSpeed Insights」と入力
3. 「PageSpeed Insights API」をクリック
4. 「有効にする」ボタンをクリック

## 5. 直接リンク

便利な直接リンク：

- **認証情報ページ**: https://console.cloud.google.com/apis/credentials
- **APIライブラリ**: https://console.cloud.google.com/apis/library
- **PageSpeed Insights API**: https://console.cloud.google.com/apis/library/pagespeedonline.googleapis.com

## 6. トラブルシューティング

### プロジェクトが見つからない場合
- 右上のアカウントアイコンの横にあるプロジェクト選択から確認
- 必要に応じて新規プロジェクトを作成

### APIキーが表示されない場合
- 正しいプロジェクトを選択しているか確認
- 「すべての認証情報を表示」をクリック

### 料金について
- PageSpeed Insights APIは1日25,000リクエストまで無料
- それ以上は課金が発生するため、使用量をモニタリング