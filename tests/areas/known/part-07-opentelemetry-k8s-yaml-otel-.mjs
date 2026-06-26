// Auto-split slice 07/18 of the known-files smoke area (see ./../known-files.mjs).
// Covers: opentelemetry-k8s.yaml (OTel Operator) … puma.rb (Puma).
// Called in order on the shared ctx — keep openExample order intact; no cross-file state.
export async function run(ctx) {
  const { page, origin, frameOf, pass, fail, openExample } = ctx;

  // ── opentelemetry-k8s.yaml viewer ──
  await openExample('opentelemetry-k8s.yaml (OTel Operator)');
  await page.waitForSelector('#previewHost .otk-doc', { timeout: 12000 });
  const otkText = await page.$eval('#previewHost .otk-doc', (e) => e.textContent);
  if (/OpenTelemetry/i.test(otkText)) pass('opentelemetry-k8s.yaml: badge shown'); else fail('otk badge: ' + otkText.slice(0, 200));
  if (/OpenTelemetryCollector|otel-collector/i.test(otkText)) pass('opentelemetry-k8s.yaml: collector shown'); else fail('otk collector: ' + otkText.slice(0, 200));
  if (/deployment/i.test(otkText)) pass('opentelemetry-k8s.yaml: mode shown'); else fail('otk mode: ' + otkText.slice(0, 200));
  if (/Instrumentation|my-instrumentation/i.test(otkText)) pass('opentelemetry-k8s.yaml: instrumentation shown'); else fail('otk instrumentation: ' + otkText.slice(0, 300));

  // ── aws-credentials viewer ──
  await openExample('aws-credentials (AWS)');
  await page.waitForSelector('#previewHost .awsc-doc', { timeout: 12000 });
  const awscText = await page.$eval('#previewHost .awsc-doc', (e) => e.textContent);
  if (/AWS Credentials/i.test(awscText)) pass('aws-credentials: AWS Credentials badge shown'); else fail('aws-credentials badge: ' + awscText.slice(0, 200));
  if (/default|staging|production/i.test(awscText)) pass('aws-credentials: profile names shown'); else fail('aws-credentials profiles: ' + awscText.slice(0, 300));
  if (/AKIA/i.test(awscText)) pass('aws-credentials: access key ID shown (masked)'); else fail('aws-credentials key id: ' + awscText.slice(0, 300));
  if (/•{4,}/.test(awscText)) pass('aws-credentials: secret key is masked'); else fail('aws-credentials secret mask: ' + awscText.slice(0, 300));
  if (/handle with care/i.test(awscText)) pass('aws-credentials: security warning shown'); else fail('aws-credentials warning: ' + awscText.slice(0, 300));
  const awscHtml = await page.$eval('#previewHost .awsc-doc', (e) => e.innerHTML);
  if (/Credential Review|long-lived key|production key/i.test(awscText)) pass('aws-credentials: credential review warnings shown'); else fail('aws-credentials review: ' + awscText.slice(0, 400));
  if (/Redacted source/i.test(awscText) && !/wJalrXUtnFEMI|je7MtGbClwBF|someSecretKeyExample/.test(awscText + awscHtml)) pass('aws-credentials: source preview redacts raw secrets'); else fail('aws-credentials source leak: ' + awscText.slice(0, 400));
  const awscSourceCollapsed = await page.$eval('#previewHost .awsc-doc .kf-source-details', (e) => !e.open);
  if (awscSourceCollapsed) pass('aws-credentials: redacted source is collapsed'); else fail('aws-credentials source unexpectedly expanded');
  await page.click('#previewHost .awsc-doc [data-source-line]');
  await page.waitForFunction(() => document.querySelector('#previewHost .awsc-doc .kf-source-details')?.open, null, { timeout: 3000 });
  const awscSourceOpened = await page.$eval('#previewHost .awsc-doc .kf-source-details', (e) => e.open && !!e.querySelector('#awsc-line-1'));
  if (awscSourceOpened) pass('aws-credentials: source links open source preview'); else fail('aws-credentials source link did not open preview');

  // ── aws-config viewer ──
  await openExample('aws-config (AWS)');
  await page.waitForSelector('#previewHost .awscfg-doc', { timeout: 12000 });
  const awscfgText = await page.$eval('#previewHost .awscfg-doc', (e) => e.textContent);
  if (/AWS Config/i.test(awscfgText)) pass('aws-config: AWS Config badge shown'); else fail('aws-config badge: ' + awscfgText.slice(0, 200));
  if (/default|staging|production|china/i.test(awscfgText)) pass('aws-config: profile names shown'); else fail('aws-config profiles: ' + awscfgText.slice(0, 300));
  if (/us-east-1|us-west-2|eu-west-1/i.test(awscfgText)) pass('aws-config: region values shown'); else fail('aws-config regions: ' + awscfgText.slice(0, 300));
  if (/role_arn|mfa_serial/i.test(awscfgText)) pass('aws-config: role/mfa fields shown'); else fail('aws-config fields: ' + awscfgText.slice(0, 300));

  // ── kubeconfig.yaml viewer ──
  await openExample('kubeconfig.yaml');
  await page.waitForSelector('#previewHost .kube-doc', { timeout: 12000 });
  const kcText = await page.$eval('#previewHost .kube-doc', (e) => e.textContent);
  if (/kubectl/i.test(kcText)) pass('kubeconfig.yaml: kubectl badge shown'); else fail('kubeconfig badge: ' + kcText.slice(0, 200));
  if (/dev-cluster-context/i.test(kcText)) pass('kubeconfig.yaml: current context highlighted'); else fail('kubeconfig current-context: ' + kcText.slice(0, 300));
  if (/production-cluster|staging-cluster|dev-cluster/i.test(kcText)) pass('kubeconfig.yaml: cluster names shown'); else fail('kubeconfig clusters: ' + kcText.slice(0, 300));
  if (/configured|cert-auth|client-cert/i.test(kcText)) pass('kubeconfig.yaml: cert/token data is redacted'); else fail('kubeconfig redaction: ' + kcText.slice(0, 300));
  if (/cluster credentials/i.test(kcText)) pass('kubeconfig.yaml: security warning shown'); else fail('kubeconfig warning: ' + kcText.slice(0, 300));
  if (/Copy kubectl context/i.test(kcText)) pass('kubeconfig.yaml: copy command button present'); else fail('kubeconfig copy-btn: ' + kcText.slice(0, 300));

  // ── gcp-service-account.json viewer ──
  await openExample('gcp-service-account.json (GCP)');
  await page.waitForSelector('#previewHost .gcp-doc', { timeout: 12000 });
  const gcpText = await page.$eval('#previewHost .gcp-doc', (e) => e.textContent);
  if (/GCP Service Account/i.test(gcpText)) pass('gcp-service-account.json: GCP Service Account badge shown'); else fail('gcp-sa badge: ' + gcpText.slice(0, 200));
  if (/my-example-project-123/i.test(gcpText)) pass('gcp-service-account.json: project_id shown'); else fail('gcp-sa project: ' + gcpText.slice(0, 300));
  if (/my-service-account@/i.test(gcpText)) pass('gcp-service-account.json: client_email shown'); else fail('gcp-sa email: ' + gcpText.slice(0, 300));
  if (/REDACTED.*private key/i.test(gcpText)) pass('gcp-service-account.json: private key is redacted'); else fail('gcp-sa private key masking: ' + gcpText.slice(0, 300));
  if (/never commit/i.test(gcpText)) pass('gcp-service-account.json: security warning shown'); else fail('gcp-sa warning: ' + gcpText.slice(0, 300));
  const gcpHtml = await page.$eval('#previewHost .gcp-doc', (e) => e.innerHTML);
  if (/Key Review|Workload Identity|key fingerprint/i.test(gcpText)) pass('gcp-service-account.json: key review warnings shown'); else fail('gcp-sa review: ' + gcpText.slice(0, 400));
  if (/Redacted source/i.test(gcpText) && !/EXAMPLE_KEY_ID_NOT_A_REAL_KEY/.test(gcpText + gcpHtml)) pass('gcp-service-account.json: source preview redacts key id'); else fail('gcp-sa source leak: ' + gcpText.slice(0, 400));
  const gcpSourceCollapsed = await page.$eval('#previewHost .gcp-doc .kf-source-details', (e) => !e.open);
  if (gcpSourceCollapsed) pass('gcp-service-account.json: redacted source is collapsed'); else fail('gcp-sa source unexpectedly expanded');
  await page.click('#previewHost .gcp-doc [data-source-line]');
  await page.waitForFunction(() => document.querySelector('#previewHost .gcp-doc .kf-source-details')?.open, null, { timeout: 3000 });
  const gcpSourceOpened = await page.$eval('#previewHost .gcp-doc .kf-source-details', (e) => e.open && !!e.querySelector('#gcp-line-1'));
  if (gcpSourceOpened) pass('gcp-service-account.json: source links open source preview'); else fail('gcp-sa source link did not open preview');

  // ── apisix.yaml viewer ──
  await openExample('apisix.yaml');
  await page.waitForSelector('#previewHost .ax-doc', { timeout: 12000 });
  const axText = await page.$eval('#previewHost .ax-doc', (e) => e.textContent);
  if (/APISIX/i.test(axText)) pass('apisix.yaml: APISIX badge shown'); else fail('apisix badge: ' + axText.slice(0, 200));
  if (/traditional/i.test(axText)) pass('apisix.yaml: deployment mode shown'); else fail('apisix mode: ' + axText.slice(0, 300));
  if (/9080|9180/i.test(axText)) pass('apisix.yaml: ports shown'); else fail('apisix ports: ' + axText.slice(0, 300));
  if (/prometheus|cors|limit-req/i.test(axText)) pass('apisix.yaml: plugin names shown'); else fail('apisix plugins: ' + axText.slice(0, 300));
  if (/2379|\/apisix/i.test(axText)) pass('apisix.yaml: etcd config shown'); else fail('apisix etcd: ' + axText.slice(0, 300));

  // ── envoy.yaml viewer ──
  await openExample('envoy.yaml');
  await page.waitForSelector('#previewHost .ev-doc', { timeout: 12000 });
  const evText = await page.$eval('#previewHost .ev-doc', (e) => e.textContent);
  if (/Envoy/i.test(evText)) pass('envoy.yaml: Envoy badge shown'); else fail('envoy badge: ' + evText.slice(0, 200));
  if (/edge-proxy-01/i.test(evText)) pass('envoy.yaml: node id shown'); else fail('envoy node id: ' + evText.slice(0, 300));
  if (/9901/i.test(evText)) pass('envoy.yaml: admin port shown'); else fail('envoy admin: ' + evText.slice(0, 300));
  if (/listener_http|listener_https/i.test(evText)) pass('envoy.yaml: listeners shown'); else fail('envoy listeners: ' + evText.slice(0, 300));
  if (/api_service|web_service/i.test(evText)) pass('envoy.yaml: clusters shown'); else fail('envoy clusters: ' + evText.slice(0, 300));

  // ── httpd.conf (Apache) viewer ──
  await openExample('httpd.conf (Apache HTTP Server)');
  await page.waitForSelector('#previewHost .apachecfg-doc', { timeout: 12000 });
  const apacheText = await page.$eval('#previewHost .apachecfg-doc', (e) => e.textContent);
  if (/Apache/i.test(apacheText)) pass('httpd.conf: Apache badge shown'); else fail('apache badge: ' + apacheText.slice(0, 200));
  if (/VirtualHost|example\.com/i.test(apacheText)) pass('httpd.conf: VirtualHost or ServerName shown'); else fail('apache vhosts: ' + apacheText.slice(0, 300));
  if (/SSL|DocumentRoot/i.test(apacheText)) pass('httpd.conf: SSL or DocumentRoot shown'); else fail('apache ssl/docroot: ' + apacheText.slice(0, 300));
  if (/Apache Review|http redirect|directory listing|public access/i.test(apacheText)) pass('httpd.conf: review findings shown'); else fail('apache review: ' + apacheText.slice(0, 400));
  const apacheHelpTitle = await page.$eval('#previewHost .apachecfg-doc [data-source-line]', (e) => e.getAttribute('title') || '');
  if (/Apache|source|Open line/i.test(apacheHelpTitle)) pass('httpd.conf: directive hover help shown'); else fail('apache source help title missing');
  const apacheSourceCollapsed = await page.$eval('#previewHost .apachecfg-doc .kf-source-details', (e) => !e.open && e.textContent.includes('Source'));
  if (apacheSourceCollapsed) pass('httpd.conf: source collapsed'); else fail('httpd.conf: source not collapsed');
  const apacheSourceLine = await page.$eval('#previewHost .apachecfg-doc [data-source-line]', (e) => {
    e.click();
    return e.getAttribute('data-source-line');
  });
  await page.waitForFunction((line) => {
    const details = document.querySelector('#previewHost .apachecfg-doc .kf-source-details');
    return details?.open && document.getElementById(`apache-line-${line}`);
  }, apacheSourceLine);
  pass('httpd.conf: source links open source');

  // ── haproxy.cfg viewer ──
  await openExample('haproxy.cfg');
  await page.waitForSelector('#previewHost .hpcfg-doc', { timeout: 12000 });
  const haText = await page.$eval('#previewHost .hpcfg-doc', (e) => e.textContent);
  if (/HAProxy/i.test(haText)) pass('haproxy.cfg: HAProxy badge shown'); else fail('haproxy badge: ' + haText.slice(0, 200));
  if (/50000/i.test(haText)) pass('haproxy.cfg: maxconn shown'); else fail('haproxy maxconn: ' + haText.slice(0, 300));
  if (/http_front|https_front/i.test(haText)) pass('haproxy.cfg: frontend blocks shown'); else fail('haproxy frontends: ' + haText.slice(0, 300));
  if (/web_backend|api_backend/i.test(haText)) pass('haproxy.cfg: backend blocks shown'); else fail('haproxy backends: ' + haText.slice(0, 300));
  if (/roundrobin|leastconn/i.test(haText)) pass('haproxy.cfg: balance algorithms shown'); else fail('haproxy balance: ' + haText.slice(0, 300));
  if (/HAProxy Review|plain bind|public bind|secret configured/i.test(haText)) pass('haproxy.cfg: review findings shown'); else fail('haproxy review: ' + haText.slice(0, 400));
  const haHtml = await page.$eval('#previewHost .hpcfg-doc', (e) => e.innerHTML);
  if ((haText + haHtml).includes('admin:secret')) fail('haproxy.cfg: stats auth secret leaked'); else pass('haproxy.cfg: stats auth secret redacted');
  const haHelpTitle = await page.$eval('#previewHost .hpcfg-doc [data-source-line]', (e) => e.getAttribute('title') || '');
  if (/HAProxy|source|Open line/i.test(haHelpTitle)) pass('haproxy.cfg: directive hover help shown'); else fail('haproxy source help title missing');
  const haSourceCollapsed = await page.$eval('#previewHost .hpcfg-doc .kf-source-details', (e) => !e.open && e.textContent.includes('Redacted source'));
  if (haSourceCollapsed) pass('haproxy.cfg: redacted source collapsed'); else fail('haproxy.cfg: redacted source not collapsed');
  const haSourceLine = await page.$eval('#previewHost .hpcfg-doc [data-source-line]', (e) => {
    e.click();
    return e.getAttribute('data-source-line');
  });
  await page.waitForFunction((line) => {
    const details = document.querySelector('#previewHost .hpcfg-doc .kf-source-details');
    return details?.open && document.getElementById(`haproxy-line-${line}`);
  }, haSourceLine);
  pass('haproxy.cfg: source links open redacted source');

  // ── squid.conf viewer ──
  await openExample('squid.conf');
  await page.waitForSelector('#previewHost .sqd-doc', { timeout: 12000 });
  const sqdText = await page.$eval('#previewHost .sqd-doc', (e) => e.textContent);
  if (/Squid/i.test(sqdText)) pass('squid.conf: Squid badge shown'); else fail('squid badge: ' + sqdText.slice(0, 200));
  if (/3128/i.test(sqdText)) pass('squid.conf: http_port shown'); else fail('squid port: ' + sqdText.slice(0, 300));
  if (/localnet|SSL_ports|Safe_ports/i.test(sqdText)) pass('squid.conf: ACL names shown'); else fail('squid acls: ' + sqdText.slice(0, 300));
  if (/allow|deny/i.test(sqdText)) pass('squid.conf: access rules shown'); else fail('squid access: ' + sqdText.slice(0, 300));
  if (/8\.8\.8\.8|1\.1\.1\.1/i.test(sqdText)) pass('squid.conf: DNS nameservers shown'); else fail('squid dns: ' + sqdText.slice(0, 300));

  // ── workspace.xml (JetBrains Workspace) ──
  await openExample('workspace.xml (JetBrains)');
  await page.waitForSelector('#previewHost .pj-doc', { timeout: 12000 });
  const jbwText = await page.$eval('#previewHost .pj-doc', (e) => e.textContent);
  if (/JetBrains Workspace/i.test(jbwText)) pass('workspace.xml: JetBrains Workspace badge shown'); else fail('jbw badge: ' + jbwText.slice(0, 200));
  if (/Run Configurations/i.test(jbwText)) pass('workspace.xml: Run Configurations section shown'); else fail('jbw run configs: ' + jbwText.slice(0, 300));
  if (/Main|Tests|Docker Compose/i.test(jbwText)) pass('workspace.xml: run config names shown'); else fail('jbw config names: ' + jbwText.slice(0, 400));
  if (/Changed Files/i.test(jbwText)) pass('workspace.xml: Changed Files section shown'); else fail('jbw changed files: ' + jbwText.slice(0, 400));
  if (/VCS Mappings/i.test(jbwText)) pass('workspace.xml: VCS Mappings section shown'); else fail('jbw vcs: ' + jbwText.slice(0, 400));

  // ── init.lua (Neovim Config) ──
  await openExample('init.lua (Neovim)');
  await page.waitForSelector('#previewHost .pj-doc', { timeout: 12000 });
  const nvcText = await page.$eval('#previewHost .pj-doc', (e) => e.textContent);
  if (/Neovim Config/i.test(nvcText)) pass('init.lua: Neovim Config badge shown'); else fail('nvc badge: ' + nvcText.slice(0, 200));
  if (/lazy\.nvim/i.test(nvcText)) pass('init.lua: lazy.nvim plugin manager detected'); else fail('nvc pm: ' + nvcText.slice(0, 300));
  if (/Key Mappings/i.test(nvcText)) pass('init.lua: Key Mappings section shown'); else fail('nvc keymaps: ' + nvcText.slice(0, 300));
  if (/Options/i.test(nvcText)) pass('init.lua: Options section shown'); else fail('nvc opts: ' + nvcText.slice(0, 300));
  if (/tokyonight/i.test(nvcText)) pass('init.lua: colorscheme detected'); else fail('nvc colorscheme: ' + nvcText.slice(0, 400));

  // ── .vimrc (Vim Config) ──
  await openExample('.vimrc (Vim)');
  await page.waitForSelector('#previewHost .pj-doc', { timeout: 12000 });
  const vcText = await page.$eval('#previewHost .pj-doc', (e) => e.textContent);
  if (/Vim Config/i.test(vcText)) pass('.vimrc: Vim Config badge shown'); else fail('vc badge: ' + vcText.slice(0, 200));
  if (/vim-plug/i.test(vcText)) pass('.vimrc: vim-plug plugin manager detected'); else fail('vc pm: ' + vcText.slice(0, 300));
  if (/gruvbox/i.test(vcText)) pass('.vimrc: colorscheme detected'); else fail('vc colorscheme: ' + vcText.slice(0, 300));
  if (/Settings/i.test(vcText)) pass('.vimrc: Settings section shown'); else fail('vc settings: ' + vcText.slice(0, 300));
  if (/Key Mappings/i.test(vcText)) pass('.vimrc: Key Mappings section shown'); else fail('vc keymaps: ' + vcText.slice(0, 400));

  // ── init.el (Emacs Config) ──
  await openExample('init.el (Emacs)');
  await page.waitForSelector('#previewHost .pj-doc', { timeout: 12000 });
  const ecText = await page.$eval('#previewHost .pj-doc', (e) => e.textContent);
  if (/Emacs Config/i.test(ecText)) pass('init.el: Emacs Config badge shown'); else fail('ec badge: ' + ecText.slice(0, 200));
  if (/use-package/i.test(ecText)) pass('init.el: use-package package manager detected'); else fail('ec pm: ' + ecText.slice(0, 300));
  if (/Keybindings/i.test(ecText)) pass('init.el: Keybindings section shown'); else fail('ec keybindings: ' + ecText.slice(0, 300));
  if (/evil|company|ivy|magit|flycheck/i.test(ecText)) pass('init.el: package names shown'); else fail('ec packages: ' + ecText.slice(0, 400));
  if (/Custom Variables/i.test(ecText)) pass('init.el: Custom Variables section shown'); else fail('ec custom vars: ' + ecText.slice(0, 400));

  // ── devbox.json viewer ──
  await openExample('devbox.json');
  await page.waitForSelector('#previewHost .dvx-doc', { timeout: 12000 });
  const dvxText = await page.$eval('#previewHost .dvx-doc', (e) => e.textContent);
  if (/Devbox/i.test(dvxText)) pass('devbox.json: Devbox badge shown'); else fail('dvx badge: ' + dvxText.slice(0, 200));
  if (/nodejs|python|postgresql/i.test(dvxText)) pass('devbox.json: nix packages shown as chips'); else fail('dvx packages: ' + dvxText.slice(0, 300));
  if (/NODE_ENV|DATABASE_URL/i.test(dvxText)) pass('devbox.json: env variable keys shown'); else fail('dvx env keys: ' + dvxText.slice(0, 300));
  if (/\*\*\*\*/.test(dvxText)) pass('devbox.json: secret values are masked'); else fail('dvx masking: ' + dvxText.slice(0, 400));
  if (/dev|test|lint/i.test(dvxText)) pass('devbox.json: scripts shown'); else fail('dvx scripts: ' + dvxText.slice(0, 400));

  // ── .prototools viewer ──
  await openExample('.prototools');
  await page.waitForSelector('#previewHost .ptc-doc', { timeout: 12000 });
  const ptcText = await page.$eval('#previewHost .ptc-doc', (e) => e.textContent);
  if (/proto/i.test(ptcText)) pass('.prototools: proto badge shown'); else fail('ptc badge: ' + ptcText.slice(0, 200));
  if (/node|python|go|rust/i.test(ptcText)) pass('.prototools: tool names shown in table'); else fail('ptc tools: ' + ptcText.slice(0, 300));
  if (/20\.11\.0|3\.12\.0|1\.22\.0/i.test(ptcText)) pass('.prototools: tool versions shown'); else fail('ptc versions: ' + ptcText.slice(0, 300));
  if (/0\.38\.0/i.test(ptcText)) pass('.prototools: proto CLI version highlighted'); else fail('ptc proto ver: ' + ptcText.slice(0, 400));

  // ── aqua.yaml viewer ──
  await openExample('aqua.yaml');
  await page.waitForSelector('#previewHost .aqua-doc', { timeout: 12000 });
  const aqcText = await page.$eval('#previewHost .aqua-doc', (e) => e.textContent);
  if (/aqua/i.test(aqcText)) pass('aqua.yaml: aqua badge shown'); else fail('aqc badge: ' + aqcText.slice(0, 200));
  if (/standard/i.test(aqcText)) pass('aqua.yaml: registry type shown'); else fail('aqc registry: ' + aqcText.slice(0, 300));
  if (/cli\/cli|jqlang\/jq|sharkdp\/fd/i.test(aqcText)) pass('aqua.yaml: package names shown'); else fail('aqc packages: ' + aqcText.slice(0, 300));
  if (/v2\.45\.0|jq-1\.7\.1|v9\.0\.0/i.test(aqcText)) pass('aqua.yaml: package versions shown as pills'); else fail('aqc versions: ' + aqcText.slice(0, 400));

  // ── pixi.toml viewer ──
  await openExample('pixi.toml');
  await page.waitForSelector('#previewHost .pxi-doc', { timeout: 12000 });
  const pxiText = await page.$eval('#previewHost .pxi-doc', (e) => e.textContent);
  if (/pixi/i.test(pxiText)) pass('pixi.toml: pixi badge shown'); else fail('pxi badge: ' + pxiText.slice(0, 200));
  if (/ml-pipeline|0\.2\.0/i.test(pxiText)) pass('pixi.toml: project name and version shown'); else fail('pxi project: ' + pxiText.slice(0, 300));
  if (/conda-forge|defaults/i.test(pxiText)) pass('pixi.toml: channels shown'); else fail('pxi channels: ' + pxiText.slice(0, 300));
  if (/numpy|pandas|scikit-learn/i.test(pxiText)) pass('pixi.toml: conda dependencies shown'); else fail('pxi deps: ' + pxiText.slice(0, 400));
  if (/torch|transformers/i.test(pxiText)) pass('pixi.toml: PyPI dependencies shown'); else fail('pxi pypi: ' + pxiText.slice(0, 400));
  if (/train|evaluate|notebook/i.test(pxiText)) pass('pixi.toml: tasks shown in table'); else fail('pxi tasks: ' + pxiText.slice(0, 400));

  // ── .woodpecker.yml viewer ──
  await openExample('.woodpecker.yml (Woodpecker CI)');
  await page.waitForSelector('#previewHost .wpc-doc', { timeout: 12000 });
  const wpcText = await page.$eval('#previewHost .wpc-doc', (e) => e.textContent);
  if (/Woodpecker/i.test(wpcText)) pass('.woodpecker.yml: badge shown'); else fail('woodpecker badge: ' + wpcText.slice(0, 200));
  if (/step|pipeline/i.test(wpcText)) pass('.woodpecker.yml: steps shown'); else fail('woodpecker steps: ' + wpcText.slice(0, 200));
  if (/image|plugin/i.test(wpcText)) pass('.woodpecker.yml: step images shown'); else fail('woodpecker images: ' + wpcText.slice(0, 200));
  if (/secret|when|clone|matrix/i.test(wpcText)) pass('.woodpecker.yml: pipeline metadata shown'); else fail('woodpecker metadata: ' + wpcText.slice(0, 200));

  // ── woodpecker.yml (non-hidden) viewer ──
  await openExample('woodpecker.yml (Woodpecker CI)');
  await page.waitForSelector('#previewHost .wpc-doc', { timeout: 12000 });
  const wpcYmlText = await page.$eval('#previewHost .wpc-doc', (e) => e.textContent);
  if (/Woodpecker/i.test(wpcYmlText)) pass('woodpecker.yml: badge shown'); else fail('woodpecker.yml badge: ' + wpcYmlText.slice(0, 200));
  if (/step|pipeline/i.test(wpcYmlText)) pass('woodpecker.yml: steps shown'); else fail('woodpecker.yml steps: ' + wpcYmlText.slice(0, 200));
  if (/postgres|service/i.test(wpcYmlText)) pass('woodpecker.yml: services shown'); else fail('woodpecker.yml services: ' + wpcYmlText.slice(0, 300));

  // ── harness-pipeline.yaml viewer ──
  await openExample('Harness Pipeline');
  await page.waitForSelector('#previewHost .hrn-doc', { timeout: 12000 });
  const hrnText = await page.$eval('#previewHost .hrn-doc', (e) => e.textContent);
  if (/Harness/i.test(hrnText)) pass('harness-pipeline.yaml: badge shown'); else fail('harness badge: ' + hrnText.slice(0, 200));
  if (/pipeline|identifier/i.test(hrnText)) pass('harness-pipeline.yaml: pipeline identity shown'); else fail('harness identity: ' + hrnText.slice(0, 200));
  if (/stage|CI|CD/i.test(hrnText)) pass('harness-pipeline.yaml: stages shown'); else fail('harness stages: ' + hrnText.slice(0, 200));
  if (/step|variable|tag/i.test(hrnText)) pass('harness-pipeline.yaml: stage details shown'); else fail('harness details: ' + hrnText.slice(0, 200));

  // ── codefresh.yml viewer ──
  await openExample('Codefresh config');
  await page.waitForSelector('#previewHost .cfd-doc', { timeout: 12000 });
  const cfdText = await page.$eval('#previewHost .cfd-doc', (e) => e.textContent);
  if (/Codefresh/i.test(cfdText)) pass('codefresh.yml: badge shown'); else fail('codefresh badge: ' + cfdText.slice(0, 200));
  if (/step|build|test|push/i.test(cfdText)) pass('codefresh.yml: steps shown'); else fail('codefresh steps: ' + cfdText.slice(0, 200));
  if (/version/i.test(cfdText)) pass('codefresh.yml: version shown'); else fail('codefresh version: ' + cfdText.slice(0, 200));
  if (/trigger|variable|image|type/i.test(cfdText)) pass('codefresh.yml: pipeline metadata shown'); else fail('codefresh metadata: ' + cfdText.slice(0, 200));


  // ── rego-policy viewer (rego-policy plugin intercepts all .rego files before opa-policy) ──
  await openExample('policy.rego');
  await page.waitForSelector('#previewHost .rego-doc', { timeout: 12000 });
  const opaText = await page.$eval('#previewHost .rego-doc', (e) => e.textContent);
  if (/OPA Rego|Rego/i.test(opaText)) pass('policy.rego: OPA Rego badge shown'); else fail('rego badge: ' + opaText.slice(0, 200));
  if (/authz/i.test(opaText)) pass('policy.rego: package name shown'); else fail('rego package: ' + opaText.slice(0, 300));
  if (/allow/i.test(opaText)) pass('policy.rego: allow rules shown'); else fail('rego allow rules: ' + opaText.slice(0, 300));
  if (/deny/i.test(opaText)) pass('policy.rego: deny rules shown'); else fail('rego deny rules: ' + opaText.slice(0, 300));
  if (/rego\.v1|data\.roles/i.test(opaText)) pass('policy.rego: imports shown'); else fail('rego imports: ' + opaText.slice(0, 300));

  // ── falco-rules viewer ──
  await openExample('falco_rules.yaml');
  await page.waitForSelector('#previewHost .falco-doc', { timeout: 12000 });
  const falcoText = await page.$eval('#previewHost .falco-doc', (e) => e.textContent);
  if (/Falco Rules/i.test(falcoText)) pass('falco_rules.yaml: Falco Rules badge shown'); else fail('falco badge: ' + falcoText.slice(0, 200));
  if (/Terminal shell in container/i.test(falcoText)) pass('falco_rules.yaml: rule name shown'); else fail('falco rule name: ' + falcoText.slice(0, 300));
  if (/CRITICAL|ERROR|NOTICE/i.test(falcoText)) pass('falco_rules.yaml: priority levels shown'); else fail('falco priority: ' + falcoText.slice(0, 300));
  if (/container|shell|network/i.test(falcoText)) pass('falco_rules.yaml: tags shown'); else fail('falco tags: ' + falcoText.slice(0, 300));
  if (/spawned_process|bin_dir/i.test(falcoText)) pass('falco_rules.yaml: macro names shown'); else fail('falco macros: ' + falcoText.slice(0, 300));

  // ── falco-config viewer ──
  await openExample('falco.yaml');
  await page.waitForSelector('#previewHost .falco-doc', { timeout: 12000 });
  const falcoCfgText = await page.$eval('#previewHost .falco-doc', (e) => e.textContent);
  if (/Falco/i.test(falcoCfgText)) pass('falco.yaml: Falco badge shown'); else fail('falco-config badge: ' + falcoCfgText.slice(0, 200));
  if (/rules_file|Rules Files/i.test(falcoCfgText)) pass('falco.yaml: rules files shown'); else fail('falco-config rules: ' + falcoCfgText.slice(0, 300));
  if (/log_level|info/i.test(falcoCfgText)) pass('falco.yaml: log level shown'); else fail('falco-config log: ' + falcoCfgText.slice(0, 300));
  if (/stdout_output|Outputs/i.test(falcoCfgText)) pass('falco.yaml: outputs shown'); else fail('falco-config outputs: ' + falcoCfgText.slice(0, 300));

  // ── kyverno-policy viewer ──
  await openExample('kyverno-policy.yaml');
  await page.waitForSelector('#previewHost .kyv-doc', { timeout: 12000 });
  const kyvText = await page.$eval('#previewHost .kyv-doc', (e) => e.textContent);
  if (/Kyverno/i.test(kyvText)) pass('kyverno-policy.yaml: Kyverno badge shown'); else fail('kyverno badge: ' + kyvText.slice(0, 200));
  if (/disallow-privileged-containers/i.test(kyvText)) pass('kyverno-policy.yaml: policy name shown'); else fail('kyverno name: ' + kyvText.slice(0, 300));
  if (/enforce/i.test(kyvText)) pass('kyverno-policy.yaml: validationFailureAction shown'); else fail('kyverno action: ' + kyvText.slice(0, 300));
  if (/privileged-containers/i.test(kyvText)) pass('kyverno-policy.yaml: rule names shown'); else fail('kyverno rules: ' + kyvText.slice(0, 300));
  if (/Pod/i.test(kyvText)) pass('kyverno-policy.yaml: matched kinds shown'); else fail('kyverno kinds: ' + kyvText.slice(0, 300));

  // ── gatekeeper-config viewer ──
  await openExample('gatekeeper-constraint.yaml');
  await page.waitForSelector('#previewHost .gkpr-doc', { timeout: 12000 });
  const gkText = await page.$eval('#previewHost .gkpr-doc', (e) => e.textContent);
  if (/Gatekeeper/i.test(gkText)) pass('gatekeeper-constraint.yaml: Gatekeeper badge shown'); else fail('gatekeeper badge: ' + gkText.slice(0, 200));
  if (/require-team-label/i.test(gkText)) pass('gatekeeper-constraint.yaml: constraint name shown'); else fail('gatekeeper name: ' + gkText.slice(0, 300));
  if (/deny/i.test(gkText)) pass('gatekeeper-constraint.yaml: enforcementAction shown'); else fail('gatekeeper action: ' + gkText.slice(0, 300));
  if (/Namespace/i.test(gkText)) pass('gatekeeper-constraint.yaml: match kinds shown'); else fail('gatekeeper kinds: ' + gkText.slice(0, 300));
  if (/team|labels/i.test(gkText)) pass('gatekeeper-constraint.yaml: parameters shown'); else fail('gatekeeper params: ' + gkText.slice(0, 300));

  // ── .actrc viewer (actrc plugin intercepts before act-config) ──
  await openExample('act config (.actrc)');
  await page.waitForSelector('#previewHost .actrc-doc', { timeout: 12000 });
  const actText = await page.$eval('#previewHost .actrc-doc', (e) => e.textContent);
  if (/\bact\b/i.test(actText)) pass('.actrc: act badge shown'); else fail('act badge: ' + actText.slice(0, 200));
  if (/ubuntu|platform|runner/i.test(actText)) pass('.actrc: platform mappings shown'); else fail('act platforms: ' + actText.slice(0, 200));
  if (/env|secret/i.test(actText)) pass('.actrc: env/secrets shown'); else fail('act env/secrets: ' + actText.slice(0, 200));
  if (/ghcr\.io|catthehacker|docker/i.test(actText)) pass('.actrc: docker image shown'); else fail('act docker image: ' + actText.slice(0, 200));
  // ── clickhouse config.xml viewer ──
  await openExample('config.xml (ClickHouse)');
  await page.waitForSelector('#previewHost .ch-doc', { timeout: 12000 });
  const chText = await page.$eval('#previewHost .ch-doc', (e) => e.textContent);
  if (/ClickHouse/i.test(chText)) pass('config.xml: ClickHouse badge shown'); else fail('clickhouse badge: ' + chText.slice(0, 200));
  if (/9000|8123/i.test(chText)) pass('config.xml: TCP/HTTP ports shown'); else fail('clickhouse ports: ' + chText.slice(0, 300));
  if (/4096/i.test(chText)) pass('config.xml: max_connections shown'); else fail('clickhouse max_connections: ' + chText.slice(0, 300));
  if (/information|debug|warning|error/i.test(chText)) pass('config.xml: log level shown'); else fail('clickhouse loglevel: ' + chText.slice(0, 300));
  if (/clickhouse-server|default/i.test(chText)) pass('config.xml: storage/database shown'); else fail('clickhouse storage: ' + chText.slice(0, 300));

  // ── cassandra.yaml viewer ──
  await openExample('cassandra.yaml');
  await page.waitForSelector('#previewHost .cass-doc', { timeout: 12000 });
  const cassText = await page.$eval('#previewHost .cass-doc', (e) => e.textContent);
  if (/Cassandra/i.test(cassText)) pass('cassandra.yaml: Cassandra badge shown'); else fail('cassandra badge: ' + cassText.slice(0, 200));
  if (/MyProductionCluster/i.test(cassText)) pass('cassandra.yaml: cluster name shown'); else fail('cassandra cluster name: ' + cassText.slice(0, 300));
  if (/10\.0\.1\.10|10\.0\.1\.11|10\.0\.1\.12/i.test(cassText)) pass('cassandra.yaml: seed addresses shown'); else fail('cassandra seeds: ' + cassText.slice(0, 300));
  if (/9042/i.test(cassText)) pass('cassandra.yaml: native_transport_port shown'); else fail('cassandra port: ' + cassText.slice(0, 300));
  if (/PasswordAuthenticator|GossipingPropertyFileSnitch/i.test(cassText)) pass('cassandra.yaml: auth/snitch settings shown'); else fail('cassandra auth: ' + cassText.slice(0, 300));

  // ── elasticsearch.yml viewer ──
  await openExample('elasticsearch.yml');
  await page.waitForSelector('#previewHost .es-doc', { timeout: 12000 });
  const esText = await page.$eval('#previewHost .es-doc', (e) => e.textContent);
  if (/Elasticsearch/i.test(esText)) pass('elasticsearch.yml: Elasticsearch badge shown'); else fail('elasticsearch badge: ' + esText.slice(0, 200));
  if (/my-production-cluster/i.test(esText)) pass('elasticsearch.yml: cluster.name shown'); else fail('elasticsearch cluster: ' + esText.slice(0, 300));
  if (/es-node-01/i.test(esText)) pass('elasticsearch.yml: node.name shown'); else fail('elasticsearch node: ' + esText.slice(0, 300));
  if (/9200/i.test(esText)) pass('elasticsearch.yml: http.port shown'); else fail('elasticsearch http port: ' + esText.slice(0, 300));
  if (/••••••••|sensitive|keystore|truststore/i.test(esText)) pass('elasticsearch.yml: X-Pack sensitive keys masked'); else fail('elasticsearch security masking: ' + esText.slice(0, 300));

  // ── sentinel.conf viewer ──
  await openExample('sentinel.conf (Redis Sentinel)');
  await page.waitForSelector('#previewHost .rds-doc', { timeout: 12000 });
  const rdsText = await page.$eval('#previewHost .rds-doc', (e) => e.textContent);
  if (/Redis Sentinel/i.test(rdsText)) pass('sentinel.conf: Redis Sentinel badge shown'); else fail('sentinel badge: ' + rdsText.slice(0, 200));
  if (/26379/i.test(rdsText)) pass('sentinel.conf: sentinel port shown'); else fail('sentinel port: ' + rdsText.slice(0, 300));
  if (/redis-primary|redis-cache/i.test(rdsText)) pass('sentinel.conf: monitored master names shown'); else fail('sentinel masters: ' + rdsText.slice(0, 300));
  if (/••••••••|sensitive/i.test(rdsText)) pass('sentinel.conf: passwords are masked'); else fail('sentinel masking: ' + rdsText.slice(0, 300));
  if (/30000|180000/i.test(rdsText)) pass('sentinel.conf: down-after/failover-timeout shown'); else fail('sentinel timeouts: ' + rdsText.slice(0, 300));
  // ── django-settings viewer ──
  await openExample('settings.py (Django)');
  await page.waitForSelector('#previewHost .dj-doc', { timeout: 12000 });
  const djText = await page.$eval('#previewHost .dj-doc', (e) => e.textContent);
  if (/Django Settings/i.test(djText)) pass('settings.py: Django Settings badge shown'); else fail('dj badge: ' + djText.slice(0, 200));
  if (/rest_framework|corsheaders|myapp/i.test(djText)) pass('settings.py: INSTALLED_APPS listed'); else fail('dj apps: ' + djText.slice(0, 300));
  if (/postgresql|django\.db\.backends/i.test(djText)) pass('settings.py: database engine shown'); else fail('dj db engine: ' + djText.slice(0, 300));
  if (/\u2022{4,}/.test(djText)) pass('settings.py: SECRET_KEY and DB password masked'); else fail('dj masking: ' + djText.slice(0, 300));
  if (/DEBUG/i.test(djText)) pass('settings.py: DEBUG flag shown'); else fail('dj debug: ' + djText.slice(0, 300));
  if (/example\.com|10\.0\.0\.1/i.test(djText)) pass('settings.py: ALLOWED_HOSTS shown'); else fail('dj hosts: ' + djText.slice(0, 300));

  // ── spring-profiles viewer ──
  await openExample('application-production.yml (Spring Boot)');
  await page.waitForSelector('#previewHost .sp-doc', { timeout: 12000 });
  const spText = await page.$eval('#previewHost .sp-doc', (e) => e.textContent);
  if (/Spring Boot/i.test(spText)) pass('application-production.yml: Spring Boot badge shown'); else fail('sp badge: ' + spText.slice(0, 200));
  if (/payment-service/i.test(spText)) pass('application-production.yml: application name shown'); else fail('sp appname: ' + spText.slice(0, 300));
  if (/8080/i.test(spText)) pass('application-production.yml: server port shown'); else fail('sp port: ' + spText.slice(0, 300));
  if (/prod-db\.internal|postgresql/i.test(spText)) pass('application-production.yml: datasource URL shown'); else fail('sp datasource: ' + spText.slice(0, 300));
  if (/\u2022{4,}/.test(spText)) pass('application-production.yml: secrets masked'); else fail('sp masking: ' + spText.slice(0, 300));
  if (/prod-redis\.internal/i.test(spText)) pass('application-production.yml: Redis host shown'); else fail('sp redis: ' + spText.slice(0, 300));
  if (/com\.example\.payment|WARN|INFO/i.test(spText)) pass('application-production.yml: logging levels shown'); else fail('sp logging: ' + spText.slice(0, 300));

  // ── rails-credentials viewer ──
  await openExample('credentials.yml (Rails)');
  await page.waitForSelector('#previewHost .rc-doc', { timeout: 12000 });
  const rcText = await page.$eval('#previewHost .rc-doc', (e) => e.textContent);
  if (/Rails Credentials/i.test(rcText)) pass('credentials.yml: Rails Credentials badge shown'); else fail('rc badge: ' + rcText.slice(0, 200));
  if (/aws|stripe|sendgrid/i.test(rcText)) pass('credentials.yml: credential sections shown'); else fail('rc sections: ' + rcText.slice(0, 300));
  if (/\u2022{4,}/.test(rcText)) pass('credentials.yml: secret values masked'); else fail('rc masking: ' + rcText.slice(0, 300));
  if (/never commit|sensitive/i.test(rcText)) pass('credentials.yml: security warning shown'); else fail('rc warning: ' + rcText.slice(0, 300));

  // ── puma-config viewer ──
  await openExample('puma.rb (Puma)');
  await page.waitForSelector('#previewHost .pu-doc', { timeout: 12000 });
  const puText = await page.$eval('#previewHost .pu-doc', (e) => e.textContent);
  if (/Puma/i.test(puText)) pass('puma.rb: Puma badge shown'); else fail('pu badge: ' + puText.slice(0, 200));
  if (/worker|WEB_CONCURRENCY/i.test(puText)) pass('puma.rb: workers shown'); else fail('pu workers: ' + puText.slice(0, 300));
  if (/2.*16|threads/i.test(puText)) pass('puma.rb: thread range shown'); else fail('pu threads: ' + puText.slice(0, 300));
  if (/production/i.test(puText)) pass('puma.rb: environment shown'); else fail('pu env: ' + puText.slice(0, 300));
  if (/preload_app/i.test(puText)) pass('puma.rb: preload_app status shown'); else fail('pu preload: ' + puText.slice(0, 300));
  if (/tmp_restart|telemetry/i.test(puText)) pass('puma.rb: plugins listed'); else fail('pu plugins: ' + puText.slice(0, 300));
}
