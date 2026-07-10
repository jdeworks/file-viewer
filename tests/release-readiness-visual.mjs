import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { basename, join } from 'node:path';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { FORMAT_CASES, FORMAT_CONFIGS } from './release-readiness-format-cases.mjs';
import {
  FORMAT_ARTIFACT_ROOT, FORMAT_SCREENSHOT_ROOT, REPO_ROOT,
  closeServer, ensureFormatArtifactDirs, isAllowedFormatUrl, loadChromium,
  sha256, sha256File, startFormatServer,
} from './release-readiness-format-helpers.mjs';

const require = createRequire(import.meta.url);
const { PNG } = require('pngjs');
const captureMode = process.argv.includes('--capture');
const mergeOnly = process.argv.includes('--merge-review');
const evidencePath = join(FORMAT_ARTIFACT_ROOT, 'format-visual-evidence.json');
const reviewPath = join(FORMAT_ARTIFACT_ROOT, 'format-manual-review.json');

async function readJson(path, fallback = null) {
  try { return JSON.parse(await readFile(path, 'utf8')); } catch { return fallback; }
}

function imageStats(bytes) {
  const png = PNG.sync.read(bytes);
  const pixels = png.width * png.height;
  const stride = Math.max(1, Math.floor(pixels / 120000));
  const colors = new Set();
  let sampled = 0;
  let alphaZero = 0;
  let sum = 0;
  let sumSquares = 0;
  let darkest = 255;
  let lightest = 0;
  for (let pixel = 0; pixel < pixels; pixel += stride) {
    const i = pixel * 4;
    const r = png.data[i];
    const g = png.data[i + 1];
    const b = png.data[i + 2];
    const a = png.data[i + 3];
    if (a === 0) alphaZero++;
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    sum += luminance;
    sumSquares += luminance * luminance;
    darkest = Math.min(darkest, luminance);
    lightest = Math.max(lightest, luminance);
    colors.add(`${r >> 3},${g >> 3},${b >> 3},${a >> 5}`);
    sampled++;
  }
  const mean = sum / Math.max(1, sampled);
  const variance = Math.max(0, sumSquares / Math.max(1, sampled) - mean * mean);
  return {
    width: png.width,
    height: png.height,
    sampledPixels: sampled,
    quantizedColors: colors.size,
    luminanceMean: Number(mean.toFixed(2)),
    luminanceStdDev: Number(Math.sqrt(variance).toFixed(2)),
    luminanceRange: Number((lightest - darkest).toFixed(2)),
    transparentSampleRatio: Number((alphaZero / Math.max(1, sampled)).toFixed(5)),
    nearUniform: colors.size < 8 || Math.sqrt(variance) < 2,
  };
}

async function captureLocator(locator, path) {
  await locator.screenshot({ path, animations: 'disabled', timeout: 30000 });
  const bytes = await readFile(path);
  return { path: path.slice(REPO_ROOT.length + 1), sha256: sha256(bytes), stats: imageStats(bytes) };
}

async function collectFrameMetrics(frame) {
  if (!frame) return null;
  return frame.evaluate(() => {
    const body = document.body;
    const html = document.documentElement;
    const visible = (el) => {
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && +style.opacity !== 0 && rect.width > 0 && rect.height > 0;
    };
    const canvases = [...document.querySelectorAll('canvas')].map((canvas) => {
      const rect = canvas.getBoundingClientRect();
      let painted2d = null;
      try {
        const context = canvas.getContext('2d');
        if (context && canvas.width && canvas.height) {
          const sample = context.getImageData(0, 0, Math.min(canvas.width, 64), Math.min(canvas.height, 64)).data;
          painted2d = false;
          for (let i = 3; i < sample.length; i += 4) if (sample[i] !== 0) { painted2d = true; break; }
        }
      } catch { /* tainted or non-2D canvas; screenshot inspection remains authoritative */ }
      return { width: canvas.width, height: canvas.height, rectWidth: rect.width, rectHeight: rect.height, painted2d };
    });
    const images = [...document.images].map((image) => ({
      alt: image.alt || '', naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight,
      rectWidth: image.getBoundingClientRect().width, rectHeight: image.getBoundingClientRect().height,
      complete: image.complete,
    }));
    const tinyText = [...document.querySelectorAll('body *')].filter((el) => visible(el) && (el.textContent || '').trim())
      .map((el) => ({ tag: el.tagName, className: String(el.className || '').slice(0, 100), px: Number.parseFloat(getComputedStyle(el).fontSize) }))
      .filter((row) => row.px > 0 && row.px < 10).slice(0, 20);
    return {
      url: location.href,
      text: (body?.innerText || '').replace(/\s+/g, ' ').trim(),
      textLength: (body?.innerText || '').trim().length,
      scrollWidth: Math.max(body?.scrollWidth || 0, html?.scrollWidth || 0),
      clientWidth: html?.clientWidth || 0,
      scrollHeight: Math.max(body?.scrollHeight || 0, html?.scrollHeight || 0),
      clientHeight: html?.clientHeight || 0,
      horizontalOverflow: Math.max(body?.scrollWidth || 0, html?.scrollWidth || 0) > (html?.clientWidth || 0) + 2,
      verticalScrollable: Math.max(body?.scrollHeight || 0, html?.scrollHeight || 0) > (html?.clientHeight || 0) + 2,
      bodyClasses: body?.className || '',
      canvases,
      images,
      tables: document.querySelectorAll('table').length,
      buttons: [...document.querySelectorAll('button')].filter(visible).map((button) => (button.innerText || button.getAttribute('aria-label') || '').trim()).filter(Boolean).slice(0, 40),
      links: [...document.querySelectorAll('a')].filter(visible).map((link) => (link.innerText || link.getAttribute('aria-label') || '').trim()).filter(Boolean).slice(0, 40),
      structuralItems: document.querySelectorAll('table,canvas,img,svg,.card,.cell,.slide,.page,.layer,.tree-row,[role="treeitem"],[role="row"]').length,
      tinyText,
      errorText: /Preview failed|Could not parse|Unsupported media file/i.test(body?.innerText || '') ? (body?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 500) : null,
    };
  }).catch((error) => ({ inaccessible: true, error: error.message }));
}

