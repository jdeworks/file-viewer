// Auto-split slice 09/18 of the known-files smoke area (see ./../known-files.mjs).
// Covers: nuget.config … gradle.properties.
// Called in order on the shared ctx — keep openExample order intact; no cross-file state.
export async function run(ctx) {
  const { page, origin, frameOf, pass, fail, openExample } = ctx;

  // nuget-config viewer
  await openExample('nuget.config');
  await page.waitForSelector('#previewHost .nugetcfg-doc', { timeout: 12000 });
  pass('nuget.config: renders');
  const nugetText = await page.$eval('#previewHost .nugetcfg-doc', (e) => e.textContent);
  if (/NuGet/i.test(nugetText)) pass('nuget.config: NuGet badge shown'); else fail('nuget badge: ' + nugetText.slice(0, 200));
  if (/nuget\.org/i.test(nugetText)) pass('nuget.config: nuget.org source listed'); else fail('nuget source: ' + nugetText.slice(0, 300));
  if (/MyCompany Feed|dev\.azure\.com/i.test(nugetText)) pass('nuget.config: private feed source listed'); else fail('nuget private: ' + nugetText.slice(0, 300));
  if (/clears inherited sources|globalPackagesFolder/i.test(nugetText)) pass('nuget.config: config options or clear flag shown'); else fail('nuget opts: ' + nugetText.slice(0, 300));

  // Directory.Build.props viewer
  await openExample('Directory.Build.props');
  await page.waitForSelector('#previewHost .db-doc', { timeout: 12000 });
  const dbPropsText = await page.$eval('#previewHost .db-doc', (e) => e.textContent);
  if (/MSBuild/i.test(dbPropsText)) pass('Directory.Build.props: MSBuild badge shown'); else fail('db badge: ' + dbPropsText.slice(0, 200));
  if (/LangVersion|Nullable|TreatWarningsAsErrors/i.test(dbPropsText)) pass('Directory.Build.props: well-known properties shown'); else fail('db props: ' + dbPropsText.slice(0, 300));
  if (/ManagePackageVersionsCentrally/i.test(dbPropsText)) pass('Directory.Build.props: CPM property shown'); else fail('db cpm: ' + dbPropsText.slice(0, 300));
  if (/Microsoft\.SourceLink/i.test(dbPropsText)) pass('Directory.Build.props: package reference shown'); else fail('db pkgref: ' + dbPropsText.slice(0, 300));

  // msbuild-props viewer (Common.props)
  await openExample('Common.props (MSBuild)');
  await page.waitForSelector('#previewHost .mb-doc', { timeout: 12000 });
  const mbPropsText = await page.$eval('#previewHost .mb-doc', (e) => e.textContent);
  if (/MSBuild/i.test(mbPropsText)) pass('Common.props: MSBuild badge shown'); else fail('mb badge: ' + mbPropsText.slice(0, 200));
  if (/LangVersion|Nullable|TreatWarningsAsErrors/i.test(mbPropsText)) pass('Common.props: properties shown'); else fail('mb props: ' + mbPropsText.slice(0, 300));
  if (/Newtonsoft\.Json|Microsoft\.Extensions\.Logging/i.test(mbPropsText)) pass('Common.props: package versions listed'); else fail('mb pkgvers: ' + mbPropsText.slice(0, 300));
  if (/PrintBuildInfo/i.test(mbPropsText)) pass('Common.props: target element shown'); else fail('mb targets: ' + mbPropsText.slice(0, 300));
  if (/Custom\.targets/i.test(mbPropsText)) pass('Common.props: import element shown'); else fail('mb imports: ' + mbPropsText.slice(0, 300));

  // ── wireguard-conf viewer ──
  await openExample('wg0.conf');
  await page.waitForSelector('#previewHost .wg-doc', { timeout: 12000 });
  const wgText = await page.$eval('#previewHost .wg-doc', (e) => e.textContent);
  if (/WireGuard/i.test(wgText)) pass('wg0.conf: badge shown'); else fail('wireguard badge: ' + wgText.slice(0, 200));
  if (/redacted/i.test(wgText)) pass('wg0.conf: private key redacted'); else fail('wireguard key: ' + wgText.slice(0, 300));
  if (/Peer|AllowedIPs/i.test(wgText)) pass('wg0.conf: peers shown'); else fail('wireguard peers: ' + wgText.slice(0, 300));

  // ── openvpn-config viewer ──
  await openExample('client.ovpn');
  await page.waitForSelector('#previewHost .ovpn-doc', { timeout: 12000 });
  const ovpnText = await page.$eval('#previewHost .ovpn-doc', (e) => e.textContent);
  if (/OpenVPN/i.test(ovpnText)) pass('client.ovpn: badge shown'); else fail('openvpn badge: ' + ovpnText.slice(0, 200));
  if (/vpn\.example\.com|remote/i.test(ovpnText)) pass('client.ovpn: remote shown'); else fail('openvpn remote: ' + ovpnText.slice(0, 300));
  if (/embedded|private key/i.test(ovpnText)) pass('client.ovpn: embedded keys noted'); else fail('openvpn keys: ' + ovpnText.slice(0, 300));

  // ── shell-rc viewer ──
  await openExample('.bashrc');
  await page.waitForSelector('#previewHost .shrc-doc', { timeout: 12000 });
  const shrcText = await page.$eval('#previewHost .shrc-doc', (e) => e.textContent);
  if (/Shell Config/i.test(shrcText)) pass('.bashrc: badge shown'); else fail('shell-rc badge: ' + shrcText.slice(0, 200));
  if (/alias/i.test(shrcText)) pass('.bashrc: aliases shown'); else fail('shell-rc aliases: ' + shrcText.slice(0, 300));

  // ── nix-config viewer ──
  await openExample('flake.nix');
  await page.waitForSelector('#previewHost .nf-doc', { timeout: 12000 });
  const nixText = await page.$eval('#previewHost .nf-doc', (e) => e.textContent);
  if (/Nix/i.test(nixText)) pass('flake.nix: badge shown'); else fail('nix badge: ' + nixText.slice(0, 200));
  if (/description|dev shell|input/i.test(nixText)) pass('flake.nix: content shown'); else fail('nix content: ' + nixText.slice(0, 300));

  // ── hugo-config viewer ──
  await openExample('hugo.toml');
  await page.waitForSelector('#previewHost .hugo-doc', { timeout: 12000 });
  const hugoText = await page.$eval('#previewHost .hugo-doc', (e) => e.textContent);
  if (/Hugo/i.test(hugoText)) pass('hugo.toml: badge shown'); else fail('hugo badge: ' + hugoText.slice(0, 200));
  if (/ananke|theme/i.test(hugoText)) pass('hugo.toml: theme shown'); else fail('hugo theme: ' + hugoText.slice(0, 300));
  if (/example\.com|baseURL/i.test(hugoText)) pass('hugo.toml: baseURL shown'); else fail('hugo url: ' + hugoText.slice(0, 300));

  // ── R DESCRIPTION viewer ──
  await openExample('DESCRIPTION');
  await page.waitForSelector('#previewHost .rdesc-doc', { timeout: 12000 });
  const rdescText = await page.$eval('#previewHost .rdesc-doc', (e) => e.textContent);
  if (/R Package/i.test(rdescText)) pass('DESCRIPTION: badge shown'); else fail('r-desc badge: ' + rdescText.slice(0, 200));
  if (/mypackage|Version/i.test(rdescText)) pass('DESCRIPTION: package info shown'); else fail('r-desc info: ' + rdescText.slice(0, 300));
  if (/dplyr|ggplot2|Imports/i.test(rdescText)) pass('DESCRIPTION: dependencies shown'); else fail('r-desc deps: ' + rdescText.slice(0, 300));

  // ── esbuild-config viewer ──
  await openExample('esbuild.config.mjs');
  await page.waitForSelector('#previewHost .esb-doc', { timeout: 12000 });
  const esbText = await page.$eval('#previewHost .esb-doc', (e) => e.textContent);
  if (/esbuild/i.test(esbText)) pass('esbuild.config.mjs: badge shown'); else fail('esbuild badge: ' + esbText.slice(0, 200));
  if (/entry|src\/index|outdir/i.test(esbText)) pass('esbuild.config.mjs: entry/output shown'); else fail('esbuild entry: ' + esbText.slice(0, 300));

  // ── maven-settings viewer ──
  await openExample('settings.xml (Maven)');
  await page.waitForSelector('#previewHost .mvns-doc', { timeout: 12000 });
  const mvnsText = await page.$eval('#previewHost .mvns-doc', (e) => e.textContent);
  if (/Maven Settings/i.test(mvnsText)) pass('settings.xml: badge shown'); else fail('maven-settings badge: ' + mvnsText.slice(0, 200));
  if (/configured|password/i.test(mvnsText)) pass('settings.xml: credentials redacted'); else fail('maven-settings creds: ' + mvnsText.slice(0, 300));

  // ── pg_hba.conf viewer ──
  await openExample('pg_hba.conf');
  await page.waitForSelector('#previewHost .pghba-doc', { timeout: 12000 });
  const pghbaText = await page.$eval('#previewHost .pghba-doc', (e) => e.textContent);
  if (/PostgreSQL|pg_hba/i.test(pghbaText)) pass('pg_hba.conf: badge shown'); else fail('pghba badge: ' + pghbaText.slice(0, 200));
  if (/scram-sha-256|peer|md5/i.test(pghbaText)) pass('pg_hba.conf: auth methods shown'); else fail('pghba methods: ' + pghbaText.slice(0, 300));

  // ── Caddyfile viewer ──
  await openExample('Caddyfile');
  await page.waitForSelector('#previewHost .cdf-doc', { timeout: 12000 });
  const cdfText = await page.$eval('#previewHost .cdf-doc', (e) => e.textContent);
  if (/Caddy/i.test(cdfText)) pass('Caddyfile: badge shown'); else fail('caddyfile badge: ' + cdfText.slice(0, 200));
  if (/example\.com/i.test(cdfText)) pass('Caddyfile: site address shown'); else fail('caddyfile site: ' + cdfText.slice(0, 300));
  if (/reverse_proxy|file_server|encode/i.test(cdfText)) pass('Caddyfile: directives shown'); else fail('caddyfile directives: ' + cdfText.slice(0, 300));

  // ── nginx.conf viewer ──
  await openExample('nginx.conf');
  await page.waitForSelector('#previewHost .ngx-doc', { timeout: 12000 });
  const ngxText = await page.$eval('#previewHost .ngx-doc', (e) => e.textContent);
  if (/nginx/i.test(ngxText)) pass('nginx.conf: badge shown'); else fail('nginx badge: ' + ngxText.slice(0, 200));
  if (/backend/i.test(ngxText)) pass('nginx.conf: upstream shown'); else fail('nginx upstream: ' + ngxText.slice(0, 300));
  if (/example\.com/i.test(ngxText)) pass('nginx.conf: server_name shown'); else fail('nginx server_name: ' + ngxText.slice(0, 300));
  if (/Nginx Review|http redirect/i.test(ngxText)) pass('nginx.conf: review findings shown'); else fail('nginx review: ' + ngxText.slice(0, 400));
  const ngxHelpTitle = await page.$eval('#previewHost .ngx-doc [data-source-line]', (e) => e.getAttribute('title') || '');
  if (/Nginx|source|Open line/i.test(ngxHelpTitle)) pass('nginx.conf: directive hover help shown'); else fail('nginx source help title missing');
  const ngxSourceCollapsed = await page.$eval('#previewHost .ngx-doc .kf-source-details', (e) => !e.open && e.textContent.includes('Source'));
  if (ngxSourceCollapsed) pass('nginx.conf: source collapsed'); else fail('nginx.conf: source not collapsed');
  const ngxSourceLine = await page.$eval('#previewHost .ngx-doc [data-source-line]', (e) => {
    e.click();
    return e.getAttribute('data-source-line');
  });
  await page.waitForFunction((line) => {
    const details = document.querySelector('#previewHost .ngx-doc .kf-source-details');
    return details?.open && document.getElementById(`nginx-line-${line}`);
  }, ngxSourceLine);
  pass('nginx.conf: source links open source');

  // ── ansible.cfg viewer ──
  await openExample('ansible.cfg (Ansible Config)');
  await page.waitForSelector('#previewHost .ansiblecfg-doc', { timeout: 12000 });
  const anscfgText = await page.$eval('#previewHost .ansiblecfg-doc', (e) => e.textContent);
  if (/Ansible/i.test(anscfgText)) pass('ansible.cfg: Ansible badge shown'); else fail('ansible-cfg badge: ' + anscfgText.slice(0, 200));
  if (/defaults/i.test(anscfgText)) pass('ansible.cfg: defaults section shown'); else fail('ansible-cfg defaults: ' + anscfgText.slice(0, 200));
  if (/forks/i.test(anscfgText)) pass('ansible.cfg: forks shown'); else fail('ansible-cfg forks: ' + anscfgText.slice(0, 300));

  // ── makepkg.conf viewer ──
  await openExample('makepkg.conf (makepkg Config)');
  await page.waitForSelector('#previewHost .makepkgcfg-doc', { timeout: 12000 });
  const makepkgText = await page.$eval('#previewHost .makepkgcfg-doc', (e) => e.textContent);
  if (/makepkg/i.test(makepkgText)) pass('makepkg.conf: badge shown'); else fail('makepkg-conf badge: ' + makepkgText.slice(0, 200));
  if (/x86_64/i.test(makepkgText)) pass('makepkg.conf: CARCH shown'); else fail('makepkg-conf CARCH: ' + makepkgText.slice(0, 300));
  if (/MAKEFLAGS|CFLAGS/i.test(makepkgText)) pass('makepkg.conf: compiler flags shown'); else fail('makepkg-conf flags: ' + makepkgText.slice(0, 300));

  // ── inventory (Ansible Inventory) viewer ──
  await openExample('inventory (Ansible Inventory)');
  await page.waitForSelector('#previewHost .ansinv-doc', { timeout: 12000 });
  const ansinvText = await page.$eval('#previewHost .ansinv-doc', (e) => e.textContent);
  if (/Ansible/i.test(ansinvText)) pass('inventory: Ansible badge shown'); else fail('ansible-hosts badge: ' + ansinvText.slice(0, 200));
  if (/webservers/i.test(ansinvText)) pass('inventory: groups shown'); else fail('ansible-hosts groups: ' + ansinvText.slice(0, 200));

  // ── supervisord.conf viewer ──
  await openExample('supervisord.conf');
  await page.waitForSelector('#previewHost .supd-doc', { timeout: 12000 });
  const supdText = await page.$eval('#previewHost .supd-doc', (e) => e.textContent);
  if (/Supervisor/i.test(supdText)) pass('supervisord.conf: badge shown'); else fail('supervisord badge: ' + supdText.slice(0, 200));
  if (/webapp/i.test(supdText)) pass('supervisord.conf: program shown'); else fail('supervisord program: ' + supdText.slice(0, 300));

  // ── logrotate.conf viewer ──
  await openExample('logrotate.conf (Log Rotation)');
  await page.waitForSelector('#previewHost .logrot-doc', { timeout: 12000 });
  const logrotText = await page.$eval('#previewHost .logrot-doc', (e) => e.textContent);
  if (/logrotate/i.test(logrotText)) pass('logrotate.conf: badge shown'); else fail('logrotate badge: ' + logrotText.slice(0, 200));
  if (/nginx/i.test(logrotText)) pass('logrotate.conf: log target shown'); else fail('logrotate target: ' + logrotText.slice(0, 300));

  // ── tlp.conf viewer ──
  await openExample('tlp.conf (TLP Power)');
  await page.waitForSelector('#previewHost .tlpcfg-doc', { timeout: 12000 });
  const tlpText = await page.$eval('#previewHost .tlpcfg-doc', (e) => e.textContent);
  if (/TLP/i.test(tlpText)) pass('tlp.conf: TLP badge shown'); else fail('tlp-conf badge: ' + tlpText.slice(0, 200));
  if (/powersave|performance/i.test(tlpText)) pass('tlp.conf: CPU governor shown'); else fail('tlp-conf governor: ' + tlpText.slice(0, 300));
  if (/40%|80%/i.test(tlpText)) pass('tlp.conf: battery charge threshold shown'); else fail('tlp-conf battery threshold: ' + tlpText.slice(0, 300));

  // ── .env.example viewer ──
  await openExample('.env.example (Env Template)');
  await page.waitForSelector('#previewHost .envex-doc', { timeout: 12000 });
  const envexText = await page.$eval('#previewHost .envex-doc', (e) => e.textContent);
  if (/ENV/i.test(envexText)) pass('.env.example: ENV badge shown'); else fail('env-example badge: ' + envexText.slice(0, 200));
  if (/DATABASE_URL/i.test(envexText)) pass('.env.example: variables shown'); else fail('env-example vars: ' + envexText.slice(0, 200));

  // ── ssh_config viewer ──
  // ssh_config is detected as the base `ssh-config` type (the dedicated `.sc-root` renderer), which
  // shadows the older `ssh-client-config` known plugin (`.ssh-doc`) — its match() defers whenever the
  // base type wins, so `.ssh-doc` never renders for this filename. Assert the renderer that runs.
  await openExample('ssh_config (SSH Client Config)');
  await page.waitForSelector('#previewHost .sc-root', { timeout: 12000 });
  const sshcfgText = await page.$eval('#previewHost .sc-root', (e) => e.textContent);
  if (/SSH/i.test(sshcfgText)) pass('ssh_config: badge shown'); else fail('ssh_config badge: ' + sshcfgText.slice(0, 200));
  if (/github\.com/i.test(sshcfgText)) pass('ssh_config: github.com host shown'); else fail('ssh_config host: ' + sshcfgText.slice(0, 300));
  if (/prod-web|prod-db|IdentityFile/i.test(sshcfgText)) pass('ssh_config: host settings shown'); else fail('ssh_config settings: ' + sshcfgText.slice(0, 300));
  const sshCopyBtn = await page.$('#previewHost .sc-root .sc-copy-btn');
  if (sshCopyBtn) pass('ssh_config: copy button present'); else fail('ssh_config: copy button missing');

  // ── sshd_config viewer ──
  await openExample('sshd_config');
  await page.waitForSelector('#previewHost .sshdcfg-doc', { timeout: 12000 });
  const sshdcfgText = await page.$eval('#previewHost .sshdcfg-doc', (e) => e.textContent);
  if (/SSHD|sshd_config/i.test(sshdcfgText)) pass('sshd_config: badge shown'); else fail('sshd_config badge: ' + sshdcfgText.slice(0, 200));
  if (/PermitRootLogin/i.test(sshdcfgText)) pass('sshd_config: PermitRootLogin shown'); else fail('sshd_config permit-root: ' + sshdcfgText.slice(0, 300));
  if (/PasswordAuthentication/i.test(sshdcfgText)) pass('sshd_config: PasswordAuthentication shown'); else fail('sshd_config passwd-auth: ' + sshdcfgText.slice(0, 300));
  if (/SSHD Review|public bind/i.test(sshdcfgText)) pass('sshd_config: review findings shown'); else fail('sshd_config review: ' + sshdcfgText.slice(0, 400));
  const sshdHelpTitle = await page.$eval('#previewHost .sshdcfg-doc [data-source-line]', (e) => e.getAttribute('title') || '');
  if (/source|Open line/i.test(sshdHelpTitle)) pass('sshd_config: directive hover help shown'); else fail('sshd_config source help title missing');
  const sshdSourceCollapsed = await page.$eval('#previewHost .sshdcfg-doc .kf-source-details', (e) => !e.open && e.textContent.includes('Source'));
  if (sshdSourceCollapsed) pass('sshd_config: source collapsed'); else fail('sshd_config: source not collapsed');
  const sshdSourceLine = await page.$eval('#previewHost .sshdcfg-doc [data-source-line]', (e) => {
    e.click();
    return e.getAttribute('data-source-line');
  });
  await page.waitForFunction((line) => {
    const details = document.querySelector('#previewHost .sshdcfg-doc .kf-source-details');
    return details?.open && document.getElementById(`sshd-line-${line}`);
  }, sshdSourceLine);
  pass('sshd_config: source links open source');

  // ── Postman Collection viewer ──
  await openExample('api.postman_collection.json (Postman)');
  await page.waitForSelector('#previewHost .postman-doc', { timeout: 12000 });
  const postmanText = await page.$eval('#previewHost .postman-doc', (e) => e.textContent);
  if (/Postman/i.test(postmanText)) pass('api.postman_collection.json: Postman badge shown'); else fail('postman badge: ' + postmanText.slice(0, 200));
  if (/My API Collection/i.test(postmanText)) pass('api.postman_collection.json: collection name shown'); else fail('postman name: ' + postmanText.slice(0, 300));
  if (/Auth|Users|Health/i.test(postmanText)) pass('api.postman_collection.json: folders/items shown'); else fail('postman structure: ' + postmanText.slice(0, 300));

  // ── GraphQL Schema viewer ──
  await openExample('schema.graphql (GraphQL Schema)');
  await page.waitForSelector('#previewHost .gql-doc', { timeout: 12000 });
  const gqlSchemaText = await page.$eval('#previewHost .gql-doc', (e) => e.textContent);
  if (/GraphQL/i.test(gqlSchemaText)) pass('schema.graphql: GraphQL badge shown'); else fail('graphql badge: ' + gqlSchemaText.slice(0, 200));
  if (/Query/i.test(gqlSchemaText)) pass('schema.graphql: Query operations shown'); else fail('graphql query: ' + gqlSchemaText.slice(0, 300));
  if (/Mutation|User|Post/i.test(gqlSchemaText)) pass('schema.graphql: types/mutations shown'); else fail('graphql types: ' + gqlSchemaText.slice(0, 300));

  // ── hosts-file viewer ──
  await openExample('hosts');
  await page.waitForSelector('#previewHost .hostsf-doc', { timeout: 12000 });
  const hostsfText = await page.$eval('#previewHost .hostsf-doc', (e) => e.textContent);
  if (/hosts/i.test(hostsfText)) pass('hosts: hosts badge shown'); else fail('hosts badge: ' + hostsfText.slice(0, 200));
  if (/localhost/i.test(hostsfText)) pass('hosts: localhost entry shown'); else fail('hosts localhost: ' + hostsfText.slice(0, 300));

  // ── resolv-conf viewer ──
  await openExample('resolv.conf');
  await page.waitForSelector('#previewHost .resolvconf-doc', { timeout: 12000 });
  const resolvText = await page.$eval('#previewHost .resolvconf-doc', (e) => e.textContent);
  if (/DNS/i.test(resolvText)) pass('resolv.conf: DNS badge shown'); else fail('resolv.conf badge: ' + resolvText.slice(0, 200));
  if (/Cloudflare/i.test(resolvText)) pass('resolv.conf: Cloudflare nameserver shown'); else fail('resolv.conf cloudflare: ' + resolvText.slice(0, 300));

  // ── fstab viewer ──
  await openExample('fstab (Linux Filesystem Table)');
  await page.waitForSelector('#previewHost .fstab-doc', { timeout: 12000 });
  const fstabText = await page.$eval('#previewHost .fstab-doc', (e) => e.textContent);
  if (/fstab/i.test(fstabText)) pass('fstab: badge shown'); else fail('fstab badge: ' + fstabText.slice(0, 200));
  if (/ext4/i.test(fstabText)) pass('fstab: ext4 fs type shown'); else fail('fstab ext4: ' + fstabText.slice(0, 300));

  // ── crypttab viewer ──
  await openExample('crypttab (Linux Encrypted Devices)');
  await page.waitForSelector('#previewHost .crytab-doc', { timeout: 12000 });
  const crytabText = await page.$eval('#previewHost .crytab-doc', (e) => e.textContent);
  if (/crypttab/i.test(crytabText)) pass('crypttab: badge shown'); else fail('crypttab badge: ' + crytabText.slice(0, 200));
  if (/luks/i.test(crytabText)) pass('crypttab: luks option shown'); else fail('crypttab luks: ' + crytabText.slice(0, 300));

  // ── systemd unit viewer ──
  await openExample('myapp.service (systemd Service)');
  await page.waitForSelector('#previewHost .sysd-doc', { timeout: 12000 });
  const sysdText = await page.$eval('#previewHost .sysd-doc', (e) => e.textContent);
  if (/systemd/i.test(sysdText)) pass('myapp.service: systemd badge shown'); else fail('systemd badge: ' + sysdText.slice(0, 200));
  if (/ExecStart/i.test(sysdText)) pass('myapp.service: ExecStart shown'); else fail('systemd ExecStart: ' + sysdText.slice(0, 300));
  if (/My Application Service/i.test(sysdText)) pass('myapp.service: description shown'); else fail('systemd description: ' + sysdText.slice(0, 300));

  // ── crontab viewer ──
  await openExample('crontab (Cron Schedule)');
  await page.waitForSelector('#previewHost .crntab-doc', { timeout: 12000 });
  const crntabText = await page.$eval('#previewHost .crntab-doc', (e) => e.textContent);
  if (/cron/i.test(crntabText)) pass('crontab: cron badge shown'); else fail('crontab badge: ' + crntabText.slice(0, 200));
  if (/backup/i.test(crntabText)) pass('crontab: backup job shown'); else fail('crontab backup: ' + crntabText.slice(0, 300));
  if (/daily|every|weekly|reboot/i.test(crntabText)) pass('crontab: human schedule descriptions shown'); else fail('crontab schedule: ' + crntabText.slice(0, 300));

  // ── cert-manager viewer ──
  await openExample('cert-manager.yaml (cert-manager)');
  await page.waitForSelector('#previewHost .certmgr-doc', { timeout: 12000 });
  const certmgrText = await page.$eval('#previewHost .certmgr-doc', (e) => e.textContent);
  if (/cert-manager/i.test(certmgrText)) pass('cert-manager: badge shown'); else fail('cert-manager badge: ' + certmgrText.slice(0, 200));
  if (/ClusterIssuer/i.test(certmgrText)) pass('cert-manager: ClusterIssuer kind shown'); else fail('cert-manager ClusterIssuer: ' + certmgrText.slice(0, 300));
  if (/letsencrypt/i.test(certmgrText)) pass('cert-manager: letsencrypt issuer shown'); else fail('cert-manager letsencrypt: ' + certmgrText.slice(0, 300));

  // ── iptables rules viewer ──
  await openExample('iptables.rules (Firewall Rules)');
  await page.waitForSelector('#previewHost .iptr-doc', { timeout: 12000 });
  const iptablesText = await page.$eval('#previewHost .iptr-doc', (e) => e.textContent);
  if (/iptables/i.test(iptablesText)) pass('iptables.rules: iptables badge shown'); else fail('iptables badge: ' + iptablesText.slice(0, 200));
  if (/INPUT|filter/i.test(iptablesText)) pass('iptables.rules: chain or table shown'); else fail('iptables chain/table: ' + iptablesText.slice(0, 300));

  // ── UFW config viewer ──
  await openExample('ufw.conf (UFW Firewall)');
  await page.waitForSelector('#previewHost .ufwcfg-doc', { timeout: 12000 });
  const ufwText = await page.$eval('#previewHost .ufwcfg-doc', (e) => e.textContent);
  if (/UFW/i.test(ufwText)) pass('ufw.conf: UFW badge shown'); else fail('ufw badge: ' + ufwText.slice(0, 200));
  if (/DEFAULT/i.test(ufwText)) pass('ufw.conf: default policies shown'); else fail('ufw policies: ' + ufwText.slice(0, 300));

  // ── VictoriaMetrics config viewer ──
  await openExample('victoria-metrics.yml (VictoriaMetrics)');
  await page.waitForSelector('#previewHost .vmcfg-doc', { timeout: 12000 });
  const vmcfgText = await page.$eval('#previewHost .vmcfg-doc', (e) => e.textContent);
  if (/VictoriaMetrics/i.test(vmcfgText)) pass('victoria-metrics.yml: VictoriaMetrics badge shown'); else fail('vmcfg badge: ' + vmcfgText.slice(0, 200));
  if (/scrape/i.test(vmcfgText)) pass('victoria-metrics.yml: scrape jobs shown'); else fail('vmcfg scrape: ' + vmcfgText.slice(0, 300));

  // ── Thanos config viewer ──
  await openExample('thanos-bucket.yml (Thanos)');
  await page.waitForSelector('#previewHost .thanoscfg-doc', { timeout: 12000 });
  const thanosText = await page.$eval('#previewHost .thanoscfg-doc', (e) => e.textContent);
  if (/Thanos/i.test(thanosText)) pass('thanos-bucket.yml: Thanos badge shown'); else fail('thanoscfg badge: ' + thanosText.slice(0, 200));
  if (/S3/i.test(thanosText)) pass('thanos-bucket.yml: S3 storage type shown'); else fail('thanoscfg type: ' + thanosText.slice(0, 300));
  if (/bucket/i.test(thanosText)) pass('thanos-bucket.yml: bucket shown'); else fail('thanoscfg bucket: ' + thanosText.slice(0, 300));

  // ── Thanos config viewer (thanos.yaml) ──
  await openExample('thanos.yaml');
  await page.waitForSelector('#previewHost .thanoscfg-doc', { timeout: 12000 });
  const thanosYamlText = await page.$eval('#previewHost .thanoscfg-doc', (e) => e.textContent);
  if (/Thanos/i.test(thanosYamlText)) pass('thanos.yaml: Thanos badge shown'); else fail('thanos.yaml badge: ' + thanosYamlText.slice(0, 200));
  if (/S3/i.test(thanosYamlText)) pass('thanos.yaml: S3 storage type shown'); else fail('thanos.yaml type: ' + thanosYamlText.slice(0, 300));

  // ── Loki config viewer ──
  await openExample('loki-config.yaml');
  await page.waitForSelector('#previewHost .loki-doc', { timeout: 12000 });
  const lokiText = await page.$eval('#previewHost .loki-doc', (e) => e.textContent);
  if (/Loki/i.test(lokiText)) pass('loki-config.yaml: Loki badge shown'); else fail('loki badge: ' + lokiText.slice(0, 200));
  if (/schema|storage/i.test(lokiText)) pass('loki-config.yaml: schema or storage section shown'); else fail('loki content: ' + lokiText.slice(0, 300));

  // ── fail2ban jail.local viewer ──
  await openExample('jail.local (Fail2ban)');
  await page.waitForSelector('#previewHost .f2b-doc', { timeout: 12000 });
  const f2bText = await page.$eval('#previewHost .f2b-doc', (e) => e.textContent);
  if (/Fail2ban/i.test(f2bText)) pass('jail.local: Fail2ban badge shown'); else fail('fail2ban badge: ' + f2bText.slice(0, 200));
  if (/sshd|bantime/i.test(f2bText)) pass('jail.local: sshd jail or bantime shown'); else fail('fail2ban content: ' + f2bText.slice(0, 300));

  // ── smb.conf viewer ──
  await openExample('smb.conf (Samba)');
  await page.waitForSelector('#previewHost .smbcfg-doc', { timeout: 12000 });
  const smbText = await page.$eval('#previewHost .smbcfg-doc', (e) => e.textContent);
  if (/Samba/i.test(smbText)) pass('smb.conf: Samba badge shown'); else fail('samba badge: ' + smbText.slice(0, 200));
  if (/data|workgroup/i.test(smbText)) pass('smb.conf: data share or workgroup shown'); else fail('samba content: ' + smbText.slice(0, 300));

  // ── Corefile (CoreDNS) viewer ──
  await openExample('Corefile (CoreDNS)');
  await page.waitForSelector('#previewHost .coredns-doc', { timeout: 12000 });
  const corefileText = await page.$eval('#previewHost .coredns-doc', (e) => e.textContent);
  if (/CoreDNS/i.test(corefileText)) pass('Corefile: CoreDNS badge shown'); else fail('corefile badge: ' + corefileText.slice(0, 200));
  if (/kubernetes|forward/i.test(corefileText)) pass('Corefile: kubernetes or forward plugin shown'); else fail('corefile content: ' + corefileText.slice(0, 300));

  // ── containerd.toml viewer ──
  await openExample('containerd.toml (containerd)');
  await page.waitForSelector('#previewHost .ctrd-doc', { timeout: 12000 });
  const ctrdText = await page.$eval('#previewHost .ctrd-doc', (e) => e.textContent);
  if (/containerd/i.test(ctrdText)) pass('containerd.toml: containerd badge shown'); else fail('containerd badge: ' + ctrdText.slice(0, 200));
  if (/sandbox_image|overlayfs/i.test(ctrdText)) pass('containerd.toml: sandbox_image or overlayfs shown'); else fail('containerd content: ' + ctrdText.slice(0, 300));

  // ── postfix main.cf viewer ──
  await openExample('main.cf (Postfix Mail Server)');
  await page.waitForSelector('#previewHost .postfix-doc', { timeout: 12000 });
  const postfixText = await page.$eval('#previewHost .postfix-doc', (e) => e.textContent);
  if (/Postfix/i.test(postfixText)) pass('main.cf: Postfix badge shown'); else fail('postfix badge: ' + postfixText.slice(0, 200));
  if (/myhostname|mail\.example\.com/i.test(postfixText)) pass('main.cf: myhostname or hostname shown'); else fail('postfix hostname: ' + postfixText.slice(0, 300));

  // ── chrony.conf viewer ──
  await openExample('chrony.conf (NTP)');
  await page.waitForSelector('#previewHost .chronycfg-doc', { timeout: 12000 });
  const chronyText = await page.$eval('#previewHost .chronycfg-doc', (e) => e.textContent);
  if (/NTP/i.test(chronyText)) pass('chrony.conf: NTP badge shown'); else fail('chrony badge: ' + chronyText.slice(0, 200));
  if (/pool|google/i.test(chronyText)) pass('chrony.conf: pool or google NTP shown'); else fail('chrony sources: ' + chronyText.slice(0, 300));

  // ── gradle-wrapper.properties viewer ──
  await openExample('gradle-wrapper.properties');
  await page.waitForSelector('#previewHost .gw-doc', { timeout: 12000 });
  const gradleWrapperText = await page.$eval('#previewHost .gw-doc', (e) => e.textContent);
  if (/Gradle Wrapper/i.test(gradleWrapperText)) pass('gradle-wrapper.properties: badge shown'); else fail('gradle-wrapper badge: ' + gradleWrapperText.slice(0, 200));
  if (/8\.7|8\.\d/i.test(gradleWrapperText)) pass('gradle-wrapper.properties: Gradle version shown'); else fail('gradle-wrapper version: ' + gradleWrapperText.slice(0, 200));
  if (/bin|services\.gradle\.org/i.test(gradleWrapperText)) pass('gradle-wrapper.properties: distribution info shown'); else fail('gradle-wrapper dist: ' + gradleWrapperText.slice(0, 300));

  // ── gradle.properties viewer ──
  await openExample('gradle.properties');
  await page.waitForSelector('#previewHost .gp-doc', { timeout: 12000 });
  const gpText = await page.$eval('#previewHost .gp-doc', (e) => e.textContent);
  if (/Gradle/i.test(gpText)) pass('gradle.properties: badge shown'); else fail('gradle-props badge: ' + gpText.slice(0, 200));
  if (/parallel|daemon|workers/i.test(gpText)) pass('gradle.properties: build settings shown'); else fail('gradle-props settings: ' + gpText.slice(0, 300));
  if (/Kotlin|kotlin/i.test(gpText)) pass('gradle.properties: Kotlin version shown'); else fail('gradle-props kotlin: ' + gpText.slice(0, 300));
}
