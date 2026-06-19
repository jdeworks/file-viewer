// In-browser git repository reader. Pure client-side: reads only the small metadata files
// inside .git (HEAD, refs, packed-refs, reflog) and loose commit objects, inflating the
// latter with the NATIVE DecompressionStream — no git binary, no server, no dependency.
//
// Coverage: loose objects (the recent commits of an active repo) are walked first-parent
// from the branch tip. Fully-packed history (.git/objects/pack/*.pack, delta-compressed)
// is not expanded here — we fall back to the reflog, which still lists recent commits.

const dec = new TextDecoder();
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const TEXT_DIFF_LIMIT = 512 * 1024;

// Locate the .git dir from a flat [{file, path}] list. Returns { gitPrefix, repoName } or null.
export function findGitDir(entries) {
  const head = entries.find((e) => e.path === '.git/HEAD' || e.path.endsWith('/.git/HEAD'));
  if (!head) return null;
  const gitPrefix = head.path.slice(0, -'/HEAD'.length);          // "…/.git"
  const repoRoot = gitPrefix.slice(0, -'/.git'.length);           // "…" (may be "")
  const repoName = repoRoot.split('/').filter(Boolean).pop() || 'repository';
  return { gitPrefix, repoName, repoRoot };
}

// True if a path lives inside the repo's .git dir (so we can hide it from the file tree).
export function isGitInternal(path) {
  return path === '.git' || path.startsWith('.git/') || /\/\.git(\/|$)/.test(path);
}

