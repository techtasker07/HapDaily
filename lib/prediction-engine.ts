import { getTodaysFixtures, getCompetitionStandings, getTeamForm, getStandingsGap } from './football-data'
import { getAllRapidApiOdds, getBestRapidApiOddsForEvent, getConfidenceLevel } from './rapidapi-odds'
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

const WIN_PROBABILITY_THRESHOLD = 0.80 // 80% minimum probability for home OR away win
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
    console.log('📊 Fetching odds data from RapidAPI...')
    const oddsEvents = await getAllRapidApiOdds()
    console.log(`Found ${oddsEvents.length} RapidAPI odds events`)
    
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
        const oddsData = getBestRapidApiOddsForEvent(matchingOddsEvent)
        if (!oddsData) {
          console.log(`No valid RapidAPI odds data for ${fixture.homeTeam.name} vs ${fixture.awayTeam.name}`)
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
        const predictedOutcome = oddsData.homeProbability >= oddsData.awayProbability ? 'HOME' : 'AWAY'
        const winProbability = Math.max(oddsData.homeProbability, oddsData.awayProbability)

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
    
    // Step 4: Filter and rank fixtures
    const qualifyingFixtures = processedFixtures.filter(fixture =>
      fixture.winProbability >= WIN_PROBABILITY_THRESHOLD
    )

    console.log(`${qualifyingFixtures.length} fixtures meet the ${WIN_PROBABILITY_THRESHOLD * 100}% win probability threshold`)
    
    // Step 5: Rank by win probability, then standings gap, then form
    const rankedFixtures = qualifyingFixtures.sort((a, b) => {
      // Primary: Win probability (descending)
      if (a.winProbability !== b.winProbability) {
        return b.winProbability - a.winProbability
      }

      // Secondary: Standings gap (descending - higher gap is better)
      if (a.standingsGap !== b.standingsGap) {
        return b.standingsGap - a.standingsGap
      }

      // Tertiary: Form quality (count wins for the predicted team)
      const aWins = a.predictedOutcome === 'HOME'
        ? (a.homeForm.match(/W/g) || []).length
        : (a.awayForm.match(/W/g) || []).length
      const bWins = b.predictedOutcome === 'HOME'
        ? (b.homeForm.match(/W/g) || []).length
        : (b.awayForm.match(/W/g) || []).length
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
    
    console.log('=== PREDICTION SUMMARY ===')
    console.log(`📊 Total fixtures found: ${result.stats.totalFixtures}`)
    console.log(`🎯 Fixtures with odds: ${result.stats.fixturesWithOdds}`)
    console.log(`✅ Qualifying fixtures (≥${WIN_PROBABILITY_THRESHOLD * 100}% win probability): ${result.stats.qualifyingFixtures}`)
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
  if (fixture.awayProbability < 0 || fixture.awayProbability > 1) return false
  if (fixture.winProbability < 0 || fixture.winProbability > 1) return false
  if (fixture.homeOdds <= 1 || fixture.drawOdds <= 1 || fixture.awayOdds <= 1) return false
  if (!['HOME', 'AWAY'].includes(fixture.predictedOutcome)) return false

  return true
}
