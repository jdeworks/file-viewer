# Editor Roadmap — Jupyter Notebook (.ipynb)

## Current state
Read-only renderer: parses `.ipynb` JSON (nbformat 3 and 4), renders markdown cells via markdown-it + DOMPurify, displays code cells with plain (unhighlighted) escaped source and saved outputs (stream, error, execute_result/display_data covering text/html, text/plain, image/png, image/jpeg, image/svg+xml). All HTML outputs are sanitized. Notebook code is never executed. Runs in the sandboxed iframe (`bodyHtml` path).

## Viewer enhancements (no write-back needed)
- **Syntax highlighting for code cells** — load highlight.js (already used elsewhere?) or Prism.js (vendorable, ~30 KB for Python grammar) and apply to `<pre>` code blocks. Detect the kernel language from `nb.metadata.kernelspec.language`. — S — highlight.js or prism.js
- **Cell collapse / expand** — add a toggle triangle on each cell; collapsed cells show only the first line of source. State is ephemeral (no write-back). — S
- **Output image lightbox** — clicking an `<img>` output opens a full-screen overlay for inspection. Reuse any existing lightbox utility in the project. — S
- **Table of contents sidebar** — extract H1–H3 from markdown cells and render a sticky TOC panel for long notebooks. — M
- **Kernel / metadata badge** — display `nb.metadata.kernelspec.display_name` and `nb.nbformat` version in a small header badge. — S

## In-browser editing (download-on-save)
- **Cell source editing** — switch from `bodyHtml` (iframe) to `parentNode` mode; replace each code cell's `<pre>` with a Monaco editor instance (vendor already at `docs/vendor/monaco/`). Edit cell source in-place. — M — Monaco (docs/vendor/monaco/)
- **Add / delete / reorder cells** — toolbar buttons above each cell: Add Cell Above, Add Cell Below, Delete, Move Up, Move Down. Mutates the in-memory notebook JSON. — M
- **Execute cells via Pyodide** — load Pyodide from `docs/vendor/pyodide/` (vendorable, ~15 MB; Python 3.12 WASM). Run a cell's source in a Pyodide worker, capture stdout/stderr and the `repr` of the last expression, update the cell's `outputs` array, and re-render. Limit: pure Python only (no C extensions unless Pyodide ships them). — L — Pyodide (~15 MB WASM, vendor at docs/vendor/pyodide/)
- **Clear outputs** — toolbar button per cell and a global "Clear All Outputs" that empties all `outputs` arrays in the JSON. — S
- **Export as .ipynb** — serialize the in-memory notebook JSON and trigger a blob URL download. Natural companion to the cell editor. — S
- **Export as HTML** — render the full notebook to a self-contained HTML string (inline CSS, base64 images) and download. Mirrors `jupyter nbconvert --to html`. — M

## Full write-back editing (companion required)
- **Save edited notebook back to disk** — write the modified `.ipynb` JSON to the original file path via the companion write-back API.
- **Run all cells and save outputs** — execute all code cells sequentially via Pyodide and persist the populated `outputs` into the file on disk.
- **Kernel selection** — allow switching kernelspec metadata; companion could launch an actual Jupyter kernel for non-Python languages.

## Shared toolbar / modular note
Switching to `parentNode` mode is a prerequisite for Monaco-based editing. Pyodide should run in a `SharedWorker` or `Worker` so the UI thread stays responsive during long computations; the worker is vendorable at `docs/vendor/pyodide/`. The 15 MB WASM payload should be gated behind a user opt-in setting (similar to the existing `enableArchiveWasm` pattern) and cached in Cache Storage after first load.
