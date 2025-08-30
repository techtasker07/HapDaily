import { NextResponse } from "next/server"
import { query } from "@/lib/db"

// Endpoint to generate predictions from manually entered odds
export async function POST() {
  try {
    console.log("Generating predictions from manually entered odds...")
    
    const today = new Date().toISOString().split("T")[0]
    
    // 1. Get fixtures with manually entered odds
    const fixtures = await query(`
      SELECT 
        id, external_id, home_team, away_team, league, kickoff_time,
        home_odds, draw_odds, away_odds, home_probability,
        standings_gap, home_form, away_form
      FROM fixtures 
      WHERE 
        DATE(kickoff_time) = $1
        AND home_odds IS NOT NULL
        AND draw_odds IS NOT NULL
        AND away_odds IS NOT NULL
    `, [today])
    
    console.log(`Found ${fixtures.length} fixtures with complete odds data`)
    
    if (fixtures.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No fixtures found with complete odds data"
      }, { status: 404 })
    }
    
    // 2. Calculate probabilities if not already calculated
    const processedFixtures = fixtures.map(fixture => {
      // If home_probability is already calculated, use it
      if (fixture.home_probability) {
        return {
          ...fixture,
          homeProbability: parseFloat(fixture.home_probability)
        }
      }
      
      // Otherwise calculate it
      if (fixture.home_odds && fixture.draw_odds && fixture.away_odds) {
        // Convert odds to raw probabilities
        const rawHomeProbability = 1 / parseFloat(fixture.home_odds)
        const rawDrawProbability = 1 / parseFloat(fixture.draw_odds)
        const rawAwayProbability = 1 / parseFloat(fixture.away_odds)
        
        // Calculate overround (bookmaker margin)
        const overround = rawHomeProbability + rawDrawProbability + rawAwayProbability
        
        // Normalize probabilities to remove bookmaker margin
        const homeProbability = rawHomeProbability / overround
        
        return {
          ...fixture,
          homeProbability
        }
      }
      
      return {
        ...fixture,
        homeProbability: 0
      }
    })
    
    // 3. Filter fixtures by home win probability threshold (40%)
    const PROBABILITY_THRESHOLD = 0.40 // 40%
    const qualifyingFixtures = processedFixtures.filter(
      fixture => fixture.homeProbability >= PROBABILITY_THRESHOLD
    )
    
    console.log(`Found ${qualifyingFixtures.length} fixtures meeting the ${PROBABILITY_THRESHOLD * 100}% home win probability threshold`)
    
    // 4. Rank fixtures by probability and other factors
    const rankedFixtures = [...qualifyingFixtures].sort((a, b) => {
      // Primary sort by probability
      const probDiff = b.homeProbability - a.homeProbability
      if (Math.abs(probDiff) > 0.05) return probDiff
      
      // Secondary sort by standings gap if available
      if (a.standings_gap && b.standings_gap) {
        return b.standings_gap - a.standings_gap
      }
      
      // Tertiary sort by kickoff time
      return new Date(a.kickoff_time).getTime() - new Date(b.kickoff_time).getTime()
    })
    
    // 5. Select top 4 fixtures
    const MAX_PICKS = 4
    const selectedPicks = rankedFixtures.slice(0, MAX_PICKS)
    
    console.log(`Selected ${selectedPicks.length} fixtures as picks`)
    
    // 6. Format predictions for response
    const predictions = selectedPicks.map(pick => {
      // Determine confidence level
      let confidence = 'High'
      if (pick.homeProbability >= 0.85) confidence = 'Very High'
      if (pick.homeProbability >= 0.90) confidence = 'Extreme'
      
      return {
        homeTeam: pick.home_team,
        awayTeam: pick.away_team,
        league: pick.league,
        kickoffTime: pick.kickoff_time,
        homeProbability: pick.homeProbability,
        confidence
      }
    })
    
    // 7. Save to database if available
    try {
      // Clear existing picks for today
      await query("DELETE FROM daily_picks WHERE pick_date = $1", [today])
      
      // Save new picks
      for (let i = 0; i < selectedPicks.length; i++) {
        const pick = selectedPicks[i]
        await query(`
          INSERT INTO daily_picks (fixture_id, pick_date, confidence_level, rank_order)
          VALUES ($1, $2, $3, $4)
        `, [
          pick.id,
          today,
          predictions[i].confidence,
          i + 1
        ])
      }
      
      console.log(`Saved ${selectedPicks.length} picks to database`)
    } catch (dbError) {
      console.error("Error saving picks to database:", dbError)
      // Continue even if database save fails
    }
    
    return NextResponse.json({
      success: true,
      totalFixtures: fixtures.length,
      qualifyingFixtures: qualifyingFixtures.length,
      predictions
    })
    
  } catch (error) {
    console.error("Error generating predictions:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to generate predictions",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}