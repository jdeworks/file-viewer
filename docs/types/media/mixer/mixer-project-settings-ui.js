import {
  MIXER_REAPPLY_CHOICES,
  applyRelinkChoice,
  classifyMixerFile,
  hashFileIdentity,
  exportProjectSettingsJson,
  importProjectSettings,
  matchMissingAssets,
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
    if (!event.target?.matches?.('.mmx-settings-import, .mmx-relink-file')) return;
    const files = [...(event.target.files || [])];
    const file = files[0];
    event.target.value = '';
    if (!file) return;
    try {
      if (event.target.matches('.mmx-relink-file')) {
        await relinkFiles(files);
      } else {
        importSettings(await file.text());
      }
    } catch (error) {
      root.dataset.lastSettingsError = error?.message || String(error);
      render();
    }
  };

  const onDragOver = (event) => {
    if (!lastImport?.relink?.missing?.length || !event.dataTransfer?.files?.length) return;
    event.preventDefault();
    event.stopPropagation();
    root.classList.add('mmx-relink-drop-active');
  };

  const onDragLeave = (event) => {
    if (!root.contains(event.relatedTarget)) root.classList.remove('mmx-relink-drop-active');
  };

  const onDrop = async (event) => {
    if (!lastImport?.relink?.missing?.length) return;
    const files = [...(event.dataTransfer?.files || [])];
    if (!files.length) return;
    event.preventDefault();
    event.stopPropagation();
    root.classList.remove('mmx-relink-drop-active');
    try {
      await relinkFiles(files);
    } catch (error) {
      root.dataset.lastSettingsError = error?.message || String(error);
      render();
    }
  };

  root.addEventListener('click', onClick);
  root.addEventListener('change', onChange);
  root.addEventListener('dragover', onDragOver);
  root.addEventListener('dragleave', onDragLeave);
  root.addEventListener('drop', onDrop);

  return {
    decorate,
    importSettings,
    relinkFiles,
    getLastImport: () => lastImport,
    destroy() {
      root.removeEventListener('click', onClick);
      root.removeEventListener('change', onChange);
      root.removeEventListener('dragover', onDragOver);
      root.removeEventListener('dragleave', onDragLeave);
      root.removeEventListener('drop', onDrop);
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

  async function relinkFiles(files = []) {
    if (!lastImport) return null;
    const candidates = [];
    for (const file of files) {
      const asset = await assetMetadataFromFile(file);
      if (!asset) continue;
      candidates.push({ asset, file });
    }
    const availableAssets = [
      ...localAssetsFromRuntime(getProject(), runtimeFiles),
      ...candidates.map((candidate) => candidate.asset),
    ];
    const relink = matchMissingAssets(lastImport.project.assets, availableAssets);
    for (const match of relink.matches) {
      const candidate = candidates.find((item) => item.asset.id === match.localAsset.id);
      if (candidate) runtimeFiles?.set?.(match.assetId, candidate.file);
    }
    lastImport = {
      ...lastImport,
      relink,
      needsRelink: relink.missing.length > 0,
    };
    root.dataset.lastRelinkMissing = String(relink.missing.length);
    root.dataset.lastRelinkMatches = String(relink.matches.length);
    root.dataset.lastRelinkDropped = String(candidates.length);
    root.dataset.lastSettingsImport = relink.missing.length ? 'needs-relink' : 'ready';
    render();
    return lastImport;
  }

  function decorate() {
    const toolbar = root.querySelector('.mmx-toolbar');
    if (!toolbar || toolbar.querySelector('.mmx-settings-controls')) return;
    const controls = document.createElement('div');
    controls.className = 'mmx-settings-controls';
    const exportButton = document.createElement('button');
    exportButton.type = 'button';
    exportButton.className = 'mmx-settings-download';
    exportButton.textContent = 'Download project settings';
    exportButton.title = 'Download project configuration as JSON (media files are not embedded)';
    const importLabel = document.createElement('label');
    importLabel.className = 'mmx-settings-import-label';
    importLabel.textContent = 'Import project settings';
    importLabel.title = 'Import project configuration from JSON';
    const input = document.createElement('input');
    input.type = 'file';
    input.className = 'mmx-settings-import';
    input.accept = 'application/json,.json';
    importLabel.append(input);
    controls.append(exportButton, importLabel);
    (toolbar.querySelector('.mmx-mix-project-group') || toolbar).append(controls);
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
  if (state.relink.missing.length) {
    const drop = document.createElement('label');
    drop.className = 'mmx-relink-drop';
    drop.textContent = 'Drop or browse matching media to relink missing assets';
    const input = document.createElement('input');
    input.type = 'file';
    input.className = 'mmx-relink-file';
    input.accept = 'audio/*,video/*,image/*';
    input.multiple = true;
    drop.append(input);
    panel.append(drop);
  }
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

async function assetMetadataFromFile(file) {
  if (!file) return null;
  const classified = classifyMixerFile(file);
  if (classified.kind === 'unknown') return null;
  let hash = null;
  try {
    hash = await hashFileIdentity(file);
  } catch {
    hash = null;
  }
  return {
    id: `local-relink-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: file.name || 'Local media',
    mime: file.type || '',
    size: file.size || 0,
    lastModified: file.lastModified || null,
    hash,
    capabilities: classified.capabilities || {},
    status: 'available',
  };
}