async function collectPageMetrics(page) {
  const pageMetrics = await page.evaluate(() => {
    const visible = (el) => {
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && +style.opacity !== 0 && !el.hidden && rect.width > 0 && rect.height > 0;
    };
    const preview = document.getElementById('previewHost');
    const editor = document.getElementById('editor');
    const rect = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom };
    };
    const interactive = [...document.querySelectorAll('button:not([hidden]),input:not([hidden]),select:not([hidden]),a[href],[tabindex]:not([tabindex="-1"])')]
      .filter(visible).map((el, index) => ({
        index, tag: el.tagName, id: el.id || '', className: String(el.className || '').slice(0, 100),
        label: (el.getAttribute('aria-label') || el.getAttribute('title') || el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 120),
        rect: rect(el),
      }));
    const outsideViewport = interactive.filter((item) => item.rect.left < -1 || item.rect.right > innerWidth + 1 || item.rect.top < -1 || item.rect.bottom > innerHeight + 1);
    const overlaps = [];
    for (let i = 0; i < interactive.length; i++) for (let j = i + 1; j < interactive.length; j++) {
      const a = interactive[i]; const b = interactive[j];
      const left = Math.max(a.rect.left, b.rect.left); const right = Math.min(a.rect.right, b.rect.right);
      const top = Math.max(a.rect.top, b.rect.top); const bottom = Math.min(a.rect.bottom, b.rect.bottom);
      const area = Math.max(0, right - left) * Math.max(0, bottom - top);
      const minArea = Math.min(a.rect.width * a.rect.height, b.rect.width * b.rect.height);
      if (area > 16 && area / Math.max(1, minArea) > 0.2) overlaps.push({ a: a.label || a.id, b: b.label || b.id, overlapRatio: Number((area / minArea).toFixed(2)) });
    }
    const canvases = [...document.querySelectorAll('#previewHost canvas')].map((canvas) => ({ width: canvas.width, height: canvas.height, rect: rect(canvas) }));
    const images = [...document.querySelectorAll('#previewHost img')].map((image) => ({ naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight, complete: image.complete, rect: rect(image) }));
    const video = document.querySelector('#previewHost video');
    return {
      viewport: { width: innerWidth, height: innerHeight, devicePixelRatio },
      theme: document.documentElement.dataset.theme,
      bodyClasses: document.body.className,
      shell: { scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2 },
      preview: { rect: rect(preview), text: (preview?.innerText || '').replace(/\s+/g, ' ').trim(), textLength: (preview?.innerText || '').trim().length, scrollWidth: preview?.scrollWidth || 0, clientWidth: preview?.clientWidth || 0, scrollHeight: preview?.scrollHeight || 0, clientHeight: preview?.clientHeight || 0, horizontalOverflow: (preview?.scrollWidth || 0) > (preview?.clientWidth || 0) + 2, verticalScrollable: (preview?.scrollHeight || 0) > (preview?.clientHeight || 0) + 2, children: preview?.children.length || 0 },
      editor: { rect: rect(editor), monacoEditors: editor?.querySelectorAll('.monaco-editor').length || 0, textLength: window.__fv?.state?.intake?.text?.length || 0 },
      selectedType: document.getElementById('typeSelect')?.value || null,
      stateType: window.__fv?.state?.type?.id || null,
      known: window.__fv?.state?.known ? { id: window.__fv.state.known.id, label: window.__fv.state.known.label } : null,
      forceBase: !!window.__fv?.state?.forceBase,
      mode: window.__fv?.state?.mode || null,
      tab: window.__fv?.state?.tab || null,
      fileName: window.__fv?.state?.intake?.filename || null,
      canvases, images,
      video: video ? { readyState: video.readyState, networkState: video.networkState, videoWidth: video.videoWidth, videoHeight: video.videoHeight, duration: video.duration, controls: video.controls } : null,
      structuralItems: preview?.querySelectorAll('table,canvas,img,svg,.card,.cell,.slide,.page,.layer,.tree-row,[role="treeitem"],[role="row"]').length || 0,
      interactive: interactive.slice(0, 100),
      outsideViewport,
      overlaps: overlaps.slice(0, 30),
      previewFailure: /Preview failed|Could not parse|Unsupported media file/i.test(preview?.innerText || '') ? (preview?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 500) : null,
    };
  });
  const iframeElement = await page.$('#previewHost iframe');
  const frame = iframeElement ? await iframeElement.contentFrame() : null;
  return { page: pageMetrics, frame: await collectFrameMetrics(frame), frameObject: frame };
}

