// Auto-split slice 01/18 of the known-files smoke area (see ./../known-files.mjs).
// Covers: package.json … lefthook.yml.
// Called in order on the shared ctx — keep openExample order intact; no cross-file state.
export async function run(ctx) {
  const { page, origin, frameOf, pass, fail, openExample } = ctx;

  // ── Known-file enhancement (Layer 3): package.json -> npm links + revert chip ──
  await openExample('package.json');
  await page.waitForSelector('#previewHost .pj-doc', { timeout: 12000 });
  pass('package.json gets the enhanced view (rendered in the parent pane)');
  const npmHrefs = await page.$$eval('#previewHost .pj-deps a.pj-link', (els) => els.map((a) => a.getAttribute('href')));
  if (npmHrefs.some((h) => /npmjs\.com\/package\/markdown-it/.test(h)) && npmHrefs.every((h) => /^https:\/\/www\.npmjs\.com\/package\//.test(h))) pass('dependencies link to npm (' + npmHrefs.length + ' deps)'); else fail('npm links: ' + npmHrefs.join(','));
  // External links are href-only (open in a new tab, rel=noopener) — not auto-fetched.
  const linkRel = await page.$eval('#previewHost .pj-deps a.pj-link', (a) => a.rel + '|' + a.target);
  if (/noopener/.test(linkRel) && /_blank/.test(linkRel)) pass('npm links are external-safe (noopener, new tab)'); else fail('link rel/target: ' + linkRel);
  // The enhance chip is shown and reverts to the plain JSON tree.
  const chipShown = await page.$eval('#enhanceChip', (e) => !e.hidden && /package\.json/.test(e.textContent));
  if (chipShown) pass('enhance chip shows the active known-file'); else fail('enhance chip not shown');
  await page.click('#metaBtn');
  await page.waitForSelector('#metaBody .meta-row', { timeout: 6000 });
  const pkgMeta = await page.$eval('#metaBody', (e) => e.textContent);
  if (/Package\s*demo-package/.test(pkgMeta) && /Dependencies\s*4/.test(pkgMeta)) pass('package.json metadata includes package and dependency counts'); else fail('package meta: ' + pkgMeta.replace(/\s+/g, ' ').slice(0, 160));
  await page.click('#metaDrawer [data-close]');
  await page.click('#enhanceChip .ec-toggle');
  // Reverting to base JSON now renders a live parentNode (tree + query panel), not an iframe.
  await page.waitForSelector('#previewHost .json-tree .j-key', { timeout: 8000 });
  pass('revert chip switches to the plain JSON tree view');

  // ── More known-files (Layer 3): Cargo.toml, tsconfig.json, Dockerfile, docker-compose, .gitignore ──
  await openExample('Cargo.toml');
  await page.waitForSelector('#previewHost .pj-doc', { timeout: 12000 });
  const crateHrefs = await page.$$eval('#previewHost .pj-deps a.pj-link', (els) => els.map((a) => a.getAttribute('href')));
  if (crateHrefs.some((h) => /crates\.io\/crates\/serde/.test(h))) pass('Cargo.toml: dependencies link to crates.io'); else fail('crate links: ' + crateHrefs.join(','));

  await openExample('tsconfig.json');
  await page.waitForSelector('#previewHost .ts-table', { timeout: 12000 });
  const tsDocs = await page.$$eval('#previewHost .ts-table .ts-doc', (els) => els.map((e) => e.textContent).join(' '));
  if (/strict type-checking/i.test(tsDocs)) pass('tsconfig.json: compiler options annotated'); else fail('tsconfig docs: ' + tsDocs.slice(0, 80));

  await openExample('Dockerfile');
  await page.waitForSelector('#previewHost .kf-list', { timeout: 12000 });
  const dfBadges = await page.$$eval('#previewHost .kf-badge', (els) => els.map((e) => e.textContent));
  if (dfBadges.filter((b) => b === 'FROM').length === 2 && dfBadges.includes('HEALTHCHECK')) pass('Dockerfile: instructions broken down (2 FROM stages)'); else fail('dockerfile badges: ' + dfBadges.join(','));
  await page.click('#metaBtn');
  await page.waitForSelector('#metaBody .meta-row', { timeout: 6000 });
  const dfMeta = await page.$eval('#metaBody', (e) => e.textContent);
  if (/Instructions\s*\d+/.test(dfMeta) && /Build stages\s*2/.test(dfMeta)) pass('Dockerfile metadata comes from known-file extractor'); else fail('dockerfile meta: ' + dfMeta.replace(/\s+/g, ' ').slice(0, 160));
  await page.click('#metaDrawer [data-close]');

  await openExample('docker-compose.yml');
  await page.waitForSelector('#previewHost .kf-svc', { timeout: 12000 });
  const svcNames = await page.$$eval('#previewHost .kf-svc h3', (els) => els.map((e) => e.textContent));
  if (svcNames.includes('web') && svcNames.includes('api')) pass('docker-compose: a card per service (' + svcNames.join(', ') + ')'); else fail('compose services: ' + svcNames.join(','));
  const composeHrefs = await page.$$eval('#previewHost .kf-svc a.pj-link', (els) => els.map((a) => a.getAttribute('href')));
  if (composeHrefs.some((h) => /hub\.docker\.com\/_\/node/.test(h))) pass('docker-compose: Docker Hub image links are href-only'); else fail('compose links: ' + composeHrefs.join(','));
  const composeRel = await page.$eval('#previewHost .kf-svc a.pj-link', (a) => a.rel + '|' + a.target);
  if (/noopener/.test(composeRel) && /_blank/.test(composeRel)) pass('docker-compose: image links are external-safe'); else fail('compose link rel/target: ' + composeRel);
  const composeText = await page.$eval('#previewHost', (e) => e.textContent);
  if (/current directory build context/.test(composeText) && /relative bind/.test(composeText) && /host-local paths/.test(composeText)) pass('docker-compose: build and local bind hints are visible');
  else fail('compose text: ' + composeText.replace(/\s+/g, ' ').slice(0, 220));
  await page.click('#metaBtn');
  await page.waitForSelector('#metaBody .meta-row', { timeout: 6000 });
  const composeMeta = await page.$eval('#metaBody', (e) => e.textContent);
  if (/Services\s*4/.test(composeMeta) && /Build services\s*1/.test(composeMeta) && /Bind mounts\s*1/.test(composeMeta)) pass('docker-compose metadata includes stack and volume facts');
  else fail('compose meta: ' + composeMeta.replace(/\s+/g, ' ').slice(0, 180));
  await page.click('#metaDrawer [data-close]');

  await openExample('.gitignore');
  await page.waitForSelector('#previewHost .kf-pat', { timeout: 12000 });
  const giPats = await page.$$eval('#previewHost .kf-pat code', (els) => els.map((e) => e.textContent));
  const giTags = await page.$$eval('#previewHost .kf-pat .kf-tag', (els) => els.map((e) => e.textContent));
  if (giPats.includes('node_modules/') && giTags.includes('un-ignore')) pass('.gitignore: patterns annotated (directory, un-ignore, …)'); else fail('gitignore pats=' + giPats.join(',') + ' tags=' + giTags.join(','));

  // ── More known-files (Layer 3): dependency manifests → ecosystem links ──
  await openExample('requirements.txt');
  await page.waitForSelector('#previewHost .pj-doc', { timeout: 12000 });
  const reqHrefs = await page.$$eval('#previewHost a.pj-link', (els) => els.map((a) => a.getAttribute('href')));
  if (reqHrefs.some((h) => /pypi\.org\/project\/Flask/.test(h)) && reqHrefs.some((h) => /pypi\.org\/project\/celery/i.test(h))) pass('requirements.txt: packages link to PyPI'); else fail('pypi links: ' + reqHrefs.join(','));
  const reqTags = await page.$$eval('#previewHost .kf-tag', (els) => els.map((e) => e.textContent));
  if (reqTags.includes('redis') && reqTags.includes('include') && reqTags.includes('index')) pass('requirements.txt: extras and option kinds are tagged'); else fail('requirements tags: ' + reqTags.join(','));
  if (!reqHrefs.some((h) => /pypi\.org\/project\/https/i.test(h))) pass('requirements.txt: option URLs are not linked as packages'); else fail('requirements option URL linked: ' + reqHrefs.join(','));
  await page.click('#metaBtn');
  await page.waitForSelector('#metaBody .meta-row', { timeout: 6000 });
  const reqMeta = await page.$eval('#metaBody', (e) => e.textContent);
  if (/Pinned\s*4/.test(reqMeta) && /Constrained\s*2/.test(reqMeta) && /Unpinned\s*2/.test(reqMeta) && /Index URLs\s*1/.test(reqMeta)) pass('requirements.txt metadata includes pinning and index facts');
  else fail('requirements meta: ' + reqMeta.replace(/\s+/g, ' ').slice(0, 220));
  await page.click('#metaDrawer [data-close]');

  await openExample('go.mod');
  await page.waitForSelector('#previewHost .pj-doc', { timeout: 12000 });
  const goHrefs = await page.$$eval('#previewHost a.pj-link', (els) => els.map((a) => a.getAttribute('href')));
  const goIndirect = await page.$$eval('#previewHost .kf-tag', (els) => els.map((e) => e.textContent));
  if (goHrefs.some((h) => /pkg\.go\.dev\/github\.com\/gin-gonic\/gin/.test(h)) && goIndirect.includes('indirect')) pass('go.mod: modules link to pkg.go.dev (+ indirect tagged)'); else fail('go links: ' + goHrefs.join(',') + ' tags=' + goIndirect.join(','));

  await openExample('composer.json');
  await page.waitForSelector('#previewHost .pj-doc', { timeout: 12000 });
  const composerHrefs = await page.$$eval('#previewHost a.pj-link', (els) => els.map((a) => a.getAttribute('href')));
  if (composerHrefs.some((h) => /packagist\.org\/packages\/guzzlehttp\/guzzle/.test(h))) pass('composer.json: dependencies link to Packagist'); else fail('packagist links: ' + composerHrefs.join(','));

  await openExample('Gemfile');
  await page.waitForSelector('#previewHost .gemfile-doc', { timeout: 12000 });
  pass('Gemfile: badge shown');
  const gemText = await page.$eval('#previewHost .gemfile-doc', el => el.textContent);
  if (!gemText.includes('rails')) fail('Gemfile: gems not shown');
  else pass('Gemfile: rails gem shown');
  if (!gemText.includes('rspec') && !gemText.includes('development')) fail('Gemfile: groups not shown');
  else pass('Gemfile: groups shown');

  // ── More known-files (Layer 3): CODEOWNERS, .editorconfig, pom.xml ──
  await openExample('CODEOWNERS');
  await page.waitForSelector('#previewHost .codeowners-doc', { timeout: 12000 });
  pass('CODEOWNERS: badge shown');
  const coText = await page.$eval('#previewHost .codeowners-doc', el => el.textContent);
  if (!coText.includes('platform-team')) fail('CODEOWNERS: owners not shown');
  else pass('CODEOWNERS: owners shown');
  if (!coText.includes('frontend')) fail('CODEOWNERS: sections not shown');
  else pass('CODEOWNERS: sections shown');

  await openExample('.editorconfig');
  await page.waitForSelector('#previewHost .editorconfig-doc', { timeout: 12000 });
  const ecGlobs = await page.$$eval('#previewHost .ec-section-head code', (els) => els.map((e) => e.textContent));
  const ecRoot = await page.$eval('#previewHost .editorconfig-doc', (el) => el.textContent);
  if (ecGlobs.some((g) => /\*\.py/.test(g)) && /root/i.test(ecRoot)) pass('.editorconfig: sections per glob (+ root flag)'); else fail('editorconfig globs=' + ecGlobs.join(',') + ' root=' + /root/i.test(ecRoot));

  await openExample('pom.xml (Maven POM)');
  await page.waitForSelector('#previewHost .mvn-doc', { timeout: 12000 });
  const pomHrefs = await page.$$eval('#previewHost a.mvn-link', (els) => els.map((a) => a.getAttribute('href')));
  const pomScopes = await page.$$eval('#previewHost .mvn-scope', (els) => els.map((e) => e.textContent));
  if (pomHrefs.some((h) => /mvnrepository\.com\/artifact\/com\.google\.guava\/guava/.test(h)) && pomScopes.includes('test')) pass('pom.xml: dependencies link to mvnrepository (+ scope tagged)'); else fail('pom links=' + pomHrefs.join(',') + ' scopes=' + pomScopes.join(','));

  await openExample('build.gradle');
  await page.waitForSelector('#previewHost .buildgradle-doc', { timeout: 12000 });
  pass('build.gradle: renders');
  const gradleText = await page.$eval('#previewHost .buildgradle-doc', (el) => el.textContent);
  if (!gradleText.includes('Gradle')) fail('build.gradle: missing badge'); else pass('build.gradle: badge shown');
  if (!gradleText.includes('plugin') && !gradleText.includes('depend')) fail('build.gradle: no plugins or deps'); else pass('build.gradle: content shown');
  const gradleHrefs = await page.$$eval('#previewHost .buildgradle-doc a.bgr-link', (els) => els.map((a) => a.getAttribute('href')));
  if (gradleHrefs.some((h) => /mvnrepository\.com\/artifact\/com\.google\.guava\/guava/.test(h))) pass('build.gradle: deps link to mvnrepository'); else fail('gradle links=' + gradleHrefs.join(','));

  await openExample('Pipfile');
  await page.waitForSelector('#previewHost .pj-doc', { timeout: 12000 });
  const pipHrefs = await page.$$eval('#previewHost a.pj-link', (els) => els.map((a) => a.getAttribute('href')));
  const pipTags = await page.$$eval('#previewHost .pj-tag', (els) => els.map((e) => e.textContent));
  if (pipHrefs.some((h) => /pypi\.org\/project\/flask/i.test(h)) && pipTags.some((t) => /Python 3\.12/.test(t))) pass('Pipfile: packages link to PyPI (+ Python version)'); else fail('pip links=' + pipHrefs.join(',') + ' tags=' + pipTags.join(','));

  await openExample('openapi.yaml');
  await page.waitForSelector('#previewHost .oa-list', { timeout: 12000 });
  const oaTitle = await page.$eval('#previewHost .pj-title', (e) => e.textContent);
  const oaMethods = await page.$$eval('#previewHost .oa-method', (els) => els.map((e) => e.textContent));
  const oaPaths = await page.$$eval('#previewHost .oa-path', (els) => els.map((e) => e.textContent));
  if (/Widget API/.test(oaTitle) && oaMethods.includes('DELETE') && oaPaths.includes('/widgets/{id}')) pass('OpenAPI: endpoints listed by method + path (' + oaMethods.length + ' ops)'); else fail('openapi: title=' + oaTitle + ' methods=' + oaMethods.join(',') + ' paths=' + oaPaths.join(','));
  await page.click('#metaBtn');
  await page.waitForSelector('#metaBody .meta-row', { timeout: 6000 });
  const oaMeta = await page.$eval('#metaBody', (e) => e.textContent);
  if (/API title\s*Widget API/.test(oaMeta) && /Endpoints\s*6/.test(oaMeta)) pass('OpenAPI metadata includes title and endpoint count'); else fail('openapi meta: ' + oaMeta.replace(/\s+/g, ' ').slice(0, 160));
  await page.click('#metaDrawer [data-close]');

  // ── GitHub Actions workflow viewer ──
  await openExample('GitHub Actions CI workflow (demo)');
  await page.waitForSelector('#previewHost .gha-doc, #previewHost [class*="gha"]', { timeout: 12000 });
  const ghaText = await page.$eval('#previewHost', (e) => e.textContent);
  if (/GitHub Actions/i.test(ghaText)) pass('GitHub Actions: badge shown'); else fail('gha badge: ' + ghaText.slice(0, 200));
  if (/push|pull.request|workflow.dispatch/i.test(ghaText)) pass('GitHub Actions: triggers shown'); else fail('gha triggers: ' + ghaText.slice(0, 200));
  if (/test|lint|build/i.test(ghaText)) pass('GitHub Actions: jobs shown'); else fail('gha jobs: ' + ghaText.slice(0, 200));

  // ── Kubernetes manifest viewer ──
  await openExample('Kubernetes Deployment manifest (demo)');
  await page.waitForSelector('#previewHost .k8s-doc, #previewHost [class*="k8s"]', { timeout: 12000 });
  const k8sText = await page.$eval('#previewHost', (e) => e.textContent);
  if (/Kubernetes/i.test(k8sText)) pass('Kubernetes: badge shown'); else fail('k8s badge: ' + k8sText.slice(0, 200));
  if (/Deployment/i.test(k8sText)) pass('Kubernetes: kind shown'); else fail('k8s kind: ' + k8sText.slice(0, 200));
  if (/web-app|production/i.test(k8sText)) pass('Kubernetes: name/namespace shown'); else fail('k8s meta: ' + k8sText.slice(0, 200));

  // ── Kubernetes RBAC viewer ──
  await openExample('k8s-role.yaml');
  await page.waitForSelector('#previewHost .rbac-doc', { timeout: 12000 });
  const rbacText = await page.$eval('#previewHost .rbac-doc', (e) => e.textContent);
  if (/K8s RBAC/i.test(rbacText)) pass('k8s-rbac: badge shown'); else fail('k8s-rbac badge: ' + rbacText.slice(0, 200));
  if (/ClusterRole/i.test(rbacText)) pass('k8s-rbac: kind shown'); else fail('k8s-rbac kind: ' + rbacText.slice(0, 200));
  if (/pod-reader/i.test(rbacText)) pass('k8s-rbac: name shown'); else fail('k8s-rbac name: ' + rbacText.slice(0, 200));
  if (/pods|deployments/i.test(rbacText)) pass('k8s-rbac: resources shown'); else fail('k8s-rbac resources: ' + rbacText.slice(0, 300));
  if (/get|list|watch/i.test(rbacText)) pass('k8s-rbac: verbs shown'); else fail('k8s-rbac verbs: ' + rbacText.slice(0, 300));

  // ── Kubernetes NetworkPolicy viewer ──
  await openExample('k8s-network-policy.yaml');
  await page.waitForSelector('#previewHost .np-doc', { timeout: 12000 });
  const npText = await page.$eval('#previewHost .np-doc', (e) => e.textContent);
  if (/NetworkPolicy/i.test(npText)) pass('k8s-network-policy: badge shown'); else fail('k8s-network-policy badge: ' + npText.slice(0, 200));
  if (/api-server-policy/i.test(npText)) pass('k8s-network-policy: name shown'); else fail('k8s-network-policy name: ' + npText.slice(0, 200));
  if (/Ingress|Egress/i.test(npText)) pass('k8s-network-policy: policy types shown'); else fail('k8s-network-policy types: ' + npText.slice(0, 300));
  if (/api-server|backend/i.test(npText)) pass('k8s-network-policy: pod selector shown'); else fail('k8s-network-policy selector: ' + npText.slice(0, 300));

  // ── Kubernetes HPA viewer ──
  await openExample('k8s-hpa.yaml (HPA)');
  await page.waitForSelector('#previewHost .hpa-doc', { timeout: 12000 });
  const hpaText = await page.$eval('#previewHost .hpa-doc', (e) => e.textContent);
  if (/HPA/i.test(hpaText)) pass('k8s-hpa: badge shown'); else fail('k8s-hpa badge: ' + hpaText.slice(0, 200));
  if (/HorizontalPodAutoscaler/i.test(hpaText)) pass('k8s-hpa: kind shown'); else fail('k8s-hpa kind: ' + hpaText.slice(0, 200));
  if (/api-server/i.test(hpaText)) pass('k8s-hpa: target shown'); else fail('k8s-hpa target: ' + hpaText.slice(0, 200));
  if (/2.*20|20.*2/i.test(hpaText.replace(/\s+/g, ' '))) pass('k8s-hpa: replica range shown'); else fail('k8s-hpa replicas: ' + hpaText.slice(0, 300));
  if (/cpu|memory/i.test(hpaText)) pass('k8s-hpa: metrics shown'); else fail('k8s-hpa metrics: ' + hpaText.slice(0, 300));

  // ── Kubernetes Ingress viewer ──
  await openExample('k8s-ingress.yaml');
  await page.waitForSelector('#previewHost .ing-doc', { timeout: 12000 });
  const ingText = await page.$eval('#previewHost .ing-doc', (e) => e.textContent);
  if (/K8s Ingress/i.test(ingText)) pass('k8s-ingress: badge shown'); else fail('k8s-ingress badge: ' + ingText.slice(0, 200));
  if (/webapp-ingress/i.test(ingText)) pass('k8s-ingress: name shown'); else fail('k8s-ingress name: ' + ingText.slice(0, 200));
  if (/nginx/i.test(ingText)) pass('k8s-ingress: ingress class shown'); else fail('k8s-ingress class: ' + ingText.slice(0, 200));
  if (/app\.example\.com|api\.example\.com/i.test(ingText)) pass('k8s-ingress: hosts shown'); else fail('k8s-ingress hosts: ' + ingText.slice(0, 300));
  if (/frontend-svc|api-svc/i.test(ingText)) pass('k8s-ingress: backend services shown'); else fail('k8s-ingress services: ' + ingText.slice(0, 300));

  // ── Flutter pubspec viewer ──
  await openExample('Flutter pubspec.yaml (demo)');
  await page.waitForSelector('#previewHost .pubspec-doc, #previewHost [class*="pubspec"]', { timeout: 12000 });
  const psText = await page.$eval('#previewHost', (e) => e.textContent);
  if (/Flutter|Dart/i.test(psText)) pass('pubspec: badge shown'); else fail('pubspec badge: ' + psText.slice(0, 200));
  if (/my.flutter.app|1\.2\.0/i.test(psText)) pass('pubspec: name/version shown'); else fail('pubspec name: ' + psText.slice(0, 200));

  // ── pubspec.yaml known-file plugin ──
  await openExample('pubspec.yaml');
  await page.waitForSelector('.pubspec-doc', { timeout: 12000 });
  pass('pubspec.yaml: renders');
  const pubspecText = await page.$eval('.pubspec-doc', el => el.textContent);
  if (!pubspecText.includes('Dart') && !pubspecText.includes('Flutter')) fail('pubspec.yaml: missing badge'); else pass('pubspec.yaml: badge shown');
  if (!pubspecText.includes('flutter') && !pubspecText.includes('provider')) fail('pubspec.yaml: no deps shown'); else pass('pubspec.yaml: deps shown');

  // ── pubspec.lock known-file plugin ──
  await openExample('pubspec.lock (demo)');
  await page.waitForSelector('.pubspeclock-doc', { timeout: 12000 });
  pass('pubspec.lock: renders');
  const lockText = await page.$eval('.pubspeclock-doc', el => el.textContent);
  if (!lockText.includes('pubspec') && !lockText.includes('lock')) fail('pubspec.lock: missing badge'); else pass('pubspec.lock: badge shown');
  if (!lockText.includes('package') && !lockText.includes('flutter')) fail('pubspec.lock: no packages shown'); else pass('pubspec.lock: packages shown');

  // ── Netlify config viewer ──
  await openExample('Netlify config (netlify.toml demo)');
  await page.waitForSelector('.netlifytoml-doc', { timeout: 12000 });
  pass('netlify.toml: renders');
  const ntlText = await page.$eval('.netlifytoml-doc', el => el.textContent);
  if (!ntlText.includes('Netlify')) fail('netlify.toml: missing badge');
  else pass('netlify.toml: badge shown');
  if (/npm run build|dist/i.test(ntlText)) pass('netlify.toml: build command shown'); else fail('netlify build: ' + ntlText.slice(0, 200));

  // ── Vercel config viewer ──
  await openExample('Vercel config (vercel.json demo)');
  await page.waitForSelector('.verceljson-doc', { timeout: 12000 });
  pass('vercel.json: renders');
  const vclText = await page.$eval('.verceljson-doc', (e) => e.textContent);
  if (/Vercel/i.test(vclText)) pass('vercel.json: badge shown'); else fail('vercel badge: ' + vclText.slice(0, 200));
  if (/nextjs|Next\.js/i.test(vclText)) pass('vercel.json: framework shown'); else fail('vercel framework: ' + vclText.slice(0, 200));

  // ── pyproject.toml viewer ──
  await openExample('pyproject.toml');
  await page.waitForSelector('#previewHost .pyproject-doc', { timeout: 12000 });
  pass('pyproject.toml: renders');
  const ppyText = await page.$eval('#previewHost .pyproject-doc', (e) => e.textContent);
  if (/Python/i.test(ppyText)) pass('pyproject.toml: badge shown'); else fail('pyproject badge: ' + ppyText.slice(0, 200));
  if (/my-library|hatchling|ruff|pytest/i.test(ppyText)) pass('pyproject.toml: content shown'); else fail('pyproject content: ' + ppyText.slice(0, 200));
  if (!ppyText.includes('Python') && !ppyText.includes('pyproject')) fail('pyproject.toml: missing badge'); else pass('pyproject.toml: badge shown (spec)');
  if (!ppyText.includes('name') && !ppyText.includes('version')) fail('pyproject.toml: no project info'); else pass('pyproject.toml: project info shown');

  // ── .npmrc viewer ──
  await openExample('.npmrc');
  await page.waitForSelector('#previewHost .npmrc-doc', { timeout: 12000 });
  const npmrcText = await page.$eval('#previewHost .npmrc-doc', (e) => e.textContent);
  if (/npm/i.test(npmrcText)) pass('.npmrc: badge shown'); else fail('npmrc badge: ' + npmrcText.slice(0, 200));
  if (/registry\.npmjs\.org/i.test(npmrcText)) pass('.npmrc: registry URL shown'); else fail('npmrc registry: ' + npmrcText.slice(0, 200));
  if (!/secrettoken|publictoken|exampletoken|NexusToken/i.test(npmrcText)) pass('.npmrc: auth tokens masked as [configured]'); else fail('npmrc tokens not redacted: ' + npmrcText.slice(0, 300));

  // ── renovate.json viewer ──
  await openExample('renovate.json');
  await page.waitForSelector('#previewHost .renovate-doc', { timeout: 12000 });
  const rnvText = await page.$eval('#previewHost .renovate-doc', (e) => e.textContent);
  if (/Renovate/i.test(rnvText)) pass('renovate.json: badge shown'); else fail('renovate badge: ' + rnvText.slice(0, 200));
  if (rnvText.includes('config:recommended')) pass('renovate.json: extends shown'); else fail('renovate.json: extends not shown: ' + rnvText.slice(0, 200));
  if (rnvText.includes('devDependencies')) pass('renovate.json: package rules shown'); else fail('renovate.json: package rules not shown: ' + rnvText.slice(0, 200));

  // ── .prettierrc.json viewer ──
  await openExample('.prettierrc.json');
  await page.waitForSelector('#previewHost .prettier-doc', { timeout: 12000 });
  pass('.prettierrc.json: badge shown');
  const prtText = await page.$eval('#previewHost .prettier-doc', (e) => e.textContent);
  if (!prtText.includes('100')) fail('.prettierrc.json: printWidth not shown');
  else pass('.prettierrc.json: printWidth shown');
  if (!prtText.includes('Trailing comma') && !prtText.includes('trailingComma') && !prtText.includes('es5') && !prtText.includes('all')) fail('.prettierrc.json: trailing comma not shown');
  else pass('.prettierrc.json: trailing comma shown');

  // ── turbo.json viewer ──
  await openExample('turbo.json');
  await page.waitForSelector('#previewHost .turbojson-doc', { timeout: 12000 });
  pass('turbo.json: renders');
  const turboText = await page.$eval('#previewHost .turbojson-doc', (e) => e.textContent);
  if (!turboText.includes('Turborepo') && !turboText.includes('turbo')) fail('turbo.json: missing badge'); else pass('turbo.json: badge shown');
  if (!turboText.includes('build') && !turboText.includes('pipeline')) fail('turbo.json: no pipeline shown'); else pass('turbo.json: pipeline shown');

  // ── dependabot.yml viewer ──
  await openExample('dependabot.yml');
  await page.waitForSelector('#previewHost .dbt-doc', { timeout: 12000 });
  const dbtText = await page.$eval('#previewHost .dbt-doc', (e) => e.textContent);
  if (/Dependabot/i.test(dbtText)) pass('dependabot.yml: badge shown'); else fail('dependabot badge: ' + dbtText.slice(0, 200));

  // ── .eslintrc.json viewer ──
  await openExample('.eslintrc.json');
  await page.waitForSelector('#previewHost .eslint-doc', { timeout: 12000 });
  pass('.eslintrc.json: badge shown');
  const eslText = await page.$eval('#previewHost .eslint-doc', (e) => e.textContent);
  if (!eslText.includes('typescript-eslint')) fail('.eslintrc.json: extends not shown');
  else pass('.eslintrc.json: extends shown');
  if (!eslText.includes('no-console')) fail('.eslintrc.json: rules not shown');
  else pass('.eslintrc.json: rules shown');

  // ── Earthfile viewer ──
  await openExample('Earthfile');
  await page.waitForSelector('#previewHost .earthfile-doc', { timeout: 12000 });
  pass('Earthfile: badge shown');
  const efText = await page.$eval('#previewHost .earthfile-doc', el => el.textContent);
  if (!efText.includes('build') && !efText.includes('test')) fail('Earthfile: targets not shown');
  else pass('Earthfile: targets shown');
  if (!efText.includes('docker')) fail('Earthfile: docker target not shown');
  else pass('Earthfile: docker target shown');

  // ── jest.config.json viewer ──
  await openExample('jest.config.json');
  await page.waitForSelector('#previewHost .jest-doc', { timeout: 12000 });
  const jestText = await page.$eval('#previewHost .jest-doc', (e) => e.textContent);
  if (/Jest/i.test(jestText)) pass('jest.config.json: badge shown'); else fail('jest badge: ' + jestText.slice(0, 200));
  if (/jsdom|coverage/i.test(jestText)) pass('jest.config.json: env and coverage shown'); else fail('jest content: ' + jestText.slice(0, 200));

  // ── .stylelintrc.json viewer ──
  await openExample('.stylelintrc.json');
  await page.waitForSelector('#previewHost .stylelint-doc', { timeout: 12000 });
  pass('.stylelintrc.json: badge shown');
  const stlText = await page.$eval('#previewHost .stylelint-doc', (e) => e.textContent);
  if (!stlText.includes('stylelint-config-standard')) fail('.stylelintrc.json: extends not shown');
  else pass('.stylelintrc.json: extends shown');
  if (!stlText.includes('scss')) fail('.stylelintrc.json: SCSS plugin not shown');
  else pass('.stylelintrc.json: SCSS plugin shown');

  // ── babel.config.json viewer ──
  await openExample('babel.config.json');
  await page.waitForSelector('#previewHost .babelcfg-doc', { timeout: 12000 });
  const bblText = await page.$eval('#previewHost .babelcfg-doc', (e) => e.textContent);
  if (/Babel/i.test(bblText)) pass('babel.config.json: badge shown'); else fail('babel badge: ' + bblText.slice(0, 200));
  if (/@babel\/preset-env|@babel\/preset-react/i.test(bblText)) pass('babel.config.json: presets shown'); else fail('babel presets: ' + bblText.slice(0, 200));

  // ── .commitlintrc.json viewer ──
  await openExample('.commitlintrc.json');
  await page.waitForSelector('#previewHost .cml-doc', { timeout: 12000 });
  const cmlText = await page.$eval('#previewHost .cml-doc', (e) => e.textContent);
  if (/commitlint/i.test(cmlText)) pass('.commitlintrc.json: badge shown'); else fail('commitlint badge: ' + cmlText.slice(0, 200));
  if (/type-enum|header-max-length/i.test(cmlText)) pass('.commitlintrc.json: rules shown'); else fail('commitlint rules: ' + cmlText.slice(0, 200));

  // ── lefthook.yml viewer ──
  await openExample('lefthook.yml');
  await page.waitForSelector('#previewHost .lfh-doc', { timeout: 12000 });
  const lfhText = await page.$eval('#previewHost .lfh-doc', (e) => e.textContent);
  if (/Lefthook/i.test(lfhText)) pass('lefthook.yml: badge shown'); else fail('lefthook badge: ' + lfhText.slice(0, 200));
  if (/pre-commit|commit-msg|pre-push/i.test(lfhText)) pass('lefthook.yml: hook stages shown'); else fail('lefthook hooks: ' + lfhText.slice(0, 200));
}
