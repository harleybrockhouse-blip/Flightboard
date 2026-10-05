export const KINDS=['glider','probable','other','unknown'];
export function classify(a={}){
 if(['glider','other','unknown'].includes(a.confirmedKind))return {kind:a.confirmedKind,reason:'Manually reviewed',reviewed:true};
 const v=String(a.vehicleType??''),category=String(a.emitterCategory||'').toUpperCase();
 const glider=v==='1'||category==='B1';
 const other=(/^(2|3|4|5|6|7|8|9|10|11|12|13|15)$/.test(v))||/^A[1-7]$|^B[2-7]$|^C[1-7]$/.test(category);
 if(glider&&other)return {kind:'probable',reason:'Conflicting aircraft-type reports · confirm'};
 if(glider)return {kind:'glider',reason:v==='1'?'OGN reports glider / motor glider':'ADS-B reports glider / sailplane'};
 if(other)return {kind:'other',reason:v==='2'?'OGN reports tow plane':'Feed reports another aircraft type'};
 if(a.aircraftKind==='probable')return {kind:'probable',reason:a.kindReason||'Possible glider · confirm'};
 if(/GLID|SAILPLANE|MOTOR.?GLIDER/i.test(a.aircraftType||''))return {kind:'probable',reason:'Aircraft description suggests a glider · confirm'};
 // OGN includes powered aircraft too: an unknown OGN type is only a candidate.
 if((a.sources||[]).includes('OGN')||a.source==='OGN')return {kind:'probable',reason:'OGN target without a known aircraft type · confirm'};
 return {kind:'unknown',reason:'No aircraft-type evidence'};
}
export const enrichAircraft=a=>{const c=classify(a);return {...a,aircraftKind:c.kind,kindReason:c.reason};};
export const kindLabel=a=>({glider:classify(a).reviewed?'Glider · confirmed':'Glider · feed reported',probable:'Probable glider · confirm',other:classify(a).reviewed?'Other aircraft · confirmed':'Other aircraft',unknown:'Unclassified aircraft'})[classify(a).kind];
export const gliderLike=a=>['glider','probable'].includes(classify(a).kind);
