export function makeButton(label, value, groupName) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'media-compare-layout-btn';
  btn.dataset.layout = value;
  btn.textContent = label;
  btn.setAttribute('aria-pressed', 'false');
  btn.title = `${groupName}: ${label}`;
  return btn;
}

export function makeNumberInput(className, value, step = '0.1') {
  const input = document.createElement('input');
  input.type = 'number';
  input.step = step;
  input.className = className;
  input.value = String(value);
  return input;
}
