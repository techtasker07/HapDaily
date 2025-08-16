import { NextResponse } from "next/server"
import { query } from "@/lib/db"

export interface Pick {
  id: string
  homeTeam: string
  awayTeam: string
  league: string
  kickoffTime: string
  homeProbability: number
  homeOdds: number
  awayOdds: number
  drawOdds: number
  standingsGap: number
  homeForm: string
  awayForm: string
  confidence: "High" | "Very High" | "Extreme"
}

export async function GET() {
  try {
    const today = new Date().toISOString().split("T")[0]
    
    // Get today's picks with fixture details
    const picks = await query(`
      SELECT 
        f.id,
        f.external_id,
        f.home_team,
        f.away_team,
        f.league,
        f.kickoff_time,
        f.home_odds,
        f.draw_odds,
        f.away_odds,
        f.home_probability,
        f.standings_gap,
        f.home_form,
        f.away_form,
        dp.confidence_level,
        dp.rank_order
      FROM daily_picks dp
      JOIN fixtures f ON dp.fixture_id = f.id
      WHERE dp.pick_date = $1
      ORDER BY dp.rank_order ASC
    `, [today])

    // Transform to frontend format
    const formattedPicks: Pick[] = picks.map((pick: any) => ({
      id: pick.external_id,
      homeTeam: pick.home_team,
      awayTeam: pick.away_team,
      league: pick.league,
      kickoffTime: pick.kickoff_time,
      homeProbability: parseFloat(pick.home_probability),
      homeOdds: parseFloat(pick.home_odds),
      awayOdds: parseFloat(pick.away_odds),
      drawOdds: parseFloat(pick.draw_odds),
      standingsGap: parseInt(pick.standings_gap) || 0,
      homeForm: pick.home_form || 'NNNNN',
      awayForm: pick.away_form || 'NNNNN',
      confidence: pick.confidence_level as "High" | "Very High" | "Extreme"
    }))

    // Get additional stats
    const statsQuery = await query(`
      SELECT 
        COUNT(*) as total_fixtures,
        COUNT(CASE WHEN home_probability >= 0.80 THEN 1 END) as qualifying_fixtures,
        AVG(home_probability) as avg_probability
      FROM fixtures 
      WHERE DATE(kickoff_time) = $1
    `, [today])

    const stats = statsQuery[0] || { total_fixtures: 0, qualifying_fixtures: 0, avg_probability: 0 }

    return NextResponse.json({
      success: true,
      picks: formattedPicks,
      stats: {
        totalPicks: formattedPicks.length,
        totalFixtures: parseInt(stats.total_fixtures) || 0,
        qualifyingFixtures: parseInt(stats.qualifying_fixtures) || 0,
        averageProbability: parseFloat(stats.avg_probability) || 0
      },
      lastUpdated: new Date().toISOString()
    })

  } catch (error) {
    console.error("Error fetching picks:", error)
    return NextResponse.json({ 
      success: false, 
      error: "Failed to fetch picks",
      picks: [],
      stats: {
        totalPicks: 0,
        totalFixtures: 0,
        qualifyingFixtures: 0,
        averageProbability: 0
      }
    }, { status: 500 })
  }
}

// Optional: Allow manual refresh trigger
export async function POST() {
  try {
    // Build the correct URL for the refresh endpoint
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000'

    const refreshUrl = `${baseUrl}/api/refresh`
    console.log(`Triggering refresh at: ${refreshUrl}`)

    // Trigger a refresh by calling the refresh endpoint
    const refreshResponse = await fetch(refreshUrl, {
      method: 'GET'
    })

    if (!refreshResponse.ok) {
      const errorText = await refreshResponse.text()
      throw new Error(`Failed to trigger refresh: ${refreshResponse.status} ${errorText}`)
    }

    const refreshData = await refreshResponse.json()

    return NextResponse.json({
      success: true,
      message: "Refresh triggered successfully",
      refreshResult: refreshData
    })

  } catch (error) {
    console.error("Error triggering refresh:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to trigger refresh",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