async function waitForStableRender(page, expectedType) {
  await page.waitForFunction((id) => window.__fv?.state?.type?.id === id, expectedType, { timeout: 30000 });
  await page.waitForFunction(() => !document.getElementById('fileLoadStatus'), { timeout: 30000 });
  await page.waitForFunction(() => {
    const state = window.__fv?.state;
    if (!state?.type) return false;
    if (!state.type.capabilities.preview && !state.known) return !!state.rawview && !!document.querySelector('#editor .monaco-editor');
    const host = document.getElementById('previewHost');
    return !!host && host.children.length > 0;
  }, { timeout: 45000 });
  await page.evaluate(() => document.fonts?.ready).catch(() => {});
  await page.waitForTimeout(500);
  let prior = null;
  let stable = 0;
  for (let attempt = 0; attempt < 10 && stable < 2; attempt++) {
    const snapshot = await page.evaluate(() => {
      const host = document.getElementById('previewHost');
      const iframe = host?.querySelector('iframe');
      return [host?.innerHTML.length || 0, host?.innerText.length || 0, host?.querySelectorAll('canvas').length || 0, host?.querySelectorAll('img').length || 0, iframe?.srcdoc?.length || 0].join(':');
    });
    stable = snapshot === prior ? stable + 1 : 0;
    prior = snapshot;
    await page.waitForTimeout(350);
  }
}

async function exerciseDeepInteraction(page, row) {
  const result = { attempted: false, action: null, passed: null, details: null };
  const clickFirst = async (selectors) => {
    for (const selector of selectors) {
      const locator = page.locator(selector).first();
      if (await locator.count() && await locator.isVisible().catch(() => false)) { await locator.click(); return selector; }
    }
    return null;
  };
  try {
    if (row.expectedType === 'pdb') {
      result.attempted = true; result.action = 'load molecular 3D view';
      const selector = await clickFirst(['#previewHost .mol3d-load-btn']);
      if (!selector) throw new Error('Load 3D structure control missing');
      await page.waitForSelector('#previewHost .mol3d-stage canvas, #previewHost .mol3d-bar, #previewHost .mol3d-err', { timeout: 25000 });
      const error = await page.$('#previewHost .mol3d-err');
      result.passed = !error; result.details = error ? await error.innerText() : '3D stage/toolbar mounted';
    } else if (row.expectedType === 'pptx') {
      result.attempted = true; result.action = 'advance slide';
      await page.locator('#previewHost .pptx-viewmode').click();
      await page.locator('#previewHost .pptx-slide-next').click();
      const status = await page.locator('#previewHost .pptx-slide-status').innerText();
      result.passed = status.trim() === '2 / 2'; result.details = { status };
    } else if (row.expectedType === 'comic') {
      result.attempted = true; result.action = 'toggle comic spread mode';
      await page.locator('#previewHost .comic-spread').click();
      result.passed = await page.locator('#previewHost .comic-doc').evaluate((element) => element.classList.contains('comic-spread-on'));
      result.details = { spreadEnabled: result.passed };
    } else if (row.expectedType === 'xlsx') {
      result.attempted = true; result.action = 'switch worksheet';
      const tabs = page.locator('#previewHost button, #previewHost [role="tab"]');
      const labels = await tabs.allTextContents();
      const target = labels.find((label) => /Totals|Data/i.test(label));
      if (!target) throw new Error('second worksheet tab missing');
      await page.getByText(target.trim(), { exact: true }).last().click();
      await page.waitForTimeout(350);
      result.passed = true; result.details = { target: target.trim() };
    } else if (row.expectedType === 'media') {
      result.attempted = true; result.action = 'inspect native media readiness';
      const video = await page.$eval('#previewHost video', (element) => ({ readyState: element.readyState, videoWidth: element.videoWidth, videoHeight: element.videoHeight, duration: element.duration, controls: element.controls }));
      result.passed = video.controls && video.readyState >= 1 && video.videoWidth > 0 && video.videoHeight > 0 && Number.isFinite(video.duration);
      result.details = video;
    } else if (row.expectedType === 'pdf') {
      result.attempted = true; result.action = 'verify all PDF page canvases';
      const pages = await page.locator('#previewHost .pdf-page img, #previewHost .pdf-page canvas, #previewHost .pdf-page').count();
      result.passed = pages >= 3; result.details = { pages };
    }
  } catch (error) {
    result.passed = false;
    result.details = error.message;
  }
  return result;
}

