# file-viewer-companion

Local HTTP server for file-viewer that enables save-back to disk.

**What is exchanged** (for transparency — users are encouraged to inspect all traffic in the Network tab):

| Endpoint | Method | Data sent | Data received |
|----------|--------|-----------|---------------|
| /ping | GET | nothing | `{ ok, version, token, capabilities }` (token auto-read by an allowed browser origin) |
| /watched-paths | GET | nothing | list of watched folder paths |
| /watched-paths | POST/DELETE | folder path | success/error |
| /find-file | GET | filename + size | list of matching absolute paths |
| /find-folder | GET | relative path | list of matching root paths |
| /file | GET | absolute path | file bytes |
| /file | POST | absolute path + file bytes | success/error |
| /file | DELETE | absolute path | success/error (token-gated; deletes files and recursive subfolders, but never a watched root) |
| /files | GET | absolute dir path | directory listing |
| /tree | GET | absolute root path | recursive file listing |
| /watch | GET (SSE) | nothing | `changed` / `remove` events for watched files |
| /logs | GET | optional level/text/time filters | companion activity records |
| /reveal | POST | absolute path | opens the containing folder in the OS file manager |
| /path-picker | POST | nothing | desktop build only: shows the native folder dialog, adds the chosen folder, returns the list |

The HTTP server binds only to loopback at `127.0.0.1:7700`, so it is not exposed on LAN or public
interfaces. Watched roots constrain file-content and directory reads as well as disk mutations.
`DELETE /file` may recursively remove a subfolder inside a watched root, but it refuses to remove
the watched root itself.

CORS is a browser-origin barrier, not local-process authentication. The configured deployed viewer
origin (default `https://jdeworks.github.io`) and any page served over HTTP from `localhost` or
`127.0.0.1` on any port may read responses, including the session token returned by `/ping`. Other
browser origins cannot read those responses. Local programs are not constrained by browser CORS
and can call the loopback API directly.

Read endpoints do not require a token. Mutating or side-effecting endpoints require the per-session
token in the `X-Companion-Token` header. The token limits accidental or blind mutation requests; it
is not a security boundary against software already running as your user.

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
cargo tauri build --bundles deb -- --locked        # -> target/release/bundle/deb/*.deb
cargo tauri build --bundles deb,appimage -- --locked   # also AppImage (downloads linuxdeploy on first run)
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

Both x86_64 binaries link the CRT statically (`+crt-static`) and strip symbols, so they need **no
VC++ redistributable**. The desktop build still requires WebView2 as noted above.

### Unsigned binaries & antivirus

These bundles are **unsigned**. Reputation-based antivirus and Windows SmartScreen may warn about a
new unsigned executable that opens a loopback socket and accesses files. That warning alone proves
neither that the binary is malware nor that it is safe. Do not suppress a warning merely because it
is expected; verify what you received and decide what inputs you trust.

`SHA256SUMS` provides transfer-integrity checks: matching it shows that your downloaded bytes match
the bytes listed by the release. A checksum is not proof of publisher identity or software safety,
especially when the asset and checksum came through the same channel. Building from reviewed source
with a toolchain and dependency set you trust provides more control, but is not a guarantee. The
durable identity improvement for Windows distribution is Authenticode signing.

### macOS (.dmg)

Requires a Mac to build and an Apple Developer ID ($99/yr) to sign/notarize — deferred. Build with
`cargo tauri build` on macOS when that's justified.

## Manual release

Releases are built locally from an unpushed annotated tag. The release script validates a clean
x86_64 Linux/WSL checkout, exact version agreement, the local tag at `HEAD`, absence of that tag on
`origin`, the full repository release gate, locked builds, artifact formats, package metadata,
license notices, checksums, and a clean worktree afterward. It never creates tags, pushes, uploads,
or publishes anything.

Install the pinned license-report tool yourself before the release build (the script does not
install tools):

```sh
cargo install --locked cargo-about --version 0.8.2
```

Use this sequence for `v0.1.0`, substituting the actual version:

1. Finish the release commit locally and ensure `git status --short` is empty.
2. Create an **unpushed annotated** local tag: `git tag -a v0.1.0 -m "File Viewer v0.1.0 public beta"`.
3. Run `companion/scripts/build-release.sh v0.1.0`.
4. While the tag is still unpushed, smoke-test and clean up on Linux and Windows as described below.
5. Push only the verified tag: `git push origin v0.1.0`.
6. In the GitHub web UI, create a draft release for that tag, mark it as a prerelease, and manually upload all files from `companion/dist/v0.1.0/`, including `LICENSE`, `THIRD-PARTY-LICENSES.html`, and `SHA256SUMS`.
7. Re-download all six payloads plus `SHA256SUMS` into a clean directory, run `sha256sum -c SHA256SUMS`, then publish the release manually.
8. Push the development branch after publication: `git push origin dev`.

### Platform smoke and cleanup

**Linux:** Run `sha256sum -c SHA256SUMS` inside the dist directory. Launch the AppImage, exercise
connect/add/read/save/delete (including a disposable subfolder), then quit it. Install the deb with
`sudo dpkg -i file-viewer-companion-0.1.0-linux-amd64.deb`, repeat the smoke, and remove it with
`sudo dpkg -r file-viewer-companion`. Remove test state from
`~/.config/file-viewer-companion/` after confirming no real watched paths are needed.

**Windows:** The two `.exe` assets are raw portable executables, not an installer. Check their
SHA-256 values after transfer. Run and smoke the console server, stop it, then run and smoke the tray
desktop executable. Quit the tray app and delete both executables. Remove disposable state from
`%APPDATA%\file-viewer-companion`; if the desktop executable registered its launch URL during the
smoke, remove it with `reg delete HKCU\Software\Classes\fvcompanion /f`. Disable any test Startup
Apps entry if one was enabled.

**macOS:** This release is source-only on macOS. Do not attach an unsigned macOS binary. A Mac user
may build from the tagged source with the documented Tauri prerequisites; signed/notarized macOS
distribution remains deferred.
