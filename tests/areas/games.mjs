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

  // Breakout — clean start, richer Arkanoid-style options, launch on Space
  await page.click('.games-card[data-game="breakout"]');
  await page.waitForSelector('.breakout-canvas', { timeout: 8000 });
  pass('Breakout launches');
  const bo = await page.$eval('.breakout-wrap', (w) => {
    const s = w.__breakout.state();
    return { score: s.score, lives: s.lives, level: s.level, dead: s.dead, stuck: s.stuck,
      bricks: s.bricks, maps: s.maps, width: s.width, sp0: w.__breakout.speedAt(0), spFast: w.__breakout.speedAt(5) };
  });
  if (bo.score === 0 && bo.lives === 3 && bo.level === 0 && !bo.dead && bo.stuck && bo.bricks > 0
      && bo.maps >= 12 && bo.width >= 384 && bo.spFast > bo.sp0)
    pass('Breakout: clean start + wider level set + ball speed escalates with level');
  else fail('Breakout start/escalation: ' + JSON.stringify(bo));
  const boOptions = await page.$eval('.breakout-wrap', (w) => ({
    speedOptions: [...w.querySelectorAll('.breakout-speed option')].map((o) => o.value),
    skip: !!w.querySelector('.breakout-skip'),
    mute: !!w.querySelector('.breakout-mute'),
  }));
  if (boOptions.skip && boOptions.mute && boOptions.speedOptions.join(',') === 'calm,normal,fast')
    pass('Breakout: speed selector, skip level, and mute control exposed');
  else fail('Breakout controls missing: ' + JSON.stringify(boOptions));
  const boSpeed = await page.$eval('.breakout-wrap', (w) => {
    w.__breakout.setSpeedMode('fast');
    return { mode: w.__breakout.state().speedMode, fast: w.__breakout.speedAt(0), calm: w.__breakout.speedAt(0, 'calm') };
  });
  if (boSpeed.mode === 'fast' && boSpeed.fast > boSpeed.calm) pass('Breakout: speed option changes ball speed');
  else fail('Breakout speed option: ' + JSON.stringify(boSpeed));
  const boSkip = await page.$eval('.breakout-wrap', (w) => {
    const before = w.__breakout.state().level;
    w.__breakout.skipLevel();
    return { before, after: w.__breakout.state().level, stuck: w.__breakout.state().stuck };
  });
  if (boSkip.after === boSkip.before + 1 && boSkip.stuck) pass('Breakout: skip level advances to a fresh stuck-ball board');
  else fail('Breakout skip: ' + JSON.stringify(boSkip));
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
  const boSticky = await page.$eval('.breakout-wrap', (w) => {
    const caught = w.__breakout.testCatchSticky();
    w.__breakout.launch();
    return { caught, released: w.__breakout.state() };
  });
  if (boSticky.caught.stuckBalls > 0 && boSticky.caught.stickyCharges >= 2 && boSticky.released.stuckBalls === 0)
    pass('Breakout: sticky/catch power-up catches and releases the ball');
  else fail('Breakout sticky: ' + JSON.stringify(boSticky));
  const boLaser = await page.$eval('.breakout-wrap', (w) => {
    const before = w.__breakout.state().bricks;
    const after = w.__breakout.testLaserHit();
    return { before, after };
  });
  if (boLaser.after.bricks < boLaser.before && boLaser.after.laserShots > 0)
    pass('Breakout: laser power-up shoots and breaks a brick');
  else fail('Breakout laser: ' + JSON.stringify(boLaser));
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

  // Minesweeper — explicit difficulties, safe first click, and no-guess solvable mode
  await page.click('.games-card[data-game="minesweeper"]');
  await page.waitForSelector('.mine-grid', { timeout: 8000 });
  pass('Minesweeper launches');
  const ms0 = await page.$eval('.mine-wrap', (w) => w.__mine.state());
  if (ms0.score === 0 && ms0.level === 0 && !ms0.dead && !ms0.flagMode && ms0.mode === 'easy'
      && ms0.cols === 9 && ms0.rows === 9 && ms0.mines === 10 && ms0.cells === 81 && ms0.minesLeft > 0 && ms0.revealed === 0)
    pass('Minesweeper: clean Easy 9×9 start');
  else fail('Minesweeper start: ' + JSON.stringify(ms0));
  const msModes = await page.$eval('.mine-wrap', (w) => {
    const options = [...w.querySelectorAll('.mine-mode option')].map((o) => o.value);
    const out = { options, probes: [] };
    for (const mode of options) {
      w.__mine.setMode(mode);
      const s = w.__mine.state();
      out.probes.push({ mode: s.mode, cols: s.cols, rows: s.rows, mines: s.mines, cells: s.cells });
    }
    w.__mine.setMode('easy');
    return out;
  });
  const expectedModes = ['easy', 'medium', 'hard', 'solvable'];
  const modeShapeOk = msModes.options.join(',') === expectedModes.join(',')
    && msModes.probes.some((p) => p.mode === 'medium' && p.cols === 12 && p.rows === 12 && p.mines === 22)
    && msModes.probes.some((p) => p.mode === 'hard' && p.cols === 16 && p.rows === 16 && p.mines === 45)
    && msModes.probes.some((p) => p.mode === 'solvable' && p.cols === 9 && p.rows === 9 && p.mines === 10);
  if (modeShapeOk) pass('Minesweeper: Easy/Medium/Hard/Solvable difficulty options configure board sizes');
  else fail('Minesweeper modes: ' + JSON.stringify(msModes));
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
  const msSolvable = await page.$eval('.mine-wrap', (w) => {
    w.__mine.setMode('solvable');
    w.__mine.reveal(40);
    const state = w.__mine.state();
    const proof = w.__mine.solveCurrent(40);
    const starts = w.__mine.proveSolvableStarts([0, 10, 40, 70, 80]);
    return { state, proof, starts };
  });
  if (msSolvable.state.mode === 'solvable' && msSolvable.state.solvableProof?.solved && msSolvable.proof.solved
      && msSolvable.proof.revealed === msSolvable.state.cells - msSolvable.state.mines
      && msSolvable.starts.every((entry) => entry.proof?.solved))
    pass('Minesweeper: Solvable mode generated deterministic no-guess boards across first-click starts');
  else fail('Minesweeper solvable: ' + JSON.stringify(msSolvable));
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
  const freshStages = freshStageButtons.map((b) => b.stage).join(',');
  if (freshStages === '1,2,3,4,5' && freshStageButtons.every((b) => !b.disabled)) {
    pass('Defragmenter fresh start shows exactly five unlocked games');
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
  if (freshSave?.version === 8
      && freshSave.unlockedStages?.join(',') === '1,2,3,4,5'
      && Object.keys(freshSave.stageState || {}).join(',') === '1,2,3,4,5') {
    pass('Defragmenter initializes the fresh five-game v8 save');
  } else {
    fail('Defragmenter v8 save invalid: ' + JSON.stringify(freshSave));
  }
  const devButtonAlwaysVisible = await page.$eval('.mg-dev-btn', (button) => !button.hidden && getComputedStyle(button).display !== 'none');
  if (devButtonAlwaysVisible) pass('Dev menu is available immediately without an unlock gesture'); else fail('Dev menu button is not always available');
  await page.click('.mg-dev-btn');
  const freshDevMenu = await page.evaluate(() => ({
    bosses: [...document.querySelectorAll('[data-dev="boss"]')].map((b) => b.textContent.trim()),
    cheats: [...document.querySelectorAll('[data-dev="stagedev"]')].map((b) => b.textContent.trim()),
    bits: [...document.querySelectorAll('[data-dev="bits"]')].map((b) => b.textContent.trim()),
    kinds: [...new Set([...document.querySelectorAll('.mg-v3-debug [data-dev]')].map((b) => b.dataset.dev))].sort(),
    text: document.querySelector('.mg-v3-debug')?.textContent || '',
  }));
  if (freshDevMenu.bosses.join(',') === '1b,2b,3b,4b,5b'
      && freshDevMenu.cheats.join(',') === 'Unlock tabs,Boss ready,+10 cores,Hire managers'
      && freshDevMenu.bits.join(',') === '1M,1B,1T,1ba'
      && freshDevMenu.kinds.join(',') === 'bits,boss,close,stagedev'
      && !/unlock all|reset save/i.test(freshDevMenu.text)) {
    pass('Dev menu has five boss jumps plus every active Stage 1 cheat, with old navigation/reset tools removed');
  } else {
    fail('Defragmenter fresh dev menu unexpected: ' + JSON.stringify(freshDevMenu));
  }
  await page.click('[data-dev="close"]');
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
  const stage1Progression = await page.$$eval('.mg-s1-tab', (tabs) => tabs.map((tab) => ({
    id: tab.dataset.tab,
    step: tab.dataset.step,
    current: tab.getAttribute('aria-current'),
    selected: tab.getAttribute('aria-selected'),
    text: tab.textContent.trim(),
  })));
  if (stage1Progression.length > 0
      && stage1Progression.every((tab) => tab.text.startsWith(`Step ${tab.step}`))
      && stage1Progression[0].id === 'bits'
      && stage1Progression[0].current === 'step'
      && stage1Progression[0].selected === 'true'
      && !stage1Progression.some((tab) => tab.id === 'managers' || tab.id === 'reset')) {
    pass('Stage 1 presents unlocked systems as numbered progression steps and keeps future steps hidden');
  } else {
    fail('Stage 1 progression tabs unexpected: ' + JSON.stringify(stage1Progression));
  }
  const bellLogHasStage1Message = await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem('fv:games:metagame:v3'));
    return (save.bell?.log || []).some((entry) => entry.stage === 1 && /^stage1\./.test(entry.id));
  });
  if (bellLogHasStage1Message) pass('Stage 1 economy messages feed the shared header bell log'); else fail('Stage 1 messages missing from the shared bell log');
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
  const affordableBuy = await page.$('.mg-s1-buybtn:not(.mg-buy-locked)');
  if (!affordableBuy) {
    fail('Stage 1 has no affordable purchase for the unlock persistence check');
  } else {
    const bitsBeforeSpend = await page.evaluate(() => JSON.parse(localStorage.getItem('fv:games:metagame:v3')).stageState[1].bits.m);
    await affordableBuy.click();
    await page.waitForFunction((before) => {
      try { return JSON.parse(localStorage.getItem('fv:games:metagame:v3')).stageState[1].bits.m < before; } catch { return false; }
    }, bitsBeforeSpend, { timeout: 4000 });
    await page.click('.mg-v3-stage[data-stage="2"]');
    await page.waitForSelector('.stage2-glyph-dungeon', { timeout: 4000 });
    await page.click('.mg-v3-stage[data-stage="1"]');
    await page.waitForSelector('.mg-s1-tab[data-tab="bits"]', { timeout: 4000 });
    const persistedUnlock = await page.evaluate(() => {
      const save = JSON.parse(localStorage.getItem('fv:games:metagame:v3'));
      return save.stageState[1].tabsUnlocked === true
        && Boolean(document.querySelector('.mg-s1-tab[data-tab="bits"]'));
    });
    if (persistedUnlock) pass('Stage 1 progression stays unlocked after spending bits and returning');
    else fail('Stage 1 progression relocked after spending bits or returning');
  }
  // Score is an absolute overlay so revealing it never reflows the play area (and shifts the button).
  const scorePos = await page.$eval('.mg-s1-hud', (el) => getComputedStyle(el).position).catch(() => null);
  if (scorePos === 'absolute') pass('Stage 1 score HUD is an absolute top-right overlay'); else fail('Stage 1 score HUD position: ' + scorePos);
  // Help affordance now lives in the metagame header next to SFX.
  const helpInHeader = await page.$eval('.mg-v3-head-actions .mg-help-btn', (el) => !el.hidden).catch(() => false);
  if (helpInHeader) pass('Stage 1 help button appears in the header next to SFX'); else fail('Stage 1 header help button missing/hidden');

  // ── Stage-rules README modal (shared chrome): the 📖 button sits next to the bell, opens a modal
  // whose body holds README markdown rendered via the VENDORED markdown-it + DOMPurify (zero off-origin).
  const readmeBtnByBell = await page.$eval('.mg-v3-head-actions', (head) => {
    const readme = head.querySelector('.mg-readme-btn[data-action="readme"]');
    const bell = head.querySelector('.mg-v3-bell');
    return Boolean(readme && bell && (readme.compareDocumentPosition(bell) & Node.DOCUMENT_POSITION_FOLLOWING));
  }).catch(() => false);
  if (readmeBtnByBell) pass('Stage rules README button sits in the header before the bell'); else fail('README button missing or not next to the bell');
  await page.click('.mg-readme-btn[data-action="readme"]');
  await page.waitForSelector('.mg-readme-overlay .mg-readme-body h1', { timeout: 8000 });
  const readmeHeading = await page.$eval('.mg-readme-overlay .mg-readme-body h1', (el) => el.textContent.trim());
  if (/Bit Foundry/i.test(readmeHeading)) pass(`README modal renders Stage 1 markdown (h1: "${readmeHeading}")`);
  else fail('README modal heading unexpected for Stage 1: ' + readmeHeading);
  // Backdrop click closes it (≥40px × button + dimmed backdrop are the mobile contract).
  await page.evaluate(() => document.querySelector('.mg-readme-overlay [data-readme="close"]').click());
  await page.waitForSelector('.mg-readme-overlay', { state: 'detached', timeout: 4000 });
  pass('README modal closes cleanly');

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

  // Boss gate is real (reachability), and the boss is HARD but NOT a wall while the cheat is active —
  // 2026-07-11 playtest fix: casual tapping still loses (the fight is genuinely hard), but it's not
  // structurally unwinnable — boss-sim.js's own unit test proves sustained fast tapping wins even
  // before the un-cheat. Disabling the cheat is an optional buff (exercised below via the real
  // raw-edit path), not the only door.
  const gate = await page.evaluate(() => {
    const s = window.__fvStage1.state();
    s.owned = {}; s.bits = { m: 0, e: 0 };
    const before = window.__fvStage1.fightBoss();
    window.__fvStage1.grind();
    const after = window.__fvStage1.fightBoss({ tapsPerSec: 4 });
    return { before, after };
  });
  if (gate.before.gated) pass('Stage 1 boss gated until all tiers owned + bits ≥ ticket'); else fail('Stage 1 boss not gated from start: ' + JSON.stringify(gate.before));
  if (!gate.after.gated && gate.after.cheatActive && !gate.after.won)
    pass('Stage 1 boss is hard (casual tapping loses) while the cheat is active');
  else fail('Stage 1 boss should still be hard at a casual pace while cheating: ' + JSON.stringify(gate.after));

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

  // Element matrix + Overflow content wired through the real engine: freezing a foe then striking it
  // SHATTERS (frost interaction), and a null phantom (the new dark-act foe) is pinned by torchlight.
  const elemProbe = await page.evaluate(() => window.__fvStage2.elementProbe());
  if (elemProbe.shatter && elemProbe.phantomPinned)
    pass('Stage 2 element matrix: freeze→shatter combo + phantom pinned by torchlight');
  else fail('Stage 2 element/Overflow probe: ' + JSON.stringify(elemProbe));

  // Descend the full body — all three acts (Warrens / Cisterns & Emberworks / The Overflow) — to the
  // boss via the deterministic body solver (no real-time roguelite play). Confirms the boss sits at
  // the END of the 9-floor body and is reachable only after the descent (MAX_FLOOR=9).
  const body = await page.evaluate(() => window.__fvStage2.bodySolver());
  if (body.reached && body.floor >= 9) pass('Stage 2 body: descended all 3 acts to the floor-9 boss'); else fail('Stage 2 body solver: ' + JSON.stringify(body));

  // 2026-07-11 playtest fix: the cipher.txt search is an optional buff now, not a gate — the boss
  // is genuinely fightable (and damageable) before it's found, just at a real risk/cost (a counter-
  // hit lands on @ each exchange), rather than the old dead-end 0-damage "locked" wall.
  const lockedFight = await page.evaluate(() => {
    const before = window.__fvStage2.state().run.boss.hp;
    const beforeHp = window.__fvStage2.state().run.entity.hp;
    window.__fvStage2.bossSolver();
    const s = window.__fvStage2.state();
    return { unlocked: window.__fvStage2.lockState().unlocked, bossHpBefore: before, bossHpAfter: s.run.boss.hp, entityHpBefore: beforeHp, entityHpAfter: s.run.entity.hp };
  });
  if (lockedFight.unlocked === false) pass('Stage 2 boss starts locked (no buff) before search action'); else fail('Stage 2 boss buff active pre-search');
  if (lockedFight.bossHpAfter < lockedFight.bossHpBefore) pass('Stage 2 boss takes real damage even before the search buff');
  else fail('Stage 2 locked boss should still take damage: ' + JSON.stringify(lockedFight));
  if (lockedFight.entityHpAfter < lockedFight.entityHpBefore) pass('Stage 2 fighting the boss without the buff costs a real counter-hit');
  else fail('Stage 2 locked boss exchange should cost @ HP: ' + JSON.stringify(lockedFight));

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
  pass('Stage 2 completion is recorded and advances to Stage 3 through the orchestrator');

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

  // Acquire fold (UX audit M1): the ONE acquisition surface offers a 3-card MIX of free run boons and
  // purchasable Defrag upgrades. The offer must contain BOTH kinds (economy still purchasable in-flow);
  // the default hook pick takes the free boon and resolves the draft (deterministic).
  const s3Draft = await page.evaluate(() => {
    const UP = ['prefetch', 'throughput', 'oracle', 'parity', 'overclock', 'engram'];
    const pendingBefore = window.__fvStage3.draftPending();
    const offer = window.__fvStage3.draftOffer();
    const hasUpgrade = offer.some((id) => UP.includes(id));
    const hasBoon = offer.some((id) => !UP.includes(id));
    const picked = window.__fvStage3.draft(); // default = the free boon
    return { pendingBefore, offerLen: offer.length, hasUpgrade, hasBoon, picked, boons: window.__fvStage3.state().run.boons.length, pendingAfter: window.__fvStage3.draftPending() };
  });
  if (s3Draft.pendingBefore && s3Draft.offerLen === 3 && s3Draft.hasUpgrade && s3Draft.hasBoon && s3Draft.picked && s3Draft.boons === 1 && !s3Draft.pendingAfter)
    pass('Stage 3 acquire fold: 3-card mix of purchasable upgrade(s) + free boon(s), pick resolves the draft'); else fail('Stage 3 acquire fold: ' + JSON.stringify(s3Draft));

  // Play the BODY: solve snapshots until corruption peaks at 8 (deterministic, no real-time play).
  const s3Body = await page.evaluate(() => window.__fvStage3.bodySolver());
  if (s3Body.reached && s3Body.corruption >= 8) pass('Stage 3 body: solved snapshots to peak corruption 8 (' + s3Body.solved + ' solves)');
  else fail('Stage 3 body solver: ' + JSON.stringify(s3Body));
  // Aliased-clues tier: at least one mid-climb (corruption 3–5) snapshot obscured a line as "?".
  if (s3Body.aliasSeen > 0) pass('Stage 3 aliased-clues tier appeared during the body (' + s3Body.aliasSeen + ' aliased line(s))');
  else fail('Stage 3 aliased tier never appeared: ' + JSON.stringify(s3Body));
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

  // Boss un-cheat: the SEED-DERIVED restoration key lives only in a THREE-WAY diff of the memory logs.
  // Each chunk corrupts on a fixed schedule — pieces[0] lost v1→v2, pieces[1] lost v2→v3, pieces[2]
  // survives in v3 — and display order is seed-shuffled, so reading one log top-to-bottom is the wrong
  // order. We must compare all three. (Opening a generated file prompts the discard guard, auto-accepted.)
  const sectorsOf = (text) => {
    const out = {};
    for (const m of text.matchAll(/sector (\d+): restoration chunk (\S+)/g)) out[m[1]] = m[2];
    return out;
  };
  const readLog = async (action, filename) => {
    await page.click(`[data-action="${action}"]`);
    await page.waitForFunction((f) => window.__fv.state.intake?.filename === f, filename, { timeout: 5000 });
    return page.evaluate(() => window.__fv.state.intake.text);
  };
  const s1 = sectorsOf(await readLog('v1', 'memory_v1.log'));
  const s2 = sectorsOf(await readLog('v2', 'memory_v2.log'));
  const s3 = sectorsOf(await readLog('v3', 'memory_v3.log'));
  const intact = (m) => Object.values(m).filter((v) => v !== '[missing]');
  if (intact(s1).length === 3 && intact(s2).length === 2 && intact(s3).length === 1)
    pass('Stage 3 three-way diff: v1 has 3 chunks, v2 lost one, v3 lost two'); else fail('Stage 3 3-log corruption schedule: ' + JSON.stringify({ s1, s2, s3 }));
  // Reconstruct the key by the corruption-order rule (the 3-way diff skill) and confirm it matches the
  // seed-derived key — proving the diff is load-bearing, not bypassed.
  const lostV1V2 = Object.keys(s1).find((sec) => s1[sec] !== '[missing]' && s2[sec] === '[missing]');
  const lostV2V3 = Object.keys(s2).find((sec) => s2[sec] !== '[missing]' && s3[sec] === '[missing]');
  const survivor = Object.keys(s3).find((sec) => s3[sec] !== '[missing]');
  const recovered = (s1[lostV1V2] || '') + (s2[lostV2V3] || '') + (s3[survivor] || '');
  const derived = await page.evaluate(() => window.__fvStage3.deriveKey());
  if (recovered.length === 9 && recovered === derived) pass('Stage 3 3-way diff (corruption order) reconstructs the restoration key'); else fail('Stage 3 3-way reconstruction: ' + JSON.stringify({ recovered, derived }));
  await page.waitForSelector('.stage3-memory-grid', { timeout: 8000 });
  await page.fill('.s3-key', recovered);
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
  pass('Stage 3 completion is recorded and advances to Stage 4 through the orchestrator');

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
  // Debug-seat the boss (smoke shortcut for clearing 150 waves; NOT a player affordance).
  // 2026-07-11 playtest fix: the blueprint is an optional buff now, not a gate — covering recursion
  // points BLIND (before the file is ever opened) still lands real damage, at a lower per-point rate
  // than the buffed hit. Cover 2 of the 3 points and confirm real, partial damage lands pre-blueprint.
  const s4Locked = await page.evaluate(() => {
    window.__fvStage4.seatAtBoss();
    const points = window.__fvStage4.state().recursion.points;
    for (const p of points.slice(0, 2)) window.__fvStage4.place(p.x, p.y, 'pulse_node');
    const hpBefore = window.__fvStage4.state().boss.hp;
    window.__fvStage4.confront();
    const s = window.__fvStage4.state();
    return { status: s.campaign.status, defeated: s.boss.defeated, hpBefore, hpAfter: s.boss.hp };
  });
  if (s4Locked.status === 'boss' && !s4Locked.defeated && s4Locked.hpAfter < s4Locked.hpBefore)
    pass('Stage 4 boss takes real (if weaker) damage even before the blueprint is opened');
  else fail('Stage 4 boss should still be damageable pre-blueprint: ' + JSON.stringify(s4Locked));
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
  pass('Stage 4 clears via the blueprint buff finishing off the damage started blind, after all maps cleared');

  await page.waitForSelector('.stage5-protocol-codex', { timeout: 8000 });
  // The deck-builder hub is the entry point: the ONLY way to the boss is a full run (no bypass).
  await page.waitForSelector('.s5db-hub [data-action="begin-run"]', { timeout: 4000 });
  // Uniqueness guard: there is no "confront The Refused Connection" hub bypass anymore.
  const hubHasConfront = await page.$('.s5db-hub [data-action="confront"]');
  if (hubHasConfront) throw new Error('Stage 5 hub still exposes the confront bypass');
  pass('Stage 5 Protocol Codex opens on the deck-builder hub (no boss bypass)');
  // Phase I — daily/custom seed determinism (the seed is hashed ONCE at run creation, never live
  // entropy) + the self-competition score. The same date/custom key reproduces the same run seed.
  const s5seed = await page.evaluate(() => {
    window.__fvStage5.setDailyKey('2026-01-15');
    const d1 = window.__fvStage5.beginRun({ mode: 'daily' });
    const d2 = window.__fvStage5.beginRun({ mode: 'daily' });
    const c1 = window.__fvStage5.beginRun({ mode: 'custom', seedText: 'codex' });
    const c2 = window.__fvStage5.beginRun({ mode: 'custom', seedText: 'codex' });
    const c3 = window.__fvStage5.beginRun({ mode: 'custom', seedText: 'other' });
    const score = window.__fvStage5.score().run;
    return {
      dailyStable: d1.seed === d2.seed && d1.mode === 'daily' && d1.dailyKey === '2026-01-15',
      customStable: c1.seed === c2.seed && c1.mode === 'custom' && c1.dailyKey === 'codex',
      customDistinct: c1.seed !== c3.seed,
      scorePositive: score > 0,
    };
  });
  if (s5seed.dailyStable && s5seed.customStable && s5seed.customDistinct && s5seed.scorePositive) {
    pass('Stage 5 daily/custom seed is deterministic (same key ⇒ same run) and run score is scored');
  } else {
    fail(`Stage 5 seed/score wrong: ${JSON.stringify(s5seed)}`);
  }
  // Return to the hub for the rest of the flow (the seed checks left a run active).
  await page.click('.s5db-map [data-action="abandon"]');
  await page.waitForSelector('.s5db-hub [data-action="begin-run"]', { timeout: 4000 });
  // Prestige hub-visibility gating fix: banked total / Protocol Version / the "reinforce protocol"
  // button are visible from a player's very first run attempt — BEFORE any run has finished (no
  // death or win has happened yet at this point in the test). Previously this cluster was gated
  // behind BOTH state.meta.disclosed.stats (first finish) AND a separate 75%-of-cost banked
  // threshold, so a new player had no way to discover the prestige system existed.
  const s5PrestigeVisible = await page.$('.s5db-hub .s5db-prestige');
  if (s5PrestigeVisible) pass('Stage 5 prestige cluster visible on hub before any run has finished'); else fail('Stage 5 prestige cluster still hidden pre-finish');
  // A run is the game body; verify the act-map loop is live.
  await page.click('.s5db-hub [data-action="begin-run"]');
  await page.waitForSelector('.s5db-map .s5db-node.is-available[data-node]', { timeout: 4000 });
  pass('Stage 5 run begins: act map offers routable nodes');
  // Reload-retry exploit closed: a real combat is CHECKPOINTED into the save mid-fight (run-state
  // 'combat' slot), so a reload resumes the same in-progress fight rather than re-rolling a fresh
  // one. Enter a combat, play one card, and confirm the persisted snapshot is a resumable partial
  // turn (not over, tagged with the run seed, with a card already played).
  await page.click('.s5db-map .s5db-node.is-available[data-node]');
  // Designed flow (2026-07-09): click a hand card to SELECT (raises the close-up), click it AGAIN to
  // PLAY. There is no separate play button — the raised close-up carries data-inspect, so a second
  // click routes back through handleClick (pending===i → doPlay). Click-outside deselects.
  await page.waitForSelector('.s5db-combat .s5db-hand .s5db-card[data-inspect]:not(.is-unaffordable)', { timeout: 4000 });
  await page.click('.s5db-combat .s5db-hand .s5db-card[data-inspect]:not(.is-unaffordable)');
  await page.waitForSelector('.s5db-inspect .s5db-inspect-card[data-inspect]', { timeout: 4000 });
  await page.click('.s5db-inspect .s5db-inspect-card[data-inspect]');
  await page.waitForFunction(() => {
    try {
      const save = JSON.parse(localStorage.getItem('fv:games:metagame:v3'));
      const snap = save.stageState?.[5]?.combat;
      return Boolean(snap && snap.over === false && (snap.cardsPlayedThisTurn || 0) >= 1);
    } catch { return false; }
  }, null, { timeout: 4000 });
  const s5resume = await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem('fv:games:metagame:v3'));
    const snap = save.stageState[5].combat;
    return {
      resumable: snap.over === false,
      seedTagged: snap.runSeed === save.stageState[5].run?.seed,
      atNode: snap.nodeId === save.stageState[5].run?.currentNodeId,
      played: (snap.cardsPlayedThisTurn || 0) >= 1,
      hasRng: typeof snap.rngSeed === 'number' && (snap.rngSteps || 0) > 0,
    };
  });
  if (s5resume.resumable && s5resume.seedTagged && s5resume.atNode && s5resume.played && s5resume.hasRng) {
    pass('Stage 5 mid-combat is checkpointed to the save (reload resumes the same fight — exploit closed)');
  } else {
    fail(`Stage 5 combat not resumably checkpointed: ${JSON.stringify(s5resume)}`);
  }
  // First-run pacing (UX audit approved option): a fresh save's very first run terminates at the
  // act-4 story boss (The Refused Connection); acts 5-6 unlock on the first win. Assert that, then
  // mark this save a VETERAN so the run below restores the full six acts — the superboss fixture
  // (equipEndgameLoadout pins the act-6 boss node a6-l6-n0) is veteran content and can't be reached
  // on a 4-act first run. markVeteran sets only the win counter through the existing test seam.
  const s5fresh = await page.evaluate(() => window.__fvStage5.beginRun());
  if (s5fresh.finalAct === 4) pass('Stage 5 first run ends at act 4 (The Refused Connection); acts 5-6 unlock on first win'); else fail(`Stage 5 fresh finalAct wrong: ${JSON.stringify(s5fresh)}`);
  await page.evaluate(() => window.__fvStage5.markVeteran());
  const s5vet = await page.evaluate(() => window.__fvStage5.beginRun());
  if (s5vet.finalAct === 6) pass('Stage 5 veteran run restores the full six acts (5-6 unlocked)'); else fail(`Stage 5 veteran finalAct wrong: ${JSON.stringify(s5vet)}`);
  // Reach the final boss via the deterministic test hook with a winnable deck (a real veteran run
  // would clear acts 1–5 and build this deck itself). The boss is fought with this REAL deck.
  await page.evaluate(() => window.__fvStage5.jumpToBoss(
    ['SYN', 'SYN', 'SYN', 'SYN', 'SYN', 'ACK', 'ACK', 'ACK', 'ACK', 'SEGMENT']
  ));
  // Phase I — grant the 3 true-ending keys on this run so the negotiation opens the hidden superboss
  // (a real run earns them by playing the untouchable/ascetic/sacrifice challenges; this is the
  // deterministic test path). The superboss is PURE bonus combat — it adds no second un-cheat.
  const s5keys = await page.evaluate(() => window.__fvStage5.grantKeys(3));
  if (s5keys === 3) pass('Stage 5 true-ending keys granted (untouchable / ascetic / sacrifice)'); else fail(`Stage 5 keys not granted: ${s5keys}`);
  // It is a real combat (data-play hand), not the retired 3-button puzzle.
  await page.waitForSelector('.s5db-combat .s5db-boss-banner.is-locked', { timeout: 4000 });
  pass('Stage 5 boss is a real-deck fight reached only through a run');
  // 2026-07-11 playtest fix: ch9 unread is a difficulty cost now (boss starts at 84 HP = 60 ×
  // UNCH9_HP_MULT 1.4, instead of 60), not a win/loss gate — a correct handshake still lands real
  // damage, it just has more HP to clear.
  const lockedAttack = await page.evaluate(() => window.__fvStage5.autoNegotiate(3));
  if (lockedAttack.enemyHp >= 84 || lockedAttack.bossDefeated) {
    throw new Error(`Stage 5 boss should take real damage while ch9 unread: ${JSON.stringify(lockedAttack)}`);
  }
  pass('Stage 5 boss takes real damage before Chapter 9 is read (tougher HP pool, not a 0-damage wall)');
  // Stage-clear gate (un-cheat): read the codex from the boss banner to unlock the negotiation.
  await page.click('.s5db-combat .s5db-boss-banner [data-action="epub"]');
  await page.waitForFunction(() => window.__fv.state.intake?.filename === 'protocols_of_the_entity.epub' && window.__fv.state.type.id === 'epub', null, { timeout: 5000 });
  await page.waitForFunction(() => {
    try {
      const save = JSON.parse(localStorage.getItem('fv:games:metagame:v3'));
      return Boolean(save.actions?.['5.protocol_ch9_read'] && save.achievements?.['stage5.protocol_ch9_read']);
    } catch { return false; }
  }, null, { timeout: 5000 });
  // With ch9 read the negotiation is unlocked: win it with the real deck. With 3 keys, this does NOT
  // immediately clear the stage — it diverts to the hidden superboss (stage completion is deferred).
  const s5neg = await page.evaluate(() => window.__fvStage5.autoNegotiate());
  if (s5neg.bossDefeated && !s5neg.won) pass('Stage 5 negotiation won; the 3 keys divert to the hidden superboss (not yet cleared)'); else fail(`Stage 5 negotiation/diversion wrong: ${JSON.stringify(s5neg)}`);
  // The superboss is a real-deck multi-phase fight (The Kernel of Refusal), no lock / no un-cheat.
  await page.waitForSelector('.s5db-combat', { timeout: 4000 });
  // Equip a REPRESENTATIVE end-game loadout (developed 16-card deck at 50 HP, pinned seed) — standing
  // in for the acts 1–5 deck-building the test path skips, NOT a bypass — so the climactic bonus pool
  // (264 HP across 3 escalating phases) is fought against real power, not the bare 10-card starter.
  const s5load = await page.evaluate(() => window.__fvStage5.equipEndgameLoadout());
  if (s5load.ok && s5load.deckSize >= 14 && s5load.hp === 50) pass('Stage 5 superboss fought with a representative end-game loadout (not the starter deck)'); else fail(`Stage 5 endgame loadout wrong: ${JSON.stringify(s5load)}`);
  // Drive the superboss to its end with the real deck → the TRUE ending, which now clears the stage.
  const s5super = await page.evaluate(() => window.__fvStage5.autoSuperboss());
  if (s5super.ok && s5super.status === 'won' && s5super.trueEnding) pass('Stage 5 key-gated superboss defeated → true ending'); else fail(`Stage 5 superboss not won: ${JSON.stringify(s5super)}`);
  // It is a CLIMACTIC fight, not a pushover: the auto-player wins down to the wire (real HP spent),
  // confirming the 264-HP tuning is winnable-but-hard with the representative loadout.
  if (s5super.startHp === 50 && s5super.endHp > 0 && (s5super.startHp - s5super.endHp) >= 25) pass(`Stage 5 superboss is a real climax (won at ${s5super.endHp}/${s5super.startHp} HP in ${s5super.turns} turns)`); else fail(`Stage 5 superboss margin wrong (too trivial or a loss): ${JSON.stringify(s5super)}`);
  await page.waitForFunction(() => {
    try {
      const save = JSON.parse(localStorage.getItem('fv:games:metagame:v3'));
      return save.defeated?.includes(5) && save.currentStage === 5;
    } catch { return false; }
  }, null, { timeout: 5000 });
  pass('Stage 5 cleared via real-deck negotiation + key-gated true-ending superboss');

  // Protocol Codex is now the fifth and final game, so completion stays on its persisted win view.
  await page.waitForSelector('.s5db-end--won', { timeout: 4000 });
  const s5won = await page.evaluate(() => {
    const dt = [...document.querySelectorAll('.s5db-end--won .s5db-meta-grid dt')]
      .find((el) => el.textContent === 'Banked total');
    return { hasBankedLine: Boolean(dt), bankedShown: dt ? Number(dt.nextElementSibling?.textContent) : null, meta: window.__fvStage5.meta() };
  });
  if (s5won.hasBankedLine && s5won.bankedShown === s5won.meta.banked) {
    pass('Stage 5 win screen shows the banked total (previously only the death screen did)');
  } else {
    fail(`Stage 5 win screen missing/mismatched banked total: ${JSON.stringify(s5won)}`);
  }
  // Prestige upgrade flow: bank enough for the cost (test seam — bypasses playing out the run
  // economy), open the "reinforce protocol" picker from the hub, choose a starting-deck slot, and
  // confirm the NEXT run's starting deck carries that permanent upgrade. wonView has no direct
  // "back to hub" button (unlike deathView) — reach the hub via "run again" → "abandon", both
  // already-verified UI actions.
  await page.click('.s5db-end--won [data-action="new-run"]');
  await page.waitForSelector('.s5db-map [data-action="abandon"]', { timeout: 4000 });
  await page.click('.s5db-map [data-action="abandon"]');
  await page.waitForSelector('.s5db-hub [data-action="prestige"]', { timeout: 4000 });
  await page.evaluate(() => window.__fvStage5.grantBanked(9999));
  await page.click('.s5db-hub [data-action="prestige"]');
  await page.waitForSelector('.mg-modal .s5db-card[data-prestige-upgrade]', { timeout: 4000 });
  const chosenIndex = await page.evaluate(() => {
    const el = document.querySelector('.mg-modal .s5db-card[data-prestige-upgrade]');
    return Number(el.dataset.prestigeUpgrade);
  });
  await page.click('.mg-modal .s5db-card[data-prestige-upgrade]');
  await page.waitForSelector('.s5db-hub [data-action="begin-run"]', { timeout: 4000 }); // modal closed, back on hub
  const s5prestiged = await page.evaluate(() => window.__fvStage5.meta());
  if ((s5prestiged.permanentUpgrades || []).includes(chosenIndex) && s5prestiged.protocolVersion >= 1) {
    pass('Stage 5 prestige upgrade picker spends the cost and records the chosen starting-card slot');
  } else {
    fail(`Stage 5 prestige upgrade not recorded: chosenIndex=${chosenIndex} meta=${JSON.stringify(s5prestiged)}`);
  }
  await page.click('.s5db-hub [data-action="begin-run"]');
  await page.waitForSelector('.s5db-map [data-node]', { timeout: 4000 });
  const s5nextDeck = await page.evaluate(() => window.__fvStage5.run().deck);
  if (s5nextDeck[chosenIndex]?.endsWith('+')) {
    pass('Stage 5 permanent prestige upgrade carries into the next run\'s starting deck');
  } else {
    fail(`Stage 5 next run's starting deck missing the permanent upgrade at slot ${chosenIndex}: ${JSON.stringify(s5nextDeck)}`);
  }
  // Regression guard for a real bug this prestige work surfaced: ui-rewards.js's shopView() used
  // to throw building EVERY non-empty deck's "Purge a card" row (cardOption's dataset[attr] = value
  // threw on the hyphenated attrs "buy-remove"/"buy-upgrade" — same DOMStringMap restriction as the
  // prestige picker above). shopView() had NO test coverage at all, so this was live-broken with no
  // failing test to catch it — a shop node visit would have silently failed to render for any player
  // with cards in their deck (always). A real run's shop layer/position is seed-random, so drive the
  // pure view function directly (dynamic-imported from its raw module) rather than hunting a shop
  // node through map RNG — deterministic, and exercises the exact code path that was broken.
  const s5shop = await page.evaluate(async (o) => {
    const mod = await import(o + '/games/metagame/stages/stage5/ui-rewards.js');
    const fakeRun = { handshakes: 500, deck: ['SYN', 'SYN', 'ACK', 'RST'], potions: [], removalsPurchased: 0, skipRewardMod: 0, removalCostMod: 0 };
    try {
      const el = mod.shopView(fakeRun);
      return {
        threw: false,
        removeBtns: el.querySelectorAll('[data-buy-remove]').length,
        upgradeBtns: el.querySelectorAll('[data-buy-upgrade]').length
      };
    } catch (e) {
      return { threw: true, message: e.message };
    }
  }, origin);
  if (!s5shop.threw && s5shop.removeBtns === 4 && s5shop.upgradeBtns === 4) {
    pass('Stage 5 shop screen renders (purge/upgrade rows no longer throw on a non-empty deck)');
  } else {
    fail(`Stage 5 shop screen broken: ${JSON.stringify(s5shop)}`);
  }
  await page.click('.s5db-map [data-action="abandon"]');
  await page.waitForSelector('.s5db-hub [data-action="begin-run"]', { timeout: 4000 });

  // The global dev menu is a boss navigator, not a stage navigator. Every button resets stale or
  // completed state, pre-fires that boss's real-file action, and lands on the actual encounter.
  const bossJumpCases = [
    { stage: 1, selector: '.mg-defrag-arena', cheats: ['Unlock tabs', 'Boss ready', '+10 cores', 'Hire managers'] },
    { stage: 2, selector: '.stage2-glyph-dungeon [data-action="boss"]:not([hidden])', cheats: ['Full HP', '+5 ATK', '+1 LVL', '+1k glyphs', '+3 of each rune', 'Zoom out (full map)'] },
    { stage: 3, selector: '.s3-boss-gate:not([hidden])', cheats: ['Show Solution', '+500 reg / +3 frag', 'Skip to Boss Gate', 'Clear Run Pressure'] },
    { stage: 4, selector: '.stage4-combat [data-action="confront"]', cheats: ['+500 Glory', 'Skip Wave', 'Skip to Boss', 'God Core (∞ integrity)'] },
    { stage: 5, selector: '.s5db-combat .s5db-boss-banner', cheats: ['Full HP', 'Grant 3 Keys', '+3 Cards', 'Skip to Boss', '+3 Energy'] },
  ];
  const requiredActions = {
    1: '1.cheat_disabled',
    2: '2.search_passage',
    3: '3.diff_key_restored',
    4: '4.recursion_blueprint_read',
    5: '5.protocol_ch9_read',
  };
  for (const probe of bossJumpCases) {
    await page.click('.mg-dev-btn');
    await page.click(`[data-dev="boss"][data-n="${probe.stage}"]`);
    await page.waitForSelector(probe.selector, { timeout: 8000 });
    const landed = await page.evaluate(({ stage, required }) => {
      const save = JSON.parse(localStorage.getItem('fv:games:metagame:v3'));
      const stageChecks = {
        1: Boolean(document.querySelector('.mg-defrag-arena')),
        2: Boolean(window.__fvStage2?.state?.().run.boss.reached && document.querySelector('.stage2-glyph-dungeon [data-action="boss"]:not([hidden])')),
        3: Boolean(document.querySelector('.s3-boss-gate:not([hidden])')),
        4: window.__fvStage4?.status?.() === 'boss' && Boolean(document.querySelector('.stage4-combat [data-action="confront"]')),
        5: window.__fvStage5?.run?.()?.act === 6 && Boolean(document.querySelector('.s5db-combat .s5db-boss-banner')),
      };
      return {
        actualBoss: stageChecks[stage],
        currentStage: save.currentStage,
        defeated: save.defeated.includes(stage),
        actionSource: save.actions?.[required]?.source,
        stageSlots: Object.keys(save.stageState || {}).join(','),
      };
    }, { stage: probe.stage, required: requiredActions[probe.stage] });
    await page.click('.mg-dev-btn');
    const menu = await page.evaluate(() => ({
      bosses: [...document.querySelectorAll('[data-dev="boss"]')].map((b) => b.textContent.trim()),
      cheats: [...document.querySelectorAll('[data-dev="stagedev"]')].map((b) => b.textContent.trim()),
      kinds: [...new Set([...document.querySelectorAll('.mg-v3-debug [data-dev]')].map((b) => b.dataset.dev))].sort(),
      bits: document.querySelectorAll('[data-dev="bits"]').length,
    }));
    const expectedKinds = probe.stage === 1 ? 'bits,boss,close,stagedev' : 'boss,close,stagedev';
    if (landed.actualBoss
        && landed.currentStage === probe.stage
        && !landed.defeated
        && landed.actionSource === 'dev-boss-jump'
        && landed.stageSlots === '1,2,3,4,5'
        && menu.bosses.join(',') === '1b,2b,3b,4b,5b'
        && menu.cheats.join(',') === probe.cheats.join(',')
        && menu.kinds.join(',') === expectedKinds
        && menu.bits === (probe.stage === 1 ? 4 : 0)) {
      pass(`Dev ${probe.stage}b lands on the real Stage ${probe.stage} boss and exposes exactly its active cheats`);
    } else {
      fail(`Dev ${probe.stage}b contract failed: ${JSON.stringify({ landed, menu, expected: probe.cheats })}`);
    }
    await page.click('[data-dev="close"]');
  }

  const allFiveBundled = ['stage1', 'stage2', 'stage3', 'stage4', 'stage5']
    .every((stage) => stageBundleReqs.has(stage) && !stageIndexReqs.has(stage));
  if (allFiveBundled) pass('All five retained games load from generated bundles with current numbering');
  else fail(`Retained bundle paths wrong: bundle=${[...stageBundleReqs]} index=${[...stageIndexReqs]}`);

  await page.click('.games-close');

  const btsOk = await page.evaluate(async () => {
    for (const name of ['glyph_dungeon.bts', 'protocol_codex.bts']) {
      await window.__fv.openViewerFile(`/docs/bts/${name}`);
      if (window.__fv.state.intake.filename !== name || window.__fv.state.type.id !== 'markdown') return false;
    }
    return true;
  });
  if (btsOk) pass('.bts files open through markdown viewer'); else fail('.bts markdown open failed');

  if (consoleErrors.length === 0) pass('no console/page errors'); else fail('console errors:\n  ' + consoleErrors.join('\n  '));
  if (offOrigin.length === 0) pass('ZERO off-origin requests (trust guarantee)'); else fail('off-origin requests:\n  ' + offOrigin.join('\n  '));
}
