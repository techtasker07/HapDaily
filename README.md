# HapDaily - Football Prediction App

A Next.js application that analyzes football fixtures and provides high-confidence home win predictions using real-time odds data and statistical analysis.

## Features

- **Real-time Data**: Fetches fixtures from Football-Data.org and odds from The Odds API
- **Smart Analysis**: Uses market-implied probabilities with bookmaker margin removal
- **Heuristic Filtering**: Considers team standings, recent form, and statistical models
- **High Confidence**: Only shows predictions with ≥80% home win probability
- **Automated Updates**: Runs twice daily via Vercel Cron Jobs
- **Multiple Leagues**: Supports Premier League, La Liga, Bundesliga, Serie A, Ligue 1, and more

## Setup

### Environment Variables

Add these to your Vercel project or `.env.local`:

```
FOOTBALL_DATA_TOKEN=your_football_data_api_token
ODDS_API_KEY=your_odds_api_key
DB_EXTERNAL_URL=your_postgresql_connection_string
```

### Database Initialization

1. Deploy the app to Vercel
2. Initialize the database schema by calling:
   ```
   POST https://your-app.vercel.app/api/init-db
   ```

### Manual Data Refresh

Trigger a manual refresh of predictions:
```
GET https://your-app.vercel.app/api/refresh
```

## API Endpoints

- `GET /api/picks` - Get today's predictions
- `POST /api/picks` - Trigger refresh and get updated predictions
- `GET /api/refresh` - Manual refresh of all data
- `GET /api/init-db` - Check database status
- `POST /api/init-db` - Initialize database schema

## How It Works

1. **Data Collection**: Fetches today's fixtures from Football-Data.org and corresponding odds from The Odds API
2. **Team Matching**: Uses fuzzy matching to align team names between different data sources
3. **Probability Calculation**: Converts odds to normalized probabilities, removing bookmaker margins
4. **Filtering**: Applies ≥80% home win probability threshold
5. **Ranking**: Sorts by probability, standings gap, and recent form
6. **Selection**: Picks top 2-4 matches meeting criteria

## Prediction Criteria

- **Minimum Probability**: 80% home win chance
- **Maximum Picks**: 4 per day
- **Minimum Picks**: 2 per day (or shows "no confident picks")
- **Ranking Factors**:
  1. Home win probability (primary)
  2. Standings gap between teams (secondary)
  3. Home team recent form (tertiary)

## Supported Leagues

- English Premier League
- Spanish La Liga
- German Bundesliga
- Italian Serie A
- French Ligue 1
- Dutch Eredivisie
- Portuguese Primeira Liga
- UEFA Champions League
- UEFA Europa League

## Automated Schedule

The app automatically refreshes data twice daily:
- 04:00 UTC (morning update)
- 11:00 UTC (pre-match update)

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, Shadcn/ui components
- **Database**: PostgreSQL (Render)
- **Deployment**: Vercel
- **APIs**: Football-Data.org, The Odds API
- **Scheduling**: Vercel Cron Jobs

## Development

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` to see the app.

## License

MIT License
