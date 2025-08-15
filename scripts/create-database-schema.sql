-- Create the database schema for HapDaily
-- This script sets up all necessary tables and indexes

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
