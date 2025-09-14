import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("=== DASHBOARD DATA FETCH ===")

    // Try to get data from database
    let picks: any[] = []
    let fixtures: any[] = []

    if (process.env.SUPABASE_URL) {
      try {
        const { supabase } = await import("@/lib/db")
        const today = new Date().toISOString().split("T")[0]
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0]

        // Get picks
        const { data: picksData, error } = await supabase
          .from('statarea_picks')
          .select('id, home_team, away_team, league, kickoff_time, home_winning_percentage, away_winning_percentage, selected_team, winning_percentage')
          .gte('created_at', today)
          .lt('created_at', tomorrow)
          .order('winning_percentage', { ascending: false })

        if (error) throw error

        picks = (picksData || []).map((pick: any) => ({
          id: pick.id.toString(),
          homeTeam: pick.home_team,
          awayTeam: pick.away_team,
          league: pick.league,
          kickoffTime: pick.kickoff_time,
          homeWinningPercentage: parseFloat(pick.home_winning_percentage),
          awayWinningPercentage: parseFloat(pick.away_winning_percentage),
          selectedTeam: pick.selected_team,
          winningPercentage: parseFloat(pick.winning_percentage)
        }))

        console.log(`Found ${picks.length} picks in database`)

      } catch (dbError) {
        console.log("Database error:", dbError)
      }
    }

    const stats = {
      totalPicks: picks.length,
      totalFixtures: fixtures.length,
      qualifyingFixtures: picks.length,
      averageWinningPercentage: picks.length > 0
        ? picks.reduce((sum, pick) => sum + pick.winningPercentage, 0) / picks.length
        : 0
    }

    console.log("=== DASHBOARD DATA SUMMARY ===")
    console.log(`📊 Total fixtures: ${stats.totalFixtures}`)
    console.log(`🎯 Selected picks: ${stats.totalPicks}`)
    console.log("=============================")

    return NextResponse.json({
      success: true,
      fixtures: fixtures,
      picks: picks,
      stats,
      apiStatus: {
        statarea: {
          success: picks.length > 0,
          error: picks.length === 0 ? "No data scraped yet" : null,
          count: picks.length
        }
      },
      lastUpdated: new Date().toISOString(),
      message: picks.length === 0 ? "Click 'Scrape Statarea' to get today's fixtures" : "Data loaded from database"
    })

  } catch (error) {
    console.error("Error fetching dashboard data:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to fetch dashboard data",
      details: error instanceof Error ? error.message : "Unknown error",
      fixtures: [],
      picks: [],
      stats: { totalPicks: 0, totalFixtures: 0, qualifyingFixtures: 0, averageWinningPercentage: 0 },
      apiStatus: {
        statarea: { success: false, error: "Failed to fetch" }
      }
    }, { status: 500 })
  }
}