async function scrollAndCaptureBottom(page, frame, row, screenshots) {
  const preview = page.locator('#previewHost');
  if (row.nestedScrollSelector) {
    const nested = page.locator(`#previewHost ${row.nestedScrollSelector}`).first();
    assert.equal(await nested.count(), 1, `${row.slug}: nested scroll surface is missing`);
    const nestedScroll = await nested.evaluate((element) => ({
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
    }));
    assert.ok(nestedScroll.scrollHeight > nestedScroll.clientHeight + 20,
      `${row.slug}: nested scroll surface is not scrollable: ${JSON.stringify(nestedScroll)}`);
    await nested.evaluate((element) => { element.scrollTop = element.scrollHeight; });
    await page.waitForTimeout(150);
    const path = join(FORMAT_SCREENSHOT_ROOT, `${row.slug}-${row.config.id}-nested-bottom.png`);
    screenshots.nestedBottom = await captureLocator(preview, path);
    const scrollProof = await nested.evaluate((element) => ({
      scrollTop: element.scrollTop,
      max: element.scrollHeight - element.clientHeight,
    }));
    assert.ok(scrollProof.max > 20 && scrollProof.scrollTop >= scrollProof.max - 1,
      `${row.slug}: nested surface did not reach its scroll endpoint: ${JSON.stringify(scrollProof)}`);
    screenshots.nestedBottom.scrollProof = scrollProof;
    await nested.evaluate((element) => { element.scrollTop = 0; });
  }
  if (frame) {
    const scroll = await frame.evaluate(() => ({ scrollHeight: document.documentElement.scrollHeight, clientHeight: document.documentElement.clientHeight }));
    if (scroll.scrollHeight > scroll.clientHeight + 20) {
      await frame.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
      await page.waitForTimeout(150);
      const path = join(FORMAT_SCREENSHOT_ROOT, `${row.slug}-${row.config.id}-preview-bottom.png`);
      screenshots.previewBottom = await captureLocator(preview, path);
      screenshots.previewBottom.scrollProof = await frame.evaluate(() => ({ scrollY, max: document.documentElement.scrollHeight - document.documentElement.clientHeight }));
      await frame.evaluate(() => scrollTo(0, 0));
      return;
    }
  }
  const scroll = await preview.evaluate((element) => ({ scrollHeight: element.scrollHeight, clientHeight: element.clientHeight }));
  if (scroll.scrollHeight > scroll.clientHeight + 20) {
    await preview.evaluate((element) => { element.scrollTop = element.scrollHeight; });
    await page.waitForTimeout(150);
    const path = join(FORMAT_SCREENSHOT_ROOT, `${row.slug}-${row.config.id}-preview-bottom.png`);
    screenshots.previewBottom = await captureLocator(preview, path);
    screenshots.previewBottom.scrollProof = await preview.evaluate((element) => ({ scrollTop: element.scrollTop, max: element.scrollHeight - element.clientHeight }));
    await preview.evaluate((element) => { element.scrollTop = 0; });
  }
}

async function closeMobileTreeIfOpen(page) {
  const settings = page.locator('#settingsDrawer');
  if (await settings.isVisible().catch(() => false)) {
    const settingsClose = page.locator('#settingsDrawer [data-close]').first();
    if (await settingsClose.isVisible().catch(() => false)) await settingsClose.click();
    else await page.keyboard.press('Escape');
    await settings.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }
  const viewport = page.viewportSize();
  if (!viewport || viewport.width > 390) return;
  const tree = page.locator('#fileTree');
  if (await tree.isVisible().catch(() => false)) {
    const close = page.locator('#treeCloseBtn');
    if (await close.isVisible().catch(() => false)) await close.click();
    await tree.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }
}

async function enableArchiveSupportThroughSettings(page) {
  await page.locator('#settingsBtn').click();
  const summary = page.locator('#settingsBody details > summary').filter({ hasText: /^Advanced$/ }).last();
  const advanced = summary.locator('..');
  if (!await advanced.evaluate((element) => element.open)) await summary.click();
  const checkbox = page.locator('#set-enableArchiveWasm');
  if (!await checkbox.isChecked()) await checkbox.check();
  const close = page.locator('#settingsDrawer [data-close]').first();
  if (await close.count()) await close.click();
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__fv, { timeout: 30000 });
}

async function captureAndCloseMobileTreeAfterIntake(page, row, screenshots) {
  const viewport = page.viewportSize();
  if (!viewport || viewport.width > 390) return false;
  const tree = page.locator('#fileTree');
  if (!await tree.isVisible().catch(() => false)) return false;
  const path = join(FORMAT_SCREENSHOT_ROOT, `${row.slug}-${row.config.id}-auto-open-tree-overlay.png`);
  await page.screenshot({ path, fullPage: true, animations: 'disabled' });
  const bytes = await readFile(path);
  screenshots.autoOpenTreeOverlay = { path: path.slice(REPO_ROOT.length + 1), sha256: sha256(bytes), stats: imageStats(bytes) };
  const close = page.locator('#treeCloseBtn');
  await close.click();
  await tree.waitFor({ state: 'hidden', timeout: 5000 });
  return true;
}

