# Kubernetes Config

> Kubeconfig viewer showing clusters, contexts, users, auth methods, source jumps, and security review with redacted source preview.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `~/.kube/config`, `kubeconfig`, `*.kubeconfig` |
| MIME type | `text/yaml` |
| Binary / Text | Text (YAML) |
| Common use | kubectl authentication, cluster access configuration, CI/CD pipeline credentials |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Context list | ✅ | All contexts shown; current-context highlighted |
| Cluster info | ✅ | Server URL and CA cert presence shown per cluster |
| User auth methods | ✅ | Client certificate, token, exec plugin, auth-provider, username/password detected |
| Current context | ✅ | Active context prominently shown |
| Source jumps | ✅ | Table values jump to matching source lines |
| Security review | ✅ | Flags TLS skip, embedded CA data, embedded credentials, and production-looking current contexts |
| Redacted source preview | ✅ | Embedded token/key/certificate values are masked in the preview |
| kubectl commands | ❌ | Command palette is not implemented |
| Source view | ✅ | Monaco editor with YAML syntax highlighting |
| Diff | ❌ | `diff: false` |
| Metadata | ✅ | Context count, cluster count, user count, current context, clusters, contexts |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Source editing | ✅ | Full Monaco editor |
| Save (Companion) | ✅ | Write-back to local file |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Export single context | ❌ | Not yet implemented |

## Security Notes

- Certificate and token values are visible in the source view but not decoded or transmitted
- The structured preview and redacted source preview mask embedded tokens, keys, and certificate data
- The viewer is entirely client-side — no credentials are sent to any server

## Real-World Examples

- [`kubeconfig`](../examples/kubeconfig) — example kubeconfig with multiple contexts

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Single-context export | Med | Easy | Extract one context as a minimal standalone kubeconfig |
| kubectl command palette | Med | Easy | Generate copyable commands per context |
| Token decode (JWT) | Low | Easy | Decode the service account JWT to show expiry |
| Cluster connectivity check | Low | Hard | Would require server-side proxy; violates zero-off-origin |
