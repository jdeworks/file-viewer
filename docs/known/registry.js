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
//   }
import packageJson from './package-json/index.js';
import cargoToml from './cargo-toml/index.js';
import tsconfig from './tsconfig/index.js';
import dockerfile from './dockerfile/index.js';
import gitignore from './gitignore/index.js';
import dockerCompose from './docker-compose/index.js';
import requirementsTxt from './requirements-txt/index.js';
import goMod from './go-mod/index.js';
import composerJson from './composer-json/index.js';
import gemfile from './gemfile/index.js';
import codeowners from './codeowners/index.js';
import editorconfig from './editorconfig/index.js';
import pomXml from './pom-xml/index.js';
import buildGradle from './build-gradle/index.js';
import pipfile from './pipfile/index.js';
import openapi from './openapi/index.js';

export const KNOWN = [packageJson, cargoToml, tsconfig, dockerfile, gitignore, dockerCompose,
  requirementsTxt, goMod, composerJson, gemfile, codeowners, editorconfig, pomXml,
  buildGradle, pipfile, openapi];

export function matchKnown(intake, baseType) {
  for (const k of KNOWN) {
    try { if (k.match(intake, baseType)) return k; } catch { /* a bad matcher never breaks detection */ }
  }
  return null;
}
