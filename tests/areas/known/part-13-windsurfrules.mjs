// Auto-split slice 13/18 of the known-files smoke area (see ./../known-files.mjs).
// Covers: .windsurfrules … odoo.conf.
// Called in order on the shared ctx — keep openExample order intact; no cross-file state.
export async function run(ctx) {
  const { page, origin, frameOf, pass, fail, openExample } = ctx;

  // ── .windsurfrules viewer ──
  await openExample('.windsurfrules');
  pass(await page.waitForSelector('#previewHost .wsr-doc', { timeout: 12000 }), '.windsurfrules: wsr-doc shown');
  const wsrText = await page.$eval('#previewHost .wsr-doc', el => el.textContent);
  if (/Windsurf/i.test(wsrText) && /section/i.test(wsrText)) pass('.windsurfrules: rule sections shown'); else fail('windsurfrules: ' + wsrText.slice(0, 200));

  // ── eleventy.config.js viewer ──
  await openExample('eleventy.config.js');
  pass(await page.waitForSelector('#previewHost .elev-doc', { timeout: 12000 }), 'eleventy.config.js: elev-doc shown');

  // ── gatsby-config.js viewer ──
  await openExample('gatsby-config.js');
  pass(await page.waitForSelector('#previewHost .gatsby-doc', { timeout: 12000 }), 'gatsby-config.js: gatsby-doc shown');

  // ── jvm.options viewer ──
  await openExample('jvm.options');
  pass(await page.waitForSelector('#previewHost .jo-doc', { timeout: 12000 }), 'jvm.options: jo-doc shown');

  // ── inventory.yml (Ansible inventory) viewer ──
  await openExample('inventory.yml');
  pass(await page.waitForSelector('#previewHost .ansi-doc', { timeout: 12000 }), 'inventory.yml: ansible-inventory shown');

  // ── requirements.yml (Ansible Galaxy) viewer ──
  await openExample('requirements.yml');
  pass(await page.waitForSelector('#previewHost .ansr-doc', { timeout: 12000 }), 'requirements.yml: ansible-requirements shown');

  // ── system.yaml (Artifactory) viewer ──
  await openExample('system.yaml');
  pass(await page.waitForSelector('#previewHost .art-doc', { timeout: 12000 }), 'system.yaml: artifactory-system shown');

  // ── airflow.cfg viewer ──
  await openExample('airflow.cfg');
  pass(await page.waitForSelector('#previewHost .airflowcfg-doc', { timeout: 12000 }), 'airflow.cfg: airflowcfg-doc shown');
  const airflowText = await page.$eval('#previewHost .airflowcfg-doc', el => el.textContent);
  if (!airflowText.includes('Airflow')) fail('airflow.cfg: missing badge'); else pass('airflow.cfg: badge shown');
  if (!airflowText.includes('executor') && !airflowText.includes('CeleryExecutor')) fail('airflow.cfg: no executor shown'); else pass('airflow.cfg: executor shown');

  // ── waypoint.hcl viewer ──
  await openExample('waypoint.hcl');
  pass(await page.waitForSelector('#previewHost .waypoint-doc', { timeout: 12000 }), 'waypoint.hcl: waypoint-doc shown');

  // ── buf.gen.yaml viewer ──
  await openExample('buf.gen.yaml');
  pass(await page.waitForSelector('#previewHost .bufgen-doc', { timeout: 12000 }), 'buf.gen.yaml: bufgen-doc shown');

  // ── registries.conf viewer ──
  await openExample('registries.conf');
  pass(await page.waitForSelector('#previewHost .registriescfg-doc', { timeout: 12000 }), 'registries.conf: registriescfg-doc shown');
  const registriesText = await page.$eval('#previewHost .registriescfg-doc', el => el.textContent);
  if (!registriesText.includes('Podman') && !registriesText.includes('Container')) fail('registries.conf: missing badge'); else pass('registries.conf: badge shown');
  if (!registriesText.includes('docker.io') && !registriesText.includes('quay.io')) fail('registries.conf: no registry entries shown'); else pass('registries.conf: registry entries shown');

  // ── storage.conf viewer ──
  await openExample('storage.conf');
  pass(await page.waitForSelector('#previewHost .storagecfg-doc', { timeout: 12000 }), 'storage.conf: storagecfg-doc shown');
  const storageText = await page.$eval('#previewHost .storagecfg-doc', el => el.textContent);
  if (!storageText.includes('Podman') && !storageText.includes('Storage')) fail('storage.conf: missing badge'); else pass('storage.conf: badge shown');
  if (!storageText.includes('overlay') && !storageText.includes('driver')) fail('storage.conf: no driver shown'); else pass('storage.conf: driver shown');

  // ── blackbox.yml viewer ──
  await openExample('blackbox.yml');
  pass(await page.waitForSelector('#previewHost .blackbox-doc', { timeout: 12000 }), 'blackbox.yml: blackbox-doc shown');
  const blackboxText = await page.$eval('#previewHost .blackbox-doc', el => el.textContent);
  if (!blackboxText.includes('Blackbox')) fail('blackbox.yml: missing badge'); else pass('blackbox.yml: badge shown');
  if (!blackboxText.includes('http_2xx') && !blackboxText.includes('http')) fail('blackbox.yml: no modules shown'); else pass('blackbox.yml: modules shown');

  // ── snmp.yml viewer ──
  await openExample('snmp.yml');
  pass(await page.waitForSelector('#previewHost .snmpexp-doc', { timeout: 12000 }), 'snmp.yml: snmpexp-doc shown');
  const snmpText = await page.$eval('#previewHost .snmpexp-doc', el => el.textContent);
  if (!snmpText.includes('SNMP')) fail('snmp.yml: missing badge'); else pass('snmp.yml: badge shown');
  if (!snmpText.includes('if_mib') && !snmpText.includes('module')) fail('snmp.yml: no modules shown'); else pass('snmp.yml: modules shown');

  // ── codegen.yml viewer ──
  await openExample('codegen.yml');
  pass(await page.waitForSelector('#previewHost .gqlcodegen-doc', { timeout: 12000 }), 'codegen.yml: gqlcodegen-doc shown');

  // ── tspconfig.yaml viewer ──
  await openExample('tspconfig.yaml');
  pass(await page.waitForSelector('#previewHost .tspconfig-doc', { timeout: 12000 }), 'tspconfig.yaml: tspconfig-doc shown');

  // ── asyncapi.yml viewer ──
  await openExample('asyncapi.yml');
  pass(await page.waitForSelector('#previewHost .asyncapi-doc', { timeout: 12000 }), 'asyncapi.yml: asyncapi-doc shown');

  // ── telegraf.conf viewer ──
  await openExample('telegraf.conf');
  pass(await page.waitForSelector('#previewHost .telegraf-doc', { timeout: 12000 }), 'telegraf.conf: telegraf-doc shown');

  // ── devfile.yaml viewer ──
  await openExample('devfile.yaml');
  pass(await page.waitForSelector('#previewHost .devfile-doc', { timeout: 12000 }), 'devfile.yaml: devfile-doc shown');

  // ── .ncurc.json viewer ──
  await openExample('.ncurc.json');
  pass(await page.waitForSelector('#previewHost .ncurc-doc', { timeout: 12000 }), '.ncurc.json: ncurc-doc shown');

  // ── influxdb.conf viewer ──
  await openExample('influxdb.conf');
  pass(await page.waitForSelector('#previewHost .influxdb-doc', { timeout: 12000 }), 'influxdb.conf: influxdb-doc shown');
  const influxText = await page.$eval('#previewHost .influxdb-doc', el => el.textContent);
  if (!influxText.includes('InfluxDB')) fail('influxdb.conf: missing badge'); else pass('influxdb.conf: badge shown');
  if (!influxText.includes(':8086') && !influxText.includes('bind-address')) fail('influxdb.conf: no HTTP address shown'); else pass('influxdb.conf: HTTP address shown');

  // ── nsqd.cfg viewer ──
  await openExample('nsqd.cfg');
  pass(await page.waitForSelector('#previewHost .nsqconf-doc', { timeout: 12000 }), 'nsqd.cfg: nsqconf-doc shown');
  const nsqText = await page.$eval('#previewHost .nsqconf-doc', el => el.textContent);
  if (!nsqText.includes('NSQ')) fail('nsqd.cfg: missing badge'); else pass('nsqd.cfg: badge shown');
  if (!nsqText.includes('4150') && !nsqText.includes('tcp-address')) fail('nsqd.cfg: no TCP address shown'); else pass('nsqd.cfg: TCP address shown');

  // ── .actrc viewer (act GitHub Actions runner config) ──
  await openExample('.actrc');
  pass(await page.waitForSelector('#previewHost .actrc-doc', { timeout: 12000 }), '.actrc: actrc-doc shown');

  // ── standalone.conf viewer (Apache Pulsar broker config) ──
  await openExample('standalone.conf');
  pass(await page.waitForSelector('#previewHost .pulsarconf-doc', { timeout: 12000 }), 'standalone.conf: pulsarconf-doc shown');

  // ── .grype.yaml viewer ──
  await openExample('.grype.yaml');
  pass(await page.waitForSelector('#previewHost .grype-doc', { timeout: 12000 }), '.grype.yaml: grype-doc shown');

  // ── tetragon.yaml viewer ──
  await openExample('tetragon.yaml');
  pass(await page.waitForSelector('#previewHost .tetragon-doc', { timeout: 12000 }), 'tetragon.yaml: tetragon-doc shown');

  // ── mint.json viewer ──
  await openExample('mint.json');
  pass(await page.waitForSelector('#previewHost .mintlify-doc', { timeout: 12000 }), 'mint.json: mintlify-doc shown');

  // ── insomnia.yaml viewer ──
  await openExample('insomnia.yaml');
  pass(await page.waitForSelector('#previewHost .insomnia-doc', { timeout: 12000 }), 'insomnia.yaml: insomnia-doc shown');

  // ── kibana.yml viewer ──
  await openExample('kibana.yml');
  pass(await page.waitForSelector('#previewHost .kibana-doc', { timeout: 12000 }), 'kibana.yml: kibana-doc shown');

  // ── bruno.json viewer ──
  await openExample('bruno.json');
  pass(await page.waitForSelector('#previewHost .brunows-doc', { timeout: 12000 }), 'bruno.json: brunows-doc shown');

  // ── nix.conf viewer ──
  await openExample('nix.conf');
  pass(await page.waitForSelector('#previewHost .nixcfg-doc', { timeout: 12000 }), 'nix.conf: nixcfg-doc shown');

  // ── openapi-generator-config.yaml viewer ──
  await openExample('openapi-generator-config.yaml');
  pass(await page.waitForSelector('#previewHost .openapigen-doc', { timeout: 12000 }), 'openapi-generator-config.yaml: openapigen-doc shown');

  // ── cloudflared.yml viewer ──
  await openExample('cloudflared.yml');
  pass(await page.waitForSelector('#previewHost .cfd-doc', { timeout: 12000 }), 'cloudflared.yml: cfd-doc shown');

  // ── dnsmasq.conf viewer ──
  await openExample('dnsmasq.conf');
  pass(await page.waitForSelector('#previewHost .dnsmasq-doc', { timeout: 12000 }), 'dnsmasq.conf: dnsmasq-doc shown');

  // ── 01-netcfg.yaml viewer ──
  await openExample('01-netcfg.yaml');
  pass(await page.waitForSelector('#previewHost .netplan-doc', { timeout: 12000 }), '01-netcfg.yaml: netplan-doc shown');

  // ── syslog-ng.conf viewer ──
  await openExample('syslog-ng.conf');
  pass(await page.waitForSelector('#previewHost .syslogng-doc', { timeout: 12000 }), 'syslog-ng.conf: syslogng-doc shown');

  // ── frpc.toml viewer ──
  await openExample('frpc.toml');
  pass(await page.waitForSelector('#previewHost .frpc-doc', { timeout: 12000 }), 'frpc.toml: FRP client badge shown');

  // ── frps.toml viewer ──
  await openExample('frps.toml');
  pass(await page.waitForSelector('#previewHost .frps-doc', { timeout: 12000 }), 'frps.toml: FRP server badge shown');

  // ── vsftpd.conf viewer ──
  await openExample('vsftpd.conf');
  pass(await page.waitForSelector('#previewHost .vsf-doc', { timeout: 12000 }), 'vsftpd.conf: vsftpd badge shown');

  // ── proftpd.conf viewer ──
  await openExample('proftpd.conf');
  pass(await page.waitForSelector('#previewHost .prf-doc', { timeout: 12000 }), 'proftpd.conf: ProFTPD badge shown');

  // ── pdns.conf viewer ──
  await openExample('pdns.conf');
  pass(await page.waitForSelector('#previewHost .pdns-doc', { timeout: 12000 }), 'pdns.conf: PowerDNS badge shown');

  // ── recursor.conf viewer ──
  await openExample('recursor.conf');
  pass(await page.waitForSelector('#previewHost .rec-doc', { timeout: 12000 }), 'recursor.conf: PowerDNS Recursor badge shown');

  // ── starship.toml viewer ──
  await openExample('starship.toml');
  pass(await page.waitForSelector('#previewHost .starship-doc', { timeout: 12000 }), 'starship.toml: badge shown');
  const starshipText = await page.$eval('#previewHost .starship-doc', (el) => el.textContent);
  if (/Modules/.test(starshipText) && /character/.test(starshipText)) pass('starship.toml: modules section with character module shown'); else fail('starship.toml modules: ' + starshipText.slice(0, 200));

  // ── mosquitto.conf viewer ──
  await openExample('mosquitto.conf');
  pass(await page.waitForSelector('#previewHost .mosquitto-doc', { timeout: 12000 }), 'mosquitto.conf: badge shown');
  const mosquittoText = await page.$eval('#previewHost .mosquitto-doc', (el) => el.textContent);
  if (/1883/.test(mosquittoText) && /false/.test(mosquittoText)) pass('mosquitto.conf: listener port 1883 and allow_anonymous false shown'); else fail('mosquitto.conf listeners: ' + mosquittoText.slice(0, 200));

  // ── kamal.yml viewer ──
  await openExample('kamal.yml');
  pass(await page.waitForSelector('#previewHost .kamal-doc', { timeout: 12000 }), 'kamal.yml: kamal-doc shown');
  const kamalText = await page.$eval('#previewHost .kamal-doc', (e) => e.textContent);
  if (/myapp/i.test(kamalText)) pass('kamal.yml: service name shown'); else fail('kamal service: ' + kamalText.slice(0, 200));
  if (/configured/i.test(kamalText)) pass('kamal.yml: secrets masked as [configured]'); else fail('kamal secrets: ' + kamalText.slice(0, 200));
  if (/accessories|redis|postgres/i.test(kamalText)) pass('kamal.yml: accessories listed'); else fail('kamal accessories: ' + kamalText.slice(0, 200));

  // ── prefect.yaml viewer ──
  await openExample('prefect.yaml');
  pass(await page.waitForSelector('#previewHost .prefect-doc', { timeout: 12000 }), 'prefect.yaml: prefect-doc shown');
  const prefectText = await page.$eval('#previewHost .prefect-doc', (e) => e.textContent);
  if (/data-pipeline/i.test(prefectText)) pass('prefect.yaml: project name shown'); else fail('prefect project: ' + prefectText.slice(0, 200));
  if (/etl-daily|ml-training/i.test(prefectText)) pass('prefect.yaml: deployments listed'); else fail('prefect deployments: ' + prefectText.slice(0, 200));
  if (/cron/i.test(prefectText)) pass('prefect.yaml: schedules shown'); else fail('prefect schedules: ' + prefectText.slice(0, 200));

  // ── meltano.yml viewer ──
  await openExample('meltano.yml');
  pass(await page.waitForSelector('#previewHost .meltano-doc', { timeout: 12000 }), 'meltano.yml: badge shown');
  const meltanoText = await page.$eval('#previewHost .meltano-doc', (e) => e.textContent);
  if (/Meltano/i.test(meltanoText)) pass('meltano.yml: Meltano badge text shown'); else fail('meltano badge text: ' + meltanoText.slice(0, 200));
  if (/tap-github|tap-postgres/i.test(meltanoText)) pass('meltano.yml: extractors shown'); else fail('meltano extractors: ' + meltanoText.slice(0, 300));
  if (/target-postgres|target-jsonl/i.test(meltanoText)) pass('meltano.yml: loaders shown'); else fail('meltano loaders: ' + meltanoText.slice(0, 300));
  if (/daily-github-to-postgres|hourly-postgres-sync/i.test(meltanoText)) pass('meltano.yml: schedules shown'); else fail('meltano schedules: ' + meltanoText.slice(0, 300));

  // ── dagster.yaml viewer ──
  await openExample('dagster.yaml');
  pass(await page.waitForSelector('#previewHost .dagster-doc', { timeout: 12000 }), 'dagster.yaml: badge shown');
  const dagsterText = await page.$eval('#previewHost .dagster-doc', (e) => e.textContent);
  if (/Dagster/i.test(dagsterText)) pass('dagster.yaml: Dagster badge text shown'); else fail('dagster badge text: ' + dagsterText.slice(0, 200));
  if (/data_platform\.pipelines|pipelines/i.test(dagsterText)) pass('dagster.yaml: code location packages shown'); else fail('dagster packages: ' + dagsterText.slice(0, 300));
  if (/grpc.server|ml-dagster-grpc|ml-pipelines/i.test(dagsterText)) pass('dagster.yaml: gRPC server location shown'); else fail('dagster grpc: ' + dagsterText.slice(0, 300));
  if (/4 code location/i.test(dagsterText)) pass('dagster.yaml: location count shown'); else fail('dagster count: ' + dagsterText.slice(0, 300));

  // ── zabbix_agentd.conf viewer ──
  await openExample('zabbix_agentd.conf');
  pass(await page.waitForSelector('#previewHost .zabbix-doc', { timeout: 12000 }), 'zabbix_agentd.conf: badge shown');
  const zabbixText = await page.$eval('#previewHost .zabbix-doc', (el) => el.textContent);
  if (/Zabbix Agent/i.test(zabbixText)) pass('zabbix_agentd.conf: Agent type badge shown'); else fail('zabbix type: ' + zabbixText.slice(0, 200));
  if (/192\.168\.1\.100/.test(zabbixText)) pass('zabbix_agentd.conf: Server address shown'); else fail('zabbix server: ' + zabbixText.slice(0, 300));
  if (/web-frontend-01\.example\.com/.test(zabbixText)) pass('zabbix_agentd.conf: Hostname shown'); else fail('zabbix hostname: ' + zabbixText.slice(0, 300));
  if (/\[configured\]/.test(zabbixText)) pass('zabbix_agentd.conf: PSK values masked'); else fail('zabbix psk mask: ' + zabbixText.slice(0, 300));
  if (/5 user parameter/.test(zabbixText)) pass('zabbix_agentd.conf: UserParameter count shown'); else fail('zabbix userparams: ' + zabbixText.slice(0, 300));

  // ── ejabberd.yml viewer ──
  await openExample('ejabberd.yml');
  pass(await page.waitForSelector('#previewHost .ejabberd-doc', { timeout: 12000 }), 'ejabberd.yml: badge shown');
  const ejabberdText = await page.$eval('#previewHost .ejabberd-doc', (el) => el.textContent);
  if (/ejabberd/i.test(ejabberdText)) pass('ejabberd.yml: ejabberd badge shown'); else fail('ejabberd badge: ' + ejabberdText.slice(0, 200));
  if (/example\.com/.test(ejabberdText)) pass('ejabberd.yml: host shown'); else fail('ejabberd host: ' + ejabberdText.slice(0, 300));
  if (/5222|c2s/i.test(ejabberdText)) pass('ejabberd.yml: c2s listener shown'); else fail('ejabberd c2s: ' + ejabberdText.slice(0, 300));
  if (/\[configured\]/.test(ejabberdText)) pass('ejabberd.yml: SQL password masked'); else fail('ejabberd sql mask: ' + ejabberdText.slice(0, 300));

  // ── borgmatic.yaml viewer ──
  await openExample('borgmatic.yaml');
  pass(await page.waitForSelector('#previewHost .borgmatic-doc', { timeout: 12000 }), 'borgmatic.yaml: badge shown');
  const borgText = await page.$eval('#previewHost .borgmatic-doc', (el) => el.textContent);
  if (/\/home\/alice/.test(borgText) || /source.dir/i.test(borgText)) pass('borgmatic.yaml: source directories shown'); else fail('borgmatic: source dirs not shown: ' + borgText.replace(/\s+/g, ' ').slice(0, 120));
  if (/local-disk|offsite-ssh|repositories/i.test(borgText)) pass('borgmatic.yaml: repositories shown'); else fail('borgmatic: repos not shown: ' + borgText.replace(/\s+/g, ' ').slice(0, 120));
  if (/\[configured\]/.test(borgText)) pass('borgmatic.yaml: encryption_passphrase masked'); else fail('borgmatic: passphrase not masked: ' + borgText.replace(/\s+/g, ' ').slice(0, 120));

  // ── suricata.yaml viewer ──
  await openExample('suricata.yaml');
  pass(await page.waitForSelector('#previewHost .suricata-doc', { timeout: 12000 }), 'suricata.yaml: badge shown');
  const surText = await page.$eval('#previewHost .suricata-doc', (el) => el.textContent);
  if (/HOME_NET/i.test(surText)) pass('suricata.yaml: HOME_NET variable shown'); else fail('suricata: HOME_NET not shown: ' + surText.replace(/\s+/g, ' ').slice(0, 120));
  if (/eth0/.test(surText)) pass('suricata.yaml: capture interface shown'); else fail('suricata: interface not shown: ' + surText.replace(/\s+/g, ' ').slice(0, 120));
  if (/rule.fil/i.test(surText) || /suricata\.rules/.test(surText)) pass('suricata.yaml: rule files shown'); else fail('suricata: rule files not shown: ' + surText.replace(/\s+/g, ' ').slice(0, 120));

  // ── waybar-config.json viewer ──
  await openExample('waybar-config.json');
  pass(await page.waitForSelector('#previewHost .waybar-doc', { timeout: 12000 }), 'waybar-config.json: waybar-doc shown');
  const waybarText = await page.$eval('#previewHost .waybar-doc', (el) => el.textContent);
  if (/Waybar/i.test(waybarText)) pass('waybar-config.json: Waybar badge shown'); else fail('waybar badge: ' + waybarText.slice(0, 200));
  if (/clock|cpu|battery/i.test(waybarText)) pass('waybar-config.json: module names shown'); else fail('waybar modules: ' + waybarText.slice(0, 300));
  if (/modules-left|modules-center|modules-right|left|center|right/i.test(waybarText)) pass('waybar-config.json: layout sections shown'); else fail('waybar layout: ' + waybarText.slice(0, 300));

  // ── netbird.json viewer ──
  await openExample('netbird.json');
  pass(await page.waitForSelector('#previewHost .netbird-doc', { timeout: 12000 }), 'netbird.json: netbird-doc shown');
  const netbirdText = await page.$eval('#previewHost .netbird-doc', (el) => el.textContent);
  if (/NetBird/i.test(netbirdText)) pass('netbird.json: NetBird badge shown'); else fail('netbird badge: ' + netbirdText.slice(0, 200));
  if (/netbird\.io/.test(netbirdText)) pass('netbird.json: management URL shown'); else fail('netbird url: ' + netbirdText.slice(0, 300));
  if (/\[configured\]/.test(netbirdText)) pass('netbird.json: private key masked as [configured]'); else fail('netbird key mask: ' + netbirdText.slice(0, 300));

  // ── tailscale-acl.hujson viewer ──
  await openExample('tailscale-acl.hujson');
  pass(await page.waitForSelector('#previewHost .tailscale-acl-doc', { timeout: 12000 }), 'tailscale-acl.hujson: badge shown');
  const tsAclText = await page.$eval('#previewHost .tailscale-acl-doc', (el) => el.textContent);
  if (/Tailscale/i.test(tsAclText)) pass('tailscale-acl.hujson: Tailscale badge shown'); else fail('tailscale badge: ' + tsAclText.slice(0, 200));
  if (/group:dev|group:ops/i.test(tsAclText)) pass('tailscale-acl.hujson: groups shown'); else fail('tailscale groups: ' + tsAclText.slice(0, 300));
  if (/accept/i.test(tsAclText)) pass('tailscale-acl.hujson: accept rules shown'); else fail('tailscale accept: ' + tsAclText.slice(0, 300));
  if (/accept rules present/i.test(tsAclText)) pass('tailscale-acl.hujson: accept-rules-present status shown'); else fail('tailscale accept status: ' + tsAclText.slice(0, 300));

  // ── headscale-config.yaml viewer ──
  await openExample('headscale-config.yaml (Headscale)');
  pass(await page.waitForSelector('#previewHost .hscale-doc', { timeout: 12000 }), 'headscale-config.yaml: badge shown');
  const hscaleText = await page.$eval('#previewHost .hscale-doc', (el) => el.textContent);
  if (/Headscale/i.test(hscaleText)) pass('headscale-config.yaml: Headscale badge shown'); else fail('headscale badge: ' + hscaleText.slice(0, 200));
  if (/headscale\.example\.com/.test(hscaleText)) pass('headscale-config.yaml: server_url shown'); else fail('headscale server_url: ' + hscaleText.slice(0, 300));
  if (/100\.64\.0\.0|fd7a/.test(hscaleText)) pass('headscale-config.yaml: IP prefixes shown'); else fail('headscale ip_prefixes: ' + hscaleText.slice(0, 300));
  if (/sqlite3|sqlite/.test(hscaleText)) pass('headscale-config.yaml: db_type shown'); else fail('headscale db_type: ' + hscaleText.slice(0, 300));
  if (/private\.key|noise_private/.test(hscaleText)) pass('headscale-config.yaml: private key paths shown'); else fail('headscale key paths: ' + hscaleText.slice(0, 300));

  // ── headscale.yaml viewer ──
  await openExample('Headscale Config');
  pass(await page.waitForSelector('#previewHost .hscale-doc', { timeout: 12000 }), 'headscale.yaml: Headscale badge shown');

  // ── pihole-setupVars.conf viewer ──
  await openExample('setupVars.conf (Pi-hole)');
  pass(await page.waitForSelector('#previewHost .pihole-doc', { timeout: 12000 }), 'pihole-setupVars.conf: badge shown');
  const piholeText = await page.$eval('#previewHost .pihole-doc', (el) => el.textContent);
  if (/Pi-hole/i.test(piholeText)) pass('pihole-setupVars.conf: Pi-hole badge shown'); else fail('pihole badge: ' + piholeText.slice(0, 200));
  if (/8\.8\.8\.8|1\.1\.1\.1/.test(piholeText)) pass('pihole-setupVars.conf: upstream DNS servers shown'); else fail('pihole dns: ' + piholeText.slice(0, 300));
  if (/eth0/.test(piholeText)) pass('pihole-setupVars.conf: interface shown'); else fail('pihole interface: ' + piholeText.slice(0, 300));
  if (/\[configured\]/.test(piholeText)) pass('pihole-setupVars.conf: WEBPASSWORD masked'); else fail('pihole webpassword: ' + piholeText.slice(0, 300));

  // ── corosync.conf viewer ──
  await openExample('corosync.conf');
  pass(await page.waitForSelector('#previewHost .corosync-doc', { timeout: 12000 }), 'corosync.conf: badge shown');
  const corosyncText = await page.$eval('#previewHost .corosync-doc', (el) => el.textContent);
  if (/ha-cluster/i.test(corosyncText)) pass('corosync.conf: cluster_name extracted'); else fail('corosync.conf: missing cluster_name, got: ' + corosyncText.slice(0, 200));
  if (/node/i.test(corosyncText) && (/nodeid|node id|node list/i.test(corosyncText))) pass('corosync.conf: node list section shown'); else fail('corosync.conf: missing node list: ' + corosyncText.slice(0, 300));
  if (/quorum/i.test(corosyncText)) pass('corosync.conf: quorum section shown'); else fail('corosync.conf: missing quorum section');

  // ── config.nu viewer ──
  await openExample('config.nu');
  pass(await page.waitForSelector('#previewHost .nushell-doc', { timeout: 12000 }), 'config.nu: badge shown');
  const nuText = await page.$eval('#previewHost .nushell-doc', (el) => el.textContent);
  if (/vi/i.test(nuText)) pass('config.nu: edit_mode extracted'); else fail('config.nu: missing edit_mode, got: ' + nuText.slice(0, 200));
  if (/custom command/i.test(nuText)) pass('config.nu: custom commands counted'); else fail('config.nu: missing custom command count: ' + nuText.slice(0, 300));
  if (/alias/i.test(nuText)) pass('config.nu: aliases section shown'); else fail('config.nu: missing aliases section');

  // ── graylog.conf viewer ──
  await openExample('graylog.conf');
  pass(await page.waitForSelector('#previewHost .graylog-doc', { timeout: 12000 }), 'graylog.conf: badge shown');
  const graylogText = await page.$eval('#previewHost .graylog-doc', (el) => el.textContent);
  if (/Graylog/i.test(graylogText)) pass('graylog.conf: Graylog badge shown'); else fail('graylog badge: ' + graylogText.slice(0, 200));
  if (/master/i.test(graylogText)) pass('graylog.conf: is_master chip shown'); else fail('graylog is_master: ' + graylogText.slice(0, 300));
  if (/localhost:9200/.test(graylogText)) pass('graylog.conf: Elasticsearch host shown'); else fail('graylog elasticsearch: ' + graylogText.slice(0, 300));
  if (/\[configured\]/.test(graylogText)) pass('graylog.conf: secrets masked'); else fail('graylog secrets: ' + graylogText.slice(0, 300));

  // ── odoo.conf viewer ──
  await openExample('odoo.conf');
  pass(await page.waitForSelector('#previewHost .odoo-doc', { timeout: 12000 }), 'odoo.conf: badge shown');
  const odooText = await page.$eval('#previewHost .odoo-doc', (el) => el.textContent);
  if (/Odoo/i.test(odooText)) pass('odoo.conf: Odoo badge shown'); else fail('odoo badge: ' + odooText.slice(0, 200));
  if (/8069/.test(odooText)) pass('odoo.conf: xmlrpc_port shown'); else fail('odoo port: ' + odooText.slice(0, 300));
  if (/workers/.test(odooText)) pass('odoo.conf: workers setting shown'); else fail('odoo workers: ' + odooText.slice(0, 300));
  if (/\[configured\]/.test(odooText)) pass('odoo.conf: secrets masked'); else fail('odoo secrets: ' + odooText.slice(0, 300));
}
