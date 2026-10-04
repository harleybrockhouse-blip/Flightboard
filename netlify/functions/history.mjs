import {resolveAirfield} from '../../public/airfields.mjs';
import {enabled,store} from '../../lib/store.mjs';
import {RETENTION_MS,HOUR_MS,historyKey} from '../../lib/history.mjs';
const reply=(data,status=200)=>Response.json(data,{status,headers:{'cache-control':'no-store'}});
export const createHistoryHandler=(getStore=store,isEnabled=enabled,clock=Date.now)=>async req=>{
 if(req.method!=='GET')return reply({error:'Method not allowed'},405);
 if(!isEnabled())return reply({enabled:false});
 const u=new URL(req.url),airfield=resolveAirfield(u.searchParams.get('airfield'));
 if(!airfield)return reply({error:'Unknown airfield'},400);
 try{
  const s=getStore(airfield.id),now=clock(),cutoff=now-RETENTION_MS;
  const hour=u.searchParams.get('hour');
  if(hour===null){
   const [status,{blobs}]=await Promise.all([s.get('history-status',{type:'json'}),s.list({prefix:'positions/'})]);
   const hours=blobs.map(x=>Number(x.key.slice(10))).filter(t=>Number.isFinite(t)&&t+HOUR_MS>cutoff&&t<=now).sort((a,b)=>a-b);
   return reply({enabled:true,airfield:airfield.id,retentionDays:7,sampleSeconds:60,updatedAt:status?.updatedAt||0,availableHours:hours,cutoff});
  }
  const t=Number(hour);
  if(!/^\d+$/.test(hour)||!Number.isSafeInteger(t)||t%HOUR_MS!==0)return reply({error:'Invalid hour timestamp'},400);
  if(t+HOUR_MS<=cutoff||t>now)return reply({error:'Outside seven-day retention window'},410);
  const snapshots=(await s.get(historyKey(t),{type:'json'})||[]).filter(x=>x.at>=cutoff&&x.at<=now);
  return reply({enabled:true,airfield:airfield.id,hour:t,snapshots});
 }catch{return reply({error:'Server history unavailable'},503);}
};
export default createHistoryHandler();
