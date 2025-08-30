"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Fixture {
  id: number
  externalId: string
  homeTeam: string
  awayTeam: string
  league: string
  kickoffTime: string
  homeOdds: number | null
  drawOdds: number | null
  awayOdds: number | null
}

interface JsonFixture {
  home: string
  away: string
  competition: string
  time?: string
  odds: {
    home_win: number | null
    draw: number | null
    away_win: number | null
  }
}

interface Prediction {
  homeTeam: string
  awayTeam: string
  league: string
  homeProbability: number
  confidence: string
}

export default function ManageOddsPage() {
  const [fixtures, setFixtures] = useState<Fixture[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [generating, setGenerating] = useState(false)

  // Fetch fixtures on page load
  useEffect(() => {
    async function fetchFixtures() {
      try {
        setLoading(true)
        setError(null)
        
        // Fetch today's fixtures from the football-data API
        const response = await fetch('/api/fixtures')
        
        if (!response.ok) {
          throw new Error('Failed to fetch fixtures')
        }
        
        const data = await response.json()
        
        if (data.success) {
          setFixtures(data.fixtures)
        } else {
          throw new Error(data.error || 'Unknown error')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load fixtures')
        console.error('Error fetching fixtures:', err)
      } finally {
        setLoading(false)
      }
    }
    
    fetchFixtures()
  }, [])

  const [jsonInput, setJsonInput] = useState<string>('')
  const [jsonError, setJsonError] = useState<string | null>(null)

  // Update a fixture's odds
  const updateOdds = (id: number, field: 'homeOdds' | 'drawOdds' | 'awayOdds', value: string) => {
    setFixtures(prevFixtures => 
      prevFixtures.map(fixture => 
        fixture.id === id 
          ? { ...fixture, [field]: value ? parseFloat(value) : null } 
          : fixture
      )
    )
  }

  // Handle JSON import
  const handleJsonImport = () => {
    try {
      setJsonError(null)
      
      // Parse the JSON input
      let jsonFixtures: JsonFixture[]
      try {
        jsonFixtures = JSON.parse(jsonInput)
      } catch (e) {
        setJsonError("Invalid JSON format. Please check your input.")
        return
      }
      
      // Validate the structure
      if (!Array.isArray(jsonFixtures)) {
        setJsonError("Input must be an array of fixtures")
        return
      }
      
      // Make a copy of the current fixtures
      const updatedFixtures = [...fixtures]
      let matchCount = 0
      
      // For each JSON fixture, try to find a match in our fixtures
      jsonFixtures.forEach(jsonFixture => {
        // Validate the structure
        if (!jsonFixture.home || !jsonFixture.away || !jsonFixture.odds) {
          console.warn("Skipping invalid fixture entry:", jsonFixture)
          return
        }
        
        // Helper function to normalize team names for better matching
        const normalizeTeamName = (name: string): string => {
          return name
            .toLowerCase()
            .replace(/fc$|f\.c\.$|football club$/i, '')  // Remove FC, F.C., Football Club
            .replace(/united$|utd$/i, 'utd')              // Standardize United/Utd
            .replace(/city$/i, '')                        // Remove City
            .replace(/\s+/g, '')                          // Remove all spaces
            .trim()
        }
        
        // Try to find a matching fixture
        const normalizedJsonHome = normalizeTeamName(jsonFixture.home)
        const normalizedJsonAway = normalizeTeamName(jsonFixture.away)
        
        const matchingFixture = updatedFixtures.find(fixture => {
          const normalizedFixtureHome = normalizeTeamName(fixture.homeTeam)
          const normalizedFixtureAway = normalizeTeamName(fixture.awayTeam)
          
          // Check for exact match after normalization
          const exactMatch = 
            normalizedFixtureHome === normalizedJsonHome && 
            normalizedFixtureAway === normalizedJsonAway
          
          // Check for partial match if exact match fails
          const partialMatch = 
            (normalizedFixtureHome.includes(normalizedJsonHome) || 
             normalizedJsonHome.includes(normalizedFixtureHome)) && 
            (normalizedFixtureAway.includes(normalizedJsonAway) || 
             normalizedJsonAway.includes(normalizedFixtureAway))
          
          return exactMatch || partialMatch
        })
        
        if (matchingFixture) {
          // Update odds for the matching fixture
          matchingFixture.homeOdds = jsonFixture.odds.home_win
          matchingFixture.drawOdds = jsonFixture.odds.draw
          matchingFixture.awayOdds = jsonFixture.odds.away_win
          matchCount++
        } else {
          console.warn(`No match found for ${jsonFixture.home} vs ${jsonFixture.away}`)
        }
      })
      
      // Update state with the modified fixtures
      setFixtures(updatedFixtures)
      setSuccessMessage(`Successfully matched and updated odds for ${matchCount} fixtures`)
      
    } catch (error) {
      setJsonError("Error processing JSON input: " + (error instanceof Error ? error.message : String(error)))
      console.error("JSON import error:", error)
    }
  }

  // Save odds for all fixtures
  const saveOdds = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccessMessage(null)
      
      // Filter out fixtures with no odds
      const fixturesWithOdds = fixtures.filter(f => 
        f.homeOdds !== null || f.drawOdds !== null || f.awayOdds !== null
      )
      
      if (fixturesWithOdds.length === 0) {
        setError('No odds have been entered')
        return
      }
      
      const response = await fetch('/api/manual-odds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fixtures: fixturesWithOdds })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save odds')
      }
      
      const data = await response.json()
      
      if (data.success) {
        setSuccessMessage(`Successfully saved odds for ${fixturesWithOdds.length} fixtures`)
      } else {
        throw new Error(data.error || 'Unknown error')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save odds')
      console.error('Error saving odds:', err)
    } finally {
      setSaving(false)
    }
  }

  // Generate predictions based on entered odds
  const generatePredictions = async () => {
    try {
      setGenerating(true)
      setError(null)
      setPredictions([])
      
      const response = await fetch('/api/generate-predictions', {
        method: 'POST'
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate predictions')
      }
      
      const data = await response.json()
      
      if (data.success) {
        setPredictions(data.predictions)
        setSuccessMessage(`Generated ${data.predictions.length} predictions`)
      } else {
        throw new Error(data.error || 'Unknown error')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate predictions')
      console.error('Error generating predictions:', err)
    } finally {
      setGenerating(false)
    }
  }

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Manage Odds</h1>
      
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {successMessage && (
        <Alert className="mb-4 bg-green-50 border-green-200">
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}
      
      <Tabs defaultValue="json-import">
        <TabsList className="mb-4">
          <TabsTrigger value="json-import">JSON Import</TabsTrigger>
          <TabsTrigger value="fixtures">Manual Entry</TabsTrigger>
          <TabsTrigger value="predictions">View Predictions</TabsTrigger>
        </TabsList>
        
        <TabsContent value="json-import">
          <Card>
            <CardHeader>
              <CardTitle>Import Odds Data from JSON</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <p className="text-sm text-gray-500 mb-2">
                  Paste JSON data in the format shown below. The system will match teams by name and update the odds.
                </p>
                <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto mb-4">
{`[
  {
    "home": "Chelsea FC",
    "away": "Fulham FC",
    "competition": "Premier League",
    "odds": {
      "home_win": 1.65,
      "draw": 3.50,
      "away_win": 5.25
    }
  },
  // more fixtures...
]`}
                </pre>
                
                <Textarea 
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  placeholder="Paste JSON data here..."
                  className="min-h-[200px] font-mono"
                />
                
                {jsonError && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertDescription>{jsonError}</AlertDescription>
                  </Alert>
                )}
                
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button onClick={handleJsonImport}>
                    Validate & Import
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setJsonInput('')}
                  >
                    Clear
                  </Button>
                  <Button 
                    onClick={async () => {
                      await saveOdds()
                      await generatePredictions()
                    }}
                    className="bg-blue-600 hover:bg-blue-700 ml-auto"
                  >
                    Save & Generate Predictions
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="fixtures">
          <Card>
            <CardHeader>
              <CardTitle>Today's Fixtures</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p>Loading fixtures...</p>
              ) : fixtures.length === 0 ? (
                <p>No fixtures found for today.</p>
              ) : (
                <>
                  <div className="flex justify-between mb-4">
                    <div>
                      <span className="font-medium">Total Fixtures: </span>
                      {fixtures.length}
                    </div>
                    <Button onClick={saveOdds} disabled={saving}>
                      {saving ? 'Saving...' : 'Save Odds'}
                    </Button>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="p-2 text-left">Time</th>
                          <th className="p-2 text-left">League</th>
                          <th className="p-2 text-left">Match</th>
                          <th className="p-2 text-center">Home Win</th>
                          <th className="p-2 text-center">Draw</th>
                          <th className="p-2 text-center">Away Win</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fixtures.map((fixture) => (
                          <tr key={fixture.id} className="border-b hover:bg-gray-50">
                            <td className="p-2">{formatDate(fixture.kickoffTime)}</td>
                            <td className="p-2">{fixture.league}</td>
                            <td className="p-2">
                              <div className="font-medium">{fixture.homeTeam}</div>
                              <div className="text-gray-500">vs {fixture.awayTeam}</div>
                            </td>
                            <td className="p-2">
                              <Input
                                type="number"
                                step="0.01"
                                min="1"
                                placeholder="1.00"
                                value={fixture.homeOdds?.toString() || ''}
                                onChange={(e) => updateOdds(fixture.id, 'homeOdds', e.target.value)}
                                className="w-20 mx-auto"
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                type="number"
                                step="0.01"
                                min="1"
                                placeholder="1.00"
                                value={fixture.drawOdds?.toString() || ''}
                                onChange={(e) => updateOdds(fixture.id, 'drawOdds', e.target.value)}
                                className="w-20 mx-auto"
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                type="number"
                                step="0.01"
                                min="1"
                                placeholder="1.00"
                                value={fixture.awayOdds?.toString() || ''}
                                onChange={(e) => updateOdds(fixture.id, 'awayOdds', e.target.value)}
                                className="w-20 mx-auto"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="mt-6">
                    <Button onClick={generatePredictions} disabled={generating} className="bg-blue-600 hover:bg-blue-700">
                      {generating ? 'Generating...' : 'Generate Predictions'}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="predictions">
          <Card>
            <CardHeader>
              <CardTitle>Today's Predictions</CardTitle>
            </CardHeader>
            <CardContent>
              {predictions.length === 0 ? (
                <p>No predictions generated yet. Enter odds and click "Generate Predictions".</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {predictions.map((prediction, index) => (
                    <Card key={index} className="overflow-hidden">
                      <div className="bg-blue-600 text-white p-3">
                        <div className="text-sm">{prediction.league}</div>
                        <div className="text-lg font-bold">{prediction.homeTeam}</div>
                        <div className="text-sm">vs {prediction.awayTeam}</div>
                      </div>
                      <CardContent className="p-4">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <div className="text-sm text-gray-500">Win Probability</div>
                            <div className="text-xl font-bold">{Math.round(prediction.homeProbability * 100)}%</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-500">Confidence</div>
                            <div className="text-xl font-bold">{prediction.confidence}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}