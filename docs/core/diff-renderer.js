// Shared custom diff for line-oriented enhanced files such as .gitattributes, .mailmap,
// .npmignore, and .dockerignore. These known-file plugins deliberately opt into a browser-native
// diff instead of Monaco's generic surface. Reuse the move-aware renderer so reordered rules are
// called out as moves, edited rules receive word-level highlights, and additions/removals keep the
// same visual vocabulary as the rest of the viewer.
import { renderMoveDiff } from './movediff-view.js';

export function render(host, originalText, currentText) {
  renderMoveDiff(host, originalText, currentText, { threshold: 0.8 });

  const root = host.querySelector('.movediff');
  root?.classList.add('rule-diff');

  const heading = host.querySelector('.md-head strong');
  if (heading) heading.textContent = 'Rule-aware line diff';

  const note = host.querySelector('.md-note');
  if (note) {
    note.textContent = 'Green/red rows were added or removed; highlighted words changed; blue or purple rows moved. Similar lines are paired at 80% or higher.';
  }
}

export default render;
