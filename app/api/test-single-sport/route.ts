import { NextResponse } from "next/server"

const RAPIDAPI_BASE_URL = 'https://odds.p.rapidapi.com/v4'
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY

export async function GET() {
  try {
    console.log("Testing single sport from RapidAPI...")
    
    if (!RAPIDAPI_KEY) {
      return NextResponse.json({
        success: false,
        error: "RAPIDAPI_KEY not set"
      })
    }

    const headers = {
      'x-rapidapi-host': 'odds.p.rapidapi.com',
      'x-rapidapi-key': RAPIDAPI_KEY,
      'Content-Type': 'application/json'
    }

    // Test Premier League specifically
    const testSport = 'soccer_epl'
    const oddsUrl = `${RAPIDAPI_BASE_URL}/sports/${testSport}/odds?regions=us,eu,uk&markets=h2h&oddsFormat=decimal&dateFormat=iso`

    console.log(`Testing ${testSport}...`)
    console.log(`URL: ${oddsUrl}`)

    const response = await fetch(oddsUrl, {
      method: 'GET',
      headers: headers
    })

    console.log(`Response status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Error response:`, errorText)
      return NextResponse.json({
        success: false,
        error: `API Error: ${response.status}`,
        details: errorText,
        sport_tested: testSport
      })
    }

    const events = await response.json()
    
    // Filter for today's events
    const today = new Date().toISOString().split('T')[0]
    const todayEvents = events.filter((event: any) => {
      const eventDate = new Date(event.commence_time).toISOString().split('T')[0]
      return eventDate === today
    })

    return NextResponse.json({
      success: true,
      sport: testSport,
      total_events: events.length,
      today_events: todayEvents.length,
      sample_event: events[0] || null,
      today_sample: todayEvents[0] || null,
      all_event_dates: events.map((e: any) => new Date(e.commence_time).toISOString().split('T')[0]),
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("Single sport test error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to test single sport",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
