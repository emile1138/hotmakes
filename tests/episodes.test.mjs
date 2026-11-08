import test from 'node:test';
import assert from 'node:assert/strict';
import {featuredEpisode,previousEpisodes,normalizeVideo,mergeEpisodes} from '../lib/episodes.mjs';
const e=(id,status,extra={})=>({id,status,number:Number(id),...extra});
test('live wins over upcoming and replay',()=>assert.equal(featuredEpisode([e('1','completed'),e('2','upcoming',{scheduledAt:'2027-01-01'}),e('3','live')]).id,'3'));
test('nearest upcoming wins, even if waiting past scheduled time',()=>assert.equal(featuredEpisode([e('1','completed'),e('2','upcoming',{scheduledAt:'2027-01-01'}),e('3','upcoming',{scheduledAt:'2026-01-01'})]).id,'3'));
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
