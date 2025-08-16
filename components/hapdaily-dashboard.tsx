"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CalendarDays, TrendingUp, Target, Clock, RefreshCw, Trophy, Users, BarChart3 } from "lucide-react"

interface Pick {
  id: string
  homeTeam: string
  awayTeam: string
  league: string
  kickoffTime: string
  homeProbability: number
  homeOdds: number
  awayOdds: number
  drawOdds: number
  standingsGap: number
  homeForm: string
  awayForm: string
  confidence: "High" | "Very High" | "Extreme"
}

interface Fixture {
  id: string
  homeTeam: string
  awayTeam: string
  league: string
  kickoffTime: string
  status: string
  hasOdds: boolean
  homeProbability?: number
}

export function HapDailyDashboard() {
  const [picks, setPicks] = useState<Pick[]>([])
  const [fixtures, setFixtures] = useState<Fixture[]>([])
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [apiStatus, setApiStatus] = useState({
    footballData: { success: false, error: null as string | null },
    oddsApi: { success: false, error: null as string | null }
  })
  const [stats, setStats] = useState({
    totalPicks: 0,
    totalFixtures: 0,
    qualifyingFixtures: 0,
    averageProbability: 0
  })

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/dashboard-data')
      const data = await response.json()

      if (data.success) {
        setPicks(data.picks || [])
        setFixtures(data.fixtures || [])
        setStats(data.stats || stats)
        setApiStatus(data.apiStatus || apiStatus)
        setLastUpdated(new Date(data.lastUpdated))
      } else {
        console.error('Failed to fetch dashboard data:', data.error)
        setPicks([])
        setFixtures([])
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      setPicks([])
      setFixtures([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const refreshData = async () => {
    await fetchDashboardData()
  }

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case "Extreme":
        return "bg-green-500 hover:bg-green-600"
      case "Very High":
        return "bg-blue-500 hover:bg-blue-600"
      case "High":
        return "bg-orange-500 hover:bg-orange-600"
      default:
        return "bg-gray-500 hover:bg-gray-600"
    }
  }

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
  }

  const formatForm = (form: string) => {
    return form.split("").map((result, index) => (
      <span
        key={index}
        className={`inline-block w-4 h-4 rounded-full text-xs font-bold text-white text-center leading-4 mr-1 ${
          result === "W" ? "bg-green-500" : result === "D" ? "bg-yellow-500" : "bg-red-500"
        }`}
      >
        {result}
      </span>
    ))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-lg">
                <Trophy className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">HapDaily</h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">AI-Powered Soccer Predictions</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {lastUpdated && (
                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Updated {lastUpdated.toLocaleTimeString()}
                </div>
              )}
              <Button onClick={refreshData} disabled={loading} size="sm" className="flex items-center gap-2">
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-lg">
                  <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Today's Picks</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalPicks}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 dark:bg-green-900 p-2 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Avg Probability</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {Math.round(stats.averageProbability * 100)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 dark:bg-purple-900 p-2 rounded-lg">
                  <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Fixtures</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {stats.totalFixtures}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="bg-orange-100 dark:bg-orange-900 p-2 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Qualifying</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {stats.qualifyingFixtures}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* API Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card className={`border-l-4 ${apiStatus.footballData.success ? 'border-l-green-500' : 'border-l-red-500'}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Football Data API</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {apiStatus.footballData.success ? `${apiStatus.footballData.count} fixtures` : 'Failed'}
                  </p>
                </div>
                <div className={`w-3 h-3 rounded-full ${apiStatus.footballData.success ? 'bg-green-500' : 'bg-red-500'}`} />
              </div>
              {apiStatus.footballData.error && (
                <p className="text-xs text-red-600 mt-1">{apiStatus.footballData.error}</p>
              )}
            </CardContent>
          </Card>

          <Card className={`border-l-4 ${apiStatus.oddsApi.success ? 'border-l-green-500' : 'border-l-red-500'}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Odds API</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {apiStatus.oddsApi.success ? `${apiStatus.oddsApi.count} events` : 'Failed'}
                  </p>
                </div>
                <div className={`w-3 h-3 rounded-full ${apiStatus.oddsApi.success ? 'bg-green-500' : 'bg-red-500'}`} />
              </div>
              {apiStatus.oddsApi.error && (
                <p className="text-xs text-red-600 mt-1">{apiStatus.oddsApi.error}</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Content - Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Fixtures Table */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5" />
                  Today's Fixtures ({fixtures.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Match</TableHead>
                        <TableHead>League</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Odds</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fixtures.map((fixture) => (
                        <TableRow key={fixture.id}>
                          <TableCell className="text-xs">
                            {new Date(fixture.kickoffTime).toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: false,
                            })}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div className="font-medium">{fixture.homeTeam}</div>
                              <div className="text-slate-600 dark:text-slate-400">vs {fixture.awayTeam}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">{fixture.league}</TableCell>
                          <TableCell>
                            <Badge variant={fixture.status === 'TIMED' ? 'default' : 'secondary'} className="text-xs">
                              {fixture.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className={`w-2 h-2 rounded-full ${fixture.hasOdds ? 'bg-green-500' : 'bg-gray-300'}`} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Selected Picks */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Selected Picks ({picks.length})
                </CardTitle>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  High-probability home wins (≥40% confidence - testing)
                </p>
              </CardHeader>
              <CardContent>

                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mb-2"></div>
                        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-2/3"></div>
                      </div>
                    ))}
                  </div>
                ) : picks.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="bg-slate-100 dark:bg-slate-800 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                      <Target className="h-6 w-6 text-slate-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">No Confident Picks</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      No matches meet our ≥40% confidence threshold today.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {picks.map((pick, index) => (
                      <Card key={pick.id} className="hover:shadow-md transition-shadow duration-200">
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            {/* Header */}
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <Badge className={getConfidenceColor(pick.confidence)} size="sm">
                                  {pick.confidence}
                                </Badge>
                                <h4 className="font-semibold text-sm text-slate-900 dark:text-white mt-1 leading-tight">
                                  {pick.homeTeam}
                                  <span className="text-slate-600 dark:text-slate-400 font-normal"> vs </span>
                                  {pick.awayTeam}
                                </h4>
                                <p className="text-xs text-slate-600 dark:text-slate-400">
                                  {formatTime(pick.kickoffTime)} • {pick.league}
                                </p>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-bold text-green-600 dark:text-green-400">
                                  {Math.round(pick.homeProbability * 100)}%
                                </div>
                              </div>
                            </div>

                            {/* Odds */}
                            <div className="grid grid-cols-3 gap-1 text-center text-xs">
                              <div className="bg-green-50 dark:bg-green-900/20 rounded p-1">
                                <div className="text-slate-600 dark:text-slate-400">H</div>
                                <div className="font-semibold text-green-700 dark:text-green-400">{pick.homeOdds}</div>
                              </div>
                              <div className="bg-slate-50 dark:bg-slate-800 rounded p-1">
                                <div className="text-slate-600 dark:text-slate-400">D</div>
                                <div className="font-semibold">{pick.drawOdds}</div>
                              </div>
                              <div className="bg-slate-50 dark:bg-slate-800 rounded p-1">
                                <div className="text-slate-600 dark:text-slate-400">A</div>
                                <div className="font-semibold">{pick.awayOdds}</div>
                              </div>
                            </div>

                            {/* Form */}
                            <div className="text-xs">
                              <div className="flex justify-between items-center">
                                <span className="text-slate-600 dark:text-slate-400">Form:</span>
                                <div className="flex gap-1">
                                  {formatForm(pick.homeForm)}
                                </div>
                              </div>
                              <div className="flex justify-between items-center mt-1">
                                <span className="text-slate-600 dark:text-slate-400">Gap:</span>
                                <span>+{pick.standingsGap}</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-12 text-center">
          <Card className="bg-slate-50 dark:bg-slate-800/50">
            <CardContent className="p-6">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">How It Works</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                Our AI analyzes live odds from multiple bookmakers, team standings, recent form, and statistical models
                to identify the most confident home win predictions. Only matches with ≥40% probability are selected (testing mode).
              </p>
              <div className="flex flex-wrap justify-center gap-4 mt-4 text-xs text-slate-500 dark:text-slate-400">
                <span>• Data from Football-Data.org</span>
                <span>• Odds from The Odds API</span>
                <span>• Updated twice daily</span>
                <span>• AI-powered analysis</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
