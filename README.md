# Box Office League

A fantasy box office game. Each player runs an imaginary studio, drafts real wide-release movies, and scores the movies' real-world gross.

- The year is split into three seasons: **Winter** (Jan–Apr), **Summer** (May–Aug), **Fall** (Sep–Dec).
- Right before each season, the league builds a slate of that season's wide releases and runs a **snake draft**.
- As films open, enter their domestic (or worldwide) gross. A studio's score is the total gross of its films.
- The top studio wins each season; the highest combined total across all three seasons wins the year.

## Running it

It's a single static file. Open `index.html` in a browser, or host it with GitHub Pages.
League data is saved in the browser's local storage. Use **League → Share the league** to copy a league code other players can load.

Optional: add a free [TMDB](https://www.themoviedb.org/) API key on the League tab to import a season's releases and pull revenue (TMDB revenue is worldwide and can lag).
