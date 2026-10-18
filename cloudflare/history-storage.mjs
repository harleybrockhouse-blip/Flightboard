// Ten-minute partitions avoid the D1 maximum row size of 2 MB.
export const HOUR_MS = 600000;
export const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
export const historyKey = t => 'positions/' + Math.floor(t / HOUR_MS) * HOUR_MS;
export async function saveHistory(s, feed, now = Date.now()) {
  const key = historyKey(now);
  const existing = await s.get(key) || [];
  const snapshot = {at: now, sources: feed.sources || [], aircraft: feed.aircraft || []};
  const minute = Math.floor(now / 60000);
  await s.setJSON(key, [...existing.filter(x => Math.floor(x.at / 60000) !== minute), snapshot]);
  const cutoff = now - RETENTION_MS;
  const oldestBlock = Math.floor(cutoff / HOUR_MS) * HOUR_MS;
  if (s.prunePositions) {
    await s.prunePositions(oldestBlock);
  } else {
    const {blobs} = await s.list({prefix: 'positions/'});
    for (const {key: k} of blobs) {
      const t = Number(k.slice(10));
      if (t + HOUR_MS <= cutoff) await s.delete(k);
    }
  }
  await s.setJSON('history-status', {updatedAt: now, retentionDays: 7, sampleSeconds: 60});
}
