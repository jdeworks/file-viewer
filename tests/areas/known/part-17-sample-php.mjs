// Auto-split slice 17/18 of the known-files smoke area (see ./../known-files.mjs).
// Covers: sample.php … sample.lean.
// Called in order on the shared ctx — keep openExample order intact; no cross-file state.
export async function run(ctx) {
  const { page, origin, frameOf, pass, fail, openExample } = ctx;

  // ── sample.php viewer (php-lang plugin) ──
  await openExample('sample.php');
  await page.waitForSelector('#previewHost .php-doc', { timeout: 12000 });
  pass('php-lang: rendered');
  const phpText = await page.$eval('#previewHost .php-doc', (e) => e.textContent);
  if (/namespace App\\Services|ContentService|RepositoryInterface/i.test(phpText)) pass('php-lang: namespace and types shown'); else fail('php-lang namespace/types: ' + phpText.slice(0, 400));
  if (/returns Post|int \$id|in ContentService|privateclearCache|staticgetInstanceCount/i.test(phpText)) pass('php-lang: member ownership, params, and returns shown'); else fail('php-lang function details: ' + phpText.slice(0, 1000));
  if (/require_once|dynamic path|App\\Helpers\\format_date|MAX_ITEMS_PER_PAGE/i.test(phpText)) pass('php-lang: includes and use declarations explained'); else fail('php-lang imports/includes: ' + phpText.slice(0, 1000));
  const phpTypeHint = await page.$eval('#previewHost .php-doc .php-tag-class', (e) => e.title);
  if (/Instantiable|state|behavior/i.test(phpTypeHint)) pass('php-lang: type hover help present'); else fail('php-lang type hint: ' + phpTypeHint);
  const phpPrivateHint = await page.$eval('#previewHost .php-doc .php-tag-private', (e) => e.title);
  if (/declaring class|accessible/i.test(phpPrivateHint)) pass('php-lang: visibility hover help present'); else fail('php-lang visibility hint: ' + phpPrivateHint);
  const phpSourceOpen = await page.$eval('#previewHost .php-doc .kf-source-details', (e) => e.open);
  if (!phpSourceOpen) pass('php-lang: source starts collapsed'); else fail('php-lang source should start collapsed');
  await page.click('#previewHost .php-doc .kf-source-link');
  const phpJump = await page.$eval('#previewHost .php-doc', (e) => ({
    open: e.querySelector('.kf-source-details')?.open || false,
    highlighted: !!e.querySelector('.kf-source-hit'),
  }));
  if (phpJump.open && phpJump.highlighted) pass('php-lang: item click opens and highlights source'); else fail('php-lang source jump: ' + JSON.stringify(phpJump));

  // ── sample.ps1 viewer (powershell-lang plugin) ──
  await openExample('sample.ps1');
  await page.waitForSelector('#previewHost .ps1-doc', { timeout: 12000 });
  pass('powershell-lang: rendered');
  const ps1Text = await page.$eval('#previewHost .ps1-doc', (e) => e.textContent);
  if (/Script Parameters \(3\)/.test(ps1Text) && /ValidateSet: dev, staging, prod/.test(ps1Text)) pass('powershell-lang: parameter metadata shown'); else fail('powershell-lang params: ' + ps1Text.slice(0, 400));
  const ps1FnTitle = await page.$eval('#previewHost .ps1-link', (e) => e.getAttribute('title') || '');
  if (/Line \d+/.test(ps1FnTitle) && /parameter/.test(ps1FnTitle)) pass('powershell-lang: function hover details shown'); else fail('powershell-lang function title: ' + ps1FnTitle);
  const ps1SourceInitiallyOpen = await page.$eval('#previewHost .ps1-details', (e) => e.open);
  if (!ps1SourceInitiallyOpen) pass('powershell-lang: source starts collapsed'); else fail('powershell-lang source should start collapsed');
  await page.click('#previewHost .ps1-link');
  const ps1Jump = await page.$eval('#previewHost .ps1-doc', (e) => ({
    open: e.querySelector('.ps1-details')?.open || false,
    highlighted: !!e.querySelector('.ps1-line-hit'),
    lines: e.querySelectorAll('.ps1-line').length,
    numbers: e.querySelectorAll('.ps1-ln').length,
  }));
  if (ps1Jump.open && ps1Jump.highlighted && ps1Jump.lines > 20 && ps1Jump.lines === ps1Jump.numbers) pass('powershell-lang: function click opens numbered source'); else fail('powershell-lang jump: ' + JSON.stringify(ps1Jump));

  // ── solidity-lang: Solidity smart contract viewer ──
  await openExample('sample.sol');
  await page.waitForSelector('#previewHost .sol-doc', { timeout: 12000 });
  pass('solidity-lang: rendered');
  const solText = await page.$eval('#previewHost .sol-doc', (e) => e.textContent);
  if (/Smart Contract|Interface|Library/i.test(solText)) pass('solidity-lang: badge shown'); else fail('solidity-lang badge: ' + solText.slice(0, 200));
  if (/pragma|solidity/i.test(solText)) pass('solidity-lang: pragma version shown'); else fail('solidity-lang pragma: ' + solText.slice(0, 300));
  if (/contract|interface|library/i.test(solText)) pass('solidity-lang: definitions listed'); else fail('solidity-lang defs: ' + solText.slice(0, 300));
  if (/returns bool|address indexed from|InsufficientBalance|whenNotPaused|SimpleToken - A basic ERC-20-like token contract/i.test(solText)) pass('solidity-lang: ABI signatures, NatSpec, events, errors, and modifiers shown'); else fail('solidity-lang details: ' + solText.slice(0, 900));
  const solEventHint = await page.$eval('#previewHost .sol-doc .sol-tag-event', (e) => e.title);
  if (/Indexed log|off-chain/i.test(solEventHint)) pass('solidity-lang: event hover help present'); else fail('solidity event hint: ' + solEventHint);
  const solSourceOpen = await page.$eval('#previewHost .sol-doc .kf-source-details', (e) => e.open);
  if (!solSourceOpen) pass('solidity-lang: source starts collapsed'); else fail('solidity source should start collapsed');
  await page.click('#previewHost .sol-doc .kf-source-link');
  const solJump = await page.$eval('#previewHost .sol-doc', (e) => ({
    open: e.querySelector('.kf-source-details')?.open || false,
    highlighted: !!e.querySelector('.kf-source-hit'),
  }));
  if (solJump.open && solJump.highlighted) pass('solidity-lang: item click opens and highlights source'); else fail('solidity source jump: ' + JSON.stringify(solJump));

  // ── vhdl-lang: VHDL hardware description viewer ──
  await openExample('sample.vhd');
  await page.waitForSelector('#previewHost .vhd-doc', { timeout: 12000 });
  pass('vhdl-lang: rendered');
  const vhdText = await page.$eval('#previewHost .vhd-doc', (e) => e.textContent);
  if (/VHDL Entity|VHDL Package|VHDL Architecture/i.test(vhdText)) pass('vhdl-lang: badge shown'); else fail('vhdl-lang badge: ' + vhdText.slice(0, 200));
  if (/entity|architecture/i.test(vhdText)) pass('vhdl-lang: entity or architecture shown'); else fail('vhdl-lang entity: ' + vhdText.slice(0, 300));

  // ── arduino-sketch: Arduino sketch viewer ──
  await openExample('sample.ino');
  await page.waitForSelector('#previewHost .ino-doc', { timeout: 12000 });
  pass('arduino-sketch: rendered');
  const inoText = await page.$eval('#previewHost .ino-doc', (e) => e.textContent);
  if (/Arduino Sketch/i.test(inoText)) pass('arduino-sketch: badge shown'); else fail('arduino-sketch badge: ' + inoText.slice(0, 200));
  if (/include|library/i.test(inoText)) pass('arduino-sketch: includes shown'); else fail('arduino-sketch includes: ' + inoText.slice(0, 300));

  // ── cobol-lang: COBOL program viewer ──
  await openExample('sample.cob');
  await page.waitForSelector('#previewHost .cob-doc', { timeout: 12000 });
  pass('cobol-lang: rendered');
  const cobText = await page.$eval('#previewHost .cob-doc', (e) => e.textContent);
  if (/COBOL Program|COBOL Copybook/i.test(cobText)) pass('cobol-lang: badge shown'); else fail('cobol-lang badge: ' + cobText.slice(0, 200));
  if (/DIVISION|division/i.test(cobText)) pass('cobol-lang: divisions listed'); else fail('cobol-lang divisions: ' + cobText.slice(0, 300));

  // ── gleam-lang: rendered ──
  await openExample('sample.gleam');
  await page.waitForSelector('#previewHost .gleam-doc', { timeout: 12000 });
  pass('gleam-lang: rendered');
  const gleamText = await page.$eval('#previewHost .gleam-doc', (e) => e.textContent);
  if (/arity 1|returns Float|shape: Shape|Internal Functions|stdlib/i.test(gleamText)) pass('gleam-lang: signatures, params, and import groups shown'); else fail('gleam-lang details: ' + gleamText.slice(0, 800));
  const gleamPubHint = await page.$eval('#previewHost .gleam-doc .gleam-tag-pub', (e) => e.title);
  if (/Public function/i.test(gleamPubHint)) pass('gleam-lang: public function hover help present'); else fail('gleam-lang pub hint: ' + gleamPubHint);
  const gleamSourceOpen = await page.$eval('#previewHost .gleam-doc .kf-source-details', (e) => e.open);
  if (!gleamSourceOpen) pass('gleam-lang: source starts collapsed'); else fail('gleam source should start collapsed');
  await page.click('#previewHost .gleam-doc .kf-source-link');
  const gleamJump = await page.$eval('#previewHost .gleam-doc', (e) => ({
    open: e.querySelector('.kf-source-details')?.open || false,
    highlighted: !!e.querySelector('.kf-source-hit'),
  }));
  if (gleamJump.open && gleamJump.highlighted) pass('gleam-lang: item click opens and highlights source'); else fail('gleam source jump: ' + JSON.stringify(gleamJump));

  // ── odin-lang: rendered ──
  await openExample('sample.odin');
  await page.waitForSelector('#previewHost .odin-doc', { timeout: 12000 });
  pass('odin-lang: rendered');
  const odinText = await page.$eval('#previewHost .odin-doc', (e) => e.textContent);
  if (/foreign_proc_example|returns i32|ctx: rawptr|Vector2.*2 fields|ODIN_OS == \.Windows/i.test(odinText)) pass('odin-lang: signatures, fields, calling convention, and when shown'); else fail('odin details: ' + odinText.slice(0, 900));
  const odinCcHint = await page.$eval('#previewHost .odin-doc .odin-tag-cc', (e) => e.title);
  if (/Calling convention|ABI/i.test(odinCcHint)) pass('odin-lang: calling convention hover help present'); else fail('odin cc hint: ' + odinCcHint);
  const odinSourceOpen = await page.$eval('#previewHost .odin-doc .kf-source-details', (e) => e.open);
  if (!odinSourceOpen) pass('odin-lang: source starts collapsed'); else fail('odin source should start collapsed');
  await page.click('#previewHost .odin-doc .kf-source-link');
  const odinJump = await page.$eval('#previewHost .odin-doc', (e) => ({
    open: e.querySelector('.kf-source-details')?.open || false,
    highlighted: !!e.querySelector('.kf-source-hit'),
  }));
  if (odinJump.open && odinJump.highlighted) pass('odin-lang: item click opens and highlights source'); else fail('odin source jump: ' + JSON.stringify(odinJump));

  // ── haxe-lang: rendered ──
  await openExample('sample.hx');
  await page.waitForSelector('#previewHost .haxe-doc', { timeout: 12000 });
  pass('haxe-lang: rendered');
  const haxeText = await page.$eval('#previewHost .haxe-doc', (e) => e.textContent);
  if (/extends Sprite|implements Updatable|returns Void|entity:Entity|@:keep|arity 2/i.test(haxeText)) pass('haxe-lang: signatures, metadata, and inheritance shown'); else fail('haxe-lang details: ' + haxeText.slice(0, 900));
  const haxeMetaHint = await page.$eval('#previewHost .haxe-doc .haxe-tag-meta', (e) => e.title);
  if (/dead-code|metadata|Expose/i.test(haxeMetaHint)) pass('haxe-lang: metadata hover help present'); else fail('haxe metadata hint: ' + haxeMetaHint);
  const haxeSourceOpen = await page.$eval('#previewHost .haxe-doc .kf-source-details', (e) => e.open);
  if (!haxeSourceOpen) pass('haxe-lang: source starts collapsed'); else fail('haxe source should start collapsed');
  await page.click('#previewHost .haxe-doc .kf-source-link');
  const haxeJump = await page.$eval('#previewHost .haxe-doc', (e) => ({
    open: e.querySelector('.kf-source-details')?.open || false,
    highlighted: !!e.querySelector('.kf-source-hit'),
  }));
  if (haxeJump.open && haxeJump.highlighted) pass('haxe-lang: item click opens and highlights source'); else fail('haxe source jump: ' + JSON.stringify(haxeJump));

  // ── ada-lang: rendered ──
  await openExample('sample.ads');
  await page.waitForSelector('#previewHost .ada-doc', { timeout: 12000 });
  pass('ada-lang: rendered');

  // ── prolog-lang: rendered ──
  await openExample('sample.pro');
  await page.waitForSelector('#previewHost .pro-doc', { timeout: 12000 });
  pass('prolog-lang: rendered');

  // ── asm-lang: rendered ──
  await openExample('sample.asm');
  await page.waitForSelector('#previewHost .asm-doc', { timeout: 12000 });
  pass('asm-lang: rendered');

  // ── objc-lang: rendered ──
  await openExample('sample.m');
  await page.waitForSelector('#previewHost .objc-doc', { timeout: 12000 });
  pass('objc-lang: rendered');

  // ── d-lang: rendered ──
  await openExample('sample.d');
  await page.waitForSelector('#previewHost .d-doc', { timeout: 12000 });
  pass('d-lang: rendered');

  // ── bind-zone: DNS zone file viewer ──
  await openExample('sample.zone (DNS Zone File)');
  await page.waitForSelector('#previewHost .zone-doc', { timeout: 12000 });
  pass('bind-zone: rendered');
  const zoneText = await page.$eval('#previewHost .zone-doc', (e) => e.textContent);
  if (/DNS Zone/i.test(zoneText)) pass('bind-zone: DNS Zone badge shown'); else fail('bind-zone badge: ' + zoneText.slice(0, 200));
  if (/example\.com|SOA/i.test(zoneText)) pass('bind-zone: zone origin or SOA shown'); else fail('bind-zone origin: ' + zoneText.slice(0, 300));
  if (/NS|MX|SPF|TXT/i.test(zoneText)) pass('bind-zone: record types shown'); else fail('bind-zone records: ' + zoneText.slice(0, 300));

  // ── coffeescript-lang: rendered ──
  await openExample('sample.coffee');
  await page.waitForSelector('#previewHost .coffee-doc', { timeout: 12000 });
  pass('coffeescript-lang: rendered');

  // ── livescript-lang: rendered ──
  await openExample('sample.ls');
  await page.waitForSelector('#previewHost .ls-doc', { timeout: 12000 });
  pass('livescript-lang: rendered');

  // ── rescript-lang: rendered ──
  await openExample('sample.res');
  await page.waitForSelector('#previewHost .res-doc', { timeout: 12000 });
  pass('rescript-lang: rendered');

  // ── reason-lang: rendered ──
  await openExample('sample.re');
  await page.waitForSelector('#previewHost .re-doc', { timeout: 12000 });
  pass('reason-lang: rendered');

  // ── pony-lang: rendered ──
  await openExample('sample.pony');
  await page.waitForSelector('#previewHost .pony-doc', { timeout: 12000 });
  pass('pony-lang: rendered');
  const ponyText = await page.$eval('#previewHost .pony-doc', (e) => e.textContent);
  if (/Counter|3 behaviours|cb: \{\(U64\)\} iso|in Dog|ColorSet|arity 2/i.test(ponyText)) pass('pony-lang: owned APIs, behaviours, capabilities, and aliases shown'); else fail('pony details: ' + ponyText.slice(0, 900));
  const ponyBeHint = await page.$eval('#previewHost .pony-doc .pony-tag-be', (e) => e.title);
  if (/asynchronous message|Behaviour/i.test(ponyBeHint)) pass('pony-lang: behaviour hover help present'); else fail('pony behaviour hint: ' + ponyBeHint);
  const ponySourceOpen = await page.$eval('#previewHost .pony-doc .kf-source-details', (e) => e.open);
  if (!ponySourceOpen) pass('pony-lang: source starts collapsed'); else fail('pony source should start collapsed');
  await page.click('#previewHost .pony-doc .kf-source-link');
  const ponyJump = await page.$eval('#previewHost .pony-doc', (e) => ({
    open: e.querySelector('.kf-source-details')?.open || false,
    highlighted: !!e.querySelector('.kf-source-hit'),
  }));
  if (ponyJump.open && ponyJump.highlighted) pass('pony-lang: item click opens and highlights source'); else fail('pony source jump: ' + JSON.stringify(ponyJump));

  // ── wren-lang: rendered ──
  await openExample('sample.wren');
  await page.waitForSelector('#previewHost .wren-doc', { timeout: 12000 });
  pass('wren-lang: rendered');

  // ── mojo-lang: rendered ──
  await openExample('sample.mojo');
  await page.waitForSelector('#previewHost .mojo-doc', { timeout: 12000 });
  pass('mojo-lang: rendered');
  const mojoText = await page.$eval('#previewHost .mojo-doc', (e) => e.textContent);
  if (/Point|2 fields|method of Matrix|returns Float32|alias|field of Point|arity 4/i.test(mojoText)) pass('mojo-lang: signatures, struct fields, aliases, and bindings shown'); else fail('mojo-lang details: ' + mojoText.slice(0, 900));
  const mojoValueHint = await page.$eval('#previewHost .mojo-doc .mojo-tag-value', (e) => e.title);
  if (/value type|generated value semantics/i.test(mojoValueHint)) pass('mojo-lang: @value hover help present'); else fail('mojo-lang value hint: ' + mojoValueHint);
  const mojoSourceOpen = await page.$eval('#previewHost .mojo-doc .kf-source-details', (e) => e.open);
  if (!mojoSourceOpen) pass('mojo-lang: source starts collapsed'); else fail('mojo source should start collapsed');
  await page.click('#previewHost .mojo-doc .kf-source-link');
  const mojoJump = await page.$eval('#previewHost .mojo-doc', (e) => ({
    open: e.querySelector('.kf-source-details')?.open || false,
    highlighted: !!e.querySelector('.kf-source-hit'),
  }));
  if (mojoJump.open && mojoJump.highlighted) pass('mojo-lang: item click opens and highlights source'); else fail('mojo source jump: ' + JSON.stringify(mojoJump));

  // ── janet-lang: rendered ──
  await openExample('sample.janet');
  await page.waitForSelector('#previewHost .janet-doc', { timeout: 12000 });
  pass('janet-lang: rendered');

  // ── awk-script viewer ──
  await openExample('sample.awk');
  await page.waitForSelector('#previewHost .awk-doc', { timeout: 12000 });
  pass('awk-script: rendered');
  const awkText = await page.$eval('#previewHost .awk-doc', (e) => e.textContent);
  if (/AWK Script/i.test(awkText)) pass('awk-script: badge shown'); else fail('awk-script badge: ' + awkText.slice(0, 200));
  if (/BEGIN|END|Rules|Functions/i.test(awkText)) pass('awk-script: structure shown'); else fail('awk-script structure: ' + awkText.slice(0, 300));

  // ── sed-script viewer ──
  await openExample('sample.sed');
  await page.waitForSelector('#previewHost .sed-doc', { timeout: 12000 });
  pass('sed-script: rendered');
  const sedText = await page.$eval('#previewHost .sed-doc', (e) => e.textContent);
  if (/sed Script/i.test(sedText)) pass('sed-script: badge shown'); else fail('sed-script badge: ' + sedText.slice(0, 200));
  if (/Substitution|Command|delete|branch/i.test(sedText)) pass('sed-script: commands shown'); else fail('sed-script commands: ' + sedText.slice(0, 300));

  // ── m4-macro viewer ──
  await openExample('configure.ac');
  await page.waitForSelector('#previewHost .m4-doc', { timeout: 12000 });
  pass('m4-macro: rendered');
  const m4Text = await page.$eval('#previewHost .m4-doc', (e) => e.textContent);
  if (/M4 Macro|Autoconf/i.test(m4Text)) pass('m4-macro: badge shown'); else fail('m4-macro badge: ' + m4Text.slice(0, 200));
  if (/myproject|AC_/i.test(m4Text)) pass('m4-macro: project or macros shown'); else fail('m4-macro project: ' + m4Text.slice(0, 300));

  // ── lex-yacc viewer ──
  await openExample('sample.y');
  await page.waitForSelector('#previewHost .ly-doc', { timeout: 12000 });
  pass('lex-yacc: rendered');
  const lyText = await page.$eval('#previewHost .ly-doc', (e) => e.textContent);
  if (/Yacc|Bison|Lex|Flex/i.test(lyText)) pass('lex-yacc: badge shown'); else fail('lex-yacc badge: ' + lyText.slice(0, 200));
  if (/token|Token|grammar|rule/i.test(lyText)) pass('lex-yacc: tokens or rules shown'); else fail('lex-yacc tokens: ' + lyText.slice(0, 300));

  // ── elvish-script viewer ──
  await openExample('sample.elv');
  await page.waitForSelector('#previewHost .elv-doc', { timeout: 12000 });
  pass('elvish-script: rendered');
  const elvText = await page.$eval('#previewHost .elv-doc', (e) => e.textContent);
  if (/Elvish Script/i.test(elvText)) pass('elvish-script: badge shown'); else fail('elvish-script badge: ' + elvText.slice(0, 200));
  if (/Functions|Modules|use|fn/i.test(elvText)) pass('elvish-script: structure shown'); else fail('elvish-script structure: ' + elvText.slice(0, 300));

  // ── fish-script viewer ──
  await openExample('sample.fish');
  await page.waitForSelector('#previewHost .fish-doc', { timeout: 12000 });
  pass('fish-script: rendered');
  const fishText = await page.$eval('#previewHost .fish-doc', (e) => e.textContent);
  if (/Fish Script|Fish Config/i.test(fishText)) pass('fish-script: badge shown'); else fail('fish-script badge: ' + fishText.slice(0, 200));
  if (/Functions|Aliases|Abbrevs|function/i.test(fishText)) pass('fish-script: structure shown'); else fail('fish-script structure: ' + fishText.slice(0, 300));

  // ── zsh-script viewer ──
  await openExample('sample.zsh');
  await page.waitForSelector('#previewHost .zsh-doc', { timeout: 12000 });
  pass('zsh-script: rendered');
  const zshText = await page.$eval('#previewHost .zsh-doc', (e) => e.textContent);
  if (/Zsh Script/i.test(zshText)) pass('zsh-script: badge shown'); else fail('zsh-script badge: ' + zshText.slice(0, 200));
  if (/Functions|Autoloads|Bindings|Completions/i.test(zshText)) pass('zsh-script: structure shown'); else fail('zsh-script structure: ' + zshText.slice(0, 300));

  // ── nushell-script viewer ──
  await openExample('sample.nu');
  await page.waitForSelector('#previewHost .nu-doc', { timeout: 12000 });
  pass('nushell-script: rendered');
  const nuScriptText = await page.$eval('#previewHost .nu-doc', (e) => e.textContent);
  if (/Nushell Script/i.test(nuScriptText)) pass('nushell-script: badge shown'); else fail('nushell-script badge: ' + nuScriptText.slice(0, 200));
  if (/Commands|Exported|def|export/i.test(nuScriptText)) pass('nushell-script: structure shown'); else fail('nushell-script structure: ' + nuScriptText.slice(0, 300));

  // ── gdscript-lang viewer ──
  await openExample('sample.gd');
  await page.waitForSelector('#previewHost .gd-doc', { timeout: 12000 });
  pass('gdscript-lang: rendered');
  const gdscriptText = await page.$eval('#previewHost .gd-doc', (e) => e.textContent);
  if (/GDScript|Godot Tool Script/i.test(gdscriptText)) pass('gdscript-lang: badge shown'); else fail('gdscript-lang badge: ' + gdscriptText.slice(0, 200));
  if (/Extends|Functions|Signals|Exports/i.test(gdscriptText)) pass('gdscript-lang: structure shown'); else fail('gdscript-lang structure: ' + gdscriptText.slice(0, 300));
  if (/sync_position|branches|lines|@rpc/i.test(gdscriptText)) pass('gdscript-lang: signature and complexity hints shown'); else fail('gdscript-lang detail: ' + gdscriptText.slice(0, 500));
  const gdSourceOpen = await page.$eval('#previewHost .gd-doc .kf-source-details', (e) => e.open);
  if (!gdSourceOpen) pass('gdscript-lang: source starts collapsed'); else fail('gdscript source should start collapsed');
  await page.click('#previewHost .gd-doc .kf-source-link');
  const gdJump = await page.$eval('#previewHost .gd-doc', (e) => ({
    open: e.querySelector('.kf-source-details')?.open || false,
    highlighted: !!e.querySelector('.kf-source-hit'),
  }));
  if (gdJump.open && gdJump.highlighted) pass('gdscript-lang: symbol click opens and highlights source'); else fail('gdscript source jump: ' + JSON.stringify(gdJump));

  // ── ink-script viewer ──
  await openExample('sample.ink');
  await page.waitForSelector('#previewHost .ink-doc', { timeout: 12000 });
  pass('ink-script: rendered');
  const inkText = await page.$eval('#previewHost .ink-doc', (e) => e.textContent);
  if (/Ink Story/i.test(inkText)) pass('ink-script: badge shown'); else fail('ink-script badge: ' + inkText.slice(0, 200));
  if (/Knots|Variables|Choices|Diverts/i.test(inkText)) pass('ink-script: structure shown'); else fail('ink-script structure: ' + inkText.slice(0, 300));

  // ── fennel-lang viewer ──
  await openExample('sample.fnl');
  await page.waitForSelector('#previewHost .fnl-doc', { timeout: 12000 });
  pass('fennel-lang: rendered');
  const fnlText = await page.$eval('#previewHost .fnl-doc', (e) => e.textContent);
  if (/Fennel Script/i.test(fnlText)) pass('fennel-lang: badge shown'); else fail('fennel-lang badge: ' + fnlText.slice(0, 200));
  if (/Requires|Functions|Locals|Macros/i.test(fnlText)) pass('fennel-lang: structure shown'); else fail('fennel-lang structure: ' + fnlText.slice(0, 300));

  // ── ballerina-lang viewer ──
  await openExample('sample.bal');
  await page.waitForSelector('#previewHost .bal-doc', { timeout: 12000 });
  pass('ballerina-lang: rendered');
  const balText = await page.$eval('#previewHost .bal-doc', (e) => e.textContent);
  if (/Ballerina/i.test(balText)) pass('ballerina-lang: badge shown'); else fail('ballerina-lang badge: ' + balText.slice(0, 200));
  if (/Imports|Services|Functions|Types/i.test(balText)) pass('ballerina-lang: structure shown'); else fail('ballerina-lang structure: ' + balText.slice(0, 300));
  if (/resource function get products|returns error\?|http:Caller caller|sensitive config/i.test(balText)) pass('ballerina-lang: signatures, params, and review notes shown'); else fail('ballerina-lang details: ' + balText.slice(0, 800));
  const balResourceHint = await page.$eval('#previewHost .bal-doc .bal-tag-resource', (e) => e.title);
  if (/resource path|HTTP/i.test(balResourceHint)) pass('ballerina-lang: qualifier hover help present'); else fail('ballerina-lang qualifier hint: ' + balResourceHint);
  const balSourceOpen = await page.$eval('#previewHost .bal-doc .kf-source-details', (e) => e.open);
  if (!balSourceOpen) pass('ballerina-lang: source starts collapsed'); else fail('ballerina source should start collapsed');
  await page.click('#previewHost .bal-doc .kf-source-link');
  const balJump = await page.$eval('#previewHost .bal-doc', (e) => ({
    open: e.querySelector('.kf-source-details')?.open || false,
    highlighted: !!e.querySelector('.kf-source-hit'),
  }));
  if (balJump.open && balJump.highlighted) pass('ballerina-lang: item click opens and highlights source'); else fail('ballerina source jump: ' + JSON.stringify(balJump));

  // ── nix-flake viewer ──
  await openExample('flake.nix');
  await page.waitForSelector('#previewHost .nf-doc', { timeout: 12000 });
  pass('nix-flake: rendered');
  const nfText = await page.$eval('#previewHost .nf-doc', (e) => e.textContent);
  if (/Nix Flake/i.test(nfText)) pass('nix-flake: badge shown'); else fail('nix-flake badge: ' + nfText.slice(0, 200));
  if (/nixpkgs|flake-utils|home-manager/i.test(nfText)) pass('nix-flake: inputs shown'); else fail('nix-flake inputs: ' + nfText.slice(0, 300));
  if (/devShells|packages|apps|overlays|nixosModules/i.test(nfText)) pass('nix-flake: outputs shown'); else fail('nix-flake outputs: ' + nfText.slice(0, 300));

  // ── openrc-init viewer ──
  await openExample('openrc-myapp');
  await page.waitForSelector('#previewHost .orc-doc', { timeout: 12000 });
  pass('openrc-init: rendered');
  const orcText = await page.$eval('#previewHost .orc-doc', (e) => e.textContent);
  if (/OpenRC/i.test(orcText)) pass('openrc-init: badge shown'); else fail('openrc-init badge: ' + orcText.slice(0, 200));
  if (/start|stop|depend/i.test(orcText)) pass('openrc-init: functions shown'); else fail('openrc-init functions: ' + orcText.slice(0, 300));
  if (/net|logger|postgresql|redis/i.test(orcText)) pass('openrc-init: dependencies shown'); else fail('openrc-init deps: ' + orcText.slice(0, 300));

  // ── ssh-known-hosts viewer ──
  await openExample('known_hosts');
  await page.waitForSelector('#previewHost .skh-doc', { timeout: 12000 });
  pass('ssh-known-hosts: rendered');
  const skhText = await page.$eval('#previewHost .skh-doc', (e) => e.textContent);
  if (/SSH Known Hosts/i.test(skhText)) pass('ssh-known-hosts: badge shown'); else fail('ssh-known-hosts badge: ' + skhText.slice(0, 200));
  if (/ed25519|ecdsa|rsa/i.test(skhText)) pass('ssh-known-hosts: key types shown'); else fail('ssh-known-hosts key types: ' + skhText.slice(0, 300));
  if (/github\.com|192\.168/i.test(skhText)) pass('ssh-known-hosts: hostnames shown'); else fail('ssh-known-hosts hosts: ' + skhText.slice(0, 300));

  // ── etc-environment viewer ──
  await openExample('environment');
  await page.waitForSelector('#previewHost .etcenv-doc', { timeout: 12000 });
  pass('etc-environment: rendered');
  const etcenvText = await page.$eval('#previewHost .etcenv-doc', (e) => e.textContent);
  if (/System Env/i.test(etcenvText)) pass('etc-environment: badge shown'); else fail('etc-environment badge: ' + etcenvText.slice(0, 200));
  if (/LANG|LC_ALL|TZ|JAVA_HOME/i.test(etcenvText)) pass('etc-environment: variables shown'); else fail('etc-environment vars: ' + etcenvText.slice(0, 300));
  if (/locale|java|timezone/i.test(etcenvText)) pass('etc-environment: categories shown'); else fail('etc-environment categories: ' + etcenvText.slice(0, 300));

  // ── typst-doc viewer ──
  await openExample('sample.typ');
  await page.waitForSelector('#previewHost .typ-doc', { timeout: 12000 });
  pass('typst-doc: rendered');
  const typText = await page.$eval('#previewHost .typ-doc', (e) => e.textContent);
  if (/Typst Document/i.test(typText)) pass('typst-doc: badge shown'); else fail('typst-doc badge: ' + typText.slice(0, 200));
  if (/import|definition|set rule|show rule/i.test(typText)) pass('typst-doc: structure shown'); else fail('typst-doc structure: ' + typText.slice(0, 300));
  if (/introduction|conclusion|mathematical/i.test(typText)) pass('typst-doc: headings shown'); else fail('typst-doc headings: ' + typText.slice(0, 300));

  // ── textile-markup viewer ──
  await openExample('sample.textile');
  await page.waitForSelector('#previewHost .textile-doc', { timeout: 12000 });
  pass('textile-markup: rendered');
  const textileText = await page.$eval('#previewHost .textile-doc', (e) => e.textContent);
  if (/Textile/i.test(textileText)) pass('textile-markup: badge shown'); else fail('textile-markup badge: ' + textileText.slice(0, 200));
  if (/heading|link|image|code|table|word/i.test(textileText)) pass('textile-markup: stats shown'); else fail('textile-markup stats: ' + textileText.slice(0, 300));
  if (/Getting Started|Text Formatting|Links/i.test(textileText)) pass('textile-markup: heading outline shown'); else fail('textile-markup outline: ' + textileText.slice(0, 300));
  if (/Images|Links|alt|Company Logo/i.test(textileText)) pass('textile-markup: enhanced link and image details shown'); else fail('textile-markup enhanced details: ' + textileText.slice(0, 900));
  const textileSourceOpen = await page.$eval('#previewHost .textile-doc .kf-source-details', (e) => e.open);
  if (!textileSourceOpen) pass('textile-markup: source starts collapsed'); else fail('textile-markup source should start collapsed');
  await page.click('#previewHost .textile-doc .textile-outline .kf-source-link');
  const textileJump = await page.$eval('#previewHost .textile-doc', (e) => ({
    open: e.querySelector('.kf-source-details')?.open || false,
    highlighted: !!e.querySelector('.kf-source-hit'),
  }));
  if (textileJump.open && textileJump.highlighted) pass('textile-markup: heading click opens and highlights source'); else fail('textile-markup source jump: ' + JSON.stringify(textileJump));
  const textileBad = await page.evaluate(async () => {
    const mod = await import('/types/text/known/textile-markup/renderer.js');
    const text = 'h1. Demo\n\nBroken "link":notaurl\nBroken image !missing.png\nGood image !/ok.png(Alt text)!';
    const rendered = mod.render({ text }).parentNode;
    document.body.appendChild(rendered);
    const out = rendered.textContent;
    const issues = rendered.querySelector('.kf-issues')?.textContent || '';
    const open = rendered.querySelector('.kf-source-details')?.open || false;
    rendered.remove();
    return { out, issues, open };
  });
  if (/malformed link|malformed image|Alt text/i.test(textileBad.out + textileBad.issues) && !textileBad.open) pass('textile-markup: malformed link/image diagnostics shown'); else fail('textile-markup synthetic diagnostics: ' + JSON.stringify(textileBad).slice(0, 900));

  // ── mediawiki-markup viewer ──
  await openExample('sample.mediawiki');
  await page.waitForSelector('#previewHost .mw-doc', { timeout: 12000 });
  pass('mediawiki-markup: rendered');
  const mwText = await page.$eval('#previewHost .mw-doc', (e) => e.textContent);
  if (/MediaWiki/i.test(mwText)) pass('mediawiki-markup: badge shown'); else fail('mediawiki-markup badge: ' + mwText.slice(0, 200));
  if (/section|template|categor|link/i.test(mwText)) pass('mediawiki-markup: stats shown'); else fail('mediawiki-markup stats: ' + mwText.slice(0, 300));
  if (/Introduction|Headings|References/i.test(mwText)) pass('mediawiki-markup: sections shown'); else fail('mediawiki-markup sections: ' + mwText.slice(0, 300));
  if (/Files & Images|caption|references list|Tables/i.test(mwText)) pass('mediawiki-markup: enhanced file/ref/table details shown'); else fail('mediawiki-markup enhanced details: ' + mwText.slice(0, 900));
  const mwSourceOpen = await page.$eval('#previewHost .mw-doc .kf-source-details', (e) => e.open);
  if (!mwSourceOpen) pass('mediawiki-markup: source starts collapsed'); else fail('mediawiki-markup source should start collapsed');
  await page.click('#previewHost .mw-doc .mw-outline .kf-source-link');
  const mwJump = await page.$eval('#previewHost .mw-doc', (e) => ({
    open: e.querySelector('.kf-source-details')?.open || false,
    highlighted: !!e.querySelector('.kf-source-hit'),
  }));
  if (mwJump.open && mwJump.highlighted) pass('mediawiki-markup: outline click opens and highlights source'); else fail('mediawiki-markup source jump: ' + JSON.stringify(mwJump));
  const mwBad = await page.evaluate(async () => {
    const mod = await import('/types/text/known/mediawiki-markup/renderer.js');
    const text = '== Intro ==\n{{#if:{{{name|}}}|Hello}}\n[[File:Demo.png|thumb|alt=Accessible demo|Visible caption]]\nText<ref name=\"a\">A</ref>\nAgain<ref name=\"a\">B</ref>\nMissing<ref name=\"missing\" />\n[[Category:Demo]]\n[[Category:Demo]]';
    const rendered = mod.render({ text }).parentNode;
    document.body.appendChild(rendered);
    const out = rendered.textContent;
    const issues = rendered.querySelector('.kf-issues')?.textContent || '';
    const open = rendered.querySelector('.kf-source-details')?.open || false;
    rendered.remove();
    return { out, issues, open };
  });
  if (/Parser Functions|#if|caption|alt|duplicate category|duplicate ref|missing ref|references list/i.test(mwBad.out + mwBad.issues) && !mwBad.open) pass('mediawiki-markup: parser functions, media, and markup diagnostics shown'); else fail('mediawiki-markup synthetic diagnostics: ' + JSON.stringify(mwBad).slice(0, 900));

  // ── bbcode-text viewer ──
  await openExample('sample.bbc');
  await page.waitForSelector('#previewHost .bbc-doc', { timeout: 12000 });
  pass('bbcode-text: rendered');
  const bbcText = await page.$eval('#previewHost .bbc-doc', (e) => e.textContent);
  if (/BBCode/i.test(bbcText)) pass('bbcode-text: badge shown'); else fail('bbcode-text badge: ' + bbcText.slice(0, 200));
  if (/tag type|link|quote|code block|bold|italic/i.test(bbcText)) pass('bbcode-text: stats shown'); else fail('bbcode-text stats: ' + bbcText.slice(0, 300));
  if (/url|img|quote|code/i.test(bbcText)) pass('bbcode-text: tag inventory shown'); else fail('bbcode-text tags: ' + bbcText.slice(0, 300));

  // ── vala-lang viewer ──
  await openExample('sample.vala');
  await page.waitForSelector('#previewHost .vla-doc', { timeout: 12000 });
  pass('vala-lang: rendered');
  const valaText = await page.$eval('#previewHost .vla-doc', (e) => e.textContent);
  if (/Vala/i.test(valaText)) pass('vala-lang: badge shown'); else fail('vala-lang badge: ' + valaText.slice(0, 200));
  if (/Hello|Greeter|Color/i.test(valaText)) pass('vala-lang: types listed'); else fail('vala-lang types: ' + valaText.slice(0, 300));
  if (/GLib|Gtk/i.test(valaText)) pass('vala-lang: namespaces shown'); else fail('vala-lang namespaces: ' + valaText.slice(0, 300));
  if (/main/i.test(valaText)) pass('vala-lang: main() presence noted'); else fail('vala-lang main: ' + valaText.slice(0, 300));

  // ── idris-lang viewer ──
  await openExample('sample.idr');
  await page.waitForSelector('#previewHost .idr-doc', { timeout: 12000 });
  pass('idris-lang: rendered');
  const idrisText = await page.$eval('#previewHost .idr-doc', (e) => e.textContent);
  if (/Idris/i.test(idrisText)) pass('idris-lang: badge shown'); else fail('idris-lang badge: ' + idrisText.slice(0, 200));
  if (/Main/i.test(idrisText)) pass('idris-lang: module name shown'); else fail('idris-lang module: ' + idrisText.slice(0, 300));
  if (/Shape|Circle|Rectangle|Triangle/i.test(idrisText)) pass('idris-lang: data types listed'); else fail('idris-lang data types: ' + idrisText.slice(0, 300));
  if (/total|partial/i.test(idrisText)) pass('idris-lang: totality annotations shown'); else fail('idris-lang totality: ' + idrisText.slice(0, 300));

  // ── sml-lang viewer ──
  await openExample('sample.sml');
  await page.waitForSelector('#previewHost .sml-doc', { timeout: 12000 });
  pass('sml-lang: rendered');
  const smlText = await page.$eval('#previewHost .sml-doc', (e) => e.textContent);
  if (/Standard ML/i.test(smlText)) pass('sml-lang: badge shown'); else fail('sml-lang badge: ' + smlText.slice(0, 200));
  if (/Main|Math|MakeSet/i.test(smlText)) pass('sml-lang: structure/functor names listed'); else fail('sml-lang modules: ' + smlText.slice(0, 300));
  if (/val|fun/i.test(smlText)) pass('sml-lang: binding counts shown'); else fail('sml-lang bindings: ' + smlText.slice(0, 300));

  // ── tex-doc viewer ──
  await openExample('sample.tex');
  await page.waitForSelector('#previewHost .tex-doc', { timeout: 12000 });
  pass('tex-doc: rendered');
  const texText = await page.$eval('#previewHost .tex-doc', (e) => e.textContent);
  if (/LaTeX/i.test(texText)) pass('tex-doc: badge shown'); else fail('tex-doc badge: ' + texText.slice(0, 200));
  if (/article/i.test(texText)) pass('tex-doc: document class shown'); else fail('tex-doc class: ' + texText.slice(0, 300));
  if (/amsmath|graphicx|hyperref/i.test(texText)) pass('tex-doc: packages listed'); else fail('tex-doc packages: ' + texText.slice(0, 300));
  if (/Introduction|Mathematics|Conclusion/i.test(texText)) pass('tex-doc: section titles shown'); else fail('tex-doc sections: ' + texText.slice(0, 300));

  // ── forth-lang viewer ──
  await openExample('sample.fth');
  await page.waitForSelector('#previewHost .fth-doc', { timeout: 12000 });
  pass('forth-lang: rendered');
  const fthText = await page.$eval('#previewHost .fth-doc', (e) => e.textContent);
  if (/Forth/i.test(fthText)) pass('forth-lang: badge shown'); else fail('forth-lang badge: ' + fthText.slice(0, 200));
  if (/word|variable|constant|stack/i.test(fthText)) pass('forth-lang: stats shown'); else fail('forth-lang stats: ' + fthText.slice(0, 300));

  // ── lean-lang viewer ──
  await openExample('sample.lean');
  await page.waitForSelector('#previewHost .ln-doc', { timeout: 12000 });
  pass('lean-lang: rendered');
  const lnText = await page.$eval('#previewHost .ln-doc', (e) => e.textContent);
  if (/Lean/i.test(lnText)) pass('lean-lang: badge shown'); else fail('lean-lang badge: ' + lnText.slice(0, 200));
  if (/theorem|lemma|def|import|namespace/i.test(lnText)) pass('lean-lang: stats shown'); else fail('lean-lang stats: ' + lnText.slice(0, 300));
}
