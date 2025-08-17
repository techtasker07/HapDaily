import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("=== DEBUGGING FIXTURES API ===")
    
    const API_TOKEN = process.env.FOOTBALL_DATA_TOKEN
    console.log("API Token:", API_TOKEN ? API_TOKEN.substring(0, 8) + '...' : 'NOT SET')
    
    if (!API_TOKEN) {
      return NextResponse.json({
        success: false,
        error: "FOOTBALL_DATA_TOKEN not set",
        step: "environment_check"
      })
    }
    
    // Step 1: Test direct API call
    const today = new Date().toISOString().split('T')[0]
    const url = `https://api.football-data.org/v4/matches?dateFrom=${today}&dateTo=${today}`
    
    console.log("Making direct API call to:", url)
    
    const headers = {
      'X-Auth-Token': API_TOKEN,
      'Content-Type': 'application/json'
    }
    
    const response = await fetch(url, { headers })
    console.log("Response status:", response.status)
    console.log("Response headers:", Object.fromEntries(response.headers.entries()))
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error("API Error Response:", errorText)
      return NextResponse.json({
        success: false,
        error: `API returned ${response.status}: ${response.statusText}`,
        details: errorText,
        step: "api_call"
      })
    }
    
    const data = await response.json()
    console.log("Raw API response structure:", {
      hasMatches: !!data.matches,
      matchCount: data.matches?.length || 0,
      hasFilters: !!data.filters,
      hasResultSet: !!data.resultSet
    })
    
    // Step 2: Test our filtering function
    let filteredFixtures = []
    try {
      const { getTodaysFixtures } = await import("@/lib/football-data")
      filteredFixtures = await getTodaysFixtures()
      console.log("Filtered fixtures count:", filteredFixtures.length)
    } catch (filterError) {
      console.error("Filter function error:", filterError)
      return NextResponse.json({
        success: false,
        error: "Filter function failed",
        details: filterError instanceof Error ? filterError.message : "Unknown error",
        step: "filtering",
        rawData: {
          matchCount: data.matches?.length || 0,
          sampleMatch: data.matches?.[0] || null
        }
      })
    }
    
    // Step 3: Return comprehensive debug info
    return NextResponse.json({
      success: true,
      debug_info: {
        api_token_set: !!API_TOKEN,
        today_date: today,
        api_url: url,
        response_status: response.status
      },
      raw_api_data: {
        total_matches: data.matches?.length || 0,
        competitions_found: [...new Set(data.matches?.map((m: any) => m.competition.code) || [])],
        statuses_found: [...new Set(data.matches?.map((m: any) => m.status) || [])],
        sample_matches: data.matches?.slice(0, 3).map((match: any) => ({
          id: match.id,
          home_team: match.homeTeam.name,
          away_team: match.awayTeam.name,
          competition_code: match.competition.code,
          competition_name: match.competition.name,
          status: match.status,
          utc_date: match.utcDate
        })) || []
      },
      filtered_data: {
        filtered_count: filteredFixtures.length,
        sample_filtered: filteredFixtures.slice(0, 3).map((fixture: any) => ({
          id: fixture.id,
          home_team: fixture.homeTeam.name,
          away_team: fixture.awayTeam.name,
          competition_code: fixture.competition.code,
          status: fixture.status
        }))
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error("Debug endpoint error:", error)
    return NextResponse.json({
      success: false,
      error: "Debug endpoint failed",
      details: error instanceof Error ? error.message : "Unknown error",
      step: "general_error"
    }, { status: 500 })
  }
}
