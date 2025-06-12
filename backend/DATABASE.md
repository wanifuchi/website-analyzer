# データベース統合 (PostgreSQL Data Persistence)

## 概要

Toneya Analysis V1は、分析データの永続化のためにPostgreSQLデータベースを統合しています。
データベースが利用できない場合は、自動的にメモリ内ストレージにフォールバックします。

## 機能

### データ保存
- 分析結果の完全な保存
- 分析メタデータ（ID、URL、ステータス、日時）
- カテゴリ別詳細結果（SEO、パフォーマンス、セキュリティなど）
- 優先順位付き改修提案

### データ取得
- 分析履歴の検索・フィルタリング
- URL別統計（平均スコア、最高・最低スコア、スコア履歴）
- ページネーション対応
- 日付範囲での絞り込み

## データベーススキーマ

### analyses テーブル
```sql
CREATE TABLE analyses (
  id VARCHAR(255) PRIMARY KEY,
  url TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'processing',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  overall_score INTEGER,
  overall_grade VARCHAR(10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### analysis_results テーブル
```sql
CREATE TABLE analysis_results (
  id SERIAL PRIMARY KEY,
  analysis_id VARCHAR(255) REFERENCES analyses(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL,
  score INTEGER NOT NULL,
  issues JSONB,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### prioritized_recommendations テーブル
```sql
CREATE TABLE prioritized_recommendations (
  id SERIAL PRIMARY KEY,
  analysis_id VARCHAR(255) REFERENCES analyses(id) ON DELETE CASCADE,
  immediate_issues JSONB,
  short_term_issues JSONB,
  medium_term_issues JSONB,
  long_term_issues JSONB,
  roadmap JSONB,
  high_roi JSONB,
  category_priority JSONB,
  total_issues INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## セットアップ

### 1. PostgreSQL インストール

#### macOS (Homebrew)
```bash
brew install postgresql
brew services start postgresql
```

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2. データベース作成
```bash
# PostgreSQLユーザーでログイン
sudo -u postgres psql

# データベースとユーザー作成
CREATE DATABASE website_analyzer;
CREATE USER postgres WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE website_analyzer TO postgres;
\q
```

### 3. 環境変数設定
`.env` ファイルを作成：
```bash
# データベース設定
DB_HOST=localhost
DB_PORT=5432
DB_NAME=website_analyzer
DB_USER=postgres
DB_PASSWORD=password

# サーバー設定
PORT=3002
NODE_ENV=development
```

### 4. サーバー起動
```bash
npm start
```

サーバー起動時にデータベース接続が自動的にテストされ、必要なテーブルが作成されます。

## API エンドポイント

### 新しいエンドポイント

#### URL統計取得
```
GET /api/analysis/stats/:url
```

レスポンス例：
```json
{
  "success": true,
  "data": {
    "totalAnalyses": 5,
    "averageScore": 78,
    "maxScore": 85,
    "minScore": 70,
    "lastAnalysis": "2024-01-15T10:30:00Z",
    "scoreHistory": [
      {"score": 85, "date": "2024-01-15T10:30:00Z"},
      {"score": 80, "date": "2024-01-14T15:20:00Z"}
    ]
  }
}
```

#### 分析履歴（拡張）
```
GET /api/analysis/history?page=1&limit=20&url=example.com
```

### ヘルスチェック（拡張）
```
GET /api/health
```

レスポンス例：
```json
{
  "success": true,
  "message": "Toneya Analysis V1 API is running",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.0.0",
  "database": {
    "connected": true,
    "type": "PostgreSQL"
  }
}
```

## フォールバック動作

PostgreSQLが利用できない場合、システムは自動的に以下の動作を行います：

1. **メモリ内ストレージを使用**: 分析データはサーバーのメモリに保存
2. **機能制限**: 一部の高度な機能（URL統計など）は制限される
3. **ログ出力**: `⚠️ Database connection failed, using in-memory storage`

## 監視とメンテナンス

### データベース接続監視
- サーバー起動時に接続テスト
- ヘルスチェックAPIでリアルタイム監視
- 接続失敗時の自動フォールバック

### データ保守
```sql
-- 古い分析データの削除（30日以上）
DELETE FROM analyses 
WHERE created_at < NOW() - INTERVAL '30 days';

-- インデックス再構築
REINDEX TABLE analyses;
REINDEX TABLE analysis_results;
```

### バックアップ
```bash
# データベースバックアップ
pg_dump website_analyzer > backup_$(date +%Y%m%d).sql

# リストア
psql website_analyzer < backup_20240115.sql
```

## パフォーマンス最適化

### インデックス
- `analyses(url)`: URL検索用
- `analyses(status)`: ステータス別検索用
- `analyses(created_at DESC)`: 日時順ソート用
- `analysis_results(analysis_id)`: 関連データ取得用

### 設定例
`.env` ファイルでデータベース接続プールを調整：
```bash
# database.jsで自動設定
# max: 20 (最大接続数)
# idleTimeoutMillis: 30000 (アイドルタイムアウト)
# connectionTimeoutMillis: 2000 (接続タイムアウト)
```

## トラブルシューティング

### よくある問題

1. **接続エラー**: PostgreSQLサービスが起動していない
   ```bash
   sudo systemctl start postgresql  # Linux
   brew services start postgresql   # macOS
   ```

2. **認証エラー**: ユーザー権限の問題
   ```sql
   GRANT ALL PRIVILEGES ON DATABASE website_analyzer TO postgres;
   ```

3. **ポート競合**: 5432番ポートが使用中
   ```bash
   # 使用中のプロセス確認
   lsof -i :5432
   ```

### ログ確認
```bash
# サーバーログ
tail -f logs/app.log

# PostgreSQLログ
tail -f /var/log/postgresql/postgresql-*.log
```

## セキュリティ

### 接続セキュリティ
- 本番環境では環境変数で認証情報を管理
- SSL/TLS接続の有効化推奨
- ファイアウォール設定でポート制限

### データセキュリティ
- 分析データにはPII（個人識別情報）は含まれていません
- URLとウェブサイト構造情報のみ保存
- 定期的なバックアップとデータ保持ポリシーの設定

---

このPostgreSQL統合により、Toneya Analysis V1はより堅牢なデータ管理と高度な分析履歴機能を提供します。