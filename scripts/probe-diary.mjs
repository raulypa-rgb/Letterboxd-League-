// Temporary: prints the structure of a Letterboxd diary page so the backfill parser can be written against it.
const UA = 'Mozilla/5.0 (compatible; LetterboxdLeague/1.0; +https://github.com/raulypa-rgb/Letterboxd-League-)';
for (const url of ['https://letterboxd.com/raulypa/films/diary/for/2026/', 'https://letterboxd.com/kylie_sak/films/diary/for/2026/page/2/']) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  const html = await res.text();
  console.log('=====', url, res.status, html.length);
  const i = html.indexOf('diary-entry-row');
  console.log(i < 0 ? html.slice(0, 3000) : html.slice(Math.max(0, i - 1500), i + 7000));
  console.log('rows', (html.match(/diary-entry-row/g) || []).length);
  console.log('pagination', (html.match(/<div class="paginate-pages">[\s\S]*?<\/div>/) || [''])[0].slice(0, 1500));
}
