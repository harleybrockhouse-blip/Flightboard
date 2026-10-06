import {classify,isPredannack} from './classification.mjs';
import {dayKey,flightDuration} from './tracker.mjs';
export const logDays=(end,count=7)=>Array.from({length:count},(_,i)=>new Date(Date.parse(end+'T12:00:00Z')-i*86400000).toISOString().slice(0,10));
export function filterLog(rows,{kind='glider',origin='all',status='all',query='',airfieldOrigin}={}){
 return rows.filter(f=>{
  const k=classify(f).kind;
  return (kind==='all'||kind==='gliders'&&['glider','probable'].includes(k)||k===kind)&&(origin==='all'||(origin==='local'?f.origin===airfieldOrigin:f.origin!==airfieldOrigin))&&(status==='all'||(status==='landed'?!!f.landingAt:status==='probable'?f.status==='PROBABLE_LANDING':status==='lost'?f.status==='LOST'&&!f.landingAt:!f.landingAt&&f.status!=='LOST'&&f.status!=='PROBABLE_LANDING'))&&`${f.registration||''} ${f.cn||''} ${f.deviceId||''}`.toLowerCase().includes(query.trim().toLowerCase());
 });
}
export function dailyTotals(rows,dates,origin){return dates.map(day=>{
 const fs=rows.filter(f=>dayKey(f.takeoffAt)===day),gliders=fs.filter(f=>classify(f).kind==='glider');
 return {day,flights:fs.length,gliders:gliders.length,probable:fs.filter(f=>classify(f).kind==='probable').length,launches:gliders.filter(f=>f.origin===origin&&!f.partial&&f.departureConfirmed!==false).length,landings:fs.filter(f=>f.landingAt).length,aircraft:new Set(fs.map(f=>f.registration||f.deviceId)).size,duration:completedAirTime(fs)};
});}

export function localRecord(f,origin){return f.origin===origin&&(origin!=='PREDANNACK'||isPredannack(f));}
export function periodDays(end,period='day'){
 if(period==='recent')return logDays(end,7);
 const date=new Date(end+'T12:00:00Z');let start=new Date(date);
 if(period==='week')start.setUTCDate(start.getUTCDate()-((start.getUTCDay()+6)%7));
 if(period==='month')start.setUTCDate(1);
 if(period==='year'){start.setUTCMonth(0,1);}
 return logDays(end,Math.round((date-start)/86400000)+1);
}
export const completedAirTime=rows=>rows.filter(f=>f.landingAt&&!f.partial).reduce((n,f)=>n+flightDuration(f),0);
export const launchCount=(rows,origin)=>rows.filter(f=>localRecord(f,origin)&&classify(f).kind==='glider'&&!f.partial&&f.departureConfirmed!==false).length;

export const estimatedAirTime=rows=>rows.filter(f=>f.probableLandingAt&&!f.landingAt||f.partial&&f.landingAt).reduce((n,f)=>n+flightDuration(f),0);