function rowReview(review, screenshots) {
  if (!review) return { verdict: 'pending', observations: [], defects: [], reason: 'no manual review record' };
  const hashes = Object.fromEntries(Object.entries(screenshots).map(([name, shot]) => [name, shot.sha256]));
  if (JSON.stringify(review.screenshotSha256) !== JSON.stringify(hashes)) {
    return { verdict: 'pending', observations: [], defects: [], reason: 'manual review screenshot hashes do not match current capture' };
  }
  return { verdict: review.verdict, observations: review.observations || [], defects: review.defects || [], reviewer: review.reviewer || 'manual visual review', reviewedAt: review.reviewedAt || null };
}

function updateVisualSummary(evidence) {
  evidence.summary.visualPasses = evidence.rows.filter((row) => row.manualReview.verdict === 'pass').length;
  evidence.summary.visualFailures = evidence.rows.filter((row) => row.manualReview.verdict === 'fail').length;
  evidence.summary.visualPending = evidence.rows.filter((row) => row.manualReview.verdict === 'pending').length;
  const meaningful = evidence.rows.filter((row) => row.technicalVerdict === 'pass' && row.manualReview.verdict === 'pass');
  evidence.summary.meaningfulVisualPasses = meaningful.length;
  evidence.summary.distinctMeaningfulVisualTypes = new Set(meaningful.map((row) => row.detectedType)).size;
}

