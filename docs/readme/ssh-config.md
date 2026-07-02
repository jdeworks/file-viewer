# SSH Config

> Interactive SSH config viewer with per-host tabs, directive tables, security metadata, and generated ssh/sftp/scp/rsync/VS Code Remote commands.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `~/.ssh/config`, `ssh_config`, `.ssh-config` |
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
| Metadata | ✅ | Host aliases, users, ports, identities, ProxyJump/ProxyCommand, forwards, includes, and security notes |
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

- [`ssh_config`](../examples/ssh_config) — SSH client config with named hosts, ProxyJump chains, wildcard fallback, and key paths

## Known-File Enhancement

The `ssh-client-config` known-file renderer handles canonical `ssh_config` paths that are not already claimed by the dedicated base type. It shows a compact card list with `ssh`/`sftp` copy buttons, while the base `ssh-config` renderer provides the full tabbed command palette.

## Known Limitations

- Wildcard host patterns (`Host *`) are shown but excluded from command generation
- `Match` blocks are parsed for metadata, but they are not rendered as command tabs

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Connectivity test | Low | Hard | Would require server-side component; violates zero-off-origin |
| Include directive expansion | Low | Med | `Include ~/.ssh/config.d/*` not followed |
| `Match` block support | Low | Hard | Conditional matching requires full client-side SSH logic |
