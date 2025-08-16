import { NextResponse } from "next/server"
import { query } from "@/lib/db"
import { generateDailyPredictions, validatePredictionData } from "@/lib/prediction-engine"

// This is called by Vercel Cron Jobs
export async function GET() {
  try {
    console.log("Starting daily picks refresh...")

    const today = new Date().toISOString().split("T")[0]

    // Step 1: Generate predictions using real APIs
    console.log("Generating predictions...")
    const predictionResult = await generateDailyPredictions()

    console.log("Prediction results:", {
      totalFixtures: predictionResult.stats.totalFixtures,
      fixturesWithOdds: predictionResult.stats.fixturesWithOdds,
      qualifyingFixtures: predictionResult.stats.qualifyingFixtures,
      selectedPicks: predictionResult.stats.selectedPicks
    })

    // Step 2: Clear today's existing data
    console.log("Clearing existing data for today...")
    await query("DELETE FROM daily_picks WHERE pick_date = $1", [today])
    await query("DELETE FROM fixtures WHERE DATE(kickoff_time) = $1", [today])

    // Step 3: Store all processed fixtures
    console.log(`Storing ${predictionResult.fixtures.length} fixtures...`)
    for (const fixture of predictionResult.fixtures) {
      if (!validatePredictionData(fixture)) {
        console.warn(`Skipping invalid fixture: ${fixture.homeTeam} vs ${fixture.awayTeam}`)
        continue
      }

      await query(`
        INSERT INTO fixtures (
          external_id, home_team, away_team, league, kickoff_time,
          home_odds, draw_odds, away_odds, home_probability,
          standings_gap, home_form, away_form
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (external_id) DO UPDATE SET
          home_odds = EXCLUDED.home_odds,
          draw_odds = EXCLUDED.draw_odds,
          away_odds = EXCLUDED.away_odds,
          home_probability = EXCLUDED.home_probability,
          standings_gap = EXCLUDED.standings_gap,
          home_form = EXCLUDED.home_form,
          away_form = EXCLUDED.away_form,
          updated_at = NOW()
      `, [
        fixture.externalId,
        fixture.homeTeam,
        fixture.awayTeam,
        fixture.league,
        fixture.kickoffTime,
        fixture.homeOdds,
        fixture.drawOdds,
        fixture.awayOdds,
        fixture.homeProbability,
        fixture.standingsGap,
        fixture.homeForm,
        fixture.awayForm
      ])
    }

    // Step 4: Store selected picks
    console.log(`Storing ${predictionResult.selectedPicks.length} daily picks...`)
    for (let i = 0; i < predictionResult.selectedPicks.length; i++) {
      const pick = predictionResult.selectedPicks[i]

      // Get the fixture ID from database
      const fixtureResult = await query(
        "SELECT id FROM fixtures WHERE external_id = $1",
        [pick.externalId]
      )

      if (fixtureResult.length === 0) {
        console.warn(`Fixture not found for pick: ${pick.homeTeam} vs ${pick.awayTeam}`)
        continue
      }

      await query(`
        INSERT INTO daily_picks (fixture_id, pick_date, confidence_level, rank_order)
        VALUES ($1, $2, $3, $4)
      `, [
        fixtureResult[0].id,
        today,
        pick.confidence,
        i + 1
      ])
    }

    const response = {
      success: true,
      message: "Picks refreshed successfully",
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

    console.log("Daily picks refresh completed successfully:", response.stats)
    return NextResponse.json(response)

  } catch (error) {
    console.error("Error refreshing picks:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to refresh picks",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
