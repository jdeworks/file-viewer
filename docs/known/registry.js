// Known-file registry (Layer 3). Beyond extension-based type detection, specific well-known
// files (package.json, tsconfig.json, …) get enhanced renderers that understand their
// schema. Each entry is a tiny lazy-loaded mini-plugin in its own folder, so the bundle
// only grows when a file actually matches. A match AUGMENTS/OVERRIDES the base type's
// renderer; the user can always revert to the plain view (see the enhance chip in app.js).
//
// Entry contract (default export of known/<id>/index.js):
//   {
//     id: string,
//     label: string,                       // shown in the "Enhanced: <label>" chip
//     match(intake, baseType) => boolean,  // cheap; runs after the base type is detected
//     loadRenderer() => Promise<{render}>, // render(intake, ctx) -> { parentNode } | { bodyHtml }
//     loadDiffRenderer?() => Promise<{render}>,   // optional custom diff (overrides the type's)
//     loadMetadata?() => Promise<{extract}>,       // optional enhanced metadata rows
//     about?: { description:string, usedFor?: [{label, description, href}] },
//   }
// Known-file plugins now live next to their base type: type-bound ones under
// types/text/<basetype>/known/<id>/, and the filename-only / multi-type configs under the
// shared types/text/known/<id>/. This registry stays the single import point.
import packageJson from '../types/text/json/known/package-json/index.js';
import cargoToml from '../types/text/toml/known/cargo-toml/index.js';
import tsconfig from '../types/text/json/known/tsconfig/index.js';
import dockerfile from '../types/text/known/dockerfile/index.js';
import gitignore from '../types/text/known/gitignore/index.js';
import dockerCompose from '../types/text/yaml/known/docker-compose/index.js';
import requirementsTxt from '../types/text/known/requirements-txt/index.js';
import goMod from '../types/text/known/go-mod/index.js';
import composerJson from '../types/text/json/known/composer-json/index.js';
import gemfile from '../types/text/known/gemfile/index.js';
import codeowners from '../types/text/known/codeowners/index.js';
import editorconfig from '../types/text/known/editorconfig/index.js';
import pomXml from '../types/text/xml/known/pom-xml/index.js';
import buildGradle from '../types/text/known/build-gradle/index.js';
import pipfile from '../types/text/known/pipfile/index.js';
import openapi from '../types/text/known/openapi/index.js';
import githubActions from '../types/text/yaml/known/github-actions/index.js';
import k8sManifest from '../types/text/yaml/known/k8s-manifest/index.js';
import pubspec from '../types/text/yaml/known/pubspec/index.js';
import netlifyToml from '../types/text/toml/known/netlify/index.js';
import vercelJson from '../types/text/json/known/vercel/index.js';
import pyprojectToml from '../types/text/toml/known/pyproject/index.js';
import npmrc from '../types/text/known/npmrc/index.js';
import renovate from '../types/text/json/known/renovate/index.js';

export const KNOWN = [packageJson, cargoToml, tsconfig, dockerfile, gitignore, dockerCompose,
  requirementsTxt, goMod, composerJson, gemfile, codeowners, editorconfig, pomXml,
  buildGradle, pipfile, openapi, githubActions, k8sManifest, pubspec, netlifyToml, vercelJson,
  pyprojectToml, npmrc, renovate];

export function matchKnown(intake, baseType) {
  for (const k of KNOWN) {
    try { if (k.match(intake, baseType)) return k; } catch { /* a bad matcher never breaks detection */ }
  }
  return null;
}

// Return ALL known-file matches across all candidate base types (deduped by known.id).
// Results are ordered by ranking order — so the highest-confidence base type's match comes first.
export function matchAllKnown(intake, ranking) {
  const seen = new Set();
  const results = [];
  for (const { type } of ranking) {
    for (const k of KNOWN) {
      if (seen.has(k.id)) continue;
      try {
        if (k.match(intake, type)) { seen.add(k.id); results.push({ known: k, baseType: type }); }
      } catch { /* bad matcher */ }
    }
  }
  return results;
}
