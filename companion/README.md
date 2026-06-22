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
