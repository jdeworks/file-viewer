#!/usr/bin/env bash
# Vendors runtime libs from node_modules into docs/vendor/.
# Runtime serves docs/vendor/ ONLY — no third-party CDN at runtime (trust requirement).
# Re-run after bumping versions in package.json + npm install.
#
# ⚠️ This is NOT a full rebuild of docs/vendor/. It manages ONLY the per-lib subdirs in MANAGED below.
# ~18 other libs (gifuct, jxl, ruffle, v86, emulatorjs, 3dmol, konva, tiptap, utif, libheif, easymde,
# djvu, snappyjs, cfb, …) were vendored MANUALLY and live in docs/vendor/ — this script must never
# touch them. So it cleans only its OWN subdirs (no blanket `rm -rf docs/vendor`), and MERGES version
# provenance into the hand-curated VERSIONS.json rather than overwriting it. Running this on a clean
# tree must produce NO deletions of tracked files.
set -euo pipefail
cd "$(dirname "$0")/.."

VENDOR=docs/vendor
# Subdirs this script owns. Each is wiped + recreated before its copy block (per-lib clean drops stale
# files), leaving manually-vendored dirs/loose files elsewhere in docs/vendor/ untouched.
MANAGED=(monaco pdfjs dompurify html2canvas markdown-it papaparse xlsx mammoth js-yaml jszip chartjs lottie \
         pptxviewjs sql.js pdf-lib libarchive ffmpeg ag-psd qrcodejs abcjs lamejs tesseract)
for d in "${MANAGED[@]}"; do rm -rf "${VENDOR:?}/$d"; mkdir -p "$VENDOR/$d"; done

# --- Monaco (AMD dist). Drop locale bundles (English is built-in) to save weight. ---
cp -r node_modules/monaco-editor/min/vs "$VENDOR/monaco/vs"
rm -f "$VENDOR/monaco/vs/"nls.messages.*.js

# --- pdf.js (ESM build + worker). Skip sandbox + sourcemaps. ---
cp node_modules/pdfjs-dist/build/pdf.min.mjs        "$VENDOR/pdfjs/pdf.min.mjs"
cp node_modules/pdfjs-dist/build/pdf.worker.min.mjs "$VENDOR/pdfjs/pdf.worker.min.mjs"

# --- DOMPurify (UMD min). ---
cp node_modules/dompurify/dist/purify.min.js "$VENDOR/dompurify/purify.min.js"

# --- html2canvas (preview screenshot, UMD min). Injected into the iframe on demand. ---
mkdir -p "$VENDOR/html2canvas"
cp node_modules/html2canvas/dist/html2canvas.min.js "$VENDOR/html2canvas/html2canvas.min.js"

# --- markdown-it (UMD min). ---
cp node_modules/markdown-it/dist/markdown-it.min.js "$VENDOR/markdown-it/markdown-it.min.js"

# --- PapaParse (CSV parse, UMD min). ---
cp node_modules/papaparse/papaparse.min.js "$VENDOR/papaparse/papaparse.min.js"

# --- SheetJS (Excel/ODS, UMD full min). ---
cp node_modules/xlsx/dist/xlsx.full.min.js "$VENDOR/xlsx/xlsx.full.min.js"

# --- mammoth (DOCX -> HTML, browser min). ---
cp node_modules/mammoth/mammoth.browser.min.js "$VENDOR/mammoth/mammoth.browser.min.js"

# --- js-yaml (YAML parse, UMD min). Loaded only for .yaml/.yml. ---
mkdir -p "$VENDOR/js-yaml"
cp node_modules/js-yaml/dist/js-yaml.min.js "$VENDOR/js-yaml/js-yaml.min.js"

# --- PPTX viewer stack (pptxviewjs + peers JSZip, Chart.js). Loaded only for .pptx. ---
cp node_modules/jszip/dist/jszip.min.js              "$VENDOR/jszip/jszip.min.js"
cp node_modules/chart.js/dist/chart.umd.js           "$VENDOR/chartjs/chart.umd.js"
cp node_modules/pptxviewjs/dist/PptxViewJS.min.js    "$VENDOR/pptxviewjs/PptxViewJS.min.js"

# --- Lottie light (SVG renderer, no expression engine). Loaded only for recognized .json/.lot. ---
cp node_modules/lottie-web/build/player/lottie_light.min.js "$VENDOR/lottie/lottie_light.min.js"
cp node_modules/lottie-web/LICENSE.md                        "$VENDOR/lottie/LICENSE.md"

# --- sql.js (SQLite compiled to WASM). JS loader + wasm binary; loaded only for .db/.sqlite. ---
mkdir -p "$VENDOR/sql.js"
cp node_modules/sql.js/dist/sql-wasm.js   "$VENDOR/sql.js/sql-wasm.js"
cp node_modules/sql.js/dist/sql-wasm.wasm "$VENDOR/sql.js/sql-wasm.wasm"

