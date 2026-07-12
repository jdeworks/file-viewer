// File intake — drag/drop, file picker, and clipboard paste.
// Produces a normalized Intake object. Mobile-first: all three paths must work on a phone.

const TEXT_SNIFF_BYTES = 4096;     // how much we decode for textSample / detection
export const FILE_LOAD_FEEDBACK_BYTES = 500 * 1024;
export const LARGE_FILE_BYTES = 8 * 1024 * 1024;  // >8MB: warn before loading into Monaco
const MEDIA_STREAM_BYTES = 8 * 1024 * 1024;       // media bigger than this is streamed, not read into RAM
const MEDIA_HEAD_BYTES = 64 * 1024;               // header slice kept for detection of streamed media
// Hard ceiling on reading a NON-media file fully into memory. Above this we read only a head slice
// and flag `truncated` — so a 10 GB .log/.json/.txt is browsable (first chunk) instead of OOM-ing
// the tab. The File handle is retained for a future "load more" / hex-window over the rest.
const MAX_FULL_READ = 64 * 1024 * 1024;

// Audio/video that the browser can stream straight off disk via a blob: URL — no need to read
// the whole (possibly multi-GB) file into memory. Recognized by extension or MIME.
const MEDIA_EXT = /\.(mp3|wav|m4a|m4b|aac|oga|ogg|opus|flac|weba|mp4|m4v|webm|ogv|mov|mkv)$/i;
function looksLikeMedia(file) {
  return MEDIA_EXT.test(file.name || '') || /^(audio|video)\//.test(file.type || '');
}

export function parserTextFromSource(sourceText) {
  const source = String(sourceText ?? '');
  return source.startsWith('\ufeff') ? source.slice(1) : source;
}

export function sourceTextOf(intake) {
  return intake?.sourceText ?? intake?.text ?? '';
}

// Structured/visual editors consume parser text, so a UTF-8 BOM must not become a visible field
// or document character. When they return edited parser text, retain the current source's BOM
// state. Raw editing remains the one surface where the BOM itself can be added or removed.
export function sourceTextFromParser(intake, parserText) {
  const text = parserTextFromSource(parserText);
  return sourceTextOf(intake).startsWith('\ufeff') ? '\ufeff' + text : text;
}

// Update the editable source without replacing the immutable as-opened bytes/originalText.
// Renderers keep receiving BOM-free `text`; RawView/downloads use exact `sourceText`.
export function withSourceText(intake, sourceText) {
  const source = String(sourceText ?? '');
  const text = parserTextFromSource(source);
  return {
    ...intake,
    sourceText: source,
    text,
    textSample: text.slice(0, TEXT_SNIFF_BYTES),
  };
}

export function withParserText(intake, parserText) {
  return withSourceText(intake, sourceTextFromParser(intake, parserText));
}

// Decode bytes as UTF-8. Returns null if it looks binary. A leading BOM is retained in
// sourceText for exact-source/edit/download fidelity and omitted only from parser-facing text.
function decodeText(bytes) {
  let start = 0;
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) start = 3;
  // Quick binary heuristic: NUL byte in the first sniff window => treat as binary.
  const window = bytes.subarray(start, start + TEXT_SNIFF_BYTES);
  for (let i = 0; i < window.length; i++) {
    if (window[i] === 0) return null;
  }
  try {
    const sourceText = new TextDecoder('utf-8', { fatal: false, ignoreBOM: true }).decode(bytes);
    return { sourceText, text: parserTextFromSource(sourceText) };
  } catch {
    return null;
  }
}

function buildIntake({ filename, mimeType, bytes, isPaste, lastModified, file = null, size, streamed = false, truncated = false }) {
  const decoded = streamed ? null : decodeText(bytes);
  const text = decoded?.text ?? null;
  const sourceText = decoded?.sourceText ?? null;
  return {
    filename: filename || (isPaste ? 'pasted' : 'untitled'),
    mimeType: mimeType || '',
    bytes,                                  // for streamed media this is only a header slice
    text,                                   // null => binary
    sourceText,                             // exact decoded working source (retains a leading BOM)
    originalText: sourceText,               // immutable as-opened decoded baseline
    hadBom: sourceText?.startsWith('\ufeff') || false,
    textSample: text ? text.slice(0, TEXT_SNIFF_BYTES) : '',
    isBinary: text === null,
    isPaste: !!isPaste,
    size: size == null ? bytes.length : size,
    lastModified: lastModified || null,
    file,                                   // original File handle (when from disk) — streamable
    streamed,                               // true => bytes is a header only; use `file` for content
    truncated,                              // true => bytes/text are only the first MAX_FULL_READ; size is the full size
    loadedBytes: bytes.length,              // how many bytes are actually in `bytes` (≤ size when truncated)
  };
}

