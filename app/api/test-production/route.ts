import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("=== PRODUCTION TEST START ===")
    
    // Check environment variables
    const hasRapidApiKey = !!process.env.RAPIDAPI_KEY
    const hasFootballToken = !!process.env.FOOTBALL_DATA_TOKEN
    
    console.log("Environment check:", {
      RAPIDAPI_KEY: hasRapidApiKey,
      FOOTBALL_DATA_TOKEN: hasFootballToken,
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL
    })

    if (!hasRapidApiKey) {
      return NextResponse.json({
        success: false,
        error: "RAPIDAPI_KEY not found in production environment",
        env_check: {
          RAPIDAPI_KEY: hasRapidApiKey,
          FOOTBALL_DATA_TOKEN: hasFootballToken
        }
      })
    }

    if (!hasFootballToken) {
      return NextResponse.json({
        success: false,
        error: "FOOTBALL_DATA_TOKEN not found in production environment",
        env_check: {
          RAPIDAPI_KEY: hasRapidApiKey,
          FOOTBALL_DATA_TOKEN: hasFootballToken
        }
      })
    }

    // Test RapidAPI connection
    console.log("Testing RapidAPI connection...")
    const rapidApiHeaders = {
      'x-rapidapi-host': 'odds.p.rapidapi.com',
      'x-rapidapi-key': process.env.RAPIDAPI_KEY!,
      'Content-Type': 'application/json'
    }

    const rapidApiResponse = await fetch('https://odds.p.rapidapi.com/v4/sports', {
      method: 'GET',
      headers: rapidApiHeaders
    })

    console.log("RapidAPI response status:", rapidApiResponse.status)

    if (!rapidApiResponse.ok) {
      const errorText = await rapidApiResponse.text()
      console.error("RapidAPI error:", errorText)
      return NextResponse.json({
        success: false,
        error: "RapidAPI connection failed",
        details: {
          status: rapidApiResponse.status,
          statusText: rapidApiResponse.statusText,
          response: errorText
        }
      })
    }

    const sports = await rapidApiResponse.json()
    const soccerSports = sports.filter((sport: any) => sport.key.includes('soccer'))

    // Test Football Data API
    console.log("Testing Football Data API...")
    const footballResponse = await fetch('https://api.football-data.org/v4/competitions', {
      headers: {
        'X-Auth-Token': process.env.FOOTBALL_DATA_TOKEN!,
        'Content-Type': 'application/json'
      }
    })

    console.log("Football Data API response status:", footballResponse.status)

    if (!footballResponse.ok) {
      const errorText = await footballResponse.text()
      console.error("Football Data API error:", errorText)
      return NextResponse.json({
        success: false,
        error: "Football Data API connection failed",
        details: {
          status: footballResponse.status,
          statusText: footballResponse.statusText,
          response: errorText
        }
      })
    }

    const competitions = await footballResponse.json()

    console.log("=== PRODUCTION TEST SUCCESS ===")

    return NextResponse.json({
      success: true,
      message: "All APIs working in production!",
      results: {
        rapidapi: {
          status: rapidApiResponse.status,
          total_sports: sports.length,
          soccer_sports: soccerSports.length,
          sample_sports: soccerSports.slice(0, 3).map((s: any) => s.key)
        },
        football_data: {
          status: footballResponse.status,
          total_competitions: competitions.competitions?.length || 0
        }
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("Production test failed:", error)
    return NextResponse.json({
      success: false,
      error: "Production test failed",
      details: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
