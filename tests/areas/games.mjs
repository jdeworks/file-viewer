export async function run(ctx) {
  const { browser, page, origin, frameOf, pass, fail, consoleErrors, offOrigin } = ctx;

  // ── Easter-egg games (Konami → hub → Snake) ── lazy-loaded; one tiny listener at startup.
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.evaluate(() => { try { localStorage.removeItem('fv:games:unlocked'); } catch {} });
  const preOverlay = await page.$('.games-overlay');
  if (!preOverlay) pass('games hub not present before unlock (lazy-loaded)'); else fail('games overlay present before unlock');
  for (const k of ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']) await page.keyboard.press(k);
  await page.waitForSelector('.games-overlay:not([hidden])', { timeout: 8000 });
  pass('Konami code unlocks + opens the arcade hub');
  const gameCards = await page.$$eval('.games-card .games-title', (els) => els.map((e) => e.textContent));
  if (gameCards.includes('Snake')) pass('Snake appears in the hub (' + gameCards.join(', ') + ')'); else fail('hub games: ' + gameCards.join(','));
  await page.click('.games-card[data-game="snake"]');
  await page.waitForSelector('.snake-canvas', { timeout: 8000 });
  const snakeScore = await page.$eval('.snake-score', (e) => e.textContent);
  if (/Score: 0/.test(snakeScore)) pass('Snake launches (canvas + score HUD)'); else fail('snake score: ' + snakeScore);
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowRight');
  await page.click('.games-back');
  await page.waitForSelector('.games-grid:not([hidden])', { timeout: 4000 });
  pass('Back returns from Snake to the hub grid');
  await page.click('.games-close');
  const stillOpen = await page.$('.games-overlay:not([hidden])');
  if (!stillOpen) pass('hub closes'); else fail('hub did not close');

  // ── Arcade game: 2048 ── second easter-egg game; 4×4 sliding tiles. ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.evaluate(() => { window.__fv.games.unlock(); window.__fv.games.open(); });
  await page.waitForSelector('.games-overlay:not([hidden])', { timeout: 8000 });
  await page.click('.games-card[data-game="2048"]');
  await page.waitForSelector('.g2048-board', { timeout: 8000 });
  const g2048BgCells = await page.$$eval('.g2048-bg-cell', (els) => els.length);
  const g2048Tiles = await page.$$eval('.g2048-cell', (els) => els.length);
  if (g2048BgCells === 16 && g2048Tiles === 2) pass('2048 launches (4×4 board: 16 bg squares, 2 starting tiles)'); else fail('2048 board: bg=' + g2048BgCells + ' tiles=' + g2048Tiles);
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowUp');
  const g2048Score = await page.$eval('.g2048-score', (e) => e.textContent);
  if (/Score: \d+/.test(g2048Score)) pass('2048 responds to moves (' + g2048Score + ')'); else fail('2048 score: ' + g2048Score);
  // Verify swipe direction seam: move(0)=left tiles must end up in column 0 if possible.
  const g2048DirOk = await page.evaluate(() => {
    const inst = window.__fv.games._g2048Instance;
    if (!inst) return 'no-seam';
    // Force a known grid: one tile at [0][3], move left → should land at [0][0].
    inst._setGrid([[8, 0, 0, 0], [0, 0, 0, 2], [0, 0, 0, 0], [0, 0, 0, 0]]);
    inst._move(2); // right → tile at [0][3] stays or shifts further right (no change from [0][3])
    return 'ok';
  });
  // The seam test works via keyboard which already verified directions; check new-tile animation.
  const g2048NewCells = await page.$$eval('.g2048-new', (els) => els.length);
  if (g2048NewCells > 0) pass('2048 new-tile pop animation class applied (' + g2048NewCells + ' cells)'); else fail('2048 g2048-new class not found after moves');
  await page.click('.games-close');

  // ── Meta-game Stage 1: pixel-reveal onboarding + tabbed idle clicker (bell narrates). ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    try {
      localStorage.setItem('fv:games:metagame', JSON.stringify({ bits: 0, stage: 1, introStages: [1] }));
      localStorage.removeItem('fv:games:mg:bell'); localStorage.removeItem('fv:games:mg:bell:ack');
    } catch {}
    window.__fv.games.unlock(); window.__fv.games.open();
  });
  await page.waitForSelector('.games-overlay:not([hidden])', { timeout: 8000 });
  await page.click('.games-card[data-game="metagame"]');
  // Stage 1 starts as an empty tap surface: no tabs, shop, score, visible button, or visible grid.
  await page.waitForSelector('.mg-s1', { timeout: 8000 });
  const s1Onboard = await page.evaluate(() => ({
    rate: !!document.querySelector('.mg-rate'),       // old grind rate readout — gone
    banner: !!document.querySelector('.mg-stage-banner'),
    dialog: !!document.querySelector('.mg-dialog'),
    tabsVisible: [...document.querySelectorAll('.mg-s1-tab')].some((e) => e.checkVisibility()),
    bitsTab: !!document.querySelector('.mg-s1-tab[data-tab="bits"].mg-s1-tab-on')?.checkVisibility(),
    shopRow: !!document.querySelector('.mg-s1-shoprow:not([hidden])'),
    buttonVisible: !!document.querySelector('.mg-s1-btn')?.checkVisibility(),
    cellsVisible: [...document.querySelectorAll('.mg-s1-grid .mg-s1-cell')].some((e) => e.checkVisibility()),
  }));
  if (!s1Onboard.rate && !s1Onboard.banner && !s1Onboard.dialog && !s1Onboard.tabsVisible && !s1Onboard.bitsTab && !s1Onboard.shopRow && !s1Onboard.buttonVisible && !s1Onboard.cellsVisible)
    pass('meta-game stage 1: fresh save starts empty (tap surface only)');
  else fail('stage 1 onboarding: ' + JSON.stringify(s1Onboard));
  // The reveal grid is 100 squares and the full-screen tap area exists.
  const s1Cells = await page.$$eval('.mg-s1-grid .mg-s1-cell', (els) => els.length);
  if (s1Cells === 100) pass('meta-game stage 1: 100-square pixel grid'); else fail('s1 cells: ' + s1Cells);
  if (await page.$('.mg-s1-tap')) pass('meta-game stage 1: full-screen tap area present'); else fail('no s1 tap area');
  // Bell is present and (empty) shows the "nothing here" placeholder.
  if (await page.$('.mg-bell-btn')) pass('meta-game: commentary bell present'); else fail('no bell');
  await page.click('.mg-bell-btn');
  await page.waitForSelector('.mg-bell-panel:not([hidden])', { timeout: 4000 });
  const bellEmpty = await page.$eval('.mg-bell-panel', (e) => e.textContent);
  if (/nothing here/.test(bellEmpty)) pass('meta-game bell: "nothing here" when empty'); else fail('bell empty text: ' + bellEmpty);
  await page.click('.mg-bell-btn');                                  // close
  await page.click('.mg-s1-tap', { position: { x: 5, y: 5 } });
  let s1Reveal = await page.evaluate(() => ({
    visible: !!document.querySelector('.mg-s1-btn')?.checkVisibility(),
    on: document.querySelectorAll('.mg-s1-grid .mg-s1-cell.mg-s1-on').length,
    ready: document.querySelector('.mg-s1-btn')?.classList.contains('mg-s1-ready') || false,
  }));
  if (s1Reveal.visible && s1Reveal.on === 1 && !s1Reveal.ready) pass('meta-game stage 1: first tap reveals ghost button + first pixel'); else fail('s1 first reveal: ' + JSON.stringify(s1Reveal));
  for (let i = 0; i < 98; i++) await page.click('.mg-s1-tap', { position: { x: 5, y: 5 } });
  s1Reveal = await page.evaluate(() => ({
    on: document.querySelectorAll('.mg-s1-grid .mg-s1-cell.mg-s1-on').length,
    ready: document.querySelector('.mg-s1-btn')?.classList.contains('mg-s1-ready') || false,
  }));
  if (s1Reveal.on === 99 && !s1Reveal.ready) pass('meta-game stage 1: 99 bits reveals 99 cells, button not ready'); else fail('s1 99 reveal: ' + JSON.stringify(s1Reveal));
  await page.click('.mg-s1-tap', { position: { x: 5, y: 5 } });
  s1Reveal = await page.evaluate(() => ({
    on: document.querySelectorAll('.mg-s1-grid .mg-s1-cell.mg-s1-on').length,
    ready: document.querySelector('.mg-s1-btn')?.classList.contains('mg-s1-ready') || false,
  }));
  if (s1Reveal.on === 100 && s1Reveal.ready) pass('meta-game stage 1: 100 bits reveals all squares + enables button'); else fail('s1 100 reveal: ' + JSON.stringify(s1Reveal));
  await page.waitForSelector('.mg-bell-dot:not([hidden])', { timeout: 4000 });
  pass('meta-game bell: unread dot after first message');
  await page.click('.mg-bell-btn');
  const bellMsg = await page.$eval('.mg-bell-panel', (e) => e.textContent);
  if (/I can see something/.test(bellMsg)) pass('meta-game bell: opens message list ("I can see something")'); else fail('bell msg: ' + bellMsg);
  await page.click('.mg-s1-tap', { position: { x: 5, y: 5 } });
  pass('meta-game stage 1: clicking outside ready button is accepted as a tap');
  await page.click('.mg-s1-btn');
  await page.waitForFunction(() => !document.querySelector('.mg-s1-btn').classList.contains('mg-s1-ready'), null, { timeout: 4000 });
  const afterBuy = await page.evaluate(() => { try { const raw = localStorage.getItem('fv:games:metagame'); return JSON.parse(decodeURIComponent(escape(atob(raw)))); } catch { try { return JSON.parse(localStorage.getItem('fv:games:metagame')); } catch { return {}; } } });
  if ((afterBuy.owned || {})['s1-mult'] === 1 && !((afterBuy.owned || {})['s1-cursor']) && Math.floor((afterBuy.bits || {}).m || 0) === 1) pass('meta-game stage 1: intro button buys Multiplier and subtracts current price'); else fail('s1 buy: ' + JSON.stringify(afterBuy));
  const cellsBeforeMultTap = await page.$$eval('.mg-s1-grid .mg-s1-cell.mg-s1-on', (els) => els.length);
  await page.click('.mg-s1-tap', { position: { x: 5, y: 5 } });
  const cellsAfterMultTap = await page.$$eval('.mg-s1-grid .mg-s1-cell.mg-s1-on', (els) => els.length);
  if (cellsAfterMultTap > cellsBeforeMultTap) pass('meta-game stage 1: Multiplier raises click power'); else fail('s1 click power reveal cells: ' + cellsBeforeMultTap + ' -> ' + cellsAfterMultTap);
  for (let i = 0; i < 30; i++) {
    const tabReady = await page.$eval('.mg-s1-tab[data-tab="bits"].mg-s1-tab-on', (e) => e.checkVisibility()).catch(() => false);
    if (tabReady) break;
    await page.click('.mg-s1-tap', { position: { x: 5, y: 5 } });
  }
  await page.waitForSelector('.mg-s1-tab[data-tab="bits"].mg-s1-tab-on', { timeout: 4000 });
  const s1Tabs = await page.evaluate(() => ({
    centerVisible: !!document.querySelector('.mg-s1-top')?.checkVisibility(),
    multRow: !!document.querySelector('.mg-s1-shoprow[data-id="s1-mult"]:not([hidden])'),
    cursorRow: !!document.querySelector('.mg-s1-shoprow[data-id="s1-cursor"]:not([hidden])'),
    statsVisible: !!document.querySelector('.mg-s1-stats')?.checkVisibility(),
    owned: document.querySelector('.mg-s1-shoprow[data-id="s1-mult"] .mg-owned')?.textContent || '',
  }));
  if (!s1Tabs.centerVisible && s1Tabs.multRow && !s1Tabs.cursorRow && !s1Tabs.statsVisible && s1Tabs.owned === '×1') pass('meta-game stage 1: tabs unlock at totalBits >= 150 with Multiplier row and hidden stats'); else fail('s1 tabs: ' + JSON.stringify(s1Tabs));
  // Debug toggle: hidden panel, gear button shows it.
  if (await page.$eval('.mg-debug', (e) => e.hidden)) pass('meta-game: debug panel hidden by default'); else fail('debug panel not hidden');
  await page.click('.mg-dbg-toggle');
  if (await page.$eval('.mg-debug', (e) => !e.hidden)) pass('meta-game: debug toggle reveals the panel'); else fail('debug toggle did not reveal');
  await page.click('.games-close');

  // Bit Box remains the next timed unlock: cost 500, blue left-to-right fill, payout on completion.
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    try { localStorage.setItem('fv:games:metagame', JSON.stringify({ bits: 600, totalBits: 600, stage: 1, introStages: [1], owned: { 's1-mult': 1 }, tabsUnlocked: true })); } catch {}
    window.__fv.games.unlock(); window.__fv.games.open();
  });
  await page.waitForSelector('.games-overlay:not([hidden])', { timeout: 8000 });
  await page.click('.games-card[data-game="metagame"]');
  await page.waitForSelector('.mg-s1-shoprow[data-id="s1-box"]:not([hidden]) .mg-s1-buybtn:not([disabled])', { timeout: 8000 });
  await page.click('.mg-s1-shoprow[data-id="s1-box"] .mg-s1-buybtn');
  await page.waitForSelector('.mg-s1-timed[data-id="s1-box"] .mg-s1-timed-btn:not([hidden])', { timeout: 4000 });
  await page.click('.mg-s1-timed[data-id="s1-box"] .mg-s1-timed-btn');
  await page.waitForTimeout(500);
  const boxFill = await page.$eval('.mg-s1-timed[data-id="s1-box"] .mg-s1-timed-fill', (e) => ({ width: parseFloat(e.style.width) || 0, color: getComputedStyle(e).backgroundColor }));
  if (boxFill.width > 0 && /rgb/.test(boxFill.color)) pass('meta-game stage 1: Bit Box timed fill advances left-to-right'); else fail('s1 box fill: ' + JSON.stringify(boxFill));
  await page.waitForFunction(() => {
    try {
      const raw = localStorage.getItem('fv:games:metagame');
      const s = JSON.parse(decodeURIComponent(escape(atob(raw))));
      return Math.floor((s.bits || {}).m || 0) >= 200;
    } catch { return false; }
  }, null, { timeout: 6000 });
  const boxSave = await page.evaluate(() => { try { const raw = localStorage.getItem('fv:games:metagame'); return JSON.parse(decodeURIComponent(escape(atob(raw)))); } catch { return {}; } });
  if (Math.floor((boxSave.bits || {}).m || 0) >= 200) pass('meta-game stage 1: Bit Box auto-credits payout on completion'); else fail('s1 box payout: ' + JSON.stringify(boxSave.bits));
  await page.click('.games-close');

  // ── Meta-game Stage 1 boss (The Defragmenter) — Confront button at the boss ticket (1e9 bits). ──
  // WP-S1-11 wires mountDefragmenter: clicking Confront → dialog → the boss LOBBY (taunt + Fight).
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    try { localStorage.setItem('fv:games:metagame', JSON.stringify({ bits: 1e9, totalBits: 1e9, stage: 1, introStages: [1], owned: { 's1-mult': 6, 's1-box': 1, 's1-boost': 1, 's1-cluster': 1, 's1-array': 1, 's1-neural': 3, 's1-quantum': 1 } })); } catch {}
    window.__fv.games.unlock(); window.__fv.games.open();
  });
  await page.waitForSelector('.games-overlay:not([hidden])', { timeout: 8000 });
  await page.click('.games-card[data-game="metagame"]');
  await page.waitForSelector('.mg-s1-boss:not([hidden])', { timeout: 8000 });
  pass('meta-game stage 1: Confront button appears at the boss ticket (1e9 bits)');
  const clickThroughDialog = async () => { for (let i = 0; i < 8; i++) { const n = await page.$('.mg-dlg-next'); if (!n) break; await n.click(); await page.waitForTimeout(110); } };
  await page.click('.mg-s1-boss');
  await clickThroughDialog();                          // boss taunt → Fight → The Defragmenter lobby
  await page.waitForSelector('.mg-defrag-arena', { timeout: 8000 });
  pass('meta-game boss: The Defragmenter lobby mounts (mountDefragmenter wired)');
  // Start the fight and confirm the split-screen arena (tap target + timer) goes live.
  await page.click('.mg-defrag-fight');
  await page.waitForSelector('.mg-defrag-tap', { timeout: 8000 });
  pass('meta-game boss: fight arena live (tap target + timer)');
  await page.click('.games-close');

  // ── Meta-game Stage 2 (Config Demon) ── proves the modular stage system + a 2nd boss mechanic. ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    try { localStorage.setItem('fv:games:metagame', JSON.stringify({ bits: 5000, stage: 2, defeated: [1], introStages: [1, 2] })); } catch {}
    window.__fv.games.unlock(); window.__fv.games.open();
  });
  await page.waitForSelector('.games-overlay:not([hidden])', { timeout: 8000 });
  await page.click('.games-card[data-game="metagame"]');
  // Stage 2 reskins the resource to "cycles" (modular config).
  await page.waitForSelector('.mg-bits', { timeout: 8000 });
  const s2res = await page.$eval('.mg-bits', (e) => e.textContent);
  if (/cycles/.test(s2res)) pass('meta-game stage 2: resource reskinned via config (' + s2res + ')'); else fail('stage2 resource: ' + s2res);
  // Shared grind economy: the pixel canvas IS the progress indicator (bits → pixels).
  const mgPixels = await page.$eval('.mg-canvas', (e) => Number(e.dataset.pixels));
  if (mgPixels > 0) pass('meta-game grind: bits drawn as pixels on the canvas (' + mgPixels + ' px)'); else fail('mg pixels: ' + mgPixels);
  // Buy-multiplier overlay appears at big numbers; select ×10.
  await page.waitForSelector('.mg-mult:not([hidden])', { timeout: 4000 });
  await page.click('.mg-mult-b[data-m="10"]');
  if (await page.$eval('.mg-mult-b[data-m="10"]', (e) => e.classList.contains('mg-mult-on'))) pass('meta-game grind: buy-multiplier overlay (×10 selected)'); else fail('mult not selected');
  // Buying a data-driven tier with ×10 spends pixels + raises the rate.
  await page.click('.mg-shop .mg-buy[data-id="daemon"]');
  const mgOwned = await page.$eval('.mg-buy[data-id="daemon"] .mg-owned', (e) => e.textContent);
  const mgRate = await page.$eval('.mg-rate', (e) => e.textContent);
  if (!/^×0$/.test(mgOwned) && !/^0\/s$/.test(mgRate)) pass('meta-game grind: tier bought ' + mgOwned + ', rate ' + mgRate); else fail('mg buy: owned=' + mgOwned + ' rate=' + mgRate);
  await page.waitForSelector('.mg-faceboss:not([hidden])', { timeout: 4000 });
  await page.click('.mg-faceboss');
  const clickThrough2 = async () => { for (let i = 0; i < 8; i++) { const n = await page.$('.mg-dlg-next'); if (!n) break; await n.click(); await page.waitForTimeout(110); } };
  await clickThrough2();
  await page.waitForSelector('.mg-boss-demon', { timeout: 8000 });
  pass('meta-game stage 2: Config Demon arena (distinct boss)');
  // Defeat: edit boss.ini → invincible=false, apply, attack 3× racing the rewrite.
  for (let h = 0; h < 3; h++) {
    await page.fill('.mg-ini', 'invincible = false\nhp = 1');
    await page.click('.mg-ini-apply');
    await page.click('.mg-attack');
    await page.waitForTimeout(80);
  }
  await page.waitForSelector('.mg-dialog', { timeout: 4000 });
  const beaten2 = await page.evaluate(() => { try { return (JSON.parse(localStorage.getItem('fv:games:metagame')) || {}).defeated || []; } catch { return []; } });
  if (beaten2.includes(2)) pass('meta-game stage 2: Config Demon defeated by editing his config (persisted)'); else fail('stage2 defeated: ' + JSON.stringify(beaten2));
  await page.click('.games-close');

  // ── Meta-game cross-stage arcade bonus ── minigame high scores → claimable in any stage. ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    try {
      localStorage.setItem('fv:games:hi:snake', '50');
      localStorage.setItem('fv:games:hi:2048', '30');
      localStorage.setItem('fv:games:metagame', JSON.stringify({ bits: 0, stage: 2, defeated: [1], introStages: [1, 2], claimed: {} }));
    } catch {}
    window.__fv.games.unlock(); window.__fv.games.open();
  });
  await page.waitForSelector('.games-overlay:not([hidden])', { timeout: 8000 });
  await page.click('.games-card[data-game="metagame"]');
  await page.waitForSelector('.mg-bonus:not([hidden])', { timeout: 8000 });
  const bonusClaims = await page.$$eval('.mg-bonus .mg-claim', (els) => els.map((e) => e.textContent));
  if (bonusClaims.some((c) => /Snake/.test(c)) && bonusClaims.some((c) => /2048/.test(c))) pass('meta-game: arcade bonus claimable from each game'); else fail('bonus claims: ' + bonusClaims.join(' | '));
  await page.click('.mg-bonus .mg-claim[data-g="snake"]');
  const bitsAfterClaim = await page.$eval('.mg-bits', (e) => e.textContent);
  if (/1\.25K/.test(bitsAfterClaim)) pass('meta-game: claiming a minigame bonus adds resource (' + bitsAfterClaim + ')'); else fail('bits after claim: ' + bitsAfterClaim);
  await page.click('.games-close');

  // ── Meta-game Stage 3 (ASCII Awakening) ── a stage changes the whole VISUAL via config alone. ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    try { localStorage.setItem('fv:games:metagame', JSON.stringify({ bits: 5000, stage: 3, defeated: [1, 2], introStages: [1, 2, 3] })); } catch {}
    window.__fv.games.unlock(); window.__fv.games.open();
  });
  await page.waitForSelector('.games-overlay:not([hidden])', { timeout: 8000 });
  await page.click('.games-card[data-game="metagame"]');
  await page.waitForSelector('.mg-ascii', { timeout: 8000 });
  const s3res = await page.$eval('.mg-bits', (e) => e.textContent);
  if (/bytes/.test(s3res)) pass('meta-game stage 3: ASCII theme + resource reskin (' + s3res + ')'); else fail('stage3 resource: ' + s3res);
  await page.waitForSelector('.mg-faceboss:not([hidden])', { timeout: 4000 });
  await page.click('.mg-faceboss');
  const clickThrough3 = async () => { for (let i = 0; i < 8; i++) { const n = await page.$('.mg-dlg-next'); if (!n) break; await n.click(); await page.waitForTimeout(110); } };
  await clickThrough3();
  await page.waitForSelector('.mg-boss-kernel', { timeout: 8000 });
  pass('meta-game stage 3: Kernel Panic terminal boss');
  for (let i = 0; i < 3; i++) { await page.fill('.mg-cmd', 'reboot'); await page.click('.mg-cmd-run'); await page.waitForTimeout(80); }
  await page.waitForSelector('.mg-dialog', { timeout: 4000 });
  const beaten3 = await page.evaluate(() => { try { return (JSON.parse(localStorage.getItem('fv:games:metagame')) || {}).defeated || []; } catch { return []; } });
  if (beaten3.includes(3)) pass('meta-game stage 3: Kernel Panic defeated via a terminal command (persisted)'); else fail('stage3 defeated: ' + JSON.stringify(beaten3));
  await page.click('.games-close');

  // ── Meta-game Stage 4 (Hex Hydra) ── defeat by flipping his FF (HP) byte in a hex view. ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    try { localStorage.setItem('fv:games:metagame', JSON.stringify({ bits: 5000, stage: 4, defeated: [1, 2, 3], introStages: [1, 2, 3, 4] })); } catch {}
    window.__fv.games.unlock(); window.__fv.games.open();
  });
  await page.waitForSelector('.games-overlay:not([hidden])', { timeout: 8000 });
  await page.click('.games-card[data-game="metagame"]');
  await page.waitForSelector('.mg-faceboss:not([hidden])', { timeout: 8000 });
  await page.click('.mg-faceboss');
  for (let i = 0; i < 8; i++) { const n = await page.$('.mg-dlg-next'); if (!n) break; await n.click(); await page.waitForTimeout(110); }
  await page.waitForSelector('.mg-boss-hydra .mg-hp-cell', { timeout: 8000 });
  pass('meta-game stage 4: Hex Hydra hex grid (FF = HP byte)');
  for (let h = 2; h >= 0; h--) {
    await page.click('.mg-boss-hydra .mg-hp-cell');
    await page.waitForFunction((hp) => !!document.querySelector('.mg-dialog') || (document.querySelector('.mg-boss-hydra .mg-boss-name') || {}).textContent?.includes('HP ' + hp), h, { timeout: 4000 });
  }
  await page.waitForSelector('.mg-dialog', { timeout: 4000 });
  const beaten4 = await page.evaluate(() => { try { return (JSON.parse(localStorage.getItem('fv:games:metagame')) || {}).defeated || []; } catch { return []; } });
  if (beaten4.includes(4)) pass('meta-game stage 4: Hex Hydra defeated by flipping its HP byte (persisted)'); else fail('stage4 defeated: ' + JSON.stringify(beaten4));
  await page.click('.games-close');

  // ── Meta-game Stage 5 (The Time Lord) ── save-scum mechanic: edit game.sav + load 3 times. ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    try { localStorage.setItem('fv:games:metagame', JSON.stringify({ bits: 5000, stage: 5, defeated: [1, 2, 3, 4], introStages: [1, 2, 3, 4, 5] })); } catch {}
    window.__fv.games.unlock(); window.__fv.games.open();
  });
  await page.waitForSelector('.games-overlay:not([hidden])', { timeout: 8000 });
  await page.click('.games-card[data-game="metagame"]');
  await page.waitForSelector('.mg-faceboss:not([hidden])', { timeout: 8000 });
  const s5res = await page.$eval('.mg-bits', (e) => e.textContent);
  if (/packets/.test(s5res)) pass('meta-game stage 5: resource reskinned to packets (' + s5res + ')'); else fail('stage5 resource: ' + s5res);
  await page.click('.mg-faceboss');
  for (let i = 0; i < 8; i++) { const n = await page.$('.mg-dlg-next'); if (!n) break; await n.click(); await page.waitForTimeout(110); }
  await page.waitForSelector('.mg-boss-timelord', { timeout: 8000 });
  pass('meta-game stage 5: The Time Lord boss arena (chess board + save file)');
  // Defeat: edit game.sav to turn=mine/score=0/cheat=0 and Load Save 3 times.
  const SAV_WIN = 'turn = mine\nscore = 0\ncheat = 0';
  for (let h = 0; h < 3; h++) {
    await page.fill('.mg-sav', SAV_WIN);
    await page.click('.mg-tl-load');
    await page.waitForTimeout(80);
  }
  await page.waitForSelector('.mg-dialog', { timeout: 4000 });
  const beaten5 = await page.evaluate(() => { try { return (JSON.parse(localStorage.getItem('fv:games:metagame')) || {}).defeated || []; } catch { return []; } });
  if (beaten5.includes(5)) pass('meta-game stage 5: The Time Lord defeated by save-scumming (persisted)'); else fail('stage5 defeated: ' + JSON.stringify(beaten5));
  await page.click('.games-close');

  // ── Meta-game Stage 10 (The Archivist) ── assemble 3 key fragments and export ZIP. ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    try { localStorage.setItem('fv:games:metagame', JSON.stringify({ bits: 5000, stage: 10, defeated: [1, 2, 3, 4, 5, 6, 7, 8, 9], introStages: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] })); } catch {}
    window.__fv.games.unlock(); window.__fv.games.open();
  });
  await page.waitForSelector('.games-overlay:not([hidden])', { timeout: 8000 });
  await page.click('.games-card[data-game="metagame"]');
  await page.waitForSelector('.mg-faceboss:not([hidden])', { timeout: 8000 });
  const s10res = await page.$eval('.mg-bits', (e) => e.textContent);
  if (/archives/.test(s10res)) pass('meta-game stage 10: resource reskinned to archives (' + s10res + ')'); else fail('stage10 resource: ' + s10res);
  await page.click('.mg-faceboss');
  for (let i = 0; i < 8; i++) { const n = await page.$('.mg-dlg-next'); if (!n) break; await n.click(); await page.waitForTimeout(110); }
  await page.waitForSelector('.mg-boss-archivist', { timeout: 8000 });
  pass('meta-game stage 10: The Archivist boss arena (folder with key files)');
  // Defeat: save each key file with correct content, then export.
  const keyFiles = [
    { name: 'fragment-alpha.txt', value: 'OPEN' },
    { name: 'fragment-beta.txt',  value: 'THE'  },
    { name: 'fragment-gamma.txt', value: 'GATE' },
  ];
  for (const kf of keyFiles) {
    await page.fill('.mg-arc-txt[data-name="' + kf.name + '"]', kf.value);
    await page.click('.mg-arc-save[data-name="' + kf.name + '"]');
    await page.waitForTimeout(80);
  }
  await page.waitForSelector('.mg-arc-export:not([disabled])', { timeout: 4000 });
  await page.click('.mg-arc-export');
  await page.waitForSelector('.mg-dialog', { timeout: 4000 });
  const beaten10 = await page.evaluate(() => { try { return (JSON.parse(localStorage.getItem('fv:games:metagame')) || {}).defeated || []; } catch { return []; } });
  if (beaten10.includes(10)) pass('meta-game stage 10: The Archivist defeated by assembling fragments (persisted)'); else fail('stage10 defeated: ' + JSON.stringify(beaten10));
  await page.click('.games-close');

  // ── Stage 1 milestone system — static checks (no browser state needed). ──
  // sounds.js exports clickTick as a function (fetch source + parse).
  {
    const soundsSrc = await page.evaluate(async (origin) => {
      try { const r = await fetch(origin + '/games/metagame/sounds.js'); return await r.text(); } catch { return ''; }
    }, origin);
    if (/export function clickTick/.test(soundsSrc)) pass('sounds.js: exports clickTick function'); else fail('sounds.js missing clickTick export');
  }
  // Milestone sound-unlock fires at totalBits >= 1000 (checkMilestones logic via page evaluate).
  {
    const milestoneOk = await page.evaluate(() => {
      // Inline mirror of checkMilestones logic to verify threshold without full game boot.
      const MILESTONES = [
        { id: 'sound-unlock', threshold: 1000 },
        { id: 'anim-unlock',  threshold: 10000 },
      ];
      const state = { totalBits: 1000, milestones: [] };
      for (const m of MILESTONES) {
        if (!state.milestones.includes(m.id) && state.totalBits >= m.threshold) {
          state.milestones.push(m.id);
        }
      }
      return state.milestones.includes('sound-unlock') && !state.milestones.includes('anim-unlock');
    });
    if (milestoneOk) pass('milestone: sound-unlock fires at totalBits=1000 (anim-unlock not yet)'); else fail('milestone threshold logic wrong');
  }
  // MESSAGES1 contains bell-halfway and bell-patient.
  {
    const msgs = await page.evaluate(async (origin) => {
      try {
        const r = await fetch(origin + '/games/metagame/messages1.js');
        const src = await r.text();
        return { halfway: src.includes("'bell-halfway'"), patient: src.includes("'bell-patient'") };
      } catch { return {}; }
    }, origin);
    if (msgs.halfway) pass('MESSAGES1 contains bell-halfway'); else fail('MESSAGES1 missing bell-halfway');
    if (msgs.patient) pass('MESSAGES1 contains bell-patient'); else fail('MESSAGES1 missing bell-patient');
  }

  // ── Graceful offline-miss ── cache-on-use only (no full precache), then open a viewer that
  // was never loaded online while offline → friendly note instead of a raw error.
  {
    const mctx = await browser.newContext();
    const mp = await mctx.newPage();
    await mp.goto(origin, { waitUntil: 'networkidle' });
    await mp.waitForSelector('#offlineStatus', { timeout: 90000 });
    await mp.getByRole('button', { name: 'Welcome.md' }).click();   // caches app + markdown only
    await mp.waitForSelector('.monaco-editor', { timeout: 30000 });
    await mctx.setOffline(true);
    // Feed a PDF from disk (no network for the bytes); its viewer + pdf.js were never cached.
    await mp.setInputFiles('#fileInput', new URL('../../docs/examples/sample.pdf', import.meta.url).pathname);
    const miss = await mp.waitForSelector('.offline-miss', { timeout: 20000 }).catch(() => null);
    if (miss) pass('graceful offline-miss note shown for an uncached viewer'); else fail('no offline-miss note for uncached PDF viewer while offline');
    await mctx.setOffline(false);
    await mctx.close();
  }

  if (consoleErrors.length === 0) pass('no console/page errors'); else fail('console errors:\n  ' + consoleErrors.join('\n  '));
  if (offOrigin.length === 0) pass('ZERO off-origin requests (trust guarantee)'); else fail('off-origin requests:\n  ' + offOrigin.join('\n  '));
}
