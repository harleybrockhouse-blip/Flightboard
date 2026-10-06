# Flightboard v0.7 validation

29 tests pass, covering original flight tracking/shared recording plus ADS-B field conversion, position age, source degradation, cross-source duplicate merging, source-switch continuity, historical launch/landing reconstruction, repeated imports, off-area traces and distinct short flights. JavaScript syntax build checks pass. Live ADS-B.lol request succeeded for Brentor (3 aircraft at time of check).

Browser visual verification was unavailable in this execution environment. Historical imports are local, read-only, estimated, and need a per-aircraft trace from the provider archive. No automatic comprehensive historical backfill is implemented. Shared collection requires Netlify environment setup. Netlify deployment completion is not yet confirmed.

v0.10.0: 56 automated tests passed, including pressure/geometric altitude separation, ground offset calibration, launch and landing observation windows, high-altitude exclusion, valid soaring climbs, partial PDANNACK records, loss of signal, calendar year/leap boundaries, annual shared reads and historical callsign recovery. Build syntax validation passed. UI startup and annual totals smoke checks passed for both airfields using a minimal DOM harness. No visual browser test was available.
