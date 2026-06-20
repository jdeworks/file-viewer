# Editor Roadmap — Emulator

## Current state
Three sub-renderers under `docs/types/emulator/`:
- **emulatorjs/** — EmulatorJS library; handles a wide range of console ROMs (NES, SNES, GBA, N64, PS1, Sega, Atari, etc.) via RetroArch cores compiled to WASM. Vendor already present at `docs/vendor/emulatorjs/`.
- **ruffle/** — Ruffle Flash emulator for SWF files. Vendor at `docs/vendor/ruffle/`.
- **v86/** — x86 PC emulator (v86 WASM) for disk images and DOS executables. Vendor at `docs/vendor/v86/`.

Each renderer wraps the upstream library; no custom UI beyond the library defaults.

## Viewer enhancements (no write-back needed)
- **Save state / load state** — expose EmulatorJS's `EJS_gameManager.saveState()` / `loadState()` API via toolbar buttons; serialize state to a blob URL download (save) or accept a `.state` file upload (load). For v86 use `emulator.save_state()`. — M
- **Controller remapping UI** — read EmulatorJS's gamepad mapping object and render an editable table (button name → keyboard key or gamepad button index); persist remapping in `localStorage` keyed by core name. — M
- **Cheat code entry (Game Genie / GameShark format)** — text input that passes codes to EmulatorJS `EJS_cheats` API; validate format client-side with a regex per platform. — S
- **Full-screen toggle** — call `element.requestFullscreen()` on the canvas container; show a keyboard shortcut hint (F11 / Escape). EmulatorJS has a built-in button but v86 does not. — S
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
All three sub-renderers are iframe-free (they own their canvas). A shared toolbar component above the emulator canvas (Play/Pause, Save State, Load State, Full Screen, Volume) would unify the experience. Consider a thin `emulator-toolbar.js` module imported by all three. The ROM hex editor can be the same virtual-scroll component used by the binary viewer — implement once, import in both.
