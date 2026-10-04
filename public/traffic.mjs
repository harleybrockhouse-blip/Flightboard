import {distance,Tracker,dayKey} from './tracker.mjs';
const finite=v=>typeof v==='number'&&Number.isFinite(v);
export function parseAdsb(data,receivedAt=Date.now()){
 const now=finite(data.now)?data.now*(data.now<1e12?1000:1):receivedAt;
 return (data.ac||data.aircraft||[]).flatMap(a=>{
  if(!/^[0-9a-f]{6}$/i.test(a.hex||'')||!finite(a.lat)||!finite(a.lon)||Math.abs(a.lat)>90||Math.abs(a.lon)>180||!finite(a.seen_pos)||a.seen_pos<0)return [];
  const ground=a.alt_baro==='ground',alt=finite(a.alt_geom)?a.alt_geom:finite(a.alt_baro)?a.alt_baro:null;
  return [{deviceId:a.hex.toUpperCase(),icaoHex:a.hex.toLowerCase(),registration:a.r?.trim()||'',cn:a.flight?.trim()||'',lat:a.lat,lon:a.lon,altitudeM:alt===null?null:alt*.3048,speedKmh:finite(a.gs)?a.gs*1.852:null,trackDeg:finite(a.track)?a.track:null,climbMs:finite(a.geom_rate)?a.geom_rate*.00508:finite(a.baro_rate)?a.baro_rate*.00508:null,reportAt:Math.round(now-a.seen_pos*1000),onGround:ground,source:'ADSB',sources:['ADSB'],positionMethod:a.type||'unknown'}];
 });
}
const reg=a=>(a.registration||'').replace(/[^a-z0-9]/gi,'').toUpperCase();
export function mergeTraffic(ogn,adsb){
 const rows=ogn.map(a=>({...a,source:'OGN',sources:['OGN']}));
 for(const a of adsb){const existing=rows.find(b=>((reg(a)&&reg(a)===reg(b))||a.deviceId===b.deviceId.toUpperCase())&&distance(a.lat,a.lon,b.lat,b.lon)<3000);
  if(!existing){rows.push(a);continue;}const sources=[...new Set([...existing.sources,...a.sources])];if(a.reportAt>existing.reportAt){const id=existing.deviceId;Object.assign(existing,a,{deviceId:id,registration:existing.registration||a.registration});}existing.sources=sources;existing.icaoHex=a.icaoHex;
 }return rows;
}
export function parseTrace(data,cfg){
 if(!data||!finite(data.timestamp)||!Array.isArray(data.trace)||!data.trace.length||data.trace.length>100000||!/^[0-9a-f]{6}$/i.test(data.icao||''))throw Error('Choose a readsb / ADS-B.lol aircraft trace JSON file.');
 return data.trace.flatMap(p=>{if(!Array.isArray(p)||!finite(p[0])||!finite(p[1])||!finite(p[2])||Math.abs(p[1])>90||Math.abs(p[2])>180)return [];const onGround=p[3]==='ground';return [{deviceId:data.icao.toUpperCase(),icaoHex:data.icao.toLowerCase(),registration:data.r||'',cn:data.flight||'',lat:p[1],lon:p[2],altitudeM:onGround?cfg.elevationM:finite(p[3])?p[3]*.3048:null,onGround,speedKmh:finite(p[4])?p[4]*1.852:null,trackDeg:finite(p[5])?p[5]:null,reportAt:(data.timestamp+p[0])*1000,source:'ADSB',sources:['ADSB']}]}).filter(a=>a.reportAt<=Date.now()+5000&&distance(cfg.lat,cfg.lon,a.lat,a.lon)<=46300).sort((a,b)=>a.reportAt-b.reportAt);
}
export function reconstructHistory(data,cfg){
 const samples=parseTrace(data,cfg),t=new Tracker({},cfg);for(const a of samples)t.update([a],a.reportAt);t.tick(Date.now());
 return t.flights.map(f=>({...f,historical:true,source:'ADSB',sources:['ADSB'],importedAt:Date.now(),trace:samples.filter(a=>a.reportAt>=f.takeoffAt&&a.reportAt<=(f.landingAt||f.lastReportAt)).filter((a,i,all)=>i%Math.max(1,Math.ceil(all.length/1000))===0).map(a=>[a.lat,a.lon,a.reportAt])}));
}
export function mergeFlights(primary,history){
 const result=[...primary];for(const h of history){const duplicate=result.find(f=>f.id===h.id||((reg(f)&&reg(f)===reg(h))||f.deviceId.toUpperCase()===h.deviceId.toUpperCase())&&dayKey(f.takeoffAt)===dayKey(h.takeoffAt)&&Math.abs(f.takeoffAt-h.takeoffAt)<180000&&(!f.landingAt||f.landingAt>=h.takeoffAt)&&(!h.landingAt||h.landingAt>=f.takeoffAt));if(!duplicate)result.push(h);else{const i=result.indexOf(duplicate);result[i]={...duplicate,sources:[...new Set([...(duplicate.sources||['OGN']),...(h.sources||[])])]};}}return result;
}
