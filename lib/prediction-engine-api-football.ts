import {
  getTodaysFixtures,
  getLeagueOneFixtures,
  getAllFixturesWithOdds,
  getBestOddsForFixture,
  getOddsForFixture,
  convertApiFootballFixture,
  getConfidenceLevel
} from './api-football'

import {
  getCompetitionStandings,
  getTeamForm,
  getStandingsGap
} from './football-data'

export interface ProcessedFixture {
  externalId: string
  homeTeam: string
  awayTeam: string
  league: string
  kickoffTime: string
  homeOdds: number
  drawOdds: number
  awayOdds: number
  homeProbability: number
  awayProbability: number
  predictedOutcome: 'HOME' | 'AWAY'
  winProbability: number // The higher of home or away probability
  standingsGap: number
  homeForm: string
  awayForm: string
  confidence: 'High' | 'Very High' | 'Extreme'
  bookmaker: string
}

export interface PredictionResult {
  fixtures: ProcessedFixture[]
  selectedPicks: ProcessedFixture[]
  stats: {
    totalFixtures: number
    fixturesWithOdds: number
    qualifyingFixtures: number
    selectedPicks: number
  }
}

const WIN_PROBABILITY_THRESHOLD = 0.40 // 40% minimum probability for home win (as specified in requirements)
const MAX_PICKS = 4 // Maximum number of picks
const MIN_PICKS = 2 // Minimum number of picks

/**
 * Generate daily predictions using the API Football data
 */
