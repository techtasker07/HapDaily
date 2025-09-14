import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("=== DEBUGGING STAT_AREA SCRAPING SYSTEM ===")

    // Check database connection
    const supabaseUrl = process.env.SUPABASE_URL
    console.log("Supabase URL:", supabaseUrl ? "SET" : "NOT SET")

    // Test Statarea scraper import
    let scraperAvailable = false
    try {
      await import("@/lib/statarea-scraper")
      scraperAvailable = true
      console.log("Statarea scraper: AVAILABLE")
    } catch (error) {
      console.log("Statarea scraper: NOT AVAILABLE", error)
    }

    // Check current date/time
    const now = new Date()
    const today = now.toISOString().split('T')[0]

    console.log("Date debugging:", {
      now: now.toISOString(),
      today: today,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    })

    // Test database query if available
    let dbTestResult = null
    if (supabaseUrl) {
      try {
        const { supabase } = await import("@/lib/db")
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        const { count, error } = await supabase
          .from('statarea_picks')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', today)
          .lt('created_at', tomorrow)
        if (error) throw error
        dbTestResult = {
          success: true,
          todaysPicksCount: count || 0
        }
        console.log("Database test: SUCCESS")
      } catch (dbError) {
        console.log("Database test: FAILED", dbError)
        dbTestResult = {
          success: false,
          error: dbError instanceof Error ? dbError.message : "Unknown error"
        }
      }
    }

    // Return comprehensive debug info for new system
    return NextResponse.json({
      success: true,
      system: "Statarea Web Scraping System",
      debug_info: {
        database_url_set: !!supabaseUrl,
        scraper_available: scraperAvailable,
        today_date: today,
        system_status: "Active"
      },
      database_test: dbTestResult,
      scraping_info: {
        target_url: "https://old.statarea.com/",
        filter_criteria: "≥70% winning percentage",
        max_fixtures: 8,
        min_fixtures: 3
      },
      features: [
        "Daily web scraping from Statarea",
        "Winning percentage filtering",
        "Automatic fixture selection",
        "Database storage and retrieval"
      ],
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("Debug endpoint error:", error)
    return NextResponse.json({
      success: false,
      error: "Debug endpoint failed",
      details: error instanceof Error ? error.message : "Unknown error",
      step: "general_error"
    }, { status: 500 })
  }
}
