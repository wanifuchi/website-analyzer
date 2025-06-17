# Toneya Analysis V1

高機能ウェブサイト分析ツール - URLを入力することで、ウェブサイトのSEO、パフォーマンス、セキュリティ、アクセシビリティを総合的に分析します。

## 🚀 クイックスタート

### 1. 簡単起動（推奨）
```bash
./quick-start.sh
```

### 2. 手動起動
```bash
# バックエンド起動 (Port 3002)
cd backend
node server.js &

# フロントエンド起動 (Port 3000)
cd frontend
npm run dev &
```

### 3. アクセス
- **フロントエンド**: http://localhost:3000
- **バックエンドAPI**: http://localhost:3002
- **ヘルスチェック**: http://localhost:3002/api/health

### 4. 停止
```bash
./stop.sh
```

## 📋 現在利用可能な機能

### ✅ 実装済み
- **基本UI**: URL入力フォーム、ダッシュボード
- **API基盤**: Express.js、CORS対応、エラーハンドリング
- **リアルタイム接続状況表示**: サーバー接続ステータス
- **レスポンシブデザイン**: モバイル対応UI

### 🔧 簡易版での動作
- 基本的なURL分析開始機能
- モックデータでの動作確認
- 日本語完全対応UI

### 🚧 開発中（完全版で利用可能）
- **SEO分析**: メタタグ、見出し構造、キーワード密度
- **パフォーマンス測定**: Core Web Vitals、リソース分析
- **セキュリティ診断**: HTTPS、脆弱性チェック
- **アクセシビリティチェック**: WCAG 2.1準拠
- **モバイル対応度チェック**: レスポンシブ分析
- **技術スタック検出**: フレームワーク・ライブラリ検出
- **レポート生成**: PDF/CSV出力

## 🛠 技術スタック

### 簡易版
- **バックエンド**: Node.js, Express.js, CORS
- **フロントエンド**: React 18, TypeScript, Tailwind CSS, Vite

### 完全版（準備済み）
- **バックエンド**: PostgreSQL, Redis, Puppeteer, Bull Queue
- **フロントエンド**: Chart.js, React Query, React Router
- **レポート**: PDFKit, CSV-Writer

## 📁 プロジェクト構造

```
website-analyzer/
├── backend/
│   ├── server.js          # 簡易版サーバー
│   ├── src/               # 完全版ソース
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.simple.tsx # 簡易版アプリ
│   │   ├── pages/         # ページコンポーネント
│   │   └── i18n/ja.json  # 日本語リソース
│   └── package.json
├── quick-start.sh         # 簡単起動スクリプト
├── stop.sh               # 停止スクリプト
└── README.md
```

## 🔧 開発環境セットアップ

### 前提条件
- Node.js 18以上
- npm または yarn

### 依存関係のインストール
```bash
# バックエンド
cd backend && npm install

# フロントエンド  
cd frontend && npm install
```

### 🔑 API設定（高度な機能利用時）

より高度な分析機能を利用するには、以下のAPIキーの設定が必要です：

#### 1. **Google Gemini AI API**（必須 - 本番設定済み）
- **用途**: AI深層分析、改善提案生成
- **取得方法**:
  1. [Google AI Studio](https://makersuite.google.com/app/apikey)でAPIキー取得
  2. Gemini 2.0 Flash Experimental モデルを選択
- **設定**: `GEMINI_API_KEY`

#### 2. **Google PageSpeed Insights API**（必須 - 本番設定済み）
- **用途**: Core Web Vitals、パフォーマンス分析
- **取得方法**:
  1. [Google Cloud Console](https://console.cloud.google.com)でプロジェクト作成
  2. PageSpeed Insights API を有効化
  3. APIキーを作成
- **設定**: `GOOGLE_PAGESPEED_API_KEY`

#### 3. **Google Custom Search API**（本番設定済み）
- **用途**: 競合分析、SERP分析、実際の検索結果データ取得
- **取得方法**:
  1. Google Cloud Console で Custom Search API を有効化
  2. APIキーを作成
  3. [Programmable Search Engine](https://programmablesearchengine.google.com/)で検索エンジン作成
  4. 検索エンジンIDを取得
- **設定**:
  - `GOOGLE_API_KEY`
  - `GOOGLE_SEARCH_ENGINE_ID`

#### 4. **Google Search Console API**（オプション）
- **用途**: 実際の検索パフォーマンスデータ取得
- **現在の状況**: モックデータで代替動作中
- **取得方法**:
  1. Google Cloud Console で Search Console API を有効化
  2. サービスアカウントを作成
  3. JSONキーファイルをダウンロード
- **設定**: 
  - `GOOGLE_SERVICE_ACCOUNT_KEY` (JSON文字列)
  - または `GOOGLE_APPLICATION_CREDENTIALS` (ファイルパス)

### 環境変数の設定
```bash
# backend/.env ファイルを作成
cp backend/.env.example backend/.env

# 各APIキーを設定
vim backend/.env
```

### 🎯 現在の本番環境状況

**✅ 設定済みAPI（フル機能利用可能）:**
- **GEMINI_API_KEY**: AI深層分析・改善提案
- **GOOGLE_PAGESPEED_API_KEY**: Core Web Vitals実測値
- **GOOGLE_API_KEY**: 競合分析・SERP分析の実データ
- **GOOGLE_SEARCH_ENGINE_ID**: 検索結果データ取得

**⚠️ 未設定API（代替機能で動作）:**
- **Search Console API**: モックデータで検索パフォーマンス表示

### API未設定時の動作
APIキーが設定されていない場合でも、以下の機能は利用可能です：
- 基本的なサイト分析（HTML構造、メタタグ等）
- レスポンシブデザインチェック
- 基本的なSEO分析
- フォールバックデータによる分析表示

## 📊 使用方法

1. `./quick-start.sh` でツールを起動
2. ブラウザで http://localhost:3000 を開く
3. URLを入力して「分析開始」をクリック
4. 分析結果を確認（現在は開始確認のみ）

## 🔍 API エンドポイント

```
GET  /api/health                # ヘルスチェック
POST /api/analysis/start        # 分析開始
GET  /api/analysis/history      # 分析履歴
```

## 🌟 特徴

- **完全日本語対応**: UI、エラーメッセージ、全て日本語
- **モダンなUI/UX**: Tailwind CSSによる美しいインターフェース
- **レスポンシブ対応**: モバイル・タブレット・デスクトップ対応
- **リアルタイム状況表示**: サーバー接続状況をリアルタイム表示

## 📝 今後の拡張

完全版に移行する際は、以下のファイルを使用してください：
- `backend/src/index.ts` - 完全版バックエンド
- `frontend/src/App.tsx` - 完全版フロントエンド
- `docker-compose.yml` - データベース環境

## API仕様

### 分析開始
```
POST /api/analysis/start
Body: { "url": "https://example.com", "options": {...} }
```

### 分析結果取得
```
GET /api/analysis/:id
```

### 分析履歴
```
GET /api/analysis/history
```

## ライセンス

ISC