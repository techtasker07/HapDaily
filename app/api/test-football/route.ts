import { NextResponse } from "next/server"

const FOOTBALL_DATA_BASE_URL = 'https://api.football-data.org/v4'
const API_TOKEN = process.env.FOOTBALL_DATA_TOKEN

export async function GET() {
  try {
    console.log("Testing Football Data API...")
    
    if (!API_TOKEN) {
      return NextResponse.json({
        success: false,
        error: "FOOTBALL_DATA_TOKEN not set"
      })
    }
    
    const headers = {
      'X-Auth-Token': API_TOKEN,
      'Content-Type': 'application/json'
    }
    
    // Test 1: Get today's matches
    const today = new Date().toISOString().split('T')[0]
    const matchesUrl = `${FOOTBALL_DATA_BASE_URL}/matches?dateFrom=${today}&dateTo=${today}`
    
    console.log(`Fetching matches from: ${matchesUrl}`)
    console.log(`Using API token: ${API_TOKEN.substring(0, 8)}...`)
    
    const matchesResponse = await fetch(matchesUrl, { headers })
    
    if (!matchesResponse.ok) {
      const errorText = await matchesResponse.text()
      return NextResponse.json({
        success: false,
        error: `Matches API error: ${matchesResponse.status}`,
        details: errorText
      })
    }
    
    const matchesData = await matchesResponse.json()
    
    // Test 2: Get available competitions
    const competitionsUrl = `${FOOTBALL_DATA_BASE_URL}/competitions`
    const competitionsResponse = await fetch(competitionsUrl, { headers })
    
    let competitions = []
    if (competitionsResponse.ok) {
      const competitionsData = await competitionsResponse.json()
      competitions = competitionsData.competitions.slice(0, 10) // First 10 for brevity
    }
    
    // Test the filtering logic
    const { getTodaysFixtures } = await import("@/lib/football-data")
    let filteredFixtures = []
    try {
      filteredFixtures = await getTodaysFixtures()
    } catch (error) {
      console.error("Error in getTodaysFixtures:", error)
    }

    return NextResponse.json({
      success: true,
      api_token_set: !!API_TOKEN,
      api_token_preview: API_TOKEN ? API_TOKEN.substring(0, 8) + '...' : 'NOT SET',
      today: today,
      raw_matches: {
        total_count: matchesData.matches.length,
        sample_matches: matchesData.matches.slice(0, 5).map((match: any) => ({
          id: match.id,
          home_team: match.homeTeam.name,
          away_team: match.awayTeam.name,
          competition: match.competition.name,
          competition_code: match.competition.code,
          status: match.status,
          utc_date: match.utcDate
        })),
        all_competitions: [...new Set(matchesData.matches.map((match: any) => match.competition.code))],
        all_statuses: [...new Set(matchesData.matches.map((match: any) => match.status))]
      },
      filtered_fixtures: {
        count: filteredFixtures.length,
        fixtures: filteredFixtures.slice(0, 5).map((fixture: any) => ({
          id: fixture.id,
          home_team: fixture.homeTeam.name,
          away_team: fixture.awayTeam.name,
          competition: fixture.competition.name,
          competition_code: fixture.competition.code,
          status: fixture.status
        }))
      },
      available_competitions: competitions.map((comp: any) => ({
        id: comp.id,
        name: comp.name,
        code: comp.code,
        area: comp.area.name
      })),
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error("Error testing Football Data API:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to test Football Data API",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
