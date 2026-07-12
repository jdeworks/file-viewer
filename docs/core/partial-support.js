const escapeHtml = (value) => String(value ?? '').replace(/[&<>"]/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;',
}[char]));

function classNames(extraClass) {
  return String(extraClass || '').split(/\s+/).filter((token) => /^[a-zA-Z][\w-]*$/.test(token));
}

export function partialSupportHtml(message, extraClass = '') {
  const classes = ['partial-support-notice', ...classNames(extraClass)].join(' ');
  return `<p class="${classes}" data-partial-support role="note">${escapeHtml(message)}</p>`;
}

export function createPartialSupportNotice(message, extraClass = '') {
  const notice = document.createElement('p');
  notice.classList.add('partial-support-notice', ...classNames(extraClass));
  notice.dataset.partialSupport = '';
  notice.setAttribute('role', 'note');
  notice.textContent = message;
  return notice;
}
