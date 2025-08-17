interface FootballDataFixture {
  id: number
  homeTeam: {
    id: number
    name: string
    shortName: string
  }
  awayTeam: {
    id: number
    name: string
    shortName: string
  }
  competition: {
    id: number
    name: string
    code: string
  }
  utcDate: string
  status: string
}

interface FootballDataResponse {
  matches: FootballDataFixture[]
}

interface StandingsResponse {
  standings: Array<{
    table: Array<{
      position: number
      team: {
        id: number
        name: string
      }
      points: number
      playedGames: number
      won: number
      draw: number
      lost: number
      goalsFor: number
      goalsAgainst: number
    }>
  }>
}

interface TeamFormResponse {
  matches: Array<{
    homeTeam: { name: string }
    awayTeam: { name: string }
    score: {
      fullTime: {
        home: number | null
        away: number | null
      }
    }
    status: string
  }>
}

const FOOTBALL_DATA_BASE_URL = 'https://api.football-data.org/v4'
const API_TOKEN = process.env.FOOTBALL_DATA_TOKEN

if (!API_TOKEN) {
  console.warn('FOOTBALL_DATA_TOKEN not found in environment variables')
}

const headers = {
  'X-Auth-Token': API_TOKEN || '',
  'Content-Type': 'application/json'
}

// Major European leagues that are likely to have good odds coverage
// Based on your Postman result: "ELC,PL,PPL,FL1,DED,PD,BSA"
const SUPPORTED_COMPETITIONS = [
  'PL',  // Premier League
  'ELC', // Championship (English League Championship)
  'PD',  // La Liga
  'BL1', // Bundesliga
  'SA',  // Serie A
  'FL1', // Ligue 1
  'DED', // Eredivisie
  'PPL', // Primeira Liga
  'BSA', // Brazilian Serie A
  'CL',  // Champions League
  'EL'   // Europa League
]

export async function getTodaysFixtures(): Promise<FootballDataFixture[]> {
  try {
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    console.log(`Date range: ${today} to ${tomorrow}`)

    // Use wider date range to catch matches that might be scheduled for tomorrow
    const url = `${FOOTBALL_DATA_BASE_URL}/matches?dateFrom=${today}&dateTo=${tomorrow}`

    console.log(`Fetching fixtures from: ${url}`)
    console.log(`Using API token: ${API_TOKEN ? API_TOKEN.substring(0, 8) + '...' : 'NOT SET'}`)

    const response = await fetch(url, { headers })

    console.log(`Football Data API response status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Football Data API error response:`, errorText)
      throw new Error(`Football Data API error: ${response.status} ${response.statusText}`)
    }

    const data: FootballDataResponse = await response.json()

    console.log(`Total matches found: ${data.matches.length}`)

    // Log all matches for debugging
    data.matches.forEach(match => {
      console.log(`Match: ${match.homeTeam.name} vs ${match.awayTeam.name} (${match.competition.name}) - Status: ${match.status}`)
    })

    // Log all competition codes found
    const foundCompetitions = [...new Set(data.matches.map(match => match.competition.code))]
    console.log(`Competition codes found today: ${foundCompetitions.join(', ')}`)
    console.log(`Supported competitions: ${SUPPORTED_COMPETITIONS.join(', ')}`)

    // Log all match statuses
    const foundStatuses = [...new Set(data.matches.map(match => match.status))]
    console.log(`Match statuses found: ${foundStatuses.join(', ')}`)

    // Filter for supported competitions and scheduled matches
    const filteredMatches = data.matches.filter(match =>
      SUPPORTED_COMPETITIONS.includes(match.competition.code) &&
      (match.status === 'SCHEDULED' || match.status === 'TIMED')
    )

    console.log(`Found ${filteredMatches.length} matches in supported leagues for today`)

    // If no matches in supported leagues, return all matches for debugging
    if (filteredMatches.length === 0) {
      console.log(`No matches in supported leagues, returning all ${data.matches.length} matches for debugging`)
      return data.matches
    }

    return filteredMatches

  } catch (error) {
    console.error('Error fetching today\'s fixtures:', error)
    throw error
  }
}

export async function getCompetitionStandings(competitionCode: string): Promise<StandingsResponse | null> {
  try {
    const url = `${FOOTBALL_DATA_BASE_URL}/competitions/${competitionCode}/standings`
    
    const response = await fetch(url, { headers })
    
    if (!response.ok) {
      if (response.status === 404) {
        console.log(`Standings not available for competition: ${competitionCode}`)
        return null
      }
      throw new Error(`Football Data API error: ${response.status} ${response.statusText}`)
    }
    
    return await response.json()
    
  } catch (error) {
    console.error(`Error fetching standings for ${competitionCode}:`, error)
    return null
  }
}

export async function getTeamForm(teamId: number, isHome: boolean): Promise<string> {
  try {
    // Get last 10 matches to extract last 5 home/away
    const url = `${FOOTBALL_DATA_BASE_URL}/teams/${teamId}/matches?status=FINISHED&limit=10`
    
    const response = await fetch(url, { headers })
    
    if (!response.ok) {
      console.log(`Could not fetch form for team ${teamId}`)
      return 'NNNNN' // Neutral form if we can't fetch
    }
    
    const data: TeamFormResponse = await response.json()
    
    // Filter for home or away matches and get last 5
    const relevantMatches = data.matches
      .filter(match => {
        if (isHome) {
          return match.homeTeam.name // This team was playing at home
        } else {
          return match.awayTeam.name // This team was playing away
        }
      })
      .slice(0, 5)
    
    // Convert to form string (W/D/L)
    const form = relevantMatches.map(match => {
      const score = match.score.fullTime
      if (!score.home || !score.away) return 'N'
      
      if (isHome) {
        if (score.home > score.away) return 'W'
        if (score.home < score.away) return 'L'
        return 'D'
      } else {
        if (score.away > score.home) return 'W'
        if (score.away < score.home) return 'L'
        return 'D'
      }
    }).join('')
    
    // Pad with 'N' if we don't have 5 matches
    return (form + 'NNNNN').substring(0, 5)
    
  } catch (error) {
    console.error(`Error fetching team form for ${teamId}:`, error)
    return 'NNNNN'
  }
}

export function getStandingsGap(homeTeam: string, awayTeam: string, standings: StandingsResponse | null): number {
  if (!standings || !standings.standings[0]) return 0
  
  const table = standings.standings[0].table
  const homePos = table.find(team => team.team.name === homeTeam)?.position
  const awayPos = table.find(team => team.team.name === awayTeam)?.position
  
  if (!homePos || !awayPos) return 0
  
  // Positive number means home team is higher in table (better position = lower number)
  return awayPos - homePos
}
