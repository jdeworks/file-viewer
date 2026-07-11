# Packaged Companion evidence — Linux/WSLg

Date: 2026-07-10
Host: Linux x86_64 under WSL2/WSLg (`DISPLAY=:0`, Wayland available), Rust 1.96.0,
Tauri CLI 2.11.3. The host had no pre-existing user D-Bus session and no desktop tray
manager. All filesystem operations used the disposable root
`/tmp/fv-companion-packaged-enzmkA`; the fixed token `fvpackaged-e2e` was test-only.

## Locked bundle build

Command:

```sh
cd companion/src-tauri
cargo tauri build --bundles deb -- --locked
```

Result: exit 0. Tauri built the optimized desktop executable and bundled:

```text
target/release/bundle/deb/File Viewer Companion_0.1.0_amd64.deb
SHA-256 e8b0fdbc098967f61c908462fde4c49aca3f422c41cf6e9ee46d1a18edb2c24e
size 4,275,052 bytes
```

`dpkg-deb --info` reported version 0.1.0/amd64 and dependencies on
`libayatana-appindicator3-1`, `libwebkit2gtk-4.1-0`, and `libgtk-3-0`; all were installed.
`desktop-file-validate` passed and `ldd` reported no missing runtime library. See
`bundle-inspection.txt`, `bundle-contents.txt`, and `runtime-dependencies.txt`.

After the final watcher-retry correction, the locked package was rebuilt from the final source
and those three inspection files were regenerated. The exact new package payload was extracted to
a second disposable root and launched with a disposable config/token. Its payload SHA-256 was
`a63bf06d41007f49394dc0371ca561ebe182dc2cbb4b96c92667594b07fea4d1`; it bound only
`127.0.0.1:7700`, returned v0.1.0 and the disposable token from `/ping`, loaded only the disposable
watched root, and emitted a real `create` SSE event from that root. Termination released port 7700.
See `current-source-runtime.txt`. This final refresh directly covers the only post-visual-run native
source delta (watch subscription retry); the GTK picker/tray screenshots below remain from the
immediately preceding package, whose Tauri UI source was unchanged.

The package was extracted with `dpkg-deb -x` into the disposable root rather than installed
system-wide. The executed binary was the exact extracted package payload:

```text
/tmp/fv-companion-packaged-enzmkA/extracted/usr/bin/file-viewer-companion-desktop
```

## Launch and single-instance behavior

The inspectable run used a private D-Bus session and X11 through WSLg:

```sh
env XDG_RUNTIME_DIR=/tmp/fv-companion-packaged-enzmkA/runtime \
  DISPLAY=:0 GDK_BACKEND=x11 \
  dbus-run-session -- bash -lc '
    export COMPANION_CONFIG=/tmp/fv-companion-packaged-enzmkA/config.json
    export COMPANION_TOKEN=fvpackaged-e2e
    exec /tmp/fv-companion-packaged-enzmkA/extracted/usr/bin/file-viewer-companion-desktop
  '
```

The process bound only `127.0.0.1:7700`; `/ping` returned version 0.1.0 and the fixed test
token, and `/watched-paths` returned only the disposable root. A second packaged process was
started with a different disposable config/token. It exited 0, logged `Address already in use`,
did not create its config, did not replace the listener PID, and left the first token unchanged.
See `second-instance.stdout` and `packaged-companion.log`.

## Native picker

The packaged `POST /path-picker` opened the real GTK `Select Folder` dialog. Windows RAIL UI
automation navigated only through `/tmp` and selected the newly created disposable folder
`picker-added`. The response was HTTP 200:

```json
{"chosen":"/tmp/fv-companion-packaged-enzmkA/picker-added","ok":true,"paths":["/tmp/fv-companion-packaged-enzmkA/watched","/tmp/fv-companion-packaged-enzmkA/picker-added"]}
```

The root was atomically persisted, no temp file remained, and a real file creation inside the
new root emitted create and modify SSE events (`native-picker-watch.sse`). Key screenshots are
`native-picker-open.png` and `native-picker-picker-added.png`; intermediate navigation captures
show that selection stayed inside the disposable tree.

## Tray lifecycle

`org.kde.StatusNotifierWatcher` had no owner in the private session, so WSLg supplied no natural
system-tray host. The application still created its 16×16 XEmbed tray window, initially unmapped.
To exercise the application tray code without installing a desktop shell, the evidence-only
`xembed-tray-host.c` claimed `_NET_SYSTEM_TRAY_S0`, accepted the normal dock request, and embedded
the icon. This proves the app's XEmbed/menu behavior, but it is not evidence for integration with
a real GNOME/KDE panel.

Observed tray behavior:

- The status dot was red while idle and changed to green after `/ping` and the three-second tray
  refresh interval (`tray-x11-forced-map.png`, `tray-x11-connected.png`).
- The menu rendered all expected items (`tray-menu.png`): status, Open File Viewer, Add watched
  folder, Show session token, Open logs folder, and Quit.
- Show session token opened its real dialog with the fixed test token and disposable token path
  (`tray-session-token-dialog.png`).
- Add watched folder opened the real native picker and added only `tray-added`
  (`tray-add-picker-tray-added.png`). The root persisted and produced real create/modify SSE events
  (`tray-added-watch.sse`).
- Selecting the menu's Quit item exited the desktop process with status 0, released port 7700,
  and ended its private D-Bus session. No signal was used for this final lifecycle check.

## Environmental boundary and warnings

- WSLg has no `org.kde.StatusNotifierWatcher`; real desktop-panel placement, icon interaction,
  and login/autostart behavior remain unverified on GNOME/KDE. The isolated XEmbed host covered
  application menu and lifecycle logic only.
- Autostart was not enabled or modified because the app exposes no control in this build and doing
  so would change the real login environment. Open Viewer/Open logs were visible but not activated
  because they would launch external user applications and add no filesystem-boundary evidence.
- The private session logged missing RealtimeKit/PipeWire and portal-service warnings. The forced
  X11 run also emitted GTK/GDK critical warnings during WSLg dialog/window teardown. They did not
  prevent HTTP, picker, watcher, menu, or Quit behavior, but packaged runs on a real Linux desktop
  should check that those warnings are WSLg-specific.
- The token and daily log were mode 0644 inside the mode-0700 disposable parent; config was 0600.
  The already-documented machine-wide loopback trust model remains the actual security boundary.
- The `.deb` was extracted, not installed, so maintainer-script/install/uninstall behavior was not
  exercised. The archive contains no maintainer scripts beyond standard control/md5 metadata.

`screenshot-sha256.txt` records hashes for all captured PNG evidence. The disposable process,
listener, D-Bus session, XEmbed host, and temporary root were removed after capture.
