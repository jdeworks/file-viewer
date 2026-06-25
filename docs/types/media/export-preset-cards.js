import { describeParams } from './export-presets.js';

function detailText(preset) {
  return preset.id === 'custom'
    ? 'Manual container / bitrate / sample rate / channels / loudness.'
    : (describeParams(preset) || formatPresetName(preset));
}

export function formatPresetName(preset) {
  if (!preset?.label) return '';
  return preset.label.split(' (')[0];
}

export function buildPresetCards({
  availablePresets,
  workflowPresetIds,
  onPresetSelected,
}) {
  const el = document.createElement('div');
  el.className = 'media-export-preset-cards';
  const cards = [];

  for (const presetId of workflowPresetIds) {
    const preset = availablePresets.find((p) => p.id === presetId);
    if (!preset) continue;

    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'media-export-preset-card';
    card.dataset.preset = preset.id;

    const title = document.createElement('div');
    title.className = 'media-export-preset-title';
    title.textContent = formatPresetName(preset);

    const detail = document.createElement('div');
    detail.className = 'media-export-preset-detail';
    detail.textContent = detailText(preset);

    card.append(title, detail);
    card.addEventListener('click', () => {
      if (typeof onPresetSelected === 'function') onPresetSelected(preset.id);
    });

    cards.push(card);
    el.append(card);
  }

  function sync(selectedPresetId) {
    const currentId = selectedPresetId?.id || selectedPresetId;
    for (const card of cards) {
      const active = card.dataset.preset === String(currentId);
      card.classList.toggle('media-export-preset-card--active', active);
      card.setAttribute('aria-pressed', active ? 'true' : 'false');
    }
  }

  return { el, cards, sync };
}
