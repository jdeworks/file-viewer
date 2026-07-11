import { bencodeDictionaryEntries, isBencodeDictionary } from './bencode.js';

export const TORRENT_LIMITS = Object.freeze({
  treeDepth: 64,
  treeNodes: 50000,
  inventoryFiles: 200,
});

const encoder = new TextEncoder();
const owns = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const V2_BLOCK_LENGTH = 16384;

const SHA256_INITIAL = new Uint32Array([
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
  0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
]);
const SHA256_CONSTANTS = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rotateRight(value, bits) {
  return (value >>> bits) | (value << (32 - bits));
}

// Piece-layer validation is synchronous because metadata extraction is synchronous. Keeping the
// implementation local also avoids treating an asynchronous WebCrypto result as trusted later.
function sha256(bytes) {
  const bitLength = BigInt(bytes.byteLength) * 8n;
  const paddedLength = Math.ceil((bytes.byteLength + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(bytes);
  padded[bytes.byteLength] = 0x80;
  for (let index = 0; index < 8; index++) {
    padded[paddedLength - 1 - index] = Number((bitLength >> BigInt(index * 8)) & 0xffn);
  }

  const state = new Uint32Array(SHA256_INITIAL);
  const words = new Uint32Array(64);
  const view = new DataView(padded.buffer);
  for (let chunk = 0; chunk < paddedLength; chunk += 64) {
    for (let index = 0; index < 16; index++) words[index] = view.getUint32(chunk + index * 4, false);
    for (let index = 16; index < 64; index++) {
      const previous = words[index - 15];
      const beforePrevious = words[index - 2];
      const sigma0 = rotateRight(previous, 7) ^ rotateRight(previous, 18) ^ (previous >>> 3);
      const sigma1 = rotateRight(beforePrevious, 17) ^ rotateRight(beforePrevious, 19) ^ (beforePrevious >>> 10);
      words[index] = (words[index - 16] + sigma0 + words[index - 7] + sigma1) >>> 0;
    }

    let [a, b, c, d, e, f, g, h] = state;
    for (let index = 0; index < 64; index++) {
      const bigSigma1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const choice = (e & f) ^ (~e & g);
      const temporary1 = (h + bigSigma1 + choice + SHA256_CONSTANTS[index] + words[index]) >>> 0;
      const bigSigma0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temporary2 = (bigSigma0 + majority) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temporary1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temporary1 + temporary2) >>> 0;
    }
    state[0] = (state[0] + a) >>> 0;
    state[1] = (state[1] + b) >>> 0;
    state[2] = (state[2] + c) >>> 0;
    state[3] = (state[3] + d) >>> 0;
    state[4] = (state[4] + e) >>> 0;
    state[5] = (state[5] + f) >>> 0;
    state[6] = (state[6] + g) >>> 0;
    state[7] = (state[7] + h) >>> 0;
  }

  const output = new Uint8Array(32);
  const outputView = new DataView(output.buffer);
  state.forEach((word, index) => outputView.setUint32(index * 4, word, false));
  return output;
}

function boundedLimit(value, fallback) {
  return Number.isSafeInteger(value) && value > 0 ? Math.min(value, fallback) : fallback;
}

function byteStringBytes(value) {
  if (value instanceof Uint8Array) return value;
  if (typeof value === 'string') return encoder.encode(value);
  return null;
}

function byteStringLength(value) {
  return byteStringBytes(value)?.byteLength ?? null;
}

function equalBytes(left, right) {
  if (!left || !right || left.byteLength !== right.byteLength) return false;
  for (let index = 0; index < left.byteLength; index++) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}

function bytesHex(bytes) {
  let output = '';
  for (const byte of bytes) output += byte.toString(16).padStart(2, '0');
  return output;
}

function dictionaryTraversalEntries(value) {
  const entries = bencodeDictionaryEntries(value);
  if (!entries) return Object.keys(value).map((name) => ({ name, value: value[name] }));
  return entries.map((entry) => ({
    // Invalid UTF-8 path elements are valid BEP 52. Give them an unambiguous inert label for the
    // inventory while retaining the original bytes in the decoder's raw entry representation.
    name: entry.text === null ? `[raw:${bytesHex(entry.key)}]` : entry.text,
    value: entry.value,
  }));
}

function safeLength(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function addLength(state, length) {
  if (state.totalSize > Number.MAX_SAFE_INTEGER - length) {
    state.totalSize = Number.MAX_SAFE_INTEGER;
    state.overflow = true;
    return;
  }
  state.totalSize += length;
}

// BEP 52 stores files as a dictionary tree. Keep traversal limits separate from the bencode
// decoder's limits: callers may pass already-decoded objects, and a bounded inventory avoids
// retaining every path merely to render the first few hundred rows.
export function inspectV2FileTree(tree, options = {}) {
  const maxDepth = boundedLimit(options.maxDepth, TORRENT_LIMITS.treeDepth);
  const maxNodes = boundedLimit(options.maxNodes, TORRENT_LIMITS.treeNodes);
  const maxInventoryFiles = boundedLimit(options.maxInventoryFiles, TORRENT_LIMITS.inventoryFiles);
  const state = {
    files: [],
    pieceFiles: [],
    fileCount: 0,
    totalSize: 0,
    malformed: false,
    truncated: false,
    overflow: false,
    nodesVisited: 0,
  };

  if (!isBencodeDictionary(tree)) {
    state.malformed = true;
    return { ...state, inventoryTruncated: false, totalSizeComplete: false };
  }

  const seen = new WeakSet();
  const stack = [{ node: tree, path: [], depth: 0, root: true }];
  while (stack.length) {
    if (state.nodesVisited >= maxNodes) {
      state.truncated = true;
      break;
    }

    const current = stack.pop();
    if (!isBencodeDictionary(current.node)) {
      state.malformed = true;
      continue;
    }
    if (seen.has(current.node)) {
      state.malformed = true;
      continue;
    }
    seen.add(current.node);
    state.nodesVisited++;

    const entries = dictionaryTraversalEntries(current.node);
    const hasFileMarker = owns(current.node, '');
    if (hasFileMarker) {
      const properties = current.node[''];
      const length = isBencodeDictionary(properties) ? properties.length : null;
      const piecesRoot = isBencodeDictionary(properties) ? byteStringBytes(properties['pieces root']) : null;
      const validPiecesRoot = length === 0
        ? isBencodeDictionary(properties) && !owns(properties, 'pieces root')
        : piecesRoot?.byteLength === 32;
      if (current.root || entries.length !== 1 || !safeLength(length) || !validPiecesRoot) {
        state.malformed = true;
      }
      // A file marker makes this node a leaf. Ignore malformed siblings instead of recursively
      // interpreting attacker-controlled data as both a file and a directory.
      if (!current.root && isBencodeDictionary(properties) && safeLength(length)) {
        state.fileCount++;
        addLength(state, length);
        if (length > 0 && piecesRoot?.byteLength === 32) {
          state.pieceFiles.push({ length, piecesRoot });
        }
        if (state.files.length < maxInventoryFiles) {
          state.files.push({ path: current.path.join('/'), length });
        }
      }
      continue;
    }

    if (entries.length === 0) {
      state.malformed = true;
      continue;
    }
    if (current.depth >= maxDepth) {
      state.truncated = true;
      continue;
    }

    for (let index = entries.length - 1; index >= 0; index--) {
      const { name, value: child } = entries[index];
      if (!name || !isBencodeDictionary(child)) {
        state.malformed = true;
        continue;
      }
      stack.push({ node: child, path: [...current.path, name], depth: current.depth + 1, root: false });
    }
  }

  const inventoryTruncated = state.files.length < state.fileCount;
  const totalSizeComplete = !state.truncated && !state.malformed && !state.overflow;
  return { ...state, inventoryTruncated, totalSizeComplete };
}

function hashPair(left, right) {
  const pair = new Uint8Array(64);
  pair.set(left);
  pair.set(right, 32);
  return sha256(pair);
}

function merkleRootFromPieceLayer(layer, pieceLength) {
  const hashCount = layer.byteLength / 32;
  if (!Number.isSafeInteger(hashCount) || hashCount < 1) return null;

  let zeroHash = new Uint8Array(32);
  for (let span = V2_BLOCK_LENGTH; span < pieceLength; span *= 2) {
    zeroHash = hashPair(zeroHash, zeroHash);
  }

  let treeWidth = 1;
  while (treeWidth < hashCount) treeWidth *= 2;
  const levels = [];
  const addHash = (input) => {
    let hash = input;
    let level = 0;
    while (levels[level]) {
      hash = hashPair(levels[level], hash);
      levels[level] = null;
      level++;
    }
    levels[level] = hash;
  };

  for (let index = 0; index < hashCount; index++) {
    addHash(layer.subarray(index * 32, index * 32 + 32));
  }
  for (let index = hashCount; index < treeWidth; index++) addHash(zeroHash);
  return levels[Math.log2(treeWidth)] || null;
}

export function inspectV2PieceLayers(pieceLayers, files, pieceLength) {
  const validPieceLength = Number.isSafeInteger(pieceLength) && pieceLength >= V2_BLOCK_LENGTH
    && (BigInt(pieceLength) & (BigInt(pieceLength) - 1n)) === 0n;
  const requiredFiles = validPieceLength ? files.filter((file) => file.length > pieceLength) : [];
  const result = {
    valid: false,
    requiredFileCount: requiredFiles.length,
    entryCount: 0,
    missing: false,
    malformed: false,
    inconsistent: false,
  };
  if (!validPieceLength) return result;

  if (pieceLayers === undefined) {
    // BEP 52 requires the field itself even when no file is large enough to contribute an entry.
    result.missing = true;
    return result;
  }
  if (!isBencodeDictionary(pieceLayers)) {
    result.malformed = true;
    return result;
  }

  const entries = bencodeDictionaryEntries(pieceLayers);
  // Decoded dictionaries always have raw entries. A caller-created empty dictionary is harmless,
  // but non-empty objects cannot faithfully represent arbitrary BEP 52 byte-string keys.
  if (!entries) {
    result.entryCount = Object.keys(pieceLayers).length;
    result.malformed = result.entryCount > 0;
    result.missing = requiredFiles.length > 0;
    result.valid = !result.malformed && !result.missing;
    return result;
  }
  result.entryCount = entries.length;

  const requiredRoots = new Map();
  for (const file of requiredFiles) {
    const key = bytesHex(file.piecesRoot);
    const pieceCount = Math.ceil(file.length / pieceLength);
    const required = requiredRoots.get(key) || { root: file.piecesRoot, pieceCounts: new Set() };
    required.pieceCounts.add(pieceCount);
    requiredRoots.set(key, required);
  }

  const seenRoots = new Set();
  for (const entry of entries) {
    if (entry.key.byteLength !== 32) {
      result.malformed = true;
      continue;
    }
    const key = bytesHex(entry.key);
    const required = requiredRoots.get(key);
    if (!required || seenRoots.has(key)) {
      result.malformed = true;
      continue;
    }
    seenRoots.add(key);

    const layer = byteStringBytes(entry.value);
    if (!layer || required.pieceCounts.size !== 1) {
      result.malformed = true;
      continue;
    }
    const [pieceCount] = required.pieceCounts;
    if (layer.byteLength !== pieceCount * 32) {
      result.malformed = true;
      continue;
    }
    const computedRoot = merkleRootFromPieceLayer(layer, pieceLength);
    if (!equalBytes(computedRoot, required.root)) result.inconsistent = true;
  }

  result.missing = [...requiredRoots.keys()].some((root) => !seenRoots.has(root));
  result.valid = !result.missing && !result.malformed && !result.inconsistent;
  return result;
}

export function inspectV1Layout(info, options = {}) {
  const maxInventoryFiles = boundedLimit(options.maxInventoryFiles, TORRENT_LIMITS.inventoryFiles);
  const result = {
    files: [],
    fileCount: 0,
    totalSize: 0,
    malformed: false,
    overflow: false,
  };
  if (!isBencodeDictionary(info)) return { ...result, valid: false, inventoryTruncated: false };

  const hasSingle = owns(info, 'length');
  const hasMultiple = owns(info, 'files');
  if (hasSingle === hasMultiple) {
    result.malformed = true;
  } else if (hasSingle) {
    if (safeLength(info.length)) {
      result.fileCount = 1;
      addLength(result, info.length);
    } else {
      result.malformed = true;
    }
  } else if (!Array.isArray(info.files) || info.files.length === 0) {
    result.malformed = true;
  } else {
    for (const file of info.files) {
      const validFile = isBencodeDictionary(file)
        && safeLength(file.length)
        && Array.isArray(file.path)
        && file.path.length > 0
        && file.path.every((part) => typeof part === 'string' && part.length > 0);
      if (!validFile) {
        result.malformed = true;
        continue;
      }
      result.fileCount++;
      addLength(result, file.length);
      if (result.files.length < maxInventoryFiles) {
        result.files.push({ path: file.path.join('/'), length: file.length });
      }
    }
  }

  const pieceLength = info['piece length'];
  const piecesLength = byteStringLength(info.pieces);
  const expectedPieces = Number.isSafeInteger(pieceLength) && pieceLength > 0
    ? Math.ceil(result.totalSize / pieceLength)
    : null;
  const piecesValid = piecesLength !== null && piecesLength % 20 === 0
    && expectedPieces !== null && piecesLength / 20 === expectedPieces;
  const valid = !result.malformed && !result.overflow && piecesValid;
  return {
    ...result,
    valid,
    inventoryTruncated: result.files.length < result.fileCount,
  };
}

export function inspectTorrentInfo(info, pieceLayers) {
  const v1 = inspectV1Layout(info);
  const rawMetaVersion = isBencodeDictionary(info) ? info['meta version'] : null;
  const metaVersion = Number.isSafeInteger(rawMetaVersion) ? rawMetaVersion : null;
  const isV2 = metaVersion === 2;
  const v2 = isV2
    ? inspectV2FileTree(info['file tree'])
    : null;
  const pieceLength = isBencodeDictionary(info) ? info['piece length'] : null;
  const validV2PieceLength = Number.isSafeInteger(pieceLength) && pieceLength >= V2_BLOCK_LENGTH
    && (BigInt(pieceLength) & (BigInt(pieceLength) - 1n)) === 0n;
  const layers = isV2 ? inspectV2PieceLayers(pieceLayers, v2.pieceFiles, pieceLength) : null;
  const validV2 = isV2 && v2.totalSizeComplete && validV2PieceLength && layers.valid;
  const v2Semantics = isV2 ? { ...v2, pieceLayers: layers } : null;
  return {
    metaVersion,
    hasV1: v1.valid,
    hasV2: validV2,
    declaresV2: isV2,
    v1,
    v2: v2Semantics,
    inventory: isV2 ? v2Semantics : v1,
  };
}
