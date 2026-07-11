#!/usr/bin/env bash
# Cross-compile the companion to native Windows .exe from Linux/WSL via Docker.
#
# No Windows machine, no Visual Studio, no host toolchain install: a Docker image
# (companion/Dockerfile.win) carries Rust + LLVM + cargo-xwin, and cargo-xwin
# fetches the MSVC CRT/SDK on first run. Output binaries link the CRT statically
# (+crt-static) and strip symbols, so they need no VC++ redistributable and run on
# any Windows 10/11 machine. The desktop (tray) build additionally needs the
# WebView2 runtime, which is preinstalled on Windows 11.
#
# Usage:
#   companion/scripts/build-windows.sh server   # console HTTP server only (small, fast)
#   companion/scripts/build-windows.sh desktop  # Tauri tray app (tray + autostart + native picker)
#   companion/scripts/build-windows.sh all      # both (default)
#
# Artifacts (gitignored build caches):
#   server  -> companion/.win-target/x86_64-pc-windows-msvc/release/companion.exe
#   desktop -> companion/.win-target-tauri/x86_64-pc-windows-msvc/release/file-viewer-companion-desktop.exe
#
# NOTE: these binaries are UNSIGNED. Reputation-based AV and SmartScreen may warn
# about a new unsigned binary that opens a loopback socket and accesses files. A
# warning alone proves neither that the binary is malicious nor that it is safe.
# Review the source and build inputs; see companion/README.md for the full trust
# and checksum guidance.
set -euo pipefail

what="${1:-all}"
# Repo root = two levels up from this script (companion/scripts/ -> companion/ -> repo).
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/../.." && pwd)"
uid="$(id -u)"; gid="$(id -g)"

echo ">> Building cross-compile image (fv-xwin)…"
docker build -t fv-xwin -f "$repo_root/companion/Dockerfile.win" "$repo_root/companion"

run_build() { # $1 = workdir under /work   $2 = CARGO_TARGET_DIR under /work
  docker run --rm \
    -v "$repo_root:/work" \
    -e CARGO_TARGET_DIR="/work/$2" \
    -e CARGO_HOME=/work/companion/.win-cargo \
    -e XWIN_CACHE_DIR=/work/companion/.xwin-cache \
    -e HOME=/tmp \
    -e RUSTFLAGS="-C target-feature=+crt-static -C strip=symbols" \
    --user "$uid:$gid" \
    -w "/work/$1" \
    fv-xwin \
    cargo xwin build --locked --release --target x86_64-pc-windows-msvc
}

if [[ "$what" == "server" || "$what" == "all" ]]; then
  echo ">> Cross-compiling server (companion.exe)…"
  run_build companion/server companion/.win-target
  echo "   -> companion/.win-target/x86_64-pc-windows-msvc/release/companion.exe"
fi

if [[ "$what" == "desktop" || "$what" == "all" ]]; then
  echo ">> Cross-compiling desktop tray app (file-viewer-companion-desktop.exe)…"
  run_build companion/src-tauri companion/.win-target-tauri
  echo "   -> companion/.win-target-tauri/x86_64-pc-windows-msvc/release/file-viewer-companion-desktop.exe"
fi

echo ">> Done. (Unsigned binaries — see the AV note in README before distributing.)"
