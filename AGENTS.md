# Agent notes

The repo docs are the source of truth: read `README.md` first (build/run
commands, project layout, and the "Firmware counterpart & Ctrl protocol"
section). Add durable project knowledge to the README or docs, not to this
file — keep this file limited to workflow hints that don't belong in
user-facing docs.

- This app pairs with the Alpakka Lite firmware repo, which is usually also
  checked out on the same machine (directory name `alpakka_lite_firmware`).
  Locate it or ask for its path before making protocol changes, and treat its
  `docs/ctrl_protocol.md` as the protocol spec.
- Protocol changes must land in lockstep across both repos — see the README
  section for the exact files. Never change an enum index on one side only.
- Verify changes with `npm run build`; use `npm start` (ng serve) for live
  testing. WebUSB requires a Chromium-based browser and a connected
  controller — flows that need hardware can't be verified headlessly, say so
  instead of guessing.
