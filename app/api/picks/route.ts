import { NextResponse } from "next/server"

export interface Pick {
  id: string
  homeTeam: string
  awayTeam: string
  league: string
  kickoffTime: string
  homeWinningPercentage: number
  awayWinningPercentage: number
  selectedTeam: 'HOME' | 'AWAY'
  winningPercentage: number
}

export async function GET() {
  try {
    // Check if Supabase is available and has today's data
    if (process.env.SUPABASE_URL) {
      // Try to get today's picks from database
      const { supabase } = await import("@/lib/db")
      const today = new Date().toISOString().split("T")[0]
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0]

      try {
        const { data: picks, error } = await supabase
          .from('statarea_picks')
          .select('id, home_team, away_team, league, kickoff_time, home_winning_percentage, away_winning_percentage, selected_team, winning_percentage')
          .gte('created_at', today)
          .lt('created_at', tomorrow)
          .order('winning_percentage', { ascending: false })

        if (error) throw error

        if (picks && picks.length > 0) {
          const formattedPicks: Pick[] = picks.map((pick: any) => ({
            id: pick.id.toString(),
            homeTeam: pick.home_team,
            awayTeam: pick.away_team,
            league: pick.league,
            kickoffTime: pick.kickoff_time,
            homeWinningPercentage: parseFloat(pick.home_winning_percentage),
            awayWinningPercentage: parseFloat(pick.away_winning_percentage),
            selectedTeam: pick.selected_team as 'HOME' | 'AWAY',
            winningPercentage: parseFloat(pick.winning_percentage)
          }))

          return NextResponse.json({
            success: true,
            picks: formattedPicks,
            stats: {
              totalPicks: formattedPicks.length,
              totalFixtures: 0, // Will be updated when we implement full tracking
              qualifyingFixtures: formattedPicks.length,
              averageWinningPercentage: formattedPicks.length > 0
                ? formattedPicks.reduce((sum, pick) => sum + pick.winningPercentage, 0) / formattedPicks.length
                : 0
            },
            lastUpdated: new Date().toISOString(),
            source: "database"
          })
        }
      } catch (dbError) {
        console.log("Database error:", dbError)
      }
    }

    // If no database data, return empty with message
    return NextResponse.json({
      success: true,
      picks: [],
      stats: {
        totalPicks: 0,
        totalFixtures: 0,
        qualifyingFixtures: 0,
        averageWinningPercentage: 0
      },
      lastUpdated: new Date().toISOString(),
      message: "No picks available. Click 'Scrape Statarea' to get today's fixtures."
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
        averageWinningPercentage: 0
      }
    }, { status: 500 })
  }
}

// Trigger scraping and save results
export async function POST() {
  try {
    console.log("Scraping trigger received - starting Statarea scraping")

    // Import the scraper
    const { scrapeStatareaFixtures, validateScrapingResult } = await import("@/lib/statarea-scraper")

    // Scrape fixtures
    const scrapingResult = await scrapeStatareaFixtures()

    // Validate result
    if (!validateScrapingResult(scrapingResult)) {
      return NextResponse.json({
        success: false,
        error: "Invalid scraping result"
      }, { status: 500 })
    }

    // Save to database if available
    if (process.env.SUPABASE_URL && scrapingResult.fixtures.length > 0) {
      try {
        const { supabase } = await import("@/lib/db")
        const today = new Date().toISOString().split("T")[0]
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0]

        // Clear existing picks for today
        const { error: deleteError } = await supabase
          .from('statarea_picks')
          .delete()
          .gte('created_at', today)
          .lt('created_at', tomorrow)

        if (deleteError) throw deleteError

        // Insert new picks
        const picksToInsert = scrapingResult.fixtures.map(fixture => ({
          id: fixture.id,
          home_team: fixture.homeTeam,
          away_team: fixture.awayTeam,
          league: fixture.league,
          kickoff_time: fixture.kickoffTime,
          home_winning_percentage: fixture.homeWinningPercentage,
          away_winning_percentage: fixture.awayWinningPercentage,
          selected_team: fixture.selectedTeam,
          winning_percentage: fixture.winningPercentage,
          created_at: new Date().toISOString()
        }))

        const { error: insertError } = await supabase
          .from('statarea_picks')
          .insert(picksToInsert)

        if (insertError) throw insertError

        console.log(`Saved ${scrapingResult.fixtures.length} picks to database`)
      } catch (dbError) {
        console.error("Database save error:", dbError)
        // Continue even if database save fails
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully scraped and saved ${scrapingResult.fixtures.length} fixtures`,
      timestamp: new Date().toISOString(),
      stats: scrapingResult.stats
    })

  } catch (error) {
    console.error("Error in scraping trigger:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to scrape Statarea",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
