import { NextResponse } from "next/server"

// Your 12 available competitions on the free tier
const YOUR_COMPETITIONS = [
  { code: 'WC', name: 'FIFA World Cup', flag: '🌍' },
  { code: 'CL', name: 'UEFA Champions League', flag: '🏆' },
  { code: 'BL1', name: 'Bundesliga', flag: '🇩🇪' },
  { code: 'DED', name: 'Eredivisie', flag: '🇳🇱' },
  { code: 'BSA', name: 'Campeonato Brasileiro Série A', flag: '🇧🇷' },
  { code: 'PD', name: 'Primera División (La Liga)', flag: '🇪🇸' },
  { code: 'FL1', name: 'Ligue 1', flag: '🇫🇷' },
  { code: 'ELC', name: 'Championship', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { code: 'PPL', name: 'Primeira Liga', flag: '🇵🇹' },
  { code: 'EC', name: 'European Championship', flag: '🇪🇺' },
  { code: 'SA', name: 'Serie A', flag: '🇮🇹' },
  { code: 'PL', name: 'Premier League', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' }
]

export async function GET() {
  try {
    const API_TOKEN = process.env.FOOTBALL_DATA_TOKEN
    
    if (!API_TOKEN) {
      return NextResponse.json({
        success: false,
        error: "No API token found"
      })
    }
    
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0]
    
    console.log(`Checking matches for ${today} across your 12 competitions...`)
    
    const response = await fetch(`https://api.football-data.org/v4/matches?date=${today}`, {
      headers: {
        'X-Auth-Token': API_TOKEN,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({
        success: false,
        error: `API Error: ${response.status}`,
        details: errorText
      })
    }
    
    const data = await response.json()
    
    // Filter for your available competitions
    const yourMatches = data.matches.filter((match: any) => 
      YOUR_COMPETITIONS.some(comp => comp.code === match.competition.code)
    )
    
    // Group matches by competition
    const matchesByCompetition = YOUR_COMPETITIONS.map(comp => {
      const matches = yourMatches.filter((match: any) => match.competition.code === comp.code)
      return {
        ...comp,
        matchCount: matches.length,
        matches: matches.map((match: any) => ({
          homeTeam: match.homeTeam.name,
          awayTeam: match.awayTeam.name,
          time: new Date(match.utcDate).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            timeZone: 'UTC'
          }),
          status: match.status
        }))
      }
    })
    
    const activeCompetitions = matchesByCompetition.filter(comp => comp.matchCount > 0)
    const inactiveCompetitions = matchesByCompetition.filter(comp => comp.matchCount === 0)
    
    return NextResponse.json({
      success: true,
      date: today,
      summary: {
        totalMatches: yourMatches.length,
        activeCompetitions: activeCompetitions.length,
        inactiveCompetitions: inactiveCompetitions.length
      },
      activeCompetitions,
      inactiveCompetitions: inactiveCompetitions.map(comp => ({
        code: comp.code,
        name: comp.name,
        flag: comp.flag
      })),
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error("My competitions endpoint error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to fetch your competitions",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
