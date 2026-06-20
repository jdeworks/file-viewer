// kitty terminal config renderer. Parses `key value` space-separated directives,
// `# comments`, `map KEY COMMAND` keybindings, and `include FILE` directives.
// Pure text parsing — no eval, no execution.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function parseKitty(text) {
  const lines = text.split('\n');
  const data = {
    fontFamily: null,
    boldFont: null,
    italicFont: null,
    fontSize: null,
    bgOpacity: null,
    windowPadding: null,
    background: null,
    foreground: null,
    cursor: null,
    cursorShape: null,
    cursorBlink: null,
    scrollbackLines: null,
    tabBarStyle: null,
    tabTitleTemplate: null,
    mapCount: 0,
    includes: [],
    themeName: null,
  };

  let inKittyTheme = false;
  let themeNameFound = null;

  for (const raw of lines) {
    const line = raw.trim();

    // begin_kitty_theme / end_kitty_theme block
    if (/^begin_kitty_theme\b/.test(line)) {
      inKittyTheme = true;
      const m = line.match(/^begin_kitty_theme\s+(.+)/);
      if (m) themeNameFound = m[1].trim();
      continue;
    }
    if (/^end_kitty_theme\b/.test(line)) {
      inKittyTheme = false;
      continue;
    }
    if (inKittyTheme) continue; // skip theme color definitions

    // Skip comments and empty lines
    if (!line || line.startsWith('#')) continue;

    // map KEY COMMAND
    if (/^map\s+/i.test(line)) {
      data.mapCount++;
      continue;
    }

    // include FILENAME
    const incMatch = line.match(/^include\s+(.+)$/i);
    if (incMatch) {
      data.includes.push(incMatch[1].trim());
      continue;
    }

    // key value directives (space-separated)
    const m = line.match(/^(\S+)\s+(.+)$/);
    if (!m) continue;
    const [, key, val] = m;
    const v = val.trim();

    switch (key.toLowerCase()) {
      case 'font_family': data.fontFamily = v; break;
      case 'bold_font': data.boldFont = v; break;
      case 'italic_font': data.italicFont = v; break;
      case 'font_size': data.fontSize = v; break;
      case 'background_opacity': data.bgOpacity = v; break;
      case 'window_padding_width': data.windowPadding = v; break;
      case 'background': data.background = v; break;
      case 'foreground': data.foreground = v; break;
      case 'cursor': data.cursor = v; break;
      case 'cursor_shape': data.cursorShape = v; break;
      case 'cursor_blink_interval': data.cursorBlink = v; break;
      case 'scrollback_lines': data.scrollbackLines = v; break;
      case 'tab_bar_style': data.tabBarStyle = v; break;
      case 'tab_title_template': data.tabTitleTemplate = v; break;
    }
  }

  if (themeNameFound) data.themeName = themeNameFound;

  return data;
}

