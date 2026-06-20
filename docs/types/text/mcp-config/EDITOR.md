# Editor Roadmap — MCP Config

## Current state
Card-based viewer in `parentNode` mode: parses `mcpServers` object from JSON, renders one card per server showing transport badge (stdio / http / unknown), server name, command + args (stdio), URL with localhost note (http), HTTP headers (treated as env rows), and environment variables. Env vars matching KEY/SECRET/TOKEN/PASSWORD/AUTH/CREDENTIAL/PRIVATE/API are redacted with block characters and a reveal/hide toggle. Falls back to a parse-error message on invalid JSON.

## Viewer enhancements (no write-back needed)
- **Tool list preview** — for stdio servers whose command is a local path, display the MCP server's declared tool list if a `tools` or `capabilities` key exists in the config; many MCP config files embed this. — S
- **Transport badge for SSE** — detect `url` entries whose path contains `/sse` or whose config has `"type": "sse"` and badge them as `sse` rather than generic `http`. — S
- **Duplicate env var detection** — highlight env keys that appear in both the server's `env` block and in another server's block; useful for spotting shared secrets defined redundantly. — S
- **Copy full server entry** — a "Copy JSON" button per card that copies that server's JSON block for pasting into another config. — S
- **Secret count summary** — show in the card header how many env vars are redacted (e.g. "3 secrets") so the user knows to scroll to see them. — S

## In-browser editing (download-on-save)
- **Add server** — a "+ Add Server" button opens a form with fields for name, transport (stdio/http selector), command + args (stdio) or URL (http), and env var key/value pairs. On confirm, appends the new server to the in-memory JSON. — M
- **Edit server** — an "Edit" button per card opens the same form pre-filled with the server's current values; updates the entry in-place. — M
- **Delete server** — a "Delete" button per card with a confirmation prompt; removes the server from `mcpServers`. — S
- **Reorder servers** — drag handles or Up/Down buttons on each card; order affects nothing functionally in the spec but users care about visual organization. — M
- **Add / remove env vars** — within the Edit form, a dynamic key/value list with add row (+) and remove row (×) buttons; secret keys auto-detected and shown as password inputs. — M
- **Validation** — before download: check for duplicate server names, warn if a `command` path looks absolute (security note), flag empty `url` for http transport. — S
- **Download modified config** — serialize `{ mcpServers: { … } }` back to indented JSON and offer as a blob URL download. — S

## Full write-back editing (companion required)
- **Write config back to original file** — save the modified JSON to the original file path (e.g. `~/.claude/claude_desktop_config.json` or `~/.config/claude/config.json`) via the companion write-back API.
- **Auto-detect config location** — companion can probe common MCP config paths and present a "Save to detected location" option.

## Shared toolbar / modular note
The secret redaction pattern (`SECRET_PATTERN` regex + block characters + reveal toggle) is the primary security feature here. Any edit form for env vars should use `<input type="password">` for keys matching that pattern, and the pattern should be extracted to a shared `core/secret-keys.js` constant so the ssh-config and kubeconfig renderers can import the same list. JSON serialization is trivial (`JSON.stringify(obj, null, 2)`); no external lib needed for the write path.
