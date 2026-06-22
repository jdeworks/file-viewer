// Auto-split slice 10/18 of the known-files smoke area (see ./../known-files.mjs).
// Covers: settings.gradle … aria2.conf.
// Called in order on the shared ctx — keep openExample order intact; no cross-file state.
export async function run(ctx) {
  const { page, origin, frameOf, pass, fail, openExample } = ctx;

  // ── settings.gradle viewer ──
  await openExample('settings.gradle');
  await page.waitForSelector('#previewHost .sg-doc', { timeout: 12000 });
  pass('settings.gradle: renders');
  const sgText = await page.$eval('#previewHost .sg-doc', (e) => e.textContent);
  if (!sgText.includes('Gradle')) fail('settings.gradle: missing badge'); else pass('settings.gradle: badge shown');
  if (!sgText.includes('rootProject') && !sgText.includes('include')) fail('settings.gradle: no project info'); else pass('settings.gradle: modules shown');
  if (/my-awesome-app/i.test(sgText)) pass('settings.gradle: root project name shown'); else fail('settings-gradle name: ' + sgText.slice(0, 200));
  if (/app|feature|core/i.test(sgText)) pass('settings.gradle: subprojects shown'); else fail('settings-gradle subprojects: ' + sgText.slice(0, 300));

  // ── build.sbt viewer ──
  await openExample('build.sbt');
  await page.waitForSelector('#previewHost .sbt-doc', { timeout: 12000 });
  const buildSbtText = await page.$eval('#previewHost .sbt-doc', (e) => e.textContent);
  if (/Scala\/SBT/i.test(buildSbtText)) pass('build.sbt: badge shown'); else fail('build-sbt badge: ' + buildSbtText.slice(0, 200));
  if (/my-scala-app/i.test(buildSbtText)) pass('build.sbt: project name shown'); else fail('build-sbt name: ' + buildSbtText.slice(0, 200));
  if (/cats-core|cats-effect|fs2/i.test(buildSbtText)) pass('build.sbt: dependencies shown'); else fail('build-sbt deps: ' + buildSbtText.slice(0, 300));

  // ── build.xml (Apache Ant) viewer ──
  await openExample('build.xml (Apache Ant)');
  await page.waitForSelector('#previewHost .antbuild-doc', { timeout: 12000 });
  const antText = await page.$eval('#previewHost .antbuild-doc', (e) => e.textContent);
  if (/Ant/i.test(antText)) pass('build.xml: Ant badge shown'); else fail('ant-build badge: ' + antText.slice(0, 200));
  if (/MyApp/i.test(antText)) pass('build.xml: project name shown'); else fail('ant-build name: ' + antText.slice(0, 200));
  if (/compile|package|clean/i.test(antText)) pass('build.xml: targets shown'); else fail('ant-build targets: ' + antText.slice(0, 300));

  // ── sudoers viewer ──
  await openExample('sudoers');
  await page.waitForSelector('#previewHost .sudoers-doc', { timeout: 12000 });
  const sudoText = await page.$eval('#previewHost .sudoers-doc', (e) => e.textContent);
  if (/sudoers/i.test(sudoText)) pass('sudoers: badge shown'); else fail('sudoers badge: ' + sudoText.slice(0, 200));
  if (/NOPASSWD|%sudo/i.test(sudoText)) pass('sudoers: access rules shown (NOPASSWD or %sudo)'); else fail('sudoers rules: ' + sudoText.slice(0, 300));

  // ── NFS exports viewer ──
  await openExample('exports');
  await page.waitForSelector('#previewHost .nfsexp-doc', { timeout: 12000 });
  const nfsText = await page.$eval('#previewHost .nfsexp-doc', (e) => e.textContent);
  if (/NFS/i.test(nfsText)) pass('exports: NFS badge shown'); else fail('nfs-exports badge: ' + nfsText.slice(0, 200));
  if (/rw|sync/i.test(nfsText)) pass('exports: export options shown'); else fail('nfs-exports options: ' + nfsText.slice(0, 300));

  // ── rsyslog.conf viewer ──
  await openExample('rsyslog.conf');
  await page.waitForSelector('#previewHost .rsyslog-doc', { timeout: 12000 });
  const rsyslogText = await page.$eval('#previewHost .rsyslog-doc', (e) => e.textContent);
  if (/rsyslog/i.test(rsyslogText)) pass('rsyslog.conf: rsyslog badge shown'); else fail('rsyslog badge: ' + rsyslogText.slice(0, 200));
  if (/auth|syslog/i.test(rsyslogText)) pass('rsyslog.conf: log routing shown'); else fail('rsyslog routing: ' + rsyslogText.slice(0, 300));

  // ── lighttpd.conf viewer ──
  await openExample('lighttpd.conf');
  await page.waitForSelector('#previewHost .lighty-doc', { timeout: 12000 });
  const lightyText = await page.$eval('#previewHost .lighty-doc', (e) => e.textContent);
  if (/Lighttpd/i.test(lightyText)) pass('lighttpd.conf: Lighttpd badge shown'); else fail('lighttpd badge: ' + lightyText.slice(0, 200));
  if (/document-root|modules/i.test(lightyText)) pass('lighttpd.conf: document-root or modules shown'); else fail('lighttpd content: ' + lightyText.slice(0, 300));

  // ── named.conf (BIND DNS) viewer ──
  await openExample('named.conf (BIND DNS)');
  await page.waitForSelector('#previewHost .namedcfg-doc', { timeout: 12000 });
  const namedText = await page.$eval('#previewHost .namedcfg-doc', (e) => e.textContent);
  if (/BIND/i.test(namedText)) pass('named.conf: BIND badge shown'); else fail('named-conf badge: ' + namedText.slice(0, 200));
  if (/example\.com/i.test(namedText)) pass('named.conf: zone names shown'); else fail('named-conf zones: ' + namedText.slice(0, 300));
  if (/master|primary/i.test(namedText)) pass('named.conf: zone types shown'); else fail('named-conf zone types: ' + namedText.slice(0, 300));

  // ── unbound.conf (Unbound DNS) viewer ──
  await openExample('unbound.conf (Unbound DNS)');
  await page.waitForSelector('#previewHost .unboundcfg-doc', { timeout: 12000 });
  const unboundText = await page.$eval('#previewHost .unboundcfg-doc', (e) => e.textContent);
  if (/Unbound/i.test(unboundText)) pass('unbound.conf: Unbound badge shown'); else fail('unbound-conf badge: ' + unboundText.slice(0, 200));
  if (/cloudflare|1\.1\.1\.1/i.test(unboundText)) pass('unbound.conf: forward addresses shown'); else fail('unbound-conf forward addrs: ' + unboundText.slice(0, 300));
  if (/access.control|allow|refuse/i.test(unboundText)) pass('unbound.conf: access control shown'); else fail('unbound-conf acl: ' + unboundText.slice(0, 300));

  // ── dhcpd.conf (ISC DHCP Server) viewer ──
  await openExample('dhcpd.conf (ISC DHCP Server)');
  await page.waitForSelector('#previewHost .dhcpd-doc', { timeout: 12000 });
  const dhcpdText = await page.$eval('#previewHost .dhcpd-doc', (e) => e.textContent);
  if (/DHCP/i.test(dhcpdText)) pass('dhcpd.conf: DHCP badge shown'); else fail('dhcpd-conf badge: ' + dhcpdText.slice(0, 200));
  if (/192\.168\.1\.0/i.test(dhcpdText)) pass('dhcpd.conf: subnet shown'); else fail('dhcpd-conf subnet: ' + dhcpdText.slice(0, 300));
  if (/server01|printer/i.test(dhcpdText)) pass('dhcpd.conf: host reservations shown'); else fail('dhcpd-conf hosts: ' + dhcpdText.slice(0, 300));

  // ── vector.toml (Vector Config) viewer ──
  await openExample('vector.toml (Vector)');
  await page.waitForSelector('#previewHost .vec-doc', { timeout: 12000 });
  const vecText = await page.$eval('#previewHost .vec-doc', (e) => e.textContent);
  if (/Vector/i.test(vecText)) pass('vector.toml: Vector badge shown'); else fail('vector-config badge: ' + vecText.slice(0, 200));
  if (/source|sink/i.test(vecText)) pass('vector.toml: sources/sinks shown'); else fail('vector-config sources: ' + vecText.slice(0, 300));

  // ── keepalived.conf (Keepalived) viewer ──
  await openExample('keepalived.conf (Keepalived VRRP)');
  await page.waitForSelector('#previewHost .kalivd-doc', { timeout: 12000 });
  const kaText = await page.$eval('#previewHost .kalivd-doc', (e) => e.textContent);
  if (/Keepalived/i.test(kaText)) pass('keepalived.conf: Keepalived badge shown'); else fail('keepalived-conf badge: ' + kaText.slice(0, 200));
  if (/MASTER|vrrp/i.test(kaText)) pass('keepalived.conf: VRRP instance state shown'); else fail('keepalived-conf vrrp: ' + kaText.slice(0, 300));

  // ── netdata.conf viewer ──
  await openExample('netdata.conf (Netdata)');
  await page.waitForSelector('#previewHost .netdata-doc', { timeout: 12000 });
  const netdataText = await page.$eval('#previewHost .netdata-doc', (e) => e.textContent);
  if (/Netdata/i.test(netdataText)) pass('netdata.conf: Netdata badge shown'); else fail('netdata-conf badge: ' + netdataText.slice(0, 200));
  if (/global|plugins/i.test(netdataText)) pass('netdata.conf: global or plugins section shown'); else fail('netdata-conf sections: ' + netdataText.slice(0, 300));

  // ── .yarnrc.yml viewer ──
  await openExample('.yarnrc.yml (Yarn)');
  await page.waitForSelector('#previewHost .yarnrc-doc', { timeout: 12000 });
  const yarnText = await page.$eval('#previewHost .yarnrc-doc', (e) => e.textContent);
  if (/Yarn/i.test(yarnText)) pass('.yarnrc.yml: Yarn badge shown'); else fail('yarnrc badge: ' + yarnText.slice(0, 200));
  if (/nodeLinker|Berry/i.test(yarnText)) pass('.yarnrc.yml: nodeLinker or Berry shown'); else fail('yarnrc content: ' + yarnText.slice(0, 300));

  // ── cpanfile viewer ──
  await openExample('cpanfile');
  await page.waitForSelector('#previewHost .cpanfile-doc', { timeout: 12000 });
  const cpanfileText = await page.$eval('#previewHost .cpanfile-doc', (e) => e.textContent);
  if (/Perl/i.test(cpanfileText)) pass('cpanfile: Perl badge shown'); else fail('cpanfile badge: ' + cpanfileText.slice(0, 200));
  if (/Moose|requires/i.test(cpanfileText)) pass('cpanfile: required dependencies shown'); else fail('cpanfile deps: ' + cpanfileText.slice(0, 300));

  // ── openssl.cnf viewer ──
  await openExample('openssl.cnf');
  await page.waitForSelector('#previewHost .opensslcfg-doc', { timeout: 12000 });
  const opensslText = await page.$eval('#previewHost .opensslcfg-doc', (e) => e.textContent);
  if (/OpenSSL/i.test(opensslText)) pass('openssl.cnf: OpenSSL badge shown'); else fail('openssl-conf badge: ' + opensslText.slice(0, 200));
  if (/distinguished_name|CA/i.test(opensslText)) pass('openssl.cnf: distinguished_name or CA info shown'); else fail('openssl-conf content: ' + opensslText.slice(0, 300));

  // ── default.vcl (Varnish VCL) viewer ──
  await openExample('default.vcl (Varnish VCL)');
  await page.waitForSelector('#previewHost .vclcfg-doc', { timeout: 12000 });
  const varnishVclText = await page.$eval('#previewHost .vclcfg-doc', (e) => e.textContent);
  if (/Varnish/i.test(varnishVclText)) pass('default.vcl: Varnish badge shown'); else fail('varnish-vcl badge: ' + varnishVclText.slice(0, 200));
  if (/backend|vcl_recv/i.test(varnishVclText)) pass('default.vcl: backend or vcl_recv info shown'); else fail('varnish-vcl content: ' + varnishVclText.slice(0, 300));

  // ── usr.bin.nginx (AppArmor profile) viewer ──
  await openExample('usr.bin.nginx (AppArmor profile)');
  await page.waitForSelector('#previewHost .apparmor-doc', { timeout: 12000 });
  const apparmorText = await page.$eval('#previewHost .apparmor-doc', (e) => e.textContent);
  if (/AppArmor/i.test(apparmorText)) pass('usr.bin.nginx: AppArmor badge shown'); else fail('apparmor-profile badge: ' + apparmorText.slice(0, 200));
  if (/capability|enforce/i.test(apparmorText)) pass('usr.bin.nginx: capability or enforce info shown'); else fail('apparmor-profile content: ' + apparmorText.slice(0, 300));

  // ── sysctl.conf viewer ──
  await openExample('sysctl.conf (Linux kernel parameters)');
  await page.waitForSelector('#previewHost .sysctlcfg-doc', { timeout: 12000 });
  const sysctlText = await page.$eval('#previewHost .sysctlcfg-doc', (e) => e.textContent);
  if (/sysctl/i.test(sysctlText)) pass('sysctl.conf: sysctl badge shown'); else fail('sysctl-conf badge: ' + sysctlText.slice(0, 200));
  if (/net|vm\.swappiness/i.test(sysctlText)) pass('sysctl.conf: net namespace or vm.swappiness shown'); else fail('sysctl-conf content: ' + sysctlText.slice(0, 300));

  // ── blacklist.conf (modprobe) viewer ──
  await openExample('blacklist.conf (modprobe)');
  await page.waitForSelector('#previewHost .modprobecfg-doc', { timeout: 12000 });
  const modprobeText = await page.$eval('#previewHost .modprobecfg-doc', (e) => e.textContent);
  if (/modprobe/i.test(modprobeText)) pass('blacklist.conf: modprobe badge shown'); else fail('modprobe-conf badge: ' + modprobeText.slice(0, 200));
  if (/blacklist/i.test(modprobeText)) pass('blacklist.conf: blacklist section shown'); else fail('modprobe-conf blacklist: ' + modprobeText.slice(0, 300));

  // ── dovecot.conf viewer ──
  await openExample('dovecot.conf (Dovecot IMAP/POP3)');
  await page.waitForSelector('#previewHost .dovecotcfg-doc', { timeout: 12000 });
  const dovecotText = await page.$eval('#previewHost .dovecotcfg-doc', (e) => e.textContent);
  if (/Dovecot/i.test(dovecotText)) pass('dovecot.conf: Dovecot badge shown'); else fail('dovecot-conf badge: ' + dovecotText.slice(0, 200));
  if (/imap|protocols/i.test(dovecotText)) pass('dovecot.conf: protocols or imap shown'); else fail('dovecot-conf protocols: ' + dovecotText.slice(0, 300));

  // ── exim4.conf viewer ──
  await openExample('exim4.conf (Exim MTA)');
  await page.waitForSelector('#previewHost .eximcfg-doc', { timeout: 12000 });
  const eximText = await page.$eval('#previewHost .eximcfg-doc', (e) => e.textContent);
  if (/Exim/i.test(eximText)) pass('exim4.conf: Exim badge shown'); else fail('exim-conf badge: ' + eximText.slice(0, 200));
  if (/router|transport/i.test(eximText)) pass('exim4.conf: routers or transports shown'); else fail('exim-conf routers: ' + eximText.slice(0, 300));

  // ── sys.config (Erlang/OTP) viewer ──
  await openExample('sys.config');
  await page.waitForSelector('#previewHost .erlsyscfg-doc', { timeout: 12000 });
  const erlSysCfgText = await page.$eval('#previewHost .erlsyscfg-doc', (e) => e.textContent);
  if (/Erlang/i.test(erlSysCfgText)) pass('sys.config: Erlang badge shown'); else fail('erlang-sys-config badge: ' + erlSysCfgText.slice(0, 200));
  if (/kernel|myapp/i.test(erlSysCfgText)) pass('sys.config: application names shown (kernel or myapp)'); else fail('erlang-sys-config apps: ' + erlSysCfgText.slice(0, 300));

  // ── vm.args (Erlang VM) viewer ──
  await openExample('vm.args');
  await page.waitForSelector('#previewHost .erlvmargs-doc', { timeout: 12000 });
  const erlVmArgsText = await page.$eval('#previewHost .erlvmargs-doc', (e) => e.textContent);
  if (/Erlang VM/i.test(erlVmArgsText)) pass('vm.args: Erlang VM badge shown'); else fail('erlang-vm-args badge: ' + erlVmArgsText.slice(0, 200));
  if (/node|scheduler/i.test(erlVmArgsText)) pass('vm.args: node identity or scheduler section shown'); else fail('erlang-vm-args content: ' + erlVmArgsText.slice(0, 300));

  // ── krb5.conf (Kerberos) viewer ──
  await openExample('krb5.conf (Kerberos)');
  await page.waitForSelector('#previewHost .krb5cfg-doc', { timeout: 12000 });
  const krb5Text = await page.$eval('#previewHost .krb5cfg-doc', (e) => e.textContent);
  if (/Kerberos/i.test(krb5Text)) pass('krb5.conf: Kerberos badge shown'); else fail('krb5-conf badge: ' + krb5Text.slice(0, 200));
  if (/EXAMPLE\.COM|realm/i.test(krb5Text)) pass('krb5.conf: realm information shown'); else fail('krb5-conf realm: ' + krb5Text.slice(0, 300));

  // ── gpg.conf (GnuPG) viewer ──
  await openExample('gpg.conf (GnuPG)');
  await page.waitForSelector('#previewHost .gpgcfg-doc', { timeout: 12000 });
  const gpgText = await page.$eval('#previewHost .gpgcfg-doc', (e) => e.textContent);
  if (/GnuPG/i.test(gpgText)) pass('gpg.conf: GnuPG badge shown'); else fail('gpg-conf badge: ' + gpgText.slice(0, 200));
  if (/keyserver|cipher/i.test(gpgText)) pass('gpg.conf: keyserver or cipher information shown'); else fail('gpg-conf content: ' + gpgText.slice(0, 300));

  // ── grub (/etc/default/grub) viewer ──
  await openExample('grub (/etc/default/grub)');
  await page.waitForSelector('#previewHost .grubcfg-doc', { timeout: 12000 });
  const grubText = await page.$eval('#previewHost .grubcfg-doc', (e) => e.textContent);
  if (/GRUB/i.test(grubText)) pass('grub: GRUB badge shown'); else fail('grub-conf badge: ' + grubText.slice(0, 200));
  if (/CMDLINE|timeout/i.test(grubText)) pass('grub: cmdline parameters or timeout shown'); else fail('grub-conf content: ' + grubText.slice(0, 300));

  // ── nftables.conf viewer ──
  await openExample('nftables.conf (nftables Firewall Rules)');
  await page.waitForSelector('#previewHost .nftcfg-doc', { timeout: 12000 });
  const nftText = await page.$eval('#previewHost .nftcfg-doc', (e) => e.textContent);
  if (/nftables/i.test(nftText)) pass('nftables.conf: nftables badge shown'); else fail('nftables-rules badge: ' + nftText.slice(0, 200));
  if (/chain|filter/i.test(nftText)) pass('nftables.conf: chain or filter information shown'); else fail('nftables-rules content: ' + nftText.slice(0, 300));

  // ── i3.config (i3 WM) viewer ──
  await openExample('i3.config (i3 WM)');
  await page.waitForSelector('#previewHost .i3cfg-doc', { timeout: 12000 });
  const i3Text = await page.$eval('#previewHost .i3cfg-doc', (e) => e.textContent);
  if (/\bi3\b/i.test(i3Text)) pass('i3.config: i3 badge shown'); else fail('i3-config badge: ' + i3Text.slice(0, 200));
  if (/Mod4|Super/i.test(i3Text)) pass('i3.config: modifier key (Mod4/Super) shown'); else fail('i3-config modifier: ' + i3Text.slice(0, 300));
  if (/bindsym|keybinding/i.test(i3Text)) pass('i3.config: keybindings section shown'); else fail('i3-config bindings: ' + i3Text.slice(0, 300));

  // ── sway (Sway WM) viewer ──
  await openExample('sway (Sway WM)');
  await page.waitForSelector('#previewHost .swaycfg-doc', { timeout: 12000 });
  const swayText = await page.$eval('#previewHost .swaycfg-doc', (e) => e.textContent);
  if (/Sway/i.test(swayText)) pass('sway: Sway badge shown'); else fail('sway-config badge: ' + swayText.slice(0, 200));
  if (/output|HDMI|eDP/i.test(swayText)) pass('sway: output configuration shown'); else fail('sway-config outputs: ' + swayText.slice(0, 300));
  if (/input|keyboard|touchpad/i.test(swayText)) pass('sway: input configuration shown'); else fail('sway-config inputs: ' + swayText.slice(0, 300));

  // ── app.ini (Gitea/Forgejo) viewer ──
  await openExample('app.ini (Gitea/Forgejo)');
  await page.waitForSelector('#previewHost .giteacfg-doc', { timeout: 12000 });
  const giteaText = await page.$eval('#previewHost .giteacfg-doc', (e) => e.textContent);
  if (/Gitea/i.test(giteaText)) pass('app.ini: Gitea badge shown'); else fail('gitea-conf badge: ' + giteaText.slice(0, 200));
  if (/server|database|ROOT_URL/i.test(giteaText)) pass('app.ini: server or database information shown'); else fail('gitea-conf content: ' + giteaText.slice(0, 300));

  // ── stunnel.conf viewer ──
  await openExample('stunnel.conf (SSL tunnel)');
  await page.waitForSelector('#previewHost .stunnelcfg-doc', { timeout: 12000 });
  const stunnelText = await page.$eval('#previewHost .stunnelcfg-doc', (e) => e.textContent);
  if (/stunnel/i.test(stunnelText)) pass('stunnel.conf: stunnel badge shown'); else fail('stunnel-conf badge: ' + stunnelText.slice(0, 200));
  if (/client|accept/i.test(stunnelText)) pass('stunnel.conf: client mode or accept address shown'); else fail('stunnel-conf content: ' + stunnelText.slice(0, 300));

  // ── hyprland.conf (Hyprland Wayland compositor) viewer ──
  await openExample('hyprland.conf (Hyprland Wayland compositor)');
  await page.waitForSelector('#previewHost .hyprlcfg-doc', { timeout: 12000 });
  const hyprlText = await page.$eval('#previewHost .hyprlcfg-doc', (e) => e.textContent);
  if (/Hyprland/i.test(hyprlText)) pass('hyprland.conf: Hyprland badge shown'); else fail('hyprland-conf badge: ' + hyprlText.slice(0, 200));
  if (/monitor|mainMod/i.test(hyprlText)) pass('hyprland.conf: monitor or mainMod information shown'); else fail('hyprland-conf content: ' + hyprlText.slice(0, 300));

  // ── lxc.config (LXC container) viewer ──
  await openExample('lxc.config (LXC container)');
  await page.waitForSelector('#previewHost .lxccfg-doc', { timeout: 12000 });
  const lxcText = await page.$eval('#previewHost .lxccfg-doc', (e) => e.textContent);
  if (/LXC/i.test(lxcText)) pass('lxc.config: LXC badge shown'); else fail('lxc-config badge: ' + lxcText.slice(0, 200));
  if (/network|rootfs/i.test(lxcText)) pass('lxc.config: network or rootfs information shown'); else fail('lxc-config content: ' + lxcText.slice(0, 300));

  // ── .tmux.conf (tmux) viewer ──
  await openExample('.tmux.conf');
  await page.waitForSelector('#previewHost .tmuxcfg-doc', { timeout: 12000 });
  const tmuxText = await page.$eval('#previewHost .tmuxcfg-doc', (e) => e.textContent);
  if (/tmux/i.test(tmuxText)) pass('.tmux.conf: tmux badge shown'); else fail('tmux-conf badge: ' + tmuxText.slice(0, 200));
  if (/prefix|C-a/i.test(tmuxText)) pass('.tmux.conf: prefix key shown'); else fail('tmux-conf prefix: ' + tmuxText.slice(0, 300));

  // ── .screenrc (GNU Screen) viewer ──
  await openExample('.screenrc');
  await page.waitForSelector('#previewHost .screenrc-doc', { timeout: 12000 });
  const screenText = await page.$eval('#previewHost .screenrc-doc', (e) => e.textContent);
  if (/GNU Screen|Screen/i.test(screenText)) pass('.screenrc: GNU Screen badge shown'); else fail('screenrc badge: ' + screenText.slice(0, 200));
  if (/scrollback|hardstatus/i.test(screenText)) pass('.screenrc: scrollback or hardstatus shown'); else fail('screenrc content: ' + screenText.slice(0, 300));

  // ── Alacritty config viewer ──
  await openExample('alacritty.toml');
  await page.waitForSelector('#previewHost .alacritty-doc', { timeout: 12000 });
  const alacrittyText = await page.$eval('#previewHost .alacritty-doc', (e) => e.textContent);
  if (/Alacritty/i.test(alacrittyText)) pass('alacritty.toml: Alacritty badge shown'); else fail('alacritty-conf badge: ' + alacrittyText.slice(0, 200));
  if (/font|opacity/i.test(alacrittyText)) pass('alacritty.toml: font or opacity shown'); else fail('alacritty-conf content: ' + alacrittyText.slice(0, 300));

  // ── kitty config viewer ──
  await openExample('kitty.conf');
  await page.waitForSelector('#previewHost .kitty-doc', { timeout: 12000 });
  const kittyText = await page.$eval('#previewHost .kitty-doc', (e) => e.textContent);
  if (/kitty/i.test(kittyText)) pass('kitty.conf: kitty badge shown'); else fail('kitty-conf badge: ' + kittyText.slice(0, 200));
  if (/font_family|scrollback/i.test(kittyText)) pass('kitty.conf: font_family or scrollback shown'); else fail('kitty-conf content: ' + kittyText.slice(0, 300));

  // ── dunstrc (dunst notification daemon) viewer ──
  await openExample('dunstrc (dunst notification daemon)');
  await page.waitForSelector('#previewHost .dunstrc-doc', { timeout: 12000 });
  const dunstText = await page.$eval('#previewHost .dunstrc-doc', (e) => e.textContent);
  if (/dunst/i.test(dunstText)) pass('dunstrc: dunst badge shown'); else fail('dunstrc badge: ' + dunstText.slice(0, 200));
  if (/urgency|timeout/i.test(dunstText)) pass('dunstrc: urgency levels or timeout shown'); else fail('dunstrc urgency: ' + dunstText.slice(0, 300));

  // ── polybar.ini (Polybar status bar) viewer ──
  await openExample('polybar.ini (Polybar status bar)');
  await page.waitForSelector('#previewHost .polybarcfg-doc', { timeout: 12000 });
  const polybarText = await page.$eval('#previewHost .polybarcfg-doc', (e) => e.textContent);
  if (/Polybar/i.test(polybarText)) pass('polybar.ini: Polybar badge shown'); else fail('polybar-conf badge: ' + polybarText.slice(0, 200));
  if (/modules|bar/i.test(polybarText)) pass('polybar.ini: modules or bar configuration shown'); else fail('polybar-conf content: ' + polybarText.slice(0, 300));

  // ── .muttrc (NeoMutt/Mutt email client config) viewer ──
  await openExample('.muttrc');
  await page.waitForSelector('#previewHost .muttrc-doc', { timeout: 12000 });
  const muttText = await page.$eval('#previewHost .muttrc-doc', (e) => e.textContent);
  if (/NeoMutt|Mutt/i.test(muttText)) pass('.muttrc: Mutt/NeoMutt badge shown'); else fail('muttrc badge: ' + muttText.slice(0, 200));
  if (/user@example\.com|imap|account/i.test(muttText)) pass('.muttrc: account settings shown'); else fail('muttrc account: ' + muttText.slice(0, 300));
  if (!/secret123/.test(muttText)) pass('.muttrc: raw passwords not exposed'); else fail('muttrc password leak: ' + muttText.slice(0, 300));
  if (/configured|binding|color/i.test(muttText)) pass('.muttrc: bindings or color rules shown'); else fail('muttrc content: ' + muttText.slice(0, 300));

  // ── foot.ini (foot Wayland terminal emulator config) viewer ──
  await openExample('foot.ini');
  await page.waitForSelector('#previewHost .footcfg-doc', { timeout: 12000 });
  const footText = await page.$eval('#previewHost .footcfg-doc', (e) => e.textContent);
  if (/foot/i.test(footText)) pass('foot.ini: foot badge shown'); else fail('foot-config badge: ' + footText.slice(0, 200));
  if (/JetBrains Mono|font/i.test(footText)) pass('foot.ini: font shown'); else fail('foot-config font: ' + footText.slice(0, 300));
  if (/opacity|alpha|95/i.test(footText)) pass('foot.ini: opacity shown'); else fail('foot-config opacity: ' + footText.slice(0, 300));

  // ── config.rasi (Rofi window switcher/launcher config) viewer ──
  await openExample('config.rasi (Rofi)');
  await page.waitForSelector('#previewHost .roficfg-doc', { timeout: 12000 });
  const rofiText = await page.$eval('#previewHost .roficfg-doc', (e) => e.textContent);
  if (/Rofi/i.test(rofiText)) pass('config.rasi: Rofi badge shown'); else fail('rofi-config badge: ' + rofiText.slice(0, 200));
  if (/drun|run|window/i.test(rofiText)) pass('config.rasi: launch mode chips shown'); else fail('rofi-config modes: ' + rofiText.slice(0, 300));
  if (/fuzzy|JetBrains/i.test(rofiText)) pass('config.rasi: matching or font shown'); else fail('rofi-config settings: ' + rofiText.slice(0, 300));

  // ── mako (mako Wayland notification daemon config) viewer ──
  await openExample('mako (mako notification daemon)');
  await page.waitForSelector('#previewHost .makocfg-doc', { timeout: 12000 });
  const makoText = await page.$eval('#previewHost .makocfg-doc', (e) => e.textContent);
  if (/mako/i.test(makoText)) pass('mako: mako badge shown'); else fail('mako-conf badge: ' + makoText.slice(0, 200));
  if (/top-right|anchor/i.test(makoText)) pass('mako: anchor position shown'); else fail('mako-conf anchor: ' + makoText.slice(0, 300));
  if (/5s|5000|timeout/i.test(makoText)) pass('mako: timeout shown'); else fail('mako-conf timeout: ' + makoText.slice(0, 300));
  if (/urgency|do-not-disturb|Spotify/i.test(makoText)) pass('mako: criteria sections shown'); else fail('mako-conf criteria: ' + makoText.slice(0, 300));

  // ── daemon.conf (PulseAudio daemon config) viewer ──
  await openExample('daemon.conf');
  await page.waitForSelector('#previewHost .pulsecfg-doc', { timeout: 12000 });
  const pulseText = await page.$eval('#previewHost .pulsecfg-doc', (e) => e.textContent);
  if (/PulseAudio/i.test(pulseText)) pass('daemon.conf: PulseAudio badge shown'); else fail('pulseaudio-conf badge: ' + pulseText.slice(0, 200));
  if (/s16le|default-sample-format/i.test(pulseText)) pass('daemon.conf: sample format shown'); else fail('pulseaudio-conf sample-format: ' + pulseText.slice(0, 300));
  if (/44100|48000/i.test(pulseText)) pass('daemon.conf: sample rate shown'); else fail('pulseaudio-conf sample-rate: ' + pulseText.slice(0, 300));
  if (/realtime|speex/i.test(pulseText)) pass('daemon.conf: realtime or resample settings shown'); else fail('pulseaudio-conf system: ' + pulseText.slice(0, 300));

  // ── pipewire.conf (PipeWire audio/video server config) viewer ──
  await openExample('pipewire.conf');
  await page.waitForSelector('#previewHost .pwcfg-doc', { timeout: 12000 });
  const pipewireText = await page.$eval('#previewHost .pwcfg-doc', (e) => e.textContent);
  if (/PipeWire/i.test(pipewireText)) pass('pipewire.conf: PipeWire badge shown'); else fail('pipewire-conf badge: ' + pipewireText.slice(0, 200));
  if (/48000|default\.clock\.rate/i.test(pipewireText)) pass('pipewire.conf: clock rate shown'); else fail('pipewire-conf clock-rate: ' + pipewireText.slice(0, 300));
  if (/wireplumber|pipewire-pulse/i.test(pipewireText)) pass('pipewire.conf: exec entries shown'); else fail('pipewire-conf exec: ' + pipewireText.slice(0, 300));
  if (/protocol|rt|session/i.test(pipewireText)) pass('pipewire.conf: modules grouped and listed'); else fail('pipewire-conf modules: ' + pipewireText.slice(0, 300));

  // ── .wezterm.lua (WezTerm terminal emulator config) viewer ──
  await openExample('.wezterm.lua');
  await page.waitForSelector('#previewHost .weztermcfg-doc', { timeout: 12000 });
  const weztermText = await page.$eval('#previewHost .weztermcfg-doc', (e) => e.textContent);
  if (/WezTerm/i.test(weztermText)) pass('.wezterm.lua: WezTerm badge shown'); else fail('wezterm-conf badge: ' + weztermText.slice(0, 200));
  if (/JetBrains Mono|Catppuccin/i.test(weztermText)) pass('.wezterm.lua: font or color scheme shown'); else fail('wezterm-conf font/color: ' + weztermText.slice(0, 300));

  // ── aria2.conf (aria2 download manager config) viewer ──
  await openExample('aria2.conf');
  await page.waitForSelector('#previewHost .aria2cfg-doc', { timeout: 12000 });
  const aria2Text = await page.$eval('#previewHost .aria2cfg-doc', (e) => e.textContent);
  if (/aria2/i.test(aria2Text)) pass('aria2.conf: aria2 badge shown'); else fail('aria2-conf badge: ' + aria2Text.slice(0, 200));
  if (/Downloads|concurrent/i.test(aria2Text)) pass('aria2.conf: download dir or concurrency shown'); else fail('aria2-conf general: ' + aria2Text.slice(0, 300));
  if (/\[configured\]/.test(aria2Text) && !/mysecrettoken/.test(aria2Text)) pass('aria2.conf: RPC secret is masked'); else fail('aria2-conf rpc-secret not masked: ' + aria2Text.slice(0, 400));
}
