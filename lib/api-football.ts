// API Football Integration (api-football.com)
// Documentation: https://www.api-football.com/documentation-v3

interface ApiFootballTeam {
  id: number
  name: string
  logo: string
}

interface ApiFootballLeague {
  id: number
  name: string
  country: string
  logo: string
  flag: string
  season: number
}

interface ApiFootballFixture {
  id: number
  referee: string | null
  timezone: string
  date: string
  timestamp: number
  status: {
    long: string
    short: string
    elapsed: number | null
  }
}

interface ApiFootballVenue {
  id: number | null
  name: string | null
  city: string | null
}

interface ApiFootballFixtureResponse {
  fixture: ApiFootballFixture
  league: ApiFootballLeague
  teams: {
    home: ApiFootballTeam
    away: ApiFootballTeam
  }
  goals: {
    home: number | null
    away: number | null
  }
  score: {
    halftime: {
      home: number | null
      away: number | null
    }
    fulltime: {
      home: number | null
      away: number | null
    }
    extratime: {
      home: number | null
      away: number | null
    }
    penalty: {
      home: number | null
      away: number | null
    }
  }
  venue: ApiFootballVenue
}

interface ApiFootballOdd {
  name: string
  value: string
  odd: string
}

interface ApiFootballBookmaker {
  id: number
  name: string
  bets: Array<{
    id: number
    name: string
    values: ApiFootballOdd[]
  }>
}

interface ApiFootballOddsResponse {
  league: {
    id: number
    name: string
    country: string
    logo: string
    flag: string
    season: number
  }
  fixture: {
    id: number
    timezone: string
    date: string
    timestamp: number
  }
  update: string // ISO date
  bookmakers: ApiFootballBookmaker[]
}

interface NormalizedOdds {
  homeOdds: number
  drawOdds: number
  awayOdds: number
  homeProbability: number
  drawProbability: number
  awayProbability: number
  bookmaker: string
}

// Base URL and API key from environment variables
const API_FOOTBALL_BASE_URL = 'https://v3.football.api-sports.io'
const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY || '6229f940da35818699a9df5b161132c7' // Use the provided key

// Headers for API requests
const headers = {
  'x-rapidapi-key': API_FOOTBALL_KEY,
  'x-rapidapi-host': 'v3.football.api-sports.io'
}

// Competition IDs of interest
const COMPETITION_IDS = {
  PREMIER_LEAGUE: 39,   // English Premier League
  CHAMPIONSHIP: 40,     // English Championship
  LEAGUE_ONE: 41,       // English League One
  SERIE_A: 135,         // Italian Serie A
  BUNDESLIGA: 78,       // German Bundesliga
  LA_LIGA: 140,         // Spanish La Liga
  LIGUE_1: 61,          // French Ligue 1
  EREDIVISIE: 88,       // Dutch Eredivisie
  PRIMEIRA_LIGA: 94,    // Portuguese Primeira Liga
  CHAMPIONS_LEAGUE: 2,  // UEFA Champions League
}

/**
 * Get fixtures for today from API Football
 * @returns Array of fixtures
 */
