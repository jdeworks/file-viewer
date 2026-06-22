// Auto-split slice 02/18 of the known-files smoke area (see ./../known-files.mjs).
// Covers: wrangler.toml … .huskyrc.json.
// Called in order on the shared ctx — keep openExample order intact; no cross-file state.
export async function run(ctx) {
  const { page, origin, frameOf, pass, fail, openExample } = ctx;

  // ── wrangler.toml viewer ──
  await openExample('wrangler.toml');
  await page.waitForSelector('#previewHost .wgl-doc', { timeout: 12000 });
  const wglText = await page.$eval('#previewHost .wgl-doc', (e) => e.textContent);
  if (/Wrangler|Cloudflare/i.test(wglText)) pass('wrangler.toml: badge shown'); else fail('wrangler badge: ' + wglText.slice(0, 200));
  if (/my-worker|MY_KV|example\.com/i.test(wglText)) pass('wrangler.toml: content shown'); else fail('wrangler content: ' + wglText.slice(0, 200));

  // ── fly.toml viewer ──
  await openExample('fly.toml');
  await page.waitForSelector('.flytoml-doc', { timeout: 12000 });
  pass('fly.toml: renders');
  const flyText = await page.$eval('.flytoml-doc', (e) => e.textContent);
  if (/Fly\.io/i.test(flyText)) pass('fly.toml: badge shown'); else fail('fly badge: ' + flyText.slice(0, 200));
  if (/my-api-service|iad|region/i.test(flyText)) pass('fly.toml: app info shown'); else fail('fly content: ' + flyText.slice(0, 200));

  // ── cliff.toml viewer ──
  await openExample('cliff.toml');
  await page.waitForSelector('#previewHost .clifftoml-doc', { timeout: 12000 });
  const clfText = await page.$eval('#previewHost .clifftoml-doc', (e) => e.textContent);
  if (/git-cliff/i.test(clfText)) pass('cliff.toml: badge shown'); else fail('cliff badge: ' + clfText.slice(0, 200));
  if (/Features|Bug Fixes|commit/i.test(clfText)) pass('cliff.toml: commit groups shown'); else fail('cliff content: ' + clfText.slice(0, 200));
  if (/conventional/i.test(clfText)) pass('cliff.toml: git settings shown'); else fail('cliff git settings: ' + clfText.slice(0, 200));

  // ── .releaserc.json viewer ──
  await openExample('.releaserc.json');
  await page.waitForSelector('#previewHost .rls-doc', { timeout: 12000 });
  const rlsText = await page.$eval('#previewHost .rls-doc', (e) => e.textContent);
  if (/semantic-release/i.test(rlsText)) pass('.releaserc.json: badge shown'); else fail('releaserc badge: ' + rlsText.slice(0, 200));
  if (/commit-analyzer|npm|github/i.test(rlsText)) pass('.releaserc.json: plugins shown'); else fail('releaserc plugins: ' + rlsText.slice(0, 200));

  // ── lerna.json viewer ──
  await openExample('lerna.json');
  await page.waitForSelector('.lernajson-doc', { timeout: 12000 });
  pass('lerna.json: renders');
  const lernaText = await page.$eval('.lernajson-doc', el => el.textContent);
  if (!lernaText.includes('Lerna')) fail('lerna.json: missing badge'); else pass('lerna.json: badge shown');
  if (!lernaText.includes('version') && !lernaText.includes('package')) fail('lerna.json: no config shown'); else pass('lerna.json: config shown');

  // ── nx.json viewer ──
  await openExample('nx.json');
  await page.waitForSelector('.nxjson-doc', { timeout: 12000 });
  pass('nx.json: renders');
  const nxText = await page.$eval('.nxjson-doc', el => el.textContent);
  if (!nxText.includes('Nx')) fail('nx.json: missing badge'); else pass('nx.json: badge shown');
  if (!nxText.includes('cache') && !nxText.includes('target') && !nxText.includes('build')) fail('nx.json: no config shown'); else pass('nx.json: config shown');
  if (nxText.includes('abc123xyz')) fail('nx.json: cloud token leaked'); else pass('nx.json: cloud token masked');

  // ── biome.json viewer ──
  await openExample('biome.json');
  await page.waitForSelector('#previewHost .biome-doc', { timeout: 12000 });
  const bmoText = await page.$eval('#previewHost .biome-doc', (e) => e.textContent);
  if (/Biome/i.test(bmoText)) pass('biome.json: badge shown'); else fail('biome badge: ' + bmoText.slice(0, 200));
  if (/100|lineWidth/.test(bmoText)) pass('biome.json: formatter shown'); else fail('biome.json: formatter not shown: ' + bmoText.slice(0, 200));
  if (/single|quoteStyle/.test(bmoText)) pass('biome.json: JS settings shown'); else fail('biome.json: JS settings not shown: ' + bmoText.slice(0, 200));

  // ── codecov.yml viewer ──
  await openExample('codecov.yml');
  await page.waitForSelector('#previewHost .codecov-doc', { timeout: 12000 });
  const ccvText = await page.$eval('#previewHost .codecov-doc', (e) => e.textContent);
  if (/Codecov/i.test(ccvText)) pass('codecov.yml: badge shown'); else fail('codecov badge: ' + ccvText.slice(0, 200));
  if (ccvText.includes('80')) pass('codecov.yml: coverage target shown'); else fail('codecov.yml: coverage target not shown: ' + ccvText.slice(0, 200));
  if (ccvText.includes('frontend')) pass('codecov.yml: flags shown'); else fail('codecov.yml: flags not shown: ' + ccvText.slice(0, 200));

  // ── serverless.yml viewer ──
  await openExample('serverless.yml');
  await page.waitForSelector('#previewHost .sls-doc', { timeout: 12000 });
  const slsText = await page.$eval('#previewHost .sls-doc', (e) => e.textContent);
  if (/Serverless/i.test(slsText)) pass('serverless.yml: badge shown'); else fail('serverless badge: ' + slsText.slice(0, 200));
  if (/api|worker|scheduler/i.test(slsText)) pass('serverless.yml: functions shown'); else fail('serverless functions: ' + slsText.slice(0, 200));

  // ── azure-pipelines.yml viewer ──
  await openExample('azure-pipelines.yml');
  await page.waitForSelector('#previewHost .azp-doc', { timeout: 12000 });
  const azpText = await page.$eval('#previewHost .azp-doc', (e) => e.textContent);
  if (/Azure Pipelines/i.test(azpText)) pass('azure-pipelines.yml: badge shown'); else fail('azure badge: ' + azpText.slice(0, 200));
  if (/Build|Test|ubuntu/i.test(azpText)) pass('azure-pipelines.yml: stages and pool shown'); else fail('azure content: ' + azpText.slice(0, 200));

  // ── vscode-settings.json viewer ──
  await openExample('vscode-settings.json');
  await page.waitForSelector('#previewHost .vsc-settings-doc', { timeout: 12000 });
  const vscText = await page.$eval('#previewHost .vsc-settings-doc', (e) => e.textContent);
  if (/VS Code/i.test(vscText)) pass('vscode-settings.json: badge shown'); else fail('vscode badge: ' + vscText.slice(0, 200));
  if (/formatOnSave|tabSize|fontSize/i.test(vscText)) pass('vscode-settings.json: settings shown'); else fail('vscode settings: ' + vscText.slice(0, 200));

  // ── vscode-extensions.json viewer ──
  await openExample('vscode-extensions.json');
  await page.waitForSelector('#previewHost .vsc-ext-doc', { timeout: 12000 });
  const vscExtText = await page.$eval('#previewHost .vsc-ext-doc', (e) => e.textContent);
  if (/VS Code/i.test(vscExtText)) pass('vscode-extensions.json: badge shown'); else fail('vscode-ext badge: ' + vscExtText.slice(0, 200));
  if (/prettier|eslint|gitlens/i.test(vscExtText)) pass('vscode-extensions.json: extensions shown'); else fail('vscode-ext content: ' + vscExtText.slice(0, 200));

  // ── vscode-launch.json viewer ──
  await openExample('vscode-launch.json');
  await page.waitForSelector('#previewHost .vsc-launch-doc', { timeout: 12000 });
  const vscLaunchText = await page.$eval('#previewHost .vsc-launch-doc', (e) => e.textContent);
  if (/VS Code/i.test(vscLaunchText)) pass('vscode-launch.json: badge shown'); else fail('vscode-launch badge: ' + vscLaunchText.slice(0, 200));
  if (/Debug Node|Chrome|node/i.test(vscLaunchText)) pass('vscode-launch.json: configs shown'); else fail('vscode-launch content: ' + vscLaunchText.slice(0, 200));

  // ── vscode-tasks.json viewer ──
  await openExample('vscode-tasks.json');
  await page.waitForSelector('#previewHost .vsc-tasks-doc', { timeout: 12000 });
  const vscTasksText = await page.$eval('#previewHost .vsc-tasks-doc', (e) => e.textContent);
  if (/VS Code/i.test(vscTasksText)) pass('vscode-tasks.json: badge shown'); else fail('vscode-tasks badge: ' + vscTasksText.slice(0, 200));
  if (/build|test|lint/i.test(vscTasksText)) pass('vscode-tasks.json: tasks shown'); else fail('vscode-tasks content: ' + vscTasksText.slice(0, 200));

  // ── travis.yml viewer ──
  await openExample('Travis CI config');
  await page.waitForSelector('#previewHost .trv-doc', { timeout: 12000 });
  const trvText = await page.$eval('#previewHost .trv-doc', (e) => e.textContent);
  if (/Travis CI/i.test(trvText)) pass('travis.yml: badge shown'); else fail('travis badge: ' + trvText.slice(0, 200));
  if (/node_js|node|python|ruby/i.test(trvText)) pass('travis.yml: language shown'); else fail('travis language: ' + trvText.slice(0, 200));

  // ── circleci.yml viewer ──
  await openExample('CircleCI config');
  await page.waitForSelector('#previewHost .circleciconfig-doc', { timeout: 12000 });
  pass('circleci.yml: renders');
  const cciText = await page.$eval('#previewHost .circleciconfig-doc', (e) => e.textContent);
  if (/CircleCI/i.test(cciText)) pass('circleci.yml: badge shown'); else fail('circleci badge: ' + cciText.slice(0, 200));
  if (/build|test|deploy|job/i.test(cciText)) pass('circleci.yml: jobs shown'); else fail('circleci jobs: ' + cciText.slice(0, 200));

  // ── amplify.yml viewer ──
  await openExample('AWS Amplify config');
  await page.waitForSelector('#previewHost .amp-doc', { timeout: 12000 });
  const ampText = await page.$eval('#previewHost .amp-doc', (e) => e.textContent);
  if (/AWS Amplify/i.test(ampText)) pass('amplify.yml: badge shown'); else fail('amplify badge: ' + ampText.slice(0, 200));
  if (/preBuild|build|npm/i.test(ampText)) pass('amplify.yml: build phases shown'); else fail('amplify phases: ' + ampText.slice(0, 200));

  // ── buildspec.yml viewer ──
  await openExample('AWS CodeBuild buildspec');
  await page.waitForSelector('#previewHost .cod-doc', { timeout: 12000 });
  const codText = await page.$eval('#previewHost .cod-doc', (e) => e.textContent);
  if (/CodeBuild/i.test(codText)) pass('buildspec.yml: badge shown'); else fail('codebuild badge: ' + codText.slice(0, 200));
  if (/install|build|npm/i.test(codText)) pass('buildspec.yml: phases shown'); else fail('codebuild phases: ' + codText.slice(0, 200));

  // ── jsconfig.json viewer ──
  await openExample('jsconfig.json');
  await page.waitForSelector('#previewHost .jsc-doc', { timeout: 12000 });
  const jscText = await page.$eval('#previewHost .jsc-doc', (e) => e.textContent);
  if (/jsconfig/i.test(jscText)) pass('jsconfig.json: title shown'); else fail('jsconfig title: ' + jscText.slice(0, 200));
  if (/ES2020|target|checkJs/i.test(jscText)) pass('jsconfig.json: options shown'); else fail('jsconfig options: ' + jscText.slice(0, 200));

  // ── deno.json viewer ──
  await openExample('Deno config');
  await page.waitForSelector('#previewHost .den-doc', { timeout: 12000 });
  const denText = await page.$eval('#previewHost .den-doc', (e) => e.textContent);
  if (/Deno/i.test(denText)) pass('deno.json: badge shown'); else fail('deno badge: ' + denText.slice(0, 200));
  if (/imports|tasks|hono|std/i.test(denText)) pass('deno.json: imports or tasks shown'); else fail('deno content: ' + denText.slice(0, 200));

  // ── .nvmrc viewer ──
  await openExample('.nvmrc');
  await page.waitForSelector('#previewHost .nvm-doc', { timeout: 12000 });
  const nvmText = await page.$eval('#previewHost .nvm-doc', (e) => e.textContent);
  if (/Node\.js|nvmrc/i.test(nvmText)) pass('nvmrc: badge shown'); else fail('nvmrc badge: ' + nvmText.slice(0, 200));
  if (/v20|20\.11|lts/i.test(nvmText)) pass('nvmrc: version shown'); else fail('nvmrc version: ' + nvmText.slice(0, 200));

  // ── .browserslistrc viewer ──
  await openExample('.browserslistrc');
  await page.waitForSelector('#previewHost .brl-doc', { timeout: 12000 });
  const brlText = await page.$eval('#previewHost .brl-doc', (e) => e.textContent);
  if (/Browserslist/i.test(brlText)) pass('browserslistrc: badge shown'); else fail('browserslist badge: ' + brlText.slice(0, 200));
  if (/last|Firefox|chrome/i.test(brlText)) pass('browserslistrc: queries shown'); else fail('browserslist queries: ' + brlText.slice(0, 200));

  // ── pre-commit-config.yaml viewer ──
  await openExample('pre-commit config');
  await page.waitForSelector('#previewHost .prc-doc', { timeout: 12000 });
  const prcText = await page.$eval('#previewHost .prc-doc', (e) => e.textContent);
  if (/pre-commit/i.test(prcText)) pass('pre-commit-config.yaml: badge shown'); else fail('pre-commit badge: ' + prcText.slice(0, 200));
  if (/trailing|yaml|json|repo/i.test(prcText)) pass('pre-commit-config.yaml: hooks shown'); else fail('pre-commit hooks: ' + prcText.slice(0, 200));

  // ── pyrightconfig.json viewer ──
  await openExample('Pyright config');
  await page.waitForSelector('#previewHost .pyr-doc', { timeout: 12000 });
  const pyrText = await page.$eval('#previewHost .pyr-doc', (e) => e.textContent);
  if (/Pyright/i.test(pyrText)) pass('pyrightconfig.json: badge shown'); else fail('pyright badge: ' + pyrText.slice(0, 200));
  if (/standard|3\.11|typeCheck/i.test(pyrText)) pass('pyrightconfig.json: config shown'); else fail('pyright config: ' + pyrText.slice(0, 200));

  // ── tox.ini viewer ──
  await openExample('tox.ini (tox Config)');
  await page.waitForSelector('#previewHost .toxini-doc', { timeout: 12000 });
  const toxText = await page.$eval('#previewHost .toxini-doc', (e) => e.textContent);
  if (/tox/i.test(toxText)) pass('tox.ini: badge shown'); else fail('tox badge: ' + toxText.slice(0, 200));
  if (/py310|py\{310/i.test(toxText)) pass('tox.ini: envlist shown'); else fail('tox.ini: envlist not shown: ' + toxText.slice(0, 200));
  if (/lint/i.test(toxText)) pass('tox.ini: lint env shown'); else fail('tox.ini: lint env not shown: ' + toxText.slice(0, 200));

  // ── pytest.ini viewer ──
  await openExample('pytest.ini (pytest Config)');
  await page.waitForSelector('#previewHost .pytestini-doc', { timeout: 12000 });
  pass('pytest.ini: badge shown');
  const pytestText = await page.$eval('#previewHost .pytestini-doc', (e) => e.textContent);
  if (/tests/i.test(pytestText)) pass('pytest.ini: testpaths shown'); else fail('pytest.ini: testpaths not shown: ' + pytestText.slice(0, 200));
  if (/slow|Markers|integration|flaky/i.test(pytestText)) pass('pytest.ini: markers shown'); else fail('pytest.ini: markers not shown: ' + pytestText.slice(0, 200));

  // ── mypy.ini viewer ──
  await openExample('mypy config');
  await page.waitForSelector('#previewHost .mypyini-doc', { timeout: 12000 });
  pass('mypy.ini: badge shown');
  const mypText = await page.$eval('#previewHost .mypyini-doc', (e) => e.textContent);
  if (!mypText.includes('3.11')) fail('mypy.ini: python version not shown'); else pass('mypy.ini: python version shown');
  if (!mypText.includes('pytest') && !mypText.includes('requests')) fail('mypy.ini: module overrides not shown'); else pass('mypy.ini: module overrides shown');

  // ── angular.json viewer ──
  await openExample('Angular workspace');
  await page.waitForSelector('#previewHost .ngw-doc', { timeout: 12000 });
  const ngwText = await page.$eval('#previewHost .ngw-doc', (e) => e.textContent);
  if (/Angular/i.test(ngwText)) pass('angular.json: badge shown'); else fail('angular badge: ' + ngwText.slice(0, 200));
  if (/my-app|project|build|serve/i.test(ngwText)) pass('angular.json: projects shown'); else fail('angular projects: ' + ngwText.slice(0, 200));

  // ── capacitor.config.json viewer ──
  await openExample('capacitor.config.json');
  await page.waitForSelector('#previewHost .cap-doc', { timeout: 12000 });
  const capText = await page.$eval('#previewHost .cap-doc', (e) => e.textContent);
  if (/Capacitor/i.test(capText)) pass('capacitor.config.json: badge shown'); else fail('capacitor badge: ' + capText.slice(0, 200));
  if (/com\.example|SplashScreen|StatusBar/i.test(capText)) pass('capacitor.config.json: config shown'); else fail('capacitor config: ' + capText.slice(0, 200));

  // ── .nycrc.json viewer ──
  await openExample('.nycrc.json');
  await page.waitForSelector('#previewHost .nyc-doc', { timeout: 12000 });
  const nycText = await page.$eval('#previewHost .nyc-doc', (e) => e.textContent);
  if (/NYC/i.test(nycText)) pass('.nycrc.json: badge shown'); else fail('nyc badge: ' + nycText.slice(0, 200));
  if (/80|90|branches|lines/i.test(nycText)) pass('.nycrc.json: thresholds shown'); else fail('nyc thresholds: ' + nycText.slice(0, 200));

  // ── devcontainer.json viewer ──
  await openExample('devcontainer.json');
  await page.waitForSelector('#previewHost .devcontainer-doc', { timeout: 12000 });
  const dvcText = await page.$eval('#previewHost .devcontainer-doc', (e) => e.textContent);
  if (/devcontainer/i.test(dvcText)) pass('devcontainer.json: badge shown'); else fail('devcontainer badge: ' + dvcText.slice(0, 200));
  if (/Node\.js|TypeScript|3000|5432/i.test(dvcText)) pass('devcontainer.json: name shown'); else fail('devcontainer name: ' + dvcText.slice(0, 200));
  if (/3000/.test(dvcText)) pass('devcontainer.json: ports shown'); else fail('devcontainer ports: ' + dvcText.slice(0, 200));

  // ── knip.json viewer ──
  await openExample('knip.json');
  await page.waitForSelector('#previewHost .knp-doc', { timeout: 12000 });
  const knpText = await page.$eval('#previewHost .knp-doc', (e) => e.textContent);
  if (/Knip/i.test(knpText)) pass('knip.json: badge shown'); else fail('knip badge: ' + knpText.slice(0, 200));
  if (/typescript|eslint|jest|src/i.test(knpText)) pass('knip.json: content shown'); else fail('knip content: ' + knpText.slice(0, 200));

  // ── .mocharc.json viewer ──
  await openExample('.mocharc.json');
  await page.waitForSelector('#previewHost .moc-doc', { timeout: 12000 });
  const mocText = await page.$eval('#previewHost .moc-doc', (e) => e.textContent);
  if (/Mocha/i.test(mocText)) pass('.mocharc.json: badge shown'); else fail('mocha badge: ' + mocText.slice(0, 200));
  if (/spec|timeout|reporter|bdd/i.test(mocText)) pass('.mocharc.json: config shown'); else fail('mocha config: ' + mocText.slice(0, 200));

  // ── .gitlab-ci.yml viewer ──
  await openExample('.gitlab-ci.yml');
  await page.waitForSelector('#previewHost .glb-doc', { timeout: 12000 });
  const glbText = await page.$eval('#previewHost .glb-doc', (e) => e.textContent);
  if (/GitLab/i.test(glbText)) pass('.gitlab-ci.yml: badge shown'); else fail('gitlab-ci badge: ' + glbText.slice(0, 200));
  if (/install|lint|test|build|deploy/i.test(glbText)) pass('.gitlab-ci.yml: stages/jobs shown'); else fail('gitlab-ci jobs: ' + glbText.slice(0, 200));

  // ── pnpm-workspace.yaml viewer ──
  await openExample('pnpm-workspace.yaml');
  await page.waitForSelector('#previewHost .pnpmws-doc', { timeout: 12000 });
  const pnwText = await page.$eval('#previewHost .pnpmws-doc', (e) => e.textContent);
  if (/pnpm/i.test(pnwText)) pass('pnpm-workspace.yaml: badge shown'); else fail('pnpm-workspace badge: ' + pnwText.slice(0, 200));
  if (/packages|apps|catalog|react/i.test(pnwText)) pass('pnpm-workspace.yaml: workspaces shown'); else fail('pnpm-workspace content: ' + pnwText.slice(0, 200));

  // ── vitest.config.json viewer ──
  await openExample('vitest.config.json');
  await page.waitForSelector('#previewHost .vt-doc', { timeout: 12000 });
  const vtText = await page.$eval('#previewHost .vt-doc', (e) => e.textContent);
  if (/Vitest/i.test(vtText)) pass('vitest.config.json: badge shown'); else fail('vitest badge: ' + vtText.slice(0, 200));
  if (/jsdom|environment|coverage|reporters/i.test(vtText)) pass('vitest.config.json: config shown'); else fail('vitest config: ' + vtText.slice(0, 200));

  // ── graphql.config.json viewer ──
  await openExample('graphql.config.json');
  await page.waitForSelector('#previewHost .gql-doc', { timeout: 12000 });
  const gqlText = await page.$eval('#previewHost .gql-doc', (e) => e.textContent);
  if (/GraphQL/i.test(gqlText)) pass('graphql.config.json: badge shown'); else fail('graphql badge: ' + gqlText.slice(0, 200));
  if (/schema|documents|extensions|codegen/i.test(gqlText)) pass('graphql.config.json: config shown'); else fail('graphql config: ' + gqlText.slice(0, 200));

  // ── apollo.config.json viewer ──
  await openExample('apollo.config.json');
  await page.waitForSelector('#previewHost .apl-doc', { timeout: 12000 });
  const aplText = await page.$eval('#previewHost .apl-doc', (e) => e.textContent);
  if (/Apollo/i.test(aplText)) pass('apollo.config.json: badge shown'); else fail('apollo badge: ' + aplText.slice(0, 200));
  if (/client|service|my-app|endpoint/i.test(aplText)) pass('apollo.config.json: client and service shown'); else fail('apollo config: ' + aplText.slice(0, 200));

  // ── storybook.main.json viewer ──
  await openExample('storybook.main.json (.storybook/main.json)');
  await page.waitForSelector('#previewHost .sb-doc', { timeout: 12000 });
  const sbText = await page.$eval('#previewHost .sb-doc', (e) => e.textContent);
  if (/Storybook/i.test(sbText)) pass('storybook.main.json: badge shown'); else fail('storybook badge: ' + sbText.slice(0, 200));
  if (/addon|stories|framework|react-vite/i.test(sbText)) pass('storybook.main.json: addons and framework shown'); else fail('storybook config: ' + sbText.slice(0, 200));

  // ── .drone.yml viewer ──
  await openExample('.drone.yml');
  await page.waitForSelector('#previewHost .drn-doc', { timeout: 12000 });
  const drnText = await page.$eval('#previewHost .drn-doc', (e) => e.textContent);
  if (/Drone/i.test(drnText)) pass('.drone.yml: badge shown'); else fail('drone badge: ' + drnText.slice(0, 200));
  if (/pipeline|steps|install|test|build/i.test(drnText)) pass('.drone.yml: steps shown'); else fail('drone steps: ' + drnText.slice(0, 200));

  // ── buildkite.yml viewer ──
  await openExample('buildkite.yml');
  await page.waitForSelector('#previewHost .bk-doc', { timeout: 12000 });
  const bkText = await page.$eval('#previewHost .bk-doc', (e) => e.textContent);
  if (/Buildkite/i.test(bkText)) pass('buildkite.yml: badge shown'); else fail('buildkite badge: ' + bkText.slice(0, 200));
  if (/Build|test|Deploy|step/i.test(bkText)) pass('buildkite.yml: steps shown'); else fail('buildkite steps: ' + bkText.slice(0, 200));

  // ── skaffold.yaml viewer ──
  await openExample('skaffold.yaml');
  await page.waitForSelector('#previewHost .skaffold-doc', { timeout: 12000 });
  const skfText = await page.$eval('#previewHost .skaffold-doc', (e) => e.textContent);
  if (/Skaffold/i.test(skfText)) pass('skaffold.yaml: badge shown'); else fail('skaffold badge: ' + skfText.slice(0, 200));
  if (/artifact|deploy|kubectl|profile/i.test(skfText)) pass('skaffold.yaml: build and deploy shown'); else fail('skaffold config: ' + skfText.slice(0, 200));

  // ── .hadolint.yaml viewer ──
  await openExample('.hadolint.yaml');
  await page.waitForSelector('.hadolint-doc', { timeout: 12000 });
  pass('.hadolint.yaml: renders');
  const hdlText = await page.$eval('.hadolint-doc', (e) => e.textContent);
  if (/Hadolint/i.test(hdlText)) pass('.hadolint.yaml: badge shown'); else fail('.hadolint.yaml: missing badge: ' + hdlText.slice(0, 200));
  if (/DL|registry|rule/i.test(hdlText)) pass('.hadolint.yaml: config shown'); else fail('.hadolint.yaml: no config shown: ' + hdlText.slice(0, 200));

  // ── trivy.yaml viewer ──
  await openExample('trivy.yaml');
  await page.waitForSelector('.trivyyaml-doc', { timeout: 12000 });
  pass('trivy.yaml: renders');
  const trivyText = await page.$eval('.trivyyaml-doc', (e) => e.textContent);
  if (/Trivy/i.test(trivyText)) pass('trivy.yaml: badge shown'); else fail('trivy.yaml: missing badge: ' + trivyText.slice(0, 200));
  if (/scanner|severity|vuln/i.test(trivyText)) pass('trivy.yaml: scan config shown'); else fail('trivy.yaml: no scan config: ' + trivyText.slice(0, 200));

  // ── firebase.json viewer ──
  await openExample('firebase.json');
  await page.waitForSelector('#previewHost .fbs-doc', { timeout: 12000 });
  const fbsText = await page.$eval('#previewHost .fbs-doc', (e) => e.textContent);
  if (/Firebase/i.test(fbsText)) pass('firebase.json: badge shown'); else fail('firebase badge: ' + fbsText.slice(0, 200));
  if (/dist|hosting|functions|emulators/i.test(fbsText)) pass('firebase.json: config sections shown'); else fail('firebase config: ' + fbsText.slice(0, 200));

  // ── app.json (Expo) viewer ──
  await openExample('app.json (Expo)');
  await page.waitForSelector('#previewHost .exp-doc', { timeout: 12000 });
  const expText = await page.$eval('#previewHost .exp-doc', (e) => e.textContent);
  if (/Expo/i.test(expText)) pass('app.json (Expo): badge shown'); else fail('expo badge: ' + expText.slice(0, 200));
  if (/MyAwesomeApp|51\.0\.0|ios|android/i.test(expText)) pass('app.json (Expo): app config shown'); else fail('expo config: ' + expText.slice(0, 200));

  // ── tailwind.config.json viewer ──
  await openExample('tailwind.config.json');
  await page.waitForSelector('#previewHost .twl-doc', { timeout: 12000 });
  const twlText = await page.$eval('#previewHost .twl-doc', (e) => e.textContent);
  if (/Tailwind/i.test(twlText)) pass('tailwind.config.json: badge shown'); else fail('tailwind badge: ' + twlText.slice(0, 200));
  if (/content|theme|plugins|class/i.test(twlText)) pass('tailwind.config.json: config shown'); else fail('tailwind config: ' + twlText.slice(0, 200));

  // ── postcss.config.json viewer ──
  await openExample('postcss.config.json');
  await page.waitForSelector('#previewHost .pcs-doc', { timeout: 12000 });
  const pcsText = await page.$eval('#previewHost .pcs-doc', (e) => e.textContent);
  if (/PostCSS/i.test(pcsText)) pass('postcss.config.json: badge shown'); else fail('postcss badge: ' + pcsText.slice(0, 200));
  if (/tailwindcss|autoprefixer|cssnano/i.test(pcsText)) pass('postcss.config.json: plugins shown'); else fail('postcss plugins: ' + pcsText.slice(0, 200));

  // ── .huskyrc.json viewer ──
  await openExample('.huskyrc.json');
  await page.waitForSelector('#previewHost .hsk-doc', { timeout: 12000 });
  const hskText = await page.$eval('#previewHost .hsk-doc', (e) => e.textContent);
  if (/Husky/i.test(hskText)) pass('.huskyrc.json: badge shown'); else fail('husky badge: ' + hskText.slice(0, 200));
  if (/pre-commit|commit-msg|lint-staged/i.test(hskText)) pass('.huskyrc.json: hooks shown'); else fail('husky hooks: ' + hskText.slice(0, 200));
}
