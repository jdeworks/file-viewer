// Stages 8-10 of the meta-game. Same contract as stages.js / stages2.js.
// Each boss is beaten by simulating a real file-viewer feature inside the arena.

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ── Stage 8 — The Redactor (PDF / delete-page). His page 3 = invincibility decree.
   Delete page 3 to drop his shield, then attack (4 HP). He re-adds page 3 every 9s. ── */
function mountRedactor(arena, { stage, onDefeat }) {
  let hp = stage.hp, dead = false;
  const PAGES = [
    { id: 1, title: 'Page 1 — Terms of Engagement', content: 'All combatants must comply with the established rules of engagement as set forth in this document. These terms are binding and enforceable.' },
    { id: 2, title: 'Page 2 — Operational Procedures', content: 'Standard operating procedures apply. All personnel must follow protocol at all times. Deviations require written approval.' },
    { id: 3, title: 'Page 3 — EVIL PAGE', content: '⬛ REDACTED ⬛\n\nINVINCIBILITY DECREE\n\nBy the authority vested in THE REDACTOR, the bearer of this page is hereby declared INVINCIBLE. This decree is IRREVOCABLE and PERMANENT.\n\n⬛ REDACTED ⬛', evil: true },
  ];
  let pages = PAGES.map((p) => ({ ...p }));
  let activePage = 1;

  function hasEvilPage() { return pages.some((p) => p.evil); }

  function render() {
    if (dead) return;
    const shielded = hasEvilPage();
    const pageOpts = pages.map((p) => '<option value="' + p.id + '"' + (p.id === activePage ? ' selected' : '') + '>' + esc(p.title) + '</option>').join('');
    const currentPage = pages.find((p) => p.id === activePage) || pages[0];
    activePage = currentPage ? currentPage.id : (pages[0] ? pages[0].id : 1);

    arena.innerHTML =
      '<div class="mg-boss mg-boss-redactor">' +
      '<div class="mg-boss-sprite">📄📄📄</div>' +
      '<div class="mg-boss-name">' + esc(stage.bossName) + ' — HP: <span class="mg-rd-hp"></span> <span class="mg-rd-shield"></span></div>' +
      '<div class="mg-rd-pages">' +
      '<select class="mg-rd-sel" aria-label="page selector">' + pageOpts + '</select>' +
      '<button class="mg-rd-delete" type="button">Delete Page</button>' +
      '<button class="mg-rd-attack" type="button"' + (shielded ? ' disabled' : '') + '>Attack</button>' +
      '</div>' +
      '<div class="mg-rd-content">' + esc(currentPage ? currentPage.content : '').replace(/\n/g, '<br>') + '</div>' +
      '<div class="mg-boss-msg" role="status">' + (shielded ? 'He is invincible while Page 3 exists. DELETE IT.' : 'Shield down! Attack!') + '</div>' +
      '</div>';

    const bossEl   = arena.querySelector('.mg-boss');
    const hpEl     = arena.querySelector('.mg-rd-hp');
    const shieldEl = arena.querySelector('.mg-rd-shield');
    const selEl    = arena.querySelector('.mg-rd-sel');
    const delBtn   = arena.querySelector('.mg-rd-delete');
    const atkBtn   = arena.querySelector('.mg-rd-attack');
    const msgEl    = arena.querySelector('.mg-boss-msg');
    const contentEl = arena.querySelector('.mg-rd-content');
    hpEl.textContent = hp;
    shieldEl.textContent = shielded ? '🛡 invincible' : '⚔ vulnerable';

    selEl.addEventListener('change', () => {
      activePage = Number(selEl.value);
      const p = pages.find((pg) => pg.id === activePage);
      if (p) contentEl.innerHTML = esc(p.content).replace(/\n/g, '<br>');
    });

    delBtn.addEventListener('click', () => {
      if (dead) return;
      const sel = Number(selEl.value);
      const pageToDelete = pages.find((p) => p.id === sel);
      if (!pageToDelete) { msgEl.textContent = 'No such page.'; return; }
      if (pageToDelete.evil) {
        pages = pages.filter((p) => p.id !== sel);
        activePage = pages.length > 0 ? pages[0].id : 1;
        msgEl.textContent = 'Page 3 deleted — DECREE VOID. His shield is down! ATTACK!';
        bossEl.classList.remove('mg-hit'); void bossEl.offsetWidth; bossEl.classList.add('mg-hit');
        render();
      } else {
        msgEl.textContent = 'That page is harmless. Delete the EVIL PAGE (Page 3).';
      }
    });

    atkBtn.addEventListener('click', () => {
      if (dead) return;
      if (hasEvilPage()) { msgEl.textContent = 'He is invincible! Delete Page 3 first.'; return; }
      hp--;
      bossEl.classList.remove('mg-hit'); void bossEl.offsetWidth; bossEl.classList.add('mg-hit');
      hpEl.textContent = hp;
      msgEl.textContent = 'Hit! HP: ' + hp;
      if (hp <= 0) defeat();
    });
  }

  function defeat() {
    dead = true;
    clearInterval(addPage);
    const bossEl = arena.querySelector('.mg-boss');
    if (bossEl) bossEl.classList.add('mg-boss-dead');
    const msgEl = arena.querySelector('.mg-boss-msg');
    if (msgEl) msgEl.textContent = 'Page 3 deleted... my DECREE is... void... [DOCUMENT CORRUPTED]';
    setTimeout(onDefeat, 750);
  }

  // Cheat: re-adds the evil page every 9s if it was deleted.
  const addPage = setInterval(() => {
    if (dead) return;
    if (!hasEvilPage()) {
      pages.push({ id: 3, title: 'Page 3 — EVIL PAGE', content: '⬛ REDACTED ⬛\n\nINVINCIBILITY DECREE\n\nBy the authority vested in THE REDACTOR, the bearer of this page is hereby declared INVINCIBLE.\n\n⬛ REDACTED ⬛', evil: true });
      activePage = 3;
      const msgEl = arena.querySelector('.mg-boss-msg');
      if (msgEl) msgEl.textContent = 'He ADDED A NEW EVIL PAGE. Delete it again!';
      render();
    }
  }, stage.addPageMs);

  render();
  return { destroy() { clearInterval(addPage); } };
}

