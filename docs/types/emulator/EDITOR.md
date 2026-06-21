# Editor Roadmap — Emulator

## Current state
Three sub-renderers under `docs/types/emulator/`:
- **emulatorjs/** — EmulatorJS library; handles a wide range of console ROMs (NES, SNES, GBA, N64, PS1, Sega, Atari, etc.) via RetroArch cores compiled to WASM. Vendor already present at `docs/vendor/emulatorjs/`.
- **ruffle/** — Ruffle Flash emulator for SWF files. Vendor at `docs/vendor/ruffle/`.
- **v86/** — x86 PC emulator (v86 WASM) for disk images and DOS executables (auto-selects fda/hda/cdrom by extension + size). Vendor at `docs/vendor/v86/`.

All three renderers gate startup behind a **security-warning dialog** ("I understand — Start"/Cancel with a "Load anyway" fallback) before instantiating the library. EmulatorJS and Ruffle then wrap the upstream library with no further custom UI. **v86 ships a custom toolbar below the screen: Pause/Resume, Save State (downloads a `.v86state` blob via `emulator.save_state()`), Load State (file-picker → `emulator.restore_state()`), and Full Screen (`requestFullscreen` on the screen container).**

## Viewer enhancements (no write-back needed)
- ✅ SHIPPED (v86 only) — **Save state / load state** — expose EmulatorJS's `EJS_gameManager.saveState()` / `loadState()` API via toolbar buttons; serialize state to a blob URL download (save) or accept a `.state` file upload (load). For v86 use `emulator.save_state()`. — M — *Done for v86 (Save State downloads `.v86state`, Load State restores from file). Still TODO for EmulatorJS.*
- **Controller remapping UI** — read EmulatorJS's gamepad mapping object and render an editable table (button name → keyboard key or gamepad button index); persist remapping in `localStorage` keyed by core name. — M
- **Cheat code entry (Game Genie / GameShark format)** — text input that passes codes to EmulatorJS `EJS_cheats` API; validate format client-side with a regex per platform. — S
- ✅ SHIPPED (v86) — **Full-screen toggle** — call `element.requestFullscreen()` on the canvas container; show a keyboard shortcut hint (F11 / Escape). EmulatorJS has a built-in button but v86 does not. — S — *v86 now has a Full Screen toolbar button (`requestFullscreen` on the screen container); keyboard-shortcut hint not added.*
- **Volume / mute control** — slider wired to the AudioContext gain node or EmulatorJS's audio API. — S
- **FPS counter overlay** — measure `requestAnimationFrame` intervals and display a small corner badge; useful for diagnosing WASM perf. — S

## In-browser editing (download-on-save)
- **ROM hex editor** — load the raw ROM bytes into a virtual-scroll hex editor (same component as the binary/hex plan below); allow toggling edit mode, modifying bytes, and downloading the patched ROM. No game-specific parsing in scope. — M — (shared hex editor component, see binary/EDITOR.md)
- **IPS / BPS patch apply** — accept a patch file, apply it to the ROM bytes in-browser, download the patched output. IPS is a simple format implementable in ~60 lines; BPS needs a CRC32 check. — M (no external lib needed)
- **SRAM export / import** — for games that use battery-backed saves (`.sav` files), allow the user to download the current SRAM from EmulatorJS and re-import a `.sav` from disk. — S — EmulatorJS SRAM API

## Full write-back editing (companion required)
- **Auto-save SRAM to original directory** — instead of a download dialog, persist the `.sav` alongside the ROM on disk each time the game writes to SRAM.
- **Save state library** — store multiple named states per ROM keyed by hash; display a thumbnail grid (canvas snapshot) and allow overwrite / delete.

## Shared toolbar / modular note
All three sub-renderers are iframe-free (they own their canvas). v86 already ships a per-renderer toolbar (Pause/Resume, Save State, Load State, Full Screen) — the natural next step is to extract that into a shared `emulator-toolbar.js` module imported by all three, so EmulatorJS and Ruffle get the same Play/Pause/Save/Load/Full-Screen/Volume controls. The ROM hex editor can be the same virtual-scroll component used by the binary viewer — implement once, import in both.
