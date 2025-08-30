import { NextResponse } from "next/server"
import { 
  getTodaysFixtures, 
  getLeagueOneFixtures, 
  getOddsForFixture, 
  getBestOddsForFixture
} from "@/lib/api-football"

// Endpoint to test the API Football integration
export async function GET() {
  try {
    console.log("Testing API Football Integration...")
    
    // Check if API key is set
    const apiKey = process.env.API_FOOTBALL_KEY
    console.log(`API Football Key Status: ${apiKey ? 'SET' : 'NOT SET'}`)
    
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: "API_FOOTBALL_KEY not set in environment variables",
      }, { status: 400 })
    }
    
    // Step 1: Test connection by getting fixtures for today
    console.log("Step 1: Fetching fixtures for today...")
    const allFixtures = await getTodaysFixtures()
    
    // Step 2: Get League One fixtures specifically
    console.log("Step 2: Fetching League One fixtures...")
    const leagueOneFixtures = await getLeagueOneFixtures()
    
    // Step 3: Get odds for a sample fixture if available
    console.log("Step 3: Fetching odds for a sample fixture...")
    let sampleFixtureWithOdds = null
    
    if (leagueOneFixtures.length > 0) {
      const sampleFixture = leagueOneFixtures[0]
      console.log(`Sample fixture: ${sampleFixture.teams.home.name} vs ${sampleFixture.teams.away.name}`)
      
      const fixtureId = sampleFixture.fixture.id
      const odds = await getOddsForFixture(fixtureId)
      
      if (odds && odds.length > 0) {
        const normalizedOdds = getBestOddsForFixture(odds)
        
        sampleFixtureWithOdds = {
          fixture: {
            id: sampleFixture.fixture.id,
            date: sampleFixture.fixture.date,
            homeTeam: sampleFixture.teams.home.name,
            awayTeam: sampleFixture.teams.away.name,
            league: sampleFixture.league.name
          },
          odds: normalizedOdds
        }
      }
    }
    
    // Return the results
    return NextResponse.json({
      success: true,
      message: "API Football Integration Test Completed",
      results: {
        allFixturesCount: allFixtures.length,
        leagueOneFixturesCount: leagueOneFixtures.length,
        leagueOneFixtures: leagueOneFixtures.map(fixture => ({
          id: fixture.fixture.id,
          date: fixture.fixture.date,
          homeTeam: fixture.teams.home.name,
          awayTeam: fixture.teams.away.name,
          league: fixture.league.name
        })),
        sampleFixtureWithOdds
      }
    })
    
  } catch (error) {
    console.error("Error testing API Football integration:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to test API Football integration",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}