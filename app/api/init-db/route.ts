import { NextResponse } from "next/server"
import { supabase } from "@/lib/db"

export async function POST() {
  try {
    console.log('Database schema initialization is managed through Supabase dashboard...')

    return NextResponse.json({
      success: true,
      message: "Database schema should be initialized through Supabase dashboard or SQL editor",
      note: "Supabase handles schema management differently than traditional PostgreSQL",
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error with database initialization:', error)
    return NextResponse.json({
      success: false,
      error: "Failed to initialize database",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    // Check database connection and table status using Supabase
    const expectedTables = ['statarea_picks'] // Main table we're using
    let existingTables = []
    let stats = {}

    // Try to get stats from statarea_picks table
    try {
      const { count: picksCount, error: countError } = await supabase
        .from('statarea_picks')
        .select('*', { count: 'exact', head: true })

      if (!countError) {
        existingTables.push('statarea_picks')
        stats = {
          statarea_picks: picksCount || 0
        }
      }
    } catch (error) {
      console.log('Could not check statarea_picks table:', error)
    }

    const missingTables = expectedTables.filter(table => !existingTables.includes(table))

    return NextResponse.json({
      success: true,
      database_status: {
        existing_tables: existingTables,
        missing_tables: missingTables,
        is_initialized: missingTables.length === 0,
        stats,
        note: "Schema is managed through Supabase dashboard"
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error checking database status:', error)
    return NextResponse.json({
      success: false,
      error: "Failed to check database status",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
