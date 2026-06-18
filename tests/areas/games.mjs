export async function run(ctx) {
  const { browser, page, origin, pass, fail, consoleErrors, offOrigin } = ctx;

  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    try {
      localStorage.removeItem('fv:games:unlocked');
      localStorage.removeItem('fv:games:metagame:v3');
    } catch {}
  });
  const preOverlay = await page.$('.games-overlay');
  if (!preOverlay) pass('games hub not present before unlock (lazy-loaded)'); else fail('games overlay present before unlock');

  for (const k of ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']) {
    await page.keyboard.press(k);
  }
  await page.waitForSelector('.games-overlay:not([hidden])', { timeout: 8000 });
  pass('Konami code unlocks + opens the arcade hub');

  await page.click('.games-card[data-game="snake"]');
  await page.waitForSelector('.snake-canvas', { timeout: 8000 });
  pass('Snake launches');
  await page.click('.games-back');
  await page.waitForSelector('.games-grid:not([hidden])', { timeout: 4000 });

  await page.click('.games-card[data-game="2048"]');
  await page.waitForSelector('.g2048-board', { timeout: 8000 });
  const g2048BgCells = await page.$$eval('.g2048-bg-cell', (els) => els.length);
  if (g2048BgCells === 16) pass('2048 launches'); else fail('2048 board cells: ' + g2048BgCells);
  await page.click('.games-back');

  await page.click('.games-card[data-game="metagame"]');
  await page.waitForSelector('.mg-v3', { timeout: 8000 });
  await page.waitForSelector('.mg-s1', { timeout: 8000 });
  const freshStageButtons = await page.$$eval('.mg-v3-stage', (buttons) => buttons.map((button) => ({
    stage: button.dataset.stage,
    disabled: button.disabled,
    text: button.textContent,
  })));
  if (freshStageButtons.length === 1 && freshStageButtons[0].stage === '1' && !freshStageButtons[0].disabled) {
    pass('Defragmenter fresh start shows only unlocked Stage 1 navigation');
  } else {
    fail('Defragmenter fresh stage buttons unexpected: ' + JSON.stringify(freshStageButtons));
  }
  const bellInHeader = await page.$eval('.mg-v3-head', (head) => {
    const bell = head.querySelector('.mg-v3-bell .mg-bell-btn');
    const back = head.querySelector('[data-action="exit"]');
    return Boolean(bell && back && bell.compareDocumentPosition(back) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  if (bellInHeader) pass('Defragmenter bell control sits in header before Back to arcade'); else fail('Defragmenter bell control is not in header next to Back to arcade');
  const freshSave = await page.evaluate(() => JSON.parse(localStorage.getItem('fv:games:metagame:v3')));
  if (freshSave?.version === 3 && freshSave.unlockedStages?.includes(1) && freshSave.stageState?.[1]) {
    pass('Defragmenter initializes fresh v3 save with Stage 1');
  } else {
    fail('Defragmenter v3 save invalid: ' + JSON.stringify(freshSave));
  }
  await page.click('.games-back');
  await page.waitForSelector('.games-grid:not([hidden])', { timeout: 4000 });
  await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem('fv:games:metagame:v3'));
    save.stageState[1].bits = { m: 149, e: 0 };
    save.stageState[1].totalBits = { m: 0, e: 0 };
    save.stageState[1].tabsUnlocked = false;
    localStorage.setItem('fv:games:metagame:v3', JSON.stringify(save));
  });
  await page.click('.games-card[data-game="metagame"]');
  await page.waitForSelector('.mg-s1-phase1 .mg-s1-tap', { timeout: 8000 });
  await page.click('.mg-s1-tap', { position: { x: 8, y: 8 } });
  await page.waitForSelector('.mg-s1-tab[data-tab="bits"]', { timeout: 4000 });
  await page.waitForSelector('.mg-s1-earn', { timeout: 4000 });
  const beforeEarnBits = await page.evaluate(() => JSON.parse(localStorage.getItem('fv:games:metagame:v3')).stageState[1].bits.m);
  await page.click('.mg-s1-earn');
  await page.waitForFunction((before) => {
    try {
      return JSON.parse(localStorage.getItem('fv:games:metagame:v3')).stageState[1].bits.m > before;
    } catch { return false; }
  }, beforeEarnBits, { timeout: 4000 });
  pass('Stage 1 tabs unlock leaves a click target that still earns bits');
  await page.click('.games-close');

  await page.evaluate(async () => {
    await window.__fv.openViewerFile('/docs/examples/Overwriter.frag');
  });
  await page.waitForSelector('.monaco-editor', { timeout: 20000 });
  await page.evaluate(() => {
    window.__fv.state.rawview.setValue((window.__fv.state.rawview.getValue() || '').replace(/CHEAT=['"]?true['"]?/i, 'CHEAT=false'));
  });
  await page.waitForFunction(() => {
    try {
      const save = JSON.parse(localStorage.getItem('fv:games:metagame:v3'));
      return Boolean(save.actions?.['1.cheat_disabled']);
    } catch { return false; }
  }, null, { timeout: 5000 });
  pass('Stage 1 raw edit sets canonical 1.cheat_disabled action');

  await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem('fv:games:metagame:v3'));
    save.currentStage = 2;
    save.unlockedStages = [1, 2];
    save.defeated = [1];
    localStorage.setItem('fv:games:metagame:v3', JSON.stringify(save));
    window.__fv.games.open();
  });
  await page.waitForSelector('.games-overlay:not([hidden])', { timeout: 8000 });
  await page.click('.games-card[data-game="metagame"]');
  await page.waitForSelector('.stage2-glyph-dungeon', { timeout: 8000 });
  await page.click('[data-action="boss"]');
  const locked = await page.$eval('[data-field="bossStatus"]', (el) => el.textContent);
  if (/LOCKED/.test(locked)) pass('Stage 2 boss starts locked before search action'); else fail('Stage 2 lock status: ' + locked);

  await page.evaluate(async () => {
    await window.__fv.searchViewerFile('/docs/examples/metagame/stage2/cipher.txt', 'PASSAGE');
  });
  await page.waitForFunction(() => {
    try {
      const save = JSON.parse(localStorage.getItem('fv:games:metagame:v3'));
      return Boolean(save.actions?.['2.search_passage'] && save.achievements?.['stage2.search_passage']);
    } catch { return false; }
  }, null, { timeout: 5000 });
  await page.waitForFunction(() => /UNLOCKED/.test(document.querySelector('[data-field="bossStatus"]')?.textContent || ''), null, { timeout: 5000 });
  pass('Stage 2 search action unlocks boss and achievement');

  await page.click('[data-action="boss"]');
  await page.waitForFunction(() => {
    try {
      const save = JSON.parse(localStorage.getItem('fv:games:metagame:v3'));
      return save.defeated?.includes(2) && save.unlockedStages?.includes(3);
    } catch { return false; }
  }, null, { timeout: 5000 });
  pass('Stage 2 defeat unlocks Stage 3 through v3 orchestrator');

  await page.click('.mg-v3-stage[data-stage="3"]');
  await page.waitForSelector('.stage3-memory-grid', { timeout: 8000 });
  const s3Locked = await page.$eval('[data-field="bossStatus"]', (el) => el.textContent);
  if (/LOCKED/.test(s3Locked) && /missing/.test(s3Locked)) pass('Stage 3 boss starts locked with missing column clues'); else fail('Stage 3 initial status: ' + s3Locked);
  await page.click('[data-action="v1"]');
  await page.waitForFunction(() => window.__fv.state.intake?.filename === 'memory_v1.log', null, { timeout: 5000 });
  const v1Text = await page.evaluate(() => window.__fv.state.intake.text);
  if (v1Text.includes('<sec') && v1Text.includes('ret') && v1Text.includes('key>')) pass('Stage 3 opens generated memory_v1.log through viewer'); else fail('Stage 3 generated v1 text missing key pieces');
  await page.waitForSelector('.stage3-memory-grid', { timeout: 8000 });
  await page.fill('.s3-key', '<secretkey>');
  await page.click('[data-action="restore"]');
  await page.waitForFunction(() => {
    try {
      const save = JSON.parse(localStorage.getItem('fv:games:metagame:v3'));
      return Boolean(save.actions?.['3.diff_key_restored'] && save.achievements?.['stage3.diff_key_restored']);
    } catch { return false; }
  }, null, { timeout: 5000 });
  pass('Stage 3 restoration key sets 3.diff_key_restored and achievement');
  await page.click('[data-action="boss"]');
  await page.waitForFunction(() => {
    try {
      const save = JSON.parse(localStorage.getItem('fv:games:metagame:v3'));
      return save.defeated?.includes(3) && save.unlockedStages?.includes(4);
    } catch { return false; }
  }, null, { timeout: 5000 });
  pass('Stage 3 defeat unlocks Stage 4 through v3 orchestrator');

  await page.waitForSelector('.stage4-fractal-bastion', { timeout: 8000 });
  await page.click('[data-action="blueprint"]');
  await page.waitForFunction(() => window.__fv.state.intake?.filename === 'recursion_points.json', null, { timeout: 5000 });
  await page.waitForFunction(() => {
    try {
      const save = JSON.parse(localStorage.getItem('fv:games:metagame:v3'));
      return Boolean(save.actions?.['4.recursion_blueprint_read'] && save.achievements?.['stage4.recursion_blueprint_read']);
    } catch { return false; }
  }, null, { timeout: 5000 });
  for (let i = 0; i < 3; i += 1) await page.click('[data-action="tower"]');
  await page.click('[data-action="boss"]');
  await page.waitForFunction(() => {
    try {
      const save = JSON.parse(localStorage.getItem('fv:games:metagame:v3'));
      return save.defeated?.includes(4) && save.unlockedStages?.includes(5);
    } catch { return false; }
  }, null, { timeout: 5000 });
  pass('Stage 4 generated blueprint action unlocks and clears Fractal Bastion');

  await page.waitForSelector('.stage5-signal-racer', { timeout: 8000 });
  await page.click('[data-action="audio"]');
  await page.waitForFunction(() => window.__fv.state.intake?.filename === 'transmission_hum.mp3' && window.__fv.state.type.id === 'media', null, { timeout: 5000 });
  await page.click('[data-action="calibrate"]');
  await page.waitForFunction(() => {
    try {
      const save = JSON.parse(localStorage.getItem('fv:games:metagame:v3'));
      return Boolean(save.actions?.['5.counter_wave_calibrated'] && save.achievements?.['stage5.counter_wave_calibrated']);
    } catch { return false; }
  }, null, { timeout: 5000 });
  await page.click('[data-action="boss"]');
  await page.waitForFunction(() => {
    try {
      const save = JSON.parse(localStorage.getItem('fv:games:metagame:v3'));
      return save.defeated?.includes(5) && save.unlockedStages?.includes(6);
    } catch { return false; }
  }, null, { timeout: 5000 });
  pass('Stage 5 calibration action unlocks and clears Signal Racer');

  await page.waitForSelector('.stage6-protocol-codex', { timeout: 8000 });
  await page.click('[data-action="epub"]');
  await page.waitForFunction(() => window.__fv.state.intake?.filename === 'protocols_of_the_entity.epub' && window.__fv.state.type.id === 'epub', null, { timeout: 5000 });
  await page.waitForFunction(() => {
    try {
      const save = JSON.parse(localStorage.getItem('fv:games:metagame:v3'));
      return Boolean(save.actions?.['6.protocol_ch9_read'] && save.achievements?.['stage6.protocol_ch9_read']);
    } catch { return false; }
  }, null, { timeout: 5000 });
  for (const card of ['SYN', 'Signal', 'ACK', 'Signal', 'Signal', 'Signal', 'ACK', 'Signal', 'Signal']) {
    await page.click(`button[data-card="${card}"]`);
  }
  await page.waitForFunction(() => {
    try {
      const save = JSON.parse(localStorage.getItem('fv:games:metagame:v3'));
      return save.defeated?.includes(6) && save.unlockedStages?.includes(7);
    } catch { return false; }
  }, null, { timeout: 5000 });
  pass('Stage 6 codex action unlocks and clears Protocol Codex');

  await page.waitForSelector('.stage7-identity-arbiter', { timeout: 8000 });
  await page.click('[data-action="photo"]');
  await page.waitForFunction(() => window.__fv.state.intake?.filename === 'entity_f_verification.png' && window.__fv.state.type.id === 'image', null, { timeout: 5000 });
  const entitySidecar = await page.evaluate(async () => {
    const response = await fetch('examples/metagame/stage7/entity_metadata.json');
    return response.ok ? response.json() : null;
  });
  if (entitySidecar?.decisiveField === 'GPSInfo' && /outside known layers/.test(entitySidecar?.entities?.F?.GPSInfo || '')) pass('Stage 7 opens real Entity F image with metadata sidecar evidence'); else fail('Stage 7 metadata sidecar missing contradiction');
  await page.waitForFunction(() => {
    try {
      const save = JSON.parse(localStorage.getItem('fv:games:metagame:v3'));
      return Boolean(save.actions?.['7.exif_contradiction_found'] && save.achievements?.['stage7.exif_contradiction_found']);
    } catch { return false; }
  }, null, { timeout: 5000 });
  await page.click('button[data-commit="A"]');
  await page.waitForFunction(() => {
    try {
      const save = JSON.parse(localStorage.getItem('fv:games:metagame:v3'));
      return save.defeated?.includes(7) && save.unlockedStages?.includes(8);
    } catch { return false; }
  }, null, { timeout: 5000 });
  pass('Stage 7 EXIF contradiction unlocks and clears Identity Arbiter');

  await page.waitForSelector('.stage8-entropy-field', { timeout: 8000 });
  await page.click('[data-action="archive"]');
  await page.click('[data-action="archive"]');
  await page.waitForFunction(() => {
    try {
      const save = JSON.parse(localStorage.getItem('fv:games:metagame:v3'));
      return Boolean(save.actions?.['8.salvage_archived'] && save.achievements?.['stage8.salvage_archived']);
    } catch { return false; }
  }, null, { timeout: 5000 });
  await page.click('[data-action="boss"]');
  await page.waitForFunction(() => {
    try {
      const save = JSON.parse(localStorage.getItem('fv:games:metagame:v3'));
      return save.defeated?.includes(8) && save.unlockedStages?.includes(9);
    } catch { return false; }
  }, null, { timeout: 5000 });
  pass('Stage 8 salvage action unlocks and clears Entropy Field');

  await page.waitForSelector('.stage9-observer-state', { timeout: 8000 });
  await page.click('[data-action="notes"]');
  await page.waitForFunction(() => window.__fv.state.intake?.filename === 'service-worker-notes.txt', null, { timeout: 5000 });
  await page.click('[data-action="offline"]');
  await page.waitForFunction(() => {
    try {
      const save = JSON.parse(localStorage.getItem('fv:games:metagame:v3'));
      return Boolean(save.actions?.['9.offline_mode_activated'] && save.achievements?.['stage9.offline_mode_activated']);
    } catch { return false; }
  }, null, { timeout: 5000 });
  await page.click('[data-action="boss"]');
  await page.waitForFunction(() => {
    try {
      const save = JSON.parse(localStorage.getItem('fv:games:metagame:v3'));
      return save.defeated?.includes(9) && save.unlockedStages?.includes(10);
    } catch { return false; }
  }, null, { timeout: 5000 });
  pass('Stage 9 offline action unlocks and clears Observer State');

  await page.waitForSelector('.mg-stage10', { timeout: 8000 });
  const memoryIds = await page.$$eval('[data-resolve-memory]', (buttons) => [...new Set(buttons.map((button) => button.dataset.resolveMemory))]);
  for (const id of memoryIds) await page.click(`[data-resolve-memory="${id}"]`);
  for (const id of memoryIds) await page.click(`[data-integrate-memory="${id}"]`);
  await page.waitForFunction(() => {
    try {
      const save = JSON.parse(localStorage.getItem('fv:games:metagame:v3'));
      return Boolean(save.actions?.['10.memory_resolved'] && save.achievements?.['stage10.memory_resolved'] && save.achievements?.['stage10.full_capstone']);
    } catch { return false; }
  }, null, { timeout: 5000 });
  await page.click('[data-final-choice="continue"]');
  await page.waitForFunction(() => {
    try {
      const save = JSON.parse(localStorage.getItem('fv:games:metagame:v3'));
      return save.defeated?.includes(10) && save.stageState?.[10]?.final?.completed;
    } catch { return false; }
  }, null, { timeout: 5000 });
  const finalOutcome = await page.$eval('[data-field="finalOutcome"]', (el) => el.textContent);
  if (/full capstone/i.test(finalOutcome) && /9 memories resolved, 9 integrated/.test(finalOutcome)) pass('Stage 10 final outcome summarizes the completed route'); else fail('Stage 10 final outcome summary unexpected: ' + finalOutcome);
  pass('Stage 10 resolves, integrates all memories, and completes Awakening');
  await page.click('.games-close');

  const btsOk = await page.evaluate(async () => {
    for (const name of ['glyph_dungeon.bts', 'awakening.bts']) {
      await window.__fv.openViewerFile(`/docs/bts/${name}`);
      if (window.__fv.state.intake.filename !== name || window.__fv.state.type.id !== 'markdown') return false;
    }
    return true;
  });
  if (btsOk) pass('.bts files open through markdown viewer'); else fail('.bts markdown open failed');

  if (consoleErrors.length === 0) pass('no console/page errors'); else fail('console errors:\n  ' + consoleErrors.join('\n  '));
  if (offOrigin.length === 0) pass('ZERO off-origin requests (trust guarantee)'); else fail('off-origin requests:\n  ' + offOrigin.join('\n  '));
}
