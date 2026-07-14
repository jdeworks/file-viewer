import { normalizeChapters, serializeWebVttChapters } from './chapters.js';

function button(label, className, title = '') {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = className;
  el.textContent = label;
  if (title) el.title = title;
  return el;
}

function fmtTime(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return hours
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    : `${minutes}:${String(secs).padStart(2, '0')}`;
}

function sidecarName(filename) {
  return `${String(filename || 'audio').replace(/\.[^.]+$/, '')}.chapters.vtt`;
}

export function buildChapterEditor({ chapters, mediaEl, filename, onChange } = {}) {
  const root = document.createElement('section');
  root.className = 'media-chapters';
  let editing = false;
  let list = normalizeChapters(chapters, mediaEl?.duration);

  const notify = (next) => {
    list = normalizeChapters(next, mediaEl?.duration);
    onChange?.(list.map((chapter) => ({ ...chapter })));
    render();
  };

  function downloadSidecar() {
    if (!list.length) return;
    const blob = new Blob([serializeWebVttChapters(list, mediaEl?.duration)], { type: 'text/vtt' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = sidecarName(filename);
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function renderViewRows(body) {
    for (const [index, chapter] of list.entries()) {
      const row = button('', 'media-chapter', `Seek to ${chapter.title || `Chapter ${index + 1}`}`);
      const time = document.createElement('span');
      time.className = 'media-chapter-time';
      time.textContent = fmtTime(chapter.start);
      const label = document.createElement('span');
      label.className = 'media-chapter-label';
      label.textContent = chapter.title || `Chapter ${index + 1}`;
      row.append(time, label);
      row.addEventListener('click', () => {
        if (!mediaEl) return;
        mediaEl.currentTime = chapter.start;
        mediaEl.play().catch(() => {});
      });
      body.append(row);
    }
  }

  function renderEditRows(body) {
    for (const [index, chapter] of list.entries()) {
      const row = document.createElement('div');
      row.className = 'media-chapter media-chapter-edit-row';
      const start = document.createElement('input');
      start.type = 'number';
      start.className = 'media-chapter-start';
      start.min = '0';
      start.step = '0.001';
      start.value = String(Math.round(chapter.start * 1000) / 1000);
      start.setAttribute('aria-label', `Chapter ${index + 1} start in seconds`);
      const title = document.createElement('input');
      title.type = 'text';
      title.className = 'media-chapter-title-input';
      title.value = chapter.title || `Chapter ${index + 1}`;
      title.setAttribute('aria-label', `Chapter ${index + 1} title`);
      const remove = button('Delete', 'media-chapter-delete', `Delete chapter ${index + 1}`);
      start.addEventListener('change', () => {
        const value = Number(start.value);
        if (!Number.isFinite(value)) { render(); return; }
        notify(list.map((item, i) => (i === index ? { ...item, start: Math.max(0, value) } : item)));
      });
      title.addEventListener('change', () => {
        notify(list.map((item, i) => (i === index ? { ...item, title: title.value } : item)));
      });
      remove.addEventListener('click', () => notify(list.filter((_, i) => i !== index)));
      row.append(start, title, remove);
      body.append(row);
    }
  }

  function render() {
    root.replaceChildren();
    root.dataset.editing = editing ? 'true' : 'false';
    root.dataset.chapterCount = String(list.length);
    const head = document.createElement('div');
    head.className = 'media-chapters-head';
    const label = document.createElement('span');
    label.textContent = `📑 Chapters (${list.length})`;
    const actions = document.createElement('span');
    actions.className = 'media-chapters-actions';
    const edit = button(editing ? 'Done' : 'Edit chapters', 'media-chapters-edit');
    edit.setAttribute('aria-pressed', editing ? 'true' : 'false');
    edit.addEventListener('click', () => { editing = !editing; render(); });
    const add = button('Add at playhead', 'media-chapters-add');
    add.hidden = !editing;
    add.addEventListener('click', () => {
      const start = Math.max(0, Number(mediaEl?.currentTime) || 0);
      notify([...list, { start, title: `Chapter ${list.length + 1}` }]);
    });
    const save = button('Download VTT', 'media-chapters-download', 'Download edited chapters as a local WebVTT sidecar');
    save.disabled = !list.length;
    save.addEventListener('click', downloadSidecar);
    actions.append(edit, add, save);
    head.append(label, actions);
    root.append(head);
    const body = document.createElement('div');
    body.className = 'media-chapters-body';
    if (list.length) {
      if (editing) renderEditRows(body); else renderViewRows(body);
    } else {
      const empty = document.createElement('p');
      empty.className = 'media-chapters-empty';
      empty.textContent = editing
        ? 'Move the playhead and add the first chapter.'
        : 'No chapter markers found. Choose Edit chapters to create them locally.';
      body.append(empty);
    }
    root.append(body);
  }

  render();
  return {
    el: root,
    getChapters: () => list.map((chapter) => ({ ...chapter })),
    update(next) {
      list = normalizeChapters(next, mediaEl?.duration);
      render();
    },
  };
}
