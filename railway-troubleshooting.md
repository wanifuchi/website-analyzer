# Railway PostgreSQL接続トラブルシューティング

## 問題
RailwayでPostgreSQLサービスを追加したが、バックエンドがデータベースに接続できない。
`DATABASE_URL=${{Postgres.DATABASE_URL}}`が正しく解決されていない。

## 解決方法

### 方法1: PostgreSQLサービス名の確認
1. Railwayダッシュボードで**PostgreSQLサービス**をクリック
2. サービス名が「Postgres」であることを確認（大文字小文字も重要）
3. もし異なる場合は、`${{実際のサービス名.DATABASE_URL}}`に変更

### 方法2: PostgreSQLの接続情報を確認
1. **PostgreSQLサービス**をクリック
2. **Variables**タブを開く
3. 以下の変数の値を確認：
   - `DATABASE_URL` または `POSTGRES_URL`
   - `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`
4. **バックエンドサービス**の**Variables**タブで：
   - `DATABASE_URL`にPostgreSQLサービスのDATABASE_URL値を直接コピー

**または、Data タブがある場合：**
1. **PostgreSQLサービス**をクリック
2. **Data**タブまたは**Settings**タブを確認
3. 接続情報（Host, Port, Database, User, Password）を確認
4. 以下の形式で接続文字列を作成：
   `postgresql://[user]:[password]@[host]:[port]/[database]`

### 方法3: 個別の環境変数を設定
PostgreSQLサービスの**Variables**タブから以下の値をコピーして、バックエンドサービスに設定：

```
PGHOST=${{Postgres.PGHOST}}
PGPORT=${{Postgres.PGPORT}}
PGUSER=${{Postgres.PGUSER}}
PGPASSWORD=${{Postgres.PGPASSWORD}}
PGDATABASE=${{Postgres.PGDATABASE}}
```

または直接値をコピー：
```
PGHOST=xxx.railway.app
PGPORT=xxxx
PGUSER=postgres
PGPASSWORD=xxxxx
PGDATABASE=railway
```

### 方法4: サービス間の接続を確認
1. プロジェクトダッシュボードで両サービスが同じ環境にあることを確認
2. PostgreSQLサービスが「Available」ステータスであることを確認
3. バックエンドサービスを再デプロイ

## 確認手順

1. **PostgreSQLサービス**の**Logs**タブで起動を確認
2. **バックエンドサービス**の**Logs**タブでデータベース接続エラーを確認
3. 接続成功時は「✅ Database connection successful」と表示される

## よくある原因

- サービス名の大文字小文字が一致していない
- PostgreSQLサービスがまだ起動していない
- 環境変数の参照構文が間違っている
- ネットワーク設定の問題

## 推奨される解決方法

**最も確実な方法は「方法2: 直接接続文字列を使用」です。**

1. PostgreSQLサービス → Connect → Connection Stringをコピー
2. バックエンドサービス → Variables → DATABASE_URLに直接貼り付け
3. 再デプロイ