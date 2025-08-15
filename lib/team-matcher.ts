// Common team name variations between Football Data API and Odds API
const TEAM_NAME_MAPPINGS: Record<string, string[]> = {
  // Premier League
  'Arsenal FC': ['Arsenal'],
  'Chelsea FC': ['Chelsea'],
  'Liverpool FC': ['Liverpool'],
  'Manchester City FC': ['Manchester City', 'Man City'],
  'Manchester United FC': ['Manchester United', 'Man United', 'Man Utd'],
  'Tottenham Hotspur FC': ['Tottenham', 'Spurs'],
  'Newcastle United FC': ['Newcastle United', 'Newcastle'],
  'Brighton & Hove Albion FC': ['Brighton', 'Brighton & Hove Albion'],
  'West Ham United FC': ['West Ham United', 'West Ham'],
  'Aston Villa FC': ['Aston Villa'],
  'Crystal Palace FC': ['Crystal Palace'],
  'Fulham FC': ['Fulham'],
  'Wolverhampton Wanderers FC': ['Wolves', 'Wolverhampton'],
  'Everton FC': ['Everton'],
  'Brentford FC': ['Brentford'],
  'Nottingham Forest FC': ['Nottingham Forest', "Nott'm Forest"],
  'Luton Town FC': ['Luton Town', 'Luton'],
  'Burnley FC': ['Burnley'],
  'Sheffield United FC': ['Sheffield United', 'Sheffield Utd'],
  'AFC Bournemouth': ['Bournemouth'],
  
  // La Liga
  'Real Madrid CF': ['Real Madrid'],
  'FC Barcelona': ['Barcelona'],
  'Atlético de Madrid': ['Atletico Madrid', 'Atlético Madrid'],
  'Sevilla FC': ['Sevilla'],
  'Real Sociedad de Fútbol': ['Real Sociedad'],
  'Real Betis Balompié': ['Real Betis'],
  'Villarreal CF': ['Villarreal'],
  'Athletic Bilbao': ['Athletic Club'],
  'Valencia CF': ['Valencia'],
  'RC Celta de Vigo': ['Celta Vigo'],
  'RCD Espanyol de Barcelona': ['Espanyol'],
  'Getafe CF': ['Getafe'],
  'CA Osasuna': ['Osasuna'],
  'Rayo Vallecano de Madrid': ['Rayo Vallecano'],
  'Deportivo Alavés': ['Alaves'],
  'Cádiz CF': ['Cadiz'],
  'RCD Mallorca': ['Mallorca'],
  'UD Las Palmas': ['Las Palmas'],
  'Girona FC': ['Girona'],
  'UD Almería': ['Almeria'],
  
  // Bundesliga
  'FC Bayern München': ['Bayern Munich', 'Bayern München'],
  'Borussia Dortmund': ['Dortmund'],
  'RB Leipzig': ['Leipzig'],
  'Bayer 04 Leverkusen': ['Bayer Leverkusen'],
  'Eintracht Frankfurt': ['Frankfurt'],
  'Borussia Mönchengladbach': ['Monchengladbach', "M'gladbach"],
  'VfL Wolfsburg': ['Wolfsburg'],
  'SC Freiburg': ['Freiburg'],
  'TSG 1899 Hoffenheim': ['Hoffenheim'],
  'FC Augsburg': ['Augsburg'],
  'VfB Stuttgart': ['Stuttgart'],
  '1. FC Union Berlin': ['Union Berlin'],
  'Hertha BSC': ['Hertha Berlin'],
  'FC Schalke 04': ['Schalke'],
  'Werder Bremen': ['Bremen'],
  '1. FC Köln': ['FC Koln', 'Cologne'],
  'VfL Bochum 1848': ['Bochum'],
  'FSV Mainz 05': ['Mainz'],
  
  // Serie A
  'Juventus FC': ['Juventus'],
  'AC Milan': ['Milan'],
  'FC Internazionale Milano': ['Inter Milan', 'Inter'],
  'SSC Napoli': ['Napoli'],
  'AS Roma': ['Roma'],
  'SS Lazio': ['Lazio'],
  'Atalanta BC': ['Atalanta'],
  'ACF Fiorentina': ['Fiorentina'],
  'Torino FC': ['Torino'],
  'Bologna FC 1909': ['Bologna'],
  'UC Sampdoria': ['Sampdoria'],
  'Genoa CFC': ['Genoa'],
  'Udinese Calcio': ['Udinese'],
  'US Sassuolo Calcio': ['Sassuolo'],
  'Hellas Verona FC': ['Hellas Verona', 'Verona'],
  'Cagliari Calcio': ['Cagliari'],
  'US Lecce': ['Lecce'],
  'Empoli FC': ['Empoli'],
  'AC Monza': ['Monza'],
  'Frosinone Calcio': ['Frosinone'],
  
  // Ligue 1
  'Paris Saint-Germain FC': ['Paris Saint Germain', 'PSG'],
  'Olympique de Marseille': ['Marseille'],
  'Olympique Lyonnais': ['Lyon'],
  'AS Monaco FC': ['Monaco'],
  'OGC Nice': ['Nice'],
  'Stade Rennais FC 1901': ['Rennes'],
  'RC Lens': ['Lens'],
  'LOSC Lille': ['Lille'],
  'Stade de Reims': ['Reims'],
  'FC Nantes': ['Nantes'],
  'Montpellier HSC': ['Montpellier'],
  'RC Strasbourg Alsace': ['Strasbourg'],
  'Le Havre AC': ['Le Havre'],
  'FC Metz': ['Metz'],
  'Stade Brestois 29': ['Brest'],
  'Clermont Foot 63': ['Clermont'],
  'FC Lorient': ['Lorient'],
  'Toulouse FC': ['Toulouse']
}

