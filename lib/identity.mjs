import {enrichAircraft} from '../public/classification.mjs';
// Verified against the public OGN device registry, 5 October 2026.
const seed=[{registration:'G-DDNE',device_id:'405720',aircraft_model:'Astir CS-77',aircraft_type:1,tracked:'Y',identified:'Y'},{registration:'G-DDSL',device_id:'D01496',aircraft_model:'Twin Astir I',aircraft_type:1,tracked:'Y',identified:'Y'}];
const normalize=s=>String(s||'').replace(/[^a-z0-9]/gi,'').toUpperCase();
const cache=new Map(seed.map(a=>[normalize(a.registration),{at:Date.now(),data:a}]));
let retryAfter=0;
export function applyIdentity(a,devices){
 const matches=devices.filter(d=>d.tracked==='Y'&&d.identified==='Y'&&((normalize(a.registration)&&normalize(d.registration)===normalize(a.registration))||String(d.device_id).toUpperCase()===String(a.deviceId).toUpperCase()));
 const types=[...new Set(matches.map(d=>String(d.aircraft_type||'')).filter(Boolean))];
 if(types.length!==1)return enrichAircraft(a);
 return enrichAircraft({...a,registryType:types[0],aircraftType:matches[0].aircraft_model||a.aircraftType,identitySource:'OGN device registry'});
}
export async function enrichIdentities(rows){
 const now=Date.now(),regs=[...new Set(rows.filter(a=>a.source==='OGN'||a.sources?.includes('OGN')||a.aircraftKind==='probable').map(a=>a.registration).filter(r=>/^[a-z0-9-]{2,12}$/i.test(r)))];
 const missing=regs.filter(r=>!cache.has(normalize(r))||now-cache.get(normalize(r)).at>86400000);
 if(missing.length&&now>retryAfter){
  try{
   for(let i=0;i<missing.length;i+=40){
    const group=missing.slice(i,i+40),u=new URL('https://ddb.glidernet.org/download/');u.searchParams.set('j','1');u.searchParams.set('t','1');u.searchParams.set('registration',group.join(','));
    const response=await fetch(u,{signal:AbortSignal.timeout(5000),headers:{Accept:'application/json','User-Agent':'Flightboard/0.9'}});
    if(!response.ok)throw Error('Registry unavailable');const data=await response.json();if(!Array.isArray(data.devices))throw Error('Invalid registry');
    for(const reg of group)cache.set(normalize(reg),{at:now,data:data.devices.filter(d=>normalize(d.registration)===normalize(reg)&&d.tracked==='Y'&&d.identified==='Y')});
   }
  }catch{retryAfter=now+300000;}
 }
 return rows.map(a=>{const entry=cache.get(normalize(a.registration));return applyIdentity(a,entry?[entry.data].flat():[])});
}
