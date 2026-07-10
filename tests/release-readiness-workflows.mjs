// Release-readiness evidence for cross-cutting workflows and responsive settings surfaces.
// This is intentionally separate from smoke assertions: every screenshot is reviewed by a human
// or vision-capable reviewer before its Visual verdict can change from "pending" to "pass".
import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHarness, finish, pass, fail, isBenignConsoleError, isBenignPageError } from './harness.mjs';

const OUT = new URL('../artifacts/v0.1.0-public-beta-readiness/cross-workflows/', import.meta.url).pathname;
await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

// Monaco's nested compositor layers intermittently raster as black rectangles in SwiftShader
// screenshots on this WSL runner. Software compositing keeps visual evidence deterministic.
const ctx = await createHarness({ launchArgs: ['--disable-gpu'] });
const { browser, origin } = ctx;
const originValue = new URL(origin).origin;
const evidence = {
  generatedAt: new Date().toISOString(),
  origin,
  screenshots: [],
  failures: [],
};

function isAllowedRequest(url) {
  if (/^(data|blob|about):/.test(url)) return true;
  try { return new URL(url).origin === originValue; } catch { return false; }
}

async function makeSurface({ width, height, theme, mobile = false }) {
  const context = await browser.newContext({
    viewport: { width, height },
    colorScheme: theme,
    userAgent: mobile
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1'
      : undefined,
  });
  await context.addInitScript((value) => {
    try { if (window === window.top) localStorage.setItem('fv:theme', value); } catch { /* opaque preview frame */ }
  }, theme);
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  page.setDefaultNavigationTimeout(60000);
  const consoleErrors = [];
  const offOrigin = [];
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    if (!isBenignConsoleError(msg.text(), msg.location()?.url || '')) consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => {
    if (!isBenignPageError(err.message)) consoleErrors.push(`pageerror: ${err.message}`);
  });
  page.on('request', (request) => {
    if (!isAllowedRequest(request.url())) offOrigin.push(request.url());
  });
  await page.goto(origin, { waitUntil: 'load' });
  await page.waitForFunction(() => typeof window.__fv !== 'undefined', null, { timeout: 20000 });
  return { context, page, consoleErrors, offOrigin, width, height, theme, mobile };
}

async function openExample(page, label) {
  const opened = await page.evaluate((value) => window.__fv.openExampleByLabel(value), label);
  if (!opened) throw new Error(`example not found: ${label}`);
  await page.waitForSelector('#workspace:not([hidden])', { timeout: 30000 });
  await page.waitForFunction(() => !document.getElementById('previewHost')?.classList.contains('file-loading'), null, { timeout: 30000 }).catch(() => {});
}

async function layoutMetrics(page) {
  return page.evaluate(() => {
    const visible = (el) => {
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const clipped = [...document.querySelectorAll('button, input, select, summary, [role="button"], .drawer, .topbar, .more-menu')]
      .filter(visible)
      .map((el) => {
        const r = el.getBoundingClientRect();
        const position = getComputedStyle(el).position;
        return {
          selector: el.id ? `#${el.id}` : `${el.tagName.toLowerCase()}.${String(el.className || '').trim().replace(/\s+/g, '.')}`,
          left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), bottom: Math.round(r.bottom),
          fixed: position === 'fixed' || position === 'sticky',
        };
      })
      .filter((r) => r.left < -1 || r.right > innerWidth + 1 || (r.fixed && (r.top < -1 || r.bottom > innerHeight + 1)));
    return {
      viewport: [innerWidth, innerHeight],
      documentScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      horizontalPageOverflow: document.documentElement.scrollWidth > innerWidth + 1,
      clippedInteractive: clipped,
      activeElement: document.activeElement?.id || document.activeElement?.className || document.activeElement?.tagName || '',
    };
  });
}