async function inflate(u8) {
  const stream = new Blob([u8]).stream().pipeThrough(new DecompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

// ── Packfile support (Phase 2) ──────────────────────────────────────────────────────────────
// A fully-packed repo stores history in .git/objects/pack/*.pack (delta-compressed), indexed by
// a *.idx file. We parse the v2 index (sha → byte offset), read an object's variable-length
// header at that offset, inflate it, and resolve OFS_DELTA / REF_DELTA chains against their base
// objects. All native (DecompressionStream) — no dependency.

const OBJ_TYPE = { 1: 'commit', 2: 'tree', 3: 'blob', 4: 'tag' };
const hex = (u8) => Array.from(u8, (b) => b.toString(16).padStart(2, '0')).join('');

// Inflate one zlib stream starting at `offset`, stopping once `size` bytes are produced. We
// don't know the compressed length, but jumping by offset (idx / delta base) never needs it.
async function inflateAt(packBytes, offset, size) {
  const stream = new Blob([packBytes.subarray(offset)]).stream().pipeThrough(new DecompressionStream('deflate'));
  const reader = stream.getReader();
  const out = new Uint8Array(size);
  let have = 0;
  try {
    while (have < size) {
      const { done, value } = await reader.read();
      if (done) break;
      const take = Math.min(value.length, size - have);
      out.set(value.subarray(0, take), have);
      have += take;
    }
  } finally { reader.cancel().catch(() => {}); }
  return out;
}

function readVarint(buf, p) { let v = 0, sh = 0, c; do { c = buf[p++]; v += (c & 0x7f) * (2 ** sh); sh += 7; } while (c & 0x80); return [v, p]; }

// Apply a git delta (copy-from-base / insert-literal instructions) to a base buffer.
function applyDelta(base, delta) {
  let p = 0, srcSize, tgtSize;
  [srcSize, p] = readVarint(delta, p);
  [tgtSize, p] = readVarint(delta, p);
  const out = new Uint8Array(tgtSize);
  let o = 0;
  while (p < delta.length) {
    const cmd = delta[p++];
    if (cmd & 0x80) {                                   // copy from base
      let off = 0, len = 0;
      if (cmd & 0x01) off |= delta[p++];
      if (cmd & 0x02) off |= delta[p++] << 8;
      if (cmd & 0x04) off |= delta[p++] << 16;
      if (cmd & 0x08) off |= delta[p++] << 24;
      if (cmd & 0x10) len |= delta[p++];
      if (cmd & 0x20) len |= delta[p++] << 8;
      if (cmd & 0x40) len |= delta[p++] << 16;
      if (len === 0) len = 0x10000;
      out.set(base.subarray(off >>> 0, (off >>> 0) + len), o);
      o += len;
    } else if (cmd) {                                   // insert literal
      out.set(delta.subarray(p, p + cmd), o); o += cmd; p += cmd;
    }
  }
  return out;
}

// Parse a v2 .idx file into a Map(sha40 → pack byte offset).
function parseIdx(buf) {
  if (!(buf[0] === 0xff && buf[1] === 0x74 && buf[2] === 0x4f && buf[3] === 0x63)) return null;   // v2 magic
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const count = view.getUint32(8 + 255 * 4);
  const shaStart = 8 + 256 * 4;
  const offStart = shaStart + count * 24;              // skip 20-byte shas + 4-byte CRCs
  const largeStart = offStart + count * 4;
  const map = new Map();
  for (let i = 0; i < count; i++) {
    const sha = hex(buf.subarray(shaStart + i * 20, shaStart + i * 20 + 20));
    let off = view.getUint32(offStart + i * 4);
    if (off & 0x80000000) off = Number(view.getBigUint64(largeStart + (off & 0x7fffffff) * 8));
    map.set(sha, off);
  }
  return map;
}

function parseIdent(s) {
  const m = s.match(/^(.*?)\s*<(.*?)>\s*(\d+)\s*([+-]\d{4})?/);
  if (!m) return { name: s.trim(), email: '', date: null, tz: '' };
  return { name: m[1].trim(), email: m[2], date: new Date(Number(m[3]) * 1000), tz: m[4] || '' };
}

function parseCommit(sha, content) {
  const sep = content.indexOf('\n\n');
  const header = sep >= 0 ? content.slice(0, sep) : content;
  const message = sep >= 0 ? content.slice(sep + 2) : '';
  const parents = [];
  let tree = null, author = null, committer = null;
  for (const line of header.split('\n')) {
    if (line.startsWith('tree ')) tree = line.slice(5).trim();
    else if (line.startsWith('parent ')) parents.push(line.slice(7).trim());
    else if (line.startsWith('author ')) author = parseIdent(line.slice(7));
    else if (line.startsWith('committer ')) committer = parseIdent(line.slice(10));
  }
  return { sha, tree, parents, author, committer, subject: message.split('\n')[0], message };
}

function parseReflog(txt) {
  const out = [];
  for (const line of txt.split('\n')) {
    const m = line.match(/^([0-9a-f]{40}) ([0-9a-f]{40}) (.*?) <(.*?)> (\d+) ([+-]\d{4})\t(.*)$/);
    if (m) out.push({ from: m[1], to: m[2], name: m[3], email: m[4], date: new Date(Number(m[5]) * 1000), message: m[7] });
  }
  return out.reverse();   // newest first
}

// Open a repository handle from the folder entries. Returns null if no .git was found.
export async function openRepo(entries) {
  const found = findGitDir(entries);
  if (!found) return null;
  const { gitPrefix, repoName, repoRoot } = found;
  const byPath = new Map(entries.map((e) => [e.path, e.file]));
  const rel = (p) => byPath.get(gitPrefix + '/' + p);
  const text = async (p) => { const f = rel(p); return f ? (await f.text()) : null; };

  const headTxt = (await text('HEAD') || '').trim();
  const head = { detached: false, branch: null, sha: null };
  const hm = headTxt.match(/^ref:\s*(.+)$/);
  if (hm) head.branch = hm[1].replace('refs/heads/', '');
  else if (/^[0-9a-f]{40}$/.test(headTxt)) { head.detached = true; head.sha = headTxt; }

  const branches = new Map(), tags = new Map();
  for (const line of (await text('packed-refs') || '').split('\n')) {
    const m = line.match(/^([0-9a-f]{40})\s+refs\/(heads|tags)\/(.+)$/);
    if (m) (m[2] === 'heads' ? branches : tags).set(m[3], m[1]);
  }
  const refRe = new RegExp('^' + escapeRe(gitPrefix) + '/refs/(heads|tags)/(.+)$');
  for (const e of entries) {
    const m = e.path.match(refRe);
    if (!m) continue;
    const sha = (await e.file.text()).trim();
    if (/^[0-9a-f]{40}$/.test(sha)) (m[1] === 'heads' ? branches : tags).set(m[2], sha);
  }
  if (head.branch && branches.has(head.branch)) head.sha = branches.get(head.branch);

  // Keep packfiles lazy: parsing every .idx can be slow on large repos, so do it only if a
  // selected branch/commit is not available as a loose object.
  const packs = [];                          // { idxFile, offsets, file, bytes }
  const shaToPack = new Map();               // sha → pack entry
  const packRe = new RegExp('^' + escapeRe(gitPrefix) + '/objects/pack/(pack-[0-9a-f]+)\\.idx$');
  for (const e of entries) {
    const m = e.path.match(packRe);
    if (!m) continue;
    const packFile = byPath.get(gitPrefix + '/objects/pack/' + m[1] + '.pack');
    if (!packFile) continue;
    packs.push({ idxFile: e.file, offsets: null, file: packFile, bytes: null });
  }
  let packIndexPromise = null;
  async function ensurePackIndexes() {
    if (!packIndexPromise) {
      packIndexPromise = (async () => {
        for (const pack of packs) {
          if (pack.offsets) continue;
          try {
            pack.offsets = parseIdx(new Uint8Array(await pack.idxFile.arrayBuffer()));
            if (!pack.offsets) continue;
            for (const sha of pack.offsets.keys()) shaToPack.set(sha, pack);
          } catch { pack.offsets = null; }
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      })();
    }
    await packIndexPromise;
  }
  const packBytesOf = async (pack) => (pack.bytes ||= new Uint8Array(await pack.file.arrayBuffer()));

  // Read a packed object (resolving OFS_DELTA / REF_DELTA) at a byte offset → { type, data }.
  async function readPackObjectAt(pack, offset) {
    const buf = await packBytesOf(pack);
    let p = offset, c = buf[p++];
    let type = (c >> 4) & 7;
    let size = c & 15, shift = 4;
    while (c & 0x80) { c = buf[p++]; size += (c & 0x7f) * (2 ** shift); shift += 7; }
    if (type === 6) {                                   // OFS_DELTA: base is earlier in this pack
      let c2 = buf[p++], rel = c2 & 0x7f;
      while (c2 & 0x80) { c2 = buf[p++]; rel = ((rel + 1) << 7) | (c2 & 0x7f); }
      const base = await readPackObjectAt(pack, offset - rel);
      return { type: base.type, data: applyDelta(base.data, await inflateAt(buf, p, size)) };
    }
    if (type === 7) {                                   // REF_DELTA: base referenced by sha
      const baseSha = hex(buf.subarray(p, p + 20)); p += 20;
      const base = await readObjectBySha(baseSha);
      if (!base) throw new Error('missing delta base ' + baseSha);
      return { type: base.type, data: applyDelta(base.data, await inflateAt(buf, p, size)) };
    }
    return { type: OBJ_TYPE[type] || String(type), data: await inflateAt(buf, p, size) };
  }

  // Unified object read: try the loose store, then the packs. Returns { type, data } or null.
  const objectCache = new Map();
  async function readObjectByShaUncached(sha) {
    const f = rel('objects/' + sha.slice(0, 2) + '/' + sha.slice(2));
    if (f) {
      try {
        const raw = await inflate(new Uint8Array(await f.arrayBuffer()));
        const nul = raw.indexOf(0);
        const type = dec.decode(raw.subarray(0, nul)).split(' ')[0];
        return { type, data: raw.subarray(nul + 1) };
      } catch { /* fall through to packs */ }
    }
    if (packs.length && !shaToPack.has(sha)) await ensurePackIndexes();
    const pack = shaToPack.get(sha);
    if (pack) { try { return await readPackObjectAt(pack, pack.offsets.get(sha)); } catch { return null; } }
    return null;
  }

  async function readObjectBySha(sha) {
    if (!/^[0-9a-f]{40}$/.test(sha || '')) return null;
    if (!objectCache.has(sha)) objectCache.set(sha, readObjectByShaUncached(sha));
    return objectCache.get(sha);
  }

  const commitCache = new Map();
  async function readCommit(sha) {
    if (!/^[0-9a-f]{40}$/.test(sha || '')) return null;
    if (commitCache.has(sha)) return commitCache.get(sha);
    const promise = readCommitUncached(sha);
    commitCache.set(sha, promise);
    return promise;
  }

  async function readCommitUncached(sha) {
    const obj = await readObjectBySha(sha);
    if (!obj || obj.type !== 'commit') return null;
    return parseCommit(sha, dec.decode(obj.data));
  }

  const treeCache = new Map();
  function parseTree(data) {
    const entries = [];
    let p = 0;
    while (p < data.length) {
      const sp = data.indexOf(0x20, p);
      const nul = data.indexOf(0, sp + 1);
      if (sp < 0 || nul < 0 || nul + 21 > data.length) break;
      const mode = dec.decode(data.subarray(p, sp));
      const name = dec.decode(data.subarray(sp + 1, nul));
      const sha = hex(data.subarray(nul + 1, nul + 21));
      entries.push({ mode, name, sha, tree: mode === '40000' || mode === '040000' });
      p = nul + 21;
    }
    return entries;
  }

  const flatTreeCache = new Map();
  async function flattenTree(treeSha, prefix = '', out = new Map(), limit = 5000) {
    if (!prefix && !out.size) {
      const cacheKey = treeSha + ':' + limit;
      if (flatTreeCache.has(cacheKey)) return flatTreeCache.get(cacheKey);
      const result = await flattenTreeUncached(treeSha, prefix, out, limit);
      flatTreeCache.set(cacheKey, result);
      return result;
    }
    return flattenTreeUncached(treeSha, prefix, out, limit);
  }

  async function flattenTreeUncached(treeSha, prefix = '', out = new Map(), limit = 5000) {
    if (!treeSha || out.size > limit) return out;
    let entries = treeCache.get(treeSha);
    if (!entries) {
      const obj = await readObjectBySha(treeSha);
      if (!obj || obj.type !== 'tree') return out;
      entries = parseTree(obj.data);
      treeCache.set(treeSha, entries);
    }
    for (const entry of entries) {
      const p = prefix ? prefix + '/' + entry.name : entry.name;
      if (entry.tree) await flattenTree(entry.sha, p, out, limit);
      else out.set(p, { sha: entry.sha, mode: entry.mode });
      if (out.size > limit) break;
    }
    return out;
  }

  const changedCache = new Map();
  function lineCount(text) {
    if (!text) return 0;
    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    return lines.length && lines[lines.length - 1] === '' ? lines.length - 1 : lines.length;
  }
  async function blobText(sha) {
    const obj = await readObjectBySha(sha);
    if (!obj || obj.type !== 'blob' || obj.data.length > TEXT_DIFF_LIMIT) return null;
    const text = dec.decode(obj.data);
    return text.includes('\0') ? null : text;
  }
  function lineDelta(beforeText, afterText) {
    if (beforeText == null && afterText == null) return {};
    if (beforeText == null) return { additions: lineCount(afterText), deletions: 0 };
    if (afterText == null) return { additions: 0, deletions: lineCount(beforeText) };
    const before = beforeText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    const after = afterText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    if (before[before.length - 1] === '') before.pop();
    if (after[after.length - 1] === '') after.pop();
    let start = 0;
    while (start < before.length && start < after.length && before[start] === after[start]) start += 1;
    let bEnd = before.length - 1;
    let aEnd = after.length - 1;
    while (bEnd >= start && aEnd >= start && before[bEnd] === after[aEnd]) { bEnd -= 1; aEnd -= 1; }
    return {
      additions: Math.max(0, aEnd - start + 1),
      deletions: Math.max(0, bEnd - start + 1),
    };
  }
  async function withLineDelta(file, beforeEntry, afterEntry) {
    try {
      const beforeText = beforeEntry ? await blobText(beforeEntry.sha) : null;
      const afterText = afterEntry ? await blobText(afterEntry.sha) : null;
      return { ...file, ...lineDelta(beforeText, afterText) };
    } catch {
      return file;
    }
  }
  async function changedFiles(commit, limit = 200) {
    const cacheKey = commit.sha + ':' + limit;
    if (changedCache.has(cacheKey)) return changedCache.get(cacheKey);
    const current = await flattenTree(commit.tree);
    const parent = commit.parents[0] ? await readCommit(commit.parents[0]) : null;
    const before = parent ? await flattenTree(parent.tree) : new Map();
    const files = [];
    for (const [path, now] of current) {
      const old = before.get(path);
      if (!old) files.push(await withLineDelta({ status: 'A', path }, null, now));
      else if (old.sha !== now.sha || old.mode !== now.mode) files.push(await withLineDelta({ status: 'M', path }, old, now));
      if (files.length >= limit) {
        const result = { files, truncated: true };
        changedCache.set(cacheKey, result);
        return result;
      }
    }
    for (const path of before.keys()) {
      if (!current.has(path)) files.push(await withLineDelta({ status: 'D', path }, before.get(path), null));
      if (files.length >= limit) {
        const result = { files, truncated: true };
        changedCache.set(cacheKey, result);
        return result;
      }
    }
    files.sort((a, b) => a.path.localeCompare(b.path) || a.status.localeCompare(b.status));
    const result = { files, truncated: false };
    changedCache.set(cacheKey, result);
    return result;
  }

  // Walk first-parent from a tip SHA across BOTH loose and packed history. `packed` is true only
  // if the chain hit a commit we genuinely couldn't read (truncated/missing object).
  const walkCache = new Map();
  const walkKey = (sha, limit) => sha + ':' + limit;
  function peekWalk(sha, limit = 50) {
    return walkCache.get(walkKey(sha, limit)) || null;
  }
  async function walk(sha, limit = 50) {
    const cacheKey = walkKey(sha, limit);
    if (walkCache.has(cacheKey)) return walkCache.get(cacheKey);
    const commits = [];
    let packed = false;
    const seen = new Set();
    while (sha && commits.length < limit && !seen.has(sha)) {
      seen.add(sha);
      const c = await readCommit(sha);
      if (!c) { packed = true; break; }
      commits.push(c);
      sha = c.parents[0];
    }
    const result = { commits, packed };
    walkCache.set(cacheKey, result);
    return result;
  }

  return {
    repoName, repoRoot, head,
    branches: [...branches].map(([name, sha]) => ({ name, sha, current: name === head.branch }))
      .sort((a, b) => (b.current - a.current) || a.name.localeCompare(b.name)),
    tags: [...tags].map(([name, sha]) => ({ name, sha })),
    reflog: parseReflog(await text('logs/HEAD') || ''),
    readCommit, walk, peekWalk, changedFiles,
  };
}
