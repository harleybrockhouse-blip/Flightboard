# Brentor / Predannack Flightboard v0.7

A responsive aircraft monitoring and flight logging board for Brentor and Predannack, with an aircraft map, live activity, daily records and model weather.

## Quick start

Requires Node.js 22 or newer.

```sh
npm ci
npm run dev
```

Open http://localhost:4173. Open http://localhost:4173/?demo=1 to explore a clearly labelled demonstration with illustrative aircraft and weather. Demo flight edits are not saved to live records. Display preferences are shared with live mode.

Use a server, rather than double-clicking `public/index.html`: the map application uses JavaScript modules and the live feeds require server functions.

## What changed

- Rebuilt desktop/mobile interface, coordinated light/dark themes, quieter typography and touch controls.
- Corrected a critical v0.4 OGN (Open Glider Network) parser error: field 4 is altitude in metres; field 6 is report age in seconds; field 7 is heading; field 8 is speed in kilometres per hour. The old version used age as altitude and reversed speed and heading.
- Position-report age controls freshness. Duplicate, old and future reports do not count as new tracking evidence.
- A Brentor launch requires a recent ground observation inside the detection area and two distinct airborne reports. Aircraft first seen airborne are visitors/unconfirmed, including aircraft overhead. The first airborne sample is used as the estimated departure time.
- Tracking state survives refresh. Lost signals become `Signal lost — landing unknown`; observed duration freezes at the last report. No landing is invented from silence. Returning aircraft resume the same flight unless the gap exceeds six hours, when the earlier flight stays unresolved.
- Short flights are accepted. Landing needs two separate low, slow reports in the detection area, at least 15 seconds apart. The two-minute minimum is removed.
- Configurable local radius, launch/landing speed and launch-height thresholds, plus an optional polygon boundary. The default 850 m circle is a detection approximation, not a surveyed boundary. Tune these values against the actual launch log.
- Correct altitude label: height relative to Brentor's configurable elevation (250 m, approximately 820 ft, by default), never height above surrounding terrain. Aircraft altitudes are feed estimates.
- Map styles: automatic theme, light, dark, terrain and satellite. Aircraft markers are restricted to the current viewport and traffic filter. Panning is bounded by the regional feed coverage. Map markers update in place, with ten-minute trails collected while the board is running.
- Aircraft selection links the map, summaries and flight details. Summaries offer airborne flights, recent activity, landings, aircraft totals and conditions. Filters include all traffic, Brentor launches, entered club registrations, visitors/unconfirmed, and visible-map scope.
- Display mode requests fullscreen and a screen wake lock where supported, enlarges the activity panel and rotates summaries every 20 seconds. Rotation pauses while the tab is hidden or a dialog is open; the pause control stops it.
- Date browsing, manual corrections, CSV (comma-separated values) export and JSON (JavaScript Object Notation) backups. Exports include UTC (Coordinated Universal Time) and London times. CSV cells are protected against formula interpretation.
- Current-model conditions and six-hour forecast from Open-Meteo, with source, fetch time and model-valid time. These are model estimates, not an on-site weather observation.
- Server recording by default on Netlify, with optional local recording. Status text identifies which is active.

## Deploy to Netlify

Deploy this entire project through a Netlify build (linked Git repository or Netlify command-line tool). The build installs dependencies and bundles the server functions. A static-only drag-and-drop of `public/` does not deploy those functions.

Build command: `npm run build`
Publish directory: `public`
Functions directory: `netlify/functions`

For a command-line deployment, authenticate and link the intended site, then run:

```sh
npm ci
npx netlify-cli deploy --build --prod
```

No deployment has been performed as part of this package.

### Local recording (development or explicitly disabled)

The aircraft map polls every 15 seconds. The browser detects and stores flights while it is open. Another device has its own records, and background tabs may be throttled. A refresh restores tracking and corrections. The previous v0.4 records remain untouched, with an export control in Flight log; they are excluded from new totals because of the old feed parser error.

The Backup button exports all local records for the selected airfield, tracking state, corrections, audit entries and settings. There is no automatic cloud backup in local mode. Keep exported backups separately. Recovery can be performed from the JSON snapshot; this version does not include an import screen.