/* ── Stage 9 — The Query Golem (SQL query). Player must SELECT his weakness from boss_stats
   table. Wrong queries get error hints. He adds a counter row every 10s. HP: 3. ── */
function mountQueryGolem(arena, { stage, onDefeat }) {
  let hp = stage.hp, dead = false, lightUnlocked = false;
  const BASE_ROWS = [
    { id: 1, attribute: 'armor',    value: '9999' },
    { id: 2, attribute: 'weakness', value: '"light"' },
    { id: 3, attribute: 'regen',    value: '10' },
    { id: 4, attribute: 'name',     value: '"Query Golem"' },
  ];
  let tableRows = BASE_ROWS.map((r) => ({ ...r }));

  function renderTable() {
    return '<table class="mg-sql-table">' +
      '<thead><tr><th>id</th><th>attribute</th><th>value</th></tr></thead>' +
      '<tbody>' +
      tableRows.map((r) => '<tr><td>' + r.id + '</td><td>' + esc(r.attribute) + '</td><td>' + esc(r.value) + '</td></tr>').join('') +
      '</tbody></table>';
  }

  function render() {
    if (dead) return;
    arena.innerHTML =
      '<div class="mg-boss mg-boss-golem">' +
      '<div class="mg-boss-sprite">▣▣▣</div>' +
      '<div class="mg-boss-name">' + esc(stage.bossName) + ' — HP: <span class="mg-gl-hp"></span></div>' +
      '<div class="mg-gl-db"><div class="mg-gl-dblabel">TABLE: boss_stats</div>' + renderTable() + '</div>' +
      '<div class="mg-boss-tool">' +
      '<textarea class="mg-gl-sql" spellcheck="false" rows="2" placeholder="SELECT value FROM boss_stats WHERE attribute = \'weakness\'" aria-label="SQL query"></textarea>' +
      '<button class="mg-gl-exec" type="button">Execute Query</button>' +
      '</div>' +
      '<div class="mg-gl-result" hidden></div>' +
      '<button class="mg-gl-light" type="button" hidden>Use Light</button>' +
      '<div class="mg-boss-msg" role="status">I AM the database. You cannot read me without the right query.</div>' +
      '</div>';

    const bossEl  = arena.querySelector('.mg-boss');
    const hpEl    = arena.querySelector('.mg-gl-hp');
    const sqlEl   = arena.querySelector('.mg-gl-sql');
    const execBtn = arena.querySelector('.mg-gl-exec');
    const resultEl = arena.querySelector('.mg-gl-result');
    const lightBtn = arena.querySelector('.mg-gl-light');
    const msgEl   = arena.querySelector('.mg-boss-msg');
    hpEl.textContent = hp;

    if (lightUnlocked) {
      resultEl.hidden = false;
      resultEl.textContent = 'Result: "light"';
      lightBtn.hidden = false;
    }

    function executeQuery() {
      if (dead) return;
      const q = sqlEl.value.trim().toLowerCase();
      if (!q) { msgEl.textContent = 'Enter a query first.'; return; }
      if (!/select/.test(q)) { msgEl.textContent = 'SYNTAX ERROR: expected SELECT statement.'; return; }
      if (!/from\s+boss_stats/.test(q)) { msgEl.textContent = 'ERROR: No such table. Try: SELECT ... FROM boss_stats'; return; }
      if (!/weakness/.test(q)) {
        // Try to give a row-specific result
        const matchAttr = tableRows.find((r) => q.includes(r.attribute));
        if (matchAttr) {
          resultEl.hidden = false;
          resultEl.textContent = 'Result: ' + matchAttr.value;
          msgEl.textContent = 'Query returned 1 row — but that is not the weakness.';
        } else {
          msgEl.textContent = 'Query returned 0 rows. Try selecting attribute = \'weakness\'';
          resultEl.hidden = false;
          resultEl.textContent = 'Result: (0 rows)';
        }
        return;
      }
      // Correct: found weakness
      lightUnlocked = true;
      resultEl.hidden = false;
      resultEl.textContent = 'Result: "light"';
      lightBtn.hidden = false;
      msgEl.textContent = 'Query returned: "light". His weakness is LIGHT. Use it!';
    }

    function useLight() {
      if (dead) return;
      hp--;
      bossEl.classList.remove('mg-hit'); void bossEl.offsetWidth; bossEl.classList.add('mg-hit');
      hpEl.textContent = hp;
      msgEl.textContent = 'LIGHT ATTACK! HP: ' + hp;
      if (hp <= 0) defeat();
      else {
        // Must re-query if he optimizes (re-renders table).
        lightUnlocked = false;
        lightBtn.hidden = true;
        resultEl.hidden = true;
        msgEl.textContent = 'Hit! Query again to keep the light flowing. HP: ' + hp;
      }
    }

    execBtn.addEventListener('click', executeQuery);
    sqlEl.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.ctrlKey) executeQuery(); });
    lightBtn.addEventListener('click', useLight);
  }

  function defeat() {
    dead = true;
    clearInterval(optimizeTimer);
    const bossEl = arena.querySelector('.mg-boss');
    if (bossEl) bossEl.classList.add('mg-boss-dead');
    const msgEl = arena.querySelector('.mg-boss-msg');
    if (msgEl) msgEl.textContent = 'Query... returned... weakness... 0 rows remaining. [TABLE DROPPED]';
    setTimeout(onDefeat, 750);
  }

  // Cheat: every 10s adds a counter row and resets query result — player must re-query.
  const optimizeTimer = setInterval(() => {
    if (dead) return;
    const hasCounter = tableRows.some((r) => r.attribute === 'counter');
    if (!hasCounter) {
      tableRows.push({ id: 5, attribute: 'counter', value: '"dark"' });
    } else {
      // Rotate counter value to appear to "optimize"
      const c = tableRows.find((r) => r.attribute === 'counter');
      if (c) c.value = c.value === '"dark"' ? '"void"' : '"dark"';
    }
    lightUnlocked = false;
    const msgEl = arena.querySelector('.mg-boss-msg');
    if (msgEl) msgEl.textContent = 'He OPTIMIZED his defenses! Re-query to find his weakness.';
    render();
  }, stage.optimizeMs);

  render();
  return { destroy() { clearInterval(optimizeTimer); } };
}

