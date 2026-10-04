# Flightboard v0.6 validation

- 23 deterministic tests pass: feed parser, launch/landing detection, short flights, stale/repeated reports, lost signals, refresh recovery, correction validation, concurrent shared edits, leases, Predannack launch origin, separate record stores, and selected weather model/coordinates.
- npm run build passes JavaScript syntax checks for browser and server code.
- Weather routing tests use mocked upstream responses; live provider availability is not guaranteed.
- Automatic flights remain estimates and require available Open Glider Network reports. Aircraft without received transmissions are absent. Browser-only recording needs an open page. Shared scheduled recording requires Netlify setup and can miss short ground/flight phases.
- Older v0.5 previews are superseded by v06 previews when included.

Final browser visual checks could not run in this environment because the browser executable was unavailable and its download failed. Existing v0.5 previews have been removed to avoid presenting them as v0.6 screenshots.
