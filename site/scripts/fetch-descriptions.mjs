// One-off helper: downloads the title and description of every archived episode so guest names and
// social links can be collected. Usage: YOUTUBE_API_KEY=... node fetch-descriptions.mjs <archive.json> <output.json>
// Cost: 1 quota unit per 50 videos.
import fs from 'node:fs/promises';

const [archivePath, outPath] = process.argv.slice(2);
const key = process.env.YOUTUBE_API_KEY;
if (!key) throw new Error('YOUTUBE_API_KEY is not set');
const archive = JSON.parse(await fs.readFile(archivePath, 'utf8'));
const ids = archive.episodes.map(e => e.id);
const out = {};
for (let i = 0; i < ids.length; i += 50) {
  const url = new URL('https://www.googleapis.com/youtube/v3/videos');
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('id', ids.slice(i, i + 50).join(','));
  url.searchParams.set('key', key);
  const res = await fetch(url, {signal: AbortSignal.timeout(20000)});
  if (!res.ok) throw new Error(`YouTube API returned ${res.status}`);
  for (const v of (await res.json()).items || []) {
    out[v.id] = {title: v.snippet.title, channel: v.snippet.channelTitle, publishedAt: v.snippet.publishedAt, description: v.snippet.description};
  }
}
await fs.writeFile(outPath, JSON.stringify(out));
console.log(`Saved ${Object.keys(out).length} of ${ids.length} descriptions.`);
