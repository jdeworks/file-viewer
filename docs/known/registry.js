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
import packageLock from '../types/text/json/known/package-lock/index.js';
import composerLock from '../types/text/json/known/composer-lock/index.js';
import pnpmLock from '../types/text/yaml/known/pnpm-lock/index.js';
import cargoLock from '../types/text/toml/known/cargo-lock/index.js';
import poetryLock from '../types/text/toml/known/poetry-lock/index.js';
import goSum from '../types/text/known/go-sum/index.js';
import vitest from '../types/text/json/known/vitest/index.js';
import graphqlConfig from '../types/text/json/known/graphql-config/index.js';
import apollo from '../types/text/json/known/apollo/index.js';
import storybook from '../types/text/json/known/storybook/index.js';
import drone from '../types/text/yaml/known/drone/index.js';
import buildkite from '../types/text/yaml/known/buildkite/index.js';
import skaffold from '../types/text/yaml/known/skaffold/index.js';
import hadolint from '../types/text/yaml/known/hadolint/index.js';
import helmChart from '../types/text/yaml/known/helm-chart/index.js';
import kustomize from '../types/text/yaml/known/kustomize/index.js';
import ansiblePlaybook from '../types/text/yaml/known/ansible-playbook/index.js';
import pulumi from '../types/text/yaml/known/pulumi/index.js';
import packer from '../types/text/json/known/packer/index.js';
import ruff from '../types/text/toml/known/ruff/index.js';
import uv from '../types/text/toml/known/uv/index.js';
import kubeHelmValues from '../types/text/yaml/known/kube-helm-values/index.js';
import firebase from '../types/text/json/known/firebase/index.js';
import expo from '../types/text/json/known/expo/index.js';
import tailwind from '../types/text/json/known/tailwind/index.js';
import postcss from '../types/text/json/known/postcss/index.js';
import husky from '../types/text/json/known/husky/index.js';
import lintStaged from '../types/text/json/known/lint-staged/index.js';
import nestCli from '../types/text/json/known/nest-cli/index.js';
import swcrc from '../types/text/json/known/swcrc/index.js';
import makefileKf from '../types/text/known/makefile/index.js';
import justfile from '../types/text/known/justfile/index.js';
import procfile from '../types/text/known/procfile/index.js';
import envrc from '../types/text/known/envrc/index.js';
import miseConfig from '../types/text/toml/known/mise/index.js';
import toolVersions from '../types/text/known/tool-versions/index.js';
import gitattributes from '../types/text/known/gitattributes/index.js';
import gemfileLock from '../types/text/known/gemfile-lock/index.js';
import sonar from '../types/text/known/sonar/index.js';
import hatch from '../types/text/toml/known/hatch/index.js';
import mailmap from '../types/text/known/mailmap/index.js';
import npmignore from '../types/text/known/npmignore/index.js';
import dockerignore from '../types/text/known/dockerignore/index.js';
import appveyor from '../types/text/yaml/known/appveyor/index.js';
import rubocop from '../types/text/yaml/known/rubocop/index.js';
import taskfile from '../types/text/yaml/known/taskfile/index.js';
import mkdocsYml from '../types/text/yaml/known/mkdocs/index.js';
import rush from '../types/text/json/known/rush/index.js';
import markdownlintJson from '../types/text/json/known/markdownlint/index.js';
import markdownlintYaml from '../types/text/yaml/known/markdownlint/index.js';
import clangFormat from '../types/text/yaml/known/clang-format/index.js';
import moonrepo from '../types/text/yaml/known/moonrepo/index.js';
import brewfile from '../types/text/known/brewfile/index.js';
import license from '../types/text/known/license/index.js';
import ansibleCfg from '../types/text/known/ansible-cfg/index.js';
import gemspec from '../types/text/known/gemspec/index.js';
import typos from '../types/text/toml/known/typos/index.js';
import cargoDeny from '../types/text/toml/known/cargo-deny/index.js';
import cargoConfig from '../types/text/toml/known/cargo-config/index.js';
import htaccess from '../types/text/known/htaccess/index.js';
import nginxConf from '../types/text/known/nginx-conf/index.js';
import moonYml from '../types/text/yaml/known/moon/index.js';
import vagrantfile from '../types/text/known/vagrantfile/index.js';
import caddyfile from '../types/text/known/caddyfile/index.js';
import renderYaml from '../types/text/yaml/known/render-yaml/index.js';
import railwayJson from '../types/text/json/known/railway-json/index.js';
import crowdinYml from '../types/text/yaml/known/crowdin-yml/index.js';
import matchfile from '../types/text/known/matchfile/index.js';
import appfile from '../types/text/known/appfile/index.js';
import rubyVersion from '../types/text/known/ruby-version/index.js';
import pythonVersion from '../types/text/known/python-version/index.js';
import earthfile from '../types/text/known/earthfile/index.js';
import gitmodules from '../types/text/known/gitmodules/index.js';
import gitconfig from '../types/text/known/gitconfig/index.js';
import tfvars from '../types/text/known/tfvars/index.js';
import podfile from '../types/text/known/podfile/index.js';
import fastfile from '../types/text/known/fastfile/index.js';
import snapfile from '../types/text/known/snapfile/index.js';
import supabaseConfig from '../types/text/toml/known/supabase-config/index.js';
import netlifyRedirects from '../types/text/known/redirects/index.js';
import cmake from '../types/text/known/cmake/index.js';
import jenkinsfile from '../types/text/known/jenkinsfile/index.js';
import bazel from '../types/text/known/bazel/index.js';
import bazelrc from '../types/text/known/bazelrc/index.js';
import ninjaBuild from '../types/text/known/ninja-build/index.js';
import packageSwift from '../types/text/known/package-swift/index.js';
import mixExs from '../types/text/known/mix-exs/index.js';
import buildSbt from '../types/text/known/build-sbt/index.js';
import playwrightConfig from '../types/text/known/playwright-config/index.js';
import cypressConfig from '../types/text/known/cypress-config/index.js';
import vcpkg from '../types/text/json/known/vcpkg/index.js';
import cmakePresets from '../types/text/json/known/cmake-presets/index.js';
import conanfile from '../types/text/known/conanfile/index.js';
import prometheusConfig from '../types/text/yaml/known/prometheus-config/index.js';
import alertmanager from '../types/text/yaml/known/alertmanager/index.js';
import datadogConfig from '../types/text/yaml/known/datadog-config/index.js';
import viteConfig from '../types/text/known/vite-config/index.js';
import webpackConfig from '../types/text/known/webpack-config/index.js';
import rollupConfig from '../types/text/known/rollup-config/index.js';
import nextConfig from '../types/text/known/next-config/index.js';
import astroConfig from '../types/text/known/astro-config/index.js';
import svelteConfig from '../types/text/known/svelte-config/index.js';
import nuxtConfig from '../types/text/known/nuxt-config/index.js';
import remixConfig from '../types/text/known/remix-config/index.js';
import airConfig from '../types/text/toml/known/air-config/index.js';
import spectral from '../types/text/yaml/known/spectral/index.js';
import tiltfile from '../types/text/known/tiltfile/index.js';
import mesonBuild from '../types/text/known/meson-build/index.js';
import goreleaser from '../types/text/yaml/known/goreleaser/index.js';
import golangciLint from '../types/text/yaml/known/golangci-lint/index.js';
import bufConfig from '../types/text/yaml/known/buf-config/index.js';
import heroku from '../types/text/yaml/known/heroku/index.js';
import readthedocs from '../types/text/yaml/known/readthedocs/index.js';
import citationCff from '../types/text/yaml/known/citation-cff/index.js';
import yamllint from '../types/text/yaml/known/yamllint/index.js';
import coderabbit from '../types/text/yaml/known/coderabbit/index.js';
import ionicConfig from '../types/text/json/known/ionic-config/index.js';
import metroConfig from '../types/text/known/metro-config/index.js';
import reactNativeConfig from '../types/text/known/react-native-config/index.js';
import dotnetGlobal from '../types/text/json/known/dotnet-global/index.js';
import prismaSchema from '../types/text/known/prisma-schema/index.js';
import nugetConfig from '../types/text/xml/known/nuget-config/index.js';
import sentryProps from '../types/text/known/sentry-props/index.js';
import otelCollector from '../types/text/yaml/known/otel-collector/index.js';
import logback from '../types/text/xml/known/logback/index.js';
import log4j2 from '../types/text/xml/known/log4j2/index.js';
import scorecard from '../types/text/yaml/known/scorecard/index.js';
import socketSecurity from '../types/text/yaml/known/socket-security/index.js';
import trivyConfig from '../types/text/yaml/known/trivy-config/index.js';
import snykConfig from '../types/text/known/snyk-config/index.js';
import gradleProps from '../types/text/known/gradle-props/index.js';
import gradleWrapper from '../types/text/known/gradle-wrapper/index.js';
import settingsGradle from '../types/text/known/settings-gradle/index.js';
import springApp from '../types/text/known/spring-app/index.js';
import springAppYml from '../types/text/yaml/known/spring-app/index.js';
import csproj from '../types/text/xml/known/csproj/index.js';
import directoryBuild from '../types/text/xml/known/directory-build/index.js';
import nuspec from '../types/text/xml/known/nuspec/index.js';
import stackYaml from '../types/text/yaml/known/stack-yaml/index.js';
import cabal from '../types/text/known/cabal/index.js';
import packageResolved from '../types/text/json/known/package-resolved/index.js';
import rebarConfig from '../types/text/known/rebar-config/index.js';
import docusaurusConfig from '../types/text/known/docusaurus-config/index.js';
import vitepressConfig from '../types/text/known/vitepress-config/index.js';
import sphinxConf from '../types/text/known/sphinx-conf/index.js';
import doxyfile from '../types/text/known/doxyfile/index.js';
import drizzleConfig from '../types/text/known/drizzle-config/index.js';
import knexfile from '../types/text/known/knexfile/index.js';
import alembic from '../types/text/ini/known/alembic/index.js';
import flywayConf from '../types/text/known/flyway-conf/index.js';
import projectClj from '../types/text/known/project-clj/index.js';
import depsEdn from '../types/text/known/deps-edn/index.js';
import shadowCljs from '../types/text/known/shadow-cljs/index.js';
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
  drone, buildkite, skaffold, hadolint,
  helmChart, kustomize, ansiblePlaybook, pulumi, packer, ruff, uv, kubeHelmValues,
  firebase, expo, tailwind, postcss, husky, lintStaged, nestCli, swcrc,
  packageLock, composerLock, pnpmLock, cargoLock, poetryLock, goSum,
  makefileKf, justfile, procfile, envrc, miseConfig, toolVersions,
  gitattributes, gemfileLock, sonar, hatch,
  mailmap, npmignore, dockerignore,
  appveyor, rubocop, taskfile, mkdocsYml,
  rush, markdownlintJson, markdownlintYaml, clangFormat, moonrepo,
  brewfile, license, ansibleCfg, gemspec, typos, cargoDeny, cargoConfig,
  htaccess, nginxConf, moonYml, vagrantfile, caddyfile, renderYaml, railwayJson,
  crowdinYml, matchfile, appfile, rubyVersion, pythonVersion, earthfile, gitmodules, gitconfig, tfvars,
  podfile, fastfile, snapfile,
  supabaseConfig, netlifyRedirects,
  cmake, jenkinsfile,
  bazel, bazelrc, ninjaBuild,
  packageSwift, mixExs, buildSbt,
  playwrightConfig, cypressConfig,
  vcpkg, cmakePresets, conanfile,
  prometheusConfig, alertmanager, datadogConfig,
  viteConfig, webpackConfig, rollupConfig, nextConfig,
  astroConfig, svelteConfig, nuxtConfig, remixConfig,
  airConfig, spectral, tiltfile, mesonBuild,
  goreleaser, golangciLint, bufConfig, heroku,
  readthedocs, citationCff, yamllint, coderabbit,
  ionicConfig, metroConfig, reactNativeConfig,
  dotnetGlobal, prismaSchema, nugetConfig,
  sentryProps, otelCollector, logback, log4j2,
  scorecard, socketSecurity, trivyConfig, snykConfig,
  gradleProps, gradleWrapper, settingsGradle, springApp, springAppYml,
  csproj, directoryBuild, nuspec,
  stackYaml, cabal, packageResolved, rebarConfig,
  docusaurusConfig, vitepressConfig, sphinxConf, doxyfile,
  drizzleConfig, knexfile, alembic, flywayConf];

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
