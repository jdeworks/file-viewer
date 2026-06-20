# Editor Roadmap — Strings (iOS / macOS Localization)

## Current state
Handles two sub-formats: `.strings` (key-value pairs with `"key" = "value";` syntax) and `.stringsdict` (XML plist, plural rules). The `.strings` renderer parses comments, quote-escape sequences, and `%`-format specifiers; highlights specifiers in the value column; flags mismatched specifiers between key and value; extracts the language code from the `.lproj` directory name in the filename. Live search filters keys and values. The `.stringsdict` renderer renders the plist XML as a collapsible tree. Supports dark mode.

## Viewer enhancements (no write-back needed)
- Missing key detector — given two `.strings` files for different locales (drag-drop the second), compare key sets and highlight keys present in one but not the other — M
- Format specifier summary — dedicated panel listing all unique `%`-specifiers used across values (e.g. `%@`, `%d`, `%1$@`) as a quick reference for translators — S
- Duplicate key warning — scan for repeated keys (invalid in `.strings`) and flag them with a badge — S
- Android `strings.xml` import preview — detect if the dragged file is an Android XML and show a side-by-side mapping to the iOS `.strings` keys — M
- Value length statistics — show character counts per value, flag any that exceed a configurable limit (useful for UI overflow checks) — S
- Comment density indicator — show what fraction of entries have associated `//` or `/* */` comments — S

## In-browser editing (download-on-save)
- Edit translation values — click a value cell to open an inline `<textarea>`; Tab moves to the next row; preserve escape sequences and format specifiers on save — M — no lib
- Edit keys — inline input for the key; validate uniqueness before accepting — M — no lib
- Add new entry — "Add row" button appending a blank `"new.key" = "";` entry to the table and the serialized output — S — no lib
- Delete entry — row-level delete button; remove from internal array; regenerate on save — S — no lib
- Export as `.strings` — serialize the edited pairs back to `"key" = "value";` format with `//` comments preserved; UTF-8 with BOM option for compatibility with older Xcode versions; offer download — S — no lib
- Import from JSON — accept `{ "key": "value" }` JSON (drag-drop or paste); merge into current entry set; show new/overwritten badges — M — no lib
- Export as JSON — download the key-value pairs as a flat JSON object — S — no lib
- Import Android `strings.xml` — parse `<string name="key">value</string>` elements; map to `.strings` format (convert `%s`→`%@`, `%d` stays); download as `.strings` — M — `DOMParser` (native)
- Export as Android `strings.xml` — reverse of the above — M — `DOMParser` / manual XML serialization

## Full write-back editing (companion required)
- Save edited `.strings` to the original `.lproj` path — POST to companion `/write-back`
- Multi-locale batch replace — find and replace a value across all `.lproj` directories in the project; companion walks the directory tree

## Shared toolbar / modular note
The `.strings` serializer must handle escape sequences: `\n`, `\t`, `\"`, `\\`. The `"key" = "value";` form is required; the alternate `key = value;` (without quotes) is non-standard and should not be emitted. For multi-locale diff, the second file should be loaded via a second `<input type="file">` button rather than drag-drop to avoid conflicting with the main file drop zone.
