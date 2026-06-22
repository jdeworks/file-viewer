// Auto-split slice 06/18 of the known-files smoke area (see ./../known-files.mjs).
// Covers: setup.cfg … config.alloy.
// Called in order on the shared ctx — keep openExample order intact; no cross-file state.
export async function run(ctx) {
  const { page, origin, frameOf, pass, fail, openExample } = ctx;

  // ── setup.cfg viewer ──
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
  await openExample('.bandit');
  await page.waitForSelector('#previewHost .bd-doc', { timeout: 12000 });
  const bdText = await page.$eval('#previewHost .bd-doc', (e) => e.textContent);
  if (/Bandit/i.test(bdText)) pass('.bandit: Bandit badge shown'); else fail('bandit badge: ' + bdText.slice(0, 200));
  if (/B101|B311|B506/i.test(bdText)) pass('.bandit: skipped test IDs shown'); else fail('bandit skips: ' + bdText.slice(0, 300));
  if (/tests|migrations|venv/i.test(bdText)) pass('.bandit: excluded dirs shown'); else fail('bandit exclude: ' + bdText.slice(0, 300));
  if (/MEDIUM|severity/i.test(bdText)) pass('.bandit: severity filter shown'); else fail('bandit severity: ' + bdText.slice(0, 300));

  // ── .semgrep.yml viewer ──
  await openExample('.semgrep.yml');
  await page.waitForSelector('#previewHost .sgr-doc', { timeout: 12000 });
  const sgrText = await page.$eval('#previewHost .sgr-doc', (e) => e.textContent);
  if (/Semgrep/i.test(sgrText)) pass('.semgrep.yml: Semgrep badge shown'); else fail('semgrep badge: ' + sgrText.slice(0, 200));
  if (/rule/i.test(sgrText)) pass('.semgrep.yml: rule count shown'); else fail('semgrep rules: ' + sgrText.slice(0, 300));
  if (/hardcoded-password|sql-injection|ERROR|WARNING/i.test(sgrText)) pass('.semgrep.yml: rule ids and severity shown'); else fail('semgrep rule content: ' + sgrText.slice(0, 300));

  // ── .gitleaks.toml viewer ──
  await openExample('.gitleaks.toml');
  await page.waitForSelector('#previewHost .gl-doc', { timeout: 12000 });
  const glText = await page.$eval('#previewHost .gl-doc', (e) => e.textContent);
  if (/Gitleaks/i.test(glText)) pass('.gitleaks.toml: Gitleaks badge shown'); else fail('gitleaks badge: ' + glText.slice(0, 200));
  if (/rule/i.test(glText)) pass('.gitleaks.toml: rules section shown'); else fail('gitleaks rules: ' + glText.slice(0, 300));
  if (/aws-access-key|github-pat|stripe/i.test(glText)) pass('.gitleaks.toml: rule ids shown'); else fail('gitleaks rule ids: ' + glText.slice(0, 300));
  if (/allowlist/i.test(glText)) pass('.gitleaks.toml: allowlists shown'); else fail('gitleaks allowlists: ' + glText.slice(0, 300));

  // ── .trufflehog.yaml viewer ──
  await openExample('.trufflehog.yaml');
  await page.waitForSelector('#previewHost .tfh-doc', { timeout: 12000 });
  const tfhText = await page.$eval('#previewHost .tfh-doc', (e) => e.textContent);
  if (/TruffleHog/i.test(tfhText)) pass('.trufflehog.yaml: TruffleHog badge shown'); else fail('trufflehog badge: ' + tfhText.slice(0, 200));
  if (/AWS|GitHub|Slack/i.test(tfhText)) pass('.trufflehog.yaml: detectors shown'); else fail('trufflehog detectors: ' + tfhText.slice(0, 300));
  if (/exclude/i.test(tfhText)) pass('.trufflehog.yaml: exclude paths shown'); else fail('trufflehog paths: ' + tfhText.slice(0, 300));

  // ── osv-scanner.toml viewer ──
  await openExample('osv-scanner.toml');
  await page.waitForSelector('#previewHost .osv-doc', { timeout: 12000 });
  const osvText = await page.$eval('#previewHost .osv-doc', (e) => e.textContent);
  if (/OSV-Scanner/i.test(osvText)) pass('osv-scanner.toml: OSV-Scanner badge shown'); else fail('osv-scanner badge: ' + osvText.slice(0, 200));
  if (/ignored vuln/i.test(osvText)) pass('osv-scanner.toml: ignored vulnerabilities section shown'); else fail('osv-scanner vulns: ' + osvText.slice(0, 300));
  if (/GHSA-|CVE-/i.test(osvText)) pass('osv-scanner.toml: vulnerability IDs shown'); else fail('osv-scanner ids: ' + osvText.slice(0, 300));
  if (/1\.21\.0/i.test(osvText)) pass('osv-scanner.toml: GoVersionOverride shown'); else fail('osv-scanner go version: ' + osvText.slice(0, 300));

  // ── opencost.yaml viewer ──
  await openExample('opencost.yaml');
  await page.waitForSelector('#previewHost .oc-doc', { timeout: 12000 });
  const ocText = await page.$eval('#previewHost .oc-doc', (e) => e.textContent);
  if (/OpenCost/i.test(ocText)) pass('opencost.yaml: OpenCost badge shown'); else fail('opencost badge: ' + ocText.slice(0, 200));
  if (/production-k8s/i.test(ocText)) pass('opencost.yaml: cluster_id shown'); else fail('opencost cluster_id: ' + ocText.slice(0, 200));
  if (/prometheus/i.test(ocText)) pass('opencost.yaml: prometheus host shown'); else fail('opencost prometheus: ' + ocText.slice(0, 300));

  // ── crossplane-config.yaml viewer ──
  await openExample('crossplane-config.yaml (Crossplane)');
  await page.waitForSelector('#previewHost .xp-doc', { timeout: 12000 });
  const xpText = await page.$eval('#previewHost .xp-doc', (e) => e.textContent);
  if (/Crossplane/i.test(xpText)) pass('crossplane-config.yaml: Crossplane badge shown'); else fail('crossplane badge: ' + xpText.slice(0, 200));
  if (/Provider/i.test(xpText)) pass('crossplane-config.yaml: kind shown'); else fail('crossplane kind: ' + xpText.slice(0, 200));
  if (/provider-aws/i.test(xpText)) pass('crossplane-config.yaml: name shown'); else fail('crossplane name: ' + xpText.slice(0, 200));

  // ── keda-scaledobject.yaml viewer ──
  await openExample('keda-scaledobject.yaml (KEDA)');
  await page.waitForSelector('#previewHost .kd-doc', { timeout: 12000 });
  const kdText = await page.$eval('#previewHost .kd-doc', (e) => e.textContent);
  if (/KEDA/i.test(kdText)) pass('keda-scaledobject.yaml: KEDA badge shown'); else fail('keda badge: ' + kdText.slice(0, 200));
  if (/ScaledObject/i.test(kdText)) pass('keda-scaledobject.yaml: kind shown'); else fail('keda kind: ' + kdText.slice(0, 200));
  if (/my-app-scaler/i.test(kdText)) pass('keda-scaledobject.yaml: name shown'); else fail('keda name: ' + kdText.slice(0, 200));
  if (/rabbitmq|cpu/i.test(kdText)) pass('keda-scaledobject.yaml: triggers shown'); else fail('keda triggers: ' + kdText.slice(0, 300));

  // ── velero-schedule.yaml viewer ──
  await openExample('velero-schedule.yaml (Velero)');
  await page.waitForSelector('#previewHost .vl-doc', { timeout: 12000 });
  const vlText = await page.$eval('#previewHost .vl-doc', (e) => e.textContent);
  if (/Velero/i.test(vlText)) pass('velero-schedule.yaml: Velero badge shown'); else fail('velero badge: ' + vlText.slice(0, 200));
  if (/Schedule/i.test(vlText)) pass('velero-schedule.yaml: kind shown'); else fail('velero kind: ' + vlText.slice(0, 200));
  if (/daily-backup/i.test(vlText)) pass('velero-schedule.yaml: name shown'); else fail('velero name: ' + vlText.slice(0, 200));
  if (/0 2 \* \* \*/i.test(vlText)) pass('velero-schedule.yaml: cron schedule shown'); else fail('velero schedule: ' + vlText.slice(0, 300));

  // ── .codeclimate.yml viewer ──
  await openExample('.codeclimate.yml');
  await page.waitForSelector('#previewHost .codeclimate-doc', { timeout: 12000 });
  const ccText = await page.$eval('#previewHost .codeclimate-doc', (e) => e.textContent);
  if (/Code Climate/i.test(ccText)) pass('.codeclimate.yml: Code Climate badge shown'); else fail('codeclimate badge: ' + ccText.slice(0, 200));
  if (/engine|plugin/i.test(ccText)) pass('.codeclimate.yml: engines/plugins section shown'); else fail('codeclimate engines: ' + ccText.slice(0, 300));
  if (/eslint|duplication|fixme/i.test(ccText)) pass('.codeclimate.yml: engine names shown'); else fail('codeclimate engine names: ' + ccText.slice(0, 300));
  if (/exclude/i.test(ccText)) pass('.codeclimate.yml: exclude patterns shown'); else fail('codeclimate excludes: ' + ccText.slice(0, 300));
  // ── conda environment.yml viewer ──
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
  await openExample('pip.conf');
  await page.waitForSelector('#previewHost .pipcfg-doc', { timeout: 12000 });
  const pipConfText = await page.$eval('#previewHost .pipcfg-doc', (e) => e.textContent);
  if (/pip/i.test(pipConfText)) pass('pip.conf: pip badge shown'); else fail('pip-conf badge: ' + pipConfText.slice(0, 200));
  if (/pypi\.org/i.test(pipConfText)) pass('pip.conf: index-url shown'); else fail('pip-conf index: ' + pipConfText.slice(0, 200));
  if (/pypi\.company\.internal|timeout/i.test(pipConfText)) pass('pip.conf: trusted-host or timeout shown'); else fail('pip-conf trusted/timeout: ' + pipConfText.slice(0, 200));

  // ── .node-version viewer ──
  await openExample('.node-version');
  await page.waitForSelector('#previewHost .nv-doc', { timeout: 12000 });
  const nvText = await page.$eval('#previewHost .nv-doc', (e) => e.textContent);
  if (/Node\.js/i.test(nvText)) pass('.node-version: Node.js badge shown'); else fail('node-version-file badge: ' + nvText.slice(0, 200));
  if (/20\.11\.0/.test(nvText)) pass('.node-version: version shown'); else fail('node-version-file version: ' + nvText.slice(0, 200));
  if (/fnm|volta|nvm/i.test(nvText)) pass('.node-version: install commands shown'); else fail('node-version-file commands: ' + nvText.slice(0, 300));

  // ── docker-bake.hcl viewer ──
  await openExample('docker-bake.hcl');
  await page.waitForSelector('#previewHost .bk-doc', { timeout: 12000 });
  const dockerBakeText = await page.$eval('#previewHost .bk-doc', (e) => e.textContent);
  if (/Docker Bake/i.test(dockerBakeText)) pass('docker-bake.hcl: Docker Bake badge shown'); else fail('docker-bake badge: ' + dockerBakeText.slice(0, 200));
  if (/api|worker|frontend/i.test(dockerBakeText)) pass('docker-bake.hcl: target names shown'); else fail('docker-bake targets: ' + dockerBakeText.slice(0, 200));
  if (/linux\/amd64|linux\/arm64/i.test(dockerBakeText)) pass('docker-bake.hcl: platforms shown'); else fail('docker-bake platforms: ' + dockerBakeText.slice(0, 300));
  if (/registry\.example\.com/i.test(dockerBakeText)) pass('docker-bake.hcl: tags shown'); else fail('docker-bake tags: ' + dockerBakeText.slice(0, 300));

  // ── cloudformation.yaml viewer ──
  await openExample('cloudformation.yaml (CloudFormation)');
  await page.waitForSelector('#previewHost .cfn-doc', { timeout: 12000 });
  const cfnText = await page.$eval('#previewHost .cfn-doc', (e) => e.textContent);
  if (/CloudFormation/i.test(cfnText)) pass('cloudformation.yaml: CloudFormation badge shown'); else fail('cfn badge: ' + cfnText.slice(0, 200));
  if (/S3|Lambda|DynamoDB|IAM|ApiGateway/i.test(cfnText)) pass('cloudformation.yaml: resource types shown'); else fail('cfn resources: ' + cfnText.slice(0, 300));
  if (/Environment|LambdaMemory|BucketNameSuffix/i.test(cfnText)) pass('cloudformation.yaml: parameters shown'); else fail('cfn params: ' + cfnText.slice(0, 300));
  if (/BucketName|TableName|FunctionArn|ApiEndpoint/i.test(cfnText)) pass('cloudformation.yaml: outputs shown'); else fail('cfn outputs: ' + cfnText.slice(0, 300));

  // ── sam-template.yaml viewer ──
  await openExample('sam-template.yaml (AWS SAM)');
  await page.waitForSelector('#previewHost .sam-doc', { timeout: 12000 });
  const samText = await page.$eval('#previewHost .sam-doc', (e) => e.textContent);
  if (/AWS SAM/i.test(samText)) pass('sam-template.yaml: AWS SAM badge shown'); else fail('sam badge: ' + samText.slice(0, 200));
  if (/GetNotesFunction|CreateNoteFunction|DeleteNoteFunction/i.test(samText)) pass('sam-template.yaml: function names shown'); else fail('sam functions: ' + samText.slice(0, 300));
  if (/nodejs20\.x/i.test(samText)) pass('sam-template.yaml: runtime shown'); else fail('sam runtime: ' + samText.slice(0, 300));
  if (/Environment|LogRetentionDays/i.test(samText)) pass('sam-template.yaml: parameters shown'); else fail('sam params: ' + samText.slice(0, 300));

  // ── cdk.json viewer ──
  await openExample('cdk.json (AWS CDK)');
  await page.waitForSelector('#previewHost .cdk-doc', { timeout: 12000 });
  const cdkText = await page.$eval('#previewHost .cdk-doc', (e) => e.textContent);
  if (/AWS CDK/i.test(cdkText)) pass('cdk.json: AWS CDK badge shown'); else fail('cdk badge: ' + cdkText.slice(0, 200));
  if (/npx ts-node|bin\/my-app\.ts/i.test(cdkText)) pass('cdk.json: app command shown'); else fail('cdk app: ' + cdkText.slice(0, 300));
  if (/context/i.test(cdkText)) pass('cdk.json: context section shown'); else fail('cdk context: ' + cdkText.slice(0, 300));
  if (/@aws-cdk\/aws-lambda|my-app:region/i.test(cdkText)) pass('cdk.json: context keys shown'); else fail('cdk context keys: ' + cdkText.slice(0, 300));

  // ── samconfig.toml viewer ──
  await openExample('samconfig.toml (SAM Config)');
  await page.waitForSelector('#previewHost .smc-doc', { timeout: 12000 });
  const smcText = await page.$eval('#previewHost .smc-doc', (e) => e.textContent);
  if (/SAM Config/i.test(smcText)) pass('samconfig.toml: SAM Config badge shown'); else fail('smc badge: ' + smcText.slice(0, 200));
  if (/default|staging|prod/i.test(smcText)) pass('samconfig.toml: environments shown'); else fail('smc environments: ' + smcText.slice(0, 300));
  if (/stack_name|notes-app/i.test(smcText)) pass('samconfig.toml: stack_name shown'); else fail('smc stack_name: ' + smcText.slice(0, 300));
  if (/region|us-east-1|eu-west-1/i.test(smcText)) pass('samconfig.toml: regions shown'); else fail('smc regions: ' + smcText.slice(0, 300));

  // ── analysis_options.yaml viewer ──
  await openExample('analysis_options.yaml (Dart Analyzer)');
  await page.waitForSelector('#previewHost .ao-doc', { timeout: 12000 });
  const aoText = await page.$eval('#previewHost .ao-doc', (e) => e.textContent);
  if (/Dart Analyzer/i.test(aoText)) pass('analysis_options.yaml: Dart Analyzer badge shown'); else fail('ao badge: ' + aoText.slice(0, 200));
  if (/prefer_const_constructors|avoid_print/i.test(aoText)) pass('analysis_options.yaml: linter rules shown'); else fail('ao rules: ' + aoText.slice(0, 300));
  if (/exclude/i.test(aoText)) pass('analysis_options.yaml: excluded paths shown'); else fail('ao excludes: ' + aoText.slice(0, 300));
  if (/flutter_lints/i.test(aoText)) pass('analysis_options.yaml: include shown'); else fail('ao include: ' + aoText.slice(0, 300));

  // ── Podfile viewer ──
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
  await openExample('MyApp.xcscheme (Xcode Scheme)');
  await page.waitForSelector('#previewHost .xs-doc', { timeout: 12000 });
  const xsText = await page.$eval('#previewHost .xs-doc', (e) => e.textContent);
  if (/Xcode Scheme/i.test(xsText)) pass('MyApp.xcscheme: Xcode Scheme badge shown'); else fail('xs badge: ' + xsText.slice(0, 200));
  if (/MyApp|MyAppTests/i.test(xsText)) pass('MyApp.xcscheme: build targets shown'); else fail('xs targets: ' + xsText.slice(0, 300));
  if (/Debug|Release/i.test(xsText)) pass('MyApp.xcscheme: build configurations shown'); else fail('xs configs: ' + xsText.slice(0, 300));
  if (/test targets/i.test(xsText)) pass('MyApp.xcscheme: test targets section shown'); else fail('xs test targets: ' + xsText.slice(0, 300));

  // ── eas.json viewer ──
  await openExample('eas.json (Expo EAS)');
  await page.waitForSelector('#previewHost .eas-doc', { timeout: 12000 });
  const easText = await page.$eval('#previewHost .eas-doc', (e) => e.textContent);
  if (/\bEAS\b/i.test(easText)) pass('eas.json: EAS badge shown'); else fail('eas badge: ' + easText.slice(0, 200));
  if (/development|preview|production/i.test(easText)) pass('eas.json: build profiles shown'); else fail('eas profiles: ' + easText.slice(0, 300));
  if (/distribution|channel/i.test(easText)) pass('eas.json: profile settings shown'); else fail('eas settings: ' + easText.slice(0, 300));
  if (/submit/i.test(easText)) pass('eas.json: submit profiles section shown'); else fail('eas submit: ' + easText.slice(0, 300));

  // ── .rspec viewer ──
  await openExample('.rspec');
  await page.waitForSelector('#previewHost .rsc-doc', { timeout: 12000 });
  const rscText = await page.$eval('#previewHost .rsc-doc', (e) => e.textContent);
  if (/RSpec/i.test(rscText)) pass('.rspec: badge shown'); else fail('rspec badge: ' + rscText.slice(0, 200));
  if (/documentation|format/i.test(rscText)) pass('.rspec: format flag shown'); else fail('rspec format: ' + rscText.slice(0, 300));
  if (/spec_helper|require/i.test(rscText)) pass('.rspec: require entry shown'); else fail('rspec require: ' + rscText.slice(0, 300));

  // ── .bundler-audit.yml viewer ──
  await openExample('.bundler-audit.yml');
  await page.waitForSelector('#previewHost .bac-doc', { timeout: 12000 });
  const bacText = await page.$eval('#previewHost .bac-doc', (e) => e.textContent);
  if (/Bundler Audit/i.test(bacText)) pass('.bundler-audit.yml: badge shown'); else fail('bundler-audit badge: ' + bacText.slice(0, 200));
  if (/CVE-2020-8165|CVE-2021-22942|CVE-2022-32224/i.test(bacText)) pass('.bundler-audit.yml: CVE IDs shown'); else fail('bundler-audit CVEs: ' + bacText.slice(0, 300));
  if (/ignore|CVE/i.test(bacText)) pass('.bundler-audit.yml: ignore section shown'); else fail('bundler-audit ignore: ' + bacText.slice(0, 300));

  // ── .standard.yml viewer ──
  await openExample('.standard.yml');
  await page.waitForSelector('#previewHost .srb-doc', { timeout: 12000 });
  const srbText = await page.$eval('#previewHost .srb-doc', (e) => e.textContent);
  if (/Standard Ruby/i.test(srbText)) pass('.standard.yml: badge shown'); else fail('standardrb badge: ' + srbText.slice(0, 200));
  if (/3\.2|ruby_version|Ruby/i.test(srbText)) pass('.standard.yml: ruby version shown'); else fail('standardrb version: ' + srbText.slice(0, 300));
  if (/standard-rails|standard-performance|extend/i.test(srbText)) pass('.standard.yml: extends shown'); else fail('standardrb extends: ' + srbText.slice(0, 300));

  // ── sorbet.config viewer ──
  await openExample('sorbet.config');
  await page.waitForSelector('#previewHost .sbt-doc', { timeout: 12000 });
  const sbtText = await page.$eval('#previewHost .sbt-doc', (e) => e.textContent);
  if (/Sorbet/i.test(sbtText)) pass('sorbet.config: badge shown'); else fail('sorbet badge: ' + sbtText.slice(0, 200));
  if (/vendor|node_modules|ignore/i.test(sbtText)) pass('sorbet.config: ignore patterns shown'); else fail('sorbet ignore: ' + sbtText.slice(0, 300));
  if (/requires-ancestor|ruby3-keyword|experimental/i.test(sbtText)) pass('sorbet.config: experimental features shown'); else fail('sorbet experimental: ' + sbtText.slice(0, 300));

  // ── dbt_project.yml viewer ──
  await openExample('dbt_project.yml');
  await page.waitForSelector('#previewHost .dbt-doc', { timeout: 12000 });
  const dbtProjectText = await page.$eval('#previewHost .dbt-doc', (e) => e.textContent);
  if (/dbt/i.test(dbtProjectText)) pass('dbt_project.yml: dbt badge shown'); else fail('dbt badge: ' + dbtProjectText.slice(0, 200));
  if (/jaffle_shop/i.test(dbtProjectText)) pass('dbt_project.yml: project name shown'); else fail('dbt name: ' + dbtProjectText.slice(0, 200));
  if (/profile/i.test(dbtProjectText)) pass('dbt_project.yml: profile shown'); else fail('dbt profile: ' + dbtProjectText.slice(0, 200));
  if (/incremental|table|view/i.test(dbtProjectText)) pass('dbt_project.yml: materializations shown'); else fail('dbt materializations: ' + dbtProjectText.slice(0, 300));
  if (/start_date|payment_method|environment/i.test(dbtProjectText)) pass('dbt_project.yml: vars shown'); else fail('dbt vars: ' + dbtProjectText.slice(0, 300));

  // ── liquibase.properties viewer ──
  await openExample('liquibase.properties');
  await page.waitForSelector('#previewHost .lq-doc', { timeout: 12000 });
  const lqText = await page.$eval('#previewHost .lq-doc', (e) => e.textContent);
  if (/Liquibase/i.test(lqText)) pass('liquibase.properties: Liquibase badge shown'); else fail('lq badge: ' + lqText.slice(0, 200));
  if (/db\.example\.com/i.test(lqText)) pass('liquibase.properties: host shown'); else fail('lq host: ' + lqText.slice(0, 200));
  if (/liquibase_user/i.test(lqText)) pass('liquibase.properties: username shown'); else fail('lq username: ' + lqText.slice(0, 200));
  if (/•{4,}|password masked/i.test(lqText)) pass('liquibase.properties: password masked'); else fail('lq password masking: ' + lqText.slice(0, 300));
  if (/changelog-master|changelog/i.test(lqText)) pass('liquibase.properties: changeLogFile shown'); else fail('lq changelog: ' + lqText.slice(0, 300));

  // ── sqitch.conf viewer ──
  await openExample('sqitch.conf');
  await page.waitForSelector('#previewHost .sq-doc', { timeout: 12000 });
  const sqText = await page.$eval('#previewHost .sq-doc', (e) => e.textContent);
  if (/Sqitch/i.test(sqText)) pass('sqitch.conf: Sqitch badge shown'); else fail('sq badge: ' + sqText.slice(0, 200));
  if (/core|engine|plan/i.test(sqText)) pass('sqitch.conf: core section shown'); else fail('sq core: ' + sqText.slice(0, 200));
  if (/dev|staging|production/i.test(sqText)) pass('sqitch.conf: targets shown'); else fail('sq targets: ' + sqText.slice(0, 300));
  if (/\*{3}/i.test(sqText)) pass('sqitch.conf: credentials masked in URIs'); else fail('sq credential masking: ' + sqText.slice(0, 300));

  // ── atlas.hcl viewer ──
  await openExample('atlas.hcl');
  await page.waitForSelector('#previewHost .at-doc', { timeout: 12000 });
  const atText = await page.$eval('#previewHost .at-doc', (e) => e.textContent);
  if (/Atlas/i.test(atText)) pass('atlas.hcl: Atlas badge shown'); else fail('at badge: ' + atText.slice(0, 200));
  if (/local|staging|production/i.test(atText)) pass('atlas.hcl: env blocks shown'); else fail('at envs: ' + atText.slice(0, 200));
  if (/variable|db_url|dev_url/i.test(atText)) pass('atlas.hcl: variables shown'); else fail('at variables: ' + atText.slice(0, 300));
  if (/\*{3}/i.test(atText)) pass('atlas.hcl: credentials masked in URLs'); else fail('at credential masking: ' + atText.slice(0, 300));

  // ── prometheus-rules.yaml viewer ──
  await openExample('prometheus-rules.yaml');
  await page.waitForSelector('#previewHost .pr-doc', { timeout: 12000 });
  const prText = await page.$eval('#previewHost .pr-doc', (e) => e.textContent);
  if (/Prometheus Rules/i.test(prText)) pass('prometheus-rules.yaml: badge shown'); else fail('prometheus-rules badge: ' + prText.slice(0, 200));
  if (/node-alerts|NodeHighCPU/i.test(prText)) pass('prometheus-rules.yaml: alert group/rule shown'); else fail('prometheus-rules content: ' + prText.slice(0, 200));
  if (/warning|critical/i.test(prText)) pass('prometheus-rules.yaml: severity shown'); else fail('prometheus-rules severity: ' + prText.slice(0, 200));
  if (/recording/i.test(prText)) pass('prometheus-rules.yaml: recording rule shown'); else fail('prometheus-rules recording: ' + prText.slice(0, 200));

  // ── grafana-dashboard.json viewer ──
  await openExample('grafana-dashboard.json');
  await page.waitForSelector('#previewHost .gd-doc', { timeout: 12000 });
  const gdText = await page.$eval('#previewHost .gd-doc', (e) => e.textContent);
  if (/Grafana Dashboard/i.test(gdText)) pass('grafana-dashboard.json: badge shown'); else fail('grafana-dashboard badge: ' + gdText.slice(0, 200));
  if (/Node Exporter Dashboard/i.test(gdText)) pass('grafana-dashboard.json: title shown'); else fail('grafana-dashboard title: ' + gdText.slice(0, 200));
  if (/schemaVersion|36/i.test(gdText)) pass('grafana-dashboard.json: schemaVersion shown'); else fail('grafana-dashboard schema: ' + gdText.slice(0, 200));
  if (/panel|stat|timeseries/i.test(gdText)) pass('grafana-dashboard.json: panels shown'); else fail('grafana-dashboard panels: ' + gdText.slice(0, 200));

  // ── jaeger-config.yaml viewer ──
  await openExample('jaeger-config.yaml');
  await page.waitForSelector('#previewHost .jg-doc', { timeout: 12000 });
  const jgText = await page.$eval('#previewHost .jg-doc', (e) => e.textContent);
  if (/Jaeger/i.test(jgText)) pass('jaeger-config.yaml: badge shown'); else fail('jaeger badge: ' + jgText.slice(0, 200));
  if (/16686/i.test(jgText)) pass('jaeger-config.yaml: query port shown'); else fail('jaeger port: ' + jgText.slice(0, 200));
  if (/elasticsearch/i.test(jgText)) pass('jaeger-config.yaml: storage type shown'); else fail('jaeger storage: ' + jgText.slice(0, 200));

  // ── tempo.yaml viewer ──
  await openExample('tempo.yaml');
  await page.waitForSelector('#previewHost .tempo-doc', { timeout: 12000 });
  const tempoText = await page.$eval('#previewHost .tempo-doc', (e) => e.textContent);
  if (/Tempo/i.test(tempoText)) pass('tempo.yaml: badge shown'); else fail('tempo badge: ' + tempoText.slice(0, 200));
  if (/3200/i.test(tempoText)) pass('tempo.yaml: http port shown'); else fail('tempo port: ' + tempoText.slice(0, 200));
  if (/otlp|jaeger|zipkin/i.test(tempoText)) pass('tempo.yaml: receivers shown'); else fail('tempo receivers: ' + tempoText.slice(0, 200));
  if (/s3/i.test(tempoText)) pass('tempo.yaml: storage backend shown'); else fail('tempo storage: ' + tempoText.slice(0, 200));
  if (/configured\]/i.test(tempoText)) pass('tempo.yaml: credentials redacted'); else fail('tempo redact: ' + tempoText.slice(0, 300));

  // ── mimir.yaml viewer ──
  await openExample('mimir.yaml');
  await page.waitForSelector('#previewHost .mimir-doc', { timeout: 12000 });
  const mimirText = await page.$eval('#previewHost .mimir-doc', (e) => e.textContent);
  if (/Mimir/i.test(mimirText)) pass('mimir.yaml: badge shown'); else fail('mimir badge: ' + mimirText.slice(0, 200));
  if (/8080/i.test(mimirText)) pass('mimir.yaml: http port shown'); else fail('mimir port: ' + mimirText.slice(0, 200));
  if (/s3/i.test(mimirText)) pass('mimir.yaml: storage backend shown'); else fail('mimir storage: ' + mimirText.slice(0, 200));
  if (/ingestion_rate|max_global_series/i.test(mimirText)) pass('mimir.yaml: limits shown'); else fail('mimir limits: ' + mimirText.slice(0, 300));
  if (/configured\]/i.test(mimirText)) pass('mimir.yaml: credentials redacted'); else fail('mimir redact: ' + mimirText.slice(0, 300));

  // ── cortex.yaml viewer ──
  await openExample('cortex.yaml');
  pass(await page.waitForSelector('#previewHost .cortex-doc', { timeout: 12000 }), 'cortex.yaml: cortex-doc shown');
  const cortexText = await page.$eval('#previewHost .cortex-doc', (e) => e.textContent);
  if (/Cortex/i.test(cortexText)) pass('cortex.yaml: badge shown'); else fail('cortex badge: ' + cortexText.slice(0, 200));
  if (/9009/i.test(cortexText)) pass('cortex.yaml: http port shown'); else fail('cortex port: ' + cortexText.slice(0, 200));
  if (/s3/i.test(cortexText)) pass('cortex.yaml: storage backend shown'); else fail('cortex storage: ' + cortexText.slice(0, 200));
  if (/configured\]/i.test(cortexText)) pass('cortex.yaml: credentials redacted'); else fail('cortex redact: ' + cortexText.slice(0, 300));

  // ── config.alloy viewer ──
  await openExample('config.alloy');
  pass(await page.waitForSelector('#previewHost .grfalloy-doc', { timeout: 12000 }), 'config.alloy: grfalloy-doc shown');
  const alloyText = await page.$eval('#previewHost .grfalloy-doc', (e) => e.textContent);
  if (/Alloy/i.test(alloyText)) pass('config.alloy: badge shown'); else fail('alloy badge: ' + alloyText.slice(0, 200));
  if (/prometheus\.scrape|prometheus\.remote_write|loki\.write/i.test(alloyText)) pass('config.alloy: component types shown'); else fail('alloy components: ' + alloyText.slice(0, 300));
  if (/\d+\s*component/i.test(alloyText)) pass('config.alloy: total component count shown'); else fail('alloy count: ' + alloyText.slice(0, 200));
}
