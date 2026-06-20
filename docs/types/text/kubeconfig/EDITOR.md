# Editor Roadmap — Kubeconfig

## Current state
Structured viewer in `parentNode` mode: custom line-by-line YAML parser (no external YAML lib), extracts clusters, contexts, and users sections. Renders a "Current context" highlight box, then three tables (Contexts, Clusters, Users) via `kubeconfig-tables.js`. Cluster rows show server URL as a link, TLS-insecure warning badge, auth method detection (cert, bearer token, exec plugin, auth provider, username/password). Falls back to raw text on parse error.

## Viewer enhancements (no write-back needed)
- **Set active context highlight** — clicking a context row in the Contexts table marks it as the active context (visual highlight only, ephemeral). Shows `kubectl config use-context <name>` command in a copy tooltip. — S
- **kubectl command palette** — a small panel of one-click copy commands: `kubectl config use-context <name>`, `kubectl config get-clusters`, `kubectl config view --minify`, `kubectl cluster-info`. — S
- **Redact credentials** — `client-certificate-data`, `client-key-data`, and `token` fields in the Users section are long base64 blobs; show a truncated redacted badge (e.g. `[cert: 2048 bytes]`) with a reveal button rather than the raw data. — M
- **Server URL reachability indicator** — for each cluster server URL, attempt a `fetch` with a short timeout (within the zero-off-origin constraint this only works for same-origin or localhost servers); show a green/red dot. Only enable when the URL is localhost/127.0.0.1. — S
- **Namespace column in Contexts table** — already parsed but verify it is displayed; if not, add a Namespace column with `—` for unset entries. — S
- **Merge kubeconfig** — accept a second `.kubeconfig` file via drop or file picker; merge clusters/contexts/users lists (dedup by name) and show a preview diff before download. — L

## In-browser editing (download-on-save)
- **Set active context (edit)** — clicking "Use context" in the Contexts table updates the `current-context` field in the in-memory YAML string and enables download. — S
- **Add / edit / delete context** — form dialog with fields for context name, cluster, user, namespace; serializes changes back to YAML. — M
- **Add / edit / delete cluster** — form with cluster name, server URL, insecure-skip-tls-verify checkbox; optional CA data upload. — M
- **Add / edit / delete user** — form with user name and auth method selector (token input, cert/key file upload, exec command); serialize to the appropriate YAML structure. — M
- **Download modified kubeconfig** — serialize the in-memory config back to YAML (can use the custom serializer or js-yaml, which is already vendored at `docs/vendor/js-yaml/`) and download. — S — js-yaml (docs/vendor/js-yaml/)
- **Credential redaction for sharing** — a "Share-safe export" button that strips all `*-data`, `token`, and `password` fields and downloads a credential-free config suitable for sharing. — S

## Full write-back editing (companion required)
- **Write modified kubeconfig back to `~/.kube/config`** — save the edited YAML to the original file path via the companion write-back API.
- **Merge and write** — merge a second kubeconfig and write the combined result to disk; companion handles conflict resolution for duplicate context names.

## Shared toolbar / modular note
The current custom YAML parser is intentionally minimal. For serialization (write path), switching to js-yaml (`docs/vendor/js-yaml/`) is preferable over hand-rolling a serializer — js-yaml is already vendored. The kubeconfig's base64-encoded cert/key fields are the main security concern: the viewer should never render them in plaintext without an explicit reveal action (same blurred-reveal pattern as ssh-config). Any edit form for credentials should use `<input type="password">` for token fields.
