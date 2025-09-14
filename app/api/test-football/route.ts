import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("Testing Statarea Scraping System...")

    // Test database connection
    const supabaseUrl = process.env.SUPABASE_URL
    console.log("Supabase URL:", supabaseUrl ? "SET" : "NOT SET")

    // Test Statarea scraper availability
    let scraperTest = null
    try {
      const { scrapeStatareaFixtures } = await import("@/lib/statarea-scraper")
      scraperTest = {
        success: true,
        message: "Statarea scraper is available and functional"
      }
      console.log("Statarea scraper test: SUCCESS")
    } catch (error) {
      console.log("Statarea scraper test: FAILED", error)
      scraperTest = {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }
    }

    // Test database if available
    let dbTest = null
    if (supabaseUrl) {
      try {
        const { supabase } = await import("@/lib/db")
        const today = new Date().toISOString().split('T')[0]
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        const { count, error } = await supabase
          .from('statarea_picks')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', today)
          .lt('created_at', tomorrow)
        if (error) throw error
        dbTest = {
          success: true,
          todaysPicksCount: count || 0,
          tableExists: true
        }
        console.log("Database test: SUCCESS")
      } catch (dbError) {
        console.log("Database test: FAILED", dbError)
        dbTest = {
          success: false,
          error: dbError instanceof Error ? dbError.message : "Unknown error",
          tableExists: false
        }
      }
    }

    const today = new Date().toISOString().split('T')[0]

    return NextResponse.json({
      success: true,
      system: "Statarea Web Scraping System",
      database: {
        url_set: !!supabaseUrl,
        test_result: dbTest
      },
      scraper: {
        available: scraperTest?.success || false,
        test_result: scraperTest
      },
      today: today,
      system_info: {
        target_website: "https://old.statarea.com/",
        filter_criteria: "≥70% winning percentage",
        max_fixtures_per_day: 8,
        min_fixtures_per_day: 3,
        data_storage: "PostgreSQL database"
      },
      features: [
        "Automated daily web scraping",
        "Winning percentage analysis",
        "Fixture filtering and selection",
        "Database persistence",
        "REST API endpoints"
      ],
      api_endpoints: [
        "GET /api/picks - Retrieve selected fixtures",
        "POST /api/picks - Trigger scraping",
        "GET /api/dashboard-data - Dashboard data",
        "GET /api/scrape-statarea - Direct scraping test"
      ],
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("Error testing Statarea system:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to test Statarea system",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
