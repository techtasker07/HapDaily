import { NextResponse } from "next/server"

export async function GET() {
  try {
    const API_TOKEN = process.env.FOOTBALL_DATA_TOKEN
    
    if (!API_TOKEN) {
      return NextResponse.json({
        success: false,
        error: "No API token found"
      })
    }
    
    const today = new Date().toISOString().split('T')[0]
    const url = `https://api.football-data.org/v4/matches?dateFrom=${today}&dateTo=${today}`
    
    console.log("Fetching from:", url)
    console.log("Using token:", API_TOKEN.substring(0, 8) + '...')
    
    const response = await fetch(url, {
      headers: {
        'X-Auth-Token': API_TOKEN,
        'Content-Type': 'application/json'
      }
    })
    
    console.log("Response status:", response.status)
    
    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({
        success: false,
        error: `API Error: ${response.status}`,
        details: errorText
      })
    }
    
    const data = await response.json()
    
    // Format for our dashboard
    const fixtures = data.matches.map((match: any) => ({
      id: match.id.toString(),
      homeTeam: match.homeTeam.name,
      awayTeam: match.awayTeam.name,
      league: match.competition.name,
      kickoffTime: match.utcDate,
      status: match.status,
      hasOdds: false // We'll set this to false for now
    }))
    
    return NextResponse.json({
      success: true,
      fixtures,
      picks: [], // Empty picks for now
      stats: {
        totalPicks: 0,
        totalFixtures: fixtures.length,
        qualifyingFixtures: 0,
        averageProbability: 0
      },
      apiStatus: {
        footballData: { success: true, error: null, count: fixtures.length },
        oddsApi: { success: false, error: "Not tested", count: 0 }
      },
      lastUpdated: new Date().toISOString()
    })
    
  } catch (error) {
    console.error("Raw fixtures error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to fetch raw fixtures",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
