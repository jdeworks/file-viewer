# Editor Roadmap — SSH Config

## Current state
Rich interactive viewer in `parentNode` mode: parses SSH config into host blocks via `parse.js`, renders tabbed navigation (one tab per Host block, wildcard `Host *` last), per-host settings table, and a "Commands" section with generated SSH / SFTP / SCP / VS Code Remote / rsync command strings. Commands are blurred on load and revealed on hover/click (200 ms delay). Copy-to-clipboard per command. Wildcard block shows a "Global defaults" note instead of commands.

## Viewer enhancements (no write-back needed)
- **Search / filter hosts** — text input above the tab bar that filters tabs to those whose patterns match the query substring in real time. — S
- **Connectivity test** — a "Test connection" button per host that opens `ssh -o ConnectTimeout=5 -O check <alias>` via a `navigator.clipboard`-style deep link (`ssh://`) or at minimum copies the test command. Full connectivity is not testable in-browser; the value is one-click copy. — S
- **IdentityFile path validation** — check if declared `IdentityFile` paths follow the `~/.ssh/` convention and flag unusual paths with a warning icon. — S
- **ProxyJump chain visualisation** — when multiple hosts form a jump chain (A → B → C), render a small directed graph (Canvas or SVG arrows) showing the chain. — M
- **Directive documentation tooltips** — hovering over a directive name in the settings table shows a tooltip with the `ssh_config(5)` description of that directive (hardcoded short docs for the ~20 most common ones). — S
- **Export host as `.ssh/config` snippet** — a per-host "Copy block" button that copies just that Host block's raw text for pasting into another config. — S

## In-browser editing (download-on-save)
- **Form-based host editor** — clicking an "Edit" button on a tab opens an editable form for that host block (inputs for HostName, User, Port, IdentityFile, ForwardAgent, ProxyJump, etc.); saving serializes back to SSH config syntax. Validation: Port must be 1–65535, IdentityFile must start with `/` or `~`. — M
- **Add new host** — a "+ Add Host" button appends a blank host form; fills in a template with `Host <name>`, `HostName`, `User`. — S
- **Delete host** — per-tab "Delete" button with a confirmation prompt; removes the block from the in-memory config. — S
- **Reorder host blocks** — drag handles on the tabs or Up/Down buttons to change block order (affects SSH match priority). — M
- **Download modified config** — serialize all blocks back to SSH config text format and offer as a blob URL download of `config` (no extension, matching SSH convention). — S
- **Validation on save** — before download, check for duplicate Host patterns, empty HostName, and warn about `StrictHostKeyChecking no`. — S

## Full write-back editing (companion required)
- **Write config back to `~/.ssh/config`** — save the modified text to the original file path via the companion write-back API; no download dialog.
- **Atomic write with backup** — companion creates a dated backup (`~/.ssh/config.bak-YYYYMMDD`) before overwriting.

## Shared toolbar / modular note
The SSH config format serializer (blocks → text) is a small standalone function; implement it in `parse.js` alongside the existing parser so both the editor and a future "merge configs" feature can share it. Security note: the blurred-command reveal pattern (already implemented) should be preserved in the editor — any new command previews in edit forms should also default to blurred. Do not display IdentityFile private key paths in plaintext without user interaction.
