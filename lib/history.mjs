export const RETENTION_MS=7*24*60*60*1000;
export const HOUR_MS=3600000;
export const historyKey=t=>`positions/${Math.floor(t/HOUR_MS)*HOUR_MS}`;
// Called under the collector lease. One bounded object per hour, not one growing archive.
export async function saveHistory(s,feed,now=Date.now()){
 const key=historyKey(now),existing=await s.get(key,{type:'json'})||[];
 const snapshot={at:now,sources:feed.sources||[],aircraft:feed.aircraft||[]};
 const minute=Math.floor(now/60000);
 await s.setJSON(key,[...existing.filter(x=>Math.floor(x.at/60000)!==minute),snapshot]);
 const cutoff=now-RETENTION_MS;
 const {blobs}=await s.list({prefix:'positions/'});
 for(const {key:oldKey} of blobs){
  const start=Number(oldKey.slice('positions/'.length));
  if(!Number.isFinite(start))continue;
  if(start+HOUR_MS<=cutoff)await s.delete(oldKey);
  else if(start<cutoff){const rows=await s.get(oldKey,{type:'json'})||[];await s.setJSON(oldKey,rows.filter(x=>x.at>=cutoff));}
 }
 await s.setJSON('history-status',{updatedAt:now,retentionDays:7,sampleSeconds:60});
}