export function render(intake) {
  const host = document.createElement('div');
  host.className = 'kitty-doc';
  const text = intake.text || '';

  const d = parseKitty(text);

  const badge = '<span class="kitty-badge" style="display:inline-block;padding:2px 8px;border-radius:4px;background:#F6A623;color:#fff;font-weight:700;font-size:0.85em">kitty</span>';

  let html = '<header class="pj-head"><div class="pj-title">' + badge;
  if (d.themeName) html += ' <span class="kf-tag">' + esc(d.themeName) + '</span>';
  html += '</div><div class="pj-meta">';
  if (d.mapCount) html += '<span class="pj-tag">' + d.mapCount + ' keybinding' + (d.mapCount !== 1 ? 's' : '') + '</span>';
  if (d.includes.length) html += '<span class="pj-tag">' + d.includes.length + ' include' + (d.includes.length !== 1 ? 's' : '') + '</span>';
  html += '</div></header>';

  // Font card
  if (d.fontFamily || d.fontSize) {
    html += '<section class="kf-svc"><h3>Font</h3><ul class="kf-list">';
    if (d.fontFamily) html += '<li class="kf-pat"><code class="ts-key">font_family</code><span class="ts-doc" style="flex:1;padding-left:8px">' + esc(d.fontFamily) + '</span></li>';
    if (d.boldFont) html += '<li class="kf-pat"><code class="ts-key">bold_font</code><span class="ts-doc" style="flex:1;padding-left:8px">' + esc(d.boldFont) + '</span></li>';
    if (d.italicFont) html += '<li class="kf-pat"><code class="ts-key">italic_font</code><span class="ts-doc" style="flex:1;padding-left:8px">' + esc(d.italicFont) + '</span></li>';
    if (d.fontSize) html += '<li class="kf-pat"><code class="ts-key">font_size</code><span class="ts-doc" style="flex:1;padding-left:8px">' + esc(d.fontSize) + 'pt</span></li>';
    html += '</ul></section>';
  }

  // Window card
  if (d.bgOpacity || d.windowPadding) {
    html += '<section class="kf-svc"><h3>Window</h3><ul class="kf-list">';
    if (d.bgOpacity) html += '<li class="kf-pat"><code class="ts-key">background_opacity</code><span class="ts-doc" style="flex:1;padding-left:8px">' + esc(d.bgOpacity) + '</span></li>';
    if (d.windowPadding) html += '<li class="kf-pat"><code class="ts-key">window_padding_width</code><span class="ts-doc" style="flex:1;padding-left:8px">' + esc(d.windowPadding) + 'px</span></li>';
    html += '</ul></section>';
  }

  // Colors
  if (d.background || d.foreground) {
    html += '<section class="kf-svc"><h3>Colors</h3><ul class="kf-list">';
    if (d.background) {
      html += '<li class="kf-pat"><code class="ts-key">background</code>'
        + '<span style="display:inline-block;width:16px;height:16px;border-radius:3px;background:' + esc(d.background) + ';margin-left:8px;vertical-align:middle;border:1px solid #555"></span>'
        + '<span class="ts-doc" style="flex:1;padding-left:8px">' + esc(d.background) + '</span></li>';
    }
    if (d.foreground) {
      html += '<li class="kf-pat"><code class="ts-key">foreground</code>'
        + '<span style="display:inline-block;width:16px;height:16px;border-radius:3px;background:' + esc(d.foreground) + ';margin-left:8px;vertical-align:middle;border:1px solid #555"></span>'
        + '<span class="ts-doc" style="flex:1;padding-left:8px">' + esc(d.foreground) + '</span></li>';
    }
    html += '</ul></section>';
  }

  // Cursor
  if (d.cursorShape || d.cursorBlink || d.cursor) {
    html += '<section class="kf-svc"><h3>Cursor</h3><ul class="kf-list">';
    if (d.cursorShape) {
      html += '<li class="kf-pat"><code class="ts-key">cursor_shape</code>'
        + '<span class="kf-tag" style="margin-left:8px">' + esc(d.cursorShape) + '</span></li>';
    }
    if (d.cursorBlink) html += '<li class="kf-pat"><code class="ts-key">cursor_blink_interval</code><span class="ts-doc" style="flex:1;padding-left:8px">' + esc(d.cursorBlink) + 's</span></li>';
    if (d.cursor && d.cursor !== 'none') {
      html += '<li class="kf-pat"><code class="ts-key">cursor</code>'
        + '<span style="display:inline-block;width:16px;height:16px;border-radius:3px;background:' + esc(d.cursor) + ';margin-left:8px;vertical-align:middle;border:1px solid #555"></span>'
        + '<span class="ts-doc" style="flex:1;padding-left:8px">' + esc(d.cursor) + '</span></li>';
    }
    html += '</ul></section>';
  }

  // Scrollback
  if (d.scrollbackLines) {
    html += '<section class="kf-svc"><h3>Scrollback</h3><ul class="kf-list">';
    html += '<li class="kf-pat"><code class="ts-key">scrollback_lines</code><span class="ts-doc" style="flex:1;padding-left:8px">' + esc(Number(d.scrollbackLines).toLocaleString()) + ' lines</span></li>';
    html += '</ul></section>';
  }

  // Tab bar
  if (d.tabBarStyle || d.tabTitleTemplate) {
    html += '<section class="kf-svc"><h3>Tab Bar</h3><ul class="kf-list">';
    if (d.tabBarStyle) html += '<li class="kf-pat"><code class="ts-key">tab_bar_style</code><span class="ts-doc" style="flex:1;padding-left:8px">' + esc(d.tabBarStyle) + '</span></li>';
    if (d.tabTitleTemplate) html += '<li class="kf-pat"><code class="ts-key">tab_title_template</code><span class="ts-doc" style="flex:1;padding-left:8px">' + esc(d.tabTitleTemplate) + '</span></li>';
    html += '</ul></section>';
  }

  // Includes
  if (d.includes.length) {
    const items = d.includes.map((f) => '<li class="kf-pat"><code>' + esc(f) + '</code></li>').join('');
    html += '<section class="kf-svc"><h3>Included Files <span class="pj-count">' + d.includes.length + '</span></h3><ul class="kf-list">' + items + '</ul></section>';
  }

  if (!d.fontFamily && !d.fontSize && !d.bgOpacity && !d.background && !d.mapCount) {
    html += '<p class="kf-note">No kitty config directives detected.</p>';
  }

  host.innerHTML = html;
  return { parentNode: host };
}
