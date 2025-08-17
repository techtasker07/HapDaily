import { NextResponse } from "next/server"

export async function GET() {
  try {
    const API_TOKEN = process.env.FOOTBALL_DATA_TOKEN
    
    if (!API_TOKEN) {
      return NextResponse.json({
        success: false,
        error: "No API token found"
      })
    }
    
    console.log("Fetching all available competitions...")
    
    const response = await fetch('https://api.football-data.org/v4/competitions', {
      headers: {
        'X-Auth-Token': API_TOKEN,
        'Content-Type': 'application/json'
      }
    })
    
    console.log("Competitions API response status:", response.status)
    
    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({
        success: false,
        error: `API Error: ${response.status}`,
        details: errorText
      })
    }
    
    const data = await response.json()
    
    // Group competitions by area/country
    const competitionsByArea = data.competitions.reduce((acc: any, comp: any) => {
      const areaName = comp.area.name
      if (!acc[areaName]) {
        acc[areaName] = []
      }
      acc[areaName].push({
        id: comp.id,
        name: comp.name,
        code: comp.code,
        type: comp.type,
        emblem: comp.emblem
      })
      return acc
    }, {})
    
    // Sort areas by number of competitions (most first)
    const sortedAreas = Object.entries(competitionsByArea)
      .sort(([,a], [,b]) => (b as any[]).length - (a as any[]).length)
      .reduce((acc, [area, comps]) => {
        acc[area] = comps
        return acc
      }, {} as any)
    
    return NextResponse.json({
      success: true,
      total_competitions: data.competitions.length,
      competitions_by_area: sortedAreas,
      major_leagues: data.competitions.filter((comp: any) => 
        ['PL', 'PD', 'BL1', 'SA', 'FL1', 'CL', 'EL', 'WC', 'EC'].includes(comp.code)
      ).map((comp: any) => ({
        name: comp.name,
        code: comp.code,
        area: comp.area.name
      })),
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error("Competitions endpoint error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to fetch competitions",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
