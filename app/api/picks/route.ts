import { NextResponse } from "next/server"
import { query } from "@/lib/db"

export interface Pick {
  id: string
  homeTeam: string
  awayTeam: string
  league: string
  kickoffTime: string
  homeProbability: number
  awayProbability: number
  predictedOutcome: 'HOME' | 'AWAY'
  winProbability: number
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

    // Check if database is available
    if (!process.env.DB_EXTERNAL_URL) {
      console.log("No database configured, fetching fresh data from APIs...")
      // Call refresh endpoint to get fresh data
      const { generateDailyPredictions } = await import("@/lib/prediction-engine")
      const predictionResult = await generateDailyPredictions()

      const formattedPicks: Pick[] = predictionResult.selectedPicks.map((pick, index) => ({
        id: pick.externalId,
        homeTeam: pick.homeTeam,
        awayTeam: pick.awayTeam,
        league: pick.league,
        kickoffTime: pick.kickoffTime,
        homeProbability: pick.homeProbability,
        awayProbability: pick.awayProbability,
        predictedOutcome: pick.predictedOutcome,
        winProbability: pick.winProbability,
        homeOdds: pick.homeOdds,
        awayOdds: pick.awayOdds,
        drawOdds: pick.drawOdds,
        standingsGap: pick.standingsGap,
        homeForm: pick.homeForm,
        awayForm: pick.awayForm,
        confidence: pick.confidence
      }))

      return NextResponse.json({
        success: true,
        picks: formattedPicks,
        stats: {
          totalPicks: formattedPicks.length,
          totalFixtures: predictionResult.stats.totalFixtures,
          qualifyingFixtures: predictionResult.stats.qualifyingFixtures,
          averageProbability: formattedPicks.length > 0
            ? formattedPicks.reduce((sum, pick) => sum + pick.winProbability, 0) / formattedPicks.length
            : 0
        },
        lastUpdated: new Date().toISOString()
      })
    }

    // Try to get today's picks from database
    let picks = []
    try {
      picks = await query(`
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
    } catch (dbError) {
      console.log("Database error, falling back to API:", dbError)
      // Fallback to API if database fails
      const { generateDailyPredictions } = await import("@/lib/prediction-engine")
      const predictionResult = await generateDailyPredictions()

      const formattedPicks: Pick[] = predictionResult.selectedPicks.map((pick, index) => ({
        id: pick.externalId,
        homeTeam: pick.homeTeam,
        awayTeam: pick.awayTeam,
        league: pick.league,
        kickoffTime: pick.kickoffTime,
        homeProbability: pick.homeProbability,
        awayProbability: pick.awayProbability,
        predictedOutcome: pick.predictedOutcome,
        winProbability: pick.winProbability,
        homeOdds: pick.homeOdds,
        awayOdds: pick.awayOdds,
        drawOdds: pick.drawOdds,
        standingsGap: pick.standingsGap,
        homeForm: pick.homeForm,
        awayForm: pick.awayForm,
        confidence: pick.confidence
      }))

      return NextResponse.json({
        success: true,
        picks: formattedPicks,
        stats: {
          totalPicks: formattedPicks.length,
          totalFixtures: predictionResult.stats.totalFixtures,
          qualifyingFixtures: predictionResult.stats.qualifyingFixtures,
          averageProbability: formattedPicks.length > 0
            ? formattedPicks.reduce((sum, pick) => sum + pick.winProbability, 0) / formattedPicks.length
            : 0
        },
        lastUpdated: new Date().toISOString(),
        source: "api_fallback"
      })
    }

    // If no picks in database, fetch fresh data
    if (picks.length === 0) {
      console.log("No picks found in database, fetching fresh data...")
      const { generateDailyPredictions } = await import("@/lib/prediction-engine")
      const predictionResult = await generateDailyPredictions()

      const formattedPicks: Pick[] = predictionResult.selectedPicks.map((pick, index) => ({
        id: pick.externalId,
        homeTeam: pick.homeTeam,
        awayTeam: pick.awayTeam,
        league: pick.league,
        kickoffTime: pick.kickoffTime,
        homeProbability: pick.homeProbability,
        awayProbability: pick.awayProbability,
        predictedOutcome: pick.predictedOutcome,
        winProbability: pick.winProbability,
        homeOdds: pick.homeOdds,
        awayOdds: pick.awayOdds,
        drawOdds: pick.drawOdds,
        standingsGap: pick.standingsGap,
        homeForm: pick.homeForm,
        awayForm: pick.awayForm,
        confidence: pick.confidence
      }))

      return NextResponse.json({
        success: true,
        picks: formattedPicks,
        stats: {
          totalPicks: formattedPicks.length,
          totalFixtures: predictionResult.stats.totalFixtures,
          qualifyingFixtures: predictionResult.stats.qualifyingFixtures,
          averageProbability: formattedPicks.length > 0
            ? formattedPicks.reduce((sum, pick) => sum + pick.winProbability, 0) / formattedPicks.length
            : 0
        },
        lastUpdated: new Date().toISOString(),
        source: "fresh_api"
      })
    }

    // Transform to frontend format
    const formattedPicks: Pick[] = picks.map((pick: any) => {
      const homeProbability = parseFloat(pick.home_probability)
      const awayProbability = parseFloat(pick.away_probability) || (1 - homeProbability - 0.25) // Estimate if missing
      const winProbability = Math.max(homeProbability, awayProbability)
      const predictedOutcome = homeProbability >= awayProbability ? 'HOME' : 'AWAY'

      return {
        id: pick.external_id,
        homeTeam: pick.home_team,
        awayTeam: pick.away_team,
        league: pick.league,
        kickoffTime: pick.kickoff_time,
        homeProbability,
        awayProbability,
        predictedOutcome: predictedOutcome as 'HOME' | 'AWAY',
        winProbability,
        homeOdds: parseFloat(pick.home_odds),
        awayOdds: parseFloat(pick.away_odds),
        drawOdds: parseFloat(pick.draw_odds),
        standingsGap: parseInt(pick.standings_gap) || 0,
        homeForm: pick.home_form || 'NNNNN',
        awayForm: pick.away_form || 'NNNNN',
        confidence: pick.confidence_level as "High" | "Very High" | "Extreme"
      }
    })

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
        averageProbability: formattedPicks.length > 0
          ? formattedPicks.reduce((sum, pick) => sum + pick.winProbability, 0) / formattedPicks.length
          : 0
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
    console.log("Manual refresh triggered via POST")

    // Instead of calling the refresh endpoint via HTTP, call the function directly
    const { generateDailyPredictions } = await import("@/lib/prediction-engine")
    const predictionResult = await generateDailyPredictions()

    // Format the response similar to the refresh endpoint
    const response = {
      success: true,
      message: "Refresh completed successfully",
      timestamp: new Date().toISOString(),
      stats: predictionResult.stats,
      picks: predictionResult.selectedPicks.map(pick => ({
        homeTeam: pick.homeTeam,
        awayTeam: pick.awayTeam,
        league: pick.league,
        probability: Math.round(pick.homeProbability * 100),
        confidence: pick.confidence
      }))
    }

    console.log("Manual refresh completed:", response.stats)
    return NextResponse.json(response)

  } catch (error) {
    console.error("Error in manual refresh:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to refresh picks",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
