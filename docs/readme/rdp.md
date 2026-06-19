# RDP Connection File

> Remote Desktop (`.rdp`) connection file viewer — parses typed key-value pairs and shows connection settings in a clean summary.

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
| Connection summary | ✅ | Full address, screen mode, desktop dimensions shown prominently |
| Typed value display | ✅ | `i:` (integer), `s:` (string), `b:` (binary) types parsed |
| Audio/camera settings | ✅ | Audio redirection and camera/microphone settings shown |
| Network settings | ✅ | Network level auth, gateway, connection type displayed |
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

- [`sample.rdp`](../examples/sample.rdp) — example RDP connection file

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Password detection warning | Low | Easy | Flag if password is stored in the file |
| Base64 value decoder | Low | Easy | Decode `b:` binary fields |
