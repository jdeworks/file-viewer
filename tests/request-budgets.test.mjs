// Cold-context request budgets for the four user journeys that define the startup lane.
// Service workers are blocked so a warm Cache Storage entry can never hide a regression.
import { createHarness, finish } from './harness.mjs';

const BUDGETS = {
  // Measured baseline: 14 / 28 / 4 / 1. Small explicit headroom permits harmless graph
  // reshaping but rejects a new eager subsystem or request-per-detector regression.
  startup: 16,
  fileOpen: 32,
  examples: 5,
  offlineModal: 1,
};

const REQUIRED = {
  startup: ['/core/app.generated.js', '/games/launcher.js'],
  fileOpen: [
    '/examples/summary.json',
    '/examples/welcome.md',
    '/core/registry-runtime.generated.js',
    '/core/registry-detect.generated.js',
  ],
  examples: ['/core/examples.js', '/examples/summary.json'],
  offlineModal: ['/asset-manifest.json'],
};

const FORBIDDEN = {
  startup: [
    '/asset-manifest.json',
    '/examples/summary.json',
    '/core/detect.js',
    '/core/registry-runtime.generated.js',
    '/core/companion-ui.js',
    '/vendor/monaco/vs/editor/editor.main.js',
  ],
  examples: ['/asset-manifest.json'],
  offlineModal: ['/core/registry-runtime.generated.js'],
};

const ctx = await createHarness({ contextOptions: { serviceWorkers: 'block' } });

function pathsOf(rows) {
  return rows.map((row) => row.path);
}

async function runColdFlow(name, action = null) {
  const context = await ctx.browser.newContext({
    viewport: { width: 1100, height: 800 },
    serviceWorkers: 'block',
  });
  const page = await context.newPage();
  page.setDefaultNavigationTimeout(60_000);
  page.setDefaultTimeout(60_000);
  const requests = [];
  const offOrigin = [];
  page.on('request', (request) => {
    const raw = request.url();
    if (/^(?:data|blob):/i.test(raw)) return;
    const url = new URL(raw);
    if (url.origin !== ctx.origin) {
      offOrigin.push(raw);
      return;
    }
    requests.push({ path: url.pathname, type: request.resourceType() });
  });

  await page.goto(ctx.origin, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => typeof window.__fv !== 'undefined');
  await page.waitForTimeout(250);
  const startup = requests.slice();
  const actionStart = requests.length;
  if (action) {
    await action(page);
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(250);
  }
  const actionRequests = requests.slice(actionStart);
  await context.close();
  return { name, startup, action: actionRequests, offOrigin };
}

try {
  // The harness owns an initial blank context; the measured flows each use a separate cold one.
  await ctx.context.close();
  const startupFlow = await runColdFlow('startup');
  const fileFlow = await runColdFlow('fileOpen', async (page) => {
    const opened = await page.evaluate(() => window.__fv.openExampleFile('welcome.md'));
    if (!opened) throw new Error('welcome.md did not open');
    await page.waitForSelector('iframe.fv-preview-frame');
  });
  const examplesFlow = await runColdFlow('examples', async (page) => {
    await page.click('#loadExamplesBtn');
    await page.waitForSelector('#examples .ex-folder-label');
  });
  const offlineFlow = await runColdFlow('offlineModal', async (page) => {
    await page.waitForSelector('#offlineStatus:not([hidden])');
    await page.click('#offlineStatus');
    await page.waitForSelector('.cache-modal');
  });

  const flows = [startupFlow, fileFlow, examplesFlow, offlineFlow];
  for (const flow of flows) {
    if (flow.offOrigin.length) ctx.fail(`${flow.name}: off-origin requests: ${flow.offOrigin.join(', ')}`);
    const rows = flow.name === 'startup' ? flow.startup : flow.action;
    const paths = pathsOf(rows);
    console.log(`${flow.name}: ${rows.length} request(s)\n  ${paths.join('\n  ')}`);
    if (rows.length <= BUDGETS[flow.name]) ctx.pass(`${flow.name} request budget: ${rows.length} ≤ ${BUDGETS[flow.name]}`);
    else ctx.fail(`${flow.name} request budget exceeded: ${rows.length} > ${BUDGETS[flow.name]}`);
    for (const required of REQUIRED[flow.name] || []) {
      if (!paths.includes(required)) ctx.fail(`${flow.name}: expected request was not observed: ${required}`);
    }
    for (const forbidden of FORBIDDEN[flow.name] || []) {
      if (paths.includes(forbidden)) ctx.fail(`${flow.name}: lazy-only request entered this lane: ${forbidden}`);
    }
    if (paths.some((path) => /registry-detect\.generated\.\d+\.js$/.test(path))) {
      ctx.fail(`${flow.name}: numbered detector request reappeared`);
    }
  }
} catch (error) {
  ctx.fail('request budgets exception: ' + error.message);
} finally {
  await finish(ctx);
}
