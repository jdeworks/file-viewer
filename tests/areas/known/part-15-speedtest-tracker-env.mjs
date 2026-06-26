// Auto-split slice 15/18 of the known-files smoke area (see ./../known-files.mjs).
// Covers: speedtest-tracker.env … sample.hlsl.
// Called in order on the shared ctx — keep openExample order intact; no cross-file state.
export async function run(ctx) {
  const { page, origin, frameOf, pass, fail, openExample } = ctx;

  // ── speedtest-tracker.env viewer (speedtest-tracker-config) ──
  await openExample('speedtest-tracker.env');
  await page.waitForSelector('#previewHost .speedtest-doc', { timeout: 12000 });
  pass('speedtest-tracker.env: Speedtest Tracker badge shown');

  // ── netdata.conf viewer (netdata-config) ──
  await openExample('netdata.conf');
  await page.waitForSelector('#previewHost .netdata-doc', { timeout: 12000 });
  pass('netdata.conf: Netdata badge shown');

  // ── pocket-id.env viewer (pocket-id-config) ──
  await openExample('pocket-id.env');
  await page.waitForSelector('#previewHost .pocketid-doc', { timeout: 12000 });
  pass('pocket-id.env: Pocket ID badge shown');

  // ── dozzle.yaml viewer (dozzle-config) ──
  await openExample('dozzle.yaml');
  await page.waitForSelector('#previewHost .dozzle-doc', { timeout: 12000 });
  pass('dozzle.yaml: Dozzle badge shown');

  // ── forgejo.ini viewer (forgejo-config) ──
  await openExample('forgejo.ini');
  await page.waitForSelector('#previewHost .forgejo-doc', { timeout: 12000 });
  pass('forgejo.ini: Forgejo badge shown');

  // ── glances.conf viewer (glances-config) ──
  await openExample('glances.conf');
  await page.waitForSelector('#previewHost .glances-doc', { timeout: 12000 });
  pass('glances.conf: Glances badge shown');

  // ── homarr.yaml viewer (homarr-config) ──
  await openExample('homarr.yaml');
  await page.waitForSelector('#previewHost .homarr-doc', { timeout: 12000 });
  pass('homarr.yaml: Homarr badge shown');

  // ── kavita-appsettings.json viewer (kavita-config) ──
  await openExample('kavita-appsettings.json');
  await page.waitForSelector('#previewHost .kavita-doc', { timeout: 12000 });
  pass('kavita-appsettings.json: Kavita badge shown');

  // ── komga.yml viewer (komga-config) ──
  await openExample('komga.yml');
  await page.waitForSelector('#previewHost .komga-doc', { timeout: 12000 });
  pass('komga.yml: Komga badge shown');

  // ── tandoor.env viewer (tandoor-config) ──
  await openExample('tandoor.env');
  await page.waitForSelector('#previewHost .tandoor-doc', { timeout: 12000 });
  pass('tandoor.env: Tandoor badge shown');

  // ── audiobookshelf.env viewer (audiobookshelf-config) ──
  await openExample('audiobookshelf.env');
  await page.waitForSelector('#previewHost .abs-doc', { timeout: 12000 });
  pass('audiobookshelf.env: Audiobookshelf badge shown');

  // ── dashy.yml viewer (dashy-config) ──
  await openExample('dashy.yml');
  await page.waitForSelector('#previewHost .dashy-doc', { timeout: 12000 });
  pass('dashy.yml: Dashy badge shown');

  // ── jellyseerr-settings.json viewer (jellyseerr-config) ──
  await openExample('jellyseerr-settings.json');
  await page.waitForSelector('#previewHost .jellyseerr-doc', { timeout: 12000 });
  pass('jellyseerr-settings.json: Jellyseerr badge shown');

  // ── bazarr.yaml viewer (bazarr-config) ──
  await openExample('bazarr.yaml');
  await page.waitForSelector('#previewHost .bazarr-doc', { timeout: 12000 });
  pass('bazarr.yaml: Bazarr badge shown');

  // ── scrutiny.yaml viewer (scrutiny-config) ──
  await openExample('scrutiny.yaml');
  await page.waitForSelector('#previewHost .scrutiny-doc', { timeout: 12000 });
  pass('scrutiny.yaml: Scrutiny badge shown');

  // ── overseerr-settings.json viewer (overseerr-config) ──
  await openExample('overseerr-settings.json');
  await page.waitForSelector('#previewHost .overseerr-doc', { timeout: 12000 });
  pass('overseerr-settings.json: Overseerr badge shown');

  // ── freshrss.env viewer (freshrss-config) ──
  await openExample('freshrss.env');
  await page.waitForSelector('#previewHost .freshrss-doc', { timeout: 12000 });
  pass('freshrss.env: FreshRSS badge shown');

  // ── homepage-services.yaml viewer (homepage-config) ──
  await openExample('homepage-services.yaml');
  await page.waitForSelector('#previewHost .homepage-doc', { timeout: 12000 });
  pass('homepage-services.yaml: Homepage badge shown');

  // ── wallabag.env viewer (wallabag-config) ──
  await openExample('wallabag.env');
  await page.waitForSelector('#previewHost .wallabag-doc', { timeout: 12000 });
  pass('wallabag.env: Wallabag badge shown');

  // ── linkwarden.env viewer (linkwarden-config) ──
  await openExample('linkwarden.env');
  await page.waitForSelector('#previewHost .linkwarden-doc', { timeout: 12000 });
  pass('linkwarden.env: Linkwarden badge shown');

  // ── archivebox.conf viewer (archivebox-config) ──
  await openExample('archivebox.conf');
  await page.waitForSelector('#previewHost .abox-doc', { timeout: 12000 });
  pass('archivebox.conf: ArchiveBox badge shown');

  // ── memos.env viewer (memos-config) ──
  await openExample('memos.env');
  await page.waitForSelector('#previewHost .memos-doc', { timeout: 12000 });
  pass('memos.env: Memos badge shown');

  // ── wakapi.yaml viewer (wakapi-config) ──
  await openExample('wakapi.yaml');
  await page.waitForSelector('#previewHost .wkapi-doc', { timeout: 12000 });
  pass('wakapi.yaml: Wakapi badge shown');

  // ── hoarder.env viewer (hoarder-config) ──
  await openExample('hoarder.env');
  await page.waitForSelector('#previewHost .hoarder-doc', { timeout: 12000 });
  pass('hoarder.env: Hoarder badge shown');

  // ── claude_desktop_config.json viewer (mcp-config) ──
  await openExample('claude_desktop_config.json');
  await page.waitForSelector('#previewHost .mc-root', { timeout: 12000 });
  const mcpText = await page.$eval('#previewHost .mc-root', (e) => e.textContent);
  if (/MCP/i.test(mcpText)) pass('claude_desktop_config.json: MCP badge shown'); else fail('mcp-config badge: ' + mcpText.slice(0, 200));
  if (/server.*configured|configured/i.test(mcpText)) pass('claude_desktop_config.json: count text visible'); else fail('mcp-config count: ' + mcpText.slice(0, 300));
  if (/filesystem|brave-search|github/i.test(mcpText)) pass('claude_desktop_config.json: server names shown'); else fail('mcp-config servers: ' + mcpText.slice(0, 300));

  // ── example.rdp viewer (rdp-config) ──
  await openExample('example.rdp');
  await page.waitForSelector('#previewHost .rdp-doc', { timeout: 12000 });
  const rdpText = await page.$eval('#previewHost .rdp-doc', (e) => e.textContent);
  if (/RDP/i.test(rdpText)) pass('example.rdp: RDP badge shown'); else fail('rdp-config badge: ' + rdpText.slice(0, 200));
  if (/server\.example\.com|example\.com/i.test(rdpText)) pass('example.rdp: host shown'); else fail('rdp-config host: ' + rdpText.slice(0, 300));
  if (/mstsc|xfreerdp/i.test(rdpText)) pass('example.rdp: copy command buttons present'); else fail('rdp-config copy-btn: ' + rdpText.slice(0, 300));
  if (/configured/i.test(rdpText)) pass('example.rdp: password redacted'); else fail('rdp-config redaction: ' + rdpText.slice(0, 300));
  if (/NLA/i.test(rdpText)) pass('example.rdp: NLA auth chip shown'); else fail('rdp-config nla: ' + rdpText.slice(0, 300));

  // ── frigate.yml viewer ──
  await openExample('frigate.yml');
  await page.waitForSelector('#previewHost .frigate-doc', { timeout: 12000 });
  const frigateText = await page.$eval('#previewHost .frigate-doc', (e) => e.textContent);
  if (/Frigate/i.test(frigateText)) pass('frigate.yml: Frigate badge shown'); else fail('frigate-config badge: ' + frigateText.slice(0, 200));
  if (/front_door|backyard/i.test(frigateText)) pass('frigate.yml: camera name shown'); else fail('frigate-config cameras: ' + frigateText.slice(0, 300));
  if (/\d+\s*camera/i.test(frigateText)) pass('frigate.yml: camera count shown'); else fail('frigate-config camera count: ' + frigateText.slice(0, 300));

  // ── sample.plist viewer (plist-config) ──
  await openExample('sample.plist');
  await page.waitForSelector('#previewHost .plist-doc', { timeout: 12000 });
  const plistText = await page.$eval('#previewHost .plist-doc', (e) => e.textContent);
  if (/plist/i.test(plistText)) pass('sample.plist: plist badge shown'); else fail('plist badge: ' + plistText.slice(0, 200));
  if (/CFBundleIdentifier/i.test(plistText)) pass('sample.plist: CFBundleIdentifier key shown'); else fail('plist key: ' + plistText.slice(0, 300));

  // ── appmanifest_570.acf viewer (steam-acf) ──
  await openExample('appmanifest_570.acf');
  await page.waitForSelector('#previewHost .steam-doc', { timeout: 12000 });
  const acfText = await page.$eval('#previewHost .steam-doc', (e) => e.textContent);
  if (/acf/i.test(acfText)) pass('appmanifest_570.acf: acf badge shown'); else fail('acf badge: ' + acfText.slice(0, 200));
  if (/Dota 2/i.test(acfText)) pass('appmanifest_570.acf: game name shown'); else fail('acf name: ' + acfText.slice(0, 300));
  if (/Fully Installed/i.test(acfText)) pass('appmanifest_570.acf: Fully Installed state shown'); else fail('acf state: ' + acfText.slice(0, 300));

  // ── robots.txt viewer ──
  await openExample('robots.txt');
  await page.waitForSelector('#previewHost .rbots-doc', { timeout: 12000 });
  pass('robots.txt: renders');
  const robotsText = await page.$eval('#previewHost .rbots-doc', (e) => e.textContent);
  if (/robots\.txt/i.test(robotsText)) pass('robots.txt: badge shown'); else fail('robots.txt badge: ' + robotsText.slice(0, 200));
  if (/User-agent/i.test(robotsText) || /Googlebot/i.test(robotsText)) pass('robots.txt: User-agent groups shown'); else fail('robots.txt groups: ' + robotsText.slice(0, 300));

  // ── sitemap.xml viewer ──
  await openExample('sitemap.xml');
  await page.waitForSelector('#previewHost .sitemap-doc', { timeout: 12000 });
  pass('sitemap.xml: renders');
  const sitemapText = await page.$eval('#previewHost .sitemap-doc', (e) => e.textContent);
  if (/sitemap/i.test(sitemapText)) pass('sitemap.xml: badge shown'); else fail('sitemap.xml badge: ' + sitemapText.slice(0, 200));
  if (/example\.com/i.test(sitemapText) || /URL/i.test(sitemapText)) pass('sitemap.xml: URL table shown'); else fail('sitemap.xml URLs: ' + sitemapText.slice(0, 300));

  // ── sample.avsc (Avro schema) viewer ──
  await openExample('sample.avsc');
  await page.waitForSelector('#previewHost .avro-doc', { timeout: 12000 });
  pass('sample.avsc: renders');
  const avroText = await page.$eval('#previewHost .avro-doc', (e) => e.textContent);
  if (/Avro/i.test(avroText)) pass('sample.avsc: Avro badge shown'); else fail('avro badge: ' + avroText.slice(0, 200));
  if (/User/i.test(avroText) && /field/i.test(avroText)) pass('sample.avsc: schema fields shown'); else fail('avro fields: ' + avroText.slice(0, 300));

  // ── security.txt viewer ──
  await openExample('security.txt');
  await page.waitForSelector('#previewHost .sec-doc', { timeout: 12000 });
  pass('security.txt: renders');
  const secText = await page.$eval('#previewHost .sec-doc', (e) => e.textContent);
  if (/security\.txt/i.test(secText)) pass('security.txt: badge shown'); else fail('security.txt badge: ' + secText.slice(0, 200));
  if (/Contact|Policy|Expires/i.test(secText)) pass('security.txt: RFC 9116 fields shown'); else fail('security.txt fields: ' + secText.slice(0, 300));
  const secLinks = await page.$$eval('#previewHost .sec-doc a.sec-link', (els) => els.map((a) => a.href));
  if (secLinks.some((h) => /example\.com/.test(h))) pass('security.txt: contact/policy URLs are clickable links'); else fail('security.txt links: ' + secLinks.join(','));

  // ── humans.txt viewer ──
  await openExample('humans.txt');
  await page.waitForSelector('#previewHost .hum-doc', { timeout: 12000 });
  pass('humans.txt: renders');
  const humText = await page.$eval('#previewHost .hum-doc', (e) => e.textContent);
  if (/humans\.txt/i.test(humText)) pass('humans.txt: badge shown'); else fail('humans.txt badge: ' + humText.slice(0, 200));
  if (/TEAM|THANKS|SITE/i.test(humText)) pass('humans.txt: sections shown'); else fail('humans.txt sections: ' + humText.slice(0, 300));
  if (/Alice|Bob|Designer/i.test(humText)) pass('humans.txt: team members shown'); else fail('humans.txt members: ' + humText.slice(0, 300));

  // ── sample.jsonnet viewer ──
  await openExample('sample.jsonnet');
  await page.waitForSelector('#previewHost .jnet-doc', { timeout: 12000 });
  pass('sample.jsonnet: renders');
  const jnetText = await page.$eval('#previewHost .jnet-doc', (e) => e.textContent);
  if (/Jsonnet/i.test(jnetText)) pass('sample.jsonnet: badge shown'); else fail('jsonnet badge: ' + jnetText.slice(0, 200));
  if (/import|local|function/i.test(jnetText)) pass('sample.jsonnet: summary shows imports/locals/functions'); else fail('jsonnet summary: ' + jnetText.slice(0, 300));
  if (/makeService/i.test(jnetText)) pass('sample.jsonnet: function signature shown'); else fail('jsonnet fn: ' + jnetText.slice(0, 300));

  // ── sample.cue viewer ──
  await openExample('sample.cue');
  await page.waitForSelector('#previewHost .cue-doc', { timeout: 12000 });
  pass('sample.cue: renders');
  const cueText = await page.$eval('#previewHost .cue-doc', (e) => e.textContent);
  if (/CUE/i.test(cueText)) pass('sample.cue: badge shown'); else fail('cue badge: ' + cueText.slice(0, 200));
  if (/webservice/i.test(cueText)) pass('sample.cue: package name shown'); else fail('cue package: ' + cueText.slice(0, 300));
  if (/#Service|#Config|Definitions/i.test(cueText)) pass('sample.cue: definitions shown'); else fail('cue defs: ' + cueText.slice(0, 300));

  // ── sample.tf viewer (Terraform HCL) ──
  await openExample('sample.tf');
  await page.waitForSelector('#previewHost .tf-doc', { timeout: 12000 });
  pass('sample.tf: renders');
  const tfText = await page.$eval('#previewHost .tf-doc', (e) => e.textContent);
  if (/terraform/i.test(tfText)) pass('sample.tf: terraform badge shown'); else fail('tf badge: ' + tfText.slice(0, 200));
  if (/aws_s3_bucket|aws_instance/i.test(tfText)) pass('sample.tf: resource types shown'); else fail('tf resources: ' + tfText.slice(0, 300));
  if (/variable|Variables/i.test(tfText)) pass('sample.tf: variables section shown'); else fail('tf variables: ' + tfText.slice(0, 300));
  if (/output|Outputs/i.test(tfText)) pass('sample.tf: outputs section shown'); else fail('tf outputs: ' + tfText.slice(0, 300));

  // ── sample.nix viewer (Nix expression) ──
  await openExample('sample.nix');
  await page.waitForSelector('#previewHost .nix-doc', { timeout: 12000 });
  pass('sample.nix: renders');
  const nixExprText = await page.$eval('#previewHost .nix-doc', (e) => e.textContent);
  if (/nix/i.test(nixExprText)) pass('sample.nix: nix badge shown'); else fail('nix badge: ' + nixExprText.slice(0, 200));
  if (/shell|mkShell|Development/i.test(nixExprText)) pass('sample.nix: detected kind shown'); else fail('nix kind: ' + nixExprText.slice(0, 300));
  if (/pythonEnv|nodeVersion|shellHook/i.test(nixExprText)) pass('sample.nix: top-level attributes shown'); else fail('nix attrs: ' + nixExprText.slice(0, 300));

  // ── sample.bicep viewer (Azure Bicep) ──
  await openExample('sample.bicep');
  await page.waitForSelector('#previewHost .bicep-doc', { timeout: 12000 });
  pass('sample.bicep: renders');
  const bicepText = await page.$eval('#previewHost .bicep-doc', (e) => e.textContent);
  if (/Bicep/i.test(bicepText)) pass('sample.bicep: Bicep badge shown'); else fail('bicep badge: ' + bicepText.slice(0, 200));
  if (/storageAccount|appServicePlan/i.test(bicepText)) pass('sample.bicep: resource names shown'); else fail('bicep resources: ' + bicepText.slice(0, 300));
  if (/param|Parameters/i.test(bicepText)) pass('sample.bicep: parameters shown'); else fail('bicep params: ' + bicepText.slice(0, 300));
  if (/resourceGroup/i.test(bicepText)) pass('sample.bicep: targetScope shown'); else fail('bicep scope: ' + bicepText.slice(0, 300));

  // ── sample.kdl viewer (KDL document) ──
  await openExample('sample.kdl');
  await page.waitForSelector('#previewHost .kdl-doc', { timeout: 12000 });
  pass('sample.kdl: renders');
  const kdlText = await page.$eval('#previewHost .kdl-doc', (e) => e.textContent);
  if (/KDL/i.test(kdlText)) pass('sample.kdl: KDL badge shown'); else fail('kdl badge: ' + kdlText.slice(0, 200));
  if (/project|dependencies|scripts|config/i.test(kdlText)) pass('sample.kdl: top-level nodes shown'); else fail('kdl nodes: ' + kdlText.slice(0, 300));
  if (/Top-level nodes|node/i.test(kdlText)) pass('sample.kdl: node count shown'); else fail('kdl count: ' + kdlText.slice(0, 300));

  // ── sample.mmd viewer (Mermaid Diagram) ──
  await openExample('sample.mmd');
  await page.waitForSelector('#previewHost .mmd-doc', { timeout: 12000 });
  pass('sample.mmd: renders');
  const mmdText = await page.$eval('#previewHost .mmd-doc', (e) => e.textContent);
  if (/Mermaid/i.test(mmdText)) pass('sample.mmd: Mermaid badge shown'); else fail('mermaid badge: ' + mmdText.slice(0, 200));
  if (/flowchart|Flowchart|graph/i.test(mmdText)) pass('sample.mmd: diagram type shown'); else fail('mermaid type: ' + mmdText.slice(0, 300));
  if (/mermaid\.live|Mermaid\.js/i.test(mmdText)) pass('sample.mmd: render note shown'); else fail('mermaid note: ' + mmdText.slice(0, 300));

  // ── sample.puml viewer (PlantUML) ──
  await openExample('sample.puml');
  await page.waitForSelector('#previewHost .puml-doc', { timeout: 12000 });
  pass('sample.puml: renders');
  const pumlText = await page.$eval('#previewHost .puml-doc', (e) => e.textContent);
  if (/PlantUML/i.test(pumlText)) pass('sample.puml: PlantUML badge shown'); else fail('plantuml badge: ' + pumlText.slice(0, 200));
  if (/Sequence|sequence|Authentication/i.test(pumlText)) pass('sample.puml: diagram type or title shown'); else fail('plantuml type: ' + pumlText.slice(0, 300));

  // ── sample.rego viewer (Rego Policy) ──
  await openExample('sample.rego');
  await page.waitForSelector('#previewHost .rego-doc', { timeout: 12000 });
  pass('sample.rego: renders');
  const regoText = await page.$eval('#previewHost .rego-doc', (e) => e.textContent);
  if (/OPA Rego|Rego/i.test(regoText)) pass('sample.rego: OPA Rego badge shown'); else fail('rego badge: ' + regoText.slice(0, 200));
  if (/authz/.test(regoText)) pass('sample.rego: package name shown'); else fail('rego package: ' + regoText.slice(0, 300));
  if (/allow|deny/i.test(regoText)) pass('sample.rego: rules shown'); else fail('rego rules: ' + regoText.slice(0, 300));

  // ── sample.adoc viewer (AsciiDoc) ──
  await openExample('sample.adoc');
  await page.waitForSelector('#previewHost .adoc-doc', { timeout: 12000 });
  pass('sample.adoc: renders');
  const adocText = await page.$eval('#previewHost .adoc-doc', (e) => e.textContent);
  if (/AsciiDoc/i.test(adocText)) pass('sample.adoc: AsciiDoc badge shown'); else fail('asciidoc badge: ' + adocText.slice(0, 200));
  if (/Getting Started/i.test(adocText)) pass('sample.adoc: document title shown'); else fail('asciidoc title: ' + adocText.slice(0, 300));
  if (/Jane Developer/i.test(adocText)) pass('sample.adoc: author shown'); else fail('asciidoc author: ' + adocText.slice(0, 300));
  if (/Installation|Usage|Introduction/i.test(adocText)) pass('sample.adoc: section headings shown'); else fail('asciidoc sections: ' + adocText.slice(0, 300));
  if (/Anchors|getting_started_guide|implicit heading/i.test(adocText)) pass('sample.adoc: anchors and heading source metadata shown'); else fail('asciidoc anchors: ' + adocText.slice(0, 800));
  const adocSourceOpen = await page.$eval('#previewHost .adoc-doc .kf-source-details', (e) => e.open);
  if (!adocSourceOpen) pass('sample.adoc: source starts collapsed'); else fail('asciidoc source should start collapsed');
  await page.click('#previewHost .adoc-doc .kf-source-link');
  const adocJump = await page.$eval('#previewHost .adoc-doc', (e) => ({
    open: e.querySelector('.kf-source-details')?.open || false,
    highlighted: !!e.querySelector('.kf-source-hit'),
  }));
  if (adocJump.open && adocJump.highlighted) pass('sample.adoc: item click opens and highlights source'); else fail('asciidoc source jump: ' + JSON.stringify(adocJump));
  const adocBad = await page.evaluate(async () => {
    const mod = await import('/types/text/known/asciidoc/renderer.js');
    const text = '= Demo\n\n[[intro]]\n== Intro\n\n[#intro]\n== Duplicate\n\nSee xref:missing[Missing].\ninclude::partials/card.adoc[]\nimage::images/hero.png[Hero]\nWARNING: Check this path.';
    const rendered = mod.render({ text }).parentNode;
    document.body.appendChild(rendered);
    const out = rendered.textContent;
    const issues = rendered.querySelector('.kf-issues')?.textContent || '';
    rendered.remove();
    return { out, issues };
  });
  if (/duplicate anchor|missing xref|partials\/card\.adoc|images\/hero\.png|WARNING/i.test(adocBad.out + adocBad.issues)) pass('sample.adoc: references, media, admonitions, and diagnostics shown'); else fail('asciidoc diagnostics: ' + JSON.stringify(adocBad).slice(0, 700));

  // ── sample.capnp viewer (Cap'n Proto) ──
  await openExample('sample.capnp');
  await page.waitForSelector('#previewHost .capnp-doc', { timeout: 12000 });
  pass('sample.capnp: renders');
  const capnpText = await page.$eval('#previewHost .capnp-doc', (e) => e.textContent);
  if (/Cap'n Proto/i.test(capnpText)) pass("sample.capnp: Cap'n Proto badge shown"); else fail('capnp badge: ' + capnpText.slice(0, 200));
  if (/0x8e7d3a8b1bc0d9bf/i.test(capnpText)) pass('sample.capnp: file ID shown'); else fail('capnp fileId: ' + capnpText.slice(0, 300));
  if (/Person|Struct/i.test(capnpText)) pass('sample.capnp: struct listed'); else fail('capnp structs: ' + capnpText.slice(0, 300));
  if (/UserService|Interface/i.test(capnpText)) pass('sample.capnp: interface listed'); else fail('capnp interfaces: ' + capnpText.slice(0, 300));

  // ── sample.fbs viewer (FlatBuffers) ──
  await openExample('sample.fbs');
  await page.waitForSelector('#previewHost .flatbuf-doc', { timeout: 12000 });
  pass('sample.fbs: renders');
  const flatbufText = await page.$eval('#previewHost .flatbuf-doc', (e) => e.textContent);
  if (/FlatBuffers/i.test(flatbufText)) pass('sample.fbs: FlatBuffers badge shown'); else fail('fbs badge: ' + flatbufText.slice(0, 200));
  if (/MyGame/i.test(flatbufText)) pass('sample.fbs: namespace shown'); else fail('fbs namespace: ' + flatbufText.slice(0, 300));
  if (/Monster|Table/i.test(flatbufText)) pass('sample.fbs: table listed'); else fail('fbs tables: ' + flatbufText.slice(0, 300));
  if (/Monster/.test(flatbufText) && /root_type/i.test(flatbufText)) pass('sample.fbs: root_type shown'); else fail('fbs root_type: ' + flatbufText.slice(0, 300));

  // ── sample.dhall viewer (Dhall) ──
  await openExample('sample.dhall');
  await page.waitForSelector('#previewHost .dhall-doc', { timeout: 12000 });
  pass('sample.dhall: renders');
  const dhallText = await page.$eval('#previewHost .dhall-doc', (e) => e.textContent);
  if (/Dhall/i.test(dhallText)) pass('sample.dhall: Dhall badge shown'); else fail('dhall badge: ' + dhallText.slice(0, 200));
  if (/let-binding|Let-binding/i.test(dhallText)) pass('sample.dhall: let-binding count shown'); else fail('dhall let: ' + dhallText.slice(0, 300));
  if (/remote import|prelude\.dhall-lang/i.test(dhallText)) pass('sample.dhall: remote import shown'); else fail('dhall import: ' + dhallText.slice(0, 300));

  // ── sample.wgsl viewer (WGSL Shader) ──
  await openExample('sample.wgsl');
  await page.waitForSelector('#previewHost .wgsl-doc', { timeout: 12000 });
  pass('sample.wgsl: renders');
  const wgslText = await page.$eval('#previewHost .wgsl-doc', (e) => e.textContent);
  if (/WGSL/i.test(wgslText)) pass('sample.wgsl: WGSL badge shown'); else fail('wgsl badge: ' + wgslText.slice(0, 200));
  if (/vertex/i.test(wgslText) && /fragment/i.test(wgslText)) pass('sample.wgsl: vertex + fragment stages shown'); else fail('wgsl stages: ' + wgslText.slice(0, 300));
  if (/Uniforms|struct/i.test(wgslText)) pass('sample.wgsl: struct listed'); else fail('wgsl structs: ' + wgslText.slice(0, 300));
  if (/group 0|group 1/i.test(wgslText)) pass('sample.wgsl: binding groups shown'); else fail('wgsl bindings: ' + wgslText.slice(0, 300));

  // ── sample.glsl viewer (GLSL Shader) ──
  await openExample('sample.glsl');
  await page.waitForSelector('#previewHost .glsl-doc', { timeout: 12000 });
  pass('sample.glsl: renders');
  const glslText = await page.$eval('#previewHost .glsl-doc', (e) => e.textContent);
  if (/GLSL/i.test(glslText)) pass('sample.glsl: GLSL badge shown'); else fail('glsl badge: ' + glslText.slice(0, 200));
  if (/vertex/i.test(glslText)) pass('sample.glsl: shader stage shown'); else fail('glsl stage: ' + glslText.slice(0, 300));
  if (/Uniforms|uniform/i.test(glslText)) pass('sample.glsl: uniforms listed'); else fail('glsl uniforms: ' + glslText.slice(0, 300));
  if (/330/i.test(glslText)) pass('sample.glsl: GLSL version shown'); else fail('glsl version: ' + glslText.slice(0, 300));

  // ── sample.hlsl viewer (HLSL Shader) ──
  await openExample('sample.hlsl');
  await page.waitForSelector('#previewHost .hlsl-doc', { timeout: 12000 });
  pass('sample.hlsl: renders');
  const hlslText = await page.$eval('#previewHost .hlsl-doc', (e) => e.textContent);
  if (/HLSL/i.test(hlslText)) pass('sample.hlsl: HLSL badge shown'); else fail('hlsl badge: ' + hlslText.slice(0, 200));
  if (/VSMain|PSMain/i.test(hlslText)) pass('sample.hlsl: entry points shown'); else fail('hlsl entry points: ' + hlslText.slice(0, 300));
  if (/PerFrame|PerObject|cbuffer/i.test(hlslText)) pass('sample.hlsl: constant buffers shown'); else fail('hlsl cbuffers: ' + hlslText.slice(0, 300));
  if (/albedoMap|Texture2D/i.test(hlslText)) pass('sample.hlsl: textures/samplers shown'); else fail('hlsl textures: ' + hlslText.slice(0, 300));
}
