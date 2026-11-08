// Refreshes HotMakes episode data from the YouTube Data API and writes static JSON.
// Usage: YOUTUBE_API_KEY=... node scripts/refresh-episodes.mjs <recent|archive> <output-dir>
// Env: DEEP=1 also runs search.list (100 quota units per call) to catch live/upcoming streams
//      missing from the uploads playlist. YT_API_BASE overrides the API host (used by tests).
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {normalizeVideo} from '../lib/episodes.mjs';

const CHANNEL = 'UCeqoSThyqiZgIMhGBCCLLcg';
const LEGACY = 'UC1Ak7Ir1WMOWauY_oH00-Qg';
const TITLE = /hot\s*makes/i;
const HEARTBEAT_MS = 55 * 60 * 1000;
const BASE = process.env.YT_API_BASE || 'https://www.googleapis.com/youtube/v3';

async function api(key, endpoint, params) {
  const url = new URL(`${BASE}/${endpoint}`);
  for (const [k, v] of Object.entries({...params, key})) url.searchParams.set(k, v);
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {signal: AbortSignal.timeout(15000)});
      if (res.ok) return await res.json();
      if (res.status < 500 && res.status !== 429) throw new Error(`YouTube API ${endpoint} returned ${res.status}`);
    } catch (err) {
      if (attempt === 1 || String(err.message).startsWith('YouTube API')) throw new Error(String(err.message).replace(key, '***'));
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  throw new Error(`YouTube API ${endpoint} failed`);
}

// Uploads playlist id is the channel id with the UC prefix swapped for UU, which saves a lookup.
const uploads = id => 'UU' + id.slice(2);

async function playlistIds(key, channel, pages) {
  const ids = [];
  let token = '';
  for (let i = 0; i < pages; i++) {
    const r = await api(key, 'playlistItems', {part: 'snippet,contentDetails', playlistId: uploads(channel), maxResults: '50', ...(token ? {pageToken: token} : {})});
    for (const item of r.items || []) if (TITLE.test(item.snippet.title)) ids.push(item.contentDetails.videoId);
    token = r.nextPageToken || '';
    if (!token) break;
  }
  return ids;
}

async function details(key, ids) {
  const out = [];
  for (let i = 0; i < ids.length; i += 50) {
    const r = await api(key, 'videos', {part: 'snippet,liveStreamingDetails,status', id: ids.slice(i, i + 50).join(',')});
    out.push(...(r.items || []).map(normalizeVideo));
  }
  return out;
}

async function readJson(file) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); } catch { return null; }
}

async function writeIfChanged(file, episodes, extra) {
  const old = await readJson(file);
  const same = old && JSON.stringify(old.episodes) === JSON.stringify(episodes);
  const fresh = old && Date.now() - Date.parse(old.checkedAt || 0) < HEARTBEAT_MS;
  if (same && fresh) { console.log(`${path.basename(file)}: no change`); return false; }
  await fs.mkdir(path.dirname(file), {recursive: true});
  await fs.writeFile(file, JSON.stringify({...extra, checkedAt: new Date().toISOString(), episodes}, null, 1) + '\n');
  console.log(`${path.basename(file)}: wrote ${episodes.length} episodes${same ? ' (heartbeat)' : ''}`);
  return true;
}

export async function run(task, outDir, key) {
  if (task === 'archive') {
    const ids = [];
    for (const channel of [CHANNEL, LEGACY]) ids.push(...await playlistIds(key, channel, 20));
    const episodes = await details(key, [...new Set(ids)]);
    return writeIfChanged(path.join(outDir, 'archive.json'), episodes, {archiveComplete: true});
  }
  const file = path.join(outDir, 'episodes.json');
  const known = new Set(await playlistIds(key, CHANNEL, 1));
  // Keep following anything we last saw as live or upcoming, so it flips to replay (or drops out if removed).
  const previous = await readJson(file);
  for (const e of previous?.episodes || []) if (e.status !== 'completed') known.add(e.id);
  if (process.env.DEEP === '1') {
    for (const eventType of ['upcoming', 'live']) {
      const r = await api(key, 'search', {part: 'snippet', channelId: CHANNEL, type: 'video', eventType, maxResults: '50'});
      for (const item of r.items || []) if (TITLE.test(item.snippet.title)) known.add(item.id.videoId);
    }
  }
  const episodes = await details(key, [...known]);
  episodes.sort((a, b) => a.id.localeCompare(b.id));
  return writeIfChanged(file, episodes, {});
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [task = 'recent', outDir = 'data-out'] = process.argv.slice(2);
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) { console.error('YOUTUBE_API_KEY is not set.'); process.exit(1); }
  if (!['recent', 'archive'].includes(task)) { console.error('Task must be "recent" or "archive".'); process.exit(1); }
  run(task, outDir, key).catch(err => { console.error(err.message); process.exit(1); });
}
