import { Pool, QueryResultRow } from "pg"

const connectionString = process.env.DB_EXTERNAL_URL || process.env.DATABASE_URL

console.log('Database connection info:', {
  hasDbExternalUrl: !!process.env.DB_EXTERNAL_URL,
  hasDatabaseUrl: !!process.env.DATABASE_URL,
  nodeEnv: process.env.NODE_ENV,
  connectionStringPrefix: connectionString ? connectionString.substring(0, 20) + '...' : 'NOT SET'
})

export const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
})

export async function query<T extends QueryResultRow = any>(sql: string, params: any[] = []) {
  const client = await pool.connect()
  try {
    const result = await client.query<T>(sql, params)
    return result.rows
  } finally {
    client.release()
  }
}

// Database schema for the application
export const createTablesSQL = `
  -- Fixtures table to store match data
  CREATE TABLE IF NOT EXISTS fixtures (
    id SERIAL PRIMARY KEY,
    external_id VARCHAR(255) UNIQUE NOT NULL,
    home_team VARCHAR(255) NOT NULL,
    away_team VARCHAR(255) NOT NULL,
    league VARCHAR(255) NOT NULL,
    kickoff_time TIMESTAMP WITH TIME ZONE NOT NULL,
    home_odds DECIMAL(5,2),
    draw_odds DECIMAL(5,2),
    away_odds DECIMAL(5,2),
    home_probability DECIMAL(5,4),
    standings_gap INTEGER,
    home_form VARCHAR(10),
    away_form VARCHAR(10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Daily picks table to store selected predictions
  CREATE TABLE IF NOT EXISTS daily_picks (
    id SERIAL PRIMARY KEY,
    fixture_id INTEGER REFERENCES fixtures(id),
    pick_date DATE NOT NULL,
    confidence_level VARCHAR(20) NOT NULL,
    rank_order INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Create indexes for better performance
  CREATE INDEX IF NOT EXISTS idx_fixtures_kickoff_time ON fixtures(kickoff_time);
  CREATE INDEX IF NOT EXISTS idx_daily_picks_date ON daily_picks(pick_date);
  CREATE INDEX IF NOT EXISTS idx_fixtures_probability ON fixtures(home_probability DESC);
`
