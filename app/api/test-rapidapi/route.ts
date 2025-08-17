import { NextResponse } from "next/server"

const RAPIDAPI_BASE_URL = 'https://odds.p.rapidapi.com/v4'
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY

export async function GET() {
  try {
    console.log("Testing RapidAPI Odds...")
    console.log("Environment variables check:")
    console.log("- RAPIDAPI_KEY exists:", !!process.env.RAPIDAPI_KEY)
    console.log("- RAPIDAPI_KEY length:", process.env.RAPIDAPI_KEY?.length || 0)
    console.log("- RAPIDAPI_KEY preview:", process.env.RAPIDAPI_KEY?.substring(0, 8) + '...' || 'NOT SET')

    if (!RAPIDAPI_KEY) {
      return NextResponse.json({
        success: false,
        error: "RAPIDAPI_KEY not set",
        env_check: {
          rapidapi_key_exists: !!process.env.RAPIDAPI_KEY,
          rapidapi_key_length: process.env.RAPIDAPI_KEY?.length || 0
        }
      })
    }

    const headers = {
      'x-rapidapi-host': 'odds.p.rapidapi.com',
      'x-rapidapi-key': RAPIDAPI_KEY,
      'Content-Type': 'application/json'
    }

    // First, get list of available sports
    const sportsUrl = `${RAPIDAPI_BASE_URL}/sports`
    console.log(`Fetching sports from: ${sportsUrl}`)

    const sportsResponse = await fetch(sportsUrl, {
      method: 'GET',
      headers: headers
    })

    console.log(`Sports API response status: ${sportsResponse.status}`)

    if (!sportsResponse.ok) {
      const errorText = await sportsResponse.text()
      console.error(`Sports API error response:`, errorText)
      return NextResponse.json({
        success: false,
        error: `Sports API error: ${sportsResponse.status}`,
        details: errorText,
        headers_used: {
          'x-rapidapi-host': 'odds.p.rapidapi.com',
          'x-rapidapi-key': RAPIDAPI_KEY.substring(0, 8) + '...'
        }
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
      const oddsUrl = `${RAPIDAPI_BASE_URL}/sports/${testSport}/odds?regions=us,eu,uk&markets=h2h&oddsFormat=decimal&dateFormat=iso`

      console.log(`Testing odds for ${testSport}`)
      console.log(`Odds URL: ${oddsUrl}`)

      const oddsResponse = await fetch(oddsUrl, {
        method: 'GET',
        headers: headers
      })

      console.log(`Odds response status: ${oddsResponse.status}`)

      if (oddsResponse.ok) {
        const odds = await oddsResponse.json()
        sampleOdds = {
          sport: testSport,
          events_count: odds.length,
          sample_event: odds[0] || null,
          today_events: odds.filter((event: any) => {
            const eventDate = new Date(event.commence_time).toISOString().split('T')[0]
            const today = new Date().toISOString().split('T')[0]
            return eventDate === today
          }).length
        }
      } else {
        const errorText = await oddsResponse.text()
        console.error(`Odds error response:`, errorText)
        sampleOdds = {
          sport: testSport,
          error: `${oddsResponse.status}: ${errorText}`,
          url_tested: oddsUrl
        }
      }
    }

    return NextResponse.json({
      success: true,
      rapidapi_key_status: "SET",
      total_sports: sports.length,
      soccer_sports_count: soccerSports.length,
      soccer_sports: soccerSports.map((sport: any) => ({
        key: sport.key,
        title: sport.title,
        active: sport.active
      })),
      sample_odds_test: sampleOdds,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("RapidAPI test endpoint error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to test RapidAPI",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