export async function getTodaysFixtures(): Promise<ApiFootballFixtureResponse[]> {
  try {
    console.log('Fetching today\'s fixtures from API Football...')
    
    const today = new Date().toISOString().split('T')[0]
    
    // First fetch all fixtures for today (any league)
    const url = `${API_FOOTBALL_BASE_URL}/fixtures?date=${today}`
    
    console.log(`Fetching fixtures from: ${url}`)
    
    const response = await fetch(url, { headers })
    
    console.log(`API Football response status: ${response.status}`)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`API Football error response:`, errorText)
      throw new Error(`API Football error: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    const fixtures = data.response || []
    
    console.log(`Total fixtures found: ${fixtures.length}`)
    
    // Filter for the leagues we're interested in
    const competitionIds = Object.values(COMPETITION_IDS)
    const filteredFixtures = fixtures.filter((fixture: ApiFootballFixtureResponse) => 
      competitionIds.includes(fixture.league.id)
    )
    
    console.log(`Filtered fixtures for our competitions: ${filteredFixtures.length}`)
    
    // Filter for not yet started matches
    const upcomingFixtures = filteredFixtures.filter((fixture: ApiFootballFixtureResponse) =>
      ['NS', 'TBD', 'SUSP', 'INT', 'PST', 'CANC', 'ABD', 'AWARDED', 'DELAYED', 'LIVE', '1H', 'HT', '2H', 'ET', 'BT', 'P', 'BREAK'].includes(fixture.fixture.status.short)
    )
    
    console.log(`Upcoming fixtures: ${upcomingFixtures.length}`)
    
    return upcomingFixtures
  } catch (error) {
    console.error('Error fetching today\'s fixtures from API Football:', error)
    throw error
  }
}

/**
 * Get fixtures specifically for English League One (competition ID 41)
 * @returns Array of fixtures for League One
 */
export async function getLeagueOneFixtures(): Promise<ApiFootballFixtureResponse[]> {
  try {
    console.log('Fetching League One fixtures from API Football...')
    
    const today = new Date().toISOString().split('T')[0]
    
    // Fetch fixtures specifically for League One (ID 41)
    const url = `${API_FOOTBALL_BASE_URL}/fixtures?league=41&date=${today}`
    
    console.log(`Fetching League One fixtures from: ${url}`)
    
    const response = await fetch(url, { headers })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`API Football error response:`, errorText)
      throw new Error(`API Football error: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    const fixtures = data.response || []
    
    console.log(`Total League One fixtures found: ${fixtures.length}`)
    
    // Filter for not yet started matches
    const upcomingFixtures = fixtures.filter((fixture: ApiFootballFixtureResponse) => 
      ['NS', 'TBD', 'SUSP', 'INT', 'PST', 'CANC', 'ABD', 'AWARDED', 'DELAYED'].includes(fixture.fixture.status.short)
    )
    
    console.log(`Upcoming League One fixtures: ${upcomingFixtures.length}`)
    
    return upcomingFixtures
  } catch (error) {
    console.error('Error fetching League One fixtures from API Football:', error)
    throw error
  }
}

/**
 * Get odds for a specific fixture
 * @param fixtureId The fixture ID from API Football
 * @returns Odds data for the fixture
 */
