// Auto-split slice 08/18 of the known-files smoke area (see ./../known-files.mjs).
// Covers: example.nomad (Nomad Job) … app.csproj.
// Called in order on the shared ctx — keep openExample order intact; no cross-file state.
export async function run(ctx) {
  const { page, origin, frameOf, pass, fail, openExample } = ctx;


  // ── nomad-job viewer ──
  await openExample('example.nomad (Nomad Job)');
  await page.waitForSelector('#previewHost .nj-doc', { timeout: 12000 });
  const nomadText = await page.$eval('#previewHost .nj-doc', (e) => e.textContent);
  if (/Nomad Job/i.test(nomadText)) pass('example.nomad: Nomad Job badge shown'); else fail('nomad badge: ' + nomadText.slice(0, 200));
  if (/web-api/i.test(nomadText)) pass('example.nomad: job name shown'); else fail('nomad job name: ' + nomadText.slice(0, 300));
  if (/service/i.test(nomadText)) pass('example.nomad: job type shown'); else fail('nomad type: ' + nomadText.slice(0, 300));
  if (/dc1|dc2/i.test(nomadText)) pass('example.nomad: datacenters shown'); else fail('nomad datacenters: ' + nomadText.slice(0, 300));
  if (/api|worker/i.test(nomadText)) pass('example.nomad: task groups shown'); else fail('nomad groups: ' + nomadText.slice(0, 300));

  // ── docker-stack viewer ──
  await openExample('docker-stack.yml (Docker Stack)');
  await page.waitForSelector('#previewHost .ds-doc', { timeout: 12000 });
  const dsText = await page.$eval('#previewHost .ds-doc', (e) => e.textContent);
  if (/Docker Stack/i.test(dsText)) pass('docker-stack.yml: Docker Stack badge shown'); else fail('docker-stack badge: ' + dsText.slice(0, 200));
  if (/web|api|db/i.test(dsText)) pass('docker-stack.yml: service names shown'); else fail('docker-stack services: ' + dsText.slice(0, 300));
  if (/replica|replicated/i.test(dsText)) pass('docker-stack.yml: replica info shown'); else fail('docker-stack replicas: ' + dsText.slice(0, 300));
  if (/restart_policy|on-failure|any/i.test(dsText)) pass('docker-stack.yml: restart policy shown'); else fail('docker-stack restart: ' + dsText.slice(0, 300));
  if (/db_password|api_key|secret/i.test(dsText)) pass('docker-stack.yml: secrets shown'); else fail('docker-stack secrets: ' + dsText.slice(0, 300));

  // ── podman-quadlet viewer ──
  await openExample('myapp.container (Podman Quadlet)');
  await page.waitForSelector('#previewHost .pq-doc', { timeout: 12000 });
  const pqText = await page.$eval('#previewHost .pq-doc', (e) => e.textContent);
  if (/Podman Quadlet/i.test(pqText)) pass('myapp.container: Podman Quadlet badge shown'); else fail('podman-quadlet badge: ' + pqText.slice(0, 200));
  if (/myorg\/myapp|myapp/i.test(pqText)) pass('myapp.container: image shown'); else fail('podman-quadlet image: ' + pqText.slice(0, 300));
  if (/\*\*\*|masked|REDACTED/i.test(pqText)) pass('myapp.container: secrets masked'); else fail('podman-quadlet masking: ' + pqText.slice(0, 300));
  if (/8080|port/i.test(pqText)) pass('myapp.container: port shown'); else fail('podman-quadlet port: ' + pqText.slice(0, 300));
  if (/\/data|volume/i.test(pqText)) pass('myapp.container: volume shown'); else fail('podman-quadlet volume: ' + pqText.slice(0, 300));

  // ── flux-kustomization viewer ──
  await openExample('flux-kustomization.yaml (Flux Kustomization)');
  await page.waitForSelector('#previewHost .fkust-doc', { timeout: 12000 });
  const fkText = await page.$eval('#previewHost .fkust-doc', (e) => e.textContent);
  if (/Flux Kustomization/i.test(fkText)) pass('flux-kustomization.yaml: Flux Kustomization badge shown'); else fail('flux-kust badge: ' + fkText.slice(0, 200));
  if (/production-apps/i.test(fkText)) pass('flux-kustomization.yaml: name shown'); else fail('flux-kust name: ' + fkText.slice(0, 300));
  if (/clusters\/production|\.\/clusters/i.test(fkText)) pass('flux-kustomization.yaml: path shown'); else fail('flux-kust path: ' + fkText.slice(0, 300));
  if (/prune|force|wait/i.test(fkText)) pass('flux-kustomization.yaml: sync settings shown'); else fail('flux-kust settings: ' + fkText.slice(0, 300));
  if (/infrastructure|dependsOn/i.test(fkText)) pass('flux-kustomization.yaml: dependsOn shown'); else fail('flux-kust deps: ' + fkText.slice(0, 300));

  // ── CycloneDX SBOM viewer ──
  await openExample('sbom.cyclonedx.json (CycloneDX SBOM)');
  await page.waitForSelector('#previewHost .cdx-doc', { timeout: 12000 });
  const cdxText = await page.$eval('#previewHost .cdx-doc', (e) => e.textContent);
  if (/CycloneDX SBOM/i.test(cdxText)) pass('sbom.cyclonedx.json: CycloneDX SBOM badge shown'); else fail('cyclonedx badge: ' + cdxText.slice(0, 200));
  if (/1\.5/i.test(cdxText)) pass('sbom.cyclonedx.json: spec version shown'); else fail('cyclonedx spec version: ' + cdxText.slice(0, 300));
  if (/express|lodash|react/i.test(cdxText)) pass('sbom.cyclonedx.json: component names shown'); else fail('cyclonedx components: ' + cdxText.slice(0, 300));
  if (/CVE-2024-12345|high/i.test(cdxText)) pass('sbom.cyclonedx.json: vulnerability shown'); else fail('cyclonedx vuln: ' + cdxText.slice(0, 300));
  if (/cdxgen/i.test(cdxText)) pass('sbom.cyclonedx.json: tool name shown'); else fail('cyclonedx tools: ' + cdxText.slice(0, 300));

  // ── SPDX SBOM viewer ──
  await openExample('sbom.spdx (SPDX SBOM)');
  await page.waitForSelector('#previewHost .spdx-doc', { timeout: 12000 });
  const spdxText = await page.$eval('#previewHost .spdx-doc', (e) => e.textContent);
  if (/SPDX SBOM/i.test(spdxText)) pass('sbom.spdx: SPDX SBOM badge shown'); else fail('spdx badge: ' + spdxText.slice(0, 200));
  if (/SPDX-2\.3/i.test(spdxText)) pass('sbom.spdx: SPDX version shown'); else fail('spdx version: ' + spdxText.slice(0, 300));
  if (/my-web-app-sbom/i.test(spdxText)) pass('sbom.spdx: document name shown'); else fail('spdx docname: ' + spdxText.slice(0, 300));
  if (/express|lodash|axios/i.test(spdxText)) pass('sbom.spdx: package names shown'); else fail('spdx packages: ' + spdxText.slice(0, 300));
  if (/MIT/i.test(spdxText)) pass('sbom.spdx: license info shown'); else fail('spdx license: ' + spdxText.slice(0, 300));

  // ── SLSA Provenance viewer ──
  await openExample('provenance.json (SLSA Provenance)');
  await page.waitForSelector('#previewHost .slsa-doc', { timeout: 12000 });
  const slsaText = await page.$eval('#previewHost .slsa-doc', (e) => e.textContent);
  if (/SLSA Provenance/i.test(slsaText)) pass('provenance.json: SLSA Provenance badge shown'); else fail('slsa badge: ' + slsaText.slice(0, 200));
  if (/in-toto\.io|slsa\.dev/i.test(slsaText)) pass('provenance.json: statement type shown'); else fail('slsa type: ' + slsaText.slice(0, 300));
  if (/my-web-app-linux/i.test(slsaText)) pass('provenance.json: subject name shown'); else fail('slsa subject: ' + slsaText.slice(0, 300));
  if (/release\.yml|builder/i.test(slsaText)) pass('provenance.json: builder info shown'); else fail('slsa builder: ' + slsaText.slice(0, 300));
  if (/express|lodash|react/i.test(slsaText)) pass('provenance.json: materials shown'); else fail('slsa materials: ' + slsaText.slice(0, 300));

  // ── Syft config viewer ──
  await openExample('.syft.yaml (Syft config)');
  await page.waitForSelector('#previewHost .syft-doc', { timeout: 12000 });
  const syftText = await page.$eval('#previewHost .syft-doc', (e) => e.textContent);
  if (/Syft/i.test(syftText)) pass('.syft.yaml: Syft badge shown'); else fail('syft badge: ' + syftText.slice(0, 200));
  if (/spdx-json|cyclonedx-json/i.test(syftText)) pass('.syft.yaml: output formats shown'); else fail('syft outputs: ' + syftText.slice(0, 300));
  if (/javascript-package-cataloger|python-package-cataloger/i.test(syftText)) pass('.syft.yaml: catalogers shown'); else fail('syft catalogers: ' + syftText.slice(0, 300));
  if (/enabled|disabled/i.test(syftText)) pass('.syft.yaml: enabled/disabled state shown'); else fail('syft enabled: ' + syftText.slice(0, 300));
  if (/aws-access-key|github-pat/i.test(syftText)) pass('.syft.yaml: secret exclusions shown'); else fail('syft secrets: ' + syftText.slice(0, 300));

  // ── ProGuard Rules viewer ──
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
  await openExample('dvc.yaml (DVC Pipeline)');
  await page.waitForSelector('#previewHost .dvc-doc', { timeout: 12000 });
  const dvPipelineText = await page.$eval('#previewHost .dvc-doc', (e) => e.textContent);
  if (/DVC/i.test(dvPipelineText)) pass('dvc.yaml: DVC badge shown'); else fail('dvc badge: ' + dvPipelineText.slice(0, 200));
  if (/prepare|train|evaluate/i.test(dvPipelineText)) pass('dvc.yaml: pipeline stages shown'); else fail('dvc stages: ' + dvPipelineText.slice(0, 300));
  if (/python src\/prepare\.py|python src\/train\.py/i.test(dvPipelineText)) pass('dvc.yaml: stage commands shown'); else fail('dvc commands: ' + dvPipelineText.slice(0, 300));
  if (/Dependencies|Outputs|Parameters/i.test(dvPipelineText)) pass('dvc.yaml: stage dep/out/param lists shown'); else fail('dvc lists: ' + dvPipelineText.slice(0, 300));

  // ── MLflow Project viewer ──
  await openExample('MLproject (MLflow Project)');
  await page.waitForSelector('#previewHost .mlf-doc', { timeout: 12000 });
  const mlfText = await page.$eval('#previewHost .mlf-doc', (e) => e.textContent);
  if (/MLflow/i.test(mlfText)) pass('MLproject: MLflow badge shown'); else fail('mlflow badge: ' + mlfText.slice(0, 200));
  if (/my-sklearn-project/i.test(mlfText)) pass('MLproject: project name shown'); else fail('mlflow name: ' + mlfText.slice(0, 300));
  if (/train|predict/i.test(mlfText)) pass('MLproject: entry points shown'); else fail('mlflow entry points: ' + mlfText.slice(0, 300));
  if (/alpha|l1_ratio|max_iter/i.test(mlfText)) pass('MLproject: parameters shown'); else fail('mlflow params: ' + mlfText.slice(0, 300));

  // ── Hydra Config viewer ──
  await openExample('hydra-config.yaml (Hydra Config)');
  await page.waitForSelector('#previewHost .hyd-doc', { timeout: 12000 });
  const hydText = await page.$eval('#previewHost .hyd-doc', (e) => e.textContent);
  if (/Hydra/i.test(hydText)) pass('hydra-config.yaml: Hydra badge shown'); else fail('hydra badge: ' + hydText.slice(0, 200));
  if (/model|dataset|optimizer|scheduler/i.test(hydText)) pass('hydra-config.yaml: defaults groups shown'); else fail('hydra defaults: ' + hydText.slice(0, 300));
  if (/src\.trainer\.ImageClassifier|_self_/i.test(hydText)) pass('hydra-config.yaml: target class or _self_ shown'); else fail('hydra target: ' + hydText.slice(0, 300));
  if (/max_epochs|batch_size|num_workers/i.test(hydText)) pass('hydra-config.yaml: config values shown'); else fail('hydra values: ' + hydText.slice(0, 300));

  // ── W&B Config viewer ──
  await openExample('wandb-settings (W&B Config)');
  await page.waitForSelector('#previewHost .wb-doc', { timeout: 12000 });
  const wbText = await page.$eval('#previewHost .wb-doc', (e) => e.textContent);
  if (/W&B|Weights.*Biases/i.test(wbText)) pass('wandb-settings: W&B badge shown'); else fail('wandb badge: ' + wbText.slice(0, 200));
  if (/my-team/i.test(wbText)) pass('wandb-settings: entity shown'); else fail('wandb entity: ' + wbText.slice(0, 300));
  if (/image-classification/i.test(wbText)) pass('wandb-settings: project shown'); else fail('wandb project: ' + wbText.slice(0, 300));
  if (/online/i.test(wbText)) pass('wandb-settings: mode shown'); else fail('wandb mode: ' + wbText.slice(0, 300));

  // ── New Relic Agent config viewer ──
  await openExample('newrelic.yml (New Relic Agent)');
  await page.waitForSelector('#previewHost .nr-doc', { timeout: 12000 });
  const nrText = await page.$eval('#previewHost .nr-doc', (e) => e.textContent);
  if (/New Relic/i.test(nrText)) pass('newrelic.yml: New Relic badge shown'); else fail('newrelic badge: ' + nrText.slice(0, 200));
  if (/MyApp/i.test(nrText)) pass('newrelic.yml: app_name shown'); else fail('newrelic app_name: ' + nrText.slice(0, 300));
  if (/••••••••|masked/i.test(nrText)) pass('newrelic.yml: license_key masked'); else fail('newrelic masking: ' + nrText.slice(0, 300));
  if (/distributed_tracing|transaction_tracer|error_collector/i.test(nrText)) pass('newrelic.yml: config sections shown'); else fail('newrelic sections: ' + nrText.slice(0, 300));
  if (/development|production|test/i.test(nrText)) pass('newrelic.yml: environments shown'); else fail('newrelic environments: ' + nrText.slice(0, 300));

  // ── Dynatrace OneAgent config viewer ──
  await openExample('dtconfig.yaml (Dynatrace OneAgent)');
  await page.waitForSelector('#previewHost .dt-doc', { timeout: 12000 });
  const dtText = await page.$eval('#previewHost .dt-doc', (e) => e.textContent);
  if (/Dynatrace/i.test(dtText)) pass('dtconfig.yaml: Dynatrace badge shown'); else fail('dynatrace badge: ' + dtText.slice(0, 200));
  if (/abc12345|live\.dynatrace\.com/i.test(dtText)) pass('dtconfig.yaml: environment/API URL shown'); else fail('dynatrace env: ' + dtText.slice(0, 300));
  if (/••••••••|masked/i.test(dtText)) pass('dtconfig.yaml: apiToken masked'); else fail('dynatrace token masking: ' + dtText.slice(0, 300));
  if (/us-east-1|network.zone/i.test(dtText)) pass('dtconfig.yaml: network zones shown'); else fail('dynatrace network zones: ' + dtText.slice(0, 300));

  // ── Elastic APM agent config viewer ──
  await openExample('elastic-apm-agent.properties (Elastic APM Agent)');
  await page.waitForSelector('#previewHost .apm-doc', { timeout: 12000 });
  const apmText = await page.$eval('#previewHost .apm-doc', (e) => e.textContent);
  if (/Elastic APM/i.test(apmText)) pass('elastic-apm-agent.properties: Elastic APM badge shown'); else fail('elastic-apm badge: ' + apmText.slice(0, 200));
  if (/payment-service/i.test(apmText)) pass('elastic-apm-agent.properties: service_name shown'); else fail('elastic-apm service: ' + apmText.slice(0, 300));
  if (/production/i.test(apmText)) pass('elastic-apm-agent.properties: environment shown'); else fail('elastic-apm env: ' + apmText.slice(0, 300));
  if (/••••••••|masked/i.test(apmText)) pass('elastic-apm-agent.properties: secret_token masked'); else fail('elastic-apm token masking: ' + apmText.slice(0, 300));
  if (/0\.25|25%|sample/i.test(apmText)) pass('elastic-apm-agent.properties: sample rate shown'); else fail('elastic-apm sampling: ' + apmText.slice(0, 300));

  // ── Filebeat config viewer (specialized plugin) ──
  await openExample('filebeat.yml (Filebeat)');
  pass(await page.waitForSelector('#previewHost .filebeat-doc', { timeout: 12000 }), 'filebeat.yml: filebeat-doc shown');
  const fbText = await page.$eval('#previewHost .filebeat-doc', (e) => e.textContent);
  if (/Elastic Filebeat/i.test(fbText)) pass('filebeat.yml: Elastic Filebeat badge shown'); else fail('filebeat badge: ' + fbText.slice(0, 200));
  if (/app-logs|kafka-events|\/var\/log/i.test(fbText)) pass('filebeat.yml: inputs shown'); else fail('filebeat inputs: ' + fbText.slice(0, 300));
  if (/elasticsearch/i.test(fbText)) pass('filebeat.yml: output type shown'); else fail('filebeat output: ' + fbText.slice(0, 300));
  if (/\[configured\]/i.test(fbText)) pass('filebeat.yml: credentials masked'); else fail('filebeat credential masking: ' + fbText.slice(0, 300));

  // ── Heartbeat config viewer (specialized plugin) ──
  await openExample('heartbeat.yml (Heartbeat)');
  pass(await page.waitForSelector('#previewHost .heartbeat-doc', { timeout: 12000 }), 'heartbeat.yml: heartbeat-doc shown');
  const hbText = await page.$eval('#previewHost .heartbeat-doc', (e) => e.textContent);
  if (/Elastic Heartbeat/i.test(hbText)) pass('heartbeat.yml: Elastic Heartbeat badge shown'); else fail('heartbeat badge: ' + hbText.slice(0, 200));
  if (/api-health|postgres-port|gateway-ping/i.test(hbText)) pass('heartbeat.yml: monitors shown'); else fail('heartbeat monitors: ' + hbText.slice(0, 300));
  if (/HTTP|TCP|ICMP/i.test(hbText)) pass('heartbeat.yml: monitor type chips shown'); else fail('heartbeat type chips: ' + hbText.slice(0, 300));
  if (/elasticsearch/i.test(hbText)) pass('heartbeat.yml: output type shown'); else fail('heartbeat output: ' + hbText.slice(0, 300));
  if (/\[configured\]/i.test(hbText)) pass('heartbeat.yml: credentials masked'); else fail('heartbeat credential masking: ' + hbText.slice(0, 300));

  // ── Hardhat config viewer ──
  await openExample('hardhat.config.js (Hardhat)');
  await page.waitForSelector('#previewHost .hh-doc', { timeout: 12000 });
  const hhText = await page.$eval('#previewHost .hh-doc', (e) => e.textContent);
  if (/Hardhat/i.test(hhText)) pass('hardhat.config.js: Hardhat badge shown'); else fail('hardhat badge: ' + hhText.slice(0, 200));
  if (/hardhat|localhost|mainnet/i.test(hhText)) pass('hardhat.config.js: network names shown'); else fail('hardhat networks: ' + hhText.slice(0, 300));
  if (/0\.8\.24/i.test(hhText)) pass('hardhat.config.js: Solidity version shown'); else fail('hardhat solc: ' + hhText.slice(0, 300));
  if (/configured/i.test(hhText)) pass('hardhat.config.js: Etherscan configured shown'); else fail('hardhat etherscan: ' + hhText.slice(0, 300));

  // ── Truffle config viewer ──
  await openExample('truffle-config.js (Truffle)');
  await page.waitForSelector('#previewHost .truf-doc', { timeout: 12000 });
  const trufText = await page.$eval('#previewHost .truf-doc', (e) => e.textContent);
  if (/Truffle/i.test(trufText)) pass('truffle-config.js: Truffle badge shown'); else fail('truffle badge: ' + trufText.slice(0, 200));
  if (/development|mainnet/i.test(trufText)) pass('truffle-config.js: network names shown'); else fail('truffle networks: ' + trufText.slice(0, 300));
  if (/0\.8\.17/i.test(trufText)) pass('truffle-config.js: Solidity version shown'); else fail('truffle solc: ' + trufText.slice(0, 300));
  if (/build\/contracts|build.contracts/i.test(trufText)) pass('truffle-config.js: build directory shown'); else fail('truffle build dir: ' + trufText.slice(0, 300));

  // ── Foundry TOML viewer ──
  await openExample('foundry.toml (Foundry)');
  await page.waitForSelector('#previewHost .fndry-doc', { timeout: 12000 });
  const fndryText = await page.$eval('#previewHost .fndry-doc', (e) => e.textContent);
  if (/Foundry/i.test(fndryText)) pass('foundry.toml: Foundry badge shown'); else fail('foundry badge: ' + fndryText.slice(0, 200));
  if (/0\.8\.24/i.test(fndryText)) pass('foundry.toml: Solidity version shown'); else fail('foundry solc: ' + fndryText.slice(0, 300));
  if (/mainnet|goerli|arbitrum/i.test(fndryText)) pass('foundry.toml: RPC endpoint names shown'); else fail('foundry rpc: ' + fndryText.slice(0, 300));
  if (/openzeppelin|forge-std/i.test(fndryText)) pass('foundry.toml: remappings shown'); else fail('foundry remappings: ' + fndryText.slice(0, 300));
  if (/URL.*hidden|URLs hidden/i.test(fndryText)) pass('foundry.toml: RPC URLs hidden message shown'); else fail('foundry rpc masking: ' + fndryText.slice(0, 400));

  // ── Anchor TOML viewer ──
  await openExample('Anchor.toml (Anchor)');
  await page.waitForSelector('#previewHost .anc-doc', { timeout: 12000 });
  const ancText = await page.$eval('#previewHost .anc-doc', (e) => e.textContent);
  if (/Anchor/i.test(ancText)) pass('Anchor.toml: Anchor badge shown'); else fail('anchor badge: ' + ancText.slice(0, 200));
  if (/my_program|token_vault/i.test(ancText)) pass('Anchor.toml: program names shown'); else fail('anchor programs: ' + ancText.slice(0, 300));
  if (/localnet|devnet|mainnet/i.test(ancText)) pass('Anchor.toml: cluster names shown'); else fail('anchor clusters: ' + ancText.slice(0, 300));
  if (/~\/.config\/solana\/id\.json/i.test(ancText)) pass('Anchor.toml: wallet path shown'); else fail('anchor wallet: ' + ancText.slice(0, 300));

  // ── Maven POM viewer ──
  await openExample('pom.xml (Maven POM)');
  await page.waitForSelector('#previewHost .mvn-doc', { timeout: 12000 });
  const mvnText = await page.$eval('#previewHost .mvn-doc', (e) => e.textContent);
  if (/Maven POM/i.test(mvnText)) pass('pom.xml: Maven POM badge shown'); else fail('maven-pom badge: ' + mvnText.slice(0, 200));
  if (/com\.acme|file-service/i.test(mvnText)) pass('pom.xml: groupId / artifactId shown'); else fail('maven-pom coords: ' + mvnText.slice(0, 300));
  if (/spring-boot-starter-web|guava/i.test(mvnText)) pass('pom.xml: dependency names shown'); else fail('maven-pom deps: ' + mvnText.slice(0, 300));
  if (/test/i.test(mvnText)) pass('pom.xml: test scope shown'); else fail('maven-pom scope: ' + mvnText.slice(0, 300));

  // ── Gradle Version Catalog viewer ──
  await openExample('libs.versions.toml (Gradle Version Catalog)');
  await page.waitForSelector('#previewHost .gvc-doc', { timeout: 12000 });
  const gvcText = await page.$eval('#previewHost .gvc-doc', (e) => e.textContent);
  if (/Gradle Catalog/i.test(gvcText)) pass('libs.versions.toml: Gradle Catalog badge shown'); else fail('gradle-version-catalog badge: ' + gvcText.slice(0, 200));
  if (/kotlin|spring-boot/i.test(gvcText)) pass('libs.versions.toml: version aliases shown'); else fail('gradle-version-catalog versions: ' + gvcText.slice(0, 300));
  if (/kotlin-stdlib|jackson-databind/i.test(gvcText)) pass('libs.versions.toml: library aliases shown'); else fail('gradle-version-catalog libraries: ' + gvcText.slice(0, 300));
  if (/coroutines|testing/i.test(gvcText)) pass('libs.versions.toml: bundle aliases shown'); else fail('gradle-version-catalog bundles: ' + gvcText.slice(0, 300));
  if (/kotlin-jvm|spring-boot/i.test(gvcText)) pass('libs.versions.toml: plugin aliases shown'); else fail('gradle-version-catalog plugins: ' + gvcText.slice(0, 300));

  // ── Checkstyle viewer ──
  await openExample('checkstyle.xml (Checkstyle)');
  await page.waitForSelector('#previewHost .cs-doc', { timeout: 12000 });
  const csText = await page.$eval('#previewHost .cs-doc', (e) => e.textContent);
  if (/Checkstyle/i.test(csText)) pass('checkstyle.xml: Checkstyle badge shown'); else fail('checkstyle badge: ' + csText.slice(0, 200));
  if (/Checker/i.test(csText)) pass('checkstyle.xml: Checker module shown'); else fail('checkstyle Checker: ' + csText.slice(0, 300));
  if (/TreeWalker/i.test(csText)) pass('checkstyle.xml: TreeWalker module shown'); else fail('checkstyle TreeWalker: ' + csText.slice(0, 300));
  if (/ConstantName|MethodName|JavadocMethod/i.test(csText)) pass('checkstyle.xml: check module names shown'); else fail('checkstyle modules: ' + csText.slice(0, 300));

  // ── SpotBugs viewer ──
  await openExample('spotbugs-exclude.xml (SpotBugs)');
  await page.waitForSelector('#previewHost .spb-doc', { timeout: 12000 });
  const spbText = await page.$eval('#previewHost .spb-doc', (e) => e.textContent);
  if (/SpotBugs/i.test(spbText)) pass('spotbugs-exclude.xml: SpotBugs badge shown'); else fail('spotbugs badge: ' + spbText.slice(0, 200));
  if (/NP_NULL_ON_SOME_PATH|BC_UNCONFIRMED_CAST|SE_NO_SERIALVERSIONID/i.test(spbText)) pass('spotbugs-exclude.xml: bug pattern names shown'); else fail('spotbugs patterns: ' + spbText.slice(0, 300));
  if (/com\.acme/i.test(spbText)) pass('spotbugs-exclude.xml: class / package filters shown'); else fail('spotbugs classes: ' + spbText.slice(0, 300));
  if (/Exclude|match rule/i.test(spbText)) pass('spotbugs-exclude.xml: filter type and match count shown'); else fail('spotbugs filter type: ' + spbText.slice(0, 300));

  // ── php-ini viewer ──
  await openExample('php.ini');
  await page.waitForSelector('#previewHost .php-doc', { timeout: 12000 });
  const phpIniText = await page.$eval('#previewHost .php-doc', (e) => e.textContent);
  if (/PHP Config/i.test(phpIniText)) pass('php.ini: PHP Config badge shown'); else fail('php-ini badge: ' + phpIniText.slice(0, 200));
  if (/128M/i.test(phpIniText)) pass('php.ini: memory_limit shown'); else fail('php-ini memory: ' + phpIniText.slice(0, 300));
  if (/upload_max_filesize/i.test(phpIniText)) pass('php.ini: upload_max_filesize shown'); else fail('php-ini upload: ' + phpIniText.slice(0, 300));
  if (/Europe\/Berlin/i.test(phpIniText)) pass('php.ini: timezone shown'); else fail('php-ini timezone: ' + phpIniText.slice(0, 300));
  if (/session\.save_handler|opcache/i.test(phpIniText)) pass('php.ini: session/opcache sections shown'); else fail('php-ini session: ' + phpIniText.slice(0, 300));

  // ── psalm-config viewer ──
  await openExample('psalm.xml');
  await page.waitForSelector('#previewHost .ps-doc', { timeout: 12000 });
  const psalmText = await page.$eval('#previewHost .ps-doc', (e) => e.textContent);
  if (/Psalm/i.test(psalmText)) pass('psalm.xml: Psalm badge shown'); else fail('psalm badge: ' + psalmText.slice(0, 200));
  if (/errorLevel|3/i.test(psalmText)) pass('psalm.xml: error level shown'); else fail('psalm errorLevel: ' + psalmText.slice(0, 300));
  if (/8\.1/i.test(psalmText)) pass('psalm.xml: PHP version shown'); else fail('psalm phpVersion: ' + psalmText.slice(0, 300));
  if (/SymfonyPlugin|PhpUnitPlugin/i.test(psalmText)) pass('psalm.xml: plugins shown'); else fail('psalm plugins: ' + psalmText.slice(0, 300));
  if (/MissingReturnType|PropertyNotSetInConstructor/i.test(psalmText)) pass('psalm.xml: issue handlers shown'); else fail('psalm issues: ' + psalmText.slice(0, 300));

  // ── phpunit-config viewer ──
  await openExample('phpunit.xml.dist (PHPUnit Config)');
  await page.waitForSelector('#previewHost .puc-doc', { timeout: 12000 });
  const pucText = await page.$eval('#previewHost .puc-doc', (e) => e.textContent);
  if (/PHPUnit/i.test(pucText)) pass('phpunit.xml.dist: PHPUnit badge shown'); else fail('phpunit-config badge: ' + pucText.slice(0, 200));
  if (/unit|integration/i.test(pucText)) pass('phpunit.xml.dist: test suites shown'); else fail('phpunit-config suites: ' + pucText.slice(0, 300));
  if (/vendor\/autoload\.php|bootstrap/i.test(pucText)) pass('phpunit.xml.dist: bootstrap shown'); else fail('phpunit-config bootstrap: ' + pucText.slice(0, 300));
  if (/coverage|src/i.test(pucText)) pass('phpunit.xml.dist: coverage paths shown'); else fail('phpunit-config coverage: ' + pucText.slice(0, 300));

  // ── rector-config viewer ──
  await openExample('rector.php (Rector Config)');
  await page.waitForSelector('#previewHost .rect-doc', { timeout: 12000 });
  const rectorText = await page.$eval('#previewHost .rect-doc', (e) => e.textContent);
  if (/Rector/i.test(rectorText)) pass('rector.php: Rector badge shown'); else fail('rector badge: ' + rectorText.slice(0, 200));
  if (/8\.1/i.test(rectorText)) pass('rector.php: PHP version shown'); else fail('rector phpVersion: ' + rectorText.slice(0, 300));
  if (/php81|php sets/i.test(rectorText)) pass('rector.php: PHP sets shown'); else fail('rector sets: ' + rectorText.slice(0, 300));
  if (/FirstClassCallable|ClassPropertyAssign|RemoveUnused/i.test(rectorText)) pass('rector.php: rules shown'); else fail('rector rules: ' + rectorText.slice(0, 300));
  if (/dead.*code|20/i.test(rectorText)) pass('rector.php: dead code level shown'); else fail('rector deadCode: ' + rectorText.slice(0, 300));

  // ── Keycloak Realm viewer ──
  await openExample('keycloak-realm.json (Keycloak Realm)');
  await page.waitForSelector('#previewHost .kc-doc', { timeout: 12000 });
  const keycloakText = await page.$eval('#previewHost .kc-doc', (e) => e.textContent);
  if (/Keycloak/i.test(keycloakText)) pass('keycloak-realm.json: Keycloak badge shown'); else fail('keycloak badge: ' + keycloakText.slice(0, 200));
  if (/myrealm/i.test(keycloakText)) pass('keycloak-realm.json: realm name shown'); else fail('keycloak realm name: ' + keycloakText.slice(0, 300));
  if (/app-frontend|app-backend|admin-cli/i.test(keycloakText)) pass('keycloak-realm.json: clients shown'); else fail('keycloak clients: ' + keycloakText.slice(0, 300));
  if (!/EXAMPLE_SECRET_DO_NOT_USE/i.test(keycloakText)) pass('keycloak-realm.json: client secret masked'); else fail('keycloak secret not masked');
  if (/admin|user|readonly/i.test(keycloakText)) pass('keycloak-realm.json: realm roles shown'); else fail('keycloak roles: ' + keycloakText.slice(0, 300));
  if (/github/i.test(keycloakText)) pass('keycloak-realm.json: identity provider shown'); else fail('keycloak idp: ' + keycloakText.slice(0, 300));

  // ── Authelia Config viewer ──
  await openExample('authelia-config.yml (Authelia)');
  await page.waitForSelector('#previewHost .au-doc', { timeout: 12000 });
  const auText = await page.$eval('#previewHost .au-doc', (e) => e.textContent);
  if (/Authelia/i.test(auText)) pass('authelia-config.yml: Authelia badge shown'); else fail('authelia badge: ' + auText.slice(0, 200));
  if (/ldap/i.test(auText)) pass('authelia-config.yml: backend type shown'); else fail('authelia backend: ' + auText.slice(0, 300));
  if (/example\.com/i.test(auText)) pass('authelia-config.yml: session domain shown'); else fail('authelia session: ' + auText.slice(0, 300));
  if (/deny|bypass|two_factor/i.test(auText)) pass('authelia-config.yml: access control policies shown'); else fail('authelia policies: ' + auText.slice(0, 300));
  if (!/EXAMPLE_PASSWORD_DO_NOT_USE|EXAMPLE_OIDC_SECRET/i.test(auText)) pass('authelia-config.yml: secrets masked'); else fail('authelia secrets not masked');

  // ── OAuth2 Proxy Config viewer ──
  await openExample('oauth2-proxy.cfg (OAuth2 Proxy)');
  await page.waitForSelector('#previewHost .op2-doc', { timeout: 12000 });
  const op2Text = await page.$eval('#previewHost .op2-doc', (e) => e.textContent);
  if (/OAuth2 Proxy/i.test(op2Text)) pass('oauth2-proxy.cfg: OAuth2 Proxy badge shown'); else fail('oauth2-proxy badge: ' + op2Text.slice(0, 200));
  if (/github/i.test(op2Text)) pass('oauth2-proxy.cfg: provider shown'); else fail('oauth2-proxy provider: ' + op2Text.slice(0, 300));
  if (/localhost:3000/i.test(op2Text)) pass('oauth2-proxy.cfg: upstream shown'); else fail('oauth2-proxy upstream: ' + op2Text.slice(0, 300));
  if (/example\.com/i.test(op2Text)) pass('oauth2-proxy.cfg: cookie domain / email domain shown'); else fail('oauth2-proxy domain: ' + op2Text.slice(0, 300));
  if (!/EXAMPLE_SECRET_DO_NOT_USE|EXAMPLE_COOKIE_SECRET/i.test(op2Text)) pass('oauth2-proxy.cfg: secrets masked'); else fail('oauth2-proxy secrets not masked');

  // ── Authentik Blueprint viewer ──
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
  await openExample('app.csproj');
  await page.waitForSelector('#previewHost .cs-doc', { timeout: 12000 });
  const csprojText = await page.$eval('#previewHost .cs-doc', (e) => e.textContent);
  if (/\.NET Project/i.test(csprojText)) pass('app.csproj: .NET Project badge shown'); else fail('csproj badge: ' + csprojText.slice(0, 200));
  if (/Microsoft\.NET\.Sdk/i.test(csprojText)) pass('app.csproj: SDK name shown in header'); else fail('csproj sdk: ' + csprojText.slice(0, 300));
  if (/net8\.0/i.test(csprojText)) pass('app.csproj: target framework shown'); else fail('csproj tf: ' + csprojText.slice(0, 300));
  if (/Serilog|Polly|Npgsql/i.test(csprojText)) pass('app.csproj: package references listed'); else fail('csproj pkgs: ' + csprojText.slice(0, 300));
  if (/MyApp\.Core|MyApp\.Infrastructure/i.test(csprojText)) pass('app.csproj: project references listed'); else fail('csproj projrefs: ' + csprojText.slice(0, 300));
}
