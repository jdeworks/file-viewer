#!/usr/bin/env bash
# Vendors runtime libs from node_modules into docs/vendor/.
# Runtime serves docs/vendor/ ONLY — no third-party CDN at runtime (trust requirement).
# Re-run after bumping versions in package.json + npm install.
set -euo pipefail
cd "$(dirname "$0")/.."

VENDOR=docs/vendor
rm -rf "$VENDOR"
mkdir -p "$VENDOR/monaco" "$VENDOR/pdfjs" "$VENDOR/dompurify" "$VENDOR/markdown-it"

# --- Monaco (AMD dist). Drop locale bundles (English is built-in) to save weight. ---
cp -r node_modules/monaco-editor/min/vs "$VENDOR/monaco/vs"
rm -f "$VENDOR/monaco/vs/"nls.messages.*.js

# --- pdf.js (ESM build + worker). Skip sandbox + sourcemaps. ---
cp node_modules/pdfjs-dist/build/pdf.min.mjs        "$VENDOR/pdfjs/pdf.min.mjs"
cp node_modules/pdfjs-dist/build/pdf.worker.min.mjs "$VENDOR/pdfjs/pdf.worker.min.mjs"

# --- DOMPurify (UMD min). ---
cp node_modules/dompurify/dist/purify.min.js "$VENDOR/dompurify/purify.min.js"

# --- markdown-it (UMD min). ---
cp node_modules/markdown-it/dist/markdown-it.min.js "$VENDOR/markdown-it/markdown-it.min.js"

# Record pinned versions for provenance.
node -e "const p=require('./package.json').devDependencies; require('fs').writeFileSync('$VENDOR/VERSIONS.json', JSON.stringify(p,null,2)+'\n')"

echo "Vendored into $VENDOR:"
du -sh "$VENDOR"/* 2>/dev/null || true
