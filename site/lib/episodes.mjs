export function orderEpisodes(items) {
  return [...items].sort((a,b) => {
    if(a.startedAt && b.startedAt) return Date.parse(b.startedAt)-Date.parse(a.startedAt);
    if(a.channel===b.channel && a.archiveOrder!==undefined && b.archiveOrder!==undefined)return a.archiveOrder-b.archiveOrder;
    if(a.number && b.number) return b.number-a.number;
    return (Date.parse(b.publishedAt)||0)-(Date.parse(a.publishedAt)||0);
  });
}
// A scheduled stream this long past its start time never went live (an abandoned placeholder), so it is ignored.
export const STALE_UPCOMING_MS = 12 * 60 * 60 * 1000;
export function isStaleUpcoming(e, now = Date.now()) {
  return e.status === 'upcoming' && Date.parse(e.scheduledAt) < now - STALE_UPCOMING_MS;
}
export function featuredEpisode(items, now = Date.now()) {
  const live=orderEpisodes(items.filter(e=>e.status==='live'));
  if(live.length)return live[0];
  const upcoming=items.filter(e=>e.status==='upcoming' && !isStaleUpcoming(e, now)).sort((a,b)=>(Date.parse(a.scheduledAt)||Infinity)-(Date.parse(b.scheduledAt)||Infinity));
  return upcoming[0] || orderEpisodes(items.filter(e=>e.status==='completed'))[0] || null;
}
export function previousEpisodes(items,featured) {return orderEpisodes(items.filter(e=>e.status==='completed' && e.id!==featured?.id)).slice(0,5);}
export function normalizeVideo(v) {
  const s=v.snippet,l=v.liveStreamingDetails||{};
  const status=l.actualEndTime?'completed':s.liveBroadcastContent==='live'?'live':s.liveBroadcastContent==='upcoming'?'upcoming':'completed';
  return {id:v.id,title:s.title,number:Number(s.title.match(/\bEp(?:isode)?\.?\s*(\d+)/i)?.[1])||null,channel:s.channelTitle,channelId:s.channelId,publishedAt:s.publishedAt,startedAt:l.actualStartTime||null,scheduledAt:l.scheduledStartTime||null,status,embeddable:v.status?.embeddable!==false,thumbnail:s.thumbnails?.high?.url||s.thumbnails?.medium?.url||'',url:`https://www.youtube.com/watch?v=${v.id}`};
}

export function mergeEpisodes(seed, archive, current) {
  const map = new Map();
  for (const v of [...seed.filter(e => e.status === 'completed'), ...archive.filter(e => e.status === 'completed'), ...current]) {
    map.set(v.id, {...(map.get(v.id) || {}), ...v});
  }
  return [...map.values()];
}

// ---- Episodes page helpers ----
const HOUR = 3600e3;
export function episodeTime(e) {
  const t = Date.parse(e.startedAt || e.scheduledAt || e.publishedAt || '');
  return Number.isNaN(t) ? null : t;
}
// Calendar year of the broadcast, in the show's home time zone.
export function episodeYear(e) {
  const t = episodeTime(e);
  if (t === null) return null;
  return Number(new Intl.DateTimeFormat('en-US', {timeZone: 'America/Chicago', year: 'numeric'}).format(t));
}
const normTitle = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
// The same show was sometimes streamed to both channels. Keep the HotMakes copy and drop the Edge of Tech copy.
// Match on episode number plus broadcast time (Ep 153 aired a week apart on each channel, so those stay),
// or on title plus time for specials with no number.
export function dedupeSimulcasts(items) {
  const home = items.filter(e => e.channel === 'HotMakes');
  return items.filter(e => {
    if (e.channel === 'HotMakes') return true;
    const t = episodeTime(e);
    return !home.some(h => {
      const ht = episodeTime(h);
      if (e.number && h.number) return e.number === h.number && (t === null || ht === null || Math.abs(t - ht) <= 48 * HOUR);
      if (!e.number && !h.number) return t !== null && ht !== null && Math.abs(t - ht) <= 6 * HOUR && normTitle(e.title) === normTitle(h.title);
      return false;
    });
  });
}
export function yearCounts(items) {
  const m = new Map();
  for (const e of items) { const y = episodeYear(e); if (y !== null) m.set(y, (m.get(y) || 0) + 1); }
  return [...m.entries()].sort((a, b) => b[0] - a[0]);
}
