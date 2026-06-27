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
  // Lazy loader: the canvas mounts immediately but level/solution data loads async — wait for it.
  await page.waitForFunction(() => {
    const w = document.querySelector('.sokoban-wrap');
    return w?.__sokoban?.state().loaded && typeof w.__sokoban.solution() === 'string';
  }, { timeout: 8000 });
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
  if (skSets.hasPicker && skSets.count === 12 && ['microban2', 'yoshio', 'sasquatch', 'sasquatch2', 'unsolved'].every((id) => skSets.options.includes(id)))
    pass('Sokoban: set picker lists all ' + skSets.count + ' sets (incl. Sasquatch + unsolved)');
  else fail('Sokoban picker: ' + JSON.stringify(skSets));
  // Switching is async (lazy load) — await chooseSet + whenReady so the new set's solution is loaded.
  const skSwitch = await page.$eval('.sokoban-wrap', async (w) => {
    await w.__sokoban.chooseSet('microban2');
    await w.__sokoban.whenReady();
    const st = w.__sokoban.state();
    const plan = w.__sokoban.solution();
    const out = { setId: st.setId, total: st.total, levelIndex: st.levelIndex, solved: st.solved, score: st.score,
      hasSol: typeof plan === 'string' && plan.length > 0 };
    await w.__sokoban.chooseSet('microban');                 // restore default so persisted state stays microban
    await w.__sokoban.whenReady();
    return out;
  });
  if (skSwitch.setId === 'microban2' && skSwitch.total === 135 && skSwitch.levelIndex === 0 && skSwitch.solved === 0 && skSwitch.score === 0 && skSwitch.hasSol)
    pass('Sokoban: choosing Microban II switches set (135 levels, fresh start, stored solution)');
  else fail('Sokoban set switch: ' + JSON.stringify(skSwitch));
  // Level selector: jump to an arbitrary level (free navigation, no score reset).
  const skJump = await page.$eval('.sokoban-wrap', (w) => {
    const opts = w.querySelectorAll('.sokoban-level option').length;
    w.__sokoban.chooseLevel(7);
    const st = w.__sokoban.state();
    return { opts, levelIndex: st.levelIndex, selVal: w.querySelector('.sokoban-level').value };
  });
  if (skJump.opts === 156 && skJump.levelIndex === 7 && skJump.selVal === '7')
    pass('Sokoban: level selector jumps to an arbitrary level (' + skJump.opts + ' options)');
  else fail('Sokoban level jump: ' + JSON.stringify(skJump));
  // Unsolved Challenges batch: loads + renders, but has no stored solution (Solve degrades gracefully).
  const skUnsolved = await page.$eval('.sokoban-wrap', async (w) => {
    await w.__sokoban.chooseSet('unsolved');
    await w.__sokoban.whenReady();
    const st = w.__sokoban.state();
    const out = { setId: st.setId, total: st.total, boxes: st.boxes, sol: w.__sokoban.solution() };
    await w.__sokoban.chooseSet('microban');                 // restore default
    await w.__sokoban.whenReady();
    return out;
  });
  if (skUnsolved.setId === 'unsolved' && skUnsolved.total === 48 && skUnsolved.boxes >= 1 && !skUnsolved.sol)
    pass('Sokoban: Unsolved Challenges batch loads + renders with no stored solution');
  else fail('Sokoban unsolved batch: ' + JSON.stringify(skUnsolved));
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
  if (freshSave?.version === 5 && freshSave.unlockedStages?.includes(1) && freshSave.stageState?.[1]) {
    pass('Defragmenter initializes fresh v5 save with Stage 1');
  } else {
    fail('Defragmenter v5 save invalid: ' + JSON.stringify(freshSave));
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

  // ── Stage 1 prestige loop + boss, driven deterministically via window.__fvStage1 (no real-time wait) ──
  await page.waitForFunction(() => !!window.__fvStage1, null, { timeout: 8000 });
  // Each prestige unlocks ONE post-prestige mechanic, in order.
  const mechProgress = await page.evaluate(() => {
    const out = [];
    for (let i = 1; i <= 5; i++) { window.__fvStage1.prestige(); out.push(window.__fvStage1.mechanics()); }
    return out;
  });
  if (mechProgress[0].includes('pipeline') && mechProgress[1].includes('flux') && mechProgress[2].includes('entropy')
      && mechProgress[3].includes('echoes') && mechProgress[4].includes('resonance') && mechProgress[4].length === 5)
    pass('Stage 1 prestige depth unlocks pipeline→flux→entropy→echoes→resonance');
  else fail('Stage 1 mechanic unlock order wrong: ' + JSON.stringify(mechProgress));
  const cores = await page.evaluate(() => window.__fvStage1.state().cores);
  if (cores >= 5) pass('Stage 1 prestige grants persistent Cores (' + cores + ')'); else fail('Stage 1 cores after 5 prestiges: ' + cores);

  // Pipeline: wire the Signal Booster and confirm it auto-routes Bit Boxes via tick-count alone.
  const pipe = await page.evaluate(() => {
    window.__fvStage1.grind();
    const s = window.__fvStage1.state();
    s.pipelines = { 's1-boost': true };
    const before = s.owned['s1-box'] || 0;
    window.__fvStage1.tick(120);   // > one 5 s booster cycle (50 ticks)
    return { before, after: window.__fvStage1.state().owned['s1-box'] || 0 };
  });
  if (pipe.after > pipe.before) pass('Stage 1 Pipeline auto-routes builder output (boxes ' + pipe.before + '→' + pipe.after + ')');
  else fail('Stage 1 Pipeline did not produce: ' + JSON.stringify(pipe));

  // Flux: the burst meter charges per tick and auto-fires a boost at 100%.
  const flux = await page.evaluate(() => {
    const s = window.__fvStage1.state();
    s.flux = { meter: 0, boostMult: 1, boostTicks: 0 };
    window.__fvStage1.tick(60);
    const meter = window.__fvStage1.state().flux.meter;
    window.__fvStage1.tick(120);
    const f = window.__fvStage1.state().flux;
    return { meter, boostTicks: f.boostTicks, boostMult: f.boostMult };
  });
  if (flux.meter > 0 && flux.boostTicks > 0 && flux.boostMult === 3) pass('Stage 1 Flux meter charges and fires a ×3 boost at 100%');
  else fail('Stage 1 Flux did not charge/fire: ' + JSON.stringify(flux));

  // Entropy: an unmanaged, unwired tier loses a unit on the minute boundary.
  const entropy = await page.evaluate(() => {
    const s = window.__fvStage1.state();
    s.owned['s1-box'] = 10; s.pipelines = {}; s.managers = {};
    s.ticks = 599;   // next tick → 600 (one game-minute) triggers decay
    window.__fvStage1.tick(1);
    return window.__fvStage1.state().owned['s1-box'];
  });
  if (entropy === 9) pass('Stage 1 Entropy decays an unprotected tier (10→9)'); else fail('Stage 1 Entropy decay wrong: ' + entropy);

  // Echoes: a corrupted glyph spawns on cadence and resolves on click.
  const echo = await page.evaluate(() => {
    const s = window.__fvStage1.state();
    s.echo = { active: false, spawnTick: 0, expireTick: 0, lastTick: (s.ticks || 0) - 1300 };
    window.__fvStage1.tick(1);
    const active = window.__fvStage1.state().echo.active;
    return { active, cleared: window.__fvStage1.clickEcho() };
  });
  if (echo.active && echo.cleared) pass('Stage 1 Defrag Echo spawns and resolves on click'); else fail('Stage 1 Echo flow wrong: ' + JSON.stringify(echo));

  // Resonance: hitting the hidden box:booster ratio is discovered.
  const reso = await page.evaluate(() => {
    const s = window.__fvStage1.state();
    s.owned['s1-boost'] = 1; s.owned['s1-box'] = 3;   // ratio 3 → within the 2–4 band
    window.__fvStage1.tick(1);
    return Boolean((window.__fvStage1.state().resonanceFound || {})['box-boost']);
  });
  if (reso) pass('Stage 1 Resonance discovered at the box:booster sweet spot'); else fail('Stage 1 Resonance not discovered');

  // Boss gate is real, and the boss is UNWINNABLE while the cheat is active (un-cheat is load-bearing).
  const gate = await page.evaluate(() => {
    const s = window.__fvStage1.state();
    s.owned = {}; s.bits = { m: 0, e: 0 };
    const before = window.__fvStage1.fightBoss();
    window.__fvStage1.grind();
    const after = window.__fvStage1.fightBoss({ tapsPerSec: 12 });
    return { before, after };
  });
  if (gate.before.gated) pass('Stage 1 boss gated until all tiers owned + bits ≥ ticket'); else fail('Stage 1 boss not gated from start: ' + JSON.stringify(gate.before));
  if (!gate.after.gated && gate.after.cheatActive && !gate.after.won)
    pass('Stage 1 boss is unwinnable while the cheat is active');
  else fail('Stage 1 boss should lose while cheating: ' + JSON.stringify(gate.after));

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

  // Re-open Stage 1 (cheat now disabled via the REAL raw-edit) and win the boss through the same
  // deterministic scoring model — a fair fight is winnable, recorded through the orchestrator.
  await page.evaluate(() => { window.__fv.games.open(); });
  await page.waitForSelector('.games-overlay:not([hidden])', { timeout: 8000 });
  await page.click('.games-card[data-game="metagame"]');
  await page.waitForSelector('.mg-s1', { timeout: 8000 });
  await page.waitForFunction(() => !!window.__fvStage1, null, { timeout: 8000 });
  const bossWin = await page.evaluate(() => { window.__fvStage1.grind(); return window.__fvStage1.fightBoss({ tapsPerSec: 12 }); });
  if (bossWin.won && bossWin.cheatActive === false) pass('Stage 1 boss won after the raw-edit un-cheat (fair fight)');
  else fail('Stage 1 boss not won after un-cheat: ' + JSON.stringify(bossWin));
  const s1Defeated = await page.evaluate(() => { try { return (JSON.parse(localStorage.getItem('fv:games:metagame:v3')).defeated || []).includes(1); } catch { return false; } });
  if (s1Defeated) pass('Stage 1 victory recorded through the orchestrator (defeated includes 1)'); else fail('Stage 1 defeat not recorded by orchestrator');
  await page.click('.games-close');

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
  await page.waitForFunction(() => !!window.__fvStage2, null, { timeout: 8000 });

  // Regression: collecting a glyph rune (the pink ♦ consumable) must (a) not throw and (b) survive a
  // save round-trip. The entity inventory was once a legacy ["minor_parse_potion"] ARRAY, so a rune
  // banked as inv[type]++ became a non-index property the JSON serialiser silently DROPPED — the
  // "picked-up diamond vanishes / breaks the rune bar" bug. inventory must be a plain type→count object.
  const runePickup = await page.evaluate(() => {
    const st = window.__fvStage2.state();
    const e = st.run.entity;
    const invIsObject = e.inventory && typeof e.inventory === 'object' && !Array.isArray(e.inventory);
    const w = st.run.world;
    let placed = false;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = w.pos.x + dx, ny = w.pos.y + dy;
      if (w.grid[ny] && w.grid[ny][nx] === '.') {
        w.monsters = (w.monsters || []).filter((m) => !(m.x === nx && m.y === ny));
        (w.consumables = w.consumables || []).push({ x: nx, y: ny, type: 'blink', taken: false });
        const dir = dx === 1 ? 'right' : dx === -1 ? 'left' : dy === 1 ? 'down' : 'up';
        window.__fvStage2.move(dir);
        placed = true;
        break;
      }
    }
    const live = Number((e.inventory || {}).blink || 0);
    const survivesSave = Number((JSON.parse(JSON.stringify(e.inventory || {})).blink) || 0); // JSON-drop check
    return { invIsObject, placed, live, survivesSave };
  });
  if (runePickup.invIsObject && runePickup.placed && runePickup.live === 1 && runePickup.survivesSave === 1)
    pass('Stage 2 glyph rune (♦) collects without error and survives a save round-trip');
  else fail('Stage 2 rune pickup/save regression: ' + JSON.stringify(runePickup));

  // Descend the full body — all three acts (Warrens / Cisterns & Emberworks / The Overflow) — to the
  // boss via the deterministic body solver (no real-time roguelite play). Confirms the boss sits at
  // the END of the 9-floor body and is reachable only after the descent (MAX_FLOOR=9).
  const body = await page.evaluate(() => window.__fvStage2.bodySolver());
  if (body.reached && body.floor >= 9) pass('Stage 2 body: descended all 3 acts to the floor-9 boss'); else fail('Stage 2 body solver: ' + JSON.stringify(body));

  // The boss is gated: attempting it before the cipher.txt search un-cheat must stay LOCKED.
  const lockedPre = await page.evaluate(() => { window.__fvStage2.bossSolver(); return window.__fvStage2.lockState().unlocked; });
  if (lockedPre === false) pass('Stage 2 boss starts locked before search action'); else fail('Stage 2 boss not locked pre-search');

  await page.evaluate(async () => {
    await window.__fv.searchViewerFile('/docs/examples/metagame/stage2/cipher.txt', 'PASSAGE');
  });
  await page.waitForFunction(() => {
    try {
      const save = JSON.parse(localStorage.getItem('fv:games:metagame:v3'));
      return Boolean(save.actions?.['2.search_passage'] && save.achievements?.['stage2.search_passage']);
    } catch { return false; }
  }, null, { timeout: 5000 });
  await page.waitForFunction(() => window.__fvStage2 && window.__fvStage2.lockState().unlocked, null, { timeout: 5000 });
  pass('Stage 2 search action unlocks boss and achievement');

  await page.evaluate(() => window.__fvStage2.bossSolver());
  await page.waitForFunction(() => {
    try {
      const save = JSON.parse(localStorage.getItem('fv:games:metagame:v3'));
      return save.defeated?.includes(2) && save.unlockedStages?.includes(3);
    } catch { return false; }
  }, null, { timeout: 5000 });
  pass('Stage 2 defeat unlocks Stage 3 through v3 orchestrator');

  await page.click('.mg-v3-stage[data-stage="3"]');
  await page.waitForSelector('.stage3-memory-grid', { timeout: 8000 });
  await page.waitForFunction(() => !!window.__fvStage3, null, { timeout: 8000 });
  const s3Locked = await page.$eval('[data-field="bossStatus"]', (el) => el.textContent);
  if (/LOCKED/.test(s3Locked) && /missing/.test(s3Locked)) pass('Stage 3 boss starts locked with missing column clues'); else fail('Stage 3 initial status: ' + s3Locked);

  // Boss-never-from-start: a fresh run has NOT reached corruption 8, so the boss is unreachable even
  // if the player already knows the key. Restoring it now must be REFUSED (no unlock, no defeat).
  const s3Bypass = await page.evaluate(() => {
    const key = window.__fvStage3.deriveKey();
    const restore = window.__fvStage3.tryRestoreKey(key);
    return { reached: window.__fvStage3.state().boss.corruption8Reached, restoreOk: restore.ok, restoreLocked: restore.locked, defeated: window.__fvStage3.bossSolver() };
  });
  if (!s3Bypass.reached && !s3Bypass.restoreOk && s3Bypass.restoreLocked && !s3Bypass.defeated)
    pass('Stage 3 boss is unreachable from start (key refused before corruption 8)');
  else fail('Stage 3 boss bypassable from start: ' + JSON.stringify(s3Bypass));

  // Play the BODY: solve snapshots until corruption peaks at 8 (deterministic, no real-time play).
  const s3Body = await page.evaluate(() => window.__fvStage3.bodySolver());
  if (s3Body.reached && s3Body.corruption >= 8) pass('Stage 3 body: solved snapshots to peak corruption 8 (' + s3Body.solved + ' solves)');
  else fail('Stage 3 body solver: ' + JSON.stringify(s3Body));
  // The deep tiers are live: the corruption-8 snapshot now on screen is a two-colour nonogram (the
  // body solver fast-forwarded through volatile cells + the decay clock + two-colour to get here).
  const s3Tiers = await page.evaluate(() => ({
    bClues: document.querySelectorAll('.s3-clue.s3-clue-b').length,
    mode: document.querySelector('[data-field="size"]').textContent,
  }));
  if (s3Tiers.bClues > 0 && /2-colour/.test(s3Tiers.mode)) pass('Stage 3 two-colour snapshot renders colour-B clues at peak corruption');
  else fail('Stage 3 two-colour tier not rendered: ' + JSON.stringify(s3Tiers));
  // Body done but key not yet restored → still LOCKED.
  const s3MidLock = await page.evaluate(() => window.__fvStage3.state().boss.unlocked);
  if (!s3MidLock) pass('Stage 3 boss stays locked after the body until the diff un-cheat'); else fail('Stage 3 boss unlocked without the diff');

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
  // Stage 4 is a 5-map campaign. It opens on map-select; the boss is NOT start-reachable — the
  // confront-the-loop button is disabled until ALL FIVE maps are cleared (stronger than the old gate).
  const s4Start = await page.evaluate(() => ({
    status: window.__fvStage4.status(),
    maps: window.__fvStage4.state().campaign.clearedMaps.length,
    bossLocked: document.querySelector('.stage4-mapselect [data-action="boss"]')?.disabled === true,
    bossUnlocked: window.__fvStage4.bossUnlocked(),
    rows: document.querySelectorAll('.stage4-mapselect .s4-maprow').length,
  }));
  if (s4Start.status === 'map-select' && s4Start.rows === 5 && s4Start.maps === 0 && s4Start.bossLocked && !s4Start.bossUnlocked) pass('Stage 4 campaign: 5-map select, boss gated behind all maps (no start bypass)'); else fail('Stage 4 campaign gate wrong: ' + JSON.stringify(s4Start));
  // A real map actually plays: enter map 1, start its first wave, advance it to completion.
  const s4Map = await page.evaluate(() => {
    window.__fvStage4.selectMap(0);
    window.__fvStage4.startWave();
    window.__fvStage4.advance(40000);
    return { status: window.__fvStage4.status(), wave: window.__fvStage4.state().waveNumber };
  });
  if (s4Map.status === 'combat' && s4Map.wave >= 2) pass('Stage 4 tower-defense runs: map 1 wave 1 resolves and advances'); else fail('Stage 4 map did not play: ' + JSON.stringify(s4Map));
  // TD DEPTH PASS: a new damage-type tower builds, upgrades to L3, and forks (tier-3 branching), and a
  // status tower applies an effect on hit in the live engine. Exercises damage types + status + roster.
  const s4Depth = await page.evaluate(() => {
    const h = window.__fvStage4;
    h.state().cycles = 6000; // afford the upgrades/forks in this smoke
    const p = h.place(10, 10, 'pulse_node');
    const id = p.tower.id;
    h.upgrade(id); h.upgrade(id);              // L1 → L2 → L3
    const forkRes = h.pickFork(id, 'emp_lance'); // irrevocable tier-3 fork
    const t = h.state().towers.find((x) => x.id === id);
    const builtThermal = h.place(12, 12, 'thermal_loop').ok; // a new damage-type (thermal/burn) tower
    // Drive one short wave so the status layer runs, then look for any applied status effect.
    h.setWave(1); h.startWave(); h.advance(8000);
    const anyStatus = h.state().enemies.some((e) => e.status && Object.keys(e.status).length);
    return { level: t.level, fork: t.fork, forkOk: forkRes.ok, builtThermal, anyStatus, enemies: h.state().enemies.length };
  });
  if (s4Depth.level === 3 && s4Depth.fork === 'emp_lance' && s4Depth.forkOk && s4Depth.builtThermal) pass('Stage 4 depth: new tower builds + upgrades to L3 + picks an irrevocable tier-3 fork'); else fail('Stage 4 tier-3 fork path broken: ' + JSON.stringify(s4Depth));
  // Reset the campaign back to a clean map-select so the boss-gate assertions below are unaffected.
  await page.evaluate(() => { const h = window.__fvStage4; const st = h.state(); st.towers = []; st.enemies = []; st.waveActive = false; h.leaveArmory?.(); });
  // Debug-seat the boss (smoke shortcut for clearing 150 waves; NOT a player affordance). The boss is
  // load-bearing-gated by the REAL blueprint un-cheat: BEFORE the file is opened it folds all damage
  // away even with full recursion-point coverage.
  const s4Locked = await page.evaluate(() => {
    window.__fvStage4.seatAtBoss();
    for (const p of window.__fvStage4.state().recursion.points) window.__fvStage4.place(p.x, p.y, 'pulse_node');
    const hpBefore = window.__fvStage4.state().boss.hp;
    window.__fvStage4.confront();
    const s = window.__fvStage4.state();
    return { status: s.campaign.status, defeated: s.boss.defeated, hpUnchanged: s.boss.hp === hpBefore };
  });
  if (s4Locked.status === 'boss' && !s4Locked.defeated && s4Locked.hpUnchanged) pass('Stage 4 boss is unwinnable before the blueprint file is opened (total-armor while locked)'); else fail('Stage 4 boss took damage / was defeated before the un-cheat: ' + JSON.stringify(s4Locked));
  // Un-cheat = a REAL file-open: click the navigation hint, which opens the static blueprint file in the
  // viewer. The action 4.recursion_blueprint_read is fired by openViewerFile → recordMetagameViewerOpen
  // (NOT by an in-game button), and the achievement auto-unlocks from the action.
  await page.click('.stage4-combat [data-action="blueprint"]');
  await page.waitForFunction(() => window.__fv.state.intake?.filename === 'recursion_points.json', null, { timeout: 5000 });
  await page.waitForFunction(() => {
    try {
      const save = JSON.parse(localStorage.getItem('fv:games:metagame:v3'));
      return Boolean(save.actions?.['4.recursion_blueprint_read']
        && save.actions['4.recursion_blueprint_read'].source === 'viewer-open'
        && save.achievements?.['stage4.recursion_blueprint_read']);
    } catch { return false; }
  }, null, { timeout: 5000 });
  // Now in the boss arena with coverage placed + the blueprint read, the confront lands and wins.
  await page.evaluate(() => window.__fvStage4.confront());
  await page.waitForFunction(() => {
    try {
      const save = JSON.parse(localStorage.getItem('fv:games:metagame:v3'));
      return save.defeated?.includes(4) && save.unlockedStages?.includes(5);
    } catch { return false; }
  }, null, { timeout: 5000 });
  pass('Stage 4 clears via blueprint un-cheat + recursion-point coverage after all maps cleared');

  await page.waitForSelector('.stage5-signal-racer', { timeout: 8000 });
  // The thin-gate bypass is gone: there is no "simulate full loop" calibrate button.
  const s5NoBypass = await page.evaluate(() => !document.querySelector('[data-action="calibrate"]') && Boolean(window.__fvStage5) && document.querySelectorAll('[data-start-round]').length === 9);
  if (s5NoBypass) pass('Stage 5 is a real racer: 9 rounds (incl. time-trial + fork relay) + engine hook, no simulate-loop bypass'); else fail('Stage 5 bypass present or game not wired');
  // Ascension ladder is wired (shared/ascension.js): 4 cumulative difficulty rungs available for replay.
  const s5Asc = await page.evaluate(() => window.__fvStage5.ascension());
  if (s5Asc.maxLevel === 4) pass('Stage 5 ascension ladder wired: 4 rungs (opt-in replay depth)'); else fail(`Stage 5 ascension maxLevel ${s5Asc.maxLevel}`);
  // The Jammer is gated behind the full run: from a fresh start the boss round (last) is locked.
  const s5Gate = await page.evaluate(() => ({ cleared: window.__fvStage5.state().run.clearedRounds, bossLocked: document.querySelector('[data-start-round="8"]')?.disabled }));
  if (s5Gate.cleared === 0 && s5Gate.bossLocked) pass('Stage 5 boss is locked until the run is cleared'); else fail('Stage 5 boss reachable from start');
  // Play the eight real body rounds (incl. the time-trial + fork relay) to reach the jammer.
  const s5Cleared = await page.evaluate(() => window.__fvStage5.solveRun());
  if (s5Cleared === 8) pass('Stage 5 run cleared: rounds 1–8 (incl. time-trial + fork relay) played to reach The Jammer'); else fail(`Stage 5 only cleared ${s5Cleared}/8 rounds`);
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
  // Phase I — daily/custom seed determinism (the seed is hashed ONCE at run creation, never live
  // entropy) + the self-competition score. The same date/custom key reproduces the same run seed.
  const s6seed = await page.evaluate(() => {
    window.__fvStage6.setDailyKey('2026-01-15');
    const d1 = window.__fvStage6.beginRun({ mode: 'daily' });
    const d2 = window.__fvStage6.beginRun({ mode: 'daily' });
    const c1 = window.__fvStage6.beginRun({ mode: 'custom', seedText: 'codex' });
    const c2 = window.__fvStage6.beginRun({ mode: 'custom', seedText: 'codex' });
    const c3 = window.__fvStage6.beginRun({ mode: 'custom', seedText: 'other' });
    const score = window.__fvStage6.score().run;
    return {
      dailyStable: d1.seed === d2.seed && d1.mode === 'daily' && d1.dailyKey === '2026-01-15',
      customStable: c1.seed === c2.seed && c1.mode === 'custom' && c1.dailyKey === 'codex',
      customDistinct: c1.seed !== c3.seed,
      scorePositive: score > 0,
    };
  });
  if (s6seed.dailyStable && s6seed.customStable && s6seed.customDistinct && s6seed.scorePositive) {
    pass('Stage 6 daily/custom seed is deterministic (same key ⇒ same run) and run score is scored');
  } else {
    fail(`Stage 6 seed/score wrong: ${JSON.stringify(s6seed)}`);
  }
  // Return to the hub for the rest of the flow (the seed checks left a run active).
  await page.click('.s6db-map [data-action="abandon"]');
  await page.waitForSelector('.s6db-hub [data-action="begin-run"]', { timeout: 4000 });
  // A run is the game body; verify the act-map loop is live.
  await page.click('.s6db-hub [data-action="begin-run"]');
  await page.waitForSelector('.s6db-map .s6db-node.is-available[data-node]', { timeout: 4000 });
  pass('Stage 6 run begins: act map offers routable nodes');
  // Reload-retry exploit closed: a real combat is CHECKPOINTED into the save mid-fight (run-state
  // 'combat' slot), so a reload resumes the same in-progress fight rather than re-rolling a fresh
  // one. Enter a combat, play one card, and confirm the persisted snapshot is a resumable partial
  // turn (not over, tagged with the run seed, with a card already played).
  await page.click('.s6db-map .s6db-node.is-available[data-node]');
  await page.waitForSelector('.s6db-combat .s6db-hand button[data-play]:not([disabled])', { timeout: 4000 });
  await page.click('.s6db-combat .s6db-hand button[data-play]:not([disabled])');
  await page.waitForFunction(() => {
    try {
      const save = JSON.parse(localStorage.getItem('fv:games:metagame:v3'));
      const snap = save.stageState?.[6]?.combat;
      return Boolean(snap && snap.over === false && (snap.cardsPlayedThisTurn || 0) >= 1);
    } catch { return false; }
  }, null, { timeout: 4000 });
  const s6resume = await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem('fv:games:metagame:v3'));
    const snap = save.stageState[6].combat;
    return {
      resumable: snap.over === false,
      seedTagged: snap.runSeed === save.stageState[6].run?.seed,
      atNode: snap.nodeId === save.stageState[6].run?.currentNodeId,
      played: (snap.cardsPlayedThisTurn || 0) >= 1,
      hasRng: typeof snap.rngSeed === 'number' && (snap.rngSteps || 0) > 0,
    };
  });
  if (s6resume.resumable && s6resume.seedTagged && s6resume.atNode && s6resume.played && s6resume.hasRng) {
    pass('Stage 6 mid-combat is checkpointed to the save (reload resumes the same fight — exploit closed)');
  } else {
    fail(`Stage 6 combat not resumably checkpointed: ${JSON.stringify(s6resume)}`);
  }
  // Reach the act-4 boss via the deterministic test hook with a winnable deck (a real run would
  // clear acts 1–3 and build this deck itself). The boss is fought with this REAL deck.
  await page.evaluate(() => window.__fvStage6.jumpToBoss(
    ['SYN', 'SYN', 'SYN', 'SYN', 'SYN', 'ACK', 'ACK', 'ACK', 'ACK', 'SEGMENT']
  ));
  // Phase I — grant the 3 true-ending keys on this run so the negotiation opens the hidden superboss
  // (a real run earns them by playing the untouchable/ascetic/sacrifice challenges; this is the
  // deterministic test path). The superboss is PURE bonus combat — it adds no second un-cheat.
  const s6keys = await page.evaluate(() => window.__fvStage6.grantKeys(3));
  if (s6keys === 3) pass('Stage 6 true-ending keys granted (untouchable / ascetic / sacrifice)'); else fail(`Stage 6 keys not granted: ${s6keys}`);
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
  // With ch9 read the negotiation is unlocked: win it with the real deck. With 3 keys, this does NOT
  // immediately clear the stage — it diverts to the hidden superboss (stage completion is deferred).
  const s6neg = await page.evaluate(() => window.__fvStage6.autoNegotiate());
  if (s6neg.bossDefeated && !s6neg.won) pass('Stage 6 negotiation won; the 3 keys divert to the hidden superboss (not yet cleared)'); else fail(`Stage 6 negotiation/diversion wrong: ${JSON.stringify(s6neg)}`);
  // The superboss is a real-deck multi-phase fight (The Kernel of Refusal), no lock / no un-cheat.
  await page.waitForSelector('.s6db-combat', { timeout: 4000 });
  // Drive the superboss to its end with the real deck → the TRUE ending, which now clears the stage.
  const s6super = await page.evaluate(() => window.__fvStage6.autoSuperboss());
  if (s6super.ok && s6super.status === 'won' && s6super.trueEnding) pass('Stage 6 key-gated superboss defeated → true ending'); else fail(`Stage 6 superboss not won: ${JSON.stringify(s6super)}`);
  await page.waitForFunction(() => {
    try {
      const save = JSON.parse(localStorage.getItem('fv:games:metagame:v3'));
      return save.defeated?.includes(6) && save.unlockedStages?.includes(7);
    } catch { return false; }
  }, null, { timeout: 5000 });
  pass('Stage 6 cleared via real-deck negotiation + key-gated true-ending superboss');

  await page.waitForSelector('.stage7-identity-arbiter', { timeout: 8000 });
  // The thin-gate bypass is gone: no in-game "inspect GPSInfo" button, and the investigation hook exists.
  const s7Start = await page.evaluate(() => ({
    noBypass: !document.querySelector('[data-action="gps"]'),
    wired: Boolean(window.__fvStage7),
    substage: window.__fvStage7.state().substage,
    noCommit: !document.querySelector('[data-commit]'),
    noAccuse: !document.querySelector('[data-accuse]'),
  }));
  if (s7Start.noBypass && s7Start.wired && s7Start.substage === 1 && s7Start.noCommit && s7Start.noAccuse) pass('Stage 7 is a real 6-stage investigation: no GPS bypass, accusation+boss gated from start'); else fail('Stage 7 bypass present or boss/accusation reachable from start');
  // Work Case 1 (SS1 scan → SS2 dup → SS3 timeline) up to the reference chase.
  const s7AfterDeduction = await page.evaluate(() => window.__fvStage7.solveInvestigation());
  if (s7AfterDeduction === 4) pass('Stage 7 SS1–SS3 deductions advance to the reference chase'); else fail(`Stage 7 stalled at substage ${s7AfterDeduction}`);
  // SS4 Reference Chase: opening the real decommissioned-anchor exhibit breaks the chain → Case 2.
  await page.click('[data-action="open-anchor"]');
  await page.waitForFunction(() => window.__fvStage7?.state().substage === 5, null, { timeout: 5000 });
  pass('Stage 7 SS4: opening the anchor exhibit breaks the chain and opens Case 2 (Duplicate Roster)');
  // Case 2 is load-bearing: the rule-of-three triad cannot be completed until the route table is
  // actually opened in the viewer (the decisive fact card only exists after a real file-open).
  const s7Premature = await page.evaluate(() => window.__fvStage7.solveCase2());
  if (s7Premature.ok === false && s7Premature.substage === 5) pass('Stage 7 Case 2: accusation impossible before opening the route table (load-bearing)'); else fail('Stage 7 Case 2 solvable without the real file-open');
  // Open the real route table → mints the fact:route evidence card.
  await page.click('[data-action="open-source"][data-source="route_table_examined"]');
  await page.waitForFunction(() => Boolean(window.__fvStage7?.state().board.cards.some((c) => c.id === 'fact:route')), null, { timeout: 5000 });
  pass('Stage 7 Case 2: opening route_table.csv mints the decisive fact card on the evidence board');
  // Now the rule-of-three triad (entity K + route claim + route-table fact) confirms and reaches the boss.
  const s7Case2 = await page.evaluate(() => window.__fvStage7.solveCase2());
  if (s7Case2.solved && s7Case2.substage === 6) pass('Stage 7 Case 2: correct triad names the duplicate and reaches the EXIF boss'); else fail(`Stage 7 Case 2 accusation failed (${JSON.stringify(s7Case2)})`);
  // The metadata sidecar still carries the decisive GPS contradiction.
  const entitySidecar = await page.evaluate(async () => {
    const response = await fetch('examples/metagame/stage7/entity_metadata.json');
    return response.ok ? response.json() : null;
  });
  if (entitySidecar?.decisiveField === 'GPSInfo' && /outside known layers/.test(entitySidecar?.entities?.F?.GPSInfo || '')) pass('Stage 7 boss evidence: Entity F GPS is outside known layers'); else fail('Stage 7 metadata sidecar missing contradiction');
  // Boss un-cheat (load-bearing): opening Entity F's photo in the real viewer fires the EXIF action.
  await page.click('[data-action="photo"]');
  await page.waitForFunction(() => window.__fv.state.intake?.filename === 'entity_f_verification.png' && window.__fv.state.type.id === 'image', null, { timeout: 5000 });
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
  pass('Stage 7: full investigation + EXIF un-cheat clears Identity Arbiter');

  await page.waitForSelector('.stage8-entropy-field', { timeout: 8000 });
  // The survival sim is wired: node health bars render from the 14-node state + an Advance Cycle
  // control and the engine hook exist (engine correctness is covered by engine.test).
  await page.waitForSelector('.stage8-entropy-field .s8-node .s8-node-bar', { timeout: 4000 });
  await page.waitForSelector('.stage8-entropy-field [data-action="advance"]', { timeout: 4000 });
  const s8Wired = await page.evaluate(() => Boolean(window.__fvStage8) && window.__fvStage8.state().nodes.length === 14);
  if (s8Wired) pass('Stage 8 survival sim wired: 14 node health bars + Advance Cycle + engine hook'); else fail('Stage 8 sim not wired');
  // The field boots FRESH at cycle 1 — no pre-seeded debris/States stub (the old bypass substrate).
  const s8Fresh = await page.evaluate(() => {
    const s = window.__fvStage8.state();
    return s.cycle === 1 && s.debris.length === 0 && s.states === 0 && s.totalStatesEarned === 0;
  });
  if (s8Fresh) pass('Stage 8 boots fresh at cycle 1 (no pre-seeded debris/States)'); else fail('Stage 8 booted a pre-seeded stub');
  // BYPASS CLOSED: the old "archive twice → Heat Death → win" path. On a fresh field there is nothing
  // to archive, and challenging Heat Death returns LOCKED — it must NOT defeat the boss.
  await page.click('[data-action="archive"]');
  await page.click('[data-action="archive"]');
  await page.click('[data-action="boss"]');
  const s8BypassFailed = await page.evaluate(() => {
    const lock = window.__fvStage8.lockState();
    const s = window.__fvStage8.state();
    let save = null;
    try { save = JSON.parse(localStorage.getItem('fv:games:metagame:v3')); } catch {}
    return !lock.unlocked && !s.boss.defeated && !(save?.defeated?.includes(8));
  });
  if (s8BypassFailed) pass('Stage 8 BYPASS CLOSED: fresh two-click Heat Death attempt is locked, not a win'); else fail('Stage 8 two-click bypass still wins');
  // Drive the REAL multi-act survival sim to the boss gate (repair the spine, BRACE + weather each
  // Cascade Storm so the network grows core→α→β→γ, let the frontier shed .sav debris). bodySolver
  // only fast-forwards the real engine — it does NOT archive or touch the Heat Death boss.
  const s8Gate = await page.evaluate(() => window.__fvStage8.bodySolver());
  if (s8Gate.enoughCycles && s8Gate.enoughStates && !s8Gate.actionReady && !s8Gate.unlocked) pass('Stage 8 body gate reached (cycles + reserves), boss still locked pending the un-cheat'); else fail(`Stage 8 body gate not reached: ${JSON.stringify(s8Gate)}`);
  // 3-act escalation: surviving the three Cascade Storms grew the network 14→34 and the boss now
  // requires all three storms (boss-never-from-start, stronger than the prior gate).
  const s8Acts = await page.evaluate(() => {
    const s = window.__fvStage8.state();
    return { storms: s.stormsSurvived, nodes: s.nodes.length, sectors: s.onlineSectors.length, act: s.act, enoughStorms: window.__fvStage8.lockState().enoughStorms };
  });
  if (s8Acts.storms === 3 && s8Acts.nodes === 34 && s8Acts.sectors === 4 && s8Acts.enoughStorms) pass('Stage 8 three Cascade Storms survived: network grew core→α→β→γ (14→34), storm gate met'); else fail(`Stage 8 storm/act progression wrong: ${JSON.stringify(s8Acts)}`);
  // Run-state retrofit: the in-progress sim is checkpointed into the "runsim" slot (tagged with the
  // run identity), so a reload resumes this exact mid-run position instead of re-seeding.
  const s8Resume = await page.evaluate(() => {
    try {
      const save = JSON.parse(localStorage.getItem('fv:games:metagame:v3'));
      const snap = save?.stageState?.[8]?.runsim;
      return Boolean(snap) && snap.runTag === '8:0' && snap.cycle === window.__fvStage8.state().cycle;
    } catch { return false; }
  });
  if (s8Resume) pass('Stage 8 run is checkpointed to the "runsim" slot (reload resumes the same run)'); else fail('Stage 8 run-state snapshot not persisted');
  // Un-cheat (load-bearing): archive .sav debris from /entropy/debris/ into /entropy/active_archive/
  // via the real renderer until the salvage floor is met. This fires 8.salvage_archived.
  for (let i = 0; i < 8; i += 1) {
    const lock = await page.evaluate(() => window.__fvStage8.lockState());
    if (lock.enoughSalvage && lock.actionReady) break;
    await page.click('[data-action="archive"]');
  }
  await page.waitForFunction(() => {
    try {
      const save = JSON.parse(localStorage.getItem('fv:games:metagame:v3'));
      return Boolean(save.actions?.['8.salvage_archived'] && save.achievements?.['stage8.salvage_archived']);
    } catch { return false; }
  }, null, { timeout: 5000 });
  const s8Unlocked = await page.evaluate(() => window.__fvStage8.lockState().unlocked);
  if (s8Unlocked) pass('Stage 8 fully gated after the archive un-cheat (all four gates met)'); else fail('Stage 8 still locked after archiving');
  // Archive the remaining debris from the grown network to bank Scrap for the economy below.
  for (let i = 0; i < 16; i += 1) {
    const has = await page.evaluate(() => window.__fvStage8.state().debris.length > 0);
    if (!has) break;
    await page.click('[data-action="archive"]');
  }
  // Tech tree: Insight (from research nodes + storms) + Scrap (from the archives just made) buys tech.
  // Cold Storage automation stays gated behind the MANUAL archive un-cheat (load-bearing preserved).
  const s8Tech = await page.evaluate(() => {
    const before = window.__fvStage8.state();
    const buy = window.__fvStage8.buyTech('rep1');
    const s = window.__fvStage8.state();
    const sal3 = window.__fvStage8.techStatus().find((t) => t.id === 'sal3');
    return { hadResources: before.insight >= 18 && before.scrap >= 12, bought: buy.ok, bonus: s.repairBudgetBonus, manualArchiveDone: s.manualArchiveDone, coldGated: sal3.reason !== 'needs-archive' };
  });
  if (s8Tech.bought && s8Tech.bonus === 3) pass('Stage 8 tech tree: Insight+Scrap buys a tech and applies its effect'); else fail(`Stage 8 tech buy failed: ${JSON.stringify(s8Tech)}`);
  // Structures: Scrap builds a Heat Sink (folds into venting); Cold Storage automation stays gated
  // behind the manual archive un-cheat (cannot even be BUILT without it).
  const s8Struct = await page.evaluate(() => {
    const r = window.__fvStage8.buildStructure('heatSink');
    const s = window.__fvStage8.state();
    const cold = window.__fvStage8.structureStatus().find((x) => x.id === 'coldStorage');
    return { built: r.ok, reason: r.reason, scrap: Math.floor(s.scrap), vent: s.structHeatVent, coldNeedsTech: cold.reason };
  });
  if (s8Struct.built && s8Struct.vent === 4) pass('Stage 8 structures: Scrap builds a Heat Sink that folds into venting'); else fail(`Stage 8 structure build failed: ${JSON.stringify(s8Struct)}`);
  // Defeat the REAL escalating burn (deep reserves earned by the run outlast ~10 escalating cycles).
  const s8Boss = await page.evaluate(() => window.__fvStage8.bossSolver());
  if (s8Boss.defeated && s8Boss.burn?.survived) pass('Stage 8 Heat Death endured via the real burn'); else fail(`Stage 8 burn not survived: ${JSON.stringify(s8Boss)}`);
  // Microstate prestige: once cleared, collapsing the field banks depth-scaled Cores and applies a
  // permanent income multiplier on the fresh run (optional replay depth on top of the clear).
  const s8Prestige = await page.evaluate(() => {
    if (!window.__fvStage8) return { skipped: true };
    const avail = window.__fvStage8.prestigeState();
    const r = window.__fvStage8.collapse();
    const after = window.__fvStage8.prestigeState();
    return { available: avail.available.ok, preview: avail.preview, collapsed: r.ok, cores: after.cores, mult: after.mult };
  });
  if (s8Prestige.skipped || (s8Prestige.collapsed && s8Prestige.cores >= 3 && s8Prestige.mult > 1)) pass('Stage 8 Microstate prestige: collapse banks Cores + a permanent income multiplier'); else fail(`Stage 8 prestige failed: ${JSON.stringify(s8Prestige)}`);
  await page.waitForFunction(() => {
    try {
      const save = JSON.parse(localStorage.getItem('fv:games:metagame:v3'));
      return save.defeated?.includes(8) && save.unlockedStages?.includes(9);
    } catch { return false; }
  }, null, { timeout: 5000 });
  pass('Stage 8: real survival run + archive un-cheat + endured burn clears Entropy Field');

  await page.waitForSelector('.stage9-observer-state', { timeout: 8000 });
  // The timing game is wired: a live rotating ASCII ring renders + OBSERVE/CROSS controls exist.
  await page.waitForSelector('.stage9-observer-state [data-action="observe"]', { timeout: 4000 });
  await page.waitForSelector('.stage9-observer-state [data-action="cross"]', { timeout: 4000 });
  const s9Wired = await page.evaluate(() => Boolean(window.__fvStage9) && /[─│+]/.test(document.querySelector('.s9-arena')?.textContent || ''));
  if (s9Wired) pass('Stage 9 timing game wired: rotating ring + OBSERVE/CROSS + engine hook'); else fail('Stage 9 ring not wired');
  // The boss is gated behind the run: the player starts on movement 1, not at the Observer.
  const s9StartLevel = await page.evaluate(() => window.__fvStage9.state().currentLevel);
  if (s9StartLevel === 1) pass('Stage 9 starts on movement 1 (boss gated behind the full run)'); else fail(`Stage 9 started at level ${s9StartLevel}`);
  // The learnable front movements clear ONLINE, but the run stalls at the onlineUnstable back third:
  // those gaps reseed on every commit while live, so the offline un-cheat is required to continue.
  const s9Stall = await page.evaluate(() => {
    const reached = window.__fvStage9.solveStableBody();
    return { reached, unstable: !!window.__fvStage9.config(reached).onlineUnstable, boss: window.__fvStage9.config(reached).isBoss };
  });
  if (s9Stall.reached > 1 && s9Stall.unstable && !s9Stall.boss)
    pass('Stage 9 online run clears the learnable front, then stalls at the onlineUnstable back third');
  else fail(`Stage 9 online run did not stall at the back third: ${JSON.stringify(s9Stall)}`);
  // Un-cheat (load-bearing): read service-worker-notes.txt, then activate offline mode so the back
  // third + boss seed is fixed (online the gap reseeds every OBSERVE → unbeatable).
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
  // Stage 10: read -> pick a stance -> WITNESS the echo (real viewer file-open) -> integrate -> Next.
  // The echo is the load-bearing gate: a resolved memory cannot be integrated until its artifact is opened.
  for (let i = 0; i < 9; i++) {
    await page.waitForSelector('[data-read-memory]', { timeout: 5000 });
    await page.click('[data-read-memory]');
    await page.waitForSelector('[data-resolve-memory]', { timeout: 5000 });
    await page.click('[data-resolve-memory]');
    if (i === 0) {
      // Prove the gate: before witnessing the echo, the integrate button is disabled.
      const gated = await page.$eval('[data-integrate-memory]', (el) => el.disabled);
      if (gated) pass('Stage 10 integration is echo-gated (boss not reachable without witnessing echoes)'); else fail('Stage 10 integrate not gated by echo');
    }
    await page.waitForSelector('[data-open-echo]', { timeout: 5000 });
    await page.click('[data-open-echo]');
    await page.waitForSelector('[data-integrate-memory]:not([disabled])', { timeout: 5000 });
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
  // The boss is now a REAL three-phase confrontation. The final choice is NOT exposed until the
  // confrontation is won (boss never self-unlocks).
  await page.waitForSelector('[data-field="confront"]', { timeout: 5000 });
  const choiceLeaked = await page.$('[data-final-choice]');
  if (!choiceLeaked) pass('Stage 10 final choice is gated behind the confrontation'); else fail('Stage 10 final choice exposed before the confrontation was won');
  // Drive it deterministically through the same engine functions a player's clicks call: affirm each
  // compaction with the recorded stance (Phase A), anchor each fragmentation trace — prior un-cheats
  // concede instantly, the rest re-witness (Phase B), answer the core question (Phase C).
  const confrontDone = await page.evaluate(() => window.__fvStage10.confront.run('seeker').completed);
  if (confrontDone) pass('Stage 10 three-phase confrontation completed (compaction + fragmentation + core)'); else fail('Stage 10 confrontation did not complete');
  await page.waitForFunction(() => {
    try { return Boolean(JSON.parse(localStorage.getItem('fv:games:metagame:v3')).stageState?.[10]?.confront?.completed); } catch { return false; }
  }, null, { timeout: 5000 });
  // Now the final question is reachable. Choose "understand" → the woven Synthesis epilogue.
  await page.waitForSelector('[data-final-choice="understand"]:not([disabled])', { timeout: 5000 });
  await page.click('[data-final-choice="understand"]');
  await page.waitForFunction(() => {
    try {
      const save = JSON.parse(localStorage.getItem('fv:games:metagame:v3'));
      return save.defeated?.includes(10) && save.stageState?.[10]?.final?.completed && save.stageState?.[10]?.final?.route === 'understand';
    } catch { return false; }
  }, null, { timeout: 5000 });
  const finalOutcome = await page.$eval('[data-field="finalOutcome"]', (el) => el.textContent);
  if (/full capstone/i.test(finalOutcome) && /9 memories resolved, 9 integrated/.test(finalOutcome)) pass('Stage 10 final outcome summarizes the completed route'); else fail('Stage 10 final outcome summary unexpected: ' + finalOutcome);
  // The "understand" route weaves the Synthesis epilogue from the nine chosen reflections + closer.
  const synthesis = await page.$eval('[data-field="synthesis"]', (el) => el.textContent);
  if (/Synthesis/.test(synthesis) && synthesis.length > 80) pass('Stage 10 understand route renders the woven Synthesis epilogue'); else fail('Stage 10 synthesis epilogue unexpected: ' + synthesis);
  // The ending narration (awakeningText) now renders on completion; capstone gets the extra line.
  const awakening = await page.$eval('[data-field="awakening"]', (el) => el.textContent);
  if (/They were the awakening/i.test(awakening) && /Every memory answered back/i.test(awakening)) pass('Stage 10 renders the awakening ending (capstone)'); else fail('Stage 10 awakening ending unexpected: ' + awakening);
  pass('Stage 10 resolves, integrates all memories, wins the confrontation, and completes Awakening');
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
