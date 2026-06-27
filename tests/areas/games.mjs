export async function run(ctx) {
  const { browser, page, origin, pass, fail, consoleErrors, offOrigin } = ctx;

  // Track HOW metagame stages load: each must come from its bundled stage.generated.js (one
  // request) and NEVER from the raw per-module index.js (which would mean the bundle was bypassed
  // and we're back to fetching 6–16 modules per stage). Asserted after Stage 1 mounts below.
  const stageBundleReqs = new Set();
  const stageIndexReqs = new Set();
  page.on('request', (r) => {
    const u = r.url();
    let m = u.match(/\/stages\/(stage\d+)\/stage\.generated\.js(?:[?#]|$)/);
    if (m) { stageBundleReqs.add(m[1]); return; }
    m = u.match(/\/stages\/(stage\d+)\/index\.js(?:[?#]|$)/);
    if (m) stageIndexReqs.add(m[1]);
  });

  // Opening a generated file (e.g. Stage 3's memory logs) while a prior stage left an unsaved editor
  // triggers the viewer's discard-confirm. A real player clicks "Discard and continue"; accept it so
  // the file actually opens (Playwright otherwise auto-DISMISSES, cancelling the open).
  page.on('dialog', (d) => { d.accept().catch(() => {}); });
  await page.goto(origin, { waitUntil: 'load' });
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
  // Optional modes: Walls (2× score) + Boosters, persisted and restart cleanly.
  const snakeOpts = await page.$$eval('.snake-opts input[type="checkbox"]', (els) => els.map((e) => e.className));
  if (snakeOpts.length === 2 && snakeOpts.some((c) => c.includes('walls')) && snakeOpts.some((c) => c.includes('boost')))
    pass('Snake exposes Walls + Boosters options');
  else fail('Snake options missing: ' + JSON.stringify(snakeOpts));
  await page.click('.snake-opt-walls');
  const wallsState = await page.evaluate(() => ({
    ls: localStorage.getItem('fv:snake:walls'),
    checked: document.querySelector('.snake-opt-walls').checked,
  }));
  const snakeCanvasStill = await page.$('.snake-canvas');
  if (snakeCanvasStill && ((wallsState.checked && wallsState.ls === '1') || (!wallsState.checked && wallsState.ls === '0')))
    pass('Snake Walls toggle persists and restarts cleanly');
  else fail('Snake walls toggle inconsistent: ' + JSON.stringify(wallsState) + ' canvas=' + !!snakeCanvasStill);
  // Field-size selector resizes the grid; with walls on they must be connected AND fully reachable.
  const sizeProbe = await page.evaluate(() => {
    const sel = document.querySelector('.snake-opt-size');
    sel.value = 'large';
    sel.dispatchEvent(new Event('change'));
    const api = document.querySelector('.snake-wrap').__snake;
    const info = api.info();
    const ws = api.walls();
    const set = new Set(ws.map((w) => w.x + ',' + w.y));
    // "connected" = every wall cell touches at least one orthogonal wall neighbour (no lone cells)
    const connected = ws.every((w) =>
      set.has((w.x + 1) + ',' + w.y) || set.has((w.x - 1) + ',' + w.y)
      || set.has(w.x + ',' + (w.y + 1)) || set.has(w.x + ',' + (w.y - 1)));
    return { grid: info.grid, reachable: info.reachable, wallCount: info.wallCount, connected,
      ls: localStorage.getItem('fv:snake:size'), cw: document.querySelector('.snake-canvas').width };
  });
  if (sizeProbe.grid === 28 && sizeProbe.ls === 'large' && sizeProbe.reachable
      && sizeProbe.wallCount > 0 && sizeProbe.connected)
    pass('Snake: field size resizes grid + walls are connected and fully reachable');
  else fail('Snake size/walls: ' + JSON.stringify(sizeProbe));
  await page.evaluate(() => { try { localStorage.removeItem('fv:snake:walls'); localStorage.removeItem('fv:snake:boost'); localStorage.removeItem('fv:snake:size'); } catch {} });
  await page.click('.games-back');
  await page.waitForSelector('.games-grid:not([hidden])', { timeout: 4000 });

  await page.click('.games-card[data-game="2048"]');
  await page.waitForSelector('.g2048-board', { timeout: 8000 });
  const g2048BgCells = await page.$$eval('.g2048-bg-cell', (els) => els.length);
  if (g2048BgCells === 16) pass('2048 launches'); else fail('2048 board cells: ' + g2048BgCells);
  const g2048MergeAnim = await page.$eval('.g2048-wrap', (wrap) => {
    wrap.__g2048._seed([
      { id: 1, r: 0, c: 1, value: 2 },
      { id: 2, r: 0, c: 2, value: 2 },
      { id: 3, r: 1, c: 2, value: 4 },
    ], 0);
    wrap.__g2048._move(0);
    const source = wrap.querySelector('.g2048-merge-source');
    const moved = wrap.querySelector('.g2048-cell[style*="transition"]');
    const texts = [...wrap.querySelectorAll('.g2048-cell')].map((el) => el.textContent);
    return {
      sourceText: source?.textContent || '',
      sourceOpacity: source ? getComputedStyle(source).opacity : '',
      twos: texts.filter((text) => text === '2').length,
      fours: texts.filter((text) => text === '4').length,
      moveTransition: moved ? getComputedStyle(moved).transitionProperty : '',
    };
  });
  await page.waitForTimeout(180);
  const g2048MergeSettled = await page.$eval('.g2048-wrap', (wrap) => {
    const merged = wrap.querySelector('.g2048-cell.g2048-merge');
    const texts = [...wrap.querySelectorAll('.g2048-cell')].map((el) => el.textContent);
    return {
      sourceCount: wrap.querySelectorAll('.g2048-merge-source').length,
      fours: texts.filter((text) => text === '4').length,
      mergeAnimation: merged ? getComputedStyle(merged).animationName : '',
    };
  });
  if (g2048MergeAnim.sourceText === '2'
    && g2048MergeAnim.twos >= 2
    && g2048MergeAnim.fours >= 1
    && /transform/.test(g2048MergeAnim.moveTransition)
    && g2048MergeSettled.sourceCount === 0
    && g2048MergeSettled.fours >= 2
    && /g2048-merge-pulse/.test(g2048MergeSettled.mergeAnimation)) {
    pass('2048 merge move slides source tiles before showing merged value');
  } else {
    fail('2048 merge animation missing: ' + JSON.stringify({ during: g2048MergeAnim, after: g2048MergeSettled }));
  }
  async function assert2048ResultLayer(result, label) {
    await page.waitForSelector(`.g2048-over[data-result="${result}"]:not([hidden])`, { timeout: 4000 });
    const layer = await page.$eval('.g2048-wrap', (wrap) => {
      const over = wrap.querySelector('.g2048-over');
      const box = wrap.querySelector('.g2048-over-box');
      const board = wrap.querySelector('.g2048-board');
      const score = wrap.querySelector('.g2048-score');
      const rect = (el) => {
        const r = el.getBoundingClientRect();
        return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
      };
      const at = (r) => document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      const boardRect = rect(board);
      const scoreRect = rect(score);
      const boardTop = at(boardRect);
      const scoreTop = at(scoreRect);
      return {
        message: wrap.querySelector('.g2048-over-msg')?.textContent || '',
        overRect: rect(over),
        boxRect: rect(box),
        boardRect,
        scoreRect,
        overZ: getComputedStyle(over).zIndex,
        boardTopInOverlay: Boolean(boardTop?.closest?.('.g2048-over')),
        scoreTopInOverlay: Boolean(scoreTop?.closest?.('.g2048-over')),
        boxVisible: box.offsetWidth > 0 && box.offsetHeight > 0,
      };
    });
    const coversBoard = layer.overRect.left <= layer.boardRect.left
      && layer.overRect.right >= layer.boardRect.right
      && layer.overRect.top <= layer.boardRect.top
      && layer.overRect.bottom >= layer.boardRect.bottom;
    const coversScore = layer.overRect.left <= layer.scoreRect.left
      && layer.overRect.right >= layer.scoreRect.right
      && layer.overRect.top <= layer.scoreRect.top
      && layer.overRect.bottom >= layer.scoreRect.bottom;
    if (layer.boxVisible && coversBoard && coversScore && layer.boardTopInOverlay && layer.scoreTopInOverlay && Number(layer.overZ) > 0) {
      pass(`2048 ${label} result overlay sits above board and score HUD`);
    } else {
      fail(`2048 ${label} result overlay layering invalid: ` + JSON.stringify(layer));
    }
  }
  await page.$eval('.g2048-wrap', (wrap) => {
    wrap.__g2048._seed([{ r: 0, c: 0, value: 2048 }], 4096, 'win');
  });
  await assert2048ResultLayer('win', 'win');
  const g2048WinMessage = await page.$eval('.g2048-over-msg', (el) => el.textContent);
  if (/you win/i.test(g2048WinMessage) && /2048/.test(g2048WinMessage)) pass('2048 exposes explicit 2048 win state'); else fail('2048 win message unexpected: ' + g2048WinMessage);
  await page.$eval('.g2048-wrap', (wrap) => {
    const values = [
      2, 4, 2, 4,
      4, 2, 4, 2,
      2, 4, 2, 4,
      4, 2, 4, 2,
    ];
    wrap.__g2048._seed(values.map((value, i) => ({ r: Math.floor(i / 4), c: i % 4, value })), 128, 'over');
  });
  await assert2048ResultLayer('over', 'game-over');
  await page.setViewportSize({ width: 390, height: 740 });
  await assert2048ResultLayer('over', 'mobile game-over');
  await page.setViewportSize({ width: 1100, height: 800 });
  await page.click('.games-back');

  // ── Flappy Bird: click OR Space is the only control; verify BOTH start the run + flap upward. ──
  await page.waitForSelector('.games-grid:not([hidden])', { timeout: 4000 });
  await page.click('.games-card[data-game="flappybird"]');
  await page.waitForSelector('.flappybird-canvas', { timeout: 8000 });
  pass('Flappy Bird launches');
  const fbStart = await page.$eval('.flappybird-wrap', (w) => w.__flappybird.state());
  await page.keyboard.press('Space');
  const fbSpace = await page.$eval('.flappybird-wrap', (w) => w.__flappybird.state());
  if (!fbStart.started && fbSpace.started && fbSpace.vy < 0) pass('Flappy Bird: Space flaps (run starts, upward velocity)');
  else fail('Flappy Bird space: ' + JSON.stringify({ before: fbStart, after: fbSpace }));
  await page.$eval('.flappybird-wrap', (w) => w.__flappybird.reset());
  await page.click('.flappybird-canvas');
  const fbClick = await page.$eval('.flappybird-wrap', (w) => w.__flappybird.state());
  if (fbClick.started && fbClick.vy < 0) pass('Flappy Bird: click flaps'); else fail('Flappy Bird click: ' + JSON.stringify(fbClick));
  const fbSfxInit = await page.$eval('.flappybird-sfx', (b) => b.textContent);
  await page.click('.flappybird-sfx');
  const fbSfxOff = await page.evaluate(() => ({ icon: document.querySelector('.flappybird-sfx').textContent, ls: localStorage.getItem('fv:flappybird:sfx') }));
  if (/🔊/.test(fbSfxInit) && /🔇/.test(fbSfxOff.icon) && fbSfxOff.ls === '0') pass('Flappy Bird: SFX toggle mutes + persists');
  else fail('Flappy Bird SFX toggle: ' + JSON.stringify({ init: fbSfxInit, off: fbSfxOff }));
  await page.evaluate(() => { try { localStorage.removeItem('fv:flappybird:sfx'); } catch {} });
  await page.click('.games-back');
  await page.waitForSelector('.games-grid:not([hidden])', { timeout: 4000 });

  // Tetris — clean start, escalating gravity, ramped hard-drop scoring
  await page.click('.games-card[data-game="tetris"]');
  await page.waitForSelector('.tetris-canvas', { timeout: 8000 });
  pass('Tetris launches');
  const tet = await page.$eval('.tetris-wrap', (w) => {
    const s = w.__tetris.state();
    return { score: s.score, level: s.level, lines: s.lines, dead: s.dead, hasNext: s.hasNext,
      preview: !!document.querySelector('.tetris-next'), ms0: w.__tetris.speedAt(0), msFast: w.__tetris.speedAt(6) };
  });
  if (tet.score === 0 && tet.level === 0 && tet.lines === 0 && !tet.dead && tet.hasNext && tet.preview && tet.ms0 === 800 && tet.msFast < tet.ms0)
    pass('Tetris: clean start + next preview + gravity escalates with level');
  else fail('Tetris start/escalation: ' + JSON.stringify(tet));
  await page.keyboard.press('Space');                       // hard drop the first piece
  const tetDrop = await page.$eval('.tetris-wrap', (w) => w.__tetris.state());
  if (tetDrop.score > 0 && !tetDrop.dead) pass('Tetris: hard drop scores + locks without error');
  else fail('Tetris hard drop: ' + JSON.stringify(tetDrop));
  await page.click('.games-back');
  await page.waitForSelector('.games-grid:not([hidden])', { timeout: 4000 });

  // Breakout — clean start, escalating ball speed, launch on Space
  await page.click('.games-card[data-game="breakout"]');
  await page.waitForSelector('.breakout-canvas', { timeout: 8000 });
  pass('Breakout launches');
  const bo = await page.$eval('.breakout-wrap', (w) => {
    const s = w.__breakout.state();
    return { score: s.score, lives: s.lives, level: s.level, dead: s.dead, stuck: s.stuck,
      bricks: s.bricks, sp0: w.__breakout.speedAt(0), spFast: w.__breakout.speedAt(5) };
  });
  if (bo.score === 0 && bo.lives === 3 && bo.level === 0 && !bo.dead && bo.stuck && bo.bricks > 0 && bo.spFast > bo.sp0)
    pass('Breakout: clean start + ball speed escalates with level');
  else fail('Breakout start/escalation: ' + JSON.stringify(bo));
  await page.keyboard.press('Space');                       // launch the ball
  const boLaunched = await page.$eval('.breakout-wrap', (w) => w.__breakout.state());
  if (!boLaunched.stuck && !boLaunched.dead) pass('Breakout: ball launches on Space');
  else fail('Breakout launch: ' + JSON.stringify(boLaunched));
  const boPower = await page.$eval('.breakout-wrap', (w) => {
    const before = w.__breakout.state().balls;
    w.__breakout.activate('multi');
    const after = w.__breakout.state().balls;
    w.__breakout.activate('life');
    return { before, after, lives: w.__breakout.state().lives };
  });
  if (boPower.after > boPower.before && boPower.lives === 4) pass('Breakout: multiball adds balls + extra-life power-up');
  else fail('Breakout power-ups: ' + JSON.stringify(boPower));
  await page.click('.games-back');
  await page.waitForSelector('.games-grid:not([hidden])', { timeout: 4000 });

  // Memory — clean 6-pair start; matching a pair scores (ramped by round)
  await page.click('.games-card[data-game="memory"]');
  await page.waitForSelector('.memory-grid', { timeout: 8000 });
  pass('Memory launches');
  const mem0 = await page.$eval('.memory-wrap', (w) => w.__memory.state());
  const pairIdx = await page.$eval('.memory-wrap', (w) => {
    const d = w.__memory.deck();
    for (let i = 0; i < d.length; i++) for (let j = i + 1; j < d.length; j++) if (d[i] === d[j]) return [i, j];
    return null;
  });
  if (mem0.score === 0 && mem0.round === 1 && mem0.cards === 12 && mem0.matched === 0 && mem0.movesLeft === 14 && !mem0.over && pairIdx)
    pass('Memory: clean start, 6-pair board, moves budget = pairs*2+2');   // 6*2+2
  else fail('Memory start: ' + JSON.stringify({ mem0, pairIdx }));
  const memFaceW = await page.$eval('.memory-card .memory-back', (el) => Math.round(el.getBoundingClientRect().width));
  if (memFaceW > 24) pass('Memory: card faces render at full size'); else fail('Memory faces collapsed: ' + memFaceW);
  await page.click('.memory-card[data-idx="' + pairIdx[0] + '"]');
  await page.click('.memory-card[data-idx="' + pairIdx[1] + '"]');
  const memM = await page.$eval('.memory-wrap', (w) => w.__memory.state());
  if (memM.matched >= 1 && memM.score > 0 && memM.movesLeft === 13) pass('Memory: matching a pair scores (ramped) + spends one move');
  else fail('Memory match: ' + JSON.stringify(memM));
  await page.click('.games-back');
  await page.waitForSelector('.games-grid:not([hidden])', { timeout: 4000 });
  // Fresh board: deliberately miss every turn → running out of moves ends the game.
  await page.click('.games-card[data-game="memory"]');
  await page.waitForSelector('.memory-grid', { timeout: 8000 });
  const memLoss = await page.evaluate(async (flipBack) => {
    const w = document.querySelector('.memory-wrap');
    const grid = w.querySelector('.memory-grid');
    const deck = w.__memory.deck();
    let a = 0, b = -1;                                      // a fixed mismatching index pair (different emoji → never matches)
    for (let j = 1; j < deck.length; j++) if (deck[j] !== deck[a]) { b = j; break; }
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    let guard = 0;
    while (!w.__memory.state().over && guard++ < 30) {
      grid.querySelector('.memory-card[data-idx="' + a + '"]').click();
      grid.querySelector('.memory-card[data-idx="' + b + '"]').click();
      await sleep(flipBack + 90);                           // let the mismatch flip back (busy clears)
    }
    return w.__memory.state();
  }, 760);
  if (memLoss.over && memLoss.movesLeft <= 0 && memLoss.matched === 0) pass('Memory: running out of moves ends the game');
  else fail('Memory loss: ' + JSON.stringify(memLoss));
  await page.click('.games-back');
  await page.waitForSelector('.games-grid:not([hidden])', { timeout: 4000 });

  // Minesweeper — safe first click reveals + scores; Flag mode flags without digging
  await page.click('.games-card[data-game="minesweeper"]');
  await page.waitForSelector('.mine-grid', { timeout: 8000 });
  pass('Minesweeper launches');
  const ms0 = await page.$eval('.mine-wrap', (w) => w.__mine.state());
  if (ms0.score === 0 && ms0.level === 0 && !ms0.dead && !ms0.flagMode && ms0.cells === 81 && ms0.minesLeft > 0 && ms0.revealed === 0)
    pass('Minesweeper: clean 9×9 start');
  else fail('Minesweeper start: ' + JSON.stringify(ms0));
  await page.click('.mine-cell[data-i="40"]');             // center; first click is always safe
  const ms1 = await page.$eval('.mine-wrap', (w) => w.__mine.state());
  if (!ms1.dead && ms1.revealed > 0 && ms1.score > 0) pass('Minesweeper: safe first dig reveals + scores');
  else fail('Minesweeper dig: ' + JSON.stringify(ms1));
  await page.click('.mine-flag');                          // switch to Flag mode
  const cov = await page.$eval('.mine-wrap', (w) => w.__mine.firstCovered());
  await page.click('.mine-cell[data-i="' + cov + '"]');
  const ms2 = await page.$eval('.mine-wrap', (w) => w.__mine.state());
  if (ms2.flagMode && ms2.minesLeft === ms1.minesLeft - 1) pass('Minesweeper: Flag mode flags a covered cell');
  else fail('Minesweeper flag: ' + JSON.stringify({ ms1, ms2, cov }));
  await page.click('.games-back');
  await page.waitForSelector('.games-grid:not([hidden])', { timeout: 4000 });

  // Sokoban — pushing the box onto the goal solves level 1 and scores (ramped by levels solved)
  await page.click('.games-card[data-game="sokoban"]');
  await page.waitForSelector('.sokoban-canvas', { timeout: 8000 });
  pass('Sokoban launches');
  const sk0 = await page.$eval('.sokoban-wrap', (w) => ({ ...w.__sokoban.state(),
    v1: w.__sokoban.solveValueAt(1), v3: w.__sokoban.solveValueAt(3) }));
  if (sk0.score === 0 && sk0.solved === 0 && sk0.levelIndex === 0 && sk0.boxes === 1 && sk0.onGoal === 0
      && !sk0.done && sk0.total >= 10 && sk0.v3 > sk0.v1)
    pass('Sokoban: clean start + ' + sk0.total + ' levels + ramped solve value');
  else fail('Sokoban start: ' + JSON.stringify(sk0));
  const solInfo = await page.$eval('.sokoban-wrap', (w) => {
    const plan = w.__sokoban.solution();
    return { hasBtn: !!document.querySelector('.sokoban-solve'), planLen: typeof plan === 'string' ? plan.length : -1 };
  });
  if (solInfo.hasBtn && solInfo.planLen >= 1) pass('Sokoban: Solve has a stored solution for the level');
  else fail('Sokoban solve plan: ' + JSON.stringify(solInfo));
  // Solve demo disables Undo while running, then offers Next when done.
  await page.click('.sokoban-solve');
  const skDuring = await page.$eval('.sokoban-wrap', (w) => w.__sokoban.state());
  await page.waitForTimeout(900);                          // level 1 = a single move @500ms
  const skDone = await page.$eval('.sokoban-wrap', (w) => w.__sokoban.state());
  if (skDuring.solving && skDuring.undoDisabled && !skDone.solving && !skDone.undoDisabled
      && skDone.nextShown && skDone.onGoal === skDone.boxes)
    pass('Sokoban: Solve disables Undo while running, then offers Next');
  else fail('Sokoban solve flow: ' + JSON.stringify({ skDuring, skDone }));
  const ffOn = await page.$eval('.sokoban-wrap', (w) => { document.querySelector('.sokoban-ff').click(); return w.__sokoban.state().ffMode; });
  if (ffOn) pass('Sokoban: fast-forward toggle switches speed mode'); else fail('Sokoban FF toggle: ' + ffOn);
  await page.click('.sokoban-reset');                      // back to a clean level 1 for the next assertion
  await page.keyboard.press('ArrowLeft');                  // single push solves level 1
  const sk1 = await page.$eval('.sokoban-wrap', (w) => w.__sokoban.state());
  if (sk1.solved >= 1 && sk1.score > 0) pass('Sokoban: pushing the box onto the goal solves + scores');
  else fail('Sokoban solve: ' + JSON.stringify(sk1));
  // Set picker: lists every set, and choosing one restarts from that set's level 1 with its own solutions.
  const skSets = await page.$eval('.sokoban-wrap', (w) => ({
    hasPicker: !!w.querySelector('.sokoban-set'), count: w.__sokoban.state().setCount,
    options: [...w.querySelectorAll('.sokoban-set option')].map((o) => o.value),
  }));
  if (skSets.hasPicker && skSets.count === 9 && ['microban2', 'microban4', 'minicosmos', 'picokosmos', 'yoshio'].every((id) => skSets.options.includes(id)))
    pass('Sokoban: set picker lists all ' + skSets.count + ' sets');
  else fail('Sokoban picker: ' + JSON.stringify(skSets));
  const skSwitch = await page.$eval('.sokoban-wrap', (w) => {
    const sel = w.querySelector('.sokoban-set');
    sel.value = 'microban2'; sel.dispatchEvent(new Event('change'));
    const st = w.__sokoban.state();
    const plan = w.__sokoban.solution();
    const out = { setId: st.setId, total: st.total, levelIndex: st.levelIndex, solved: st.solved, score: st.score,
      hasSol: typeof plan === 'string' && plan.length > 0 };
    sel.value = 'microban'; sel.dispatchEvent(new Event('change'));   // restore default so persisted state stays microban
    return out;
  });
  if (skSwitch.setId === 'microban2' && skSwitch.total === 135 && skSwitch.levelIndex === 0 && skSwitch.solved === 0 && skSwitch.score === 0 && skSwitch.hasSol)
    pass('Sokoban: choosing Microban II switches set (135 levels, fresh start, stored solution)');
  else fail('Sokoban set switch: ' + JSON.stringify(skSwitch));
  await page.click('.games-back');
  await page.waitForSelector('.games-grid:not([hidden])', { timeout: 4000 });

  // Asteroids — clean start, escalating waves, Space fires a bullet
  await page.click('.games-card[data-game="asteroids"]');
  await page.waitForSelector('.asteroids-canvas', { timeout: 8000 });
  pass('Asteroids launches');
  const as0 = await page.$eval('.asteroids-wrap', (w) => ({ ...w.__asteroids.state(),
    r1: w.__asteroids.rocksInWave(1), r5: w.__asteroids.rocksInWave(5) }));
  if (as0.score === 0 && as0.lives === 3 && as0.wave === 1 && !as0.dead && as0.rocks === 4 && as0.bullets === 0 && as0.r5 > as0.r1)
    pass('Asteroids: clean start + waves escalate');
  else fail('Asteroids start/escalation: ' + JSON.stringify(as0));
  await page.keyboard.press('Space');                      // fire
  const as1 = await page.$eval('.asteroids-wrap', (w) => w.__asteroids.state());
  if (as1.bullets >= 1 && !as1.dead) pass('Asteroids: Space fires a bullet');
  else fail('Asteroids fire: ' + JSON.stringify(as1));
  const asL = await page.$eval('.asteroids-wrap', (w) => {
    const on = (w.__asteroids.toggleLock(), w.__asteroids.state().lockFire);
    const off = (w.__asteroids.toggleLock(), w.__asteroids.state().lockFire);
    return { on, off };
  });
  if (asL.on === true && asL.off === false) pass('Asteroids: lock toggles continuous auto-fire');
  else fail('Asteroids lock: ' + JSON.stringify(asL));
  await page.click('.games-back');
  await page.waitForSelector('.games-grid:not([hidden])', { timeout: 4000 });

  // Simon — clean start, escalating tempo, repeating the sequence scores
  await page.click('.games-card[data-game="simon"]');
  await page.waitForSelector('.simon-board', { timeout: 8000 });
  pass('Simon launches');
  const si0 = await page.$eval('.simon-wrap', (w) => ({ ...w.__simon.state(),
    t1: w.__simon.tempoAt(1), t8: w.__simon.tempoAt(8) }));
  if (si0.score === 0 && si0.round === 1 && !si0.dead && si0.seqLen === 1 && si0.t8 < si0.t1)
    pass('Simon: clean start + tempo escalates');
  else fail('Simon start/escalation: ' + JSON.stringify(si0));
  const siR = await page.$eval('.simon-wrap', (w) => { w.__simon.forceAccept(); w.__simon.tap(w.__simon.seq()[0]); return w.__simon.state(); });
  if (siR.round >= 2 && siR.score > 0 && !siR.dead) pass('Simon: repeating the sequence scores (ramped by round)');
  else fail('Simon repeat: ' + JSON.stringify(siR));
  const siD = await page.$eval('.simon-wrap', (w) => {
    const sel = w.querySelector('.simon-diff'); sel.value = 'hard'; sel.dispatchEvent(new Event('change'));
    w.__simon.forceAccept();
    const wrong = (w.__simon.seq()[0] + 1) % w.__simon.state().count;
    w.__simon.tap(wrong);
    const s = w.__simon.state();
    return { count: s.count, dead: s.dead, lit: s.lit };
  });
  if (siD.count === 16 && siD.dead && siD.lit === 0) pass('Simon: Hard = 16 pads + losing resets the board (no stuck-lit pad)');
  else fail('Simon difficulty/loss: ' + JSON.stringify(siD));
  await page.click('.games-back');
  await page.waitForSelector('.games-grid:not([hidden])', { timeout: 4000 });

  // Pong — clean start, escalating ball speed, ball in play
  await page.click('.games-card[data-game="pong"]');
  await page.waitForSelector('.pong-canvas', { timeout: 8000 });
  pass('Pong launches');
  const pg0 = await page.$eval('.pong-wrap', (w) => ({ ...w.__pong.state(), s0: w.__pong.speedAt(0), s5: w.__pong.speedAt(5) }));
  if (pg0.score === 0 && pg0.lives === 3 && pg0.level === 0 && !pg0.dead && pg0.s5 > pg0.s0)
    pass('Pong: clean start + ball speed escalates');
  else fail('Pong start/escalation: ' + JSON.stringify(pg0));
  const pgMoving = await page.evaluate(async () => {
    const w = document.querySelector('.pong-wrap');
    const a = w.__pong.state().ballX;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return w.__pong.state().ballX !== a;
  });
  if (pgMoving) pass('Pong: ball is in play (loop running)');
  else fail('Pong: ball not moving');
  const pgSlide = await page.$eval('.pong-wrap', (w) => {
    const y0 = w.__pong.state().leftY; w.__pong.moveBy(40);
    return { y0, y1: w.__pong.state().leftY };
  });
  if (pgSlide.y1 > pgSlide.y0) pass('Pong: relative slide moves the paddle');
  else fail('Pong slide: ' + JSON.stringify(pgSlide));
  await page.keyboard.press('w');                          // W/S brings in player 2
  const pg2 = await page.$eval('.pong-wrap', (w) => w.__pong.state());
  if (pg2.mode === '2p') pass('Pong: W/S activates 2-player mode');
  else fail('Pong 2-player: ' + JSON.stringify(pg2));
  await page.click('.games-back');
  await page.waitForSelector('.games-grid:not([hidden])', { timeout: 4000 });

  await page.click('.games-card[data-game="metagame"]');
  await page.waitForSelector('.mg-v3', { timeout: 8000 });
  await page.waitForSelector('.mg-s1', { timeout: 8000 });
  // Stage 1 just mounted — it must have come from the bundle, not the raw index.js.
  if (stageBundleReqs.has('stage1') && !stageIndexReqs.has('stage1'))
    pass('Stage 1 loads from bundled stage.generated.js (not per-module index.js)');
  else
    fail(`Stage 1 load path wrong: bundle=${[...stageBundleReqs]} index=${[...stageIndexReqs]}`);
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
    save.stageState[1].totalBits = { m: 10, e: 6 };
    save.stageState[1].tabsUnlocked = false;
    localStorage.setItem('fv:games:metagame:v3', JSON.stringify(save));
  });
  await page.click('.games-card[data-game="metagame"]');
  await page.waitForSelector('.mg-s1-phase1 .mg-s1-tap', { timeout: 8000 });
  const totalOnlyUnlocked = await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem('fv:games:metagame:v3'));
    const tabs = document.querySelector('.mg-s1-tabs');
    const tabsVisible = tabs && getComputedStyle(tabs).display !== 'none';
    return Boolean(save.stageState[1].tabsUnlocked || tabsVisible);
  });
  if (!totalOnlyUnlocked) pass('Stage 1 tabs stay locked when only lifetime bits exceed 150'); else fail('Stage 1 tabs unlocked from totalBits alone');
  await page.click('.mg-s1-tap', { position: { x: 8, y: 8 } });
  await page.waitForSelector('.mg-s1-tab[data-tab="bits"]', { timeout: 4000 });
  const bellLogHasStage1Message = await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem('fv:games:metagame:v3'));
    return (save.bell?.log || []).some((entry) => entry.stage === 1 && /^stage1\./.test(entry.id));
  });
  if (bellLogHasStage1Message) pass('Stage 1 economy messages feed the v3 header bell log'); else fail('Stage 1 messages missing from v3 bell log');
  await page.waitForSelector('.mg-s1-earn', { timeout: 4000 });
  const beforeEarnBits = await page.evaluate(() => JSON.parse(localStorage.getItem('fv:games:metagame:v3')).stageState[1].bits.m);
  await page.click('.mg-s1-earn');
  await page.waitForFunction((before) => {
    try {
      return JSON.parse(localStorage.getItem('fv:games:metagame:v3')).stageState[1].bits.m > before;
    } catch { return false; }
  }, beforeEarnBits, { timeout: 4000 });
  pass('Stage 1 tabs unlock leaves a click target that still earns bits');
  // After tabs unlock: switching to another tab and back must not break the earn button.
  const achTab = await page.$('.mg-s1-tab[data-tab="achievements"]');
  if (achTab) {
    await page.click('.mg-s1-tab[data-tab="achievements"]');
    await page.waitForSelector('.mg-s1-panel[data-panel="achievements"]', { timeout: 4000 });
    await page.click('.mg-s1-tab[data-tab="bits"]');
    await page.waitForSelector('.mg-s1-earn', { timeout: 4000 });
    const bitsBeforeSwitch = await page.evaluate(() => JSON.parse(localStorage.getItem('fv:games:metagame:v3')).stageState[1].bits.m);
    await page.click('.mg-s1-earn');
    await page.waitForFunction((before) => {
      try { return JSON.parse(localStorage.getItem('fv:games:metagame:v3')).stageState[1].bits.m > before; } catch { return false; }
    }, bitsBeforeSwitch, { timeout: 4000 });
    pass('Stage 1 earn button works after switching to achievements tab and back');
  } else {
    fail('Stage 1 achievements tab not visible after tab unlock with 10M totalBits');
  }
  // Interaction-robustness regressions: buy buttons must never use the native `disabled` attribute
  // (toggled every 100ms tick, it swallowed mid-press clicks); locked state is the .mg-buy-locked
  // class only. (Clicks themselves are delegated on the stable panel — covered by the earn test above.)
  const buyBtns = await page.$$eval('.mg-s1-buybtn', (btns) => ({
    count: btns.length,
    anyNativeDisabled: btns.some((b) => b.disabled),
  }));
  if (buyBtns.count > 0 && !buyBtns.anyNativeDisabled) pass('Stage 1 buy buttons stay clickable (no native disabled flicker)');
  else fail('Stage 1 buy buttons use native disabled: ' + JSON.stringify(buyBtns));
  // Score is an absolute overlay so revealing it never reflows the play area (and shifts the button).
  const scorePos = await page.$eval('.mg-s1-hud', (el) => getComputedStyle(el).position).catch(() => null);
  if (scorePos === 'absolute') pass('Stage 1 score HUD is an absolute top-right overlay'); else fail('Stage 1 score HUD position: ' + scorePos);
  // Help affordance now lives in the metagame header next to SFX.
  const helpInHeader = await page.$eval('.mg-v3-head-actions .mg-help-btn', (el) => !el.hidden).catch(() => false);
  if (helpInHeader) pass('Stage 1 help button appears in the header next to SFX'); else fail('Stage 1 header help button missing/hidden');
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
    // The cipher.txt + challenge-boss actions only surface once the final floor is reached
    // (boss.reached); preset it so the boss flow is exercisable without walking all floors.
    save.stageState = save.stageState || {};
    save.stageState[2] = { run: { boss: { reached: true } } };
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
  // Boss un-cheat: the SEED-DERIVED restoration key lives only in the diff of the two memory logs.
  // (Opening a generated file prompts the discard guard — accepted via the dialog handler above.)
  await page.click('[data-action="v1"]');
  await page.waitForFunction(() => window.__fv.state.intake?.filename === 'memory_v1.log', null, { timeout: 5000 });
  const v1Text = await page.evaluate(() => window.__fv.state.intake.text);
  const chunks = [...v1Text.matchAll(/restoration chunk (\S+)/g)].map((m) => m[1]);
  if (chunks.length === 3 && chunks.every((c) => c && c !== '[missing]')) pass('Stage 3 memory_v1.log carries the run restoration chunks'); else fail('Stage 3 v1 chunks: ' + JSON.stringify(chunks));
  // v2 (corrupted) has those chunks stripped — confirm the diff is real.
  await page.click('[data-action="v2"]');
  await page.waitForFunction(() => window.__fv.state.intake?.filename === 'memory_v2.log', null, { timeout: 5000 });
  const v2Text = await page.evaluate(() => window.__fv.state.intake.text);
  if (/\[missing\]/.test(v2Text) && !chunks.some((c) => v2Text.includes(c))) pass('Stage 3 memory_v2.log shows the chunks as [missing] (the diff)'); else fail('Stage 3 v2 should hide the chunks');
  await page.waitForSelector('.stage3-memory-grid', { timeout: 8000 });
  await page.fill('.s3-key', chunks.join(''));
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
  // Boss is not start-reachable: the confront button is hidden until the final wave.
  const s4ConfrontEarly = await page.$('.stage4-fractal-bastion [data-action="confront"]:not([hidden])');
  if (s4ConfrontEarly) throw new Error('Stage 4 boss reachable before the final wave');
  await page.waitForSelector('.stage4-fractal-bastion [data-action="start-wave"]', { timeout: 4000 });
  // The tower-defense actually runs: start wave 1 and advance it to completion (deterministic hook).
  await page.evaluate(() => { window.__fvStage4.startWave(); window.__fvStage4.advance(30000); });
  const s4Wave = await page.evaluate(() => window.__fvStage4.state().waveNumber);
  if (s4Wave >= 2) pass('Stage 4 tower-defense runs: wave 1 resolves and advances'); else fail('Stage 4 wave did not advance: ' + s4Wave);
  // Stage-clear gate (un-cheat): read the recursion blueprint.
  await page.click('[data-action="blueprint"]');
  await page.waitForFunction(() => window.__fv.state.intake?.filename === 'recursion_points.json', null, { timeout: 5000 });
  await page.waitForFunction(() => {
    try {
      const save = JSON.parse(localStorage.getItem('fv:games:metagame:v3'));
      return Boolean(save.actions?.['4.recursion_blueprint_read'] && save.achievements?.['stage4.recursion_blueprint_read']);
    } catch { return false; }
  }, null, { timeout: 5000 });
  // Reach the final wave (a real run clears 30 waves) and cover the recursion points, then confront.
  await page.evaluate(() => {
    window.__fvStage4.setWave(31);
    for (const p of window.__fvStage4.state().recursion.points) window.__fvStage4.place(p.x, p.y, 'pulse_node');
  });
  await page.waitForSelector('.stage4-fractal-bastion [data-action="confront"]:not([hidden])', { timeout: 4000 });
  await page.click('[data-action="confront"]');
  await page.waitForFunction(() => {
    try {
      const save = JSON.parse(localStorage.getItem('fv:games:metagame:v3'));
      return save.defeated?.includes(4) && save.unlockedStages?.includes(5);
    } catch { return false; }
  }, null, { timeout: 5000 });
  pass('Stage 4 clears via blueprint un-cheat + recursion-point coverage at the final wave');

  await page.waitForSelector('.stage5-signal-racer', { timeout: 8000 });
  // The thin-gate bypass is gone: there is no "simulate full loop" calibrate button.
  const s5NoBypass = await page.evaluate(() => !document.querySelector('[data-action="calibrate"]') && Boolean(window.__fvStage5) && document.querySelectorAll('[data-start-round]').length === 7);
  if (s5NoBypass) pass('Stage 5 is a real racer: 7 rounds + engine hook, no simulate-loop bypass'); else fail('Stage 5 bypass present or game not wired');
  // The Jammer is gated behind the full run: from a fresh start the boss round is locked.
  const s5Gate = await page.evaluate(() => ({ cleared: window.__fvStage5.state().run.clearedRounds, bossLocked: document.querySelector('[data-start-round="6"]')?.disabled }));
  if (s5Gate.cleared === 0 && s5Gate.bossLocked) pass('Stage 5 boss is locked until the run is cleared'); else fail('Stage 5 boss reachable from start');
  // Play the six real rounds to reach the jammer.
  const s5Cleared = await page.evaluate(() => window.__fvStage5.solveRun());
  if (s5Cleared === 6) pass('Stage 5 run cleared: rounds 1–6 played to reach The Jammer'); else fail(`Stage 5 only cleared ${s5Cleared}/6 rounds`);
  // Load-bearing un-cheat: the jammer is unwinnable WITHOUT the calibrated counter-wave.
  const s5Uncal = await page.evaluate(() => ({ outcome: window.__fvStage5.solveBoss(), defeated: window.__fvStage5.state().boss.defeated }));
  if (s5Uncal.outcome === 'fail' && !s5Uncal.defeated) pass('Stage 5 jammer is unwinnable without calibration (load-bearing un-cheat)'); else fail('Stage 5 boss beatable without calibration');
  // Open transmission_hum.mp3 (the real un-cheat is 14s of continuous playback in the media viewer).
  await page.click('[data-action="audio"]');
  await page.waitForFunction(() => window.__fv.state.intake?.filename === 'transmission_hum.mp3' && window.__fv.state.type.id === 'media', null, { timeout: 5000 });
  // Calibrate via the genuine counter-wave timeline (sets the same action the media-playback un-cheat does).
  await page.evaluate(() => window.__fvStage5.calibrate());
  await page.waitForFunction(() => {
    try {
      const save = JSON.parse(localStorage.getItem('fv:games:metagame:v3'));
      return Boolean(save.actions?.['5.counter_wave_calibrated'] && save.achievements?.['stage5.counter_wave_calibrated']);
    } catch { return false; }
  }, null, { timeout: 5000 });
  // Now the cleared run + calibrated counter-wave defeats The Jammer.
  await page.evaluate(() => window.__fvStage5.solveBoss());
  await page.waitForFunction(() => {
    try {
      const save = JSON.parse(localStorage.getItem('fv:games:metagame:v3'));
      return save.defeated?.includes(5) && save.unlockedStages?.includes(6);
    } catch { return false; }
  }, null, { timeout: 5000 });
  pass('Stage 5: full run + calibrated counter-wave defeats Signal Racer');

  await page.waitForSelector('.stage6-protocol-codex', { timeout: 8000 });
  // The deck-builder hub is the entry point: the ONLY way to the boss is a full run (no bypass).
  await page.waitForSelector('.s6db-hub [data-action="begin-run"]', { timeout: 4000 });
  // Uniqueness guard: there is no "confront The Refused Connection" hub bypass anymore.
  const hubHasConfront = await page.$('.s6db-hub [data-action="confront"]');
  if (hubHasConfront) throw new Error('Stage 6 hub still exposes the confront bypass');
  pass('Stage 6 Protocol Codex opens on the deck-builder hub (no boss bypass)');
  // A run is the game body; verify the act-map loop is live.
  await page.click('.s6db-hub [data-action="begin-run"]');
  await page.waitForSelector('.s6db-map .s6db-node.is-available[data-node]', { timeout: 4000 });
  pass('Stage 6 run begins: act map offers routable nodes');
  // Reach the act-4 boss via the deterministic test hook with a winnable deck (a real run would
  // clear acts 1–3 and build this deck itself). The boss is fought with this REAL deck.
  await page.evaluate(() => window.__fvStage6.jumpToBoss(
    ['SYN', 'SYN', 'SYN', 'SYN', 'SYN', 'ACK', 'ACK', 'ACK', 'ACK', 'SEGMENT']
  ));
  // It is a real combat (data-play hand), not the retired 3-button puzzle.
  await page.waitForSelector('.s6db-combat .s6db-boss-banner.is-locked', { timeout: 4000 });
  pass('Stage 6 boss is a real-deck fight reached only through a run');
  // Un-cheat is load-bearing: while ch9 is unread, a correct attack sequence deals 0 (boss HP unchanged).
  const lockedAttack = await page.evaluate(() => window.__fvStage6.autoNegotiate(3));
  if (lockedAttack.enemyHp !== 60 || lockedAttack.bossDefeated) {
    throw new Error(`Stage 6 boss took damage while ch9 locked: ${JSON.stringify(lockedAttack)}`);
  }
  pass('Stage 6 boss is unwinnable until Chapter 9 is read (locked Signals deal 0)');
  // Stage-clear gate (un-cheat): read the codex from the boss banner to unlock the negotiation.
  await page.click('.s6db-combat .s6db-boss-banner [data-action="epub"]');
  await page.waitForFunction(() => window.__fv.state.intake?.filename === 'protocols_of_the_entity.epub' && window.__fv.state.type.id === 'epub', null, { timeout: 5000 });
  await page.waitForFunction(() => {
    try {
      const save = JSON.parse(localStorage.getItem('fv:games:metagame:v3'));
      return Boolean(save.actions?.['6.protocol_ch9_read'] && save.achievements?.['stage6.protocol_ch9_read']);
    } catch { return false; }
  }, null, { timeout: 5000 });
  // With ch9 read the negotiation is unlocked: clear the fight with the real deck (correct handshake).
  await page.evaluate(() => window.__fvStage6.autoNegotiate());
  await page.waitForFunction(() => {
    try {
      const save = JSON.parse(localStorage.getItem('fv:games:metagame:v3'));
      return save.defeated?.includes(6) && save.unlockedStages?.includes(7);
    } catch { return false; }
  }, null, { timeout: 5000 });
  pass('Stage 6 codex gate clears Protocol Codex via the real-deck negotiation');

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
  // The survival sim is wired: node health bars render from the 14-node state + an Advance Cycle
  // control and the engine hook exist (engine correctness is covered by engine.test).
  await page.waitForSelector('.stage8-entropy-field .s8-node .s8-node-bar', { timeout: 4000 });
  await page.waitForSelector('.stage8-entropy-field [data-action="advance"]', { timeout: 4000 });
  const s8Wired = await page.evaluate(() => Boolean(window.__fvStage8) && window.__fvStage8.state().nodes.length === 14);
  if (s8Wired) pass('Stage 8 survival sim wired: 14 node health bars + Advance Cycle + engine hook'); else fail('Stage 8 sim not wired');
  // Un-cheat (unchanged): archive salvaged debris to reach the threshold, then challenge Heat Death.
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
  // The timing game is wired: a live rotating ASCII ring renders + OBSERVE/CROSS controls exist.
  await page.waitForSelector('.stage9-observer-state [data-action="observe"]', { timeout: 4000 });
  await page.waitForSelector('.stage9-observer-state [data-action="cross"]', { timeout: 4000 });
  const s9Wired = await page.evaluate(() => Boolean(window.__fvStage9) && /[─│+]/.test(document.querySelector('.s9-arena')?.textContent || ''));
  if (s9Wired) pass('Stage 9 timing game wired: rotating ring + OBSERVE/CROSS + engine hook'); else fail('Stage 9 ring not wired');
  // The boss is gated behind the run: the player starts on a sublevel, not at the Observer.
  const s9StartLevel = await page.evaluate(() => window.__fvStage9.state().currentLevel);
  if (s9StartLevel < 18) pass('Stage 9 starts on a sublevel (boss gated behind the full run)'); else fail('Stage 9 started at the boss');
  // Un-cheat (load-bearing): read service-worker-notes.txt, then activate offline mode so the boss
  // seed is fixed (online the gap reseeds every OBSERVE → unbeatable).
  await page.click('[data-action="notes"]');
  await page.waitForFunction(() => window.__fv.state.intake?.filename === 'service-worker-notes.txt', null, { timeout: 5000 });
  await page.click('[data-action="offline"]');
  await page.waitForFunction(() => {
    try {
      const save = JSON.parse(localStorage.getItem('fv:games:metagame:v3'));
      return Boolean(save.actions?.['9.offline_mode_activated'] && save.achievements?.['stage9.offline_mode_activated']);
    } catch { return false; }
  }, null, { timeout: 5000 });
  // Drive the real run: clear every sublevel by CROSSing on its solve timing, then cross the boss
  // on the learned offline timing. (Not a bypass — each level is a genuine timed CROSS.)
  await page.evaluate(() => window.__fvStage9.solveOffline());
  await page.waitForFunction(() => {
    try {
      const save = JSON.parse(localStorage.getItem('fv:games:metagame:v3'));
      return save.defeated?.includes(9) && save.unlockedStages?.includes(10);
    } catch { return false; }
  }, null, { timeout: 5000 });
  pass('Stage 9: full run cleared + offline-timed CROSS defeats Observer State');

  await page.waitForSelector('.mg-stage10', { timeout: 8000 });
  // Stage 10 presents one memory at a time: read -> pick a stance -> integrate -> advance with Next.
  for (let i = 0; i < 9; i++) {
    await page.waitForSelector('[data-read-memory]', { timeout: 5000 });
    await page.click('[data-read-memory]');
    await page.waitForSelector('[data-resolve-memory]', { timeout: 5000 });
    await page.click('[data-resolve-memory]');
    await page.waitForSelector('[data-integrate-memory]', { timeout: 5000 });
    await page.click('[data-integrate-memory]');
    if (i < 8) await page.click('[data-step="1"]');
  }
  await page.waitForFunction(() => {
    try {
      const save = JSON.parse(localStorage.getItem('fv:games:metagame:v3'));
      return Boolean(save.actions?.['10.memory_resolved'] && save.achievements?.['stage10.memory_resolved'] && save.achievements?.['stage10.full_capstone']);
    } catch { return false; }
  }, null, { timeout: 5000 });
  await page.waitForSelector('[data-goto-final]', { timeout: 5000 });
  await page.click('[data-goto-final]');
  await page.waitForSelector('[data-final-choice="continue"]', { timeout: 5000 });
  await page.click('[data-final-choice="continue"]');
  await page.waitForFunction(() => {
    try {
      const save = JSON.parse(localStorage.getItem('fv:games:metagame:v3'));
      return save.defeated?.includes(10) && save.stageState?.[10]?.final?.completed;
    } catch { return false; }
  }, null, { timeout: 5000 });
  const finalOutcome = await page.$eval('[data-field="finalOutcome"]', (el) => el.textContent);
  if (/full capstone/i.test(finalOutcome) && /9 memories resolved, 9 integrated/.test(finalOutcome)) pass('Stage 10 final outcome summarizes the completed route'); else fail('Stage 10 final outcome summary unexpected: ' + finalOutcome);
  // The ending narration (awakeningText) now renders on completion; capstone gets the extra line.
  const awakening = await page.$eval('[data-field="awakening"]', (el) => el.textContent);
  if (/They were the awakening/i.test(awakening) && /Every memory answered back/i.test(awakening)) pass('Stage 10 renders the awakening ending (capstone)'); else fail('Stage 10 awakening ending unexpected: ' + awakening);
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
