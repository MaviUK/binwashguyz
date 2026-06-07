# Goal Diff Fantasy

A head-to-head football prediction game where users pick 3 teams from 10 real fixtures and score using the selected teams' real-life goal difference.

## Current milestone

This repo includes:

- React and Vite frontend
- Netlify functions
- football-data.org fixture fetcher
- football-data.org result fetcher
- Competition selector
- Upcoming fixtures view
- Latest results view

## Local development

Install dependencies:

```bash
npm install
```

Run with Netlify functions enabled:

```bash
netlify dev
```

Open the local URL, usually:

```text
http://localhost:8888
```

## Required environment variable

Add this variable locally and in Netlify:

```text
FOOTBALL_DATA_API_KEY
```

Keep that key server-side only. Do not expose it in the browser.

## Next build steps

1. Add Supabase Auth for user sign-up and login.
2. Add database tables for fantasy leagues, gameweeks, real fixtures, fantasy matches and user picks.
3. Add an admin screen to select 10 fixtures for each gameweek.
4. Add pick locking before kickoff.
5. Calculate fantasy match scores after real results are final.
6. Build the 38-gameweek league table.