### Server recording (default on Netlify)

Set these environment variables on Netlify for Functions:

- Shared recording is enabled without an environment variable. Set `FLIGHTBOARD_SHARED=false` only to disable it and use browser-only recording. Remove an existing `false` override to enable server recording.
- `FLIGHTBOARD_EDIT_KEY`: choose a strong secret to authorise shared record corrections. Enter it in Board settings on an editing device. The browser holds it only in memory for that tab. Without a key, the board is read-only for shared corrections.
- `FLIGHTBOARD_CONFIG`: optional JSON detection configuration for the shared collector, for example `{"radiusM":850,"takeoffSpeedKmh":38,"takeoffHeightM":30,"landingSpeedKmh":25}`. An optional `polygon` is an array of `[latitude,longitude]` pairs. Local settings in the interface do not change this shared configuration.

Redeploy after configuring the variables. The `collect` scheduled function runs every minute on a published deployment, even when no browser is open. Netlify Blobs stores the engine snapshot, day archives and correction history. The store is separated by deployment context. The collector uses a conditional lease to prevent overlapping writes; manual corrections use a separate overlay and conflict checks.

Expect up to several minutes for flight confirmation in shared mode. A one-minute snapshot collector can miss flights or ground phases shorter than its sampling interval. For precise launch logging, a continuously connected telemetry collector is the next step; this board remains an estimated log. The map still refreshes independently every 15 seconds.

After deployment, check the scheduled function's successful runs, then verify `Server recording · every minute` appears in the sidebar. A stalled collector is labelled as delayed. A shared-record read failure retains the last shared snapshot rather than silently combining it with local records.

Shared Backup exports the selected day's records; it is not a full server-store backup. Shared records and corrections need an appropriate host-level retention/backup arrangement if used operationally. Shared records are publicly readable to anyone who can access the site; no pilot names are stored.

## Use

- **Live board:** select an aircraft on the map or a summary card for height, speed, climb/sink and latest flight.
- **Club fleet:** enter the actual club aircraft registrations in Settings. No fleet membership is guessed.
- **Flight log:** choose a date, review records, correct a flight or export. Corrections retain their reason; the original detection stays available in the backing records/audit. Current editor times are on the recorded London day; cross-midnight corrections require reviewing the backup rather than this same-day editor.
- **Conditions:** current model estimates plus six hourly forecasts; knots for wind, degrees Celsius for temperature. Model weather refreshes every ten minutes. Aircraft speed and height units are separately configurable.
- **Display mode:** fullscreen where supported, summary rotation and larger text. On phones, the map remains above a scrollable summary; desktop uses side-by-side panels.
- **Map feed:** fresh positions are up to 90 seconds old. Optional stale markers are amber and remain visible for at most ten minutes. Lost flight records remain in the log after their map marker disappears.

## Validation

Run `npm test` for deterministic tracking and shared-record tests. Run `npm run build` for JavaScript syntax checks. See `VALIDATION.md` for the checks performed on this release and remaining limitations.

## Sources and dependencies

- Open Glider Network live feed and field layout: https://github.com/glidernet/ogn-live (the field layout was checked against its `ogn.js` frontend; application logic here is independently implemented).
- OGN feed: https://live.glidernet.org/lxml.php
- Weather: https://open-meteo.com/en/docs — data attribution and use terms apply; the supplied public endpoint is intended for non-commercial use.
- Leaflet 1.9.4 is bundled locally with its licence in `public/vendor/LICENSE.txt`.
- Light/dark basemaps: Esri Gray Canvas with reference labels. Terrain: OpenTopoMap/OpenStreetMap/SRTM (Shuttle Radar Topography Mission). Satellite: Esri and credited imagery providers. Attribution remains on the map. If the chosen provider fails to load, a standard OpenStreetMap fallback is used (with dark styling where appropriate). Provider availability and usage terms apply.
- Airfield elevation reference: Air Accidents Investigation Branch Bulletin 2/2018, airfield information for G-CFNG (approximately 820 ft): https://assets.publishing.service.gov.uk/media/5a79a0a7e5274a684690aee4/AAIB_Bulletin_2-2018_Lo_Res.pdf
- Netlify scheduled functions: https://docs.netlify.com/build/functions/scheduled-functions/
- Netlify Blobs: https://docs.netlify.com/build/data-and-storage/netlify-blobs/

