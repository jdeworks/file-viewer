// shots.mjs — screenshot playtest driver for metagame stages 3-10 (UX audit evidence).
// Reuses the repo smoke harness (server + chromium). Desktop + phone passes.
// Run from anywhere: node docs/games/metagame/planning/ux-audit-2026-07/tools/shots.mjs
// Output (screenshots + metrics.json) goes to $SHOTS_OUT or the OS temp dir — never the repo.
import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';

const { createHarness, finish } = await import(new URL('../../../../../../tests/harness.mjs', import.meta.url).href);
const OUT = (process.env.SHOTS_OUT || `${tmpdir()}/fv-ux-shots`) + '/';
console.log('writing screenshots to', OUT);
const metrics = [];
const errors = [];

const ctx = await createHarness();
const { browser, origin } = ctx;

async function newGamePage(viewport, opts = {}) {
  const c = await browser.newContext({ viewport, ...opts });
  const page = await c.newPage();
  page.setDefaultTimeout(25000);
  page.on('pageerror', (e) => errors.push({ vp: viewport.width, msg: String(e.message || e) }));
  page.on('console', (m) => { if (m.type() === 'error') errors.push({ vp: viewport.width, msg: m.text().slice(0, 200) }); });
  page.on('dialog', (d) => { d.accept().catch(() => {}); });
  await page.goto(origin, { waitUntil: 'load' });
  await page.waitForFunction(() => typeof window.__fv !== 'undefined', { timeout: 20000 });
  return { c, page };
}

async function openMetagame(page) {
  await page.waitForFunction(() => window.__fv?.games, { timeout: 15000 });
  await page.evaluate(() => { window.__fv.games.unlock(); window.__fv.games.open(); });
  await page.waitForSelector('.games-overlay:not([hidden])', { timeout: 10000 });
  await page.click('.games-card[data-game="metagame"]');
  await page.waitForSelector('.mg-v3', { timeout: 10000 });
  await page.waitForTimeout(300);
}

async function gotoStage(page, n, rootSel) {
  if (!(await page.$('.mg-v3'))) await openMetagame(page); // recover if the overlay got closed
  await page.click(`.mg-v3-stage[data-stage="${n}"]`);
  await page.waitForSelector(rootSel, { timeout: 15000 });
  await page.waitForTimeout(500);
}

// Player-view screenshot + scroll metrics for the games panel.
async function shot(page, dir, name) {
  await mkdir(`${OUT}${dir}`, { recursive: true });
  await page.screenshot({ path: `${OUT}${dir}/${name}.png` });
  const m = await page.evaluate(() => {
    const panel = document.querySelector('.games-panel');
    if (!panel) return null;
    return { panelScrollH: panel.scrollHeight, panelClientH: panel.clientHeight, winH: innerHeight, winW: innerWidth };
  });
  metrics.push({ dir, name, ...m });
  console.log(`shot ${dir}/${name}`, m ? `content ${m.panelScrollH}px vs visible ${m.panelClientH}px` : '');
}

// Full-content screenshot: temporarily un-clip the panel so the WHOLE stage document is visible.
async function shotFull(page, dir, name) {
  await mkdir(`${OUT}${dir}`, { recursive: true });
  await page.evaluate(() => {
    const s = document.createElement('style');
    s.id = '__auditFull';
    s.textContent = '.games-overlay{position:absolute!important;align-items:flex-start!important}.games-panel{max-height:none!important;overflow:visible!important}';
    document.head.appendChild(s);
  });
  await page.waitForTimeout(120);
  const el = await page.$('.games-panel');
  if (el) await el.screenshot({ path: `${OUT}${dir}/${name}.png` }).catch((e) => console.log('full-shot fail', name, e.message));
  await page.evaluate(() => document.getElementById('__auditFull')?.remove());
  await page.waitForTimeout(80);
}

async function scrollPanelTo(page, sel) {
  await page.evaluate((s) => {
    const t = document.querySelector(s);
    if (t) t.scrollIntoView({ block: 'center' });
  }, sel);
  await page.waitForTimeout(200);
}

