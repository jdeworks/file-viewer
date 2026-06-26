// Auto-split slice 12/18 of the known-files smoke area (see ./../known-files.mjs).
// Covers: global.json … volta.json.
// Called in order on the shared ctx — keep openExample order intact; no cross-file state.
export async function run(ctx) {
  const { page, origin, frameOf, pass, fail, openExample } = ctx;

  // ── global.json (.NET SDK pinning) viewer ──
  await openExample('global.json');
  await page.waitForSelector('#previewHost .globaljson-doc', { timeout: 12000 });
  pass('global.json: badge shown');
  const gjText = await page.$eval('#previewHost .globaljson-doc', el => el.textContent);
  if (!gjText.includes('8.0.100')) fail('global.json: SDK version not shown');
  else pass('global.json: SDK version shown');
  if (!gjText.includes('latestPatch')) fail('global.json: rollForward not shown');
  else pass('global.json: rollForward shown');

  // ── rustfmt.toml (Rust formatter config) viewer ──
  await openExample('rustfmt.toml (rustfmt)');
  await page.waitForSelector('#previewHost .rustfmt-doc', { timeout: 12000 });
  pass('rustfmt.toml: badge shown');
  const rfText = await page.$eval('#previewHost .rustfmt-doc', el => el.textContent);
  if (!rfText.includes('100')) fail('rustfmt.toml: max_width not shown');
  else pass('rustfmt.toml: max_width shown');
  if (!rfText.includes('2021')) fail('rustfmt.toml: edition not shown');
  else pass('rustfmt.toml: edition shown');

  // ── clippy.toml (Clippy linter config) viewer ──
  await openExample('clippy.toml (Clippy)');
  await page.waitForSelector('#previewHost .clippy-doc', { timeout: 12000 });
  pass('clippy.toml: badge shown');
  const clText = await page.$eval('#previewHost .clippy-doc', el => el.textContent);
  if (!clText.includes('1.70')) fail('clippy.toml: MSRV not shown');
  else pass('clippy.toml: MSRV shown');
  if (!clText.includes('25') && !clText.includes('cognitive')) fail('clippy.toml: thresholds not shown');
  else pass('clippy.toml: thresholds shown');

  // ── grafana.ini viewer ──
  await openExample('grafana.ini');
  await page.waitForSelector('#previewHost .grafanaini-doc', { timeout: 12000 });
  pass('grafana.ini: badge shown');
  const grafText = await page.$eval('#previewHost .grafanaini-doc', el => el.textContent);
  const grafHtml = await page.$eval('#previewHost .grafanaini-doc', el => el.innerHTML);
  if (!grafText.includes('3000') && !grafText.includes('grafana.example.com')) fail('grafana.ini: server not shown'); else pass('grafana.ini: server shown');
  if (!grafText.includes('postgres')) fail('grafana.ini: database type not shown'); else pass('grafana.ini: database type shown');
  if ([
    'db-secret-password',
    'strong-admin-password',
    'github-client-secret',
    'smtp-password',
    'grafana-secret-key-here',
  ].some(secret => (grafText + grafHtml).includes(secret))) fail('grafana.ini: secrets leaked'); else pass('grafana.ini: secrets masked');
  if (!grafText.includes('github')) fail('grafana.ini: auth providers not shown'); else pass('grafana.ini: auth providers shown');
  if (!/Grafana Review|public bind|domain check|secret configured|external auth/i.test(grafText)) fail('grafana.ini: review findings missing'); else pass('grafana.ini: review findings shown');
  const grafSourceCollapsed = await page.$eval('#previewHost .grafanaini-doc .kf-source-details', el => !el.open && el.textContent.includes('Redacted source'));
  if (!grafSourceCollapsed) fail('grafana.ini: redacted source not collapsed'); else pass('grafana.ini: redacted source collapsed');
  const grafSourceLine = await page.$eval('#previewHost .grafanaini-doc [data-source-line]', el => {
    el.click();
    return el.getAttribute('data-source-line');
  });
  await page.waitForFunction((line) => {
    const details = document.querySelector('#previewHost .grafanaini-doc .kf-source-details');
    return details?.open && document.getElementById(`grafana-line-${line}`);
  }, grafSourceLine);
  pass('grafana.ini: source links open redacted source');

  // ── mix.exs (Elixir Mix build file) viewer ──
  await openExample('mix.exs');
  await page.waitForSelector('#previewHost .mixexs-doc', { timeout: 12000 });
  pass('mix.exs: badge shown');
  const mixText = await page.$eval('#previewHost .mixexs-doc', el => el.textContent);
  if (!mixText.includes('phoenix')) fail('mix.exs: deps not shown');
  else pass('mix.exs: phoenix dep shown');
  if (!mixText.includes('my_app') && !mixText.includes('MyApp')) fail('mix.exs: app name not shown');
  else pass('mix.exs: app name shown');

  // ── railway.json (Railway.app deploy config) viewer ──
  await openExample('railway.json');
  await page.waitForSelector('#previewHost .railwayjson-doc', { timeout: 12000 });
  pass('railway.json: renders');
  const railwayText = await page.$eval('#previewHost .railwayjson-doc', el => el.textContent);
  if (!railwayText.includes('Railway')) fail('railway.json: missing badge'); else pass('railway.json: badge shown');
  if (!railwayText.includes('web') && !railwayText.includes('worker')) fail('railway.json: services not shown'); else pass('railway.json: services shown');
  if (railwayText.includes('supersecret123') || railwayText.includes('tok_abc123') || railwayText.includes('s3cr3t')) fail('railway.json: secrets leaked'); else pass('railway.json: secrets masked');
  if (/Railway Review|healthcheck|restart|reference|volume/i.test(railwayText)) pass('railway.json: review findings shown'); else fail('railway review: ' + railwayText.slice(0, 300));
  const railwayHelpTitle = await page.$eval('#previewHost .railwayjson-doc .rwj2-link[data-source-line]', (e) => e.getAttribute('title') || '');
  if (/Railway|Open line|source/i.test(railwayHelpTitle)) pass('railway.json: hover source help shown'); else fail('railway hover help: ' + railwayHelpTitle);
  const railwaySourceCollapsed = await page.$eval('#previewHost .railwayjson-doc .kf-source-details', (e) => !e.open && /Redacted source/.test(e.textContent));
  if (railwaySourceCollapsed) pass('railway.json: source collapsed'); else fail('railway source should start collapsed');
  const railwaySourceLine = await page.$eval('#previewHost .railwayjson-doc .rwj2-link[data-source-line]', (e) => { e.click(); return e.getAttribute('data-source-line'); });
  await page.waitForFunction((line) => {
    const details = document.querySelector('#previewHost .railwayjson-doc .kf-source-details');
    return details?.open && document.getElementById(`railway-line-${line}`);
  }, railwaySourceLine, { timeout: 3000 });
  pass('railway.json: source links open source');

  // ── render.yaml (Render.com infrastructure-as-code) viewer ──
  await openExample('render.yaml');
  await page.waitForSelector('#previewHost .renderyaml-doc', { timeout: 12000 });
  pass('render.yaml: renders');
  const renderText = await page.$eval('#previewHost .renderyaml-doc', el => el.textContent);
  if (!renderText.includes('Render')) fail('render.yaml: missing badge'); else pass('render.yaml: badge shown');
  if (!renderText.includes('web-app') && !renderText.includes('web')) fail('render.yaml: services not shown'); else pass('render.yaml: services shown');
  if (!renderText.includes('Render Review') || !renderText.includes('health check')) fail('render.yaml: review findings missing'); else pass('render.yaml: review findings shown');
  if (!renderText.includes('[dashboard managed]') || !renderText.includes('fromDatabase:main-db.connectionString')) fail('render.yaml: env notes missing'); else pass('render.yaml: env notes shown');
  const renderSourceCollapsed = await page.$eval('#previewHost .renderyaml-doc .kf-source-details', el => !el.open);
  if (renderSourceCollapsed) pass('render.yaml: source collapsed'); else fail('render.yaml source should start collapsed');
  const renderSourceLine = await page.$eval('#previewHost .renderyaml-doc .rdr-link[data-source-line]', (e) => { e.click(); return e.getAttribute('data-source-line'); });
  await page.waitForFunction((line) => {
    const details = document.querySelector('#previewHost .renderyaml-doc .kf-source-details');
    return details?.open && document.getElementById(`render-line-${line}`);
  }, renderSourceLine, { timeout: 3000 });
  pass('render.yaml: source links open source');

  // ── .htaccess (Apache per-directory config) viewer ──
  await openExample('.htaccess');
  await page.waitForSelector('#previewHost .htaccess-doc', { timeout: 12000 });
  pass('.htaccess: renders');
  const htaccessText = await page.$eval('#previewHost .htaccess-doc', el => el.textContent);
  if (!htaccessText.includes('Apache') && !htaccessText.includes('htaccess')) fail('.htaccess: missing badge'); else pass('.htaccess: badge shown');
  if (!htaccessText.includes('Rewrite') && !htaccessText.includes('redirect')) fail('.htaccess: no rules shown'); else pass('.htaccess: rewrite rules shown');

  // ── .htpasswd (Apache auth credential file) viewer ──
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
  await openExample('.terraform.lock.hcl');
  await page.waitForSelector('.tfl-lock-doc');
  pass('.terraform.lock.hcl: renders');
  const tflockText = await page.$eval('.tfl-lock-doc', el => el.textContent);
  if (!tflockText.includes('Terraform')) fail('.terraform.lock.hcl: missing badge'); else pass('.terraform.lock.hcl: badge shown');
  if (!tflockText.includes('aws') && !tflockText.includes('provider')) fail('.terraform.lock.hcl: no providers'); else pass('.terraform.lock.hcl: providers shown');

  // ── atlantis.yaml (Atlantis Terraform PR automation) viewer ──
  await openExample('atlantis.yaml');
  await page.waitForSelector('.atlantisyaml-doc');
  pass('atlantis.yaml: renders');
  const atlantisText = await page.$eval('.atlantisyaml-doc', el => el.textContent);
  if (!atlantisText.includes('Atlantis')) fail('atlantis.yaml: missing badge'); else pass('atlantis.yaml: badge shown');
  if (!atlantisText.includes('project') && !atlantisText.includes('workflow')) fail('atlantis.yaml: no projects'); else pass('atlantis.yaml: projects shown');

  // ── spacelift-config.yml (Spacelift IaC CI/CD) viewer ──
  await openExample('spacelift-config.yml');
  await page.waitForSelector('#previewHost .spaceliftcfg-doc', { timeout: 12000 });
  pass('spacelift-config.yml: renders');
  const spaceliftText = await page.$eval('#previewHost .spaceliftcfg-doc', el => el.textContent);
  if (!spaceliftText.includes('Spacelift')) fail('spacelift-config.yml: missing badge'); else pass('spacelift-config.yml: badge shown');
  if (!spaceliftText.includes('production') && !spaceliftText.includes('staging')) fail('spacelift-config.yml: no stacks shown'); else pass('spacelift-config.yml: stacks shown');

  // ── Caddyfile viewer ──
  await openExample('Caddyfile');
  await page.waitForSelector('.caddyfile-doc');
  pass('Caddyfile: renders');
  const caddyText = await page.$eval('.caddyfile-doc', el => el.textContent);
  if (!caddyText.includes('Caddy')) fail('Caddyfile: missing badge'); else pass('Caddyfile: badge shown');
  if (!caddyText.includes('reverse_proxy') && !caddyText.includes('file_server') && !caddyText.includes('site')) fail('Caddyfile: no site info'); else pass('Caddyfile: site info shown');

  // ── supervisord.conf viewer ──
  await openExample('supervisord.conf');
  await page.waitForSelector('.supervisordcfg-doc');
  pass('supervisord.conf: renders');
  const supervisordText = await page.$eval('.supervisordcfg-doc', el => el.textContent);
  if (!supervisordText.includes('supervisord')) fail('supervisord.conf: missing badge'); else pass('supervisord.conf: badge shown');
  if (!supervisordText.includes('program') && !supervisordText.includes('command')) fail('supervisord.conf: no programs shown'); else pass('supervisord.conf: programs shown');

  // ── nginx.conf viewer (nginxconf-doc class) ──
  await openExample('nginx.conf');
  await page.waitForSelector('.nginxconf-doc');
  pass('nginx.conf: renders');
  const nginxText = await page.$eval('.nginxconf-doc', el => el.textContent);
  if (!nginxText.includes('NGINX') && !nginxText.includes('nginx')) fail('nginx.conf: missing badge'); else pass('nginx.conf: badge shown');
  if (!nginxText.includes('server') && !nginxText.includes('listen')) fail('nginx.conf: no server info'); else pass('nginx.conf: server info shown');

  // ── haproxy.cfg viewer (haproxycfg-doc class) ──
  await openExample('haproxy.cfg');
  await page.waitForSelector('.haproxycfg-doc');
  pass('haproxy.cfg: renders');
  const haproxyText = await page.$eval('.haproxycfg-doc', el => el.textContent);
  if (!haproxyText.includes('HAProxy')) fail('haproxy.cfg: missing badge'); else pass('haproxy.cfg: badge shown');
  if (!haproxyText.includes('frontend') && !haproxyText.includes('backend')) fail('haproxy.cfg: no proxy config'); else pass('haproxy.cfg: proxy config shown');

  // ── .babelrc (Babel transpiler JSON config) viewer ──
  await openExample('.babelrc');
  await page.waitForSelector('.babelrc-doc');
  pass('.babelrc: renders');
  const babelrcText = await page.$eval('.babelrc-doc', el => el.textContent);
  if (!babelrcText.includes('Babel')) fail('.babelrc: missing badge'); else pass('.babelrc: badge shown');
  if (!babelrcText.includes('preset') && !babelrcText.includes('plugin')) fail('.babelrc: no config shown'); else pass('.babelrc: config shown');

  // ── jest.config.js (Jest plain-text JS config) viewer ──
  await openExample('jest.config.js');
  await page.waitForSelector('.jestconfig-doc');
  pass('jest.config.js: renders');
  const jestJsText = await page.$eval('.jestconfig-doc', el => el.textContent);
  if (!jestJsText.includes('Jest')) fail('jest.config.js: missing badge'); else pass('jest.config.js: badge shown');
  if (!jestJsText.includes('testEnvironment') && !jestJsText.includes('transform') && !jestJsText.includes('coverage')) fail('jest.config.js: no config shown'); else pass('jest.config.js: config shown');

  // ── .env.example (env template) viewer ──
  await openExample('.env.example (Env Template)');
  await page.waitForSelector('.envex-doc');
  pass('.env.example: renders');
  const envExText = await page.$eval('.envex-doc', el => el.textContent);
  if (!envExText.includes('.env') && !envExText.includes('example') && !envExText.includes('Template')) fail('.env.example: missing badge/notice'); else pass('.env.example: badge shown');
  if (!envExText.includes('DATABASE') && !envExText.includes('KEY')) fail('.env.example: no vars shown'); else pass('.env.example: variables shown');

  // ── .envrc (direnv) viewer ──
  await openExample('.envrc');
  await page.waitForSelector('.erc-doc');
  pass('.envrc: renders');
  const envrcText = await page.$eval('.erc-doc', el => el.textContent);
  if (!envrcText.includes('direnv') && !envrcText.includes('envrc')) fail('.envrc: missing badge'); else pass('.envrc: badge shown');
  if (!envrcText.includes('layout') && !envrcText.includes('PATH') && !envrcText.includes('node')) fail('.envrc: no config shown'); else pass('.envrc: config shown');

  // ── .gcloudignore viewer ──
  await openExample('.gcloudignore');
  await page.waitForSelector('.gcloudignore-doc');
  pass('.gcloudignore: renders');
  const gcloudignoreText = await page.$eval('.gcloudignore-doc', el => el.textContent);
  if (!gcloudignoreText.includes('gcloud') && !gcloudignoreText.includes('Google')) fail('.gcloudignore: missing badge'); else pass('.gcloudignore: badge shown');

  // ── app.json (Heroku) viewer ──
  await openExample('heroku-app.json');
  await page.waitForSelector('.appjson-doc');
  pass('app.json: renders');
  const appjsonText = await page.$eval('.appjson-doc', el => el.textContent);
  if (!appjsonText.includes('Heroku')) fail('app.json: missing badge'); else pass('app.json: badge shown');
  if (/buildpack|add-?ons?|formation/i.test(appjsonText)) pass('app.json: config shown'); else fail('app.json: no config shown: ' + appjsonText.slice(0, 200));

  // ── cliff.toml upgraded viewer (plugin id: cliff-toml) ──
  await openExample('cliff.toml');
  await page.waitForSelector('.clifftoml-doc');
  pass('cliff.toml: renders');
  const cliffText = await page.$eval('.clifftoml-doc', el => el.textContent);
  if (!cliffText.includes('git-cliff') && !cliffText.includes('cliff')) fail('cliff.toml: missing badge'); else pass('cliff.toml: badge shown');
  if (!cliffText.includes('conventional') && !cliffText.includes('commit')) fail('cliff.toml: no git config shown'); else pass('cliff.toml: git config shown');

  // ── release-please-config.json upgraded viewer (plugin id: release-please) ──
  await openExample('release-please-config.json');
  await page.waitForSelector('.relpls-doc');
  pass('release-please-config.json: renders');
  const rpText = await page.$eval('.relpls-doc', el => el.textContent);
  if (!rpText.includes('Release')) fail('release-please-config.json: missing badge'); else pass('release-please-config.json: badge shown');
  if (!rpText.includes('package') && !rpText.includes('release-type')) fail('release-please-config.json: no config shown'); else pass('release-please-config.json: config shown');

  // ── .eslintignore viewer (plugin id: eslintignore) ──
  await openExample('.eslintignore');
  await page.waitForSelector('.eslintignore-doc');
  pass('.eslintignore: renders');
  const eslintignoreText = await page.$eval('.eslintignore-doc', el => el.textContent);
  if (!eslintignoreText.includes('ESLint')) fail('.eslintignore: missing badge'); else pass('.eslintignore: badge shown');
  if (!eslintignoreText.includes('node_modules') && !eslintignoreText.includes('dist') && !eslintignoreText.includes('pattern')) fail('.eslintignore: no patterns'); else pass('.eslintignore: patterns shown');

  // ── .prettierignore viewer (plugin id: prettierignore) ──
  await openExample('.prettierignore');
  await page.waitForSelector('.prettierignore-doc');
  pass('.prettierignore: renders');
  const prettierignoreText = await page.$eval('.prettierignore-doc', el => el.textContent);
  if (!prettierignoreText.includes('Prettier')) fail('.prettierignore: missing badge'); else pass('.prettierignore: badge shown');
  if (!prettierignoreText.includes('node_modules') && !prettierignoreText.includes('dist') && !prettierignoreText.includes('pattern')) fail('.prettierignore: no patterns'); else pass('.prettierignore: patterns shown');

  // ── .codeclimate.yml upgraded viewer ──
  await openExample('.codeclimate.yml');
  await page.waitForSelector('.codeclimate-doc');
  pass('.codeclimate.yml: renders');
  const codeclimateText = await page.$eval('.codeclimate-doc', el => el.textContent);
  if (!codeclimateText.includes('Code Climate') && !codeclimateText.includes('codeclimate')) fail('.codeclimate.yml: missing badge'); else pass('.codeclimate.yml: badge shown');
  if (!codeclimateText.includes('plugin') && !codeclimateText.includes('rubocop') && !codeclimateText.includes('eslint')) fail('.codeclimate.yml: no plugins shown'); else pass('.codeclimate.yml: plugins shown');

  // ── semaphore.yml viewer ──
  await openExample('semaphore.yml');
  await page.waitForSelector('.semaphorecfg-doc');
  pass('semaphore.yml: renders');
  const semaphoreText = await page.$eval('.semaphorecfg-doc', el => el.textContent);
  if (!semaphoreText.includes('Semaphore')) fail('semaphore.yml: missing badge'); else pass('semaphore.yml: badge shown');
  if (!semaphoreText.includes('block') && !semaphoreText.includes('job') && !semaphoreText.includes('Install')) fail('semaphore.yml: no blocks shown'); else pass('semaphore.yml: blocks shown');

  // ── .yamllint viewer ──
  await openExample('.yamllint');
  await page.waitForSelector('.yamllint-doc');
  pass('.yamllint: renders');
  const yamllintText = await page.$eval('.yamllint-doc', el => el.textContent);
  if (!yamllintText.includes('yamllint') && !yamllintText.includes('YAML')) fail('.yamllint: missing badge'); else pass('.yamllint: badge shown');
  if (!yamllintText.includes('rule') && !yamllintText.includes('line-length') && !yamllintText.includes('indent')) fail('.yamllint: no rules shown'); else pass('.yamllint: rules shown');

  // ── vale.ini viewer ──
  await openExample('vale.ini');
  await page.waitForSelector('.valeini-doc');
  pass('vale.ini: renders');
  const valeText = await page.$eval('.valeini-doc', el => el.textContent);
  if (!valeText.includes('Vale')) fail('vale.ini: missing badge'); else pass('vale.ini: badge shown');
  if (!valeText.includes('Style') && !valeText.includes('BasedOn') && !valeText.includes('write-good')) fail('vale.ini: no styles shown'); else pass('vale.ini: styles shown');

  // ── .ansible-lint viewer ──
  await openExample('.ansible-lint');
  await page.waitForSelector('.ansiblelint-doc', { timeout: 12000 });
  pass('.ansible-lint: renders');
  const ansiblelintText = await page.$eval('.ansiblelint-doc', el => el.textContent);
  if (!ansiblelintText.includes('ansible') && !ansiblelintText.includes('lint')) fail('.ansible-lint: missing badge'); else pass('.ansible-lint: badge shown');
  if (!ansiblelintText.includes('skip') && !ansiblelintText.includes('profile') && !ansiblelintText.includes('rule')) fail('.ansible-lint: no config shown'); else pass('.ansible-lint: config shown');

  // ── molecule.yml viewer ──
  await openExample('molecule.yml');
  await page.waitForSelector('.moleculeyml-doc', { timeout: 12000 });
  pass('molecule.yml: renders');
  const moleculeText = await page.$eval('.moleculeyml-doc', el => el.textContent);
  if (!moleculeText.includes('Molecule')) fail('molecule.yml: missing badge'); else pass('molecule.yml: badge shown');
  if (!moleculeText.includes('driver') && !moleculeText.includes('platform') && !moleculeText.includes('ubuntu')) fail('molecule.yml: no platforms shown'); else pass('molecule.yml: platforms shown');

  // ── dprint.json viewer ──
  await openExample('dprint.json');
  await page.waitForSelector('#previewHost .dprint-doc', { timeout: 12000 });
  pass('dprint.json: dprint-doc shown');
  const dprintText = await page.$eval('#previewHost .dprint-doc', el => el.textContent);
  if (!dprintText.includes('dprint')) fail('dprint.json: missing badge'); else pass('dprint.json: badge shown');
  if (!dprintText.includes('typescript') && !dprintText.includes('json') && !dprintText.includes('Plugin')) fail('dprint.json: plugins section missing'); else pass('dprint.json: plugins section shown');

  // ── helmfile.yaml viewer ──
  await openExample('helmfile.yaml');
  await page.waitForSelector('#previewHost .helmfile-doc', { timeout: 12000 });
  pass('helmfile.yaml: renders');
  const helmfileText = await page.$eval('#previewHost .helmfile-doc', el => el.textContent);
  const helmfileHtml = await page.$eval('#previewHost .helmfile-doc', el => el.innerHTML);
  if (!helmfileText.includes('Helmfile')) fail('helmfile.yaml: missing badge'); else pass('helmfile.yaml: badge shown');
  if (!helmfileText.includes('nginx-ingress') && !helmfileText.includes('cert-manager') && !helmfileText.includes('release')) fail('helmfile.yaml: no releases shown'); else pass('helmfile.yaml: releases shown');
  if (!helmfileText.includes('bitnami') && !helmfileText.includes('stable') && !helmfileText.includes('repo')) fail('helmfile.yaml: no repos shown'); else pass('helmfile.yaml: repos shown');
  if (/Helmfile Review|stable repo|latest fallback|env secret|atomic/i.test(helmfileText)) pass('helmfile.yaml: review findings shown'); else fail('helmfile.yaml: review missing: ' + helmfileText.slice(0, 400));
  if ((helmfileText + helmfileHtml).includes('adminPassword: "{{ requiredEnv')) fail('helmfile.yaml: secret-like source leaked'); else pass('helmfile.yaml: secret-like source redacted');
  const helmfileHelpTitle = await page.$eval('#previewHost .helmfile-doc .helmfile-link[data-source-line]', (e) => e.getAttribute('title') || '');
  if (/Helmfile|Open line|source/i.test(helmfileHelpTitle)) pass('helmfile.yaml: hover source help shown'); else fail('helmfile.yaml source help title missing');
  const helmfileSourceCollapsed = await page.$eval('#previewHost .helmfile-doc .kf-source-details', (e) => !e.open && e.textContent.includes('Redacted source'));
  if (helmfileSourceCollapsed) pass('helmfile.yaml: redacted source collapsed'); else fail('helmfile.yaml: redacted source not collapsed');
  const helmfileSourceLine = await page.$eval('#previewHost .helmfile-doc .helmfile-link[data-source-line]', (e) => {
    e.click();
    return e.getAttribute('data-source-line');
  });
  await page.waitForFunction((line) => {
    const details = document.querySelector('#previewHost .helmfile-doc .kf-source-details');
    return details?.open && document.getElementById(`helmfile-line-${line}`);
  }, helmfileSourceLine);
  pass('helmfile.yaml: source links open redacted source');

  // ── .release-it.yml viewer ──
  await openExample('.release-it.yml');
  await page.waitForSelector('#previewHost .releaseit-doc', { timeout: 12000 });
  pass('.release-it.yml: renders');
  const releaseItText = await page.$eval('#previewHost .releaseit-doc', el => el.textContent);
  if (!releaseItText.includes('release-it')) fail('.release-it.yml: missing badge'); else pass('.release-it.yml: badge shown');
  if (!releaseItText.includes('tagName') && !releaseItText.includes('commitMessage') && !releaseItText.includes('git')) fail('.release-it.yml: no git section shown'); else pass('.release-it.yml: git section shown');
  if (!releaseItText.includes('GitHub') && !releaseItText.includes('github')) fail('.release-it.yml: no GitHub section shown'); else pass('.release-it.yml: GitHub section shown');

  // ── benthos.yaml viewer ──
  await openExample('benthos.yaml');
  pass(await page.waitForSelector('#previewHost .benthos-doc', { timeout: 12000 }), 'benthos.yaml: benthos-doc shown');
  const benthosText = await page.$eval('#previewHost .benthos-doc', el => el.textContent);
  if (!benthosText.includes('Redpanda') && !benthosText.includes('Benthos')) fail('benthos.yaml: missing badge'); else pass('benthos.yaml: badge shown');
  if (!benthosText.includes('kafka') && !benthosText.includes('input')) fail('benthos.yaml: no input shown'); else pass('benthos.yaml: input shown');
  if (!benthosText.includes('http_client') && !benthosText.includes('output')) fail('benthos.yaml: no output shown'); else pass('benthos.yaml: output shown');
  if (!benthosText.includes('bloblang') && !benthosText.includes('processor')) fail('benthos.yaml: no processors shown'); else pass('benthos.yaml: processors shown');

  // ── .kitchen.yml viewer ──
  await openExample('.kitchen.yml');
  pass(await page.waitForSelector('#previewHost .testkitchen-doc', { timeout: 12000 }), '.kitchen.yml: testkitchen-doc shown');
  const kitchenText = await page.$eval('#previewHost .testkitchen-doc', el => el.textContent);
  if (!kitchenText.includes('Test Kitchen') && !kitchenText.includes('Kitchen')) fail('.kitchen.yml: missing badge'); else pass('.kitchen.yml: badge shown');
  if (!kitchenText.includes('vagrant') && !kitchenText.includes('driver')) fail('.kitchen.yml: no driver shown'); else pass('.kitchen.yml: driver shown');
  if (!kitchenText.includes('ubuntu') && !kitchenText.includes('centos') && !kitchenText.includes('platform')) fail('.kitchen.yml: no platforms shown'); else pass('.kitchen.yml: platforms shown');
  if (!kitchenText.includes('default') && !kitchenText.includes('suite')) fail('.kitchen.yml: no suites shown'); else pass('.kitchen.yml: suites shown');

  // ── shopify.app.toml viewer ──
  await openExample('shopify.app.toml');
  pass(await page.waitForSelector('#previewHost .shopifyapp-doc', { timeout: 12000 }), 'shopify.app.toml: shopifyapp-doc shown');
  const shopifyText = await page.$eval('#previewHost .shopifyapp-doc', el => el.textContent);
  if (!shopifyText.includes('Shopify')) fail('shopify.app.toml: missing badge'); else pass('shopify.app.toml: badge shown');
  if (!shopifyText.includes('scope') && !shopifyText.includes('products') && !shopifyText.includes('orders')) fail('shopify.app.toml: no scopes shown'); else pass('shopify.app.toml: scopes shown');

  // ── .lighthouserc.json viewer ──
  await openExample('.lighthouserc.json');
  pass(await page.waitForSelector('#previewHost .lhci-doc', { timeout: 12000 }), '.lighthouserc.json: lhci-doc shown');
  const lhciText = await page.$eval('#previewHost .lhci-doc', el => el.textContent);
  if (!lhciText.includes('Lighthouse')) fail('.lighthouserc.json: missing badge'); else pass('.lighthouserc.json: badge shown');
  if (!lhciText.includes('lighthouse:recommended') && !lhciText.includes('assert') && !lhciText.includes('performance')) fail('.lighthouserc.json: no assertions shown'); else pass('.lighthouserc.json: assertions shown');

  // ── harbor.yml viewer ──
  await openExample('harbor.yml');
  pass(await page.waitForSelector('#previewHost .harbor-doc', { timeout: 12000 }), 'harbor.yml: harbor-doc shown');
  const harborText = await page.$eval('#previewHost .harbor-doc', el => el.textContent);
  if (!harborText.includes('Harbor')) fail('harbor.yml: missing badge'); else pass('harbor.yml: badge shown');
  if (!harborText.includes('registry.example.com') && !harborText.includes('hostname')) fail('harbor.yml: no hostname shown'); else pass('harbor.yml: hostname shown');

  // ── garden.yml viewer ──
  await openExample('garden.yml');
  pass(await page.waitForSelector('#previewHost .gardenio-doc', { timeout: 12000 }), 'garden.yml: gardenio-doc shown');
  const gardenText = await page.$eval('#previewHost .gardenio-doc', el => el.textContent);
  if (!gardenText.includes('Garden')) fail('garden.yml: missing badge'); else pass('garden.yml: badge shown');
  if (!gardenText.includes('Project') && !gardenText.includes('kind')) fail('garden.yml: no kind shown'); else pass('garden.yml: kind shown');

  // ── stryker.conf.json viewer ──
  await openExample('stryker.conf.json');
  pass(await page.waitForSelector('#previewHost .stryker-doc', { timeout: 12000 }), 'stryker.conf.json: stryker-doc shown');
  const strykerText = await page.$eval('#previewHost .stryker-doc', el => el.textContent);
  if (!strykerText.includes('Stryker')) fail('stryker.conf.json: missing badge'); else pass('stryker.conf.json: badge shown');
  if (!strykerText.includes('jest') && !strykerText.includes('runner')) fail('stryker.conf.json: no test runner shown'); else pass('stryker.conf.json: test runner shown');

  // ── volta.json viewer ──
  await openExample('volta.json');
  pass(await page.waitForSelector('#previewHost .vlt-doc', { timeout: 12000 }), 'volta.json: vlt-doc shown');
  const voltaText = await page.$eval('#previewHost .vlt-doc', el => el.textContent);
  if (/Volta/i.test(voltaText) && /node/i.test(voltaText)) pass('volta.json: pinned tools shown'); else fail('volta: ' + voltaText.slice(0, 200));
}
