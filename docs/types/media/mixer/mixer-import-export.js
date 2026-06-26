import { MIXER_PROJECT_SCHEMA, MIXER_PROJECT_VERSION, MIXER_REAPPLY_CHOICES } from './mixer-config.js';
import { normalizeProject, createAsset } from './mixer-model.js';

export function exportProjectSettings(project) {
  const normalized = normalizeProject(project);
  return stripRuntimeFields(normalized);
}

export function exportProjectSettingsJson(project, space = 2) {
  return JSON.stringify(exportProjectSettings(project), null, space);
}

export function importProjectSettings(input, availableAssets = []) {
  const parsed = typeof input === 'string' ? JSON.parse(input) : input;
  validateProjectSettings(parsed);
  const project = normalizeProject(parsed);
  const relink = matchMissingAssets(project.assets, availableAssets);
  const matchedIds = new Set(relink.matches.map((match) => match.assetId));
  project.assets = project.assets.map((asset) => (
    matchedIds.has(asset.id) ? { ...asset, status: 'available' } : { ...asset, status: 'missing' }
  ));
  return {
    project,
    relink,
    needsRelink: relink.missing.length > 0,
  };
}

export function validateProjectSettings(project) {
  if (!project || typeof project !== 'object') throw new Error('Project settings must be an object.');
  if (project.schema !== MIXER_PROJECT_SCHEMA) throw new Error(`Unsupported project schema: ${project.schema || 'missing'}.`);
  if (project.version !== MIXER_PROJECT_VERSION) throw new Error(`Unsupported project version: ${project.version || 'missing'}.`);
  if (!Array.isArray(project.assets)) throw new Error('Project settings must include an assets array.');
  if (!Array.isArray(project.lanes)) throw new Error('Project settings must include a lanes array.');
  if (!Array.isArray(project.elements)) throw new Error('Project settings must include an elements array.');
  return true;
}

export function matchMissingAssets(importedAssets = [], localAssetInputs = []) {
  const localAssets = localAssetInputs.map(createAsset);
  const matches = [];
  const missing = [];
  const used = new Set();
  for (const imported of importedAssets) {
    const match = bestAssetMatch(imported, localAssets, used);
    if (match) {
      used.add(match.asset.id);
      matches.push({ assetId: imported.id, localAsset: match.asset, confidence: match.confidence, reason: match.reason });
    } else {
      missing.push(imported);
    }
  }
  return { matches, missing };
}

export function applyRelinkChoice(project, relink, choice) {
  if (!Object.values(MIXER_REAPPLY_CHOICES).includes(choice)) throw new Error(`Unsupported relink choice: ${choice}`);
  const next = normalizeProject(project);
  if (choice === MIXER_REAPPLY_CHOICES.DO_NOT_CHANGE_MEDIA) {
    return {
      project: next,
      pendingReview: [],
      applied: [],
      choice,
    };
  }
  const matches = relink?.matches || [];
  const matchByAssetId = new Map(matches.map((match) => [match.assetId, match]));
  if (choice === MIXER_REAPPLY_CHOICES.ASK_PER_ELEMENT) {
    return {
      project: next,
      pendingReview: next.elements.filter((element) => matchByAssetId.has(element.assetId)).map((element) => ({
        elementId: element.id,
        assetId: element.assetId,
        localAsset: matchByAssetId.get(element.assetId).localAsset,
      })),
      applied: [],
      choice,
    };
  }
  next.assets = next.assets.map((asset) => {
    const match = matchByAssetId.get(asset.id);
    if (!match) return asset;
    return {
      ...asset,
      name: match.localAsset.name,
      mime: match.localAsset.mime,
      size: match.localAsset.size,
      lastModified: match.localAsset.lastModified,
      hash: match.localAsset.hash || asset.hash,
      media: { ...asset.media, ...match.localAsset.media },
      capabilities: { ...asset.capabilities, ...match.localAsset.capabilities },
      status: 'available',
    };
  });
  return {
    project: next,
    pendingReview: [],
    applied: matches.map((match) => ({ assetId: match.assetId, localAssetId: match.localAsset.id })),
    choice,
  };
}

function stripRuntimeFields(project) {
  const out = normalizeProject(project);
  out.assets = out.assets.map((asset) => {
    const { file, fileObject, objectUrl, objectURL, mediaBytes, dataUrl, dataURL, ...safe } = asset;
    void file; void fileObject; void objectUrl; void objectURL; void mediaBytes; void dataUrl; void dataURL;
    return safe;
  });
  return out;
}

function bestAssetMatch(imported, localAssets, used) {
  const candidates = localAssets
    .filter((asset) => !used.has(asset.id))
    .map((asset) => scoreAssetMatch(imported, asset))
    .filter((candidate) => candidate.confidence > 0)
    .sort((a, b) => b.confidence - a.confidence);
  return candidates[0] || null;
}

function scoreAssetMatch(imported, asset) {
  if (imported.hash?.value && asset.hash?.value && imported.hash.value === asset.hash.value) {
    return { asset, confidence: 1, reason: 'hash' };
  }
  let score = 0;
  const reasons = [];
  if (imported.size && asset.size && imported.size === asset.size) {
    score += 0.35;
    reasons.push('size');
  }
  if (imported.name && asset.name && imported.name === asset.name) {
    score += 0.3;
    reasons.push('name');
  }
  if (imported.lastModified && asset.lastModified && imported.lastModified === asset.lastModified) {
    score += 0.2;
    reasons.push('lastModified');
  }
  if (imported.mime && asset.mime && imported.mime === asset.mime) {
    score += 0.15;
    reasons.push('mime');
  }
  return { asset, confidence: score >= 0.5 ? score : 0, reason: reasons.join('+') };
}

