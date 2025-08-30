import { NextResponse } from "next/server"
import { query } from "@/lib/db"

interface FixtureOdds {
  id: number
  externalId: string
  homeTeam: string
  awayTeam: string
  league: string
  kickoffTime: string
  homeOdds: number | null
  drawOdds: number | null
  awayOdds: number | null
}

// Endpoint to save manually entered odds
export async function POST(request: Request) {
  try {
    const data = await request.json()
    const fixtures: FixtureOdds[] = data.fixtures || []
    
    if (fixtures.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No fixtures provided"
      }, { status: 400 })
    }
    
    console.log(`Saving odds for ${fixtures.length} fixtures`)
    
    const today = new Date().toISOString().split("T")[0]
    let savedCount = 0
    
    // Save each fixture
    for (const fixture of fixtures) {
      if (!fixture.homeOdds && !fixture.drawOdds && !fixture.awayOdds) {
        console.log(`Skipping fixture ${fixture.homeTeam} vs ${fixture.awayTeam} - no odds provided`)
        continue
      }
      
      // Calculate normalized probabilities if we have all odds
      let homeProbability = null
      
      if (fixture.homeOdds && fixture.drawOdds && fixture.awayOdds) {
        // Convert odds to raw probabilities
        const rawHomeProbability = 1 / fixture.homeOdds
        const rawDrawProbability = 1 / fixture.drawOdds
        const rawAwayProbability = 1 / fixture.awayOdds
        
        // Calculate overround (bookmaker margin)
        const overround = rawHomeProbability + rawDrawProbability + rawAwayProbability
        
        // Normalize probabilities to remove bookmaker margin
        homeProbability = rawHomeProbability / overround
      }
      
      try {
        if (fixture.id > 0) {
          // Update existing fixture
          await query(`
            UPDATE fixtures SET
              home_odds = $1,
              draw_odds = $2,
              away_odds = $3,
              home_probability = $4,
              updated_at = NOW()
            WHERE id = $5
          `, [
            fixture.homeOdds,
            fixture.drawOdds,
            fixture.awayOdds,
            homeProbability,
            fixture.id
          ])
        } else {
          // Insert new fixture
          await query(`
            INSERT INTO fixtures (
              external_id, home_team, away_team, league, kickoff_time,
              home_odds, draw_odds, away_odds, home_probability
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (external_id) DO UPDATE SET
              home_odds = EXCLUDED.home_odds,
              draw_odds = EXCLUDED.draw_odds,
              away_odds = EXCLUDED.away_odds,
              home_probability = EXCLUDED.home_probability,
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
            homeProbability
          ])
        }
        
        savedCount++
      } catch (dbError) {
        console.error(`Error saving odds for fixture ${fixture.homeTeam} vs ${fixture.awayTeam}:`, dbError)
        // Continue with other fixtures even if one fails
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Successfully saved odds for ${savedCount} fixtures`,
      savedCount
    })
    
  } catch (error) {
    console.error("Error saving manual odds:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to save odds",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}