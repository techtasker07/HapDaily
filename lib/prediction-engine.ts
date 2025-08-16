import { getTodaysFixtures, getCompetitionStandings, getTeamForm, getStandingsGap } from './football-data'
import { getAllTodaysOdds, getBestOddsForEvent, getConfidenceLevel } from './odds-api'
import { matchFixtureWithOdds } from './team-matcher'

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

const HOME_WIN_THRESHOLD = 0.40 // 40% minimum probability (testing)
const MAX_PICKS = 4
const MIN_PICKS = 2

export async function generateDailyPredictions(): Promise<PredictionResult> {
  console.log('Starting daily prediction generation...')
  
  try {
    // Step 1: Fetch today's fixtures
    console.log('Fetching today\'s fixtures...')
    const fixtures = await getTodaysFixtures()
    console.log(`Found ${fixtures.length} fixtures`)
    
    // Step 2: Fetch odds for all events
    console.log('Fetching odds data...')
    const oddsEvents = await getAllTodaysOdds()
    console.log(`Found ${oddsEvents.length} odds events`)
    
    // Step 3: Process each fixture
    const processedFixtures: ProcessedFixture[] = []
    
    for (const fixture of fixtures) {
      try {
        console.log(`Processing: ${fixture.homeTeam.name} vs ${fixture.awayTeam.name}`)
        
        // Find matching odds event
        const matchingOddsEvent = matchFixtureWithOdds(fixture, oddsEvents)
        if (!matchingOddsEvent) {
          console.log(`No odds found for ${fixture.homeTeam.name} vs ${fixture.awayTeam.name}`)
          console.log(`Available odds events: ${oddsEvents.length}`)
          if (oddsEvents.length > 0) {
            console.log(`Sample odds event:`, oddsEvents[0])
          }
          continue
        }
        
        // Get best odds for this event
        const oddsData = getBestOddsForEvent(matchingOddsEvent)
        if (!oddsData) {
          console.log(`No valid odds data for ${fixture.homeTeam.name} vs ${fixture.awayTeam.name}`)
          continue
        }

        console.log(`Odds for ${fixture.homeTeam.name} vs ${fixture.awayTeam.name}:`, {
          homeOdds: oddsData.homeOdds,
          homeProbability: oddsData.homeProbability,
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
          standingsGap,
          homeForm,
          awayForm,
          confidence: getConfidenceLevel(oddsData.homeProbability),
          bookmaker: oddsData.bookmaker
        }
        
        processedFixtures.push(processedFixture)
        console.log(`Processed: ${processedFixture.homeTeam} vs ${processedFixture.awayTeam} - ${(processedFixture.homeProbability * 100).toFixed(1)}%`)
        
      } catch (error) {
        console.error(`Error processing fixture ${fixture.homeTeam.name} vs ${fixture.awayTeam.name}:`, error)
      }
    }
    
    // Step 4: Filter and rank fixtures
    const qualifyingFixtures = processedFixtures.filter(fixture => 
      fixture.homeProbability >= HOME_WIN_THRESHOLD
    )
    
    console.log(`${qualifyingFixtures.length} fixtures meet the ${HOME_WIN_THRESHOLD * 100}% threshold`)
    
    // Step 5: Rank by probability, then standings gap, then home form
    const rankedFixtures = qualifyingFixtures.sort((a, b) => {
      // Primary: Home probability (descending)
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
    
    // Step 6: Select top picks
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
        totalFixtures: fixtures.length,
        fixturesWithOdds: processedFixtures.length,
        qualifyingFixtures: qualifyingFixtures.length,
        selectedPicks: selectedPicks.length
      }
    }
    
    console.log('Prediction generation completed:', result.stats)
    return result
    
  } catch (error) {
    console.error('Error in generateDailyPredictions:', error)
    throw error
  }
}

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

export function getFormQuality(form: string): 'Excellent' | 'Good' | 'Average' | 'Poor' {
  const score = calculateFormScore(form)
  if (score >= 12) return 'Excellent' // 4+ wins
  if (score >= 9) return 'Good'       // 3 wins
  if (score >= 6) return 'Average'    // 2 wins or mixed
  return 'Poor'                       // 0-1 wins
}

export function validatePredictionData(fixture: ProcessedFixture): boolean {
  // Basic validation checks
  if (!fixture.homeTeam || !fixture.awayTeam) return false
  if (!fixture.league || !fixture.kickoffTime) return false
  if (fixture.homeProbability < 0 || fixture.homeProbability > 1) return false
  if (fixture.homeOdds <= 1 || fixture.drawOdds <= 1 || fixture.awayOdds <= 1) return false
  
  return true
}
