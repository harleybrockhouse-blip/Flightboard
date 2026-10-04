import {resolveAirfield,feedBox} from '../public/airfields.mjs';
export const BOX={north:50.87,south:50.31,east:-3.70,west:-4.61};
const numeric=v=>v!==''&&Number.isFinite(Number(v))?Number(v):null;
const decode=s=>s.replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
export function parseOgn(xml,receivedAt=Date.now()){
 if(!/<markers[\s>]/.test(xml))throw Error('Unexpected OGN response');
 const aircraft=[];
 for(const match of xml.matchAll(/<m\s+a="([^"]+)"\s*\/?\s*>/g)){
  const p=decode(match[1]).split(',');if(p.length<14)continue;
  const lat=numeric(p[0]),lon=numeric(p[1]),ageSeconds=numeric(p[6]);
  if(lat===null||lon===null||Math.abs(lat)>90||Math.abs(lon)>180||ageSeconds===null||ageSeconds<0)continue;
  // OGN's own frontend: 4 altitude(m), 6 age(s), 7 heading(deg), 8 speed(km/h).
  const deviceId=p[12]&&p[12]!=='0'?p[12]:p[13];if(!deviceId)continue;
  aircraft.push({lat,lon,cn:p[2],registration:p[3],altitudeM:numeric(p[4]),timeUtc:p[5],ageSeconds,reportAt:Math.round((receivedAt-ageSeconds*1000)/1000)*1000,trackDeg:numeric(p[7]),speedKmh:numeric(p[8]),climbMs:numeric(p[9]),vehicleType:p[10],receiver:p[11],deviceId});
 }
 return aircraft;
}
const caches=new Map();
export async function fetchOgn(id="brentor"){
 const a=resolveAirfield(id);if(!a)throw Error("Unknown airfield");const BOX=feedBox(a),cache=caches.get(id);
 if(cache&&Date.now()-cache.fetchedAt<10000)return cache;
 const u=new URL('https://live.glidernet.org/lxml.php');
 for(const [k,v]of Object.entries({a:1,b:BOX.north,c:BOX.south,d:BOX.east,e:BOX.west,z:2}))u.searchParams.set(k,v);
 const r=await fetch(u,{signal:AbortSignal.timeout(10000),headers:{accept:'application/xml','user-agent':'Brentor-Flightboard/0.5'}});if(!r.ok)throw Error(`OGN returned ${r.status}`);
 const xml=await r.text(),fetchedAt=Date.now();
 // Age is relative to upstream response generation, rather than browser clock.
 const serverAt=Date.parse(r.headers.get('date'))||fetchedAt;
 const result={ok:true,fetchedAt,airfield:id,box:BOX,aircraft:parseOgn(xml,serverAt)};caches.set(id,result);return result;
}
