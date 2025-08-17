interface RapidApiBookmaker {
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

interface RapidApiEvent {
  id: string
  sport_key: string
  sport_title: string
  commence_time: string
  home_team: string
  away_team: string
  bookmakers: RapidApiBookmaker[]
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

const RAPIDAPI_BASE_URL = 'https://odds.p.rapidapi.com/v4'
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY

console.log('RapidAPI Odds initialized:', {
  hasApiKey: !!RAPIDAPI_KEY,
  keyPreview: RAPIDAPI_KEY ? RAPIDAPI_KEY.substring(0, 8) + '...' : 'NOT SET'
})

if (!RAPIDAPI_KEY) {
  console.warn('RAPIDAPI_KEY not found in environment variables')
}

// RapidAPI headers
const rapidApiHeaders = {
  'x-rapidapi-host': 'odds.p.rapidapi.com',
  'x-rapidapi-key': RAPIDAPI_KEY || '',
  'Content-Type': 'application/json'
}

// Soccer sports available in RapidAPI (verified working)
const RAPIDAPI_SOCCER_SPORTS = [
  'soccer_epl',           // English Premier League
  'soccer_spain_la_liga', // Spanish La Liga
  'soccer_germany_bundesliga', // German Bundesliga
  'soccer_italy_serie_a', // Italian Serie A
  'soccer_france_ligue_one', // French Ligue 1
  'soccer_netherlands_eredivisie', // Dutch Eredivisie
  'soccer_portugal_primeira_liga', // Portuguese Primeira Liga
  'soccer_uefa_champs_league' // UEFA Champions League
  // Note: soccer_brazil_serie_a and soccer_england_efl_champ return 404 in RapidAPI
]

export async function getRapidApiOddsForSport(sportKey: string): Promise<RapidApiEvent[]> {
  try {
    console.log(`Getting RapidAPI odds for ${sportKey}...`)
    
    if (!RAPIDAPI_KEY || RAPIDAPI_KEY === 'NOT SET') {
      console.error(`No RapidAPI key available. Available env vars:`, Object.keys(process.env).filter(key => key.toLowerCase().includes('rapid')))
      return []
    }

    const url = `${RAPIDAPI_BASE_URL}/sports/${sportKey}/odds`
    const params = new URLSearchParams({
      regions: 'us,eu,uk', // US, European and UK bookmakers
      markets: 'h2h', // Head-to-head (1X2) market
      oddsFormat: 'decimal',
      dateFormat: 'iso'
    })

    const fullUrl = `${url}?${params}`
    console.log(`Fetching RapidAPI odds for ${sportKey}`)
    console.log(`RapidAPI key preview: ${RAPIDAPI_KEY.substring(0, 8)}...`)

    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: rapidApiHeaders
    })

    console.log(`RapidAPI response status for ${sportKey}: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`RapidAPI error for ${sportKey} (${response.status}):`, errorText)

      // If 401/403, it's likely an API key issue
      if (response.status === 401 || response.status === 403) {
        console.error(`Authentication failed for ${sportKey}. Check RapidAPI key`)
      }

      throw new Error(`RapidAPI error: ${response.status} ${response.statusText}`)
    }

    const events: RapidApiEvent[] = await response.json()

    console.log(`Total events found for ${sportKey}: ${events.length}`)

    // Filter for today's and tomorrow's matches (more flexible)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const todayStr = today.toISOString().split('T')[0]
    const tomorrowStr = tomorrow.toISOString().split('T')[0]

    const upcomingEvents = events.filter(event => {
      const eventDate = new Date(event.commence_time).toISOString().split('T')[0]
      return eventDate === todayStr || eventDate === tomorrowStr
    })

    console.log(`Found ${upcomingEvents.length} upcoming events for ${sportKey}`)

    // Log sample event for debugging
    if (upcomingEvents.length > 0) {
      console.log(`Sample event for ${sportKey}:`, {
        id: upcomingEvents[0].id,
        home_team: upcomingEvents[0].home_team,
        away_team: upcomingEvents[0].away_team,
        commence_time: upcomingEvents[0].commence_time,
        bookmakers_count: upcomingEvents[0].bookmakers?.length || 0
      })
    }

    return upcomingEvents

  } catch (error) {
    console.error(`Error fetching RapidAPI odds for ${sportKey}:`, error)
    return []
  }
}

export async function getAllRapidApiOdds(): Promise<RapidApiEvent[]> {
  try {
    console.log('Fetching odds from RapidAPI for all supported soccer leagues...')
    
    // Fetch odds from all soccer sports in parallel (but limit to avoid rate limits)
    const batchSize = 3 // Process 3 sports at a time to avoid rate limits
    const allOdds: RapidApiEvent[] = []
    
    for (let i = 0; i < RAPIDAPI_SOCCER_SPORTS.length; i += batchSize) {
      const batch = RAPIDAPI_SOCCER_SPORTS.slice(i, i + batchSize)
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1}: ${batch.join(', ')}`)
      
      const oddsPromises = batch.map(sport => getRapidApiOddsForSport(sport))
      const oddsResults = await Promise.allSettled(oddsPromises)
      
      oddsResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          allOdds.push(...result.value)
        } else {
          console.error(`Failed to fetch RapidAPI odds for ${batch[index]}:`, result.reason)
        }
      })
      
      // Small delay between batches to respect rate limits
      if (i + batchSize < RAPIDAPI_SOCCER_SPORTS.length) {
        await new Promise(resolve => setTimeout(resolve, 1000)) // 1 second delay
      }
    }
    
    console.log(`Total RapidAPI odds events found: ${allOdds.length}`)
    return allOdds
    
  } catch (error) {
    console.error('Error fetching all RapidAPI odds:', error)
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

export function getBestRapidApiOddsForEvent(event: RapidApiEvent): NormalizedOdds | null {
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

export function getConfidenceLevel(winProbability: number): 'High' | 'Very High' | 'Extreme' {
  if (winProbability >= 0.90) return 'Extreme'
  if (winProbability >= 0.85) return 'Very High'
  return 'High'
}
