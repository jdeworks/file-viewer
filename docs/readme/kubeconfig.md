# Kubernetes Config

> Kubeconfig viewer showing clusters, contexts, users, and auth methods — with current-context highlighted and command-palette for kubectl.

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
| User auth methods | ✅ | client-certificate, token, exec plugin, OIDC detected |
| Current context | ✅ | Active context prominently shown |
| kubectl commands | ✅ | Ready-to-paste `kubectl` commands per context |
| Source view | ✅ | Monaco editor with YAML syntax highlighting |
| Diff | ❌ | `diff: false` |
| Metadata | ✅ | Context count, cluster count, user count, current context |

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
- The viewer is entirely client-side — no credentials are sent to any server

## Real-World Examples

- [`kubeconfig`](../examples/kubeconfig) — example kubeconfig with multiple contexts

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Single-context export | Med | Easy | Extract one context as a minimal standalone kubeconfig |
| Token decode (JWT) | Low | Easy | Decode the service account JWT to show expiry |
| Cluster connectivity check | Low | Hard | Would require server-side proxy; violates zero-off-origin |
