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
import mavenPom from '../types/text/xml/known/maven-pom/index.js';
import antBuild from '../types/text/xml/known/ant-build/index.js';
import buildGradle from '../types/text/known/build-gradle/index.js';
import pipfile from '../types/text/known/pipfile/index.js';
import openapi from '../types/text/known/openapi/index.js';
import githubActions from '../types/text/yaml/known/github-actions/index.js';
import k8sManifest from '../types/text/yaml/known/k8s-manifest/index.js';
import k8sRbac from '../types/text/yaml/known/k8s-rbac/index.js';
import k8sNetworkPolicy from '../types/text/yaml/known/k8s-network-policy/index.js';
import k8sHpa from '../types/text/yaml/known/k8s-hpa/index.js';
import k8sIngress from '../types/text/yaml/known/k8s-ingress/index.js';
import pubspec from '../types/text/yaml/known/pubspec/index.js';
import pubspecLock from '../types/text/yaml/known/pubspec-lock/index.js';
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
import { plugin as babelrc } from '../types/text/json/known/babelrc/index.js';
import { plugin as jestConfig } from '../types/text/known/jest-config/index.js';
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
import { plugin as circleci } from '../types/text/yaml/known/circleci/index.js';
import amplify from '../types/text/yaml/known/amplify/index.js';
import codebuild from '../types/text/yaml/known/codebuild/index.js';
import jsconfigJson from '../types/text/json/known/jsconfig/index.js';
import denoJson from '../types/text/json/known/deno/index.js';
import nvmrc from '../types/text/known/nvmrc/index.js';
import browserslistrc from '../types/text/known/browserslist/index.js';
import preCommit from '../types/text/yaml/known/pre-commit/index.js';
import pyrightconfig from '../types/text/json/known/pyrightconfig/index.js';
import tox from '../types/text/known/tox/index.js';
import { plugin as toxIni } from '../types/text/known/tox-ini/index.js';
import { plugin as pytestIni } from '../types/text/known/pytest-ini/index.js';
import mypy from '../types/text/known/mypy-ini/index.js';
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
import graphqlCodegen from '../types/text/yaml/known/graphql-codegen/index.js';
import tspconfigYaml from '../types/text/yaml/known/tspconfig/index.js';
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
import ruff from '../types/text/toml/known/ruff-toml/index.js';
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
import envExample from '../types/text/known/env-example/index.js';
import envrc from '../types/text/known/envrc/index.js';
import miseConfig from '../types/text/toml/known/mise/index.js';
import toolVersions from '../types/text/known/tool-versions/index.js';
import devboxJson from '../types/text/json/known/devbox-json/index.js';
import protoConfig from '../types/text/toml/known/proto-config/index.js';
import aquaConfig from '../types/text/yaml/known/aqua-config/index.js';
import pixiConfig from '../types/text/toml/known/pixi-config/index.js';
import djangoSettings from '../types/text/known/django-settings/index.js';
import springProfiles from '../types/text/yaml/known/spring-profiles/index.js';
import railsCredentials from '../types/text/yaml/known/rails-credentials/index.js';
import pumaConfig from '../types/text/known/puma-config/index.js';
import gitattributes from '../types/text/known/gitattributes/index.js';
import gemfileLock from '../types/text/known/gemfile-lock/index.js';
import sonar from '../types/text/known/sonar/index.js';
import hatch from '../types/text/toml/known/hatch/index.js';
import mailmap from '../types/text/known/mailmap/index.js';
import npmignore from '../types/text/known/npmignore/index.js';
import dockerignore from '../types/text/known/dockerignore/index.js';
import gcloudignore from '../types/text/known/gcloudignore/index.js';
import eslintignore from '../types/text/known/eslintignore/index.js';
import prettierignore from '../types/text/known/prettierignore/index.js';
import appveyor from '../types/text/yaml/known/appveyor/index.js';
import rubocop from '../types/text/yaml/known/rubocop/index.js';
import rubocopTodo from '../types/text/yaml/known/rubocop-todo/index.js';
import taskfile from '../types/text/yaml/known/taskfile/index.js';
import mkdocsYml from '../types/text/yaml/known/mkdocs/index.js';
import rush from '../types/text/json/known/rush/index.js';
import markdownlintJson from '../types/text/json/known/markdownlint/index.js';
import markdownlintYaml from '../types/text/yaml/known/markdownlint/index.js';
import clangFormat from '../types/text/yaml/known/clang-format/index.js';
import clangTidy from '../types/text/yaml/known/clang-tidy/index.js';
import moonrepo from '../types/text/yaml/known/moonrepo/index.js';
import brewfile from '../types/text/known/brewfile/index.js';
import license from '../types/text/known/license/index.js';
import ansibleCfg from '../types/text/known/ansible-cfg/index.js';
import ansibleHosts from '../types/text/known/ansible-hosts/index.js';
import makepkgConf from '../types/text/known/makepkg-conf/index.js';
import gemspec from '../types/text/known/gemspec/index.js';
import typos from '../types/text/toml/known/typos/index.js';
import cargoDeny from '../types/text/toml/known/cargo-deny/index.js';
import cargoConfig from '../types/text/toml/known/cargo-config/index.js';
import rustfmtToml from '../types/text/toml/known/rustfmt-toml/index.js';
import clippyToml from '../types/text/toml/known/clippy-toml/index.js';
import rustToolchain from '../types/text/toml/known/rust-toolchain/index.js';
import htaccess from '../types/text/known/htaccess/index.js';
import { plugin as htpasswd } from '../types/text/known/htpasswd/index.js';
import nginxConf from '../types/text/known/nginx-conf/index.js';
import apacheConf from '../types/text/known/apache-conf/index.js';
import lighttpdConf from '../types/text/known/lighttpd-conf/index.js';
import { plugin as vsftpdConf } from '../types/text/known/vsftpd-conf/index.js';
import { plugin as proftpdConf } from '../types/text/known/proftpd-conf/index.js';
import rsyslogConf from '../types/text/known/rsyslog-conf/index.js';
import netplan from '../types/text/yaml/known/netplan/index.js';
import syslogNg from '../types/text/known/syslog-ng/index.js';
import haproxyConfig from '../types/text/known/haproxy-config/index.js';
import haproxyConf from '../types/text/known/haproxy-conf/index.js';
import squidConf from '../types/text/known/squid-conf/index.js';
import varnishVcl from '../types/text/known/varnish-vcl/index.js';
import moonYml from '../types/text/yaml/known/moon/index.js';
import vagrantfile from '../types/text/known/vagrantfile/index.js';
import berksfile from '../types/text/known/berksfile/index.js';
import caddyfile from '../types/text/known/caddyfile/index.js';
import consulConfig from '../types/text/known/consul-config/index.js';
import renderYaml from '../types/text/yaml/known/render-yaml/index.js';
import railwayJson from '../types/text/json/known/railway-json/index.js';
import appJson from '../types/text/json/known/app-json/index.js';
import crowdinYml from '../types/text/yaml/known/crowdin-yml/index.js';
import crowdsecConfig from '../types/text/yaml/known/crowdsec-config/index.js';
import crowdsecAcquis from '../types/text/yaml/known/crowdsec-acquis/index.js';
import matchfile from '../types/text/known/matchfile/index.js';
import appfile from '../types/text/known/appfile/index.js';
import rubyVersion from '../types/text/known/ruby-version/index.js';
import rspecConfig from '../types/text/known/rspec-config/index.js';
import sorbetConfig from '../types/text/known/sorbet-config/index.js';
import bundlerAuditConfig from '../types/text/yaml/known/bundler-audit-config/index.js';
import standardrbConfig from '../types/text/yaml/known/standardrb-config/index.js';
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
import { plugin as jenkinsfile } from '../types/text/known/jenkinsfile/index.js';
import bazel from '../types/text/known/bazel/index.js';
import bazelrc from '../types/text/known/bazelrc/index.js';
import ninjaBuild from '../types/text/known/ninja-build/index.js';
import packageSwift from '../types/text/known/package-swift/index.js';
import mixExs from '../types/text/known/mix-exs/index.js';
import buildSbt from '../types/text/known/build-sbt/index.js';
import duneBuild from '../types/text/known/dune-build/index.js';
import scalafmtConf from '../types/text/known/scalafmt-conf/index.js';
import scalafixConf from '../types/text/known/scalafix-conf/index.js';
import playwrightConfig from '../types/text/known/playwright-config/index.js';
import cypressConfig from '../types/text/known/cypress-config/index.js';
import vcpkg from '../types/text/json/known/vcpkg/index.js';
import cmakePresets from '../types/text/json/known/cmake-presets/index.js';
import conanfile from '../types/text/known/conanfile/index.js';
import prometheusConfig from '../types/text/yaml/known/prometheus-config/index.js';
import alertmanager from '../types/text/yaml/known/alertmanager/index.js';
import ejabberdConfig from '../types/text/yaml/known/ejabberd-config/index.js';
import blackboxExporter from '../types/text/yaml/known/blackbox/index.js';
import snmpExporter from '../types/text/yaml/known/snmp-exporter/index.js';
import victoriaMetricsConfig from '../types/text/yaml/known/victoria-metrics-config/index.js';
import thanosConfig from '../types/text/yaml/known/thanos-config/index.js';
import datadogConfig from '../types/text/yaml/known/datadog-config/index.js';
import viteConfig from '../types/text/known/vite-config/index.js';
import webpackConfig from '../types/text/known/webpack-config/index.js';
import rollupConfig from '../types/text/known/rollup-config/index.js';
import nextConfig from '../types/text/known/next-config/index.js';
import astroConfig from '../types/text/known/astro-config/index.js';
import svelteConfig from '../types/text/known/svelte-config/index.js';
import nuxtConfig from '../types/text/known/nuxt-config/index.js';
import remixConfig from '../types/text/known/remix-config/index.js';
import hugoConfig from '../types/text/known/hugo-config/index.js';
import airConfig from '../types/text/toml/known/air-config/index.js';
import spectral from '../types/text/yaml/known/spectral/index.js';
import tiltfile from '../types/text/known/tiltfile/index.js';
import mesonBuild from '../types/text/known/meson-build/index.js';
import goreleaser from '../types/text/yaml/known/goreleaser/index.js';
import golangciLint from '../types/text/yaml/known/golangci-lint/index.js';
import bufConfig from '../types/text/yaml/known/buf-config/index.js';
import bufGen from '../types/text/yaml/known/buf-gen/index.js';
import mockeryConfig from '../types/text/yaml/known/mockery-config/index.js';
import koConfig from '../types/text/yaml/known/ko-config/index.js';
import sqlcConfig from '../types/text/yaml/known/sqlc-config/index.js';
import nfpmConfig from '../types/text/yaml/known/nfpm-config/index.js';
import heroku from '../types/text/yaml/known/heroku/index.js';
import readthedocs from '../types/text/yaml/known/readthedocs/index.js';
import citationCff from '../types/text/yaml/known/citation-cff/index.js';
import { plugin as yamllint } from '../types/text/yaml/known/yamllint/index.js';
import coderabbit from '../types/text/yaml/known/coderabbit/index.js';
import { plugin as valeIni } from '../types/text/known/vale-ini/index.js';
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
import checkstyleXml from '../types/text/xml/known/checkstyle-xml/index.js';
import spotbugsConfig from '../types/text/xml/known/spotbugs-config/index.js';
import prometheusRules from '../types/text/yaml/known/prometheus-rules/index.js';
import grafanaDashboard from '../types/text/json/known/grafana-dashboard/index.js';
import jaegerConfig from '../types/text/yaml/known/jaeger-config/index.js';
import otelK8s from '../types/text/yaml/known/opentelemetry-k8s/index.js';
import scorecard from '../types/text/yaml/known/scorecard/index.js';
import socketSecurity from '../types/text/yaml/known/socket-security/index.js';
import trivyConfig from '../types/text/yaml/known/trivy-config/index.js';
import snykConfig from '../types/text/known/snyk-config/index.js';
import { plugin as grypeConfig } from '../types/text/yaml/known/grype/index.js';
import { plugin as tetragonPolicy } from '../types/text/yaml/known/tetragon/index.js';
import gradleProps from '../types/text/known/gradle-props/index.js';
import gradleWrapper from '../types/text/known/gradle-wrapper/index.js';
import settingsGradle from '../types/text/known/settings-gradle/index.js';
import springApp from '../types/text/known/spring-app/index.js';
import springAppYml from '../types/text/yaml/known/spring-app/index.js';
import csproj from '../types/text/xml/known/csproj/index.js';
import directoryBuild from '../types/text/xml/known/directory-build/index.js';
import msbuildProps from '../types/text/xml/known/msbuild-props/index.js';
import nuspec from '../types/text/xml/known/nuspec/index.js';
import stackYaml from '../types/text/yaml/known/stack-yaml/index.js';
import cabal from '../types/text/known/cabal/index.js';
import opamFile from '../types/text/known/opam-file/index.js';
import packageResolved from '../types/text/json/known/package-resolved/index.js';
import rebarConfig from '../types/text/known/rebar-config/index.js';
import erlangSysConfig from '../types/text/known/erlang-sys-config/index.js';
import erlangVmArgs from '../types/text/known/erlang-vm-args/index.js';
import cpanfile from '../types/text/known/cpanfile/index.js';
import rDescription from '../types/text/known/r-description/index.js';
import rProfile from '../types/text/known/r-profile/index.js';
import docusaurusConfig from '../types/text/known/docusaurus-config/index.js';
import vitepressConfig from '../types/text/known/vitepress-config/index.js';
import sphinxConf from '../types/text/known/sphinx-conf/index.js';
import doxyfile from '../types/text/known/doxyfile/index.js';
import drizzleConfig from '../types/text/known/drizzle-config/index.js';
import knexfile from '../types/text/known/knexfile/index.js';
import alembic from '../types/text/ini/known/alembic/index.js';
import flywayConf from '../types/text/known/flyway-conf/index.js';
import dbtProject from '../types/text/yaml/known/dbt-project/index.js';
import liquibaseProps from '../types/text/known/liquibase-props/index.js';
import sqitchConf from '../types/text/known/sqitch-conf/index.js';
import atlasHcl from '../types/text/known/atlas-hcl/index.js';
import waypoint from '../types/text/known/waypoint/index.js';
import projectClj from '../types/text/known/project-clj/index.js';
import depsEdn from '../types/text/known/deps-edn/index.js';
import shadowCljs from '../types/text/known/shadow-cljs/index.js';
import wdioConfig from '../types/text/known/wdio-config/index.js';
import artilleryYml from '../types/text/yaml/known/artillery-yml/index.js';
import k6Config from '../types/text/known/k6-config/index.js';
import gatlingConf from '../types/text/known/gatling-conf/index.js';
import cursorRules from '../types/text/known/cursor-rules/index.js';
import claudeMd from '../types/text/known/claude-md/index.js';
import copilotInstructions from '../types/text/known/copilot-instructions/index.js';
import aiderConf from '../types/text/yaml/known/aider-conf/index.js';
import gaeApp from '../types/text/yaml/known/gae-app/index.js';
import cloudbuild from '../types/text/yaml/known/cloudbuild/index.js';
import googleServices from '../types/text/json/known/google-services/index.js';
import catalogInfo from '../types/text/yaml/known/catalog-info/index.js';
import phpunit from '../types/text/xml/known/phpunit/index.js';
import phpstan from '../types/text/known/phpstan/index.js';
import phpCsFixer from '../types/text/known/php-cs-fixer/index.js';
import behat from '../types/text/yaml/known/behat/index.js';
import phpIni from '../types/text/ini/known/php-ini/index.js';
import psalmConfig from '../types/text/xml/known/psalm-config/index.js';
import phpunitConfig from '../types/text/xml/known/phpunit-config/index.js';
import rectorConfig from '../types/text/known/rector-config/index.js';
import terragrunt from '../types/text/known/terragrunt/index.js';
import tflint from '../types/text/known/tflint/index.js';
import tfLock from '../types/text/known/tf-lock/index.js';
import versionsTf from '../types/text/known/versions-tf/index.js';
import tsupConfig from '../types/text/known/tsup-config/index.js';
import rspackConfig from '../types/text/known/rspack-config/index.js';
import esbuildConfig from '../types/text/known/esbuild-config/index.js';
import parcelrc from '../types/text/json/known/parcelrc/index.js';
import bunfigToml from '../types/text/toml/known/bunfig/index.js';
import shopifyApp from '../types/text/toml/known/shopify-app/index.js';
import lighthouserc from '../types/text/json/known/lighthouserc/index.js';
import atlantis from '../types/text/yaml/known/atlantis/index.js';
import spaceliftConfig from '../types/text/yaml/known/spacelift-config/index.js';
import kamalConfig from '../types/text/yaml/known/kamal-config/index.js';
import prefectConfig from '../types/text/yaml/known/prefect-config/index.js';
import checkov from '../types/text/yaml/known/checkov/index.js';
import terraformDocs from '../types/text/yaml/known/terraform-docs/index.js';
import infracost from '../types/text/yaml/known/infracost/index.js';
import opencostConfig from '../types/text/yaml/known/opencost-config/index.js';
import crossplaneConfig from '../types/text/yaml/known/crossplane-config/index.js';
import kedaConfig from '../types/text/yaml/known/keda-config/index.js';
import veleroConfig from '../types/text/yaml/known/velero-config/index.js';
import androidManifest from '../types/text/xml/known/android-manifest/index.js';
import appConfig from '../types/text/xml/known/app-config/index.js';
import buildZigZon from '../types/text/known/build-zig-zon/index.js';
import zigZon from '../types/text/known/zig-zon/index.js';
import cartfile from '../types/text/known/cartfile/index.js';
import electronBuilder from '../types/text/yaml/known/electron-builder/index.js';
import elmJson from '../types/text/json/known/elm-json/index.js';
import externalSecrets from '../types/text/yaml/known/external-secrets/index.js';
import fluentBit from '../types/text/known/fluent-bit/index.js';
import logstashConf from '../types/text/known/logstash-conf/index.js';
import fluentdConf from '../types/text/known/fluentd-conf/index.js';
import graylogConf from '../types/text/known/graylog-conf/index.js';
import lokiConfig from '../types/text/yaml/known/loki-config/index.js';
import promtailConfig from '../types/text/yaml/known/promtail-config/index.js';
import tempoConfig from '../types/text/yaml/known/tempo/index.js';
import mimirConfig from '../types/text/yaml/known/mimir/index.js';
import cortexConfig from '../types/text/yaml/known/cortex/index.js';
import grafanaAlloy from '../types/text/known/grafana-alloy/index.js';
import forgeConfig from '../types/text/known/forge-config/index.js';
import gradleVersionCatalog from '../types/text/toml/known/gradle-version-catalog/index.js';
import gleamToml from '../types/text/toml/known/gleam-toml/index.js';
import goWork from '../types/text/known/go-work/index.js';
import grafanaIni from '../types/text/ini/known/grafana-ini/index.js';
import podmanQuadlet from '../types/text/ini/known/podman-quadlet/index.js';
import growthbook from '../types/text/json/known/growthbook/index.js';
import jekyllConfig from '../types/text/yaml/known/jekyll-config/index.js';
import juliaProject from '../types/text/toml/known/julia-project/index.js';
import juliaManifest from '../types/text/toml/known/julia-manifest/index.js';
import kongConfig from '../types/text/yaml/known/kong-config/index.js';
import apisixConfig from '../types/text/yaml/known/apisix-config/index.js';
import envoyConfig from '../types/text/yaml/known/envoy-config/index.js';
import launchSettings from '../types/text/json/known/launch-settings/index.js';
import appSettings from '../types/text/json/known/appsettings/index.js';
import nimble from '../types/text/known/nimble/index.js';
import packagesConfig from '../types/text/xml/known/packages-config/index.js';
import podspec from '../types/text/known/podspec/index.js';
import redisConf from '../types/text/known/redis-conf/index.js';
import redisSentinel from '../types/text/known/redis-sentinel/index.js';
import cassandraConfig from '../types/text/yaml/known/cassandra-config/index.js';
import elasticsearchConfig from '../types/text/yaml/known/elasticsearch-config/index.js';
import kibana from '../types/text/yaml/known/kibana/index.js';
import clickhouseConfig from '../types/text/xml/known/clickhouse-config/index.js';
import mongodConf from '../types/text/known/mongod-conf/index.js';
import myCnf from '../types/text/known/my-cnf/index.js';
import postgresqlConf from '../types/text/known/postgresql-conf/index.js';
import odooConf from '../types/text/ini/known/odoo-conf/index.js';
import pgbouncerIni from '../types/text/known/pgbouncer-ini/index.js';
import pgbackrestConf from '../types/text/known/pgbackrest-conf/index.js';
import patroniConfig from '../types/text/yaml/known/patroni-config/index.js';
import shardYml from '../types/text/yaml/known/shard-yml/index.js';
import crystalShard from '../types/text/yaml/known/crystal-shard/index.js';
import tauriConf from '../types/text/json/known/tauri-conf/index.js';
import traefikConfig from '../types/text/yaml/known/traefik-config/index.js';
import unleashConfig from '../types/text/known/unleash-config/index.js';
import vaultHcl from '../types/text/known/vault-hcl/index.js';
import nomadJob from '../types/text/known/nomad-job/index.js';
import vectorToml from '../types/text/toml/known/vector-toml/index.js';
import vectorConfig from '../types/text/known/vector-config/index.js';
import keepalivedConf from '../types/text/known/keepalived-conf/index.js';
import wailsJson from '../types/text/json/known/wails-json/index.js';
import webConfig from '../types/text/xml/known/web-config/index.js';
import xcconfig from '../types/text/known/xcconfig/index.js';
import bitbucketPipelines from '../types/text/yaml/known/bitbucket-pipelines/index.js';
import tektonPipeline from '../types/text/yaml/known/tekton-pipeline/index.js';
import argoCdApp from '../types/text/yaml/known/argo-cd-app/index.js';
import fluxKustomization from '../types/text/yaml/known/flux-kustomization/index.js';
import fluxHelmRelease from '../types/text/yaml/known/flux-helm-release/index.js';
import dockerStack from '../types/text/yaml/known/docker-stack/index.js';
import semgrepConfig from '../types/text/yaml/known/semgrep-config/index.js';
import codeclimateConfig from '../types/text/yaml/known/codeclimate-config/index.js';
import gitleaksConfig from '../types/text/toml/known/gitleaks-config/index.js';
import trufflehogConfig from '../types/text/yaml/known/trufflehog-config/index.js';
import osvScanner from '../types/text/toml/known/osv-scanner/index.js';
import condaEnv from '../types/text/yaml/known/conda-env/index.js';
import pipConf from '../types/text/known/pip-conf/index.js';
import nodeVersionFile from '../types/text/known/node-version-file/index.js';
import dockerBake from '../types/text/known/docker-bake/index.js';
import flake8 from '../types/text/ini/known/flake8/index.js';
import pylintrc from '../types/text/ini/known/pylintrc/index.js';
import setupCfg from '../types/text/ini/known/setup-cfg/index.js';
import awsCredentials from '../types/text/ini/known/aws-credentials/index.js';
import awsConfig from '../types/text/ini/known/aws-config/index.js';
import kubeconfig from '../types/text/yaml/known/kubeconfig/index.js';
import gcpServiceAccount from '../types/text/json/known/gcp-service-account/index.js';
import banditYaml from '../types/text/yaml/known/bandit-yaml/index.js';
import istioConfig from '../types/text/yaml/known/istio-config/index.js';
import linkerdConfig from '../types/text/yaml/known/linkerd-config/index.js';
import etcdConfig from '../types/text/yaml/known/etcd-config/index.js';
import kafkaServerProps from '../types/text/known/kafka-server-props/index.js';
import rabbitmqConf from '../types/text/known/rabbitmq-conf/index.js';
import natsConfig from '../types/text/known/nats-config/index.js';
import mosquittoConf from '../types/text/known/mosquitto-conf/index.js';
import zookeeperConfig from '../types/text/known/zookeeper-config/index.js';
import hostsFile from '../types/text/known/hosts-file/index.js';
import resolvConf from '../types/text/known/resolv-conf/index.js';
import sshdConfig from '../types/text/known/sshd-config/index.js';
import sshClientConfig from '../types/text/known/ssh-config/index.js';
import sudoers from '../types/text/known/sudoers/index.js';
import nfsExports from '../types/text/known/nfs-exports/index.js';
import samTemplate from '../types/text/yaml/known/sam-template/index.js';
import cfnTemplate from '../types/text/yaml/known/cfn-template/index.js';
import cdkJson from '../types/text/json/known/cdk-json/index.js';
import releasePleaseConfig from '../types/text/json/known/release-please-config/index.js';
import awsSamConfig from '../types/text/toml/known/aws-sam-config/index.js';
import analysisOptions from '../types/text/yaml/known/analysis-options/index.js';
import podfileLock from '../types/text/known/podfile-lock/index.js';
import xcodeScheme from '../types/text/xml/known/xcode-scheme/index.js';
import easJson from '../types/text/json/known/eas-json/index.js';
import dprintConfig from '../types/text/json/known/dprint/index.js';
import opaPolicy from '../types/text/known/opa-policy/index.js';
import falcoRules from '../types/text/yaml/known/falco-rules/index.js';
import falcoConfig from '../types/text/yaml/known/falco-config/index.js';
import borgmaticConfig from '../types/text/yaml/known/borgmatic-config/index.js';
import suricataConfig from '../types/text/yaml/known/suricata-config/index.js';
import kyvernoPolicy from '../types/text/yaml/known/kyverno-policy/index.js';
import gatekeeperConfig from '../types/text/yaml/known/gatekeeper-config/index.js';
import jetbrainsWorkspace from '../types/text/xml/known/jetbrains-workspace/index.js';
import neovimConfig from '../types/text/known/neovim-config/index.js';
import vimConfig from '../types/text/known/vim-config/index.js';
import alacrittyConf from '../types/text/known/alacritty-conf/index.js';
import kittyConf from '../types/text/known/kitty-conf/index.js';
import starshipConfig from '../types/text/toml/known/starship-config/index.js';
import emacsConfig from '../types/text/known/emacs-config/index.js';
import tmuxConf from '../types/text/known/tmux-conf/index.js';
import screenrc from '../types/text/known/screenrc/index.js';
import i3Config from '../types/text/known/i3-config/index.js';
import swayConfig from '../types/text/known/sway-config/index.js';
import dunstrc from '../types/text/known/dunstrc/index.js';
import polybarConf from '../types/text/known/polybar-conf/index.js';
import waybarConfig from '../types/text/json/known/waybar-config/index.js';
import woodpeckerCi from '../types/text/yaml/known/woodpecker-ci/index.js';
import codefreshConfig from '../types/text/yaml/known/codefresh-config/index.js';
import harnessPipeline from '../types/text/yaml/known/harness-pipeline/index.js';
import actConfig from '../types/text/known/act-config/index.js';
import actrc from '../types/text/known/actrc/index.js';
import pulsarConf from '../types/text/known/pulsar-conf/index.js';
import cyclonedxSbom from '../types/text/json/known/cyclonedx-sbom/index.js';
import spdxSbom from '../types/text/known/spdx-sbom/index.js';
import slsaProvenance from '../types/text/json/known/slsa-provenance/index.js';
import syftConfig from '../types/text/yaml/known/syft-config/index.js';
import proguardRules from '../types/text/known/proguard-rules/index.js';
import androidStrings from '../types/text/xml/known/android-strings/index.js';
import keycloakRealm from '../types/text/json/known/keycloak-realm/index.js';
import autheliaConfig from '../types/text/yaml/known/authelia-config/index.js';
import oauth2ProxyConfig from '../types/text/known/oauth2-proxy-config/index.js';
import authentikBlueprint from '../types/text/yaml/known/authentik-config/index.js';
import authentikConfig from '../types/text/known/authentik-config/index.js';
import synapseConfig from '../types/text/yaml/known/synapse-config/index.js';
import gotosocialConfig from '../types/text/yaml/known/gotosocial-config/index.js';
import searxngConfig from '../types/text/yaml/known/searxng-config/index.js';
import newrelicConfig from '../types/text/yaml/known/newrelic-config/index.js';
import dynatraceConfig from '../types/text/yaml/known/dynatrace-config/index.js';
import elasticApmConfig from '../types/text/known/elastic-apm-config/index.js';
import filebeatConfig from '../types/text/yaml/known/filebeat/index.js';
import heartbeatConfig from '../types/text/yaml/known/heartbeat/index.js';
import beatsConfig from '../types/text/yaml/known/beats-config/index.js';
import hardhatConfig from '../types/text/known/hardhat-config/index.js';
import truffleConfig from '../types/text/known/truffle-config/index.js';
import foundryToml from '../types/text/toml/known/foundry-toml/index.js';
import anchorToml from '../types/text/toml/known/anchor-toml/index.js';
import wireguardConf from '../types/text/known/wireguard-conf/index.js';
import coturnConf from '../types/text/known/coturn-conf/index.js';
import netbirdConfig from '../types/text/json/known/netbird-config/index.js';
import tailscaleAcl from '../types/text/json/known/tailscale-acl/index.js';
import headscaleConfig from '../types/text/yaml/known/headscale-config/index.js';
import openvpnConfig from '../types/text/known/openvpn-config/index.js';
import opensslConf from '../types/text/known/openssl-conf/index.js';
import krb5Conf from '../types/text/known/krb5-conf/index.js';
import gpgConf from '../types/text/known/gpg-conf/index.js';
import giteaConf from '../types/text/known/gitea-conf/index.js';
import stunnelConf from '../types/text/known/stunnel-conf/index.js';
import supervisordConf from '../types/text/known/supervisord-conf/index.js';
import logrotateConf from '../types/text/known/logrotate-conf/index.js';
import tlpConf from '../types/text/known/tlp-conf/index.js';
import shellRc from '../types/text/known/shell-rc/index.js';
import nixDaemonConf from '../types/text/known/nix-daemon-conf/index.js';
import nixConfig from '../types/text/known/nix-config/index.js';
import mavenSettings from '../types/text/xml/known/maven-settings/index.js';
import pgHba from '../types/text/known/pg-hba/index.js';
import dvcPipeline from '../types/text/yaml/known/dvc-pipeline/index.js';
import hydraConfig from '../types/text/yaml/known/hydra-config/index.js';
import mlflowProject from '../types/text/yaml/known/mlflow-project/index.js';
import meltanoConfig from '../types/text/yaml/known/meltano-config/index.js';
import dagsterConfig from '../types/text/yaml/known/dagster-config/index.js';
import wandbConfig from '../types/text/ini/known/wandb-config/index.js';
import mintlify from '../types/text/json/known/mintlify/index.js';
import postmanCollection from '../types/text/json/known/postman-collection/index.js';
import brunoWorkspace from '../types/text/json/known/bruno/index.js';
import insomnia from '../types/text/yaml/known/insomnia/index.js';
import openapiGenerator from '../types/text/yaml/known/openapi-generator/index.js';
import graphqlSchema from '../types/text/known/graphql-schema/index.js';
import fstab from '../types/text/known/fstab/index.js';
import crypttab from '../types/text/known/crypttab/index.js';
import sysctlConf from '../types/text/known/sysctl-conf/index.js';
import modprobeConf from '../types/text/known/modprobe-conf/index.js';
import systemdUnit from '../types/text/known/systemd-unit/index.js';
import crontab from '../types/text/known/crontab/index.js';
import clusterConfig from '../types/text/yaml/known/cluster-config/index.js';
import certManager from '../types/text/yaml/known/cert-manager/index.js';
import iptablesRules from '../types/text/known/iptables-rules/index.js';
import udevRules from '../types/text/known/udev-rules/index.js';
import grubConf from '../types/text/known/grub-conf/index.js';
import nftablesRules from '../types/text/known/nftables-rules/index.js';
import ufwConf from '../types/text/known/ufw-conf/index.js';
import fail2banConf from '../types/text/known/fail2ban-conf/index.js';
import apparmorProfile from '../types/text/known/apparmor-profile/index.js';
import smbConf from '../types/text/known/smb-conf/index.js';
import corefile from '../types/text/known/corefile/index.js';
import containerdConfig from '../types/text/known/containerd-config/index.js';
import postfixConf from '../types/text/known/postfix-conf/index.js';
import dovecotConf from '../types/text/known/dovecot-conf/index.js';
import nagiosConf from '../types/text/known/nagios-conf/index.js';
import zabbixConf from '../types/text/known/zabbix-conf/index.js';
import eximConf from '../types/text/known/exim-conf/index.js';
import chronyConf from '../types/text/known/chrony-conf/index.js';
import namedConf from '../types/text/known/named-conf/index.js';
import unboundConf from '../types/text/known/unbound-conf/index.js';
import piholeSetupvars from '../types/text/known/pihole-setupvars/index.js';
import dhcpdConf from '../types/text/known/dhcpd-conf/index.js';
import netdataConf from '../types/text/known/netdata-conf/index.js';
import yarnrc from '../types/text/known/yarnrc/index.js';
import hyprlandConf from '../types/text/known/hyprland-conf/index.js';
import lxcConfig from '../types/text/known/lxc-config/index.js';
import muttrc from '../types/text/known/muttrc/index.js';
import footConfig from '../types/text/known/foot-config/index.js';
import rofiConfig from '../types/text/known/rofi-config/index.js';
import makoConf from '../types/text/known/mako-conf/index.js';
import pulseaudioConf from '../types/text/known/pulseaudio-conf/index.js';
import pipewireConf from '../types/text/known/pipewire-conf/index.js';
import weztermConf from '../types/text/known/wezterm-conf/index.js';
import aria2Conf from '../types/text/known/aria2-conf/index.js';
import picomConf from '../types/text/known/picom-conf/index.js';
import mpdConf from '../types/text/known/mpd-conf/index.js';
import ncmpcppConf from '../types/text/known/ncmpcpp-conf/index.js';
import newsboatConf from '../types/text/known/newsboat-conf/index.js';
import xresources from '../types/text/known/xresources/index.js';
import xorgConf from '../types/text/known/xorg-conf/index.js';
import bspwmrc from '../types/text/known/bspwmrc/index.js';
import sxhkdrc from '../types/text/known/sxhkdrc/index.js';
import mpvConf from '../types/text/known/mpv-conf/index.js';
import ytdlpConf from '../types/text/known/ytdlp-conf/index.js';
import rcloneConf from '../types/text/known/rclone-conf/index.js';
import resticConfig from '../types/text/known/restic-config/index.js';
import taskrc from '../types/text/known/taskrc/index.js';
import curlrc from '../types/text/known/curlrc/index.js';
import inputrc from '../types/text/known/inputrc/index.js';
import wgetrc from '../types/text/known/wgetrc/index.js';
import helixConfig from '../types/text/toml/known/helix-config/index.js';
import lfrc from '../types/text/known/lfrc/index.js';
import rangerConf from '../types/text/known/ranger-conf/index.js';
import zathurarc from '../types/text/known/zathurarc/index.js';
import wslConf from '../types/text/known/wsl-conf/index.js';
import loaderConf from '../types/text/known/loader-conf/index.js';
import cmusConf from '../types/text/known/cmus-conf/index.js';
import pacmanConf from '../types/text/known/pacman-conf/index.js';
import dnfConf from '../types/text/known/dnf-conf/index.js';
import gdbinit from '../types/text/known/gdbinit/index.js';
import { plugin as preCommitConfig } from '../types/text/yaml/known/pre-commit-config/index.js';
import { plugin as conkyConf } from '../types/text/known/conky-conf/index.js';
import { plugin as semaphoreCi } from '../types/text/yaml/known/semaphore-ci/index.js';
import nanorc from '../types/text/known/nanorc/index.js';
import { plugin as ansibleLint } from '../types/text/yaml/known/ansible-lint/index.js';
import { plugin as molecule } from '../types/text/yaml/known/molecule/index.js';
import { plugin as helmfile } from '../types/text/yaml/known/helmfile/index.js';
import { plugin as releaseIt } from '../types/text/yaml/known/release-it/index.js';
import benthos from '../types/text/yaml/known/benthos/index.js';
import testKitchen from '../types/text/yaml/known/test-kitchen/index.js';
import harbor from '../types/text/yaml/known/harbor/index.js';
import harborConfig from '../types/text/yaml/known/harbor-config/index.js';
import gardenIo from '../types/text/yaml/known/garden-io/index.js';
import stryker from '../types/text/json/known/stryker/index.js';
import airflowCfg from '../types/text/ini/known/airflow/index.js';
import radicaleConfig from '../types/text/ini/known/radicale-config/index.js';
import registriesConf from '../types/text/toml/known/registries-conf/index.js';
import storageConf from '../types/text/toml/known/storage-conf/index.js';
import asyncapi from '../types/text/yaml/known/asyncapi/index.js';
import telegraf from '../types/text/toml/known/telegraf/index.js';
import devfile from '../types/text/yaml/known/devfile/index.js';
import ncurc from '../types/text/json/known/ncurc/index.js';
import influxdbConf from '../types/text/toml/known/influxdb/index.js';
import influxdbConfig from '../types/text/yaml/known/influxdb-config/index.js';
import nsqConf from '../types/text/known/nsq-conf/index.js';
import cloudflared from '../types/text/yaml/known/cloudflared/index.js';
import dnsmasqConf from '../types/text/known/dnsmasq/index.js';
import { plugin as frpcConfig } from '../types/text/toml/known/frpc-config/index.js';
import { plugin as frpsConfig } from '../types/text/toml/known/frps-config/index.js';
import { plugin as pdnsConf } from '../types/text/known/pdns-conf/index.js';
import { plugin as pdnsRecursorConf } from '../types/text/known/pdns-recursor-conf/index.js';
import corosyncConf from '../types/text/known/corosync-conf/index.js';
import nushellConfig from '../types/text/known/nushell-config/index.js';
import gitoliteConf from '../types/text/known/gitolite-conf/index.js';
import homerConfig from '../types/text/yaml/known/homer-config/index.js';
import uptimeKumaConfig from '../types/text/json/known/uptime-kuma-config/index.js';
import minifluxConf from '../types/text/known/miniflux-conf/index.js';
import ghostConfig from '../types/text/json/known/ghost-config/index.js';
import mealieConfig from '../types/text/known/mealie-config/index.js';
import immichConfig from '../types/text/known/immich-config/index.js';
import photoprismConfig from '../types/text/yaml/known/photoprism-config/index.js';
import paperlessConf from '../types/text/known/paperless-conf/index.js';
import bookstackConfig from '../types/text/known/bookstack-config/index.js';
import bookstackEnv from '../types/text/known/bookstack-env/index.js';
import mattermostConfig from '../types/text/json/known/mattermost-config/index.js';
import filebrowserConfig from '../types/text/json/known/filebrowser-config/index.js';
import netboxConfig from '../types/text/known/netbox-config/index.js';
import vaultwardenEnv from '../types/text/known/vaultwarden-env/index.js';
import ntfyConfig from '../types/text/yaml/known/ntfy-config/index.js';
import wakapiConfig from '../types/text/yaml/known/wakapi-config/index.js';
import outlineConfig from '../types/text/known/outline-config/index.js';
import linkdingConfig from '../types/text/known/linkding-config/index.js';
import plausibleConfig from '../types/text/known/plausible-config/index.js';
import umamiConfig from '../types/text/known/umami-config/index.js';
import stirlingPdfConfig from '../types/text/yaml/known/stirling-pdf-config/index.js';
import monicaConfig from '../types/text/known/monica-config/index.js';
import n8nConfig from '../types/text/known/n8n-config/index.js';
import nocodbConfig from '../types/text/known/nocodb-config/index.js';
import planeConfig from '../types/text/known/plane-config/index.js';
import infisicalConfig from '../types/text/known/infisical-config/index.js';
import diunConfig from '../types/text/yaml/known/diun-config/index.js';
import hoppscotchConfig from '../types/text/known/hoppscotch-config/index.js';
import twentyCrmConfig from '../types/text/known/twenty-crm-config/index.js';
import vikunjaConfig from '../types/text/yaml/known/vikunja-config/index.js';
import gristConfig from '../types/text/known/grist-config/index.js';
import appsmithConfig from '../types/text/known/appsmith-config/index.js';
import glitchtipConfig from '../types/text/known/glitchtip-config/index.js';
import archiveboxConfig from '../types/text/known/archivebox-config/index.js';
import memosConfig from '../types/text/known/memos-config/index.js';
import dexConfig from '../types/text/yaml/known/dex-config/index.js';
import lldapConfig from '../types/text/toml/known/lldap-config/index.js';
import invidiousConfig from '../types/text/yaml/known/invidious-config/index.js';
import listmonkConfig from '../types/text/toml/known/listmonk-config/index.js';
import windmillConfig from '../types/text/known/windmill-config/index.js';
import komgaConfig from '../types/text/yaml/known/komga-config/index.js';
import coderConfig from '../types/text/known/coder-config/index.js';
import calComConfig from '../types/text/known/cal-com-config/index.js';
import ralllyConfig from '../types/text/known/rallly-config/index.js';
import woodpeckerAgentConfig from '../types/text/known/woodpecker-agent-config/index.js';
import actRunnerConfig from '../types/text/yaml/known/act-runner-config/index.js';
import vaultwardenConfig from '../types/text/known/vaultwarden-config/index.js';
import keycloakConfig from '../types/text/known/keycloak-config/index.js';
import minioConfig from '../types/text/known/minio-config/index.js';
import droneConfig from '../types/text/known/drone-config/index.js';
import sftpgoConfig from '../types/text/json/known/sftpgo-config/index.js';
import sonarqubeConfig from '../types/text/known/sonarqube-config/index.js';
import concourseConfig from '../types/text/known/concourse-config/index.js';
import invoiceNinjaConfig from '../types/text/known/invoiceninja-config/index.js';
import conduitConfig from '../types/text/toml/known/conduit-config/index.js';
import zitadelConfig from '../types/text/yaml/known/zitadel-config/index.js';
import dendriteConfig from '../types/text/yaml/known/dendrite-config/index.js';
import watchtowerConfig from '../types/text/known/watchtower-config/index.js';
import changedetectionConfig from '../types/text/known/changedetection-config/index.js';
import semaphoreConfig from '../types/text/json/known/semaphore-config/index.js';
import actualBudgetConfig from '../types/text/json/known/actual-budget-config/index.js';
import wallosConfig from '../types/text/known/wallos-config/index.js';
import openWebUiConfig from '../types/text/known/open-webui-config/index.js';
import maybeConfig from '../types/text/known/maybe-config/index.js';
import netdataConfig from '../types/text/ini/known/netdata-config/index.js';
import pocketIdConfig from '../types/text/known/pocket-id-config/index.js';
import nzbgetConfig from '../types/text/known/nzbget-config/index.js';
import sabnzbdConfig from '../types/text/ini/known/sabnzbd-config/index.js';
import joplinServerConfig from '../types/text/known/joplin-server-config/index.js';
import speedtestTrackerConfig from '../types/text/known/speedtest-tracker-config/index.js';
import dozzleConfig from '../types/text/yaml/known/dozzle-config/index.js';
import forgejoConfig from '../types/text/ini/known/forgejo-config/index.js';
import glancesConfig from '../types/text/ini/known/glances-config/index.js';
import homarrConfig from '../types/text/yaml/known/homarr-config/index.js';
import kavitaConfig from '../types/text/json/known/kavita-config/index.js';
import tandoorConfig from '../types/text/known/tandoor-config/index.js';
import audiobookshelfConfig from '../types/text/known/audiobookshelf-config/index.js';
import dashyConfig from '../types/text/yaml/known/dashy-config/index.js';
import jellyseerrConfig from '../types/text/json/known/jellyseerr-config/index.js';
import bazarrConfig from '../types/text/yaml/known/bazarr-config/index.js';
import scrutinyConfig from '../types/text/yaml/known/scrutiny-config/index.js';
import homepageConfig from '../types/text/yaml/known/homepage-config/index.js';
import overseerrConfig from '../types/text/json/known/overseerr-config/index.js';
import freshRssConfig from '../types/text/known/freshrss-config/index.js';
import wallabagConfig from '../types/text/known/wallabag-config/index.js';
import linkwardenConfig from '../types/text/known/linkwarden-config/index.js';
import hoarderConfig from '../types/text/known/hoarder-config/index.js';
export const KNOWN = [packageJson, cargoToml, tsconfig, dockerfile, gitignore, dockerCompose,
  requirementsTxt, goMod, composerJson, gemfile, codeowners, editorconfig, antBuild, mavenPom, pomXml,
  buildGradle, pipfile, openapi, githubActions, k8sRbac, k8sNetworkPolicy, k8sHpa, k8sIngress, k8sManifest, pubspec, pubspecLock, netlifyToml, vercelJson,
  pyprojectToml, npmrc, renovate, prettierrc, turbo, dependabot,
  eslint, jest, jestConfig, stylelint, babelrc, babel, commitlint, lefthook,
  wrangler, flyToml, cliff, releaserc,
  lerna, nx, biome, codecov, serverless, azurePipelines,
  vscodeSettings, vscodeExtensions, vscodeLaunch, vscodeTasks,
  travis, circleci, amplify, codebuild,
  jsconfigJson, denoJson, nvmrc, browserslistrc,
  preCommit, pyrightconfig, toxIni, pytestIni, tox, mypy,
  angularJson, capacitor, nycrc, devcontainer, knip, mocha, gitlabCi, pnpmWorkspace,
  vitest, graphqlConfig, graphqlCodegen, tspconfigYaml, apollo, storybook,
  drone, buildkite, skaffold, hadolint,
  helmChart, kustomize, ansiblePlaybook, pulumi, packer, ruff, uv, kubeHelmValues,
  firebase, expo, tailwind, postcss, husky, lintStaged, nestCli, swcrc,
  packageLock, composerLock, pnpmLock, cargoLock, poetryLock, goSum,
  makefileKf, justfile, procfile, envExample, envrc, miseConfig, toolVersions,
  gitattributes, gemfileLock, sonar, hatch,
  mailmap, npmignore, dockerignore, gcloudignore, eslintignore, prettierignore,
  appveyor, rubocop, rubocopTodo, taskfile, mkdocsYml,
  rush, markdownlintJson, markdownlintYaml, clangFormat, clangTidy, moonrepo,
  brewfile, license, ansibleCfg, ansibleHosts, makepkgConf, gemspec, typos, cargoDeny, cargoConfig, rustfmtToml, clippyToml, rustToolchain,
  htaccess, htpasswd, nginxConf, apacheConf, lighttpdConf, vsftpdConf, proftpdConf, haproxyConfig, haproxyConf, squidConf, varnishVcl, moonYml, vagrantfile, berksfile, caddyfile, renderYaml, railwayJson, appJson,
  rsyslogConf, netplan, syslogNg,
  crowdinYml, matchfile, appfile, rubyVersion, rspecConfig, sorbetConfig, bundlerAuditConfig, standardrbConfig, pythonVersion, earthfile, gitmodules, gitconfig, tfvars,
  podfile, fastfile, snapfile,
  supabaseConfig, netlifyRedirects,
  cmake, jenkinsfile,
  bazel, bazelrc, ninjaBuild,
  packageSwift, mixExs, buildSbt, scalafmtConf, scalafixConf,
  playwrightConfig, cypressConfig,
  vcpkg, cmakePresets, conanfile,
  prometheusConfig, alertmanager, blackboxExporter, snmpExporter, victoriaMetricsConfig, thanosConfig, datadogConfig, ejabberdConfig,
  viteConfig, webpackConfig, rollupConfig, nextConfig,
  astroConfig, svelteConfig, nuxtConfig, remixConfig, hugoConfig,
  airConfig, spectral, tiltfile, mesonBuild,
  goreleaser, golangciLint, bufGen, bufConfig, mockeryConfig, koConfig, sqlcConfig, nfpmConfig, heroku,
  readthedocs, citationCff, yamllint, valeIni, coderabbit,
  ionicConfig, metroConfig, reactNativeConfig,
  dotnetGlobal, prismaSchema, nugetConfig,
  sentryProps, otelCollector, logback, log4j2, checkstyleXml, spotbugsConfig,
  prometheusRules, grafanaDashboard, jaegerConfig, otelK8s,
  scorecard, socketSecurity, trivyConfig, snykConfig, grypeConfig, tetragonPolicy,
  gradleVersionCatalog, gradleProps, gradleWrapper, settingsGradle, springApp, springAppYml,
  csproj, directoryBuild, msbuildProps, nuspec,
  stackYaml, cabal, opamFile, duneBuild, packageResolved, rebarConfig, erlangSysConfig, erlangVmArgs, cpanfile,
  rDescription, rProfile,
  docusaurusConfig, vitepressConfig, sphinxConf, doxyfile,
  drizzleConfig, knexfile, alembic, flywayConf,
  dbtProject, liquibaseProps, sqitchConf, atlasHcl, waypoint,
  wdioConfig, artilleryYml, k6Config, gatlingConf,
  gaeApp, cloudbuild, googleServices, catalogInfo,
  cursorRules, claudeMd, copilotInstructions, aiderConf,
  phpunit, phpstan, phpCsFixer, behat,
  phpIni, psalmConfig, phpunitConfig, rectorConfig,
  terragrunt, tflint, tfLock, versionsTf,
  tsupConfig, rspackConfig, esbuildConfig, parcelrc, bunfigToml, shopifyApp, lighthouserc,
  shadowCljs, projectClj, depsEdn,
  atlantis, spaceliftConfig, kamalConfig, prefectConfig, checkov, terraformDocs, infracost,
  opencostConfig, crossplaneConfig, kedaConfig, veleroConfig,
  androidManifest, appConfig, buildZigZon, zigZon, cartfile,
  electronBuilder, elmJson, externalSecrets, fluentBit, logstashConf, fluentdConf, graylogConf, lokiConfig, promtailConfig, tempoConfig, mimirConfig, cortexConfig, grafanaAlloy, forgeConfig,
  gleamToml, goWork, grafanaIni, podmanQuadlet, growthbook,
  jekyllConfig, juliaProject, juliaManifest, kongConfig, apisixConfig, envoyConfig, launchSettings, appSettings,
  nimble, packagesConfig, podspec, redisConf, redisSentinel, mongodConf, myCnf, postgresqlConf, odooConf, pgbouncerIni, pgbackrestConf, patroniConfig, cassandraConfig, elasticsearchConfig, kibana, clickhouseConfig, shardYml, crystalShard,
  tauriConf, traefikConfig, unleashConfig, vaultHcl, nomadJob, consulConfig,
  vectorToml, vectorConfig, keepalivedConf, corosyncConf, wailsJson, webConfig, xcconfig,
  bitbucketPipelines, tektonPipeline, argoCdApp, fluxKustomization, fluxHelmRelease, dockerStack,
  semgrepConfig, codeclimateConfig, gitleaksConfig, trufflehogConfig, osvScanner,
  condaEnv, pipConf, nodeVersionFile, dockerBake,
  flake8, pylintrc, setupCfg, awsCredentials, awsConfig,
  kubeconfig, gcpServiceAccount, banditYaml,
  istioConfig, linkerdConfig, etcdConfig,
  kafkaServerProps, natsConfig, rabbitmqConf, mosquittoConf, zookeeperConfig,
  samTemplate, cfnTemplate, cdkJson, awsSamConfig, releasePleaseConfig,
  analysisOptions, podfileLock, xcodeScheme, easJson, dprintConfig,
  hostsFile, resolvConf, sshdConfig, sshClientConfig, sudoers, nfsExports, fstab, crypttab,
  sysctlConf, modprobeConf,
  jetbrainsWorkspace, neovimConfig, vimConfig, alacrittyConf, kittyConf, starshipConfig, emacsConfig, tmuxConf, nushellConfig, screenrc, i3Config, swayConfig, dunstrc, polybarConf, waybarConfig, nanorc,
  devboxJson, protoConfig, aquaConfig, pixiConfig,
  djangoSettings, springProfiles, railsCredentials, pumaConfig,
  woodpeckerCi,
  codefreshConfig,
  opaPolicy, falcoRules, falcoConfig, kyvernoPolicy, gatekeeperConfig,
  harnessPipeline,
  actrc, actConfig,
  pulsarConf,
  cyclonedxSbom, spdxSbom, slsaProvenance, syftConfig,
  proguardRules, androidStrings,
  keycloakRealm, autheliaConfig, oauth2ProxyConfig, authentikConfig, authentikBlueprint, synapseConfig,
  gotosocialConfig, searxngConfig,
  newrelicConfig, dynatraceConfig, elasticApmConfig, filebeatConfig, heartbeatConfig, beatsConfig,
  hardhatConfig, truffleConfig, foundryToml, anchorToml,
  wireguardConf, netbirdConfig, tailscaleAcl, headscaleConfig, openvpnConfig, opensslConf, krb5Conf, gpgConf,
  giteaConf, stunnelConf,
  supervisordConf, logrotateConf, tlpConf,
  shellRc,
  nixDaemonConf, nixConfig,
  mavenSettings, pgHba,
  dvcPipeline, hydraConfig, mlflowProject, meltanoConfig, dagsterConfig, wandbConfig,
  mintlify, postmanCollection, brunoWorkspace, insomnia, openapiGenerator, graphqlSchema,
  systemdUnit, crontab,
  clusterConfig, certManager,
  iptablesRules, udevRules, grubConf, nftablesRules, ufwConf,
  fail2banConf, apparmorProfile, suricataConfig, smbConf,
  corefile, containerdConfig,
  postfixConf, dovecotConf, nagiosConf, zabbixConf, eximConf, chronyConf,
  namedConf, unboundConf, piholeSetupvars, dhcpdConf,
  netdataConfig, netdataConf, yarnrc,
  hyprlandConf, lxcConfig,
  muttrc, footConfig,
  rofiConfig, makoConf,
  pulseaudioConf, pipewireConf,
  weztermConf, aria2Conf,
  picomConf, mpdConf,
  ncmpcppConf, newsboatConf,
  bspwmrc, sxhkdrc,
  mpvConf, ytdlpConf,
  xresources, xorgConf,
  rcloneConf, resticConfig, borgmaticConfig,
  taskrc, curlrc,
  inputrc, wgetrc,
  helixConfig, lfrc,
  rangerConf, zathurarc,
  wslConf, loaderConf,
  cmusConf, pacmanConf, dnfConf,
  gdbinit,
  preCommitConfig, conkyConf,
  semaphoreCi,
  ansibleLint, molecule,
  helmfile, releaseIt,
  benthos, testKitchen,
  harbor, harborConfig, gardenIo,
  stryker, airflowCfg,
  registriesConf, storageConf,
  asyncapi, telegraf,
  devfile, ncurc,
  influxdbConf, influxdbConfig, nsqConf,
  cloudflared, dnsmasqConf,
  frpcConfig, frpsConfig,
  pdnsConf, pdnsRecursorConf,
  coturnConf, radicaleConfig, gitoliteConf,
  minifluxConf, ghostConfig,
  mealieConfig, immichConfig,
  crowdsecConfig, crowdsecAcquis,
  homerConfig, uptimeKumaConfig,
  photoprismConfig, paperlessConf,
  bookstackConfig, bookstackEnv, mattermostConfig, filebrowserConfig,
  netboxConfig, vaultwardenEnv,
  ntfyConfig, wakapiConfig,
  outlineConfig, linkdingConfig,
  plausibleConfig, umamiConfig,
  stirlingPdfConfig, monicaConfig,
  n8nConfig, nocodbConfig,
  planeConfig, infisicalConfig,
  diunConfig,
  hoppscotchConfig, twentyCrmConfig,
  vikunjaConfig, gristConfig, appsmithConfig,
  glitchtipConfig, archiveboxConfig, memosConfig,
  dexConfig, lldapConfig, invidiousConfig,
  listmonkConfig, windmillConfig,
  komgaConfig, coderConfig,
  calComConfig, ralllyConfig,
  woodpeckerAgentConfig,
  actRunnerConfig, vaultwardenConfig,
  keycloakConfig,
  minioConfig,
  droneConfig,
  sftpgoConfig,
  sonarqubeConfig,
  concourseConfig,
  invoiceNinjaConfig,
  conduitConfig, zitadelConfig,
  dendriteConfig,
  watchtowerConfig,
  changedetectionConfig,
  semaphoreConfig,
  actualBudgetConfig,
  wallosConfig,
  openWebUiConfig,
  maybeConfig,
  pocketIdConfig,
  nzbgetConfig,
  sabnzbdConfig,
  joplinServerConfig,
  speedtestTrackerConfig,
  dozzleConfig,
  forgejoConfig,
  glancesConfig,
  homarrConfig,
  kavitaConfig,
  tandoorConfig,
  audiobookshelfConfig,
  dashyConfig,
  jellyseerrConfig,
  bazarrConfig,
  scrutinyConfig,
  overseerrConfig,
  freshRssConfig,
  homepageConfig,
  wallabagConfig,
  linkwardenConfig,
  hoarderConfig,
];
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