async function drive(dir, viewport, opts, phoneLite = false) {
  const { c, page } = await newGamePage(viewport, opts);
  try {
    await openMetagame(page);
    await shot(page, dir, 'shell-hub');

    // ---- Stage 3
    await gotoStage(page, 3, '.stage3-memory-grid');
    await shot(page, dir, 's3-initial');
    if (!phoneLite) {
      await shotFull(page, dir, 's3-initial-full');
      await page.click('button[data-action="shop"]').catch(() => {});
      await page.waitForTimeout(300);
      await shot(page, dir, 's3-shop-modal');
      await page.evaluate(() => document.querySelector('.mg-modal-backdrop')?.click());
      await page.waitForTimeout(200);
      await page.evaluate(() => { for (let i = 0; i < 6; i++) window.__fvStage3?.solveCurrent?.(); });
      await page.waitForTimeout(400);
      await shot(page, dir, 's3-midgame');
      await shotFull(page, dir, 's3-midgame-full');
    }

    // ---- Stage 4
    await gotoStage(page, 4, '.stage4-fractal-bastion, .stage4-armory');
    await shot(page, dir, 's4-map-select');
    await page.evaluate(() => window.__fvStage4?.selectMap?.(0));
    await page.waitForSelector('.s4-board', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(300);
    await shot(page, dir, 's4-combat-idle');
    if (!phoneLite) await shotFull(page, dir, 's4-combat-idle-full');
    await page.evaluate(() => { window.__fvStage4?.startWave?.(); window.__fvStage4?.advance?.(4000, 100); });
    await page.waitForTimeout(300);
    await shot(page, dir, 's4-combat-wave');

    // ---- Stage 5
    await gotoStage(page, 5, '.stage5-signal-racer');
    await shot(page, dir, 's5-select');
    if (!phoneLite) await shotFull(page, dir, 's5-select-full');
    await page.evaluate(() => window.__fvStage5?.startRound?.(0));
    await page.waitForTimeout(900);
    await shot(page, dir, 's5-racing');
    await page.waitForTimeout(700);
    await shot(page, dir, 's5-racing-2');

    // ---- Stage 6
    await gotoStage(page, 6, '.stage6-protocol-codex');
    await shot(page, dir, 's6-hub');
    if (!phoneLite) await shotFull(page, dir, 's6-hub-full');
    await page.evaluate(() => window.__fvStage6?.beginRun?.({}));
    await page.waitForTimeout(400);
    await shot(page, dir, 's6-map');
    const node = await page.evaluate(() => {
      const n = document.querySelector('button.s6db-node.is-available');
      if (n) n.click();
      return Boolean(n);
    });
    if (node) {
      await page.waitForSelector('.s6db-hand', { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(300);
      await shot(page, dir, 's6-combat-top');
      await shotFull(page, dir, 's6-combat-full');
      await scrollPanelTo(page, '.s6db-hand');
      await shot(page, dir, 's6-combat-hand');
      await page.evaluate(() => document.querySelector('.s6db-hand [data-play]:not([disabled])')?.click());
      await page.waitForTimeout(400);
      await shot(page, dir, 's6-combat-after-play');
    }

    // ---- Stage 7
    await gotoStage(page, 7, '.stage7-identity-arbiter');
    await shot(page, dir, 's7-ss1');
    if (!phoneLite) {
      await shotFull(page, dir, 's7-ss1-full');
      await page.evaluate(() => window.__fvStage7?.solveInvestigation?.());
      await page.waitForTimeout(300);
      await shot(page, dir, 's7-ss4');
      await page.evaluate(() => {
        const h = window.__fvStage7; if (!h) return;
        h.state().substage = 5; h.solveCase2();
      });
      await page.waitForTimeout(300);
      await shot(page, dir, 's7-board');
      await shotFull(page, dir, 's7-board-full');
    }

    // ---- Stage 8
    await gotoStage(page, 8, '.stage8-entropy-field');
    await shot(page, dir, 's8-initial');
    if (!phoneLite) {
      await shotFull(page, dir, 's8-initial-full');
      await page.evaluate(() => window.__fvStage8?.advance?.(12));
      await page.evaluate(() => document.querySelectorAll('details.s8-tech-panel').forEach((d) => { d.open = true; }));
      await page.waitForTimeout(300);
      await shot(page, dir, 's8-mid');
      await shotFull(page, dir, 's8-mid-full');
      await page.evaluate(() => window.__fvStage8?.bodySolver?.());
      await page.waitForTimeout(400);
      await shot(page, dir, 's8-late');
      await shotFull(page, dir, 's8-late-full');
    }

    // ---- Stage 9
    await gotoStage(page, 9, '.stage9-observer-state');
    await page.waitForTimeout(600);
    await shot(page, dir, 's9-initial');
    if (!phoneLite) {
      await shotFull(page, dir, 's9-initial-full');
      await page.evaluate(() => { const h = window.__fvStage9; if (h) for (let i = 0; i < 6; i++) h.solveLevel(); });
      await page.waitForTimeout(500);
      await shot(page, dir, 's9-mid');
      await page.evaluate(() => window.__fvStage9?.crossAt?.(999999));
      await shot(page, dir, 's9-miss-flash');
    }

    // ---- Stage 10 (exit first so the metagame's own save flush can't overwrite the patch)
    await page.evaluate(() => document.querySelector('.mg-back')?.click());
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      const raw = localStorage.getItem('fv:games:metagame:v3');
      if (!raw) return;
      const save = JSON.parse(raw);
      if (!save.unlockedStages?.includes(10)) { save.unlockedStages.push(10); localStorage.setItem('fv:games:metagame:v3', JSON.stringify(save)); }
    });
    await page.click('.games-card[data-game="metagame"]');
    await page.waitForSelector('.mg-v3', { timeout: 8000 });
    await page.waitForTimeout(300);
    await gotoStage(page, 10, '.mg-stage10');
    await shot(page, dir, 's10-stepper');
    if (!phoneLite) {
      await shotFull(page, dir, 's10-stepper-full');
      await page.evaluate(() => window.__fvStage10?.witnessAll?.());
      await page.waitForTimeout(300);
      await shot(page, dir, 's10-stepper-witnessed');
      await page.evaluate(() => window.__fvStage10?.confront?.start?.());
      await page.waitForTimeout(300);
      await shot(page, dir, 's10-confront-a');
      await shotFull(page, dir, 's10-confront-a-full');
      await page.evaluate(() => window.__fvStage10?.confront?.answerCompactionAll?.());
      await page.waitForTimeout(300);
      await shot(page, dir, 's10-confront-b');
      await page.evaluate(() => window.__fvStage10?.confront?.resolveFragmentationAll?.());
      await page.waitForTimeout(300);
      await shot(page, dir, 's10-confront-c');
      await page.evaluate(() => window.__fvStage10?.confront?.answerCoreAll?.('seeker'));
      await page.waitForTimeout(300);
      await shot(page, dir, 's10-final-question');
      await shotFull(page, dir, 's10-final-question-full');
      await page.evaluate(() => {
        const b = [...document.querySelectorAll('[data-final-choice]')].find((x) => !x.disabled);
        b?.click();
      });
      await page.waitForTimeout(400);
      await shot(page, dir, 's10-ending');
      await shotFull(page, dir, 's10-ending-full');
    }
  } catch (e) {
    console.log(`DRIVE ERROR (${dir}):`, e.message);
  } finally {
    await c.close().catch(() => {});
  }
}

await drive('desktop', { width: 1280, height: 800 }, {});
await drive('phone', { width: 390, height: 844 }, { hasTouch: true, isMobile: true, deviceScaleFactor: 2 }, true);

await writeFile(`${OUT}metrics.json`, JSON.stringify({ metrics, errors: errors.slice(0, 60) }, null, 2));
console.log('\nDONE. metrics:', metrics.length, 'console/page errors:', errors.length);
await finish(ctx);
