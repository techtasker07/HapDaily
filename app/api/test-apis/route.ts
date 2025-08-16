import { NextResponse } from "next/server"
import { getTodaysFixtures } from "@/lib/football-data"
import { getAllTodaysOdds } from "@/lib/odds-api"

export async function GET() {
  try {
    console.log("Testing API connections...")
    
    // Test Football Data API
    let footballDataResult = null
    let footballDataError = null
    try {
      const fixtures = await getTodaysFixtures()
      footballDataResult = {
        success: true,
        fixtureCount: fixtures.length,
        sampleFixture: fixtures[0] || null
      }
    } catch (error) {
      footballDataError = error instanceof Error ? error.message : "Unknown error"
    }
    
    // Test Odds API
    let oddsApiResult = null
    let oddsApiError = null
    try {
      const odds = await getAllTodaysOdds()
      oddsApiResult = {
        success: true,
        oddsCount: odds.length,
        sampleOdds: odds[0] || null
      }
    } catch (error) {
      oddsApiError = error instanceof Error ? error.message : "Unknown error"
    }
    
    // Check environment variables
    const envCheck = {
      footballDataToken: !!process.env.FOOTBALL_DATA_TOKEN,
      oddsApiKey: !!process.env.ODDS_API_KEY,
      dbUrl: !!process.env.DB_EXTERNAL_URL
    }
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      environment: envCheck,
      footballData: footballDataResult || { success: false, error: footballDataError },
      oddsApi: oddsApiResult || { success: false, error: oddsApiError }
    })
    
  } catch (error) {
    console.error("Error testing APIs:", error)
    return NextResponse.json({ 
      success: false, 
      error: "Failed to test APIs",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
