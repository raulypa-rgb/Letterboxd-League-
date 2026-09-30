#!/usr/bin/env node
// Pulls each member's recent Letterboxd diary from their public RSS feed, looks up
// film runtimes, and merges the viewings into data/watch-time.json.
//
// Letterboxd's feed only carries a member's latest ~50 activity items, so this is meant
// to run on a schedule (see .github/workflows/watch-time.yml). Viewings already saved are
// kept, so history builds up from the first run onward.
//
// Runtimes come from TMDB when TMDB_API_KEY is set, otherwise from the Letterboxd film page.
//
// Usage: node scripts/fetch-watch-time.mjs            (fetch every member)
//        node scripts/fetch-watch-time.mjs --parse feed.xml username   (parse a saved feed, no network)

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MEMBERS_FILE = path.join(ROOT, 'data/members.json');
const DATA_FILE = path.join(ROOT, 'data/watch-time.json');
const RUNTIME_FILE = path.join(ROOT, 'data/runtimes.json');
const TMDB_KEY = process.env.TMDB_API_KEY || '';
const FEED_SIZE = 50;
const UA = 'Mozilla/5.0 (compatible; LetterboxdLeague/1.0; +https://github.com/raulypa-rgb/Letterboxd-League-)';

const readJson = async (file, fallback) => {
  try { return JSON.parse(await readFile(file, 'utf8')); } catch { return fallback; }
};
const writeJson = (file, value) => writeFile(file, JSON.stringify(value, null, 2) + '\n');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const decode = s => s
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
  .trim();
const tag = (xml, name) => {
  const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`));
  return m ? decode(m[1]) : '';
};

// Letterboxd serves profile pictures from a.ltrbxd.com/resized/avatar/...
const findAvatar = html => (html.match(/https:\/\/a\.ltrbxd\.com\/resized\/avatar\/[^"'\s<>]+/) || [])[0] || '';

// One diary entry per <item>; list and other non-diary items have no watchedDate and are skipped.
export function parseFeed(xml, username) {
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
  const entries = [];
  for (const item of items) {
    const date = tag(item, 'letterboxd:watchedDate');
    if (!date) continue;
    const link = tag(item, 'link');
    const slug = (link.match(/\/film\/([^/]+)/) || [])[1] || '';
    const rating = tag(item, 'letterboxd:memberRating');
    const pub = Date.parse(tag(item, 'pubDate'));
    const poster = (tag(item, 'description').match(/<img[^>]+src="([^"]+)"/) || [])[1] || '';
    entries.push({
      id: tag(item, 'guid') || `${username}:${date}:${slug}`,
      user: username.toLowerCase(),
      date,
      title: tag(item, 'letterboxd:filmTitle') || tag(item, 'title'),
      year: Number(tag(item, 'letterboxd:filmYear')) || null,
      slug,
      tmdb: tag(item, 'tmdb:movieId') || null,
      rewatch: tag(item, 'letterboxd:rewatch') === 'Yes',
      rating: rating ? Number(rating) : null,
      link,
      poster,
      logged: Number.isNaN(pub) ? null : new Date(pub).toISOString(),
    });
  }
  const channel = xml.split('<item>')[0];
  const name = tag(channel, 'title').replace(/^Letterboxd - /, '');
  const avatar = findAvatar(channel);
  return { name, avatar, entries, items: items.length };
}

async function get(url, as = 'text') {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: as === 'json' ? 'application/json' : '*/*' } });
    if (res.ok) return as === 'json' ? res.json() : res.text();
    if (res.status === 404) throw new Error(`404 at ${url}`);
    await sleep(1500 * (attempt + 1));
    if (attempt === 2) throw new Error(`HTTP ${res.status} at ${url}`);
  }
}

async function lookupRuntime(entry) {
  if (TMDB_KEY && entry.tmdb) {
    try {
      const auth = TMDB_KEY.length > 40 ? '' : `?api_key=${TMDB_KEY}`;
      const res = await fetch(`https://api.themoviedb.org/3/movie/${entry.tmdb}${auth}`, {
        headers: TMDB_KEY.length > 40 ? { Authorization: `Bearer ${TMDB_KEY}` } : {},
      });
      if (res.ok) { const m = await res.json(); if (m.runtime) return m.runtime; }
    } catch { /* fall through to Letterboxd */ }
  }
  if (!entry.slug) return null;
  try {
    const html = await get(`https://letterboxd.com/film/${entry.slug}/`);
    const m = html.match(/(\d+)(?:&nbsp;|\s)+mins?\b/);
    return m ? Number(m[1]) : null;
  } catch { return null; }
}

