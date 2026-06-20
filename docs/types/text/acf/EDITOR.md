# Editor Roadmap — ACF (Steam App Cache File / Valve KeyValues)

## Current state
Viewer parses the Valve KeyValues text format (VDF/ACF), unwraps the top-level single-key envelope, and renders a structured table: App ID, install directory, state flags (decoded from bitmask to human-readable labels), size on disk, build ID, universe, platform, beta branch, last updated, and last played timestamps. Installed depot IDs are shown as chips (capped at 10 + overflow count).

## Viewer enhancements (no write-back needed)
- Full depot table — show all `InstalledDepots` entries with their `manifest`, `dlcappid` (if present), and `size` sub-fields in a collapsible table — S
- DLC inventory — extract `DLCData` or `dlcappid` entries and list DLC app IDs with names (names require a Steam API call; offline: just show IDs) — S
- User config section — surface `UserConfig` key–value pairs (launch options, language, beta key) in a dedicated section — S
- Mounted depots list — parse `MountedDepots` separately from `InstalledDepots` and show a diff indicator — S
- State flag inspector — show the raw `StateFlags` integer with each bit flag checked/unchecked in a visual bitmask table — S
- Deep raw tree — render the entire parsed KV tree as a collapsible JSON-style tree for unknown ACF variants — M

## In-browser editing (download-on-save)
Editing note: ACF files are written by Steam and re-read at launch; manual edits risk being overwritten. Useful edits are narrow:
- Edit install directory — change `installdir` string value; download patched ACF — S — no lib (string-replace in serializer)
- Edit user launch options — change `UserConfig.LaunchOptions` string; download patched ACF — S — no lib
- Add/remove DLC entry — add or delete a `dlcappid` block in `DLCData`; download patched ACF — M — custom KV serializer needed
- KV serializer — a round-trip serializer (JS object → VDF text with correct quote escaping and indentation) is needed for any editing feature; ~50 LOC — M

## Full write-back editing (companion required)
- Save patched ACF to Steam library path — requires companion; Steam paths on Windows are well-known (`C:\Program Files (x86)\Steam\steamapps\`)
- Hot-reload detection — companion watches the file for Steam overwrites and notifies the viewer

## Shared toolbar / modular note
The `parseKv` function in the current renderer is already a clean export candidate. A matching `serializeKv` function (inverse) is the only prerequisite for all editing features. No external lib is needed.
