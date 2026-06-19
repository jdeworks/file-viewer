# SSH Config

> Interactive SSH config viewer with per-host command palette — generates ready-to-paste ssh, sftp, scp, rsync, and VS Code Remote commands.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `~/.ssh/config`, `ssh_config` |
| MIME type | `text/plain` |
| Binary / Text | Text |
| Common use | SSH client configuration, jump hosts, identity files, port forwarding |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Host block list | ✅ | Each `Host` block shown as a tab |
| Command palette | ✅ | ssh / sftp / scp / rsync / VS Code Remote commands generated per host |
| Copy-to-clipboard | ✅ | One click to copy any generated command |
| Directive display | ✅ | All known directives shown with canonical casing |
| HostName resolution | ✅ | Full commands use HostName, alias uses the pattern |
| ProxyJump support | ✅ | `-J` flag included when ProxyJump is set |
| ForwardAgent support | ✅ | `-A` flag included when ForwardAgent=yes |
| Source view | ✅ | Monaco editor (plaintext mode) |
| Diff | ❌ | `diff: false` |
| Screenshot | ❌ | Interactive panel not suitable |

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

- [`ssh_config`](../examples/ssh_config) — example SSH client config

## Known Limitations

- Wildcard host patterns (`Host *`) are shown but excluded from command generation
- `Match` blocks (conditional directives) are not parsed

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Connectivity test | Low | Hard | Would require server-side component; violates zero-off-origin |
| Include directive expansion | Low | Med | `Include ~/.ssh/config.d/*` not followed |
| `Match` block support | Low | Hard | Conditional matching requires full client-side SSH logic |
