'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import seed from '../data/content.json';
import {featuredEpisode,previousEpisodes,orderEpisodes,mergeEpisodes,dedupeSimulcasts,episodeYear,yearCounts,episodeTime} from '../lib/episodes.mjs';
import snapshot from '../data/archive.snapshot.json';
import dumpEpisodes from '../data/link-dump-episodes.json';
import guestAliases from '../data/guest-aliases.json';
import guestPhotos from '../data/guest-photos.json';
import {groupGuests,topGuests,displayParts,initials} from '../lib/guests.mjs';
// Written every few minutes by .github/workflows/refresh-episodes.yml
const DATA='https://raw.githubusercontent.com/emile1138/hotmakes/data';
const initial:any=seed;
const GUESTS:any[]=groupGuests(initial.guests,guestAliases as any,guestPhotos as any);
const GUEST_SLUG_BY_EPISODE=new Map<number,string>();for(const g of GUESTS)for(const a of g.appearances)if(!GUEST_SLUG_BY_EPISODE.has(a.episode))GUEST_SLUG_BY_EPISODE.set(a.episode,g.slug);
const GUEST_LEADERS=topGuests(GUESTS,3,['caleb fairres']);
// Official and host accounts are left off the community leaderboard.
const LEADERBOARD_SKIP=['hotmakeslive','theedgeofteck','cdfairres'];
const nav=[['/','The Show'],['/episodes','Episodes'],['/prints','Community Files'],['/guests','Guests'],['/link-dumps','Link Dumps'],['/donate','Support the Show'],['/contact','Contact']];
// Contact messages are sent by FormSubmit, which emails them to this address. The first message
// triggers a one-time confirmation email to the inbox that has to be activated.
const CONTACT_EMAIL='info@hotmakes.com';
const CONTACT_ENDPOINT=`https://formsubmit.co/ajax/${CONTACT_EMAIL}`;
function Out({href,children,...props}:any){return <a href={href} target="_blank" rel="noopener noreferrer" {...props}>{children}<span aria-hidden="true"> ↗</span></a>}
function date(s:string){return s?new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric'}).format(new Date(s)):''}
function Thumbnail({episode}:any){return <div className="thumbnail"><img src={episode.thumbnail||`https://i.ytimg.com/vi/${episode.id}/hqdefault.jpg`} alt="" loading="lazy"/><span className="play" aria-hidden="true">▶</span></div>}
function EpisodeCard({e}:any){return <Out href={`https://www.youtube.com/watch?v=${e.id}`} className="episode-card"><Thumbnail episode={e}/><div className="episode-meta">{e.number?`EPISODE ${e.number}`:'SPECIAL'} · {e.channel||'HotMakes'}</div><h3>{e.title.replace(/^#?HotMakes\s*(?:Ep\.?\s*\d+\s*[-–:]?\s*)?/i,'')}</h3>{e.startedAt&&<p className="small">{date(e.startedAt)}</p>}</Out>}
const SPARK_COLORS=['#e32626','#f9ef1c','#ff8a00','#e32626','#f9ef1c'];
const SPARKS=Array.from({length:18},(_,i)=>{const a=i*137.5*Math.PI/180,r=26+(i*7)%24;return{x:+(Math.cos(a)*r).toFixed(1),y:+(Math.sin(a)*r*.8).toFixed(1),wx:(6+(i*5)%7)*(i%2?1:-1),wy:(4+(i*3)%6)*(i%3?-1:1),s:6+(i*5)%9,c:SPARK_COLORS[i%5],d:+(.2+i*.055).toFixed(3)}});
// Plays when someone arrives at the homepage or refreshes it. It does not replay when they
// click around the site or press Back. Add ?intro to the address to force it.
function introStart(page:string):'play'|'done'{
 if(page!=='home')return 'done';
 try{
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return 'done';
  if(new URLSearchParams(location.search).has('intro'))return 'play';
  const nav=performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming|undefined;
  if(nav?.type==='reload')return 'play';
  if(nav?.type==='back_forward')return 'done';
  if(document.referrer&&new URL(document.referrer).origin===location.origin)return 'done';
 }catch{}
 return 'play';
}
function Splash({leaving,onSkip}:{leaving:boolean,onSkip:()=>void}){
 return <div className={'splash'+(leaving?' leaving':'')} role="presentation" aria-hidden="true" onClick={onSkip}>
 <div className="splash-logo">
 <div className="splash-sparks">{SPARKS.map((p,i)=><span key={i} className="spark" style={{'--x':`${p.x}vmin`,'--y':`${p.y}vmin`,'--wx':`${p.wx}vmin`,'--wy':`${p.wy}vmin`,'--s':`${p.s}px`,'--c':p.c,'--d':`${p.d}s`} as any}/>)}</div>
 <img className="splash-layer splash-flame" src="/assets/logo-flame.webp" alt=""/>
 <img className="splash-layer splash-h" src="/assets/logo-letters.webp" alt=""/>
 <img className="splash-layer splash-t" src="/assets/logo-letters.webp" alt=""/>
 <img className="splash-layer splash-makes" src="/assets/logo-letters.webp" alt=""/>
 </div></div>
}
export default function Site({page='home'}:{page?:string}){
 const [phase,setPhase]=useState<'play'|'reveal'|'done'>(()=>introStart(page));
 useEffect(()=>{
  if(phase==='play'){const t=setTimeout(()=>setPhase('reveal'),3900);const key=(e:KeyboardEvent)=>{if(e.key==='Escape'||e.key==='Enter'||e.key===' ')setPhase('reveal')};addEventListener('keydown',key);return()=>{clearTimeout(t);removeEventListener('keydown',key)}}
  if(phase==='reveal'){const t=setTimeout(()=>setPhase('done'),1900);return()=>clearTimeout(t)}
 },[phase]);
 const [data,setData]=useState<any>({episodes:mergeEpisodes(initial.episodes,(snapshot as any).episodes,[]),mode:'snapshot',archiveComplete:initial.archiveComplete});const [query,setQuery]=useState('');const [filter,setFilter]=useState('all');const [sort,setSort]=useState('oldest');const [epSort,setEpSort]=useState('newest');const [dumps,setDumps]=useState<any[]|null>(null);const [dumpError,setDumpError]=useState(false);const [openDumps,setOpenDumps]=useState<string[]>(()=>typeof location!=='undefined'&&/^#ep-\d+$/.test(location.hash)?[location.hash.slice(1)]:[]);const [year,setYear]=useState<string>(()=>typeof location!=='undefined'&&/^#\d{4}$/.test(location.hash)?location.hash.slice(1):'all');const [limit,setLimit]=useState(24);const [loadError,setLoadError]=useState(false);const [playerId,setPlayerId]=useState<string|null>(null);const [refreshVersion,setRefreshVersion]=useState(0);
 useEffect(()=>{let cancelled=false;const load=async()=>{try{const [r,a]=await Promise.all([fetch(`${DATA}/episodes.json`,{cache:'no-store'}),fetch(`${DATA}/archive.json`,{cache:'no-store'}).catch(()=>null)]);if(!r.ok)throw Error();const cur=await r.json();const arc=a&&a.ok?await a.json().catch(()=>null):null;const fresh=Date.now()-Date.parse(cur.checkedAt||'')<3*3600e3;const next={episodes:mergeEpisodes(initial.episodes,arc?.episodes||[],cur.episodes||[]),mode:fresh?'connected':'unavailable',archiveComplete:!!arc?.archiveComplete};if(!cancelled){setData((prev:any)=>next.mode==='unavailable'&&prev.mode==='connected'?{...prev,mode:'unavailable'}:next);setLoadError(false)}}catch{if(!cancelled)setLoadError(true)}};load();const timer=setInterval(load,60000);return()=>{cancelled=true;clearInterval(timer)}},[refreshVersion]);
 const feature=useMemo(()=>featuredEpisode(data.episodes),[data.episodes]);
 useEffect(()=>{if(feature)setPlayerId(feature.id)},[feature?.id]);
 const playing=data.episodes.find((e:any)=>e.id===playerId)||feature;
 const recent=previousEpisodes(data.episodes,feature);
 const hmEpisodes=useMemo(()=>dedupeSimulcasts(data.episodes.filter((e:any)=>e.status==='completed')),[data.episodes]);
 const years=useMemo(()=>yearCounts(hmEpisodes),[hmEpisodes]);
 useEffect(()=>{if(page!=='link-dumps')return;let off=false;fetch('/data/link-dumps.json').then(r=>{if(!r.ok)throw Error();return r.json()}).then(j=>{if(!off)setDumps(j.dumps)}).catch(()=>{if(!off)setDumpError(true)});return()=>{off=true}},[page]);
 const dumpKey=(d:any)=>`ep-${d.episodes[0]}`;
 const dumpList=useMemo(()=>{if(!dumps)return[];const q=query.toLowerCase().trim();const hq=q.replace(/^@/,'');const exactHandle=q.startsWith('@')||dumps.some((d:any)=>d.items.some((i:any)=>i.h.toLowerCase()===q));const byHandle=!!q&&exactHandle;const known=dumps.some((d:any)=>d.items.some((i:any)=>i.h.toLowerCase()===hq));const byHandleMatch=(h:string)=>{const n=h.toLowerCase().replace(/^@/,'');return known?n===hq:n.includes(hq)};const byNum=new Map<number,any>();for(const e of orderEpisodes(hmEpisodes))if(e.number&&!byNum.has(e.number)&&!/re-?do/i.test(e.title))byNum.set(e.number,e);const list=dumps.map((d:any)=>{const ep=byNum.get(d.episodes[0]);const items=!q?d.items:byHandle?d.items.filter((i:any)=>byHandleMatch(i.h)):d.items.filter((i:any)=>`${i.h} ${i.t}`.toLowerCase().includes(q));const extras=!q?d.extras:byHandle?d.extras.filter((x:any)=>byHandleMatch(x.l)):d.extras.filter((x:any)=>`${x.l} ${x.t}`.toLowerCase().includes(q));return{...d,ep,items,extras,t:ep?episodeTime(ep):null}}).filter((d:any)=>!q||d.items.length||d.extras.length);list.sort((a:any,b:any)=>(b.episodes[0]-a.episodes[0]));return epSort==='oldest'?list.reverse():list},[dumps,hmEpisodes,query,epSort]);
 const leaders=useMemo(()=>{if(!dumps)return[];const c=new Map<string,{h:string,n:number}>();for(const d of dumps)for(const i of d.items){const k=i.h.toLowerCase();if(LEADERBOARD_SKIP.includes(k))continue;const r=c.get(k);if(r)r.n++;else c.set(k,{h:i.h,n:1})}return [...c.values()].sort((a,b)=>b.n-a.n).slice(0,5)},[dumps]);
 const epList=useMemo(()=>{const q=query.toLowerCase().trim();const list=orderEpisodes(hmEpisodes).filter((e:any)=>(!q&&year!=='all'&&years.some(([y]:any)=>String(y)===year)?String(episodeYear(e))===year:true)&&(!q||`${e.title} ${e.number||''}`.toLowerCase().includes(q)));return epSort==='oldest'?[...list].reverse():list},[hmEpisodes,years,query,year,epSort]);
 const models=initial.models.filter((m:any)=>(filter==='all'||m.links.some((l:any)=>l.platform.startsWith(filter)))&&`${m.title} ${m.creator}`.toLowerCase().includes(query.toLowerCase()));
 const guests=useMemo(()=>{const q=query.toLowerCase().trim();const list=GUESTS.filter((g:any)=>!q||`${g.name} ${g.appearances.map((a:any)=>`${a.episode} ${a.title||''}`).join(' ')}`.toLowerCase().includes(q));return list.sort((a:any,b:any)=>sort==='newest'?b.last-a.last:sort==='most'?b.appearances.length-a.appearances.length||b.last-a.last:sort==='az'?a.name.localeCompare(b.name):a.first-b.first)},[query,sort]);
 return <>{phase!=='done'&&<Splash leaving={phase==='reveal'} onSkip={()=>setPhase('reveal')}/>}<div className={phase==='play'?'page-hold':phase==='reveal'?'page-reveal':undefined}><a className="skip" href="#main">Skip to content</a><header className="site-header"><a href="/" aria-label="HotMakes home"><img className="nav-logo" src="/assets/hotmakes-logo-solid.svg" alt="HotMakes"/></a><nav aria-label="Main navigation">{nav.map(([url,label])=><a key={url} href={url} aria-current={('/'+page===url||(page==='home'&&url==='/'))?'page':undefined}>{label}</a>)}</nav></header>
 <main id="main" className="wrap">
 {page==='home'&&<>
 <section className="intro"><img className="intro-photo" src="/assets/hotmakes-group.jpg" width="1200" height="900" alt="The three HotMakes hosts smiling together at a maker event" fetchPriority="high"/><div className="intro-copy"><p className="eyebrow">HOT PROJECTS. GREAT PEOPLE. QUESTIONABLE BANTER.</p><h1>The maker community,<br/>with the heat turned up.</h1><p className="lede">HotMakes brings makers together to share what they’re making, meet the people behind the projects, and get inspired to try something new.</p><div className="history"><h2>A little HotMakes history</h2><p>HotMakes began with Jim Edgeworth and Alan “Pooch” Puccinelli, growing out of Jim’s community showcases into a show all about the makers behind the makes. Caleb joined behind the scenes as producer, and Joey later joined the host crew. Today, Jim, Joey, and Caleb keep that same community spirit alive with guest conversations, audience projects, and plenty of detours along the way.</p></div></div></section>
 <section className="feature-section" aria-labelledby="feature-title"><div className="section-heading"><div><h2 id="feature-title">{feature?.status==='live'?'Live now!':feature?.status==='upcoming'?'Coming up...':'Watch the latest episode'}</h2></div>{(feature?.status==='live'||feature?.status==='upcoming')&&<span className={'status '+feature.status}>{feature.status==='live'?'● LIVE NOW':'UPCOMING'}</span>}</div>
 {feature?.scheduledAt&&feature.status==='upcoming'&&<p className="schedule">{new Intl.DateTimeFormat('en-US',{dateStyle:'full',timeStyle:'short',timeZoneName:undefined}).format(new Date(feature.scheduledAt))} <span className="small">(your local time)</span></p>}
 {feature?.id!==playing?.id&&<div className="update-prompt">{feature?.status==='live'?'A new episode is live.':'A new featured episode is available.'} <button onClick={()=>setPlayerId(feature.id)}>Switch to featured episode</button></div>}
 {playing?.embeddable===false?<div className="not-embeddable"><h3>This episode is available on YouTube</h3><Out href={`https://www.youtube.com/watch?v=${playing.id}`}>Watch episode</Out></div>:playing&&<iframe key={playing.id} className="video" src={`https://www.youtube-nocookie.com/embed/${playing.id}`} title={playing.title} referrerPolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen/>}
 <div className="video-caption"><h3>{playing?.title}</h3><Out href={`https://www.youtube.com/watch?v=${playing?.id}`}>Watch on YouTube</Out></div>
 {(data.mode!=='connected'||loadError)&&<p className="connection-note">{loadError||data.mode==='unavailable'?'Couldn’t refresh YouTube right now. Showing the saved episodes.':'Preview setup: automatic episode updates are not connected yet.'} <button className="text-button" onClick={()=>setRefreshVersion(v=>v+1)}>Check again</button></p>}
 </section>
 <section className="section"><div className="section-heading"><h2>Previously on HotMakes</h2><a href="/episodes">All episodes →</a></div><div className="recent-grid">{recent.map((e:any)=><EpisodeCard key={e.id} e={e}/>)}</div></section>
 <section className="section hosts-section"><h2>Meet your hosts.</h2><div className="hosts-grid">{initial.hosts.map((h:any,i:number)=><article className="host" key={h.name}><HostPortrait name={h.name} slug={['jim','joey','caleb'][i]}/><p className="eyebrow">{h.alias}</p><h3>{h.name}</h3><p>{h.bio}</p><div className="link-row">{h.links.map((l:any)=><Out key={l.url} href={l.url}>{l.label}</Out>)}</div></article>)}</div></section>
 </>}
 {page==='episodes'&&<><PageHead label="THE ARCHIVE" title="Every era. All the makes." description="Explore HotMakes from The Edge of Tech days through the show’s own YouTube channel."/><div className="controls"><label>Find an episode<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search titles, guests, or episode numbers" type="search"/></label><label>Sort by<select value={epSort} onChange={e=>setEpSort(e.target.value)}><option value="newest">Newest First</option><option value="oldest">Oldest First</option></select></label></div><div className="archive-layout"><nav className="year-nav" aria-label="Episodes by year"><button type="button" className="year-link" aria-pressed={year==='all'&&!query} onClick={()=>{setYear('all');setQuery('');history.replaceState(null,'',location.pathname)}}>All years</button>{years.map(([y,n]:any)=><button type="button" key={y} className="year-link" aria-pressed={String(y)===year&&!query} onClick={()=>{setYear(String(y));setQuery('');history.replaceState(null,'',`#${y}`);window.scrollTo({top:0})}}>{y}<span>{n}</span></button>)}</nav><div className="archive-main"><div className="archive-grid">{epList.map((e:any)=><div className="episode-item" key={e.id}><EpisodeCard e={e}/><div className="episode-links">{e.number&&GUEST_SLUG_BY_EPISODE.has(e.number)&&<a className="chip" href={`/guests/#${GUEST_SLUG_BY_EPISODE.get(e.number)}`}>Guest profile</a>}{e.number&&(dumpEpisodes as number[]).includes(e.number)&&<a className="chip" href={`/link-dumps/#ep-${e.number}`}>Link Dump</a>}</div></div>)}</div>{!epList.length&&<Empty text="No episodes match that search."/>}</div></div></>}
 {page==='prints'&&<><PageHead label="FROM THE SHOW TO YOUR BUILD PLATE" title="Print a little HotMakes." description="Show-inspired models, community collaborations, and familiar troublemakers for your printer. Get the files directly from their creators."/><p className="catalog-note">This collection is growing. Verified creator links are listed below; the Banana for Scale link and additional MakerWorld releases are still being tracked down.</p><div className="controls"><label>Find a print<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search models or creators"/></label><label>Platform<select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All platforms</option><option>Thangs</option><option>Printables</option><option>MakerWorld</option></select></label></div><div className="models-grid">{models.map((m:any,i:number)=><article className="model" key={m.title}><p className="eyebrow">{m.creator}</p><h2>{m.title}</h2><p>{m.description}</p><div className="link-row">{m.links.map((l:any)=><Out key={l.url} href={l.url}>{l.platform}</Out>)}</div>{m.episodeUrl&&<Out className="small" href={m.episodeUrl}>See it on the show</Out>}</article>)}</div>{!models.length&&<Empty text={filter==='MakerWorld'?'No verified MakerWorld listings added yet.':'No prints match that search.'}/>}<p className="small">Files remain on their original platforms. Check each creator’s license and printing instructions before use.</p></>}
 {page==='guests'&&<><div className="dumps-top"><PageHead label="THE PEOPLE BEHIND THE MAKES" title="Good company. Great conversations." description="Meet the makers who have joined HotMakes. Follow their work and revisit their episodes."/><aside className="leaderboard wide" aria-label="Most frequent guests"><h2>Most Frequent Guests</h2><p className="small">Who keeps coming back for more!</p><ol>{GUEST_LEADERS.map((g:any,i:number)=><li key={g.slug} style={{'--w':`${Math.round(g.appearances.length/GUEST_LEADERS[0].appearances.length*100)}%`,'--i':i} as any}><span className="lb-place">{i===0?<span className="lb-flame" aria-label="Number 1"><img src="/assets/lb-flame.webp" alt="" width="116" height="140"/><b>#1</b></span>:`#${i+1}`}</span><button type="button" className="lb-name" title={`Show ${g.name}`} onClick={()=>{setQuery(g.name);document.querySelector('.controls')?.scrollIntoView({behavior:'smooth',block:'start'})}}>{displayParts(g.name).person}</button><div className="lb-bar" title={`${g.appearances.length} appearances`}><span><b>{g.appearances.length} {g.appearances.length===1?'appearance':'appearances'}</b></span></div></li>)}</ol></aside></div><div className="controls"><label>Find a guest<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search guests or episode numbers"/></label><label>Sort by<select value={sort} onChange={e=>setSort(e.target.value)}><option value="oldest">First appearance</option><option value="newest">Most recent</option><option value="most">Most appearances</option><option value="az">A to Z</option></select></label></div><div className="guest-grid">{guests.map((g:any)=>{const {person,brand}=displayParts(g.name);return <article className="guest-card" id={g.slug} key={g.slug}><div className="guest-photo">{g.photo?<img src={g.photo} alt={g.name} loading="lazy"/>:<span className="guest-initials" aria-hidden="true">{initials(g.name)}</span>}</div><h2>{person}</h2>{brand&&<p className="guest-brand">{brand}</p>}<p className="guest-eps"><span>{g.appearances.length===1?'Episode':'Episodes'}</span>{g.appearances.map((a:any)=><Out key={a.episode} href={`https://www.youtube.com/watch?v=${a.videoId}`} title={a.title}>{a.episode}</Out>)}</p>{g.social&&<p className="guest-social"><Out href={g.social}>Follow</Out></p>}</article>})}</div>{!guests.length&&<Empty text="No guests match that search."/>}</>}
 {page==='contact'&&<><PageHead label="GET IN TOUCH" title="Say hello." description="Questions, ideas, collaborations, or a project you think we should see? Send us a note and we’ll get back to you."/><ContactForm/></>}
 {page==='link-dumps'&&<><div className="dumps-top"><PageHead title="Hot Dumps" description="Every link the community tagged #HotMakes ahead of each show, one dump per episode."/>{leaders.length>0&&<aside className="leaderboard" aria-label="Hottest HotMakers"><h2>Hottest HotMakers</h2><p className="small">The most #HotMakes tags of all time!</p><ol>{leaders.map((l:any,i:number)=><li key={l.h} style={{'--w':`${Math.round(l.n/leaders[0].n*100)}%`,'--i':i} as any}><span className="lb-place">{i===0?<span className="lb-flame" aria-label="Number 1"><img src="/assets/lb-flame.webp" alt="" width="116" height="140"/><b>#1</b></span>:`#${i+1}`}</span><button type="button" className="lb-name" title={`Show only the tags @${l.h} submitted`} onClick={()=>{setQuery(`@${l.h}`);document.querySelector('.controls')?.scrollIntoView({behavior:'smooth',block:'start'})}}>@{l.h}</button><div className="lb-bar" title={`${l.n} tags submitted, all time`}><span><b>{l.n} {l.n===1?'tag':'tags'}</b></span></div></li>)}</ol></aside>}</div><div className="controls"><label>Find a link<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search by creator or post text" type="search"/></label><label>Sort by<select value={epSort} onChange={e=>setEpSort(e.target.value)}><option value="newest">Newest First</option><option value="oldest">Oldest First</option></select></label></div>{query.trim()&&dumps&&<p className="small dump-count">{dumpList.reduce((n:number,d:any)=>n+d.items.length+d.extras.length,0)} {dumpList.reduce((n:number,d:any)=>n+d.items.length+d.extras.length,0)===1?'link':'links'} across {dumpList.length} {dumpList.length===1?'dump':'dumps'} <button type="button" className="link-button" onClick={()=>setQuery('')}>Clear search</button></p>}{dumpError&&<Empty text="The dumps didn’t load. Please refresh and try again."/>}{!dumps&&!dumpError&&<Empty text="Loading the dumps..."/>}<div className="dump-list">{dumpList.map((d:any)=>{const key=dumpKey(d);const open=!!query||openDumps.includes(key);return <section key={key} id={key} className="dump"><div className="dump-head"><button type="button" className="dump-toggle" aria-expanded={open} onClick={()=>{if(query)return;setOpenDumps(p=>p.includes(key)?p.filter(k=>k!==key):[...p,key])}}><span aria-hidden="true" className="dump-sign">{open?'−':'+'}</span>Episode {d.episodes.join(' & ')}{d.ep&&<>: {d.ep.title.replace(/^#?HotMakes\s*(?:Ep\.?\s*\d+\s*[-–:]?\s*)?/i,'')}</>}</button>{d.ep&&<Out href={`https://www.youtube.com/watch?v=${d.ep.id}`} className="dump-watch">Watch</Out>}</div>{open&&<div className="dump-body">{d.episodes.slice(1).map((x:number)=><span key={x} id={`ep-${x}`}/>)}<div className="dump-table" role="table"><div className="dump-row dump-cols" role="row"><span role="columnheader">Handle</span><span role="columnheader">Date</span><span role="columnheader">Post</span><span role="columnheader">Link</span></div>{d.extras.map((x:any,i:number)=><div className="dump-row" role="row" key={`x${i}`}><span className="c-handle" role="cell">{x.l}</span><span className="c-date" role="cell"></span><span className="c-text" role="cell">{x.t}</span><span className="c-link" role="cell"><Out href={x.u}>Open</Out></span></div>)}{d.items.map((i:any)=><div className="dump-row" role="row" key={i.u}><span className="c-handle" role="cell">@{i.h}</span><span className="c-date" role="cell">{i.d?date(i.d+'T12:00:00'):''}</span><span className="c-text" role="cell" title={i.t}>{i.t}</span><span className="c-link" role="cell"><Out href={i.u}>View</Out></span></div>)}</div></div>}</section>})}</div>{dumps&&!dumpList.length&&<Empty text="No links match that search."/>}</>}
 {page==='donate'&&<><PageHead label="FUELED BY THE COMMUNITY" title="Keep the makes coming." description="If HotMakes has inspired your next project or made your Monday a little better, you can help keep the show going."/><div className="donation-layout"><section className="donation-copy"><h2>For the show.<br/>Back to the community.</h2><p>HotMakes doesn’t make a profit, and we don’t pocket donations ourselves. Contributions go back into the show and help us keep creating something for the maker community.</p><p>Support helps cover the costs of producing and running HotMakes. We’ll share a more detailed breakdown here once it’s confirmed.</p><p>Watching, sharing your makes, and joining the conversation are valuable ways to support us, too. Donations are always optional.</p></section><aside className="donate-box"><img src="/assets/favicon.png" alt=""/><h2>A little fuel for the fire.</h2><p>Our PayPal donation link will be available here soon.</p><span className="donate-pending">Donations aren’t open on this page yet</span><p className="small">Thank you for being part of HotMakes.</p></aside></div></>}
 </main><footer className="site-footer wrap"><div className="footer-brand"><img src="/assets/hotmakes-logo-solid.svg" alt="HotMakes"/><p>Keep making. Stay curious. Be yourself!</p></div><nav className="footer-nav" aria-label="Footer">{nav.map(([url,label])=><a key={url} href={url}>{label}</a>)}<Out href="https://www.youtube.com/channel/UCeqoSThyqiZgIMhGBCCLLcg">YouTube</Out></nav><p className="copyright">© {new Date().getFullYear()} HotMakes. All rights reserved.</p></footer></div></>
}
function ContactForm(){
 const [status,setStatus]=useState<'idle'|'sending'|'sent'|'error'>('idle');
 async function submit(e:any){
  e.preventDefault();
  const form=e.currentTarget,d=new FormData(form);
  if(d.get('_honey'))return; // hidden field that only bots fill in
  setStatus('sending');
  try{
   const res=await fetch(CONTACT_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({name:d.get('name'),email:d.get('email'),message:d.get('message'),_subject:'New message from the HotMakes website',_template:'table',_captcha:'false'})});
   const out:any=await res.json().catch(()=>({}));
   if(!res.ok||out.success==='false'||out.success===false)throw Error();
   form.reset();setStatus('sent');
  }catch{setStatus('error')}
 }
 return <form className="contact-form" onSubmit={submit}>
 <label>Your name<input name="name" type="text" autoComplete="name" required maxLength={120}/></label>
 <label>Your email<input name="email" type="email" autoComplete="email" required maxLength={200}/></label>
 <label>Message<textarea name="message" required rows={7} maxLength={5000}/></label>
 <input className="hp" name="_honey" type="text" tabIndex={-1} autoComplete="off" aria-hidden="true"/>
 <div className="form-actions"><button className="button" type="submit" disabled={status==='sending'}>{status==='sending'?'Sending...':'Send message'}</button></div>
 <div role="status" aria-live="polite">
  {status==='sent'&&<p className="connection-note">Message sent. Thanks for reaching out!</p>}
  {status==='error'&&<p className="connection-note">That didn’t go through. Please try again, or email us at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>}
 </div>
 </form>
}
function PageHead({label,title,description}:any){return <header className="page-head">{label&&<p className="eyebrow">{label}</p>}<h1>{title}</h1><p className="lede">{description}</p></header>}
function Empty({text}:any){return <p className="empty" role="status">{text}</p>}

function HostPortrait({name,slug}:{name:string,slug:string}){
 const photo=slug==='joey'?'joey-photo.png':`${slug}-photo-repaired.png`;
 const ref=useRef<HTMLDivElement>(null);
 // The cartoon drifts a little as the page scrolls (CSS in motion.css does the rest).
 useEffect(()=>{
  const el=ref.current;
  if(!el||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  let frame=0;
  const update=()=>{frame=0;const r=el.getBoundingClientRect(),vh=window.innerHeight;const p=Math.max(-1,Math.min(1,(r.top+r.height/2-vh/2)/vh));
   el.style.setProperty('--py',`${(p*-30).toFixed(1)}px`);el.style.setProperty('--px',`${(Math.sin(p*3.2)*10).toFixed(1)}px`);el.style.setProperty('--rot',`${(p*6).toFixed(1)}deg`)};
  const onScroll=()=>{if(!frame)frame=requestAnimationFrame(update)};
  update();addEventListener('scroll',onScroll,{passive:true});addEventListener('resize',onScroll);
  return()=>{removeEventListener('scroll',onScroll);removeEventListener('resize',onScroll);cancelAnimationFrame(frame)};
 },[]);
 return <div ref={ref} className="host-portrait">
 <img className="host-photo" src={`/assets/hosts/${photo}`} alt={name} loading="lazy"/>
 <img className="host-avatar" src={`/assets/hosts/${slug}-avatar.png`} alt="" aria-hidden="true" loading="lazy"/>
 </div>
}
