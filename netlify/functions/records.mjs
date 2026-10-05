import {resolveAirfield} from '../../public/airfields.mjs';
import {enabled,store} from '../../lib/store.mjs';
import {dayKey,validateCorrection,corrected} from '../../public/tracker.mjs';
import {classify} from '../../public/classification.mjs';
import {timingSafeEqual} from 'node:crypto';
const reply=(data,status=200)=>Response.json(data,{status,headers:{'cache-control':'no-store'}});
export const createRecordsHandler=(getStore=store,isEnabled=enabled)=>async(req)=>{
 if(!isEnabled())return reply({enabled:false});
 try{
 const u=new URL(req.url),airfield=resolveAirfield(u.searchParams.get('airfield'));if(!airfield)return reply({error:'Unknown airfield'},400);const s=getStore(airfield.id),day=u.searchParams.get('day')||dayKey();
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day))return reply({error:'Invalid date'},400);
 if(req.method==='GET'){
  const [flights,snapshot]=await Promise.all([s.get(`days/${day}`,{type:'json'}),s.get('tracker',{type:'json'})]);
  const fs=await Promise.all((flights||[]).map(async f=>{
   const last=snapshot?.tracks?.[f.deviceId]?.last;const evidence={...f,vehicleType:f.vehicleType??last?.vehicleType,emitterCategory:f.emitterCategory||last?.emitterCategory,aircraftType:f.aircraftType||last?.aircraftType};
   const result=corrected(evidence,await s.get(`corrections/${f.id}`,{type:'json'})),c=classify(result);return {...result,aircraftKind:c.kind,kindReason:c.reason};
  }));
  return reply({enabled:true,flights:fs,updatedAt:snapshot?.updatedAt||0,editingAvailable:!!process.env.FLIGHTBOARD_EDIT_KEY});
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

