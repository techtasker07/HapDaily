interface OddsApiBookmaker {
  key: string
  title: string
  markets: Array<{
    key: string
    outcomes: Array<{
      name: string
      price: number
    }>
  }>
}

interface OddsApiEvent {
  id: string
  sport_key: string
  sport_title: string
  commence_time: string
  home_team: string
  away_team: string
  bookmakers: OddsApiBookmaker[]
}

interface OddsApiResponse {
  data?: OddsApiEvent[]
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

const ODDS_API_BASE_URL = 'https://api.the-odds-api.com/v4'
const API_KEY = process.env.ODDS_API_KEY

if (!API_KEY) {
  console.warn('ODDS_API_KEY not found in environment variables')
}

// Sports keys for soccer leagues
const SOCCER_SPORTS = [
  'soccer_epl',           // English Premier League
  'soccer_spain_la_liga', // Spanish La Liga
  'soccer_germany_bundesliga', // German Bundesliga
  'soccer_italy_serie_a', // Italian Serie A
  'soccer_france_ligue_one', // French Ligue 1
  'soccer_netherlands_eredivisie', // Dutch Eredivisie
  'soccer_portugal_primeira_liga', // Portuguese Primeira Liga
  'soccer_uefa_champs_league', // UEFA Champions League
  'soccer_uefa_europa_league' // UEFA Europa League
]

export async function getOddsForSport(sportKey: string): Promise<OddsApiEvent[]> {
  try {
    if (!API_KEY) {
      console.error(`No API key available for odds API`)
      return []
    }

    const url = `${ODDS_API_BASE_URL}/sports/${sportKey}/odds`
    const params = new URLSearchParams({
      apiKey: API_KEY,
      regions: 'eu,uk', // European and UK bookmakers
      markets: 'h2h', // Head-to-head (1X2) market
      oddsFormat: 'decimal',
      dateFormat: 'iso'
    })

    const fullUrl = `${url}?${params}`
    console.log(`Fetching odds for ${sportKey}`)
    console.log(`API key length: ${API_KEY.length}`)
    console.log(`API key preview: ${API_KEY.substring(0, 8)}...`)
    console.log(`Full URL (key hidden): ${fullUrl.replace(API_KEY, 'API_KEY_HIDDEN')}`)

    const response = await fetch(fullUrl)

    console.log(`Odds API response status for ${sportKey}: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Odds API error for ${sportKey} (${response.status}):`, errorText)

      // If 401, it's likely an API key issue
      if (response.status === 401) {
        console.error(`Authentication failed for ${sportKey}. Check API key: ${API_KEY}`)
      }

      throw new Error(`Odds API error: ${response.status} ${response.statusText}`)
    }

    const events: OddsApiEvent[] = await response.json()

    console.log(`Total events found for ${sportKey}: ${events.length}`)

    // Filter for today's matches
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]

    const todaysEvents = events.filter(event => {
      const eventDate = new Date(event.commence_time).toISOString().split('T')[0]
      return eventDate === todayStr
    })

    console.log(`Found ${todaysEvents.length} events for ${sportKey} today`)

    // Log sample event for debugging
    if (todaysEvents.length > 0) {
      console.log(`Sample event for ${sportKey}:`, {
        id: todaysEvents[0].id,
        home_team: todaysEvents[0].home_team,
        away_team: todaysEvents[0].away_team,
        commence_time: todaysEvents[0].commence_time,
        bookmakers_count: todaysEvents[0].bookmakers?.length || 0
      })
    }

    return todaysEvents

  } catch (error) {
    console.error(`Error fetching odds for ${sportKey}:`, error)
    return []
  }
}

export async function getAllTodaysOdds(): Promise<OddsApiEvent[]> {
  try {
    console.log('Fetching odds from all supported soccer leagues...')
    
    // Fetch odds from all soccer sports in parallel
    const oddsPromises = SOCCER_SPORTS.map(sport => getOddsForSport(sport))
    const oddsResults = await Promise.allSettled(oddsPromises)
    
    // Combine all successful results
    const allOdds: OddsApiEvent[] = []
    oddsResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        allOdds.push(...result.value)
      } else {
        console.error(`Failed to fetch odds for ${SOCCER_SPORTS[index]}:`, result.reason)
      }
    })
    
    console.log(`Total odds events found: ${allOdds.length}`)
    return allOdds
    
  } catch (error) {
    console.error('Error fetching all odds:', error)
    return []
  }
}

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

export function getBestOddsForEvent(event: OddsApiEvent): NormalizedOdds | null {
  if (!event.bookmakers || event.bookmakers.length === 0) {
    return null
  }
  
  let bestOdds: NormalizedOdds | null = null
  let highestHomeProbability = 0
  
  // Find the bookmaker with the best (highest) home win probability
  for (const bookmaker of event.bookmakers) {
    const h2hMarket = bookmaker.markets.find(market => market.key === 'h2h')
    if (!h2hMarket || h2hMarket.outcomes.length !== 3) continue
    
    // Find home, draw, and away odds
    const homeOutcome = h2hMarket.outcomes.find(outcome => outcome.name === event.home_team)
    const awayOutcome = h2hMarket.outcomes.find(outcome => outcome.name === event.away_team)
    const drawOutcome = h2hMarket.outcomes.find(outcome => outcome.name === 'Draw')
    
    if (!homeOutcome || !drawOutcome || !awayOutcome) continue
    
    const probabilities = calculateNormalizedProbabilities(
      homeOutcome.price,
      drawOutcome.price,
      awayOutcome.price
    )
    
    // Use the bookmaker with the highest home probability (most favorable odds)
    if (probabilities.homeProbability > highestHomeProbability) {
      highestHomeProbability = probabilities.homeProbability
      bestOdds = {
        homeOdds: homeOutcome.price,
        drawOdds: drawOutcome.price,
        awayOdds: awayOutcome.price,
        homeProbability: probabilities.homeProbability,
        drawProbability: probabilities.drawProbability,
        awayProbability: probabilities.awayProbability,
        bookmaker: bookmaker.title
      }
    }
  }
  
  return bestOdds
}

export function getConfidenceLevel(homeProbability: number): 'High' | 'Very High' | 'Extreme' {
  if (homeProbability >= 0.90) return 'Extreme'
  if (homeProbability >= 0.85) return 'Very High'
  return 'High'
}
