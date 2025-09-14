import { NextResponse } from "next/server"

// Endpoint to fetch today's fixtures (legacy - returns empty for new scraping system)
export async function GET() {
  try {
    console.log("Fixtures endpoint accessed - now using Statarea scraping system")

    return NextResponse.json({
      success: true,
      fixtures: [],
      message: "Fixtures are now managed through the Statarea scraping system"
    })

  } catch (error) {
    console.error("Error in fixtures endpoint:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to fetch fixtures",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}