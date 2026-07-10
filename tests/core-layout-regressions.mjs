import assert from 'node:assert/strict';
import { join } from 'node:path';
import {
  REPO_ROOT,
  closeServer,
  isAllowedFormatUrl,
  loadChromium,
  startFormatServer,
} from './release-readiness-format-helpers.mjs';

const { server, origin } = await startFormatServer();
const browser = await loadChromium().launch({
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
});

const errors = [];
const offOrigin = [];

async function sourceContext(viewport) {
  const context = await browser.newContext({
    viewport,
    colorScheme: 'light',
    reducedMotion: 'reduce',
    deviceScaleFactor: 1,
    isMobile: viewport.width <= 390,
    hasTouch: viewport.width <= 390,
  });
  // The production page boots the generated core bundle. This focused regression intentionally
  // exercises the source modules so the integration owner can regenerate app.generated.js once,
  // after all disjoint source patches have landed.
  await context.route('**/core/app.generated.js', (route) => route.fulfill({
    status: 200,
    contentType: 'text/javascript',
    body: "import './app.js';\n",
  }));
  context.on('request', (request) => {
    if (!isAllowedFormatUrl(request.url(), origin)) offOrigin.push(request.url());
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  await page.goto(origin, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__fv, { timeout: 30000 });
  return { context, page };
}

async function openFile(page, relativePath, expectedType) {
  await page.setInputFiles('#fileInput', join(REPO_ROOT, relativePath));
  await page.waitForFunction((type) => window.__fv?.state?.type?.id === type, expectedType);
  await page.waitForFunction(() => !document.getElementById('fileLoadStatus'));
  await page.waitForFunction(() => {
    const workspace = document.getElementById('workspace');
    const preview = document.getElementById('previewHost');
    const editor = document.querySelector('#editor .monaco-editor');
    return workspace && !workspace.hidden && ((preview?.children.length || 0) > 0 || !!editor);
  });
  await page.waitForTimeout(100); // allow the post-intake layout frame to settle before geometry assertions
}

async function mobileStandaloneRootRegression() {
  const { context, page } = await sourceContext({ width: 390, height: 844 });
  try {
    await openFile(page, 'docs/examples/sample.json', 'json');
    const initial = await page.evaluate(() => ({
      treeHidden: document.getElementById('fileTree').hidden,
      scrimHidden: document.getElementById('scrim').hidden,
      treeButtonHidden: document.getElementById('treeBtn').hidden,
      rows: document.querySelectorAll('#fileTree .ft-file').length,
      tab: document.getElementById('panes').getAttribute('data-tab'),
    }));
    assert.deepEqual(initial, {
      treeHidden: true,
      scrimHidden: true,
      treeButtonHidden: false,
      rows: 1,
      tab: 'preview',
    }, 'standalone mobile intake must register a root without opening the drawer');

    await page.click('#treeBtn');
    await page.waitForSelector('#fileTree:not([hidden]) .ft-file');
    await page.click('#fileTree .ft-file');
    await page.waitForFunction(() => document.getElementById('fileTree').hidden);
    const selected = await page.evaluate(() => ({
      treeHidden: document.getElementById('fileTree').hidden,
      scrimHidden: document.getElementById('scrim').hidden,
      workspaceVisible: !document.getElementById('workspace').hidden,
      tab: document.getElementById('panes').getAttribute('data-tab'),
      previewText: document.getElementById('previewHost').innerText,
      previewChildren: document.getElementById('previewHost').children.length,
    }));
    assert.equal(selected.treeHidden, true);
    assert.equal(selected.scrimHidden, true);
    assert.equal(selected.workspaceVisible, true);
    assert.equal(selected.tab, 'preview');
    assert.ok(selected.previewChildren > 0, 'viewer should be restored after mobile tree selection');
  } finally {
    await context.close();
  }
}

async function desktopFirstSplitRelayoutRegression() {
  const { context, page } = await sourceContext({ width: 1280, height: 720 });
  try {
    await openFile(page, 'docs/examples/sample.csv', 'csv');
    await page.waitForFunction(() => !document.getElementById('fileTree').hidden);
    const layout = await page.evaluate(() => {
      const box = (id) => {
        const rect = document.getElementById(id).getBoundingClientRect();
        return { width: rect.width, left: rect.left, right: rect.right };
      };
      return {
        mode: document.getElementById('panes').getAttribute('data-mode'),
        tree: box('fileTree'),
        panes: box('panes'),
        raw: box('rawPane'),
        preview: box('previewPane'),
        dividerHidden: document.getElementById('splitDivider').hidden,
      };
    });
    assert.equal(layout.mode, 'split');
    assert.equal(layout.dividerHidden, false);
    assert.ok(layout.tree.width >= 250, `desktop tree should be docked, got ${layout.tree.width}px`);
    assert.ok(layout.raw.width >= 375, `raw pane retained stale pre-sidebar width: ${layout.raw.width}px`);
    assert.ok(layout.preview.width <= layout.panes.width - 375, `preview was not reclamped after sidebar registration: ${JSON.stringify(layout)}`);
  } finally {
    await context.close();
  }
}

async function mobileEnhancementToggleRegression() {
  const { context, page } = await sourceContext({ width: 390, height: 844 });
  try {
    await openFile(page, 'docs/examples/App.swift', 'code');
    await page.waitForFunction(() => !!window.__fv?.state?.known && document.getElementById('previewHost').innerText.includes('Swift source'));
    assert.equal(await page.getAttribute('#panes', 'data-tab'), 'preview');

    await page.click('#enhanceChip .ec-toggle');
    await page.waitForFunction(() => window.__fv?.state?.forceBase === true);
    await page.waitForFunction(() => document.getElementById('panes').getAttribute('data-tab') === 'raw');
    const base = await page.evaluate(() => ({
      tab: document.getElementById('panes').getAttribute('data-tab'),
      tabbarDisplay: getComputedStyle(document.getElementById('tabbar')).display,
      rawVisible: document.getElementById('rawPane').getBoundingClientRect().width > 0,
      editorVisible: document.querySelector('#editor .monaco-editor')?.getBoundingClientRect().width > 0,
      previewChildren: document.getElementById('previewHost').children.length,
    }));
    assert.equal(base.tab, 'raw');
    assert.equal(base.tabbarDisplay, 'none');
    assert.equal(base.rawVisible, true);
    assert.equal(base.editorVisible, true);
    assert.equal(base.previewChildren, 0);

    await page.click('#enhanceChip .ec-toggle');
    await page.waitForFunction(() => window.__fv?.state?.forceBase === false && document.getElementById('previewHost').innerText.includes('Swift source'));
    const enhanced = await page.evaluate(() => ({
      tab: document.getElementById('panes').getAttribute('data-tab'),
      tabbarDisplay: getComputedStyle(document.getElementById('tabbar')).display,
      previewVisible: document.getElementById('previewPane').getBoundingClientRect().width > 0,
      previewChildren: document.getElementById('previewHost').children.length,
    }));
    assert.equal(enhanced.tab, 'preview');
    assert.equal(enhanced.tabbarDisplay, 'flex');
    assert.equal(enhanced.previewVisible, true);
    assert.ok(enhanced.previewChildren > 0);
  } finally {
    await context.close();
  }
}

async function offlineStatusResponsiveRegression() {
  const viewports = [
    { width: 1440, height: 900 },
    { width: 1280, height: 720 },
    { width: 390, height: 844 },
  ];
  for (const viewport of viewports) {
    const { context, page } = await sourceContext(viewport);
    try {
      await page.waitForSelector('#offlineStatus:not([hidden])');
      const landing = await page.evaluate(() => {
        const status = document.getElementById('offlineStatus');
        const topbar = document.querySelector('.topbar');
        const rect = status.getBoundingClientRect();
        const top = topbar.getBoundingClientRect();
        return {
          parentClass: status.parentElement?.className || '',
          position: getComputedStyle(status).position,
          role: status.getAttribute('role'),
          tabIndex: status.tabIndex,
          title: status.title,
          text: status.innerText,
          visible: !!status.getClientRects().length,
          insideTopbar: rect.top >= top.top - 1 && rect.bottom <= top.bottom + 1,
          topbarOverflow: topbar.scrollWidth - topbar.clientWidth,
        };
      });
      assert.equal(landing.parentClass, 'topbar');
      assert.notEqual(landing.position, 'fixed');
      assert.equal(landing.role, 'button');
      assert.equal(landing.tabIndex, 0);
      assert.ok(landing.title.length > 0 && landing.text.length > 0, JSON.stringify(landing));
      assert.equal(landing.visible, true);
      assert.equal(landing.insideTopbar, true);
      assert.ok(landing.topbarOverflow <= 1, JSON.stringify(landing));

      // Relocation must not change keyboard activation or focus return from the offline modal.
      await page.focus('#offlineStatus');
      await page.keyboard.press('Space');
      await page.waitForSelector('.cache-modal');
      await page.click('.cm-close');
      await page.waitForSelector('.cache-modal', { state: 'detached' });
      assert.equal(await page.evaluate(() => document.activeElement?.id), 'offlineStatus');

      await openFile(page, 'docs/examples/sample.rtf', 'rtf');
      const workspace = await page.evaluate(() => {
        const status = document.getElementById('offlineStatus');
        const topbar = document.querySelector('.topbar');
        const preview = document.getElementById('previewPane');
        const rect = status.getBoundingClientRect();
        const top = topbar.getBoundingClientRect();
        const content = preview.getBoundingClientRect();
        const overlapWidth = Math.max(0, Math.min(rect.right, content.right) - Math.max(rect.left, content.left));
        const overlapHeight = Math.max(0, Math.min(rect.bottom, content.bottom) - Math.max(rect.top, content.top));
        return {
          parentId: status.parentElement?.id || '',
          parentClass: status.parentElement?.className || '',
          visible: !!status.getClientRects().length,
          position: getComputedStyle(status).position,
          width: rect.width,
          topbarOverflow: topbar.scrollWidth - topbar.clientWidth,
          rendererOverlapArea: overlapWidth * overlapHeight,
          moreVisible: !!document.getElementById('moreBtn').getClientRects().length,
          topbarBottom: top.bottom,
          previewTop: content.top,
        };
      });
      assert.notEqual(workspace.position, 'fixed');
      assert.ok(workspace.topbarOverflow <= 1, JSON.stringify(workspace));
      assert.equal(workspace.rendererOverlapArea, 0, JSON.stringify(workspace));
      assert.ok(workspace.previewTop >= workspace.topbarBottom - 1, JSON.stringify(workspace));
      if (viewport.width <= 390) {
        assert.equal(workspace.parentId, 'moreMenu');
        assert.equal(workspace.visible, false);
        assert.equal(workspace.moreVisible, true);
        await page.click('#moreBtn');
        await page.waitForSelector('#moreMenu:not([hidden]) #offlineStatus');
        const mobileMenu = await page.evaluate(() => {
          const status = document.getElementById('offlineStatus');
          const rect = status.getBoundingClientRect();
          return { visible: !!status.getClientRects().length, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
        });
        assert.equal(mobileMenu.visible, true);
        assert.ok(mobileMenu.left >= 0 && mobileMenu.right <= viewport.width && mobileMenu.top >= 0 && mobileMenu.bottom <= viewport.height, JSON.stringify(mobileMenu));
        await page.click('#moreBtn');
        await page.click('#openInlineBtn');
        await page.waitForSelector('#intake:not([hidden])');
        const restored = await page.evaluate(() => {
          const status = document.getElementById('offlineStatus');
          return { parentClass: status.parentElement?.className || '', visible: !!status.getClientRects().length };
        });
        assert.deepEqual(restored, { parentClass: 'topbar', visible: true }, 'returning to intake must restore the discoverable mobile control');
      } else {
        assert.equal(workspace.parentClass, 'topbar');
        assert.equal(workspace.visible, true);
        assert.ok(workspace.width <= 36, `workspace offline control should be compact: ${JSON.stringify(workspace)}`);
      }
    } finally {
      await context.close();
    }
  }
}

try {
  await mobileStandaloneRootRegression();
  console.log('✓ mobile standalone intake registers a closed drawer and tree selection returns to the viewer');
  await desktopFirstSplitRelayoutRegression();
  console.log('✓ first desktop split relayout uses post-sidebar width');
  await mobileEnhancementToggleRegression();
  console.log('✓ mobile known/base toggle reapplies tab layout and restores both surfaces');
  await offlineStatusResponsiveRegression();
  console.log('✓ offline control stays discoverable on landing and outside renderer content at all target viewports');
  assert.deepEqual(offOrigin, [], `off-origin requests: ${offOrigin.join(', ')}`);
  assert.deepEqual(errors, [], `page/console errors: ${errors.join(' | ')}`);
  console.log('Core layout regressions passed.');
} finally {
  await browser.close().catch(() => {});
  await closeServer(server);
}
