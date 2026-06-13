// In-browser git repository reader. Pure client-side: reads only the small metadata files
// inside .git (HEAD, refs, packed-refs, reflog) and loose commit objects, inflating the
// latter with the NATIVE DecompressionStream — no git binary, no server, no dependency.
//
// Coverage: loose objects (the recent commits of an active repo) are walked first-parent
// from the branch tip. Fully-packed history (.git/objects/pack/*.pack, delta-compressed)
// is not expanded here — we fall back to the reflog, which still lists recent commits.

const dec = new TextDecoder();
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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
  const { gitPrefix, repoName } = found;
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

  async function readCommit(sha) {
    const f = rel('objects/' + sha.slice(0, 2) + '/' + sha.slice(2));
    if (!f) return null;
    try {
      const raw = await inflate(new Uint8Array(await f.arrayBuffer()));
      const nul = raw.indexOf(0);
      if (dec.decode(raw.subarray(0, nul)).split(' ')[0] !== 'commit') return null;
      return parseCommit(sha, dec.decode(raw.subarray(nul + 1)));
    } catch { return null; }
  }

  // Walk first-parent from a tip SHA, reading loose objects. Stops (packed=true) when an
  // object is missing — that's where the packed history begins.
  async function walk(sha, limit = 50) {
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
    return { commits, packed };
  }

  return {
    repoName, head,
    branches: [...branches].map(([name, sha]) => ({ name, sha, current: name === head.branch }))
      .sort((a, b) => (b.current - a.current) || a.name.localeCompare(b.name)),
    tags: [...tags].map(([name, sha]) => ({ name, sha })),
    reflog: parseReflog(await text('logs/HEAD') || ''),
    readCommit, walk,
  };
}
