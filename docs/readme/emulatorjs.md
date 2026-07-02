# EmulatorJS — Retro Game Emulator

> Run selected retro game ROMs directly in the browser — NES/Famicom, SNES, Game Boy, Game Boy Advance, Sega Genesis, and Atari 2600 via EmulatorJS.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.nes`, `.fds`, `.sfc`, `.smc`, `.gb`, `.gbc`, `.sgb`, `.gba`, `.gen`, `.smd`, `.a26` |
| MIME type | `application/octet-stream` (ROM files) |
| Binary / Text | Binary |
| Created by | EmulatorJS project (based on RetroArch / libretro cores) |
| Common use | Retro game ROMs; browser-based emulation without install |
| Spec / Docs | [EmulatorJS](https://emulatorjs.org/) |

## Capabilities Matrix

### View / Play
| Capability | Status | Notes |
|------------|--------|-------|
| In-browser emulation | ✅ | Full emulation via EmulatorJS (WASM) |
| Gamepad support | ✅ | Web Gamepad API; plug in a controller and play |
| Save states | ✅ | Save / restore emulator state |
| Multiple cores | ✅ | NES/Famicom, SNES, GB/GBC/SGB, GBA, Sega Genesis/Mega Drive, and Atari 2600 |
| Keyboard mapping | ✅ | On-screen controls + keyboard bindings |
| Start gate | ✅ | Shows a legal/trust warning before loading the ROM blob into EmulatorJS |
| One emulator at a time | ✅ | Existing EmulatorJS instances block starting a second ROM until page reload |
| Metadata | ✅ | System and size for all mapped extensions; NES iNES header details when present |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| ROM editing | ❌ | No editing; ROM is loaded read-only |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known-File Enhancement

No known-file plugin — core is selected automatically by file extension or NES magic.

## Real-World Examples

- [`sample.nes`](../examples/sample.nes) — NES ROM demonstrating in-browser emulation and gamepad support

## Known Limitations

- N64, PSX, Arcade, CHD, `.bin`/`.cue`, and disc-image loading are not wired in this viewer
- Large ROMs can have noticeable load time while the EmulatorJS loader and WASM core initialise
- Only one EmulatorJS instance can run at a time in the current page

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Disc systems / CHD format | Med | Hard | PSX-style disc loading needs cue/bin handling and likely libchdr for CHD |
| Netplay | Low | Hard | Requires server-side relay; out of scope for static viewer |
| ROM load performance | Med | Med | Pre-warm WASM core in background |
