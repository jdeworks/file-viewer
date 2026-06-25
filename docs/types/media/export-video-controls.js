export const VIDEO_TRANSFORMS = [
  ['none', 'None'],
  ['square', 'Center square crop'],
  ['vertical', 'Vertical 9:16 crop'],
  ['rotate_cw', 'Rotate 90° clockwise'],
  ['rotate_ccw', 'Rotate 90° counterclockwise'],
];

export const VIDEO_LOOKS = [
  ['source', 'Source look'],
  ['cinema', 'Cinema'],
  ['contrast', 'High contrast'],
  ['mono', 'Monochrome'],
];

export function optionLabel(options, value) {
  return (options.find((row) => row[0] === value) || options[0])[1];
}

function appendOptions(select, options) {
  for (const [value, label] of options) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    select.append(option);
  }
}

export function buildVideoTransformControls() {
  const row = document.createElement('div');
  row.className = 'media-ed-radio-row media-export-transform-row';

  const transformSel = document.createElement('select');
  transformSel.className = 'sp-preset-sel media-export-transform';
  appendOptions(transformSel, VIDEO_TRANSFORMS);

  const lookSel = document.createElement('select');
  lookSel.className = 'sp-preset-sel media-export-look';
  appendOptions(lookSel, VIDEO_LOOKS);

  row.append(
    document.createTextNode('Transform '), transformSel,
    document.createTextNode(' Look '), lookSel,
  );

  return { row, transformSel, lookSel };
}

export function buildSubtitleBurnControls(makeButton, onFileChange) {
  const burnCard = document.createElement('div');
  burnCard.className = 'media-export-subtitle-card';

  const burnCopy = document.createElement('div');
  burnCopy.className = 'media-export-subtitle-copy';
  const burnTitle = document.createElement('div');
  burnTitle.className = 'media-export-subtitle-title';
  burnTitle.textContent = 'Subtitle burn-in';
  const status = document.createElement('div');
  status.className = 'media-export-subtitle-status';
  status.textContent = 'Choose .srt or .vtt; export starts on burn-in.';
  burnCopy.append(burnTitle, status);

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.srt,.vtt,text/vtt,application/x-subrip';
  input.className = 'media-ed-file-input media-export-subtitle-input';

  const button = makeButton('Burn in subtitles', 'media-ed-run media-export-subtitle-run');
  burnCard.append(burnCopy, input, button);
  input.addEventListener('change', () => onFileChange(input.files && input.files[0], status));

  return { el: burnCard, input, button, status };
}
