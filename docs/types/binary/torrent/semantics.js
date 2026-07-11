import { isBencodeDictionary } from './bencode.js';

export const TORRENT_LIMITS = Object.freeze({
  treeDepth: 64,
  treeNodes: 50000,
  inventoryFiles: 200,
});

const encoder = new TextEncoder();
const owns = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

function boundedLimit(value, fallback) {
  return Number.isSafeInteger(value) && value > 0 ? Math.min(value, fallback) : fallback;
}

function byteStringLength(value) {
  if (value instanceof Uint8Array) return value.byteLength;
  if (typeof value === 'string') return encoder.encode(value).byteLength;
  return null;
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

    const keys = Object.keys(current.node);
    const hasFileMarker = owns(current.node, '');
    if (hasFileMarker) {
      const properties = current.node[''];
      const length = isBencodeDictionary(properties) ? properties.length : null;
      if (current.root || keys.length !== 1 || !safeLength(length)) {
        state.malformed = true;
      }
      // A file marker makes this node a leaf. Ignore malformed siblings instead of recursively
      // interpreting attacker-controlled data as both a file and a directory.
      if (!current.root && isBencodeDictionary(properties) && safeLength(length)) {
        state.fileCount++;
        addLength(state, length);
        if (state.files.length < maxInventoryFiles) {
          state.files.push({ path: current.path.join('/'), length });
        }
      }
      continue;
    }

    if (keys.length === 0) {
      state.malformed = true;
      continue;
    }
    if (current.depth >= maxDepth) {
      state.truncated = true;
      continue;
    }

    for (let index = keys.length - 1; index >= 0; index--) {
      const name = keys[index];
      const child = current.node[name];
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

export function inspectTorrentInfo(info) {
  const v1 = inspectV1Layout(info);
  const rawMetaVersion = isBencodeDictionary(info) ? info['meta version'] : null;
  const metaVersion = Number.isSafeInteger(rawMetaVersion) ? rawMetaVersion : null;
  const isV2 = metaVersion === 2;
  const v2 = isV2
    ? inspectV2FileTree(info['file tree'])
    : null;
  return {
    metaVersion,
    hasV1: v1.valid,
    hasV2: isV2,
    v1,
    v2,
    inventory: isV2 ? v2 : v1,
  };
}
