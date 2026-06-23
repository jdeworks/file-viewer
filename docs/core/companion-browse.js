// Modal folder browser over the companion's watched folders. Resolves to the absolute directory
// path the user chose, or null if cancelled. Powers the "create unknown file" flow: when an opened
// file isn't found on disk, the user picks a watched folder (navigating subfolders) to create it in.
import { getWatchedPaths, listFiles } from './companion.js';
import { toast } from './state.js';

// Path helpers that work for both POSIX (/) and Windows (\) absolute paths, since the companion
// returns native paths from the OS it runs on.
const sepOf = (p) => (p.includes('\\') && !p.includes('/')) ? '\\' : '/';
export function joinPath(dir, name) {
  const s = sepOf(dir);
  return dir.endsWith(s) ? dir + name : dir + s + name;
}
const parentOf = (dir) => {
  const s = sepOf(dir);
  const i = dir.lastIndexOf(s);
  return i > 0 ? dir.slice(0, i) : dir;
};

export async function browseForFolder({ title = 'Choose a folder:' } = {}) {
  let roots;
  try { roots = await getWatchedPaths(); } catch { roots = []; }
  if (!roots || !roots.length) {
    toast('No watched folders yet — add one in Companion settings first.');
    return null;
  }

  return new Promise((resolve) => {
    const dialog = document.createElement('dialog');
    dialog.className = 'companion-browse';
    const done = (val) => { try { dialog.close(); } catch { /* not open */ } dialog.remove(); resolve(val); };

    // current === null → showing the list of watched roots; otherwise an absolute dir path.
    let current = roots.length === 1 ? roots[0] : null;

    async function render() {
      dialog.innerHTML = '';

      const h = document.createElement('div');
      h.className = 'companion-browse-title';
      h.textContent = title;

      const crumb = document.createElement('div');
      crumb.className = 'companion-browse-path';
      crumb.textContent = current || 'Watched folders';

      const list = document.createElement('div');
      list.className = 'companion-browse-list';
      list.textContent = 'Loading…';

      const footer = document.createElement('div');
      footer.className = 'companion-browse-footer';
      const upBtn = document.createElement('button');
      upBtn.className = 'btn small';
      upBtn.textContent = '⬆ Up';
      upBtn.disabled = !current;
      upBtn.addEventListener('click', () => {
        if (!current) return;
        current = roots.includes(current) ? null : parentOf(current);
        render();
      });
      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'btn small';
      cancelBtn.textContent = 'Cancel';
      cancelBtn.addEventListener('click', () => done(null));
      // Make a brand-new subfolder under the current dir and use it as the destination — the server
      // creates missing intermediate directories on save.
      const newBtn = document.createElement('button');
      newBtn.className = 'btn small';
      newBtn.textContent = '+ New folder';
      newBtn.disabled = !current;
      newBtn.addEventListener('click', () => {
        const name = (prompt('New subfolder name (it will be created here):') || '').trim();
        if (!name) return;
        if (/[\\/]/.test(name) || name === '.' || name === '..') { toast('Invalid folder name.'); return; }
        done(joinPath(current, name));
      });
      const okBtn = document.createElement('button');
      okBtn.className = 'btn small companion-browse-ok';
      okBtn.textContent = 'Create here';
      okBtn.disabled = !current;
      okBtn.addEventListener('click', () => done(current));
      footer.append(upBtn, newBtn, cancelBtn, okBtn);

      dialog.append(h, crumb, list, footer);

      if (!current) {
        // Root list: each watched folder opens into a browse view.
        list.innerHTML = '';
        for (const r of roots) addRow(list, r, () => { current = r; render(); });
        return;
      }

      let entries;
      try { entries = await listFiles(current); }
      catch (err) { list.textContent = 'Could not read folder: ' + err.message; return; }
      const dirs = entries.filter((e) => e.isDir).sort((a, b) => a.name.localeCompare(b.name));
      list.innerHTML = '';
      if (!dirs.length) {
        const empty = document.createElement('div');
        empty.className = 'companion-browse-empty';
        empty.textContent = '(no subfolders — use “Create here” to put the file in this folder)';
        list.appendChild(empty);
      }
      for (const d of dirs) addRow(list, '📁 ' + d.name, () => { current = joinPath(current, d.name); render(); });
    }

    function addRow(list, label, onClick) {
      const b = document.createElement('button');
      b.className = 'companion-browse-row';
      b.textContent = label;
      b.addEventListener('click', onClick);
      list.appendChild(b);
    }

    document.body.appendChild(dialog);
    dialog.showModal();
    dialog.addEventListener('cancel', (e) => { e.preventDefault(); done(null); });
    render();
  });
}
