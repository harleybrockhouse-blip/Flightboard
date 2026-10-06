import {enrichIdentities} from '../../lib/identity.mjs';
import {resolveAirfield} from '../../public/airfields.mjs';
import {enabled,store} from '../../lib/store.mjs';
import {dayKey,validateCorrection,corrected} from '../../public/tracker.mjs';
import {localRecord} from '../../public/logbook.mjs';
import {isPredannack,classify} from '../../public/classification.mjs';
import {timingSafeEqual} from 'node:crypto';
const reply=(data,status=200)=>Response.json(data,{status,headers:{'cache-control':'no-store'}});
export const createRecordsHandler=(getStore=store,isEnabled=enabled)=>async(req)=>{
 if(!isEnabled())return reply({enabled:false});
 try{
 const u=new URL(req.url),airfield=resolveAirfield(u.searchParams.get('airfield'));if(!airfield)return reply({error:'Unknown airfield'},400);const s=getStore(airfield.id),day=u.searchParams.get('day')||dayKey();const count=Number(u.searchParams.get('days')||1);if(!Number.isInteger(count)||count<1||count>366)return reply({error:'Choose between one and 366 days'},400);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(Date.parse(day+'T12:00:00Z'))||new Date(day+'T12:00:00Z').toISOString().slice(0,10)!==day)return reply({error:'Invalid date'},400);
 if(req.method==='GET'){
  const dates=Array.from({length:count},(_,i)=>new Date(Date.parse(day+'T12:00:00Z')-i*86400000).toISOString().slice(0,10));const keys=count>7?(await s.list({prefix:'days/'})).blobs.map(b=>b.key).filter(k=>dates.includes(k.slice(5))):dates.map(date=>`days/${date}`);const archives=[];for(let i=0;i<keys.length;i+=12)archives.push(...await Promise.all(keys.slice(i,i+12).map(k=>s.get(k,{type:'json'}))));const snapshot=await s.get('tracker',{type:'json'});const flights=archives.flatMap(a=>a||[]);
  const fs=await Promise.all((flights||[]).map(async f=>{
   const last=snapshot?.tracks?.[f.deviceId]?.last;const evidence={...f,vehicleType:f.vehicleType??last?.vehicleType,emitterCategory:f.emitterCategory||last?.emitterCategory,aircraftType:f.aircraftType||last?.aircraftType};
   if(airfield.id==='predannack'&&isPredannack(evidence)){evidence.aircraftType=evidence.aircraftType||'G103';if(evidence.origin==='VISITOR'){evidence.origin='PREDANNACK';evidence.partial=true;evidence.departureConfirmed=false;}}
   const result=corrected(evidence,await s.get(`corrections/${f.id}`,{type:'json'})),c=classify(result);return {...result,aircraftKind:c.kind,kindReason:c.reason};
  }));
  const identified=await enrichIdentities(fs);return reply({enabled:true,flights:identified.filter(f=>localRecord(f,airfield.origin)),days:dates,updatedAt:snapshot?.updatedAt||0,editingAvailable:!!process.env.FLIGHTBOARD_EDIT_KEY});
 }
 if(req.method!=='POST')return reply({error:'Method not allowed'},405);
 const secret=process.env.FLIGHTBOARD_EDIT_KEY||'',provided=req.headers.get('authorization')?.replace(/^Bearer /,'')||'';
 if(!secret||Buffer.byteLength(provided)!==Buffer.byteLength(secret)||!timingSafeEqual(Buffer.from(provided),Buffer.from(secret)))return reply({error:'A valid board edit key is required.'},401);
 const body=await req.text();if(body.length>5000)return reply({error:'Record too large'},413);
 const {id,patch,expectedEditedAt}=JSON.parse(body);
 if(typeof id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(id))return reply({error:'Invalid flight'},400);
 const flights=await s.get(`days/${day}`,{type:'json'}),flight=flights?.find(f=>f.id===id);if(!flight)return reply({error:'Flight not found'},404);
 let correction;try{correction=validateCorrection(patch)}catch(e){return reply({error:e.message},400)}
 if(correction.origin!=='VISITOR'&&correction.origin!==airfield.origin)return reply({error:'Origin does not match this airfield'},400);
 if(correction.takeoffAt>Date.now()+60000||correction.landingAt>Date.now()+60000)return reply({error:'Recorded times cannot be in the future.'},400);
 if(dayKey(correction.takeoffAt)!==day)return reply({error:'Keep take-off on the same recorded day.'},400);
 const previous=await s.getWithMetadata(`corrections/${id}`,{type:'json'});
 if((previous?.data?.editedAt||null)!==(expectedEditedAt||null))return reply({error:'This flight was edited elsewhere. Refresh and review it again.'},409);
 await s.setJSON(`audit/${id}/${Date.now()}-${crypto.randomUUID()}`,{original:flight,before:previous?.data||null,proposed:correction});
 const result=await s.setJSON(`corrections/${id}`,correction,previous?{onlyIfMatch:previous.etag}:{onlyIfNew:true});
 if(!result.modified)return reply({error:'Another correction arrived first. Refresh and try again.'},409);return reply({ok:true,flight:corrected(flight,correction)});
 }catch(e){return reply({error:e.message||'Records unavailable'},500);}
};

export default createRecordsHandler();

