# Welcome to File Viewer

A **mobile-first**, private file viewer. Nothing you open ever leaves your device —
no upload, no server, no tracking.

## What it does

- Auto-detects the file type and picks the right view
- Shows **raw** (Monaco editor) and a **rendered preview** side by side
- On phones, raw and preview live in separate tabs

## Try it

1. Drop a file onto the page
2. Or paste some Markdown
3. Hover the preview — the matching source line lights up (magic selector)

> Everything here runs client-side. Open DevTools → Network and you'll see
> zero requests leave your machine.

```js
// even code blocks get syntax highlighting in the raw view
console.log("hello, local-first world");
```

[Project goal](#) · trust-first, modular, extensible.
