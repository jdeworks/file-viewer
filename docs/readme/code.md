# Source Code

> Monaco editor with per-language syntax highlighting, CodeLens function metrics (LOC + cyclomatic complexity), and full code-shape metadata.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.js`, `.mjs`, `.cjs`, `.jsx`, `.ts`, `.tsx`, `.py`, `.rb`, `.go`, `.rs`, `.java`, `.c`, `.h`, `.cpp`, `.cc`, `.cxx`, `.hpp`, `.cs`, `.php`, `.swift`, `.kt`, `.kts`, `.scala`, `.m`, `.fs`, `.fsx`, `.vb`, `.sh`, `.bash`, `.zsh`, `.ps1`, `.bat`, `.cmd`, `.css`, `.scss`, `.less`, `.sql`, `.graphql`, `.gql`, `.proto`, `.wgsl`, `.sol`, `.lua`, `.r`, `.pl`, `.dart`, `.ex`, `.exs`, `.clj`, `Dockerfile`, `Makefile` |
| MIME type | `text/plain` (varies by language) |
| Binary / Text | Text |
| Common use | Application source, scripts, stylesheets, build files, database queries |
| Spec / Docs | Depends on language |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Syntax highlighting | ✅ | 35+ languages via Monaco; exact language shown in header label |
| CodeLens function metrics | ✅ | `ƒ name · N LOC · complexity M` above each function (JS/TS/Java/C/C++/C#/Go/Rust/PHP/Swift/Kotlin/Scala/Dart/Python) |
| Source view | ✅ | Full-height Monaco editor, read-only by default |
| Text diff | ✅ | Standard line diff |
| Metadata: code shape | ✅ | LOC, blank lines, comment lines, comment density, max indentation, max nesting depth |
| Metadata: code structure | ✅ | Imports/includes, exports (JS/TS), classes (JS/TS), entrypoints (main functions) |
| Metadata: function analysis | ✅ | Function count, avg/max complexity, complex functions (≥10), avg/max function LOC |
| TODO/FIXME count | ✅ | Scans for `TODO`, `FIXME`, `XXX` markers |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Source editing | ✅ | Full Monaco editor |
| Save (Companion) | ✅ | Write-back to local file |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Convert to other formats | ❌ | Source code is not converted |

## Language Support

| Language group | Extensions |
|----------------|------------|
| JavaScript / TypeScript | `.js`, `.mjs`, `.cjs`, `.jsx`, `.ts`, `.tsx` |
| Python | `.py` |
| Systems (C family) | `.c`, `.h`, `.cpp`, `.cc`, `.cxx`, `.hpp`, `.cs`, `.go`, `.rs`, `.swift`, `.kt`, `.kts`, `.scala`, `.dart` |
| Scripting | `.rb`, `.php`, `.lua`, `.pl`, `.ex`, `.exs`, `.clj`, `.r` |
| Shell / CLI | `.sh`, `.bash`, `.zsh`, `.ps1`, `.bat`, `.cmd` |
| Web / styling | `.css`, `.scss`, `.less` |
| Query / schema | `.sql`, `.graphql`, `.gql`, `.proto`, `.sol` |
| Other | `.wgsl`, `.m`, `.fs`, `.fsx`, `.vb`, `Dockerfile`, `Makefile` |

CodeLens function metrics are available for brace-based languages (JS/TS/Java/C/C++/C#/Go/Rust/PHP/Swift/Kotlin/Scala/Dart) and Python. Complexity is approximated (1 + decision points); files over 400 KB are skipped to keep the editor responsive.

## Real-World Examples

- [`Dashboard.tsx`](../examples/Dashboard.tsx) — TypeScript React component
- [`Widget.jsx`](../examples/Widget.jsx) — JavaScript JSX component
- [`app.ts`](../examples/app.ts) — TypeScript application entry point
- [`server.go`](../examples/server.go) — Go HTTP server
- [`worker.rs`](../examples/worker.rs) — Rust worker
- [`Main.java`](../examples/Main.java) — Java class
- [`Main.kt`](../examples/Main.kt) — Kotlin class
- [`Job.scala`](../examples/Job.scala) — Scala job
- [`App.swift`](../examples/App.swift) — Swift application
- [`app.dart`](../examples/app.dart) — Dart / Flutter file
- [`analysis.r`](../examples/analysis.r) — R script
- [`script.sh`](../examples/script.sh) — Shell script
- [`styles.css`](../examples/styles.css) — CSS stylesheet
- [`query.sql`](../examples/query.sql) — SQL query
- [`Makefile`](../examples/Makefile) — Build file

## Known Limitations

- Complexity analysis is heuristic — no AST parser; approximate for display purposes only
- Ruby, Perl, Lua, Elixir, Clojure, R, and most scripting languages do not get CodeLens (brace-detection only)
- Files over 400 KB skip complexity analysis to stay responsive
- No semantic understanding (jump-to-definition, hover docs, etc.) — display-only

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Complexity CodeLens for Ruby/Perl/Lua/Elixir | Med | Med | Extend metrics.js with indent or regex strategy |
| Jump to symbol (outline panel) | Med | Med | Monaco `getDocumentSymbolProvider` — outline tree |
| Export metrics as JSON | Low | Easy | Download code-shape + function table as JSON |
| Minimap / code folding | Low | Easy | Monaco built-in; toggle in settings |
