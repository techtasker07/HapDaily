"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

  // Update a fixture's odds
  const updateOdds = (id: number, field: 'homeOdds' | 'drawOdds' | 'awayOdds', value: string) => {
    setFixtures(fixtures.map(fixture => 
      fixture.id === id 
        ? { ...fixture, [field]: value ? parseFloat(value) : null } 
        : fixture
    ))
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
      
      <Tabs defaultValue="fixtures">
        <TabsList className="mb-4">
          <TabsTrigger value="fixtures">Enter Odds</TabsTrigger>
          <TabsTrigger value="predictions">View Predictions</TabsTrigger>
        </TabsList>
        
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