import {AIRFIELDS} from '../../public/airfields.mjs';
import {Tracker,dayKey} from '../../public/tracker.mjs';
import {fetchTraffic} from '../../lib/traffic.mjs';
import {enabled,store} from '../../lib/store.mjs';
import {saveHistory} from '../../lib/history.mjs';
export const config={schedule:'* * * * *'};
export const createCollector=(getStore=store,isEnabled=enabled,getFeed=fetchTraffic,airfield=AIRFIELDS.brentor)=>async()=>{
 if(!isEnabled())return new Response(null,{status:204});
 const s=getStore(airfield.id),now=Date.now();
 // A conditional lease prevents overlapping scheduled invocations from racing.
 const previous=await s.getWithMetadata('collector-lease',{type:'json'});
 if(previous?.data?.until>now)return new Response(null,{status:204});
 const lease=await s.setJSON('collector-lease',{until:now+55000},previous?{onlyIfMatch:previous.etag}:{onlyIfNew:true});
 if(!lease.modified)return new Response(null,{status:204});
 try{
  const old=await s.get('tracker',{type:'json'}),cfg={...airfield,...JSON.parse(process.env[airfield.id==='brentor'?'FLIGHTBOARD_CONFIG':'FLIGHTBOARD_PREDANNACK_CONFIG']||'{}')},tracker=new Tracker(old||{},cfg);
  const patches={};for(const f of tracker.flights){if(!f.landingAt)patches[f.id]=await s.get(`corrections/${f.id}`,{type:'json'});}
  tracker.reconcile(patches);const feed=await getFeed(airfield.id);tracker.update(feed.aircraft);
  // Persist the engine first; archive writes recover from the next scheduled run.
  await s.setJSON('tracker',tracker.snapshot());
  const days=[...new Set(tracker.flights.map(f=>dayKey(f.takeoffAt)))];
  for(const day of days){const oldDay=await s.get(`days/${day}`,{type:'json'})||[];const merged=new Map(oldDay.map(f=>[f.id,f]));for(const f of tracker.flights.filter(f=>dayKey(f.takeoffAt)===day))merged.set(f.id,f);await s.setJSON(`days/${day}`,[...merged.values()]);}
  tracker.flights=tracker.flights.filter(f=>(!f.landingAt&&!f.closedByCorrection&&!f.closedUnresolved)||Date.now()-f.takeoffAt<172800000);
  await s.setJSON('tracker',tracker.snapshot());
  await saveHistory(s,feed,now);
 }finally{await s.setJSON('collector-lease',{until:0},{onlyIfMatch:lease.etag});}
 return new Response(null,{status:204});
};

export default async()=>{const results=await Promise.allSettled(Object.values(AIRFIELDS).map(airfield=>createCollector(store,enabled,fetchTraffic,airfield)()));if(results.some(r=>r.status==='rejected'))throw new Error('One or more airfield collectors failed');return new Response(null,{status:204});};

