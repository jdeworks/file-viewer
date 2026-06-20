# Editor Roadmap — YAML

## Current state

- Collapsible tree viewer via `<details>`/`<summary>` (renderer.js), shared JSON tree CSS; multi-document stream (`---`) rendered as labelled document panels; js-yaml safe load (no custom types)
- Form editor (form-editor.js, ~13 KB): top-level scalar keys → "General" section; top-level object keys → collapsible sections; typed inputs: checkbox (bool), number, text/textarea (string), datetime-local (ISO dates), comma-separated list (scalar arrays); complex/nested values shown as read-only badges; leading `#` comment block preserved on serialization; save → blob download
- Export: JSON download (exports.js, js-yaml → JSON.stringify)
- Raw text pane (editable) and raw diff through core layer

## Viewer enhancements (no write-back needed)

- **YAML-to-JSON toggle** — toolbar button that renders the parsed document as pretty-printed JSON in a side panel; trivial since js-yaml is already loaded — S
- **Multi-document navigator** — when `---` separators are present, show a numbered tab bar (Document 1 / 2 / …) to switch between documents rather than stacking them all; current renderer renders all — S
- **Anchor / alias visualization** — js-yaml resolves anchors before handing us the JS object, losing the `&anchor`/`*alias` structure; for visualization, scan the raw YAML text with a regex and annotate the tree nodes that originated from anchors/aliases with a badge (`&name` source, `*alias` → points to source) — M
- **Schema validation** — accept a JSON Schema or YAML Schema (drop file or paste), validate parsed document with `ajv`, annotate tree nodes with pass/fail badges — M — lib: `ajv`
- **Key-path breadcrumb + clipboard** — same as JSON: click a tree node to copy its dot-path — S

## In-browser editing (download-on-save)

- **Schema-driven form** — extend form-editor.js to accept a JSON Schema; auto-derive field types, descriptions, and enum constraints from the schema rather than inferring from the value; show `description` as tooltip on labels — M
- **Nested object editing** — form-editor currently renders nested object values as read-only badges; add a "expand inline" action that recursively renders the nested object's keys as an indented sub-form — M
- **Array-of-objects table** — when a top-level value is an array of objects with a consistent shape (similar to the JSONL renderer's schema detection), render it as a mini spreadsheet (like csv/table-editor.js) for row-level editing — M
- **YAML to JSON save** — "Save as JSON" button that serializes the current form state via `jsyaml.dump` → `JSON.stringify` and downloads; the JSON export already exists at the viewer level but should also be available from the form editor toolbar — S
- **Lint / syntax check** — on every keystroke in the raw pane, attempt `jsyaml.load` and show inline error markers (line number + message) without leaving the edit pane — S

## Full write-back editing (companion required)

- **Live save** — debounced POST to companion on form field change; companion writes file atomically
- **Multi-document write-back** — the form editor currently handles only single documents; companion mode can persist the full stream including `---` separators by keeping the un-edited documents as opaque text and only round-tripping the active document through js-yaml
- **Comment preservation** — js-yaml strips all comments on parse → dump; companion mode can use `yaml` (eemeli/yaml) instead, which preserves comments in its CST; swap the lib only when companion is active to avoid the heavier bundle in view-only mode

## Shared toolbar / modular note

YAML toolbar: View tree | Form edit | Validate | YAML→JSON | Multi-doc nav.
The form-editor.js field renderers (renderField, renderSection) are shared by TOML (toml/form-editor.js reuses identical CSS classes `ini-row`, `toml-row`). Any improvement to the field render logic should be landed in a shared `form-fields.js` module and imported by both.
