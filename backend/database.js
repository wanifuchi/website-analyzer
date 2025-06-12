const { Pool } = require('pg');

// PostgreSQL接続設定
const pool = new Pool(
  process.env.DATABASE_URL ? {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  } : {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'website_analyzer',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  }
);

// データベース初期化
async function initDatabase() {
  const client = await pool.connect();
  
  try {
    // 分析テーブル作成
    await client.query(`
      CREATE TABLE IF NOT EXISTS analyses (
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
      )
    `);

    // 分析結果詳細テーブル作成
    await client.query(`
      CREATE TABLE IF NOT EXISTS analysis_results (
        id SERIAL PRIMARY KEY,
        analysis_id VARCHAR(255) REFERENCES analyses(id) ON DELETE CASCADE,
        category VARCHAR(50) NOT NULL,
        score INTEGER NOT NULL,
        issues JSONB,
        details JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 優先順位付き改修提案テーブル作成
    await client.query(`
      CREATE TABLE IF NOT EXISTS prioritized_recommendations (
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
      )
    `);

    // インデックス作成
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_analyses_url ON analyses(url);
      CREATE INDEX IF NOT EXISTS idx_analyses_status ON analyses(status);
      CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_analysis_results_analysis_id ON analysis_results(analysis_id);
      CREATE INDEX IF NOT EXISTS idx_analysis_results_category ON analysis_results(category);
    `);

    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// 分析結果保存
async function saveAnalysis(analysisData) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // メイン分析データ挿入
    await client.query(`
      INSERT INTO analyses (
        id, url, status, started_at, completed_at, error_message, 
        overall_score, overall_grade
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO UPDATE SET
        status = $3,
        completed_at = $5,
        error_message = $6,
        overall_score = $7,
        overall_grade = $8,
        updated_at = CURRENT_TIMESTAMP
    `, [
      analysisData.id,
      analysisData.url,
      analysisData.status,
      analysisData.startedAt,
      analysisData.completedAt,
      analysisData.error,
      analysisData.results?.overall?.score,
      analysisData.results?.overall?.grade
    ]);

    // 分析結果詳細保存
    if (analysisData.results) {
      // 既存の結果削除
      await client.query('DELETE FROM analysis_results WHERE analysis_id = $1', [analysisData.id]);
      
      const categories = ['seo', 'performance', 'security', 'accessibility', 'mobile', 'contentQuality', 'advancedPerformance', 'advancedSecurity', 'businessMetrics'];
      
      for (const category of categories) {
        if (analysisData.results[category]) {
          await client.query(`
            INSERT INTO analysis_results (analysis_id, category, score, issues, details)
            VALUES ($1, $2, $3, $4, $5)
          `, [
            analysisData.id,
            category,
            analysisData.results[category].score,
            JSON.stringify(analysisData.results[category].issues || []),
            JSON.stringify(analysisData.results[category].details || {})
          ]);
        }
      }

      // 優先順位付き改修提案保存
      if (analysisData.results.prioritizedRecommendations) {
        const rec = analysisData.results.prioritizedRecommendations;
        
        await client.query(`
          INSERT INTO prioritized_recommendations (
            analysis_id, immediate_issues, short_term_issues, medium_term_issues,
            long_term_issues, roadmap, high_roi, category_priority, total_issues
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (analysis_id) DO UPDATE SET
            immediate_issues = $2,
            short_term_issues = $3,
            medium_term_issues = $4,
            long_term_issues = $5,
            roadmap = $6,
            high_roi = $7,
            category_priority = $8,
            total_issues = $9
        `, [
          analysisData.id,
          JSON.stringify(rec.immediate || []),
          JSON.stringify(rec.shortTerm || []),
          JSON.stringify(rec.mediumTerm || []),
          JSON.stringify(rec.longTerm || []),
          JSON.stringify(rec.roadmap || {}),
          JSON.stringify(rec.highROI || []),
          JSON.stringify(rec.categoryPriority || []),
          rec.totalIssues || 0
        ]);
      }
    }

    await client.query('COMMIT');
    console.log(`✅ Analysis ${analysisData.id} saved to database`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`❌ Failed to save analysis ${analysisData.id}:`, error);
    throw error;
  } finally {
    client.release();
  }
}

