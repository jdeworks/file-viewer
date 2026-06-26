// Auto-split slice 16/18 of the known-files smoke area (see ./../known-files.mjs).
// Covers: sample.rst … sample.pm.
// Called in order on the shared ctx — keep openExample order intact; no cross-file state.
export async function run(ctx) {
  const { page, origin, frameOf, pass, fail, openExample } = ctx;

  // ── sample.rst viewer (reStructuredText) ──
  await openExample('sample.rst');
  await page.waitForSelector('#previewHost .rst-doc', { timeout: 12000 });
  pass('sample.rst: renders');
  const rstText = await page.$eval('#previewHost .rst-doc', (e) => e.textContent);
  if (/RST|reStructuredText/i.test(rstText)) pass('sample.rst: RST badge shown'); else fail('rst badge: ' + rstText.slice(0, 200));
  if (/Getting Started/i.test(rstText)) pass('sample.rst: document title shown'); else fail('rst title: ' + rstText.slice(0, 300));
  if (/Installation|Usage|Introduction/i.test(rstText)) pass('sample.rst: section headings shown'); else fail('rst sections: ' + rstText.slice(0, 300));
  if (/note|code-block|warning/i.test(rstText)) pass('sample.rst: directives listed'); else fail('rst directives: ' + rstText.slice(0, 300));
  if (/References|Reference Review|document ref/i.test(rstText)) pass('sample.rst: references and standalone doc warnings shown'); else fail('rst references: ' + rstText.slice(0, 500));
  if (/Targets|Substitutions/i.test(rstText)) pass('sample.rst: target and substitution summary cards shown'); else fail('rst target cards: ' + rstText.slice(0, 500));
  const rstSourceOpen = await page.$eval('#previewHost .rst-doc .kf-source-details', (e) => e.open);
  if (!rstSourceOpen) pass('sample.rst: source starts collapsed'); else fail('rst source should start collapsed');
  const rstDirectiveHint = await page.$eval('#previewHost .rst-doc .rst-dir-tag', (e) => e.title);
  if (/directive|admonition|code block|Sphinx|table/i.test(rstDirectiveHint)) pass('sample.rst: directive hover help present'); else fail('rst directive hint: ' + rstDirectiveHint);
  await page.click('#previewHost .rst-doc .rst-outline .kf-source-link');
  const rstJump = await page.$eval('#previewHost .rst-doc', (e) => ({
    open: e.querySelector('.kf-source-details')?.open || false,
    highlighted: !!e.querySelector('.kf-source-hit'),
  }));
  if (rstJump.open && rstJump.highlighted) pass('sample.rst: outline click opens and highlights source'); else fail('rst source jump: ' + JSON.stringify(rstJump));
  const rstBad = await page.evaluate(async () => {
    const mod = await import('/types/text/known/restructuredtext/renderer.js');
    const text = 'Demo\n====\n\n.. |product| replace:: Widget\n\nSee |missing| and :ref:`intro`.\n\n.. _intro:\n\nIntro\n-----\n\n.. toctree::\n   :maxdepth 2\n   guide/install\n   api/index\n\n.. include:: shared/intro.rst\n   :bad option\n\n.. image:: images/logo.png\n';
    const rendered = mod.render({ text }).parentNode;
    document.body.appendChild(rendered);
    const out = rendered.textContent;
    const issues = rendered.querySelector('.kf-issues')?.textContent || '';
    rendered.remove();
    return { out, issues };
  });
  if (/Directive Targets|toctree|shared\/intro\.rst|images\/logo\.png|Substitutions|missing substitution|directive option/i.test(rstBad.out + rstBad.issues)) pass('sample.rst: targets, substitutions, and directive diagnostics shown'); else fail('rst diagnostics: ' + JSON.stringify(rstBad).slice(0, 800));

  // ── sample.org viewer (Org-mode) ──
  await openExample('sample.org');
  await page.waitForSelector('#previewHost .org-doc', { timeout: 12000 });
  pass('sample.org: renders');
  const orgText = await page.$eval('#previewHost .org-doc', (e) => e.textContent);
  if (/Org/i.test(orgText)) pass('sample.org: Org badge shown'); else fail('org badge: ' + orgText.slice(0, 200));
  if (/Project Notes/i.test(orgText)) pass('sample.org: document title shown'); else fail('org title: ' + orgText.slice(0, 300));
  if (/Jane Developer/i.test(orgText)) pass('sample.org: author shown'); else fail('org author: ' + orgText.slice(0, 300));
  if (/TODO|DONE/i.test(orgText)) pass('sample.org: TODO/DONE items shown'); else fail('org todos: ' + orgText.slice(0, 300));
  if (/python|json/i.test(orgText)) pass('sample.org: code block languages shown'); else fail('org code langs: ' + orgText.slice(0, 300));
  if (/TODO Distribution|Tags|Timestamps|Source Blocks|Links|file link/i.test(orgText)) pass('sample.org: enhanced Org sections shown'); else fail('org enhanced sections: ' + orgText.slice(0, 900));
  const orgSourceOpen = await page.$eval('#previewHost .org-doc .kf-source-details', (e) => e.open);
  if (!orgSourceOpen) pass('sample.org: source starts collapsed'); else fail('org source should start collapsed');
  await page.click('#previewHost .org-doc .org-outline .kf-source-link');
  const orgJump = await page.$eval('#previewHost .org-doc', (e) => ({
    open: e.querySelector('.kf-source-details')?.open || false,
    highlighted: !!e.querySelector('.kf-source-hit'),
  }));
  if (orgJump.open && orgJump.highlighted) pass('sample.org: outline click opens and highlights source'); else fail('org source jump: ' + JSON.stringify(orgJump));
  const orgBad = await page.evaluate(async () => {
    const mod = await import('/types/text/known/org-mode/renderer.js');
    const text = '#+TITLE: Demo\n\n* TODO Ship :release:\nSCHEDULED: <2026-07-01 Wed>\nDEADLINE: <2026-07-03 Fri>\n\n#+NAME: example\n#+BEGIN_SRC js :results output\nconsole.log(1)\n#+END_SRC\n#+RESULTS: example\n: 1\n\nSee [[missing-target][missing]] and [[file:notes.org][notes]].';
    const rendered = mod.render({ text }).parentNode;
    document.body.appendChild(rendered);
    const out = rendered.textContent;
    const issues = rendered.querySelector('.kf-issues')?.textContent || '';
    const open = rendered.querySelector('.kf-source-details')?.open || false;
    rendered.remove();
    return { out, issues, open };
  });
  if (/Tags|:release:|SCHEDULED|DEADLINE|named block|Results|broken link|file link/i.test(orgBad.out + orgBad.issues) && !orgBad.open) pass('sample.org: tags, dates, blocks, results, and link diagnostics shown'); else fail('org synthetic diagnostics: ' + JSON.stringify(orgBad).slice(0, 900));

  // ── sample.liquid viewer (Liquid Template) ──
  await openExample('sample.liquid');
  await page.waitForSelector('#previewHost .liq-doc', { timeout: 12000 });
  pass('sample.liquid: renders');
  const liqText = await page.$eval('#previewHost .liq-doc', (e) => e.textContent);
  if (/Liquid/i.test(liqText)) pass('sample.liquid: Liquid badge shown'); else fail('liquid badge: ' + liqText.slice(0, 200));
  if (/output tag|block tag/i.test(liqText)) pass('sample.liquid: tag counts shown'); else fail('liquid tag counts: ' + liqText.slice(0, 300));
  if (/money|upcase|handleize/i.test(liqText)) pass('sample.liquid: filters listed'); else fail('liquid filters: ' + liqText.slice(0, 300));
  if (/render|include|section/i.test(liqText)) pass('sample.liquid: includes/renders shown'); else fail('liquid includes: ' + liqText.slice(0, 300));

  // ── sample.hbs viewer (Handlebars Template) ──
  await openExample('sample.hbs');
  await page.waitForSelector('#previewHost .hbs-doc', { timeout: 12000 });
  pass('sample.hbs: renders');
  const hbsText = await page.$eval('#previewHost .hbs-doc', (e) => e.textContent);
  if (/Handlebars/i.test(hbsText)) pass('sample.hbs: Handlebars badge shown'); else fail('hbs badge: ' + hbsText.slice(0, 200));
  if (/expression|block helper/i.test(hbsText)) pass('sample.hbs: expression counts shown'); else fail('hbs counts: ' + hbsText.slice(0, 300));
  if (/if|each|with|unless/i.test(hbsText)) pass('sample.hbs: block helpers listed'); else fail('hbs block helpers: ' + hbsText.slice(0, 300));
  if (/partial|partials/i.test(hbsText)) pass('sample.hbs: partials shown'); else fail('hbs partials: ' + hbsText.slice(0, 300));
  if (/External-looking Variables|user\.email|formatDate/i.test(hbsText)) pass('sample.hbs: variable/helper inventory shown'); else fail('hbs inventory: ' + hbsText.slice(0, 500));
  if (/render helper|template dependency|unescaped|section context/i.test(hbsText)) pass('sample.hbs: helper, dependency, and output hints shown'); else fail('hbs details: ' + hbsText.slice(0, 900));
  const hbsPartialHint = await page.$$eval('#previewHost .hbs-doc .hbs-tag', (tags) => tags.find((el) => el.textContent === 'partial')?.title || '');
  if (/Includes another template|render host/i.test(hbsPartialHint)) pass('sample.hbs: partial hover help present'); else fail('hbs partial hint: ' + hbsPartialHint);
  const hbsCustomText = await page.$$eval('#previewHost .hbs-doc .hbs-section', (sections) => sections.find((el) => /Custom Helpers/.test(el.textContent || ''))?.textContent || '');
  if (/capitalize|formatDate|isoDate|truncate/i.test(hbsCustomText) && !/breadcrumbItems/.test(hbsCustomText)) pass('sample.hbs: inline custom helpers separated from sections'); else fail('hbs custom helpers: ' + hbsCustomText.slice(0, 700));
  const hbsSourceOpen = await page.$eval('#previewHost .hbs-doc .kf-source-details', (e) => e.open);
  if (!hbsSourceOpen) pass('sample.hbs: source starts collapsed'); else fail('hbs source should start collapsed');
  await page.click('#previewHost .hbs-doc .kf-source-link');
  const hbsJump = await page.$eval('#previewHost .hbs-doc', (e) => ({
    open: e.querySelector('.kf-source-details')?.open || false,
    highlighted: !!e.querySelector('.kf-source-hit'),
  }));
  if (hbsJump.open && hbsJump.highlighted) pass('sample.hbs: summary click opens and highlights source'); else fail('hbs source jump: ' + JSON.stringify(hbsJump));
  const hbsBad = await page.evaluate(async () => {
    const mod = await import('/types/text/known/handlebars-template/renderer.js');
    const rendered = mod.render({ text: '{{#if user}}\n{{name}}\n{{/each}}\n{{#open}}' }).parentNode;
    document.body.appendChild(rendered);
    const text = rendered.textContent;
    const issues = rendered.querySelector('.kf-issues')?.textContent || '';
    rendered.remove();
    return { text, issues };
  });
  if (/mismatch|unclosed block/i.test(hbsBad.text + hbsBad.issues)) pass('sample.hbs: malformed block diagnostics shown'); else fail('hbs diagnostics: ' + JSON.stringify(hbsBad).slice(0, 500));

  // ── sample.j2 viewer (Jinja2 Template) ──
  await openExample('sample.j2');
  await page.waitForSelector('#previewHost .j2-doc', { timeout: 12000 });
  pass('sample.j2: renders');
  const j2Text = await page.$eval('#previewHost .j2-doc', (e) => e.textContent);
  if (/Jinja2/i.test(j2Text)) pass('sample.j2: Jinja2 badge shown'); else fail('j2 badge: ' + j2Text.slice(0, 200));
  if (/block|Blocks/i.test(j2Text)) pass('sample.j2: blocks listed'); else fail('j2 blocks: ' + j2Text.slice(0, 300));
  if (/extends/i.test(j2Text)) pass('sample.j2: extends shown'); else fail('j2 extends: ' + j2Text.slice(0, 300));
  if (/upper|lower|default|replace/i.test(j2Text)) pass('sample.j2: filters listed'); else fail('j2 filters: ' + j2Text.slice(0, 300));
  if (/template dependency|External Context Variables|environment_vars|app_name/i.test(j2Text)) pass('sample.j2: dependencies and context variables shown'); else fail('j2 details: ' + j2Text.slice(0, 900));
  const j2BlockHint = await page.$eval('#previewHost .j2-doc .j2-tag', (e) => e.title);
  if (/Block supplied|parent template|inheritance/i.test(j2BlockHint)) pass('sample.j2: block hover help present'); else fail('j2 block hint: ' + j2BlockHint);
  const j2SourceOpen = await page.$eval('#previewHost .j2-doc .kf-source-details', (e) => e.open);
  if (!j2SourceOpen) pass('sample.j2: source starts collapsed'); else fail('j2 source should start collapsed');
  await page.click('#previewHost .j2-doc .kf-source-link');
  const j2Jump = await page.$eval('#previewHost .j2-doc', (e) => ({
    open: e.querySelector('.kf-source-details')?.open || false,
    highlighted: !!e.querySelector('.kf-source-hit'),
  }));
  if (j2Jump.open && j2Jump.highlighted) pass('sample.j2: item click opens and highlights source'); else fail('j2 source jump: ' + JSON.stringify(j2Jump));
  const j2Bad = await page.evaluate(async () => {
    const mod = await import('/types/text/known/jinja2-template/renderer.js');
    const rendered = mod.render({ text: '{% block body %}a{% endblock %}\n{% block body %}b{% endblock %}\n{% macro card(title) %}{{ title }}{% endmacro %}\n{% macro card(text) %}{{ text }}{% endmacro %}' }).parentNode;
    document.body.appendChild(rendered);
    const text = rendered.textContent;
    const issues = rendered.querySelector('.kf-issues')?.textContent || '';
    rendered.remove();
    return { text, issues };
  });
  if (/duplicate block|duplicate macro/i.test(j2Bad.text + j2Bad.issues)) pass('sample.j2: duplicate block and macro diagnostics shown'); else fail('j2 diagnostics: ' + JSON.stringify(j2Bad).slice(0, 500));

  // ── sample.mustache viewer (Mustache Template) ──
  await openExample('sample.mustache');
  await page.waitForSelector('#previewHost .mst-doc', { timeout: 12000 });
  pass('sample.mustache: renders');
  const mstText = await page.$eval('#previewHost .mst-doc', (e) => e.textContent);
  if (/Mustache/i.test(mstText)) pass('sample.mustache: Mustache badge shown'); else fail('mustache badge: ' + mstText.slice(0, 200));
  if (/section|Section/i.test(mstText)) pass('sample.mustache: sections listed'); else fail('mustache sections: ' + mstText.slice(0, 300));
  if (/partial|Partial/i.test(mstText)) pass('sample.mustache: partials listed'); else fail('mustache partials: ' + mstText.slice(0, 300));
  if (/title|headline|description/i.test(mstText)) pass('sample.mustache: variables listed'); else fail('mustache variables: ' + mstText.slice(0, 300));
  if (/external dependency|root title|unescaped/i.test(mstText)) pass('sample.mustache: partial dependencies and variable groups shown'); else fail('mustache details: ' + mstText.slice(0, 800));
  const mstPartialHint = await page.$eval('#previewHost .mst-doc .mst-tag-partial', (e) => e.title);
  if (/Includes another template|render host/i.test(mstPartialHint)) pass('sample.mustache: partial hover help present'); else fail('mustache partial hint: ' + mstPartialHint);
  const mstSourceOpen = await page.$eval('#previewHost .mst-doc .kf-source-details', (e) => e.open);
  if (!mstSourceOpen) pass('sample.mustache: source starts collapsed'); else fail('mustache source should start collapsed');
  await page.click('#previewHost .mst-doc .kf-source-link');
  const mstJump = await page.$eval('#previewHost .mst-doc', (e) => ({
    open: e.querySelector('.kf-source-details')?.open || false,
    highlighted: !!e.querySelector('.kf-source-hit'),
  }));
  if (mstJump.open && mstJump.highlighted) pass('sample.mustache: item click opens and highlights source'); else fail('mustache source jump: ' + JSON.stringify(mstJump));
  const mstBad = await page.evaluate(async () => {
    const mod = await import('/types/text/known/mustache-template/renderer.js');
    const rendered = mod.render({ text: '{{#items}}\n{{name}}\n{{/wrong}}\n{{#open}}' }).parentNode;
    document.body.appendChild(rendered);
    const text = rendered.textContent;
    const issues = rendered.querySelector('.kf-issues')?.textContent || '';
    rendered.remove();
    return { text, issues };
  });
  if (/Template Diagnostics|mismatch|unclosed section/i.test(mstBad.text + mstBad.issues)) pass('sample.mustache: malformed section diagnostics shown'); else fail('mustache diagnostics: ' + JSON.stringify(mstBad).slice(0, 500));

  // ── sample.sparql viewer (SPARQL Query) ──
  await openExample('sample.sparql');
  await page.waitForSelector('#previewHost .sparql-doc', { timeout: 12000 });
  pass('sample.sparql: renders');
  const sparqlText = await page.$eval('#previewHost .sparql-doc', (e) => e.textContent);
  if (/SPARQL/i.test(sparqlText)) pass('sample.sparql: SPARQL badge shown'); else fail('sparql badge: ' + sparqlText.slice(0, 200));
  if (/SELECT/i.test(sparqlText)) pass('sample.sparql: query type shown'); else fail('sparql query type: ' + sparqlText.slice(0, 300));
  if (/prefix|Prefix/i.test(sparqlText)) pass('sample.sparql: prefixes shown'); else fail('sparql prefixes: ' + sparqlText.slice(0, 300));
  if (/title|author|year/i.test(sparqlText)) pass('sample.sparql: projected variables shown'); else fail('sparql vars: ' + sparqlText.slice(0, 300));

  // ── sample.ttl viewer (Turtle RDF) ──
  await openExample('sample.ttl');
  await page.waitForSelector('#previewHost .ttl-doc', { timeout: 12000 });
  pass('sample.ttl: renders');
  const ttlText = await page.$eval('#previewHost .ttl-doc', (e) => e.textContent);
  if (/Turtle RDF|RDF/i.test(ttlText)) pass('sample.ttl: Turtle RDF badge shown'); else fail('ttl badge: ' + ttlText.slice(0, 200));
  if (/prefix|Prefix/i.test(ttlText)) pass('sample.ttl: prefixes shown'); else fail('ttl prefixes: ' + ttlText.slice(0, 300));
  if (/rdf|owl|rdfs/i.test(ttlText)) pass('sample.ttl: namespace URIs shown'); else fail('ttl namespaces: ' + ttlText.slice(0, 300));

  // ── sample.dot viewer (Graphviz DOT) ──
  await openExample('sample.dot');
  await page.waitForSelector('#previewHost .dot-doc', { timeout: 12000 });
  pass('sample.dot: renders');
  const dotText = await page.$eval('#previewHost .dot-doc', (e) => e.textContent);
  if (/DOT|Graphviz/i.test(dotText)) pass('sample.dot: DOT badge shown'); else fail('dot badge: ' + dotText.slice(0, 200));
  if (/digraph|graph/i.test(dotText)) pass('sample.dot: graph type shown'); else fail('dot graph type: ' + dotText.slice(0, 300));
  if (/node|edge/i.test(dotText)) pass('sample.dot: node/edge counts shown'); else fail('dot counts: ' + dotText.slice(0, 300));

  // ── sample.v viewer (Verilog) ──
  await openExample('sample.v');
  await page.waitForSelector('#previewHost .vlog-doc', { timeout: 12000 });
  pass('sample.v: renders');
  const vlogText = await page.$eval('#previewHost .vlog-doc', (e) => e.textContent);
  if (/Verilog/i.test(vlogText)) pass('sample.v: Verilog badge shown'); else fail('vlog badge: ' + vlogText.slice(0, 200));
  if (/counter|mux/i.test(vlogText)) pass('sample.v: module names shown'); else fail('vlog modules: ' + vlogText.slice(0, 300));
  if (/module|Module/i.test(vlogText)) pass('sample.v: module count shown'); else fail('vlog module count: ' + vlogText.slice(0, 300));

  // ── sample.zig viewer (Zig) ──
  await openExample('sample.zig');
  await page.waitForSelector('#previewHost .zig-doc', { timeout: 12000 });
  pass('sample.zig: renders');
  const zigText = await page.$eval('#previewHost .zig-doc', (e) => e.textContent);
  if (/Zig/i.test(zigText)) pass('sample.zig: Zig badge shown'); else fail('zig badge: ' + zigText.slice(0, 200));
  if (/add|divide|fibonacci|main/i.test(zigText)) pass('sample.zig: public functions listed'); else fail('zig pub fns: ' + zigText.slice(0, 300));
  if (/Point/i.test(zigText)) pass('sample.zig: struct shown'); else fail('zig structs: ' + zigText.slice(0, 300));
  if (/test/i.test(zigText)) pass('sample.zig: test count shown'); else fail('zig tests: ' + zigText.slice(0, 300));

  // ── sample.ex viewer (Elixir) ──
  await openExample('sample.ex');
  await page.waitForSelector('#previewHost .ex-doc', { timeout: 12000 });
  pass('sample.ex: renders');
  const exText = await page.$eval('#previewHost .ex-doc', (e) => e.textContent);
  if (/Elixir/i.test(exText)) pass('sample.ex: Elixir badge shown'); else fail('elixir badge: ' + exText.slice(0, 200));
  if (/MyApp\.Calculator/i.test(exText)) pass('sample.ex: module name shown'); else fail('elixir module: ' + exText.slice(0, 300));
  if (/add|subtract|multiply|divide|sum/i.test(exText)) pass('sample.ex: public functions listed'); else fail('elixir pub fns: ' + exText.slice(0, 300));
  if (/use|alias|import/i.test(exText)) pass('sample.ex: dependencies shown'); else fail('elixir deps: ' + exText.slice(0, 300));

  // ── sample.pug viewer (Pug Template) ──
  await openExample('sample.pug');
  await page.waitForSelector('#previewHost .pug-doc', { timeout: 12000 });
  pass('sample.pug: renders');
  const pugText = await page.$eval('#previewHost .pug-doc', (e) => e.textContent);
  if (/Pug/i.test(pugText)) pass('sample.pug: Pug badge shown'); else fail('pug badge: ' + pugText.slice(0, 200));
  if (/mixin|card|icon/i.test(pugText)) pass('sample.pug: mixins listed'); else fail('pug mixins: ' + pugText.slice(0, 300));
  if (/block|content|scripts/i.test(pugText)) pass('sample.pug: blocks shown'); else fail('pug blocks: ' + pugText.slice(0, 300));
  if (/include|footer|scripts/i.test(pugText)) pass('sample.pug: includes shown'); else fail('pug includes: ' + pugText.slice(0, 300));

  // ── sample.ejs viewer (EJS Template) ──
  await openExample('sample.ejs');
  await page.waitForSelector('#previewHost .ejs-doc', { timeout: 12000 });
  pass('sample.ejs: renders');
  const ejsText = await page.$eval('#previewHost .ejs-doc', (e) => e.textContent);
  if (/EJS/i.test(ejsText)) pass('sample.ejs: EJS badge shown'); else fail('ejs badge: ' + ejsText.slice(0, 200));
  if (/output|raw|code/i.test(ejsText)) pass('sample.ejs: tag type counts shown'); else fail('ejs tag counts: ' + ejsText.slice(0, 300));
  if (/include|sidebar|debug/i.test(ejsText)) pass('sample.ejs: includes listed'); else fail('ejs includes: ' + ejsText.slice(0, 300));
  if (/title|user|siteName/i.test(ejsText)) pass('sample.ejs: variables listed'); else fail('ejs variables: ' + ejsText.slice(0, 300));

  // ── sample.xsl viewer (XSLT Stylesheet) ──
  await openExample('sample.xsl');
  await page.waitForSelector('#previewHost .xsl-doc', { timeout: 12000 });
  pass('sample.xsl: renders');
  const xslText = await page.$eval('#previewHost .xsl-doc', (e) => e.textContent);
  if (/XSLT/i.test(xslText)) pass('sample.xsl: XSLT badge shown'); else fail('xsl badge: ' + xslText.slice(0, 200));
  if (/2\.0/.test(xslText)) pass('sample.xsl: version shown'); else fail('xsl version: ' + xslText.slice(0, 300));
  if (/html/i.test(xslText)) pass('sample.xsl: output method shown'); else fail('xsl output method: ' + xslText.slice(0, 300));
  if (/book-header|format-price/i.test(xslText)) pass('sample.xsl: named templates listed'); else fail('xsl named templates: ' + xslText.slice(0, 300));
  if (/lang|showDetails/i.test(xslText)) pass('sample.xsl: params listed'); else fail('xsl params: ' + xslText.slice(0, 300));

  // ── sample.svelte viewer (Svelte Component) ──
  await openExample('sample.svelte');
  await page.waitForSelector('#previewHost .svelte-doc', { timeout: 12000 });
  pass('sample.svelte: renders');
  const svelteText = await page.$eval('#previewHost .svelte-doc', (e) => e.textContent);
  if (/Svelte/i.test(svelteText)) pass('sample.svelte: Svelte badge shown'); else fail('svelte badge: ' + svelteText.slice(0, 200));
  if (/TypeScript/i.test(svelteText)) pass('sample.svelte: TypeScript language shown'); else fail('svelte ts: ' + svelteText.slice(0, 300));
  if (/title|maxCount|items/i.test(svelteText)) pass('sample.svelte: props listed'); else fail('svelte props: ' + svelteText.slice(0, 300));
  if (/Counter|Modal/i.test(svelteText)) pass('sample.svelte: component imports listed'); else fail('svelte imports: ' + svelteText.slice(0, 300));

  // ── sample.njk viewer (Nunjucks Template) ──
  await openExample('sample.njk');
  await page.waitForSelector('#previewHost .njk-doc', { timeout: 12000 });
  pass('sample.njk: renders');
  const njkText = await page.$eval('#previewHost .njk-doc', (e) => e.textContent);
  if (/Nunjucks/i.test(njkText)) pass('sample.njk: Nunjucks badge shown'); else fail('njk badge: ' + njkText.slice(0, 200));
  if (/base\.html/i.test(njkText)) pass('sample.njk: extends shown'); else fail('njk extends: ' + njkText.slice(0, 300));
  if (/title|content|sidebar/i.test(njkText)) pass('sample.njk: blocks listed'); else fail('njk blocks: ' + njkText.slice(0, 300));
  if (/pagination/i.test(njkText)) pass('sample.njk: macros listed'); else fail('njk macros: ' + njkText.slice(0, 300));
  if (/template dependency|External Context Variables|setfeatured|page|posts|site/i.test(njkText)) pass('sample.njk: dependencies, set vars, and context variables shown'); else fail('njk details: ' + njkText.slice(0, 900));
  const njkBlockHint = await page.$eval('#previewHost .njk-doc .njk-tag', (e) => e.title);
  if (/Block supplied|parent template|inheritance/i.test(njkBlockHint)) pass('sample.njk: block hover help present'); else fail('njk block hint: ' + njkBlockHint);
  const njkSourceOpen = await page.$eval('#previewHost .njk-doc .kf-source-details', (e) => e.open);
  if (!njkSourceOpen) pass('sample.njk: source starts collapsed'); else fail('njk source should start collapsed');
  await page.click('#previewHost .njk-doc .kf-source-link');
  const njkJump = await page.$eval('#previewHost .njk-doc', (e) => ({
    open: e.querySelector('.kf-source-details')?.open || false,
    highlighted: !!e.querySelector('.kf-source-hit'),
  }));
  if (njkJump.open && njkJump.highlighted) pass('sample.njk: item click opens and highlights source'); else fail('njk source jump: ' + JSON.stringify(njkJump));
  const njkBad = await page.evaluate(async () => {
    const mod = await import('/types/text/known/nunjucks/renderer.js');
    const rendered = mod.render({ text: '{% block body %}a{% endblock %}\n{% block body %}b{% endblock %}\n{% macro card(title) %}{{ title }}{% endmacro %}\n{% macro card(text) %}{{ text }}{% endmacro %}' }).parentNode;
    document.body.appendChild(rendered);
    const text = rendered.textContent;
    const issues = rendered.querySelector('.kf-issues')?.textContent || '';
    rendered.remove();
    return { text, issues };
  });
  if (/duplicate block|duplicate macro/i.test(njkBad.text + njkBad.issues)) pass('sample.njk: duplicate block and macro diagnostics shown'); else fail('njk diagnostics: ' + JSON.stringify(njkBad).slice(0, 500));

  // ── sample.hs viewer (Haskell) ──
  await openExample('sample.hs');
  await page.waitForSelector('#previewHost .hs-doc', { timeout: 12000 });
  pass('sample.hs: renders');
  const hsText = await page.$eval('#previewHost .hs-doc', (e) => e.textContent);
  if (/Haskell/i.test(hsText)) pass('sample.hs: Haskell badge shown'); else fail('hs badge: ' + hsText.slice(0, 200));
  if (/DataStructures\.BinaryTree/i.test(hsText)) pass('sample.hs: module name shown'); else fail('hs module: ' + hsText.slice(0, 300));
  if (/Tree|RoseTree|SizedList/i.test(hsText)) pass('sample.hs: data types listed'); else fail('hs types: ' + hsText.slice(0, 300));
  if (/insert|search|depth|fromList/i.test(hsText)) pass('sample.hs: functions listed'); else fail('hs functions: ' + hsText.slice(0, 300));

  // ── sample.kt viewer (Kotlin) ──
  await openExample('sample.kt');
  await page.waitForSelector('#previewHost .kt-doc', { timeout: 12000 });
  pass('sample.kt: renders');
  const ktText = await page.$eval('#previewHost .kt-doc', (e) => e.textContent);
  if (/Kotlin/i.test(ktText)) pass('sample.kt: Kotlin badge shown'); else fail('kt badge: ' + ktText.slice(0, 200));
  if (/com\.example\.demo/.test(ktText)) pass('sample.kt: package shown'); else fail('kt package: ' + ktText.slice(0, 300));
  if (/Point|Circle|MathUtils/i.test(ktText)) pass('sample.kt: types listed'); else fail('kt types: ' + ktText.slice(0, 300));
  if (/distanceBetween|fetchPoints|main/i.test(ktText)) pass('sample.kt: functions listed'); else fail('kt functions: ' + ktText.slice(0, 300));
  if (/returns Double|receiver Circle|a: Point|constructor param|suspend/i.test(ktText)) pass('sample.kt: signatures, params, and coroutine details shown'); else fail('kt details: ' + ktText.slice(0, 900));
  if (!/area.*in MathUtils/is.test(ktText)) pass('sample.kt: top-level extension is not attached to object owner'); else fail('kt extension owner: ' + ktText.slice(0, 900));
  const ktSuspendHint = await page.$eval('#previewHost .kt-doc .kt-tag-suspend', (e) => e.title);
  if (/coroutine|suspend/i.test(ktSuspendHint)) pass('sample.kt: suspend hover help present'); else fail('kt suspend hint: ' + ktSuspendHint);
  const ktSourceOpen = await page.$eval('#previewHost .kt-doc .kf-source-details', (e) => e.open);
  if (!ktSourceOpen) pass('sample.kt: source starts collapsed'); else fail('kt source should start collapsed');
  await page.click('#previewHost .kt-doc .kf-source-link');
  const ktJump = await page.$eval('#previewHost .kt-doc', (e) => ({
    open: e.querySelector('.kf-source-details')?.open || false,
    highlighted: !!e.querySelector('.kf-source-hit'),
  }));
  if (ktJump.open && ktJump.highlighted) pass('sample.kt: item click opens and highlights source'); else fail('kt source jump: ' + JSON.stringify(ktJump));

  // ── sample.scala viewer (Scala) ──
  await openExample('sample.scala');
  await page.waitForSelector('#previewHost .sc-doc', { timeout: 12000 });
  pass('sample.scala: renders');
  const scalaText = await page.$eval('#previewHost .sc-doc', (e) => e.textContent);
  if (/Scala/i.test(scalaText)) pass('sample.scala: Scala badge shown'); else fail('scala badge: ' + scalaText.slice(0, 200));
  if (/com\.example\.demo/.test(scalaText)) pass('sample.scala: package shown'); else fail('scala package: ' + scalaText.slice(0, 300));
  if (/Point|Circle|MathUtils|Shape/i.test(scalaText)) pass('sample.scala: types listed'); else fail('scala types: ' + scalaText.slice(0, 300));
  if (/distanceBetween|circleArea/i.test(scalaText)) pass('sample.scala: defs listed'); else fail('scala defs: ' + scalaText.slice(0, 300));

  // ── sample.nim viewer (Nim) ──
  await openExample('sample.nim');
  await page.waitForSelector('#previewHost .nim-doc', { timeout: 12000 });
  pass('sample.nim: renders');
  const nimText = await page.$eval('#previewHost .nim-doc', (e) => e.textContent);
  if (/Nim/i.test(nimText)) pass('sample.nim: Nim badge shown'); else fail('nim badge: ' + nimText.slice(0, 200));
  if (/strutils|sequtils|math/i.test(nimText)) pass('sample.nim: imports listed'); else fail('nim imports: ' + nimText.slice(0, 300));
  if (/distance|greet|main/i.test(nimText)) pass('sample.nim: procs listed'); else fail('nim procs: ' + nimText.slice(0, 300));
  if (/Point|Color/i.test(nimText)) pass('sample.nim: types listed'); else fail('nim types: ' + nimText.slice(0, 300));

  // ── sample.dart viewer (Dart) ──
  await openExample('sample.dart');
  await page.waitForSelector('#previewHost .dart-doc', { timeout: 12000 });
  pass('sample.dart: renders');
  const dartText = await page.$eval('#previewHost .dart-doc', (e) => e.textContent);
  if (/Dart/i.test(dartText)) pass('sample.dart: Dart badge shown'); else fail('dart badge: ' + dartText.slice(0, 200));
  if (/Flutter/i.test(dartText)) pass('sample.dart: Flutter detected'); else fail('dart flutter: ' + dartText.slice(0, 200));
  if (/Reading|Sensor|LabSensor/i.test(dartText)) pass('sample.dart: classes listed'); else fail('dart classes: ' + dartText.slice(0, 300));
  if (/Status/i.test(dartText)) pass('sample.dart: enum listed'); else fail('dart enum: ' + dartText.slice(0, 300));
  if (/ReadingExtension/i.test(dartText)) pass('sample.dart: extension listed'); else fail('dart extension: ' + dartText.slice(0, 300));
  const dartMemberText = await page.$$eval('#previewHost .dart-section', (sections) => {
    const section = sections.find((el) => /Methods & Functions/.test(el.textContent || ''));
    return section ? section.textContent : '';
  });
  if (/readings|returns Stream<Reading>|ctor|formatted|main/i.test(dartMemberText)) pass('sample.dart: methods, getters, constructors, and returns shown'); else fail('dart members: ' + dartMemberText.slice(0, 600));
  if (!/print\(reading\.formatted\)/.test(dartMemberText)) pass('sample.dart: body calls are not listed as declarations'); else fail('dart body call listed: ' + dartMemberText.slice(0, 800));
  const dartAsyncHint = await page.$eval('#previewHost .dart-doc .dart-tag-async', (e) => e.title);
  if (/asynchronous|Future|stream/i.test(dartAsyncHint)) pass('sample.dart: async hover help present'); else fail('dart async hint: ' + dartAsyncHint);
  const dartSourceOpen = await page.$eval('#previewHost .dart-doc .kf-source-details', (e) => e.open);
  if (!dartSourceOpen) pass('sample.dart: source starts collapsed'); else fail('dart source should start collapsed');
  await page.click('#previewHost .dart-doc .kf-source-link');
  const dartJump = await page.$eval('#previewHost .dart-doc', (e) => ({
    open: e.querySelector('.kf-source-details')?.open || false,
    highlighted: !!e.querySelector('.kf-source-hit'),
  }));
  if (dartJump.open && dartJump.highlighted) pass('sample.dart: item click opens and highlights source'); else fail('dart source jump: ' + JSON.stringify(dartJump));

  // ── sample.groovy viewer (Groovy) ──
  await openExample('sample.groovy');
  await page.waitForSelector('#previewHost .gr-doc', { timeout: 12000 });
  pass('sample.groovy: renders');
  const groovyText = await page.$eval('#previewHost .gr-doc', (e) => e.textContent);
  if (/Groovy/i.test(groovyText)) pass('sample.groovy: Groovy badge shown'); else fail('groovy badge: ' + groovyText.slice(0, 200));
  if (/com\.example\.demo/.test(groovyText)) pass('sample.groovy: package shown'); else fail('groovy package: ' + groovyText.slice(0, 300));
  if (/MathUtils|Point|Circle|Shape/i.test(groovyText)) pass('sample.groovy: types listed'); else fail('groovy types: ' + groovyText.slice(0, 300));
  if (/factorial|mean|area|perimeter/i.test(groovyText)) pass('sample.groovy: methods listed'); else fail('groovy methods: ' + groovyText.slice(0, 300));
  if (/returns double|arity 1|List<Number> values|@CompileStatic/i.test(groovyText)) pass('sample.groovy: signatures, params, and annotations shown'); else fail('groovy details: ' + groovyText.slice(0, 900));
  const groovyAnnHint = await page.$eval('#previewHost .gr-doc .gr-ann', (e) => e.title);
  if (/static type checking|annotation/i.test(groovyAnnHint)) pass('sample.groovy: annotation hover help present'); else fail('groovy annotation hint: ' + groovyAnnHint);
  const groovySourceOpen = await page.$eval('#previewHost .gr-doc .kf-source-details', (e) => e.open);
  if (!groovySourceOpen) pass('sample.groovy: source starts collapsed'); else fail('groovy source should start collapsed');
  await page.click('#previewHost .gr-doc .kf-source-link');
  const groovyJump = await page.$eval('#previewHost .gr-doc', (e) => ({
    open: e.querySelector('.kf-source-details')?.open || false,
    highlighted: !!e.querySelector('.kf-source-hit'),
  }));
  if (groovyJump.open && groovyJump.highlighted) pass('sample.groovy: item click opens and highlights source'); else fail('groovy source jump: ' + JSON.stringify(groovyJump));

  // ── sample.cr viewer (Crystal) ──
  await openExample('sample.cr');
  await page.waitForSelector('#previewHost .crl-doc', { timeout: 12000 });
  pass('sample.cr: renders');
  const crystalText = await page.$eval('#previewHost .crl-doc', (e) => e.textContent);
  if (/Crystal/i.test(crystalText)) pass('sample.cr: Crystal badge shown'); else fail('crystal badge: ' + crystalText.slice(0, 200));
  if (/json|http\/client/i.test(crystalText)) pass('sample.cr: requires listed'); else fail('crystal requires: ' + crystalText.slice(0, 300));
  if (/Circle|Point|Shape|Color/i.test(crystalText)) pass('sample.cr: types listed'); else fail('crystal types: ' + crystalText.slice(0, 300));

  // ── sample.jl viewer (Julia) ──
  await openExample('sample.jl');
  await page.waitForSelector('#previewHost .jl-doc', { timeout: 12000 });
  pass('sample.jl: renders');
  const jlText = await page.$eval('#previewHost .jl-doc', (e) => e.textContent);
  if (/Julia/i.test(jlText)) pass('sample.jl: Julia badge shown'); else fail('julia badge: ' + jlText.slice(0, 200));
  if (/NumericalUtils/i.test(jlText)) pass('sample.jl: module name shown'); else fail('julia module: ' + jlText.slice(0, 300));
  if (/distance|centroid|normalize/i.test(jlText)) pass('sample.jl: functions listed'); else fail('julia functions: ' + jlText.slice(0, 300));
  if (/Point|BoundingBox/i.test(jlText)) pass('sample.jl: structs listed'); else fail('julia structs: ' + jlText.slice(0, 300));
  if (/returns Float64|p1::Point|symbols: show, length|4 fields|@timed_call/i.test(jlText)) pass('sample.jl: signatures, dispatch args, imports, and type details shown'); else fail('julia details: ' + jlText.slice(0, 900));
  const jlTypeHint = await page.$eval('#previewHost .jl-doc .jl-tag-mutable', (e) => e.title);
  if (/fields can be reassigned|mutable/i.test(jlTypeHint)) pass('sample.jl: type hover help present'); else fail('julia type hint: ' + jlTypeHint);
  const jlSourceOpen = await page.$eval('#previewHost .jl-doc .kf-source-details', (e) => e.open);
  if (!jlSourceOpen) pass('sample.jl: source starts collapsed'); else fail('julia source should start collapsed');
  await page.click('#previewHost .jl-doc .kf-source-link');
  const jlJump = await page.$eval('#previewHost .jl-doc', (e) => ({
    open: e.querySelector('.kf-source-details')?.open || false,
    highlighted: !!e.querySelector('.kf-source-hit'),
  }));
  if (jlJump.open && jlJump.highlighted) pass('sample.jl: item click opens and highlights source'); else fail('julia source jump: ' + JSON.stringify(jlJump));

  // ── sample.R viewer (R) ──
  await openExample('sample.R');
  await page.waitForSelector('#previewHost .r-doc', { timeout: 12000 });
  pass('sample.R: renders');
  const rText = await page.$eval('#previewHost .r-doc', (e) => e.textContent);
  if (/R Script/i.test(rText)) pass('sample.R: R Script badge shown'); else fail('r badge: ' + rText.slice(0, 200));
  if (/stats|utils|methods/i.test(rText)) pass('sample.R: libraries listed'); else fail('r libraries: ' + rText.slice(0, 300));
  if (/summarize_vector|normalize|simple_lm|clip/i.test(rText)) pass('sample.R: functions listed'); else fail('r functions: ' + rText.slice(0, 300));

  // ── sample.lua viewer (Lua) ──
  await openExample('sample.lua');
  await page.waitForSelector('#previewHost .lua-doc', { timeout: 12000 });
  pass('sample.lua: renders');
  const luaText = await page.$eval('#previewHost .lua-doc', (e) => e.textContent);
  if (/Lua/i.test(luaText)) pass('sample.lua: Lua badge shown'); else fail('lua badge: ' + luaText.slice(0, 200));
  if (/json|utils|socket/i.test(luaText)) pass('sample.lua: requires listed'); else fail('lua requires: ' + luaText.slice(0, 300));
  if (/Animal|Dog/i.test(luaText)) pass('sample.lua: classes listed'); else fail('lua classes: ' + luaText.slice(0, 300));
  if (/greet|deepCopy/i.test(luaText)) pass('sample.lua: functions listed'); else fail('lua functions: ' + luaText.slice(0, 300));

  // ── sample.purs viewer (PureScript) ──
  await openExample('sample.purs');
  await page.waitForSelector('#previewHost .purs-doc', { timeout: 12000 });
  pass('sample.purs: renders');
  const pursText = await page.$eval('#previewHost .purs-doc', (e) => e.textContent);
  if (/PureScript/i.test(pursText)) pass('sample.purs: PureScript badge shown'); else fail('purs badge: ' + pursText.slice(0, 200));
  if (/Data\.Sample/i.test(pursText)) pass('sample.purs: module name shown'); else fail('purs module: ' + pursText.slice(0, 300));
  if (/Point|Shape/i.test(pursText)) pass('sample.purs: data types listed'); else fail('purs types: ' + pursText.slice(0, 300));
  if (/Renderable|HasArea/i.test(pursText)) pass('sample.purs: classes listed'); else fail('purs classes: ' + pursText.slice(0, 300));

  // ── sample.swift viewer (Swift) ──
  await openExample('sample.swift');
  await page.waitForSelector('#previewHost .swift-doc', { timeout: 12000 });
  pass('sample.swift: renders');
  const swiftText = await page.$eval('#previewHost .swift-doc', (e) => e.textContent);
  if (/SwiftUI/i.test(swiftText)) pass('sample.swift: SwiftUI badge shown'); else fail('swift badge: ' + swiftText.slice(0, 200));
  if (/Foundation|SwiftUI|Combine/i.test(swiftText)) pass('sample.swift: imports listed'); else fail('swift imports: ' + swiftText.slice(0, 300));
  if (/MapViewModel|Coordinate|TransportMode/i.test(swiftText)) pass('sample.swift: types listed'); else fail('swift types: ' + swiftText.slice(0, 300));
  if (/Coordinate|TransportMode/i.test(swiftText)) pass('sample.swift: extensions listed'); else fail('swift extensions: ' + swiftText.slice(0, 300));

  // ── sample.erl viewer (Erlang) ──
  await openExample('sample.erl');
  await page.waitForSelector('#previewHost .erl-doc', { timeout: 12000 });
  pass('sample.erl: renders');
  const erlText = await page.$eval('#previewHost .erl-doc', (e) => e.textContent);
  if (/Erlang Module/i.test(erlText)) pass('sample.erl: Erlang Module badge shown'); else fail('erl badge: ' + erlText.slice(0, 200));
  if (/sample/i.test(erlText)) pass('sample.erl: module name shown'); else fail('erl module: ' + erlText.slice(0, 300));
  if (/gen_server/i.test(erlText)) pass('sample.erl: behaviour shown'); else fail('erl behaviour: ' + erlText.slice(0, 300));
  if (/start_link|stop|add|lookup/i.test(erlText)) pass('sample.erl: exports listed'); else fail('erl exports: ' + erlText.slice(0, 300));

  // ── nginx.conf viewer (nginx-conf plugin) ──
  await openExample('nginx.conf');
  await page.waitForSelector('#previewHost .nginxconf-doc', { timeout: 12000 });
  pass('nginx-conf: renders');
  const ngxCfgText = await page.$eval('#previewHost .nginxconf-doc', (e) => e.textContent);
  if (/nginx/i.test(ngxCfgText)) pass('nginx-conf: badge shown'); else fail('nginx-conf badge: ' + ngxCfgText.slice(0, 200));
  if (/server|listen/i.test(ngxCfgText)) pass('nginx-conf: server info shown'); else fail('nginx-conf server info: ' + ngxCfgText.slice(0, 300));

  // ── sample.htaccess viewer (apache-conf plugin) ──
  await openExample('sample.htaccess');
  await page.waitForSelector('#previewHost .apachecfg-doc', { timeout: 12000 });
  pass('apache-conf: sample.htaccess renders');
  const apacheCfgText = await page.$eval('#previewHost .apachecfg-doc', (e) => e.textContent);
  if (/apache/i.test(apacheCfgText)) pass('apache-conf: badge shown'); else fail('apache-conf badge: ' + apacheCfgText.slice(0, 200));

  // ── haproxy.cfg viewer (haproxy-cfg plugin) ──
  await openExample('haproxy.cfg');
  await page.waitForSelector('#previewHost .hpcfg-doc', { timeout: 12000 });
  pass('haproxy-cfg: renders');
  const hpcfgText = await page.$eval('#previewHost .hpcfg-doc', (e) => e.textContent);
  if (/HAProxy/i.test(hpcfgText)) pass('haproxy-cfg: badge shown'); else fail('haproxy-cfg badge: ' + hpcfgText.slice(0, 200));
  if (/frontend|backend/i.test(hpcfgText)) pass('haproxy-cfg: sections shown'); else fail('haproxy-cfg sections: ' + hpcfgText.slice(0, 300));

  // ── traefik.toml viewer (traefik-conf plugin) ──
  await openExample('traefik.toml');
  await page.waitForSelector('#previewHost .trkcfg-doc', { timeout: 12000 });
  pass('traefik-conf: traefik.toml renders');
  const trkCfgText = await page.$eval('#previewHost .trkcfg-doc', (e) => e.textContent);
  if (/Traefik/i.test(trkCfgText)) pass('traefik-conf: badge shown'); else fail('traefik-conf badge: ' + trkCfgText.slice(0, 200));
  if (/entrypoint|websecure|web/i.test(trkCfgText)) pass('traefik-conf: entrypoints shown'); else fail('traefik-conf entrypoints: ' + trkCfgText.slice(0, 300));
  if (/docker|file/i.test(trkCfgText)) pass('traefik-conf: providers shown'); else fail('traefik-conf providers: ' + trkCfgText.slice(0, 300));

  // ── sample.tcl viewer (tcl-lang plugin) ──
  await openExample('sample.tcl');
  await page.waitForSelector('#previewHost .tcl-doc', { timeout: 12000 });
  pass('tcl-lang: sample.tcl renders');

  // ── sample.scm viewer (scheme-lang plugin) ──
  await openExample('sample.scm');
  await page.waitForSelector('#previewHost .scm-doc', { timeout: 12000 });
  pass('scheme-lang: sample.scm renders');

  // ── sample.rkt viewer (racket-lang plugin) ──
  await openExample('sample.rkt');
  await page.waitForSelector('#previewHost .rkt-doc', { timeout: 12000 });
  pass('racket-lang: sample.rkt renders');

  // ── sample.f90 viewer (fortran-lang plugin) ──
  await openExample('sample.f90');
  await page.waitForSelector('#previewHost .f90-doc', { timeout: 12000 });
  pass('fortran-lang: sample.f90 renders');
  const f90Text = await page.$eval('#previewHost .f90-doc', (e) => e.textContent);
  if (/PURE FUNCTION dot_real|RESULT\(res\)|arity 6|ONLY: REAL64, INT32|PARAMETER/i.test(f90Text)) pass('fortran-lang: signatures, imports, and parameters shown'); else fail('fortran details: ' + f90Text.slice(0, 900));
  const f90FunctionHint = await page.$eval('#previewHost .f90-doc .f90-tag-fn', (e) => e.title);
  if (/returns a value|RESULT/i.test(f90FunctionHint)) pass('fortran-lang: procedure hover help present'); else fail('fortran function hint: ' + f90FunctionHint);
  const f90SourceOpen = await page.$eval('#previewHost .f90-doc .kf-source-details', (e) => e.open);
  if (!f90SourceOpen) pass('fortran-lang: source starts collapsed'); else fail('fortran source should start collapsed');
  await page.click('#previewHost .f90-doc .kf-source-link');
  const f90Jump = await page.$eval('#previewHost .f90-doc', (e) => ({
    open: e.querySelector('.kf-source-details')?.open || false,
    highlighted: !!e.querySelector('.kf-source-hit'),
  }));
  if (f90Jump.open && f90Jump.highlighted) pass('fortran-lang: item click opens and highlights source'); else fail('fortran source jump: ' + JSON.stringify(f90Jump));

  // ── sample.rb viewer (ruby-lang plugin) ──
  await openExample('sample.rb');
  await page.waitForSelector('#previewHost .rb-doc', { timeout: 12000 });
  pass('ruby-lang: rendered');

  // ── sample.pm viewer (perl-lang plugin) ──
  await openExample('sample.pm');
  await page.waitForSelector('#previewHost .pm-doc', { timeout: 12000 });
  pass('perl-lang: rendered');
}