export async function intakeFromFile(file) {
  // Big media (GB audiobooks/video) must NOT be read into memory. Keep the File handle — the
  // browser streams playback straight off disk via a blob: URL — and read only a small header
  // for type detection. Everything else is read in full as before.
  if (looksLikeMedia(file) && file.size > MEDIA_STREAM_BYTES) {
    const head = new Uint8Array(await file.slice(0, MEDIA_HEAD_BYTES).arrayBuffer());
    return buildIntake({
      filename: file.name, mimeType: file.type, bytes: head, size: file.size,
      file, streamed: true, lastModified: file.lastModified || null,
    });
  }
  // Non-media files above the hard ceiling: read only the head so a multi-GB file can't OOM the
  // tab. The renderer/editor shows the first MAX_FULL_READ and flags it as truncated.
  if (file.size > MAX_FULL_READ) {
    const head = new Uint8Array(await file.slice(0, MAX_FULL_READ).arrayBuffer());
    return buildIntake({
      filename: file.name, mimeType: file.type, bytes: head, size: file.size,
      file, truncated: true, lastModified: file.lastModified || null,
    });
  }
  const buf = new Uint8Array(await file.arrayBuffer());
  return buildIntake({
    filename: file.name, mimeType: file.type, bytes: buf, size: file.size,
    file, lastModified: file.lastModified || null,
  });
}

const nextPaint = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return '';
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(bytes >= 10 * 1048576 ? 0 : 1) + ' MB';
  if (bytes >= 1024) return Math.round(bytes / 1024) + ' KB';
  return bytes + ' B';
}

async function showFileReadStatus(file, onFileStatus) {
  if (!onFileStatus || !file || file.size < FILE_LOAD_FEEDBACK_BYTES) return;
  onFileStatus('Reading ' + (file.name || 'file') + '…', { detail: formatBytes(file.size) });
  await nextPaint();
}

export function intakeFromText(text, filename) {
  const bytes = new TextEncoder().encode(text);
  return buildIntake({ filename, mimeType: 'text/plain', bytes, isPaste: true });
}

// Should this paste be left for a focused input surface instead of becoming a "pasted" file?
// The global window paste handlers turn clipboard text/files into a new viewer tab — but when the
// paste lands in a real editable element (a form field, a <select>, contenteditable, or Monaco's
// hidden textarea) the user means to type INTO that element, not open a file. Hijacking it both
// breaks the field and can leak a secret: e.g. pasting the companion token into the Settings token
// box would otherwise spill it into a plaintext "pasted" viewer file. Walk the event's composed
// path (falling back to the target/activeElement) and bail if any node is an editable surface.
export function pasteTargetIsEditable(e) {
  const path = (typeof e.composedPath === 'function' ? e.composedPath() : null) || [];
  const nodes = path.length ? path : [e.target, document.activeElement];
  return nodes.some((n) => n && n.nodeType === 1 &&
    (n.tagName === 'INPUT' || n.tagName === 'TEXTAREA' || n.tagName === 'SELECT' || n.isContentEditable === true));
}

// Build an intake from raw bytes already in memory (e.g. a single entry extracted from a zip).
// Detection + binary/text sniffing run exactly as for a dropped file.
export function intakeFromBytes(bytes, filename, mimeType = '') {
  return buildIntake({ filename, mimeType, bytes, size: bytes.length });
}

// Recursively read a dropped directory tree into [{ file, path }] using the Entries API.
function readEntries(reader) {
  return new Promise((resolve, reject) => {
    const all = [];
    const next = () => reader.readEntries((batch) => {
      if (!batch.length) return resolve(all);
      all.push(...batch); next();
    }, reject);
    next();
  });
}
async function walkEntry(entry, prefix, out, onProgress) {
  const path = prefix ? prefix + '/' + entry.name : entry.name;
  if (entry.isFile) {
    await new Promise((res) => entry.file((f) => {
      out.push({ file: f, path });
      onProgress?.(out.length);
      res();
    }, () => res()));
  } else if (entry.isDirectory) {
    for (const child of await readEntries(entry.createReader())) await walkEntry(child, path, out, onProgress);
  }
}

// `webkitdirectory` input -> [{ file, path }] using webkitRelativePath.
export function entriesFromFileList(fileList) {
  return [...fileList].map((file) => ({ file, path: file.webkitRelativePath || file.name }));
}