async function capture(surface, id, checks = {}, screenshotOptions = {}) {
  const { page, consoleErrors, offOrigin, width, height, theme, mobile } = surface;
  const filename = `${id}-${width}x${height}-${theme}${mobile ? '-mobile-ua' : ''}.png`;
  const screenshotPath = join(OUT, filename);
  // These are viewport trials, and Monaco uses compositor-backed layers. Chromium's full-page
  // stitching can intermittently capture unpainted black rectangles after a nested toolbar is
  // scrolled, even though the live viewport is intact. Capture the evaluated viewport directly.
  if (screenshotOptions.selector) {
    await page.locator(screenshotOptions.selector).screenshot({ path: screenshotPath });
  } else {
    const screenshot = { path: screenshotPath };
    if (screenshotOptions.clip) screenshot.clip = screenshotOptions.clip;
    else screenshot.fullPage = false;
    await page.screenshot(screenshot);
  }
  const screenshotSha256 = createHash('sha256').update(await readFile(screenshotPath)).digest('hex');
  const record = {
    id,
    screenshot: `cross-workflows/${filename}`,
    screenshotSha256,
    viewport: `${width}x${height}`,
    theme,
    mobileUserAgent: mobile,
    captureRegion: screenshotOptions.label || 'viewport',
    checks,
    layout: await layoutMetrics(page),
    consoleErrors: [...new Set(consoleErrors)],
    offOrigin: [...new Set(offOrigin)],
    technical: 'pending',
    visual: 'pending',
    observation: 'pending individual screenshot review',
  };
  const checkPass = Object.values(checks).every((value) => value === true || (typeof value === 'number' && value > 0));
  record.technical = checkPass && !record.consoleErrors.length && !record.offOrigin.length ? 'pass' : 'fail';
  evidence.screenshots.push(record);
  if (record.technical === 'pass') pass(`${id}: technical evidence captured`);
  else {
    const message = `${id}: technical evidence failed: ${JSON.stringify(record)}`;
    evidence.failures.push(message);
    fail(message);
  }
}

async function runScenario(config, fn) {
  const surface = await makeSurface(config);
  try { await fn(surface); }
  finally { await surface.context.close(); }
}

