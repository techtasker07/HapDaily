import { NextResponse } from "next/server"
import { query } from "@/lib/db"
import { getTodaysFixtures } from "@/lib/football-data"

// Endpoint to fetch today's fixtures
export async function GET() {
  try {
    console.log("Fetching today's fixtures for odds management...")
    
    // Get fixtures from football-data API
    const fixtures = await getTodaysFixtures()
    
    console.log(`Found ${fixtures.length} fixtures from football-data API`)
    
    // Check if we have any existing odds in the database
    let fixturesWithOdds = []
    
    try {
      // Try to get fixtures from database first
      const today = new Date().toISOString().split("T")[0]
      const dbFixtures = await query(
        "SELECT id, external_id, home_team, away_team, league, kickoff_time, home_odds, draw_odds, away_odds FROM fixtures WHERE DATE(kickoff_time) = $1",
        [today]
      )
      
      console.log(`Found ${dbFixtures.length} fixtures in database`)
      
      if (dbFixtures.length > 0) {
        // If we have fixtures in the database, use those
        fixturesWithOdds = dbFixtures.map(fixture => ({
          id: fixture.id,
          externalId: fixture.external_id,
          homeTeam: fixture.home_team,
          awayTeam: fixture.away_team,
          league: fixture.league,
          kickoffTime: fixture.kickoff_time,
          homeOdds: fixture.home_odds,
          drawOdds: fixture.draw_odds,
          awayOdds: fixture.away_odds
        }))
      } else {
        // Otherwise, convert the football-data fixtures to our format
        // These won't have odds yet
        fixturesWithOdds = fixtures.map(fixture => ({
          id: 0, // This will be set when saved
          externalId: fixture.id.toString(),
          homeTeam: fixture.homeTeam.name,
          awayTeam: fixture.awayTeam.name,
          league: fixture.competition.name,
          kickoffTime: fixture.utcDate,
          homeOdds: null,
          drawOdds: null,
          awayOdds: null
        }))
      }
    } catch (dbError) {
      console.error("Database error:", dbError)
      // If database access fails, just use the fixtures from the API
      fixturesWithOdds = fixtures.map(fixture => ({
        id: 0,
        externalId: fixture.id.toString(),
        homeTeam: fixture.homeTeam.name,
        awayTeam: fixture.awayTeam.name,
        league: fixture.competition.name,
        kickoffTime: fixture.utcDate,
        homeOdds: null,
        drawOdds: null,
        awayOdds: null
      }))
    }
    
    // Sort by kickoff time
    fixturesWithOdds.sort((a, b) => 
      new Date(a.kickoffTime).getTime() - new Date(b.kickoffTime).getTime()
    )
    
    return NextResponse.json({
      success: true,
      fixtures: fixturesWithOdds
    })
    
  } catch (error) {
    console.error("Error fetching fixtures:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to fetch fixtures",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}