/* ── Stage 10 — The Archivist (folder + export ZIP). Assemble 3 key fragments, save them,
   then export as ZIP. He corrupts key files every 12s. ── */
function mountArchivist(arena, { stage, onDefeat }) {
  let dead = false, corruptTimer = null;
  const KEY_FILES = [
    { name: 'fragment-alpha.txt', correct: 'OPEN',    placeholder: '[corrupted-alpha]' },
    { name: 'fragment-beta.txt',  correct: 'THE',     placeholder: '[corrupted-beta]' },
    { name: 'fragment-gamma.txt', correct: 'GATE',    placeholder: '[corrupted-gamma]' },
  ];
  const DECOY_FILES = [
    { name: 'readme.txt',      content: 'This is the archive. Handle with care.' },
    { name: 'manifest.json',   content: '{"version": "1.0", "status": "sealed"}' },
  ];

  // Track which key files are correctly saved.
  const saved = { 'fragment-alpha.txt': false, 'fragment-beta.txt': false, 'fragment-gamma.txt': false };
  const contents = {
    'fragment-alpha.txt': KEY_FILES[0].placeholder,
    'fragment-beta.txt':  KEY_FILES[1].placeholder,
    'fragment-gamma.txt': KEY_FILES[2].placeholder,
  };

  function allSaved() { return Object.values(saved).every(Boolean); }

  function render() {
    if (dead) return;
    const allFiles = [...KEY_FILES, ...DECOY_FILES];
    const fileList = allFiles.map((f) => {
      const isKey = KEY_FILES.find((k) => k.name === f.name);
      const isSaved = isKey ? saved[f.name] : false;
      const val = isKey ? contents[f.name] : f.content;
      return '<div class="mg-arc-file">' +
        '<div class="mg-arc-fname">' + (isKey ? '&#128273; ' : '') + esc(f.name) + (isSaved ? ' <span class="mg-arc-check">&#10003;</span>' : '') + '</div>' +
        (isKey
          ? '<textarea class="mg-arc-txt" data-name="' + esc(f.name) + '" rows="2" aria-label="' + esc(f.name) + '" spellcheck="false">' + esc(val) + '</textarea>' +
            '<button class="mg-arc-save" type="button" data-name="' + esc(f.name) + '">Save File</button>'
          : '<div class="mg-arc-static">' + esc(val) + '</div>') +
        '</div>';
    }).join('');

    const exportActive = allSaved();
    arena.innerHTML =
      '<div class="mg-boss mg-boss-archivist">' +
      '<div class="mg-boss-sprite">🗂</div>' +
      '<div class="mg-boss-name">' + esc(stage.bossName) + '</div>' +
      '<div class="mg-arc-folder">' + fileList + '</div>' +
      '<button class="mg-arc-export" type="button"' + (exportActive ? '' : ' disabled') + '>Export Folder as ZIP</button>' +
      '<div class="mg-boss-msg" role="status">Assemble the key fragments: alpha=OPEN, beta=THE, gamma=GATE. Save each, then export.</div>' +
      '</div>';

    const bossEl    = arena.querySelector('.mg-boss');
    const exportBtn = arena.querySelector('.mg-arc-export');
    const msgEl     = arena.querySelector('.mg-boss-msg');

    arena.querySelectorAll('.mg-arc-save').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (dead) return;
        const fname = btn.dataset.name;
        const txt   = arena.querySelector('.mg-arc-txt[data-name="' + fname + '"]');
        const keyFile = KEY_FILES.find((k) => k.name === fname);
        if (!keyFile || !txt) return;
        const val = txt.value.trim().toUpperCase();
        if (val === keyFile.correct) {
          saved[fname] = true;
          contents[fname] = txt.value.trim();
          msgEl.textContent = fname + ' saved! ' + Object.values(saved).filter(Boolean).length + '/3 fragments assembled.';
          bossEl.classList.remove('mg-hit'); void bossEl.offsetWidth; bossEl.classList.add('mg-hit');
          render();
        } else {
          saved[fname] = false;
          msgEl.textContent = 'Incorrect content for ' + fname + '. (alpha=OPEN, beta=THE, gamma=GATE)';
        }
      });
    });

    exportBtn.addEventListener('click', () => {
      if (dead) return;
      if (!allSaved()) { msgEl.textContent = 'All 3 key files must be saved correctly first!'; return; }
      defeat();
    });
  }

  function defeat() {
    dead = true;
    clearInterval(corruptTimer);
    const bossEl = arena.querySelector('.mg-boss');
    if (bossEl) bossEl.classList.add('mg-boss-dead');
    const msgEl = arena.querySelector('.mg-boss-msg');
    if (msgEl) msgEl.textContent = 'ALL FRAGMENTS ASSEMBLED — EXPORT COMPLETE. The exit opens. [ARCHIVE SEALED]';
    setTimeout(onDefeat, 750);
  }

  // Cheat: every 12s corrupt one random key file back to placeholder.
  corruptTimer = setInterval(() => {
    if (dead) return;
    const savedKeys = KEY_FILES.filter((k) => saved[k.name]);
    if (savedKeys.length === 0) return;
    const target = savedKeys[Math.floor(Math.random() * savedKeys.length)];
    saved[target.name] = false;
    contents[target.name] = target.placeholder;
    const msgEl = arena.querySelector('.mg-boss-msg');
    if (msgEl) msgEl.textContent = 'He CORRUPTED ' + target.name + '! Re-enter the value and save it again.';
    render();
  }, stage.corruptMs);

  render();
  return { destroy() { clearInterval(corruptTimer); } };
}

