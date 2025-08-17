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
    
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    console.log("Fetching matches for date range:", { today, tomorrow })

    // Use wider date range to catch matches that might be scheduled for tomorrow
    const url = `https://api.football-data.org/v4/matches?dateFrom=${today}&dateTo=${tomorrow}`
    
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

    console.log("Raw API returned:", {
      totalMatches: data.matches?.length || 0,
      statuses: [...new Set(data.matches?.map((m: any) => m.status) || [])],
      competitions: [...new Set(data.matches?.map((m: any) => m.competition.code) || [])],
      competitionCount: [...new Set(data.matches?.map((m: any) => m.competition.code) || [])].length
    })

    // Filter out finished matches (keep ALL competitions since you have access to 183!)
    const upcomingMatches = data.matches.filter((match: any) =>
      match.status === 'SCHEDULED' || match.status === 'TIMED'
    )

    console.log(`Filtered to ${upcomingMatches.length} upcoming matches from ${[...new Set(upcomingMatches.map((m: any) => m.competition.code))].length} competitions`)

    // Sort by kickoff time
    upcomingMatches.sort((a: any, b: any) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime())

    const fixtures = upcomingMatches.map((match: any) => ({
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
