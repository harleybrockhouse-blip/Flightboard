import {resolveAirfield,WEATHER_MODELS} from '../../public/airfields.mjs';
const caches=new Map();
export default async(req)=>{
 const q=new URL(req?.url||"http://localhost").searchParams,a=resolveAirfield(q.get("airfield")),provider=q.get("provider")||"auto",model=WEATHER_MODELS[provider];
 if(!a||!model)return Response.json({ok:false,error:"Unknown airfield or weather provider"},{status:400});
 const key=a.id+":"+provider,cache=caches.get(key);
 try{
 if(cache&&Date.now()-cache.fetchedAt<600000)return Response.json(cache);
 const u=new URL('https://api.open-meteo.com/v1/forecast');
 const params={latitude:a.lat,longitude:a.lon,current:'temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,cloud_cover,precipitation',hourly:'temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,precipitation_probability,visibility,cloud_cover',daily:'sunrise,sunset',wind_speed_unit:'kn',timeformat:'unixtime',timezone:'Europe/London',forecast_days:2};
 if(model.model)params.models=model.model;
 Object.entries(params).forEach(([k,v])=>u.searchParams.set(k,v));
 const r=await fetch(u,{signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('Weather unavailable');
 const result={...(await r.json()),ok:true,fetchedAt:Date.now(),airfield:a.id,provider,source:model.name,kind:'model'};caches.set(key,result);return Response.json(result);
 }catch(e){return Response.json({ok:false,error:'Forecast temporarily unavailable'},{status:502});}
};
