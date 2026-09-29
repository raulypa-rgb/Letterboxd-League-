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
