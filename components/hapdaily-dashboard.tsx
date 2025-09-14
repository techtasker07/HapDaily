"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { Loader2, RefreshCw, TrendingUp, Target, Calendar } from "lucide-react"

interface Pick {
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

interface DashboardData {
  success: boolean
  picks: Pick[]
  stats: {
    totalPicks: number
    totalFixtures: number
    qualifyingFixtures: number
    averageWinningPercentage: number
  }
  lastUpdated: string
  message?: string
}

export function HapDailyDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(false)
  const [scraping, setScraping] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/dashboard-data')
      const result = await response.json()
      setData(result)
      setError(null)
    } catch (err) {
      setError('Failed to fetch dashboard data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleScrape = async () => {
    try {
      setScraping(true)
      setError(null)
      const response = await fetch('/api/picks', { method: 'POST' })
      const result = await response.json()

      if (result.success) {
        // Refresh data after scraping
        await fetchData()
      } else {
        setError(result.error || 'Scraping failed')
      }
    } catch (err) {
      setError('Failed to scrape data')
      console.error(err)
    } finally {
      setScraping(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const chartData = data?.picks.map(pick => ({
    match: `${pick.homeTeam} vs ${pick.awayTeam}`,
    percentage: pick.winningPercentage,
    league: pick.league
  })) || []

  const pieData = data?.picks.reduce((acc, pick) => {
    const existing = acc.find(item => item.name === pick.selectedTeam)
    if (existing) {
      existing.value += 1
    } else {
      acc.push({ name: pick.selectedTeam, value: 1 })
    }
    return acc
  }, [] as { name: string; value: number }[]) || []

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042']

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">HapDaily Sports Dashboard</h1>
            <p className="text-gray-600 mt-1">AI-powered football predictions from Statarea</p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={fetchData}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Refresh
            </Button>
            <Button
              onClick={handleScrape}
              disabled={scraping}
              size="sm"
            >
              {scraping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
              Scrape Statarea
            </Button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-700">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        {data?.stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Picks</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.stats.totalPicks}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Win %</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.stats.averageWinningPercentage.toFixed(1)}%</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Qualifying</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.stats.qualifyingFixtures}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  {new Date(data.lastUpdated).toLocaleTimeString()}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Charts */}
        {data?.picks && data.picks.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Winning Percentages</CardTitle>
                <CardDescription>Predicted win percentages for today's matches</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="match"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      fontSize={12}
                    />
                    <YAxis />
                    <Tooltip
                      formatter={(value) => [`${value}%`, 'Win %']}
                      labelFormatter={(label) => `Match: ${label}`}
                    />
                    <Bar dataKey="percentage" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Team Selection Distribution</CardTitle>
                <CardDescription>Home vs Away team selections</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Picks Table */}
        <Card>
          <CardHeader>
            <CardTitle>Today's Picks</CardTitle>
            <CardDescription>
              {data?.message || "AI-selected matches with ≥70% winning percentage"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data?.picks && data.picks.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Match</TableHead>
                    <TableHead>League</TableHead>
                    <TableHead>Kickoff</TableHead>
                    <TableHead>Home %</TableHead>
                    <TableHead>Away %</TableHead>
                    <TableHead>Selected</TableHead>
                    <TableHead>Win %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.picks.map((pick) => (
                    <TableRow key={pick.id}>
                      <TableCell className="font-medium">
                        {pick.homeTeam} vs {pick.awayTeam}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{pick.league}</Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(pick.kickoffTime).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </TableCell>
                      <TableCell>{pick.homeWinningPercentage.toFixed(1)}%</TableCell>
                      <TableCell>{pick.awayWinningPercentage.toFixed(1)}%</TableCell>
                      <TableCell>
                        <Badge
                          variant={pick.selectedTeam === 'HOME' ? 'default' : 'outline'}
                        >
                          {pick.selectedTeam}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold text-green-600">
                        {pick.winningPercentage.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No picks available</p>
                <p className="text-sm">Click "Scrape Statarea" to get today's fixtures</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}