// 分析結果取得
async function getAnalysis(analysisId) {
  const client = await pool.connect();
  
  try {
    // メイン分析データ取得
    const analysisResult = await client.query(`
      SELECT * FROM analyses WHERE id = $1
    `, [analysisId]);

    if (analysisResult.rows.length === 0) {
      return null;
    }

    const analysis = analysisResult.rows[0];

    // 分析結果詳細取得
    const resultsQuery = await client.query(`
      SELECT category, score, issues, details 
      FROM analysis_results 
      WHERE analysis_id = $1
    `, [analysisId]);

    const results = {
      overall: {
        score: analysis.overall_score,
        grade: analysis.overall_grade
      }
    };

    resultsQuery.rows.forEach(row => {
      results[row.category] = {
        score: row.score,
        issues: row.issues,
        details: row.details
      };
    });

    // 優先順位付き改修提案取得
    const recommendationsQuery = await client.query(`
      SELECT * FROM prioritized_recommendations WHERE analysis_id = $1
    `, [analysisId]);

    if (recommendationsQuery.rows.length > 0) {
      const rec = recommendationsQuery.rows[0];
      results.prioritizedRecommendations = {
        immediate: rec.immediate_issues,
        shortTerm: rec.short_term_issues,
        mediumTerm: rec.medium_term_issues,
        longTerm: rec.long_term_issues,
        roadmap: rec.roadmap,
        highROI: rec.high_roi,
        categoryPriority: rec.category_priority,
        totalIssues: rec.total_issues
      };
    }

    return {
      id: analysis.id,
      url: analysis.url,
      status: analysis.status,
      startedAt: analysis.started_at,
      completedAt: analysis.completed_at,
      error: analysis.error_message,
      results: results
    };

  } catch (error) {
    console.error(`❌ Failed to get analysis ${analysisId}:`, error);
    throw error;
  } finally {
    client.release();
  }
}

// 分析履歴取得
async function getAnalysisHistory(limit = 50, offset = 0, url = null) {
  const client = await pool.connect();
  
  try {
    let query = `
      SELECT 
        id, url, status, started_at, completed_at, 
        overall_score, overall_grade, error_message
      FROM analyses 
    `;
    
    const params = [];
    
    if (url) {
      query += ` WHERE url ILIKE $1`;
      params.push(`%${url}%`);
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await client.query(query, params);
    
    // 総数取得
    let countQuery = 'SELECT COUNT(*) FROM analyses';
    const countParams = [];
    
    if (url) {
      countQuery += ' WHERE url ILIKE $1';
      countParams.push(`%${url}%`);
    }
    
    const countResult = await client.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    return {
      analyses: result.rows.map(row => ({
        id: row.id,
        url: row.url,
        status: row.status,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        overallScore: row.overall_score,
        overallGrade: row.overall_grade,
        error: row.error_message
      })),
      total: total,
      limit: limit,
      offset: offset
    };

  } catch (error) {
    console.error('❌ Failed to get analysis history:', error);
    throw error;
  } finally {
    client.release();
  }
}

// URL別統計取得
async function getUrlStats(url) {
  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      SELECT 
        COUNT(*) as total_analyses,
        AVG(overall_score) as avg_score,
        MAX(overall_score) as max_score,
        MIN(overall_score) as min_score,
        MAX(completed_at) as last_analysis
      FROM analyses 
      WHERE url = $1 AND status = 'completed' AND overall_score IS NOT NULL
    `, [url]);

    const stats = result.rows[0];
    
    // スコア履歴取得（最新20件）
    const historyResult = await client.query(`
      SELECT overall_score, completed_at
      FROM analyses 
      WHERE url = $1 AND status = 'completed' AND overall_score IS NOT NULL
      ORDER BY completed_at DESC
      LIMIT 20
    `, [url]);

    return {
      totalAnalyses: parseInt(stats.total_analyses) || 0,
      averageScore: stats.avg_score ? Math.round(parseFloat(stats.avg_score)) : null,
      maxScore: stats.max_score || null,
      minScore: stats.min_score || null,
      lastAnalysis: stats.last_analysis,
      scoreHistory: historyResult.rows.map(row => ({
        score: row.overall_score,
        date: row.completed_at
      }))
    };

  } catch (error) {
    console.error(`❌ Failed to get URL stats for ${url}:`, error);
    throw error;
  } finally {
    client.release();
  }
}

// データベース接続テスト
async function testConnection() {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

// データベース終了
async function closeDatabase() {
  await pool.end();
  console.log('📊 Database connections closed');
}

module.exports = {
  pool,
  initDatabase,
  saveAnalysis,
  getAnalysis,
  getAnalysisHistory,
  getUrlStats,
  testConnection,
  closeDatabase
};