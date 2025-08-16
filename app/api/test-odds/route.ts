import { NextResponse } from "next/server"

const ODDS_API_BASE_URL = 'https://api.the-odds-api.com/v4'
const API_KEY = process.env.ODDS_API_KEY

export async function GET() {
  try {
    console.log("Testing Odds API...")
    
    if (!API_KEY) {
      return NextResponse.json({
        success: false,
        error: "ODDS_API_KEY not set"
      })
    }
    
    // First, get list of available sports
    const sportsUrl = `${ODDS_API_BASE_URL}/sports?apiKey=${API_KEY}`
    console.log(`Fetching sports from: ${sportsUrl.replace(API_KEY, 'API_KEY_HIDDEN')}`)
    
    const sportsResponse = await fetch(sportsUrl)
    
    if (!sportsResponse.ok) {
      const errorText = await sportsResponse.text()
      return NextResponse.json({
        success: false,
        error: `Sports API error: ${sportsResponse.status}`,
        details: errorText
      })
    }
    
    const sports = await sportsResponse.json()
    
    // Filter for soccer sports
    const soccerSports = sports.filter((sport: any) => 
      sport.key.includes('soccer') && sport.active
    )
    
    console.log(`Found ${soccerSports.length} active soccer sports`)
    
    // Test one soccer sport to get odds
    let sampleOdds = null
    if (soccerSports.length > 0) {
      const testSport = soccerSports[0].key
      const oddsUrl = `${ODDS_API_BASE_URL}/sports/${testSport}/odds?apiKey=${API_KEY}&regions=eu,uk&markets=h2h&oddsFormat=decimal`
      
      console.log(`Testing odds for ${testSport}`)
      
      const oddsResponse = await fetch(oddsUrl)
      
      if (oddsResponse.ok) {
        const odds = await oddsResponse.json()
        sampleOdds = {
          sport: testSport,
          events_count: odds.length,
          sample_event: odds[0] || null
        }
      } else {
        const errorText = await oddsResponse.text()
        sampleOdds = {
          sport: testSport,
          error: `${oddsResponse.status}: ${errorText}`
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      api_key_set: !!API_KEY,
      api_key_preview: API_KEY ? API_KEY.substring(0, 8) + '...' : 'NOT SET',
      total_sports: sports.length,
      soccer_sports: soccerSports.map((sport: any) => ({
        key: sport.key,
        title: sport.title,
        active: sport.active
      })),
      sample_odds: sampleOdds,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error("Error testing Odds API:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to test Odds API",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
