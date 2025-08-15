"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
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

export function HapDailyDashboard() {
  const [picks, setPicks] = useState<Pick[]>([])
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [stats, setStats] = useState({
    totalPicks: 0,
    totalFixtures: 0,
    qualifyingFixtures: 0,
    averageProbability: 0
  })

  const fetchPicks = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/picks')
      const data = await response.json()

      if (data.success) {
        setPicks(data.picks || [])
        setStats(data.stats || stats)
        setLastUpdated(new Date(data.lastUpdated))
      } else {
        console.error('Failed to fetch picks:', data.error)
        setPicks([])
      }
    } catch (error) {
      console.error('Error fetching picks:', error)
      setPicks([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPicks()
  }, [])

  const refreshPicks = async () => {
    try {
      setLoading(true)

      // Trigger a refresh of the data
      const refreshResponse = await fetch('/api/picks', { method: 'POST' })
      const refreshData = await refreshResponse.json()

      if (refreshData.success) {
        // Wait a moment for the refresh to complete, then fetch new data
        setTimeout(() => {
          fetchPicks()
        }, 2000)
      } else {
        console.error('Failed to refresh picks:', refreshData.error)
        setLoading(false)
      }
    } catch (error) {
      console.error('Error refreshing picks:', error)
      setLoading(false)
    }
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
              <Button onClick={refreshPicks} disabled={loading} size="sm" className="flex items-center gap-2">
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

        {/* Main Content */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Today's Best Picks</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                High-probability home wins (≥80% confidence)
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <CalendarDays className="h-4 w-4" />
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                      <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded"></div>
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : picks.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="bg-slate-100 dark:bg-slate-800 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Target className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No Confident Picks Today</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  No matches meet our ≥80% confidence threshold today. Check back later!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {picks.map((pick, index) => (
                <Card key={pick.id} className="hover:shadow-lg transition-shadow duration-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">
                            {pick.league}
                          </Badge>
                          <Badge className={`text-xs text-white ${getConfidenceColor(pick.confidence)}`}>
                            {pick.confidence}
                          </Badge>
                        </div>
                        <CardTitle className="text-lg sm:text-xl leading-tight">
                          <span className="font-bold text-green-600 dark:text-green-400">{pick.homeTeam}</span>
                          <span className="text-slate-500 dark:text-slate-400 mx-2">vs</span>
                          <span className="font-medium">{pick.awayTeam}</span>
                        </CardTitle>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">
                          {Math.round(pick.homeProbability * 100)}%
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{formatTime(pick.kickoffTime)}</div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      {/* Odds */}
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded">
                          <div className="text-xs text-slate-600 dark:text-slate-400">Home</div>
                          <div className="font-bold text-green-600 dark:text-green-400">{pick.homeOdds.toFixed(2)}</div>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded">
                          <div className="text-xs text-slate-600 dark:text-slate-400">Draw</div>
                          <div className="font-bold">{pick.drawOdds.toFixed(2)}</div>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded">
                          <div className="text-xs text-slate-600 dark:text-slate-400">Away</div>
                          <div className="font-bold">{pick.awayOdds.toFixed(2)}</div>
                        </div>
                      </div>

                      <Separator />

                      {/* Form and Stats */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">Home Form (Last 5)</div>
                          <div className="flex items-center">{formatForm(pick.homeForm)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">Away Form (Last 5)</div>
                          <div className="flex items-center">{formatForm(pick.awayForm)}</div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-xs text-slate-600 dark:text-slate-400">
                        <span>Standings Gap: +{pick.standingsGap} positions</span>
                        <span>Pick #{index + 1}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-12 text-center">
          <Card className="bg-slate-50 dark:bg-slate-800/50">
            <CardContent className="p-6">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">How It Works</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                Our AI analyzes live odds from multiple bookmakers, team standings, recent form, and statistical models
                to identify the most confident home win predictions. Only matches with ≥80% probability are selected.
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
