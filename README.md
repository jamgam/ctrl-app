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

The fork also adds a per-profile **gyro coordinate space** selector for
incremental gyro mappings: Local, World (turn), and Player (turn).

## Firmware counterpart & Ctrl protocol

The custom pages talk to the [custom firmware](https://github.com/jamgam/alpakka_firmware)
over WebUSB using the Ctrl protocol. The protocol spec lives in the firmware
repo at `docs/ctrl_protocol.md` and is the source of truth for message
framing, config/section indexes, and payload layouts.

App-side implementation:
- `src/lib/ctrl.ts` — protocol enums (message types, config/section indexes)
  and message encoding/decoding.
- `src/services/webusb.ts` — USB transport and request/response handling.

When changing the protocol, land the firmware side (`src/headers/ctrl.h`,
`src/headers/hid.h`, `src/ctrl.c`), the spec (`docs/ctrl_protocol.md`), and
the enums here together, and keep the indexes byte-for-byte identical.

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
