# Editor Roadmap — SARIF (Static Analysis Results Interchange Format)

## Current state
Overview viewer. Parses runs[], driver tool name/version, and results[].
Extracts severity, ruleId, message text, and physical file+line location.
Shows a severity badge row (error/warning/note/none counts), an overview card
(version, runs, tools, total findings, by severity), and a findings table
(first 20, with severity badge, rule ID, message truncated to 120 chars,
filename:line). Severity-colored row backgrounds.

## Viewer enhancements (no write-back needed)

- **Full findings table with pagination** — Show all findings (not just 20)
  with client-side pagination (50 per page) or virtual scroll for large SARIF
  files (e.g., CodeQL outputs with 10 000+ results) — S
- **Filter by rule ID** — Type-ahead input that filters the table to matching
  ruleIds. Combine with severity checkbox filters — S
- **Filter by severity** — Checkbox group (error / warning / note / none)
  replacing the existing static badge row as an interactive filter. Current
  badge row becomes a clickable shortcut — S
- **Group by file** — Toggle to re-render the table grouped by file path, showing
  a file header with finding count badge, then findings as child rows. Useful
  for code review — M
- **Rule detail panel** — Click a ruleId to show the rule's full name, help
  text, and help URI from `tool.driver.rules[]`. Most SARIF files include this — S
- **Related locations** — SARIF results can have `relatedLocations` (data flow
  paths). Show these as a collapsible location chain below each finding row — M
- **Mark as suppressed toggle** — SARIF has a `suppressions` array on each
  result. Toggle a checkbox per row to add/remove an in-memory suppression;
  counts update in the badge row. Save / download triggers the edit path — S
- **CodeFlow graph** — For SARIF with `codeFlows` (dataflow traces), render a
  step-by-step numbered path view with file:line anchors — L
- **Findings chart** — Bar chart (by severity) or donut (by rule) using a
  canvas sparkline — no extra dep needed — S

## In-browser editing (download-on-save)

- **Bulk suppress** — Select multiple findings by checkbox, then "Mark suppressed"
  inserts `"suppressions": [{"kind":"inSource","justification":"..."}]`. Download
  the modified SARIF — M
- **Justification editor** — Each suppression needs a justification string;
  inline editable text field per suppressed row — S
- **Result level override** — Change severity of individual results (e.g.,
  downgrade a warning to note). Serializes the updated `level` field — S
- **Add partial result** — Form to manually add a finding (useful for tracking
  issues found in manual review alongside automated results) — M

## Full write-back editing (companion required)

- **Live re-scan trigger** — Companion invokes the analysis tool and replaces
  the SARIF file; viewer diffs old vs new findings and highlights regressions
  and fixes — L

## Shared toolbar / modular note
The filter state (severity checkboxes + rule text + group-by toggle) should be
managed as a URL hash fragment so users can share filtered views. The rule
detail panel and code-flow graph are the highest-complexity features; implement
them as lazy-loaded panels that fetch from the pre-parsed run.rules[] cache
built during initial render.
