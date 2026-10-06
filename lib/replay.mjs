import {Tracker,dayKey} from '../public/tracker.mjs';
import {classify,isPredannack} from '../public/classification.mjs';
export async function repairActivity(s,cfg,dates,now=Date.now()){
 if(typeof s.list!=='function')return;
 const marker='repair-v11/'+dates.join('_'),done=await s.get(marker,{type:'json'});
 if(done&&now-done.at<3600000)return;
 const wanted=new Set(dates),keys=(await s.list({prefix:'positions/'})).blobs.map(b=>b.key).filter(k=>{
  const at=Number(k.slice(10));return Number.isFinite(at)&&[dayKey(at),dayKey(at+3599999)].some(d=>wanted.has(d));
 }).sort((a,b)=>Number(a.slice(10))-Number(b.slice(10)));
 const tracker=new Tracker({},cfg);
 for(let i=0;i<keys.length;i+=4){
  const hours=await Promise.all(keys.slice(i,i+4).map(k=>s.get(k,{type:'json'})));
  for(const rows of hours)for(const snap of (rows||[]).sort((a,b)=>a.at-b.at)){
   if(!wanted.has(dayKey(snap.at)))continue;
   const aircraft=(snap.aircraft||[]).filter(a=>['glider','probable'].includes(classify(a).kind)&&(cfg.origin!=='PREDANNACK'||isPredannack(a)));
   tracker.update(aircraft,snap.at);
  }
 }
 tracker.tick(now);
 for(const day of dates){
  const recovered=tracker.flights.filter(f=>dayKey(f.takeoffAt)===day);if(!recovered.length)continue;
  const prior=await s.getWithMetadata('days/'+day,{type:'json'}),old=prior?.data||[];
  const merged=[...old];
  for(const f of recovered){
   const index=merged.findIndex(x=>x.id===f.id||x.deviceId===f.deviceId&&Math.abs(x.takeoffAt-f.takeoffAt)<180000);
   if(index<0)merged.push({...f,historical:true,reconstructed:true});
   else if(merged[index].origin==='VISITOR'||merged[index].detectionVersion<11){
    const original=merged[index];merged[index]={...original,...f,id:original.id,historical:true,reconstructed:true};
   }
  }
  await s.setJSON('days/'+day,merged,prior?{onlyIfMatch:prior.etag}:{onlyIfNew:true});
 }
 await s.setJSON(marker,{at:now,hours:keys.length,recovered:tracker.flights.length});
}
