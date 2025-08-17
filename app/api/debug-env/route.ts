import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Check all environment variables
    const envCheck = {
      // Football Data API
      FOOTBALL_DATA_TOKEN: {
        exists: !!process.env.FOOTBALL_DATA_TOKEN,
        length: process.env.FOOTBALL_DATA_TOKEN?.length || 0,
        preview: process.env.FOOTBALL_DATA_TOKEN?.substring(0, 8) + '...' || 'NOT SET'
      },
      
      // RapidAPI Key
      RAPIDAPI_KEY: {
        exists: !!process.env.RAPIDAPI_KEY,
        length: process.env.RAPIDAPI_KEY?.length || 0,
        preview: process.env.RAPIDAPI_KEY?.substring(0, 8) + '...' || 'NOT SET'
      },
      
      // Old Odds API (should be removed)
      ODDS_API_KEY: {
        exists: !!process.env.ODDS_API_KEY,
        length: process.env.ODDS_API_KEY?.length || 0,
        preview: process.env.ODDS_API_KEY?.substring(0, 8) + '...' || 'NOT SET'
      },
      
      // Database
      DB_HOST: {
        exists: !!process.env.DB_HOST,
        preview: process.env.DB_HOST?.substring(0, 10) + '...' || 'NOT SET'
      },
      
      // Runtime info
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV
    }

    // Test Football Data API
    let footballDataTest = null
    try {
      const response = await fetch('https://api.football-data.org/v4/competitions', {
        headers: {
          'X-Auth-Token': process.env.FOOTBALL_DATA_TOKEN || '',
          'Content-Type': 'application/json'
        }
      })
      footballDataTest = {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      }
    } catch (error) {
      footballDataTest = {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    // Test RapidAPI
    let rapidApiTest = null
    try {
      const response = await fetch('https://odds.p.rapidapi.com/v4/sports', {
        headers: {
          'x-rapidapi-host': 'odds.p.rapidapi.com',
          'x-rapidapi-key': process.env.RAPIDAPI_KEY || '',
          'Content-Type': 'application/json'
        }
      })
      rapidApiTest = {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      }
    } catch (error) {
      rapidApiTest = {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      environment: {
        node_env: process.env.NODE_ENV,
        vercel: process.env.VERCEL,
        vercel_env: process.env.VERCEL_ENV
      },
      env_variables: envCheck,
      api_tests: {
        football_data: footballDataTest,
        rapid_api: rapidApiTest
      }
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: "Debug endpoint failed",
      details: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
