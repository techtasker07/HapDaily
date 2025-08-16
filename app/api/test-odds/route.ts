import { NextResponse } from "next/server"

const ODDS_API_BASE_URL = 'https://api.the-odds-api.com/v4'
const API_KEY = process.env.ODDS_API_KEY

export async function GET() {
  try {
    console.log("Testing Odds API...")
    console.log("Environment variables check:")
    console.log("- ODDS_API_KEY exists:", !!process.env.ODDS_API_KEY)
    console.log("- ODDS_API_KEY length:", process.env.ODDS_API_KEY?.length || 0)
    console.log("- ODDS_API_KEY preview:", process.env.ODDS_API_KEY?.substring(0, 8) + '...' || 'NOT SET')

    if (!API_KEY) {
      return NextResponse.json({
        success: false,
        error: "ODDS_API_KEY not set",
        env_check: {
          odds_api_key_exists: !!process.env.ODDS_API_KEY,
          odds_api_key_length: process.env.ODDS_API_KEY?.length || 0
        }
      })
    }

    // First, get list of available sports
    const sportsUrl = `${ODDS_API_BASE_URL}/sports?apiKey=${API_KEY}`
    console.log(`Fetching sports from: ${sportsUrl.replace(API_KEY, 'API_KEY_HIDDEN')}`)
    console.log(`Actual API key being used: ${API_KEY}`)

    const sportsResponse = await fetch(sportsUrl)

    console.log(`Sports API response status: ${sportsResponse.status}`)

    if (!sportsResponse.ok) {
      const errorText = await sportsResponse.text()
      console.error(`Sports API error response:`, errorText)
      return NextResponse.json({
        success: false,
        error: `Sports API error: ${sportsResponse.status}`,
        details: errorText,
        api_key_used: API_KEY,
        url_used: sportsUrl.replace(API_KEY, 'API_KEY_HIDDEN')
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
      console.log(`Odds URL: ${oddsUrl.replace(API_KEY, 'API_KEY_HIDDEN')}`)

      const oddsResponse = await fetch(oddsUrl)

      console.log(`Odds response status: ${oddsResponse.status}`)

      if (oddsResponse.ok) {
        const odds = await oddsResponse.json()
        sampleOdds = {
          sport: testSport,
          events_count: odds.length,
          sample_event: odds[0] || null
        }
      } else {
        const errorText = await oddsResponse.text()
        console.error(`Odds error response:`, errorText)
        sampleOdds = {
          sport: testSport,
          error: `${oddsResponse.status}: ${errorText}`,
          url_tested: oddsUrl.replace(API_KEY, 'API_KEY_HIDDEN')
        }
      }
    }

    // Also test with a simple sport that should definitely work
    let simpleSportTest = null
    try {
      const simpleUrl = `${ODDS_API_BASE_URL}/sports/soccer_epl/odds?apiKey=${API_KEY}&regions=uk&markets=h2h&oddsFormat=decimal`
      console.log(`Testing simple EPL request: ${simpleUrl.replace(API_KEY, 'API_KEY_HIDDEN')}`)

      const simpleResponse = await fetch(simpleUrl)
      console.log(`Simple test response status: ${simpleResponse.status}`)

      if (simpleResponse.ok) {
        const simpleData = await simpleResponse.json()
        simpleSportTest = {
          success: true,
          events_count: simpleData.length
        }
      } else {
        const errorText = await simpleResponse.text()
        simpleSportTest = {
          success: false,
          status: simpleResponse.status,
          error: errorText
        }
      }
    } catch (error) {
      simpleSportTest = {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }
    }
    
    return NextResponse.json({
      success: true,
      api_key_set: !!API_KEY,
      api_key_preview: API_KEY ? API_KEY.substring(0, 8) + '...' : 'NOT SET',
      api_key_full: API_KEY, // Temporarily show full key for debugging
      total_sports: sports.length,
      soccer_sports: soccerSports.map((sport: any) => ({
        key: sport.key,
        title: sport.title,
        active: sport.active
      })),
      sample_odds: sampleOdds,
      simple_sport_test: simpleSportTest,
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
