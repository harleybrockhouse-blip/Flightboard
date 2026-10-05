import {classify} from './classification.mjs';
export const DEFAULTS = {lat:50.592183,lon:-4.151667,elevationM:250,radiusM:850,takeoffSpeedKmh:38,takeoffHeightM:30,landingSpeedKmh:25,landingHeightM:35,freshMs:90000,lostMs:120000,polygon:[]};
export const dayKey=(ts=Date.now())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(ts);
export function distance(a,b,c,d){const rad=x=>x*Math.PI/180;const q=Math.sin(rad(c-a)/2)**2+Math.cos(rad(a))*Math.cos(rad(c))*Math.sin(rad(d-b)/2)**2;return 6371000*2*Math.asin(Math.min(1,Math.sqrt(q)));}
export function inside(a,cfg=DEFAULTS){const p=cfg.polygon;if(!p?.length)return distance(cfg.lat,cfg.lon,a.lat,a.lon)<=cfg.radiusM;let yes=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const [yi,xi]=p[i],[yj,xj]=p[j];if((yi>a.lat)!==(yj>a.lat)&&a.lon<(xj-xi)*(a.lat-yi)/(yj-yi)+xi)yes=!yes;}return yes;}
export const nameOf=a=>(a.registration&&a.registration.toLowerCase()!=='hidden'?a.registration:a.cn||a.deviceId||'Unknown');
export function flightDuration(f,now=Date.now()){return Math.max(0,(f.landingAt??((f.status==='LOST'||f.status==='UNKNOWN')?f.lastReportAt:Math.min(now,(f.lastReportAt||now)+DEFAULTS.lostMs)))-f.takeoffAt);}
export class Tracker {
 constructor(saved={},config={}){this.cfg={...DEFAULTS,...config};this.tracks=saved.tracks||{};this.flights=saved.flights||[];this.updatedAt=saved.updatedAt||0;}
 reconcile(patches){for(const f of this.flights){const p=patches[f.id];if(!p)continue;const t=this.tracks[f.deviceId];if(p.landingAt){f.closedByCorrection=true;if(t?.flightId===f.id){t.flightId=null;t.launch=null;t.land=null;t.groundAt=0;}}else if(f.closedByCorrection){delete f.closedByCorrection;if(t&&!t.flightId)t.flightId=f.id;}}}
 snapshot(){return {version:5,tracks:this.tracks,flights:this.flights,updatedAt:this.updatedAt};}
 tick(now=Date.now()){for(const f of this.flights){if(!f.landingAt&&!f.closedByCorrection&&!f.closedUnresolved&&now-(f.lastReportAt||f.takeoffAt)>this.cfg.lostMs)f.status='LOST';}}
 update(aircraft,now=Date.now()){
  const c=this.cfg;
  for(const a of aircraft){
   if(!a.deviceId||!Number.isFinite(a.reportAt)||a.reportAt>now+5000||now-a.reportAt>c.freshMs||!Number.isFinite(a.lat)||!Number.isFinite(a.lon))continue;
   let id=a.deviceId;const ts=a.reportAt;
   if(!this.tracks[id]&&a.registration){const registration=a.registration.replace(/[^a-z0-9]/gi,'').toUpperCase();const alias=Object.values(this.tracks).find(t=>t.last?.registration?.replace(/[^a-z0-9]/gi,'').toUpperCase()===registration&&Math.abs(ts-t.lastReportAt)<c.lostMs&&distance(a.lat,a.lon,t.last.lat,t.last.lon)<3000);if(alias){id=alias.id;a.deviceId=id;}}
   let t=this.tracks[id];
   if(!t)t=this.tracks[id]={id,lastReportAt:0,groundAt:0,launch:null,land:null,flightId:null,trail:[]};
   if(ts<=t.lastReportAt+3000)continue;
   const gap=ts-t.lastReportAt;
   if(gap>c.lostMs){t.launch=null;t.land=null;t.groundAt=0;}
   const h=a.onGround===true?0:Number.isFinite(a.altitudeM)?a.altitudeM-c.elevationM:null;
   const speed=a.speedKmh;
   const ground=inside(a,c)&&Number.isFinite(speed)&&speed<=c.landingSpeedKmh&&h!==null&&h<=c.landingHeightM;
   const flying=Number.isFinite(speed)&&h!==null&&speed>=c.takeoffSpeedKmh&&h>=c.takeoffHeightM;
   let f=this.flights.find(x=>x.id===t.flightId&&!x.landingAt&&!x.closedByCorrection&&!x.closedUnresolved);
   if(f&&gap>21600000){f.status='LOST';f.closedUnresolved=true;t.flightId=null;f=null;}
   if(!f){
    if(ground){t.groundAt=ts;t.launch=null;}
    else if(flying){
     if(!t.launch)t.launch={at:ts,count:0,origin:t.groundAt&&ts-t.groundAt<180000?(c.origin||'BRENTOR'):'VISITOR'};
     t.launch.count++;
     if(t.launch.count>=2){
      f={id:`${id}-${t.launch.at}`,deviceId:id,registration:nameOf(a),cn:a.cn||'',takeoffAt:t.launch.at,landingAt:null,lastReportAt:ts,maxAltM:a.altitudeM,referenceElevationM:c.elevationM,origin:t.launch.origin,status:'AIRBORNE',estimatedTakeoff:true,estimatedLanding:false,source:a.source||'OGN',sources:a.sources||['OGN']};
      this.flights.push(f);t.flightId=f.id;t.launch=null;t.groundAt=0;
     }
    }else t.launch=null;
   }else{
    f.lastReportAt=ts;f.sources=[...new Set([...(f.sources||['OGN']),...(a.sources||['OGN'])])];f.status='AIRBORNE';f.maxAltM=Math.max(f.maxAltM??a.altitudeM??0,a.altitudeM??0);
    if(ground){
     if(!t.land)t.land={at:ts,count:0};t.land.count++;
     if(t.land.count>=2&&ts-t.land.at>=15000){f.landingAt=t.land.at;f.status='LANDED';f.estimatedLanding=true;t.flightId=null;t.groundAt=ts;t.land=null;}
    }else t.land=null;
   }
   if(f){const evidence={registryType:a.registryType||f.registryType||t.last?.registryType,identitySource:a.identitySource||f.identitySource,vehicleType:a.vehicleType??f.vehicleType??t.last?.vehicleType,emitterCategory:a.emitterCategory||f.emitterCategory||t.last?.emitterCategory,aircraftType:a.aircraftType||f.aircraftType||t.last?.aircraftType,sources:f.sources};const kind=classify(evidence);Object.assign(f,evidence,{aircraftKind:kind.kind,kindReason:kind.reason});}
   t.lastReportAt=ts;t.last=a;t.trail.push([a.lat,a.lon,ts]);t.trail=t.trail.filter(p=>ts-p[2]<600000).slice(-80);
  }
  this.tick(now);this.updatedAt=now;
  for(const [id,t]of Object.entries(this.tracks))if(now-t.lastReportAt>86400000&&!t.flightId)delete this.tracks[id];
 }
}
export function validateCorrection(p){
 if(!p||typeof p!=='object'||!Number.isFinite(p.takeoffAt)||p.takeoffAt<0)throw Error('Enter a valid take-off time.');
 if(p.landingAt!==null&&(!Number.isFinite(p.landingAt)||p.landingAt<p.takeoffAt))throw Error('Landing must be after take-off.');
 if(!['BRENTOR','PREDANNACK','VISITOR'].includes(p.origin))throw Error('Choose an origin.');
 if(typeof p.registration!=='string'||!p.registration.trim()||p.registration.length>30)throw Error('Enter a registration (up to 30 characters).');
 if(p.confirmedKind!==undefined&&p.confirmedKind!==null&&!['glider','other','unknown'].includes(p.confirmedKind))throw Error('Choose a valid aircraft classification.');
 return {...(p.confirmedKind!==undefined?{confirmedKind:p.confirmedKind}:{}),registration:p.registration.trim(),takeoffAt:p.takeoffAt,landingAt:p.landingAt,origin:p.origin,note:String(p.note||'').slice(0,300),manual:true,editedAt:Date.now()};
}
export function corrected(f,p){return p?{...f,...p,status:p.landingAt?'LANDED':f.status}:f;}

