// Auto-split slice 04/18 of the known-files smoke area (see ./../known-files.mjs).
// Covers: moon.yml … example.cabal.
// Called in order on the shared ctx — keep openExample order intact; no cross-file state.
export async function run(ctx) {
  const { page, origin, frameOf, pass, fail, openExample } = ctx;

  // ── moon.yml viewer ──
  await openExample('moon.yml');
  await page.waitForSelector('#previewHost .moonyml-doc', { timeout: 12000 });
  pass('moon.yml: renders');
  const moonText = await page.$eval('#previewHost .moonyml-doc', (e) => e.textContent);
  if (!moonText.includes('Moon')) fail('moon.yml: missing badge'); else pass('moon.yml: badge shown');
  if (!moonText.includes('task') && !moonText.includes('build')) fail('moon.yml: no tasks shown'); else pass('moon.yml: tasks shown');

  // ── crowdin.yml viewer ──
  await openExample('crowdin.yml (Crowdin config)');
  await page.waitForSelector('#previewHost .cwd-doc', { timeout: 12000 });
  const cwdText = await page.$eval('#previewHost .cwd-doc', (e) => e.textContent);
  if (/Crowdin/i.test(cwdText)) pass('crowdin.yml: badge shown'); else fail('crowdin badge: ' + cwdText.slice(0, 200));
  if (/source|translation|mapping/i.test(cwdText)) pass('crowdin.yml: file mappings shown'); else fail('crowdin content: ' + cwdText.slice(0, 200));

  // ── Matchfile viewer ──
  await openExample('Matchfile (Fastlane Match)');
  await page.waitForSelector('#previewHost .mf-doc', { timeout: 12000 });
  const mfText = await page.$eval('#previewHost .mf-doc', (e) => e.textContent);
  if (/Match/i.test(mfText)) pass('Matchfile: badge shown'); else fail('matchfile badge: ' + mfText.slice(0, 200));
  if (/git|storage|com\.example|development/i.test(mfText)) pass('Matchfile: certificate config shown'); else fail('matchfile content: ' + mfText.slice(0, 200));

  // ── Appfile viewer ──
  await openExample('Appfile');
  await page.waitForSelector('#previewHost .af-doc', { timeout: 12000 });
  const afText = await page.$eval('#previewHost .af-doc', (e) => e.textContent);
  if (/Fastlane|Appfile/i.test(afText)) pass('Appfile: badge shown'); else fail('appfile badge: ' + afText.slice(0, 200));
  if (/com\.example|apple_id|team/i.test(afText)) pass('Appfile: app config shown'); else fail('appfile content: ' + afText.slice(0, 200));

  // ── .ruby-version viewer ──
  await openExample('.ruby-version');
  await page.waitForSelector('#previewHost .rv-doc', { timeout: 12000 });
  const rvText = await page.$eval('#previewHost .rv-doc', (e) => e.textContent);
  if (/Ruby/i.test(rvText)) pass('.ruby-version: badge shown'); else fail('ruby-version badge: ' + rvText.slice(0, 200));
  if (/rbenv|rvm|asdf/i.test(rvText)) pass('.ruby-version: install commands shown'); else fail('ruby-version content: ' + rvText.slice(0, 200));

  // ── .python-version viewer ──
  await openExample('.python-version');
  await page.waitForSelector('#previewHost .pv-doc', { timeout: 12000 });
  const pvText = await page.$eval('#previewHost .pv-doc', (e) => e.textContent);
  if (/Python/i.test(pvText)) pass('.python-version: badge shown'); else fail('python-version badge: ' + pvText.slice(0, 200));
  if (/pyenv|asdf|3\.\d/i.test(pvText)) pass('.python-version: version and install commands shown'); else fail('python-version content: ' + pvText.slice(0, 200));

  // ── Supabase config viewer ──
  await openExample('supabase/config.toml');
  await page.waitForSelector('#previewHost .sbc-doc', { timeout: 12000 });
  const sbcText = await page.$eval('#previewHost .sbc-doc', (e) => e.textContent);
  if (/Supabase/i.test(sbcText)) pass('supabase config.toml: badge shown'); else fail('supabase badge: ' + sbcText.slice(0, 200));
  if (/my-supabase-project|54321|54322/i.test(sbcText)) pass('supabase config.toml: settings shown'); else fail('supabase content: ' + sbcText.slice(0, 200));

  // ── Netlify _redirects viewer ──
  await openExample('_redirects');
  await page.waitForSelector('#previewHost .rdx-doc', { timeout: 12000 });
  const rdxText = await page.$eval('#previewHost .rdx-doc', (e) => e.textContent);
  if (/Netlify/i.test(rdxText)) pass('_redirects: badge shown'); else fail('redirects badge: ' + rdxText.slice(0, 200));
  if (/301|\/old-blog|\/api/i.test(rdxText)) pass('_redirects: rules shown'); else fail('redirects content: ' + rdxText.slice(0, 200));

  // ── CMakeLists.txt viewer ──
  await openExample('CMakeLists.txt');
  await page.waitForSelector('#previewHost .cmake-doc', { timeout: 12000 });
  const cmakeText = await page.$eval('#previewHost .cmake-doc', (e) => e.textContent);
  if (/CMake/i.test(cmakeText)) pass('CMakeLists.txt: badge shown'); else fail('cmake badge: ' + cmakeText.slice(0, 200));
  if (/myapp|mylib|OpenSSL|MyApp/i.test(cmakeText)) pass('CMakeLists.txt: targets or deps shown'); else fail('cmake targets: ' + cmakeText.slice(0, 200));

  // ── Jenkinsfile viewer ──
  await openExample('Jenkinsfile');
  await page.waitForSelector('#previewHost .jenkinsfile-doc', { timeout: 12000 });
  pass('Jenkinsfile: renders');
  const jkfText = await page.$eval('#previewHost .jenkinsfile-doc', (e) => e.textContent);
  if (/Jenkins/i.test(jkfText)) pass('Jenkinsfile: badge shown'); else fail('jenkins badge: ' + jkfText.slice(0, 200));
  if (/stage|Stage/i.test(jkfText)) pass('Jenkinsfile: stages shown'); else fail('jenkins stages: ' + jkfText.slice(0, 200));

  // ── Vagrantfile viewer ──
  await openExample('Vagrantfile');
  await page.waitForSelector('#previewHost .vagrantfile-doc', { timeout: 12000 });
  const vgfText = await page.$eval('#previewHost .vagrantfile-doc', (e) => e.textContent);
  if (/Vagrant/i.test(vgfText)) pass('Vagrantfile: badge shown'); else fail('vagrantfile badge: ' + vgfText.slice(0, 200));
  if (/ubuntu\/jammy64/i.test(vgfText)) pass('Vagrantfile: box shown'); else fail('vagrantfile box: ' + vgfText.slice(0, 200));

  // ── BUILD.bazel viewer ──
  await openExample('BUILD.bazel');
  await page.waitForSelector('#previewHost .bzl-doc', { timeout: 12000 });
  const bzlText = await page.$eval('#previewHost .bzl-doc', (e) => e.textContent);
  if (/Bazel/i.test(bzlText)) pass('BUILD.bazel: Bazel badge shown'); else fail('bazel badge: ' + bzlText.slice(0, 200));
  if (/server|lib|py_binary|py_library|py_test/i.test(bzlText)) pass('BUILD.bazel: targets shown'); else fail('bazel targets: ' + bzlText.slice(0, 200));

  // ── .bazelrc viewer ──
  await openExample('.bazelrc');
  await page.waitForSelector('#previewHost .brc-doc', { timeout: 12000 });
  const brcText = await page.$eval('#previewHost .brc-doc', (e) => e.textContent);
  if (/Bazel/i.test(brcText)) pass('.bazelrc: Bazel badge shown'); else fail('bazelrc badge: ' + brcText.slice(0, 200));
  if (/build|test|common|remote/i.test(brcText)) pass('.bazelrc: option groups shown'); else fail('bazelrc groups: ' + brcText.slice(0, 200));

  // ── build.ninja viewer ──
  await openExample('build.ninja');
  await page.waitForSelector('#previewHost .nj-doc', { timeout: 12000 });
  const njText = await page.$eval('#previewHost .nj-doc', (e) => e.textContent);
  if (/Ninja/i.test(njText)) pass('build.ninja: Ninja badge shown'); else fail('ninja badge: ' + njText.slice(0, 200));
  if (/cc_compile|cc_link|myapp|build\./i.test(njText)) pass('build.ninja: rules or targets shown'); else fail('ninja targets: ' + njText.slice(0, 200));

  // ── .gitconfig viewer ──
  await openExample('.gitconfig');
  await page.waitForSelector('#previewHost .gcf-doc', { timeout: 12000 });
  const gcfText = await page.$eval('#previewHost .gcf-doc', (e) => e.textContent);
  if (/Git/i.test(gcfText)) pass('.gitconfig: Git badge shown'); else fail('gitconfig badge: ' + gcfText.slice(0, 200));
  if (/user|remote|alias|core/i.test(gcfText)) pass('.gitconfig: sections shown'); else fail('gitconfig sections: ' + gcfText.slice(0, 200));
  if (/jane@example\.com|Jane Developer/i.test(gcfText)) pass('.gitconfig: user identity shown'); else fail('gitconfig user: ' + gcfText.slice(0, 200));

  // ── playwright.config.ts viewer ──
  await openExample('playwright.config.ts');
  await page.waitForSelector('#previewHost .pw-doc', { timeout: 12000 });
  const pwText = await page.$eval('#previewHost .pw-doc', (e) => e.textContent);
  if (/Playwright/i.test(pwText)) pass('playwright.config.ts: Playwright badge shown'); else fail('playwright badge: ' + pwText.slice(0, 200));
  if (/chromium|firefox|webkit/i.test(pwText)) pass('playwright.config.ts: browsers shown'); else fail('playwright browsers: ' + pwText.slice(0, 200));
  if (/baseURL|localhost/i.test(pwText)) pass('playwright.config.ts: base URL shown'); else fail('playwright baseURL: ' + pwText.slice(0, 200));
  if (/web server/i.test(pwText)) pass('playwright.config.ts: web server indicator shown'); else fail('playwright webserver: ' + pwText.slice(0, 200));

  // ── cypress.config.js viewer ──
  await openExample('cypress.config.js');
  await page.waitForSelector('#previewHost .cy-doc', { timeout: 12000 });
  const cyText = await page.$eval('#previewHost .cy-doc', (e) => e.textContent);
  if (/Cypress/i.test(cyText)) pass('cypress.config.js: Cypress badge shown'); else fail('cypress badge: ' + cyText.slice(0, 200));
  if (/localhost:4000/i.test(cyText)) pass('cypress.config.js: base URL shown'); else fail('cypress baseURL: ' + cyText.slice(0, 200));
  if (/component/i.test(cyText)) pass('cypress.config.js: component testing section shown'); else fail('cypress component: ' + cyText.slice(0, 200));
  if (/env var/i.test(cyText)) pass('cypress.config.js: env var count shown'); else fail('cypress env: ' + cyText.slice(0, 200));

  // ── wdio.conf.js viewer ──
  await openExample('wdio.conf.js');
  await page.waitForSelector('#previewHost .wdio-doc', { timeout: 12000 });
  const wdioText = await page.$eval('#previewHost .wdio-doc', (e) => e.textContent);
  if (/WebdriverIO/i.test(wdioText)) pass('wdio.conf.js: WebdriverIO badge shown'); else fail('wdio badge: ' + wdioText.slice(0, 200));
  if (/chrome|firefox/i.test(wdioText)) pass('wdio.conf.js: browsers shown'); else fail('wdio browsers: ' + wdioText.slice(0, 200));
  if (/localhost:3000/i.test(wdioText)) pass('wdio.conf.js: base URL shown'); else fail('wdio baseURL: ' + wdioText.slice(0, 200));
  if (/mocha/i.test(wdioText)) pass('wdio.conf.js: framework shown'); else fail('wdio framework: ' + wdioText.slice(0, 200));

  // ── k6.config.js viewer ──
  await openExample('k6.config.js');
  await page.waitForSelector('#previewHost .k6-doc', { timeout: 12000 });
  const k6Text = await page.$eval('#previewHost .k6-doc', (e) => e.textContent);
  if (/k6/i.test(k6Text)) pass('k6.config.js: k6 badge shown'); else fail('k6 badge: ' + k6Text.slice(0, 200));
  if (/vus|virtual user/i.test(k6Text)) pass('k6.config.js: VU count shown'); else fail('k6 vus: ' + k6Text.slice(0, 200));
  if (/stage|duration/i.test(k6Text)) pass('k6.config.js: stages shown'); else fail('k6 stages: ' + k6Text.slice(0, 200));
  if (/threshold|http_req/i.test(k6Text)) pass('k6.config.js: thresholds shown'); else fail('k6 thresholds: ' + k6Text.slice(0, 200));

  // ── .goreleaser.yaml viewer ──
  await openExample('.goreleaser.yaml');
  await page.waitForSelector('#previewHost .grl-doc', { timeout: 12000 });
  const grlText = await page.$eval('#previewHost .grl-doc', (e) => e.textContent);
  if (/GoReleaser/i.test(grlText)) pass('.goreleaser.yaml: GoReleaser badge shown'); else fail('goreleaser badge: ' + grlText.slice(0, 200));
  if (/myapp/i.test(grlText)) pass('.goreleaser.yaml: project name shown'); else fail('goreleaser project: ' + grlText.slice(0, 200));
  if (/linux|darwin|windows/i.test(grlText)) pass('.goreleaser.yaml: build targets shown'); else fail('goreleaser builds: ' + grlText.slice(0, 200));
  if (/tar\.gz|zip/i.test(grlText)) pass('.goreleaser.yaml: archive formats shown'); else fail('goreleaser archives: ' + grlText.slice(0, 200));

  // ── .golangci.yml viewer ──
  await openExample('.golangci.yml');
  await page.waitForSelector('#previewHost .golangci-doc', { timeout: 12000 });
  const gclText = await page.$eval('#previewHost .golangci-doc', (e) => e.textContent);
  if (/golangci-lint/i.test(gclText)) pass('.golangci.yml: badge shown'); else fail('golangci badge: ' + gclText.slice(0, 200));
  if (/errcheck/i.test(gclText)) pass('.golangci.yml: linters shown'); else fail('golangci linters: ' + gclText.slice(0, 200));
  if (/5m/i.test(gclText)) pass('.golangci.yml: timeout shown'); else fail('golangci timeout: ' + gclText.slice(0, 200));

  // ── buf.yaml viewer ──
  await openExample('buf.yaml');
  await page.waitForSelector('#previewHost .buf-doc', { timeout: 12000 });
  const bufText = await page.$eval('#previewHost .buf-doc', (e) => e.textContent);
  if (/Buf/i.test(bufText)) pass('buf.yaml: Buf badge shown'); else fail('buf badge: ' + bufText.slice(0, 200));
  if (/v2/i.test(bufText)) pass('buf.yaml: version shown'); else fail('buf version: ' + bufText.slice(0, 200));
  if (/googleapis|grpc-gateway/i.test(bufText)) pass('buf.yaml: dependencies shown'); else fail('buf deps: ' + bufText.slice(0, 200));

  // ── .mockery.yaml viewer ──
  await openExample('.mockery.yaml (mockery)');
  await page.waitForSelector('#previewHost .mky-doc', { timeout: 12000 });
  const mkyText = await page.$eval('#previewHost .mky-doc', (e) => e.textContent);
  if (/mockery/i.test(mkyText)) pass('.mockery.yaml: mockery badge shown'); else fail('mockery badge: ' + mkyText.slice(0, 200));
  if (/service|repository|notifier/i.test(mkyText)) pass('.mockery.yaml: packages shown'); else fail('mockery packages: ' + mkyText.slice(0, 200));
  if (/UserService|AuthService|PaymentService/i.test(mkyText)) pass('.mockery.yaml: interfaces shown'); else fail('mockery interfaces: ' + mkyText.slice(0, 300));
  if (/with-expecter|expecter/i.test(mkyText)) pass('.mockery.yaml: with-expecter setting shown'); else fail('mockery expecter: ' + mkyText.slice(0, 300));

  // ── .ko.yaml viewer ──
  await openExample('.ko.yaml (ko container build)');
  await page.waitForSelector('#previewHost .ko-doc', { timeout: 12000 });
  const koText = await page.$eval('#previewHost .ko-doc', (e) => e.textContent);
  if (/\bko\b/i.test(koText)) pass('.ko.yaml: ko badge shown'); else fail('ko badge: ' + koText.slice(0, 200));
  if (/distroless/i.test(koText)) pass('.ko.yaml: base image shown'); else fail('ko base image: ' + koText.slice(0, 200));
  if (/linux\/amd64|linux\/arm64/i.test(koText)) pass('.ko.yaml: platforms shown'); else fail('ko platforms: ' + koText.slice(0, 200));
  if (/spdx|sbom/i.test(koText)) pass('.ko.yaml: SBOM setting shown'); else fail('ko sbom: ' + koText.slice(0, 300));

  // ── sqlc.yaml viewer ──
  await openExample('sqlc.yaml (sqlc)');
  await page.waitForSelector('#previewHost .sqlc-doc', { timeout: 12000 });
  const sqlcText = await page.$eval('#previewHost .sqlc-doc', (e) => e.textContent);
  if (/sqlc/i.test(sqlcText)) pass('sqlc.yaml: sqlc badge shown'); else fail('sqlc badge: ' + sqlcText.slice(0, 200));
  if (/postgresql/i.test(sqlcText)) pass('sqlc.yaml: SQL engine shown'); else fail('sqlc engine: ' + sqlcText.slice(0, 200));
  if (/queries|schema/i.test(sqlcText)) pass('sqlc.yaml: queries/schema paths shown'); else fail('sqlc paths: ' + sqlcText.slice(0, 300));
  if (/internal\/db|analytics/i.test(sqlcText)) pass('sqlc.yaml: output dirs shown'); else fail('sqlc output: ' + sqlcText.slice(0, 300));

  // ── nfpm.yaml viewer ──
  await openExample('nfpm.yaml (nfpm)');
  await page.waitForSelector('#previewHost .nfpm-doc', { timeout: 12000 });
  const nfpmText = await page.$eval('#previewHost .nfpm-doc', (e) => e.textContent);
  if (/nfpm/i.test(nfpmText)) pass('nfpm.yaml: nfpm badge shown'); else fail('nfpm badge: ' + nfpmText.slice(0, 200));
  if (/myapp/i.test(nfpmText)) pass('nfpm.yaml: package name shown'); else fail('nfpm name: ' + nfpmText.slice(0, 200));
  if (/deb|rpm|apk/i.test(nfpmText)) pass('nfpm.yaml: package formats shown'); else fail('nfpm formats: ' + nfpmText.slice(0, 300));
  if (/preinstall|postinstall/i.test(nfpmText)) pass('nfpm.yaml: install scripts shown'); else fail('nfpm scripts: ' + nfpmText.slice(0, 300));

  // ── heroku.yml viewer ──
  await openExample('heroku.yml');
  await page.waitForSelector('#previewHost .hku-doc', { timeout: 12000 });
  const hkuText = await page.$eval('#previewHost .hku-doc', (e) => e.textContent);
  if (/Heroku/i.test(hkuText)) pass('heroku.yml: Heroku badge shown'); else fail('heroku badge: ' + hkuText.slice(0, 200));
  if (/Dockerfile/i.test(hkuText)) pass('heroku.yml: Docker build shown'); else fail('heroku docker: ' + hkuText.slice(0, 200));
  if (/web|worker|scheduler/i.test(hkuText)) pass('heroku.yml: process types shown'); else fail('heroku processes: ' + hkuText.slice(0, 200));

  // ── .readthedocs.yaml viewer ──
  await openExample('.readthedocs.yaml');
  await page.waitForSelector('#previewHost .rtd-doc', { timeout: 12000 });
  const rtdText = await page.$eval('#previewHost .rtd-doc', (e) => e.textContent);
  if (/ReadTheDocs/i.test(rtdText)) pass('.readthedocs.yaml: ReadTheDocs badge shown'); else fail('readthedocs badge: ' + rtdText.slice(0, 200));
  if (/ubuntu|3\.11|Node/i.test(rtdText)) pass('.readthedocs.yaml: build environment shown'); else fail('readthedocs build env: ' + rtdText.slice(0, 200));
  if (/Sphinx|MkDocs|pdf|epub/i.test(rtdText)) pass('.readthedocs.yaml: doc tool or formats shown'); else fail('readthedocs formats: ' + rtdText.slice(0, 200));

  // ── CITATION.cff viewer ──
  await openExample('CITATION.cff');
  await page.waitForSelector('#previewHost .cff-doc', { timeout: 12000 });
  const cffText = await page.$eval('#previewHost .cff-doc', (e) => e.textContent);
  if (/Citation/i.test(cffText)) pass('CITATION.cff: Citation badge shown'); else fail('citation badge: ' + cffText.slice(0, 200));
  if (/MyResearchTool/i.test(cffText)) pass('CITATION.cff: title shown'); else fail('citation title: ' + cffText.slice(0, 200));
  if (/Smith/i.test(cffText)) pass('CITATION.cff: authors shown'); else fail('citation authors: ' + cffText.slice(0, 200));
  if (/10\.5281/i.test(cffText)) pass('CITATION.cff: DOI shown'); else fail('citation DOI: ' + cffText.slice(0, 200));

  // ── .yamllint.yml viewer ──
  await openExample('.yamllint.yml');
  await page.waitForSelector('#previewHost .yamllint-doc', { timeout: 12000 });
  const ymlText = await page.$eval('#previewHost .yamllint-doc', (e) => e.textContent);
  if (/yamllint/i.test(ymlText)) pass('.yamllint.yml: yamllint badge shown'); else fail('yamllint badge: ' + ymlText.slice(0, 200));
  if (/default/i.test(ymlText)) pass('.yamllint.yml: extends shown'); else fail('yamllint extends: ' + ymlText.slice(0, 200));
  if (/120|line-length|indentation/i.test(ymlText)) pass('.yamllint.yml: key rules shown'); else fail('yamllint rules: ' + ymlText.slice(0, 200));

  // ── .coderabbit.yaml viewer ──
  await openExample('.coderabbit.yaml');
  await page.waitForSelector('#previewHost .crb-doc', { timeout: 12000 });
  const crbText = await page.$eval('#previewHost .crb-doc', (e) => e.textContent);
  if (/CodeRabbit/i.test(crbText)) pass('.coderabbit.yaml: CodeRabbit badge shown'); else fail('coderabbit badge: ' + crbText.slice(0, 200));
  if (/enabled|auto-review/i.test(crbText)) pass('.coderabbit.yaml: auto-review status shown'); else fail('coderabbit auto-review: ' + crbText.slice(0, 200));
  if (/ruff|eslint|path/i.test(crbText)) pass('.coderabbit.yaml: tools or filters shown'); else fail('coderabbit tools: ' + crbText.slice(0, 200));

  // ── vcpkg.json viewer ──
  await openExample('vcpkg.json');
  await page.waitForSelector('#previewHost .vcpkg-doc', { timeout: 12000 });
  const vcpkgText = await page.$eval('#previewHost .vcpkg-doc', (e) => e.textContent);
  if (/vcpkg/i.test(vcpkgText)) pass('vcpkg.json: vcpkg badge shown'); else fail('vcpkg badge: ' + vcpkgText.slice(0, 200));
  if (/my-cpp-app/i.test(vcpkgText)) pass('vcpkg.json: package name shown'); else fail('vcpkg name: ' + vcpkgText.slice(0, 200));
  if (/fmt|nlohmann-json|boost-filesystem/i.test(vcpkgText)) pass('vcpkg.json: dependencies listed'); else fail('vcpkg deps: ' + vcpkgText.slice(0, 300));
  if (/networking|testing/i.test(vcpkgText)) pass('vcpkg.json: features shown'); else fail('vcpkg features: ' + vcpkgText.slice(0, 300));

  // ── CMakePresets.json viewer ──
  await openExample('CMakePresets.json');
  await page.waitForSelector('#previewHost .cmp-doc', { timeout: 12000 });
  const cmpText = await page.$eval('#previewHost .cmp-doc', (e) => e.textContent);
  if (/CMake Presets/i.test(cmpText)) pass('CMakePresets.json: CMake Presets badge shown'); else fail('cmake-presets badge: ' + cmpText.slice(0, 200));
  if (/3\.25|3\.25\.0/i.test(cmpText)) pass('CMakePresets.json: minimum CMake version shown'); else fail('cmake-presets version: ' + cmpText.slice(0, 200));
  if (/debug|release|ci/i.test(cmpText)) pass('CMakePresets.json: configure presets listed'); else fail('cmake-presets configure: ' + cmpText.slice(0, 300));
  if (/configure|build|test|workflow/i.test(cmpText)) pass('CMakePresets.json: summary tags shown'); else fail('cmake-presets tags: ' + cmpText.slice(0, 200));

  // ── conanfile.txt viewer ──
  await openExample('conanfile.txt');
  await page.waitForSelector('#previewHost .conanfile-doc', { timeout: 12000 });
  const conanText = await page.$eval('#previewHost .conanfile-doc', (e) => e.textContent);
  if (/Conan/i.test(conanText)) pass('conanfile.txt: Conan badge shown'); else fail('conan badge: ' + conanText.slice(0, 200));
  if (/boost|fmt|nlohmann_json/i.test(conanText)) pass('conanfile.txt: requires listed'); else fail('conan requires: ' + conanText.slice(0, 300));
  if (/CMakeDeps|CMakeToolchain/i.test(conanText)) pass('conanfile.txt: generators shown'); else fail('conan generators: ' + conanText.slice(0, 200));

  // ── prometheus.yml viewer ──
  await openExample('prometheus.yml');
  await page.waitForSelector('#previewHost .prom-doc', { timeout: 12000 });
  const promText = await page.$eval('#previewHost .prom-doc', (e) => e.textContent);
  if (/Prometheus/i.test(promText)) pass('prometheus.yml: Prometheus badge shown'); else fail('prometheus badge: ' + promText.slice(0, 200));
  if (/node_exporter|node-exporter|prometheus/i.test(promText)) pass('prometheus.yml: scrape jobs shown'); else fail('prometheus scrape jobs: ' + promText.slice(0, 200));
  if (/15s/i.test(promText)) pass('prometheus.yml: scrape_interval shown'); else fail('prometheus interval: ' + promText.slice(0, 200));
  if (/alertmanager/i.test(promText)) pass('prometheus.yml: alertmanager target shown'); else fail('prometheus alertmanager: ' + promText.slice(0, 200));
  if (promText.includes('secret123')) fail('prometheus.yml: password leaked'); else pass('prometheus.yml: password masked');

  // ── traefik.yml viewer ──
  await openExample('traefik.yml');
  await page.waitForSelector('#previewHost .traefik-doc', { timeout: 12000 });
  pass('traefik.yml: badge shown');
  const trText = await page.$eval('#previewHost .traefik-doc', el => el.textContent);
  if (!trText.includes('websecure') && !trText.includes('443')) fail('traefik.yml: entry points not shown');
  else pass('traefik.yml: entry points shown');
  if (!trText.includes('docker')) fail('traefik.yml: providers not shown');
  else pass('traefik.yml: providers shown');

  // ── alertmanager.yml viewer ──
  await openExample('alertmanager.yml');
  await page.waitForSelector('#previewHost .alertmgr-doc', { timeout: 12000 });
  const amText = await page.$eval('#previewHost .alertmgr-doc', (e) => e.textContent);
  if (/Alertmanager/i.test(amText)) pass('alertmanager.yml: Alertmanager badge shown'); else fail('alertmanager badge: ' + amText.slice(0, 200));
  if (/pagerduty|slack/i.test(amText)) pass('alertmanager.yml: receivers shown'); else fail('alertmanager receivers: ' + amText.slice(0, 200));
  if (/Slack|PagerDuty/i.test(amText)) pass('alertmanager.yml: receiver types shown'); else fail('alertmanager types: ' + amText.slice(0, 200));
  if (/group_wait|30s/i.test(amText)) pass('alertmanager.yml: route settings shown'); else fail('alertmanager route: ' + amText.slice(0, 200));
  if (amText.includes('secret-password') || amText.includes('secret-pagerduty-key')) fail('alertmanager.yml: secrets leaked'); else pass('alertmanager.yml: secrets masked');

  // ── datadog.yaml viewer ──
  await openExample('datadog.yaml');
  await page.waitForSelector('#previewHost .dd-doc', { timeout: 12000 });
  const ddText = await page.$eval('#previewHost .dd-doc', (e) => e.textContent);
  if (/Datadog/i.test(ddText)) pass('datadog.yaml: Datadog badge shown'); else fail('datadog badge: ' + ddText.slice(0, 200));
  if (/datadoghq\.com/i.test(ddText)) pass('datadog.yaml: site shown'); else fail('datadog site: ' + ddText.slice(0, 200));
  if (/env:production|service:myapp/i.test(ddText)) pass('datadog.yaml: tags shown'); else fail('datadog tags: ' + ddText.slice(0, 200));
  if (/Log collection|APM/i.test(ddText)) pass('datadog.yaml: feature flags shown'); else fail('datadog features: ' + ddText.slice(0, 200));

  // ── ionic.config.json viewer ──
  await openExample('ionic.config.json');
  await page.waitForSelector('#previewHost .ion-doc', { timeout: 12000 });
  const ionicText = await page.$eval('#previewHost .ion-doc', (e) => e.textContent);
  if (/Ionic/i.test(ionicText)) pass('ionic.config.json: Ionic badge shown'); else fail('ionic badge: ' + ionicText.slice(0, 200));
  if (/my-ionic-app/i.test(ionicText)) pass('ionic.config.json: app name shown'); else fail('ionic app name: ' + ionicText.slice(0, 200));
  if (/com\.example\.myionicapp/i.test(ionicText)) pass('ionic.config.json: app ID shown'); else fail('ionic app ID: ' + ionicText.slice(0, 200));
  if (/capacitor|cordova/i.test(ionicText)) pass('ionic.config.json: integrations shown'); else fail('ionic integrations: ' + ionicText.slice(0, 300));
  if (/ionic.?react/i.test(ionicText)) pass('ionic.config.json: project type shown'); else fail('ionic type: ' + ionicText.slice(0, 200));

  // ── metro.config.js viewer ──
  await openExample('metro.config.js');
  await page.waitForSelector('#previewHost .metro-doc', { timeout: 12000 });
  const metroText = await page.$eval('#previewHost .metro-doc', (e) => e.textContent);
  if (/Metro/i.test(metroText)) pass('metro.config.js: Metro badge shown'); else fail('metro badge: ' + metroText.slice(0, 200));
  if (/8081/i.test(metroText)) pass('metro.config.js: server port shown'); else fail('metro port: ' + metroText.slice(0, 200));
  if (/SVG/i.test(metroText)) pass('metro.config.js: SVG support shown'); else fail('metro SVG: ' + metroText.slice(0, 200));
  if (/svg|ts|tsx/i.test(metroText)) pass('metro.config.js: source extensions shown'); else fail('metro extensions: ' + metroText.slice(0, 300));

  // ── react-native.config.js viewer ──
  await openExample('react-native.config.js');
  await page.waitForSelector('#previewHost .rnc-doc', { timeout: 12000 });
  const rncText = await page.$eval('#previewHost .rnc-doc', (e) => e.textContent);
  if (/React Native CLI/i.test(rncText)) pass('react-native.config.js: React Native CLI badge shown'); else fail('rnc badge: ' + rncText.slice(0, 200));
  if (/react-native-vector-icons|react-native-camera|react-native-maps/i.test(rncText)) pass('react-native.config.js: dependencies shown'); else fail('rnc deps: ' + rncText.slice(0, 300));
  if (/ios|android/i.test(rncText)) pass('react-native.config.js: platforms shown'); else fail('rnc platforms: ' + rncText.slice(0, 200));
  if (/fonts|images|assets/i.test(rncText)) pass('react-native.config.js: assets shown'); else fail('rnc assets: ' + rncText.slice(0, 200));

  // ── stack.yaml viewer ──
  await openExample('stack.yaml');
  await page.waitForSelector('#previewHost .stk-doc', { timeout: 12000 });
  const stkText = await page.$eval('#previewHost .stk-doc', (e) => e.textContent);
  if (/Haskell Stack/i.test(stkText)) pass('stack.yaml: Haskell Stack badge shown'); else fail('stack badge: ' + stkText.slice(0, 200));
  if (/lts-21\.25/i.test(stkText)) pass('stack.yaml: resolver shown'); else fail('stack resolver: ' + stkText.slice(0, 200));
  if (/my-lib|my-app/i.test(stkText)) pass('stack.yaml: local packages shown'); else fail('stack packages: ' + stkText.slice(0, 300));
  if (/amazonka|async-pool/i.test(stkText)) pass('stack.yaml: extra deps shown'); else fail('stack extra-deps: ' + stkText.slice(0, 300));

  // ── example.cabal viewer ──
  await openExample('example.cabal');
  await page.waitForSelector('#previewHost .cabal-doc', { timeout: 12000 });
  const cabalText = await page.$eval('#previewHost .cabal-doc', (e) => e.textContent);
  if (/Cabal/i.test(cabalText)) pass('example.cabal: Cabal badge shown'); else fail('cabal badge: ' + cabalText.slice(0, 200));
  if (/my-haskell-app/i.test(cabalText)) pass('example.cabal: package name shown'); else fail('cabal name: ' + cabalText.slice(0, 200));
  if (/0\.1\.0\.0/i.test(cabalText)) pass('example.cabal: version shown'); else fail('cabal version: ' + cabalText.slice(0, 200));
  if (/executable|library|test-suite|benchmark/i.test(cabalText)) pass('example.cabal: components shown'); else fail('cabal components: ' + cabalText.slice(0, 300));
  if (/aeson|mtl|containers/i.test(cabalText)) pass('example.cabal: build dependencies shown'); else fail('cabal deps: ' + cabalText.slice(0, 300));
}
