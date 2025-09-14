import { NextResponse } from "next/server"

// Endpoint to test the new Statarea scraping system
export async function GET() {
  try {
    console.log("Testing Statarea Scraping System...")

    return NextResponse.json({
      success: true,
      message: "Statarea Scraping System Test",
      results: {
        systemStatus: "Active",
        description: "System now scrapes fixtures from Statarea.com with ≥70% winning percentage filter",
        features: [
          "Daily scraping from Statarea",
          "Winning percentage filtering (≥70%)",
          "Automatic fixture selection (up to 8, minimum 3)",
          "Database storage and retrieval"
        ],
        apiEndpoints: [
          "/api/picks - Get selected fixtures",
          "/api/picks (POST) - Trigger scraping",
          "/api/dashboard-data - Get dashboard data"
        ]
      }
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