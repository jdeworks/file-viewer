# Editor Roadmap — REG (Windows Registry Export)

## Current state
Comprehensive viewer: full parser handling line continuations, deleted keys (`[-HKEY...]`) and deleted values (`-"name"=`), all value types (REG_SZ, REG_DWORD, REG_QWORD, REG_BINARY, REG_EXPAND_SZ, REG_MULTI_SZ). Renders a collapsible key tree with hive colour-coded badges, typed value badges, and an autorun security warning for Run/RunOnce/Winlogon keys. Expand/collapse-all buttons included.

## Viewer enhancements (no write-back needed)
- Key search / filter — live text input to filter keys and values by substring; highlight matches; collapse non-matching keys — M
- Security risk scanner — expand the autorun pattern list to include known malware persistence paths (`HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Image File Execution Options`, `AppInit_DLLs`, shell extensions, etc.) and show severity badges (low / medium / high) — M
- Hive summary panel — count keys and values per hive (HKLM, HKCU, etc.) and show a breakdown table at the top — S
- Value type distribution — show a small bar or count of how many REG_SZ vs. REG_DWORD vs. REG_BINARY values are present — S
- Diff view — accept a second `.reg` file via drag-drop and show added/removed/changed keys and values side by side — L
- Export as JSON — serialize the parsed key/value tree to a clean JSON structure and offer download — S

## In-browser editing (download-on-save)
- Edit REG_SZ / REG_EXPAND_SZ values — inline `<input type="text">` replacing the displayed value; on save, re-serialize the modified entry as `"name"="new value"` with correct escape sequences (`\\`, `\"`) — M — no lib
- Edit REG_DWORD values — numeric input; validate range 0–0xFFFFFFFF; serialize as `dword:XXXXXXXX` — S — no lib
- Add new value — per-key "Add value" button: name input, type selector (REG_SZ / REG_DWORD / REG_BINARY / REG_MULTI_SZ), value input — M — no lib
- Delete value — mark value as deleted (`-"name"=`) and include in regenerated `.reg` — S — no lib
- Add new key — input for key path under a selected hive; append `[HKEY_...]` block — M — no lib
- Mark key for deletion — toggle key to `[-HKEY_...]` syntax in the output — S — no lib
- Export as .reg — serialize all keys and values back to Windows Registry Editor 5.00 format with correct encoding (UTF-16LE hex for REG_EXPAND_SZ/REG_MULTI_SZ, `dword:` prefix for REG_DWORD); offer `.reg` download — M — `TextEncoder` for UTF-16LE output
- Flag dangerous keys before export — warn if the output contains autorun, `AppInit_DLLs`, or IFEO keys and require a confirmation click — S

## Full write-back editing (companion required)
- Apply `.reg` file to live registry — requires companion running on Windows with `reg import` subprocess call; not feasible in pure browser
- Watch registry key — companion polls a key path for changes and notifies the viewer

## Shared toolbar / modular note
The REG_MULTI_SZ and REG_EXPAND_SZ serializers must produce UTF-16LE comma-separated hex bytes matching the `hex(7):` and `hex(2):` format — use `TextEncoder` with `'utf-16le'` (where available) or manual byte-pair encoding. The existing `parseValue` function is clean and should be extracted to a shared module when adding a serializer counterpart.
