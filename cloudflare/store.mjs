// D1-backed replacement for the Netlify Blobs subset used by Flightboard.
const initialized = new WeakMap();
const initialize = db => {
  if (!initialized.has(db)) {
    initialized.set(db, db.prepare(
      'CREATE TABLE IF NOT EXISTS flightboard_objects (object_key TEXT PRIMARY KEY, value TEXT NOT NULL, etag TEXT NOT NULL)'
    ).run().catch(error => { initialized.delete(db); throw error; }));
  }
  return initialized.get(db);
};
const parse = row => row ? JSON.parse(row.value) : null;
export function createD1Store(db) {
  if (!db) throw Error('D1 binding DB is missing');
  return (airfield = 'brentor') => {
    const namespace = airfield + '-v5-production/';
    const full = key => namespace + key;
    const getRow = async key => {
      await initialize(db);
      return db.prepare('SELECT value, etag FROM flightboard_objects WHERE object_key = ?')
        .bind(full(key)).first();
    };
    return {
      async get(key) { return parse(await getRow(key)); },
      async getWithMetadata(key) {
        const row = await getRow(key);
        return row ? { data: parse(row), etag: row.etag } : null;
      },
      async setJSON(key, data, options = {}) {
        await initialize(db);
        const etag = crypto.randomUUID(), json = JSON.stringify(data), objectKey = full(key);
        let query, params;
        if (options.onlyIfNew) {
          query = 'INSERT OR IGNORE INTO flightboard_objects (object_key,value,etag) VALUES (?,?,?)';
          params = [objectKey, json, etag];
        } else if (options.onlyIfMatch) {
          query = 'UPDATE flightboard_objects SET value = ?, etag = ? WHERE object_key = ? AND etag = ?';
          params = [json, etag, objectKey, options.onlyIfMatch];
        } else {
          query = 'INSERT INTO flightboard_objects (object_key,value,etag) VALUES (?,?,?) ON CONFLICT(object_key) DO UPDATE SET value=excluded.value, etag=excluded.etag';
          params = [objectKey, json, etag];
        }
        const result = await db.prepare(query).bind(...params).run();
        return { modified: result.meta.changes > 0, etag };
      },
      async delete(key) {
        await initialize(db);
        await db.prepare('DELETE FROM flightboard_objects WHERE object_key = ?').bind(full(key)).run();
      },
      async list({prefix = ''} = {}) {
        await initialize(db);
        const lo = full(prefix);
        const rows = await db.prepare(
          'SELECT object_key FROM flightboard_objects WHERE object_key >= ? AND object_key < ? ORDER BY object_key'
        ).bind(lo, lo + '\uffff').all();
        return { blobs: rows.results.map(row => ({ key: row.object_key.slice(namespace.length) })) };
      },
      async getMany(keys) {
        await initialize(db);
        const byKey = new Map();
        for (let i = 0; i < keys.length; i += 75) {
          const batch = keys.slice(i, i + 75);
          if (!batch.length) continue;
          const sql = 'SELECT object_key,value FROM flightboard_objects WHERE object_key IN (' + batch.map(() => '?').join(',') + ')';
          const rows = await db.prepare(sql).bind(...batch.map(full)).all();
          for (const row of rows.results) byKey.set(row.object_key.slice(namespace.length), JSON.parse(row.value));
        }
        return keys.map(key => byKey.get(key) || null);
      },
      async prunePositions(oldestBlock) {
        await initialize(db);
        const lo = full('positions/'), hi = full('positions/' + oldestBlock);
        await db.prepare('DELETE FROM flightboard_objects WHERE object_key >= ? AND object_key < ?')
          .bind(lo, hi).run();
      }
    };
  };
}
