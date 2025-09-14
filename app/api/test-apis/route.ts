import { NextResponse } from "next/server"
import { supabase } from "@/lib/db"

export async function GET() {
  try {
    console.log("Testing new Statarea scraping system...")

    // Test Database Connection
    let dbResult = null
    let dbError = null
    try {
      // Test Supabase connection by counting records
      const { count, error } = await supabase
        .from('statarea_picks')
        .select('*', { count: 'exact', head: true })
      if (error) throw error
      dbResult = {
        success: true,
        recordCount: count || 0
      }
    } catch (error) {
      dbError = error instanceof Error ? error.message : "Unknown error"
    }

    // Test Statarea scraper availability
    let statareaResult = null
    let statareaError = null
    try {
      // Try to import the scraper to check if it's available
      await import("@/lib/statarea-scraper")
      statareaResult = {
        success: true,
        message: "Statarea scraper is available"
      }
    } catch (error) {
      statareaError = error instanceof Error ? error.message : "Unknown error"
    }

    // Check environment variables
    const envCheck = {
      supabaseUrl: !!process.env.SUPABASE_URL,
      supabaseKey: !!process.env.SUPABASE_ANON_KEY,
      nodeEnv: process.env.NODE_ENV,
      scrapingEnabled: true
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      message: "Testing new Statarea scraping system",
      environment: envCheck,
      database: dbResult || { success: false, error: dbError },
      statarea: statareaResult || { success: false, error: statareaError },
      system: {
        name: "Statarea Web Scraper",
        features: [
          "Daily scraping from https://old.statarea.com/",
          "Winning percentage filtering (≥70%)",
          "Automatic fixture selection",
          "Database storage"
        ]
      }
    })

  } catch (error) {
    console.error("Error testing system:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to test system",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
