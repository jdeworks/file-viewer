import zlib from 'node:zlib';

export async function run(ctx) {
  const { page, origin, pass, fail } = ctx;

  // ── Git repository browser (in-browser .git reader) ──
  {
    const sha = 'b'.repeat(40);
    const treeSha = 'a'.repeat(40);
    const blobSha = 'e'.repeat(40);
    const content = 'tree ' + 'a'.repeat(40) + '\n'
      + 'author Tester <t@example.com> 1700000000 +0000\n'
      + 'committer Tester <t@example.com> 1700000000 +0000\n\n'
      + 'Initial commit\n';
    const store = Buffer.concat([Buffer.from('commit ' + Buffer.byteLength(content) + '\0'), Buffer.from(content)]);
    const obj = Array.from(zlib.deflateSync(store));     // zlib stream (DecompressionStream 'deflate')
    const treeBody = Buffer.concat([Buffer.from('100644 README.md\0'), Buffer.from(blobSha, 'hex')]);
    const treeStore = Buffer.concat([Buffer.from('tree ' + treeBody.length + '\0'), treeBody]);
    const treeObj = Array.from(zlib.deflateSync(treeStore));
    const blobBody = '# Repo\n';
    const blobStore = Buffer.concat([Buffer.from('blob ' + Buffer.byteLength(blobBody) + '\0'), Buffer.from(blobBody)]);
    const blobObj = Array.from(zlib.deflateSync(blobStore));
    await page.goto(origin, { waitUntil: 'networkidle' });
    await page.evaluate(({ sha, treeSha, blobSha, obj, treeObj, blobObj }) => {
      const enc = (s) => new TextEncoder().encode(s);
      const mk = (name, bytes) => ({ file: new File([bytes], name.split('/').pop(), { type: '' }), path: name });
      window.__fv.loadFolder([
        mk('repo/.git/HEAD', enc('ref: refs/heads/main\n')),
        mk('repo/.git/refs/heads/main', enc(sha + '\n')),
        mk('repo/.git/objects/' + sha.slice(0, 2) + '/' + sha.slice(2), new Uint8Array(obj)),
        mk('repo/.git/objects/' + treeSha.slice(0, 2) + '/' + treeSha.slice(2), new Uint8Array(treeObj)),
        mk('repo/.git/objects/' + blobSha.slice(0, 2) + '/' + blobSha.slice(2), new Uint8Array(blobObj)),
        mk('repo/README.md', enc('# Repo')),
      ]);
    }, { sha, treeSha, blobSha, obj, treeObj, blobObj });
    await page.waitForSelector('#repoPanel:not([hidden]) .repo-commit', { timeout: 10000 });
    const branchVal = await page.$eval('#repoPanel .repo-branch', (s) => s.options[s.selectedIndex].textContent);
    if (/main/.test(branchVal)) pass('git: current branch detected (' + branchVal + ')'); else fail('git branch: ' + branchVal);
    const subj = await page.$eval('#repoPanel .repo-commit .rc-subject', (e) => e.textContent);
    if (/Initial commit/.test(subj)) pass('git: loose commit object inflated + listed'); else fail('git subject: ' + subj);
    const detailTxt = await page.$eval('#repoPanel .repo-detail', (e) => e.textContent);
    if (/Tester/.test(detailTxt) && /Initial commit/.test(detailTxt)) pass('git: commit details (author + message)'); else fail('git detail: ' + detailTxt.slice(0, 60));
    await page.waitForSelector('#repoPanel .rc-file-list .rc-path', { timeout: 5000 });
    const changed = await page.$eval('#repoPanel .rc-file-list', (e) => e.textContent);
    if (/A\s*README\.md/.test(changed)) pass('git: commit details include changed files'); else fail('git changed files: ' + changed);
    if (/\+1\s*-0/.test(changed)) pass('git: commit details include line delta counts'); else fail('git changed delta: ' + changed);
    const linkedPath = await page.$eval('#repoPanel .rc-path-link', (e) => e.textContent);
    if (linkedPath === 'README.md') pass('git: changed file is linked when present in folder'); else fail('git link path: ' + linkedPath);
    await page.click('#repoPanel .rc-path-link');
    await page.waitForSelector('#workspace:not([hidden])', { timeout: 5000 });
    const activeGitFile = await page.$eval('#fileTree .ft-file.active', (e) => e.dataset.path);
    if (activeGitFile === 'repo/README.md') pass('git: changed-file link opens file from folder'); else fail('git active after link: ' + activeGitFile);
    await page.click('#repoBtn');
    await page.waitForSelector('#repoPanel:not([hidden]) .repo-commit', { timeout: 5000 });
    const treePaths = await page.$$eval('#fileTree .ft-file', (els) => els.map((e) => e.dataset.path));
    if (!treePaths.some((p) => p.includes('.git/'))) pass('git: .git internals hidden from the file tree'); else fail('.git shown in tree: ' + treePaths.join(','));
    const badge = await page.$('#repoBtn:not([hidden])');
    if (badge) pass('git: repo badge shown in sidebar'); else fail('no repo badge');
  }

  // ── Git Phase 2: packfile reading ── a commit stored only in a .pack/.idx (no loose object).
  {
    const u32 = (n) => { const b = Buffer.alloc(4); b.writeUInt32BE(n >>> 0); return b; };
    const packObjHeader = (type, size) => { const out = []; let b = (type << 4) | (size & 0x0f); size = Math.floor(size / 16); if (size) b |= 0x80; out.push(b); while (size) { let bb = size & 0x7f; size = Math.floor(size / 128); if (size) bb |= 0x80; out.push(bb); } return out; };
    const sha = 'c'.repeat(40);
    const pcontent = 'tree ' + 'a'.repeat(40) + '\n'
      + 'author Tester <t@example.com> 1700000000 +0000\n'
      + 'committer Tester <t@example.com> 1700000000 +0000\n\n'
      + 'Packed commit\n';
    const deflated = zlib.deflateSync(Buffer.from(pcontent));
    const packBuf = Buffer.concat([Buffer.from('PACK'), u32(2), u32(1), Buffer.from(packObjHeader(1, Buffer.byteLength(pcontent))), deflated, Buffer.alloc(20)]);
    const fanout = Buffer.alloc(256 * 4);
    for (let i = 0; i < 256; i++) fanout.writeUInt32BE(i >= 0xcc ? 1 : 0, i * 4);
    const idxBuf = Buffer.concat([Buffer.from([0xff, 0x74, 0x4f, 0x63]), u32(2), fanout, Buffer.alloc(20, 0xcc), u32(0), u32(12), Buffer.alloc(20), Buffer.alloc(20)]);
    const packArr = Array.from(packBuf), idxArr = Array.from(idxBuf);
    await page.goto(origin, { waitUntil: 'networkidle' });
    await page.evaluate(({ sha, packArr, idxArr }) => {
      const enc = (s) => new TextEncoder().encode(s);
      const mk = (name, bytes) => ({ file: new File([bytes], name.split('/').pop(), { type: '' }), path: name });
      const base = 'repo/.git/objects/pack/pack-' + 'c'.repeat(40);
      window.__fv.loadFolder([
        mk('repo/.git/HEAD', enc('ref: refs/heads/main\n')),
        mk('repo/.git/refs/heads/main', enc(sha + '\n')),
        mk(base + '.pack', new Uint8Array(packArr)),
        mk(base + '.idx', new Uint8Array(idxArr)),
        mk('repo/README.md', enc('# Packed repo')),
      ]);
    }, { sha, packArr, idxArr });
    await page.waitForSelector('#repoPanel:not([hidden]) .repo-commit', { timeout: 10000 });
    const packSubj = await page.$eval('#repoPanel .repo-commit .rc-subject', (e) => e.textContent);
    if (/Packed commit/.test(packSubj)) pass('git Phase 2: commit read from packfile (idx + inflate)'); else fail('packed subject: ' + packSubj);
  }

  // ── Git Phase 2: OFS_DELTA resolution ── the HEAD commit is a delta against an earlier object.
  {
    const u32 = (n) => { const b = Buffer.alloc(4); b.writeUInt32BE(n >>> 0); return b; };
    const hdr = (type, size) => { const out = []; let b = (type << 4) | (size & 0x0f); size = Math.floor(size / 16); if (size) b |= 0x80; out.push(b); while (size) { let bb = size & 0x7f; size = Math.floor(size / 128); if (size) bb |= 0x80; out.push(bb); } return out; };
    const varint = (n) => { const b = []; for (;;) { let x = n & 0x7f; n = Math.floor(n / 128); if (n) b.push(x | 0x80); else { b.push(x); break; } } return b; };
    const encodeOfs = (n) => { const b = [n & 0x7f]; n = Math.floor(n / 128) - 1; while (n >= 0) { b.unshift(0x80 | (n & 0x7f)); n = Math.floor(n / 128) - 1; } return b; };

    const baseContent = 'tree ' + 'a'.repeat(40) + '\nauthor T <t@e> 1700000000 +0000\ncommitter T <t@e> 1700000000 +0000\n\nBase commit\n';
    const prefixLen = baseContent.lastIndexOf('Base commit\n');
    const tail = 'Delta-resolved subject\n';
    const targetContent = baseContent.slice(0, prefixLen) + tail;

    const delta = [...varint(baseContent.length), ...varint(targetContent.length)];
    { let size = prefixLen, cmd = 0x80; const sz = []; if (size & 0xff) { cmd |= 0x10; sz.push(size & 0xff); } if ((size >> 8) & 0xff) { cmd |= 0x20; sz.push((size >> 8) & 0xff); } delta.push(cmd, ...sz); }   // copy prefix from base
    { const tb = Buffer.from(tail); delta.push(tb.length, ...tb); }                                                                                                                                                  // insert new tail

    const baseBytes = Buffer.concat([Buffer.from(hdr(1, Buffer.byteLength(baseContent))), zlib.deflateSync(Buffer.from(baseContent))]);
    const deltaBytes = Buffer.concat([Buffer.from(hdr(6, delta.length)), Buffer.from(encodeOfs(baseBytes.length)), zlib.deflateSync(Buffer.from(delta))]);
    const deltaOffset = 12 + baseBytes.length;
    const packBuf = Buffer.concat([Buffer.from('PACK'), u32(2), u32(2), baseBytes, deltaBytes, Buffer.alloc(20)]);
    const fanout = Buffer.alloc(256 * 4);
    for (let i = 0; i < 256; i++) fanout.writeUInt32BE(i >= 0xdd ? 1 : 0, i * 4);
    const idxBuf = Buffer.concat([Buffer.from([0xff, 0x74, 0x4f, 0x63]), u32(2), fanout, Buffer.alloc(20, 0xdd), u32(0), u32(deltaOffset), Buffer.alloc(20), Buffer.alloc(20)]);
    const packArr = Array.from(packBuf), idxArr = Array.from(idxBuf), sha = 'd'.repeat(40);

    await page.goto(origin, { waitUntil: 'networkidle' });
    await page.evaluate(({ sha, packArr, idxArr }) => {
      const enc = (s) => new TextEncoder().encode(s);
      const mk = (name, bytes) => ({ file: new File([bytes], name.split('/').pop(), { type: '' }), path: name });
      const base = 'repo/.git/objects/pack/pack-' + 'd'.repeat(40);
      window.__fv.loadFolder([
        mk('repo/.git/HEAD', enc('ref: refs/heads/main\n')),
        mk('repo/.git/refs/heads/main', enc(sha + '\n')),
        mk(base + '.pack', new Uint8Array(packArr)),
        mk(base + '.idx', new Uint8Array(idxArr)),
        mk('repo/README.md', enc('# Delta repo')),
      ]);
    }, { sha, packArr, idxArr });
    await page.waitForSelector('#repoPanel:not([hidden]) .repo-commit', { timeout: 10000 });
    const deltaSubj = await page.$eval('#repoPanel .repo-commit .rc-subject', (e) => e.textContent);
    if (/Delta-resolved subject/.test(deltaSubj)) pass('git Phase 2: OFS_DELTA resolved against base object'); else fail('delta subject: ' + deltaSubj);
  }

  // ── Git: load-more pagination ── two loose commits; walkLimit=1 so first load returns only HEAD.
  {
    const makeCommitObj = (content) => {
      const store = Buffer.concat([Buffer.from('commit ' + Buffer.byteLength(content) + '\0'), Buffer.from(content)]);
      return Array.from(zlib.deflateSync(store));
    };
    const sha1 = 'f'.repeat(40);  // HEAD — Second commit
    const sha2 = '9'.repeat(40);  // Parent — First commit (root)
    const rootContent = 'tree ' + 'a'.repeat(40) + '\nauthor T <t@e> 1700000100 +0000\ncommitter T <t@e> 1700000100 +0000\n\nRoot commit\n';
    const headContent = 'tree ' + 'a'.repeat(40) + '\nparent ' + sha2 + '\nauthor T <t@e> 1700000200 +0000\ncommitter T <t@e> 1700000200 +0000\n\nSecond commit\n';
    const rootObj = makeCommitObj(rootContent);
    const headObj = makeCommitObj(headContent);

    await page.goto(origin, { waitUntil: 'networkidle' });
    await page.evaluate(({ sha1, sha2, headObj, rootObj }) => {
      const enc = (s) => new TextEncoder().encode(s);
      const mk = (name, bytes) => ({ file: new File([bytes], name.split('/').pop(), { type: '' }), path: name });
      window.__fv.loadFolder([
        mk('repo/.git/HEAD', enc('ref: refs/heads/main\n')),
        mk('repo/.git/refs/heads/main', enc(sha1 + '\n')),
        mk('repo/.git/objects/' + sha1.slice(0, 2) + '/' + sha1.slice(2), new Uint8Array(headObj)),
        mk('repo/.git/objects/' + sha2.slice(0, 2) + '/' + sha2.slice(2), new Uint8Array(rootObj)),
        mk('repo/README.md', enc('# Repo')),
      ], { repoWalkLimit: 1 });
    }, { sha1, sha2, headObj, rootObj });
    await page.waitForSelector('#repoPanel:not([hidden]) .repo-commit', { timeout: 10000 });

    const commitCountBefore = await page.$$eval('#repoPanel .repo-commit', (els) => els.length);
    const loadMoreVisible = await page.$('#repoPanel .repo-load-more') !== null;
    if (commitCountBefore === 1 && loadMoreVisible) {
      pass('git load-more: only HEAD commit shown initially, load-more button present');
    } else {
      fail('git load-more initial state: commits=' + commitCountBefore + ' loadMoreVisible=' + loadMoreVisible);
    }

    await page.click('#repoPanel .repo-load-more');
    await page.waitForFunction(() => document.querySelectorAll('#repoPanel .repo-commit').length >= 2, null, { timeout: 5000 });
    const commitCountAfter = await page.$$eval('#repoPanel .repo-commit', (els) => els.length);
    const loadMoreGone = await page.$('#repoPanel .repo-load-more') === null;
    const subjects = await page.$$eval('#repoPanel .repo-commit .rc-subject', (els) => els.map((e) => e.textContent));
    if (commitCountAfter === 2 && loadMoreGone && subjects[0] === 'Second commit' && subjects[1] === 'Root commit') {
      pass('git load-more: second page loads, button removed, commits in order');
    } else {
      fail('git load-more after click: commits=' + commitCountAfter + ' gone=' + loadMoreGone + ' subjects=' + subjects.join('|'));
    }
  }
}
