# WYSIWYG / Rich-Text Editor Evaluation — Replacing EasyMDE

**Date:** 2026-06-21
**Goal:** Replace EasyMDE (markdown-only, mediocre) with an editor that supports a **round-trip editing model**: parse a source format (Markdown / HTML / more) into an internal document model, edit it visually, then serialize the model back to the original source format with high fidelity.

**App constraints (non-negotiable — see prompt):**
1. **Zero off-origin at runtime.** Everything vendored into `docs/vendor/`, loaded same-origin. No CDN, no telemetry, no license-key phone-home.
2. **Static GitHub Pages, no app-level build step.** Native ES modules `import`-ed from same-origin files, or vendored UMD globals loaded through `script-loader.js`. A library that *only* exists as an npm package needing webpack/vite is acceptable **only if** we can pre-build one self-contained ESM/UMD artifact once and commit it.
3. **Full offline** (service-worker precache). Smaller is better.
4. **Permissive license** (MIT/BSD/Apache). GPL / commercial-required flagged.

---

## How the editor is wired today (context)

- `docs/types/markdown/wysiwyg.js` — EasyMDE integration. Contract the rest of the app depends on:
  - `mountWysiwyg(container, text, onChange)` — clears container, builds the editor, calls `onChange(value)` on every change.
  - `getWysiwygValue()` → current source string.
  - `unmountWysiwyg()` — tears down.
  - Plus markdown-specific helpers: `wysiwygWrap(before, after, placeholder)`, `getWysiwygCodeMirror()` (these reach into EasyMDE's CodeMirror — they are EasyMDE-specific and would be reimplemented or dropped).
- `docs/core/rawpane.js` — `toggleWysiwyg()` swaps the editor into the `#editor` container, hiding Monaco.
- `docs/core/script-loader.js` — `loadGlobal(src, globalName)` fetches a UMD file and runs it with `define/module/exports` **shadowed** (because Monaco's AMD `define` is global and would otherwise capture the UMD module). So a vendored library must either: (a) expose a **UMD global** we can grab by name, or (b) be a clean **same-origin ES module** we `import` directly (ESM is unaffected by the AMD `define` problem — preferred).
- `docs/types/html/wysiwyg-html.js` — the existing HTML editor is a raw `contentEditable` div using deprecated `document.execCommand`. This is exactly the kind of thing a real document-model editor would replace, and is the reason **HTML round-trip** matters as much as Markdown.

**Key takeaway for selection:** the app already has a clean, tiny mount/unmount/getValue/onChange contract. The winning editor must (1) honor a permissive license, (2) vendor cleanly as ESM or a single prebuilt UMD/IIFE, and (3) do **Markdown→model→Markdown** *and* **HTML→model→HTML** round-trips, because we want one editor to serve both the Markdown viewer and the HTML viewer.

---

## Comparison table

| Editor | Latest version (mid-2026) | License | Distribution / prebuilt bundle (size) | Internal model | MD round-trip | HTML round-trip | Offline-vendorable | Verdict |
|---|---|---|---|---|---|---|---|---|
| **ProseMirror** | core modules independently versioned; `prosemirror-model` ~1.x, `prosemirror-markdown` **1.13.4** | **MIT** | npm ES modules only; **no official single browser bundle** — you bundle the modules yourself (one-time). A bundled view+state+model+markdown+schema-basic build is ~**130–180 KB min** (varies by features). | **Abstract schema-based document model** (validated node tree). The gold standard. | **First-class** via `prosemirror-markdown` (CommonMark parser + serializer, both directions). | Via `prosemirror-model`'s `DOMParser`/`DOMSerializer` against a schema — solid but you define how HTML maps to schema. | **Yes**, after a one-time bundling step we commit. | **Strong (as the engine).** Best round-trip model, but it's a toolkit, not a drop-in editor; raw it's a lot of assembly. |
| **TipTap** | **v3.x** (3.0 GA 2025) | **MIT** (core + open extensions; some *Pro/Cloud* extensions are paid but **opt-in** and not needed) | npm ESM. No official one-file CDN IIFE for full setup; **one-time self-bundle** needed. StarterKit + core bundles to roughly **200–350 KB min** depending on extensions. Built on ProseMirror. | **ProseMirror schema** (TipTap = ergonomic wrapper over PM). | **Good** — official `@tiptap/markdown` (v3) with `parseMarkdown`/`renderMarkdown`; built on PM markdown. First-class in v3. | **Good** — `generateHTML`/`generateJSON` (HTML↔PM-JSON) in `@tiptap/html`, usable in browser. | **Yes**, after a one-time bundling step. | **Top contender.** Gives PM's round-trip power with far less assembly. Bigger than PM-raw; some extensions gated behind paid tiers (avoidable). |
| **Lexical** | **0.45.x** (Meta) | **MIT** | npm ESM only; **no official browser bundle** — self-bundle once. Core is small (~**30–40 KB** core) but you add `@lexical/markdown`, `@lexical/html`, rich-text, list, etc.; realistic vendored ~**80–150 KB**. | **Custom node tree** (EditorState, immutable). Modern, fast, framework-agnostic core (React optional). | `@lexical/markdown` `$convertFromMarkdownString` / `$convertToMarkdownString` — works but transformer-based; **less complete than PM** for edge cases (tables, footnotes, nested constructs need custom transformers). | `@lexical/html` `$generateHtmlFromNodes` / `$generateNodesFromDOM`. Decent; you wire node↔DOM. | **Yes**, after a one-time bundling step. | **Strong runner-up.** Smaller, modern, MIT. Markdown round-trip is good but not as battle-tested for lossless CommonMark as PM. |
| **Quill** | **2.0.3** | **BSD-3** | **Official prebuilt single file** `dist/quill.js` (+ themes CSS). Full build ~**43 KB gzip** core. Easiest to vendor as-is. | **Delta** (linear op list / JSON). *Not* a tree. | **Poor.** No first-class MD. Delta↔Markdown is lossy and community-only; nested/block structures don't map cleanly. | **Lossy.** "HTML cannot be losslessly converted to Delta" (official docs); `<hr>`, complex nesting need custom handling. | Yes (easiest). | **Reject for this app.** Easiest to vendor, worst round-trip. Delta is great for collaborative deltas, wrong for "edit existing MD/HTML and write it back." |
| **CKEditor5** | **v45+** (v44 made `licenseKey` mandatory) | **GPL-2.0+ OR commercial** (dual) | Self-hosted ZIP/npm; large (full build **600 KB–1 MB+**). | Abstract **model→view** tree (its own, powerful). | Official markdown plugin (uses Turndown/markdown via GFM). Reasonable but bolt-on. | Strong HTML in/out (its native data format is HTML). | **Problematic — see below.** | **Reject.** GPL-or-commercial + mandatory license-key field + "Powered by CKEditor" branding logo on the GPL tier. License-key validation is client-side (JWT), but the GPL branding + dual-license posture make it a poor fit for a permissive static app. |
| **Toast UI Editor** | **3.2.x** | **MIT** | **Official prebuilt bundle** `toastui-editor-all.min.js` (~**1.0 MB unmin / ~250–300 KB gzip**) + CSS. Drop-in. | Internally **ProseMirror-based** (since v3) with its own markdown engine. | **First-class** — it *is* a markdown WYSIWYG (CommonMark + GFM), dual markdown/WYSIWYG mode, `getMarkdown()`/`setMarkdown()`. | `getHTML()` exists but it's a markdown-centric editor; HTML is a derived output, not a first-class round-trip source. | **Yes** (prebuilt bundle). | **Pragmatic contender for Markdown.** Best out-of-box MD experience with zero assembly. Weaker as a general HTML round-trip editor; heavier; opinionated UI/theme. |
| **Squire** | **2.x** (Fastmail) | **MIT** | **Tiny** — ~**16 KB min+gzip**, no deps; ships ESM/UMD. | **HTML / contentEditable is the source of truth** (no abstract model). | **None.** Pure HTML editor; no markdown concept. | **Excellent** — designed to preserve arbitrary third-party HTML losslessly (email use case). | Yes (trivial, tiny). | **Best-in-class for HTML-only**, useless for Markdown. Candidate to replace `wysiwyg-html.js` specifically, not the markdown editor. |
| **Trix** | **2.x** (Basecamp) | **MIT** | **Prebuilt** ESM + UMD, small. | Own **document model** (contenteditable as I/O device → internal ops → re-render). | None first-class (HTML-oriented). | Outputs "terse consistent HTML" but its HTML is opinionated/normalized — **not** faithful round-trip of arbitrary input HTML. | Yes. | **Reject.** Opinionated, no markdown, normalizes HTML (lossy for arbitrary input). Good for greenfield comment boxes, not round-trip. |
| **Milkdown** | **7.x** (Crepe ~ recent) | **MIT** | npm ESM, 60+ scoped packages; **self-bundle once**. Built on ProseMirror + Remark. | **ProseMirror** model + **Remark** AST for markdown. | **Excellent** — markdown is the native format (Remark AST), strong CommonMark/GFM round-trip. | Via PM DOM serialization (markdown is the focus). | **Yes**, after a one-time bundle. Plugin sprawl makes bundling fiddlier. | **Strong for Markdown.** PM+Remark gives arguably the best MD round-trip, but many packages to assemble and it's the most build-tool-assuming of the bunch. |

> Sizes are approximate min/gzip figures for representative feature sets; the exact vendored size depends on which extensions/plugins are included. Treat them as order-of-magnitude. Flagged as approximate where I could not pin an exact byte count from official docs.

---

## CKEditor5 — the license/network analysis (explicit, since the prompt asked)

- **License:** dual **GPL-2.0-or-later OR commercial**. Not a permissive license. Using it under GPL would impose GPL obligations on this app — undesirable for a permissively-spirited static project.
- **Mandatory license key (v44.0.0+):** `config.licenseKey` is now **required** even for open-source/GPL use. You set `licenseKey: 'GPL'`.
- **Runtime network behavior (the critical question):**
  - The license key is a **JWT decoded client-side**; the **`'GPL'` value does not contact a license server** — validation for GPL/self-hosted is local. So a self-hosted GPL build **does not phone home for license validation** in the way the prompt feared. *(I could not find an explicit sentence in CKEditor's public docs stating "GPL is validated locally with no network call"; this is inferred from the JWT mechanism, the self-hosted CSP guidance `connect-src 'self'`, and the absence of a required license-server host for self-hosted GPL. **Flagged as inferred, not documented verbatim.**)*
  - **Where it *does* call out:** Cloud/CDN distribution and **usage-based (metered) commercial** plans send editor-load telemetry to `proxy-event.ckeditor.com` (and load from `cdn.ckeditor.com`). That path is avoidable by self-hosting with a non-metered key — but it exists in the codebase.
  - **GPL tier shows a "Powered by CKEditor" branding logo** in the editor area. That alone is a UX dealbreaker for this app.
- **Verdict:** Even though a self-hosted GPL build is *probably* off-origin-clean at runtime, the combination of **GPL-or-commercial licensing + mandatory license-key plumbing + branding logo + 600 KB–1 MB+ size** disqualifies it for a permissive, lightweight, static, offline app. **Reject.**

---

## Top recommendation

### Winner: **TipTap v3** (engine = ProseMirror), with **ProseMirror used directly** as the equally-valid alternative if we want zero TipTap abstraction.

**Why TipTap/ProseMirror wins for *this* app:**

1. **The round-trip need is exactly ProseMirror's design center.** A validated **schema-based document tree** is the right internal model for "parse source → edit → serialize back." Both Markdown (`prosemirror-markdown`, MIT, v1.13.4 — a real CommonMark parser *and* serializer) and HTML (`DOMParser`/`DOMSerializer` against the schema) round-trip through the *same* model. That means **one editor can back both the Markdown viewer and the HTML viewer** — directly addressing the `wysiwyg.js` + `wysiwyg-html.js` duplication. Delta-based (Quill) and HTML-as-truth (Squire/Trix) editors cannot do faithful MD round-trip at all.
2. **License:** MIT (TipTap core + the extensions we need; ProseMirror is MIT). The paid TipTap Pro/Cloud extensions are **opt-in and unnecessary** — none are required for MD/HTML editing. No license key, no branding, no phone-home.
3. **Offline-vendorable:** Pure ES modules. We do a **one-time prebuild** (esbuild/rollup) producing a single self-contained ESM file we commit to `docs/vendor/`, then `import` it same-origin — no app-level build step, no CDN, no runtime network. This is the same "commit the artifact" pattern the prompt explicitly allows.
4. **Extensible for more source formats later:** because the model is a schema, adding another source format = writing a parser/serializer pair against the schema (the PM way). This is the most future-proof of all candidates.

**Runner-up: Lexical (Meta, MIT, 0.45.x).** Smaller core, modern, framework-agnostic, MIT, vendors the same "prebuild one ESM bundle" way. Loses to TipTap/PM only on **round-trip maturity**: `@lexical/markdown` is transformer-based and needs hand-written transformers for tables/footnotes/nested edge cases, whereas `prosemirror-markdown` is a complete CommonMark serializer out of the box. If bundle size becomes the dominant concern, Lexical is the swap.

**If we want zero assembly and only care about Markdown (not HTML):** **Toast UI Editor 3.x** is the pragmatic shortcut — MIT, ships a single prebuilt `toastui-editor-all.min.js`, is itself ProseMirror-backed, and gives a polished MD WYSIWYG with `getMarkdown()`/`setMarkdown()` and zero bundling work. The cost is ~250–300 KB gzip, an opinionated UI, and a weak HTML round-trip story. Good fallback if the prebuild step for TipTap is deemed too much effort.

---

## Integration sketch for the recommendation (TipTap v3)

### 1. Vendoring (one-time prebuild, committed artifact)

Create a tiny build input (lives in a `tools/` or `build/` dir, **not** shipped, run once locally):

```js
// build/tiptap-entry.js  (build input, not vendored)
export { Editor } from '@tiptap/core';
export { default as StarterKit } from '@tiptap/starter-kit';
export { Markdown } from '@tiptap/markdown';      // v3 markdown parse/serialize
export { generateHTML, generateJSON } from '@tiptap/html';
```

Build once with esbuild to a single same-origin ESM file:

```bash
npx esbuild build/tiptap-entry.js \
  --bundle --format=esm --minify \
  --outfile=docs/vendor/tiptap/tiptap.esm.js
```

- **Vendored files:** `docs/vendor/tiptap/tiptap.esm.js` (one file, **~200–350 KB min** depending on extensions; gzip ~70–110 KB) + a small CSS file for editor chrome.
- **Why ESM, not UMD:** `script-loader.js`'s UMD trick exists to dodge Monaco's AMD `define`. A native `import` of a same-origin ESM file sidesteps that entirely — cleaner. We do **not** route TipTap through `loadGlobal`; we `import` it.
- Service worker precaches `tiptap.esm.js` + CSS like any other vendored asset (add to the asset manifest).

### 2. Mount into `#editor` honoring the existing contract

Reimplement `docs/types/markdown/wysiwyg.js` against the same `mount/getValue/unmount/onChange` contract so `rawpane.js`'s `toggleWysiwyg()` needs no change:

```js
import { Editor } from '../../vendor/tiptap/tiptap.esm.js';
// (Editor, StarterKit, Markdown, generateHTML/generateJSON re-exported from the bundle)

let editor = null;

export async function mountWysiwyg(container, text, onChange, { format = 'markdown' } = {}) {
  unmountWysiwyg();
  injectCssOnce('tiptap-css', vendor('tiptap/tiptap.css'));
  container.innerHTML = '';
  const host = document.createElement('div');
  host.className = 'tiptap-host editor-host';
  container.appendChild(host);

  editor = new Editor({
    element: host,
    extensions: [StarterKit, Markdown /* configured for the active format */],
    // MD path: feed markdown via the Markdown extension's input
    content: text,                 // see format handling below
    onUpdate: () => onChange?.(getWysiwygValue(format)),
  });
}

export function getWysiwygValue(format = 'markdown') {
  if (!editor) return '';
  return format === 'html'
    ? editor.getHTML()                       // HTML round-trip out
    : editor.storage.markdown.getMarkdown(); // MD round-trip out (v3 markdown ext)
}

export function unmountWysiwyg() {
  if (editor) { editor.destroy(); editor = null; }
}
export const isWysiwygActive = () => editor !== null;
```

### 3. The MD → model → MD round-trip wiring

- **In:** the Markdown extension parses the incoming markdown string into TipTap/PM JSON when set as content (via `parseMarkdown`).
- **Edit:** user edits the PM document visually.
- **Out:** `editor.storage.markdown.getMarkdown()` serializes the PM document back to CommonMark (`renderMarkdown`). `onUpdate` fires `onChange(value)` exactly as EasyMDE's `codemirror.on('change')` did — same contract, so the rest of the app (dirty tracking, save) is untouched.
- **HTML viewer reuse:** the *same* editor instance serves `wysiwyg-html.js`'s need — set `content` from HTML and read back with `editor.getHTML()` (HTML→PM-JSON→HTML). This lets us retire the `document.execCommand` contenteditable hack in `wysiwyg-html.js`.
- **EasyMDE-specific helpers** (`wysiwygWrap`, `getWysiwygCodeMirror`) get reimplemented as TipTap commands (`editor.chain().toggleBold().run()`, etc.) — cleaner than poking CodeMirror, but it **is** rewrite work for the existing toolbar buttons.

---

## Honest risks / unknowns

1. **One-time prebuild step (the main cost).** TipTap/ProseMirror/Lexical/Milkdown all require us to **bundle once and commit the artifact**. This is allowed by the constraints but adds a vendoring ritual: when we bump versions we must re-run esbuild and re-commit `tiptap.esm.js`. (Quill and Toast UI avoid this — they ship a prebuilt file. That's their one genuine advantage.)
2. **TipTap markdown extension maturity.** The first-class `@tiptap/markdown` is newer (v3-era). For exotic constructs — **footnotes, definition lists, complex tables, raw HTML embedded in markdown** — round-trip may lose or normalize content. `prosemirror-markdown` raw is more battle-tested for pure CommonMark; if we hit fidelity gaps we may drop to PM-markdown directly. **Verify with real fixtures from the repo's markdown examples before committing.**
3. **Bundle size.** ~200–350 KB min for TipTap with a useful extension set is markedly larger than EasyMDE-class tools and *much* larger than Squire (16 KB). Justified by the round-trip requirement, but it does grow the precache. Lexical trims this if size matters.
4. **HTML round-trip is schema-bounded.** PM/TipTap round-trips HTML **that fits the schema**. Arbitrary, messy third-party HTML (the email-style "preserve everything" case) is **Squire's** strength, not PM's — PM will normalize/drop unknown markup. If the HTML viewer must preserve arbitrary input HTML byte-for-faithfully, keep **Squire (16 KB, MIT, prebuilt)** for that specific viewer and use TipTap only for Markdown. This split (TipTap for MD round-trip, Squire for arbitrary-HTML round-trip) may actually be the most honest architecture.
5. **CKEditor5 GPL "no network" claim is inferred, not quoted.** I could not find a CKEditor doc sentence that explicitly says the GPL key performs **zero** network validation; I inferred it from the client-side JWT mechanism and self-hosted CSP guidance. It doesn't change the verdict (rejected on license + branding + size regardless), but flagging the gap.
6. **Quill's BSD + prebuilt file is tempting but a trap here** — the Delta model makes faithful MD/HTML round-trip impossible ("HTML cannot be losslessly converted to Delta" per official docs). Do not pick it for round-trip just because it vendors easily.

---

## Bottom line

- **Pick TipTap v3** (ProseMirror engine) for the Markdown round-trip editor: MIT, schema model, first-class MD *and* HTML serialization, vendorable as one committed ESM artifact, future-proof for more formats. Cost: a one-time prebuild and a ~200–350 KB bundle.
- **Runner-up: Lexical** (MIT, smaller, modern) if bundle size dominates — at the price of hand-writing markdown transformers for edge cases.
- **Consider keeping Squire (16 KB, MIT, prebuilt)** specifically for the *arbitrary-HTML* viewer, since PM-family editors normalize unknown HTML.
- **If the prebuild step is unacceptable and we only need Markdown:** **Toast UI Editor 3.x** (MIT, prebuilt single file, ProseMirror-backed) is the zero-assembly fallback.
- **Reject:** CKEditor5 (GPL-or-commercial, mandatory key, branding logo, huge), Quill (lossy Delta round-trip), Trix (opinionated/normalizing HTML, no MD).

## Sources

- ProseMirror / prosemirror-markdown (MIT, 1.13.4): https://github.com/ProseMirror/prosemirror-markdown , https://www.npmjs.com/package/prosemirror-markdown , https://prosemirror.net/
- TipTap v3 (MIT; markdown + html utilities): https://tiptap.dev/docs/editor/markdown , https://tiptap.dev/docs/guides/output-json-html , https://tiptap.dev/tiptap-editor-v3 , https://github.com/ueberdosis/tiptap
- Lexical (MIT, 0.45.x; @lexical/markdown): https://lexical.dev/docs/packages/lexical-markdown , https://github.com/facebook/lexical
- Quill 2.0.3 (BSD): https://github.com/slab/quill/releases , https://quilljs.com/docs/delta/ , https://github.com/slab/quill/issues/1240
- CKEditor5 (GPL-or-commercial; mandatory license key v44+): https://ckeditor.com/docs/ckeditor5/latest/getting-started/licensing/license-key-and-activation.html , https://ckeditor.com/legal/ckeditor-licensing-options/ , https://github.com/ckeditor/ckeditor5/issues/17973 , https://ckeditor.com/blog/ckeditor-44-0-0-release-highlights/
- Toast UI Editor 3.2.x (MIT, prebuilt bundle): https://github.com/nhn/tui.editor , https://ui.toast.com/tui-editor/
- Squire 2.x (MIT, ~16 KB): https://github.com/fastmail/Squire , https://www.fastmail.com/blog/squire-2-0-fastmail/
- Trix 2.x (MIT): https://github.com/basecamp/trix , https://trix-editor.org/
- Milkdown 7.x (MIT, ProseMirror+Remark): https://github.com/Milkdown/milkdown , https://milkdown.dev/