export const STAGES3 = [
  {
    n: 8,
    title: 'The Redactor',
    goal: 1400,
    resource: { name: 'renders', color: '#e5534b' },
    tiers: [
      { id: 'click', name: 'Render', icon: '🖨', type: 'click', amount: 8, base: 80, mult: 1.5, desc: '+8 renders per click' },
      { id: 'renderer', name: 'Page renderer', icon: '📄', type: 'auto', rate: 4, base: 320, mult: 1.15, desc: 'renders 4 pages/s' },
      { id: 'farm', name: 'PDF farm', icon: '🏭', type: 'auto', rate: 26, base: 5200, mult: 1.15, desc: 'renders 26 pages/s' },
      { id: 'spool', name: 'Print spool', icon: '🖨', type: 'auto', rate: 130, base: 78000, mult: 1.15, desc: 'renders 130 pages/s' },
    ],
    intro: [
      { speaker: 'SYS', text: 'Renders now. Documents are power here. Generate, automate, scale.' },
      { speaker: 'SYS', text: 'Something has decreed its own invincibility — in writing. On page 3. Reach 1400 renders.' },
    ],
    bossName: 'The Redactor',
    bossIntro: [
      { speaker: 'The Redactor', text: 'My power is DECREED on page 3. You cannot delete what is IN WRITING.' },
      { speaker: 'The Redactor', text: 'The decree is permanent. Irrevocable. This app cannot touch a PDF.' },
    ],
    hints: [
      { speaker: '??? (a friendly daemon)', text: 'Page 3 is the decree. Delete it.' },
      { speaker: '??? (a friendly daemon)', text: 'Same as stage 7 — but the weapon is a page selector, not a diff. You know the pattern.' },
      { speaker: '??? (a friendly daemon)', text: 'He re-adds it. You already know the rhythm. Delete, attack, repeat.' },
    ],
    victory: [
      { speaker: 'The Redactor', text: 'Page 3 deleted... my DECREE is... void... [DOCUMENT CORRUPTED]' },
      { speaker: 'SYS', text: 'Eight down. You deleted the page that gave him power. The right tool matters.' },
    ],
    hp: 4,
    addPageMs: 9000,
    mountBoss: mountRedactor,
  },
  {
    n: 9,
    title: 'The Query Golem',
    goal: 1600,
    resource: { name: 'records', color: '#3fb950' },
    tiers: [
      { id: 'click', name: 'SELECT', icon: '🔍', type: 'click', amount: 9, base: 90, mult: 1.5, desc: '+9 records per click' },
      { id: 'index', name: 'Index scan', icon: '📑', type: 'auto', rate: 5, base: 450, mult: 1.15, desc: 'scans 5 records/s' },
      { id: 'join', name: 'Table join', icon: '⇌', type: 'auto', rate: 32, base: 7200, mult: 1.15, desc: 'joins 32 records/s' },
      { id: 'optimizer', name: 'Query optimizer', icon: '⚡', type: 'auto', rate: 160, base: 110000, mult: 1.15, desc: 'optimizes 160 records/s' },
    ],
    intro: [
      { speaker: 'SYS', text: 'Records now. Structured data. The database is the last line of defense.' },
      { speaker: 'SYS', text: 'A golem made of query plans guards the penultimate gate. Reach 1600 records.' },
    ],
    bossName: 'The Query Golem',
    bossIntro: [
      { speaker: 'The Query Golem', text: 'I AM the database. You cannot read me without the right query.' },
      { speaker: 'The Query Golem', text: 'My weakness is in the table. But you will never find the right SELECT.' },
    ],
    hints: [
      { speaker: '??? (a friendly daemon)', text: 'One row. One weakness. You know how to SELECT it.' },
      { speaker: '??? (a friendly daemon)', text: 'SELECT value FROM boss_stats WHERE attribute = \'weakness\'' },
      { speaker: '??? (a friendly daemon)', text: 'He optimizes. You re-query. Light button reappears. You have done harder.' },
    ],
    victory: [
      { speaker: 'The Query Golem', text: 'Query... returned... weakness... 0 rows remaining. [TABLE DROPPED]' },
      { speaker: 'SYS', text: 'Nine down. You read the database. The final gate is just ahead.' },
    ],
    hp: 3,
    optimizeMs: 10000,
    mountBoss: mountQueryGolem,
  },
  {
    n: 10,
    title: 'The Archivist',
    goal: 2000,
    resource: { name: 'archives', color: '#e3b341' },
    tiers: [
      { id: 'click', name: 'Compress', icon: '📦', type: 'click', amount: 10, base: 100, mult: 1.5, desc: '+10 archives per click' },
      { id: 'indexer', name: 'File indexer', icon: '📂', type: 'auto', rate: 6, base: 600, mult: 1.15, desc: 'indexes 6 archives/s' },
      { id: 'dedup', name: 'Dedup', icon: '✂', type: 'auto', rate: 40, base: 10000, mult: 1.15, desc: 'deduplicates 40 archives/s' },
      { id: 'cold', name: 'Cold storage', icon: '🧊', type: 'auto', rate: 200, base: 160000, mult: 1.15, desc: 'archives 200/s' },
    ],
    intro: [
      { speaker: 'SYS', text: 'Archives. Everything ends up here. The final resource. Collect 2000.' },
      { speaker: 'SYS', text: 'The Archivist has sealed the exit inside a folder. He has shattered the key across three files. Assemble them.' },
    ],
    bossName: 'The Archivist',
    bossIntro: [
      { speaker: 'The Archivist', text: 'The key is SHATTERED across this folder. You cannot assemble what you cannot organize.' },
      { speaker: 'The Archivist', text: 'Even if you fix the files — I will corrupt them again. The archive is MINE.' },
    ],
    hints: [
      { speaker: '??? (a friendly daemon)', text: 'The archive knows the way.' },
    ],
    victory: [
      { speaker: 'The Archivist', text: 'ALL FRAGMENTS ASSEMBLED — EXPORT COMPLETE. The exit... it opens...' },
      { speaker: 'SYS', text: 'TEN. You organized the chaos. You exported the truth. The Archivist is sealed in his own archive. You win.' },
    ],
    corruptMs: 12000,
    mountBoss: mountArchivist,
  },
];
