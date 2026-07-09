// Missing-aware Merge mode (env/ini): reachability of compare for .env, the Merge mode in the
// side-by-side overlay, per-key categorization, transfer controls, ini section grouping, secret
// masking, and the combined download (real values, preserved order, quoting).
export async function run(ctx) {
  const { page, origin, pass, fail } = ctx;

  await page.goto(origin, { waitUntil: 'load' });
  await page.waitForFunction(() => typeof window.__fv !== 'undefined', { timeout: 10000 });

  const openMergeWith = async (leftText, leftName, rightText, rightName) => {
    await page.evaluate(() => document.querySelector('.sbs-overlay')?.remove());
    await page.evaluate(({ t, n }) => window.__fv.openBlobFile(new Blob([t], { type: 'text/plain' }), n), { t: leftText, n: leftName });
    await page.waitForTimeout(300);
    await page.evaluate(async ({ t, n }) => {
      const { intakeFromText } = await import('/core/intake.js');
      const { openSideBySideWithIntake } = await import('/core/sidebyside.js');
      await openSideBySideWithIntake(intakeFromText(t, n));
    }, { t: rightText, n: rightName });
    await page.waitForSelector('.sbs-overlay', { timeout: 8000 });
    await page.click('.sbs-mode-btn[data-sbs-mode="merge"]');
    await page.waitForSelector('.kv-merge-root', { timeout: 5000 });
  };
  const mergeModel = () => page.evaluate(() =>
    document.querySelector('.sbs-overlay').__sbsMode.mergeApi().model.groups.flatMap((g) => g.rows)
      .map((r) => ({ key: r.key, section: r.section, status: r.status, choice: r.choice, include: r.include })));
  const serialize = () => page.evaluate(() => document.querySelector('.sbs-overlay').__sbsMode.mergeApi().serialize());

  // ── env pair ──
  const LEFT = ['SHARED=common', 'ONLY_LEFT=leftval', 'SPACED=hello world', 'DIFFERING=leftversion', 'PASSWORD=leftsecret', ''].join('\n');
  const RIGHT = ['SHARED=common', 'ONLY_RIGHT=rightval', 'DIFFERING=rightversion', 'PASSWORD=rightsecret', 'API_KEY=supersecretkey', ''].join('\n');

  await page.evaluate((t) => window.__fv.openBlobFile(new Blob([t], { type: 'text/plain' }), 'left.env'), LEFT);
  await page.waitForTimeout(300);
  const info = await page.evaluate(() => ({ id: window.__fv.state.type?.id, compareHidden: document.getElementById('compareBtn').hidden }));
  if (info.id === 'env') pass('left file typed as env'); else fail('left type is ' + info.id);
  if (!info.compareHidden) pass('#compareBtn visible for .env (reachability fix)'); else fail('#compareBtn hidden for .env');

  await openMergeWith(LEFT, 'left.env', RIGHT, 'right.env');
  const hasMerge = await page.$('.sbs-mode-btn[data-sbs-mode="merge"]');
  if (hasMerge) pass('Merge mode button present for env pair'); else fail('no Merge button for env pair');
  const diffDisabled = await page.$eval('.sbs-mode-btn[data-sbs-mode="diff"]', (b) => b.disabled);
  if (diffDisabled) pass('text Diff disabled for env pair (secret-safe)'); else fail('Diff not disabled for env pair');

  const counts = await page.evaluate(() => {
    const q = (c) => document.querySelectorAll('.kv-row-' + c).length;
    return { eq: q('equal'), conflict: q('conflict'), left: q('only-left'), right: q('only-right') };
  });
  if (counts.eq === 1 && counts.conflict === 2 && counts.left === 2 && counts.right === 2) {
    pass('rows categorized: 1 equal, 2 conflict, 2 only-left, 2 only-right');
  } else fail('row counts wrong: ' + JSON.stringify(counts));

  const model = await mergeModel();
  const differing = model.find((r) => r.key === 'DIFFERING');
  if (differing && differing.choice === 'right') pass('conflict defaults to right (picked file)'); else fail('DIFFERING choice=' + differing?.choice);

  // Secrets masked in DOM.
  const dom = await page.$eval('.sbs-overlay', (e) => e.textContent);
  if (!/leftsecret|rightsecret|supersecretkey/.test(dom)) pass('secret values never appear in the overlay DOM'); else fail('a secret value leaked into the DOM');
  const maskedCells = await page.$$eval('.kv-val.masked', (els) => els.length);
  if (maskedCells >= 3) pass('secret cells rendered masked (' + maskedCells + ')'); else fail('too few masked cells: ' + maskedCells);

  // Transfer all missing.
  await page.click('.kv-merge-actions .kv-btn:not(.kv-btn-primary)');
  await page.waitForTimeout(100);
  const allIn = await page.evaluate(() =>
    document.querySelector('.sbs-overlay').__sbsMode.mergeApi().model.groups.flatMap((g) => g.rows)
      .filter((r) => r.status === 'only-right').every((r) => r.include));
  if (allIn) pass('“Transfer all missing” includes every only-right row'); else fail('only-right rows not all included');

  // Combined output: real secret value, preserved order (left then right-only), quoting.
  let out = await serialize();
  const idx = (s) => out.indexOf(s);
  const ordered = idx('SHARED=') < idx('ONLY_LEFT=') && idx('ONLY_LEFT=') < idx('DIFFERING=')
    && idx('DIFFERING=') < idx('ONLY_RIGHT=') && idx('ONLY_RIGHT=') < idx('API_KEY=');
  if (ordered) pass('combined output preserves left order then appends right-only'); else fail('order wrong:\n' + out);
  if (out.includes('PASSWORD=rightsecret')) pass('combined output carries the REAL secret for the chosen side (masked in DOM)'); else fail('real secret missing from output:\n' + out);
  if (out.includes('DIFFERING=rightversion')) pass('conflict resolved to right value in output'); else fail('conflict value wrong in output');
  if (out.includes('SPACED="hello world"')) pass('value with a space is round-trip quoted'); else fail('quoting wrong:\n' + out);

  // Flip a conflict to left, re-serialize.
  await page.evaluate(() => {
    const row = [...document.querySelectorAll('.kv-row-conflict')].find((r) => r.querySelector('.kv-key')?.textContent.startsWith('DIFFERING'));
    row.querySelector('.kv-seg-btn').click();   // first segment = left
  });
  await page.waitForTimeout(80);
  out = await serialize();
  if (out.includes('DIFFERING=leftversion')) pass('flipping a conflict to left updates the output'); else fail('flip-to-left did not take:\n' + out);

  // ── ini pair: section grouping ──
  const INI_LEFT = '[db]\nhost=localhost\nport=5432\n\n[cache]\nttl=60\n';
  const INI_RIGHT = '[db]\nhost=localhost\nport=6432\npassword=sekret\n\n[web]\nlisten=8080\n';
  await openMergeWith(INI_LEFT, 'left.ini', INI_RIGHT, 'right.ini');

  const groups = await page.evaluate(() => [...document.querySelectorAll('.kv-group')].map((g) => ({
    name: g.querySelector('.kv-group-name')?.textContent,
    status: g.querySelector('.kv-group-head .kv-pill')?.textContent,
  })));
  const g = (n) => groups.find((x) => x.name === n);
  if (groups.length === 3 && g('[db]') && g('[cache]') && g('[web]')) pass('ini rendered as 3 section groups'); else fail('ini groups: ' + JSON.stringify(groups));
  if (g('[db]')?.status === 'both' && g('[cache]')?.status === 'left only' && g('[web]')?.status === 'right only') {
    pass('section-level status: db both, cache left-only, web right-only');
  } else fail('section statuses wrong: ' + JSON.stringify(groups));
  if (!/sekret/.test(await page.$eval('.sbs-overlay', (e) => e.textContent))) pass('ini secret (password) masked in DOM'); else fail('ini secret leaked');

  // Transfer the whole right-only [web] section.
  await page.evaluate(() => {
    const web = [...document.querySelectorAll('.kv-group')].find((x) => x.querySelector('.kv-group-name')?.textContent === '[web]');
    web.querySelector('.kv-group-head .kv-btn').click();
  });
  await page.waitForTimeout(80);
  const iniOut = await serialize();
  const okWeb = iniOut.includes('[web]') && iniOut.includes('listen=8080');
  const okOrder = iniOut.indexOf('[db]') < iniOut.indexOf('[cache]') && iniOut.indexOf('[cache]') < iniOut.indexOf('[web]');
  const okConflict = iniOut.includes('port=6432');   // db.port conflict defaults right
  if (okWeb && okOrder) pass('“Transfer whole section” appends [web] after left sections'); else fail('ini section transfer/order wrong:\n' + iniOut);
  if (okConflict) pass('ini in-section conflict (port) defaults to right'); else fail('ini conflict value wrong:\n' + iniOut);

  await page.evaluate(() => document.querySelector('.sbs-overlay')?.remove());
}
