import { loadGlobal, vendor } from '../../../../../core/script-loader.js';
import { asArray, buildContext, classifyVolume, isLocalPath } from './shared.js';

function countEnv(value) {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === 'object') return Object.keys(value).length;
  return 0;
}

function countRefs(value) {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === 'object') return Object.keys(value).length;
  return 0;
}

function summarize(data) {
  const services = data && typeof data.services === 'object' ? data.services : {};
  const topVolumes = data && typeof data.volumes === 'object' ? data.volumes : {};
  const topNetworks = data && typeof data.networks === 'object' ? data.networks : {};
  const topSecrets = data && typeof data.secrets === 'object' ? data.secrets : {};
  const names = Object.keys(services);
  const images = new Set();
  const buildServices = [];
  let ports = 0;
  let depends = 0;
  let envVars = 0;
  let envFiles = 0;
  let serviceNetworks = 0;
  let serviceSecrets = 0;
  let serviceVolumes = 0;
  let bindMounts = 0;
  let namedVolumes = 0;
  let missingRuntimeSource = 0;
  let localBuildContexts = 0;
  let localFileRefs = 0;
  for (const [name, svc] of Object.entries(services)) {
    if (!svc || typeof svc !== 'object') continue;
    if (svc.image) images.add(String(svc.image));
    if (svc.build) {
      buildServices.push(name);
      const context = buildContext(svc.build);
      if (context && isLocalPath(context)) localBuildContexts += 1;
    }
    if (!svc.image && !svc.build) missingRuntimeSource += 1;
    ports += countRefs(svc.ports);
    depends += countRefs(svc.depends_on);
    envVars += countEnv(svc.environment);
    envFiles += countRefs(svc.env_file);
    localFileRefs += countRefs(svc.env_file);
    serviceNetworks += countRefs(svc.networks);
    serviceSecrets += countRefs(svc.secrets);
    for (const volume of asArray(svc.volumes)) {
      serviceVolumes += 1;
      const kind = classifyVolume(volume, topVolumes);
      if (kind === 'bind') bindMounts += 1;
      else if (kind === 'named') namedVolumes += 1;
    }
  }
  const issueHints = missingRuntimeSource + bindMounts + localBuildContexts + localFileRefs;
  return [
    { label: 'Services', value: String(names.length) },
    { label: 'Images', value: String(images.size) },
    { label: 'Build services', value: String(buildServices.length) },
    { label: 'Published ports', value: String(ports) },
    { label: 'Dependencies', value: String(depends) },
    { label: 'Environment variables', value: String(envVars) },
    { label: 'Env files', value: String(envFiles) },
    { label: 'Top-level networks', value: String(Object.keys(topNetworks).length) },
    { label: 'Service network refs', value: String(serviceNetworks) },
    { label: 'Top-level volumes', value: String(Object.keys(topVolumes).length) },
    { label: 'Service volume mounts', value: String(serviceVolumes) },
    { label: 'Bind mounts', value: String(bindMounts) },
    { label: 'Named volume mounts', value: String(namedVolumes) },
    { label: 'Local build contexts', value: String(localBuildContexts) },
    { label: 'Local file refs', value: String(localFileRefs) },
    { label: 'Top-level secrets', value: String(Object.keys(topSecrets).length) },
    { label: 'Service secret refs', value: String(serviceSecrets) },
    { label: 'Issue hints', value: String(issueHints) },
  ];
}

export async function extract(intake) {
  const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
  try {
    return summarize(jsyaml.load(intake.text || '') || {});
  } catch {
    return [{ label: 'Valid Compose YAML', value: 'no' }];
  }
}

export const testExports = { classifyVolume, summarize };