This is a situational overview and estimated flight log, not a navigation display or an official launch-point log.

## v0.6 airfield and weather selection

Use the airfield selector in the header to choose Brentor or Predannack. Switching saves the current tracker, reloads the board at the chosen location, and restores that airfield’s independent flight records, corrections, fleet, detection settings and weather choice. Existing Brentor v0.5 browser records and shared records retain their storage keys. Light/dark preference follows you between airfields; automatic map theme follows the interface.

Predannack defaults: 49.99917, -5.23056; approximate elevation 90 m; detection radius 1200 m. Brentor defaults: 50.592183, -4.151667; approximate elevation 250 m; detection radius 850 m. Adjust detection boundaries and elevation to your local operational reference. Predannack coordinates/elevation reference: https://en.wikipedia.org/wiki/Predannack_Airfield . These detection circles are not surveyed airfield boundaries.

Conditions offers Open-Meteo automatic blend, UK Met Office seamless model, and European Centre for Medium-Range Weather Forecasts model. All are delivered through Open-Meteo, not direct subscriptions to those providers. Failed model requests show unavailability rather than silently substituting a different model. Model weather remains secondary to the aircraft map and flight records.

The shared collector records both airfields in separate stores. Use FLIGHTBOARD_CONFIG for Brentor and FLIGHTBOARD_PREDANNACK_CONFIG for Predannack, each containing optional JSON detection overrides. Keep lat/lon and origin consistent with the airfield. Shared corrections reject an origin from the other airfield.

Start: npm ci, then npm run dev. Open http://localhost:4173 . For illustrative aircraft, open http://localhost:4173/?demo=1 (demo records are never saved). A plain file:// opening cannot run the server feeds. Deploy the complete project as described above for live data.


## v0.7 ADS-B and historical traces

The aircraft endpoint now merges Open Glider Network (OGN) and ADS-B.lol Automatic Dependent Surveillance–Broadcast (ADS-B) traffic, with independent source status and graceful degradation if one source is unavailable. Nearby matching registrations/device identities are merged; tracking retains identities on a source change. ADS-B altitude is converted from feet, ground speed from knots, and report freshness uses seen_pos. Explicit ground reports can confirm ground height, but still need position and speed evidence. ADS-B.lol may also provide multilateration or other position methods; the source label does not imply every report is direct ADS-B.

Both feeds contribute to local and shared flight detection and daily totals. Visitors remain separate from airfield launches. Existing records remain available in their previous storage locations. Shared collection is now enabled by default on Netlify.

Flight log → Import historical trace accepts an ADS-B.lol/readsb per-aircraft JSON or gzip JSON trace, up to 10 MB compressed/input size and 100,000 trace points. Download and extract a per-aircraft file from the provider archive: https://www.adsb.lol/docs/open-data/historical/ . Traces outside 25 nautical miles of the selected airfield are discarded. Reports are replayed in timestamp order to estimate launches/landings. A selected historical flight draws an amber route on the map. Imported flights are labelled Historical, read-only, de-duplicated against overlapping local/shared records, and included in daily totals, CSV exports and Backup. Imports are local to the current browser, including when shared logging is enabled. They do not overwrite the server's records.

No automatic all-aircraft historical backfill is claimed: the provider supplies daily archive downloads rather than a simple historical airfield query. Missing ground reports cannot prove an airfield departure or landing. Importing the same trace twice does not count it twice. Previous-day local/shared recorded flights remain available using the date selector.

Data attribution: ADS-B.lol https://www.adsb.lol/ ; public API https://api.adsb.lol/docs . Historical provider data is under Open Database License (ODbL) 1.0 as documented by the provider. Retain attribution and comply with its data licence when redistributing derived databases.

## Recording with the browser closed

A published Netlify production build runs the collector once per minute for both airfields and stores flights and daily totals in Netlify Blobs. Closing the dashboard does not stop this scheduled function. Open the dashboard on another device to read the same server records. Collection begins after deployment; existing browser-only records and imported historical traces are not automatically uploaded or backfilled. Local development still uses browser recording.
