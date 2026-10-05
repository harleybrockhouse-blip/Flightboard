import {classify} from './classification.mjs';
import {dayKey,flightDuration} from './tracker.mjs';
export const logDays=(end,count=7)=>Array.from({length:count},(_,i)=>new Date(Date.parse(end+'T12:00:00Z')-i*86400000).toISOString().slice(0,10));
export function filterLog(rows,{kind='glider',origin='all',status='all',query='',airfieldOrigin}={}){
 return rows.filter(f=>{
  const k=classify(f).kind;
  return (kind==='all'||k===kind)&&(origin==='all'||(origin==='local'?f.origin===airfieldOrigin:f.origin!==airfieldOrigin))&&(status==='all'||(status==='landed'?!!f.landingAt:status==='lost'?f.status==='LOST'&&!f.landingAt:!f.landingAt&&f.status!=='LOST'))&&`${f.registration||''} ${f.cn||''} ${f.deviceId||''}`.toLowerCase().includes(query.trim().toLowerCase());
 });
}
export function dailyTotals(rows,dates,origin){return dates.map(day=>{
 const fs=rows.filter(f=>dayKey(f.takeoffAt)===day),gliders=fs.filter(f=>classify(f).kind==='glider');
 return {day,flights:fs.length,gliders:gliders.length,probable:fs.filter(f=>classify(f).kind==='probable').length,launches:gliders.filter(f=>f.origin===origin).length,landings:fs.filter(f=>f.landingAt).length,aircraft:new Set(fs.map(f=>f.registration||f.deviceId)).size,duration:fs.reduce((n,f)=>n+flightDuration(f),0)};
});}
