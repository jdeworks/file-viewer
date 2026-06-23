# file-viewer-companion

Local HTTP server for file-viewer that enables save-back to disk.

**What is exchanged** (for transparency — users are encouraged to inspect all traffic in the Network tab):

| Endpoint | Method | Data sent | Data received |
|----------|--------|-----------|---------------|
| /ping | GET | nothing | `{ ok, version, token, capabilities }` (token auto-read by the viewer; CORS-gated) |
| /watched-paths | GET | nothing | list of watched folder paths |
| /watched-paths | POST/DELETE | folder path | success/error |
| /find-file | GET | filename + size | list of matching absolute paths |
| /find-folder | GET | relative path | list of matching root paths |
| /file | GET | absolute path | file bytes |
| /file | POST | absolute path + file bytes | success/error |
| /file | DELETE | absolute path | success/error (token-gated; refuses directories) |
| /files | GET | absolute dir path | directory listing |
| /watch | GET (SSE) | nothing | `changed` / `remove` events for watched files |
| /path-picker | POST | nothing | desktop build only: shows the native folder dialog, adds the chosen folder, returns the list |

The companion only accesses files within configured watched folders. All mutating endpoints require a session token (`X-Companion-Token` header) generated at startup.

## Local build & test (no CI — build locally)

There is no CI building the companion; build and test it locally:

```sh
npm run companion:build     # cargo build (debug)
npm run companion:test      # cargo test  — server unit + integration tests
npm run companion:run       # run the server on 127.0.0.1:7700 (Ctrl-C to stop)
npm run test:companion      # full browser↔companion end-to-end (spawns the binary, drives the viewer)
```

`companion:run` prints the session token; set a fixed one with `COMPANION_TOKEN=…`. The end-to-end
test isolates itself with `COMPANION_CONFIG=<temp>` (so it never touches your real watched-paths
config) and refuses to run if something is already listening on :7700.

The Tauri desktop wrapper (tray, autostart, native folder picker) lives under `src-tauri/` and is
built with `cargo tauri build` / `cargo tauri dev` (needs the Tauri toolchain; on Linux/WSL2 also
`webkit2gtk-4.1`).

## Bundling (no CI — build locally)

There is no CI; bundles are produced on a developer machine. Two outputs matter:

### Linux (.deb / AppImage) — native build

From a Linux/WSL host with the Tauri toolchain (`webkit2gtk-4.1`, `gtk+-3.0`) + `cargo-tauri`:

```sh
cd companion/src-tauri
cargo tauri build --bundles deb        # -> target/release/bundle/deb/*.deb
cargo tauri build --bundles deb,appimage   # also AppImage (downloads linuxdeploy on first run)
```

On WSL2 the resulting app runs under WSLg. Note: a Linux build watching Windows files under
`/mnt/c/...` will save/read fine but will **not** receive live file-change events (inotify does not
see Windows-side writes) — use the native Windows build below for file-watch against Windows folders.

### Windows (.exe) — cross-compiled from Linux/WSL via Docker

No Windows machine, no Visual Studio: a Docker image carries Rust + LLVM + `cargo-xwin`, which
auto-fetches the MSVC CRT/SDK. One command:

```sh
companion/scripts/build-windows.sh all      # server + desktop tray app
companion/scripts/build-windows.sh server   # just the console HTTP server (small, fast)
companion/scripts/build-windows.sh desktop  # just the Tauri tray app
```

Artifacts (gitignored build caches):
- `companion/.win-target/x86_64-pc-windows-msvc/release/companion.exe` — console HTTP server.
  Add watched folders via the viewer's typed-path input (no native picker in the bare server).
- `companion/.win-target-tauri/x86_64-pc-windows-msvc/release/file-viewer-companion-desktop.exe` —
  windowless tray app (tray + autostart + native folder picker). Needs the WebView2 runtime,
  preinstalled on Windows 11.

Both link the CRT statically (`+crt-static`) and strip symbols, so they need **no VC++
redistributable** and run on any Windows 10/11 machine.

### Unsigned binaries & antivirus

These bundles are **unsigned**. Reputation-based antivirus (e.g. Avast/AVG's `IDP.Generic`) and
Windows SmartScreen may flag a brand-new, unsigned executable that opens a network socket and reads
files — which the companion legitimately does. **This is a false positive, not malware detection.**
The durable fix for distribution is **Authenticode code signing** (a trusted CA cert; an EV cert
builds reputation fastest) — the same reason macOS distribution needs an Apple Developer ID. Until
then the recommended path (and the one the in-viewer download panel points to) is **build from
source** and trust your own build, or restore from quarantine + add an AV exception for a binary you
built yourself. You can also submit a false-positive report to the AV vendor.

### macOS (.dmg)

Requires a Mac to build and an Apple Developer ID ($99/yr) to sign/notarize — deferred. Build with
`cargo tauri build` on macOS when that's justified.
