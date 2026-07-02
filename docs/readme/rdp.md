# RDP Connection File

> Remote Desktop (`.rdp`) connection file viewer — parses typed key-value pairs, shows connection settings, and offers copyable client commands.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.rdp` |
| MIME type | `text/plain` |
| Binary / Text | Text |
| Common use | Windows Remote Desktop connection shortcuts, remote access profiles |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Connection summary | ✅ | Host, port, username, and domain shown prominently when present |
| Typed value display | ✅ | `i:` (integer), `s:` (string), `b:` (binary) types parsed |
| Audio/camera settings | ✅ | Audio redirection and camera/microphone settings shown |
| Network settings | ✅ | Network level auth, gateway, connection type displayed |
| Copyable commands | ✅ | `mstsc` and `xfreerdp` commands are generated; buttons blur until hover/click |
| Source view | ✅ | Monaco editor with INI syntax highlighting |
| Diff | ❌ | `diff: false` |
| Metadata | ✅ | Host, screen mode, dimensions, auth mode |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Source editing | ✅ | Full Monaco editor |
| Save (Companion) | ✅ | Write-back to local file |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Real-World Examples

- [`sample.rdp`](../examples/sample.rdp) — base RDP connection file
- [`example.rdp`](../examples/example.rdp) — enhanced known-file RDP config with redacted password and command buttons

## Known-File Enhancement

`rdp-config` enhances `.rdp` files with a compact connection card, NLA/resource chips, redacted configured password values, and copyable `mstsc`/`xfreerdp` commands.

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Password detection warning | Low | Easy | Flag if password is stored in the file |
| Base64 value decoder | Low | Easy | Decode `b:` binary fields |