// Walk dropped FileSystemEntry roots into a flat [{ file, path }] list. The roots must be captured
// SYNCHRONOUSLY in the drop handler (the DataTransfer items list is cleared after the event), but
// the entry references themselves stay valid for this async walk — so boot.js can grab them on a
// cold drop and replay the whole tree once the app is ready. Shared with wireIntake's drop handler.
export async function walkEntries(roots, onProgress) {
  const out = [];
  for (const r of roots) await walkEntry(r, '', out, onProgress);
  return out;
}

// Wire intake: single file (picker/drop/paste) -> onIntake; folder (dir picker/drop) -> onFolder.
export function wireIntake({ dropZone, fileInput, folderInput, onIntake, onFolder, onError, onFolderStatus, onFileStatus }) {
  const handleFile = async (file) => {
    try {
      if (!file) return;
      await showFileReadStatus(file, onFileStatus);
      await onIntake(await intakeFromFile(file));
    } catch (err) {
      onError?.(err);
    } finally {
      onFileStatus?.(null);
    }
  };

  fileInput?.addEventListener('change', (e) => handleFile(e.target.files?.[0]));
  folderInput?.addEventListener('change', (e) => {
    onFolderStatus?.('Preparing selected folder…');
    const entries = entriesFromFileList(e.target.files || []);
    if (entries.length) onFolder?.(entries);
    else onFolderStatus?.(null);
  });

  // Shared drop handler — folder if any directory entry, else first file.
  const handleDrop = async (e) => {
    // Capture entries synchronously (the items list is consumed after the event).
    const items = [...(e.dataTransfer?.items || [])];
    const roots = items.map((i) => i.webkitGetAsEntry?.()).filter(Boolean);
    if (roots.some((r) => r.isDirectory) && onFolder) {
      const out = [];
      let lastUpdate = 0;
      onFolderStatus?.('Scanning dropped folder…', { detail: '0 files' });
      const onProgress = (count) => {
        if (count - lastUpdate < 200) return;
        lastUpdate = count;
        onFolderStatus?.('Scanning dropped folder…', { detail: count.toLocaleString() + ' files' });
      };
      const walked = await walkEntries(roots, onProgress);
      out.push(...walked);
      if (out.length) return onFolder(out);
      onFolderStatus?.(null);
    }
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  };

  if (dropZone) {
    ['dragenter', 'dragover'].forEach((ev) =>
      dropZone.addEventListener(ev, (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); }));
    ['dragleave', 'drop'].forEach((ev) =>
      dropZone.addEventListener(ev, (e) => {
        e.preventDefault();
        if (ev === 'dragleave' && e.target !== dropZone) return;
        dropZone.classList.remove('drag-over');
      }));
  }

  // Whole-page drop affordance: when on the empty/intake screen, dragging a file over ANY part
  // of the page lights up the whole page (not just the middle dropzone) so it's obvious the drop
  // works anywhere. Guards: only while the intake screen is shown (a file open → don't take over
  // the page), and only for actual file drags — a tree-to-workspace drag carries
  // text/x-fv-tree-path (not Files), so the side-by-side / compare / tree drop targets are never
  // disturbed.
  const intakeScreen = document.getElementById('intake');
  const isFileDrag = (e) => {
    const types = e.dataTransfer?.types;
    if (!types) return false;
    if (types.includes('text/x-fv-tree-path')) return false;   // tree-to-workspace drag
    return types.includes('Files');
  };
  const onEmptyScreen = () => intakeScreen && !intakeScreen.hidden;
  const setDragging = (on) => document.body.classList.toggle('fv-dragging', on);

  // Global drop: accept a file/folder dropped anywhere, even after one is already open.
  // Tree-to-workspace drags are handled separately (in app.js) and must not be processed here.
  window.addEventListener('dragenter', (e) => {
    if (onEmptyScreen() && isFileDrag(e)) setDragging(true);
  });
  window.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (onEmptyScreen() && isFileDrag(e)) setDragging(true);
  });
  window.addEventListener('dragleave', (e) => {
    // Only when the cursor leaves the window (relatedTarget null) — not when it crosses between
    // child elements, which would fire a spurious dragleave and flicker the affordance off.
    if (!e.relatedTarget) setDragging(false);
  });
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer?.types?.includes('text/x-fv-tree-path')) return;
    handleDrop(e);
  });

  // Paste: prefer a pasted file (image, etc.), else pasted text.
  window.addEventListener('paste', (e) => {
    if (pasteTargetIsEditable(e)) return;   // let a focused input/editor consume it (no "pasted" file)
    const item = [...(e.clipboardData?.items || [])].find((i) => i.kind === 'file');
    if (item) {
      handleFile(item.getAsFile());
      return;
    }
    const text = e.clipboardData?.getData('text');
    if (text && text.trim()) onIntake(intakeFromText(text, 'pasted'));
  });
}