export async function generateDailyPredictions(): Promise<PredictionResult> {
  console.log('Starting daily prediction generation using API Football...')
  
  try {
    // Step 1: Fetch today's fixtures from the API Football endpoint
    console.log('Fetching today\'s fixtures from API Football...')
    
    // First get fixtures from football-data API (our existing source)
    const footballDataFixtures = await import('./football-data').then(mod => mod.getTodaysFixtures())
    console.log(`Found ${footballDataFixtures.length} fixtures from football-data API`)
    
    // Then get fixtures from League One using API Football
    const leagueOneFixtures = await getLeagueOneFixtures()
    console.log(`Found ${leagueOneFixtures.length} League One fixtures from API Football`)
    
    // Convert League One fixtures to the same format as football-data fixtures
    const convertedLeagueOneFixtures = leagueOneFixtures.map(fixture => 
      convertApiFootballFixture(fixture, null)
    )
    
    // Combine both sources, avoiding duplicates by using a Map with team names as keys
    const fixturesMap = new Map()
    
    // Add football-data fixtures to the map
    footballDataFixtures.forEach(fixture => {
      const key = `${fixture.homeTeam.name}-${fixture.awayTeam.name}`
      fixturesMap.set(key, fixture)
    })
    
    // Add League One fixtures, potentially overwriting duplicates
    convertedLeagueOneFixtures.forEach(fixture => {
      const key = `${fixture.homeTeam.name}-${fixture.awayTeam.name}`
      if (!fixturesMap.has(key)) {
        fixturesMap.set(key, fixture)
      }
    })
    
    // Convert map back to array
    const combinedFixtures = Array.from(fixturesMap.values())
    console.log(`Combined total: ${combinedFixtures.length} unique fixtures`)
    
    // Step 2: Fetch odds data for ONLY our collected fixtures using API Football
    // This is more efficient with the 100 daily API call limit
    console.log('Fetching odds data from API Football only for our collected fixtures...')
    
    // Extract IDs from League One fixtures (we already have these from api-football)
    const leagueOneIds = leagueOneFixtures.map(fixture => fixture.fixture.id)
    
    // For football-data fixtures, we need to find corresponding fixtures in api-football
    // To avoid excessive API calls, we'll only get odds for fixtures we already know about
    
    // First, create a map of all fixtures by teams for lookup
    const fixturesByTeams = new Map()
    
    // Add League One fixtures to the map
    leagueOneFixtures.forEach(fixture => {
      const key = `${fixture.teams.home.name}-${fixture.teams.away.name}`
      fixturesByTeams.set(key, {
        id: fixture.fixture.id,
        fixture: fixture
      })
    })
    
    // Get odds for each fixture we have
    console.log(`Fetching odds for ${combinedFixtures.length} fixtures...`)
    
    const oddsMap = new Map()
    let oddsRequestCount = 0
    
    for (const fixture of combinedFixtures) {
      const key = `${fixture.homeTeam.name}-${fixture.awayTeam.name}`
      
      // Check if we have this fixture in our League One fixtures (direct ID)
      const apiFootballFixture = fixturesByTeams.get(key)
      
      if (apiFootballFixture) {
        // We have this fixture from api-football already, get odds for it
        const fixtureId = apiFootballFixture.id
        const oddsData = await getOddsForFixture(fixtureId)
        oddsMap.set(key, oddsData)
        oddsRequestCount++
        
        // Small delay to respect API rate limits
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }
    
    console.log(`Made ${oddsRequestCount} odds API requests to api-football.com`)
    
    // Step 3: Process each fixture
    const processedFixtures: ProcessedFixture[] = []
    
    for (const fixture of combinedFixtures) {
      try {
        console.log(`Processing: ${fixture.homeTeam.name} vs ${fixture.awayTeam.name}`)
        
        // Find matching odds
        const key = `${fixture.homeTeam.name}-${fixture.awayTeam.name}`
        const matchingOdds = oddsMap.get(key)
        
        if (!matchingOdds) {
          console.log(`No odds found for ${fixture.homeTeam.name} vs ${fixture.awayTeam.name}`)
          continue
        }
        
        // Get best odds for this fixture
        const oddsData = getBestOddsForFixture(matchingOdds)
        if (!oddsData) {
          console.log(`No valid odds data for ${fixture.homeTeam.name} vs ${fixture.awayTeam.name}`)
          continue
        }
        
        console.log(`Odds for ${fixture.homeTeam.name} vs ${fixture.awayTeam.name}:`, {
          homeOdds: oddsData.homeOdds,
          awayOdds: oddsData.awayOdds,
          homeProbability: oddsData.homeProbability,
          awayProbability: oddsData.awayProbability,
          bookmaker: oddsData.bookmaker
        })
        
        // Get standings data for gap calculation
        const standings = await getCompetitionStandings(fixture.competition.code)
        const standingsGap = getStandingsGap(fixture.homeTeam.name, fixture.awayTeam.name, standings)
        
        // Get team form data
        const [homeForm, awayForm] = await Promise.all([
          getTeamForm(fixture.homeTeam.id, true),
          getTeamForm(fixture.awayTeam.id, false)
        ])
        
        // Determine predicted outcome and win probability
        // For this implementation, we're focusing on home wins only as per the requirement
        const predictedOutcome = 'HOME'
        const winProbability = oddsData.homeProbability
        
        // Create processed fixture
        const processedFixture: ProcessedFixture = {
          externalId: fixture.id.toString(),
          homeTeam: fixture.homeTeam.name,
          awayTeam: fixture.awayTeam.name,
          league: fixture.competition.name,
          kickoffTime: fixture.utcDate,
          homeOdds: oddsData.homeOdds,
          drawOdds: oddsData.drawOdds,
          awayOdds: oddsData.awayOdds,
          homeProbability: oddsData.homeProbability,
          awayProbability: oddsData.awayProbability,
          predictedOutcome,
          winProbability,
          standingsGap,
          homeForm,
          awayForm,
          confidence: getConfidenceLevel(winProbability),
          bookmaker: oddsData.bookmaker
        }
        
        processedFixtures.push(processedFixture)
        console.log(`Processed: ${processedFixture.homeTeam} vs ${processedFixture.awayTeam}`)
        console.log(`  Prediction: ${processedFixture.predictedOutcome} win - ${(processedFixture.winProbability * 100).toFixed(1)}%`)
        console.log(`  Home: ${(processedFixture.homeProbability * 100).toFixed(1)}% | Away: ${(processedFixture.awayProbability * 100).toFixed(1)}%`)
        
      } catch (error) {
        console.error(`Error processing fixture ${fixture.homeTeam.name} vs ${fixture.awayTeam.name}:`, error)
      }
    }
    
    // Step 4: Filter for fixtures where home win probability is >= 40%
    const qualifyingFixtures = processedFixtures.filter(fixture =>
      fixture.homeProbability >= WIN_PROBABILITY_THRESHOLD
    )
    
    console.log(`${qualifyingFixtures.length} fixtures meet the ${WIN_PROBABILITY_THRESHOLD * 100}% home win probability threshold`)
    
    // Step 5: Rank fixtures by home win probability
    const rankedFixtures = qualifyingFixtures.sort((a, b) => {
      // Primary: Home win probability (descending)
      if (a.homeProbability !== b.homeProbability) {
        return b.homeProbability - a.homeProbability
      }
      
      // Secondary: Standings gap (descending - higher gap is better)
      if (a.standingsGap !== b.standingsGap) {
        return b.standingsGap - a.standingsGap
      }
      
      // Tertiary: Home form quality (count wins)
      const aWins = (a.homeForm.match(/W/g) || []).length
      const bWins = (b.homeForm.match(/W/g) || []).length
      return bWins - aWins
    })
    
    // Step 6: Select top picks (up to MAX_PICKS)
    let selectedPicks: ProcessedFixture[] = []
    
    if (rankedFixtures.length >= MIN_PICKS) {
      selectedPicks = rankedFixtures.slice(0, Math.min(MAX_PICKS, rankedFixtures.length))
      console.log(`Selected ${selectedPicks.length} picks`)
    } else {
      console.log(`Only ${rankedFixtures.length} qualifying fixtures found, minimum is ${MIN_PICKS}`)
    }
    
    const result: PredictionResult = {
      fixtures: processedFixtures,
      selectedPicks,
      stats: {
        totalFixtures: combinedFixtures.length,
        fixturesWithOdds: processedFixtures.length,
        qualifyingFixtures: qualifyingFixtures.length,
        selectedPicks: selectedPicks.length
      }
    }
    
    console.log('=== PREDICTION SUMMARY (API Football) ===')
    console.log(`📊 Total fixtures found: ${result.stats.totalFixtures}`)
    console.log(`🎯 Fixtures with odds: ${result.stats.fixturesWithOdds}`)
    console.log(`✅ Qualifying fixtures (≥${WIN_PROBABILITY_THRESHOLD * 100}% home win probability): ${result.stats.qualifyingFixtures}`)
    console.log(`🏆 Selected picks: ${result.stats.selectedPicks}`)
    
    if (result.selectedPicks.length > 0) {
      console.log('📋 Selected picks:')
      result.selectedPicks.forEach((pick, index) => {
        console.log(`  ${index + 1}. ${pick.homeTeam} vs ${pick.awayTeam} (${pick.league})`)
        console.log(`     Prediction: ${pick.predictedOutcome} win - ${(pick.winProbability * 100).toFixed(1)}% | Confidence: ${pick.confidence}`)
        console.log(`     Home: ${(pick.homeProbability * 100).toFixed(1)}% | Away: ${(pick.awayProbability * 100).toFixed(1)}%`)
        console.log(`     Odds: H${pick.homeOdds} D${pick.drawOdds} A${pick.awayOdds} | Gap: +${pick.standingsGap}`)
      })
    }
    console.log('========================')
    
    return result
    
  } catch (error) {
    console.error('Error in generateDailyPredictions (API Football):', error)
    throw error
  }
}

/**
 * Calculate a form score based on recent results
 */
export function calculateFormScore(form: string): number {
  // Calculate a simple form score: W=3, D=1, L=0, N=1 (neutral)
  let score = 0
  for (const char of form) {
    switch (char) {
      case 'W': score += 3; break
      case 'D': score += 1; break
      case 'L': score += 0; break
      case 'N': score += 1; break // Neutral when data unavailable
    }
  }
  return score
}

/**
 * Get a qualitative assessment of form
 */
export function getFormQuality(form: string): 'Excellent' | 'Good' | 'Average' | 'Poor' {
  const score = calculateFormScore(form)
  if (score >= 12) return 'Excellent' // 4+ wins
  if (score >= 9) return 'Good'       // 3 wins
  if (score >= 6) return 'Average'    // 2 wins or mixed
  return 'Poor'                       // 0-1 wins
}

/**
 * Validate prediction data
 */
export function validatePredictionData(fixture: ProcessedFixture): boolean {
  // Basic validation checks
  if (!fixture.homeTeam || !fixture.awayTeam) return false
  if (!fixture.league || !fixture.kickoffTime) return false
  if (fixture.homeProbability < 0 || fixture.homeProbability > 1) return false
  if (fixture.awayProbability < 0 || fixture.awayProbability > 1) return false
  if (fixture.winProbability < 0 || fixture.winProbability > 1) return false
  if (fixture.homeOdds <= 1 || fixture.drawOdds <= 1 || fixture.awayOdds <= 1) return false
  if (!['HOME', 'AWAY'].includes(fixture.predictedOutcome)) return false

  return true
}