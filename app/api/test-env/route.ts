import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Get all environment variables related to our APIs
    const envVars = {
      // Football Data API
      FOOTBALL_DATA_TOKEN: process.env.FOOTBALL_DATA_TOKEN ? 
        process.env.FOOTBALL_DATA_TOKEN.substring(0, 8) + '...' : 'NOT SET',
      
      // Odds API - try different variations
      ODDS_API_KEY: process.env.ODDS_API_KEY ? 
        process.env.ODDS_API_KEY.substring(0, 8) + '...' : 'NOT SET',
      NEXT_PUBLIC_ODDS_API_KEY: process.env.NEXT_PUBLIC_ODDS_API_KEY ? 
        process.env.NEXT_PUBLIC_ODDS_API_KEY.substring(0, 8) + '...' : 'NOT SET',
      odds_api_key: process.env.odds_api_key ? 
        process.env.odds_api_key.substring(0, 8) + '...' : 'NOT SET',
      
      // Database
      DB_EXTERNAL_URL: process.env.DB_EXTERNAL_URL ? 
        process.env.DB_EXTERNAL_URL.substring(0, 20) + '...' : 'NOT SET',
      DATABASE_URL: process.env.DATABASE_URL ? 
        process.env.DATABASE_URL.substring(0, 20) + '...' : 'NOT SET',
      
      // Vercel specific
      VERCEL_URL: process.env.VERCEL_URL || 'NOT SET',
      NODE_ENV: process.env.NODE_ENV || 'NOT SET'
    }
    
    // Get all environment variable keys that might be related
    const allEnvKeys = Object.keys(process.env)
    const oddsRelated = allEnvKeys.filter(key => key.toLowerCase().includes('odds'))
    const footballRelated = allEnvKeys.filter(key => key.toLowerCase().includes('football'))
    const dbRelated = allEnvKeys.filter(key => key.toLowerCase().includes('db') || key.toLowerCase().includes('database'))
    
    // Test the actual values we're using in the code
    const actualValues = {
      footballDataToken: {
        exists: !!process.env.FOOTBALL_DATA_TOKEN,
        length: process.env.FOOTBALL_DATA_TOKEN?.length || 0,
        preview: process.env.FOOTBALL_DATA_TOKEN?.substring(0, 8) + '...' || 'NOT SET'
      },
      oddsApiKey: {
        exists: !!process.env.ODDS_API_KEY,
        length: process.env.ODDS_API_KEY?.length || 0,
        preview: process.env.ODDS_API_KEY?.substring(0, 8) + '...' || 'NOT SET',
        fullValue: process.env.ODDS_API_KEY || 'NOT SET' // Temporarily show full value for debugging
      }
    }
    
    return NextResponse.json({
      success: true,
      environment_variables: envVars,
      related_keys: {
        odds_related: oddsRelated,
        football_related: footballRelated,
        db_related: dbRelated
      },
      actual_values: actualValues,
      total_env_vars: allEnvKeys.length,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error("Error checking environment variables:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to check environment variables",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
