// Browser-local recovery cache for text edits. New entries live in IndexedDB so useful-sized
// files are not constrained by localStorage's small string quota; gzip is used when available.
// The old localStorage representation remains readable so upgrades never strand a recovery copy.
import { state, toast } from './state.js';

const PREFIX = 'fv:autosave:';
const DB_NAME = 'file-viewer-autosave';
const DB_VERSION = 1;
const STORE_NAME = 'entries';
const INTERVAL_MS = 5 * 60 * 1000;       // 5 minutes
const MAX_SOURCE_BYTES = 20 * 1024 * 1024;
const MAX_STORED_BYTES = 24 * 1024 * 1024;
const MAX_ENTRIES = 12;
const LEGACY_MAX_BYTES = 2 * 1024 * 1024;
const TTL_MS = 7 * 24 * 60 * 60 * 1000;  // 7 days

let _timer = null;
let _dbPromise = null;
let _savePromise = null;
const _warned = new Set();

function warnOnce(code, message) {
  if (_warned.has(code)) return;
  _warned.add(code);
  toast(message);
}

function tryParse(s) { try { return JSON.parse(s); } catch { return null; } }

function key(filename) {
  return PREFIX + (filename || '').replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120);
}

function openDb() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is unavailable'));
      return;
    }
    let request;
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (error) {
      reject(error);
      return;
    }
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: 'id' });
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    request.onerror = () => reject(request.error || new Error('Could not open autosave storage'));
    request.onblocked = () => reject(new Error('Autosave storage upgrade is blocked'));
  }).catch((error) => {
    _dbPromise = null;
    throw error;
  });
  return _dbPromise;
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Browser storage request failed'));
  });
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error('Browser storage transaction failed'));
    transaction.onabort = () => reject(transaction.error || new Error('Browser storage transaction was aborted'));
  });
}

async function encodeText(text) {
  const bytes = new TextEncoder().encode(text);
  if (typeof CompressionStream !== 'function') {
    return { encoding: 'plain', payload: text, storedBytes: bytes.byteLength, sourceBytes: bytes.byteLength };
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'));
  const payload = await new Response(stream).arrayBuffer();
  return { encoding: 'gzip', payload, storedBytes: payload.byteLength, sourceBytes: bytes.byteLength };
}

async function decodeRecord(record) {
  if (record.encoding !== 'gzip') return typeof record.payload === 'string' ? record.payload : '';
  if (typeof DecompressionStream !== 'function') throw new Error('Gzip decompression is unavailable');
  const stream = new Blob([record.payload]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).text();
}

async function storeRecord(record) {
  const db = await openDb();
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  const done = transactionDone(transaction);
  const store = transaction.objectStore(STORE_NAME);
  const all = await requestResult(store.getAll());
  const now = Date.now();
  const candidates = all
    .filter((entry) => entry.id !== record.id && now - (entry.ts || 0) <= TTL_MS)
    .sort((a, b) => (b.ts || 0) - (a.ts || 0));
  const keep = new Set([record.id]);
  let total = record.storedBytes || 0;
  for (const entry of candidates) {
    const bytes = Number(entry.storedBytes) || 0;
    if (keep.size >= MAX_ENTRIES || total + bytes > MAX_STORED_BYTES) continue;
    keep.add(entry.id);
    total += bytes;
  }
  for (const entry of all) {
    if (!keep.has(entry.id)) store.delete(entry.id);
  }
  store.put(record);
  await done;
}

function readLegacy(filename) {
  try {
    const entry = tryParse(localStorage.getItem(key(filename)));
    if (!entry) return null;
    if (Date.now() - (entry.ts || 0) > TTL_MS) {
      localStorage.removeItem(key(filename));
      return null;
    }
    return entry;
  } catch {
    return null;
  }
}

function saveLegacy(filename, text, sourceBytes) {
  if (sourceBytes > LEGACY_MAX_BYTES) return false;
  try {
    localStorage.setItem(key(filename), JSON.stringify({ text, ts: Date.now(), filename }));
    return true;
  } catch {
    return false;
  }
}

async function saveCurrent() {
  if (!state.rawview || state.intake?.isBinary) return false;
  const text = state.rawview.getValue?.();
  if (typeof text !== 'string') return false;
  const filename = state.intake?.filename || state.intake?.name;
  if (!filename) return false;
  const sourceBytes = new TextEncoder().encode(text).byteLength;
  if (sourceBytes > MAX_SOURCE_BYTES) {
    warnOnce('too-large', 'File too large for browser autosave (>20 MB).');
    return false;
  }
  try {
    const encoded = await encodeText(text);
    await storeRecord({
      id: key(filename),
      filename,
      ts: Date.now(),
      ...encoded,
    });
    // A successful IndexedDB save supersedes any old, quota-heavy localStorage copy.
    try { localStorage.removeItem(key(filename)); } catch { /* storage may be disabled */ }
    return true;
  } catch {
    if (saveLegacy(filename, text, sourceBytes)) {
      warnOnce('limited', 'Browser autosave is using limited storage (files up to 2 MB).');
      return true;
    }
    warnOnce('unavailable', 'Browser autosave unavailable: storage is disabled or full.');
    return false;
  }
}

export function saveNow() {
  if (_savePromise) return _savePromise;
  _savePromise = saveCurrent().finally(() => { _savePromise = null; });
  return _savePromise;
}

export async function clearAutosave(filename) {
  if (!filename) return;
  try { localStorage.removeItem(key(filename)); } catch { /* ignore */ }
  try {
    const db = await openDb();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const done = transactionDone(transaction);
    transaction.objectStore(STORE_NAME).delete(key(filename));
    await done;
  } catch { /* clearing recovery data should never interrupt the editor */ }
}

export async function getAutosave(filename) {
  if (!filename) return null;
  try {
    const db = await openDb();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const done = transactionDone(transaction);
    const record = await requestResult(transaction.objectStore(STORE_NAME).get(key(filename)));
    await done;
    if (record) {
      if (Date.now() - (record.ts || 0) > TTL_MS) {
        void clearAutosave(filename);
        return null;
      }
      return { text: await decodeRecord(record), ts: record.ts, filename: record.filename || filename };
    }
  } catch {
    // A legacy localStorage recovery copy may still be available below.
  }
  return readLegacy(filename);
}

async function pruneOld() {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k?.startsWith(PREFIX)) continue;
      const entry = tryParse(localStorage.getItem(k));
      if (!entry || Date.now() - (entry.ts || 0) > TTL_MS) {
        localStorage.removeItem(k);
        i--;
      }
    }
  } catch { /* private mode or storage error */ }
  try {
    const db = await openDb();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const done = transactionDone(transaction);
    const store = transaction.objectStore(STORE_NAME);
    const all = await requestResult(store.getAll());
    const now = Date.now();
    for (const entry of all) {
      if (now - (entry.ts || 0) > TTL_MS) store.delete(entry.id);
    }
    await done;
  } catch { /* warnings are reserved for an actual save attempt */ }
}

export function startAutosave() {
  stopAutosave();
  void pruneOld();
  _timer = setInterval(() => { void saveNow(); }, INTERVAL_MS);
}

export function stopAutosave() {
  if (_timer) { clearInterval(_timer); _timer = null; }
}
