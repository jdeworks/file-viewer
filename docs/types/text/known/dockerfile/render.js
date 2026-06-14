// Enhanced Dockerfile view: list each instruction with a one-line description and highlight
// build stages. Parent-pane generated DOM.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const DESC = {
  FROM: 'Base image (starts a build stage)', RUN: 'Execute a command in a new layer',
  CMD: 'Default command for the container', ENTRYPOINT: 'Executable the container runs',
  COPY: 'Copy files from the build context', ADD: 'Copy files (also URLs / tar extraction)',
  ENV: 'Set an environment variable', ARG: 'Build-time variable', WORKDIR: 'Set the working directory',
  EXPOSE: 'Document a listening port', VOLUME: 'Declare a mount point', USER: 'Set the user for following steps',
  LABEL: 'Add image metadata', HEALTHCHECK: 'How to test the container is healthy', SHELL: 'Override the default shell',
  ONBUILD: 'Trigger for downstream builds', STOPSIGNAL: 'Signal to stop the container',
};

export async function render(intake, _ctx) {
  const host = document.createElement('div');
  host.className = 'pj-doc';
  const raw = (intake.text || '').split(/\r?\n/);

  // Join line-continuations (\) so each instruction is one logical line.
  const lines = [];
  let buf = '';
  for (const l of raw) {
    const t = l.replace(/\s+$/, '');
    if (/^\s*#/.test(t) || (!t.trim() && !buf)) continue;
    buf += (buf ? '\n' : '') + t;
    if (/\\$/.test(t)) { buf = buf.replace(/\\$/, ' '); continue; }
    if (buf.trim()) lines.push(buf); buf = '';
  }
  if (buf.trim()) lines.push(buf);

  let stages = 0;
  const items = lines.map((line) => {
    const m = line.match(/^\s*([A-Za-z]+)\s*([\s\S]*)$/);
    const instr = (m ? m[1] : '').toUpperCase();
    const args = m ? m[2].trim() : line.trim();
    if (instr === 'FROM') stages++;
    const desc = DESC[instr] || '';
    return '<li class="kf-instr"><span class="kf-badge kf-' + esc(instr.toLowerCase()) + '">' + esc(instr) + '</span>'
      + '<code class="kf-args">' + esc(args) + '</code>'
      + (desc ? '<span class="kf-note">' + esc(desc) + '</span>' : '') + '</li>';
  }).join('');

  host.innerHTML = '<header class="pj-head"><h2>Dockerfile</h2>'
    + '<p class="pj-meta">' + lines.length + ' instruction' + (lines.length === 1 ? '' : 's')
    + ' · ' + stages + ' build stage' + (stages === 1 ? '' : 's') + '</p></header>'
    + '<ul class="kf-list">' + items + '</ul>';
  return { parentNode: host };
}
