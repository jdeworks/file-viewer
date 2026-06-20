# Editor Roadmap — Binary / Hex

## Current state
The `binary/` directory is the parent for specialist binary sub-types (exe, wasm, apk, iso, midi, pcap, dicom, blend, etc.). The generic binary fallback and any shared hex-view logic live here. Individual sub-types (exe, wasm) have their own renderers parsing PE headers, WASM section tables, etc.

## Viewer enhancements (no write-back needed)
- **Virtual-scroll hex editor (read-only baseline)** — render bytes as hex + ASCII panel in a virtual-scroll list so large files (100 MB+) open without OOM. 16 bytes per row; row height fixed so only visible rows are in the DOM. — L
- **Jump to offset** — text input accepting decimal or `0x`-prefixed hex; scrolls the virtual list to that byte offset. — S
- **Hex pattern search** — search bar accepting a hex string (e.g. `FF D8 FF`) or ASCII string; highlights matching byte ranges; Next / Previous navigation. — M
- **Byte frequency histogram** — bar chart (Canvas 2D) of all 256 byte values; visualises entropy and helps identify compression, encryption, or text regions. — M
- **Entropy heatmap** — divide the file into 256-byte windows, compute Shannon entropy per window, render a colour strip (low=blue, high=red); clicking a region jumps to that offset. — M
- **ASCII string extraction panel** — find all runs of printable ASCII >= 4 chars; display in a side panel with their offsets (mirrors `strings(1)`). — M
- **Structure annotation** — for known magic bytes (ELF, PE, PNG, ZIP, …) overlay coloured region labels on the hex grid to annotate header fields. — L

## In-browser editing (download-on-save)
- **Toggle edit mode** — switch the hex panel from read-only spans to contenteditable cells (or input elements per nibble); highlight modified bytes in a distinct colour. — M
- **Modify bytes** — type a new hex value in an editable cell to change that byte; validate input (0–9, a–f only); maintain a dirty-byte set. — M
- **Undo / redo** — maintain an edit history stack (offset, old byte, new byte) so Ctrl+Z / Ctrl+Y work. — M
- **Export modified file** — download the modified byte array as a blob (original filename preserved). Only changed bytes are patched into the original Uint8Array. — S
- **Find & replace bytes** — extend the search bar with a "Replace with" field; replace first or replace all occurrences of a hex pattern. — M

## Full write-back editing (companion required)
- **Write patched bytes to original file** — apply the dirty-byte set to the file on disk via the companion write-back API; no download dialog.
- **Patch file as diff** — export the edit session as an IPS or binary patch file; companion applies the patch to the original on disk.

## Shared toolbar / modular note
The virtual-scroll hex component is high-value and reusable: the emulator ROM editor (`emulator/EDITOR.md`) needs the same thing. Implement it as `core/hex-editor.js` (a class that takes a `Uint8Array` and a container element) so both types import it. The binary sub-types (exe, wasm, gamerom, etc.) can optionally mount the shared hex panel in a collapsible "Raw bytes" section below their own structured view.
