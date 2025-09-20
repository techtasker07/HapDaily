import axios from 'axios'
import * as cheerio from 'cheerio'
import https from 'https'

export interface StatareaFixture {
  id: string
  homeTeam: string
  awayTeam: string
  league: string
  kickoffTime: string
  homeWinningPercentage: number
  awayWinningPercentage: number
  selectedTeam: 'HOME' | 'AWAY'
  winningPercentage: number
}

export interface ScrapingResult {
  fixtures: StatareaFixture[]
  stats: {
    totalFixtures: number
    qualifyingFixtures: number
    selectedFixtures: number
  }
}

const STAT_AREA_BASE_URL = 'https://old.statarea.com/predictions/' + new Date().toISOString().split('T')[0]

/**
 * Scrape fixtures from Statarea and filter by winning percentage
 */
export async function scrapeStatareaFixtures(): Promise<ScrapingResult> {
  try {
    console.log('Starting Statarea scraping...')

    // Fetch the main page
    const response = await axios.get(STAT_AREA_BASE_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      })
    })

    const $ = cheerio.load(response.data)
    const fixtures: StatareaFixture[] = []

    console.log('Parsing fixtures from Statarea...')

    // Parse fixtures from the page
    // Updated selectors based on typical Statarea structure
    $('table tbody tr').each((index, element) => {
      try {
        const $element = $(element)

        // Statarea typically has 7-8 columns: time, home, away, 1, X, 2, percentages
        const cells = $element.find('td')
        if (cells.length < 7) return // Skip if not enough columns

        // Extract time (first column)
        const timeText = $(cells[0]).text().trim()
        if (!timeText) return

        // Extract teams (second and third columns)
        const homeTeam = $(cells[1]).text().trim()
        const awayTeam = $(cells[2]).text().trim()

        if (!homeTeam || !awayTeam) return // Skip if teams not found

        // Extract odds (columns 3,4,5 for 1,X,2)
        const homeOdds = parseFloat($(cells[3]).text().trim()) || 0
        const drawOdds = parseFloat($(cells[4]).text().trim()) || 0
        const awayOdds = parseFloat($(cells[5]).text().trim()) || 0

        // Extract winning percentages (last columns, typically 6 and 7)
        const homeWinPercentText = $(cells[6]).text().trim()
        const awayWinPercentText = $(cells[7]).text().trim()

        // Parse percentages (remove % and convert to number)
        const homeWinningPercentage = parseFloat(homeWinPercentText.replace('%', '').replace(',', '.')) || 0
        const awayWinningPercentage = parseFloat(awayWinPercentText.replace('%', '').replace(',', '.')) || 0

        // Extract league from page title or assume based on URL
        const league = 'Various Leagues' // Could be extracted from page if available

        const kickoffTime = parseTime(timeText)

        // Only include if at least one team has >=60% winning percentage
        if (homeWinningPercentage < 60 && awayWinningPercentage < 60) return

        // Create fixture object with unique ID using timestamp to avoid duplicates
        const uniqueId = `${homeTeam.replace(/\s+/g, '-')}-${awayTeam.replace(/\s+/g, '-')}-${timeText.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
        const fixture: StatareaFixture = {
          id: uniqueId,
          homeTeam,
          awayTeam,
          league,
          kickoffTime,
          homeWinningPercentage,
          awayWinningPercentage,
          selectedTeam: homeWinningPercentage >= awayWinningPercentage ? 'HOME' : 'AWAY',
          winningPercentage: Math.max(homeWinningPercentage, awayWinningPercentage)
        }

        fixtures.push(fixture)
        console.log(`Parsed fixture: ${homeTeam} vs ${awayTeam} (${fixture.winningPercentage}% win rate)`)

      } catch (error) {
        console.error(`Error parsing fixture ${index}:`, error)
      }
    })

    console.log(`Found ${fixtures.length} qualifying fixtures from Statarea (already filtered ≥60%)`)

    // Sort by winning percentage (descending)
    const sortedFixtures = fixtures.sort((a, b) =>
      b.winningPercentage - a.winningPercentage
    )

    // Select up to 8 fixtures, ensuring minimum 3
    const maxFixtures = 8
    const minFixtures = 3
    let selectedFixtures: StatareaFixture[] = []

    if (sortedFixtures.length >= minFixtures) {
      selectedFixtures = sortedFixtures.slice(0, Math.min(maxFixtures, sortedFixtures.length))
      console.log(`Selected ${selectedFixtures.length} fixtures`)
    } else {
      console.log(`Only ${sortedFixtures.length} qualifying fixtures found, minimum is ${minFixtures}`)
    }

    const result: ScrapingResult = {
      fixtures: selectedFixtures,
      stats: {
        totalFixtures: fixtures.length,
        qualifyingFixtures: fixtures.length, // All fixtures are already qualifying
        selectedFixtures: selectedFixtures.length
      }
    }

    console.log('=== STAT_AREA SCRAPING SUMMARY ===')
    console.log(`📊 Total fixtures scraped: ${result.stats.totalFixtures}`)
    console.log(`✅ Qualifying fixtures (≥60% win rate): ${result.stats.qualifyingFixtures}`)
    console.log(`🏆 Selected fixtures: ${result.stats.selectedFixtures}`)
    console.log('==================================')

    return result

  } catch (error) {
    console.error('Error scraping Statarea:', error)
    throw new Error(`Failed to scrape Statarea: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Parse time string into ISO format
 */
function parseTime(timeText: string): string {
  try {
    // Clean the time text
    const cleanTime = timeText.trim().replace(/\s+/g, '')

    // If time is already in a parseable format, use it
    if (cleanTime.includes('T') || cleanTime.includes('/')) {
      return new Date(cleanTime).toISOString()
    }

    // Handle formats like "15:30", "15.30", "1530"
    let hours: number, minutes: number

    if (cleanTime.includes(':')) {
      [hours, minutes] = cleanTime.split(':').map(Number)
    } else if (cleanTime.includes('.')) {
      [hours, minutes] = cleanTime.split('.').map(Number)
    } else if (cleanTime.length === 4) {
      // Format like "1530"
      hours = parseInt(cleanTime.substring(0, 2))
      minutes = parseInt(cleanTime.substring(2, 4))
    } else {
      throw new Error('Invalid time format')
    }

    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      throw new Error('Invalid time values')
    }

    // Assume today's date if only time is provided
    const today = new Date()
    today.setHours(hours, minutes, 0, 0)
    return today.toISOString()
  } catch (error) {
    console.error('Error parsing time:', timeText, error)
    return new Date().toISOString()
  }
}

/**
 * Validate scraping result
 */
export function validateScrapingResult(result: ScrapingResult): boolean {
  if (!result.fixtures || !Array.isArray(result.fixtures)) return false
  if (!result.stats || typeof result.stats !== 'object') return false

  // Check if all selected fixtures have required fields
  for (const fixture of result.fixtures) {
    if (!fixture.homeTeam || !fixture.awayTeam || !fixture.league) return false
    if (fixture.winningPercentage < 60) return false
  }

  return true
}