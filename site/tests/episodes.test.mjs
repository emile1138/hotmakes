import test from 'node:test';
import assert from 'node:assert/strict';
import {featuredEpisode,previousEpisodes,normalizeVideo,mergeEpisodes,isStaleUpcoming} from '../lib/episodes.mjs';
const e=(id,status,extra={})=>({id,status,number:Number(id),...extra});
test('live wins over upcoming and replay',()=>assert.equal(featuredEpisode([e('1','completed'),e('2','upcoming',{scheduledAt:'2027-01-01'}),e('3','live')]).id,'3'));
test('nearest upcoming wins, even if waiting past scheduled time',()=>assert.equal(featuredEpisode([e('1','completed'),e('2','upcoming',{scheduledAt:'2027-01-01'}),e('3','upcoming',{scheduledAt:'2026-01-01'})],Date.parse('2026-01-01T03:00:00Z')).id,'3'));
test('end of broadcast returns playable latest replay',()=>assert.equal(featuredEpisode([e('225','completed'),e('226','completed')]).id,'226'));
test('five previous exclude featured replay',()=>assert.deepEqual(previousEpisodes(Array.from({length:7},(_,i)=>e(String(i+1),'completed')),e('7','completed')).map(x=>x.id),['6','5','4','3','2']));
test('live featured retains five most recent replays',()=>assert.equal(previousEpisodes([e('3','live'),e('2','completed'),e('1','completed')],e('3','live'))[0].id,'2'));
test('actual end overrides lingering live flag',()=>assert.equal(normalizeVideo({id:'x',snippet:{title:'HotMakes Ep 1',liveBroadcastContent:'live'},liveStreamingDetails:{actualEndTime:'2026-01-01'}}).status,'completed'));
test('empty catalog is safe',()=>assert.equal(featuredEpisode([]),null));
test('merge keeps seed fields, adds dates, and lets current status win',()=>{
  const m=mergeEpisodes([e('1','completed',{archiveOrder:4})],[e('1','completed',{startedAt:'2026-01-01'}),e('2','completed')],[e('3','live'),e('2','completed',{title:'new'})]);
  assert.equal(m.length,3);
  assert.equal(m.find(x=>x.id==='1').archiveOrder,4);
  assert.equal(m.find(x=>x.id==='1').startedAt,'2026-01-01');
  assert.equal(m.find(x=>x.id==='2').title,'new');
  assert.equal(m.find(x=>x.id==='3').status,'live');
});
test('a stream that went live to completed replaces its live copy',()=>{
  const m=mergeEpisodes([],[],[e('9','completed')]);
  assert.equal(featuredEpisode(m).id,'9');
});
test('abandoned scheduled stream is ignored instead of featured forever',()=>{
  const now=Date.parse('2026-11-08T22:00:00Z');
  const items=[e('226','completed'),e('224b','upcoming',{scheduledAt:'2026-10-05T23:00:00Z'})];
  assert.equal(isStaleUpcoming(items[1],now),true);
  assert.equal(featuredEpisode(items,now).id,'226');
});
test('stream scheduled a few hours ago is still treated as upcoming',()=>{
  const now=Date.parse('2026-11-08T22:00:00Z');
  assert.equal(featuredEpisode([e('1','completed'),e('2','upcoming',{scheduledAt:'2026-11-08T18:00:00Z'})],now).id,'2');
});

import {dedupeSimulcasts, yearCounts, episodeYear} from '../lib/episodes.mjs';
const mk=(id,channel,number,title,startedAt)=>({id,channel,number,title,startedAt,status:'completed'});
test('dedupeSimulcasts keeps HotMakes copy, keeps Edge-only and week-apart reruns', () => {
  const items=[
    mk('h1','HotMakes',100,'HotMakes Ep 100','2022-04-18T23:00:00Z'),mk('e1','The Edge of Tech',100,'HotMakes Ep 100','2022-04-18T23:10:00Z'),
    mk('e2','The Edge of Tech',20,'Edge Ep 20','2021-01-01T23:00:00Z'),
    mk('h3','HotMakes',153,'Ep 153','2023-07-03T23:00:00Z'),mk('e3','The Edge of Tech',153,'Ep 153','2023-07-10T23:00:00Z'),
    mk('h4','HotMakes',null,'Holiday Special!','2024-12-17T00:00:00Z'),mk('e4','The Edge of Tech',null,'The Holiday Special','2024-12-17T00:00:00Z'),
    mk('h5','HotMakes',null,'Holiday Special!','2024-12-17T00:00:00Z'),mk('e5','The Edge of Tech',null,'Holiday Special','2024-12-17T00:30:00Z'),
  ];
  const ids=dedupeSimulcasts(items).map(e=>e.id).sort();
  assert.deepEqual(ids,['e2','e3','e4','h1','h3','h4','h5']);
});
test('episodeYear uses Central time; yearCounts sorts newest first', () => {
  assert.equal(episodeYear({startedAt:'2026-01-01T03:00:00Z'}),2025);
  assert.deepEqual(yearCounts([{startedAt:'2024-06-01T18:00:00Z'},{startedAt:'2026-06-01T18:00:00Z'},{startedAt:'2026-07-01T18:00:00Z'},{}]),[[2026,2],[2024,1]]);
});
