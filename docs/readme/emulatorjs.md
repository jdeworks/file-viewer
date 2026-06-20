# EmulatorJS — Retro Game Emulator

> Run retro game ROMs directly in the browser — NES, SNES, GBA, N64, PSX, Sega, and Arcade via EmulatorJS.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.nes`, `.sfc`, `.smc`, `.gba`, `.gb`, `.gbc`, `.n64`, `.z64`, `.v64`, `.psx`, `.iso`, `.arcade` (and others) |
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
| Multiple cores | ✅ | NES, SNES, GBA, GB/GBC, N64, PSX, Arcade, Sega cores |
| Keyboard mapping | ✅ | On-screen controls + keyboard bindings |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| ROM editing | ❌ | No editing; ROM is loaded read-only |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known-File Enhancement

No known-file plugin — core is selected automatically by file extension.

## Real-World Examples

- [`sample.nes`](../examples/sample.nes) — NES ROM demonstrating in-browser emulation and gamepad support

## Known Limitations

- Large ROMs (N64, PSX) have noticeable load time while WASM core initialises
- PSX CHD format not supported; `.bin`/`.cue` pairs may require manual loading
- Network-dependent SWFs or ROMs that call home will not function

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| CHD format for PSX | Med | Hard | CHD is a compressed disc image; needs libchdr |
| Netplay | Low | Hard | Requires server-side relay; out of scope for static viewer |
| ROM load performance | Med | Med | Pre-warm WASM core in background |
