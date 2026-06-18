import { escapeHtml } from '../../../core/state.js';

export async function render(intake) {
  const text = intake.text || '';
  const empty = text.length === 0;
  return {
    bodyHtml: '<article class="plain-doc">'
      + (empty ? '<p class="plain-empty">Empty text file</p>' : '<pre class="plain-text">' + escapeHtml(text) + '</pre>')
      + '</article>',
    hadUnsafe: false,
  };
}