# --- pdf-lib (PDF writer, UMD min). Loaded only when editing a PDF. ---
mkdir -p "$VENDOR/pdf-lib"
cp node_modules/pdf-lib/dist/pdf-lib.min.js "$VENDOR/pdf-lib/pdf-lib.min.js"

# --- libarchive.js (7z/RAR/tar WASM, ~1 MB). ESM loader + WASM binary + worker bundle.
# Loaded ONLY when Advanced > Archive support is ON and a non-zip archive is opened.
cp node_modules/libarchive.js/dist/libarchive.js      "$VENDOR/libarchive/libarchive.js"
cp node_modules/libarchive.js/dist/libarchive.wasm    "$VENDOR/libarchive/libarchive.wasm"
cp node_modules/libarchive.js/dist/worker-bundle.js   "$VENDOR/libarchive/worker-bundle.js"

# --- ffmpeg.wasm (media transcoding, ~23 MB WASM). UMD wrapper + core-st (single-threaded,
# no SharedArrayBuffer required). Loaded ONLY when Advanced > Enable media transcoding is ON
# and an unsupported format is opened. Marked heavy so the cache-download modal leaves it
# unchecked by default — the service worker will not auto-precache it.
mkdir -p "$VENDOR/ffmpeg"
cp node_modules/@ffmpeg/ffmpeg/dist/ffmpeg.min.js          "$VENDOR/ffmpeg/ffmpeg.min.js"
cp node_modules/@ffmpeg/core-st/dist/ffmpeg-core.js        "$VENDOR/ffmpeg/ffmpeg-core.js"
cp node_modules/@ffmpeg/core-st/dist/ffmpeg-core.wasm      "$VENDOR/ffmpeg/ffmpeg-core.wasm"
cp node_modules/@ffmpeg/core-st/dist/ffmpeg-core.worker.js "$VENDOR/ffmpeg/ffmpeg-core.worker.js"

# --- ag-psd (ORA/PSD layer reader, UMD bundle). Loaded only for .psd/.ora files.
mkdir -p "$VENDOR/ag-psd"
cp node_modules/ag-psd/dist/bundle.js "$VENDOR/ag-psd/ag-psd.bundle.js"

# --- qrcodejs2-fixes (QR code generator, browser UMD). Loaded only for vCard QR buttons.
mkdir -p "$VENDOR/qrcodejs"
cp node_modules/qrcodejs2-fixes/qrcode.js "$VENDOR/qrcodejs/qrcode.js"

# --- abcjs (ABC music notation renderer, browser UMD, ~492 KB). Loaded only for .abc files.
mkdir -p "$VENDOR/abcjs"
cp node_modules/abcjs/dist/abcjs-basic-min.js "$VENDOR/abcjs/abcjs-basic-min.js"

# --- lamejs (offline MP3 encoder, UMD). Loaded only by the Mix export worker.
mkdir -p "$VENDOR/lamejs"
cp node_modules/lamejs/lame.min.js "$VENDOR/lamejs/lame.min.js"
cp node_modules/lamejs/LICENSE "$VENDOR/lamejs/LICENSE"

# --- tesseract.js (OCR, WASM, ~11 MB). UMD lib + worker + self-contained core (SIMD + non-SIMD
# fallback; each .wasm.js embeds its wasm as base64, so no separate .wasm fetch) + English LSTM
# traineddata (gzipped, best_int — matches the default LSTM_ONLY engine). Loaded ONLY when the OCR
# feature is invoked. Marked heavy (gen-asset-manifest FORCE_HEAVY) so the cache modal leaves it
# unchecked. Shared engine: docs/core/ocr/.
mkdir -p "$VENDOR/tesseract"
cp node_modules/tesseract.js/dist/tesseract.min.js                        "$VENDOR/tesseract/tesseract.min.js"
cp node_modules/tesseract.js/dist/worker.min.js                           "$VENDOR/tesseract/worker.min.js"
cp node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js        "$VENDOR/tesseract/tesseract-core-simd-lstm.wasm.js"
cp node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js             "$VENDOR/tesseract/tesseract-core-lstm.wasm.js"
cp node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz  "$VENDOR/tesseract/eng.traineddata.gz"

# Record pinned versions for provenance. VERSIONS.json is hand-curated (it also lists manually-vendored
# libs that aren't devDeps, e.g. 3dmol/ruffle/v86/emulatorjs). MERGE: refresh the version of every key
# already present from package.json devDeps (^/~ stripped); never drop manual entries, never add
# unlisted devDeps. New vendored libs are added to VERSIONS.json by hand once.
node -e "const fs=require('fs');const dev=require('./package.json').devDependencies||{};const f='$VENDOR/VERSIONS.json';let cur={};try{cur=JSON.parse(fs.readFileSync(f,'utf8'))}catch{};const out=Object.keys(cur).length?cur:{...dev};for(const k of Object.keys(out))if(dev[k])out[k]=String(dev[k]).replace(/^[\^~]/,'');fs.writeFileSync(f,JSON.stringify(out,null,2)+'\n')"

echo "Vendored into $VENDOR:"
du -sh "$VENDOR"/* 2>/dev/null || true
