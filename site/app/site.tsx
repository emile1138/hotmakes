'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import seed from '../data/content.json';
import {featuredEpisode,previousEpisodes,orderEpisodes,mergeEpisodes} from '../lib/episodes.mjs';
// Written every few minutes by .github/workflows/refresh-episodes.yml
const DATA='https://raw.githubusercontent.com/emile1138/hotmakes/data';
const initial:any=seed;
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
 const [data,setData]=useState<any>({episodes:initial.episodes,mode:'snapshot',archiveComplete:initial.archiveComplete});const [query,setQuery]=useState('');const [filter,setFilter]=useState('all');const [sort,setSort]=useState('oldest');const [limit,setLimit]=useState(24);const [loadError,setLoadError]=useState(false);const [playerId,setPlayerId]=useState<string|null>(null);const [refreshVersion,setRefreshVersion]=useState(0);
 useEffect(()=>{let cancelled=false;const load=async()=>{try{const [r,a]=await Promise.all([fetch(`${DATA}/episodes.json`,{cache:'no-store'}),fetch(`${DATA}/archive.json`,{cache:'no-store'}).catch(()=>null)]);if(!r.ok)throw Error();const cur=await r.json();const arc=a&&a.ok?await a.json().catch(()=>null):null;const fresh=Date.now()-Date.parse(cur.checkedAt||'')<3*3600e3;const next={episodes:mergeEpisodes(initial.episodes,arc?.episodes||[],cur.episodes||[]),mode:fresh?'connected':'unavailable',archiveComplete:!!arc?.archiveComplete};if(!cancelled){setData((prev:any)=>next.mode==='unavailable'&&prev.mode==='connected'?{...prev,mode:'unavailable'}:next);setLoadError(false)}}catch{if(!cancelled)setLoadError(true)}};load();const timer=setInterval(load,60000);return()=>{cancelled=true;clearInterval(timer)}},[refreshVersion]);
 const feature=useMemo(()=>featuredEpisode(data.episodes),[data.episodes]);
 useEffect(()=>{if(feature)setPlayerId(feature.id)},[feature?.id]);
 const playing=data.episodes.find((e:any)=>e.id===playerId)||feature;
 const recent=previousEpisodes(data.episodes,feature);
 const filtered=orderEpisodes(data.episodes).filter((e:any)=>e.status==='completed').filter((e:any)=>(filter==='all'||e.channel===filter)&&`${e.title} ${e.number||''}`.toLowerCase().includes(query.toLowerCase()));
 const models=initial.models.filter((m:any)=>(filter==='all'||m.links.some((l:any)=>l.platform.startsWith(filter)))&&`${m.title} ${m.creator}`.toLowerCase().includes(query.toLowerCase()));
 const guests=[...initial.guests].filter((g:any)=>`${g.name} ${g.episodeTitle||''} ${g.episode||''}`.toLowerCase().includes(query.toLowerCase())).sort((a:any,b:any)=>sort==='oldest'?a.episode-b.episode:b.episode-a.episode);
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
 {page==='episodes'&&<><PageHead label="THE ARCHIVE" title="Every era. All the makes." description="Explore HotMakes from The Edge of Tech days through the show’s own YouTube channel."/><p className="catalog-note">{data.archiveComplete?'Publicly available HotMakes episodes from both channels.':`${data.episodes.length} verified video listings from both channels. Simulcasts are retained; missing or unlisted broadcasts are still being checked.`}</p><div className="controls"><label>Find an episode<input value={query} onChange={e=>{setQuery(e.target.value);setLimit(24)}} placeholder="Search titles, guests, or episode numbers" type="search"/></label><label>Channel<select value={filter} onChange={e=>{setFilter(e.target.value);setLimit(24)}}><option value="all">Both channels</option>{[...new Set(data.episodes.map((e:any)=>e.channel))].filter(Boolean).map((c:any)=><option key={c}>{c}</option>)}</select></label></div><p className="small">{filtered.length} {filtered.length===1?'episode':'episodes'}</p><div className="archive-grid">{filtered.slice(0,limit).map((e:any)=><EpisodeCard key={e.id} e={e}/>)}</div>{!filtered.length&&<Empty text="No episodes match that search."/>}{filtered.length>limit&&<button className="button load-more" onClick={()=>setLimit(n=>n+24)}>Show more episodes</button>}</>}
 {page==='prints'&&<><PageHead label="FROM THE SHOW TO YOUR BUILD PLATE" title="Print a little HotMakes." description="Show-inspired models, community collaborations, and familiar troublemakers for your printer. Get the files directly from their creators."/><p className="catalog-note">This collection is growing. Verified creator links are listed below; the Banana for Scale link and additional MakerWorld releases are still being tracked down.</p><div className="controls"><label>Find a print<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search models or creators"/></label><label>Platform<select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All platforms</option><option>Thangs</option><option>Printables</option><option>MakerWorld</option></select></label></div><div className="models-grid">{models.map((m:any,i:number)=><article className="model" key={m.title}><p className="eyebrow">{m.creator}</p><h2>{m.title}</h2><p>{m.description}</p><div className="link-row">{m.links.map((l:any)=><Out key={l.url} href={l.url}>{l.platform}</Out>)}</div>{m.episodeUrl&&<Out className="small" href={m.episodeUrl}>See it on the show</Out>}</article>)}</div>{!models.length&&<Empty text={filter==='MakerWorld'?'No verified MakerWorld listings added yet.':'No prints match that search.'}/>}<p className="small">Files remain on their original platforms. Check each creator’s license and printing instructions before use.</p></>}
 {page==='guests'&&<><PageHead label="THE PEOPLE BEHIND THE MAKES" title="Good company. Great conversations." description="Meet the creators who have joined HotMakes, in order of their appearances. Follow their work and revisit their episodes."/><p className="catalog-note">Guest index in progress. Only confirmed appearances are listed; profiles link to verified creator accounts. Most-active accounts are still being reviewed.</p><div className="controls"><label>Find a guest<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search guests or episode numbers"/></label><label>Appearance order<select value={sort} onChange={e=>setSort(e.target.value)}><option value="oldest">Earliest first</option><option value="newest">Most recent first</option></select></label></div><div className="guest-list">{guests.map((g:any,i:number)=><article className="guest" key={`${g.episode}-${g.name}`}><span className="guest-episode">EP. {g.episode}</span><div><h2>{g.name}</h2><p>{g.episodeTitle}</p>{g.social&&<Out href={g.social}>Follow {g.name}</Out>}</div><Out href={`https://www.youtube.com/watch?v=${g.videoId}`} className="button">Watch episode</Out></article>)}</div>{!guests.length&&<Empty text="No guests match that search."/>}</>}
 {page==='contact'&&<><PageHead label="GET IN TOUCH" title="Say hello." description="Questions, ideas, collaborations, or a project you think we should see? Send us a note and we’ll get back to you."/><ContactForm/></>}
 {page==='link-dumps'&&<><PageHead label="FROM THE SHOW" title="Link Dumps" description="Links from the show, collected in one place."/><Empty text="The first link dump is coming soon."/></>}
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
function PageHead({label,title,description}:any){return <header className="page-head"><p className="eyebrow">{label}</p><h1>{title}</h1><p className="lede">{description}</p></header>}
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
