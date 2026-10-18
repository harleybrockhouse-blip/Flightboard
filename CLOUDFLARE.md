# Cloudflare deployment (migration branch)

1. Cloudflare -> Workers & Pages -> Create -> Import a repository; choose `harleybrockhouse-blip/Flightboard` and the `cloudflare-flightboard-migration` branch.
2. Choose a **Worker**, not a static-only Pages deployment. Use the repository's `wrangler.jsonc` file.
3. Build command: `npm run build` (or `npm ci && npm run build` if dependencies aren't installed automatically). Deploy command: `npx wrangler deploy`.
4. Set Node.js runtime compatibility per `wrangler.jsonc`, attach D1 database with binding `DB`.
5. Check `/.netlify/functions/ogn?airfield=brentor` and `/.netlify/functions/records?airfield=brentor`. Scheduled collection runs every minute.
6. Existing Netlify Blob data does **not** migrate automatically. Export/copy it before Netlify is deleted.
7. Review runtime limits. The collector is best-effort, and upstream OGN and ADS-B feeds may fail or refuse requests.
8. The D1 table is created automatically on the first storage request. Maintain independent database backups if using flight records operationally.

The frontend API paths are intentionally preserved. Historical positions use ten-minute partitions (the history endpoint still calls them availableHours for frontend compatibility). 
