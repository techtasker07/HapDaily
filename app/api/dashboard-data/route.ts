import { NextResponse } from "next/server"
import { getTodaysFixtures } from "@/lib/football-data"
import { getAllRapidApiOdds } from "@/lib/rapidapi-odds"
import { generateDailyPredictions } from "@/lib/prediction-engine"

export async function GET() {
  try {
    console.log("=== DASHBOARD DATA FETCH ===")
    
    // Track API status
    const apiStatus = {
      footballData: { success: false, error: null as string | null, count: 0 },
      oddsApi: { success: false, error: null as string | null, count: 0 }
    }
    
    // Fetch fixtures from Football Data API
    let allFixtures: any[] = []
    try {
      console.log("📊 Fetching fixtures from Football Data API...")
      console.log("Environment check:", {
        hasToken: !!process.env.FOOTBALL_DATA_TOKEN,
        tokenPreview: process.env.FOOTBALL_DATA_TOKEN ? process.env.FOOTBALL_DATA_TOKEN.substring(0, 8) + '...' : 'NOT SET'
      })

      allFixtures = await getTodaysFixtures()
      apiStatus.footballData.success = true
      apiStatus.footballData.count = allFixtures.length
      console.log(`✅ Football Data API: ${allFixtures.length} fixtures found`)

      if (allFixtures.length > 0) {
        console.log("Sample fixture:", {
          id: allFixtures[0].id,
          homeTeam: allFixtures[0].homeTeam.name,
          awayTeam: allFixtures[0].awayTeam.name,
          competition: allFixtures[0].competition.name,
          status: allFixtures[0].status
        })
      }
    } catch (error) {
      console.error("❌ Football Data API failed:", error)
      apiStatus.footballData.error = error instanceof Error ? error.message : "Unknown error"

      // Try direct API call for debugging
      try {
        console.log("🔍 Attempting direct API call for debugging...")
        const today = new Date().toISOString().split('T')[0]
        const url = `https://api.football-data.org/v4/matches?dateFrom=${today}&dateTo=${today}`
        const response = await fetch(url, {
          headers: {
            'X-Auth-Token': process.env.FOOTBALL_DATA_TOKEN || '',
            'Content-Type': 'application/json'
          }
        })
        console.log("Direct API call status:", response.status)
        if (response.ok) {
          const directData = await response.json()
          console.log("Direct API call returned:", directData.matches?.length || 0, "matches")
        }
      } catch (directError) {
        console.error("Direct API call also failed:", directError)
      }
    }
    
    // Fetch odds from RapidAPI
    let allOdds: any[] = []
    try {
      console.log("💰 Fetching odds from RapidAPI...")
      allOdds = await getAllRapidApiOdds()
      apiStatus.oddsApi.success = true
      apiStatus.oddsApi.count = allOdds.length
      console.log(`✅ RapidAPI: ${allOdds.length} events found`)
    } catch (error) {
      console.error("❌ RapidAPI failed:", error)
      apiStatus.oddsApi.error = error instanceof Error ? error.message : "Unknown error"
    }
    
    // Generate predictions
    let predictionResult = null
    let picks: any[] = []
    try {
      console.log("🎯 Generating predictions...")
      predictionResult = await generateDailyPredictions()
      picks = predictionResult.selectedPicks
      console.log(`✅ Predictions: ${picks.length} picks selected`)
    } catch (error) {
      console.error("❌ Prediction generation failed:", error)
    }
    
    // Format fixtures for display
    const formattedFixtures = allFixtures.map(fixture => ({
      id: fixture.id.toString(),
      homeTeam: fixture.homeTeam.name,
      awayTeam: fixture.awayTeam.name,
      league: fixture.competition.name,
      kickoffTime: fixture.utcDate,
      status: fixture.status,
      hasOdds: allOdds.some(odds =>
        odds.home_team.toLowerCase().includes(fixture.homeTeam.name.toLowerCase().split(' ')[0]) ||
        odds.away_team.toLowerCase().includes(fixture.awayTeam.name.toLowerCase().split(' ')[0])
      )
    }))

    console.log(`📋 Formatted ${formattedFixtures.length} fixtures for display`)
    
    // Format picks for display
    const formattedPicks = picks.map(pick => ({
      id: pick.externalId,
      homeTeam: pick.homeTeam,
      awayTeam: pick.awayTeam,
      league: pick.league,
      kickoffTime: pick.kickoffTime,
      homeProbability: pick.homeProbability,
      homeOdds: pick.homeOdds,
      awayOdds: pick.awayOdds,
      drawOdds: pick.drawOdds,
      standingsGap: pick.standingsGap,
      homeForm: pick.homeForm,
      awayForm: pick.awayForm,
      confidence: pick.confidence
    }))
    
    const stats = {
      totalPicks: formattedPicks.length,
      totalFixtures: formattedFixtures.length,
      qualifyingFixtures: predictionResult?.stats.qualifyingFixtures || 0,
      averageProbability: formattedPicks.length > 0 
        ? formattedPicks.reduce((sum, pick) => sum + pick.homeProbability, 0) / formattedPicks.length 
        : 0
    }
    
    console.log("=== DASHBOARD DATA SUMMARY ===")
    console.log(`📊 Total fixtures: ${stats.totalFixtures}`)
    console.log(`💰 Odds events: ${apiStatus.oddsApi.count}`)
    console.log(`🎯 Selected picks: ${stats.totalPicks}`)
    console.log(`✅ Qualifying fixtures: ${stats.qualifyingFixtures}`)
    console.log("=============================")
    
    return NextResponse.json({
      success: true,
      fixtures: formattedFixtures,
      picks: formattedPicks,
      stats,
      apiStatus,
      lastUpdated: new Date().toISOString()
    })
    
  } catch (error) {
    console.error("Error fetching dashboard data:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to fetch dashboard data",
      details: error instanceof Error ? error.message : "Unknown error",
      fixtures: [],
      picks: [],
      stats: { totalPicks: 0, totalFixtures: 0, qualifyingFixtures: 0, averageProbability: 0 },
      apiStatus: {
        footballData: { success: false, error: "Failed to fetch" },
        oddsApi: { success: false, error: "Failed to fetch" }
      }
    }, { status: 500 })
  }
}
