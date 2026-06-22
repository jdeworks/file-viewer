// Auto-split slice 14/18 of the known-files smoke area (see ./../known-files.mjs).
// Covers: miniflux.conf … joplin.env.
// Called in order on the shared ctx — keep openExample order intact; no cross-file state.
export async function run(ctx) {
  const { page, origin, frameOf, pass, fail, openExample } = ctx;

  // ── miniflux.conf viewer ──
  await openExample('miniflux.conf');
  pass(await page.waitForSelector('#previewHost .mflux-doc', { timeout: 12000 }), 'miniflux.conf: badge shown');
  const mfluxText = await page.$eval('#previewHost .mflux-doc', (el) => el.textContent);
  if (/Miniflux/i.test(mfluxText)) pass('miniflux.conf: Miniflux badge shown'); else fail('miniflux badge: ' + mfluxText.slice(0, 200));
  if (/LISTEN_ADDR|BASE_URL/.test(mfluxText)) pass('miniflux.conf: server settings shown'); else fail('miniflux server: ' + mfluxText.slice(0, 300));
  if (/\[configured\]/.test(mfluxText)) pass('miniflux.conf: secrets masked'); else fail('miniflux secrets: ' + mfluxText.slice(0, 300));

  // ── config.production.json (Ghost) viewer ──
  await openExample('config.production.json (Ghost)');
  pass(await page.waitForSelector('#previewHost .ghost-doc', { timeout: 12000 }), 'config.production.json: Ghost badge shown');
  const ghostText = await page.$eval('#previewHost .ghost-doc', (el) => el.textContent);
  if (/Ghost/i.test(ghostText)) pass('config.production.json: Ghost badge shown in text'); else fail('ghost badge: ' + ghostText.slice(0, 200));
  if (/blog\.example\.com|127\.0\.0\.1/.test(ghostText)) pass('config.production.json: server info shown'); else fail('ghost server: ' + ghostText.slice(0, 300));
  if (/\[configured\]/.test(ghostText)) pass('config.production.json: secrets masked'); else fail('ghost secrets: ' + ghostText.slice(0, 300));

  // ── gotosocial-config.yaml viewer ──
  await openExample('gotosocial-config.yaml');
  pass(await page.waitForSelector('#previewHost .gts-doc', { timeout: 12000 }), 'gotosocial-config.yaml: GoToSocial badge shown');
  const gtsText = await page.$eval('#previewHost .gts-doc', (el) => el.textContent);
  if (/GoToSocial/i.test(gtsText)) pass('gotosocial-config.yaml: GoToSocial badge shown in text'); else fail('gotosocial badge: ' + gtsText.slice(0, 200));
  if (/social\.example\.org/.test(gtsText)) pass('gotosocial-config.yaml: host shown'); else fail('gotosocial host: ' + gtsText.slice(0, 300));
  if (/\[configured\]/.test(gtsText)) pass('gotosocial-config.yaml: secrets masked'); else fail('gotosocial secrets: ' + gtsText.slice(0, 300));

  // ── searxng-settings.yml viewer ──
  await openExample('searxng-settings.yml');
  pass(await page.waitForSelector('#previewHost .sxng-doc', { timeout: 12000 }), 'searxng-settings.yml: SearXNG badge shown');
  const sxngText = await page.$eval('#previewHost .sxng-doc', (el) => el.textContent);
  if (/SearXNG/i.test(sxngText)) pass('searxng-settings.yml: SearXNG badge shown in text'); else fail('searxng badge: ' + sxngText.slice(0, 200));
  if (/My SearXNG/.test(sxngText)) pass('searxng-settings.yml: instance_name shown'); else fail('searxng instance: ' + sxngText.slice(0, 300));
  if (/\[configured\]/.test(sxngText)) pass('searxng-settings.yml: secrets masked'); else fail('searxng secrets: ' + sxngText.slice(0, 300));

  // ── crowdsec-config.yaml viewer ──
  await openExample('crowdsec-config.yaml (CrowdSec Config)');
  pass(await page.waitForSelector('#previewHost .csec-doc', { timeout: 12000 }), 'crowdsec-config.yaml: CrowdSec badge shown');

  // ── acquis.yaml (CrowdSec acquis) viewer ──
  await openExample('acquis.yaml (CrowdSec Acquis)');
  pass(await page.waitForSelector('#previewHost .caquis-doc', { timeout: 12000 }), 'acquis.yaml: CrowdSec acquis badge shown');

  // ── homer.yml viewer ──
  await openExample('homer.yml');
  pass(await page.waitForSelector('#previewHost .homer-doc', { timeout: 12000 }), 'homer.yml: Homer badge shown');
  const homerText = await page.$eval('#previewHost .homer-doc', (el) => el.textContent);
  if (/Homer/i.test(homerText)) pass('homer.yml: Homer badge shown in text'); else fail('homer badge: ' + homerText.slice(0, 200));
  if (/HomeLab Dashboard|My HomeLab/.test(homerText)) pass('homer.yml: title shown'); else fail('homer title: ' + homerText.slice(0, 300));
  if (/Monitoring|Infrastructure/.test(homerText)) pass('homer.yml: service groups shown'); else fail('homer services: ' + homerText.slice(0, 300));

  // ── uptime-kuma.json viewer ──
  await openExample('uptime-kuma.json');
  pass(await page.waitForSelector('#previewHost .ukuma-doc', { timeout: 12000 }), 'uptime-kuma.json: Uptime Kuma badge shown');
  const ukumaText = await page.$eval('#previewHost .ukuma-doc', (el) => el.textContent);
  if (/Uptime Kuma/i.test(ukumaText)) pass('uptime-kuma.json: Uptime Kuma badge shown in text'); else fail('ukuma badge: ' + ukumaText.slice(0, 200));
  if (/3001/.test(ukumaText)) pass('uptime-kuma.json: port shown'); else fail('ukuma port: ' + ukumaText.slice(0, 300));
  if (/0\.0\.0\.0/.test(ukumaText)) pass('uptime-kuma.json: hostname shown'); else fail('ukuma hostname: ' + ukumaText.slice(0, 300));

  // ── photoprism-options.yml viewer ──
  await openExample('photoprism-options.yml');
  pass(await page.waitForSelector('#previewHost .pprism-doc', { timeout: 12000 }), 'photoprism-options.yml: PhotoPrism badge shown');

  // ── paperless.conf viewer ──
  await openExample('paperless.conf');
  pass(await page.waitForSelector('#previewHost .plngx-doc', { timeout: 12000 }), 'paperless.conf: Paperless-ngx badge shown');

  // ── mealie.env viewer ──
  await openExample('mealie.env');
  pass(await page.waitForSelector('#previewHost .mealie-doc', { timeout: 12000 }), 'mealie.env: Mealie badge shown');

  // ── immich.env viewer ──
  await openExample('immich.env');
  pass(await page.waitForSelector('#previewHost .immich-doc', { timeout: 12000 }), 'immich.env: Immich badge shown');

  // ── minio.env viewer ──
  await openExample('minio.env');
  pass(await page.waitForSelector('#previewHost .minio-doc', { timeout: 12000 }), 'minio.env: MinIO badge shown');

  // ── bookstack.env viewer ──
  await openExample('bookstack.env');
  pass(await page.waitForSelector('#previewHost .bstack-doc', { timeout: 12000 }), 'bookstack.env: BookStack badge shown');

  // ── mattermost-config.json viewer ──
  await openExample('mattermost-config.json');
  pass(await page.waitForSelector('#previewHost .mm-doc', { timeout: 12000 }), 'mattermost-config.json: Mattermost badge shown');

  // ── netbox-configuration.py viewer ──
  await openExample('netbox-configuration.py');
  pass(await page.waitForSelector('#previewHost .nbox-doc', { timeout: 12000 }), 'netbox-configuration.py: NetBox badge shown');

  // ── vaultwarden.env viewer ──
  await openExample('vaultwarden.env');
  pass(await page.waitForSelector('#previewHost .vwarden-doc', { timeout: 12000 }), 'vaultwarden.env: Vaultwarden badge shown');

  // ── ntfy-server.yml viewer ──
  await openExample('ntfy-server.yml');
  pass(await page.waitForSelector('#previewHost .ntfy-doc', { timeout: 12000 }), 'ntfy-server.yml: ntfy badge shown');

  // ── wakapi.yml viewer ──
  await openExample('wakapi.yml');
  pass(await page.waitForSelector('#previewHost .wkapi-doc', { timeout: 12000 }), 'wakapi.yml: Wakapi badge shown');

  // ── outline.env viewer ──
  await openExample('outline.env');
  pass(await page.waitForSelector('#previewHost .outline-doc', { timeout: 12000 }), 'outline.env: Outline badge shown');

  // ── linkding.env viewer ──
  await openExample('linkding.env');
  pass(await page.waitForSelector('#previewHost .ldng-doc', { timeout: 12000 }), 'linkding.env: Linkding badge shown');

  // ── plausible.env viewer ──
  await openExample('plausible.env');
  pass(await page.waitForSelector('#previewHost .plsbl-doc', { timeout: 12000 }), 'plausible.env: Plausible badge shown');
  const plausibleText = await page.$eval('#previewHost .plsbl-doc', (el) => el.textContent);
  if (/Plausible/i.test(plausibleText)) pass('plausible.env: Plausible badge shown'); else fail('plausible badge: ' + plausibleText.slice(0, 200));
  if (/\[configured\]/.test(plausibleText)) pass('plausible.env: secrets masked'); else fail('plausible secrets: ' + plausibleText.slice(0, 300));
  if (/invite_only/.test(plausibleText)) pass('plausible.env: invite_only registration chip shown'); else fail('plausible invite_only: ' + plausibleText.slice(0, 300));

  // ── umami.env viewer ──
  await openExample('umami.env');
  pass(await page.waitForSelector('#previewHost .umami-doc', { timeout: 12000 }), 'umami.env: Umami badge shown');

  // ── stirling-pdf-settings.yml viewer ──
  await openExample('stirling-pdf-settings.yml');
  await page.waitForSelector('#previewHost .spdf-doc', { timeout: 12000 });
  pass('stirling-pdf-settings.yml: Stirling-PDF badge shown');

  // ── authentik.env viewer ──
  await openExample('Authentik Config');
  await page.waitForSelector('#previewHost .authentik-doc', { timeout: 12000 });
  pass('authentik.env: Authentik badge shown');

  // ── monica.env viewer ──
  await openExample('monica.env');
  pass(await page.waitForSelector('#previewHost .monica-doc', { timeout: 12000 }), 'monica.env: Monica CRM badge shown');

  // ── n8n.env viewer ──
  await openExample('n8n.env');
  pass(await page.waitForSelector('#previewHost .n8n-doc', { timeout: 12000 }), 'n8n.env: n8n badge shown');

  // ── nocodb.env viewer ──
  await openExample('nocodb.env');
  pass(await page.waitForSelector('#previewHost .noco-doc', { timeout: 12000 }), 'nocodb.env: NocoDB badge shown');

  // ── plane.env viewer ──
  await openExample('plane.env');
  pass(await page.waitForSelector('#previewHost .plane-doc', { timeout: 12000 }), 'plane.env: Plane badge shown');

  // ── infisical.env viewer ──
  await openExample('infisical.env');
  pass(await page.waitForSelector('#previewHost .infsc-doc', { timeout: 12000 }), 'infisical.env: Infisical badge shown');

  // ── vikunja.yml viewer ──
  await openExample('vikunja.yml');
  pass(await page.waitForSelector('#previewHost .vkunja-doc', { timeout: 12000 }), 'vikunja.yml: Vikunja badge shown');

  // ── appsmith.env viewer ──
  await openExample('appsmith.env');
  pass(await page.waitForSelector('#previewHost .appsm-doc', { timeout: 12000 }), 'appsmith.env: Appsmith badge shown');

  // ── hoppscotch.env viewer ──
  await openExample('hoppscotch.env');
  pass(await page.waitForSelector('#previewHost .hopp-doc', { timeout: 12000 }), 'hoppscotch.env: Hoppscotch badge shown');

  // ── twenty.env viewer ──
  await openExample('twenty.env');
  pass(await page.waitForSelector('#previewHost .twenty-doc', { timeout: 12000 }), 'twenty.env: Twenty CRM badge shown');

  // ── glitchtip.env viewer ──
  await openExample('glitchtip.env');
  pass(await page.waitForSelector('#previewHost .gtip-doc', { timeout: 12000 }), 'glitchtip.env: GlitchTip badge shown');

  // ── ArchiveBox.conf viewer ──
  await openExample('ArchiveBox.conf');
  pass(await page.waitForSelector('#previewHost .abox-doc', { timeout: 12000 }), 'ArchiveBox.conf: ArchiveBox badge shown');

  // ── dex.yaml viewer ──
  await openExample('dex.yaml');
  pass(await page.waitForSelector('#previewHost .dex-doc', { timeout: 12000 }), 'dex.yaml: Dex OIDC badge shown');

  // ── lldap_config.toml viewer ──
  await openExample('lldap_config.toml');
  pass(await page.waitForSelector('#previewHost .lldap-doc', { timeout: 12000 }), 'lldap_config.toml: LLDAP badge shown');

  // ── listmonk-config.toml viewer ──
  await openExample('listmonk-config.toml');
  pass(await page.waitForSelector('#previewHost .lmonk-doc', { timeout: 12000 }), 'listmonk-config.toml: Listmonk badge shown');

  // ── windmill.env viewer ──
  await openExample('windmill.env');
  pass(await page.waitForSelector('#previewHost .wmill-doc', { timeout: 12000 }), 'windmill.env: Windmill badge shown');

  // ── komga.yml viewer ──
  await openExample('komga.yml');
  pass(await page.waitForSelector('#previewHost .komga-doc', { timeout: 12000 }), 'komga.yml: Komga badge shown');

  // ── coder.env viewer ──
  await openExample('coder.env');
  pass(await page.waitForSelector('#previewHost .coder-doc', { timeout: 12000 }), 'coder.env: Coder badge shown');

  // ── cal-com.env viewer ──
  await openExample('cal-com.env');
  pass(await page.waitForSelector('#previewHost .calcom-doc', { timeout: 12000 }), 'cal-com.env: Cal.com badge shown');

  // ── rallly.env viewer ──
  await openExample('rallly.env');
  pass(await page.waitForSelector('#previewHost .rallly-doc', { timeout: 12000 }), 'rallly.env: Rallly badge shown');

  // ── woodpecker-agent.env viewer ──
  await openExample('woodpecker-agent.env');
  pass(await page.waitForSelector('#previewHost .wpcagent-doc', { timeout: 12000 }), 'woodpecker-agent.env: Woodpecker CI badge shown');

  // ── act_runner.yaml viewer ──
  await openExample('act_runner.yaml');
  pass(await page.waitForSelector('#previewHost .actrunner-doc', { timeout: 12000 }), 'act_runner.yaml: Act Runner badge shown');

  // ── vaultwarden.env viewer (vaultwarden-config) ──
  await openExample('vaultwarden.env');
  pass(await page.waitForSelector('#previewHost .vwarden-doc', { timeout: 12000 }), 'vaultwarden.env: Vaultwarden badge shown');

  // ── keycloak.conf viewer (keycloak-config) ──
  await openExample('keycloak.conf');
  pass(await page.waitForSelector('#previewHost .kc-doc', { timeout: 12000 }), 'keycloak.conf: Keycloak badge shown');

  // ── filebrowser.json viewer ──
  await openExample('filebrowser.json');
  pass(await page.waitForSelector('#previewHost .fbrowser-doc', { timeout: 12000 }), 'filebrowser.json: File Browser badge shown');

  // ── bookstack.env viewer (bookstack-config) ──
  await openExample('bookstack.env');
  await page.waitForSelector('#previewHost .bstack-doc', { timeout: 12000 });
  pass('bookstack.env: BookStack badge shown');

  // ── harbor.yml viewer (harbor-config) ──
  await openExample('harbor.yml');
  await page.waitForSelector('#previewHost .harbor-doc', { timeout: 12000 });
  pass('harbor.yml: Harbor badge shown');

  // ── drone.env viewer (drone-config) ──
  await openExample('drone.env');
  await page.waitForSelector('#previewHost .droneci-doc', { timeout: 12000 });
  pass('drone.env: Drone CI badge shown');

  // ── sftpgo.json viewer (sftpgo-config) ──
  await openExample('sftpgo.json');
  await page.waitForSelector('#previewHost .sftpgo-doc', { timeout: 12000 });
  pass('sftpgo.json: SFTPGo badge shown');

  // ── invidious-config.yml viewer ──
  await openExample('invidious-config.yml');
  await page.waitForSelector('#previewHost .invidious-doc', { timeout: 12000 });
  pass('invidious-config.yml: Invidious badge shown');

  // ── sonar.properties viewer (sonarqube-config) ──
  await openExample('sonar.properties');
  await page.waitForSelector('#previewHost .sonarqube-doc', { timeout: 12000 });
  pass('sonar.properties: SonarQube badge shown');

  // ── concourse.env viewer (concourse-config) ──
  await openExample('concourse.env');
  await page.waitForSelector('#previewHost .concourse-doc', { timeout: 12000 });
  pass('concourse.env: Concourse CI badge shown');

  // ── invoiceninja.env viewer ──
  await openExample('invoiceninja.env');
  await page.waitForSelector('#previewHost .invninja-doc', { timeout: 12000 });
  pass('invoiceninja.env: Invoice Ninja badge shown');

  // ── conduit.toml viewer (conduit-config) ──
  await openExample('conduit.toml');
  await page.waitForSelector('#previewHost .conduit-doc', { timeout: 12000 });
  pass('conduit.toml: Conduit badge shown');

  // ── zitadel.yaml viewer (zitadel-config) ──
  await openExample('zitadel.yaml');
  await page.waitForSelector('#previewHost .zitadel-doc', { timeout: 12000 });
  pass('zitadel.yaml: ZITADEL badge shown');

  // ── influxdb.yml viewer (influxdb-config) ──
  await openExample('influxdb.yml');
  await page.waitForSelector('#previewHost .influxdb-doc', { timeout: 12000 });
  pass('influxdb.yml: InfluxDB badge shown');

  // ── dendrite.yaml viewer (dendrite-config) ──
  await openExample('dendrite.yaml');
  await page.waitForSelector('#previewHost .dendrite-doc', { timeout: 12000 });
  pass('dendrite.yaml: Dendrite badge shown');

  // ── watchtower.env viewer (watchtower-config) ──
  await openExample('watchtower.env');
  await page.waitForSelector('#previewHost .wtower-doc', { timeout: 12000 });
  pass('watchtower.env: Watchtower badge shown');

  // ── diun.yaml viewer (diun-config) ──
  await openExample('diun.yaml');
  await page.waitForSelector('#previewHost .diun-doc', { timeout: 12000 });
  pass('diun.yaml: Diun badge shown');

  // ── changedetection.env viewer (changedetection-config) ──
  await openExample('changedetection.env');
  await page.waitForSelector('#previewHost .chgdet-doc', { timeout: 12000 });
  pass('changedetection.env: changedetection.io badge shown');

  // ── semaphore-config.json viewer (semaphore-config) ──
  await openExample('semaphore-config.json');
  await page.waitForSelector('#previewHost .semaphore-doc', { timeout: 12000 });
  pass('semaphore-config.json: Semaphore badge shown');

  // ── actual-config.json viewer (actual-budget-config) ──
  await openExample('actual-config.json');
  await page.waitForSelector('#previewHost .actualbudget-doc', { timeout: 12000 });
  pass('actual-config.json: Actual Budget badge shown');

  // ── wallos.env viewer (wallos-config) ──
  await openExample('wallos.env');
  await page.waitForSelector('#previewHost .wallos-doc', { timeout: 12000 });
  pass('wallos.env: Wallos badge shown');

  // ── grist.env viewer (grist-config) ──
  await openExample('grist.env');
  await page.waitForSelector('#previewHost .grist-doc', { timeout: 12000 });
  pass('grist.env: Grist badge shown');

  // ── open-webui.env viewer (open-webui-config) ──
  await openExample('open-webui.env');
  await page.waitForSelector('#previewHost .openwebui-doc', { timeout: 12000 });
  pass('open-webui.env: Open WebUI badge shown');

  // ── maybe.env viewer (maybe-config) ──
  await openExample('maybe.env');
  await page.waitForSelector('#previewHost .maybe-doc', { timeout: 12000 });
  pass('maybe.env: Maybe badge shown');

  // ── netdata.conf viewer (netdata-config) ──
  await openExample('netdata.conf');
  await page.waitForSelector('#previewHost .netdata-doc', { timeout: 12000 });
  pass('netdata.conf: Netdata badge shown');

  // ── pocket-id.env viewer (pocket-id-config) ──
  await openExample('pocket-id.env');
  await page.waitForSelector('#previewHost .pocketid-doc', { timeout: 12000 });
  pass('pocket-id.env: Pocket ID badge shown');

  // ── nzbget.conf viewer (nzbget-config) ──
  await openExample('nzbget.conf');
  await page.waitForSelector('#previewHost .nzbget-doc', { timeout: 12000 });
  pass('nzbget.conf: NZBGet badge shown');

  // ── sabnzbd.ini viewer (sabnzbd-config) ──
  await openExample('sabnzbd.ini');
  await page.waitForSelector('#previewHost .sabnzbd-doc', { timeout: 12000 });
  pass('sabnzbd.ini: SABnzbd badge shown');

  // ── joplin.env viewer (joplin-server-config) ──
  await openExample('joplin.env');
  await page.waitForSelector('#previewHost .joplin-doc', { timeout: 12000 });
  pass('joplin.env: Joplin Server badge shown');
}
