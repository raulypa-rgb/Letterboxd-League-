# Box Office League

A fantasy box office game. Each player runs an imaginary studio, drafts real wide-release movies, and scores the profit those movies make at the real box office.

- The year is split into three seasons: **Winter** (Jan–Apr), **Summer** (May–Aug), **Fall** (Sep–Dec).
- Before the first season, each studio makes two year-long picks from any film on the calendar:
  - **Hit pick** (your first pick of the year): its profit counts toward your year total.
  - **Bomb pick**: its profit or loss is added to every *other* studio's total. Pick the film you expect to flop.
  Hit and bomb picks are off the board for the season drafts.
- Right before each season, the league builds a slate of that season's wide releases and runs a **snake draft**.
- Enter each film's production budget, then its domestic (or worldwide) gross as it comes in. Profit = gross − budget.
- Leaderboards rank studios by the combined profit of their films. The most profitable studio wins each season; the year winner has the highest total of all three seasons, their hit pick, and their rivals' bomb picks.

## 2027 season

The site opens on a 2027 league with 6 studios to rename and slates pre-filled with 23 announced 2027 wide releases (dates as reported in September 2026). Release dates move, so check them and add missing films before each draft. Budgets are blank until reported. A finished 2024 demo league is available from the League tab.

## Running it

It's a single static file. Open `index.html` in a browser, or host it with GitHub Pages.
League data is saved in the browser's local storage. Use **League → Share the league** to copy a league code other players can load.

Optional: add a free [TMDB](https://www.themoviedb.org/) API key on the League tab to import a season's releases and pull budgets and revenue (TMDB revenue is worldwide and can lag).

# Watch Time

`watch-time.html` tracks how much time each member of a Letterboxd league spends watching films. The site links to it from the Box Office League header.

- **Month**: leaderboard ranked by the total runtime of films each member logged that month, with film and rewatch counts and the change from last month.
- **Year**: year-to-date standings, a month-by-month heatmap of hours, and each month's winner.
- **Diary**: every logged film for the month, filterable by member.

Watch time for a month is the sum of runtimes of the films a member logged in their Letterboxd diary with a watched date in that month. Rewatches count. Films logged without a date don't.

## Setting it up

1. Put everyone's Letterboxd username in `data/members.json`. `name` is optional. Diaries must be public.
   ```json
   { "members": [ { "username": "dave", "name": "Dave" }, { "username": "karsten" } ] }
   ```
2. Commit it. The **Update watch time** GitHub Action (`.github/workflows/watch-time.yml`) runs when that file changes, every 6 hours, and on demand from the Actions tab. It reads each member's diary RSS feed, looks up runtimes, and commits `data/watch-time.json`.
3. Optional: add a `TMDB_API_KEY` repository secret for faster, more reliable runtimes. Without it, runtimes are read from each film's Letterboxd page.
4. Turn on GitHub Pages and open `watch-time.html`. Use **Show demo data** to preview the page before any viewings are logged.

Letterboxd's RSS feed only holds each member's latest ~50 entries, so tracking starts from the first run. After that, every viewing the Action has seen is kept. To run it locally: `node scripts/fetch-watch-time.mjs` (Node 20+).
