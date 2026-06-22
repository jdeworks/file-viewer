// Auto-split slice 18/18 of the known-files smoke area (see ./../known-files.mjs).
// Covers: sample.agda … sample.pml.
// Called in order on the shared ctx — keep openExample order intact; no cross-file state.
export async function run(ctx) {
  const { page, origin, frameOf, pass, fail, openExample } = ctx;

  // ── agda-lang viewer ──
  await openExample('sample.agda');
  await page.waitForSelector('#previewHost .agda-doc', { timeout: 12000 });
  pass('agda-lang: rendered');
  const agdaText = await page.$eval('#previewHost .agda-doc', (e) => e.textContent);
  if (/Agda/i.test(agdaText)) pass('agda-lang: badge shown'); else fail('agda-lang badge: ' + agdaText.slice(0, 200));
  if (/data|record|import|module/i.test(agdaText)) pass('agda-lang: stats shown'); else fail('agda-lang stats: ' + agdaText.slice(0, 300));

  // ── chapel-lang viewer ──
  await openExample('sample.chpl');
  await page.waitForSelector('#previewHost .chpl-doc', { timeout: 12000 });
  pass('chapel-lang: rendered');
  const chplText = await page.$eval('#previewHost .chpl-doc', (e) => e.textContent);
  if (/Chapel/i.test(chplText)) pass('chapel-lang: badge shown'); else fail('chapel-lang badge: ' + chplText.slice(0, 200));
  if (/proc|config|coforall|forall|module/i.test(chplText)) pass('chapel-lang: stats shown'); else fail('chapel-lang stats: ' + chplText.slice(0, 300));

  // ── koka-lang viewer ──
  await openExample('sample.koka');
  await page.waitForSelector('#previewHost .kka-doc', { timeout: 12000 });
  pass('koka-lang: rendered');
  const kkaText = await page.$eval('#previewHost .kka-doc', (e) => e.textContent);
  if (/Koka/i.test(kkaText)) pass('koka-lang: badge shown'); else fail('koka-lang badge: ' + kkaText.slice(0, 200));
  if (/effect|fun|handler|module/i.test(kkaText)) pass('koka-lang: stats shown'); else fail('koka-lang stats: ' + kkaText.slice(0, 300));

  // ── carbon-lang viewer ──
  await openExample('sample.carbon');
  await page.waitForSelector('#previewHost .cbn-doc', { timeout: 12000 });
  pass('carbon-lang: rendered');
  const cbnText = await page.$eval('#previewHost .cbn-doc', (e) => e.textContent);
  if (/Carbon/i.test(cbnText)) pass('carbon-lang: badge shown'); else fail('carbon-lang badge: ' + cbnText.slice(0, 200));
  if (/fn|class|interface|impl|package/i.test(cbnText)) pass('carbon-lang: stats shown'); else fail('carbon-lang stats: ' + cbnText.slice(0, 300));

  // ── grain-lang viewer ──
  await openExample('sample.gr');
  await page.waitForSelector('#previewHost .grn-doc', { timeout: 12000 });
  pass('grain-lang: rendered');
  const grnText = await page.$eval('#previewHost .grn-doc', (e) => e.textContent);
  if (/Grain/i.test(grnText)) pass('grain-lang: badge shown'); else fail('grain-lang badge: ' + grnText.slice(0, 200));
  if (/import|export|record|enum|module/i.test(grnText)) pass('grain-lang: stats shown'); else fail('grain-lang stats: ' + grnText.slice(0, 300));

  // ── factor-lang viewer ──
  await openExample('sample.factor');
  await page.waitForSelector('#previewHost .fctr-doc', { timeout: 12000 });
  pass('factor-lang: rendered');
  const fctrText = await page.$eval('#previewHost .fctr-doc', (e) => e.textContent);
  if (/Factor/i.test(fctrText)) pass('factor-lang: badge shown'); else fail('factor-lang badge: ' + fctrText.slice(0, 200));
  if (/word|USING|TUPLE|SYMBOL|vocabulary/i.test(fctrText)) pass('factor-lang: stats shown'); else fail('factor-lang stats: ' + fctrText.slice(0, 300));

  // ── apt-sources viewer ──
  await openExample('sources.list');
  await page.waitForSelector('#previewHost .apts-doc', { timeout: 12000 });
  pass('apt-sources: rendered');

  // ── pkgbuild viewer ──
  await openExample('PKGBUILD');
  await page.waitForSelector('#previewHost .pkgb-doc', { timeout: 12000 });
  pass('pkgbuild: rendered');

  // ── limits-conf viewer ──
  await openExample('limits.conf');
  await page.waitForSelector('#previewHost .lim-doc', { timeout: 12000 });
  pass('limits-conf: rendered');

  // ── audit-rules viewer ──
  await openExample('audit.rules');
  await page.waitForSelector('#previewHost .audr-doc', { timeout: 12000 });
  pass('audit-rules: rendered');

  // ── common-lisp viewer ──
  await openExample('sample.lisp');
  await page.waitForSelector('#previewHost .cl-doc', { timeout: 12000 });
  pass('common-lisp: rendered');

  // ── emacs-lisp viewer ──
  await openExample('sample.el');
  await page.waitForSelector('#previewHost .el-doc', { timeout: 12000 });
  pass('emacs-lisp: rendered');

  // ── squirrel-lang viewer ──
  await openExample('sample.nut');
  await page.waitForSelector('#previewHost .nut-doc', { timeout: 12000 });
  pass('squirrel-lang: rendered');

  // ── red-lang viewer ──
  await openExample('sample.red');
  await page.waitForSelector('#previewHost .red-doc', { timeout: 12000 });
  pass('red-lang: rendered');

  // ── journald-conf viewer ──
  await openExample('journald.conf');
  await page.waitForSelector('#previewHost .jnld-doc', { timeout: 12000 });
  pass('journald-conf: rendered');

  // ── tmpfiles-d viewer ──
  await openExample('sample.tmpfiles');
  await page.waitForSelector('#previewHost .tmf-doc', { timeout: 12000 });
  pass('tmpfiles-d: rendered');

  // ── nsswitch-conf viewer ──
  await openExample('nsswitch.conf');
  await page.waitForSelector('#previewHost .nsswitch-doc', { timeout: 12000 });
  pass('nsswitch-conf: rendered');

  // ── mkinitcpio-conf viewer ──
  await openExample('mkinitcpio.conf');
  await page.waitForSelector('#previewHost .mki-doc', { timeout: 12000 });
  pass('mkinitcpio-conf: rendered');

  // ── wpa-supplicant-conf viewer ──
  await openExample('wpa_supplicant.conf');
  await page.waitForSelector('#previewHost .wpas-doc', { timeout: 12000 });
  pass('wpa-supplicant-conf: rendered');

  // ── sssd-conf viewer ──
  await openExample('sssd.conf');
  await page.waitForSelector('#previewHost .sssd-doc', { timeout: 12000 });
  pass('sssd-conf: rendered');

  // ── pascal-lang viewer ──
  await openExample('sample.pas');
  await page.waitForSelector('#previewHost .pas-doc', { timeout: 12000 });
  pass('pascal-lang: rendered');

  // ── eiffel-lang viewer ──
  await openExample('sample.e');
  await page.waitForSelector('#previewHost .efl-doc', { timeout: 12000 });
  pass('eiffel-lang: rendered');

  // ── avahi-daemon-conf viewer ──
  await openExample('avahi-daemon.conf');
  await page.waitForSelector('#previewHost .avhi-doc', { timeout: 12000 });
  pass('avahi-daemon-conf: rendered');

  // ── neomutt-conf viewer ──
  await openExample('.neomuttrc');
  await page.waitForSelector('#previewHost .nmu-doc', { timeout: 12000 });
  pass('neomutt-conf: rendered');

  // ── msmtp-conf viewer ──
  await openExample('.msmtprc');
  await page.waitForSelector('#previewHost .msmtp-doc', { timeout: 12000 });
  pass('msmtp-conf: rendered');

  // ── openldap-conf viewer ──
  await openExample('slapd.conf');
  await page.waitForSelector('#previewHost .ldap-doc', { timeout: 12000 });
  pass('openldap-conf: rendered');

  // ── gnuplot-script viewer ──
  await openExample('sample.gnuplot');
  await page.waitForSelector('#previewHost .gnuplot-doc', { timeout: 12000 });
  pass('gnuplot-script: rendered');

  // ── wolfram-lang viewer ──
  await openExample('sample.wl');
  await page.waitForSelector('#previewHost .wlang-doc', { timeout: 12000 });
  pass('wolfram-lang: rendered');

  // ── stata-do viewer ──
  await openExample('sample.do');
  await page.waitForSelector('#previewHost .stata-doc', { timeout: 12000 });
  pass('stata-do: rendered');

  // ── tla-plus viewer ──
  await openExample('sample.tla');
  await page.waitForSelector('#previewHost .tla-doc', { timeout: 12000 });
  pass('tla-plus: rendered');

  // ── rpm-spec viewer ──
  await openExample('sample.spec');
  await page.waitForSelector('#previewHost .rpmspec-doc', { timeout: 12000 });
  pass('rpm-spec: rendered');

  // ── debian-control viewer ──
  await openExample('control');
  await page.waitForSelector('#previewHost .debctrl-doc', { timeout: 12000 });
  pass('debian-control: rendered');

  // ── cups-conf viewer ──
  await openExample('cupsd.conf');
  await page.waitForSelector('#previewHost .cups-doc', { timeout: 12000 });
  pass('cups-conf: rendered');

  // ── dafny viewer ──
  await openExample('sample.dfy');
  await page.waitForSelector('#previewHost .dfy-doc', { timeout: 12000 });
  pass('dafny: rendered');

  // ── xdg-desktop-entry viewer ──
  await openExample('sample.desktop');
  await page.waitForSelector('#previewHost .de-doc', { timeout: 12000 });
  pass('xdg-desktop-entry: rendered');

  // ── isabelle-thy viewer ──
  await openExample('sample.thy');
  await page.waitForSelector('#previewHost .isa-doc', { timeout: 12000 });
  pass('isabelle-thy: rendered');

  // ── alloy-lang viewer ──
  await openExample('sample-alloy.als');
  await page.waitForSelector('#previewHost .als-doc', { timeout: 12000 });
  pass('alloy-lang: rendered');

  // ── coq-lang viewer ──
  await openExample('sample.coq');
  await page.waitForSelector('#previewHost .coq-doc', { timeout: 12000 });
  pass('coq-lang: rendered');

  // ── flatpak-manifest viewer ──
  await openExample('org.example.App.yaml');
  await page.waitForSelector('#previewHost .fpm-doc', { timeout: 12000 });
  pass('flatpak-manifest: rendered');

  // ── snapcraft-yaml viewer ──
  await openExample('snapcraft.yaml');
  await page.waitForSelector('#previewHost .snap-doc', { timeout: 12000 });
  pass('snapcraft-yaml: rendered');

  // ── smtlib viewer ──
  await openExample('sample.smt2');
  await page.waitForSelector('#previewHost .smt-doc', { timeout: 12000 });
  pass('smtlib: rendered');

  // ── promela viewer ──
  await openExample('sample.pml');
  await page.waitForSelector('#previewHost .pml-doc', { timeout: 12000 });
  pass('promela: rendered');
}
