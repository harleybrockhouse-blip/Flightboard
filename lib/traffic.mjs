import {resolveAirfield} from '../public/airfields.mjs';
import {parseAdsb,mergeTraffic} from '../public/traffic.mjs';
import {fetchOgn} from './ogn.mjs';
const cache=new Map();
export async function fetchAdsb(id){const a=resolveAirfield(id);if(!a)throw Error('Unknown airfield');const old=cache.get(id);if(old&&Date.now()-old.fetchedAt<15000)return old;const r=await fetch(`https://api.adsb.lol/v2/point/${a.lat}/${a.lon}/25`,{signal:AbortSignal.timeout(10000),headers:{'User-Agent':'Flightboard/0.7 (+https://github.com/harleybrockhouse-blip/Flightboard)','Accept':'application/json'}});if(!r.ok)throw Error('ADS-B unavailable');const data=await r.json();const result={fetchedAt:Date.now(),aircraft:parseAdsb(data)};cache.set(id,result);return result;}
export const createTrafficFetcher=(ogn=fetchOgn,adsb=fetchAdsb)=>async id=>{const results=await Promise.allSettled([ogn(id),adsb(id)]);const sources=results.map((r,i)=>({name:i?'ADSB':'OGN',ok:r.status==='fulfilled',fetchedAt:r.status==='fulfilled'?r.value.fetchedAt:null}));if(!sources.some(s=>s.ok))throw Error('Both aircraft feeds unavailable');return {ok:true,fetchedAt:Date.now(),airfield:id,sources,aircraft:mergeTraffic(results[0].status==='fulfilled'?results[0].value.aircraft:[],results[1].status==='fulfilled'?results[1].value.aircraft:[])};};
export const fetchTraffic=createTrafficFetcher();
