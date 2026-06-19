# Jupyter Notebook

> Notebook renderer showing Markdown, code cells, and saved outputs (stream, rich HTML, images, errors) — code is never executed.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.ipynb` |
| MIME type | `application/x-ipynb+json` |
| Binary / Text | Text (JSON) |
| Common use | Data science, machine learning experiments, scientific research, tutorials |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| Markdown cell rendering | ✅ | markdown-it with GFM; HTML outputs DOMPurify'd |
| Code cell source | ✅ | Syntax-highlighted source in `<pre>` |
| Stream outputs | ✅ | stdout / stderr from saved outputs |
| Rich HTML outputs | ✅ | `display_data` HTML sanitized via DOMPurify |
| Image outputs | ✅ | PNG / JPEG / SVG from base64 data URIs |
| Error outputs | ✅ | Traceback shown in red (`nb-error`) |
| ANSI escape stripping | ✅ | Terminal color codes stripped from output |
| Code never executed | ✅ | Saved outputs only; no kernel connection |
| Source view | ✅ | Monaco editor with JSON syntax highlighting |
| Text diff | ✅ | Standard line diff on the JSON source |
| Metadata | ✅ | Kernel name, language, cell counts by type, code/markdown ratio |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Source editing | ✅ | Full Monaco editor on the raw JSON |
| Save (Companion) | ✅ | Write-back to local file |
| Cell editing (visual) | ❌ | No Jupyter-style cell editor |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |
| Export as HTML | ❌ | nbconvert-style HTML export not implemented |

## Real-World Examples

- [`sample.ipynb`](../examples/sample.ipynb) — example notebook with Markdown, code, and plot output

## Known Limitations

- Interactive widgets (`ipywidgets`) are not rendered
- LaTeX math in Markdown cells is not rendered (KaTeX not integrated)
- Very large notebooks with many image outputs may be slow to parse

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Math rendering (KaTeX) | Med | Med | LaTeX in `$...$` blocks inside Markdown cells |
| Export as HTML (nbconvert-style) | Med | Med | Self-contained HTML with embedded outputs |
| Cell-level folding | Low | Easy | Collapse/expand individual cells |
| Execution count display | Low | Easy | Show `[N]:` execution counter beside code cells |
