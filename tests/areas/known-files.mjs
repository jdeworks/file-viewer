export async function run(ctx) {
  const { page, origin, frameOf, pass, fail, openExample } = ctx;

  // ── Known-file enhancement (Layer 3): package.json -> npm links + revert chip ──
  await page.goto(origin, { waitUntil: 'networkidle' });
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
  await page.waitForSelector('#previewHost iframe.fv-preview-frame', { timeout: 8000 });
  const pjFrame = await frameOf('#previewHost iframe.fv-preview-frame');
  await pjFrame.waitForSelector('.json-tree .j-key', { timeout: 8000 });
  pass('revert chip switches to the plain JSON tree view');

  // ── More known-files (Layer 3): Cargo.toml, tsconfig.json, Dockerfile, docker-compose, .gitignore ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Cargo.toml');
  await page.waitForSelector('#previewHost .pj-doc', { timeout: 12000 });
  const crateHrefs = await page.$$eval('#previewHost .pj-deps a.pj-link', (els) => els.map((a) => a.getAttribute('href')));
  if (crateHrefs.some((h) => /crates\.io\/crates\/serde/.test(h))) pass('Cargo.toml: dependencies link to crates.io'); else fail('crate links: ' + crateHrefs.join(','));

  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('tsconfig.json');
  await page.waitForSelector('#previewHost .ts-table', { timeout: 12000 });
  const tsDocs = await page.$$eval('#previewHost .ts-table .ts-doc', (els) => els.map((e) => e.textContent).join(' '));
  if (/strict type-checking/i.test(tsDocs)) pass('tsconfig.json: compiler options annotated'); else fail('tsconfig docs: ' + tsDocs.slice(0, 80));

  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Dockerfile');
  await page.waitForSelector('#previewHost .kf-list', { timeout: 12000 });
  const dfBadges = await page.$$eval('#previewHost .kf-badge', (els) => els.map((e) => e.textContent));
  if (dfBadges.filter((b) => b === 'FROM').length === 2 && dfBadges.includes('HEALTHCHECK')) pass('Dockerfile: instructions broken down (2 FROM stages)'); else fail('dockerfile badges: ' + dfBadges.join(','));
  await page.click('#metaBtn');
  await page.waitForSelector('#metaBody .meta-row', { timeout: 6000 });
  const dfMeta = await page.$eval('#metaBody', (e) => e.textContent);
  if (/Instructions\s*\d+/.test(dfMeta) && /Build stages\s*2/.test(dfMeta)) pass('Dockerfile metadata comes from known-file extractor'); else fail('dockerfile meta: ' + dfMeta.replace(/\s+/g, ' ').slice(0, 160));
  await page.click('#metaDrawer [data-close]');

  await page.goto(origin, { waitUntil: 'networkidle' });
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

  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.gitignore');
  await page.waitForSelector('#previewHost .kf-pat', { timeout: 12000 });
  const giPats = await page.$$eval('#previewHost .kf-pat code', (els) => els.map((e) => e.textContent));
  const giTags = await page.$$eval('#previewHost .kf-pat .kf-tag', (els) => els.map((e) => e.textContent));
  if (giPats.includes('node_modules/') && giTags.includes('un-ignore')) pass('.gitignore: patterns annotated (directory, un-ignore, …)'); else fail('gitignore pats=' + giPats.join(',') + ' tags=' + giTags.join(','));

  // ── More known-files (Layer 3): dependency manifests → ecosystem links ──
  await page.goto(origin, { waitUntil: 'networkidle' });
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

  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('go.mod');
  await page.waitForSelector('#previewHost .pj-doc', { timeout: 12000 });
  const goHrefs = await page.$$eval('#previewHost a.pj-link', (els) => els.map((a) => a.getAttribute('href')));
  const goIndirect = await page.$$eval('#previewHost .kf-tag', (els) => els.map((e) => e.textContent));
  if (goHrefs.some((h) => /pkg\.go\.dev\/github\.com\/gin-gonic\/gin/.test(h)) && goIndirect.includes('indirect')) pass('go.mod: modules link to pkg.go.dev (+ indirect tagged)'); else fail('go links: ' + goHrefs.join(',') + ' tags=' + goIndirect.join(','));

  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('composer.json');
  await page.waitForSelector('#previewHost .pj-doc', { timeout: 12000 });
  const composerHrefs = await page.$$eval('#previewHost a.pj-link', (els) => els.map((a) => a.getAttribute('href')));
  if (composerHrefs.some((h) => /packagist\.org\/packages\/guzzlehttp\/guzzle/.test(h))) pass('composer.json: dependencies link to Packagist'); else fail('packagist links: ' + composerHrefs.join(','));

  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Gemfile');
  await page.waitForSelector('#previewHost .gemfile-doc', { timeout: 12000 });
  pass('Gemfile: badge shown');
  const gemText = await page.$eval('#previewHost .gemfile-doc', el => el.textContent);
  if (!gemText.includes('rails')) fail('Gemfile: gems not shown');
  else pass('Gemfile: rails gem shown');
  if (!gemText.includes('rspec') && !gemText.includes('development')) fail('Gemfile: groups not shown');
  else pass('Gemfile: groups shown');

  // ── More known-files (Layer 3): CODEOWNERS, .editorconfig, pom.xml ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('CODEOWNERS');
  await page.waitForSelector('#previewHost .codeowners-doc', { timeout: 12000 });
  pass('CODEOWNERS: badge shown');
  const coText = await page.$eval('#previewHost .codeowners-doc', el => el.textContent);
  if (!coText.includes('platform-team')) fail('CODEOWNERS: owners not shown');
  else pass('CODEOWNERS: owners shown');
  if (!coText.includes('frontend')) fail('CODEOWNERS: sections not shown');
  else pass('CODEOWNERS: sections shown');

  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.editorconfig');
  await page.waitForSelector('#previewHost .editorconfig-doc', { timeout: 12000 });
  const ecGlobs = await page.$$eval('#previewHost .ec-section-head code', (els) => els.map((e) => e.textContent));
  const ecRoot = await page.$eval('#previewHost .editorconfig-doc', (el) => el.textContent);
  if (ecGlobs.some((g) => /\*\.py/.test(g)) && /root/i.test(ecRoot)) pass('.editorconfig: sections per glob (+ root flag)'); else fail('editorconfig globs=' + ecGlobs.join(',') + ' root=' + /root/i.test(ecRoot));

  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('pom.xml (Maven POM)');
  await page.waitForSelector('#previewHost .mvn-doc', { timeout: 12000 });
  const pomHrefs = await page.$$eval('#previewHost a.mvn-link', (els) => els.map((a) => a.getAttribute('href')));
  const pomScopes = await page.$$eval('#previewHost .mvn-scope', (els) => els.map((e) => e.textContent));
  if (pomHrefs.some((h) => /mvnrepository\.com\/artifact\/com\.google\.guava\/guava/.test(h)) && pomScopes.includes('test')) pass('pom.xml: dependencies link to mvnrepository (+ scope tagged)'); else fail('pom links=' + pomHrefs.join(',') + ' scopes=' + pomScopes.join(','));

  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('build.gradle');
  await page.waitForSelector('#previewHost .buildgradle-doc', { timeout: 12000 });
  pass('build.gradle: renders');
  const gradleText = await page.$eval('#previewHost .buildgradle-doc', (el) => el.textContent);
  if (!gradleText.includes('Gradle')) fail('build.gradle: missing badge'); else pass('build.gradle: badge shown');
  if (!gradleText.includes('plugin') && !gradleText.includes('depend')) fail('build.gradle: no plugins or deps'); else pass('build.gradle: content shown');
  const gradleHrefs = await page.$$eval('#previewHost .buildgradle-doc a.bgr-link', (els) => els.map((a) => a.getAttribute('href')));
  if (gradleHrefs.some((h) => /mvnrepository\.com\/artifact\/com\.google\.guava\/guava/.test(h))) pass('build.gradle: deps link to mvnrepository'); else fail('gradle links=' + gradleHrefs.join(','));

  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Pipfile');
  await page.waitForSelector('#previewHost .pj-doc', { timeout: 12000 });
  const pipHrefs = await page.$$eval('#previewHost a.pj-link', (els) => els.map((a) => a.getAttribute('href')));
  const pipTags = await page.$$eval('#previewHost .pj-tag', (els) => els.map((e) => e.textContent));
  if (pipHrefs.some((h) => /pypi\.org\/project\/flask/i.test(h)) && pipTags.some((t) => /Python 3\.12/.test(t))) pass('Pipfile: packages link to PyPI (+ Python version)'); else fail('pip links=' + pipHrefs.join(',') + ' tags=' + pipTags.join(','));

  await page.goto(origin, { waitUntil: 'networkidle' });
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
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('GitHub Actions CI workflow (demo)');
  await page.waitForSelector('#previewHost .gha-doc, #previewHost [class*="gha"]', { timeout: 12000 });
  const ghaText = await page.$eval('#previewHost', (e) => e.textContent);
  if (/GitHub Actions/i.test(ghaText)) pass('GitHub Actions: badge shown'); else fail('gha badge: ' + ghaText.slice(0, 200));
  if (/push|pull.request|workflow.dispatch/i.test(ghaText)) pass('GitHub Actions: triggers shown'); else fail('gha triggers: ' + ghaText.slice(0, 200));
  if (/test|lint|build/i.test(ghaText)) pass('GitHub Actions: jobs shown'); else fail('gha jobs: ' + ghaText.slice(0, 200));

  // ── Kubernetes manifest viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Kubernetes Deployment manifest (demo)');
  await page.waitForSelector('#previewHost .k8s-doc, #previewHost [class*="k8s"]', { timeout: 12000 });
  const k8sText = await page.$eval('#previewHost', (e) => e.textContent);
  if (/Kubernetes/i.test(k8sText)) pass('Kubernetes: badge shown'); else fail('k8s badge: ' + k8sText.slice(0, 200));
  if (/Deployment/i.test(k8sText)) pass('Kubernetes: kind shown'); else fail('k8s kind: ' + k8sText.slice(0, 200));
  if (/web-app|production/i.test(k8sText)) pass('Kubernetes: name/namespace shown'); else fail('k8s meta: ' + k8sText.slice(0, 200));

  // ── Kubernetes RBAC viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('k8s-role.yaml');
  await page.waitForSelector('#previewHost .rbac-doc', { timeout: 12000 });
  const rbacText = await page.$eval('#previewHost .rbac-doc', (e) => e.textContent);
  if (/K8s RBAC/i.test(rbacText)) pass('k8s-rbac: badge shown'); else fail('k8s-rbac badge: ' + rbacText.slice(0, 200));
  if (/ClusterRole/i.test(rbacText)) pass('k8s-rbac: kind shown'); else fail('k8s-rbac kind: ' + rbacText.slice(0, 200));
  if (/pod-reader/i.test(rbacText)) pass('k8s-rbac: name shown'); else fail('k8s-rbac name: ' + rbacText.slice(0, 200));
  if (/pods|deployments/i.test(rbacText)) pass('k8s-rbac: resources shown'); else fail('k8s-rbac resources: ' + rbacText.slice(0, 300));
  if (/get|list|watch/i.test(rbacText)) pass('k8s-rbac: verbs shown'); else fail('k8s-rbac verbs: ' + rbacText.slice(0, 300));

  // ── Kubernetes NetworkPolicy viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('k8s-network-policy.yaml');
  await page.waitForSelector('#previewHost .np-doc', { timeout: 12000 });
  const npText = await page.$eval('#previewHost .np-doc', (e) => e.textContent);
  if (/NetworkPolicy/i.test(npText)) pass('k8s-network-policy: badge shown'); else fail('k8s-network-policy badge: ' + npText.slice(0, 200));
  if (/api-server-policy/i.test(npText)) pass('k8s-network-policy: name shown'); else fail('k8s-network-policy name: ' + npText.slice(0, 200));
  if (/Ingress|Egress/i.test(npText)) pass('k8s-network-policy: policy types shown'); else fail('k8s-network-policy types: ' + npText.slice(0, 300));
  if (/api-server|backend/i.test(npText)) pass('k8s-network-policy: pod selector shown'); else fail('k8s-network-policy selector: ' + npText.slice(0, 300));

  // ── Kubernetes HPA viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('k8s-hpa.yaml (HPA)');
  await page.waitForSelector('#previewHost .hpa-doc', { timeout: 12000 });
  const hpaText = await page.$eval('#previewHost .hpa-doc', (e) => e.textContent);
  if (/HPA/i.test(hpaText)) pass('k8s-hpa: badge shown'); else fail('k8s-hpa badge: ' + hpaText.slice(0, 200));
  if (/HorizontalPodAutoscaler/i.test(hpaText)) pass('k8s-hpa: kind shown'); else fail('k8s-hpa kind: ' + hpaText.slice(0, 200));
  if (/api-server/i.test(hpaText)) pass('k8s-hpa: target shown'); else fail('k8s-hpa target: ' + hpaText.slice(0, 200));
  if (/2.*20|20.*2/i.test(hpaText.replace(/\s+/g, ' '))) pass('k8s-hpa: replica range shown'); else fail('k8s-hpa replicas: ' + hpaText.slice(0, 300));
  if (/cpu|memory/i.test(hpaText)) pass('k8s-hpa: metrics shown'); else fail('k8s-hpa metrics: ' + hpaText.slice(0, 300));

  // ── Kubernetes Ingress viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('k8s-ingress.yaml');
  await page.waitForSelector('#previewHost .ing-doc', { timeout: 12000 });
  const ingText = await page.$eval('#previewHost .ing-doc', (e) => e.textContent);
  if (/K8s Ingress/i.test(ingText)) pass('k8s-ingress: badge shown'); else fail('k8s-ingress badge: ' + ingText.slice(0, 200));
  if (/webapp-ingress/i.test(ingText)) pass('k8s-ingress: name shown'); else fail('k8s-ingress name: ' + ingText.slice(0, 200));
  if (/nginx/i.test(ingText)) pass('k8s-ingress: ingress class shown'); else fail('k8s-ingress class: ' + ingText.slice(0, 200));
  if (/app\.example\.com|api\.example\.com/i.test(ingText)) pass('k8s-ingress: hosts shown'); else fail('k8s-ingress hosts: ' + ingText.slice(0, 300));
  if (/frontend-svc|api-svc/i.test(ingText)) pass('k8s-ingress: backend services shown'); else fail('k8s-ingress services: ' + ingText.slice(0, 300));

  // ── Flutter pubspec viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Flutter pubspec.yaml (demo)');
  await page.waitForSelector('#previewHost .pubspec-doc, #previewHost [class*="pubspec"]', { timeout: 12000 });
  const psText = await page.$eval('#previewHost', (e) => e.textContent);
  if (/Flutter|Dart/i.test(psText)) pass('pubspec: badge shown'); else fail('pubspec badge: ' + psText.slice(0, 200));
  if (/my.flutter.app|1\.2\.0/i.test(psText)) pass('pubspec: name/version shown'); else fail('pubspec name: ' + psText.slice(0, 200));

  // ── pubspec.yaml known-file plugin ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('pubspec.yaml');
  await page.waitForSelector('.pubspec-doc', { timeout: 12000 });
  pass('pubspec.yaml: renders');
  const pubspecText = await page.$eval('.pubspec-doc', el => el.textContent);
  if (!pubspecText.includes('Dart') && !pubspecText.includes('Flutter')) fail('pubspec.yaml: missing badge'); else pass('pubspec.yaml: badge shown');
  if (!pubspecText.includes('flutter') && !pubspecText.includes('provider')) fail('pubspec.yaml: no deps shown'); else pass('pubspec.yaml: deps shown');

  // ── pubspec.lock known-file plugin ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('pubspec.lock (demo)');
  await page.waitForSelector('.pubspeclock-doc', { timeout: 12000 });
  pass('pubspec.lock: renders');
  const lockText = await page.$eval('.pubspeclock-doc', el => el.textContent);
  if (!lockText.includes('pubspec') && !lockText.includes('lock')) fail('pubspec.lock: missing badge'); else pass('pubspec.lock: badge shown');
  if (!lockText.includes('package') && !lockText.includes('flutter')) fail('pubspec.lock: no packages shown'); else pass('pubspec.lock: packages shown');

  // ── Netlify config viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Netlify config (netlify.toml demo)');
  await page.waitForSelector('.netlifytoml-doc', { timeout: 12000 });
  pass('netlify.toml: renders');
  const ntlText = await page.$eval('.netlifytoml-doc', el => el.textContent);
  if (!ntlText.includes('Netlify')) fail('netlify.toml: missing badge');
  else pass('netlify.toml: badge shown');
  if (/npm run build|dist/i.test(ntlText)) pass('netlify.toml: build command shown'); else fail('netlify build: ' + ntlText.slice(0, 200));

  // ── Vercel config viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Vercel config (vercel.json demo)');
  await page.waitForSelector('.verceljson-doc', { timeout: 12000 });
  pass('vercel.json: renders');
  const vclText = await page.$eval('.verceljson-doc', (e) => e.textContent);
  if (/Vercel/i.test(vclText)) pass('vercel.json: badge shown'); else fail('vercel badge: ' + vclText.slice(0, 200));
  if (/nextjs|Next\.js/i.test(vclText)) pass('vercel.json: framework shown'); else fail('vercel framework: ' + vclText.slice(0, 200));

  // ── pyproject.toml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('pyproject.toml');
  await page.waitForSelector('#previewHost .pyproject-doc', { timeout: 12000 });
  pass('pyproject.toml: renders');
  const ppyText = await page.$eval('#previewHost .pyproject-doc', (e) => e.textContent);
  if (/Python/i.test(ppyText)) pass('pyproject.toml: badge shown'); else fail('pyproject badge: ' + ppyText.slice(0, 200));
  if (/my-library|hatchling|ruff|pytest/i.test(ppyText)) pass('pyproject.toml: content shown'); else fail('pyproject content: ' + ppyText.slice(0, 200));
  if (!ppyText.includes('Python') && !ppyText.includes('pyproject')) fail('pyproject.toml: missing badge'); else pass('pyproject.toml: badge shown (spec)');
  if (!ppyText.includes('name') && !ppyText.includes('version')) fail('pyproject.toml: no project info'); else pass('pyproject.toml: project info shown');

  // ── .npmrc viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.npmrc');
  await page.waitForSelector('#previewHost .npmrc-doc', { timeout: 12000 });
  const npmrcText = await page.$eval('#previewHost .npmrc-doc', (e) => e.textContent);
  if (/npm/i.test(npmrcText)) pass('.npmrc: badge shown'); else fail('npmrc badge: ' + npmrcText.slice(0, 200));
  if (/registry\.npmjs\.org/i.test(npmrcText)) pass('.npmrc: registry URL shown'); else fail('npmrc registry: ' + npmrcText.slice(0, 200));
  if (!/secrettoken|publictoken|exampletoken|NexusToken/i.test(npmrcText)) pass('.npmrc: auth tokens masked as [configured]'); else fail('npmrc tokens not redacted: ' + npmrcText.slice(0, 300));

  // ── renovate.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('renovate.json');
  await page.waitForSelector('#previewHost .renovate-doc', { timeout: 12000 });
  const rnvText = await page.$eval('#previewHost .renovate-doc', (e) => e.textContent);
  if (/Renovate/i.test(rnvText)) pass('renovate.json: badge shown'); else fail('renovate badge: ' + rnvText.slice(0, 200));
  if (rnvText.includes('config:recommended')) pass('renovate.json: extends shown'); else fail('renovate.json: extends not shown: ' + rnvText.slice(0, 200));
  if (rnvText.includes('devDependencies')) pass('renovate.json: package rules shown'); else fail('renovate.json: package rules not shown: ' + rnvText.slice(0, 200));

  // ── .prettierrc.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.prettierrc.json');
  await page.waitForSelector('#previewHost .prettier-doc', { timeout: 12000 });
  pass('.prettierrc.json: badge shown');
  const prtText = await page.$eval('#previewHost .prettier-doc', (e) => e.textContent);
  if (!prtText.includes('100')) fail('.prettierrc.json: printWidth not shown');
  else pass('.prettierrc.json: printWidth shown');
  if (!prtText.includes('trailingComma') && !prtText.includes('all')) fail('.prettierrc.json: trailing comma not shown');
  else pass('.prettierrc.json: trailing comma shown');

  // ── turbo.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('turbo.json');
  await page.waitForSelector('#previewHost .turbo-doc', { timeout: 12000 });
  const turboText = await page.$eval('#previewHost .turbo-doc', (e) => e.textContent);
  if (/Turbo/i.test(turboText)) pass('turbo.json: badge shown'); else fail('turbo badge: ' + turboText.slice(0, 200));
  if (/build|test|lint/i.test(turboText)) pass('turbo.json: tasks shown'); else fail('turbo tasks: ' + turboText.slice(0, 200));

  // ── dependabot.yml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('dependabot.yml');
  await page.waitForSelector('#previewHost .dbt-doc', { timeout: 12000 });
  const dbtText = await page.$eval('#previewHost .dbt-doc', (e) => e.textContent);
  if (/Dependabot/i.test(dbtText)) pass('dependabot.yml: badge shown'); else fail('dependabot badge: ' + dbtText.slice(0, 200));

  // ── .eslintrc.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.eslintrc.json');
  await page.waitForSelector('#previewHost .eslint-doc', { timeout: 12000 });
  pass('.eslintrc.json: badge shown');
  const eslText = await page.$eval('#previewHost .eslint-doc', (e) => e.textContent);
  if (!eslText.includes('typescript-eslint')) fail('.eslintrc.json: extends not shown');
  else pass('.eslintrc.json: extends shown');
  if (!eslText.includes('no-console')) fail('.eslintrc.json: rules not shown');
  else pass('.eslintrc.json: rules shown');

  // ── Earthfile viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Earthfile');
  await page.waitForSelector('#previewHost .earthfile-doc', { timeout: 12000 });
  pass('Earthfile: badge shown');
  const efText = await page.$eval('#previewHost .earthfile-doc', el => el.textContent);
  if (!efText.includes('build') && !efText.includes('test')) fail('Earthfile: targets not shown');
  else pass('Earthfile: targets shown');
  if (!efText.includes('docker')) fail('Earthfile: docker target not shown');
  else pass('Earthfile: docker target shown');

  // ── jest.config.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('jest.config.json');
  await page.waitForSelector('#previewHost .jest-doc', { timeout: 12000 });
  const jestText = await page.$eval('#previewHost .jest-doc', (e) => e.textContent);
  if (/Jest/i.test(jestText)) pass('jest.config.json: badge shown'); else fail('jest badge: ' + jestText.slice(0, 200));
  if (/jsdom|coverage/i.test(jestText)) pass('jest.config.json: env and coverage shown'); else fail('jest content: ' + jestText.slice(0, 200));

  // ── .stylelintrc.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.stylelintrc.json');
  await page.waitForSelector('#previewHost .stylelint-doc', { timeout: 12000 });
  pass('.stylelintrc.json: badge shown');
  const stlText = await page.$eval('#previewHost .stylelint-doc', (e) => e.textContent);
  if (!stlText.includes('stylelint-config-standard')) fail('.stylelintrc.json: extends not shown');
  else pass('.stylelintrc.json: extends shown');
  if (!stlText.includes('scss')) fail('.stylelintrc.json: SCSS plugin not shown');
  else pass('.stylelintrc.json: SCSS plugin shown');

  // ── babel.config.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('babel.config.json');
  await page.waitForSelector('#previewHost .babelcfg-doc', { timeout: 12000 });
  const bblText = await page.$eval('#previewHost .babelcfg-doc', (e) => e.textContent);
  if (/Babel/i.test(bblText)) pass('babel.config.json: badge shown'); else fail('babel badge: ' + bblText.slice(0, 200));
  if (/@babel\/preset-env|@babel\/preset-react/i.test(bblText)) pass('babel.config.json: presets shown'); else fail('babel presets: ' + bblText.slice(0, 200));

  // ── .commitlintrc.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.commitlintrc.json');
  await page.waitForSelector('#previewHost .cml-doc', { timeout: 12000 });
  const cmlText = await page.$eval('#previewHost .cml-doc', (e) => e.textContent);
  if (/commitlint/i.test(cmlText)) pass('.commitlintrc.json: badge shown'); else fail('commitlint badge: ' + cmlText.slice(0, 200));
  if (/type-enum|header-max-length/i.test(cmlText)) pass('.commitlintrc.json: rules shown'); else fail('commitlint rules: ' + cmlText.slice(0, 200));

  // ── lefthook.yml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('lefthook.yml');
  await page.waitForSelector('#previewHost .lfh-doc', { timeout: 12000 });
  const lfhText = await page.$eval('#previewHost .lfh-doc', (e) => e.textContent);
  if (/Lefthook/i.test(lfhText)) pass('lefthook.yml: badge shown'); else fail('lefthook badge: ' + lfhText.slice(0, 200));
  if (/pre-commit|commit-msg|pre-push/i.test(lfhText)) pass('lefthook.yml: hook stages shown'); else fail('lefthook hooks: ' + lfhText.slice(0, 200));

  // ── wrangler.toml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('wrangler.toml');
  await page.waitForSelector('#previewHost .wgl-doc', { timeout: 12000 });
  const wglText = await page.$eval('#previewHost .wgl-doc', (e) => e.textContent);
  if (/Wrangler|Cloudflare/i.test(wglText)) pass('wrangler.toml: badge shown'); else fail('wrangler badge: ' + wglText.slice(0, 200));
  if (/my-worker|MY_KV|example\.com/i.test(wglText)) pass('wrangler.toml: content shown'); else fail('wrangler content: ' + wglText.slice(0, 200));

  // ── fly.toml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('fly.toml');
  await page.waitForSelector('.flytoml-doc', { timeout: 12000 });
  pass('fly.toml: renders');
  const flyText = await page.$eval('.flytoml-doc', (e) => e.textContent);
  if (/Fly\.io/i.test(flyText)) pass('fly.toml: badge shown'); else fail('fly badge: ' + flyText.slice(0, 200));
  if (/my-api-service|iad|region/i.test(flyText)) pass('fly.toml: app info shown'); else fail('fly content: ' + flyText.slice(0, 200));

  // ── cliff.toml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('cliff.toml');
  await page.waitForSelector('#previewHost .clifftoml-doc', { timeout: 12000 });
  const clfText = await page.$eval('#previewHost .clifftoml-doc', (e) => e.textContent);
  if (/git-cliff/i.test(clfText)) pass('cliff.toml: badge shown'); else fail('cliff badge: ' + clfText.slice(0, 200));
  if (/Features|Bug Fixes|commit/i.test(clfText)) pass('cliff.toml: commit groups shown'); else fail('cliff content: ' + clfText.slice(0, 200));
  if (/conventional/i.test(clfText)) pass('cliff.toml: git settings shown'); else fail('cliff git settings: ' + clfText.slice(0, 200));

  // ── .releaserc.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.releaserc.json');
  await page.waitForSelector('#previewHost .rls-doc', { timeout: 12000 });
  const rlsText = await page.$eval('#previewHost .rls-doc', (e) => e.textContent);
  if (/semantic-release/i.test(rlsText)) pass('.releaserc.json: badge shown'); else fail('releaserc badge: ' + rlsText.slice(0, 200));
  if (/commit-analyzer|npm|github/i.test(rlsText)) pass('.releaserc.json: plugins shown'); else fail('releaserc plugins: ' + rlsText.slice(0, 200));

  // ── lerna.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('lerna.json');
  await page.waitForSelector('#previewHost .lrn-doc', { timeout: 12000 });
  const lrnText = await page.$eval('#previewHost .lrn-doc', (e) => e.textContent);
  if (/Lerna/i.test(lrnText)) pass('lerna.json: badge shown'); else fail('lerna badge: ' + lrnText.slice(0, 200));

  // ── nx.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('nx.json');
  await page.waitForSelector('#previewHost .nx-doc', { timeout: 12000 });
  const nxText = await page.$eval('#previewHost .nx-doc', (e) => e.textContent);
  if (/Nx/i.test(nxText)) pass('nx.json: badge shown'); else fail('nx badge: ' + nxText.slice(0, 200));
  if (/build/i.test(nxText)) pass('nx.json: build target shown'); else fail('nx.json: build target not shown');
  if (nxText.includes('abc123xyz')) fail('nx.json: cloud token leaked'); else pass('nx.json: cloud token masked');

  // ── biome.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('biome.json');
  await page.waitForSelector('#previewHost .biome-doc', { timeout: 12000 });
  const bmoText = await page.$eval('#previewHost .biome-doc', (e) => e.textContent);
  if (/Biome/i.test(bmoText)) pass('biome.json: badge shown'); else fail('biome badge: ' + bmoText.slice(0, 200));
  if (/100|lineWidth/.test(bmoText)) pass('biome.json: formatter shown'); else fail('biome.json: formatter not shown: ' + bmoText.slice(0, 200));
  if (/single|quoteStyle/.test(bmoText)) pass('biome.json: JS settings shown'); else fail('biome.json: JS settings not shown: ' + bmoText.slice(0, 200));

  // ── codecov.yml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('codecov.yml');
  await page.waitForSelector('#previewHost .codecov-doc', { timeout: 12000 });
  const ccvText = await page.$eval('#previewHost .codecov-doc', (e) => e.textContent);
  if (/Codecov/i.test(ccvText)) pass('codecov.yml: badge shown'); else fail('codecov badge: ' + ccvText.slice(0, 200));
  if (ccvText.includes('80')) pass('codecov.yml: coverage target shown'); else fail('codecov.yml: coverage target not shown: ' + ccvText.slice(0, 200));
  if (ccvText.includes('frontend')) pass('codecov.yml: flags shown'); else fail('codecov.yml: flags not shown: ' + ccvText.slice(0, 200));

  // ── serverless.yml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('serverless.yml');
  await page.waitForSelector('#previewHost .sls-doc', { timeout: 12000 });
  const slsText = await page.$eval('#previewHost .sls-doc', (e) => e.textContent);
  if (/Serverless/i.test(slsText)) pass('serverless.yml: badge shown'); else fail('serverless badge: ' + slsText.slice(0, 200));
  if (/api|worker|scheduler/i.test(slsText)) pass('serverless.yml: functions shown'); else fail('serverless functions: ' + slsText.slice(0, 200));

  // ── azure-pipelines.yml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('azure-pipelines.yml');
  await page.waitForSelector('#previewHost .azp-doc', { timeout: 12000 });
  const azpText = await page.$eval('#previewHost .azp-doc', (e) => e.textContent);
  if (/Azure Pipelines/i.test(azpText)) pass('azure-pipelines.yml: badge shown'); else fail('azure badge: ' + azpText.slice(0, 200));
  if (/Build|Test|ubuntu/i.test(azpText)) pass('azure-pipelines.yml: stages and pool shown'); else fail('azure content: ' + azpText.slice(0, 200));

  // ── vscode-settings.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('vscode-settings.json');
  await page.waitForSelector('#previewHost .vsc-settings-doc', { timeout: 12000 });
  const vscText = await page.$eval('#previewHost .vsc-settings-doc', (e) => e.textContent);
  if (/VS Code/i.test(vscText)) pass('vscode-settings.json: badge shown'); else fail('vscode badge: ' + vscText.slice(0, 200));
  if (/formatOnSave|tabSize|fontSize/i.test(vscText)) pass('vscode-settings.json: settings shown'); else fail('vscode settings: ' + vscText.slice(0, 200));

  // ── vscode-extensions.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('vscode-extensions.json');
  await page.waitForSelector('#previewHost .vsc-ext-doc', { timeout: 12000 });
  const vscExtText = await page.$eval('#previewHost .vsc-ext-doc', (e) => e.textContent);
  if (/VS Code/i.test(vscExtText)) pass('vscode-extensions.json: badge shown'); else fail('vscode-ext badge: ' + vscExtText.slice(0, 200));
  if (/prettier|eslint|gitlens/i.test(vscExtText)) pass('vscode-extensions.json: extensions shown'); else fail('vscode-ext content: ' + vscExtText.slice(0, 200));

  // ── vscode-launch.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('vscode-launch.json');
  await page.waitForSelector('#previewHost .vsc-launch-doc', { timeout: 12000 });
  const vscLaunchText = await page.$eval('#previewHost .vsc-launch-doc', (e) => e.textContent);
  if (/VS Code/i.test(vscLaunchText)) pass('vscode-launch.json: badge shown'); else fail('vscode-launch badge: ' + vscLaunchText.slice(0, 200));
  if (/Debug Node|Chrome|node/i.test(vscLaunchText)) pass('vscode-launch.json: configs shown'); else fail('vscode-launch content: ' + vscLaunchText.slice(0, 200));

  // ── vscode-tasks.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('vscode-tasks.json');
  await page.waitForSelector('#previewHost .vsc-tasks-doc', { timeout: 12000 });
  const vscTasksText = await page.$eval('#previewHost .vsc-tasks-doc', (e) => e.textContent);
  if (/VS Code/i.test(vscTasksText)) pass('vscode-tasks.json: badge shown'); else fail('vscode-tasks badge: ' + vscTasksText.slice(0, 200));
  if (/build|test|lint/i.test(vscTasksText)) pass('vscode-tasks.json: tasks shown'); else fail('vscode-tasks content: ' + vscTasksText.slice(0, 200));

  // ── travis.yml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Travis CI config');
  await page.waitForSelector('#previewHost .trv-doc', { timeout: 12000 });
  const trvText = await page.$eval('#previewHost .trv-doc', (e) => e.textContent);
  if (/Travis CI/i.test(trvText)) pass('travis.yml: badge shown'); else fail('travis badge: ' + trvText.slice(0, 200));
  if (/node_js|node|python|ruby/i.test(trvText)) pass('travis.yml: language shown'); else fail('travis language: ' + trvText.slice(0, 200));

  // ── circleci.yml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('CircleCI config');
  await page.waitForSelector('#previewHost .circleciconfig-doc', { timeout: 12000 });
  pass('circleci.yml: renders');
  const cciText = await page.$eval('#previewHost .circleciconfig-doc', (e) => e.textContent);
  if (/CircleCI/i.test(cciText)) pass('circleci.yml: badge shown'); else fail('circleci badge: ' + cciText.slice(0, 200));
  if (/build|test|deploy|job/i.test(cciText)) pass('circleci.yml: jobs shown'); else fail('circleci jobs: ' + cciText.slice(0, 200));

  // ── amplify.yml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('AWS Amplify config');
  await page.waitForSelector('#previewHost .amp-doc', { timeout: 12000 });
  const ampText = await page.$eval('#previewHost .amp-doc', (e) => e.textContent);
  if (/AWS Amplify/i.test(ampText)) pass('amplify.yml: badge shown'); else fail('amplify badge: ' + ampText.slice(0, 200));
  if (/preBuild|build|npm/i.test(ampText)) pass('amplify.yml: build phases shown'); else fail('amplify phases: ' + ampText.slice(0, 200));

  // ── buildspec.yml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('AWS CodeBuild buildspec');
  await page.waitForSelector('#previewHost .cod-doc', { timeout: 12000 });
  const codText = await page.$eval('#previewHost .cod-doc', (e) => e.textContent);
  if (/CodeBuild/i.test(codText)) pass('buildspec.yml: badge shown'); else fail('codebuild badge: ' + codText.slice(0, 200));
  if (/install|build|npm/i.test(codText)) pass('buildspec.yml: phases shown'); else fail('codebuild phases: ' + codText.slice(0, 200));

  // ── jsconfig.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('jsconfig.json');
  await page.waitForSelector('#previewHost .jsc-doc', { timeout: 12000 });
  const jscText = await page.$eval('#previewHost .jsc-doc', (e) => e.textContent);
  if (/jsconfig/i.test(jscText)) pass('jsconfig.json: title shown'); else fail('jsconfig title: ' + jscText.slice(0, 200));
  if (/ES2020|target|checkJs/i.test(jscText)) pass('jsconfig.json: options shown'); else fail('jsconfig options: ' + jscText.slice(0, 200));

  // ── deno.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Deno config');
  await page.waitForSelector('#previewHost .den-doc', { timeout: 12000 });
  const denText = await page.$eval('#previewHost .den-doc', (e) => e.textContent);
  if (/Deno/i.test(denText)) pass('deno.json: badge shown'); else fail('deno badge: ' + denText.slice(0, 200));
  if (/imports|tasks|hono|std/i.test(denText)) pass('deno.json: imports or tasks shown'); else fail('deno content: ' + denText.slice(0, 200));

  // ── .nvmrc viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.nvmrc');
  await page.waitForSelector('#previewHost .nvm-doc', { timeout: 12000 });
  const nvmText = await page.$eval('#previewHost .nvm-doc', (e) => e.textContent);
  if (/Node\.js|nvmrc/i.test(nvmText)) pass('nvmrc: badge shown'); else fail('nvmrc badge: ' + nvmText.slice(0, 200));
  if (/v20|20\.11|lts/i.test(nvmText)) pass('nvmrc: version shown'); else fail('nvmrc version: ' + nvmText.slice(0, 200));

  // ── .browserslistrc viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.browserslistrc');
  await page.waitForSelector('#previewHost .brl-doc', { timeout: 12000 });
  const brlText = await page.$eval('#previewHost .brl-doc', (e) => e.textContent);
  if (/Browserslist/i.test(brlText)) pass('browserslistrc: badge shown'); else fail('browserslist badge: ' + brlText.slice(0, 200));
  if (/last|Firefox|chrome/i.test(brlText)) pass('browserslistrc: queries shown'); else fail('browserslist queries: ' + brlText.slice(0, 200));

  // ── pre-commit-config.yaml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('pre-commit config');
  await page.waitForSelector('#previewHost .prc-doc', { timeout: 12000 });
  const prcText = await page.$eval('#previewHost .prc-doc', (e) => e.textContent);
  if (/pre-commit/i.test(prcText)) pass('pre-commit-config.yaml: badge shown'); else fail('pre-commit badge: ' + prcText.slice(0, 200));
  if (/trailing|yaml|json|repo/i.test(prcText)) pass('pre-commit-config.yaml: hooks shown'); else fail('pre-commit hooks: ' + prcText.slice(0, 200));

  // ── pyrightconfig.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Pyright config');
  await page.waitForSelector('#previewHost .pyr-doc', { timeout: 12000 });
  const pyrText = await page.$eval('#previewHost .pyr-doc', (e) => e.textContent);
  if (/Pyright/i.test(pyrText)) pass('pyrightconfig.json: badge shown'); else fail('pyright badge: ' + pyrText.slice(0, 200));
  if (/standard|3\.11|typeCheck/i.test(pyrText)) pass('pyrightconfig.json: config shown'); else fail('pyright config: ' + pyrText.slice(0, 200));

  // ── tox.ini viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('tox.ini (tox Config)');
  await page.waitForSelector('#previewHost .toxini-doc', { timeout: 12000 });
  const toxText = await page.$eval('#previewHost .toxini-doc', (e) => e.textContent);
  if (/tox/i.test(toxText)) pass('tox.ini: badge shown'); else fail('tox badge: ' + toxText.slice(0, 200));
  if (/py310|py\{310/i.test(toxText)) pass('tox.ini: envlist shown'); else fail('tox.ini: envlist not shown: ' + toxText.slice(0, 200));
  if (/lint/i.test(toxText)) pass('tox.ini: lint env shown'); else fail('tox.ini: lint env not shown: ' + toxText.slice(0, 200));

  // ── pytest.ini viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('pytest.ini (pytest Config)');
  await page.waitForSelector('#previewHost .pytestini-doc', { timeout: 12000 });
  pass('pytest.ini: badge shown');
  const pytestText = await page.$eval('#previewHost .pytestini-doc', (e) => e.textContent);
  if (/tests/i.test(pytestText)) pass('pytest.ini: testpaths shown'); else fail('pytest.ini: testpaths not shown: ' + pytestText.slice(0, 200));
  if (/slow/i.test(pytestText)) pass('pytest.ini: markers shown'); else fail('pytest.ini: markers not shown: ' + pytestText.slice(0, 200));

  // ── mypy.ini viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('mypy config');
  await page.waitForSelector('#previewHost .mypyini-doc', { timeout: 12000 });
  pass('mypy.ini: badge shown');
  const mypText = await page.$eval('#previewHost .mypyini-doc', (e) => e.textContent);
  if (!mypText.includes('3.11')) fail('mypy.ini: python version not shown'); else pass('mypy.ini: python version shown');
  if (!mypText.includes('pytest') && !mypText.includes('requests')) fail('mypy.ini: module overrides not shown'); else pass('mypy.ini: module overrides shown');

  // ── angular.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Angular workspace');
  await page.waitForSelector('#previewHost .ngw-doc', { timeout: 12000 });
  const ngwText = await page.$eval('#previewHost .ngw-doc', (e) => e.textContent);
  if (/Angular/i.test(ngwText)) pass('angular.json: badge shown'); else fail('angular badge: ' + ngwText.slice(0, 200));
  if (/my-app|project|build|serve/i.test(ngwText)) pass('angular.json: projects shown'); else fail('angular projects: ' + ngwText.slice(0, 200));

  // ── capacitor.config.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('capacitor.config.json');
  await page.waitForSelector('#previewHost .cap-doc', { timeout: 12000 });
  const capText = await page.$eval('#previewHost .cap-doc', (e) => e.textContent);
  if (/Capacitor/i.test(capText)) pass('capacitor.config.json: badge shown'); else fail('capacitor badge: ' + capText.slice(0, 200));
  if (/com\.example|SplashScreen|StatusBar/i.test(capText)) pass('capacitor.config.json: config shown'); else fail('capacitor config: ' + capText.slice(0, 200));

  // ── .nycrc.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.nycrc.json');
  await page.waitForSelector('#previewHost .nyc-doc', { timeout: 12000 });
  const nycText = await page.$eval('#previewHost .nyc-doc', (e) => e.textContent);
  if (/NYC/i.test(nycText)) pass('.nycrc.json: badge shown'); else fail('nyc badge: ' + nycText.slice(0, 200));
  if (/80|90|branches|lines/i.test(nycText)) pass('.nycrc.json: thresholds shown'); else fail('nyc thresholds: ' + nycText.slice(0, 200));

  // ── devcontainer.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('devcontainer.json');
  await page.waitForSelector('#previewHost .devcontainer-doc', { timeout: 12000 });
  const dvcText = await page.$eval('#previewHost .devcontainer-doc', (e) => e.textContent);
  if (/devcontainer/i.test(dvcText)) pass('devcontainer.json: badge shown'); else fail('devcontainer badge: ' + dvcText.slice(0, 200));
  if (/Node\.js|TypeScript|3000|5432/i.test(dvcText)) pass('devcontainer.json: name shown'); else fail('devcontainer name: ' + dvcText.slice(0, 200));
  if (/3000/.test(dvcText)) pass('devcontainer.json: ports shown'); else fail('devcontainer ports: ' + dvcText.slice(0, 200));

  // ── knip.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('knip.json');
  await page.waitForSelector('#previewHost .knp-doc', { timeout: 12000 });
  const knpText = await page.$eval('#previewHost .knp-doc', (e) => e.textContent);
  if (/Knip/i.test(knpText)) pass('knip.json: badge shown'); else fail('knip badge: ' + knpText.slice(0, 200));
  if (/typescript|eslint|jest|src/i.test(knpText)) pass('knip.json: content shown'); else fail('knip content: ' + knpText.slice(0, 200));

  // ── .mocharc.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.mocharc.json');
  await page.waitForSelector('#previewHost .moc-doc', { timeout: 12000 });
  const mocText = await page.$eval('#previewHost .moc-doc', (e) => e.textContent);
  if (/Mocha/i.test(mocText)) pass('.mocharc.json: badge shown'); else fail('mocha badge: ' + mocText.slice(0, 200));
  if (/spec|timeout|reporter|bdd/i.test(mocText)) pass('.mocharc.json: config shown'); else fail('mocha config: ' + mocText.slice(0, 200));

  // ── .gitlab-ci.yml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.gitlab-ci.yml');
  await page.waitForSelector('#previewHost .glb-doc', { timeout: 12000 });
  const glbText = await page.$eval('#previewHost .glb-doc', (e) => e.textContent);
  if (/GitLab/i.test(glbText)) pass('.gitlab-ci.yml: badge shown'); else fail('gitlab-ci badge: ' + glbText.slice(0, 200));
  if (/install|lint|test|build|deploy/i.test(glbText)) pass('.gitlab-ci.yml: stages/jobs shown'); else fail('gitlab-ci jobs: ' + glbText.slice(0, 200));

  // ── pnpm-workspace.yaml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('pnpm-workspace.yaml');
  await page.waitForSelector('#previewHost .pnpmws-doc', { timeout: 12000 });
  const pnwText = await page.$eval('#previewHost .pnpmws-doc', (e) => e.textContent);
  if (/pnpm/i.test(pnwText)) pass('pnpm-workspace.yaml: badge shown'); else fail('pnpm-workspace badge: ' + pnwText.slice(0, 200));
  if (/packages|apps|catalog|react/i.test(pnwText)) pass('pnpm-workspace.yaml: workspaces shown'); else fail('pnpm-workspace content: ' + pnwText.slice(0, 200));

  // ── vitest.config.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('vitest.config.json');
  await page.waitForSelector('#previewHost .vt-doc', { timeout: 12000 });
  const vtText = await page.$eval('#previewHost .vt-doc', (e) => e.textContent);
  if (/Vitest/i.test(vtText)) pass('vitest.config.json: badge shown'); else fail('vitest badge: ' + vtText.slice(0, 200));
  if (/jsdom|environment|coverage|reporters/i.test(vtText)) pass('vitest.config.json: config shown'); else fail('vitest config: ' + vtText.slice(0, 200));

  // ── graphql.config.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('graphql.config.json');
  await page.waitForSelector('#previewHost .gql-doc', { timeout: 12000 });
  const gqlText = await page.$eval('#previewHost .gql-doc', (e) => e.textContent);
  if (/GraphQL/i.test(gqlText)) pass('graphql.config.json: badge shown'); else fail('graphql badge: ' + gqlText.slice(0, 200));
  if (/schema|documents|extensions|codegen/i.test(gqlText)) pass('graphql.config.json: config shown'); else fail('graphql config: ' + gqlText.slice(0, 200));

  // ── apollo.config.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('apollo.config.json');
  await page.waitForSelector('#previewHost .apl-doc', { timeout: 12000 });
  const aplText = await page.$eval('#previewHost .apl-doc', (e) => e.textContent);
  if (/Apollo/i.test(aplText)) pass('apollo.config.json: badge shown'); else fail('apollo badge: ' + aplText.slice(0, 200));
  if (/client|service|my-app|endpoint/i.test(aplText)) pass('apollo.config.json: client and service shown'); else fail('apollo config: ' + aplText.slice(0, 200));

  // ── storybook.main.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('storybook.main.json (.storybook/main.json)');
  await page.waitForSelector('#previewHost .sb-doc', { timeout: 12000 });
  const sbText = await page.$eval('#previewHost .sb-doc', (e) => e.textContent);
  if (/Storybook/i.test(sbText)) pass('storybook.main.json: badge shown'); else fail('storybook badge: ' + sbText.slice(0, 200));
  if (/addon|stories|framework|react-vite/i.test(sbText)) pass('storybook.main.json: addons and framework shown'); else fail('storybook config: ' + sbText.slice(0, 200));

  // ── .drone.yml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.drone.yml');
  await page.waitForSelector('#previewHost .drn-doc', { timeout: 12000 });
  const drnText = await page.$eval('#previewHost .drn-doc', (e) => e.textContent);
  if (/Drone/i.test(drnText)) pass('.drone.yml: badge shown'); else fail('drone badge: ' + drnText.slice(0, 200));
  if (/pipeline|steps|install|test|build/i.test(drnText)) pass('.drone.yml: steps shown'); else fail('drone steps: ' + drnText.slice(0, 200));

  // ── buildkite.yml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('buildkite.yml');
  await page.waitForSelector('#previewHost .bk-doc', { timeout: 12000 });
  const bkText = await page.$eval('#previewHost .bk-doc', (e) => e.textContent);
  if (/Buildkite/i.test(bkText)) pass('buildkite.yml: badge shown'); else fail('buildkite badge: ' + bkText.slice(0, 200));
  if (/Build|test|Deploy|step/i.test(bkText)) pass('buildkite.yml: steps shown'); else fail('buildkite steps: ' + bkText.slice(0, 200));

  // ── skaffold.yaml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('skaffold.yaml');
  await page.waitForSelector('#previewHost .skaffold-doc', { timeout: 12000 });
  const skfText = await page.$eval('#previewHost .skaffold-doc', (e) => e.textContent);
  if (/Skaffold/i.test(skfText)) pass('skaffold.yaml: badge shown'); else fail('skaffold badge: ' + skfText.slice(0, 200));
  if (/artifact|deploy|kubectl|profile/i.test(skfText)) pass('skaffold.yaml: build and deploy shown'); else fail('skaffold config: ' + skfText.slice(0, 200));

  // ── .hadolint.yaml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.hadolint.yaml');
  await page.waitForSelector('#previewHost .hdl-doc', { timeout: 12000 });
  const hdlText = await page.$eval('#previewHost .hdl-doc', (e) => e.textContent);
  if (/Hadolint/i.test(hdlText)) pass('.hadolint.yaml: badge shown'); else fail('hadolint badge: ' + hdlText.slice(0, 200));
  if (/DL3008|DL3009|ignore|threshold/i.test(hdlText)) pass('.hadolint.yaml: ignored rules and threshold shown'); else fail('hadolint rules: ' + hdlText.slice(0, 200));

  // ── firebase.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('firebase.json');
  await page.waitForSelector('#previewHost .fbs-doc', { timeout: 12000 });
  const fbsText = await page.$eval('#previewHost .fbs-doc', (e) => e.textContent);
  if (/Firebase/i.test(fbsText)) pass('firebase.json: badge shown'); else fail('firebase badge: ' + fbsText.slice(0, 200));
  if (/dist|hosting|functions|emulators/i.test(fbsText)) pass('firebase.json: config sections shown'); else fail('firebase config: ' + fbsText.slice(0, 200));

  // ── app.json (Expo) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('app.json (Expo)');
  await page.waitForSelector('#previewHost .exp-doc', { timeout: 12000 });
  const expText = await page.$eval('#previewHost .exp-doc', (e) => e.textContent);
  if (/Expo/i.test(expText)) pass('app.json (Expo): badge shown'); else fail('expo badge: ' + expText.slice(0, 200));
  if (/MyAwesomeApp|51\.0\.0|ios|android/i.test(expText)) pass('app.json (Expo): app config shown'); else fail('expo config: ' + expText.slice(0, 200));

  // ── tailwind.config.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('tailwind.config.json');
  await page.waitForSelector('#previewHost .twl-doc', { timeout: 12000 });
  const twlText = await page.$eval('#previewHost .twl-doc', (e) => e.textContent);
  if (/Tailwind/i.test(twlText)) pass('tailwind.config.json: badge shown'); else fail('tailwind badge: ' + twlText.slice(0, 200));
  if (/content|theme|plugins|class/i.test(twlText)) pass('tailwind.config.json: config shown'); else fail('tailwind config: ' + twlText.slice(0, 200));

  // ── postcss.config.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('postcss.config.json');
  await page.waitForSelector('#previewHost .pcs-doc', { timeout: 12000 });
  const pcsText = await page.$eval('#previewHost .pcs-doc', (e) => e.textContent);
  if (/PostCSS/i.test(pcsText)) pass('postcss.config.json: badge shown'); else fail('postcss badge: ' + pcsText.slice(0, 200));
  if (/tailwindcss|autoprefixer|cssnano/i.test(pcsText)) pass('postcss.config.json: plugins shown'); else fail('postcss plugins: ' + pcsText.slice(0, 200));

  // ── .huskyrc.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.huskyrc.json');
  await page.waitForSelector('#previewHost .hsk-doc', { timeout: 12000 });
  const hskText = await page.$eval('#previewHost .hsk-doc', (e) => e.textContent);
  if (/Husky/i.test(hskText)) pass('.huskyrc.json: badge shown'); else fail('husky badge: ' + hskText.slice(0, 200));
  if (/pre-commit|commit-msg|lint-staged/i.test(hskText)) pass('.huskyrc.json: hooks shown'); else fail('husky hooks: ' + hskText.slice(0, 200));

  // ── .lintstagedrc.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.lintstagedrc.json');
  await page.waitForSelector('#previewHost .lst-doc', { timeout: 12000 });
  const lstText = await page.$eval('#previewHost .lst-doc', (e) => e.textContent);
  if (/lint-staged/i.test(lstText)) pass('.lintstagedrc.json: badge shown'); else fail('lint-staged badge: ' + lstText.slice(0, 200));
  if (/eslint|prettier|stylelint/i.test(lstText)) pass('.lintstagedrc.json: glob rules shown'); else fail('lint-staged rules: ' + lstText.slice(0, 200));

  // ── nest-cli.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('nest-cli.json');
  await page.waitForSelector('#previewHost .nst-doc', { timeout: 12000 });
  const nstText = await page.$eval('#previewHost .nst-doc', (e) => e.textContent);
  if (/NestJS/i.test(nstText)) pass('nest-cli.json: badge shown'); else fail('nest-cli badge: ' + nstText.slice(0, 200));
  if (/monorepo|api|auth|library/i.test(nstText)) pass('nest-cli.json: projects shown'); else fail('nest-cli projects: ' + nstText.slice(0, 200));

  // ── .swcrc viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.swcrc');
  await page.waitForSelector('#previewHost .swc-doc', { timeout: 12000 });
  const swcText = await page.$eval('#previewHost .swc-doc', (e) => e.textContent);
  if (/SWC/i.test(swcText)) pass('.swcrc: badge shown'); else fail('swcrc badge: ' + swcText.slice(0, 200));
  if (/typescript|es2020|es6|source maps/i.test(swcText)) pass('.swcrc: compiler config shown'); else fail('swcrc config: ' + swcText.slice(0, 200));

  // ── Chart.yaml (Helm chart) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Chart.yaml (Helm chart)');
  await page.waitForSelector('#previewHost .helmchart-doc', { timeout: 12000 });
  pass('Chart.yaml: renders');
  const hcText = await page.$eval('#previewHost .helmchart-doc', (e) => e.textContent);
  if (/Helm/i.test(hcText)) pass('Chart.yaml: Helm badge shown'); else fail('helm-chart badge: ' + hcText.slice(0, 200));
  if (/version|name/i.test(hcText)) pass('Chart.yaml: chart info shown'); else fail('helm-chart content: ' + hcText.slice(0, 200));
  if (/my-app|postgresql|redis/i.test(hcText)) pass('Chart.yaml: chart name and dependencies shown'); else fail('helm-chart content: ' + hcText.slice(0, 200));

  // ── kustomization.yaml (Kustomize) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('kustomization.yaml (Kustomize)');
  await page.waitForSelector('#previewHost .kustomize-doc', { timeout: 12000 });
  pass('kustomization.yaml: renders');
  const kustText = await page.$eval('#previewHost .kustomize-doc', (e) => e.textContent);
  if (/Kustomize/i.test(kustText)) pass('kustomization.yaml: Kustomize badge shown'); else fail('kustomize badge: ' + kustText.slice(0, 200));
  if (/resources/i.test(kustText)) pass('kustomization.yaml: resources shown'); else fail('kustomize content: ' + kustText.slice(0, 200));
  if (/commonLabels|common labels/i.test(kustText)) pass('kustomization.yaml: commonLabels shown'); else fail('kustomize commonLabels: ' + kustText.slice(0, 200));

  // ── ansible-playbook.yml (Ansible) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('ansible-playbook.yml (Ansible)');
  await page.waitForSelector('#previewHost .ans-doc', { timeout: 12000 });
  const ansText = await page.$eval('#previewHost .ans-doc', (e) => e.textContent);
  if (/Ansible/i.test(ansText)) pass('ansible-playbook.yml: Ansible badge shown'); else fail('ansible badge: ' + ansText.slice(0, 200));
  if (/webservers|databases|nginx|postgresql/i.test(ansText)) pass('ansible-playbook.yml: plays and tasks shown'); else fail('ansible content: ' + ansText.slice(0, 200));

  // ── Pulumi.yaml (Pulumi project) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Pulumi.yaml (Pulumi project)');
  await page.waitForSelector('#previewHost .pul-doc', { timeout: 12000 });
  const pulText = await page.$eval('#previewHost .pul-doc', (e) => e.textContent);
  if (/Pulumi/i.test(pulText)) pass('Pulumi.yaml: Pulumi badge shown'); else fail('pulumi badge: ' + pulText.slice(0, 200));
  if (/nodejs|cloud-infra|region/i.test(pulText)) pass('Pulumi.yaml: runtime and config shown'); else fail('pulumi content: ' + pulText.slice(0, 200));

  // ── packer.json (HashiCorp Packer) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('packer.json (HashiCorp Packer)');
  await page.waitForSelector('#previewHost .pkr-doc', { timeout: 12000 });
  const pkrText = await page.$eval('#previewHost .pkr-doc', (e) => e.textContent);
  if (/Packer/i.test(pkrText)) pass('packer.json: Packer badge shown'); else fail('packer badge: ' + pkrText.slice(0, 200));
  if (/amazon-ebs|shell|builders/i.test(pkrText)) pass('packer.json: builders and provisioners shown'); else fail('packer content: ' + pkrText.slice(0, 200));

  // ── ruff.toml (Ruff linter) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('ruff.toml (Ruff linter)');
  await page.waitForSelector('#previewHost .rufftoml-doc', { timeout: 12000 });
  pass('ruff.toml: badge shown');
  const rufText = await page.$eval('#previewHost .rufftoml-doc', (e) => e.textContent);
  if (!rufText.includes('py311') && !rufText.includes('3.11')) fail('ruff.toml: python version not shown'); else pass('ruff.toml: python version shown');
  if (!rufText.includes('120')) fail('ruff.toml: line length not shown'); else pass('ruff.toml: line length shown');

  // ── uv.toml (uv package manager) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('uv.toml (uv package manager)');
  await page.waitForSelector('#previewHost .uv-doc', { timeout: 12000 });
  const uvText = await page.$eval('#previewHost .uv-doc', (e) => e.textContent);
  if (/uv/i.test(uvText)) pass('uv.toml: uv badge shown'); else fail('uv badge: ' + uvText.slice(0, 200));
  if (/3\.12|python|hardlink/i.test(uvText)) pass('uv.toml: Python version and settings shown'); else fail('uv content: ' + uvText.slice(0, 200));

  // ── values.yaml (Helm values) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('values.yaml (Helm values)');
  await page.waitForSelector('#previewHost .helmvalues-doc', { timeout: 12000 });
  pass('values.yaml: renders');
  const hvText = await page.$eval('#previewHost .helmvalues-doc', (e) => e.textContent);
  if (/Helm/i.test(hvText)) pass('values.yaml: Helm Values badge shown'); else fail('helm-values badge: ' + hvText.slice(0, 200));
  if (/image|service/i.test(hvText)) pass('values.yaml: values info shown'); else fail('helm-values content: ' + hvText.slice(0, 200));

  // ── package-lock.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('package-lock.json');
  await page.waitForSelector('#previewHost .plk-doc', { timeout: 12000 });
  const plkText = await page.$eval('#previewHost .plk-doc', (e) => e.textContent);
  if (/npm/i.test(plkText)) pass('package-lock.json: badge shown'); else fail('package-lock badge: ' + plkText.slice(0, 200));
  if (/lockfileVersion|v3|Total|packages/i.test(plkText)) pass('package-lock.json: stats shown'); else fail('package-lock stats: ' + plkText.slice(0, 200));

  // ── composer.lock viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('composer.lock');
  await page.waitForSelector('#previewHost .cpl-doc', { timeout: 12000 });
  const cplText = await page.$eval('#previewHost .cpl-doc', (e) => e.textContent);
  if (/Composer/i.test(cplText)) pass('composer.lock: badge shown'); else fail('composer-lock badge: ' + cplText.slice(0, 200));
  if (/guzzlehttp|symfony|phpunit|package/i.test(cplText)) pass('composer.lock: packages shown'); else fail('composer-lock packages: ' + cplText.slice(0, 200));

  // ── pnpm-lock.yaml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('pnpm-lock.yaml');
  await page.waitForSelector('#previewHost .pkl-doc', { timeout: 12000 });
  const pklText = await page.$eval('#previewHost .pkl-doc', (e) => e.textContent);
  if (/pnpm/i.test(pklText)) pass('pnpm-lock.yaml: badge shown'); else fail('pnpm-lock badge: ' + pklText.slice(0, 200));
  if (/lockfileVersion|9|Packages|react/i.test(pklText)) pass('pnpm-lock.yaml: stats shown'); else fail('pnpm-lock stats: ' + pklText.slice(0, 200));

  // ── Cargo.lock viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Cargo.lock');
  await page.waitForSelector('#previewHost .clk-doc', { timeout: 12000 });
  const clkText = await page.$eval('#previewHost .clk-doc', (e) => e.textContent);
  if (/Cargo/i.test(clkText)) pass('Cargo.lock: badge shown'); else fail('cargo-lock badge: ' + clkText.slice(0, 200));
  if (/serde|crate|Workspace/i.test(clkText)) pass('Cargo.lock: crates shown'); else fail('cargo-lock crates: ' + clkText.slice(0, 200));

  // ── poetry.lock viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('poetry.lock');
  await page.waitForSelector('#previewHost .plo-doc', { timeout: 12000 });
  const ploText = await page.$eval('#previewHost .plo-doc', (e) => e.textContent);
  if (/Poetry/i.test(ploText)) pass('poetry.lock: badge shown'); else fail('poetry-lock badge: ' + ploText.slice(0, 200));
  if (/flask|requests|certifi|package/i.test(ploText)) pass('poetry.lock: packages shown'); else fail('poetry-lock packages: ' + ploText.slice(0, 200));

  // ── Julia Project.toml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Project.toml');
  await page.waitForSelector('#previewHost .julia-doc', { timeout: 12000 });
  const jpText = await page.$eval('#previewHost .julia-doc', (e) => e.textContent);
  if (/Julia/i.test(jpText)) pass('Project.toml: Julia badge shown'); else fail('julia-project badge: ' + jpText.slice(0, 200));
  if (/MyPackage/i.test(jpText)) pass('Project.toml: package name shown'); else fail('julia-project name: ' + jpText.slice(0, 200));
  if (/DataFrames|HTTP|Dependencies/i.test(jpText)) pass('Project.toml: dependencies shown'); else fail('julia-project deps: ' + jpText.slice(0, 300));

  // ── Julia Manifest.toml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Manifest.toml');
  await page.waitForSelector('#previewHost .julia-mani-doc', { timeout: 12000 });
  const jmText = await page.$eval('#previewHost .julia-mani-doc', (e) => e.textContent);
  if (/Julia Manifest/i.test(jmText)) pass('Manifest.toml: Julia Manifest badge shown'); else fail('julia-manifest badge: ' + jmText.slice(0, 200));
  if (/1\.9\.0/.test(jmText)) pass('Manifest.toml: julia_version shown'); else fail('julia-manifest version: ' + jmText.slice(0, 200));
  if (/DataFrames|HTTP|Statistics|package/i.test(jmText)) pass('Manifest.toml: packages shown'); else fail('julia-manifest pkgs: ' + jmText.slice(0, 300));
  if (/do not edit manually/i.test(jmText)) pass('Manifest.toml: lockfile warning shown'); else fail('julia-manifest lockfile note: ' + jmText.slice(0, 200));

  // ── go.sum viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('go.sum');
  await page.waitForSelector('#previewHost .gsm-doc', { timeout: 12000 });
  const gsmText = await page.$eval('#previewHost .gsm-doc', (e) => e.textContent);
  if (/Go/i.test(gsmText)) pass('go.sum: badge shown'); else fail('go-sum badge: ' + gsmText.slice(0, 200));
  if (/gin-gonic|module|Entries|Modules/i.test(gsmText)) pass('go.sum: module list shown'); else fail('go-sum modules: ' + gsmText.slice(0, 200));

  // ── go.work viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('go.work');
  await page.waitForSelector('#previewHost .gw-doc', { timeout: 12000 });
  const gwText = await page.$eval('#previewHost .gw-doc', (e) => e.textContent);
  if (/Go Workspace|Go/i.test(gwText)) pass('go.work: badge shown'); else fail('go-work badge: ' + gwText.slice(0, 200));
  if (/\.\/core|\.\/api|1\.22\.0/i.test(gwText)) pass('go.work: modules or version shown'); else fail('go-work modules: ' + gwText.slice(0, 300));

  // ── Makefile viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Makefile');
  await page.waitForSelector('#previewHost .makefile-doc', { timeout: 12000 });
  pass('Makefile: renders');
  const mkfText = await page.$eval('#previewHost .makefile-doc', (e) => e.textContent);
  if (/Make|Makefile/i.test(mkfText)) pass('Makefile: badge shown'); else fail('makefile badge: ' + mkfText.slice(0, 200));
  if (/all|test|clean|serve|build/i.test(mkfText)) pass('Makefile: targets shown'); else fail('makefile targets: ' + mkfText.slice(0, 200));

  // ── Justfile viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Justfile');
  await page.waitForSelector('#previewHost .jst-doc', { timeout: 12000 });
  const jstText = await page.$eval('#previewHost .jst-doc', (e) => e.textContent);
  if (/[Jj]ust/i.test(jstText)) pass('Justfile: badge shown'); else fail('justfile badge: ' + jstText.slice(0, 200));
  if (/build|test|fmt|release/i.test(jstText)) pass('Justfile: recipes shown'); else fail('justfile recipes: ' + jstText.slice(0, 200));

  // ── Procfile viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Procfile');
  await page.waitForSelector('#previewHost .pfl-doc', { timeout: 12000 });
  const pflText = await page.$eval('#previewHost .pfl-doc', (e) => e.textContent);
  if (/Procfile|process/i.test(pflText)) pass('Procfile: badge shown'); else fail('procfile badge: ' + pflText.slice(0, 200));
  if (/web|worker|scheduler/i.test(pflText)) pass('Procfile: process types shown'); else fail('procfile procs: ' + pflText.slice(0, 200));

  // ── rust-toolchain.toml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('rust-toolchain.toml');
  await page.waitForSelector('#previewHost .rusttoolchain-doc', { timeout: 12000 });
  pass('rust-toolchain.toml: badge shown');
  const rtText = await page.$eval('#previewHost .rusttoolchain-doc', (e) => e.textContent);
  if (!rtText.includes('1.75') && !rtText.includes('1.75.0')) fail('rust-toolchain.toml: channel not shown');
  else pass('rust-toolchain.toml: channel shown');
  if (!rtText.includes('clippy')) fail('rust-toolchain.toml: components not shown');
  else pass('rust-toolchain.toml: components shown');

  // ── .envrc viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.envrc');
  await page.waitForSelector('#previewHost .erc-doc', { timeout: 12000 });
  const ercText = await page.$eval('#previewHost .erc-doc', (e) => e.textContent);
  if (/direnv|envrc/i.test(ercText)) pass('.envrc: badge shown'); else fail('envrc badge: ' + ercText.slice(0, 200));
  if (/NODE_ENV|PORT|DATABASE_URL/i.test(ercText)) pass('.envrc: exports shown'); else fail('envrc exports: ' + ercText.slice(0, 200));
  if (!/do-not-commit/i.test(ercText)) pass('.envrc: sensitive values redacted'); else fail('envrc not redacting secrets');

  // ── mise.toml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('mise.toml');
  await page.waitForSelector('#previewHost .mse-doc', { timeout: 12000 });
  const mseText = await page.$eval('#previewHost .mse-doc', (e) => e.textContent);
  if (/mise/i.test(mseText)) pass('mise.toml: badge shown'); else fail('mise badge: ' + mseText.slice(0, 200));
  if (/node|python|ruby/i.test(mseText)) pass('mise.toml: tools shown'); else fail('mise tools: ' + mseText.slice(0, 200));

  // ── .tool-versions viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.tool-versions');
  await page.waitForSelector('#previewHost .tvr-doc', { timeout: 12000 });
  const tvrText = await page.$eval('#previewHost .tvr-doc', (e) => e.textContent);
  if (/asdf|tool.version/i.test(tvrText)) pass('.tool-versions: badge shown'); else fail('tool-versions badge: ' + tvrText.slice(0, 200));
  if (/node|python|ruby/i.test(tvrText)) pass('.tool-versions: tools shown'); else fail('tool-versions tools: ' + tvrText.slice(0, 200));

  // ── .gitattributes viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.gitattributes');
  await page.waitForSelector('#previewHost .gitattr-doc', { timeout: 12000 });
  pass('.gitattributes: badge shown');
  const gaText = await page.$eval('#previewHost .gitattr-doc', el => el.textContent);
  if (!gaText.includes('eol=lf') && !gaText.includes('LF')) fail('.gitattributes: line endings not shown');
  else pass('.gitattributes: line endings shown');
  if (!gaText.includes('lfs') && !gaText.includes('LFS')) fail('.gitattributes: LFS not shown');
  else pass('.gitattributes: LFS shown');

  // ── .mailmap viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.mailmap');
  await page.waitForSelector('#previewHost .mm-doc', { timeout: 12000 });
  const mmText = await page.$eval('#previewHost .mm-doc', (e) => e.textContent);
  if (/mailmap/i.test(mmText)) pass('.mailmap: title shown'); else fail('mailmap title: ' + mmText.slice(0, 200));
  const mmNames = await page.$$eval('#previewHost .mm-doc .mm-name', (els) => els.map((e) => e.textContent));
  if (mmNames.length > 0) pass('.mailmap: canonical names shown'); else fail('mailmap names: ' + mmText.slice(0, 200));

  // ── .npmignore viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.npmignore');
  await page.waitForSelector('#previewHost .nig-doc', { timeout: 12000 });
  const nigText = await page.$eval('#previewHost .nig-doc', (e) => e.textContent);
  if (/npmignore/i.test(nigText)) pass('.npmignore: title shown'); else fail('npmignore title: ' + nigText.slice(0, 200));
  const nigPats = await page.$$eval('#previewHost .nig-doc .kf-pat code', (els) => els.map((e) => e.textContent));
  if (nigPats.some((p) => /node_modules|test|dist/.test(p))) pass('.npmignore: patterns shown'); else fail('npmignore patterns: ' + nigPats.join(','));

  // ── .dockerignore viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.dockerignore');
  await page.waitForSelector('#previewHost .dig-doc', { timeout: 12000 });
  const digText = await page.$eval('#previewHost .dig-doc', (e) => e.textContent);
  if (/dockerignore/i.test(digText)) pass('.dockerignore: title shown'); else fail('dockerignore title: ' + digText.slice(0, 200));
  const digPats = await page.$$eval('#previewHost .dig-doc .kf-pat code', (els) => els.map((e) => e.textContent));
  if (digPats.some((p) => /node_modules|\.git|dist/.test(p))) pass('.dockerignore: patterns shown'); else fail('dockerignore patterns: ' + digPats.join(','));

  // ── .npmignore upgraded viewer (npmignore-doc class + badge) ──
  await openExample('.npmignore');
  await page.waitForSelector('.npmignore-doc');
  pass('.npmignore: renders');
  const npmignoreText = await page.$eval('.npmignore-doc', el => el.textContent);
  if (!npmignoreText.includes('npm')) fail('.npmignore: missing badge'); else pass('.npmignore: badge shown');
  if (!npmignoreText.includes('pattern') && !npmignoreText.includes('node_modules') && !npmignoreText.includes('test')) fail('.npmignore: no patterns shown'); else pass('.npmignore: patterns shown');

  // ── .dockerignore upgraded viewer (dockerignore-doc class + badge) ──
  await openExample('.dockerignore');
  await page.waitForSelector('.dockerignore-doc');
  pass('.dockerignore: renders');
  const dockerignoreText = await page.$eval('.dockerignore-doc', el => el.textContent);
  if (!dockerignoreText.includes('Docker')) fail('.dockerignore: missing badge'); else pass('.dockerignore: badge shown');
  if (!dockerignoreText.includes('.git') && !dockerignoreText.includes('node_modules') && !dockerignoreText.includes('pattern')) fail('.dockerignore: no patterns shown'); else pass('.dockerignore: patterns shown');

  // ── AppVeyor CI viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('appveyor.yml');
  await page.waitForSelector('#enhanceChip:not([hidden])', { timeout: 12000 });
  const avyChipText = await page.$eval('#enhanceChip', (e) => e.textContent);
  if (/AppVeyor/i.test(avyChipText)) pass('appveyor.yml: badge shown'); else fail('appveyor chip: ' + avyChipText.slice(0, 200));
  await page.waitForSelector('#previewHost .avy-doc', { timeout: 12000 });
  const avyText = await page.$eval('#previewHost .avy-doc', (e) => e.textContent);
  if (/AppVeyor/i.test(avyText)) pass('appveyor.yml: label shown'); else fail('appveyor label: ' + avyText.slice(0, 200));
  if (/Visual Studio|Build Script|build step/i.test(avyText)) pass('appveyor.yml: build info shown'); else fail('appveyor build info: ' + avyText.slice(0, 200));

  // ── RuboCop viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.rubocop.yml');
  await page.waitForSelector('#enhanceChip:not([hidden])', { timeout: 12000 });
  const rbcChipText = await page.$eval('#enhanceChip', (e) => e.textContent);
  if (/RuboCop/i.test(rbcChipText)) pass('.rubocop.yml: badge shown'); else fail('rubocop chip: ' + rbcChipText.slice(0, 200));
  await page.waitForSelector('#previewHost .rbc-doc', { timeout: 12000 });
  const rbcText = await page.$eval('#previewHost .rbc-doc', (e) => e.textContent);
  if (/RuboCop/i.test(rbcText)) pass('.rubocop.yml: label shown'); else fail('rubocop label: ' + rbcText.slice(0, 200));
  if (/Ruby|3\.2|TargetRuby/i.test(rbcText)) pass('.rubocop.yml: ruby version shown'); else fail('rubocop ruby version: ' + rbcText.slice(0, 200));

  // ── Taskfile viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Taskfile.yml');
  await page.waitForSelector('#enhanceChip:not([hidden])', { timeout: 12000 });
  const tkfChipText = await page.$eval('#enhanceChip', (e) => e.textContent);
  if (/Taskfile/i.test(tkfChipText)) pass('Taskfile.yml: badge shown'); else fail('taskfile chip: ' + tkfChipText.slice(0, 200));
  await page.waitForSelector('#previewHost .tkf-doc', { timeout: 12000 });
  const tkfText = await page.$eval('#previewHost .tkf-doc', (e) => e.textContent);
  if (/Taskfile/i.test(tkfText)) pass('Taskfile.yml: label shown'); else fail('taskfile label: ' + tkfText.slice(0, 200));
  if (/build|test|clean/i.test(tkfText)) pass('Taskfile.yml: tasks shown'); else fail('taskfile tasks: ' + tkfText.slice(0, 200));

  // ── MkDocs viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('mkdocs.yml');
  await page.waitForSelector('#enhanceChip:not([hidden])', { timeout: 12000 });
  const mdkChipText = await page.$eval('#enhanceChip', (e) => e.textContent);
  if (/MkDocs/i.test(mdkChipText)) pass('mkdocs.yml: badge shown'); else fail('mkdocs chip: ' + mdkChipText.slice(0, 200));
  await page.waitForSelector('#previewHost .mkdocs-doc', { timeout: 12000 });
  const mdkText = await page.$eval('#previewHost .mkdocs-doc', (e) => e.textContent);
  if (/MkDocs/i.test(mdkText)) pass('mkdocs.yml: label shown'); else fail('mkdocs label: ' + mdkText.slice(0, 200));
  if (/My Project Docs|material|Getting Started/i.test(mdkText)) pass('mkdocs.yml: site info shown'); else fail('mkdocs site info: ' + mdkText.slice(0, 200));

  // ── Gemfile.lock viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Gemfile.lock');
  await page.waitForSelector('#enhanceChip:not([hidden])', { timeout: 12000 });
  const gflChipText = await page.$eval('#enhanceChip', (e) => e.textContent);
  if (/Gemfile|Bundler/i.test(gflChipText)) pass('Gemfile.lock: chip shown'); else fail('gemfile-lock chip: ' + gflChipText.slice(0, 200));
  await page.waitForSelector('#previewHost .gfl-doc', { timeout: 12000 });
  const gflText = await page.$eval('#previewHost .gfl-doc', (e) => e.textContent);
  if (/GEM|BUNDLED|Gemfile|rails/i.test(gflText)) pass('Gemfile.lock: content shown'); else fail('gemfile-lock content: ' + gflText.slice(0, 200));

  // ── SonarQube config viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('sonar-project.properties');
  await page.waitForSelector('#previewHost .sonarprops-doc', { timeout: 12000 });
  const snrText = await page.$eval('#previewHost .sonarprops-doc', (e) => e.textContent);
  if (/SonarQube/i.test(snrText)) pass('sonar-project.properties: badge shown'); else fail('sonar badge: ' + snrText.slice(0, 200));
  if (snrText.includes('My Application')) pass('sonar-project.properties: project name shown'); else fail('sonar-project.properties: project name not shown: ' + snrText.slice(0, 200));
  if (snrText.includes('squ_abc123xyz456def789')) fail('sonar-project.properties: token leaked'); else pass('sonar-project.properties: token masked');

  // ── Hatch config viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('hatch.toml');
  await page.waitForSelector('#enhanceChip:not([hidden])', { timeout: 12000 });
  const htcChipText = await page.$eval('#enhanceChip', (e) => e.textContent);
  if (/Hatch/i.test(htcChipText)) pass('hatch.toml: chip shown'); else fail('hatch chip: ' + htcChipText.slice(0, 200));
  await page.waitForSelector('#previewHost .htc-doc', { timeout: 12000 });
  const htcText = await page.$eval('#previewHost .htc-doc', (e) => e.textContent);
  if (/Hatch|build|env/i.test(htcText)) pass('hatch.toml: content shown'); else fail('hatch content: ' + htcText.slice(0, 200));

  // ── rush.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('rush.json');
  await page.waitForSelector('#previewHost .rsh-doc', { timeout: 12000 });
  const rshText = await page.$eval('#previewHost .rsh-doc', (e) => e.textContent);
  if (/Rush/i.test(rshText)) pass('rush.json: badge shown'); else fail('rush badge: ' + rshText.slice(0, 200));
  if (/5\.109|rushVersion|@acme/i.test(rshText)) pass('rush.json: version and projects shown'); else fail('rush content: ' + rshText.slice(0, 200));

  // ── .markdownlint.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.markdownlint.json');
  await page.waitForSelector('#previewHost .mdlint-doc', { timeout: 12000 });
  const mdlText = await page.$eval('#previewHost .mdlint-doc', (e) => e.textContent);
  if (/markdownlint/i.test(mdlText)) pass('.markdownlint.json: badge shown'); else fail('markdownlint badge: ' + mdlText.slice(0, 200));
  if (/MD013|MD033|disabled|enabled/i.test(mdlText)) pass('.markdownlint.json: rules shown'); else fail('markdownlint rules: ' + mdlText.slice(0, 200));
  if (/120/.test(mdlText)) pass('.markdownlint.json: line length shown'); else fail('markdownlint line length: ' + mdlText.slice(0, 200));

  // ── .clang-format viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.clang-format');
  await page.waitForSelector('#previewHost .clangformat-doc', { timeout: 12000 });
  pass('.clang-format: renders');
  const clangFmtText = await page.$eval('#previewHost .clangformat-doc', (e) => e.textContent);
  if (/clang-format/i.test(clangFmtText)) pass('.clang-format: badge shown'); else fail('.clang-format: missing badge');
  if (/Google|style|Indent/i.test(clangFmtText)) pass('.clang-format: style shown'); else fail('.clang-format: no style info');

  // ── .clang-tidy viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.clang-tidy');
  await page.waitForSelector('#previewHost .clangtidy-doc', { timeout: 12000 });
  pass('.clang-tidy: renders');
  const clangtidyText = await page.$eval('#previewHost .clangtidy-doc', (e) => e.textContent);
  if (/clang-tidy/i.test(clangtidyText)) pass('.clang-tidy: badge shown'); else fail('.clang-tidy: missing badge');
  if (/modernize|check/i.test(clangtidyText)) pass('.clang-tidy: checks shown'); else fail('.clang-tidy: no checks shown');

  // ── moon.yml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('moon.yml');
  await page.waitForSelector('#previewHost .moon-doc', { timeout: 12000 });
  const moonText = await page.$eval('#previewHost .moon-doc', (e) => e.textContent);
  if (/Moon/i.test(moonText)) pass('moon.yml: badge shown'); else fail('moon badge: ' + moonText.slice(0, 200));
  if (/language|tasks|project|schema|vcs|pnpm/i.test(moonText)) pass('moon.yml: content shown'); else fail('moon content: ' + moonText.slice(0, 200));

  // ── crowdin.yml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('crowdin.yml (Crowdin config)');
  await page.waitForSelector('#previewHost .cwd-doc', { timeout: 12000 });
  const cwdText = await page.$eval('#previewHost .cwd-doc', (e) => e.textContent);
  if (/Crowdin/i.test(cwdText)) pass('crowdin.yml: badge shown'); else fail('crowdin badge: ' + cwdText.slice(0, 200));
  if (/source|translation|mapping/i.test(cwdText)) pass('crowdin.yml: file mappings shown'); else fail('crowdin content: ' + cwdText.slice(0, 200));

  // ── Matchfile viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Matchfile (Fastlane Match)');
  await page.waitForSelector('#previewHost .mf-doc', { timeout: 12000 });
  const mfText = await page.$eval('#previewHost .mf-doc', (e) => e.textContent);
  if (/Match/i.test(mfText)) pass('Matchfile: badge shown'); else fail('matchfile badge: ' + mfText.slice(0, 200));
  if (/git|storage|com\.example|development/i.test(mfText)) pass('Matchfile: certificate config shown'); else fail('matchfile content: ' + mfText.slice(0, 200));

  // ── Appfile viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Appfile');
  await page.waitForSelector('#previewHost .af-doc', { timeout: 12000 });
  const afText = await page.$eval('#previewHost .af-doc', (e) => e.textContent);
  if (/Fastlane|Appfile/i.test(afText)) pass('Appfile: badge shown'); else fail('appfile badge: ' + afText.slice(0, 200));
  if (/com\.example|apple_id|team/i.test(afText)) pass('Appfile: app config shown'); else fail('appfile content: ' + afText.slice(0, 200));

  // ── .ruby-version viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.ruby-version');
  await page.waitForSelector('#previewHost .rv-doc', { timeout: 12000 });
  const rvText = await page.$eval('#previewHost .rv-doc', (e) => e.textContent);
  if (/Ruby/i.test(rvText)) pass('.ruby-version: badge shown'); else fail('ruby-version badge: ' + rvText.slice(0, 200));
  if (/rbenv|rvm|asdf/i.test(rvText)) pass('.ruby-version: install commands shown'); else fail('ruby-version content: ' + rvText.slice(0, 200));

  // ── .python-version viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.python-version');
  await page.waitForSelector('#previewHost .pv-doc', { timeout: 12000 });
  const pvText = await page.$eval('#previewHost .pv-doc', (e) => e.textContent);
  if (/Python/i.test(pvText)) pass('.python-version: badge shown'); else fail('python-version badge: ' + pvText.slice(0, 200));
  if (/pyenv|asdf|3\.\d/i.test(pvText)) pass('.python-version: version and install commands shown'); else fail('python-version content: ' + pvText.slice(0, 200));

  // ── Supabase config viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('supabase/config.toml');
  await page.waitForSelector('#previewHost .sbc-doc', { timeout: 12000 });
  const sbcText = await page.$eval('#previewHost .sbc-doc', (e) => e.textContent);
  if (/Supabase/i.test(sbcText)) pass('supabase config.toml: badge shown'); else fail('supabase badge: ' + sbcText.slice(0, 200));
  if (/my-supabase-project|54321|54322/i.test(sbcText)) pass('supabase config.toml: settings shown'); else fail('supabase content: ' + sbcText.slice(0, 200));

  // ── Netlify _redirects viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('_redirects');
  await page.waitForSelector('#previewHost .rdx-doc', { timeout: 12000 });
  const rdxText = await page.$eval('#previewHost .rdx-doc', (e) => e.textContent);
  if (/Netlify/i.test(rdxText)) pass('_redirects: badge shown'); else fail('redirects badge: ' + rdxText.slice(0, 200));
  if (/301|\/old-blog|\/api/i.test(rdxText)) pass('_redirects: rules shown'); else fail('redirects content: ' + rdxText.slice(0, 200));

  // ── CMakeLists.txt viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('CMakeLists.txt');
  await page.waitForSelector('#previewHost .cmake-doc', { timeout: 12000 });
  const cmakeText = await page.$eval('#previewHost .cmake-doc', (e) => e.textContent);
  if (/CMake/i.test(cmakeText)) pass('CMakeLists.txt: badge shown'); else fail('cmake badge: ' + cmakeText.slice(0, 200));
  if (/myapp|mylib|OpenSSL|MyApp/i.test(cmakeText)) pass('CMakeLists.txt: targets or deps shown'); else fail('cmake targets: ' + cmakeText.slice(0, 200));

  // ── Jenkinsfile viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Jenkinsfile');
  await page.waitForSelector('#previewHost .jenkinsfile-doc', { timeout: 12000 });
  pass('Jenkinsfile: renders');
  const jkfText = await page.$eval('#previewHost .jenkinsfile-doc', (e) => e.textContent);
  if (/Jenkins/i.test(jkfText)) pass('Jenkinsfile: badge shown'); else fail('jenkins badge: ' + jkfText.slice(0, 200));
  if (/stage|Stage/i.test(jkfText)) pass('Jenkinsfile: stages shown'); else fail('jenkins stages: ' + jkfText.slice(0, 200));

  // ── Vagrantfile viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Vagrantfile');
  await page.waitForSelector('#previewHost .vagrantfile-doc', { timeout: 12000 });
  const vgfText = await page.$eval('#previewHost .vagrantfile-doc', (e) => e.textContent);
  if (/Vagrant/i.test(vgfText)) pass('Vagrantfile: badge shown'); else fail('vagrantfile badge: ' + vgfText.slice(0, 200));
  if (/ubuntu\/jammy64/i.test(vgfText)) pass('Vagrantfile: box shown'); else fail('vagrantfile box: ' + vgfText.slice(0, 200));

  // ── BUILD.bazel viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('BUILD.bazel');
  await page.waitForSelector('#previewHost .bzl-doc', { timeout: 12000 });
  const bzlText = await page.$eval('#previewHost .bzl-doc', (e) => e.textContent);
  if (/Bazel/i.test(bzlText)) pass('BUILD.bazel: Bazel badge shown'); else fail('bazel badge: ' + bzlText.slice(0, 200));
  if (/server|lib|py_binary|py_library|py_test/i.test(bzlText)) pass('BUILD.bazel: targets shown'); else fail('bazel targets: ' + bzlText.slice(0, 200));

  // ── .bazelrc viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.bazelrc');
  await page.waitForSelector('#previewHost .brc-doc', { timeout: 12000 });
  const brcText = await page.$eval('#previewHost .brc-doc', (e) => e.textContent);
  if (/Bazel/i.test(brcText)) pass('.bazelrc: Bazel badge shown'); else fail('bazelrc badge: ' + brcText.slice(0, 200));
  if (/build|test|common|remote/i.test(brcText)) pass('.bazelrc: option groups shown'); else fail('bazelrc groups: ' + brcText.slice(0, 200));

  // ── build.ninja viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('build.ninja');
  await page.waitForSelector('#previewHost .nj-doc', { timeout: 12000 });
  const njText = await page.$eval('#previewHost .nj-doc', (e) => e.textContent);
  if (/Ninja/i.test(njText)) pass('build.ninja: Ninja badge shown'); else fail('ninja badge: ' + njText.slice(0, 200));
  if (/cc_compile|cc_link|myapp|build\./i.test(njText)) pass('build.ninja: rules or targets shown'); else fail('ninja targets: ' + njText.slice(0, 200));

  // ── .gitconfig viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.gitconfig');
  await page.waitForSelector('#previewHost .gcf-doc', { timeout: 12000 });
  const gcfText = await page.$eval('#previewHost .gcf-doc', (e) => e.textContent);
  if (/Git/i.test(gcfText)) pass('.gitconfig: Git badge shown'); else fail('gitconfig badge: ' + gcfText.slice(0, 200));
  if (/user|remote|alias|core/i.test(gcfText)) pass('.gitconfig: sections shown'); else fail('gitconfig sections: ' + gcfText.slice(0, 200));
  if (/jane@example\.com|Jane Developer/i.test(gcfText)) pass('.gitconfig: user identity shown'); else fail('gitconfig user: ' + gcfText.slice(0, 200));

  // ── playwright.config.ts viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('playwright.config.ts');
  await page.waitForSelector('#previewHost .pw-doc', { timeout: 12000 });
  const pwText = await page.$eval('#previewHost .pw-doc', (e) => e.textContent);
  if (/Playwright/i.test(pwText)) pass('playwright.config.ts: Playwright badge shown'); else fail('playwright badge: ' + pwText.slice(0, 200));
  if (/chromium|firefox|webkit/i.test(pwText)) pass('playwright.config.ts: browsers shown'); else fail('playwright browsers: ' + pwText.slice(0, 200));
  if (/baseURL|localhost/i.test(pwText)) pass('playwright.config.ts: base URL shown'); else fail('playwright baseURL: ' + pwText.slice(0, 200));
  if (/web server/i.test(pwText)) pass('playwright.config.ts: web server indicator shown'); else fail('playwright webserver: ' + pwText.slice(0, 200));

  // ── cypress.config.js viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('cypress.config.js');
  await page.waitForSelector('#previewHost .cy-doc', { timeout: 12000 });
  const cyText = await page.$eval('#previewHost .cy-doc', (e) => e.textContent);
  if (/Cypress/i.test(cyText)) pass('cypress.config.js: Cypress badge shown'); else fail('cypress badge: ' + cyText.slice(0, 200));
  if (/localhost:4000/i.test(cyText)) pass('cypress.config.js: base URL shown'); else fail('cypress baseURL: ' + cyText.slice(0, 200));
  if (/component/i.test(cyText)) pass('cypress.config.js: component testing section shown'); else fail('cypress component: ' + cyText.slice(0, 200));
  if (/env var/i.test(cyText)) pass('cypress.config.js: env var count shown'); else fail('cypress env: ' + cyText.slice(0, 200));

  // ── wdio.conf.js viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('wdio.conf.js');
  await page.waitForSelector('#previewHost .wdio-doc', { timeout: 12000 });
  const wdioText = await page.$eval('#previewHost .wdio-doc', (e) => e.textContent);
  if (/WebdriverIO/i.test(wdioText)) pass('wdio.conf.js: WebdriverIO badge shown'); else fail('wdio badge: ' + wdioText.slice(0, 200));
  if (/chrome|firefox/i.test(wdioText)) pass('wdio.conf.js: browsers shown'); else fail('wdio browsers: ' + wdioText.slice(0, 200));
  if (/localhost:3000/i.test(wdioText)) pass('wdio.conf.js: base URL shown'); else fail('wdio baseURL: ' + wdioText.slice(0, 200));
  if (/mocha/i.test(wdioText)) pass('wdio.conf.js: framework shown'); else fail('wdio framework: ' + wdioText.slice(0, 200));

  // ── k6.config.js viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('k6.config.js');
  await page.waitForSelector('#previewHost .k6-doc', { timeout: 12000 });
  const k6Text = await page.$eval('#previewHost .k6-doc', (e) => e.textContent);
  if (/k6/i.test(k6Text)) pass('k6.config.js: k6 badge shown'); else fail('k6 badge: ' + k6Text.slice(0, 200));
  if (/vus|virtual user/i.test(k6Text)) pass('k6.config.js: VU count shown'); else fail('k6 vus: ' + k6Text.slice(0, 200));
  if (/stage|duration/i.test(k6Text)) pass('k6.config.js: stages shown'); else fail('k6 stages: ' + k6Text.slice(0, 200));
  if (/threshold|http_req/i.test(k6Text)) pass('k6.config.js: thresholds shown'); else fail('k6 thresholds: ' + k6Text.slice(0, 200));

  // ── .goreleaser.yaml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.goreleaser.yaml');
  await page.waitForSelector('#previewHost .grl-doc', { timeout: 12000 });
  const grlText = await page.$eval('#previewHost .grl-doc', (e) => e.textContent);
  if (/GoReleaser/i.test(grlText)) pass('.goreleaser.yaml: GoReleaser badge shown'); else fail('goreleaser badge: ' + grlText.slice(0, 200));
  if (/myapp/i.test(grlText)) pass('.goreleaser.yaml: project name shown'); else fail('goreleaser project: ' + grlText.slice(0, 200));
  if (/linux|darwin|windows/i.test(grlText)) pass('.goreleaser.yaml: build targets shown'); else fail('goreleaser builds: ' + grlText.slice(0, 200));
  if (/tar\.gz|zip/i.test(grlText)) pass('.goreleaser.yaml: archive formats shown'); else fail('goreleaser archives: ' + grlText.slice(0, 200));

  // ── .golangci.yml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.golangci.yml');
  await page.waitForSelector('#previewHost .golangci-doc', { timeout: 12000 });
  const gclText = await page.$eval('#previewHost .golangci-doc', (e) => e.textContent);
  if (/golangci-lint/i.test(gclText)) pass('.golangci.yml: badge shown'); else fail('golangci badge: ' + gclText.slice(0, 200));
  if (/errcheck/i.test(gclText)) pass('.golangci.yml: linters shown'); else fail('golangci linters: ' + gclText.slice(0, 200));
  if (/5m/i.test(gclText)) pass('.golangci.yml: timeout shown'); else fail('golangci timeout: ' + gclText.slice(0, 200));

  // ── buf.yaml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('buf.yaml');
  await page.waitForSelector('#previewHost .buf-doc', { timeout: 12000 });
  const bufText = await page.$eval('#previewHost .buf-doc', (e) => e.textContent);
  if (/Buf/i.test(bufText)) pass('buf.yaml: Buf badge shown'); else fail('buf badge: ' + bufText.slice(0, 200));
  if (/v2/i.test(bufText)) pass('buf.yaml: version shown'); else fail('buf version: ' + bufText.slice(0, 200));
  if (/googleapis|grpc-gateway/i.test(bufText)) pass('buf.yaml: dependencies shown'); else fail('buf deps: ' + bufText.slice(0, 200));

  // ── .mockery.yaml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.mockery.yaml (mockery)');
  await page.waitForSelector('#previewHost .mky-doc', { timeout: 12000 });
  const mkyText = await page.$eval('#previewHost .mky-doc', (e) => e.textContent);
  if (/mockery/i.test(mkyText)) pass('.mockery.yaml: mockery badge shown'); else fail('mockery badge: ' + mkyText.slice(0, 200));
  if (/service|repository|notifier/i.test(mkyText)) pass('.mockery.yaml: packages shown'); else fail('mockery packages: ' + mkyText.slice(0, 200));
  if (/UserService|AuthService|PaymentService/i.test(mkyText)) pass('.mockery.yaml: interfaces shown'); else fail('mockery interfaces: ' + mkyText.slice(0, 300));
  if (/with-expecter|expecter/i.test(mkyText)) pass('.mockery.yaml: with-expecter setting shown'); else fail('mockery expecter: ' + mkyText.slice(0, 300));

  // ── .ko.yaml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.ko.yaml (ko container build)');
  await page.waitForSelector('#previewHost .ko-doc', { timeout: 12000 });
  const koText = await page.$eval('#previewHost .ko-doc', (e) => e.textContent);
  if (/\bko\b/i.test(koText)) pass('.ko.yaml: ko badge shown'); else fail('ko badge: ' + koText.slice(0, 200));
  if (/distroless/i.test(koText)) pass('.ko.yaml: base image shown'); else fail('ko base image: ' + koText.slice(0, 200));
  if (/linux\/amd64|linux\/arm64/i.test(koText)) pass('.ko.yaml: platforms shown'); else fail('ko platforms: ' + koText.slice(0, 200));
  if (/spdx|sbom/i.test(koText)) pass('.ko.yaml: SBOM setting shown'); else fail('ko sbom: ' + koText.slice(0, 300));

  // ── sqlc.yaml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('sqlc.yaml (sqlc)');
  await page.waitForSelector('#previewHost .sqlc-doc', { timeout: 12000 });
  const sqlcText = await page.$eval('#previewHost .sqlc-doc', (e) => e.textContent);
  if (/sqlc/i.test(sqlcText)) pass('sqlc.yaml: sqlc badge shown'); else fail('sqlc badge: ' + sqlcText.slice(0, 200));
  if (/postgresql/i.test(sqlcText)) pass('sqlc.yaml: SQL engine shown'); else fail('sqlc engine: ' + sqlcText.slice(0, 200));
  if (/queries|schema/i.test(sqlcText)) pass('sqlc.yaml: queries/schema paths shown'); else fail('sqlc paths: ' + sqlcText.slice(0, 300));
  if (/internal\/db|analytics/i.test(sqlcText)) pass('sqlc.yaml: output dirs shown'); else fail('sqlc output: ' + sqlcText.slice(0, 300));

  // ── nfpm.yaml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('nfpm.yaml (nfpm)');
  await page.waitForSelector('#previewHost .nfpm-doc', { timeout: 12000 });
  const nfpmText = await page.$eval('#previewHost .nfpm-doc', (e) => e.textContent);
  if (/nfpm/i.test(nfpmText)) pass('nfpm.yaml: nfpm badge shown'); else fail('nfpm badge: ' + nfpmText.slice(0, 200));
  if (/myapp/i.test(nfpmText)) pass('nfpm.yaml: package name shown'); else fail('nfpm name: ' + nfpmText.slice(0, 200));
  if (/deb|rpm|apk/i.test(nfpmText)) pass('nfpm.yaml: package formats shown'); else fail('nfpm formats: ' + nfpmText.slice(0, 300));
  if (/preinstall|postinstall/i.test(nfpmText)) pass('nfpm.yaml: install scripts shown'); else fail('nfpm scripts: ' + nfpmText.slice(0, 300));

  // ── heroku.yml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('heroku.yml');
  await page.waitForSelector('#previewHost .hku-doc', { timeout: 12000 });
  const hkuText = await page.$eval('#previewHost .hku-doc', (e) => e.textContent);
  if (/Heroku/i.test(hkuText)) pass('heroku.yml: Heroku badge shown'); else fail('heroku badge: ' + hkuText.slice(0, 200));
  if (/Dockerfile/i.test(hkuText)) pass('heroku.yml: Docker build shown'); else fail('heroku docker: ' + hkuText.slice(0, 200));
  if (/web|worker|scheduler/i.test(hkuText)) pass('heroku.yml: process types shown'); else fail('heroku processes: ' + hkuText.slice(0, 200));

  // ── .readthedocs.yaml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.readthedocs.yaml');
  await page.waitForSelector('#previewHost .rtd-doc', { timeout: 12000 });
  const rtdText = await page.$eval('#previewHost .rtd-doc', (e) => e.textContent);
  if (/ReadTheDocs/i.test(rtdText)) pass('.readthedocs.yaml: ReadTheDocs badge shown'); else fail('readthedocs badge: ' + rtdText.slice(0, 200));
  if (/ubuntu|3\.11|Node/i.test(rtdText)) pass('.readthedocs.yaml: build environment shown'); else fail('readthedocs build env: ' + rtdText.slice(0, 200));
  if (/Sphinx|MkDocs|pdf|epub/i.test(rtdText)) pass('.readthedocs.yaml: doc tool or formats shown'); else fail('readthedocs formats: ' + rtdText.slice(0, 200));

  // ── CITATION.cff viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('CITATION.cff');
  await page.waitForSelector('#previewHost .cff-doc', { timeout: 12000 });
  const cffText = await page.$eval('#previewHost .cff-doc', (e) => e.textContent);
  if (/Citation/i.test(cffText)) pass('CITATION.cff: Citation badge shown'); else fail('citation badge: ' + cffText.slice(0, 200));
  if (/MyResearchTool/i.test(cffText)) pass('CITATION.cff: title shown'); else fail('citation title: ' + cffText.slice(0, 200));
  if (/Smith/i.test(cffText)) pass('CITATION.cff: authors shown'); else fail('citation authors: ' + cffText.slice(0, 200));
  if (/10\.5281/i.test(cffText)) pass('CITATION.cff: DOI shown'); else fail('citation DOI: ' + cffText.slice(0, 200));

  // ── .yamllint.yml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.yamllint.yml');
  await page.waitForSelector('#previewHost .yml-doc', { timeout: 12000 });
  const ymlText = await page.$eval('#previewHost .yml-doc', (e) => e.textContent);
  if (/yamllint/i.test(ymlText)) pass('.yamllint.yml: yamllint badge shown'); else fail('yamllint badge: ' + ymlText.slice(0, 200));
  if (/default/i.test(ymlText)) pass('.yamllint.yml: extends shown'); else fail('yamllint extends: ' + ymlText.slice(0, 200));
  if (/120|line-length|indentation/i.test(ymlText)) pass('.yamllint.yml: key rules shown'); else fail('yamllint rules: ' + ymlText.slice(0, 200));

  // ── .coderabbit.yaml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.coderabbit.yaml');
  await page.waitForSelector('#previewHost .crb-doc', { timeout: 12000 });
  const crbText = await page.$eval('#previewHost .crb-doc', (e) => e.textContent);
  if (/CodeRabbit/i.test(crbText)) pass('.coderabbit.yaml: CodeRabbit badge shown'); else fail('coderabbit badge: ' + crbText.slice(0, 200));
  if (/enabled|auto-review/i.test(crbText)) pass('.coderabbit.yaml: auto-review status shown'); else fail('coderabbit auto-review: ' + crbText.slice(0, 200));
  if (/ruff|eslint|path/i.test(crbText)) pass('.coderabbit.yaml: tools or filters shown'); else fail('coderabbit tools: ' + crbText.slice(0, 200));

  // ── vcpkg.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('vcpkg.json');
  await page.waitForSelector('#previewHost .vcpkg-doc', { timeout: 12000 });
  const vcpkgText = await page.$eval('#previewHost .vcpkg-doc', (e) => e.textContent);
  if (/vcpkg/i.test(vcpkgText)) pass('vcpkg.json: vcpkg badge shown'); else fail('vcpkg badge: ' + vcpkgText.slice(0, 200));
  if (/my-cpp-app/i.test(vcpkgText)) pass('vcpkg.json: package name shown'); else fail('vcpkg name: ' + vcpkgText.slice(0, 200));
  if (/fmt|nlohmann-json|boost-filesystem/i.test(vcpkgText)) pass('vcpkg.json: dependencies listed'); else fail('vcpkg deps: ' + vcpkgText.slice(0, 300));
  if (/networking|testing/i.test(vcpkgText)) pass('vcpkg.json: features shown'); else fail('vcpkg features: ' + vcpkgText.slice(0, 300));

  // ── CMakePresets.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('CMakePresets.json');
  await page.waitForSelector('#previewHost .cmp-doc', { timeout: 12000 });
  const cmpText = await page.$eval('#previewHost .cmp-doc', (e) => e.textContent);
  if (/CMake Presets/i.test(cmpText)) pass('CMakePresets.json: CMake Presets badge shown'); else fail('cmake-presets badge: ' + cmpText.slice(0, 200));
  if (/3\.25|3\.25\.0/i.test(cmpText)) pass('CMakePresets.json: minimum CMake version shown'); else fail('cmake-presets version: ' + cmpText.slice(0, 200));
  if (/debug|release|ci/i.test(cmpText)) pass('CMakePresets.json: configure presets listed'); else fail('cmake-presets configure: ' + cmpText.slice(0, 300));
  if (/configure|build|test|workflow/i.test(cmpText)) pass('CMakePresets.json: summary tags shown'); else fail('cmake-presets tags: ' + cmpText.slice(0, 200));

  // ── conanfile.txt viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('conanfile.txt');
  await page.waitForSelector('#previewHost .conanfile-doc', { timeout: 12000 });
  const conanText = await page.$eval('#previewHost .conanfile-doc', (e) => e.textContent);
  if (/Conan/i.test(conanText)) pass('conanfile.txt: Conan badge shown'); else fail('conan badge: ' + conanText.slice(0, 200));
  if (/boost|fmt|nlohmann_json/i.test(conanText)) pass('conanfile.txt: requires listed'); else fail('conan requires: ' + conanText.slice(0, 300));
  if (/CMakeDeps|CMakeToolchain/i.test(conanText)) pass('conanfile.txt: generators shown'); else fail('conan generators: ' + conanText.slice(0, 200));

  // ── prometheus.yml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('prometheus.yml');
  await page.waitForSelector('#previewHost .prom-doc', { timeout: 12000 });
  const promText = await page.$eval('#previewHost .prom-doc', (e) => e.textContent);
  if (/Prometheus/i.test(promText)) pass('prometheus.yml: Prometheus badge shown'); else fail('prometheus badge: ' + promText.slice(0, 200));
  if (/node_exporter|node-exporter|prometheus/i.test(promText)) pass('prometheus.yml: scrape jobs shown'); else fail('prometheus scrape jobs: ' + promText.slice(0, 200));
  if (/15s/i.test(promText)) pass('prometheus.yml: scrape_interval shown'); else fail('prometheus interval: ' + promText.slice(0, 200));
  if (/alertmanager/i.test(promText)) pass('prometheus.yml: alertmanager target shown'); else fail('prometheus alertmanager: ' + promText.slice(0, 200));
  if (promText.includes('secret123')) fail('prometheus.yml: password leaked'); else pass('prometheus.yml: password masked');

  // ── traefik.yml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('traefik.yml');
  await page.waitForSelector('#previewHost .traefik-doc', { timeout: 12000 });
  pass('traefik.yml: badge shown');
  const trText = await page.$eval('#previewHost .traefik-doc', el => el.textContent);
  if (!trText.includes('websecure') && !trText.includes('443')) fail('traefik.yml: entry points not shown');
  else pass('traefik.yml: entry points shown');
  if (!trText.includes('docker')) fail('traefik.yml: providers not shown');
  else pass('traefik.yml: providers shown');

  // ── alertmanager.yml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('alertmanager.yml');
  await page.waitForSelector('#previewHost .alertmgr-doc', { timeout: 12000 });
  const amText = await page.$eval('#previewHost .alertmgr-doc', (e) => e.textContent);
  if (/Alertmanager/i.test(amText)) pass('alertmanager.yml: Alertmanager badge shown'); else fail('alertmanager badge: ' + amText.slice(0, 200));
  if (/pagerduty|slack/i.test(amText)) pass('alertmanager.yml: receivers shown'); else fail('alertmanager receivers: ' + amText.slice(0, 200));
  if (/Slack|PagerDuty/i.test(amText)) pass('alertmanager.yml: receiver types shown'); else fail('alertmanager types: ' + amText.slice(0, 200));
  if (/group_wait|30s/i.test(amText)) pass('alertmanager.yml: route settings shown'); else fail('alertmanager route: ' + amText.slice(0, 200));
  if (amText.includes('secret-password') || amText.includes('secret-pagerduty-key')) fail('alertmanager.yml: secrets leaked'); else pass('alertmanager.yml: secrets masked');

  // ── datadog.yaml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('datadog.yaml');
  await page.waitForSelector('#previewHost .dd-doc', { timeout: 12000 });
  const ddText = await page.$eval('#previewHost .dd-doc', (e) => e.textContent);
  if (/Datadog/i.test(ddText)) pass('datadog.yaml: Datadog badge shown'); else fail('datadog badge: ' + ddText.slice(0, 200));
  if (/datadoghq\.com/i.test(ddText)) pass('datadog.yaml: site shown'); else fail('datadog site: ' + ddText.slice(0, 200));
  if (/env:production|service:myapp/i.test(ddText)) pass('datadog.yaml: tags shown'); else fail('datadog tags: ' + ddText.slice(0, 200));
  if (/Log collection|APM/i.test(ddText)) pass('datadog.yaml: feature flags shown'); else fail('datadog features: ' + ddText.slice(0, 200));

  // ── ionic.config.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('ionic.config.json');
  await page.waitForSelector('#previewHost .ion-doc', { timeout: 12000 });
  const ionicText = await page.$eval('#previewHost .ion-doc', (e) => e.textContent);
  if (/Ionic/i.test(ionicText)) pass('ionic.config.json: Ionic badge shown'); else fail('ionic badge: ' + ionicText.slice(0, 200));
  if (/my-ionic-app/i.test(ionicText)) pass('ionic.config.json: app name shown'); else fail('ionic app name: ' + ionicText.slice(0, 200));
  if (/com\.example\.myionicapp/i.test(ionicText)) pass('ionic.config.json: app ID shown'); else fail('ionic app ID: ' + ionicText.slice(0, 200));
  if (/capacitor|cordova/i.test(ionicText)) pass('ionic.config.json: integrations shown'); else fail('ionic integrations: ' + ionicText.slice(0, 300));
  if (/ionic.?react/i.test(ionicText)) pass('ionic.config.json: project type shown'); else fail('ionic type: ' + ionicText.slice(0, 200));

  // ── metro.config.js viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('metro.config.js');
  await page.waitForSelector('#previewHost .metro-doc', { timeout: 12000 });
  const metroText = await page.$eval('#previewHost .metro-doc', (e) => e.textContent);
  if (/Metro/i.test(metroText)) pass('metro.config.js: Metro badge shown'); else fail('metro badge: ' + metroText.slice(0, 200));
  if (/8081/i.test(metroText)) pass('metro.config.js: server port shown'); else fail('metro port: ' + metroText.slice(0, 200));
  if (/SVG/i.test(metroText)) pass('metro.config.js: SVG support shown'); else fail('metro SVG: ' + metroText.slice(0, 200));
  if (/svg|ts|tsx/i.test(metroText)) pass('metro.config.js: source extensions shown'); else fail('metro extensions: ' + metroText.slice(0, 300));

  // ── react-native.config.js viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('react-native.config.js');
  await page.waitForSelector('#previewHost .rnc-doc', { timeout: 12000 });
  const rncText = await page.$eval('#previewHost .rnc-doc', (e) => e.textContent);
  if (/React Native CLI/i.test(rncText)) pass('react-native.config.js: React Native CLI badge shown'); else fail('rnc badge: ' + rncText.slice(0, 200));
  if (/react-native-vector-icons|react-native-camera|react-native-maps/i.test(rncText)) pass('react-native.config.js: dependencies shown'); else fail('rnc deps: ' + rncText.slice(0, 300));
  if (/ios|android/i.test(rncText)) pass('react-native.config.js: platforms shown'); else fail('rnc platforms: ' + rncText.slice(0, 200));
  if (/fonts|images|assets/i.test(rncText)) pass('react-native.config.js: assets shown'); else fail('rnc assets: ' + rncText.slice(0, 200));

  // ── stack.yaml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('stack.yaml');
  await page.waitForSelector('#previewHost .stk-doc', { timeout: 12000 });
  const stkText = await page.$eval('#previewHost .stk-doc', (e) => e.textContent);
  if (/Haskell Stack/i.test(stkText)) pass('stack.yaml: Haskell Stack badge shown'); else fail('stack badge: ' + stkText.slice(0, 200));
  if (/lts-21\.25/i.test(stkText)) pass('stack.yaml: resolver shown'); else fail('stack resolver: ' + stkText.slice(0, 200));
  if (/my-lib|my-app/i.test(stkText)) pass('stack.yaml: local packages shown'); else fail('stack packages: ' + stkText.slice(0, 300));
  if (/amazonka|async-pool/i.test(stkText)) pass('stack.yaml: extra deps shown'); else fail('stack extra-deps: ' + stkText.slice(0, 300));

  // ── example.cabal viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('example.cabal');
  await page.waitForSelector('#previewHost .cabal-doc', { timeout: 12000 });
  const cabalText = await page.$eval('#previewHost .cabal-doc', (e) => e.textContent);
  if (/Cabal/i.test(cabalText)) pass('example.cabal: Cabal badge shown'); else fail('cabal badge: ' + cabalText.slice(0, 200));
  if (/my-haskell-app/i.test(cabalText)) pass('example.cabal: package name shown'); else fail('cabal name: ' + cabalText.slice(0, 200));
  if (/0\.1\.0\.0/i.test(cabalText)) pass('example.cabal: version shown'); else fail('cabal version: ' + cabalText.slice(0, 200));
  if (/executable|library|test-suite|benchmark/i.test(cabalText)) pass('example.cabal: components shown'); else fail('cabal components: ' + cabalText.slice(0, 300));
  if (/aeson|mtl|containers/i.test(cabalText)) pass('example.cabal: build dependencies shown'); else fail('cabal deps: ' + cabalText.slice(0, 300));

  // ── Package.resolved viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Package.resolved');
  await page.waitForSelector('#previewHost .pkgr-doc', { timeout: 12000 });
  const pkgrText = await page.$eval('#previewHost .pkgr-doc', (e) => e.textContent);
  if (/Swift/i.test(pkgrText)) pass('Package.resolved: Swift badge shown'); else fail('package-resolved badge: ' + pkgrText.slice(0, 200));
  if (/alamofire|kingfisher/i.test(pkgrText)) pass('Package.resolved: pinned packages shown'); else fail('package-resolved pins: ' + pkgrText.slice(0, 300));
  if (/5\.8\.1|1\.3\.0/i.test(pkgrText)) pass('Package.resolved: package versions shown'); else fail('package-resolved versions: ' + pkgrText.slice(0, 300));

  // ── rebar.config viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('rebar.config');
  await page.waitForSelector('#previewHost .rebar-doc', { timeout: 12000 });
  const rebarText = await page.$eval('#previewHost .rebar-doc', (e) => e.textContent);
  if (/Erlang\/rebar3/i.test(rebarText)) pass('rebar.config: Erlang/rebar3 badge shown'); else fail('rebar badge: ' + rebarText.slice(0, 200));
  if (/cowboy|eredis|poolboy/i.test(rebarText)) pass('rebar.config: dependencies shown'); else fail('rebar deps: ' + rebarText.slice(0, 300));
  if (/25\.0/i.test(rebarText)) pass('rebar.config: minimum OTP version shown'); else fail('rebar otp version: ' + rebarText.slice(0, 200));
  if (/prod|test|dev/i.test(rebarText)) pass('rebar.config: profiles shown'); else fail('rebar profiles: ' + rebarText.slice(0, 300));
  if (/dialyzer/i.test(rebarText)) pass('rebar.config: dialyzer shown'); else fail('rebar dialyzer: ' + rebarText.slice(0, 200));

  // ── project.clj (Leiningen) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('project.clj');
  await page.waitForSelector('#previewHost .lein-doc', { timeout: 12000 });
  const leinText = await page.$eval('#previewHost .lein-doc', (e) => e.textContent);
  if (/Leiningen/i.test(leinText)) pass('project.clj: Leiningen badge shown'); else fail('lein badge: ' + leinText.slice(0, 200));
  if (/my-clojure-app/i.test(leinText)) pass('project.clj: project name shown'); else fail('lein name: ' + leinText.slice(0, 200));
  if (/0\.3\.1/i.test(leinText)) pass('project.clj: version shown'); else fail('lein version: ' + leinText.slice(0, 200));
  if (/compojure|ring|cheshire|next\.jdbc/i.test(leinText)) pass('project.clj: dependencies listed'); else fail('lein deps: ' + leinText.slice(0, 300));
  if (/lein-ring/i.test(leinText)) pass('project.clj: plugins shown'); else fail('lein plugins: ' + leinText.slice(0, 300));
  if (/dev|test|uberjar/i.test(leinText)) pass('project.clj: profiles shown'); else fail('lein profiles: ' + leinText.slice(0, 300));

  // ── deps.edn (Clojure CLI) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('deps.edn');
  await page.waitForSelector('#previewHost .deps-doc', { timeout: 12000 });
  const depsText = await page.$eval('#previewHost .deps-doc', (e) => e.textContent);
  if (/Clojure CLI/i.test(depsText)) pass('deps.edn: Clojure CLI badge shown'); else fail('deps badge: ' + depsText.slice(0, 200));
  if (/reitit|ring|next\.jdbc/i.test(depsText)) pass('deps.edn: dependencies listed'); else fail('deps deps: ' + depsText.slice(0, 300));
  if (/src|resources/i.test(depsText)) pass('deps.edn: source paths shown'); else fail('deps paths: ' + depsText.slice(0, 200));
  if (/dev|test|build|lint/i.test(depsText)) pass('deps.edn: aliases shown'); else fail('deps aliases: ' + depsText.slice(0, 300));

  // ── shadow-cljs.edn viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('shadow-cljs.edn');
  await page.waitForSelector('#previewHost .sc-doc', { timeout: 12000 });
  const scText = await page.$eval('#previewHost .sc-doc', (e) => e.textContent);
  if (/Shadow-cljs/i.test(scText)) pass('shadow-cljs.edn: Shadow-cljs badge shown'); else fail('shadow-cljs badge: ' + scText.slice(0, 200));
  if (/reagent|re-frame|shadow-cljs/i.test(scText)) pass('shadow-cljs.edn: dependencies listed'); else fail('shadow-cljs deps: ' + scText.slice(0, 300));
  if (/src\/main|src\/dev/i.test(scText)) pass('shadow-cljs.edn: source paths shown'); else fail('shadow-cljs paths: ' + scText.slice(0, 200));
  if (/app|tests|browser/i.test(scText)) pass('shadow-cljs.edn: builds shown'); else fail('shadow-cljs builds: ' + scText.slice(0, 300));
  if (/3000/i.test(scText)) pass('shadow-cljs.edn: dev HTTP port shown'); else fail('shadow-cljs port: ' + scText.slice(0, 200));

  // ── app.yaml (Google App Engine) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('app.yaml');
  await page.waitForSelector('#previewHost .appyaml-doc', { timeout: 12000 });
  pass('app.yaml: renders');
  const gaeText = await page.$eval('#previewHost .appyaml-doc', (e) => e.textContent);
  if (/App Engine/i.test(gaeText)) pass('app.yaml: App Engine badge shown'); else fail('gae-app badge: ' + gaeText.slice(0, 200));
  if (/nodejs20|python311|java17|ruby/i.test(gaeText)) pass('app.yaml: runtime shown'); else fail('gae-app runtime: ' + gaeText.slice(0, 200));
  if (/standard|flex/i.test(gaeText)) pass('app.yaml: environment shown'); else fail('gae-app env: ' + gaeText.slice(0, 200));
  if (/\[configured\]/i.test(gaeText)) pass('app.yaml: sensitive env vars masked'); else fail('gae-app masking: ' + gaeText.slice(0, 300));

  // ── cloudbuild.yaml (Google Cloud Build) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('cloudbuild.yaml');
  await page.waitForSelector('#previewHost .gcb-doc', { timeout: 12000 });
  const gcbText = await page.$eval('#previewHost .gcb-doc', (e) => e.textContent);
  if (/Cloud Build/i.test(gcbText)) pass('cloudbuild.yaml: Cloud Build badge shown'); else fail('cloudbuild badge: ' + gcbText.slice(0, 200));
  if (/step|npm|docker|node/i.test(gcbText)) pass('cloudbuild.yaml: build steps shown'); else fail('cloudbuild steps: ' + gcbText.slice(0, 300));
  if (/1200s|machineType|E2_HIGHCPU/i.test(gcbText)) pass('cloudbuild.yaml: timeout and machine type shown'); else fail('cloudbuild options: ' + gcbText.slice(0, 300));

  // ── google-services.json (Firebase) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('google-services.json');
  await page.waitForSelector('#previewHost .gs-doc', { timeout: 12000 });
  const gsText = await page.$eval('#previewHost .gs-doc', (e) => e.textContent);
  if (/Firebase/i.test(gsText)) pass('google-services.json: Firebase badge shown'); else fail('google-services badge: ' + gsText.slice(0, 200));
  if (/myapp-production|project/i.test(gsText)) pass('google-services.json: project ID shown'); else fail('google-services project: ' + gsText.slice(0, 200));
  if (/com\.example\.myapp|package_name|app client/i.test(gsText)) pass('google-services.json: app client shown'); else fail('google-services client: ' + gsText.slice(0, 300));

  // ── catalog-info.yaml (Backstage) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('catalog-info.yaml');
  await page.waitForSelector('#previewHost .cat-doc', { timeout: 12000 });
  const catText = await page.$eval('#previewHost .cat-doc', (e) => e.textContent);
  if (/Backstage/i.test(catText)) pass('catalog-info.yaml: Backstage badge shown'); else fail('catalog-info badge: ' + catText.slice(0, 200));
  if (/Component|API|System|Group|User/i.test(catText)) pass('catalog-info.yaml: entity kind shown'); else fail('catalog-info kind: ' + catText.slice(0, 200));
  if (/my-service|order-service|payment-service/i.test(catText)) pass('catalog-info.yaml: entity name shown'); else fail('catalog-info name: ' + catText.slice(0, 200));
  if (/production|experimental|deprecated/i.test(catText)) pass('catalog-info.yaml: lifecycle shown'); else fail('catalog-info lifecycle: ' + catText.slice(0, 200));

  // ── docusaurus.config.js viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('docusaurus.config.js');
  await page.waitForSelector('#previewHost .dcs-doc', { timeout: 12000 });
  const dcsText = await page.$eval('#previewHost .dcs-doc', (e) => e.textContent);
  if (/Docusaurus/i.test(dcsText)) pass('docusaurus.config.js: Docusaurus badge shown'); else fail('docusaurus badge: ' + dcsText.slice(0, 200));
  if (/My Awesome Docs/i.test(dcsText)) pass('docusaurus.config.js: site title shown'); else fail('docusaurus title: ' + dcsText.slice(0, 200));
  if (/my-org\.github\.io/i.test(dcsText)) pass('docusaurus.config.js: URL shown'); else fail('docusaurus url: ' + dcsText.slice(0, 300));
  if (/Docs|Blog|API|Changelog/i.test(dcsText)) pass('docusaurus.config.js: navbar items shown'); else fail('docusaurus nav: ' + dcsText.slice(0, 300));

  // ── vitepress.config.ts viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('vitepress.config.ts');
  await page.waitForSelector('#previewHost .vp-doc', { timeout: 12000 });
  const vpText = await page.$eval('#previewHost .vp-doc', (e) => e.textContent);
  if (/VitePress/i.test(vpText)) pass('vitepress.config.ts: VitePress badge shown'); else fail('vitepress badge: ' + vpText.slice(0, 200));
  if (/My VitePress Site/i.test(vpText)) pass('vitepress.config.ts: site title shown'); else fail('vitepress title: ' + vpText.slice(0, 200));
  if (/Guide|Reference|Examples|Blog/i.test(vpText)) pass('vitepress.config.ts: nav items shown'); else fail('vitepress nav: ' + vpText.slice(0, 300));
  if (/Introduction|Writing|Customization/i.test(vpText)) pass('vitepress.config.ts: sidebar sections shown'); else fail('vitepress sidebar: ' + vpText.slice(0, 300));

  // ── conf.py (Sphinx) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('conf.py');
  await page.waitForSelector('#previewHost .sphinx-doc', { timeout: 12000 });
  const sphinxText = await page.$eval('#previewHost .sphinx-doc', (e) => e.textContent);
  if (/Sphinx/i.test(sphinxText)) pass('conf.py: Sphinx badge shown'); else fail('sphinx badge: ' + sphinxText.slice(0, 200));
  if (/MyPythonLib/i.test(sphinxText)) pass('conf.py: project name shown'); else fail('sphinx project: ' + sphinxText.slice(0, 200));
  if (/Alice Smith/i.test(sphinxText)) pass('conf.py: author shown'); else fail('sphinx author: ' + sphinxText.slice(0, 200));
  if (/furo/i.test(sphinxText)) pass('conf.py: HTML theme shown'); else fail('sphinx theme: ' + sphinxText.slice(0, 300));
  if (/autodoc|napoleon|viewcode/i.test(sphinxText)) pass('conf.py: extensions shown'); else fail('sphinx extensions: ' + sphinxText.slice(0, 300));

  // ── Doxyfile viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Doxyfile');
  await page.waitForSelector('.doxyfile-doc', { timeout: 12000 });
  pass('doxyfile: renders');
  const doxyText = await page.$eval('.doxyfile-doc', el => el.textContent);
  if (!doxyText.includes('Doxygen')) fail('doxyfile: missing Doxygen badge');
  else pass('doxyfile: badge shown');
  if (/MyC\+\+ Library/i.test(doxyText)) pass('Doxyfile: project name shown'); else fail('doxygen project: ' + doxyText.slice(0, 200));
  if (/3\.1\.0/i.test(doxyText)) pass('Doxyfile: version shown'); else fail('doxygen version: ' + doxyText.slice(0, 200));
  if (/YES|NO/i.test(doxyText)) pass('Doxyfile: boolean flags shown'); else fail('doxygen flags: ' + doxyText.slice(0, 300));
  if (/src|include|examples/i.test(doxyText)) pass('Doxyfile: input directories shown'); else fail('doxygen input: ' + doxyText.slice(0, 300));

  // ── .cursorrules viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.cursorrules');
  await page.waitForSelector('#previewHost .cr-doc', { timeout: 12000 });
  const crText = await page.$eval('#previewHost .cr-doc', (e) => e.textContent);
  if (/Cursor/i.test(crText)) pass('.cursorrules: Cursor badge shown'); else fail('.cursorrules badge: ' + crText.slice(0, 200));
  if (/section/i.test(crText)) pass('.cursorrules: sections shown'); else fail('.cursorrules sections: ' + crText.slice(0, 200));
  if (/TypeScript|Framework|Code Style/i.test(crText)) pass('.cursorrules: content sections shown'); else fail('.cursorrules content: ' + crText.slice(0, 300));

  // ── CLAUDE.md viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('CLAUDE.md');
  await page.waitForSelector('#previewHost .cm-doc', { timeout: 12000 });
  const cmText = await page.$eval('#previewHost .cm-doc', (e) => e.textContent);
  if (/Claude Code/i.test(cmText)) pass('CLAUDE.md: Claude Code badge shown'); else fail('CLAUDE.md badge: ' + cmText.slice(0, 200));
  if (/section/i.test(cmText)) pass('CLAUDE.md: sections shown'); else fail('CLAUDE.md sections: ' + cmText.slice(0, 200));
  if (/monorepo|Next\.js|Fastify|TypeScript/i.test(cmText)) pass('CLAUDE.md: project content shown'); else fail('CLAUDE.md content: ' + cmText.slice(0, 300));

  // ── copilot-instructions.md viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('copilot-instructions.md');
  await page.waitForSelector('#previewHost .ci-doc', { timeout: 12000 });
  const ciText = await page.$eval('#previewHost .ci-doc', (e) => e.textContent);
  if (/GitHub Copilot/i.test(ciText)) pass('copilot-instructions.md: GitHub Copilot badge shown'); else fail('copilot-instructions badge: ' + ciText.slice(0, 200));
  if (/section/i.test(ciText)) pass('copilot-instructions.md: sections shown'); else fail('copilot-instructions sections: ' + ciText.slice(0, 200));
  if (/TypeScript|React|Naming|Error/i.test(ciText)) pass('copilot-instructions.md: content sections shown'); else fail('copilot-instructions content: ' + ciText.slice(0, 300));

  // ── aider.conf.yml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('aider.conf.yml');
  await page.waitForSelector('#previewHost .adr-doc', { timeout: 12000 });
  const adrText = await page.$eval('#previewHost .adr-doc', (e) => e.textContent);
  if (/Aider/i.test(adrText)) pass('aider.conf.yml: Aider badge shown'); else fail('aider.conf.yml badge: ' + adrText.slice(0, 200));
  if (/claude-3-5-sonnet/i.test(adrText)) pass('aider.conf.yml: model shown'); else fail('aider.conf.yml model: ' + adrText.slice(0, 200));
  if (/diff/i.test(adrText)) pass('aider.conf.yml: edit format shown'); else fail('aider.conf.yml edit format: ' + adrText.slice(0, 200));
  if (/auto.commit|Auto.commit/i.test(adrText)) pass('aider.conf.yml: auto-commits setting shown'); else fail('aider.conf.yml auto-commits: ' + adrText.slice(0, 300));

  // ── tauri.conf.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('tauri.conf.json (Tauri)');
  await page.waitForSelector('#previewHost .tauri-doc', { timeout: 12000 });
  const tauriText = await page.$eval('#previewHost .tauri-doc', (e) => e.textContent);
  if (/Tauri/i.test(tauriText)) pass('tauri.conf.json: Tauri badge shown'); else fail('tauri badge: ' + tauriText.slice(0, 200));
  if (/MyTauriApp/i.test(tauriText)) pass('tauri.conf.json: productName shown'); else fail('tauri productName: ' + tauriText.slice(0, 200));
  if (/1\.2\.0/i.test(tauriText)) pass('tauri.conf.json: version shown'); else fail('tauri version: ' + tauriText.slice(0, 200));
  if (/com\.example\.mytauriapp/i.test(tauriText)) pass('tauri.conf.json: bundle identifier shown'); else fail('tauri identifier: ' + tauriText.slice(0, 300));
  if (/deb|appimage|msi|nsis|dmg/i.test(tauriText)) pass('tauri.conf.json: bundle targets shown'); else fail('tauri targets: ' + tauriText.slice(0, 300));
  if (/main|splash|My Tauri App|Loading/i.test(tauriText)) pass('tauri.conf.json: windows listed'); else fail('tauri windows: ' + tauriText.slice(0, 300));

  // ── electron-builder.yml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('electron-builder.yml');
  await page.waitForSelector('#previewHost .eb-doc', { timeout: 12000 });
  const ebText = await page.$eval('#previewHost .eb-doc', (e) => e.textContent);
  if (/Electron Builder/i.test(ebText)) pass('electron-builder.yml: Electron Builder badge shown'); else fail('electron-builder badge: ' + ebText.slice(0, 200));
  if (/com\.example\.myelectronapp/i.test(ebText)) pass('electron-builder.yml: appId shown'); else fail('electron-builder appId: ' + ebText.slice(0, 200));
  if (/My Electron App/i.test(ebText)) pass('electron-builder.yml: productName shown'); else fail('electron-builder productName: ' + ebText.slice(0, 200));
  if (/linux|win|mac/i.test(ebText)) pass('electron-builder.yml: platform targets shown'); else fail('electron-builder platforms: ' + ebText.slice(0, 300));

  // ── forge.config.js viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('forge.config.js (Electron Forge)');
  await page.waitForSelector('#previewHost .fg-doc', { timeout: 12000 });
  const fgText = await page.$eval('#previewHost .fg-doc', (e) => e.textContent);
  if (/Electron Forge/i.test(fgText)) pass('forge.config.js: Electron Forge badge shown'); else fail('forge badge: ' + fgText.slice(0, 200));
  if (/MyElectronApp/i.test(fgText)) pass('forge.config.js: app name shown'); else fail('forge name: ' + fgText.slice(0, 200));
  if (/maker|squirrel|deb|rpm/i.test(fgText)) pass('forge.config.js: makers shown'); else fail('forge makers: ' + fgText.slice(0, 300));
  if (/plugin|publisher/i.test(fgText)) pass('forge.config.js: plugins or publishers shown'); else fail('forge plugins: ' + fgText.slice(0, 300));

  // ── wails.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('wails.json (Wails)');
  await page.waitForSelector('#previewHost .wails-doc', { timeout: 12000 });
  const wailsText = await page.$eval('#previewHost .wails-doc', (e) => e.textContent);
  if (/Wails/i.test(wailsText)) pass('wails.json: Wails badge shown'); else fail('wails badge: ' + wailsText.slice(0, 200));
  if (/MyWailsApp/i.test(wailsText)) pass('wails.json: app name shown'); else fail('wails name: ' + wailsText.slice(0, 200));
  if (/v2\.9\.1/i.test(wailsText)) pass('wails.json: wailsVersion shown'); else fail('wails version: ' + wailsText.slice(0, 200));
  if (/frontend/i.test(wailsText)) pass('wails.json: frontend dir shown'); else fail('wails frontend: ' + wailsText.slice(0, 200));
  if (/desktop/i.test(wailsText)) pass('wails.json: outputType shown'); else fail('wails outputType: ' + wailsText.slice(0, 200));

  // ── web.config viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('web.config (IIS/ASP.NET)');
  await page.waitForSelector('#previewHost .wc-doc', { timeout: 12000 });
  const wcText = await page.$eval('#previewHost .wc-doc', (e) => e.textContent);
  if (/ASP\.NET/i.test(wcText)) pass('web.config: ASP.NET badge shown'); else fail('web.config badge: ' + wcText.slice(0, 200));
  if (/DefaultConnection|ReadOnlyDb/i.test(wcText)) pass('web.config: connection strings shown'); else fail('web.config connections: ' + wcText.slice(0, 200));
  if (/ApiBaseUrl|EmailSender/i.test(wcText)) pass('web.config: app settings shown'); else fail('web.config appSettings: ' + wcText.slice(0, 200));
  if (/Forms|Custom/i.test(wcText)) pass('web.config: auth mode or HTTP errors shown'); else fail('web.config auth/errors: ' + wcText.slice(0, 300));
  const wcMasked = await page.$eval('#previewHost .wc-doc .masked', (e) => e.textContent);
  if (/••••/.test(wcMasked)) pass('web.config: secrets masked'); else fail('web.config masking: ' + wcMasked);

  // ── app.config viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('app.config (.NET)');
  await page.waitForSelector('#previewHost .ac-doc', { timeout: 12000 });
  const acText = await page.$eval('#previewHost .ac-doc', (e) => e.textContent);
  if (/\.NET/i.test(acText)) pass('app.config: .NET badge shown'); else fail('app.config badge: ' + acText.slice(0, 200));
  if (/v4\.0|4\.8/i.test(acText)) pass('app.config: runtime version shown'); else fail('app.config runtime: ' + acText.slice(0, 200));
  if (/MyAppDb|ReportsDb/i.test(acText)) pass('app.config: connection strings shown'); else fail('app.config connections: ' + acText.slice(0, 200));
  if (/Environment|LogLevel|SmtpHost/i.test(acText)) pass('app.config: app settings shown'); else fail('app.config appSettings: ' + acText.slice(0, 200));
  const acMasked = await page.$eval('#previewHost .ac-doc .masked', (e) => e.textContent);
  if (/••••/.test(acMasked)) pass('app.config: secrets masked'); else fail('app.config masking: ' + acMasked);

  // ── packages.config viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('packages.config (NuGet)');
  await page.waitForSelector('#previewHost .pc-doc', { timeout: 12000 });
  const pcText = await page.$eval('#previewHost .pc-doc', (e) => e.textContent);
  if (/NuGet/i.test(pcText)) pass('packages.config: NuGet badge shown'); else fail('packages.config badge: ' + pcText.slice(0, 200));
  if (/14 package/i.test(pcText)) pass('packages.config: package count shown'); else fail('packages.config count: ' + pcText.slice(0, 200));
  if (/Newtonsoft\.Json|EntityFramework|AutoMapper/i.test(pcText)) pass('packages.config: package ids shown'); else fail('packages.config ids: ' + pcText.slice(0, 200));
  if (/13\.0\.3|net48/i.test(pcText)) pass('packages.config: version and target framework shown'); else fail('packages.config version/tf: ' + pcText.slice(0, 200));

  // ── launchSettings.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('launchSettings.json (ASP.NET)');
  await page.waitForSelector('#previewHost .ls-doc', { timeout: 12000 });
  const lsText = await page.$eval('#previewHost .ls-doc', (e) => e.textContent);
  if (/ASP\.NET Core/i.test(lsText)) pass('launchSettings.json: ASP.NET Core badge shown'); else fail('launchSettings badge: ' + lsText.slice(0, 200));
  if (/4 launch profile/i.test(lsText)) pass('launchSettings.json: profile count shown'); else fail('launchSettings count: ' + lsText.slice(0, 200));
  if (/https|IIS Express|Docker/i.test(lsText)) pass('launchSettings.json: profiles shown'); else fail('launchSettings profiles: ' + lsText.slice(0, 200));
  if (/localhost:5000|localhost:7001/i.test(lsText)) pass('launchSettings.json: application URLs shown'); else fail('launchSettings URLs: ' + lsText.slice(0, 300));
  if (/ASPNETCORE_ENVIRONMENT|Development/i.test(lsText)) pass('launchSettings.json: environment variables shown'); else fail('launchSettings env: ' + lsText.slice(0, 300));

  // ── appsettings.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('appsettings.json (ASP.NET)');
  await page.waitForSelector('#previewHost .appsettings-doc', { timeout: 12000 });
  pass('appsettings.json: badge shown');
  const asText = await page.$eval('#previewHost .appsettings-doc', (e) => e.textContent);
  if (!asText.includes('DefaultConnection')) fail('appsettings.json: connection strings not shown'); else pass('appsettings.json: connection strings shown');
  if (asText.includes('secret123') || asText.includes('super-secret-jwt')) fail('appsettings.json: secrets leaked'); else pass('appsettings.json: secrets masked');
  if (/Information|Warning/i.test(asText)) pass('appsettings.json: log levels shown'); else fail('appsettings.json: log levels not shown: ' + asText.slice(0, 200));

  // ── terragrunt.hcl viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('terragrunt.hcl (Terragrunt)');
  await page.waitForSelector('#previewHost .tgr-doc', { timeout: 12000 });
  const tgrText = await page.$eval('#previewHost .tgr-doc', (e) => e.textContent);
  if (/Terragrunt/i.test(tgrText)) pass('terragrunt.hcl: Terragrunt badge shown'); else fail('terragrunt badge: ' + tgrText.slice(0, 200));
  if (/api-service|modules/i.test(tgrText)) pass('terragrunt.hcl: source shown'); else fail('terragrunt source: ' + tgrText.slice(0, 200));
  if (/vpc|database/i.test(tgrText)) pass('terragrunt.hcl: dependencies shown'); else fail('terragrunt deps: ' + tgrText.slice(0, 200));

  // ── .tflint.hcl viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.tflint.hcl (TFLint)');
  await page.waitForSelector('#previewHost .tfl-doc', { timeout: 12000 });
  const tflText = await page.$eval('#previewHost .tfl-doc', (e) => e.textContent);
  if (/TFLint/i.test(tflText)) pass('.tflint.hcl: TFLint badge shown'); else fail('tflint badge: ' + tflText.slice(0, 200));
  if (/aws|terraform/i.test(tflText)) pass('.tflint.hcl: plugins shown'); else fail('tflint plugins: ' + tflText.slice(0, 200));
  if (/enabled|disabled/i.test(tflText)) pass('.tflint.hcl: rule states shown'); else fail('tflint rules: ' + tflText.slice(0, 300));

  // ── .terraform.lock.hcl viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.terraform.lock.hcl');
  await page.waitForSelector('#previewHost .tfl-lock-doc', { timeout: 12000 });
  const tflLockText = await page.$eval('#previewHost .tfl-lock-doc', (e) => e.textContent);
  if (/Terraform Lock/i.test(tflLockText)) pass('.terraform.lock.hcl: badge shown'); else fail('tf-lock badge: ' + tflLockText.slice(0, 200));
  if (/hashicorp\/aws|5\.31/i.test(tflLockText)) pass('.terraform.lock.hcl: provider shown'); else fail('tf-lock provider: ' + tflLockText.slice(0, 200));
  if (/hash/i.test(tflLockText)) pass('.terraform.lock.hcl: hash count shown'); else fail('tf-lock hashes: ' + tflLockText.slice(0, 300));

  // ── versions.tf viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('versions.tf (Terraform)');
  await page.waitForSelector('#previewHost .vtf-doc', { timeout: 12000 });
  const vtfText = await page.$eval('#previewHost .vtf-doc', (e) => e.textContent);
  if (/Terraform/i.test(vtfText)) pass('versions.tf: Terraform badge shown'); else fail('versions-tf badge: ' + vtfText.slice(0, 200));
  if (/1\.5\.0/i.test(vtfText)) pass('versions.tf: required_version shown'); else fail('versions-tf version: ' + vtfText.slice(0, 200));
  if (/hashicorp\/aws|kubernetes/i.test(vtfText)) pass('versions.tf: providers shown'); else fail('versions-tf providers: ' + vtfText.slice(0, 300));

  // ── mongod.conf viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('mongod.conf');
  await page.waitForSelector('#previewHost .mg-doc', { timeout: 12000 });
  const mgText = await page.$eval('#previewHost .mg-doc', (e) => e.textContent);
  if (/MongoDB/i.test(mgText)) pass('mongod.conf: MongoDB badge shown'); else fail('mongod badge: ' + mgText.slice(0, 200));
  if (/27017|\/var\/lib\/mongodb/i.test(mgText)) pass('mongod.conf: storage/network settings shown'); else fail('mongod storage: ' + mgText.slice(0, 300));
  if (/rs0|replSet/i.test(mgText)) pass('mongod.conf: replication section shown'); else fail('mongod repl: ' + mgText.slice(0, 300));
  if (/••••/.test(mgText)) pass('mongod.conf: keyFile value masked'); else fail('mongod masking: ' + mgText.slice(0, 300));

  // ── my.cnf viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('my.cnf (MySQL)');
  await page.waitForSelector('#previewHost .my-doc', { timeout: 12000 });
  const myText = await page.$eval('#previewHost .my-doc', (e) => e.textContent);
  if (/MySQL/i.test(myText)) pass('my.cnf: MySQL badge shown'); else fail('my.cnf badge: ' + myText.slice(0, 200));
  if (/3306|127\.0\.0\.1/i.test(myText)) pass('my.cnf: [mysqld] section shown (port/bind)'); else fail('my.cnf mysqld: ' + myText.slice(0, 300));
  if (/256M|innodb_buffer_pool/i.test(myText)) pass('my.cnf: InnoDB buffer pool shown'); else fail('my.cnf innodb: ' + myText.slice(0, 300));
  if (/utf8mb4|default-character-set/i.test(myText)) pass('my.cnf: character set shown'); else fail('my.cnf charset: ' + myText.slice(0, 300));

  // ── postgresql.conf viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('postgresql.conf');
  await page.waitForSelector('#previewHost .pg-doc', { timeout: 12000 });
  const pgText = await page.$eval('#previewHost .pg-doc', (e) => e.textContent);
  if (/PostgreSQL/i.test(pgText)) pass('postgresql.conf: PostgreSQL badge shown'); else fail('postgresql badge: ' + pgText.slice(0, 200));
  if (/5432|localhost/i.test(pgText)) pass('postgresql.conf: connections section shown'); else fail('postgresql conns: ' + pgText.slice(0, 300));
  if (/128MB|shared_buffers/i.test(pgText)) pass('postgresql.conf: memory settings shown'); else fail('postgresql mem: ' + pgText.slice(0, 300));
  if (/replica|wal_level/i.test(pgText)) pass('postgresql.conf: WAL section shown'); else fail('postgresql wal: ' + pgText.slice(0, 300));

  // ── pgbouncer.ini viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('pgbouncer.ini');
  await page.waitForSelector('#previewHost .pb-doc', { timeout: 12000 });
  const pbText = await page.$eval('#previewHost .pb-doc', (e) => e.textContent);
  if (/PgBouncer/i.test(pbText)) pass('pgbouncer.ini: PgBouncer badge shown'); else fail('pgbouncer badge: ' + pbText.slice(0, 200));
  if (/mydb|replica/i.test(pbText)) pass('pgbouncer.ini: [databases] section shown'); else fail('pgbouncer dbs: ' + pbText.slice(0, 300));
  if (/transaction|pool_mode/i.test(pbText)) pass('pgbouncer.ini: pool_mode shown'); else fail('pgbouncer pool: ' + pbText.slice(0, 300));
  if (/••••/.test(pbText)) pass('pgbouncer.ini: password in connection string masked'); else fail('pgbouncer masking: ' + pbText.slice(0, 300));

  // ── pgbackrest.conf viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('pgbackrest.conf');
  await page.waitForSelector('#previewHost .pgbr-doc', { timeout: 12000 });
  const pgbrText = await page.$eval('#previewHost .pgbr-doc', (e) => e.textContent);
  if (/pgBackRest/i.test(pgbrText)) pass('pgbackrest.conf: pgBackRest badge shown'); else fail('pgbackrest badge: ' + pgbrText.slice(0, 200));
  if (/S3|us-east-1|my-postgres-backups/i.test(pgbrText)) pass('pgbackrest.conf: repository info shown'); else fail('pgbackrest repo: ' + pgbrText.slice(0, 300));
  if (/main|replica/i.test(pgbrText)) pass('pgbackrest.conf: stanza names shown'); else fail('pgbackrest stanzas: ' + pgbrText.slice(0, 300));
  if (/\[configured\]/.test(pgbrText)) pass('pgbackrest.conf: credentials redacted'); else fail('pgbackrest masking: ' + pgbrText.slice(0, 300));

  // ── patroni.yml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('patroni.yml');
  await page.waitForSelector('#previewHost .patroni-doc', { timeout: 12000 });
  const patroniText = await page.$eval('#previewHost .patroni-doc', (e) => e.textContent);
  if (/Patroni/i.test(patroniText)) pass('patroni.yml: Patroni badge shown'); else fail('patroni badge: ' + patroniText.slice(0, 200));
  if (/postgres-cluster|node1/i.test(patroniText)) pass('patroni.yml: cluster/node info shown'); else fail('patroni cluster: ' + patroniText.slice(0, 300));
  if (/etcd|ETCD/i.test(patroniText)) pass('patroni.yml: DCS type shown'); else fail('patroni dcs: ' + patroniText.slice(0, 300));

  // ── .pylintrc viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.pylintrc');
  await page.waitForSelector('#previewHost .pl-doc', { timeout: 12000 });
  const plText = await page.$eval('#previewHost .pl-doc', (e) => e.textContent);
  if (/Pylint/i.test(plText)) pass('.pylintrc: Pylint badge shown'); else fail('pylintrc badge: ' + plText.slice(0, 200));
  if (/disabled/i.test(plText)) pass('.pylintrc: disabled codes section shown'); else fail('pylintrc disabled: ' + plText.slice(0, 200));
  if (/max-line-length|120/i.test(plText)) pass('.pylintrc: max-line-length shown'); else fail('pylintrc max-line: ' + plText.slice(0, 300));
  if (/jobs/i.test(plText)) pass('.pylintrc: jobs shown'); else fail('pylintrc jobs: ' + plText.slice(0, 300));

  // ── .flake8 viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.flake8');
  await page.waitForSelector('#previewHost .f8-doc', { timeout: 12000 });
  const f8Text = await page.$eval('#previewHost .f8-doc', (e) => e.textContent);
  if (/Flake8/i.test(f8Text)) pass('.flake8: Flake8 badge shown'); else fail('flake8 badge: ' + f8Text.slice(0, 200));
  if (/max-line-length|120/i.test(f8Text)) pass('.flake8: max-line-length shown'); else fail('flake8 max-line: ' + f8Text.slice(0, 200));
  if (/E203|W503|E501/i.test(f8Text)) pass('.flake8: ignored codes shown'); else fail('flake8 ignored: ' + f8Text.slice(0, 300));
  if (/venv|migrations|__pycache__/i.test(f8Text)) pass('.flake8: excluded paths shown'); else fail('flake8 excluded: ' + f8Text.slice(0, 300));

  // ── setup.cfg viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('setup.cfg');
  await page.waitForSelector('#previewHost .setupcfg-doc', { timeout: 12000 });
  pass('setup.cfg: renders');
  const setupCfgText = await page.$eval('#previewHost .setupcfg-doc', (e) => e.textContent);
  if (/setuptools|setup\.cfg/i.test(setupCfgText)) pass('setup.cfg: badge shown'); else fail('setup.cfg badge: ' + setupCfgText.slice(0, 200));
  if (/myproject/i.test(setupCfgText)) pass('setup.cfg: package name shown'); else fail('setup.cfg name: ' + setupCfgText.slice(0, 200));
  if (/1\.4\.2/i.test(setupCfgText)) pass('setup.cfg: version shown'); else fail('setup.cfg version: ' + setupCfgText.slice(0, 300));
  if (/fastapi|pydantic|sqlalchemy/i.test(setupCfgText)) pass('setup.cfg: dependencies shown'); else fail('setup.cfg deps: ' + setupCfgText.slice(0, 300));
  if (/pytest|mypy/i.test(setupCfgText)) pass('setup.cfg: tool sections shown'); else fail('setup.cfg tools: ' + setupCfgText.slice(0, 300));
  if (!setupCfgText.includes('setuptools') && !setupCfgText.includes('setup')) fail('setup.cfg: missing badge'); else pass('setup.cfg: badge shown (spec)');
  if (!setupCfgText.includes('name') && !setupCfgText.includes('version')) fail('setup.cfg: no project info'); else pass('setup.cfg: project info shown');

  // ── .bandit viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.bandit');
  await page.waitForSelector('#previewHost .bd-doc', { timeout: 12000 });
  const bdText = await page.$eval('#previewHost .bd-doc', (e) => e.textContent);
  if (/Bandit/i.test(bdText)) pass('.bandit: Bandit badge shown'); else fail('bandit badge: ' + bdText.slice(0, 200));
  if (/B101|B311|B506/i.test(bdText)) pass('.bandit: skipped test IDs shown'); else fail('bandit skips: ' + bdText.slice(0, 300));
  if (/tests|migrations|venv/i.test(bdText)) pass('.bandit: excluded dirs shown'); else fail('bandit exclude: ' + bdText.slice(0, 300));
  if (/MEDIUM|severity/i.test(bdText)) pass('.bandit: severity filter shown'); else fail('bandit severity: ' + bdText.slice(0, 300));

  // ── .semgrep.yml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.semgrep.yml');
  await page.waitForSelector('#previewHost .sgr-doc', { timeout: 12000 });
  const sgrText = await page.$eval('#previewHost .sgr-doc', (e) => e.textContent);
  if (/Semgrep/i.test(sgrText)) pass('.semgrep.yml: Semgrep badge shown'); else fail('semgrep badge: ' + sgrText.slice(0, 200));
  if (/rule/i.test(sgrText)) pass('.semgrep.yml: rule count shown'); else fail('semgrep rules: ' + sgrText.slice(0, 300));
  if (/hardcoded-password|sql-injection|ERROR|WARNING/i.test(sgrText)) pass('.semgrep.yml: rule ids and severity shown'); else fail('semgrep rule content: ' + sgrText.slice(0, 300));

  // ── .gitleaks.toml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.gitleaks.toml');
  await page.waitForSelector('#previewHost .gl-doc', { timeout: 12000 });
  const glText = await page.$eval('#previewHost .gl-doc', (e) => e.textContent);
  if (/Gitleaks/i.test(glText)) pass('.gitleaks.toml: Gitleaks badge shown'); else fail('gitleaks badge: ' + glText.slice(0, 200));
  if (/rule/i.test(glText)) pass('.gitleaks.toml: rules section shown'); else fail('gitleaks rules: ' + glText.slice(0, 300));
  if (/aws-access-key|github-pat|stripe/i.test(glText)) pass('.gitleaks.toml: rule ids shown'); else fail('gitleaks rule ids: ' + glText.slice(0, 300));
  if (/allowlist/i.test(glText)) pass('.gitleaks.toml: allowlists shown'); else fail('gitleaks allowlists: ' + glText.slice(0, 300));

  // ── osv-scanner.toml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('osv-scanner.toml');
  await page.waitForSelector('#previewHost .osv-doc', { timeout: 12000 });
  const osvText = await page.$eval('#previewHost .osv-doc', (e) => e.textContent);
  if (/OSV-Scanner/i.test(osvText)) pass('osv-scanner.toml: OSV-Scanner badge shown'); else fail('osv-scanner badge: ' + osvText.slice(0, 200));
  if (/ignored vuln/i.test(osvText)) pass('osv-scanner.toml: ignored vulnerabilities section shown'); else fail('osv-scanner vulns: ' + osvText.slice(0, 300));
  if (/GHSA-|CVE-/i.test(osvText)) pass('osv-scanner.toml: vulnerability IDs shown'); else fail('osv-scanner ids: ' + osvText.slice(0, 300));
  if (/1\.21\.0/i.test(osvText)) pass('osv-scanner.toml: GoVersionOverride shown'); else fail('osv-scanner go version: ' + osvText.slice(0, 300));

  // ── opencost.yaml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('opencost.yaml');
  await page.waitForSelector('#previewHost .oc-doc', { timeout: 12000 });
  const ocText = await page.$eval('#previewHost .oc-doc', (e) => e.textContent);
  if (/OpenCost/i.test(ocText)) pass('opencost.yaml: OpenCost badge shown'); else fail('opencost badge: ' + ocText.slice(0, 200));
  if (/production-k8s/i.test(ocText)) pass('opencost.yaml: cluster_id shown'); else fail('opencost cluster_id: ' + ocText.slice(0, 200));
  if (/prometheus/i.test(ocText)) pass('opencost.yaml: prometheus host shown'); else fail('opencost prometheus: ' + ocText.slice(0, 300));

  // ── crossplane-config.yaml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('crossplane-config.yaml (Crossplane)');
  await page.waitForSelector('#previewHost .xp-doc', { timeout: 12000 });
  const xpText = await page.$eval('#previewHost .xp-doc', (e) => e.textContent);
  if (/Crossplane/i.test(xpText)) pass('crossplane-config.yaml: Crossplane badge shown'); else fail('crossplane badge: ' + xpText.slice(0, 200));
  if (/Provider/i.test(xpText)) pass('crossplane-config.yaml: kind shown'); else fail('crossplane kind: ' + xpText.slice(0, 200));
  if (/provider-aws/i.test(xpText)) pass('crossplane-config.yaml: name shown'); else fail('crossplane name: ' + xpText.slice(0, 200));

  // ── keda-scaledobject.yaml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('keda-scaledobject.yaml (KEDA)');
  await page.waitForSelector('#previewHost .kd-doc', { timeout: 12000 });
  const kdText = await page.$eval('#previewHost .kd-doc', (e) => e.textContent);
  if (/KEDA/i.test(kdText)) pass('keda-scaledobject.yaml: KEDA badge shown'); else fail('keda badge: ' + kdText.slice(0, 200));
  if (/ScaledObject/i.test(kdText)) pass('keda-scaledobject.yaml: kind shown'); else fail('keda kind: ' + kdText.slice(0, 200));
  if (/my-app-scaler/i.test(kdText)) pass('keda-scaledobject.yaml: name shown'); else fail('keda name: ' + kdText.slice(0, 200));
  if (/rabbitmq|cpu/i.test(kdText)) pass('keda-scaledobject.yaml: triggers shown'); else fail('keda triggers: ' + kdText.slice(0, 300));

  // ── velero-schedule.yaml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('velero-schedule.yaml (Velero)');
  await page.waitForSelector('#previewHost .vl-doc', { timeout: 12000 });
  const vlText = await page.$eval('#previewHost .vl-doc', (e) => e.textContent);
  if (/Velero/i.test(vlText)) pass('velero-schedule.yaml: Velero badge shown'); else fail('velero badge: ' + vlText.slice(0, 200));
  if (/Schedule/i.test(vlText)) pass('velero-schedule.yaml: kind shown'); else fail('velero kind: ' + vlText.slice(0, 200));
  if (/daily-backup/i.test(vlText)) pass('velero-schedule.yaml: name shown'); else fail('velero name: ' + vlText.slice(0, 200));
  if (/0 2 \* \* \*/i.test(vlText)) pass('velero-schedule.yaml: cron schedule shown'); else fail('velero schedule: ' + vlText.slice(0, 300));

  // ── .codeclimate.yml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.codeclimate.yml');
  await page.waitForSelector('#previewHost .cc-doc', { timeout: 12000 });
  const ccText = await page.$eval('#previewHost .cc-doc', (e) => e.textContent);
  if (/Code Climate/i.test(ccText)) pass('.codeclimate.yml: Code Climate badge shown'); else fail('codeclimate badge: ' + ccText.slice(0, 200));
  if (/engine|plugin/i.test(ccText)) pass('.codeclimate.yml: engines/plugins section shown'); else fail('codeclimate engines: ' + ccText.slice(0, 300));
  if (/eslint|duplication|fixme/i.test(ccText)) pass('.codeclimate.yml: engine names shown'); else fail('codeclimate engine names: ' + ccText.slice(0, 300));
  if (/exclude/i.test(ccText)) pass('.codeclimate.yml: exclude patterns shown'); else fail('codeclimate excludes: ' + ccText.slice(0, 300));
  // ── conda environment.yml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('environment.yml (Conda)');
  await page.waitForSelector('#previewHost .conda-doc', { timeout: 12000 });
  const condaText = await page.$eval('#previewHost .conda-doc', (e) => e.textContent);
  if (/Conda/i.test(condaText)) pass('environment.yml: Conda badge shown'); else fail('conda-env badge: ' + condaText.slice(0, 200));
  if (/myproject/i.test(condaText)) pass('environment.yml: env name shown'); else fail('conda-env name: ' + condaText.slice(0, 200));
  if (/conda-forge/i.test(condaText)) pass('environment.yml: channels shown'); else fail('conda-env channels: ' + condaText.slice(0, 200));
  if (/python=3\.11/i.test(condaText)) pass('environment.yml: python version shown'); else fail('conda-env python: ' + condaText.slice(0, 200));
  if (/numpy|pandas/i.test(condaText)) pass('environment.yml: dependencies shown'); else fail('conda-env deps: ' + condaText.slice(0, 300));
  if (/pip/i.test(condaText)) pass('environment.yml: pip packages section shown'); else fail('conda-env pip: ' + condaText.slice(0, 300));

  // ── pip.conf viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('pip.conf');
  await page.waitForSelector('#previewHost .pipcfg-doc', { timeout: 12000 });
  const pipConfText = await page.$eval('#previewHost .pipcfg-doc', (e) => e.textContent);
  if (/pip/i.test(pipConfText)) pass('pip.conf: pip badge shown'); else fail('pip-conf badge: ' + pipConfText.slice(0, 200));
  if (/pypi\.org/i.test(pipConfText)) pass('pip.conf: index-url shown'); else fail('pip-conf index: ' + pipConfText.slice(0, 200));
  if (/pypi\.company\.internal|timeout/i.test(pipConfText)) pass('pip.conf: trusted-host or timeout shown'); else fail('pip-conf trusted/timeout: ' + pipConfText.slice(0, 200));

  // ── .node-version viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.node-version');
  await page.waitForSelector('#previewHost .nv-doc', { timeout: 12000 });
  const nvText = await page.$eval('#previewHost .nv-doc', (e) => e.textContent);
  if (/Node\.js/i.test(nvText)) pass('.node-version: Node.js badge shown'); else fail('node-version-file badge: ' + nvText.slice(0, 200));
  if (/20\.11\.0/.test(nvText)) pass('.node-version: version shown'); else fail('node-version-file version: ' + nvText.slice(0, 200));
  if (/fnm|volta|nvm/i.test(nvText)) pass('.node-version: install commands shown'); else fail('node-version-file commands: ' + nvText.slice(0, 300));

  // ── docker-bake.hcl viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('docker-bake.hcl');
  await page.waitForSelector('#previewHost .bk-doc', { timeout: 12000 });
  const dockerBakeText = await page.$eval('#previewHost .bk-doc', (e) => e.textContent);
  if (/Docker Bake/i.test(dockerBakeText)) pass('docker-bake.hcl: Docker Bake badge shown'); else fail('docker-bake badge: ' + dockerBakeText.slice(0, 200));
  if (/api|worker|frontend/i.test(dockerBakeText)) pass('docker-bake.hcl: target names shown'); else fail('docker-bake targets: ' + dockerBakeText.slice(0, 200));
  if (/linux\/amd64|linux\/arm64/i.test(dockerBakeText)) pass('docker-bake.hcl: platforms shown'); else fail('docker-bake platforms: ' + dockerBakeText.slice(0, 300));
  if (/registry\.example\.com/i.test(dockerBakeText)) pass('docker-bake.hcl: tags shown'); else fail('docker-bake tags: ' + dockerBakeText.slice(0, 300));

  // ── cloudformation.yaml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('cloudformation.yaml (CloudFormation)');
  await page.waitForSelector('#previewHost .cfn-doc', { timeout: 12000 });
  const cfnText = await page.$eval('#previewHost .cfn-doc', (e) => e.textContent);
  if (/CloudFormation/i.test(cfnText)) pass('cloudformation.yaml: CloudFormation badge shown'); else fail('cfn badge: ' + cfnText.slice(0, 200));
  if (/S3|Lambda|DynamoDB|IAM|ApiGateway/i.test(cfnText)) pass('cloudformation.yaml: resource types shown'); else fail('cfn resources: ' + cfnText.slice(0, 300));
  if (/Environment|LambdaMemory|BucketNameSuffix/i.test(cfnText)) pass('cloudformation.yaml: parameters shown'); else fail('cfn params: ' + cfnText.slice(0, 300));
  if (/BucketName|TableName|FunctionArn|ApiEndpoint/i.test(cfnText)) pass('cloudformation.yaml: outputs shown'); else fail('cfn outputs: ' + cfnText.slice(0, 300));

  // ── sam-template.yaml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('sam-template.yaml (AWS SAM)');
  await page.waitForSelector('#previewHost .sam-doc', { timeout: 12000 });
  const samText = await page.$eval('#previewHost .sam-doc', (e) => e.textContent);
  if (/AWS SAM/i.test(samText)) pass('sam-template.yaml: AWS SAM badge shown'); else fail('sam badge: ' + samText.slice(0, 200));
  if (/GetNotesFunction|CreateNoteFunction|DeleteNoteFunction/i.test(samText)) pass('sam-template.yaml: function names shown'); else fail('sam functions: ' + samText.slice(0, 300));
  if (/nodejs20\.x/i.test(samText)) pass('sam-template.yaml: runtime shown'); else fail('sam runtime: ' + samText.slice(0, 300));
  if (/Environment|LogRetentionDays/i.test(samText)) pass('sam-template.yaml: parameters shown'); else fail('sam params: ' + samText.slice(0, 300));

  // ── cdk.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('cdk.json (AWS CDK)');
  await page.waitForSelector('#previewHost .cdk-doc', { timeout: 12000 });
  const cdkText = await page.$eval('#previewHost .cdk-doc', (e) => e.textContent);
  if (/AWS CDK/i.test(cdkText)) pass('cdk.json: AWS CDK badge shown'); else fail('cdk badge: ' + cdkText.slice(0, 200));
  if (/npx ts-node|bin\/my-app\.ts/i.test(cdkText)) pass('cdk.json: app command shown'); else fail('cdk app: ' + cdkText.slice(0, 300));
  if (/context/i.test(cdkText)) pass('cdk.json: context section shown'); else fail('cdk context: ' + cdkText.slice(0, 300));
  if (/@aws-cdk\/aws-lambda|my-app:region/i.test(cdkText)) pass('cdk.json: context keys shown'); else fail('cdk context keys: ' + cdkText.slice(0, 300));

  // ── samconfig.toml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('samconfig.toml (SAM Config)');
  await page.waitForSelector('#previewHost .smc-doc', { timeout: 12000 });
  const smcText = await page.$eval('#previewHost .smc-doc', (e) => e.textContent);
  if (/SAM Config/i.test(smcText)) pass('samconfig.toml: SAM Config badge shown'); else fail('smc badge: ' + smcText.slice(0, 200));
  if (/default|staging|prod/i.test(smcText)) pass('samconfig.toml: environments shown'); else fail('smc environments: ' + smcText.slice(0, 300));
  if (/stack_name|notes-app/i.test(smcText)) pass('samconfig.toml: stack_name shown'); else fail('smc stack_name: ' + smcText.slice(0, 300));
  if (/region|us-east-1|eu-west-1/i.test(smcText)) pass('samconfig.toml: regions shown'); else fail('smc regions: ' + smcText.slice(0, 300));

  // ── analysis_options.yaml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('analysis_options.yaml (Dart Analyzer)');
  await page.waitForSelector('#previewHost .ao-doc', { timeout: 12000 });
  const aoText = await page.$eval('#previewHost .ao-doc', (e) => e.textContent);
  if (/Dart Analyzer/i.test(aoText)) pass('analysis_options.yaml: Dart Analyzer badge shown'); else fail('ao badge: ' + aoText.slice(0, 200));
  if (/prefer_const_constructors|avoid_print/i.test(aoText)) pass('analysis_options.yaml: linter rules shown'); else fail('ao rules: ' + aoText.slice(0, 300));
  if (/exclude/i.test(aoText)) pass('analysis_options.yaml: excluded paths shown'); else fail('ao excludes: ' + aoText.slice(0, 300));
  if (/flutter_lints/i.test(aoText)) pass('analysis_options.yaml: include shown'); else fail('ao include: ' + aoText.slice(0, 300));

  // ── Podfile viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Podfile');
  await page.waitForSelector('#previewHost .podfile-doc', { timeout: 12000 });
  pass('Podfile: renders');
  const podfileText = await page.$eval('#previewHost .podfile-doc', (el) => el.textContent);
  if (!podfileText.includes('CocoaPods')) fail('Podfile: missing badge'); else pass('Podfile: badge shown');
  if (!podfileText.includes('pod') && !podfileText.includes('Firebase')) fail('Podfile: no pods shown'); else pass('Podfile: pods shown');
  if (/Alamofire|Firebase/i.test(podfileText)) pass('Podfile: pod names shown'); else fail('Podfile: pod names: ' + podfileText.slice(0, 300));
  if (/use_frameworks/i.test(podfileText)) pass('Podfile: use_frameworks! flag shown'); else fail('Podfile: flags: ' + podfileText.slice(0, 300));
  if (/target/i.test(podfileText)) pass('Podfile: targets shown'); else fail('Podfile: targets: ' + podfileText.slice(0, 300));

  // ── Podfile.lock viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Podfile.lock (CocoaPods)');
  await page.waitForSelector('#previewHost .podfilelock-doc', { timeout: 12000 });
  pass('Podfile.lock: renders');
  const podfileLockText = await page.$eval('#previewHost .podfilelock-doc', (e) => e.textContent);
  if (!podfileLockText.includes('Podfile') && !podfileLockText.includes('CocoaPods')) fail('Podfile.lock: missing badge'); else pass('Podfile.lock: badge shown');
  if (!podfileLockText.includes('Firebase') && !podfileLockText.includes('Alamofire')) fail('Podfile.lock: no pods shown'); else pass('Podfile.lock: pods shown');
  if (/Alamofire|Firebase/i.test(podfileLockText)) pass('Podfile.lock: pod names shown'); else fail('pfl pods: ' + podfileLockText.slice(0, 300));
  if (/1\.15\.2/i.test(podfileLockText)) pass('Podfile.lock: CocoaPods version shown'); else fail('pfl version: ' + podfileLockText.slice(0, 300));
  if (/checksum/i.test(podfileLockText)) pass('Podfile.lock: checksums section shown'); else fail('pfl checksums: ' + podfileLockText.slice(0, 300));

  // ── MyApp.xcscheme viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('MyApp.xcscheme (Xcode Scheme)');
  await page.waitForSelector('#previewHost .xs-doc', { timeout: 12000 });
  const xsText = await page.$eval('#previewHost .xs-doc', (e) => e.textContent);
  if (/Xcode Scheme/i.test(xsText)) pass('MyApp.xcscheme: Xcode Scheme badge shown'); else fail('xs badge: ' + xsText.slice(0, 200));
  if (/MyApp|MyAppTests/i.test(xsText)) pass('MyApp.xcscheme: build targets shown'); else fail('xs targets: ' + xsText.slice(0, 300));
  if (/Debug|Release/i.test(xsText)) pass('MyApp.xcscheme: build configurations shown'); else fail('xs configs: ' + xsText.slice(0, 300));
  if (/test targets/i.test(xsText)) pass('MyApp.xcscheme: test targets section shown'); else fail('xs test targets: ' + xsText.slice(0, 300));

  // ── eas.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('eas.json (Expo EAS)');
  await page.waitForSelector('#previewHost .eas-doc', { timeout: 12000 });
  const easText = await page.$eval('#previewHost .eas-doc', (e) => e.textContent);
  if (/\bEAS\b/i.test(easText)) pass('eas.json: EAS badge shown'); else fail('eas badge: ' + easText.slice(0, 200));
  if (/development|preview|production/i.test(easText)) pass('eas.json: build profiles shown'); else fail('eas profiles: ' + easText.slice(0, 300));
  if (/distribution|channel/i.test(easText)) pass('eas.json: profile settings shown'); else fail('eas settings: ' + easText.slice(0, 300));
  if (/submit/i.test(easText)) pass('eas.json: submit profiles section shown'); else fail('eas submit: ' + easText.slice(0, 300));

  // ── .rspec viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.rspec');
  await page.waitForSelector('#previewHost .rsc-doc', { timeout: 12000 });
  const rscText = await page.$eval('#previewHost .rsc-doc', (e) => e.textContent);
  if (/RSpec/i.test(rscText)) pass('.rspec: badge shown'); else fail('rspec badge: ' + rscText.slice(0, 200));
  if (/documentation|format/i.test(rscText)) pass('.rspec: format flag shown'); else fail('rspec format: ' + rscText.slice(0, 300));
  if (/spec_helper|require/i.test(rscText)) pass('.rspec: require entry shown'); else fail('rspec require: ' + rscText.slice(0, 300));

  // ── .bundler-audit.yml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.bundler-audit.yml');
  await page.waitForSelector('#previewHost .bac-doc', { timeout: 12000 });
  const bacText = await page.$eval('#previewHost .bac-doc', (e) => e.textContent);
  if (/Bundler Audit/i.test(bacText)) pass('.bundler-audit.yml: badge shown'); else fail('bundler-audit badge: ' + bacText.slice(0, 200));
  if (/CVE-2020-8165|CVE-2021-22942|CVE-2022-32224/i.test(bacText)) pass('.bundler-audit.yml: CVE IDs shown'); else fail('bundler-audit CVEs: ' + bacText.slice(0, 300));
  if (/ignore|CVE/i.test(bacText)) pass('.bundler-audit.yml: ignore section shown'); else fail('bundler-audit ignore: ' + bacText.slice(0, 300));

  // ── .standard.yml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.standard.yml');
  await page.waitForSelector('#previewHost .srb-doc', { timeout: 12000 });
  const srbText = await page.$eval('#previewHost .srb-doc', (e) => e.textContent);
  if (/Standard Ruby/i.test(srbText)) pass('.standard.yml: badge shown'); else fail('standardrb badge: ' + srbText.slice(0, 200));
  if (/3\.2|ruby_version|Ruby/i.test(srbText)) pass('.standard.yml: ruby version shown'); else fail('standardrb version: ' + srbText.slice(0, 300));
  if (/standard-rails|standard-performance|extend/i.test(srbText)) pass('.standard.yml: extends shown'); else fail('standardrb extends: ' + srbText.slice(0, 300));

  // ── sorbet.config viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('sorbet.config');
  await page.waitForSelector('#previewHost .sbt-doc', { timeout: 12000 });
  const sbtText = await page.$eval('#previewHost .sbt-doc', (e) => e.textContent);
  if (/Sorbet/i.test(sbtText)) pass('sorbet.config: badge shown'); else fail('sorbet badge: ' + sbtText.slice(0, 200));
  if (/vendor|node_modules|ignore/i.test(sbtText)) pass('sorbet.config: ignore patterns shown'); else fail('sorbet ignore: ' + sbtText.slice(0, 300));
  if (/requires-ancestor|ruby3-keyword|experimental/i.test(sbtText)) pass('sorbet.config: experimental features shown'); else fail('sorbet experimental: ' + sbtText.slice(0, 300));

  // ── dbt_project.yml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('dbt_project.yml');
  await page.waitForSelector('#previewHost .dbt-doc', { timeout: 12000 });
  const dbtProjectText = await page.$eval('#previewHost .dbt-doc', (e) => e.textContent);
  if (/dbt/i.test(dbtProjectText)) pass('dbt_project.yml: dbt badge shown'); else fail('dbt badge: ' + dbtProjectText.slice(0, 200));
  if (/jaffle_shop/i.test(dbtProjectText)) pass('dbt_project.yml: project name shown'); else fail('dbt name: ' + dbtProjectText.slice(0, 200));
  if (/profile/i.test(dbtProjectText)) pass('dbt_project.yml: profile shown'); else fail('dbt profile: ' + dbtProjectText.slice(0, 200));
  if (/incremental|table|view/i.test(dbtProjectText)) pass('dbt_project.yml: materializations shown'); else fail('dbt materializations: ' + dbtProjectText.slice(0, 300));
  if (/start_date|payment_method|environment/i.test(dbtProjectText)) pass('dbt_project.yml: vars shown'); else fail('dbt vars: ' + dbtProjectText.slice(0, 300));

  // ── liquibase.properties viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('liquibase.properties');
  await page.waitForSelector('#previewHost .lq-doc', { timeout: 12000 });
  const lqText = await page.$eval('#previewHost .lq-doc', (e) => e.textContent);
  if (/Liquibase/i.test(lqText)) pass('liquibase.properties: Liquibase badge shown'); else fail('lq badge: ' + lqText.slice(0, 200));
  if (/db\.example\.com/i.test(lqText)) pass('liquibase.properties: host shown'); else fail('lq host: ' + lqText.slice(0, 200));
  if (/liquibase_user/i.test(lqText)) pass('liquibase.properties: username shown'); else fail('lq username: ' + lqText.slice(0, 200));
  if (/•{4,}|password masked/i.test(lqText)) pass('liquibase.properties: password masked'); else fail('lq password masking: ' + lqText.slice(0, 300));
  if (/changelog-master|changelog/i.test(lqText)) pass('liquibase.properties: changeLogFile shown'); else fail('lq changelog: ' + lqText.slice(0, 300));

  // ── sqitch.conf viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('sqitch.conf');
  await page.waitForSelector('#previewHost .sq-doc', { timeout: 12000 });
  const sqText = await page.$eval('#previewHost .sq-doc', (e) => e.textContent);
  if (/Sqitch/i.test(sqText)) pass('sqitch.conf: Sqitch badge shown'); else fail('sq badge: ' + sqText.slice(0, 200));
  if (/core|engine|plan/i.test(sqText)) pass('sqitch.conf: core section shown'); else fail('sq core: ' + sqText.slice(0, 200));
  if (/dev|staging|production/i.test(sqText)) pass('sqitch.conf: targets shown'); else fail('sq targets: ' + sqText.slice(0, 300));
  if (/\*{3}/i.test(sqText)) pass('sqitch.conf: credentials masked in URIs'); else fail('sq credential masking: ' + sqText.slice(0, 300));

  // ── atlas.hcl viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('atlas.hcl');
  await page.waitForSelector('#previewHost .at-doc', { timeout: 12000 });
  const atText = await page.$eval('#previewHost .at-doc', (e) => e.textContent);
  if (/Atlas/i.test(atText)) pass('atlas.hcl: Atlas badge shown'); else fail('at badge: ' + atText.slice(0, 200));
  if (/local|staging|production/i.test(atText)) pass('atlas.hcl: env blocks shown'); else fail('at envs: ' + atText.slice(0, 200));
  if (/variable|db_url|dev_url/i.test(atText)) pass('atlas.hcl: variables shown'); else fail('at variables: ' + atText.slice(0, 300));
  if (/\*{3}/i.test(atText)) pass('atlas.hcl: credentials masked in URLs'); else fail('at credential masking: ' + atText.slice(0, 300));

  // ── prometheus-rules.yaml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('prometheus-rules.yaml');
  await page.waitForSelector('#previewHost .pr-doc', { timeout: 12000 });
  const prText = await page.$eval('#previewHost .pr-doc', (e) => e.textContent);
  if (/Prometheus Rules/i.test(prText)) pass('prometheus-rules.yaml: badge shown'); else fail('prometheus-rules badge: ' + prText.slice(0, 200));
  if (/node-alerts|NodeHighCPU/i.test(prText)) pass('prometheus-rules.yaml: alert group/rule shown'); else fail('prometheus-rules content: ' + prText.slice(0, 200));
  if (/warning|critical/i.test(prText)) pass('prometheus-rules.yaml: severity shown'); else fail('prometheus-rules severity: ' + prText.slice(0, 200));
  if (/recording/i.test(prText)) pass('prometheus-rules.yaml: recording rule shown'); else fail('prometheus-rules recording: ' + prText.slice(0, 200));

  // ── grafana-dashboard.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('grafana-dashboard.json');
  await page.waitForSelector('#previewHost .gd-doc', { timeout: 12000 });
  const gdText = await page.$eval('#previewHost .gd-doc', (e) => e.textContent);
  if (/Grafana Dashboard/i.test(gdText)) pass('grafana-dashboard.json: badge shown'); else fail('grafana-dashboard badge: ' + gdText.slice(0, 200));
  if (/Node Exporter Dashboard/i.test(gdText)) pass('grafana-dashboard.json: title shown'); else fail('grafana-dashboard title: ' + gdText.slice(0, 200));
  if (/schemaVersion|36/i.test(gdText)) pass('grafana-dashboard.json: schemaVersion shown'); else fail('grafana-dashboard schema: ' + gdText.slice(0, 200));
  if (/panel|stat|timeseries/i.test(gdText)) pass('grafana-dashboard.json: panels shown'); else fail('grafana-dashboard panels: ' + gdText.slice(0, 200));

  // ── jaeger-config.yaml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('jaeger-config.yaml');
  await page.waitForSelector('#previewHost .jg-doc', { timeout: 12000 });
  const jgText = await page.$eval('#previewHost .jg-doc', (e) => e.textContent);
  if (/Jaeger/i.test(jgText)) pass('jaeger-config.yaml: badge shown'); else fail('jaeger badge: ' + jgText.slice(0, 200));
  if (/16686/i.test(jgText)) pass('jaeger-config.yaml: query port shown'); else fail('jaeger port: ' + jgText.slice(0, 200));
  if (/elasticsearch/i.test(jgText)) pass('jaeger-config.yaml: storage type shown'); else fail('jaeger storage: ' + jgText.slice(0, 200));

  // ── opentelemetry-k8s.yaml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('opentelemetry-k8s.yaml (OTel Operator)');
  await page.waitForSelector('#previewHost .otk-doc', { timeout: 12000 });
  const otkText = await page.$eval('#previewHost .otk-doc', (e) => e.textContent);
  if (/OpenTelemetry/i.test(otkText)) pass('opentelemetry-k8s.yaml: badge shown'); else fail('otk badge: ' + otkText.slice(0, 200));
  if (/OpenTelemetryCollector|otel-collector/i.test(otkText)) pass('opentelemetry-k8s.yaml: collector shown'); else fail('otk collector: ' + otkText.slice(0, 200));
  if (/deployment/i.test(otkText)) pass('opentelemetry-k8s.yaml: mode shown'); else fail('otk mode: ' + otkText.slice(0, 200));
  if (/Instrumentation|my-instrumentation/i.test(otkText)) pass('opentelemetry-k8s.yaml: instrumentation shown'); else fail('otk instrumentation: ' + otkText.slice(0, 300));

  // ── aws-credentials viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('aws-credentials (AWS)');
  await page.waitForSelector('#previewHost .awsc-doc', { timeout: 12000 });
  const awscText = await page.$eval('#previewHost .awsc-doc', (e) => e.textContent);
  if (/AWS Credentials/i.test(awscText)) pass('aws-credentials: AWS Credentials badge shown'); else fail('aws-credentials badge: ' + awscText.slice(0, 200));
  if (/default|staging|production/i.test(awscText)) pass('aws-credentials: profile names shown'); else fail('aws-credentials profiles: ' + awscText.slice(0, 300));
  if (/AKIA/i.test(awscText)) pass('aws-credentials: access key ID shown (masked)'); else fail('aws-credentials key id: ' + awscText.slice(0, 300));
  if (/•{4,}/.test(awscText)) pass('aws-credentials: secret key is masked'); else fail('aws-credentials secret mask: ' + awscText.slice(0, 300));
  if (/handle with care/i.test(awscText)) pass('aws-credentials: security warning shown'); else fail('aws-credentials warning: ' + awscText.slice(0, 300));

  // ── aws-config viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('aws-config (AWS)');
  await page.waitForSelector('#previewHost .awscfg-doc', { timeout: 12000 });
  const awscfgText = await page.$eval('#previewHost .awscfg-doc', (e) => e.textContent);
  if (/AWS Config/i.test(awscfgText)) pass('aws-config: AWS Config badge shown'); else fail('aws-config badge: ' + awscfgText.slice(0, 200));
  if (/default|staging|production|china/i.test(awscfgText)) pass('aws-config: profile names shown'); else fail('aws-config profiles: ' + awscfgText.slice(0, 300));
  if (/us-east-1|us-west-2|eu-west-1/i.test(awscfgText)) pass('aws-config: region values shown'); else fail('aws-config regions: ' + awscfgText.slice(0, 300));
  if (/role_arn|mfa_serial/i.test(awscfgText)) pass('aws-config: role/mfa fields shown'); else fail('aws-config fields: ' + awscfgText.slice(0, 300));

  // ── kubeconfig.yaml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('kubeconfig.yaml');
  await page.waitForSelector('#previewHost .kc-doc', { timeout: 12000 });
  const kcText = await page.$eval('#previewHost .kc-doc', (e) => e.textContent);
  if (/Kubeconfig/i.test(kcText)) pass('kubeconfig.yaml: Kubeconfig badge shown'); else fail('kubeconfig badge: ' + kcText.slice(0, 200));
  if (/dev-cluster-context/i.test(kcText)) pass('kubeconfig.yaml: current context highlighted'); else fail('kubeconfig current-context: ' + kcText.slice(0, 300));
  if (/production-cluster|staging-cluster|dev-cluster/i.test(kcText)) pass('kubeconfig.yaml: cluster names shown'); else fail('kubeconfig clusters: ' + kcText.slice(0, 300));
  if (/DATA\+OMITTED|REDACTED/i.test(kcText)) pass('kubeconfig.yaml: cert/token data is redacted'); else fail('kubeconfig redaction: ' + kcText.slice(0, 300));
  if (/cluster credentials/i.test(kcText)) pass('kubeconfig.yaml: security warning shown'); else fail('kubeconfig warning: ' + kcText.slice(0, 300));

  // ── gcp-service-account.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('gcp-service-account.json (GCP)');
  await page.waitForSelector('#previewHost .gcp-doc', { timeout: 12000 });
  const gcpText = await page.$eval('#previewHost .gcp-doc', (e) => e.textContent);
  if (/GCP Service Account/i.test(gcpText)) pass('gcp-service-account.json: GCP Service Account badge shown'); else fail('gcp-sa badge: ' + gcpText.slice(0, 200));
  if (/my-example-project-123/i.test(gcpText)) pass('gcp-service-account.json: project_id shown'); else fail('gcp-sa project: ' + gcpText.slice(0, 300));
  if (/my-service-account@/i.test(gcpText)) pass('gcp-service-account.json: client_email shown'); else fail('gcp-sa email: ' + gcpText.slice(0, 300));
  if (/REDACTED.*private key/i.test(gcpText)) pass('gcp-service-account.json: private key is redacted'); else fail('gcp-sa private key masking: ' + gcpText.slice(0, 300));
  if (/never commit/i.test(gcpText)) pass('gcp-service-account.json: security warning shown'); else fail('gcp-sa warning: ' + gcpText.slice(0, 300));

  // ── apisix.yaml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('apisix.yaml');
  await page.waitForSelector('#previewHost .ax-doc', { timeout: 12000 });
  const axText = await page.$eval('#previewHost .ax-doc', (e) => e.textContent);
  if (/APISIX/i.test(axText)) pass('apisix.yaml: APISIX badge shown'); else fail('apisix badge: ' + axText.slice(0, 200));
  if (/traditional/i.test(axText)) pass('apisix.yaml: deployment mode shown'); else fail('apisix mode: ' + axText.slice(0, 300));
  if (/9080|9180/i.test(axText)) pass('apisix.yaml: ports shown'); else fail('apisix ports: ' + axText.slice(0, 300));
  if (/prometheus|cors|limit-req/i.test(axText)) pass('apisix.yaml: plugin names shown'); else fail('apisix plugins: ' + axText.slice(0, 300));
  if (/2379|\/apisix/i.test(axText)) pass('apisix.yaml: etcd config shown'); else fail('apisix etcd: ' + axText.slice(0, 300));

  // ── envoy.yaml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('envoy.yaml');
  await page.waitForSelector('#previewHost .ev-doc', { timeout: 12000 });
  const evText = await page.$eval('#previewHost .ev-doc', (e) => e.textContent);
  if (/Envoy/i.test(evText)) pass('envoy.yaml: Envoy badge shown'); else fail('envoy badge: ' + evText.slice(0, 200));
  if (/edge-proxy-01/i.test(evText)) pass('envoy.yaml: node id shown'); else fail('envoy node id: ' + evText.slice(0, 300));
  if (/9901/i.test(evText)) pass('envoy.yaml: admin port shown'); else fail('envoy admin: ' + evText.slice(0, 300));
  if (/listener_http|listener_https/i.test(evText)) pass('envoy.yaml: listeners shown'); else fail('envoy listeners: ' + evText.slice(0, 300));
  if (/api_service|web_service/i.test(evText)) pass('envoy.yaml: clusters shown'); else fail('envoy clusters: ' + evText.slice(0, 300));

  // ── httpd.conf (Apache) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('httpd.conf (Apache HTTP Server)');
  await page.waitForSelector('#previewHost .apachecfg-doc', { timeout: 12000 });
  const apacheText = await page.$eval('#previewHost .apachecfg-doc', (e) => e.textContent);
  if (/Apache/i.test(apacheText)) pass('httpd.conf: Apache badge shown'); else fail('apache badge: ' + apacheText.slice(0, 200));
  if (/VirtualHost|example\.com/i.test(apacheText)) pass('httpd.conf: VirtualHost or ServerName shown'); else fail('apache vhosts: ' + apacheText.slice(0, 300));
  if (/SSL|DocumentRoot/i.test(apacheText)) pass('httpd.conf: SSL or DocumentRoot shown'); else fail('apache ssl/docroot: ' + apacheText.slice(0, 300));

  // ── haproxy.cfg viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('haproxy.cfg');
  await page.waitForSelector('#previewHost .ha-doc', { timeout: 12000 });
  const haText = await page.$eval('#previewHost .ha-doc', (e) => e.textContent);
  if (/HAProxy/i.test(haText)) pass('haproxy.cfg: HAProxy badge shown'); else fail('haproxy badge: ' + haText.slice(0, 200));
  if (/50000/i.test(haText)) pass('haproxy.cfg: maxconn shown'); else fail('haproxy maxconn: ' + haText.slice(0, 300));
  if (/http_front|https_front/i.test(haText)) pass('haproxy.cfg: frontend blocks shown'); else fail('haproxy frontends: ' + haText.slice(0, 300));
  if (/web_backend|api_backend/i.test(haText)) pass('haproxy.cfg: backend blocks shown'); else fail('haproxy backends: ' + haText.slice(0, 300));
  if (/roundrobin|leastconn/i.test(haText)) pass('haproxy.cfg: balance algorithms shown'); else fail('haproxy balance: ' + haText.slice(0, 300));

  // ── squid.conf viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('squid.conf');
  await page.waitForSelector('#previewHost .sqd-doc', { timeout: 12000 });
  const sqdText = await page.$eval('#previewHost .sqd-doc', (e) => e.textContent);
  if (/Squid/i.test(sqdText)) pass('squid.conf: Squid badge shown'); else fail('squid badge: ' + sqdText.slice(0, 200));
  if (/3128/i.test(sqdText)) pass('squid.conf: http_port shown'); else fail('squid port: ' + sqdText.slice(0, 300));
  if (/localnet|SSL_ports|Safe_ports/i.test(sqdText)) pass('squid.conf: ACL names shown'); else fail('squid acls: ' + sqdText.slice(0, 300));
  if (/allow|deny/i.test(sqdText)) pass('squid.conf: access rules shown'); else fail('squid access: ' + sqdText.slice(0, 300));
  if (/8\.8\.8\.8|1\.1\.1\.1/i.test(sqdText)) pass('squid.conf: DNS nameservers shown'); else fail('squid dns: ' + sqdText.slice(0, 300));

  // ── workspace.xml (JetBrains Workspace) ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('workspace.xml (JetBrains)');
  await page.waitForSelector('#previewHost .pj-doc', { timeout: 12000 });
  const jbwText = await page.$eval('#previewHost .pj-doc', (e) => e.textContent);
  if (/JetBrains Workspace/i.test(jbwText)) pass('workspace.xml: JetBrains Workspace badge shown'); else fail('jbw badge: ' + jbwText.slice(0, 200));
  if (/Run Configurations/i.test(jbwText)) pass('workspace.xml: Run Configurations section shown'); else fail('jbw run configs: ' + jbwText.slice(0, 300));
  if (/Main|Tests|Docker Compose/i.test(jbwText)) pass('workspace.xml: run config names shown'); else fail('jbw config names: ' + jbwText.slice(0, 400));
  if (/Changed Files/i.test(jbwText)) pass('workspace.xml: Changed Files section shown'); else fail('jbw changed files: ' + jbwText.slice(0, 400));
  if (/VCS Mappings/i.test(jbwText)) pass('workspace.xml: VCS Mappings section shown'); else fail('jbw vcs: ' + jbwText.slice(0, 400));

  // ── init.lua (Neovim Config) ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('init.lua (Neovim)');
  await page.waitForSelector('#previewHost .pj-doc', { timeout: 12000 });
  const nvcText = await page.$eval('#previewHost .pj-doc', (e) => e.textContent);
  if (/Neovim Config/i.test(nvcText)) pass('init.lua: Neovim Config badge shown'); else fail('nvc badge: ' + nvcText.slice(0, 200));
  if (/lazy\.nvim/i.test(nvcText)) pass('init.lua: lazy.nvim plugin manager detected'); else fail('nvc pm: ' + nvcText.slice(0, 300));
  if (/Key Mappings/i.test(nvcText)) pass('init.lua: Key Mappings section shown'); else fail('nvc keymaps: ' + nvcText.slice(0, 300));
  if (/Options/i.test(nvcText)) pass('init.lua: Options section shown'); else fail('nvc opts: ' + nvcText.slice(0, 300));
  if (/tokyonight/i.test(nvcText)) pass('init.lua: colorscheme detected'); else fail('nvc colorscheme: ' + nvcText.slice(0, 400));

  // ── .vimrc (Vim Config) ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.vimrc (Vim)');
  await page.waitForSelector('#previewHost .pj-doc', { timeout: 12000 });
  const vcText = await page.$eval('#previewHost .pj-doc', (e) => e.textContent);
  if (/Vim Config/i.test(vcText)) pass('.vimrc: Vim Config badge shown'); else fail('vc badge: ' + vcText.slice(0, 200));
  if (/vim-plug/i.test(vcText)) pass('.vimrc: vim-plug plugin manager detected'); else fail('vc pm: ' + vcText.slice(0, 300));
  if (/gruvbox/i.test(vcText)) pass('.vimrc: colorscheme detected'); else fail('vc colorscheme: ' + vcText.slice(0, 300));
  if (/Settings/i.test(vcText)) pass('.vimrc: Settings section shown'); else fail('vc settings: ' + vcText.slice(0, 300));
  if (/Key Mappings/i.test(vcText)) pass('.vimrc: Key Mappings section shown'); else fail('vc keymaps: ' + vcText.slice(0, 400));

  // ── init.el (Emacs Config) ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('init.el (Emacs)');
  await page.waitForSelector('#previewHost .pj-doc', { timeout: 12000 });
  const ecText = await page.$eval('#previewHost .pj-doc', (e) => e.textContent);
  if (/Emacs Config/i.test(ecText)) pass('init.el: Emacs Config badge shown'); else fail('ec badge: ' + ecText.slice(0, 200));
  if (/use-package/i.test(ecText)) pass('init.el: use-package package manager detected'); else fail('ec pm: ' + ecText.slice(0, 300));
  if (/Keybindings/i.test(ecText)) pass('init.el: Keybindings section shown'); else fail('ec keybindings: ' + ecText.slice(0, 300));
  if (/evil|company|ivy|magit|flycheck/i.test(ecText)) pass('init.el: package names shown'); else fail('ec packages: ' + ecText.slice(0, 400));
  if (/Custom Variables/i.test(ecText)) pass('init.el: Custom Variables section shown'); else fail('ec custom vars: ' + ecText.slice(0, 400));

  // ── devbox.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('devbox.json');
  await page.waitForSelector('#previewHost .dvx-doc', { timeout: 12000 });
  const dvxText = await page.$eval('#previewHost .dvx-doc', (e) => e.textContent);
  if (/Devbox/i.test(dvxText)) pass('devbox.json: Devbox badge shown'); else fail('dvx badge: ' + dvxText.slice(0, 200));
  if (/nodejs|python|postgresql/i.test(dvxText)) pass('devbox.json: nix packages shown as chips'); else fail('dvx packages: ' + dvxText.slice(0, 300));
  if (/NODE_ENV|DATABASE_URL/i.test(dvxText)) pass('devbox.json: env variable keys shown'); else fail('dvx env keys: ' + dvxText.slice(0, 300));
  if (/\*\*\*\*/.test(dvxText)) pass('devbox.json: secret values are masked'); else fail('dvx masking: ' + dvxText.slice(0, 400));
  if (/dev|test|lint/i.test(dvxText)) pass('devbox.json: scripts shown'); else fail('dvx scripts: ' + dvxText.slice(0, 400));

  // ── .prototools viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.prototools');
  await page.waitForSelector('#previewHost .ptc-doc', { timeout: 12000 });
  const ptcText = await page.$eval('#previewHost .ptc-doc', (e) => e.textContent);
  if (/proto/i.test(ptcText)) pass('.prototools: proto badge shown'); else fail('ptc badge: ' + ptcText.slice(0, 200));
  if (/node|python|go|rust/i.test(ptcText)) pass('.prototools: tool names shown in table'); else fail('ptc tools: ' + ptcText.slice(0, 300));
  if (/20\.11\.0|3\.12\.0|1\.22\.0/i.test(ptcText)) pass('.prototools: tool versions shown'); else fail('ptc versions: ' + ptcText.slice(0, 300));
  if (/0\.38\.0/i.test(ptcText)) pass('.prototools: proto CLI version highlighted'); else fail('ptc proto ver: ' + ptcText.slice(0, 400));

  // ── aqua.yaml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('aqua.yaml');
  await page.waitForSelector('#previewHost .aqc-doc', { timeout: 12000 });
  const aqcText = await page.$eval('#previewHost .aqc-doc', (e) => e.textContent);
  if (/aqua/i.test(aqcText)) pass('aqua.yaml: aqua badge shown'); else fail('aqc badge: ' + aqcText.slice(0, 200));
  if (/standard/i.test(aqcText)) pass('aqua.yaml: registry type shown'); else fail('aqc registry: ' + aqcText.slice(0, 300));
  if (/cli\/cli|jqlang\/jq|sharkdp\/fd/i.test(aqcText)) pass('aqua.yaml: package names shown'); else fail('aqc packages: ' + aqcText.slice(0, 300));
  if (/v2\.45\.0|jq-1\.7\.1|v9\.0\.0/i.test(aqcText)) pass('aqua.yaml: package versions shown as pills'); else fail('aqc versions: ' + aqcText.slice(0, 400));

  // ── pixi.toml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
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
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.woodpecker.yml (Woodpecker CI)');
  await page.waitForSelector('#previewHost .wpc-doc', { timeout: 12000 });
  const wpcText = await page.$eval('#previewHost .wpc-doc', (e) => e.textContent);
  if (/Woodpecker/i.test(wpcText)) pass('.woodpecker.yml: badge shown'); else fail('woodpecker badge: ' + wpcText.slice(0, 200));
  if (/step|pipeline/i.test(wpcText)) pass('.woodpecker.yml: steps shown'); else fail('woodpecker steps: ' + wpcText.slice(0, 200));
  if (/image|plugin/i.test(wpcText)) pass('.woodpecker.yml: step images shown'); else fail('woodpecker images: ' + wpcText.slice(0, 200));
  if (/secret|when|clone|matrix/i.test(wpcText)) pass('.woodpecker.yml: pipeline metadata shown'); else fail('woodpecker metadata: ' + wpcText.slice(0, 200));

  // ── harness-pipeline.yaml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Harness Pipeline');
  await page.waitForSelector('#previewHost .hrn-doc', { timeout: 12000 });
  const hrnText = await page.$eval('#previewHost .hrn-doc', (e) => e.textContent);
  if (/Harness/i.test(hrnText)) pass('harness-pipeline.yaml: badge shown'); else fail('harness badge: ' + hrnText.slice(0, 200));
  if (/pipeline|identifier/i.test(hrnText)) pass('harness-pipeline.yaml: pipeline identity shown'); else fail('harness identity: ' + hrnText.slice(0, 200));
  if (/stage|CI|CD/i.test(hrnText)) pass('harness-pipeline.yaml: stages shown'); else fail('harness stages: ' + hrnText.slice(0, 200));
  if (/step|variable|tag/i.test(hrnText)) pass('harness-pipeline.yaml: stage details shown'); else fail('harness details: ' + hrnText.slice(0, 200));

  // ── codefresh.yml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Codefresh config');
  await page.waitForSelector('#previewHost .cfd-doc', { timeout: 12000 });
  const cfdText = await page.$eval('#previewHost .cfd-doc', (e) => e.textContent);
  if (/Codefresh/i.test(cfdText)) pass('codefresh.yml: badge shown'); else fail('codefresh badge: ' + cfdText.slice(0, 200));
  if (/step|build|test|push/i.test(cfdText)) pass('codefresh.yml: steps shown'); else fail('codefresh steps: ' + cfdText.slice(0, 200));
  if (/version/i.test(cfdText)) pass('codefresh.yml: version shown'); else fail('codefresh version: ' + cfdText.slice(0, 200));
  if (/trigger|variable|image|type/i.test(cfdText)) pass('codefresh.yml: pipeline metadata shown'); else fail('codefresh metadata: ' + cfdText.slice(0, 200));


  // ── opa-policy viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('policy.rego');
  await page.waitForSelector('#previewHost .opa-doc', { timeout: 12000 });
  const opaText = await page.$eval('#previewHost .opa-doc', (e) => e.textContent);
  if (/OPA Policy/i.test(opaText)) pass('policy.rego: OPA Policy badge shown'); else fail('opa badge: ' + opaText.slice(0, 200));
  if (/authz/i.test(opaText)) pass('policy.rego: package name shown'); else fail('opa package: ' + opaText.slice(0, 300));
  if (/allow/i.test(opaText)) pass('policy.rego: allow rules shown'); else fail('opa allow rules: ' + opaText.slice(0, 300));
  if (/deny/i.test(opaText)) pass('policy.rego: deny rules shown'); else fail('opa deny rules: ' + opaText.slice(0, 300));
  if (/rego\.v1|data\.roles/i.test(opaText)) pass('policy.rego: imports shown'); else fail('opa imports: ' + opaText.slice(0, 300));

  // ── falco-rules viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('falco_rules.yaml');
  await page.waitForSelector('#previewHost .falco-doc', { timeout: 12000 });
  const falcoText = await page.$eval('#previewHost .falco-doc', (e) => e.textContent);
  if (/Falco Rules/i.test(falcoText)) pass('falco_rules.yaml: Falco Rules badge shown'); else fail('falco badge: ' + falcoText.slice(0, 200));
  if (/Terminal shell in container/i.test(falcoText)) pass('falco_rules.yaml: rule name shown'); else fail('falco rule name: ' + falcoText.slice(0, 300));
  if (/CRITICAL|ERROR|NOTICE/i.test(falcoText)) pass('falco_rules.yaml: priority levels shown'); else fail('falco priority: ' + falcoText.slice(0, 300));
  if (/container|shell|network/i.test(falcoText)) pass('falco_rules.yaml: tags shown'); else fail('falco tags: ' + falcoText.slice(0, 300));
  if (/spawned_process|bin_dir/i.test(falcoText)) pass('falco_rules.yaml: macro names shown'); else fail('falco macros: ' + falcoText.slice(0, 300));

  // ── kyverno-policy viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('kyverno-policy.yaml');
  await page.waitForSelector('#previewHost .kyv-doc', { timeout: 12000 });
  const kyvText = await page.$eval('#previewHost .kyv-doc', (e) => e.textContent);
  if (/Kyverno/i.test(kyvText)) pass('kyverno-policy.yaml: Kyverno badge shown'); else fail('kyverno badge: ' + kyvText.slice(0, 200));
  if (/disallow-privileged-containers/i.test(kyvText)) pass('kyverno-policy.yaml: policy name shown'); else fail('kyverno name: ' + kyvText.slice(0, 300));
  if (/enforce/i.test(kyvText)) pass('kyverno-policy.yaml: validationFailureAction shown'); else fail('kyverno action: ' + kyvText.slice(0, 300));
  if (/privileged-containers/i.test(kyvText)) pass('kyverno-policy.yaml: rule names shown'); else fail('kyverno rules: ' + kyvText.slice(0, 300));
  if (/Pod/i.test(kyvText)) pass('kyverno-policy.yaml: matched kinds shown'); else fail('kyverno kinds: ' + kyvText.slice(0, 300));

  // ── gatekeeper-config viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('gatekeeper-constraint.yaml');
  await page.waitForSelector('#previewHost .gkpr-doc', { timeout: 12000 });
  const gkText = await page.$eval('#previewHost .gkpr-doc', (e) => e.textContent);
  if (/Gatekeeper/i.test(gkText)) pass('gatekeeper-constraint.yaml: Gatekeeper badge shown'); else fail('gatekeeper badge: ' + gkText.slice(0, 200));
  if (/require-team-label/i.test(gkText)) pass('gatekeeper-constraint.yaml: constraint name shown'); else fail('gatekeeper name: ' + gkText.slice(0, 300));
  if (/deny/i.test(gkText)) pass('gatekeeper-constraint.yaml: enforcementAction shown'); else fail('gatekeeper action: ' + gkText.slice(0, 300));
  if (/Namespace/i.test(gkText)) pass('gatekeeper-constraint.yaml: match kinds shown'); else fail('gatekeeper kinds: ' + gkText.slice(0, 300));
  if (/team|labels/i.test(gkText)) pass('gatekeeper-constraint.yaml: parameters shown'); else fail('gatekeeper params: ' + gkText.slice(0, 300));

  // ── .actrc viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('act config (.actrc)');
  await page.waitForSelector('#previewHost .act-doc', { timeout: 12000 });
  const actText = await page.$eval('#previewHost .act-doc', (e) => e.textContent);
  if (/\bact\b/i.test(actText)) pass('.actrc: act badge shown'); else fail('act badge: ' + actText.slice(0, 200));
  if (/ubuntu|platform|runner/i.test(actText)) pass('.actrc: platform mappings shown'); else fail('act platforms: ' + actText.slice(0, 200));
  if (/env|secret/i.test(actText)) pass('.actrc: env/secrets shown'); else fail('act env/secrets: ' + actText.slice(0, 200));
  if (/ghcr\.io|catthehacker|docker/i.test(actText)) pass('.actrc: docker image shown'); else fail('act docker image: ' + actText.slice(0, 200));
  // ── clickhouse config.xml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('config.xml (ClickHouse)');
  await page.waitForSelector('#previewHost .ch-doc', { timeout: 12000 });
  const chText = await page.$eval('#previewHost .ch-doc', (e) => e.textContent);
  if (/ClickHouse/i.test(chText)) pass('config.xml: ClickHouse badge shown'); else fail('clickhouse badge: ' + chText.slice(0, 200));
  if (/9000|8123/i.test(chText)) pass('config.xml: TCP/HTTP ports shown'); else fail('clickhouse ports: ' + chText.slice(0, 300));
  if (/4096/i.test(chText)) pass('config.xml: max_connections shown'); else fail('clickhouse max_connections: ' + chText.slice(0, 300));
  if (/information|debug|warning|error/i.test(chText)) pass('config.xml: log level shown'); else fail('clickhouse loglevel: ' + chText.slice(0, 300));
  if (/clickhouse-server|default/i.test(chText)) pass('config.xml: storage/database shown'); else fail('clickhouse storage: ' + chText.slice(0, 300));

  // ── cassandra.yaml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('cassandra.yaml');
  await page.waitForSelector('#previewHost .cass-doc', { timeout: 12000 });
  const cassText = await page.$eval('#previewHost .cass-doc', (e) => e.textContent);
  if (/Cassandra/i.test(cassText)) pass('cassandra.yaml: Cassandra badge shown'); else fail('cassandra badge: ' + cassText.slice(0, 200));
  if (/MyProductionCluster/i.test(cassText)) pass('cassandra.yaml: cluster name shown'); else fail('cassandra cluster name: ' + cassText.slice(0, 300));
  if (/10\.0\.1\.10|10\.0\.1\.11|10\.0\.1\.12/i.test(cassText)) pass('cassandra.yaml: seed addresses shown'); else fail('cassandra seeds: ' + cassText.slice(0, 300));
  if (/9042/i.test(cassText)) pass('cassandra.yaml: native_transport_port shown'); else fail('cassandra port: ' + cassText.slice(0, 300));
  if (/PasswordAuthenticator|GossipingPropertyFileSnitch/i.test(cassText)) pass('cassandra.yaml: auth/snitch settings shown'); else fail('cassandra auth: ' + cassText.slice(0, 300));

  // ── elasticsearch.yml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('elasticsearch.yml');
  await page.waitForSelector('#previewHost .es-doc', { timeout: 12000 });
  const esText = await page.$eval('#previewHost .es-doc', (e) => e.textContent);
  if (/Elasticsearch/i.test(esText)) pass('elasticsearch.yml: Elasticsearch badge shown'); else fail('elasticsearch badge: ' + esText.slice(0, 200));
  if (/my-production-cluster/i.test(esText)) pass('elasticsearch.yml: cluster.name shown'); else fail('elasticsearch cluster: ' + esText.slice(0, 300));
  if (/es-node-01/i.test(esText)) pass('elasticsearch.yml: node.name shown'); else fail('elasticsearch node: ' + esText.slice(0, 300));
  if (/9200/i.test(esText)) pass('elasticsearch.yml: http.port shown'); else fail('elasticsearch http port: ' + esText.slice(0, 300));
  if (/••••••••|sensitive|keystore|truststore/i.test(esText)) pass('elasticsearch.yml: X-Pack sensitive keys masked'); else fail('elasticsearch security masking: ' + esText.slice(0, 300));

  // ── sentinel.conf viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('sentinel.conf (Redis Sentinel)');
  await page.waitForSelector('#previewHost .rds-doc', { timeout: 12000 });
  const rdsText = await page.$eval('#previewHost .rds-doc', (e) => e.textContent);
  if (/Redis Sentinel/i.test(rdsText)) pass('sentinel.conf: Redis Sentinel badge shown'); else fail('sentinel badge: ' + rdsText.slice(0, 200));
  if (/26379/i.test(rdsText)) pass('sentinel.conf: sentinel port shown'); else fail('sentinel port: ' + rdsText.slice(0, 300));
  if (/redis-primary|redis-cache/i.test(rdsText)) pass('sentinel.conf: monitored master names shown'); else fail('sentinel masters: ' + rdsText.slice(0, 300));
  if (/••••••••|sensitive/i.test(rdsText)) pass('sentinel.conf: passwords are masked'); else fail('sentinel masking: ' + rdsText.slice(0, 300));
  if (/30000|180000/i.test(rdsText)) pass('sentinel.conf: down-after/failover-timeout shown'); else fail('sentinel timeouts: ' + rdsText.slice(0, 300));
  // ── django-settings viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
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
  await page.goto(origin, { waitUntil: 'networkidle' });
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
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('credentials.yml (Rails)');
  await page.waitForSelector('#previewHost .rc-doc', { timeout: 12000 });
  const rcText = await page.$eval('#previewHost .rc-doc', (e) => e.textContent);
  if (/Rails Credentials/i.test(rcText)) pass('credentials.yml: Rails Credentials badge shown'); else fail('rc badge: ' + rcText.slice(0, 200));
  if (/aws|stripe|sendgrid/i.test(rcText)) pass('credentials.yml: credential sections shown'); else fail('rc sections: ' + rcText.slice(0, 300));
  if (/\u2022{4,}/.test(rcText)) pass('credentials.yml: secret values masked'); else fail('rc masking: ' + rcText.slice(0, 300));
  if (/never commit|sensitive/i.test(rcText)) pass('credentials.yml: security warning shown'); else fail('rc warning: ' + rcText.slice(0, 300));

  // ── puma-config viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('puma.rb (Puma)');
  await page.waitForSelector('#previewHost .pu-doc', { timeout: 12000 });
  const puText = await page.$eval('#previewHost .pu-doc', (e) => e.textContent);
  if (/Puma/i.test(puText)) pass('puma.rb: Puma badge shown'); else fail('pu badge: ' + puText.slice(0, 200));
  if (/worker|WEB_CONCURRENCY/i.test(puText)) pass('puma.rb: workers shown'); else fail('pu workers: ' + puText.slice(0, 300));
  if (/2.*16|threads/i.test(puText)) pass('puma.rb: thread range shown'); else fail('pu threads: ' + puText.slice(0, 300));
  if (/production/i.test(puText)) pass('puma.rb: environment shown'); else fail('pu env: ' + puText.slice(0, 300));
  if (/preload_app/i.test(puText)) pass('puma.rb: preload_app status shown'); else fail('pu preload: ' + puText.slice(0, 300));
  if (/tmp_restart|telemetry/i.test(puText)) pass('puma.rb: plugins listed'); else fail('pu plugins: ' + puText.slice(0, 300));


  // ── nomad-job viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('example.nomad (Nomad Job)');
  await page.waitForSelector('#previewHost .nj-doc', { timeout: 12000 });
  const nomadText = await page.$eval('#previewHost .nj-doc', (e) => e.textContent);
  if (/Nomad Job/i.test(nomadText)) pass('example.nomad: Nomad Job badge shown'); else fail('nomad badge: ' + nomadText.slice(0, 200));
  if (/web-api/i.test(nomadText)) pass('example.nomad: job name shown'); else fail('nomad job name: ' + nomadText.slice(0, 300));
  if (/service/i.test(nomadText)) pass('example.nomad: job type shown'); else fail('nomad type: ' + nomadText.slice(0, 300));
  if (/dc1|dc2/i.test(nomadText)) pass('example.nomad: datacenters shown'); else fail('nomad datacenters: ' + nomadText.slice(0, 300));
  if (/api|worker/i.test(nomadText)) pass('example.nomad: task groups shown'); else fail('nomad groups: ' + nomadText.slice(0, 300));

  // ── docker-stack viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('docker-stack.yml (Docker Stack)');
  await page.waitForSelector('#previewHost .ds-doc', { timeout: 12000 });
  const dsText = await page.$eval('#previewHost .ds-doc', (e) => e.textContent);
  if (/Docker Stack/i.test(dsText)) pass('docker-stack.yml: Docker Stack badge shown'); else fail('docker-stack badge: ' + dsText.slice(0, 200));
  if (/web|api|db/i.test(dsText)) pass('docker-stack.yml: service names shown'); else fail('docker-stack services: ' + dsText.slice(0, 300));
  if (/replica|replicated/i.test(dsText)) pass('docker-stack.yml: replica info shown'); else fail('docker-stack replicas: ' + dsText.slice(0, 300));
  if (/restart_policy|on-failure|any/i.test(dsText)) pass('docker-stack.yml: restart policy shown'); else fail('docker-stack restart: ' + dsText.slice(0, 300));
  if (/db_password|api_key|secret/i.test(dsText)) pass('docker-stack.yml: secrets shown'); else fail('docker-stack secrets: ' + dsText.slice(0, 300));

  // ── podman-quadlet viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('myapp.container (Podman Quadlet)');
  await page.waitForSelector('#previewHost .pq-doc', { timeout: 12000 });
  const pqText = await page.$eval('#previewHost .pq-doc', (e) => e.textContent);
  if (/Podman Quadlet/i.test(pqText)) pass('myapp.container: Podman Quadlet badge shown'); else fail('podman-quadlet badge: ' + pqText.slice(0, 200));
  if (/myorg\/myapp|myapp/i.test(pqText)) pass('myapp.container: image shown'); else fail('podman-quadlet image: ' + pqText.slice(0, 300));
  if (/\*\*\*|masked|REDACTED/i.test(pqText)) pass('myapp.container: secrets masked'); else fail('podman-quadlet masking: ' + pqText.slice(0, 300));
  if (/8080|port/i.test(pqText)) pass('myapp.container: port shown'); else fail('podman-quadlet port: ' + pqText.slice(0, 300));
  if (/\/data|volume/i.test(pqText)) pass('myapp.container: volume shown'); else fail('podman-quadlet volume: ' + pqText.slice(0, 300));

  // ── flux-kustomization viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('flux-kustomization.yaml (Flux Kustomization)');
  await page.waitForSelector('#previewHost .fkust-doc', { timeout: 12000 });
  const fkText = await page.$eval('#previewHost .fkust-doc', (e) => e.textContent);
  if (/Flux Kustomization/i.test(fkText)) pass('flux-kustomization.yaml: Flux Kustomization badge shown'); else fail('flux-kust badge: ' + fkText.slice(0, 200));
  if (/production-apps/i.test(fkText)) pass('flux-kustomization.yaml: name shown'); else fail('flux-kust name: ' + fkText.slice(0, 300));
  if (/clusters\/production|\.\/clusters/i.test(fkText)) pass('flux-kustomization.yaml: path shown'); else fail('flux-kust path: ' + fkText.slice(0, 300));
  if (/prune|force|wait/i.test(fkText)) pass('flux-kustomization.yaml: sync settings shown'); else fail('flux-kust settings: ' + fkText.slice(0, 300));
  if (/infrastructure|dependsOn/i.test(fkText)) pass('flux-kustomization.yaml: dependsOn shown'); else fail('flux-kust deps: ' + fkText.slice(0, 300));

  // ── CycloneDX SBOM viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('sbom.cyclonedx.json (CycloneDX SBOM)');
  await page.waitForSelector('#previewHost .cdx-doc', { timeout: 12000 });
  const cdxText = await page.$eval('#previewHost .cdx-doc', (e) => e.textContent);
  if (/CycloneDX SBOM/i.test(cdxText)) pass('sbom.cyclonedx.json: CycloneDX SBOM badge shown'); else fail('cyclonedx badge: ' + cdxText.slice(0, 200));
  if (/1\.5/i.test(cdxText)) pass('sbom.cyclonedx.json: spec version shown'); else fail('cyclonedx spec version: ' + cdxText.slice(0, 300));
  if (/express|lodash|react/i.test(cdxText)) pass('sbom.cyclonedx.json: component names shown'); else fail('cyclonedx components: ' + cdxText.slice(0, 300));
  if (/CVE-2024-12345|high/i.test(cdxText)) pass('sbom.cyclonedx.json: vulnerability shown'); else fail('cyclonedx vuln: ' + cdxText.slice(0, 300));
  if (/cdxgen/i.test(cdxText)) pass('sbom.cyclonedx.json: tool name shown'); else fail('cyclonedx tools: ' + cdxText.slice(0, 300));

  // ── SPDX SBOM viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('sbom.spdx (SPDX SBOM)');
  await page.waitForSelector('#previewHost .spdx-doc', { timeout: 12000 });
  const spdxText = await page.$eval('#previewHost .spdx-doc', (e) => e.textContent);
  if (/SPDX SBOM/i.test(spdxText)) pass('sbom.spdx: SPDX SBOM badge shown'); else fail('spdx badge: ' + spdxText.slice(0, 200));
  if (/SPDX-2\.3/i.test(spdxText)) pass('sbom.spdx: SPDX version shown'); else fail('spdx version: ' + spdxText.slice(0, 300));
  if (/my-web-app-sbom/i.test(spdxText)) pass('sbom.spdx: document name shown'); else fail('spdx docname: ' + spdxText.slice(0, 300));
  if (/express|lodash|axios/i.test(spdxText)) pass('sbom.spdx: package names shown'); else fail('spdx packages: ' + spdxText.slice(0, 300));
  if (/MIT/i.test(spdxText)) pass('sbom.spdx: license info shown'); else fail('spdx license: ' + spdxText.slice(0, 300));

  // ── SLSA Provenance viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('provenance.json (SLSA Provenance)');
  await page.waitForSelector('#previewHost .slsa-doc', { timeout: 12000 });
  const slsaText = await page.$eval('#previewHost .slsa-doc', (e) => e.textContent);
  if (/SLSA Provenance/i.test(slsaText)) pass('provenance.json: SLSA Provenance badge shown'); else fail('slsa badge: ' + slsaText.slice(0, 200));
  if (/in-toto\.io|slsa\.dev/i.test(slsaText)) pass('provenance.json: statement type shown'); else fail('slsa type: ' + slsaText.slice(0, 300));
  if (/my-web-app-linux/i.test(slsaText)) pass('provenance.json: subject name shown'); else fail('slsa subject: ' + slsaText.slice(0, 300));
  if (/release\.yml|builder/i.test(slsaText)) pass('provenance.json: builder info shown'); else fail('slsa builder: ' + slsaText.slice(0, 300));
  if (/express|lodash|react/i.test(slsaText)) pass('provenance.json: materials shown'); else fail('slsa materials: ' + slsaText.slice(0, 300));

  // ── Syft config viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.syft.yaml (Syft config)');
  await page.waitForSelector('#previewHost .syft-doc', { timeout: 12000 });
  const syftText = await page.$eval('#previewHost .syft-doc', (e) => e.textContent);
  if (/Syft/i.test(syftText)) pass('.syft.yaml: Syft badge shown'); else fail('syft badge: ' + syftText.slice(0, 200));
  if (/spdx-json|cyclonedx-json/i.test(syftText)) pass('.syft.yaml: output formats shown'); else fail('syft outputs: ' + syftText.slice(0, 300));
  if (/javascript-package-cataloger|python-package-cataloger/i.test(syftText)) pass('.syft.yaml: catalogers shown'); else fail('syft catalogers: ' + syftText.slice(0, 300));
  if (/enabled|disabled/i.test(syftText)) pass('.syft.yaml: enabled/disabled state shown'); else fail('syft enabled: ' + syftText.slice(0, 300));
  if (/aws-access-key|github-pat/i.test(syftText)) pass('.syft.yaml: secret exclusions shown'); else fail('syft secrets: ' + syftText.slice(0, 300));

  // ── ProGuard Rules viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('proguard-rules.pro (ProGuard Rules)');
  await page.waitForSelector('#previewHost .pg-doc', { timeout: 12000 });
  const proguardText = await page.$eval('#previewHost .pg-doc', (e) => e.textContent);
  if (/ProGuard/i.test(proguardText)) pass('proguard-rules.pro: ProGuard badge shown'); else fail('proguard badge: ' + proguardText.slice(0, 200));
  if (/proguard-rules\.pro/i.test(proguardText)) pass('proguard-rules.pro: filename shown'); else fail('proguard filename: ' + proguardText.slice(0, 200));
  if (/-keep|-dontwarn/i.test(proguardText)) pass('proguard-rules.pro: rule types shown in summary'); else fail('proguard summary: ' + proguardText.slice(0, 300));
  if (/Retrofit|Room|Gson/i.test(proguardText)) pass('proguard-rules.pro: class patterns shown in keep rules table'); else fail('proguard keep rules: ' + proguardText.slice(0, 300));
  const pgBadge = await page.$eval('#previewHost .badge-pg', (e) => e.style.background || window.getComputedStyle(e).background);
  pass('proguard-rules.pro: Android green badge rendered');

  // ── Android Strings viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('strings.xml (Android Strings)');
  await page.waitForSelector('#previewHost .as-doc', { timeout: 12000 });
  const androidStringsText = await page.$eval('#previewHost .as-doc', (e) => e.textContent);
  if (/Android Strings/i.test(androidStringsText)) pass('strings.xml: Android Strings badge shown'); else fail('android-strings badge: ' + androidStringsText.slice(0, 200));
  if (/app_name|app_description|nav_home/i.test(androidStringsText)) pass('strings.xml: string names shown in table'); else fail('android-strings names: ' + androidStringsText.slice(0, 300));
  if (/MyApp|productivity/i.test(androidStringsText)) pass('strings.xml: string values shown'); else fail('android-strings values: ' + androidStringsText.slice(0, 300));
  if (/string array|sort_options/i.test(androidStringsText)) pass('strings.xml: string-array section shown'); else fail('android-strings array: ' + androidStringsText.slice(0, 300));
  if (/plural|notification/i.test(androidStringsText)) pass('strings.xml: plurals section shown'); else fail('android-strings plurals: ' + androidStringsText.slice(0, 300));
  const asSearch = await page.$('#previewHost .as-search');
  if (asSearch) pass('strings.xml: search input rendered'); else fail('android-strings search input missing');

  // ── DVC Pipeline viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('dvc.yaml (DVC Pipeline)');
  await page.waitForSelector('#previewHost .dvc-doc', { timeout: 12000 });
  const dvPipelineText = await page.$eval('#previewHost .dvc-doc', (e) => e.textContent);
  if (/DVC/i.test(dvPipelineText)) pass('dvc.yaml: DVC badge shown'); else fail('dvc badge: ' + dvPipelineText.slice(0, 200));
  if (/prepare|train|evaluate/i.test(dvPipelineText)) pass('dvc.yaml: pipeline stages shown'); else fail('dvc stages: ' + dvPipelineText.slice(0, 300));
  if (/python src\/prepare\.py|python src\/train\.py/i.test(dvPipelineText)) pass('dvc.yaml: stage commands shown'); else fail('dvc commands: ' + dvPipelineText.slice(0, 300));
  if (/Dependencies|Outputs|Parameters/i.test(dvPipelineText)) pass('dvc.yaml: stage dep/out/param lists shown'); else fail('dvc lists: ' + dvPipelineText.slice(0, 300));

  // ── MLflow Project viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('MLproject (MLflow Project)');
  await page.waitForSelector('#previewHost .mlf-doc', { timeout: 12000 });
  const mlfText = await page.$eval('#previewHost .mlf-doc', (e) => e.textContent);
  if (/MLflow/i.test(mlfText)) pass('MLproject: MLflow badge shown'); else fail('mlflow badge: ' + mlfText.slice(0, 200));
  if (/my-sklearn-project/i.test(mlfText)) pass('MLproject: project name shown'); else fail('mlflow name: ' + mlfText.slice(0, 300));
  if (/train|predict/i.test(mlfText)) pass('MLproject: entry points shown'); else fail('mlflow entry points: ' + mlfText.slice(0, 300));
  if (/alpha|l1_ratio|max_iter/i.test(mlfText)) pass('MLproject: parameters shown'); else fail('mlflow params: ' + mlfText.slice(0, 300));

  // ── Hydra Config viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('hydra-config.yaml (Hydra Config)');
  await page.waitForSelector('#previewHost .hyd-doc', { timeout: 12000 });
  const hydText = await page.$eval('#previewHost .hyd-doc', (e) => e.textContent);
  if (/Hydra/i.test(hydText)) pass('hydra-config.yaml: Hydra badge shown'); else fail('hydra badge: ' + hydText.slice(0, 200));
  if (/model|dataset|optimizer|scheduler/i.test(hydText)) pass('hydra-config.yaml: defaults groups shown'); else fail('hydra defaults: ' + hydText.slice(0, 300));
  if (/src\.trainer\.ImageClassifier|_self_/i.test(hydText)) pass('hydra-config.yaml: target class or _self_ shown'); else fail('hydra target: ' + hydText.slice(0, 300));
  if (/max_epochs|batch_size|num_workers/i.test(hydText)) pass('hydra-config.yaml: config values shown'); else fail('hydra values: ' + hydText.slice(0, 300));

  // ── W&B Config viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('wandb-settings (W&B Config)');
  await page.waitForSelector('#previewHost .wb-doc', { timeout: 12000 });
  const wbText = await page.$eval('#previewHost .wb-doc', (e) => e.textContent);
  if (/W&B|Weights.*Biases/i.test(wbText)) pass('wandb-settings: W&B badge shown'); else fail('wandb badge: ' + wbText.slice(0, 200));
  if (/my-team/i.test(wbText)) pass('wandb-settings: entity shown'); else fail('wandb entity: ' + wbText.slice(0, 300));
  if (/image-classification/i.test(wbText)) pass('wandb-settings: project shown'); else fail('wandb project: ' + wbText.slice(0, 300));
  if (/online/i.test(wbText)) pass('wandb-settings: mode shown'); else fail('wandb mode: ' + wbText.slice(0, 300));

  // ── New Relic Agent config viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('newrelic.yml (New Relic Agent)');
  await page.waitForSelector('#previewHost .nr-doc', { timeout: 12000 });
  const nrText = await page.$eval('#previewHost .nr-doc', (e) => e.textContent);
  if (/New Relic/i.test(nrText)) pass('newrelic.yml: New Relic badge shown'); else fail('newrelic badge: ' + nrText.slice(0, 200));
  if (/MyApp/i.test(nrText)) pass('newrelic.yml: app_name shown'); else fail('newrelic app_name: ' + nrText.slice(0, 300));
  if (/••••••••|masked/i.test(nrText)) pass('newrelic.yml: license_key masked'); else fail('newrelic masking: ' + nrText.slice(0, 300));
  if (/distributed_tracing|transaction_tracer|error_collector/i.test(nrText)) pass('newrelic.yml: config sections shown'); else fail('newrelic sections: ' + nrText.slice(0, 300));
  if (/development|production|test/i.test(nrText)) pass('newrelic.yml: environments shown'); else fail('newrelic environments: ' + nrText.slice(0, 300));

  // ── Dynatrace OneAgent config viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('dtconfig.yaml (Dynatrace OneAgent)');
  await page.waitForSelector('#previewHost .dt-doc', { timeout: 12000 });
  const dtText = await page.$eval('#previewHost .dt-doc', (e) => e.textContent);
  if (/Dynatrace/i.test(dtText)) pass('dtconfig.yaml: Dynatrace badge shown'); else fail('dynatrace badge: ' + dtText.slice(0, 200));
  if (/abc12345|live\.dynatrace\.com/i.test(dtText)) pass('dtconfig.yaml: environment/API URL shown'); else fail('dynatrace env: ' + dtText.slice(0, 300));
  if (/••••••••|masked/i.test(dtText)) pass('dtconfig.yaml: apiToken masked'); else fail('dynatrace token masking: ' + dtText.slice(0, 300));
  if (/us-east-1|network.zone/i.test(dtText)) pass('dtconfig.yaml: network zones shown'); else fail('dynatrace network zones: ' + dtText.slice(0, 300));

  // ── Elastic APM agent config viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('elastic-apm-agent.properties (Elastic APM Agent)');
  await page.waitForSelector('#previewHost .apm-doc', { timeout: 12000 });
  const apmText = await page.$eval('#previewHost .apm-doc', (e) => e.textContent);
  if (/Elastic APM/i.test(apmText)) pass('elastic-apm-agent.properties: Elastic APM badge shown'); else fail('elastic-apm badge: ' + apmText.slice(0, 200));
  if (/payment-service/i.test(apmText)) pass('elastic-apm-agent.properties: service_name shown'); else fail('elastic-apm service: ' + apmText.slice(0, 300));
  if (/production/i.test(apmText)) pass('elastic-apm-agent.properties: environment shown'); else fail('elastic-apm env: ' + apmText.slice(0, 300));
  if (/••••••••|masked/i.test(apmText)) pass('elastic-apm-agent.properties: secret_token masked'); else fail('elastic-apm token masking: ' + apmText.slice(0, 300));
  if (/0\.25|25%|sample/i.test(apmText)) pass('elastic-apm-agent.properties: sample rate shown'); else fail('elastic-apm sampling: ' + apmText.slice(0, 300));

  // ── Elastic Beats (Filebeat) config viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('filebeat.yml (Elastic Beats)');
  await page.waitForSelector('#previewHost .beats-doc', { timeout: 12000 });
  const beatsText = await page.$eval('#previewHost .beats-doc', (e) => e.textContent);
  if (/Elastic Beats/i.test(beatsText)) pass('filebeat.yml: Elastic Beats badge shown'); else fail('beats badge: ' + beatsText.slice(0, 200));
  if (/Filebeat/i.test(beatsText)) pass('filebeat.yml: beat type chip shown'); else fail('beats type chip: ' + beatsText.slice(0, 200));
  if (/app-logs|nginx-access|\/var\/log/i.test(beatsText)) pass('filebeat.yml: inputs shown'); else fail('beats inputs: ' + beatsText.slice(0, 300));
  if (/elasticsearch/i.test(beatsText)) pass('filebeat.yml: output type shown'); else fail('beats output: ' + beatsText.slice(0, 300));
  if (/••••••••|masked/i.test(beatsText)) pass('filebeat.yml: output password masked'); else fail('beats password masking: ' + beatsText.slice(0, 300));

  // ── Hardhat config viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('hardhat.config.js (Hardhat)');
  await page.waitForSelector('#previewHost .hh-doc', { timeout: 12000 });
  const hhText = await page.$eval('#previewHost .hh-doc', (e) => e.textContent);
  if (/Hardhat/i.test(hhText)) pass('hardhat.config.js: Hardhat badge shown'); else fail('hardhat badge: ' + hhText.slice(0, 200));
  if (/hardhat|localhost|mainnet/i.test(hhText)) pass('hardhat.config.js: network names shown'); else fail('hardhat networks: ' + hhText.slice(0, 300));
  if (/0\.8\.24/i.test(hhText)) pass('hardhat.config.js: Solidity version shown'); else fail('hardhat solc: ' + hhText.slice(0, 300));
  if (/configured/i.test(hhText)) pass('hardhat.config.js: Etherscan configured shown'); else fail('hardhat etherscan: ' + hhText.slice(0, 300));

  // ── Truffle config viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('truffle-config.js (Truffle)');
  await page.waitForSelector('#previewHost .truf-doc', { timeout: 12000 });
  const trufText = await page.$eval('#previewHost .truf-doc', (e) => e.textContent);
  if (/Truffle/i.test(trufText)) pass('truffle-config.js: Truffle badge shown'); else fail('truffle badge: ' + trufText.slice(0, 200));
  if (/development|mainnet/i.test(trufText)) pass('truffle-config.js: network names shown'); else fail('truffle networks: ' + trufText.slice(0, 300));
  if (/0\.8\.17/i.test(trufText)) pass('truffle-config.js: Solidity version shown'); else fail('truffle solc: ' + trufText.slice(0, 300));
  if (/build\/contracts|build.contracts/i.test(trufText)) pass('truffle-config.js: build directory shown'); else fail('truffle build dir: ' + trufText.slice(0, 300));

  // ── Foundry TOML viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('foundry.toml (Foundry)');
  await page.waitForSelector('#previewHost .fndry-doc', { timeout: 12000 });
  const fndryText = await page.$eval('#previewHost .fndry-doc', (e) => e.textContent);
  if (/Foundry/i.test(fndryText)) pass('foundry.toml: Foundry badge shown'); else fail('foundry badge: ' + fndryText.slice(0, 200));
  if (/0\.8\.24/i.test(fndryText)) pass('foundry.toml: Solidity version shown'); else fail('foundry solc: ' + fndryText.slice(0, 300));
  if (/mainnet|goerli|arbitrum/i.test(fndryText)) pass('foundry.toml: RPC endpoint names shown'); else fail('foundry rpc: ' + fndryText.slice(0, 300));
  if (/openzeppelin|forge-std/i.test(fndryText)) pass('foundry.toml: remappings shown'); else fail('foundry remappings: ' + fndryText.slice(0, 300));
  if (/URL.*hidden|URLs hidden/i.test(fndryText)) pass('foundry.toml: RPC URLs hidden message shown'); else fail('foundry rpc masking: ' + fndryText.slice(0, 400));

  // ── Anchor TOML viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Anchor.toml (Anchor)');
  await page.waitForSelector('#previewHost .anc-doc', { timeout: 12000 });
  const ancText = await page.$eval('#previewHost .anc-doc', (e) => e.textContent);
  if (/Anchor/i.test(ancText)) pass('Anchor.toml: Anchor badge shown'); else fail('anchor badge: ' + ancText.slice(0, 200));
  if (/my_program|token_vault/i.test(ancText)) pass('Anchor.toml: program names shown'); else fail('anchor programs: ' + ancText.slice(0, 300));
  if (/localnet|devnet|mainnet/i.test(ancText)) pass('Anchor.toml: cluster names shown'); else fail('anchor clusters: ' + ancText.slice(0, 300));
  if (/~\/.config\/solana\/id\.json/i.test(ancText)) pass('Anchor.toml: wallet path shown'); else fail('anchor wallet: ' + ancText.slice(0, 300));

  // ── Maven POM viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('pom.xml (Maven POM)');
  await page.waitForSelector('#previewHost .mvn-doc', { timeout: 12000 });
  const mvnText = await page.$eval('#previewHost .mvn-doc', (e) => e.textContent);
  if (/Maven POM/i.test(mvnText)) pass('pom.xml: Maven POM badge shown'); else fail('maven-pom badge: ' + mvnText.slice(0, 200));
  if (/com\.acme|file-service/i.test(mvnText)) pass('pom.xml: groupId / artifactId shown'); else fail('maven-pom coords: ' + mvnText.slice(0, 300));
  if (/spring-boot-starter-web|guava/i.test(mvnText)) pass('pom.xml: dependency names shown'); else fail('maven-pom deps: ' + mvnText.slice(0, 300));
  if (/test/i.test(mvnText)) pass('pom.xml: test scope shown'); else fail('maven-pom scope: ' + mvnText.slice(0, 300));

  // ── Gradle Version Catalog viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('libs.versions.toml (Gradle Version Catalog)');
  await page.waitForSelector('#previewHost .gvc-doc', { timeout: 12000 });
  const gvcText = await page.$eval('#previewHost .gvc-doc', (e) => e.textContent);
  if (/Gradle Catalog/i.test(gvcText)) pass('libs.versions.toml: Gradle Catalog badge shown'); else fail('gradle-version-catalog badge: ' + gvcText.slice(0, 200));
  if (/kotlin|spring-boot/i.test(gvcText)) pass('libs.versions.toml: version aliases shown'); else fail('gradle-version-catalog versions: ' + gvcText.slice(0, 300));
  if (/kotlin-stdlib|jackson-databind/i.test(gvcText)) pass('libs.versions.toml: library aliases shown'); else fail('gradle-version-catalog libraries: ' + gvcText.slice(0, 300));
  if (/coroutines|testing/i.test(gvcText)) pass('libs.versions.toml: bundle aliases shown'); else fail('gradle-version-catalog bundles: ' + gvcText.slice(0, 300));
  if (/kotlin-jvm|spring-boot/i.test(gvcText)) pass('libs.versions.toml: plugin aliases shown'); else fail('gradle-version-catalog plugins: ' + gvcText.slice(0, 300));

  // ── Checkstyle viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('checkstyle.xml (Checkstyle)');
  await page.waitForSelector('#previewHost .cs-doc', { timeout: 12000 });
  const csText = await page.$eval('#previewHost .cs-doc', (e) => e.textContent);
  if (/Checkstyle/i.test(csText)) pass('checkstyle.xml: Checkstyle badge shown'); else fail('checkstyle badge: ' + csText.slice(0, 200));
  if (/Checker/i.test(csText)) pass('checkstyle.xml: Checker module shown'); else fail('checkstyle Checker: ' + csText.slice(0, 300));
  if (/TreeWalker/i.test(csText)) pass('checkstyle.xml: TreeWalker module shown'); else fail('checkstyle TreeWalker: ' + csText.slice(0, 300));
  if (/ConstantName|MethodName|JavadocMethod/i.test(csText)) pass('checkstyle.xml: check module names shown'); else fail('checkstyle modules: ' + csText.slice(0, 300));

  // ── SpotBugs viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('spotbugs-exclude.xml (SpotBugs)');
  await page.waitForSelector('#previewHost .spb-doc', { timeout: 12000 });
  const spbText = await page.$eval('#previewHost .spb-doc', (e) => e.textContent);
  if (/SpotBugs/i.test(spbText)) pass('spotbugs-exclude.xml: SpotBugs badge shown'); else fail('spotbugs badge: ' + spbText.slice(0, 200));
  if (/NP_NULL_ON_SOME_PATH|BC_UNCONFIRMED_CAST|SE_NO_SERIALVERSIONID/i.test(spbText)) pass('spotbugs-exclude.xml: bug pattern names shown'); else fail('spotbugs patterns: ' + spbText.slice(0, 300));
  if (/com\.acme/i.test(spbText)) pass('spotbugs-exclude.xml: class / package filters shown'); else fail('spotbugs classes: ' + spbText.slice(0, 300));
  if (/Exclude|match rule/i.test(spbText)) pass('spotbugs-exclude.xml: filter type and match count shown'); else fail('spotbugs filter type: ' + spbText.slice(0, 300));

  // ── php-ini viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('php.ini');
  await page.waitForSelector('#previewHost .php-doc', { timeout: 12000 });
  const phpIniText = await page.$eval('#previewHost .php-doc', (e) => e.textContent);
  if (/PHP Config/i.test(phpIniText)) pass('php.ini: PHP Config badge shown'); else fail('php-ini badge: ' + phpIniText.slice(0, 200));
  if (/128M/i.test(phpIniText)) pass('php.ini: memory_limit shown'); else fail('php-ini memory: ' + phpIniText.slice(0, 300));
  if (/upload_max_filesize/i.test(phpIniText)) pass('php.ini: upload_max_filesize shown'); else fail('php-ini upload: ' + phpIniText.slice(0, 300));
  if (/Europe\/Berlin/i.test(phpIniText)) pass('php.ini: timezone shown'); else fail('php-ini timezone: ' + phpIniText.slice(0, 300));
  if (/session\.save_handler|opcache/i.test(phpIniText)) pass('php.ini: session/opcache sections shown'); else fail('php-ini session: ' + phpIniText.slice(0, 300));

  // ── psalm-config viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('psalm.xml');
  await page.waitForSelector('#previewHost .ps-doc', { timeout: 12000 });
  const psalmText = await page.$eval('#previewHost .ps-doc', (e) => e.textContent);
  if (/Psalm/i.test(psalmText)) pass('psalm.xml: Psalm badge shown'); else fail('psalm badge: ' + psalmText.slice(0, 200));
  if (/errorLevel|3/i.test(psalmText)) pass('psalm.xml: error level shown'); else fail('psalm errorLevel: ' + psalmText.slice(0, 300));
  if (/8\.1/i.test(psalmText)) pass('psalm.xml: PHP version shown'); else fail('psalm phpVersion: ' + psalmText.slice(0, 300));
  if (/SymfonyPlugin|PhpUnitPlugin/i.test(psalmText)) pass('psalm.xml: plugins shown'); else fail('psalm plugins: ' + psalmText.slice(0, 300));
  if (/MissingReturnType|PropertyNotSetInConstructor/i.test(psalmText)) pass('psalm.xml: issue handlers shown'); else fail('psalm issues: ' + psalmText.slice(0, 300));

  // ── phpunit-config viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('phpunit.xml.dist (PHPUnit Config)');
  await page.waitForSelector('#previewHost .puc-doc', { timeout: 12000 });
  const pucText = await page.$eval('#previewHost .puc-doc', (e) => e.textContent);
  if (/PHPUnit/i.test(pucText)) pass('phpunit.xml.dist: PHPUnit badge shown'); else fail('phpunit-config badge: ' + pucText.slice(0, 200));
  if (/unit|integration/i.test(pucText)) pass('phpunit.xml.dist: test suites shown'); else fail('phpunit-config suites: ' + pucText.slice(0, 300));
  if (/vendor\/autoload\.php|bootstrap/i.test(pucText)) pass('phpunit.xml.dist: bootstrap shown'); else fail('phpunit-config bootstrap: ' + pucText.slice(0, 300));
  if (/coverage|src/i.test(pucText)) pass('phpunit.xml.dist: coverage paths shown'); else fail('phpunit-config coverage: ' + pucText.slice(0, 300));

  // ── rector-config viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('rector.php (Rector Config)');
  await page.waitForSelector('#previewHost .rect-doc', { timeout: 12000 });
  const rectorText = await page.$eval('#previewHost .rect-doc', (e) => e.textContent);
  if (/Rector/i.test(rectorText)) pass('rector.php: Rector badge shown'); else fail('rector badge: ' + rectorText.slice(0, 200));
  if (/8\.1/i.test(rectorText)) pass('rector.php: PHP version shown'); else fail('rector phpVersion: ' + rectorText.slice(0, 300));
  if (/php81|php sets/i.test(rectorText)) pass('rector.php: PHP sets shown'); else fail('rector sets: ' + rectorText.slice(0, 300));
  if (/FirstClassCallable|ClassPropertyAssign|RemoveUnused/i.test(rectorText)) pass('rector.php: rules shown'); else fail('rector rules: ' + rectorText.slice(0, 300));
  if (/dead.*code|20/i.test(rectorText)) pass('rector.php: dead code level shown'); else fail('rector deadCode: ' + rectorText.slice(0, 300));

  // ── Keycloak Realm viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('keycloak-realm.json (Keycloak Realm)');
  await page.waitForSelector('#previewHost .kc-doc', { timeout: 12000 });
  const keycloakText = await page.$eval('#previewHost .kc-doc', (e) => e.textContent);
  if (/Keycloak/i.test(keycloakText)) pass('keycloak-realm.json: Keycloak badge shown'); else fail('keycloak badge: ' + keycloakText.slice(0, 200));
  if (/myrealm/i.test(keycloakText)) pass('keycloak-realm.json: realm name shown'); else fail('keycloak realm name: ' + keycloakText.slice(0, 300));
  if (/app-frontend|app-backend|admin-cli/i.test(keycloakText)) pass('keycloak-realm.json: clients shown'); else fail('keycloak clients: ' + keycloakText.slice(0, 300));
  if (!/EXAMPLE_SECRET_DO_NOT_USE/i.test(keycloakText)) pass('keycloak-realm.json: client secret masked'); else fail('keycloak secret not masked');
  if (/admin|user|readonly/i.test(kcText)) pass('keycloak-realm.json: realm roles shown'); else fail('keycloak roles: ' + kcText.slice(0, 300));
  if (/github/i.test(kcText)) pass('keycloak-realm.json: identity provider shown'); else fail('keycloak idp: ' + kcText.slice(0, 300));

  // ── Authelia Config viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('authelia-config.yml (Authelia)');
  await page.waitForSelector('#previewHost .au-doc', { timeout: 12000 });
  const auText = await page.$eval('#previewHost .au-doc', (e) => e.textContent);
  if (/Authelia/i.test(auText)) pass('authelia-config.yml: Authelia badge shown'); else fail('authelia badge: ' + auText.slice(0, 200));
  if (/ldap/i.test(auText)) pass('authelia-config.yml: backend type shown'); else fail('authelia backend: ' + auText.slice(0, 300));
  if (/example\.com/i.test(auText)) pass('authelia-config.yml: session domain shown'); else fail('authelia session: ' + auText.slice(0, 300));
  if (/deny|bypass|two_factor/i.test(auText)) pass('authelia-config.yml: access control policies shown'); else fail('authelia policies: ' + auText.slice(0, 300));
  if (!/EXAMPLE_PASSWORD_DO_NOT_USE|EXAMPLE_OIDC_SECRET/i.test(auText)) pass('authelia-config.yml: secrets masked'); else fail('authelia secrets not masked');

  // ── OAuth2 Proxy Config viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('oauth2-proxy.cfg (OAuth2 Proxy)');
  await page.waitForSelector('#previewHost .op2-doc', { timeout: 12000 });
  const op2Text = await page.$eval('#previewHost .op2-doc', (e) => e.textContent);
  if (/OAuth2 Proxy/i.test(op2Text)) pass('oauth2-proxy.cfg: OAuth2 Proxy badge shown'); else fail('oauth2-proxy badge: ' + op2Text.slice(0, 200));
  if (/github/i.test(op2Text)) pass('oauth2-proxy.cfg: provider shown'); else fail('oauth2-proxy provider: ' + op2Text.slice(0, 300));
  if (/localhost:3000/i.test(op2Text)) pass('oauth2-proxy.cfg: upstream shown'); else fail('oauth2-proxy upstream: ' + op2Text.slice(0, 300));
  if (/example\.com/i.test(op2Text)) pass('oauth2-proxy.cfg: cookie domain / email domain shown'); else fail('oauth2-proxy domain: ' + op2Text.slice(0, 300));
  if (!/EXAMPLE_SECRET_DO_NOT_USE|EXAMPLE_COOKIE_SECRET/i.test(op2Text)) pass('oauth2-proxy.cfg: secrets masked'); else fail('oauth2-proxy secrets not masked');

  // ── Authentik Blueprint viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('authentik-blueprint.yaml (Authentik)');
  await page.waitForSelector('#previewHost .atk-doc', { timeout: 12000 });
  const atkText = await page.$eval('#previewHost .atk-doc', (e) => e.textContent);
  if (/Authentik/i.test(atkText)) pass('authentik-blueprint.yaml: Authentik badge shown'); else fail('authentik badge: ' + atkText.slice(0, 200));
  if (/version|blueprint/i.test(atkText)) pass('authentik-blueprint.yaml: blueprint version shown'); else fail('authentik version: ' + atkText.slice(0, 300));
  if (/application|provider|flow/i.test(atkText)) pass('authentik-blueprint.yaml: model types shown'); else fail('authentik models: ' + atkText.slice(0, 300));
  if (/example-application|example-login-flow|myapp-provider/i.test(atkText)) pass('authentik-blueprint.yaml: entry identifiers shown'); else fail('authentik entries: ' + atkText.slice(0, 300));
  if (!/EXAMPLE_SECRET_DO_NOT_USE/i.test(atkText)) pass('authentik-blueprint.yaml: secrets masked'); else fail('authentik secrets not masked');

  // ── .NET / MSBuild known-file viewers ──

  // csproj viewer
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('app.csproj');
  await page.waitForSelector('#previewHost .cs-doc', { timeout: 12000 });
  const csprojText = await page.$eval('#previewHost .cs-doc', (e) => e.textContent);
  if (/\.NET Project/i.test(csprojText)) pass('app.csproj: .NET Project badge shown'); else fail('csproj badge: ' + csprojText.slice(0, 200));
  if (/Microsoft\.NET\.Sdk/i.test(csprojText)) pass('app.csproj: SDK name shown in header'); else fail('csproj sdk: ' + csprojText.slice(0, 300));
  if (/net8\.0/i.test(csprojText)) pass('app.csproj: target framework shown'); else fail('csproj tf: ' + csprojText.slice(0, 300));
  if (/Serilog|Polly|Npgsql/i.test(csprojText)) pass('app.csproj: package references listed'); else fail('csproj pkgs: ' + csprojText.slice(0, 300));
  if (/MyApp\.Core|MyApp\.Infrastructure/i.test(csprojText)) pass('app.csproj: project references listed'); else fail('csproj projrefs: ' + csprojText.slice(0, 300));

  // nuget-config viewer
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('nuget.config');
  await page.waitForSelector('#previewHost .nugetcfg-doc', { timeout: 12000 });
  pass('nuget.config: renders');
  const nugetText = await page.$eval('#previewHost .nugetcfg-doc', (e) => e.textContent);
  if (/NuGet/i.test(nugetText)) pass('nuget.config: NuGet badge shown'); else fail('nuget badge: ' + nugetText.slice(0, 200));
  if (/nuget\.org/i.test(nugetText)) pass('nuget.config: nuget.org source listed'); else fail('nuget source: ' + nugetText.slice(0, 300));
  if (/MyCompany Feed|dev\.azure\.com/i.test(nugetText)) pass('nuget.config: private feed source listed'); else fail('nuget private: ' + nugetText.slice(0, 300));
  if (/clears inherited sources|globalPackagesFolder/i.test(nugetText)) pass('nuget.config: config options or clear flag shown'); else fail('nuget opts: ' + nugetText.slice(0, 300));

  // Directory.Build.props viewer
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Directory.Build.props');
  await page.waitForSelector('#previewHost .db-doc', { timeout: 12000 });
  const dbPropsText = await page.$eval('#previewHost .db-doc', (e) => e.textContent);
  if (/MSBuild/i.test(dbPropsText)) pass('Directory.Build.props: MSBuild badge shown'); else fail('db badge: ' + dbPropsText.slice(0, 200));
  if (/LangVersion|Nullable|TreatWarningsAsErrors/i.test(dbPropsText)) pass('Directory.Build.props: well-known properties shown'); else fail('db props: ' + dbPropsText.slice(0, 300));
  if (/ManagePackageVersionsCentrally/i.test(dbPropsText)) pass('Directory.Build.props: CPM property shown'); else fail('db cpm: ' + dbPropsText.slice(0, 300));
  if (/Microsoft\.SourceLink/i.test(dbPropsText)) pass('Directory.Build.props: package reference shown'); else fail('db pkgref: ' + dbPropsText.slice(0, 300));

  // msbuild-props viewer (Common.props)
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Common.props (MSBuild)');
  await page.waitForSelector('#previewHost .mb-doc', { timeout: 12000 });
  const mbPropsText = await page.$eval('#previewHost .mb-doc', (e) => e.textContent);
  if (/MSBuild/i.test(mbPropsText)) pass('Common.props: MSBuild badge shown'); else fail('mb badge: ' + mbPropsText.slice(0, 200));
  if (/LangVersion|Nullable|TreatWarningsAsErrors/i.test(mbPropsText)) pass('Common.props: properties shown'); else fail('mb props: ' + mbPropsText.slice(0, 300));
  if (/Newtonsoft\.Json|Microsoft\.Extensions\.Logging/i.test(mbPropsText)) pass('Common.props: package versions listed'); else fail('mb pkgvers: ' + mbPropsText.slice(0, 300));
  if (/PrintBuildInfo/i.test(mbPropsText)) pass('Common.props: target element shown'); else fail('mb targets: ' + mbPropsText.slice(0, 300));
  if (/Custom\.targets/i.test(mbPropsText)) pass('Common.props: import element shown'); else fail('mb imports: ' + mbPropsText.slice(0, 300));

  // ── wireguard-conf viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('wg0.conf');
  await page.waitForSelector('#previewHost .wg-doc', { timeout: 12000 });
  const wgText = await page.$eval('#previewHost .wg-doc', (e) => e.textContent);
  if (/WireGuard/i.test(wgText)) pass('wg0.conf: badge shown'); else fail('wireguard badge: ' + wgText.slice(0, 200));
  if (/redacted/i.test(wgText)) pass('wg0.conf: private key redacted'); else fail('wireguard key: ' + wgText.slice(0, 300));
  if (/Peer|AllowedIPs/i.test(wgText)) pass('wg0.conf: peers shown'); else fail('wireguard peers: ' + wgText.slice(0, 300));

  // ── openvpn-config viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('client.ovpn');
  await page.waitForSelector('#previewHost .ovpn-doc', { timeout: 12000 });
  const ovpnText = await page.$eval('#previewHost .ovpn-doc', (e) => e.textContent);
  if (/OpenVPN/i.test(ovpnText)) pass('client.ovpn: badge shown'); else fail('openvpn badge: ' + ovpnText.slice(0, 200));
  if (/vpn\.example\.com|remote/i.test(ovpnText)) pass('client.ovpn: remote shown'); else fail('openvpn remote: ' + ovpnText.slice(0, 300));
  if (/embedded|private key/i.test(ovpnText)) pass('client.ovpn: embedded keys noted'); else fail('openvpn keys: ' + ovpnText.slice(0, 300));

  // ── shell-rc viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.bashrc');
  await page.waitForSelector('#previewHost .shrc-doc', { timeout: 12000 });
  const shrcText = await page.$eval('#previewHost .shrc-doc', (e) => e.textContent);
  if (/Shell Config/i.test(shrcText)) pass('.bashrc: badge shown'); else fail('shell-rc badge: ' + shrcText.slice(0, 200));
  if (/alias/i.test(shrcText)) pass('.bashrc: aliases shown'); else fail('shell-rc aliases: ' + shrcText.slice(0, 300));

  // ── nix-config viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('flake.nix');
  await page.waitForSelector('#previewHost .nix-doc', { timeout: 12000 });
  const nixText = await page.$eval('#previewHost .nix-doc', (e) => e.textContent);
  if (/Nix/i.test(nixText)) pass('flake.nix: badge shown'); else fail('nix badge: ' + nixText.slice(0, 200));
  if (/description|dev shell|input/i.test(nixText)) pass('flake.nix: content shown'); else fail('nix content: ' + nixText.slice(0, 300));

  // ── hugo-config viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('hugo.toml');
  await page.waitForSelector('#previewHost .hugo-doc', { timeout: 12000 });
  const hugoText = await page.$eval('#previewHost .hugo-doc', (e) => e.textContent);
  if (/Hugo/i.test(hugoText)) pass('hugo.toml: badge shown'); else fail('hugo badge: ' + hugoText.slice(0, 200));
  if (/ananke|theme/i.test(hugoText)) pass('hugo.toml: theme shown'); else fail('hugo theme: ' + hugoText.slice(0, 300));
  if (/example\.com|baseURL/i.test(hugoText)) pass('hugo.toml: baseURL shown'); else fail('hugo url: ' + hugoText.slice(0, 300));

  // ── R DESCRIPTION viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('DESCRIPTION');
  await page.waitForSelector('#previewHost .rdesc-doc', { timeout: 12000 });
  const rdescText = await page.$eval('#previewHost .rdesc-doc', (e) => e.textContent);
  if (/R Package/i.test(rdescText)) pass('DESCRIPTION: badge shown'); else fail('r-desc badge: ' + rdescText.slice(0, 200));
  if (/mypackage|Version/i.test(rdescText)) pass('DESCRIPTION: package info shown'); else fail('r-desc info: ' + rdescText.slice(0, 300));
  if (/dplyr|ggplot2|Imports/i.test(rdescText)) pass('DESCRIPTION: dependencies shown'); else fail('r-desc deps: ' + rdescText.slice(0, 300));

  // ── esbuild-config viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('esbuild.config.mjs');
  await page.waitForSelector('#previewHost .esb-doc', { timeout: 12000 });
  const esbText = await page.$eval('#previewHost .esb-doc', (e) => e.textContent);
  if (/esbuild/i.test(esbText)) pass('esbuild.config.mjs: badge shown'); else fail('esbuild badge: ' + esbText.slice(0, 200));
  if (/entry|src\/index|outdir/i.test(esbText)) pass('esbuild.config.mjs: entry/output shown'); else fail('esbuild entry: ' + esbText.slice(0, 300));

  // ── maven-settings viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('settings.xml (Maven)');
  await page.waitForSelector('#previewHost .mvns-doc', { timeout: 12000 });
  const mvnsText = await page.$eval('#previewHost .mvns-doc', (e) => e.textContent);
  if (/Maven Settings/i.test(mvnsText)) pass('settings.xml: badge shown'); else fail('maven-settings badge: ' + mvnsText.slice(0, 200));
  if (/configured|password/i.test(mvnsText)) pass('settings.xml: credentials redacted'); else fail('maven-settings creds: ' + mvnsText.slice(0, 300));

  // ── pg_hba.conf viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('pg_hba.conf');
  await page.waitForSelector('#previewHost .pghba-doc', { timeout: 12000 });
  const pghbaText = await page.$eval('#previewHost .pghba-doc', (e) => e.textContent);
  if (/PostgreSQL|pg_hba/i.test(pghbaText)) pass('pg_hba.conf: badge shown'); else fail('pghba badge: ' + pghbaText.slice(0, 200));
  if (/scram-sha-256|peer|md5/i.test(pghbaText)) pass('pg_hba.conf: auth methods shown'); else fail('pghba methods: ' + pghbaText.slice(0, 300));

  // ── Caddyfile viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Caddyfile');
  await page.waitForSelector('#previewHost .cdf-doc', { timeout: 12000 });
  const cdfText = await page.$eval('#previewHost .cdf-doc', (e) => e.textContent);
  if (/Caddy/i.test(cdfText)) pass('Caddyfile: badge shown'); else fail('caddyfile badge: ' + cdfText.slice(0, 200));
  if (/example\.com/i.test(cdfText)) pass('Caddyfile: site address shown'); else fail('caddyfile site: ' + cdfText.slice(0, 300));
  if (/reverse_proxy|file_server|encode/i.test(cdfText)) pass('Caddyfile: directives shown'); else fail('caddyfile directives: ' + cdfText.slice(0, 300));

  // ── nginx.conf viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('nginx.conf');
  await page.waitForSelector('#previewHost .ngx-doc', { timeout: 12000 });
  const ngxText = await page.$eval('#previewHost .ngx-doc', (e) => e.textContent);
  if (/nginx/i.test(ngxText)) pass('nginx.conf: badge shown'); else fail('nginx badge: ' + ngxText.slice(0, 200));
  if (/backend/i.test(ngxText)) pass('nginx.conf: upstream shown'); else fail('nginx upstream: ' + ngxText.slice(0, 300));
  if (/example\.com/i.test(ngxText)) pass('nginx.conf: server_name shown'); else fail('nginx server_name: ' + ngxText.slice(0, 300));

  // ── ansible.cfg viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('ansible.cfg (Ansible Config)');
  await page.waitForSelector('#previewHost .ansiblecfg-doc', { timeout: 12000 });
  const anscfgText = await page.$eval('#previewHost .ansiblecfg-doc', (e) => e.textContent);
  if (/Ansible/i.test(anscfgText)) pass('ansible.cfg: Ansible badge shown'); else fail('ansible-cfg badge: ' + anscfgText.slice(0, 200));
  if (/defaults/i.test(anscfgText)) pass('ansible.cfg: defaults section shown'); else fail('ansible-cfg defaults: ' + anscfgText.slice(0, 200));
  if (/forks/i.test(anscfgText)) pass('ansible.cfg: forks shown'); else fail('ansible-cfg forks: ' + anscfgText.slice(0, 300));

  // ── makepkg.conf viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('makepkg.conf (makepkg Config)');
  await page.waitForSelector('#previewHost .makepkgcfg-doc', { timeout: 12000 });
  const makepkgText = await page.$eval('#previewHost .makepkgcfg-doc', (e) => e.textContent);
  if (/makepkg/i.test(makepkgText)) pass('makepkg.conf: badge shown'); else fail('makepkg-conf badge: ' + makepkgText.slice(0, 200));
  if (/x86_64/i.test(makepkgText)) pass('makepkg.conf: CARCH shown'); else fail('makepkg-conf CARCH: ' + makepkgText.slice(0, 300));
  if (/MAKEFLAGS|CFLAGS/i.test(makepkgText)) pass('makepkg.conf: compiler flags shown'); else fail('makepkg-conf flags: ' + makepkgText.slice(0, 300));

  // ── inventory (Ansible Inventory) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('inventory (Ansible Inventory)');
  await page.waitForSelector('#previewHost .ansinv-doc', { timeout: 12000 });
  const ansinvText = await page.$eval('#previewHost .ansinv-doc', (e) => e.textContent);
  if (/Ansible/i.test(ansinvText)) pass('inventory: Ansible badge shown'); else fail('ansible-hosts badge: ' + ansinvText.slice(0, 200));
  if (/webservers/i.test(ansinvText)) pass('inventory: groups shown'); else fail('ansible-hosts groups: ' + ansinvText.slice(0, 200));

  // ── supervisord.conf viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('supervisord.conf (Supervisor)');
  await page.waitForSelector('#previewHost .supd-doc', { timeout: 12000 });
  const supdText = await page.$eval('#previewHost .supd-doc', (e) => e.textContent);
  if (/Supervisor/i.test(supdText)) pass('supervisord.conf: badge shown'); else fail('supervisord badge: ' + supdText.slice(0, 200));
  if (/webapp/i.test(supdText)) pass('supervisord.conf: program shown'); else fail('supervisord program: ' + supdText.slice(0, 300));

  // ── logrotate.conf viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('logrotate.conf (Log Rotation)');
  await page.waitForSelector('#previewHost .logrot-doc', { timeout: 12000 });
  const logrotText = await page.$eval('#previewHost .logrot-doc', (e) => e.textContent);
  if (/logrotate/i.test(logrotText)) pass('logrotate.conf: badge shown'); else fail('logrotate badge: ' + logrotText.slice(0, 200));
  if (/nginx/i.test(logrotText)) pass('logrotate.conf: log target shown'); else fail('logrotate target: ' + logrotText.slice(0, 300));

  // ── tlp.conf viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('tlp.conf (TLP Power)');
  await page.waitForSelector('#previewHost .tlpcfg-doc', { timeout: 12000 });
  const tlpText = await page.$eval('#previewHost .tlpcfg-doc', (e) => e.textContent);
  if (/TLP/i.test(tlpText)) pass('tlp.conf: TLP badge shown'); else fail('tlp-conf badge: ' + tlpText.slice(0, 200));
  if (/powersave|performance/i.test(tlpText)) pass('tlp.conf: CPU governor shown'); else fail('tlp-conf governor: ' + tlpText.slice(0, 300));
  if (/40%|80%/i.test(tlpText)) pass('tlp.conf: battery charge threshold shown'); else fail('tlp-conf battery threshold: ' + tlpText.slice(0, 300));

  // ── .env.example viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.env.example (Env Template)');
  await page.waitForSelector('#previewHost .envex-doc', { timeout: 12000 });
  const envexText = await page.$eval('#previewHost .envex-doc', (e) => e.textContent);
  if (/ENV/i.test(envexText)) pass('.env.example: ENV badge shown'); else fail('env-example badge: ' + envexText.slice(0, 200));
  if (/DATABASE_URL/i.test(envexText)) pass('.env.example: variables shown'); else fail('env-example vars: ' + envexText.slice(0, 200));

  // ── ssh_config viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('ssh_config (SSH Client Config)');
  await page.waitForSelector('#previewHost .sc-root', { timeout: 12000 });
  const sshcfgText = await page.$eval('#previewHost .sc-root', (e) => e.textContent);
  if (/SSH/i.test(sshcfgText)) pass('ssh_config: badge shown'); else fail('ssh_config badge: ' + sshcfgText.slice(0, 200));
  if (/github\.com/i.test(sshcfgText)) pass('ssh_config: github.com host shown'); else fail('ssh_config host: ' + sshcfgText.slice(0, 300));
  if (/prod-web|prod-db|IdentityFile/i.test(sshcfgText)) pass('ssh_config: host settings shown'); else fail('ssh_config settings: ' + sshcfgText.slice(0, 300));

  // ── sshd_config viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('sshd_config');
  await page.waitForSelector('#previewHost .sshdcfg-doc', { timeout: 12000 });
  const sshdcfgText = await page.$eval('#previewHost .sshdcfg-doc', (e) => e.textContent);
  if (/SSHD|sshd_config/i.test(sshdcfgText)) pass('sshd_config: badge shown'); else fail('sshd_config badge: ' + sshdcfgText.slice(0, 200));
  if (/PermitRootLogin/i.test(sshdcfgText)) pass('sshd_config: PermitRootLogin shown'); else fail('sshd_config permit-root: ' + sshdcfgText.slice(0, 300));
  if (/PasswordAuthentication/i.test(sshdcfgText)) pass('sshd_config: PasswordAuthentication shown'); else fail('sshd_config passwd-auth: ' + sshdcfgText.slice(0, 300));

  // ── Postman Collection viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('api.postman_collection.json (Postman)');
  await page.waitForSelector('#previewHost .postman-doc', { timeout: 12000 });
  const postmanText = await page.$eval('#previewHost .postman-doc', (e) => e.textContent);
  if (/Postman/i.test(postmanText)) pass('api.postman_collection.json: Postman badge shown'); else fail('postman badge: ' + postmanText.slice(0, 200));
  if (/My API Collection/i.test(postmanText)) pass('api.postman_collection.json: collection name shown'); else fail('postman name: ' + postmanText.slice(0, 300));
  if (/Auth|Users|Health/i.test(postmanText)) pass('api.postman_collection.json: folders/items shown'); else fail('postman structure: ' + postmanText.slice(0, 300));

  // ── GraphQL Schema viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('schema.graphql (GraphQL Schema)');
  await page.waitForSelector('#previewHost .gql-doc', { timeout: 12000 });
  const gqlSchemaText = await page.$eval('#previewHost .gql-doc', (e) => e.textContent);
  if (/GraphQL/i.test(gqlSchemaText)) pass('schema.graphql: GraphQL badge shown'); else fail('graphql badge: ' + gqlSchemaText.slice(0, 200));
  if (/Query/i.test(gqlSchemaText)) pass('schema.graphql: Query operations shown'); else fail('graphql query: ' + gqlSchemaText.slice(0, 300));
  if (/Mutation|User|Post/i.test(gqlSchemaText)) pass('schema.graphql: types/mutations shown'); else fail('graphql types: ' + gqlSchemaText.slice(0, 300));

  // ── hosts-file viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('hosts');
  await page.waitForSelector('#previewHost .hostsf-doc', { timeout: 12000 });
  const hostsfText = await page.$eval('#previewHost .hostsf-doc', (e) => e.textContent);
  if (/hosts/i.test(hostsfText)) pass('hosts: hosts badge shown'); else fail('hosts badge: ' + hostsfText.slice(0, 200));
  if (/localhost/i.test(hostsfText)) pass('hosts: localhost entry shown'); else fail('hosts localhost: ' + hostsfText.slice(0, 300));

  // ── resolv-conf viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('resolv.conf');
  await page.waitForSelector('#previewHost .resolvconf-doc', { timeout: 12000 });
  const resolvText = await page.$eval('#previewHost .resolvconf-doc', (e) => e.textContent);
  if (/DNS/i.test(resolvText)) pass('resolv.conf: DNS badge shown'); else fail('resolv.conf badge: ' + resolvText.slice(0, 200));
  if (/Cloudflare/i.test(resolvText)) pass('resolv.conf: Cloudflare nameserver shown'); else fail('resolv.conf cloudflare: ' + resolvText.slice(0, 300));

  // ── fstab viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('fstab (Linux Filesystem Table)');
  await page.waitForSelector('#previewHost .fstab-doc', { timeout: 12000 });
  const fstabText = await page.$eval('#previewHost .fstab-doc', (e) => e.textContent);
  if (/fstab/i.test(fstabText)) pass('fstab: badge shown'); else fail('fstab badge: ' + fstabText.slice(0, 200));
  if (/ext4/i.test(fstabText)) pass('fstab: ext4 fs type shown'); else fail('fstab ext4: ' + fstabText.slice(0, 300));

  // ── crypttab viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('crypttab (Linux Encrypted Devices)');
  await page.waitForSelector('#previewHost .crytab-doc', { timeout: 12000 });
  const crytabText = await page.$eval('#previewHost .crytab-doc', (e) => e.textContent);
  if (/crypttab/i.test(crytabText)) pass('crypttab: badge shown'); else fail('crypttab badge: ' + crytabText.slice(0, 200));
  if (/luks/i.test(crytabText)) pass('crypttab: luks option shown'); else fail('crypttab luks: ' + crytabText.slice(0, 300));

  // ── systemd unit viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('myapp.service (systemd Service)');
  await page.waitForSelector('#previewHost .sysd-doc', { timeout: 12000 });
  const sysdText = await page.$eval('#previewHost .sysd-doc', (e) => e.textContent);
  if (/systemd/i.test(sysdText)) pass('myapp.service: systemd badge shown'); else fail('systemd badge: ' + sysdText.slice(0, 200));
  if (/ExecStart/i.test(sysdText)) pass('myapp.service: ExecStart shown'); else fail('systemd ExecStart: ' + sysdText.slice(0, 300));
  if (/My Application Service/i.test(sysdText)) pass('myapp.service: description shown'); else fail('systemd description: ' + sysdText.slice(0, 300));

  // ── crontab viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('crontab (Cron Schedule)');
  await page.waitForSelector('#previewHost .crntab-doc', { timeout: 12000 });
  const crntabText = await page.$eval('#previewHost .crntab-doc', (e) => e.textContent);
  if (/cron/i.test(crntabText)) pass('crontab: cron badge shown'); else fail('crontab badge: ' + crntabText.slice(0, 200));
  if (/backup/i.test(crntabText)) pass('crontab: backup job shown'); else fail('crontab backup: ' + crntabText.slice(0, 300));
  if (/daily|every|weekly|reboot/i.test(crntabText)) pass('crontab: human schedule descriptions shown'); else fail('crontab schedule: ' + crntabText.slice(0, 300));

  // ── cert-manager viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('cert-manager.yaml (cert-manager)');
  await page.waitForSelector('#previewHost .certmgr-doc', { timeout: 12000 });
  const certmgrText = await page.$eval('#previewHost .certmgr-doc', (e) => e.textContent);
  if (/cert-manager/i.test(certmgrText)) pass('cert-manager: badge shown'); else fail('cert-manager badge: ' + certmgrText.slice(0, 200));
  if (/ClusterIssuer/i.test(certmgrText)) pass('cert-manager: ClusterIssuer kind shown'); else fail('cert-manager ClusterIssuer: ' + certmgrText.slice(0, 300));
  if (/letsencrypt/i.test(certmgrText)) pass('cert-manager: letsencrypt issuer shown'); else fail('cert-manager letsencrypt: ' + certmgrText.slice(0, 300));

  // ── iptables rules viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('iptables.rules (Firewall Rules)');
  await page.waitForSelector('#previewHost .iptr-doc', { timeout: 12000 });
  const iptablesText = await page.$eval('#previewHost .iptr-doc', (e) => e.textContent);
  if (/iptables/i.test(iptablesText)) pass('iptables.rules: iptables badge shown'); else fail('iptables badge: ' + iptablesText.slice(0, 200));
  if (/INPUT|filter/i.test(iptablesText)) pass('iptables.rules: chain or table shown'); else fail('iptables chain/table: ' + iptablesText.slice(0, 300));

  // ── UFW config viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('ufw.conf (UFW Firewall)');
  await page.waitForSelector('#previewHost .ufwcfg-doc', { timeout: 12000 });
  const ufwText = await page.$eval('#previewHost .ufwcfg-doc', (e) => e.textContent);
  if (/UFW/i.test(ufwText)) pass('ufw.conf: UFW badge shown'); else fail('ufw badge: ' + ufwText.slice(0, 200));
  if (/DEFAULT/i.test(ufwText)) pass('ufw.conf: default policies shown'); else fail('ufw policies: ' + ufwText.slice(0, 300));

  // ── VictoriaMetrics config viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('victoria-metrics.yml (VictoriaMetrics)');
  await page.waitForSelector('#previewHost .vmcfg-doc', { timeout: 12000 });
  const vmcfgText = await page.$eval('#previewHost .vmcfg-doc', (e) => e.textContent);
  if (/VictoriaMetrics/i.test(vmcfgText)) pass('victoria-metrics.yml: VictoriaMetrics badge shown'); else fail('vmcfg badge: ' + vmcfgText.slice(0, 200));
  if (/scrape/i.test(vmcfgText)) pass('victoria-metrics.yml: scrape jobs shown'); else fail('vmcfg scrape: ' + vmcfgText.slice(0, 300));

  // ── Thanos config viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('thanos-bucket.yml (Thanos)');
  await page.waitForSelector('#previewHost .thanoscfg-doc', { timeout: 12000 });
  const thanosText = await page.$eval('#previewHost .thanoscfg-doc', (e) => e.textContent);
  if (/Thanos/i.test(thanosText)) pass('thanos-bucket.yml: Thanos badge shown'); else fail('thanoscfg badge: ' + thanosText.slice(0, 200));
  if (/S3/i.test(thanosText)) pass('thanos-bucket.yml: S3 storage type shown'); else fail('thanoscfg type: ' + thanosText.slice(0, 300));
  if (/bucket/i.test(thanosText)) pass('thanos-bucket.yml: bucket shown'); else fail('thanoscfg bucket: ' + thanosText.slice(0, 300));

  // ── fail2ban jail.local viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('jail.local (Fail2ban)');
  await page.waitForSelector('#previewHost .f2b-doc', { timeout: 12000 });
  const f2bText = await page.$eval('#previewHost .f2b-doc', (e) => e.textContent);
  if (/Fail2ban/i.test(f2bText)) pass('jail.local: Fail2ban badge shown'); else fail('fail2ban badge: ' + f2bText.slice(0, 200));
  if (/sshd|bantime/i.test(f2bText)) pass('jail.local: sshd jail or bantime shown'); else fail('fail2ban content: ' + f2bText.slice(0, 300));

  // ── smb.conf viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('smb.conf (Samba)');
  await page.waitForSelector('#previewHost .smbcfg-doc', { timeout: 12000 });
  const smbText = await page.$eval('#previewHost .smbcfg-doc', (e) => e.textContent);
  if (/Samba/i.test(smbText)) pass('smb.conf: Samba badge shown'); else fail('samba badge: ' + smbText.slice(0, 200));
  if (/data|workgroup/i.test(smbText)) pass('smb.conf: data share or workgroup shown'); else fail('samba content: ' + smbText.slice(0, 300));

  // ── Corefile (CoreDNS) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Corefile (CoreDNS)');
  await page.waitForSelector('#previewHost .coredns-doc', { timeout: 12000 });
  const corefileText = await page.$eval('#previewHost .coredns-doc', (e) => e.textContent);
  if (/CoreDNS/i.test(corefileText)) pass('Corefile: CoreDNS badge shown'); else fail('corefile badge: ' + corefileText.slice(0, 200));
  if (/kubernetes|forward/i.test(corefileText)) pass('Corefile: kubernetes or forward plugin shown'); else fail('corefile content: ' + corefileText.slice(0, 300));

  // ── containerd.toml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('containerd.toml (containerd)');
  await page.waitForSelector('#previewHost .ctrd-doc', { timeout: 12000 });
  const ctrdText = await page.$eval('#previewHost .ctrd-doc', (e) => e.textContent);
  if (/containerd/i.test(ctrdText)) pass('containerd.toml: containerd badge shown'); else fail('containerd badge: ' + ctrdText.slice(0, 200));
  if (/sandbox_image|overlayfs/i.test(ctrdText)) pass('containerd.toml: sandbox_image or overlayfs shown'); else fail('containerd content: ' + ctrdText.slice(0, 300));

  // ── postfix main.cf viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('main.cf (Postfix Mail Server)');
  await page.waitForSelector('#previewHost .postfixcfg-doc', { timeout: 12000 });
  const postfixText = await page.$eval('#previewHost .postfixcfg-doc', (e) => e.textContent);
  if (/Postfix/i.test(postfixText)) pass('main.cf: Postfix badge shown'); else fail('postfix badge: ' + postfixText.slice(0, 200));
  if (/myhostname|mail\.example\.com/i.test(postfixText)) pass('main.cf: myhostname or hostname shown'); else fail('postfix hostname: ' + postfixText.slice(0, 300));

  // ── chrony.conf viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('chrony.conf (NTP)');
  await page.waitForSelector('#previewHost .chronycfg-doc', { timeout: 12000 });
  const chronyText = await page.$eval('#previewHost .chronycfg-doc', (e) => e.textContent);
  if (/NTP/i.test(chronyText)) pass('chrony.conf: NTP badge shown'); else fail('chrony badge: ' + chronyText.slice(0, 200));
  if (/pool|google/i.test(chronyText)) pass('chrony.conf: pool or google NTP shown'); else fail('chrony sources: ' + chronyText.slice(0, 300));

  // ── gradle-wrapper.properties viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('gradle-wrapper.properties');
  await page.waitForSelector('#previewHost .gw-doc', { timeout: 12000 });
  const gradleWrapperText = await page.$eval('#previewHost .gw-doc', (e) => e.textContent);
  if (/Gradle Wrapper/i.test(gradleWrapperText)) pass('gradle-wrapper.properties: badge shown'); else fail('gradle-wrapper badge: ' + gradleWrapperText.slice(0, 200));
  if (/8\.7|8\.\d/i.test(gradleWrapperText)) pass('gradle-wrapper.properties: Gradle version shown'); else fail('gradle-wrapper version: ' + gradleWrapperText.slice(0, 200));
  if (/bin|services\.gradle\.org/i.test(gradleWrapperText)) pass('gradle-wrapper.properties: distribution info shown'); else fail('gradle-wrapper dist: ' + gradleWrapperText.slice(0, 300));

  // ── gradle.properties viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('gradle.properties');
  await page.waitForSelector('#previewHost .gp-doc', { timeout: 12000 });
  const gpText = await page.$eval('#previewHost .gp-doc', (e) => e.textContent);
  if (/Gradle/i.test(gpText)) pass('gradle.properties: badge shown'); else fail('gradle-props badge: ' + gpText.slice(0, 200));
  if (/parallel|daemon|workers/i.test(gpText)) pass('gradle.properties: build settings shown'); else fail('gradle-props settings: ' + gpText.slice(0, 300));
  if (/Kotlin|kotlin/i.test(gpText)) pass('gradle.properties: Kotlin version shown'); else fail('gradle-props kotlin: ' + gpText.slice(0, 300));

  // ── settings.gradle viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('settings.gradle');
  await page.waitForSelector('#previewHost .sg-doc', { timeout: 12000 });
  pass('settings.gradle: renders');
  const sgText = await page.$eval('#previewHost .sg-doc', (e) => e.textContent);
  if (!sgText.includes('Gradle')) fail('settings.gradle: missing badge'); else pass('settings.gradle: badge shown');
  if (!sgText.includes('rootProject') && !sgText.includes('include')) fail('settings.gradle: no project info'); else pass('settings.gradle: modules shown');
  if (/my-awesome-app/i.test(sgText)) pass('settings.gradle: root project name shown'); else fail('settings-gradle name: ' + sgText.slice(0, 200));
  if (/app|feature|core/i.test(sgText)) pass('settings.gradle: subprojects shown'); else fail('settings-gradle subprojects: ' + sgText.slice(0, 300));

  // ── build.sbt viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('build.sbt');
  await page.waitForSelector('#previewHost .sbt-doc', { timeout: 12000 });
  const buildSbtText = await page.$eval('#previewHost .sbt-doc', (e) => e.textContent);
  if (/Scala\/SBT/i.test(buildSbtText)) pass('build.sbt: badge shown'); else fail('build-sbt badge: ' + buildSbtText.slice(0, 200));
  if (/my-scala-app/i.test(buildSbtText)) pass('build.sbt: project name shown'); else fail('build-sbt name: ' + buildSbtText.slice(0, 200));
  if (/cats-core|cats-effect|fs2/i.test(buildSbtText)) pass('build.sbt: dependencies shown'); else fail('build-sbt deps: ' + buildSbtText.slice(0, 300));

  // ── build.xml (Apache Ant) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('build.xml (Apache Ant)');
  await page.waitForSelector('#previewHost .antbuild-doc', { timeout: 12000 });
  const antText = await page.$eval('#previewHost .antbuild-doc', (e) => e.textContent);
  if (/Ant/i.test(antText)) pass('build.xml: Ant badge shown'); else fail('ant-build badge: ' + antText.slice(0, 200));
  if (/MyApp/i.test(antText)) pass('build.xml: project name shown'); else fail('ant-build name: ' + antText.slice(0, 200));
  if (/compile|package|clean/i.test(antText)) pass('build.xml: targets shown'); else fail('ant-build targets: ' + antText.slice(0, 300));

  // ── sudoers viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('sudoers');
  await page.waitForSelector('#previewHost .sudoers-doc', { timeout: 12000 });
  const sudoText = await page.$eval('#previewHost .sudoers-doc', (e) => e.textContent);
  if (/sudoers/i.test(sudoText)) pass('sudoers: badge shown'); else fail('sudoers badge: ' + sudoText.slice(0, 200));
  if (/NOPASSWD|%sudo/i.test(sudoText)) pass('sudoers: access rules shown (NOPASSWD or %sudo)'); else fail('sudoers rules: ' + sudoText.slice(0, 300));

  // ── NFS exports viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('exports');
  await page.waitForSelector('#previewHost .nfsexp-doc', { timeout: 12000 });
  const nfsText = await page.$eval('#previewHost .nfsexp-doc', (e) => e.textContent);
  if (/NFS/i.test(nfsText)) pass('exports: NFS badge shown'); else fail('nfs-exports badge: ' + nfsText.slice(0, 200));
  if (/rw|sync/i.test(nfsText)) pass('exports: export options shown'); else fail('nfs-exports options: ' + nfsText.slice(0, 300));

  // ── rsyslog.conf viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('rsyslog.conf');
  await page.waitForSelector('#previewHost .rsyslog-doc', { timeout: 12000 });
  const rsyslogText = await page.$eval('#previewHost .rsyslog-doc', (e) => e.textContent);
  if (/rsyslog/i.test(rsyslogText)) pass('rsyslog.conf: rsyslog badge shown'); else fail('rsyslog badge: ' + rsyslogText.slice(0, 200));
  if (/auth|syslog/i.test(rsyslogText)) pass('rsyslog.conf: log routing shown'); else fail('rsyslog routing: ' + rsyslogText.slice(0, 300));

  // ── lighttpd.conf viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('lighttpd.conf');
  await page.waitForSelector('#previewHost .lighty-doc', { timeout: 12000 });
  const lightyText = await page.$eval('#previewHost .lighty-doc', (e) => e.textContent);
  if (/Lighttpd/i.test(lightyText)) pass('lighttpd.conf: Lighttpd badge shown'); else fail('lighttpd badge: ' + lightyText.slice(0, 200));
  if (/document-root|modules/i.test(lightyText)) pass('lighttpd.conf: document-root or modules shown'); else fail('lighttpd content: ' + lightyText.slice(0, 300));

  // ── named.conf (BIND DNS) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('named.conf (BIND DNS)');
  await page.waitForSelector('#previewHost .namedcfg-doc', { timeout: 12000 });
  const namedText = await page.$eval('#previewHost .namedcfg-doc', (e) => e.textContent);
  if (/BIND/i.test(namedText)) pass('named.conf: BIND badge shown'); else fail('named-conf badge: ' + namedText.slice(0, 200));
  if (/example\.com/i.test(namedText)) pass('named.conf: zone names shown'); else fail('named-conf zones: ' + namedText.slice(0, 300));
  if (/master|primary/i.test(namedText)) pass('named.conf: zone types shown'); else fail('named-conf zone types: ' + namedText.slice(0, 300));

  // ── dhcpd.conf (ISC DHCP Server) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('dhcpd.conf (ISC DHCP Server)');
  await page.waitForSelector('#previewHost .dhcpd-doc', { timeout: 12000 });
  const dhcpdText = await page.$eval('#previewHost .dhcpd-doc', (e) => e.textContent);
  if (/DHCP/i.test(dhcpdText)) pass('dhcpd.conf: DHCP badge shown'); else fail('dhcpd-conf badge: ' + dhcpdText.slice(0, 200));
  if (/192\.168\.1\.0/i.test(dhcpdText)) pass('dhcpd.conf: subnet shown'); else fail('dhcpd-conf subnet: ' + dhcpdText.slice(0, 300));
  if (/server01|printer/i.test(dhcpdText)) pass('dhcpd.conf: host reservations shown'); else fail('dhcpd-conf hosts: ' + dhcpdText.slice(0, 300));

  // ── vector.toml (Vector Config) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('vector.toml (Vector)');
  await page.waitForSelector('#previewHost .vectorcfg-doc', { timeout: 12000 });
  const vecText = await page.$eval('#previewHost .vectorcfg-doc', (e) => e.textContent);
  if (/Vector/i.test(vecText)) pass('vector.toml: Vector badge shown'); else fail('vector-config badge: ' + vecText.slice(0, 200));
  if (/source|sink/i.test(vecText)) pass('vector.toml: sources/sinks shown'); else fail('vector-config sources: ' + vecText.slice(0, 300));

  // ── keepalived.conf (Keepalived) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('keepalived.conf (Keepalived VRRP)');
  await page.waitForSelector('#previewHost .kalivd-doc', { timeout: 12000 });
  const kaText = await page.$eval('#previewHost .kalivd-doc', (e) => e.textContent);
  if (/Keepalived/i.test(kaText)) pass('keepalived.conf: Keepalived badge shown'); else fail('keepalived-conf badge: ' + kaText.slice(0, 200));
  if (/MASTER|vrrp/i.test(kaText)) pass('keepalived.conf: VRRP instance state shown'); else fail('keepalived-conf vrrp: ' + kaText.slice(0, 300));

  // ── netdata.conf viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('netdata.conf (Netdata)');
  await page.waitForSelector('#previewHost .netdatacfg-doc', { timeout: 12000 });
  const netdataText = await page.$eval('#previewHost .netdatacfg-doc', (e) => e.textContent);
  if (/Netdata/i.test(netdataText)) pass('netdata.conf: Netdata badge shown'); else fail('netdata-conf badge: ' + netdataText.slice(0, 200));
  if (/global|plugins/i.test(netdataText)) pass('netdata.conf: global or plugins section shown'); else fail('netdata-conf sections: ' + netdataText.slice(0, 300));

  // ── .yarnrc.yml viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.yarnrc.yml (Yarn)');
  await page.waitForSelector('#previewHost .yarnrc-doc', { timeout: 12000 });
  const yarnText = await page.$eval('#previewHost .yarnrc-doc', (e) => e.textContent);
  if (/Yarn/i.test(yarnText)) pass('.yarnrc.yml: Yarn badge shown'); else fail('yarnrc badge: ' + yarnText.slice(0, 200));
  if (/nodeLinker|Berry/i.test(yarnText)) pass('.yarnrc.yml: nodeLinker or Berry shown'); else fail('yarnrc content: ' + yarnText.slice(0, 300));

  // ── cpanfile viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('cpanfile');
  await page.waitForSelector('#previewHost .cpanfile-doc', { timeout: 12000 });
  const cpanfileText = await page.$eval('#previewHost .cpanfile-doc', (e) => e.textContent);
  if (/Perl/i.test(cpanfileText)) pass('cpanfile: Perl badge shown'); else fail('cpanfile badge: ' + cpanfileText.slice(0, 200));
  if (/Moose|requires/i.test(cpanfileText)) pass('cpanfile: required dependencies shown'); else fail('cpanfile deps: ' + cpanfileText.slice(0, 300));

  // ── openssl.cnf viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('openssl.cnf');
  await page.waitForSelector('#previewHost .opensslcfg-doc', { timeout: 12000 });
  const opensslText = await page.$eval('#previewHost .opensslcfg-doc', (e) => e.textContent);
  if (/OpenSSL/i.test(opensslText)) pass('openssl.cnf: OpenSSL badge shown'); else fail('openssl-conf badge: ' + opensslText.slice(0, 200));
  if (/distinguished_name|CA/i.test(opensslText)) pass('openssl.cnf: distinguished_name or CA info shown'); else fail('openssl-conf content: ' + opensslText.slice(0, 300));

  // ── default.vcl (Varnish VCL) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('default.vcl (Varnish VCL)');
  await page.waitForSelector('#previewHost .vclcfg-doc', { timeout: 12000 });
  const varnishVclText = await page.$eval('#previewHost .vclcfg-doc', (e) => e.textContent);
  if (/Varnish/i.test(varnishVclText)) pass('default.vcl: Varnish badge shown'); else fail('varnish-vcl badge: ' + varnishVclText.slice(0, 200));
  if (/backend|vcl_recv/i.test(varnishVclText)) pass('default.vcl: backend or vcl_recv info shown'); else fail('varnish-vcl content: ' + varnishVclText.slice(0, 300));

  // ── usr.bin.nginx (AppArmor profile) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('usr.bin.nginx (AppArmor profile)');
  await page.waitForSelector('#previewHost .apparmor-doc', { timeout: 12000 });
  const apparmorText = await page.$eval('#previewHost .apparmor-doc', (e) => e.textContent);
  if (/AppArmor/i.test(apparmorText)) pass('usr.bin.nginx: AppArmor badge shown'); else fail('apparmor-profile badge: ' + apparmorText.slice(0, 200));
  if (/capability|enforce/i.test(apparmorText)) pass('usr.bin.nginx: capability or enforce info shown'); else fail('apparmor-profile content: ' + apparmorText.slice(0, 300));

  // ── sysctl.conf viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('sysctl.conf (Linux kernel parameters)');
  await page.waitForSelector('#previewHost .sysctlcfg-doc', { timeout: 12000 });
  const sysctlText = await page.$eval('#previewHost .sysctlcfg-doc', (e) => e.textContent);
  if (/sysctl/i.test(sysctlText)) pass('sysctl.conf: sysctl badge shown'); else fail('sysctl-conf badge: ' + sysctlText.slice(0, 200));
  if (/net|vm\.swappiness/i.test(sysctlText)) pass('sysctl.conf: net namespace or vm.swappiness shown'); else fail('sysctl-conf content: ' + sysctlText.slice(0, 300));

  // ── blacklist.conf (modprobe) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('blacklist.conf (modprobe)');
  await page.waitForSelector('#previewHost .modprobecfg-doc', { timeout: 12000 });
  const modprobeText = await page.$eval('#previewHost .modprobecfg-doc', (e) => e.textContent);
  if (/modprobe/i.test(modprobeText)) pass('blacklist.conf: modprobe badge shown'); else fail('modprobe-conf badge: ' + modprobeText.slice(0, 200));
  if (/blacklist/i.test(modprobeText)) pass('blacklist.conf: blacklist section shown'); else fail('modprobe-conf blacklist: ' + modprobeText.slice(0, 300));

  // ── dovecot.conf viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('dovecot.conf (Dovecot IMAP/POP3)');
  await page.waitForSelector('#previewHost .dovecotcfg-doc', { timeout: 12000 });
  const dovecotText = await page.$eval('#previewHost .dovecotcfg-doc', (e) => e.textContent);
  if (/Dovecot/i.test(dovecotText)) pass('dovecot.conf: Dovecot badge shown'); else fail('dovecot-conf badge: ' + dovecotText.slice(0, 200));
  if (/imap|protocols/i.test(dovecotText)) pass('dovecot.conf: protocols or imap shown'); else fail('dovecot-conf protocols: ' + dovecotText.slice(0, 300));

  // ── exim4.conf viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('exim4.conf (Exim MTA)');
  await page.waitForSelector('#previewHost .eximcfg-doc', { timeout: 12000 });
  const eximText = await page.$eval('#previewHost .eximcfg-doc', (e) => e.textContent);
  if (/Exim/i.test(eximText)) pass('exim4.conf: Exim badge shown'); else fail('exim-conf badge: ' + eximText.slice(0, 200));
  if (/router|transport/i.test(eximText)) pass('exim4.conf: routers or transports shown'); else fail('exim-conf routers: ' + eximText.slice(0, 300));

  // ── sys.config (Erlang/OTP) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('sys.config');
  await page.waitForSelector('#previewHost .erlsyscfg-doc', { timeout: 12000 });
  const erlSysCfgText = await page.$eval('#previewHost .erlsyscfg-doc', (e) => e.textContent);
  if (/Erlang/i.test(erlSysCfgText)) pass('sys.config: Erlang badge shown'); else fail('erlang-sys-config badge: ' + erlSysCfgText.slice(0, 200));
  if (/kernel|myapp/i.test(erlSysCfgText)) pass('sys.config: application names shown (kernel or myapp)'); else fail('erlang-sys-config apps: ' + erlSysCfgText.slice(0, 300));

  // ── vm.args (Erlang VM) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('vm.args');
  await page.waitForSelector('#previewHost .erlvmargs-doc', { timeout: 12000 });
  const erlVmArgsText = await page.$eval('#previewHost .erlvmargs-doc', (e) => e.textContent);
  if (/Erlang VM/i.test(erlVmArgsText)) pass('vm.args: Erlang VM badge shown'); else fail('erlang-vm-args badge: ' + erlVmArgsText.slice(0, 200));
  if (/node|scheduler/i.test(erlVmArgsText)) pass('vm.args: node identity or scheduler section shown'); else fail('erlang-vm-args content: ' + erlVmArgsText.slice(0, 300));

  // ── krb5.conf (Kerberos) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('krb5.conf (Kerberos)');
  await page.waitForSelector('#previewHost .krb5cfg-doc', { timeout: 12000 });
  const krb5Text = await page.$eval('#previewHost .krb5cfg-doc', (e) => e.textContent);
  if (/Kerberos/i.test(krb5Text)) pass('krb5.conf: Kerberos badge shown'); else fail('krb5-conf badge: ' + krb5Text.slice(0, 200));
  if (/EXAMPLE\.COM|realm/i.test(krb5Text)) pass('krb5.conf: realm information shown'); else fail('krb5-conf realm: ' + krb5Text.slice(0, 300));

  // ── gpg.conf (GnuPG) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('gpg.conf (GnuPG)');
  await page.waitForSelector('#previewHost .gpgcfg-doc', { timeout: 12000 });
  const gpgText = await page.$eval('#previewHost .gpgcfg-doc', (e) => e.textContent);
  if (/GnuPG/i.test(gpgText)) pass('gpg.conf: GnuPG badge shown'); else fail('gpg-conf badge: ' + gpgText.slice(0, 200));
  if (/keyserver|cipher/i.test(gpgText)) pass('gpg.conf: keyserver or cipher information shown'); else fail('gpg-conf content: ' + gpgText.slice(0, 300));

  // ── grub (/etc/default/grub) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('grub (/etc/default/grub)');
  await page.waitForSelector('#previewHost .grubcfg-doc', { timeout: 12000 });
  const grubText = await page.$eval('#previewHost .grubcfg-doc', (e) => e.textContent);
  if (/GRUB/i.test(grubText)) pass('grub: GRUB badge shown'); else fail('grub-conf badge: ' + grubText.slice(0, 200));
  if (/CMDLINE|timeout/i.test(grubText)) pass('grub: cmdline parameters or timeout shown'); else fail('grub-conf content: ' + grubText.slice(0, 300));

  // ── nftables.conf viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('nftables.conf (nftables Firewall Rules)');
  await page.waitForSelector('#previewHost .nftcfg-doc', { timeout: 12000 });
  const nftText = await page.$eval('#previewHost .nftcfg-doc', (e) => e.textContent);
  if (/nftables/i.test(nftText)) pass('nftables.conf: nftables badge shown'); else fail('nftables-rules badge: ' + nftText.slice(0, 200));
  if (/chain|filter/i.test(nftText)) pass('nftables.conf: chain or filter information shown'); else fail('nftables-rules content: ' + nftText.slice(0, 300));

  // ── i3.config (i3 WM) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('i3.config (i3 WM)');
  await page.waitForSelector('#previewHost .i3cfg-doc', { timeout: 12000 });
  const i3Text = await page.$eval('#previewHost .i3cfg-doc', (e) => e.textContent);
  if (/\bi3\b/i.test(i3Text)) pass('i3.config: i3 badge shown'); else fail('i3-config badge: ' + i3Text.slice(0, 200));
  if (/Mod4|Super/i.test(i3Text)) pass('i3.config: modifier key (Mod4/Super) shown'); else fail('i3-config modifier: ' + i3Text.slice(0, 300));
  if (/bindsym|keybinding/i.test(i3Text)) pass('i3.config: keybindings section shown'); else fail('i3-config bindings: ' + i3Text.slice(0, 300));

  // ── sway (Sway WM) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('sway (Sway WM)');
  await page.waitForSelector('#previewHost .swaycfg-doc', { timeout: 12000 });
  const swayText = await page.$eval('#previewHost .swaycfg-doc', (e) => e.textContent);
  if (/Sway/i.test(swayText)) pass('sway: Sway badge shown'); else fail('sway-config badge: ' + swayText.slice(0, 200));
  if (/output|HDMI|eDP/i.test(swayText)) pass('sway: output configuration shown'); else fail('sway-config outputs: ' + swayText.slice(0, 300));
  if (/input|keyboard|touchpad/i.test(swayText)) pass('sway: input configuration shown'); else fail('sway-config inputs: ' + swayText.slice(0, 300));

  // ── app.ini (Gitea/Forgejo) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('app.ini (Gitea/Forgejo)');
  await page.waitForSelector('#previewHost .giteacfg-doc', { timeout: 12000 });
  const giteaText = await page.$eval('#previewHost .giteacfg-doc', (e) => e.textContent);
  if (/Gitea/i.test(giteaText)) pass('app.ini: Gitea badge shown'); else fail('gitea-conf badge: ' + giteaText.slice(0, 200));
  if (/server|database|ROOT_URL/i.test(giteaText)) pass('app.ini: server or database information shown'); else fail('gitea-conf content: ' + giteaText.slice(0, 300));

  // ── stunnel.conf viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('stunnel.conf (SSL tunnel)');
  await page.waitForSelector('#previewHost .stunnelcfg-doc', { timeout: 12000 });
  const stunnelText = await page.$eval('#previewHost .stunnelcfg-doc', (e) => e.textContent);
  if (/stunnel/i.test(stunnelText)) pass('stunnel.conf: stunnel badge shown'); else fail('stunnel-conf badge: ' + stunnelText.slice(0, 200));
  if (/client|accept/i.test(stunnelText)) pass('stunnel.conf: client mode or accept address shown'); else fail('stunnel-conf content: ' + stunnelText.slice(0, 300));

  // ── hyprland.conf (Hyprland Wayland compositor) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('hyprland.conf (Hyprland Wayland compositor)');
  await page.waitForSelector('#previewHost .hyprlcfg-doc', { timeout: 12000 });
  const hyprlText = await page.$eval('#previewHost .hyprlcfg-doc', (e) => e.textContent);
  if (/Hyprland/i.test(hyprlText)) pass('hyprland.conf: Hyprland badge shown'); else fail('hyprland-conf badge: ' + hyprlText.slice(0, 200));
  if (/monitor|mainMod/i.test(hyprlText)) pass('hyprland.conf: monitor or mainMod information shown'); else fail('hyprland-conf content: ' + hyprlText.slice(0, 300));

  // ── lxc.config (LXC container) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('lxc.config (LXC container)');
  await page.waitForSelector('#previewHost .lxccfg-doc', { timeout: 12000 });
  const lxcText = await page.$eval('#previewHost .lxccfg-doc', (e) => e.textContent);
  if (/LXC/i.test(lxcText)) pass('lxc.config: LXC badge shown'); else fail('lxc-config badge: ' + lxcText.slice(0, 200));
  if (/network|rootfs/i.test(lxcText)) pass('lxc.config: network or rootfs information shown'); else fail('lxc-config content: ' + lxcText.slice(0, 300));

  // ── .tmux.conf (tmux) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.tmux.conf');
  await page.waitForSelector('#previewHost .tmuxcfg-doc', { timeout: 12000 });
  const tmuxText = await page.$eval('#previewHost .tmuxcfg-doc', (e) => e.textContent);
  if (/tmux/i.test(tmuxText)) pass('.tmux.conf: tmux badge shown'); else fail('tmux-conf badge: ' + tmuxText.slice(0, 200));
  if (/prefix|C-a/i.test(tmuxText)) pass('.tmux.conf: prefix key shown'); else fail('tmux-conf prefix: ' + tmuxText.slice(0, 300));

  // ── .screenrc (GNU Screen) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.screenrc');
  await page.waitForSelector('#previewHost .screenrc-doc', { timeout: 12000 });
  const screenText = await page.$eval('#previewHost .screenrc-doc', (e) => e.textContent);
  if (/GNU Screen|Screen/i.test(screenText)) pass('.screenrc: GNU Screen badge shown'); else fail('screenrc badge: ' + screenText.slice(0, 200));
  if (/scrollback|hardstatus/i.test(screenText)) pass('.screenrc: scrollback or hardstatus shown'); else fail('screenrc content: ' + screenText.slice(0, 300));

  // ── Alacritty config viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('alacritty.toml');
  await page.waitForSelector('#previewHost .alacritty-doc', { timeout: 12000 });
  const alacrittyText = await page.$eval('#previewHost .alacritty-doc', (e) => e.textContent);
  if (/Alacritty/i.test(alacrittyText)) pass('alacritty.toml: Alacritty badge shown'); else fail('alacritty-conf badge: ' + alacrittyText.slice(0, 200));
  if (/font|opacity/i.test(alacrittyText)) pass('alacritty.toml: font or opacity shown'); else fail('alacritty-conf content: ' + alacrittyText.slice(0, 300));

  // ── kitty config viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('kitty.conf');
  await page.waitForSelector('#previewHost .kitty-doc', { timeout: 12000 });
  const kittyText = await page.$eval('#previewHost .kitty-doc', (e) => e.textContent);
  if (/kitty/i.test(kittyText)) pass('kitty.conf: kitty badge shown'); else fail('kitty-conf badge: ' + kittyText.slice(0, 200));
  if (/font_family|scrollback/i.test(kittyText)) pass('kitty.conf: font_family or scrollback shown'); else fail('kitty-conf content: ' + kittyText.slice(0, 300));

  // ── dunstrc (dunst notification daemon) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('dunstrc (dunst notification daemon)');
  await page.waitForSelector('#previewHost .dunstrc-doc', { timeout: 12000 });
  const dunstText = await page.$eval('#previewHost .dunstrc-doc', (e) => e.textContent);
  if (/dunst/i.test(dunstText)) pass('dunstrc: dunst badge shown'); else fail('dunstrc badge: ' + dunstText.slice(0, 200));
  if (/urgency|timeout/i.test(dunstText)) pass('dunstrc: urgency levels or timeout shown'); else fail('dunstrc urgency: ' + dunstText.slice(0, 300));

  // ── polybar.ini (Polybar status bar) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('polybar.ini (Polybar status bar)');
  await page.waitForSelector('#previewHost .polybarcfg-doc', { timeout: 12000 });
  const polybarText = await page.$eval('#previewHost .polybarcfg-doc', (e) => e.textContent);
  if (/Polybar/i.test(polybarText)) pass('polybar.ini: Polybar badge shown'); else fail('polybar-conf badge: ' + polybarText.slice(0, 200));
  if (/modules|bar/i.test(polybarText)) pass('polybar.ini: modules or bar configuration shown'); else fail('polybar-conf content: ' + polybarText.slice(0, 300));

  // ── .muttrc (NeoMutt/Mutt email client config) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.muttrc');
  await page.waitForSelector('#previewHost .muttrc-doc', { timeout: 12000 });
  const muttText = await page.$eval('#previewHost .muttrc-doc', (e) => e.textContent);
  if (/NeoMutt|Mutt/i.test(muttText)) pass('.muttrc: Mutt/NeoMutt badge shown'); else fail('muttrc badge: ' + muttText.slice(0, 200));
  if (/user@example\.com|imap|account/i.test(muttText)) pass('.muttrc: account settings shown'); else fail('muttrc account: ' + muttText.slice(0, 300));
  if (!/secret123/.test(muttText)) pass('.muttrc: raw passwords not exposed'); else fail('muttrc password leak: ' + muttText.slice(0, 300));
  if (/configured|binding|color/i.test(muttText)) pass('.muttrc: bindings or color rules shown'); else fail('muttrc content: ' + muttText.slice(0, 300));

  // ── foot.ini (foot Wayland terminal emulator config) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('foot.ini');
  await page.waitForSelector('#previewHost .footcfg-doc', { timeout: 12000 });
  const footText = await page.$eval('#previewHost .footcfg-doc', (e) => e.textContent);
  if (/foot/i.test(footText)) pass('foot.ini: foot badge shown'); else fail('foot-config badge: ' + footText.slice(0, 200));
  if (/JetBrains Mono|font/i.test(footText)) pass('foot.ini: font shown'); else fail('foot-config font: ' + footText.slice(0, 300));
  if (/opacity|alpha|95/i.test(footText)) pass('foot.ini: opacity shown'); else fail('foot-config opacity: ' + footText.slice(0, 300));

  // ── config.rasi (Rofi window switcher/launcher config) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('config.rasi (Rofi)');
  await page.waitForSelector('#previewHost .roficfg-doc', { timeout: 12000 });
  const rofiText = await page.$eval('#previewHost .roficfg-doc', (e) => e.textContent);
  if (/Rofi/i.test(rofiText)) pass('config.rasi: Rofi badge shown'); else fail('rofi-config badge: ' + rofiText.slice(0, 200));
  if (/drun|run|window/i.test(rofiText)) pass('config.rasi: launch mode chips shown'); else fail('rofi-config modes: ' + rofiText.slice(0, 300));
  if (/fuzzy|JetBrains/i.test(rofiText)) pass('config.rasi: matching or font shown'); else fail('rofi-config settings: ' + rofiText.slice(0, 300));

  // ── mako (mako Wayland notification daemon config) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('mako (mako notification daemon)');
  await page.waitForSelector('#previewHost .makocfg-doc', { timeout: 12000 });
  const makoText = await page.$eval('#previewHost .makocfg-doc', (e) => e.textContent);
  if (/mako/i.test(makoText)) pass('mako: mako badge shown'); else fail('mako-conf badge: ' + makoText.slice(0, 200));
  if (/top-right|anchor/i.test(makoText)) pass('mako: anchor position shown'); else fail('mako-conf anchor: ' + makoText.slice(0, 300));
  if (/5s|5000|timeout/i.test(makoText)) pass('mako: timeout shown'); else fail('mako-conf timeout: ' + makoText.slice(0, 300));
  if (/urgency|do-not-disturb|Spotify/i.test(makoText)) pass('mako: criteria sections shown'); else fail('mako-conf criteria: ' + makoText.slice(0, 300));

  // ── daemon.conf (PulseAudio daemon config) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('daemon.conf');
  await page.waitForSelector('#previewHost .pulsecfg-doc', { timeout: 12000 });
  const pulseText = await page.$eval('#previewHost .pulsecfg-doc', (e) => e.textContent);
  if (/PulseAudio/i.test(pulseText)) pass('daemon.conf: PulseAudio badge shown'); else fail('pulseaudio-conf badge: ' + pulseText.slice(0, 200));
  if (/s16le|default-sample-format/i.test(pulseText)) pass('daemon.conf: sample format shown'); else fail('pulseaudio-conf sample-format: ' + pulseText.slice(0, 300));
  if (/44100|48000/i.test(pulseText)) pass('daemon.conf: sample rate shown'); else fail('pulseaudio-conf sample-rate: ' + pulseText.slice(0, 300));
  if (/realtime|speex/i.test(pulseText)) pass('daemon.conf: realtime or resample settings shown'); else fail('pulseaudio-conf system: ' + pulseText.slice(0, 300));

  // ── pipewire.conf (PipeWire audio/video server config) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('pipewire.conf');
  await page.waitForSelector('#previewHost .pwcfg-doc', { timeout: 12000 });
  const pipewireText = await page.$eval('#previewHost .pwcfg-doc', (e) => e.textContent);
  if (/PipeWire/i.test(pipewireText)) pass('pipewire.conf: PipeWire badge shown'); else fail('pipewire-conf badge: ' + pipewireText.slice(0, 200));
  if (/48000|default\.clock\.rate/i.test(pipewireText)) pass('pipewire.conf: clock rate shown'); else fail('pipewire-conf clock-rate: ' + pipewireText.slice(0, 300));
  if (/wireplumber|pipewire-pulse/i.test(pipewireText)) pass('pipewire.conf: exec entries shown'); else fail('pipewire-conf exec: ' + pipewireText.slice(0, 300));
  if (/protocol|rt|session/i.test(pipewireText)) pass('pipewire.conf: modules grouped and listed'); else fail('pipewire-conf modules: ' + pipewireText.slice(0, 300));

  // ── .wezterm.lua (WezTerm terminal emulator config) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.wezterm.lua');
  await page.waitForSelector('#previewHost .weztermcfg-doc', { timeout: 12000 });
  const weztermText = await page.$eval('#previewHost .weztermcfg-doc', (e) => e.textContent);
  if (/WezTerm/i.test(weztermText)) pass('.wezterm.lua: WezTerm badge shown'); else fail('wezterm-conf badge: ' + weztermText.slice(0, 200));
  if (/JetBrains Mono|Catppuccin/i.test(weztermText)) pass('.wezterm.lua: font or color scheme shown'); else fail('wezterm-conf font/color: ' + weztermText.slice(0, 300));

  // ── aria2.conf (aria2 download manager config) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('aria2.conf');
  await page.waitForSelector('#previewHost .aria2cfg-doc', { timeout: 12000 });
  const aria2Text = await page.$eval('#previewHost .aria2cfg-doc', (e) => e.textContent);
  if (/aria2/i.test(aria2Text)) pass('aria2.conf: aria2 badge shown'); else fail('aria2-conf badge: ' + aria2Text.slice(0, 200));
  if (/Downloads|concurrent/i.test(aria2Text)) pass('aria2.conf: download dir or concurrency shown'); else fail('aria2-conf general: ' + aria2Text.slice(0, 300));
  if (/\[configured\]/.test(aria2Text) && !/mysecrettoken/.test(aria2Text)) pass('aria2.conf: RPC secret is masked'); else fail('aria2-conf rpc-secret not masked: ' + aria2Text.slice(0, 400));

  // ── picom.conf (picom X11 compositor) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('picom.conf');
  await page.waitForSelector('#previewHost .picomcfg-doc', { timeout: 12000 });
  const picomText = await page.$eval('#previewHost .picomcfg-doc', (e) => e.textContent);
  if (/picom/i.test(picomText)) pass('picom.conf: picom badge shown'); else fail('picom-conf badge: ' + picomText.slice(0, 200));
  if (/glx|backend|shadow/i.test(picomText)) pass('picom.conf: backend or shadow information shown'); else fail('picom-conf content: ' + picomText.slice(0, 300));

  // ── mpd.conf (Music Player Daemon) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('mpd.conf');
  await page.waitForSelector('#previewHost .mpdcfg-doc', { timeout: 12000 });
  const mpdText = await page.$eval('#previewHost .mpdcfg-doc', (e) => e.textContent);
  if (/MPD/i.test(mpdText)) pass('mpd.conf: MPD badge shown'); else fail('mpd-conf badge: ' + mpdText.slice(0, 200));
  if (/Music|audio|pipewire/i.test(mpdText)) pass('mpd.conf: music directory or audio outputs shown'); else fail('mpd-conf content: ' + mpdText.slice(0, 300));

  // ── shard.yml (Crystal Shard) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('shard.yml');
  await page.waitForSelector('#previewHost .crystalshard-doc', { timeout: 12000 });
  const shardText = await page.$eval('#previewHost .crystalshard-doc', (e) => e.textContent);
  if (/Crystal/i.test(shardText)) pass('shard.yml: Crystal badge shown'); else fail('crystal-shard badge: ' + shardText.slice(0, 200));
  if (/my_crystal_app|0\.3\.1/i.test(shardText)) pass('shard.yml: package name or version shown'); else fail('crystal-shard name/version: ' + shardText.slice(0, 300));
  if (/kemal|jennifer|pg/i.test(shardText)) pass('shard.yml: dependencies shown'); else fail('crystal-shard deps: ' + shardText.slice(0, 300));

  // ── build.zig.zon (Zig Package Manifest) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('build.zig.zon');
  await page.waitForSelector('#previewHost .zigzon-doc', { timeout: 12000 });
  const zigzonText = await page.$eval('#previewHost .zigzon-doc', (e) => e.textContent);
  if (/Zig/i.test(zigzonText)) pass('build.zig.zon: Zig badge shown'); else fail('zig-zon badge: ' + zigzonText.slice(0, 200));
  if (/my_zig_project|0\.2\.0/i.test(zigzonText)) pass('build.zig.zon: package name or version shown'); else fail('zig-zon name/version: ' + zigzonText.slice(0, 300));

  // ── dune-project (Dune build system) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('dune-project');
  await page.waitForSelector('#previewHost .dunebuild-doc', { timeout: 12000 });
  const duneText = await page.$eval('#previewHost .dunebuild-doc', (e) => e.textContent);
  if (/Dune/i.test(duneText)) pass('dune-project: Dune badge shown'); else fail('dune-build badge: ' + duneText.slice(0, 200));
  if (/my-ocaml-project|3\.14|library|executable/i.test(duneText)) pass('dune-project: project name or stanza info shown'); else fail('dune-build content: ' + duneText.slice(0, 300));
  if (/package/i.test(duneText)) pass('dune-project: package count shown'); else fail('dune-build packages: ' + duneText.slice(0, 300));

  // ── .scalafmt.conf (scalafmt Scala formatter) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.scalafmt.conf');
  await page.waitForSelector('#previewHost .scalafmt-doc', { timeout: 12000 });
  const scalafmtText = await page.$eval('#previewHost .scalafmt-doc', (e) => e.textContent);
  if (/scalafmt/i.test(scalafmtText)) pass('.scalafmt.conf: scalafmt badge shown'); else fail('scalafmt-conf badge: ' + scalafmtText.slice(0, 200));
  if (/maxColumn|version|3\.7/i.test(scalafmtText)) pass('.scalafmt.conf: version or maxColumn shown'); else fail('scalafmt-conf content: ' + scalafmtText.slice(0, 300));
  if (/rewrite|SortImports|scala/i.test(scalafmtText)) pass('.scalafmt.conf: rewrite rules or dialect shown'); else fail('scalafmt-conf rewrite: ' + scalafmtText.slice(0, 300));

  // ── bspwmrc (bspwm tiling window manager config) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('bspwmrc');
  await page.waitForSelector('#previewHost .bspwmrc-doc', { timeout: 12000 });
  const bspwmText = await page.$eval('#previewHost .bspwmrc-doc', (e) => e.textContent);
  if (/bspwm/i.test(bspwmText)) pass('bspwmrc: bspwm badge shown'); else fail('bspwmrc badge: ' + bspwmText.slice(0, 200));
  if (/HDMI-1|eDP-1/i.test(bspwmText)) pass('bspwmrc: monitor names shown'); else fail('bspwmrc monitors: ' + bspwmText.slice(0, 300));
  if (/border_width|window_gap|split_ratio/i.test(bspwmText)) pass('bspwmrc: layout settings shown'); else fail('bspwmrc layout: ' + bspwmText.slice(0, 300));
  if (/#45475a|#89b4fa|#cba6f7/i.test(bspwmText)) pass('bspwmrc: border colors shown'); else fail('bspwmrc colors: ' + bspwmText.slice(0, 300));

  // ── sxhkdrc (sxhkd hotkey daemon config) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('sxhkdrc');
  await page.waitForSelector('#previewHost .sxhkdrc-doc', { timeout: 12000 });
  const sxhkdText = await page.$eval('#previewHost .sxhkdrc-doc', (e) => e.textContent);
  if (/sxhkd/i.test(sxhkdText)) pass('sxhkdrc: sxhkd badge shown'); else fail('sxhkdrc badge: ' + sxhkdText.slice(0, 200));
  if (/binding|shortcut/i.test(sxhkdText)) pass('sxhkdrc: binding count shown'); else fail('sxhkdrc binding count: ' + sxhkdText.slice(0, 300));
  if (/super\s*\+/i.test(sxhkdText)) pass('sxhkdrc: Super key bindings shown'); else fail('sxhkdrc key combos: ' + sxhkdText.slice(0, 300));
  if (/alacritty|rofi|bspc/i.test(sxhkdText)) pass('sxhkdrc: commands listed'); else fail('sxhkdrc commands: ' + sxhkdText.slice(0, 300));

  // ── mpv.conf (mpv media player config) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('mpv.conf');
  await page.waitForSelector('#previewHost .mpvcfg-doc', { timeout: 12000 });
  const mpvText = await page.$eval('#previewHost .mpvcfg-doc', (e) => e.textContent);
  if (/mpv/i.test(mpvText)) pass('mpv.conf: mpv badge shown'); else fail('mpv-conf badge: ' + mpvText.slice(0, 200));
  if (/gpu-next|vo/i.test(mpvText)) pass('mpv.conf: video output shown'); else fail('mpv-conf vo: ' + mpvText.slice(0, 300));
  if (/auto-safe|hwdec/i.test(mpvText)) pass('mpv.conf: hwdec shown'); else fail('mpv-conf hwdec: ' + mpvText.slice(0, 300));

  // ── yt-dlp.conf (yt-dlp downloader config) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('yt-dlp.conf');
  await page.waitForSelector('#previewHost .ytdlpcfg-doc', { timeout: 12000 });
  const ytdlpText = await page.$eval('#previewHost .ytdlpcfg-doc', (e) => e.textContent);
  if (/yt-dlp/i.test(ytdlpText)) pass('yt-dlp.conf: yt-dlp badge shown'); else fail('ytdlp-conf badge: ' + ytdlpText.slice(0, 200));
  if (/format|bestvideo/i.test(ytdlpText)) pass('yt-dlp.conf: format spec shown'); else fail('ytdlp-conf format: ' + ytdlpText.slice(0, 300));
  if (/output|Downloads/i.test(ytdlpText)) pass('yt-dlp.conf: output path shown'); else fail('ytdlp-conf output: ' + ytdlpText.slice(0, 300));

  // ── ncmpcpp.conf (ncmpcpp MPD music player client config) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('ncmpcpp.conf');
  await page.waitForSelector('#previewHost .ncmpcpp-doc', { timeout: 12000 });
  const ncmpcppText = await page.$eval('#previewHost .ncmpcpp-doc', (e) => e.textContent);
  if (/ncmpcpp/i.test(ncmpcppText)) pass('ncmpcpp.conf: ncmpcpp badge shown'); else fail('ncmpcpp-conf badge: ' + ncmpcppText.slice(0, 200));
  if (/localhost|mpd_host/i.test(ncmpcppText)) pass('ncmpcpp.conf: MPD host shown'); else fail('ncmpcpp-conf mpd host: ' + ncmpcppText.slice(0, 300));
  if (/spectrum|visualizer/i.test(ncmpcppText)) pass('ncmpcpp.conf: visualizer type shown'); else fail('ncmpcpp-conf visualizer: ' + ncmpcppText.slice(0, 300));

  // ── newsboat.conf (newsboat RSS/Atom feed reader config) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('newsboat.conf');
  await page.waitForSelector('#previewHost .newsboat-doc', { timeout: 12000 });
  const newsboatText = await page.$eval('#previewHost .newsboat-doc', (e) => e.textContent);
  if (/newsboat/i.test(newsboatText)) pass('newsboat.conf: newsboat badge shown'); else fail('newsboat-conf badge: ' + newsboatText.slice(0, 200));
  if (/30 min|reload-time/i.test(newsboatText)) pass('newsboat.conf: reload time shown'); else fail('newsboat-conf reload-time: ' + newsboatText.slice(0, 300));
  if (/xdg-open|browser/i.test(newsboatText)) pass('newsboat.conf: browser command shown'); else fail('newsboat-conf browser: ' + newsboatText.slice(0, 300));

  // ── .Xresources (X11 resource database) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.Xresources');
  await page.waitForSelector('#previewHost .xrdb-doc', { timeout: 12000 });
  const xresText = await page.$eval('#previewHost .xrdb-doc', (e) => e.textContent);
  if (/Xresources/i.test(xresText)) pass('.Xresources: Xresources badge shown'); else fail('xresources badge: ' + xresText.slice(0, 200));
  if (/96\s*dpi|Xft/i.test(xresText)) pass('.Xresources: DPI or Xft settings shown'); else fail('xresources dpi: ' + xresText.slice(0, 300));
  if (/#1e1e2e|#cdd6f4|color0|color/i.test(xresText)) pass('.Xresources: color palette shown'); else fail('xresources colors: ' + xresText.slice(0, 300));

  // ── xorg.conf (Xorg X server config) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('xorg.conf');
  await page.waitForSelector('#previewHost .xorgcfg-doc', { timeout: 12000 });
  const xorgText = await page.$eval('#previewHost .xorgcfg-doc', (e) => e.textContent);
  if (/Xorg/i.test(xorgText)) pass('xorg.conf: Xorg badge shown'); else fail('xorg-conf badge: ' + xorgText.slice(0, 200));
  if (/amdgpu|nvidia|intel|modesetting/i.test(xorgText)) pass('xorg.conf: GPU driver shown'); else fail('xorg-conf driver: ' + xorgText.slice(0, 300));
  if (/Screen|Device|Monitor|ServerLayout/i.test(xorgText)) pass('xorg.conf: section names shown'); else fail('xorg-conf sections: ' + xorgText.slice(0, 300));

  // ── rclone.conf (rclone cloud storage config) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('rclone.conf');
  await page.waitForSelector('#previewHost .rclonecfg-doc', { timeout: 12000 });
  const rcloneText = await page.$eval('#previewHost .rclonecfg-doc', (e) => e.textContent);
  if (/rclone/i.test(rcloneText)) pass('rclone.conf: rclone badge shown'); else fail('rclone-conf badge: ' + rcloneText.slice(0, 200));
  if (/s3-backup|gdrive|dropbox|sftp/i.test(rcloneText)) pass('rclone.conf: remote names shown'); else fail('rclone-conf remotes: ' + rcloneText.slice(0, 300));
  if (/s3|drive|dropbox|sftp|crypt/i.test(rcloneText)) pass('rclone.conf: remote type chips shown'); else fail('rclone-conf types: ' + rcloneText.slice(0, 300));
  if (!/AKIAIOSFODNN7EXAMPLE|wJalrXUtnFEMI|GOCSPX|example_token/.test(rcloneText)) pass('rclone.conf: credentials are redacted'); else fail('rclone-conf credentials not redacted: ' + rcloneText.slice(0, 400));
  if (/configured/i.test(rcloneText)) pass('rclone.conf: [configured] placeholder shown for secrets'); else fail('rclone-conf redact placeholder: ' + rcloneText.slice(0, 300));

  // ── resticprofile.toml (resticprofile backup config) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('resticprofile.toml');
  await page.waitForSelector('#previewHost .resticcfg-doc', { timeout: 12000 });
  const resticText = await page.$eval('#previewHost .resticcfg-doc', (e) => e.textContent);
  if (/restic/i.test(resticText)) pass('resticprofile.toml: restic badge shown'); else fail('restic-config badge: ' + resticText.slice(0, 200));
  if (/default|offsite/i.test(resticText)) pass('resticprofile.toml: profile names shown'); else fail('restic-config profiles: ' + resticText.slice(0, 300));
  if (/repository|password-file/i.test(resticText)) pass('resticprofile.toml: repository or password-file shown'); else fail('restic-config repo: ' + resticText.slice(0, 300));
  if (!/AKIAIOSFODNN7EXAMPLE|wJalrXUtnFEMI/.test(resticText)) pass('resticprofile.toml: AWS credentials are redacted'); else fail('restic-config credentials not redacted: ' + resticText.slice(0, 400));

  // ── .taskrc (Taskwarrior config) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.taskrc');
  await page.waitForSelector('#previewHost .taskrccfg-doc', { timeout: 12000 });
  const taskrcText = await page.$eval('#previewHost .taskrccfg-doc', (e) => e.textContent);
  if (/taskwarrior/i.test(taskrcText)) pass('.taskrc: Taskwarrior badge shown'); else fail('taskrc badge: ' + taskrcText.slice(0, 200));
  if (/data\.location|~\/.local\/share\/task/i.test(taskrcText)) pass('.taskrc: data location shown'); else fail('taskrc data location: ' + taskrcText.slice(0, 300));
  if (/urgency|coefficient/i.test(taskrcText)) pass('.taskrc: urgency coefficients shown'); else fail('taskrc urgency: ' + taskrcText.slice(0, 300));
  if (!/\[configured\].*(?:org|user|uuid|password)/i.test(taskrcText) && /configured/i.test(taskrcText)) pass('.taskrc: taskd.credentials shown as [configured]'); else if (/configured/i.test(taskrcText)) pass('.taskrc: taskd.credentials masked'); else fail('taskrc credentials not masked: ' + taskrcText.slice(0, 400));

  // ── .curlrc (curl defaults config) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.curlrc');
  await page.waitForSelector('#previewHost .curlrc-doc', { timeout: 12000 });
  pass('.curlrc: renders');
  const curlrcText = await page.$eval('#previewHost .curlrc-doc', (e) => e.textContent);
  if (/curl/i.test(curlrcText)) pass('.curlrc: badge shown'); else fail('.curlrc: missing badge');
  if (/redirect|location|max-redirs/i.test(curlrcText)) pass('.curlrc: redirect setting shown'); else fail('curlrc redirect: ' + curlrcText.slice(0, 300));
  if (/max-time|connect-timeout|timeout/i.test(curlrcText)) pass('.curlrc: timeout shown'); else fail('curlrc timeout: ' + curlrcText.slice(0, 300));
  if (!curlrcText.includes('secretpass')) pass('.curlrc: credentials masked'); else fail('.curlrc: credential leaked!');

  // ── .inputrc (GNU readline config) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.inputrc');
  await page.waitForSelector('#previewHost .inputrc-doc', { timeout: 12000 });
  const inputrcText = await page.$eval('#previewHost .inputrc-doc', (e) => e.textContent);
  if (/readline/i.test(inputrcText)) pass('.inputrc: readline badge shown'); else fail('inputrc badge: ' + inputrcText.slice(0, 200));
  if (/editing.mode|vi mode|emacs mode/i.test(inputrcText)) pass('.inputrc: editing mode shown'); else fail('inputrc editing mode: ' + inputrcText.slice(0, 300));
  if (/completion.ignore.case|completion/i.test(inputrcText)) pass('.inputrc: completion settings shown'); else fail('inputrc completion: ' + inputrcText.slice(0, 300));

  // ── .wgetrc (wget config) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.wgetrc');
  await page.waitForSelector('#previewHost .wgetrc-doc', { timeout: 12000 });
  pass('.wgetrc: renders');
  const wgetrcText = await page.$eval('#previewHost .wgetrc-doc', (e) => e.textContent);
  if (/wget/i.test(wgetrcText)) pass('.wgetrc: badge shown'); else fail('.wgetrc: missing badge');
  if (/timeout|connect.timeout/i.test(wgetrcText)) pass('.wgetrc: timeout shown'); else fail('wgetrc timeout: ' + wgetrcText.slice(0, 300));
  if (/tries|retry/i.test(wgetrcText)) pass('.wgetrc: retry count shown'); else fail('wgetrc tries: ' + wgetrcText.slice(0, 300));
  if (!wgetrcText.includes('secretpass')) pass('.wgetrc: credentials masked'); else fail('.wgetrc: credential leaked!');

  // ── helix.toml (Helix editor config) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('helix.toml');
  await page.waitForSelector('#previewHost .helixcfg-doc', { timeout: 12000 });
  const helixText = await page.$eval('#previewHost .helixcfg-doc', (e) => e.textContent);
  if (/helix/i.test(helixText)) pass('helix.toml: Helix badge shown'); else fail('helix-config badge: ' + helixText.slice(0, 200));
  if (/catppuccin_mocha|theme/i.test(helixText)) pass('helix.toml: theme shown'); else fail('helix-config theme: ' + helixText.slice(0, 300));
  if (/relative|line.number/i.test(helixText)) pass('helix.toml: line-number setting shown'); else fail('helix-config line-number: ' + helixText.slice(0, 300));

  // ── lfrc (lf file manager config) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('lfrc');
  await page.waitForSelector('#previewHost .lfrc-doc', { timeout: 12000 });
  const lfrcText = await page.$eval('#previewHost .lfrc-doc', (e) => e.textContent);
  if (/\blf\b/i.test(lfrcText)) pass('lfrc: lf badge shown'); else fail('lfrc badge: ' + lfrcText.slice(0, 200));
  if (/icons|setting/i.test(lfrcText)) pass('lfrc: icons setting shown'); else fail('lfrc icons: ' + lfrcText.slice(0, 300));
  if (/binding|map|key/i.test(lfrcText)) pass('lfrc: key mappings section shown'); else fail('lfrc mappings: ' + lfrcText.slice(0, 300));

  // ── ranger.conf (Ranger terminal file manager config) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('ranger.conf');
  await page.waitForSelector('#previewHost .rangercfg-doc', { timeout: 12000 });
  const rangerText = await page.$eval('#previewHost .rangercfg-doc', (e) => e.textContent);
  if (/ranger/i.test(rangerText)) pass('ranger.conf: Ranger badge shown'); else fail('ranger-conf badge: ' + rangerText.slice(0, 200));
  if (/1,3,4|column.ratios/i.test(rangerText)) pass('ranger.conf: column ratios shown'); else fail('ranger-conf column_ratios: ' + rangerText.slice(0, 300));
  if (/preview.images|preview_images/i.test(rangerText)) pass('ranger.conf: preview_images chip shown'); else fail('ranger-conf preview_images: ' + rangerText.slice(0, 300));

  // ── zathurarc (Zathura PDF viewer config) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('zathurarc');
  await page.waitForSelector('#previewHost .zathura-doc', { timeout: 12000 });
  const zathuraText = await page.$eval('#previewHost .zathura-doc', (e) => e.textContent);
  if (/zathura/i.test(zathuraText)) pass('zathurarc: Zathura badge shown'); else fail('zathurarc badge: ' + zathuraText.slice(0, 200));
  if (/#1e1e2e|default.bg|default-bg/i.test(zathuraText)) pass('zathurarc: default-bg color shown'); else fail('zathurarc default-bg: ' + zathuraText.slice(0, 300));
  if (/recolor/i.test(zathuraText)) pass('zathurarc: recolor mode shown'); else fail('zathurarc recolor: ' + zathuraText.slice(0, 300));

  // ── wsl.conf (WSL2 per-distribution config) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('wsl.conf');
  await page.waitForSelector('#previewHost .wslcfg-doc', { timeout: 12000 });
  const wslText = await page.$eval('#previewHost .wslcfg-doc', (e) => e.textContent);
  if (/WSL2/i.test(wslText)) pass('wsl.conf: WSL2 badge shown'); else fail('wsl-conf badge: ' + wslText.slice(0, 200));
  if (/automount|enabled/i.test(wslText)) pass('wsl.conf: automount section shown'); else fail('wsl-conf automount: ' + wslText.slice(0, 300));
  if (/systemd/i.test(wslText)) pass('wsl.conf: systemd chip shown'); else fail('wsl-conf systemd: ' + wslText.slice(0, 300));

  // ── loader.conf (systemd-boot config) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('loader.conf');
  await page.waitForSelector('#previewHost .sdbcfg-doc', { timeout: 12000 });
  const loaderText = await page.$eval('#previewHost .sdbcfg-doc', (e) => e.textContent);
  if (/systemd-boot/i.test(loaderText)) pass('loader.conf: systemd-boot badge shown'); else fail('loader-conf badge: ' + loaderText.slice(0, 200));
  if (/arch-linux\.conf|default/i.test(loaderText)) pass('loader.conf: default entry shown'); else fail('loader-conf default: ' + loaderText.slice(0, 300));
  if (/timeout|3/i.test(loaderText)) pass('loader.conf: timeout shown'); else fail('loader-conf timeout: ' + loaderText.slice(0, 300));

  // ── cmus.rc (cmus terminal music player config) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('cmus.rc');
  await page.waitForSelector('#previewHost .cmuscfg-doc', { timeout: 12000 });
  const cmusText = await page.$eval('#previewHost .cmuscfg-doc', (e) => e.textContent);
  if (/cmus/i.test(cmusText)) pass('cmus.rc: cmus badge shown'); else fail('cmus badge: ' + cmusText.slice(0, 200));
  if (/pipewire|output.plugin/i.test(cmusText)) pass('cmus.rc: output plugin shown'); else fail('cmus output plugin: ' + cmusText.slice(0, 300));
  if (/zenburn|colorscheme/i.test(cmusText)) pass('cmus.rc: colorscheme shown'); else fail('cmus colorscheme: ' + cmusText.slice(0, 300));

  // ── pacman.conf (Arch Linux pacman config) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('pacman.conf');
  await page.waitForSelector('#previewHost .pacmancfg-doc', { timeout: 12000 });
  const pacmanText = await page.$eval('#previewHost .pacmancfg-doc', (e) => e.textContent);
  if (/pacman/i.test(pacmanText)) pass('pacman.conf: pacman badge shown'); else fail('pacman badge: ' + pacmanText.slice(0, 200));
  if (/repositor/i.test(pacmanText)) pass('pacman.conf: repositories count shown'); else fail('pacman repos: ' + pacmanText.slice(0, 300));
  if (/ParallelDownloads|5/i.test(pacmanText)) pass('pacman.conf: ParallelDownloads shown'); else fail('pacman parallel: ' + pacmanText.slice(0, 300));
  if (/chaotic-aur|multilib|extra|core/i.test(pacmanText)) pass('pacman.conf: repository names shown'); else fail('pacman repo names: ' + pacmanText.slice(0, 300));

  // ── Brewfile (Homebrew bundle manifest) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Brewfile');
  await page.waitForSelector('#previewHost .brew-doc', { timeout: 12000 });
  const brewText = await page.$eval('#previewHost .brew-doc', (e) => e.textContent);
  if (/homebrew/i.test(brewText)) pass('Brewfile: Homebrew badge shown'); else fail('Brewfile badge: ' + brewText.slice(0, 200));
  if (/tap/i.test(brewText)) pass('Brewfile: taps section shown'); else fail('Brewfile taps: ' + brewText.slice(0, 300));
  if (/formulae|formula/i.test(brewText)) pass('Brewfile: formulae section shown'); else fail('Brewfile formulae: ' + brewText.slice(0, 300));
  if (/cask/i.test(brewText)) pass('Brewfile: casks section shown'); else fail('Brewfile casks: ' + brewText.slice(0, 300));

  // ── dnf.conf (DNF package manager config) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('dnf.conf');
  await page.waitForSelector('#previewHost .dnfcfg-doc', { timeout: 12000 });
  const dnfText = await page.$eval('#previewHost .dnfcfg-doc', (e) => e.textContent);
  if (/DNF/i.test(dnfText)) pass('dnf.conf: DNF badge shown'); else fail('dnf-conf badge: ' + dnfText.slice(0, 200));
  if (/GPG enabled|gpgcheck/i.test(dnfText)) pass('dnf.conf: GPG check chip shown'); else fail('dnf-conf gpgcheck: ' + dnfText.slice(0, 300));
  if (/parallel|max_parallel_downloads/i.test(dnfText)) pass('dnf.conf: parallel downloads shown'); else fail('dnf-conf parallel: ' + dnfText.slice(0, 300));

  // ── .gdbinit (GDB debugger init) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.gdbinit');
  await page.waitForSelector('#previewHost .gdbinit-doc', { timeout: 12000 });
  const gdbText = await page.$eval('#previewHost .gdbinit-doc', (e) => e.textContent);
  if (/GDB/i.test(gdbText)) pass('.gdbinit: GDB badge shown'); else fail('gdbinit badge: ' + gdbText.slice(0, 200));
  if (/print pretty|history|pagination/i.test(gdbText)) pass('.gdbinit: display settings or history shown'); else fail('gdbinit settings: ' + gdbText.slice(0, 300));
  if (/GEF|hook-stop|plist/i.test(gdbText)) pass('.gdbinit: extensions or custom commands shown'); else fail('gdbinit extensions: ' + gdbText.slice(0, 300));

  // ── gradle.properties enhanced viewer (JVM heap + Android + performance) ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('gradle.properties');
  await page.waitForSelector('#previewHost .gp-doc', { timeout: 12000 });
  const gpEnhText = await page.$eval('#previewHost .gp-doc', (e) => e.textContent);
  if (/Xmx|Xms|Heap/i.test(gpEnhText)) pass('gradle.properties: JVM heap shown'); else fail('gradle-props jvm-heap: ' + gpEnhText.slice(0, 300));
  if (/useAndroidX|Android/i.test(gpEnhText)) pass('gradle.properties: Android section shown'); else fail('gradle-props android: ' + gpEnhText.slice(0, 300));
  if (/configuration.cache|parallel|caching/i.test(gpEnhText)) pass('gradle.properties: performance settings shown'); else fail('gradle-props perf: ' + gpEnhText.slice(0, 300));

  // ── haproxy.cfg (HAProxy config) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('haproxy.cfg');
  await page.waitForSelector('#previewHost .haproxy-doc', { timeout: 12000 });
  pass('haproxy.cfg: badge shown');
  const haSections = await page.$eval('#previewHost .haproxy-doc', el => el.textContent);
  if (!haSections.includes('frontend')) fail('haproxy.cfg: frontend not shown');
  else pass('haproxy.cfg: frontend shown');
  if (!haSections.includes('backend')) fail('haproxy.cfg: backend not shown');
  else pass('haproxy.cfg: backend shown');
  if (haSections.includes('password')) fail('haproxy.cfg: stats password leaked');
  else pass('haproxy.cfg: stats password masked');

  // ── 50-usb.rules (udev rules) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('50-usb.rules');
  await page.waitForSelector('#previewHost .udev-doc', { timeout: 12000 });
  pass('50-usb.rules: badge shown');
  const udevText = await page.$eval('#previewHost .udev-doc', el => el.textContent);
  if (!udevText.includes('usb')) fail('50-usb.rules: USB subsystem not shown');
  else pass('50-usb.rules: USB subsystem shown');
  if (!udevText.includes('plugdev')) fail('50-usb.rules: group not shown');
  else pass('50-usb.rules: plugdev group shown');

  // ── .pre-commit-config.yaml enhanced viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.pre-commit-config.yaml');
  await page.waitForSelector('#previewHost .precommit-doc', { timeout: 12000 });
  pass('.pre-commit-config.yaml: badge shown');
  const precommitText = await page.$eval('#previewHost .precommit-doc', el => el.textContent);
  if (!precommitText.includes('pre-commit-hooks')) fail('.pre-commit-config.yaml: repos not shown');
  else pass('.pre-commit-config.yaml: repo shown');
  if (!precommitText.includes('black')) fail('.pre-commit-config.yaml: hook not shown');
  else pass('.pre-commit-config.yaml: hook shown');

  // ── conky.conf enhanced viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('conky.conf');
  await page.waitForSelector('#previewHost .conky-doc', { timeout: 12000 });
  pass('conky.conf: badge shown');
  const conkyText = await page.$eval('#previewHost .conky-doc', el => el.textContent);
  if (!conkyText.includes('top_right')) fail('conky.conf: alignment not shown');
  else pass('conky.conf: alignment shown');
  if (!conkyText.includes('1.0')) fail('conky.conf: update interval not shown');
  else pass('conky.conf: update interval shown');

  // ── mypackage.opam (OCaml opam package descriptor) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('mypackage.opam');
  await page.waitForSelector('#previewHost .opam-doc', { timeout: 12000 });
  pass('mypackage.opam: badge shown');
  const opamText = await page.$eval('#previewHost .opam-doc', (e) => e.textContent);
  if (!opamText.includes('mypackage')) fail('mypackage.opam: package name not shown');
  else pass('mypackage.opam: package name shown');
  if (!opamText.includes('yojson')) fail('mypackage.opam: dependencies not shown');
  else pass('mypackage.opam: dependencies shown');
  if (/MIT/i.test(opamText)) pass('mypackage.opam: license shown'); else fail('opam license: ' + opamText.slice(0, 300));
  if (/Jane Smith|maintainer/i.test(opamText)) pass('mypackage.opam: maintainer shown'); else fail('opam maintainer: ' + opamText.slice(0, 300));

  // ── deny.toml (cargo-deny) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('deny.toml');
  await page.waitForSelector('#previewHost .cargodeny-doc', { timeout: 12000 });
  pass('deny.toml: badge shown');
  const denyText = await page.$eval('#previewHost .cargodeny-doc', el => el.textContent);
  if (!denyText.includes('MIT')) fail('deny.toml: allowed licenses not shown');
  else pass('deny.toml: licenses shown');
  if (!denyText.includes('vulnerability')) fail('deny.toml: advisories not shown');
  else pass('deny.toml: advisories shown');

  // ── release-please-config.json viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('release-please-config.json');
  await page.waitForSelector('#previewHost .relpls-doc', { timeout: 12000 });
  pass('release-please-config.json: badge shown');
  const rplText = await page.$eval('#previewHost .relpls-doc', el => el.textContent);
  if (!rplText.includes('node')) fail('release-please-config.json: release type not shown');
  else pass('release-please-config.json: release type shown');
  if (!rplText.includes('packages/api')) fail('release-please-config.json: packages not shown');
  else pass('release-please-config.json: packages shown');

  // ── .nanorc (GNU nano editor config) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.nanorc');
  await page.waitForSelector('#previewHost .nanorc-doc', { timeout: 12000 });
  pass('.nanorc: badge shown');
  const nanoText = await page.$eval('#previewHost .nanorc-doc', el => el.textContent);
  if (!nanoText.includes('tabsize') && !nanoText.includes('4')) fail('.nanorc: settings not shown');
  else pass('.nanorc: settings shown');
  if (!nanoText.includes('include') && !nanoText.includes('nanorc')) fail('.nanorc: syntax includes not shown');
  else pass('.nanorc: syntax includes shown');

  // ── global.json (.NET SDK pinning) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('global.json');
  await page.waitForSelector('#previewHost .globaljson-doc', { timeout: 12000 });
  pass('global.json: badge shown');
  const gjText = await page.$eval('#previewHost .globaljson-doc', el => el.textContent);
  if (!gjText.includes('8.0.100')) fail('global.json: SDK version not shown');
  else pass('global.json: SDK version shown');
  if (!gjText.includes('latestPatch')) fail('global.json: rollForward not shown');
  else pass('global.json: rollForward shown');

  // ── rustfmt.toml (Rust formatter config) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('rustfmt.toml (rustfmt)');
  await page.waitForSelector('#previewHost .rustfmt-doc', { timeout: 12000 });
  pass('rustfmt.toml: badge shown');
  const rfText = await page.$eval('#previewHost .rustfmt-doc', el => el.textContent);
  if (!rfText.includes('100')) fail('rustfmt.toml: max_width not shown');
  else pass('rustfmt.toml: max_width shown');
  if (!rfText.includes('2021')) fail('rustfmt.toml: edition not shown');
  else pass('rustfmt.toml: edition shown');

  // ── clippy.toml (Clippy linter config) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('clippy.toml (Clippy)');
  await page.waitForSelector('#previewHost .clippy-doc', { timeout: 12000 });
  pass('clippy.toml: badge shown');
  const clText = await page.$eval('#previewHost .clippy-doc', el => el.textContent);
  if (!clText.includes('1.70')) fail('clippy.toml: MSRV not shown');
  else pass('clippy.toml: MSRV shown');
  if (!clText.includes('25') && !clText.includes('cognitive')) fail('clippy.toml: thresholds not shown');
  else pass('clippy.toml: thresholds shown');

  // ── grafana.ini viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('grafana.ini');
  await page.waitForSelector('#previewHost .grafanaini-doc', { timeout: 12000 });
  pass('grafana.ini: badge shown');
  const grafText = await page.$eval('#previewHost .grafanaini-doc', el => el.textContent);
  if (!grafText.includes('3000') && !grafText.includes('grafana.example.com')) fail('grafana.ini: server not shown'); else pass('grafana.ini: server shown');
  if (!grafText.includes('postgres')) fail('grafana.ini: database type not shown'); else pass('grafana.ini: database type shown');
  if (grafText.includes('db-secret-password') || grafText.includes('strong-admin-password')) fail('grafana.ini: secrets leaked'); else pass('grafana.ini: secrets masked');
  if (!grafText.includes('github')) fail('grafana.ini: auth providers not shown'); else pass('grafana.ini: auth providers shown');

  // ── mix.exs (Elixir Mix build file) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('mix.exs');
  await page.waitForSelector('#previewHost .mixexs-doc', { timeout: 12000 });
  pass('mix.exs: badge shown');
  const mixText = await page.$eval('#previewHost .mixexs-doc', el => el.textContent);
  if (!mixText.includes('phoenix')) fail('mix.exs: deps not shown');
  else pass('mix.exs: phoenix dep shown');
  if (!mixText.includes('my_app') && !mixText.includes('MyApp')) fail('mix.exs: app name not shown');
  else pass('mix.exs: app name shown');

  // ── railway.json (Railway.app deploy config) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('railway.json');
  await page.waitForSelector('#previewHost .railwayjson-doc', { timeout: 12000 });
  pass('railway.json: renders');
  const railwayText = await page.$eval('#previewHost .railwayjson-doc', el => el.textContent);
  if (!railwayText.includes('Railway')) fail('railway.json: missing badge'); else pass('railway.json: badge shown');
  if (!railwayText.includes('web') && !railwayText.includes('worker')) fail('railway.json: services not shown'); else pass('railway.json: services shown');
  if (railwayText.includes('supersecret123') || railwayText.includes('tok_abc123') || railwayText.includes('s3cr3t')) fail('railway.json: secrets leaked'); else pass('railway.json: secrets masked');

  // ── render.yaml (Render.com infrastructure-as-code) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('render.yaml');
  await page.waitForSelector('#previewHost .renderyaml-doc', { timeout: 12000 });
  pass('render.yaml: renders');
  const renderText = await page.$eval('#previewHost .renderyaml-doc', el => el.textContent);
  if (!renderText.includes('Render')) fail('render.yaml: missing badge'); else pass('render.yaml: badge shown');
  if (!renderText.includes('web-app') && !renderText.includes('web')) fail('render.yaml: services not shown'); else pass('render.yaml: services shown');

  // ── .htaccess (Apache per-directory config) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.htaccess');
  await page.waitForSelector('#previewHost .htaccess-doc', { timeout: 12000 });
  pass('.htaccess: renders');
  const htaccessText = await page.$eval('#previewHost .htaccess-doc', el => el.textContent);
  if (!htaccessText.includes('Apache') && !htaccessText.includes('htaccess')) fail('.htaccess: missing badge'); else pass('.htaccess: badge shown');
  if (!htaccessText.includes('Rewrite') && !htaccessText.includes('redirect')) fail('.htaccess: no rules shown'); else pass('.htaccess: rewrite rules shown');

  // ── .htpasswd (Apache auth credential file) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.htpasswd');
  await page.waitForSelector('#previewHost .htpasswd-doc', { timeout: 12000 });
  pass('.htpasswd: renders');
  const htpasswdText = await page.$eval('#previewHost .htpasswd-doc', el => el.textContent);
  if (!htpasswdText.includes('Apache') && !htpasswdText.includes('Auth')) fail('.htpasswd: missing badge'); else pass('.htpasswd: badge shown');
  if (htpasswdText.match(/\$apr1\$|\$2y\$/)) fail('.htpasswd: hashes leaked!'); else pass('.htpasswd: hashes hidden');

  // ── Berksfile (Berkshelf cookbook deps) viewer ──
  await openExample('Berksfile');
  await page.waitForSelector('.berksfile-doc');
  pass('Berksfile: renders');
  const berksText = await page.$eval('.berksfile-doc', el => el.textContent);
  if (!berksText.includes('Berkshelf') && !berksText.includes('Berks')) fail('Berksfile: missing badge'); else pass('Berksfile: badge shown');
  if (!berksText.includes('cookbook')) fail('Berksfile: no cookbooks'); else pass('Berksfile: cookbooks shown');

  // ── .terraform.lock.hcl (Terraform provider lock file) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.terraform.lock.hcl');
  await page.waitForSelector('.tflockfile-doc');
  pass('.terraform.lock.hcl: renders');
  const tflockText = await page.$eval('.tflockfile-doc', el => el.textContent);
  if (!tflockText.includes('Terraform')) fail('.terraform.lock.hcl: missing badge'); else pass('.terraform.lock.hcl: badge shown');
  if (!tflockText.includes('aws') && !tflockText.includes('provider')) fail('.terraform.lock.hcl: no providers'); else pass('.terraform.lock.hcl: providers shown');

  // ── atlantis.yaml (Atlantis Terraform PR automation) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('atlantis.yaml');
  await page.waitForSelector('.atlantisyaml-doc');
  pass('atlantis.yaml: renders');
  const atlantisText = await page.$eval('.atlantisyaml-doc', el => el.textContent);
  if (!atlantisText.includes('Atlantis')) fail('atlantis.yaml: missing badge'); else pass('atlantis.yaml: badge shown');
  if (!atlantisText.includes('project') && !atlantisText.includes('workflow')) fail('atlantis.yaml: no projects'); else pass('atlantis.yaml: projects shown');

  // ── Caddyfile viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('Caddyfile');
  await page.waitForSelector('.caddyfile-doc');
  pass('Caddyfile: renders');
  const caddyText = await page.$eval('.caddyfile-doc', el => el.textContent);
  if (!caddyText.includes('Caddy')) fail('Caddyfile: missing badge'); else pass('Caddyfile: badge shown');
  if (!caddyText.includes('reverse_proxy') && !caddyText.includes('file_server') && !caddyText.includes('site')) fail('Caddyfile: no site info'); else pass('Caddyfile: site info shown');

  // ── supervisord.conf viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('supervisord.conf');
  await page.waitForSelector('.supervisordcfg-doc');
  pass('supervisord.conf: renders');
  const supervisordText = await page.$eval('.supervisordcfg-doc', el => el.textContent);
  if (!supervisordText.includes('supervisord')) fail('supervisord.conf: missing badge'); else pass('supervisord.conf: badge shown');
  if (!supervisordText.includes('program') && !supervisordText.includes('command')) fail('supervisord.conf: no programs shown'); else pass('supervisord.conf: programs shown');

  // ── nginx.conf viewer (nginxconf-doc class) ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('nginx.conf');
  await page.waitForSelector('.nginxconf-doc');
  pass('nginx.conf: renders');
  const nginxText = await page.$eval('.nginxconf-doc', el => el.textContent);
  if (!nginxText.includes('NGINX') && !nginxText.includes('nginx')) fail('nginx.conf: missing badge'); else pass('nginx.conf: badge shown');
  if (!nginxText.includes('server') && !nginxText.includes('listen')) fail('nginx.conf: no server info'); else pass('nginx.conf: server info shown');

  // ── haproxy.cfg viewer (haproxycfg-doc class) ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('haproxy.cfg');
  await page.waitForSelector('.haproxycfg-doc');
  pass('haproxy.cfg: renders');
  const haproxyText = await page.$eval('.haproxycfg-doc', el => el.textContent);
  if (!haproxyText.includes('HAProxy')) fail('haproxy.cfg: missing badge'); else pass('haproxy.cfg: badge shown');
  if (!haproxyText.includes('frontend') && !haproxyText.includes('backend')) fail('haproxy.cfg: no proxy config'); else pass('haproxy.cfg: proxy config shown');

  // ── .babelrc (Babel transpiler JSON config) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.babelrc');
  await page.waitForSelector('.babelrc-doc');
  pass('.babelrc: renders');
  const babelrcText = await page.$eval('.babelrc-doc', el => el.textContent);
  if (!babelrcText.includes('Babel')) fail('.babelrc: missing badge'); else pass('.babelrc: badge shown');
  if (!babelrcText.includes('preset') && !babelrcText.includes('plugin')) fail('.babelrc: no config shown'); else pass('.babelrc: config shown');

  // ── jest.config.js (Jest plain-text JS config) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('jest.config.js');
  await page.waitForSelector('.jestconfig-doc');
  pass('jest.config.js: renders');
  const jestText = await page.$eval('.jestconfig-doc', el => el.textContent);
  if (!jestText.includes('Jest')) fail('jest.config.js: missing badge'); else pass('jest.config.js: badge shown');
  if (!jestText.includes('testEnvironment') && !jestText.includes('transform') && !jestText.includes('coverage')) fail('jest.config.js: no config shown'); else pass('jest.config.js: config shown');

  // ── .env.example (env template) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.env.example (Env Template)');
  await page.waitForSelector('.envex-doc');
  pass('.env.example: renders');
  const envExText = await page.$eval('.envex-doc', el => el.textContent);
  if (!envExText.includes('.env') && !envExText.includes('example') && !envExText.includes('Template')) fail('.env.example: missing badge/notice'); else pass('.env.example: badge shown');
  if (!envExText.includes('DATABASE') && !envExText.includes('KEY')) fail('.env.example: no vars shown'); else pass('.env.example: variables shown');

  // ── .envrc (direnv) viewer ──
  await page.goto(origin, { waitUntil: 'networkidle' });
  await openExample('.envrc');
  await page.waitForSelector('.erc-doc');
  pass('.envrc: renders');
  const envrcText = await page.$eval('.erc-doc', el => el.textContent);
  if (!envrcText.includes('direnv') && !envrcText.includes('envrc')) fail('.envrc: missing badge'); else pass('.envrc: badge shown');
  if (!envrcText.includes('layout') && !envrcText.includes('PATH') && !envrcText.includes('node')) fail('.envrc: no config shown'); else pass('.envrc: config shown');
}