async function main() {
  const args = process.argv.slice(2);
  if (args[0] === '--parse') {
    const { name, entries } = parseFeed(await readFile(args[1], 'utf8'), args[2] || 'member');
    console.log(JSON.stringify({ name, entries }, null, 2));
    return;
  }

  const { members = [] } = await readJson(MEMBERS_FILE, {});
  const data = await readJson(DATA_FILE, { members: [], entries: [] });
  const runtimes = await readJson(RUNTIME_FILE, {});
  const byId = new Map((data.entries || []).map(e => [e.id, e]));
  const tracked = members.filter(m => m.username && !m.username.startsWith('your-'));
  const outMembers = [];

  for (const m of tracked) {
    const username = m.username.toLowerCase();
    const prev = (data.members || []).find(x => x.username === username) || {};
    const row = { username, name: m.name || prev.name || username, lastFetched: prev.lastFetched || null };
    // Letterboxd blocks automated requests for profile pages, so a profile picture comes from
    // members.json (the picture's image address), or from the feed if it ever carries one.
    if (m.avatar || prev.avatar) row.avatar = m.avatar || prev.avatar;
    try {
      const feed = parseFeed(await get(`https://letterboxd.com/${username}/rss/`), username);
      if (!m.name && feed.name) row.name = feed.name;
      if (!m.avatar && feed.avatar) row.avatar = feed.avatar;
      for (const e of feed.entries) byId.set(e.id, { ...byId.get(e.id), ...e });
      // A saved entry missing from a feed window that should include it was deleted on Letterboxd.
      // The feed holds the latest ~50 items; with fewer than that it holds the whole diary.
      const seen = new Set(feed.entries.map(e => e.id));
      const since = feed.items >= FEED_SIZE ? feed.entries.map(e => e.logged).filter(Boolean).sort()[0] : '';
      for (const [id, e] of byId) {
        if (e.user !== username || seen.has(id) || !e.logged || since === undefined || e.logged < since) continue;
        byId.delete(id);
        console.log(`${username}: removed deleted entry ${e.title} (${e.date})`);
      }
      row.lastFetched = new Date().toISOString();
      console.log(`${username}: ${feed.entries.length} diary entries in feed`);
    } catch (err) {
      row.error = String(err.message || err);
      console.warn(`${username}: ${row.error}`);
    }
    outMembers.push(row);
    await sleep(800);
  }

  // Keep only members still listed, then fill in any missing runtimes (cached per film).
  const keep = new Set(outMembers.map(m => m.username));
  const entries = [...byId.values()].filter(e => keep.has(e.user));
  for (const e of entries) {
    const key = e.slug || e.tmdb;
    if (key && runtimes[key]) { e.runtime = runtimes[key]; continue; }
    if (e.runtime) continue;
    const rt = await lookupRuntime(e);
    if (rt) { e.runtime = rt; if (key) runtimes[key] = rt; }
    else console.warn(`No runtime for ${e.title} (${e.slug})`);
    await sleep(400);
  }

  entries.sort((a, b) => b.date.localeCompare(a.date) || a.user.localeCompare(b.user));
  // Skip the write (and so the commit) when nothing but fetch timestamps changed.
  const sig = (ms, es) => JSON.stringify([(ms || []).map(({ lastFetched, ...m }) => m), es || []]);
  if (sig(outMembers, entries) === sig(data.members, data.entries)) {
    console.log('No new viewings.');
    return;
  }
  await writeJson(DATA_FILE, { updated: new Date().toISOString(), members: outMembers, entries });
  await writeJson(RUNTIME_FILE, Object.fromEntries(Object.entries(runtimes).sort()));
  console.log(`Saved ${entries.length} viewings for ${outMembers.length} members.`);
}

main().catch(err => { console.error(err); process.exit(1); });
