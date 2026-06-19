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
import prettierrc from '../types/text/json/known/prettierrc/index.js';
import turbo from '../types/text/json/known/turbo/index.js';
import dependabot from '../types/text/yaml/known/dependabot/index.js';
import eslint from '../types/text/json/known/eslint/index.js';
import jest from '../types/text/json/known/jest/index.js';
import stylelint from '../types/text/json/known/stylelint/index.js';
import babel from '../types/text/json/known/babel/index.js';
import commitlint from '../types/text/json/known/commitlint/index.js';
import lefthook from '../types/text/yaml/known/lefthook/index.js';
import wrangler from '../types/text/toml/known/wrangler/index.js';
import flyToml from '../types/text/toml/known/fly/index.js';
import cliff from '../types/text/toml/known/cliff/index.js';
import releaserc from '../types/text/json/known/releaserc/index.js';
import lerna from '../types/text/json/known/lerna/index.js';
import nx from '../types/text/json/known/nx/index.js';
import biome from '../types/text/json/known/biome/index.js';
import codecov from '../types/text/yaml/known/codecov/index.js';
import serverless from '../types/text/yaml/known/serverless/index.js';
import azurePipelines from '../types/text/yaml/known/azure-pipelines/index.js';
import vscodeSettings from '../types/text/json/known/vscode-settings/index.js';
import vscodeExtensions from '../types/text/json/known/vscode-extensions/index.js';
import vscodeLaunch from '../types/text/json/known/vscode-launch/index.js';
import vscodeTasks from '../types/text/json/known/vscode-tasks/index.js';
import travis from '../types/text/yaml/known/travis/index.js';
import circleci from '../types/text/yaml/known/circleci/index.js';
import amplify from '../types/text/yaml/known/amplify/index.js';
import codebuild from '../types/text/yaml/known/codebuild/index.js';
import jsconfigJson from '../types/text/json/known/jsconfig/index.js';
import denoJson from '../types/text/json/known/deno/index.js';
import nvmrc from '../types/text/known/nvmrc/index.js';
import browserslistrc from '../types/text/known/browserslist/index.js';
import preCommit from '../types/text/yaml/known/pre-commit/index.js';
import pyrightconfig from '../types/text/json/known/pyrightconfig/index.js';
import tox from '../types/text/known/tox/index.js';
import mypy from '../types/text/known/mypy/index.js';
import angularJson from '../types/text/json/known/angular/index.js';
import capacitor from '../types/text/json/known/capacitor/index.js';
import nycrc from '../types/text/json/known/nycrc/index.js';
import devcontainer from '../types/text/json/known/devcontainer/index.js';
import knip from '../types/text/json/known/knip/index.js';
import mocha from '../types/text/json/known/mocha/index.js';
import gitlabCi from '../types/text/yaml/known/gitlab-ci/index.js';
import pnpmWorkspace from '../types/text/yaml/known/pnpm-workspace/index.js';
import vitest from '../types/text/json/known/vitest/index.js';
import graphqlConfig from '../types/text/json/known/graphql-config/index.js';
import apollo from '../types/text/json/known/apollo/index.js';
import storybook from '../types/text/json/known/storybook/index.js';
import drone from '../types/text/yaml/known/drone/index.js';
import buildkite from '../types/text/yaml/known/buildkite/index.js';
import skaffold from '../types/text/yaml/known/skaffold/index.js';
import hadolint from '../types/text/yaml/known/hadolint/index.js';

export const KNOWN = [packageJson, cargoToml, tsconfig, dockerfile, gitignore, dockerCompose,
  requirementsTxt, goMod, composerJson, gemfile, codeowners, editorconfig, pomXml,
  buildGradle, pipfile, openapi, githubActions, k8sManifest, pubspec, netlifyToml, vercelJson,
  pyprojectToml, npmrc, renovate, prettierrc, turbo, dependabot,
  eslint, jest, stylelint, babel, commitlint, lefthook,
  wrangler, flyToml, cliff, releaserc,
  lerna, nx, biome, codecov, serverless, azurePipelines,
  vscodeSettings, vscodeExtensions, vscodeLaunch, vscodeTasks,
  travis, circleci, amplify, codebuild,
  jsconfigJson, denoJson, nvmrc, browserslistrc,
  preCommit, pyrightconfig, tox, mypy,
  angularJson, capacitor, nycrc, devcontainer, knip, mocha, gitlabCi, pnpmWorkspace,
  vitest, graphqlConfig, apollo, storybook,
  drone, buildkite, skaffold, hadolint];

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
