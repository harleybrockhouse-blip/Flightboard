import test from 'node:test';import assert from 'node:assert/strict';
import {createRecordsHandler} from '../netlify/functions/records.mjs';
import {createCollector} from '../netlify/functions/collect.mjs';
import {dayKey} from '../public/tracker.mjs';
const now=Date.now(),day=dayKey(now),flight={id:'ABC-123',deviceId:'ABC',registration:'G-TEST',origin:'BRENTOR',takeoffAt:now-3600000,landingAt:null,lastReportAt:now,status:'AIRBORNE'};
function memory(){const data=new Map(),tags=new Map();let seq=0;return{async list(){return {blobs:[...data.keys()].filter(key=>key.startsWith('positions/')).map(key=>({key}))}},async delete(k){data.delete(k)},async get(k){return structuredClone(data.get(k)||null)},async getWithMetadata(k){return data.has(k)?{data:structuredClone(data.get(k)),etag:tags.get(k)}:null},async setJSON(k,v,o={}){if((o.onlyIfNew&&data.has(k))||(o.onlyIfMatch&&o.onlyIfMatch!==tags.get(k)))return {modified:false};data.set(k,structuredClone(v));const etag=String(++seq);tags.set(k,etag);return {modified:true,etag}},data};}
const request=(body,key='test-secret')=>new Request(`https://board.test/.netlify/functions/records?day=${day}`,{method:'POST',headers:{authorization:`Bearer ${key}`},body:JSON.stringify(body)});
test('shared records disabled returns local-mode indicator',async()=>{const handler=createRecordsHandler(()=>null,()=>false);assert.deepEqual(await(await handler(new Request('https://board.test'))).json(),{enabled:false})});
test('shared read merges corrections without changing original detection',async()=>{const s=memory();await s.setJSON(`days/${day}`,[flight]);await s.setJSON('corrections/ABC-123',{registration:'G-FIXED',landingAt:now-1000});const handler=createRecordsHandler(()=>s,()=>true);const result=await(await handler(new Request(`https://board.test?day=${day}`))).json();assert.equal(result.flights[0].registration,'G-FIXED');assert.equal(s.data.get(`days/${day}`)[0].registration,'G-TEST')});
test('shared edits require key, validate data, and reject stale concurrent edits',async()=>{process.env.FLIGHTBOARD_EDIT_KEY='test-secret';const s=memory();await s.setJSON(`days/${day}`,[flight]);const handler=createRecordsHandler(()=>s,()=>true);const body={id:flight.id,patch:{registration:'G-TEST',origin:'BRENTOR',takeoffAt:flight.takeoffAt,landingAt:now-1000,note:'Launch log checked'},expectedEditedAt:null};assert.equal((await handler(request(body,'wrong'))).status,401);assert.equal((await handler(request({...body,patch:{...body.patch,landingAt:1}}))).status,400);assert.equal((await handler(request(body))).status,200);assert.equal((await handler(request(body))).status,409);const saved=s.data.get(`days/${day}`)[0];assert.equal(saved.landingAt,null)});
test('collector persists records and skips when another invocation holds the lease',async()=>{const s=memory();await s.setJSON('collector-lease',{until:now+999999});let fetches=0;const collector=createCollector(()=>s,()=>true,async()=>{fetches++;return {aircraft:[]}});await collector();assert.equal(fetches,0);await s.setJSON('collector-lease',{until:0});await collector();assert.equal(fetches,1);assert.ok(s.data.get('tracker'));assert.equal(s.data.get('collector-lease').until,0)});


test('server collection and reads work without an opt-in environment variable',async()=>{
 const previous=process.env.FLIGHTBOARD_SHARED;
 try{
  delete process.env.FLIGHTBOARD_SHARED;
  const s=memory();let fetches=0;
  await createCollector(()=>s,undefined,async()=>{fetches++;return {aircraft:[]}})();
  assert.equal(fetches,1);assert.ok(s.data.get('tracker'));
  const result=await(await createRecordsHandler(()=>s)(new Request('https://board.test'))).json();
  assert.equal(result.enabled,true);
  process.env.FLIGHTBOARD_SHARED='false';
  await createCollector(()=>s,undefined,async()=>{fetches++;return {aircraft:[]}})();
  assert.equal(fetches,1);
  assert.deepEqual(await(await createRecordsHandler(()=>s)(new Request('https://board.test'))).json(),{enabled:false});
 }finally{if(previous===undefined)delete process.env.FLIGHTBOARD_SHARED;else process.env.FLIGHTBOARD_SHARED=previous;}
});
test('shared aircraft confirmation requires authentication and is recovered on later reads',async()=>{
 process.env.FLIGHTBOARD_EDIT_KEY='test-secret';const s=memory();
 await s.setJSON(`days/${day}`,[{...flight,vehicleType:'0',sources:['OGN']}]);
 const handler=createRecordsHandler(()=>s,()=>true);
 const body={id:flight.id,patch:{registration:flight.registration,origin:'VISITOR',takeoffAt:flight.takeoffAt,landingAt:null,note:'Aircraft type checked',confirmedKind:'glider'},expectedEditedAt:null};
 assert.equal((await handler(request(body,'wrong'))).status,401);
 assert.equal((await handler(request(body))).status,200);
 const result=await(await handler(new Request(`https://board.test?day=${day}`))).json();
 assert.equal(result.flights[0].confirmedKind,'glider');assert.equal(result.flights[0].aircraftKind,'glider');assert.equal(result.flights[0].origin,'VISITOR');
 assert.equal(s.data.get(`days/${day}`)[0].confirmedKind,undefined);
});
test('seven-day logbook loads each date, retains visitor gliders, and rejects invalid ranges',async()=>{
 const s=memory(),end='2026-10-05';await s.setJSON('days/2026-10-04',[{...flight,id:'sunday',registration:'G-DDSL',sources:['OGN'],origin:'VISITOR',takeoffAt:Date.parse('2026-10-04T14:00:00Z')}]);
 const handler=createRecordsHandler(()=>s,()=>true);
 const result=await(await handler(new Request(`https://board.test?day=${end}&days=7`))).json();
 assert.equal(result.days.length,7);assert.equal(result.flights.length,1);assert.equal(result.flights[0].aircraftKind,'glider');assert.equal(result.flights[0].origin,'VISITOR');
 assert.equal((await handler(new Request('https://board.test?day=2026-02-30'))).status,400);
 assert.equal((await handler(new Request('https://board.test?days=8'))).status,400);
});