async function writeFindings(evidence) {
  const technicalFailures = evidence.rows.filter((row) => row.technicalVerdict === 'fail');
  const visualFailures = evidence.rows.filter((row) => row.manualReview.verdict === 'fail');
  const reviewedDefects = evidence.rows.filter((row) => row.manualReview.verdict !== 'pending' && row.manualReview.defects?.length);
  const lines = [
    '# Format capture findings', '',
    `- Technical passes: ${evidence.summary.technicalPasses}/${evidence.rows.length}`,
    `- Hash-matched manual visual passes: ${evidence.summary.visualPasses}/${evidence.rows.length}`,
    `- Meaningful technical + visual passes: ${evidence.summary.meaningfulVisualPasses}/${evidence.rows.length}`,
    `- Distinct meaningful visual base types: ${evidence.summary.distinctMeaningfulVisualTypes}/144`,
    `- Off-origin requests: ${evidence.summary.offOriginRequests}`,
    `- Page/console errors: ${evidence.summary.pageConsoleErrors}`,
    `- Manual visual reviews pending: ${evidence.summary.visualPending}`, '',
    '## Technical failures', '',
    ...(technicalFailures.length ? technicalFailures.map((row) => `- ${row.slug}: ${row.technicalFailures.join('; ')}`) : ['- None.']), '',
    '## Manual visual failures', '',
    ...(visualFailures.length ? visualFailures.map((row) => `- ${row.slug}: ${row.manualReview.defects.join('; ')} Evidence: ${Object.values(row.screenshots).map((shot) => `\`${shot.path}\``).join(', ')}`) : ['- None.']), '',
    '## Reviewed defects (including otherwise passing formats)', '',
    ...(reviewedDefects.length ? reviewedDefects.map((row) => `- ${row.slug} [${row.manualReview.verdict}]: ${row.manualReview.defects.join('; ')}`) : ['- None.']), '',
    '## Programmatic visual-risk flags', '',
    ...evidence.rows.filter((row) => row.visualRiskFlags.length).map((row) => `- ${row.slug}: ${row.visualRiskFlags.join('; ')}`), '',
    'Programmatic flags are triage aids only. Manual verdicts are bound to every current screenshot SHA-256 in `format-manual-review.json`; a recapture invalidates stale judgments.', '',
  ];
  await writeFile(join(FORMAT_ARTIFACT_ROOT, 'format-capture-findings.md'), lines.join('\n'));
}

async function mergeReview() {
  const evidence = await readJson(evidencePath);
  const manual = await readJson(reviewPath);
  assert(evidence, `missing ${evidencePath}`);
  assert(manual?.rows, `missing or invalid ${reviewPath}`);
  const bySlug = new Map(manual.rows.map((row) => [row.slug, row]));
  for (const row of evidence.rows) row.manualReview = rowReview(bySlug.get(row.slug), row.screenshots);
  updateVisualSummary(evidence);
  await writeFile(evidencePath, JSON.stringify(evidence, null, 2) + '\n');
  await writeFindings(evidence);
  assert.equal(evidence.summary.visualPending, 0, `${evidence.summary.visualPending} rows lack hash-matched manual review`);
  assert.equal(evidence.summary.visualFailures, 0, `${evidence.summary.visualFailures} rows have visual failures`);
  console.log(`Manual review merged: ${evidence.summary.visualPasses} visual passes.`);
}

if (mergeOnly) {
  await mergeReview();
  process.exit(0);
}

await ensureFormatArtifactDirs();
const fixtureEvidence = await readJson(join(FORMAT_ARTIFACT_ROOT, 'format-fixture-evidence.json'));
assert.equal(fixtureEvidence?.validRichCandidates, 45, 'run node tests/release-readiness-fixtures.test.mjs first');
await rm(FORMAT_SCREENSHOT_ROOT, { recursive: true, force: true });
await ensureFormatArtifactDirs();

const manual = await readJson(reviewPath, { rows: [] });
const priorReviewBySlug = new Map((manual.rows || []).map((row) => [row.slug, row]));
const { server, origin } = await startFormatServer();
const chromium = loadChromium();
const browser = await chromium.launch({
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const rows = [];
const requestLedger = [];
const consoleLedger = [];
const runFailures = [];

try {
  for (const config of FORMAT_CONFIGS) {
    const assigned = FORMAT_CASES.filter((row) => row.config.id === config.id);
    const context = await browser.newContext({
      viewport: { width: config.width, height: config.height },
      colorScheme: config.theme,
      reducedMotion: 'reduce',
      deviceScaleFactor: 1,
      isMobile: config.width <= 390,
      hasTouch: config.width <= 390,
    });
    let currentSlug = '__boot__';
    const page = await context.newPage();
    page.setDefaultTimeout(45000);
    page.setDefaultNavigationTimeout(60000);
    page.on('dialog', (dialog) => dialog.accept());
    page.on('console', (message) => consoleLedger.push({ slug: currentSlug, type: message.type(), text: message.text(), location: message.location() }));
    page.on('pageerror', (error) => consoleLedger.push({ slug: currentSlug, type: 'pageerror', text: error.message, stack: error.stack || null }));
    page.on('websocket', (socket) => {
      requestLedger.push({ slug: currentSlug, kind: 'websocket', url: socket.url(), allowed: isAllowedFormatUrl(socket.url(), origin) });
    });
    context.on('serviceworker', (worker) => {
      consoleLedger.push({ slug: currentSlug, type: 'serviceworker', text: `registered ${worker.url()}` });
      worker.on('console', (message) => consoleLedger.push({ slug: currentSlug, type: `serviceworker-${message.type()}`, text: message.text(), location: message.location() }));
    });
    context.on('request', (request) => requestLedger.push({
      slug: currentSlug, kind: 'request', method: request.method(), url: request.url(),
      resourceType: request.resourceType(), allowed: isAllowedFormatUrl(request.url(), origin),
    }));
    context.on('requestfailed', (request) => requestLedger.push({ slug: currentSlug, kind: 'requestfailed', method: request.method(), url: request.url(), resourceType: request.resourceType(), failure: request.failure()?.errorText || null, allowed: isAllowedFormatUrl(request.url(), origin) }));
    context.on('response', (response) => {
      if (response.status() >= 400) requestLedger.push({ slug: currentSlug, kind: 'http-error', status: response.status(), url: response.url(), allowed: isAllowedFormatUrl(response.url(), origin) });
    });

    await page.goto(origin, { waitUntil: 'load' });
    await page.waitForFunction(() => !!window.__fv, { timeout: 30000 });
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), config.theme, `${config.id}: theme mismatch`);

    for (const row of assigned) {
      currentSlug = row.slug;
      console.log(`→ ${row.slug} ${basename(row.file)} @ ${config.id}`);
      const requestStart = requestLedger.length;
      const consoleStart = consoleLedger.length;
      const absolute = join(REPO_ROOT, row.file);
      const technicalFailures = [];
      const screenshots = {};
      let initialMetrics = null;
      let baseView = null;
      let interaction = null;
      let mobileTreeAutoOpened = false;
      try {
        await closeMobileTreeIfOpen(page);
        if (row.expectedType === 'archive') await enableArchiveSupportThroughSettings(page);
        await page.setInputFiles('#fileInput', absolute);
        await waitForStableRender(page, row.expectedType);
        mobileTreeAutoOpened = await captureAndCloseMobileTreeAfterIntake(page, row, screenshots);
        interaction = await exerciseDeepInteraction(page, row);
        if (interaction.attempted && interaction.passed === false) technicalFailures.push(`deep interaction failed: ${interaction.action}: ${JSON.stringify(interaction.details)}`);
        await page.waitForTimeout(300);
        initialMetrics = await collectPageMetrics(page);
        const combinedText = `${initialMetrics.page.preview.text} ${initialMetrics.frame?.text || ''} ${row.rawOnly ? await page.evaluate(() => window.__fv.state.intake.text || '') : ''}`;
        const missingTokens = row.tokens.filter((token) => !combinedText.toLowerCase().includes(token.toLowerCase()));
        if (initialMetrics.page.stateType !== row.expectedType) technicalFailures.push(`detected ${initialMetrics.page.stateType}, expected ${row.expectedType}`);
        if (missingTokens.length) technicalFailures.push(`missing meaningful landmark tokens: ${missingTokens.join(', ')}`);
        if (initialMetrics.page.previewFailure || initialMetrics.frame?.errorText) technicalFailures.push(`preview reports failure: ${initialMetrics.page.previewFailure || initialMetrics.frame.errorText}`);
        if (!row.rawOnly && initialMetrics.page.preview.children === 0) technicalFailures.push('preview host is empty');
        if (row.rawOnly && initialMetrics.page.editor.monacoEditors < 1) technicalFailures.push('raw-only Monaco editor is not mounted');

        const shellPath = join(FORMAT_SCREENSHOT_ROOT, `${row.slug}-${config.id}-shell.png`);
        await page.screenshot({ path: shellPath, fullPage: true, animations: 'disabled' });
        const shellBytes = await readFile(shellPath);
        screenshots.shell = { path: shellPath.slice(REPO_ROOT.length + 1), sha256: sha256(shellBytes), stats: imageStats(shellBytes) };
        const surface = row.rawOnly && initialMetrics.page.preview.children === 0 ? page.locator('#editor') : page.locator('#previewHost');
        const previewPath = join(FORMAT_SCREENSHOT_ROOT, `${row.slug}-${config.id}-${row.rawOnly && initialMetrics.page.preview.children === 0 ? 'raw' : 'preview'}.png`);
        screenshots.primarySurface = await captureLocator(surface, previewPath);
        await scrollAndCaptureBottom(page, initialMetrics.frameObject, row, screenshots);

        if (row.requireBaseView && initialMetrics.page.known) {
          const toggle = page.locator('#enhanceChip .ec-toggle');
          if (!await toggle.isVisible().catch(() => false)) {
            technicalFailures.push('known enhancement is active but base-view toggle is not visible');
          } else {
            await toggle.click();
            await page.waitForFunction(() => window.__fv?.state?.forceBase === true, { timeout: 15000 });
            await page.waitForTimeout(500);
            baseView = await collectPageMetrics(page);
            const baseText = `${baseView.page.preview.text} ${baseView.frame?.text || ''} ${await page.evaluate(() => window.__fv.state.intake.text || '')}`;
            const baseMissing = row.tokens.filter((token) => !baseText.toLowerCase().includes(token.toLowerCase()));
            if (baseMissing.length) technicalFailures.push(`base view missing landmark tokens: ${baseMissing.join(', ')}`);
            const baseSurface = baseView.page.preview.children > 0 ? page.locator('#previewHost') : page.locator('#editor');
            const basePath = join(FORMAT_SCREENSHOT_ROOT, `${row.slug}-${config.id}-base.png`);
            if (await baseSurface.isVisible().catch(() => false)) {
              screenshots.base = await captureLocator(baseSurface, basePath);
            } else {
              const hiddenPath = join(FORMAT_SCREENSHOT_ROOT, `${row.slug}-${config.id}-base-hidden-shell.png`);
              await page.screenshot({ path: hiddenPath, fullPage: true, animations: 'disabled' });
              const hiddenBytes = await readFile(hiddenPath);
              screenshots.baseHiddenShell = { path: hiddenPath.slice(REPO_ROOT.length + 1), sha256: sha256(hiddenBytes), stats: imageStats(hiddenBytes) };
              technicalFailures.push('base-view toggle leaves the required base surface hidden/blank');
            }
          }
        }

        if (screenshots.primarySurface.stats.nearUniform) technicalFailures.push('primary surface screenshot is near-uniform/visually blank');
        const structuralItems = initialMetrics.page.structuralItems + (initialMetrics.frame?.structuralItems || 0);
        if (row.minVisualItems && structuralItems < row.minVisualItems) technicalFailures.push(`only ${structuralItems} structural visual items, expected at least ${row.minVisualItems}`);
        if (row.requirePixels && screenshots.primarySurface.stats.quantizedColors < 12) technicalFailures.push(`pixel-bearing surface has only ${screenshots.primarySurface.stats.quantizedColors} sampled colors`);
      } catch (error) {
        technicalFailures.push(`capture exception: ${error.stack || error.message}`);
      }

      const requests = requestLedger.slice(requestStart);
      const consoleEvents = consoleLedger.slice(consoleStart);
      const offOrigin = requests.filter((entry) => entry.allowed === false);
      const pageErrors = consoleEvents.filter((entry) => entry.type === 'error' || entry.type === 'pageerror' || entry.type === 'serviceworker-error');
      const failedRequests = requests.filter((entry) => entry.kind === 'requestfailed' || entry.kind === 'http-error');
      if (offOrigin.length) technicalFailures.push(`${offOrigin.length} off-origin request(s)`);
      if (pageErrors.length) technicalFailures.push(`${pageErrors.length} page/console error(s)`);
      if (failedRequests.length) technicalFailures.push(`${failedRequests.length} failed/HTTP-error request(s)`);

      const review = rowReview(priorReviewBySlug.get(row.slug), screenshots);
      const evidenceRow = {
        index: row.index, slug: row.slug, family: row.family, expectedType: row.expectedType,
        file: row.file, config, tokens: row.tokens,
        detectedType: initialMetrics?.page.stateType || null,
        knownEnhancement: initialMetrics?.page.known || null,
        effectiveRenderer: initialMetrics?.page.known ? `known:${initialMetrics.page.known.id}` : row.rawOnly ? 'raw:monaco' : `base:${initialMetrics?.page.stateType || 'unknown'}`,
        baseViewChecked: !!baseView,
        interaction,
        metrics: initialMetrics ? { page: initialMetrics.page, frame: initialMetrics.frame } : null,
        baseMetrics: baseView ? { page: baseView.page, frame: baseView.frame } : null,
        screenshots,
        requestLedgerRange: { start: requestStart, end: requestLedger.length, entries: requests.length },
        consoleLedgerRange: { start: consoleStart, end: consoleLedger.length, entries: consoleEvents.length },
        offOrigin,
        pageErrors,
        failedRequests,
        technicalFailures,
        technicalVerdict: technicalFailures.length ? 'fail' : 'pass',
        visualRiskFlags: [
          ...(mobileTreeAutoOpened ? ['mobile standalone-file intake auto-opened the sidebar over the viewer'] : []),
          ...(initialMetrics?.page.shell.horizontalOverflow ? ['shell horizontal overflow'] : []),
          ...(initialMetrics?.page.outsideViewport.length ? [`${initialMetrics.page.outsideViewport.length} visible controls outside viewport`] : []),
          ...(initialMetrics?.page.overlaps.length ? [`${initialMetrics.page.overlaps.length} overlapping interactive-control pairs`] : []),
          ...(initialMetrics?.frame?.horizontalOverflow ? ['iframe horizontal overflow'] : []),
          ...(initialMetrics?.frame?.tinyText?.length ? [`${initialMetrics.frame.tinyText.length} visible text elements under 10px`] : []),
        ],
        manualReview: review,
      };
      rows.push(evidenceRow);
      if (technicalFailures.length) {
        runFailures.push(`${row.slug}: ${technicalFailures.join('; ')}`);
        console.error(`  ✗ ${technicalFailures.join('; ')}`);
      } else {
        console.log(`  ✓ technical landmarks and captures complete (${Object.keys(screenshots).length} screenshot(s))`);
      }
    }
    currentSlug = '__teardown__';
    await context.close();
  }
} finally {
  await browser.close().catch(() => {});
  await closeServer(server);
}

const evidence = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  baselineCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: REPO_ROOT, encoding: 'utf8' }).trim(),
  origin,
  exactOriginPolicy: 'Only URLs whose parsed URL.origin equals the ephemeral viewer origin are allowed; data: and blob: are local exceptions.',
  configurations: FORMAT_CONFIGS,
  fixtureEvidence: 'artifacts/v0.1.0-public-beta-readiness/format-fixture-evidence.json',
  summary: {
    candidates: rows.length,
    distinctDetectedTypes: new Set(rows.filter((row) => row.technicalVerdict === 'pass').map((row) => row.detectedType)).size,
    technicalPasses: rows.filter((row) => row.technicalVerdict === 'pass').length,
    technicalFailures: rows.filter((row) => row.technicalVerdict === 'fail').length,
    visualPasses: rows.filter((row) => row.manualReview.verdict === 'pass').length,
    visualFailures: rows.filter((row) => row.manualReview.verdict === 'fail').length,
    visualPending: rows.filter((row) => row.manualReview.verdict === 'pending').length,
    offOriginRequests: requestLedger.filter((entry) => entry.allowed === false).length,
    pageConsoleErrors: consoleLedger.filter((entry) => entry.type === 'error' || entry.type === 'pageerror' || entry.type === 'serviceworker-error').length,
  },
  failures: runFailures,
  rows,
};

updateVisualSummary(evidence);

await Promise.all([
  writeFile(evidencePath, JSON.stringify(evidence, null, 2) + '\n'),
  writeFile(join(FORMAT_ARTIFACT_ROOT, 'format-network-ledger.json'), JSON.stringify({ schemaVersion: 1, origin, entries: requestLedger }, null, 2) + '\n'),
  writeFile(join(FORMAT_ARTIFACT_ROOT, 'format-console-ledger.json'), JSON.stringify({ schemaVersion: 1, entries: consoleLedger }, null, 2) + '\n'),
]);

await writeFindings(evidence);

if (!captureMode) {
  assert.deepEqual(runFailures, [], `format technical capture failed:\n${runFailures.join('\n')}`);
  assert.equal(evidence.summary.visualPending, 0, `${evidence.summary.visualPending} manual visual reviews are pending`);
  assert.equal(evidence.summary.visualFailures, 0, `${evidence.summary.visualFailures} manual visual failures recorded`);
}
console.log(`\nFormat capture complete: ${evidence.summary.technicalPasses}/${rows.length} technical passes; ${evidence.summary.visualPending} manual reviews pending.`);
