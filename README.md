# Ctrl app (jamgam fork)

*Configuration app for Input Labs controllers, accessible at [ctrl.inputlabs.io](https://ctrl.inputlabs.io)*

**This is an unofficial fork** (not affiliated with Input Labs) adding pages
for custom [Alpakka Lite firmware](https://github.com/jamgam/alpakka-lite)
extensions, under `Settings`:

- **Gyro acceleration**: speed-dependent sensitivity curve (slow/fast
  multipliers ramping between two angular speed thresholds, JoyShockMapper
  style) with a live curve preview, plus gyro recording: stream angular
  speed and mouse output while playing, see time-at-speed and
  speed-over-time charts against the curve thresholds, export CSV.
- **Scroll buttons**: flick (burst of notches with a realistic decay) vs
  single-trigger behavior, notches per flick, flick duration window, and
  per-profile overrides stored in each profile.
- The profile currently active on the controller is shown live (pushed by
  the firmware on every profile switch).

These pages require the matching custom firmware; on stock firmware the
requests simply time out and the rest of the app works as usual.

## Project links
- [Alpakka Manual](https://inputlabs.io/devices/alpakka/manual).
- [Alpakka Firmware](https://github.com/inputlabs/alpakka_firmware).
- [Alpakka PCB](https://github.com/inputlabs/alpakka_pcb).
- [Alpakka 3D-print](https://github.com/inputlabs/alpakka_case).
- [Ctrl app](https://github.com/inputlabs/ctrl). _(you are here)_
- [Roadmap](https://github.com/orgs/inputlabs/projects/2/views/2).

## Dependencies

- [NodeJS](https://nodejs.org)
- `npm ci`

## Commands

- `ng serve` - To dynamically render pages while developing.
- `ng build` - To build a deployable production version.
