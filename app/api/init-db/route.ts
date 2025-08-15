import { NextResponse } from "next/server"
import { query } from "@/lib/db"

const createTablesSQL = `
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
    confidence_level VARCHAR(20) NOT NULL CHECK (confidence_level IN ('High', 'Very High', 'Extreme')),
    rank_order INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Team standings table for analysis
  CREATE TABLE IF NOT EXISTS team_standings (
    id SERIAL PRIMARY KEY,
    team_name VARCHAR(255) NOT NULL,
    league VARCHAR(255) NOT NULL,
    position INTEGER NOT NULL,
    points INTEGER NOT NULL,
    games_played INTEGER NOT NULL,
    wins INTEGER NOT NULL,
    draws INTEGER NOT NULL,
    losses INTEGER NOT NULL,
    goals_for INTEGER NOT NULL,
    goals_against INTEGER NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Create indexes for better performance
  CREATE INDEX IF NOT EXISTS idx_fixtures_kickoff_time ON fixtures(kickoff_time);
  CREATE INDEX IF NOT EXISTS idx_fixtures_probability ON fixtures(home_probability DESC);
  CREATE INDEX IF NOT EXISTS idx_daily_picks_date ON daily_picks(pick_date);
  CREATE INDEX IF NOT EXISTS idx_daily_picks_rank ON daily_picks(rank_order);
  CREATE INDEX IF NOT EXISTS idx_team_standings_league ON team_standings(league);
  CREATE INDEX IF NOT EXISTS idx_fixtures_teams ON fixtures(home_team, away_team);

  -- Create a unique constraint for daily picks to prevent duplicates
  CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_picks_unique ON daily_picks(fixture_id, pick_date);

  -- Create a unique constraint for team standings per league
  CREATE UNIQUE INDEX IF NOT EXISTS idx_team_standings_unique ON team_standings(team_name, league);
`

export async function POST() {
  try {
    console.log('Initializing database schema...')
    
    // Execute the schema creation
    await query(createTablesSQL)
    
    console.log('Database schema initialized successfully')
    
    return NextResponse.json({
      success: true,
      message: "Database schema initialized successfully",
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Error initializing database:', error)
    return NextResponse.json({ 
      success: false, 
      error: "Failed to initialize database",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    // Check database connection and table status
    const tablesCheck = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('fixtures', 'daily_picks', 'team_standings')
      ORDER BY table_name
    `)
    
    const existingTables = tablesCheck.map((row: any) => row.table_name)
    const expectedTables = ['daily_picks', 'fixtures', 'team_standings']
    const missingTables = expectedTables.filter(table => !existingTables.includes(table))
    
    // Get some basic stats
    let stats = {}
    if (existingTables.length > 0) {
      try {
        const fixtureCount = await query('SELECT COUNT(*) as count FROM fixtures')
        const picksCount = await query('SELECT COUNT(*) as count FROM daily_picks')
        const standingsCount = await query('SELECT COUNT(*) as count FROM team_standings')
        
        stats = {
          fixtures: parseInt(fixtureCount[0]?.count || '0'),
          daily_picks: parseInt(picksCount[0]?.count || '0'),
          team_standings: parseInt(standingsCount[0]?.count || '0')
        }
      } catch (error) {
        console.log('Could not fetch stats:', error)
      }
    }
    
    return NextResponse.json({
      success: true,
      database_status: {
        existing_tables: existingTables,
        missing_tables: missingTables,
        is_initialized: missingTables.length === 0,
        stats
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Error checking database status:', error)
    return NextResponse.json({ 
      success: false, 
      error: "Failed to check database status",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
