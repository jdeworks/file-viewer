import {
  MIXER_REAPPLY_CHOICES,
  applyRelinkChoice,
  exportProjectSettingsJson,
  importProjectSettings,
} from './index.js';

export function createProjectSettingsUi({
  root,
  getProject,
  setProject,
  runtimeFiles,
  render,
  filename = 'media-mixer-project.json',
} = {}) {
  let lastImport = null;

  const onClick = (event) => {
    const exportButton = event.target?.closest?.('.mmx-settings-download');
    if (exportButton && root.contains(exportButton)) {
      downloadSettings(exportProjectSettingsJson(getProject()), filename);
      root.dataset.lastSettingsExport = 'downloaded';
      return;
    }
    const choiceButton = event.target?.closest?.('.mmx-relink-choice');
    if (!choiceButton || !root.contains(choiceButton) || !lastImport) return;
    const applied = applyRelinkChoice(lastImport.project, lastImport.relink, choiceButton.dataset.choice);
    setProject(applied.project);
    lastImport = { ...lastImport, applied };
    root.dataset.lastRelinkChoice = applied.choice;
    root.dataset.lastRelinkApplied = String(applied.applied.length);
    root.dataset.lastRelinkPending = String(applied.pendingReview.length);
    render();
  };

  const onChange = async (event) => {
    if (!event.target?.matches?.('.mmx-settings-import')) return;
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      importSettings(await file.text());
    } catch (error) {
      root.dataset.lastSettingsError = error?.message || String(error);
      render();
    }
  };

  root.addEventListener('click', onClick);
  root.addEventListener('change', onChange);

  return {
    decorate,
    importSettings,
    getLastImport: () => lastImport,
    destroy() {
      root.removeEventListener('click', onClick);
      root.removeEventListener('change', onChange);
    },
  };

  function importSettings(json, availableAssets = localAssetsFromRuntime(getProject(), runtimeFiles)) {
    const imported = importProjectSettings(json, availableAssets);
    lastImport = imported;
    setProject(imported.project);
    root.dataset.lastSettingsImport = imported.needsRelink ? 'needs-relink' : 'ready';
    root.dataset.lastRelinkMissing = String(imported.relink.missing.length);
    root.dataset.lastRelinkMatches = String(imported.relink.matches.length);
    render();
    return imported;
  }

  function decorate() {
    const toolbar = root.querySelector('.mmx-toolbar');
    if (!toolbar || toolbar.querySelector('.mmx-settings-controls')) return;
    const controls = document.createElement('div');
    controls.className = 'mmx-settings-controls';
    const exportButton = document.createElement('button');
    exportButton.type = 'button';
    exportButton.className = 'mmx-settings-download';
    exportButton.textContent = 'Export settings';
    const importLabel = document.createElement('label');
    importLabel.className = 'mmx-settings-import-label';
    importLabel.textContent = 'Import settings';
    const input = document.createElement('input');
    input.type = 'file';
    input.className = 'mmx-settings-import';
    input.accept = 'application/json,.json';
    importLabel.append(input);
    controls.append(exportButton, importLabel);
    toolbar.append(controls);
    if (lastImport) root.append(renderRelinkPanel(lastImport));
  }
}

function renderRelinkPanel(state) {
  const panel = document.createElement('section');
  panel.className = 'mmx-relink-modal';
  panel.dataset.matches = String(state.relink.matches.length);
  panel.dataset.missing = String(state.relink.missing.length);
  const title = document.createElement('strong');
  title.textContent = 'Project media reapply';
  const summary = document.createElement('span');
  summary.className = 'mmx-relink-summary';
  summary.textContent = `${state.relink.matches.length} matched · ${state.relink.missing.length} missing`;
  panel.append(title, summary);
  for (const [choice, label] of [
    [MIXER_REAPPLY_CHOICES.APPLY_ALL, 'Apply to all elements'],
    [MIXER_REAPPLY_CHOICES.ASK_PER_ELEMENT, 'Ask per element'],
    [MIXER_REAPPLY_CHOICES.DO_NOT_CHANGE_MEDIA, 'Do not change media objects'],
  ]) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'mmx-relink-choice';
    button.dataset.choice = choice;
    button.textContent = label;
    panel.append(button);
  }
  return panel;
}

function localAssetsFromRuntime(project, runtimeFiles) {
  return (project.assets || []).filter((asset) => runtimeFiles?.has?.(asset.id)).map((asset) => ({
    ...asset,
    status: 'available',
  }));
}

function downloadSettings(json, filename) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  link.download = filename;
  document.body.append(link);
  link.click();
  setTimeout(() => {
    URL.revokeObjectURL(link.href);
    link.remove();
  }, 0);
}
