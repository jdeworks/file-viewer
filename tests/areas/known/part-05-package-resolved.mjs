// Auto-split slice 05/18 of the known-files smoke area (see ./../known-files.mjs).
// Covers: Package.resolved … .flake8.
// Called in order on the shared ctx — keep openExample order intact; no cross-file state.
export async function run(ctx) {
  const { page, origin, frameOf, pass, fail, openExample } = ctx;

  // ── Package.resolved viewer ──
  await openExample('Package.resolved');
  await page.waitForSelector('#previewHost .pkgr-doc', { timeout: 12000 });
  const pkgrText = await page.$eval('#previewHost .pkgr-doc', (e) => e.textContent);
  if (/Swift/i.test(pkgrText)) pass('Package.resolved: Swift badge shown'); else fail('package-resolved badge: ' + pkgrText.slice(0, 200));
  if (/alamofire|kingfisher/i.test(pkgrText)) pass('Package.resolved: pinned packages shown'); else fail('package-resolved pins: ' + pkgrText.slice(0, 300));
  if (/5\.8\.1|1\.3\.0/i.test(pkgrText)) pass('Package.resolved: package versions shown'); else fail('package-resolved versions: ' + pkgrText.slice(0, 300));

  // ── rebar.config viewer ──
  await openExample('rebar.config');
  await page.waitForSelector('#previewHost .rebar-doc', { timeout: 12000 });
  const rebarText = await page.$eval('#previewHost .rebar-doc', (e) => e.textContent);
  if (/Erlang\/rebar3/i.test(rebarText)) pass('rebar.config: Erlang/rebar3 badge shown'); else fail('rebar badge: ' + rebarText.slice(0, 200));
  if (/cowboy|eredis|poolboy/i.test(rebarText)) pass('rebar.config: dependencies shown'); else fail('rebar deps: ' + rebarText.slice(0, 300));
  if (/25\.0/i.test(rebarText)) pass('rebar.config: minimum OTP version shown'); else fail('rebar otp version: ' + rebarText.slice(0, 200));
  if (/prod|test|dev/i.test(rebarText)) pass('rebar.config: profiles shown'); else fail('rebar profiles: ' + rebarText.slice(0, 300));
  if (/dialyzer/i.test(rebarText)) pass('rebar.config: dialyzer shown'); else fail('rebar dialyzer: ' + rebarText.slice(0, 200));

  // ── project.clj (Leiningen) viewer ──
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
  await openExample('deps.edn');
  await page.waitForSelector('#previewHost .deps-doc', { timeout: 12000 });
  const depsText = await page.$eval('#previewHost .deps-doc', (e) => e.textContent);
  if (/Clojure CLI/i.test(depsText)) pass('deps.edn: Clojure CLI badge shown'); else fail('deps badge: ' + depsText.slice(0, 200));
  if (/reitit|ring|next\.jdbc/i.test(depsText)) pass('deps.edn: dependencies listed'); else fail('deps deps: ' + depsText.slice(0, 300));
  if (/src|resources/i.test(depsText)) pass('deps.edn: source paths shown'); else fail('deps paths: ' + depsText.slice(0, 200));
  if (/dev|test|build|lint/i.test(depsText)) pass('deps.edn: aliases shown'); else fail('deps aliases: ' + depsText.slice(0, 300));

  // ── shadow-cljs.edn viewer ──
  await openExample('shadow-cljs.edn');
  await page.waitForSelector('#previewHost .sc-doc', { timeout: 12000 });
  const scText = await page.$eval('#previewHost .sc-doc', (e) => e.textContent);
  if (/Shadow-cljs/i.test(scText)) pass('shadow-cljs.edn: Shadow-cljs badge shown'); else fail('shadow-cljs badge: ' + scText.slice(0, 200));
  if (/reagent|re-frame|shadow-cljs/i.test(scText)) pass('shadow-cljs.edn: dependencies listed'); else fail('shadow-cljs deps: ' + scText.slice(0, 300));
  if (/src\/main|src\/dev/i.test(scText)) pass('shadow-cljs.edn: source paths shown'); else fail('shadow-cljs paths: ' + scText.slice(0, 200));
  if (/app|tests|browser/i.test(scText)) pass('shadow-cljs.edn: builds shown'); else fail('shadow-cljs builds: ' + scText.slice(0, 300));
  if (/3000/i.test(scText)) pass('shadow-cljs.edn: dev HTTP port shown'); else fail('shadow-cljs port: ' + scText.slice(0, 200));

  // ── app.yaml (Google App Engine) viewer ──
  await openExample('app.yaml');
  await page.waitForSelector('#previewHost .appyaml-doc', { timeout: 12000 });
  pass('app.yaml: renders');
  const gaeText = await page.$eval('#previewHost .appyaml-doc', (e) => e.textContent);
  if (/App Engine/i.test(gaeText)) pass('app.yaml: App Engine badge shown'); else fail('gae-app badge: ' + gaeText.slice(0, 200));
  if (/nodejs20|python311|java17|ruby/i.test(gaeText)) pass('app.yaml: runtime shown'); else fail('gae-app runtime: ' + gaeText.slice(0, 200));
  if (/standard|flex/i.test(gaeText)) pass('app.yaml: environment shown'); else fail('gae-app env: ' + gaeText.slice(0, 200));
  if (/\[configured\]/i.test(gaeText)) pass('app.yaml: sensitive env vars masked'); else fail('gae-app masking: ' + gaeText.slice(0, 300));

  // ── cloudbuild.yaml (Google Cloud Build) viewer ──
  await openExample('cloudbuild.yaml');
  await page.waitForSelector('#previewHost .gcb-doc', { timeout: 12000 });
  const gcbText = await page.$eval('#previewHost .gcb-doc', (e) => e.textContent);
  if (/Cloud Build/i.test(gcbText)) pass('cloudbuild.yaml: Cloud Build badge shown'); else fail('cloudbuild badge: ' + gcbText.slice(0, 200));
  if (/step|npm|docker|node/i.test(gcbText)) pass('cloudbuild.yaml: build steps shown'); else fail('cloudbuild steps: ' + gcbText.slice(0, 300));
  if (/1200s|machineType|E2_HIGHCPU/i.test(gcbText)) pass('cloudbuild.yaml: timeout and machine type shown'); else fail('cloudbuild options: ' + gcbText.slice(0, 300));

  // ── google-services.json (Firebase) viewer ──
  await openExample('google-services.json');
  await page.waitForSelector('#previewHost .gs-doc', { timeout: 12000 });
  const gsText = await page.$eval('#previewHost .gs-doc', (e) => e.textContent);
  if (/Firebase/i.test(gsText)) pass('google-services.json: Firebase badge shown'); else fail('google-services badge: ' + gsText.slice(0, 200));
  if (/myapp-production|project/i.test(gsText)) pass('google-services.json: project ID shown'); else fail('google-services project: ' + gsText.slice(0, 200));
  if (/com\.example\.myapp|package_name|app client/i.test(gsText)) pass('google-services.json: app client shown'); else fail('google-services client: ' + gsText.slice(0, 300));

  // ── catalog-info.yaml (Backstage) viewer ──
  await openExample('catalog-info.yaml');
  await page.waitForSelector('#previewHost .cat-doc', { timeout: 12000 });
  const catText = await page.$eval('#previewHost .cat-doc', (e) => e.textContent);
  if (/Backstage/i.test(catText)) pass('catalog-info.yaml: Backstage badge shown'); else fail('catalog-info badge: ' + catText.slice(0, 200));
  if (/Component|API|System|Group|User/i.test(catText)) pass('catalog-info.yaml: entity kind shown'); else fail('catalog-info kind: ' + catText.slice(0, 200));
  if (/my-service|order-service|payment-service/i.test(catText)) pass('catalog-info.yaml: entity name shown'); else fail('catalog-info name: ' + catText.slice(0, 200));
  if (/production|experimental|deprecated/i.test(catText)) pass('catalog-info.yaml: lifecycle shown'); else fail('catalog-info lifecycle: ' + catText.slice(0, 200));

  // ── docusaurus.config.js viewer ──
  await openExample('docusaurus.config.js');
  await page.waitForSelector('#previewHost .dcs-doc', { timeout: 12000 });
  const dcsText = await page.$eval('#previewHost .dcs-doc', (e) => e.textContent);
  if (/Docusaurus/i.test(dcsText)) pass('docusaurus.config.js: Docusaurus badge shown'); else fail('docusaurus badge: ' + dcsText.slice(0, 200));
  if (/My Awesome Docs/i.test(dcsText)) pass('docusaurus.config.js: site title shown'); else fail('docusaurus title: ' + dcsText.slice(0, 200));
  if (/my-org\.github\.io/i.test(dcsText)) pass('docusaurus.config.js: URL shown'); else fail('docusaurus url: ' + dcsText.slice(0, 300));
  if (/Docs|Blog|API|Changelog/i.test(dcsText)) pass('docusaurus.config.js: navbar items shown'); else fail('docusaurus nav: ' + dcsText.slice(0, 300));

  // ── vitepress.config.ts viewer ──
  await openExample('vitepress.config.ts');
  await page.waitForSelector('#previewHost .vp-doc', { timeout: 12000 });
  const vpText = await page.$eval('#previewHost .vp-doc', (e) => e.textContent);
  if (/VitePress/i.test(vpText)) pass('vitepress.config.ts: VitePress badge shown'); else fail('vitepress badge: ' + vpText.slice(0, 200));
  if (/My VitePress Site/i.test(vpText)) pass('vitepress.config.ts: site title shown'); else fail('vitepress title: ' + vpText.slice(0, 200));
  if (/Guide|Reference|Examples|Blog/i.test(vpText)) pass('vitepress.config.ts: nav items shown'); else fail('vitepress nav: ' + vpText.slice(0, 300));
  if (/Introduction|Writing|Customization/i.test(vpText)) pass('vitepress.config.ts: sidebar sections shown'); else fail('vitepress sidebar: ' + vpText.slice(0, 300));

  // ── conf.py (Sphinx) viewer ──
  await openExample('conf.py');
  await page.waitForSelector('#previewHost .sphinx-doc', { timeout: 12000 });
  const sphinxText = await page.$eval('#previewHost .sphinx-doc', (e) => e.textContent);
  if (/Sphinx/i.test(sphinxText)) pass('conf.py: Sphinx badge shown'); else fail('sphinx badge: ' + sphinxText.slice(0, 200));
  if (/MyPythonLib/i.test(sphinxText)) pass('conf.py: project name shown'); else fail('sphinx project: ' + sphinxText.slice(0, 200));
  if (/Alice Smith/i.test(sphinxText)) pass('conf.py: author shown'); else fail('sphinx author: ' + sphinxText.slice(0, 200));
  if (/furo/i.test(sphinxText)) pass('conf.py: HTML theme shown'); else fail('sphinx theme: ' + sphinxText.slice(0, 300));
  if (/autodoc|napoleon|viewcode/i.test(sphinxText)) pass('conf.py: extensions shown'); else fail('sphinx extensions: ' + sphinxText.slice(0, 300));

  // ── Doxyfile viewer ──
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
  await openExample('.cursorrules');
  await page.waitForSelector('#previewHost .cr-doc', { timeout: 12000 });
  const crText = await page.$eval('#previewHost .cr-doc', (e) => e.textContent);
  if (/Cursor/i.test(crText)) pass('.cursorrules: Cursor badge shown'); else fail('.cursorrules badge: ' + crText.slice(0, 200));
  if (/section/i.test(crText)) pass('.cursorrules: sections shown'); else fail('.cursorrules sections: ' + crText.slice(0, 200));
  if (/TypeScript|Framework|Code Style/i.test(crText)) pass('.cursorrules: content sections shown'); else fail('.cursorrules content: ' + crText.slice(0, 300));

  // ── CLAUDE.md viewer ──
  await openExample('CLAUDE.md');
  await page.waitForSelector('#previewHost .cm-doc', { timeout: 12000 });
  const cmText = await page.$eval('#previewHost .cm-doc', (e) => e.textContent);
  if (/Claude Code/i.test(cmText)) pass('CLAUDE.md: Claude Code badge shown'); else fail('CLAUDE.md badge: ' + cmText.slice(0, 200));
  if (/section/i.test(cmText)) pass('CLAUDE.md: sections shown'); else fail('CLAUDE.md sections: ' + cmText.slice(0, 200));
  if (/monorepo|Next\.js|Fastify|TypeScript/i.test(cmText)) pass('CLAUDE.md: project content shown'); else fail('CLAUDE.md content: ' + cmText.slice(0, 300));

  // ── copilot-instructions.md viewer ──
  await openExample('copilot-instructions.md');
  await page.waitForSelector('#previewHost .ci-doc', { timeout: 12000 });
  const ciText = await page.$eval('#previewHost .ci-doc', (e) => e.textContent);
  if (/GitHub Copilot/i.test(ciText)) pass('copilot-instructions.md: GitHub Copilot badge shown'); else fail('copilot-instructions badge: ' + ciText.slice(0, 200));
  if (/section/i.test(ciText)) pass('copilot-instructions.md: sections shown'); else fail('copilot-instructions sections: ' + ciText.slice(0, 200));
  if (/TypeScript|React|Naming|Error/i.test(ciText)) pass('copilot-instructions.md: content sections shown'); else fail('copilot-instructions content: ' + ciText.slice(0, 300));

  // ── aider.conf.yml viewer ──
  await openExample('aider.conf.yml');
  await page.waitForSelector('#previewHost .adr-doc', { timeout: 12000 });
  const adrText = await page.$eval('#previewHost .adr-doc', (e) => e.textContent);
  if (/Aider/i.test(adrText)) pass('aider.conf.yml: Aider badge shown'); else fail('aider.conf.yml badge: ' + adrText.slice(0, 200));
  if (/claude-3-5-sonnet/i.test(adrText)) pass('aider.conf.yml: model shown'); else fail('aider.conf.yml model: ' + adrText.slice(0, 200));
  if (/diff/i.test(adrText)) pass('aider.conf.yml: edit format shown'); else fail('aider.conf.yml edit format: ' + adrText.slice(0, 200));
  if (/auto.commit|Auto.commit/i.test(adrText)) pass('aider.conf.yml: auto-commits setting shown'); else fail('aider.conf.yml auto-commits: ' + adrText.slice(0, 300));

  // ── tauri.conf.json viewer ──
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
  await openExample('electron-builder.yml');
  await page.waitForSelector('#previewHost .eb-doc', { timeout: 12000 });
  const ebText = await page.$eval('#previewHost .eb-doc', (e) => e.textContent);
  if (/Electron Builder/i.test(ebText)) pass('electron-builder.yml: Electron Builder badge shown'); else fail('electron-builder badge: ' + ebText.slice(0, 200));
  if (/com\.example\.myelectronapp/i.test(ebText)) pass('electron-builder.yml: appId shown'); else fail('electron-builder appId: ' + ebText.slice(0, 200));
  if (/My Electron App/i.test(ebText)) pass('electron-builder.yml: productName shown'); else fail('electron-builder productName: ' + ebText.slice(0, 200));
  if (/linux|win|mac/i.test(ebText)) pass('electron-builder.yml: platform targets shown'); else fail('electron-builder platforms: ' + ebText.slice(0, 300));

  // ── forge.config.js viewer ──
  await openExample('forge.config.js (Electron Forge)');
  await page.waitForSelector('#previewHost .fg-doc', { timeout: 12000 });
  const fgText = await page.$eval('#previewHost .fg-doc', (e) => e.textContent);
  if (/Electron Forge/i.test(fgText)) pass('forge.config.js: Electron Forge badge shown'); else fail('forge badge: ' + fgText.slice(0, 200));
  if (/MyElectronApp/i.test(fgText)) pass('forge.config.js: app name shown'); else fail('forge name: ' + fgText.slice(0, 200));
  if (/maker|squirrel|deb|rpm/i.test(fgText)) pass('forge.config.js: makers shown'); else fail('forge makers: ' + fgText.slice(0, 300));
  if (/plugin|publisher/i.test(fgText)) pass('forge.config.js: plugins or publishers shown'); else fail('forge plugins: ' + fgText.slice(0, 300));

  // ── wails.json viewer ──
  await openExample('wails.json (Wails)');
  await page.waitForSelector('#previewHost .wails-doc', { timeout: 12000 });
  const wailsText = await page.$eval('#previewHost .wails-doc', (e) => e.textContent);
  if (/Wails/i.test(wailsText)) pass('wails.json: Wails badge shown'); else fail('wails badge: ' + wailsText.slice(0, 200));
  if (/MyWailsApp/i.test(wailsText)) pass('wails.json: app name shown'); else fail('wails name: ' + wailsText.slice(0, 200));
  if (/v2\.9\.1/i.test(wailsText)) pass('wails.json: wailsVersion shown'); else fail('wails version: ' + wailsText.slice(0, 200));
  if (/frontend/i.test(wailsText)) pass('wails.json: frontend dir shown'); else fail('wails frontend: ' + wailsText.slice(0, 200));
  if (/desktop/i.test(wailsText)) pass('wails.json: outputType shown'); else fail('wails outputType: ' + wailsText.slice(0, 200));

  // ── web.config viewer ──
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
  await openExample('packages.config (NuGet)');
  await page.waitForSelector('#previewHost .pc-doc', { timeout: 12000 });
  const pcText = await page.$eval('#previewHost .pc-doc', (e) => e.textContent);
  if (/NuGet/i.test(pcText)) pass('packages.config: NuGet badge shown'); else fail('packages.config badge: ' + pcText.slice(0, 200));
  if (/14 package/i.test(pcText)) pass('packages.config: package count shown'); else fail('packages.config count: ' + pcText.slice(0, 200));
  if (/Newtonsoft\.Json|EntityFramework|AutoMapper/i.test(pcText)) pass('packages.config: package ids shown'); else fail('packages.config ids: ' + pcText.slice(0, 200));
  if (/13\.0\.3|net48/i.test(pcText)) pass('packages.config: version and target framework shown'); else fail('packages.config version/tf: ' + pcText.slice(0, 200));

  // ── launchSettings.json viewer ──
  await openExample('launchSettings.json (ASP.NET)');
  await page.waitForSelector('#previewHost .ls-doc', { timeout: 12000 });
  const lsText = await page.$eval('#previewHost .ls-doc', (e) => e.textContent);
  if (/ASP\.NET Core/i.test(lsText)) pass('launchSettings.json: ASP.NET Core badge shown'); else fail('launchSettings badge: ' + lsText.slice(0, 200));
  if (/4 launch profile/i.test(lsText)) pass('launchSettings.json: profile count shown'); else fail('launchSettings count: ' + lsText.slice(0, 200));
  if (/https|IIS Express|Docker/i.test(lsText)) pass('launchSettings.json: profiles shown'); else fail('launchSettings profiles: ' + lsText.slice(0, 200));
  if (/localhost:5000|localhost:7001/i.test(lsText)) pass('launchSettings.json: application URLs shown'); else fail('launchSettings URLs: ' + lsText.slice(0, 300));
  if (/ASPNETCORE_ENVIRONMENT|Development/i.test(lsText)) pass('launchSettings.json: environment variables shown'); else fail('launchSettings env: ' + lsText.slice(0, 300));

  // ── appsettings.json viewer ──
  await openExample('appsettings.json (ASP.NET)');
  await page.waitForSelector('#previewHost .appsettings-doc', { timeout: 12000 });
  pass('appsettings.json: badge shown');
  const asText = await page.$eval('#previewHost .appsettings-doc', (e) => e.textContent);
  const asHtml = await page.$eval('#previewHost .appsettings-doc', (e) => e.innerHTML);
  if (!asText.includes('DefaultConnection')) fail('appsettings.json: connection strings not shown'); else pass('appsettings.json: connection strings shown');
  if ((asText + asHtml).includes('secret123') || (asText + asHtml).includes('super-secret-jwt')) fail('appsettings.json: secrets leaked'); else pass('appsettings.json: secrets masked');
  if (/Information|Warning/i.test(asText)) pass('appsettings.json: log levels shown'); else fail('appsettings.json: log levels not shown: ' + asText.slice(0, 200));
  if (/Appsettings Review|public hosts|connection secret|jwt signing/i.test(asText)) pass('appsettings.json: review warnings shown'); else fail('appsettings review: ' + asText.slice(0, 300));
  const asSourceCollapsed = await page.$eval('#previewHost .appsettings-doc .kf-source-details', (e) => !e.open && /Redacted source/.test(e.textContent));
  if (asSourceCollapsed) pass('appsettings.json: redacted source is collapsed'); else fail('appsettings source unexpectedly expanded');
  await page.click('#previewHost .appsettings-doc [data-source-line]');
  await page.waitForFunction(() => document.querySelector('#previewHost .appsettings-doc .kf-source-details')?.open, null, { timeout: 3000 });
  const asSourceOpened = await page.$eval('#previewHost .appsettings-doc .kf-source-details', (e) => e.open && !!e.querySelector('#appsettings-line-1'));
  if (asSourceOpened) pass('appsettings.json: source links open source preview'); else fail('appsettings source link did not open preview');

  // ── terragrunt.hcl viewer ──
  await openExample('terragrunt.hcl (Terragrunt)');
  await page.waitForSelector('#previewHost .tgr-doc', { timeout: 12000 });
  const tgrText = await page.$eval('#previewHost .tgr-doc', (e) => e.textContent);
  if (/Terragrunt/i.test(tgrText)) pass('terragrunt.hcl: Terragrunt badge shown'); else fail('terragrunt badge: ' + tgrText.slice(0, 200));
  if (/api-service|modules/i.test(tgrText)) pass('terragrunt.hcl: source shown'); else fail('terragrunt source: ' + tgrText.slice(0, 200));
  if (/vpc|database/i.test(tgrText)) pass('terragrunt.hcl: dependencies shown'); else fail('terragrunt deps: ' + tgrText.slice(0, 200));

  // ── .tflint.hcl viewer ──
  await openExample('.tflint.hcl (TFLint)');
  await page.waitForSelector('#previewHost .tfl-doc', { timeout: 12000 });
  const tflText = await page.$eval('#previewHost .tfl-doc', (e) => e.textContent);
  if (/TFLint/i.test(tflText)) pass('.tflint.hcl: TFLint badge shown'); else fail('tflint badge: ' + tflText.slice(0, 200));
  if (/aws|terraform/i.test(tflText)) pass('.tflint.hcl: plugins shown'); else fail('tflint plugins: ' + tflText.slice(0, 200));
  if (/enabled|disabled/i.test(tflText)) pass('.tflint.hcl: rule states shown'); else fail('tflint rules: ' + tflText.slice(0, 300));

  // ── .terraform.lock.hcl viewer ──
  await openExample('.terraform.lock.hcl');
  await page.waitForSelector('#previewHost .tfl-lock-doc', { timeout: 12000 });
  const tflLockText = await page.$eval('#previewHost .tfl-lock-doc', (e) => e.textContent);
  if (/Terraform Lock/i.test(tflLockText)) pass('.terraform.lock.hcl: badge shown'); else fail('tf-lock badge: ' + tflLockText.slice(0, 200));
  if (/hashicorp\/aws|5\.31/i.test(tflLockText)) pass('.terraform.lock.hcl: provider shown'); else fail('tf-lock provider: ' + tflLockText.slice(0, 200));
  if (/hash/i.test(tflLockText)) pass('.terraform.lock.hcl: hash count shown'); else fail('tf-lock hashes: ' + tflLockText.slice(0, 300));

  // ── versions.tf viewer ──
  await openExample('versions.tf (Terraform)');
  await page.waitForSelector('#previewHost .vtf-doc', { timeout: 12000 });
  const vtfText = await page.$eval('#previewHost .vtf-doc', (e) => e.textContent);
  if (/Terraform/i.test(vtfText)) pass('versions.tf: Terraform badge shown'); else fail('versions-tf badge: ' + vtfText.slice(0, 200));
  if (/1\.5\.0/i.test(vtfText)) pass('versions.tf: required_version shown'); else fail('versions-tf version: ' + vtfText.slice(0, 200));
  if (/hashicorp\/aws|kubernetes/i.test(vtfText)) pass('versions.tf: providers shown'); else fail('versions-tf providers: ' + vtfText.slice(0, 300));

  // ── mongod.conf viewer ──
  await openExample('mongod.conf');
  await page.waitForSelector('#previewHost .mg-doc', { timeout: 12000 });
  const mgText = await page.$eval('#previewHost .mg-doc', (e) => e.textContent);
  const mgHtml = await page.$eval('#previewHost .mg-doc', (e) => e.innerHTML);
  if (/MongoDB/i.test(mgText)) pass('mongod.conf: MongoDB badge shown'); else fail('mongod badge: ' + mgText.slice(0, 200));
  if (/27017|\/var\/lib\/mongodb/i.test(mgText)) pass('mongod.conf: storage/network settings shown'); else fail('mongod storage: ' + mgText.slice(0, 300));
  if (/rs0|replSet/i.test(mgText)) pass('mongod.conf: replication section shown'); else fail('mongod repl: ' + mgText.slice(0, 300));
  if (/\[configured\]/.test(mgText)) pass('mongod.conf: keyFile value masked'); else fail('mongod masking: ' + mgText.slice(0, 300));
  if (/MongoDB Review|bind scope|authorization|key file/i.test(mgText)) pass('mongod.conf: review findings shown'); else fail('mongod review: ' + mgText.slice(0, 500));
  if ((mgText + mgHtml).includes('/etc/mongodb/keyfile')) fail('mongod.conf: keyFile path leaked'); else pass('mongod.conf: keyFile path redacted');
  const mgHelpTitle = await page.$eval('#previewHost .mg-doc [data-source-line]', (e) => e.getAttribute('title') || '');
  if (/MongoDB|Open line|source/i.test(mgHelpTitle)) pass('mongod.conf: setting hover explains source action'); else fail('mongod hover title: ' + mgHelpTitle);
  const mgSourceCollapsed = await page.$eval('#previewHost .mg-doc .kf-source-details', (e) => !e.open && /Redacted source/i.test(e.textContent));
  if (mgSourceCollapsed) pass('mongod.conf: redacted source starts collapsed'); else fail('mongod source was not collapsed');
  const mgSourceLine = await page.$eval('#previewHost .mg-doc [data-source-line]', (e) => { e.click(); return e.getAttribute('data-source-line'); });
  await page.waitForFunction((line) => {
    const details = document.querySelector('#previewHost .mg-doc .kf-source-details');
    return details?.open && document.getElementById(`mg-line-${line}`);
  }, mgSourceLine);
  pass('mongod.conf: clicking setting opens source line');

  // ── my.cnf viewer ──
  await openExample('my.cnf (MySQL)');
  await page.waitForSelector('#previewHost .my-doc', { timeout: 12000 });
  const myText = await page.$eval('#previewHost .my-doc', (e) => e.textContent);
  if (/MySQL/i.test(myText)) pass('my.cnf: MySQL badge shown'); else fail('my.cnf badge: ' + myText.slice(0, 200));
  if (/3306|127\.0\.0\.1/i.test(myText)) pass('my.cnf: [mysqld] section shown (port/bind)'); else fail('my.cnf mysqld: ' + myText.slice(0, 300));
  if (/256M|innodb_buffer_pool/i.test(myText)) pass('my.cnf: InnoDB buffer pool shown'); else fail('my.cnf innodb: ' + myText.slice(0, 300));
  if (/utf8mb4|default-character-set/i.test(myText)) pass('my.cnf: character set shown'); else fail('my.cnf charset: ' + myText.slice(0, 300));
  if (/MySQL Review|bind scope|slow log|dump packet/i.test(myText)) pass('my.cnf: review findings shown'); else fail('my.cnf review: ' + myText.slice(0, 500));
  const myHelpTitle = await page.$eval('#previewHost .my-doc [data-source-line]', (e) => e.getAttribute('title') || '');
  if (/MySQL|Open line|source/i.test(myHelpTitle)) pass('my.cnf: setting hover explains source action'); else fail('my.cnf hover title: ' + myHelpTitle);
  const mySourceCollapsed = await page.$eval('#previewHost .my-doc .kf-source-details', (e) => !e.open && /Redacted source/i.test(e.textContent));
  if (mySourceCollapsed) pass('my.cnf: redacted source starts collapsed'); else fail('my.cnf source was not collapsed');
  const mySourceLine = await page.$eval('#previewHost .my-doc [data-source-line]', (e) => { e.click(); return e.getAttribute('data-source-line'); });
  await page.waitForFunction((line) => {
    const details = document.querySelector('#previewHost .my-doc .kf-source-details');
    return details?.open && document.getElementById(`my-line-${line}`);
  }, mySourceLine);
  pass('my.cnf: clicking setting opens source line');

  // ── postgresql.conf viewer ──
  await openExample('postgresql.conf');
  await page.waitForSelector('#previewHost .pg-doc', { timeout: 12000 });
  const pgText = await page.$eval('#previewHost .pg-doc', (e) => e.textContent);
  const pgHtml = await page.$eval('#previewHost .pg-doc', (e) => e.innerHTML);
  if (/PostgreSQL/i.test(pgText)) pass('postgresql.conf: PostgreSQL badge shown'); else fail('postgresql badge: ' + pgText.slice(0, 200));
  if (/5432|localhost/i.test(pgText)) pass('postgresql.conf: connections section shown'); else fail('postgresql conns: ' + pgText.slice(0, 300));
  if (/128MB|shared_buffers/i.test(pgText)) pass('postgresql.conf: memory settings shown'); else fail('postgresql mem: ' + pgText.slice(0, 300));
  if (/replica|wal_level/i.test(pgText)) pass('postgresql.conf: WAL section shown'); else fail('postgresql wal: ' + pgText.slice(0, 300));
  if (/PostgreSQL Review|bind scope|ssl enabled/i.test(pgText)) pass('postgresql.conf: review findings shown'); else fail('postgresql review: ' + pgText.slice(0, 500));
  if ((pgText + pgHtml).includes('server.key')) fail('postgresql.conf: ssl key path leaked'); else pass('postgresql.conf: ssl key path redacted');
  const pgHelpTitle = await page.$eval('#previewHost .pg-doc [data-source-line]', (e) => e.getAttribute('title') || '');
  if (/PostgreSQL|Open line|source/i.test(pgHelpTitle)) pass('postgresql.conf: setting hover explains source action'); else fail('postgresql hover title: ' + pgHelpTitle);
  const pgSourceCollapsed = await page.$eval('#previewHost .pg-doc .kf-source-details', (e) => !e.open && /Redacted source/i.test(e.textContent));
  if (pgSourceCollapsed) pass('postgresql.conf: redacted source starts collapsed'); else fail('postgresql source was not collapsed');
  const pgSourceLine = await page.$eval('#previewHost .pg-doc [data-source-line]', (e) => { e.click(); return e.getAttribute('data-source-line'); });
  await page.waitForFunction((line) => {
    const details = document.querySelector('#previewHost .pg-doc .kf-source-details');
    return details?.open && document.getElementById(`pg-line-${line}`);
  }, pgSourceLine);
  pass('postgresql.conf: clicking setting opens source line');

  // ── pgbouncer.ini viewer ──
  await openExample('pgbouncer.ini');
  await page.waitForSelector('#previewHost .pb-doc', { timeout: 12000 });
  const pbText = await page.$eval('#previewHost .pb-doc', (e) => e.textContent);
  if (/PgBouncer/i.test(pbText)) pass('pgbouncer.ini: PgBouncer badge shown'); else fail('pgbouncer badge: ' + pbText.slice(0, 200));
  if (/mydb|replica/i.test(pbText)) pass('pgbouncer.ini: [databases] section shown'); else fail('pgbouncer dbs: ' + pbText.slice(0, 300));
  if (/transaction|pool_mode/i.test(pbText)) pass('pgbouncer.ini: pool_mode shown'); else fail('pgbouncer pool: ' + pbText.slice(0, 300));
  if (/••••/.test(pbText)) pass('pgbouncer.ini: password in connection string masked'); else fail('pgbouncer masking: ' + pbText.slice(0, 300));

  // ── pgbackrest.conf viewer ──
  await openExample('pgbackrest.conf');
  await page.waitForSelector('#previewHost .pgbr-doc', { timeout: 12000 });
  const pgbrText = await page.$eval('#previewHost .pgbr-doc', (e) => e.textContent);
  if (/pgBackRest/i.test(pgbrText)) pass('pgbackrest.conf: pgBackRest badge shown'); else fail('pgbackrest badge: ' + pgbrText.slice(0, 200));
  if (/S3|us-east-1|my-postgres-backups/i.test(pgbrText)) pass('pgbackrest.conf: repository info shown'); else fail('pgbackrest repo: ' + pgbrText.slice(0, 300));
  if (/main|replica/i.test(pgbrText)) pass('pgbackrest.conf: stanza names shown'); else fail('pgbackrest stanzas: ' + pgbrText.slice(0, 300));
  if (/\[configured\]/.test(pgbrText)) pass('pgbackrest.conf: credentials redacted'); else fail('pgbackrest masking: ' + pgbrText.slice(0, 300));

  // ── patroni.yml viewer ──
  await openExample('patroni.yml');
  await page.waitForSelector('#previewHost .patroni-doc', { timeout: 12000 });
  const patroniText = await page.$eval('#previewHost .patroni-doc', (e) => e.textContent);
  if (/Patroni/i.test(patroniText)) pass('patroni.yml: Patroni badge shown'); else fail('patroni badge: ' + patroniText.slice(0, 200));
  if (/postgres-cluster|node1/i.test(patroniText)) pass('patroni.yml: cluster/node info shown'); else fail('patroni cluster: ' + patroniText.slice(0, 300));
  if (/etcd|ETCD/i.test(patroniText)) pass('patroni.yml: DCS type shown'); else fail('patroni dcs: ' + patroniText.slice(0, 300));

  // ── .pylintrc viewer ──
  await openExample('.pylintrc');
  await page.waitForSelector('#previewHost .pl-doc', { timeout: 12000 });
  const plText = await page.$eval('#previewHost .pl-doc', (e) => e.textContent);
  if (/Pylint/i.test(plText)) pass('.pylintrc: Pylint badge shown'); else fail('pylintrc badge: ' + plText.slice(0, 200));
  if (/disabled/i.test(plText)) pass('.pylintrc: disabled codes section shown'); else fail('pylintrc disabled: ' + plText.slice(0, 200));
  if (/max-line-length|120/i.test(plText)) pass('.pylintrc: max-line-length shown'); else fail('pylintrc max-line: ' + plText.slice(0, 300));
  if (/jobs/i.test(plText)) pass('.pylintrc: jobs shown'); else fail('pylintrc jobs: ' + plText.slice(0, 300));

  // ── .flake8 viewer ──
  await openExample('.flake8');
  await page.waitForSelector('#previewHost .f8-doc', { timeout: 12000 });
  const f8Text = await page.$eval('#previewHost .f8-doc', (e) => e.textContent);
  if (/Flake8/i.test(f8Text)) pass('.flake8: Flake8 badge shown'); else fail('flake8 badge: ' + f8Text.slice(0, 200));
  if (/max-line-length|120/i.test(f8Text)) pass('.flake8: max-line-length shown'); else fail('flake8 max-line: ' + f8Text.slice(0, 200));
  if (/E203|W503|E501/i.test(f8Text)) pass('.flake8: ignored codes shown'); else fail('flake8 ignored: ' + f8Text.slice(0, 300));
  if (/venv|migrations|__pycache__/i.test(f8Text)) pass('.flake8: excluded paths shown'); else fail('flake8 excluded: ' + f8Text.slice(0, 300));
}
