# Editor Roadmap — RDP (Remote Desktop Protocol connection file)

## Current state
Full viewer with DOM-based rendering (`parentNode` return): parses all `key:type:value` lines (string `s:`, integer `i:`, binary `b:`), groups settings into sections (Connection, Display, Authentication, Experience, Local Resources, Advanced), and shows a connection info card with host/port/username/domain. A command palette generates mstsc and xfreerdp CLI commands as blurred buttons (hover to reveal, click to copy). Settings table is grouped by section.

## Viewer enhancements (no write-back needed)
- Resolution visual indicator — display the `desktopwidth` × `desktopheight` values as a small labelled aspect-ratio rectangle — S
- Authentication level explainer — map the `authentication level` integer (0/1/2/3) to a human-readable security description ("No auth required", "Server auth required", etc.) — S
- Connection type decoder — map `connection type` integer (1–7) to bandwidth labels (Modem, Broadband low, Satellite, …, LAN, Auto) — S
- Screen mode badge — `screen mode id` 1=windowed, 2=fullscreen; show as a badge — S
- Local resource summary — convert boolean integer values (0/1) for redirect flags to a readable list ("Clipboard: on, Printers: off, …") — S
- RDP URI generator — assemble an `rdp://` URI from the parsed fields and offer a copy button — S

## In-browser editing (download-on-save)
- Form editor — replace the read-only settings table with labelled form controls per known parameter:
  - `full address`: text input (host:port)
  - `username` / `domain`: text inputs
  - `desktopwidth` / `desktopheight`: linked number inputs with a resolution preset dropdown (1920×1080, 2560×1440, 3840×2160, custom)
  - `session bpp`: select (15/16/24/32)
  - `screen mode id`: radio (windowed / fullscreen)
  - Boolean redirect fields (clipboard, printers, drives, etc.): checkboxes
  - `authentication level`: select with labels
  - `audiomode`: select (play locally / play on remote / no audio)
  - M overall — no lib
- Add custom key — freeform `key:type:value` input for parameters not covered by the form — S
- Delete key — remove a known or custom key from the output — S
- Export modified .rdp — serialize the form state back to `key:s:value` / `key:i:value` / `key:b:value` lines in the standard RDP format; offer download — S — no lib
- Preset templates — dropdown with connection profiles (e.g. "Azure VM defaults", "Local LAN full quality") that pre-fill the form — S

## Full write-back editing (companion required)
- Save edited `.rdp` to original path via companion `/write-back`
- Launch connection — companion on Windows can invoke `mstsc /v:host` directly; on Linux invoke `xfreerdp`

## Shared toolbar / modular note
The serializer is trivial: each entry becomes `${key}:${type}:${value}\r\n` (RDP files conventionally use CRLF). The form editor should switch the renderer from the current `parentNode` DOM mode to a hybrid: keep the command palette read-only section, put the form above the settings table with a toggle between "view" and "edit" mode.