// Create reverse mapping for faster lookup
const REVERSE_MAPPINGS: Record<string, string> = {}
Object.entries(TEAM_NAME_MAPPINGS).forEach(([canonical, variations]) => {
  variations.forEach(variation => {
    REVERSE_MAPPINGS[variation.toLowerCase()] = canonical
  })
  // Also map the canonical name to itself
  REVERSE_MAPPINGS[canonical.toLowerCase()] = canonical
})

export function normalizeTeamName(teamName: string): string {
  const normalized = teamName.toLowerCase()
  return REVERSE_MAPPINGS[normalized] || teamName
}

export function findTeamMatch(footballDataTeam: string, oddsApiTeams: string[]): string | null {
  // First try exact match with normalized names
  const normalizedFootballDataTeam = normalizeTeamName(footballDataTeam)
  
  for (const oddsTeam of oddsApiTeams) {
    const normalizedOddsTeam = normalizeTeamName(oddsTeam)
    if (normalizedFootballDataTeam === normalizedOddsTeam) {
      return oddsTeam
    }
  }
  
  // Try fuzzy matching with similarity score
  let bestMatch: string | null = null
  let bestScore = 0
  
  for (const oddsTeam of oddsApiTeams) {
    const score = calculateSimilarity(footballDataTeam, oddsTeam)
    if (score > bestScore && score > 0.7) { // 70% similarity threshold
      bestScore = score
      bestMatch = oddsTeam
    }
  }
  
  return bestMatch
}

function calculateSimilarity(str1: string, str2: string): number {
  // Simple similarity calculation using Levenshtein distance
  const s1 = str1.toLowerCase()
  const s2 = str2.toLowerCase()
  
  if (s1 === s2) return 1
  
  // Check if one string contains the other
  if (s1.includes(s2) || s2.includes(s1)) return 0.8
  
  // Calculate Levenshtein distance
  const matrix = Array(s2.length + 1).fill(null).map(() => Array(s1.length + 1).fill(null))
  
  for (let i = 0; i <= s1.length; i++) matrix[0][i] = i
  for (let j = 0; j <= s2.length; j++) matrix[j][0] = j
  
  for (let j = 1; j <= s2.length; j++) {
    for (let i = 1; i <= s1.length; i++) {
      const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,     // deletion
        matrix[j - 1][i] + 1,     // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      )
    }
  }
  
  const distance = matrix[s2.length][s1.length]
  const maxLength = Math.max(s1.length, s2.length)
  
  return 1 - (distance / maxLength)
}

export function matchFixtureWithOdds(
  footballDataFixture: { homeTeam: { name: string }, awayTeam: { name: string } },
  oddsEvents: Array<{ home_team: string, away_team: string }>
): { home_team: string, away_team: string } | null {
  
  for (const oddsEvent of oddsEvents) {
    const homeMatch = findTeamMatch(footballDataFixture.homeTeam.name, [oddsEvent.home_team])
    const awayMatch = findTeamMatch(footballDataFixture.awayTeam.name, [oddsEvent.away_team])
    
    if (homeMatch && awayMatch) {
      return oddsEvent
    }
  }
  
  return null
}
