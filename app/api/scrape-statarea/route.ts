import { NextRequest, NextResponse } from 'next/server'
import { scrapeStatareaFixtures } from '@/lib/statarea-scraper'
import { supabase } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    console.log('Starting Statarea scraping API call...')

    // Scrape fixtures
    const result = await scrapeStatareaFixtures()

    // Insert fixtures into database
    if (result.fixtures.length > 0) {
      const fixturesToInsert = result.fixtures.map(fixture => ({
        id: fixture.id,
        home_team: fixture.homeTeam,
        away_team: fixture.awayTeam,
        league: fixture.league,
        kickoff_time: fixture.kickoffTime,
        home_winning_percentage: fixture.homeWinningPercentage,
        away_winning_percentage: fixture.awayWinningPercentage,
        selected_team: fixture.selectedTeam,
        winning_percentage: fixture.winningPercentage
      }))

      const { error } = await supabase
        .from('statarea_picks')
        .upsert(fixturesToInsert, { onConflict: 'id' })

      if (error) {
        console.error('Error inserting fixtures:', error)
        return NextResponse.json(
          { error: 'Failed to save fixtures to database' },
          { status: 500 }
        )
      }

      console.log(`Inserted ${fixturesToInsert.length} fixtures into database`)
    }

    return NextResponse.json({
      success: true,
      data: result
    })

  } catch (error) {
    console.error('Error in scrape-statarea API:', error)
    return NextResponse.json(
      { error: 'Failed to scrape Statarea' },
      { status: 500 }
    )
  }
}