// File intake — drag/drop, file picker, and clipboard paste.
// Produces a normalized Intake object. Mobile-first: all three paths must work on a phone.

const TEXT_SNIFF_BYTES = 4096;     // how much we decode for textSample / detection
export const LARGE_FILE_BYTES = 8 * 1024 * 1024;  // >8MB: warn before loading into Monaco

// Decode bytes as UTF-8, stripping a BOM if present. Returns null if it looks binary.
function decodeText(bytes) {
  let start = 0;
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) start = 3;
  // Quick binary heuristic: NUL byte in the first sniff window => treat as binary.
  const window = bytes.subarray(start, start + TEXT_SNIFF_BYTES);
  for (let i = 0; i < window.length; i++) {
    if (window[i] === 0) return null;
  }
  try {
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes.subarray(start));
  } catch {
    return null;
  }
}

function buildIntake({ filename, mimeType, bytes, isPaste, lastModified }) {
  const text = decodeText(bytes);
  return {
    filename: filename || (isPaste ? 'pasted' : 'untitled'),
    mimeType: mimeType || '',
    bytes,
    text,                                   // null => binary
    textSample: text ? text.slice(0, TEXT_SNIFF_BYTES) : '',
    isBinary: text === null,
    isPaste: !!isPaste,
    size: bytes.length,
    lastModified: lastModified || null,
  };
}

export async function intakeFromFile(file) {
  const buf = new Uint8Array(await file.arrayBuffer());
  return buildIntake({
    filename: file.name,
    mimeType: file.type,
    bytes: buf,
    lastModified: file.lastModified || null,
  });
}

export function intakeFromText(text, filename) {
  const bytes = new TextEncoder().encode(text);
  return buildIntake({ filename, mimeType: 'text/plain', bytes, isPaste: true });
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
async function walkEntry(entry, prefix, out) {
  const path = prefix ? prefix + '/' + entry.name : entry.name;
  if (entry.isFile) {
    await new Promise((res) => entry.file((f) => { out.push({ file: f, path }); res(); }, () => res()));
  } else if (entry.isDirectory) {
    for (const child of await readEntries(entry.createReader())) await walkEntry(child, path, out);
  }
}

// `webkitdirectory` input -> [{ file, path }] using webkitRelativePath.
export function entriesFromFileList(fileList) {
  return [...fileList].map((file) => ({ file, path: file.webkitRelativePath || file.name }));
}

// Wire intake: single file (picker/drop/paste) -> onIntake; folder (dir picker/drop) -> onFolder.
export function wireIntake({ dropZone, fileInput, folderInput, onIntake, onFolder, onError }) {
  const handleFile = async (file) => {
    try {
      if (!file) return;
      onIntake(await intakeFromFile(file));
    } catch (err) {
      onError?.(err);
    }
  };

  fileInput?.addEventListener('change', (e) => handleFile(e.target.files?.[0]));
  folderInput?.addEventListener('change', (e) => {
    const entries = entriesFromFileList(e.target.files || []);
    if (entries.length) onFolder?.(entries);
  });

  // Shared drop handler — folder if any directory entry, else first file.
  const handleDrop = async (e) => {
    // Capture entries synchronously (the items list is consumed after the event).
    const items = [...(e.dataTransfer?.items || [])];
    const roots = items.map((i) => i.webkitGetAsEntry?.()).filter(Boolean);
    if (roots.some((r) => r.isDirectory) && onFolder) {
      const out = [];
      for (const r of roots) await walkEntry(r, '', out);
      if (out.length) return onFolder(out);
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

  // Global drop: accept a file/folder dropped anywhere, even after one is already open.
  window.addEventListener('dragover', (e) => { e.preventDefault(); });
  window.addEventListener('drop', (e) => { e.preventDefault(); handleDrop(e); });

  // Paste: prefer a pasted file (image, etc.), else pasted text.
  window.addEventListener('paste', (e) => {
    const item = [...(e.clipboardData?.items || [])].find((i) => i.kind === 'file');
    if (item) {
      handleFile(item.getAsFile());
      return;
    }
    const text = e.clipboardData?.getData('text');
    if (text && text.trim()) onIntake(intakeFromText(text, 'pasted'));
  });
}