try {
  await runScenario({ width: 1440, height: 900, theme: 'light' }, async (surface) => {
    const { page } = surface;
    const checks = await page.evaluate(() => ({
      intakeVisible: !document.getElementById('intake').hidden,
      openFile: !!document.getElementById('fileInput'),
      openFolder: !!document.getElementById('folderInput'),
      newFile: !!document.getElementById('newFileBtn'),
      examples: !!document.getElementById('loadExamplesBtn'),
    }));
    await capture(surface, 'WF-intake', checks);
  });

  await runScenario({ width: 1280, height: 720, theme: 'dark' }, async (surface) => {
    const { page } = surface;
    await page.click('#loadExamplesBtn');
    await page.waitForSelector('#examples .ex-folder-label', { timeout: 20000 });
    const groups = await page.$$eval('#examples .ex-folder-label', (els) => els.length);
    await page.click('#examples .ex-showall-btn');
    await page.waitForSelector('#examples .ex-file-btn');
    await page.evaluate(() => {
      window.scrollTo(0, 0);
      for (const el of [document.scrollingElement, document.getElementById('intake'), document.getElementById('examples')]) {
        if (el) el.scrollTop = 0;
      }
    });
    const checks = await page.evaluate((groupCount) => ({
      groups: groupCount,
      samples: document.querySelectorAll('#examples .ex-file-btn').length,
      search: !!document.querySelector('#examples input[type="search"]'),
    }), groups);
    await capture(surface, 'WF-examples', checks);
  });

  await runScenario({ width: 390, height: 844, theme: 'light', mobile: true }, async (surface) => {
    const { page } = surface;
    await page.evaluate(async () => {
      const mk = (text, name, path) => ({ file: new File([text], name, { type: 'text/plain' }), path });
      await window.__fv.loadFolder([
        mk('# Project\nneedle alpha', 'README.md', 'project/README.md'),
        mk('export const needle = true;', 'app.js', 'project/src/app.js'),
        mk('a,b\n1,2', 'rows.csv', 'project/data/rows.csv'),
        mk('plain', 'notes.txt', 'project/docs/notes.txt'),
      ]);
    });
    await page.evaluate(() => document.getElementById('treeBtn')?.click());
    await page.waitForSelector('#fileTree:not([hidden])');
    await page.click('#ftExpandBtn');
    await page.fill('#ftSearchInput', 'needle');
    await page.press('#ftSearchInput', 'Enter');
    await page.waitForTimeout(500);
    const checks = await page.evaluate(() => ({
      treeVisible: !document.getElementById('fileTree').hidden,
      rows: document.querySelectorAll('#fileTree .ft-row').length,
      searchVisible: !document.getElementById('ftSearch').hidden,
      count: /^2 files \(name \+ contents\)$/.test(document.getElementById('ftSearchCount').textContent),
      prefixedContentMatch: !!document.querySelector('#fileTree .ft-file[data-full-path="project/README.md"]'),
      floatingControlsHidden: ['offlineStatus', '.construction-badge'].every((id) => {
        const el = id.startsWith('.') ? document.querySelector(id) : document.getElementById(id);
        return el && getComputedStyle(el).visibility === 'hidden';
      }),
    }));
    await capture(surface, 'WF-folder-search', checks);
  });

  await runScenario({ width: 1440, height: 900, theme: 'dark' }, async (surface) => {
    const { page } = surface;
    await openExample(page, 'sample.png');
    await page.evaluate(() => document.getElementById('metaBtn').click());
    await page.waitForSelector('#metaDrawer:not([hidden])');
    await page.waitForFunction(() => document.querySelectorAll('#metaBody .meta-row, #metaBody tr').length > 0);
    const checks = await page.evaluate(() => ({
      drawer: !document.getElementById('metaDrawer').hidden,
      rows: document.querySelectorAll('#metaBody .meta-row, #metaBody tr').length,
      scrollable: document.getElementById('metaBody').scrollHeight >= document.getElementById('metaBody').clientHeight,
    }));
    await capture(surface, 'WF-metadata', checks);
  });

  await runScenario({ width: 1280, height: 720, theme: 'light' }, async (surface) => {
    const { page } = surface;
    await openExample(page, 'welcome.md');
    await page.waitForSelector('#editor .monaco-editor', { timeout: 30000 });
    await page.evaluate(() => window.__fv.state.rawview.setValue('# Changed title\n\nA deeply edited paragraph.'));
    await page.evaluate(() => window.__fv.setRawMode('diff'));
    await page.waitForFunction(() => [...document.querySelectorAll('#editor .monaco-diff-editor, #editor .monaco-editor')]
      .some((el) => el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height > 0));
    const checks = await page.evaluate(() => ({
      dirty: window.__fv.state.rawview.isDirty(),
      diffMode: document.getElementById('panes').dataset.rawmode === 'diff' || document.querySelector('#rawMode [data-raw="diff"]')?.classList.contains('active'),
      editor: !!document.querySelector('#editor .monaco-editor'),
    }));
    await capture(surface, 'WF-edit-diff', checks);
    const formattingBar = page.locator('.md-tools-bar:has(#wysiwygBtn)');
    const hadOverflow = await formattingBar.evaluate((bar) => bar.scrollWidth > bar.clientWidth + 1);
    if (hadOverflow) {
      await page.locator('#wysiwygBtn').evaluate((button) => {
        button.scrollIntoView({ block: 'nearest', inline: 'end' });
      });
    }
    const toolbarChecks = await page.evaluate((overflowed) => {
      const bar = document.querySelector('.md-tools-bar:has(#wysiwygBtn)');
      const wys = document.getElementById('wysiwygBtn')?.getBoundingClientRect();
      const raw = document.getElementById('rawPane')?.getBoundingClientRect();
      return {
        toolbarOverflowHandled: !overflowed || bar.scrollLeft > 0,
        endControlVisible: !wys || !raw || (wys.left >= raw.left && wys.right <= raw.right + 1),
      };
    }, hadOverflow);
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.waitForTimeout(150);
    await capture(surface, 'WF-edit-diff-toolbar-end', toolbarChecks, {
      label: 'actual formatting toolbar at horizontal-scroll end',
      selector: '.md-tools-bar:has(#wysiwygBtn)',
    });
  });

  await runScenario({ width: 390, height: 844, theme: 'dark', mobile: true }, async (surface) => {
    const { page } = surface;
    await openExample(page, 'welcome.md');
    await page.evaluate(() => document.getElementById('compareBtn').click());
    await page.setInputFiles('#compareInput', {
      name: 'comparison.md', mimeType: 'text/markdown', buffer: Buffer.from('# Comparison\n\nDifferent content.'),
    });
    await page.waitForSelector('.sbs-overlay');
    const checks = await page.evaluate(() => ({
      overlay: !!document.querySelector('.sbs-overlay'),
      panes: document.querySelectorAll('.sbs-pane').length,
      names: document.querySelectorAll('.sbs-fname').length,
      modes: document.querySelectorAll('.sbs-mode-btn').length,
    }));
    await capture(surface, 'WF-compare', checks);
  });

  await runScenario({ width: 1440, height: 900, theme: 'light' }, async (surface) => {
    const { page } = surface;
    await openExample(page, 'sample.csv');
    await page.evaluate(() => document.getElementById('exportBtn').click());
    await page.waitForSelector('#exportMenu:not([hidden]) .export-item');
    const checks = await page.evaluate(() => ({
      menu: !document.getElementById('exportMenu').hidden,
      actions: document.querySelectorAll('#exportMenu .export-item').length,
      download: !document.getElementById('downloadBtn').hidden,
    }));
    await capture(surface, 'WF-download-export', checks);
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('#exportMenu .export-item:has-text("JSON")'),
    ]);
    if (!/\.json$/i.test(download.suggestedFilename())) throw new Error(`unexpected export filename: ${download.suggestedFilename()}`);
  });

  const grid = [
    { width: 1440, height: 900, theme: 'light', mobile: false },
    { width: 1440, height: 900, theme: 'dark', mobile: false },
    { width: 1280, height: 720, theme: 'light', mobile: false },
    { width: 1280, height: 720, theme: 'dark', mobile: false },
    { width: 390, height: 844, theme: 'light', mobile: true },
    { width: 390, height: 844, theme: 'dark', mobile: true },
  ];
  for (const config of grid) {
    await runScenario(config, async (surface) => {
      const { page, mobile } = surface;
      await openExample(page, 'welcome.md');
      await page.evaluate(() => document.getElementById('settingsBtn').click());
      await page.waitForSelector('#settingsDrawer:not([hidden])');
      await page.evaluate(() => document.querySelector('.companion-panel > summary')?.click());
      await page.keyboard.press('Tab');
      const checks = await page.evaluate((isMobile) => ({
        drawer: !document.getElementById('settingsDrawer').hidden,
        companion: !!document.querySelector('.companion-panel'),
        mobileExplanation: !isMobile || /desktop-only/i.test(document.querySelector('.companion-panel')?.textContent || ''),
        desktopControls: isMobile || !!document.getElementById('companionEnabledToggle'),
        focused: document.activeElement !== document.body,
        badgeBehindDrawer: Number(getComputedStyle(document.querySelector('.construction-badge')).zIndex)
          < Number(getComputedStyle(document.getElementById('settingsDrawer')).zIndex),
        floatingControlsHidden: ['offlineStatus', '.construction-badge'].every((id) => {
          const el = id.startsWith('.') ? document.querySelector(id) : document.getElementById(id);
          return el && getComputedStyle(el).visibility === 'hidden';
        }),
        trustTextContrast: (() => {
          const el = document.querySelector('.companion-download p, .companion-net');
          if (!el) return isMobile;
          const rgb = (value) => (value.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
          const lum = (value) => {
            const [r, g, b] = rgb(value).map((v) => {
              const c = v / 255;
              return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
            });
            return 0.2126 * r + 0.7152 * g + 0.0722 * b;
          };
          const fg = lum(getComputedStyle(el).color);
          const bg = lum(getComputedStyle(document.getElementById('settingsDrawer')).backgroundColor);
          return (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05) >= 4.5;
        })(),
      }), mobile);
      await capture(surface, `WF-settings-companion-${surface.width}x${surface.height}-${surface.theme}`, checks);
    });
  }
} catch (err) {
  const message = err?.stack || String(err);
  evidence.failures.push(message);
  fail(`release-readiness workflows exception: ${message}`);
} finally {
  await writeFile(join(OUT, 'evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  await finish(ctx);
}
