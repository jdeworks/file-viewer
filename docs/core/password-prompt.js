// Inline password prompt for password-protected files.
// Renders a centered card inside `container` (replaces its contents).
// Returns a Promise<string|null> — resolves with the entered password, or null if cancelled.
// After the promise resolves, call container._showPasswordError(msg) to show an error inline
// and re-enable the input for another attempt.

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function showPasswordPrompt(container, { filename = '', hint = '', error = '' } = {}) {
  return new Promise((resolve) => {
    container.innerHTML = `
      <div class="pw-prompt">
        <div class="pw-icon">🔒</div>
        <div class="pw-title">Password protected</div>
        <div class="pw-sub">${esc(filename || 'This file')} requires a password to open.</div>
        ${hint ? `<div class="pw-hint">${esc(hint)}</div>` : ''}
        <div class="pw-error" id="pwError" ${error ? '' : 'hidden'}>${esc(error)}</div>
        <div class="pw-field">
          <input type="password" id="pwInput" class="pw-input" placeholder="Enter password" autocomplete="current-password" />
        </div>
        <div class="pw-actions">
          <button type="button" id="pwSubmit" class="pw-btn-primary">Unlock</button>
          <button type="button" id="pwCancel" class="pw-btn-secondary">Cancel</button>
        </div>
      </div>`;

    const input  = container.querySelector('#pwInput');
    const submit = container.querySelector('#pwSubmit');
    const cancel = container.querySelector('#pwCancel');
    const errEl  = container.querySelector('#pwError');

    input.focus();

    const doSubmit = () => { if (input.value) resolve(input.value); };
    submit.addEventListener('click', doSubmit);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSubmit(); });
    cancel.addEventListener('click', () => resolve(null));

    // Attach a helper so callers can show inline errors (e.g. wrong password) without
    // re-creating the whole prompt. Clears the input and re-focuses for the next attempt.
    container._showPasswordError = (msg) => {
      errEl.textContent = msg;
      errEl.hidden = false;
      input.value = '';
      input.focus();
    };
  });
}