export async function getOddsForFixture(fixtureId: number): Promise<ApiFootballOddsResponse[]> {
  try {
    console.log(`Fetching odds for fixture ID: ${fixtureId}`)
    
    const url = `${API_FOOTBALL_BASE_URL}/odds?fixture=${fixtureId}&bookmaker=8`
    // Bookmaker 8 is Bet365, one of the most reliable sources
    
    const response = await fetch(url, { headers })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`API Football odds error response:`, errorText)
      throw new Error(`API Football odds error: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    return data.response || []
  } catch (error) {
    console.error(`Error fetching odds for fixture ${fixtureId}:`, error)
    return []
  }
}

/**
 * Get odds for multiple fixtures in batch
 * @param fixtureIds Array of fixture IDs
 * @returns Map of fixture ID to odds data
 */
export async function getOddsForFixtures(fixtureIds: number[]): Promise<Map<number, ApiFootballOddsResponse[]>> {
  try {
    console.log(`Fetching odds for ${fixtureIds.length} fixtures...`)
    
    const oddsMap = new Map<number, ApiFootballOddsResponse[]>()
    
    // Process in batches of 10 to avoid rate limits
    const batchSize = 10
    for (let i = 0; i < fixtureIds.length; i += batchSize) {
      const batch = fixtureIds.slice(i, i + batchSize)
      console.log(`Processing odds batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(fixtureIds.length/batchSize)}`)
      
      const batchPromises = batch.map(fixtureId => getOddsForFixture(fixtureId))
      const batchResults = await Promise.allSettled(batchPromises)
      
      batchResults.forEach((result, index) => {
        const fixtureId = batch[index]
        if (result.status === 'fulfilled') {
          oddsMap.set(fixtureId, result.value)
        } else {
          console.error(`Failed to fetch odds for fixture ${fixtureId}:`, result.reason)
          oddsMap.set(fixtureId, [])
        }
      })
      
      // Small delay between batches to respect rate limits
      if (i + batchSize < fixtureIds.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
    return oddsMap
  } catch (error) {
    console.error('Error fetching odds for multiple fixtures:', error)
    return new Map()
  }
}

/**
 * Get odds for all fixtures from today
 * @returns Array of fixtures with odds data
 */
export async function getAllFixturesWithOdds(): Promise<{
  fixture: ApiFootballFixtureResponse,
  odds: ApiFootballOddsResponse[]
}[]> {
  try {
    // Get today's fixtures first
    const fixtures = await getTodaysFixtures()
    
    if (fixtures.length === 0) {
      console.log('No fixtures found, nothing to get odds for')
      return []
    }
    
    // Extract fixture IDs
    const fixtureIds = fixtures.map(fixture => fixture.fixture.id)
    
    // Get odds for all fixtures
    const oddsMap = await getOddsForFixtures(fixtureIds)
    
    // Combine fixtures with their odds
    const fixturesWithOdds = fixtures.map(fixture => ({
      fixture,
      odds: oddsMap.get(fixture.fixture.id) || []
    }))
    
    console.log(`Successfully fetched odds for ${fixturesWithOdds.filter(f => f.odds.length > 0).length}/${fixtures.length} fixtures`)
    
    return fixturesWithOdds
  } catch (error) {
    console.error('Error fetching all fixtures with odds:', error)
    return []
  }
}

/**
 * Calculate normalized probabilities from odds
 */
export function calculateNormalizedProbabilities(homeOdds: number, drawOdds: number, awayOdds: number): {
  homeProbability: number
  drawProbability: number
  awayProbability: number
} {
  // Convert odds to raw probabilities
  const rawHomeProbability = 1 / homeOdds
  const rawDrawProbability = 1 / drawOdds
  const rawAwayProbability = 1 / awayOdds
  
  // Calculate overround (bookmaker margin)
  const overround = rawHomeProbability + rawDrawProbability + rawAwayProbability
  
  // Normalize probabilities to remove bookmaker margin
  const homeProbability = rawHomeProbability / overround
  const drawProbability = rawDrawProbability / overround
  const awayProbability = rawAwayProbability / overround
  
  return {
    homeProbability: Math.round(homeProbability * 10000) / 10000, // 4 decimal places
    drawProbability: Math.round(drawProbability * 10000) / 10000,
    awayProbability: Math.round(awayProbability * 10000) / 10000
  }
}

/**
 * Extract match odds (1X2) from a fixture's odds data
 * @param oddsData The odds data for a fixture
 * @returns Normalized odds or null if not available
 */
export function extractMatchOdds(oddsData: ApiFootballOddsResponse[]): NormalizedOdds | null {
  if (!oddsData || oddsData.length === 0) {
    return null
  }
  
  // Find a bookmaker with match odds (1X2)
  for (const odds of oddsData) {
    // Skip if no bookmakers
    if (!odds.bookmakers || odds.bookmakers.length === 0) {
      continue
    }
    
    for (const bookmaker of odds.bookmakers) {
      // Find 1X2 (Match Winner) bet
      const matchWinnerBet = bookmaker.bets.find(bet => bet.name === 'Match Winner')
      
      if (!matchWinnerBet || !matchWinnerBet.values || matchWinnerBet.values.length !== 3) {
        continue
      }
      
      // Find home, draw, and away odds
      const homeOdd = matchWinnerBet.values.find(v => v.name === 'Home')
      const drawOdd = matchWinnerBet.values.find(v => v.name === 'Draw')
      const awayOdd = matchWinnerBet.values.find(v => v.name === 'Away')
      
      if (!homeOdd || !drawOdd || !awayOdd) {
        continue
      }
      
      // Convert to numbers
      const homeOdds = parseFloat(homeOdd.odd)
      const drawOdds = parseFloat(drawOdd.odd)
      const awayOdds = parseFloat(awayOdd.odd)
      
      if (isNaN(homeOdds) || isNaN(drawOdds) || isNaN(awayOdds)) {
        continue
      }
      
      // Calculate probabilities
      const probabilities = calculateNormalizedProbabilities(homeOdds, drawOdds, awayOdds)
      
      return {
        homeOdds,
        drawOdds,
        awayOdds,
        homeProbability: probabilities.homeProbability,
        drawProbability: probabilities.drawProbability,
        awayProbability: probabilities.awayProbability,
        bookmaker: bookmaker.name
      }
    }
  }
  
  return null
}

/**
 * Get the best odds for a fixture (the one with highest home win probability)
 */
export function getBestOddsForFixture(fixtureOdds: ApiFootballOddsResponse[]): NormalizedOdds | null {
  if (!fixtureOdds || fixtureOdds.length === 0) {
    return null
  }
  
  let bestOdds: NormalizedOdds | null = null
  let highestHomeProbability = 0
  
  // Try each bookmaker
  for (const odds of fixtureOdds) {
    if (!odds.bookmakers || odds.bookmakers.length === 0) {
      continue
    }
    
    for (const bookmaker of odds.bookmakers) {
      // Find match winner bet
      const matchWinnerBet = bookmaker.bets.find(bet => bet.name === 'Match Winner')
      
      if (!matchWinnerBet || !matchWinnerBet.values || matchWinnerBet.values.length !== 3) {
        continue
      }
      
      // Find odds
      const homeOdd = matchWinnerBet.values.find(v => v.name === 'Home')
      const drawOdd = matchWinnerBet.values.find(v => v.name === 'Draw')
      const awayOdd = matchWinnerBet.values.find(v => v.name === 'Away')
      
      if (!homeOdd || !drawOdd || !awayOdd) {
        continue
      }
      
      // Convert to numbers
      const homeOdds = parseFloat(homeOdd.odd)
      const drawOdds = parseFloat(drawOdd.odd)
      const awayOdds = parseFloat(awayOdd.odd)
      
      if (isNaN(homeOdds) || isNaN(drawOdds) || isNaN(awayOdds)) {
        continue
      }
      
      // Calculate probabilities
      const probabilities = calculateNormalizedProbabilities(homeOdds, drawOdds, awayOdds)
      
      // Keep track of best home probability
      if (probabilities.homeProbability > highestHomeProbability) {
        highestHomeProbability = probabilities.homeProbability
        bestOdds = {
          homeOdds,
          drawOdds,
          awayOdds,
          homeProbability: probabilities.homeProbability,
          drawProbability: probabilities.drawProbability,
          awayProbability: probabilities.awayProbability,
          bookmaker: bookmaker.name
        }
      }
    }
  }
  
  return bestOdds
}

/**
 * Get confidence level based on win probability
 */
export function getConfidenceLevel(winProbability: number): 'High' | 'Very High' | 'Extreme' {
  if (winProbability >= 0.90) return 'Extreme'
  if (winProbability >= 0.85) return 'Very High'
  return 'High'
}

/**
 * Convert API Football fixture to the format expected by the prediction engine
 */
export function convertApiFootballFixture(
  fixture: ApiFootballFixtureResponse, 
  odds: NormalizedOdds | null
): {
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
} {
  // Map league ID to competition code format expected by the prediction engine
  const getCompetitionCode = (leagueId: number): string => {
    switch(leagueId) {
      case 39: return 'PL'
      case 40: return 'ELC'
      case 41: return 'EL1'
      case 135: return 'SA'
      case 78: return 'BL1'
      case 140: return 'PD'
      case 61: return 'FL1'
      case 88: return 'DED'
      case 94: return 'PPL'
      case 2: return 'CL'
      default: return 'OTH'
    }
  }
  
  // Function to get short name from full name
  const getShortName = (name: string): string => {
    const parts = name.split(' ')
    if (parts.length > 1) {
      // For two-word names, use first letters of each word
      if (parts.length === 2) {
        return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase()
      }
      // For longer names, use first 3 letters
      return name.substring(0, 3).toUpperCase()
    }
    return name.substring(0, 3).toUpperCase()
  }
  
  return {
    id: fixture.fixture.id,
    homeTeam: {
      id: fixture.teams.home.id,
      name: fixture.teams.home.name,
      shortName: getShortName(fixture.teams.home.name)
    },
    awayTeam: {
      id: fixture.teams.away.id,
      name: fixture.teams.away.name,
      shortName: getShortName(fixture.teams.away.name)
    },
    competition: {
      id: fixture.league.id,
      name: fixture.league.name,
      code: getCompetitionCode(fixture.league.id)
    },
    utcDate: fixture.fixture.date,
    status: fixture.fixture.status.short
  }
}