export function orderEpisodes(items) {
  return [...items].sort((a,b) => {
    if(a.startedAt && b.startedAt) return Date.parse(b.startedAt)-Date.parse(a.startedAt);
    if(a.channel===b.channel && a.archiveOrder!==undefined && b.archiveOrder!==undefined)return a.archiveOrder-b.archiveOrder;
    if(a.number && b.number) return b.number-a.number;
    return (Date.parse(b.publishedAt)||0)-(Date.parse(a.publishedAt)||0);
  });
}
export function featuredEpisode(items) {
  const live=orderEpisodes(items.filter(e=>e.status==='live'));
  if(live.length)return live[0];
  const upcoming=items.filter(e=>e.status==='upcoming').sort((a,b)=>(Date.parse(a.scheduledAt)||Infinity)-(Date.parse(b.scheduledAt)||Infinity));
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
