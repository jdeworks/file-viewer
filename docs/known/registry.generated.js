// GENERATED — DO NOT EDIT BY HAND.
// Bundled from docs/known/registry.js (+ ~889 plugin index.js files) by build/known/build.mjs.
// Rebuild:  node build/known/build.mjs   (run by scripts/check.sh; fails if stale)
// Exports matchKnown / matchAllKnown / KNOWN. Renderer modules stay lazy (external dynamic
// imports rewritten relative to this file) — they are NOT inlined here.


// ../../docs/types/text/json/known/package-json/index.js
var package_json_default = {
  id: "package-json",
  label: "package.json",
  match: (intake, baseType) => baseType.id === "json" && /(^|\/)package\.json$/i.test(intake.filename || ""),
  loadRenderer: () => import("../types/text/json/known/package-json/render.js"),
  loadMetadata: () => import("../types/text/json/known/package-json/metadata.js")
};

// ../../docs/types/text/toml/known/cargo-toml/index.js
var cargo_toml_default = {
  id: "cargo-toml",
  label: "Cargo.toml",
  match: (intake, baseType) => baseType.id === "toml" && /(^|\/)Cargo\.toml$/i.test(intake.filename || ""),
  loadRenderer: () => import("../types/text/toml/known/cargo-toml/render.js"),
  loadMetadata: () => import("../types/text/toml/known/cargo-toml/metadata.js")
};

// ../../docs/types/text/json/known/tsconfig/index.js
var tsconfig_default = {
  id: "tsconfig",
  label: "tsconfig.json",
  match: (intake, baseType) => baseType.id === "json" && /(^|\/)tsconfig(\.\w+)?\.json$/i.test(intake.filename || ""),
  loadRenderer: () => import("../types/text/json/known/tsconfig/render.js"),
  loadMetadata: () => import("../types/text/json/known/tsconfig/metadata.js")
};

// ../../docs/types/text/known/dockerfile/index.js
var dockerfile_default = {
  id: "dockerfile",
  label: "Dockerfile",
  match: (intake, baseType) => /(^|\/)Dockerfile(\.\w+)?$/i.test(intake.filename || "") || /(\.|^)dockerfile$/i.test((intake.filename || "").split("/").pop() || ""),
  loadRenderer: () => import("../types/text/known/dockerfile/render.js"),
  loadMetadata: () => import("../types/text/known/dockerfile/metadata.js")
};

// ../../docs/types/text/known/gitignore/index.js
var gitignore_default = {
  id: "gitignore",
  label: ".gitignore",
  match: (intake) => /(^|\/)\.gitignore$/i.test(intake.filename || ""),
  loadRenderer: () => import("../types/text/known/gitignore/render.js"),
  loadMetadata: () => import("../types/text/known/gitignore/metadata.js")
};

// ../../docs/types/text/yaml/known/docker-compose/index.js
var docker_compose_default = {
  id: "docker-compose",
  label: "docker-compose",
  match: (intake, baseType) => (baseType.id === "yaml" || baseType.id === "docker-compose") && /(^|\/)(docker-)?compose(\.\w+)?\.ya?ml$/i.test(intake.filename || ""),
  loadRenderer: () => import("../types/text/yaml/known/docker-compose/render.js"),
  loadMetadata: () => import("../types/text/yaml/known/docker-compose/metadata.js")
};

// ../../docs/types/text/known/requirements-txt/index.js
var requirements_txt_default = {
  id: "requirements-txt",
  label: "requirements.txt",
  match: (intake) => /(^|\/)(requirements[\w.-]*|constraints)\.txt$/i.test(intake.filename || ""),
  loadRenderer: () => import("../types/text/known/requirements-txt/render.js"),
  loadMetadata: () => import("../types/text/known/requirements-txt/metadata.js")
};

// ../../docs/types/text/known/go-mod/index.js
var go_mod_default = {
  id: "go-mod",
  label: "go.mod",
  match: (intake) => /(^|\/)go\.mod$/i.test(intake.filename || ""),
  loadRenderer: () => import("../types/text/known/go-mod/render.js"),
  loadMetadata: () => import("../types/text/known/go-mod/metadata.js")
};

// ../../docs/types/text/json/known/composer-json/index.js
var composer_json_default = {
  id: "composer-json",
  label: "composer.json",
  match: (intake, baseType) => baseType.id === "json" && /(^|\/)composer\.json$/i.test(intake.filename || ""),
  loadRenderer: () => import("../types/text/json/known/composer-json/render.js"),
  loadMetadata: () => import("../types/text/json/known/composer-json/metadata.js")
};

// ../../docs/types/text/known/gemfile/index.js
var gemfile_default = {
  id: "gemfile",
  label: "Gemfile",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "gemfile") return true;
    const t = intake.text || "";
    return /source\s+['"]https:\/\/rubygems\.org['"]/.test(t) || /^gem\s+['"]/m.test(t);
  },
  loadRenderer: () => import("../types/text/known/gemfile/render.js"),
  loadMetadata: () => import("../types/text/known/gemfile/metadata.js")
};

// ../../docs/types/text/known/codeowners/index.js
var codeowners_default = {
  id: "codeowners",
  label: "CODEOWNERS",
  match: (intake) => /(^|\/)(\.github\/|\.gitlab\/|docs\/)?CODEOWNERS$/i.test(intake.filename || ""),
  loadRenderer: () => import("../types/text/known/codeowners/render.js"),
  loadMetadata: () => import("../types/text/known/codeowners/metadata.js")
};

// ../../docs/types/text/known/editorconfig/index.js
var plugin = {
  id: "editorconfig",
  label: ".editorconfig",
  tags: ["editorconfig", "editor", "formatting"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === ".editorconfig";
  },
  renderer: () => import("../types/text/known/editorconfig/renderer.js"),
  loadRenderer: () => import("../types/text/known/editorconfig/renderer.js"),
  loadMetadata: () => import("../types/text/known/editorconfig/metadata.js")
};
var editorconfig_default = plugin;

// ../../docs/types/text/xml/known/pom-xml/index.js
var pom_xml_default = {
  id: "pom-xml",
  label: "pom.xml (Maven)",
  match: (intake, baseType) => baseType.id === "xml" && /(^|\/)pom\.xml$/i.test(intake.filename || ""),
  loadRenderer: () => import("../types/text/xml/known/pom-xml/render.js"),
  loadMetadata: () => import("../types/text/xml/known/pom-xml/metadata.js")
};

// ../../docs/types/text/xml/known/sitemap/index.js
var sitemap_default = {
  id: "sitemap-xml",
  label: "XML Sitemap",
  tags: ["web", "seo", "crawl"],
  match(intake, baseType) {
    if (!baseType || baseType.id !== "xml") return false;
    const t = intake.textSample || intake.text || "";
    return t.includes("<urlset") || t.includes("<sitemapindex");
  },
  loadRenderer: () => import("../types/text/xml/known/sitemap/renderer.js"),
  about: {
    description: "XML sitemap or sitemap index — lists URLs for search engine crawlers, with optional metadata about change frequency, priority, and last modification.",
    usedFor: [{ label: "Sitemap protocol", description: "sitemaps.org specification for search engine submissions", href: "https://www.sitemaps.org/protocol.html" }]
  }
};

// ../../docs/types/text/xml/known/maven-pom/index.js
var maven_pom_default = {
  id: "maven-pom",
  label: "Maven POM",
  match(intake, baseType) {
    if (baseType?.id !== "xml") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n !== "pom.xml") return false;
    const text = intake.text || "";
    return text.includes("<groupId>") && text.includes("<artifactId>");
  },
  loadRenderer: () => import("../types/text/xml/known/maven-pom/renderer.js"),
  about: {
    description: "Maven Project Object Model — project coordinates, dependencies, plugins, and parent POM.",
    usedFor: [{ label: "Maven build", description: "Java/JVM project build config for Apache Maven.", href: "https://maven.apache.org/guides/introduction/introduction-to-the-pom.html" }]
  }
};

// ../../docs/types/text/xml/known/ant-build/index.js
var ant_build_default = {
  id: "ant-build",
  label: "Ant Build",
  match(intake, baseType) {
    if (!baseType || baseType.id !== "xml") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const text = intake.textSample || intake.text || "";
    if (n === "build.xml") {
      if (text.includes("<project") && (text.includes("<target") || text.includes("<property"))) return true;
    }
    return false;
  },
  loadRenderer: () => import("../types/text/xml/known/ant-build/renderer.js"),
  about: {
    description: "Apache Ant build file — defines build targets, properties, and task sequences for Java projects.",
    usedFor: [{ label: "Apache Ant", description: "Java build system", href: "https://ant.apache.org/manual/" }]
  }
};

// ../../docs/types/text/known/build-gradle/index.js
var build_gradle_default = {
  id: "build-gradle",
  label: "Gradle Build",
  tags: ["gradle", "build", "java", "kotlin"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "build.gradle" || n === "build.gradle.kts";
  },
  loadRenderer: () => import("../types/text/known/build-gradle/renderer.js"),
  loadMetadata: () => import("../types/text/known/build-gradle/metadata.js"),
  about: {
    description: "Gradle build script — applied plugins, project coordinates, repositories, dependencies by configuration, and defined tasks."
  }
};

// ../../docs/types/text/known/pipfile/index.js
var pipfile_default = {
  id: "pipfile",
  label: "Pipfile",
  match: (intake) => /(^|\/)Pipfile$/i.test(intake.filename || ""),
  loadRenderer: () => import("../types/text/known/pipfile/render.js"),
  loadMetadata: () => import("../types/text/known/pipfile/metadata.js")
};

// ../../docs/types/text/known/openapi/index.js
var looksLikeSpec = (intake) => /(^|\/)(openapi|swagger)\.(ya?ml|json)$/i.test(intake.filename || "") || /(^|\n)\s*["']?(openapi|swagger)["']?\s*:/.test(intake.textSample || "");
var openapi_default = {
  id: "openapi",
  label: "OpenAPI / Swagger",
  match: (intake, baseType) => (baseType.id === "yaml" || baseType.id === "json") && looksLikeSpec(intake),
  loadRenderer: () => import("../types/text/known/openapi/render.js"),
  loadMetadata: () => import("../types/text/known/openapi/metadata.js")
};

// ../../docs/types/text/yaml/known/github-actions/index.js
var github_actions_default = {
  id: "github-actions",
  label: "GitHub Actions workflow",
  match: (intake, baseType) => {
    if (baseType.id !== "yaml" && baseType.id !== "docker-compose") return false;
    const fn = intake.filename || "";
    const text = intake.textSample || intake.text || "";
    if (/\.github\/workflows\//i.test(fn)) return true;
    return /^on\s*:/m.test(text) && /^jobs\s*:/m.test(text) && !/^services\s*:/m.test(text);
  },
  loadRenderer: () => import("../types/text/yaml/known/github-actions/renderer.js"),
  about: {
    description: "GitHub Actions workflow — shows triggers, jobs, and environment overview.",
    usedFor: [{ label: "CI/CD automation", description: "Define automated build, test, and deploy pipelines triggered by GitHub events.", href: "https://docs.github.com/en/actions" }]
  }
};

// ../../docs/types/text/yaml/known/k8s-manifest/index.js
var K8S_API_VERSIONS = /^(v1|apps\/v1|batch\/v1|networking\.k8s\.io\/v1|rbac\.authorization\.k8s\.io\/v1|autoscaling\/v[12]|storage\.k8s\.io\/v1|policy\/v1|apiextensions\.k8s\.io\/v1|cert-manager\.io\/v1)/;
var K8S_KINDS = /* @__PURE__ */ new Set(["Pod", "Deployment", "ReplicaSet", "StatefulSet", "DaemonSet", "Job", "CronJob", "Service", "Ingress", "ConfigMap", "Secret", "PersistentVolume", "PersistentVolumeClaim", "ServiceAccount", "Role", "ClusterRole", "RoleBinding", "ClusterRoleBinding", "Namespace", "NetworkPolicy", "HorizontalPodAutoscaler", "CustomResourceDefinition"]);
var k8s_manifest_default = {
  id: "k8s-manifest",
  label: "Kubernetes manifest",
  match: (intake, baseType) => {
    if (baseType.id !== "yaml" && baseType.id !== "docker-compose") return false;
    const text = intake.textSample || intake.text || "";
    if (text.includes("cert-manager.io/")) return false;
    if (!/^apiVersion\s*:/m.test(text)) return false;
    if (!/^kind\s*:/m.test(text)) return false;
    if (!/^metadata\s*:/m.test(text)) return false;
    const apiMatch = text.match(/^apiVersion\s*:\s*(.+)/m);
    const kindMatch = text.match(/^kind\s*:\s*(\w+)/m);
    if (!apiMatch && !kindMatch) return false;
    const api = (apiMatch?.[1] || "").trim();
    const kind = (kindMatch?.[1] || "").trim();
    return K8S_API_VERSIONS.test(api) || K8S_KINDS.has(kind);
  },
  loadRenderer: () => import("../types/text/yaml/known/k8s-manifest/renderer.js"),
  about: {
    description: "Kubernetes manifest — shows resource kind, metadata, and spec summary.",
    usedFor: [{ label: "Container orchestration", description: "Define Kubernetes resources: Deployments, Services, ConfigMaps, Ingress, etc.", href: "https://kubernetes.io/docs/concepts/overview/working-with-objects/" }]
  }
};

// ../../docs/types/text/yaml/known/k8s-rbac/index.js
var k8s_rbac_default = {
  id: "k8s-rbac",
  label: "Kubernetes RBAC",
  match(intake, baseType) {
    if (baseType?.id !== "yaml") return false;
    const t = intake.text || intake.textSample || "";
    return /kind:\s+(Cluster)?(Role|RoleBinding)/.test(t) && t.includes("rbac.authorization.k8s.io");
  },
  loadRenderer: () => import("../types/text/yaml/known/k8s-rbac/renderer.js"),
  about: {
    description: "Kubernetes RBAC — visualises Roles, ClusterRoles, RoleBindings, and ClusterRoleBindings with color-coded verb chips.",
    usedFor: [{ label: "Access control", description: "Define Kubernetes RBAC policies: Roles, ClusterRoles, and their bindings.", href: "https://kubernetes.io/docs/reference/access-authn-authz/rbac/" }]
  }
};

// ../../docs/types/text/yaml/known/k8s-network-policy/index.js
var k8s_network_policy_default = {
  id: "k8s-network-policy",
  label: "Kubernetes NetworkPolicy",
  match(intake, baseType) {
    if (baseType?.id !== "yaml") return false;
    const t = intake.text || intake.textSample || "";
    return /kind:\s+NetworkPolicy/.test(t) && t.includes("networking.k8s.io");
  },
  loadRenderer: () => import("../types/text/yaml/known/k8s-network-policy/renderer.js"),
  about: {
    description: "Kubernetes NetworkPolicy — shows pod selector, ingress rules, egress rules, and blocked-all indicators.",
    usedFor: [{ label: "Network segmentation", description: "Control pod-to-pod and pod-to-external traffic with Kubernetes NetworkPolicies.", href: "https://kubernetes.io/docs/concepts/services-networking/network-policies/" }]
  }
};

// ../../docs/types/text/yaml/known/k8s-hpa/index.js
var k8s_hpa_default = {
  id: "k8s-hpa",
  label: "Kubernetes HPA",
  match(intake, baseType) {
    if (baseType?.id !== "yaml") return false;
    const t = intake.text || intake.textSample || "";
    return /kind:\s+HorizontalPodAutoscaler/.test(t) && t.includes("autoscaling");
  },
  loadRenderer: () => import("../types/text/yaml/known/k8s-hpa/renderer.js"),
  about: {
    description: "Kubernetes HorizontalPodAutoscaler — shows target workload, replica range, and metric thresholds with a visual scale bar.",
    usedFor: [{ label: "Auto-scaling", description: "Automatically scale Kubernetes workloads based on CPU, memory, or custom metrics.", href: "https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/" }]
  }
};

// ../../docs/types/text/yaml/known/k8s-ingress/index.js
var k8s_ingress_default = {
  id: "k8s-ingress",
  label: "Kubernetes Ingress",
  match(intake, baseType) {
    if (baseType?.id !== "yaml") return false;
    const t = intake.text || intake.textSample || "";
    return /kind:\s+Ingress\b/.test(t) && (t.includes("networking.k8s.io") || t.includes("extensions/v1beta1"));
  },
  loadRenderer: () => import("../types/text/yaml/known/k8s-ingress/renderer.js"),
  about: {
    description: "Kubernetes Ingress — shows ingress class, TLS hosts, host→path→service routing table, and annotations.",
    usedFor: [{ label: "HTTP routing", description: "Expose HTTP/HTTPS routes from outside the cluster to services within the cluster.", href: "https://kubernetes.io/docs/concepts/services-networking/ingress/" }]
  }
};

// ../../docs/types/text/yaml/known/pubspec/index.js
var plugin2 = {
  id: "pubspec",
  label: "pubspec.yaml",
  tags: ["dart", "flutter", "pubspec"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "pubspec.yaml";
  },
  loadRenderer: () => import("../types/text/yaml/known/pubspec/renderer.js")
};
var pubspec_default = plugin2;

// ../../docs/types/text/yaml/known/pubspec-lock/index.js
var plugin3 = {
  id: "pubspec-lock",
  label: "pubspec.lock",
  tags: ["dart", "flutter", "pubspec", "lock"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "pubspec.lock";
  },
  loadRenderer: () => import("../types/text/yaml/known/pubspec-lock/renderer.js")
};
var pubspec_lock_default = plugin3;

// ../../docs/types/text/toml/known/netlify/index.js
var netlify_default = {
  id: "netlify-toml",
  label: "Netlify Config",
  match: (intake) => (intake.name || intake.filename || "").split("/").pop().toLowerCase() === "netlify.toml",
  loadRenderer: () => import("../types/text/toml/known/netlify/renderer.js"),
  about: {
    description: "Netlify deployment configuration — build command, publish directory, redirects, and environment variables.",
    usedFor: [
      { label: "Static sites", description: "Build and deploy static websites and SPAs to Netlify" }
    ]
  }
};

// ../../docs/types/text/json/known/vercel/index.js
var plugin4 = {
  id: "vercel-json",
  label: "Vercel",
  tags: ["vercel", "deploy", "paas"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "vercel.json" || n === ".vercel.json";
  },
  loadRenderer: () => import("../types/text/json/known/vercel/renderer.js"),
  about: {
    description: "Vercel deployment configuration — framework preset, build output, routes/rewrites, and environment variables.",
    usedFor: [
      { label: "Vercel deployments", description: "Configure how Vercel builds and routes your project", href: "https://vercel.com/docs/projects/project-configuration" }
    ]
  }
};
var vercel_default = plugin4;

// ../../docs/types/text/toml/known/pyproject/index.js
var pyproject_default = {
  id: "pyproject-toml",
  label: "pyproject.toml",
  match: (intake, baseType) => baseType.id === "toml" && /(^|\/)pyproject\.toml$/i.test(intake.filename || ""),
  loadRenderer: () => import("../types/text/toml/known/pyproject/renderer.js"),
  about: {
    description: "Python project configuration (PEP 517/518/621) — build system, dependencies, and tool settings in a single TOML file.",
    usedFor: [{ label: "Python projects", description: "Used by pip, poetry, hatch, PDM, and other Python packaging tools", href: "https://peps.python.org/pep-0621/" }]
  }
};

// ../../docs/types/text/known/npmrc/index.js
var npmrc_default = {
  id: "npmrc",
  label: ".npmrc",
  match: (intake) => /(^|\/)\.npmrc$/i.test(intake.filename || ""),
  loadRenderer: () => import("../types/text/known/npmrc/renderer.js"),
  about: {
    description: "npm configuration file — controls registry, authentication, proxy settings, and package installation behaviour.",
    usedFor: [{ label: "npm / Node.js projects", description: "Per-project or per-user npm settings", href: "https://docs.npmjs.com/cli/v9/configuring-npm/npmrc" }]
  }
};

// ../../docs/types/text/json/known/renovate/index.js
var renovate_default = {
  id: "renovate",
  label: "Renovate config",
  match: (intake, baseType) => {
    if (baseType.id !== "json") return false;
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return name === "renovate.json" || name === "renovate.json5" || name === ".renovaterc" || name === ".renovaterc.json";
  },
  loadRenderer: () => import("../types/text/json/known/renovate/renderer.js"),
  about: {
    description: "Renovate dependency update bot configuration — controls how automated PRs are created for package updates.",
    usedFor: [{ label: "Dependency automation", description: "Automated dependency updates via Mend Renovate bot", href: "https://docs.renovatebot.com/configuration-options/" }]
  }
};

// ../../docs/types/text/json/known/prettierrc/index.js
var prettierrc_default = {
  id: "prettierrc",
  label: "Prettier config",
  match: (intake, baseType) => {
    if (baseType.id !== "json") return false;
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return [".prettierrc", ".prettierrc.json", ".prettierrc.jsonc", "prettier.config.json"].includes(name);
  },
  loadRenderer: () => import("../types/text/json/known/prettierrc/renderer.js"),
  about: {
    description: "Prettier code formatter configuration — controls indentation, quotes, trailing commas, and per-file-type overrides.",
    usedFor: [{ label: "Code formatting", description: "Opinionated code formatter for JS/TS/CSS/HTML/JSON and more", href: "https://prettier.io/docs/en/configuration.html" }]
  }
};

// ../../docs/types/text/json/known/turbo/index.js
var plugin5 = {
  id: "turbo-json",
  label: "Turborepo",
  tags: ["turborepo", "monorepo", "build"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "turbo.json";
  },
  renderer: () => import("../types/text/json/known/turbo/renderer.js"),
  // Legacy aliases for registry compatibility
  loadRenderer: () => import("../types/text/json/known/turbo/renderer.js"),
  about: {
    description: "Turborepo build system configuration — defines tasks, caching, and pipeline dependencies for monorepos.",
    usedFor: [{ label: "Monorepo builds", description: "High-performance build system for JavaScript/TypeScript monorepos", href: "https://turbo.build/repo/docs/reference/configuration" }]
  }
};
var turbo_default = plugin5;

// ../../docs/types/text/yaml/known/dependabot/index.js
var dependabot_default = {
  id: "dependabot",
  label: "Dependabot config",
  match: (intake, baseType) => {
    if (!["yaml", "docker-compose", "github-actions"].includes(baseType.id)) return false;
    const path = (intake.filename || "").toLowerCase();
    const name = path.split("/").pop();
    return path.endsWith(".github/dependabot.yml") || path.endsWith(".github/dependabot.yaml") || name === "dependabot.yml" || name === "dependabot.yaml";
  },
  loadRenderer: () => import("../types/text/yaml/known/dependabot/renderer.js"),
  about: {
    description: "GitHub Dependabot configuration — automates dependency updates by opening PRs for new package versions.",
    usedFor: [{ label: "Dependency automation", description: "GitHub native dependency update bot", href: "https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuration-options-for-the-dependabot.yml-file" }]
  }
};

// ../../docs/types/text/json/known/eslint/index.js
var eslint_default = {
  id: "eslint",
  label: "ESLint config",
  match: (intake, baseType) => {
    if (baseType.id !== "json") return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return [".eslintrc", ".eslintrc.json", ".eslintrc.js", "eslint.config.json"].includes(name);
  },
  loadRenderer: () => import("../types/text/json/known/eslint/renderer.js"),
  about: {
    description: "ESLint static analysis configuration — defines parser, plugins, rules, and per-file overrides for JavaScript/TypeScript linting.",
    usedFor: [{ label: "JavaScript linting", description: "Pluggable linter for JS/TS code quality and style", href: "https://eslint.org/docs/latest/use/configure/" }]
  }
};

// ../../docs/types/text/json/known/jest/index.js
var jest_default = {
  id: "jest",
  label: "Jest config",
  match: (intake, baseType) => {
    if (baseType.id !== "json") return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return ["jest.config.json", "jest.config.js", ".jest.config.json"].includes(name);
  },
  loadRenderer: () => import("../types/text/json/known/jest/renderer.js"),
  about: {
    description: "Jest test framework configuration — controls test environment, transforms, coverage thresholds, and module resolution.",
    usedFor: [{ label: "JavaScript testing", description: "Delightful JavaScript testing framework with a focus on simplicity", href: "https://jestjs.io/docs/configuration" }]
  }
};

// ../../docs/types/text/json/known/stylelint/index.js
var stylelint_default = {
  id: "stylelint",
  label: "Stylelint config",
  match: (intake, baseType) => {
    if (baseType.id !== "json") return false;
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return [".stylelintrc", ".stylelintrc.json", ".stylelintrc.jsonc", "stylelint.config.json"].includes(name);
  },
  loadRenderer: () => import("../types/text/json/known/stylelint/renderer.js"),
  about: {
    description: "Stylelint CSS/SCSS linter configuration — defines rules and plugins for stylesheet code quality.",
    usedFor: [{ label: "CSS linting", description: "Mighty CSS linter for avoiding errors and enforcing conventions", href: "https://stylelint.io/user-guide/configure" }]
  }
};

// ../../docs/types/text/json/known/babel/index.js
var babel_default = {
  id: "babel",
  label: "Babel config",
  match: (intake, baseType) => {
    if (baseType.id !== "json") return false;
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return name === "babel.config.json";
  },
  loadRenderer: () => import("../types/text/json/known/babel/renderer.js"),
  about: {
    description: "Babel JavaScript compiler configuration — defines presets and plugins for transpiling modern JS/TS syntax.",
    usedFor: [{ label: "JS transpilation", description: "Toolchain for converting ECMAScript 2015+ code into a backwards compatible version", href: "https://babeljs.io/docs/configuration" }]
  }
};

// ../../docs/types/text/json/known/babelrc/index.js
var plugin6 = {
  id: "babelrc",
  label: ".babelrc",
  tags: ["babel", "javascript", "transpiler"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === ".babelrc" || n === ".babelrc.json";
  },
  renderer: () => import("../types/text/json/known/babelrc/renderer.js"),
  loadRenderer: () => import("../types/text/json/known/babelrc/renderer.js"),
  about: {
    description: ".babelrc — Babel JavaScript compiler configuration: defines presets, plugins, and environment-specific transpilation overrides.",
    usedFor: [{ label: "JS transpilation", description: "Per-project Babel config in JSON format, scoped to its file location", href: "https://babeljs.io/docs/configuration" }]
  }
};

// ../../docs/types/text/known/jest-config/index.js
var plugin7 = {
  id: "jest-config",
  label: "Jest Config",
  tags: ["jest", "testing", "javascript"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "jest.config.js" || n === "jest.config.ts" || n === "jest.config.mjs" || n === "jest.config.cjs";
  },
  renderer: () => import("../types/text/known/jest-config/renderer.js"),
  loadRenderer: () => import("../types/text/known/jest-config/renderer.js"),
  about: {
    description: "jest.config.js — Jest test runner configuration: defines test environment, transforms, module aliases, setup files, and coverage thresholds.",
    usedFor: [{ label: "JavaScript testing", description: "Delightful JavaScript testing framework configuration (JS/TS/ESM format)", href: "https://jestjs.io/docs/configuration" }]
  }
};

// ../../docs/types/text/json/known/commitlint/index.js
var commitlint_default = {
  id: "commitlint",
  label: "commitlint config",
  match: (intake, baseType) => {
    if (baseType.id !== "json") return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return [".commitlintrc", ".commitlintrc.json", "commitlint.config.json"].includes(name);
  },
  loadRenderer: () => import("../types/text/json/known/commitlint/renderer.js"),
  about: {
    description: "commitlint configuration — enforces conventional commit message format with configurable rules.",
    usedFor: [{ label: "Commit linting", description: "Lint commit messages to follow conventional commit standards", href: "https://commitlint.js.org/reference/configuration.html" }]
  }
};

// ../../docs/types/text/yaml/known/lefthook/index.js
var lefthook_default = {
  id: "lefthook",
  label: "Lefthook config",
  match: (intake, baseType) => {
    if (!["yaml", "docker-compose", "github-actions"].includes(baseType.id)) return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return ["lefthook.yml", "lefthook.yaml", ".lefthook.yml", ".lefthook.yaml"].includes(name);
  },
  loadRenderer: () => import("../types/text/yaml/known/lefthook/renderer.js"),
  about: {
    description: "Lefthook Git hooks manager configuration — defines commands to run at git hook stages like pre-commit and commit-msg.",
    usedFor: [{ label: "Git hooks", description: "Fast and powerful Git hooks manager for Node.js, Ruby, or any other type of projects", href: "https://evilmartians.com/products/lefthook" }]
  }
};

// ../../docs/types/text/toml/known/wrangler/index.js
var wrangler_default = {
  id: "wrangler",
  label: "Wrangler config",
  match: (intake, baseType) => {
    if (baseType.id !== "toml") return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name === "wrangler.toml";
  },
  loadRenderer: () => import("../types/text/toml/known/wrangler/renderer.js"),
  about: {
    description: "Cloudflare Workers configuration — defines your Worker name, bindings, routes, and deployment settings.",
    usedFor: [{ label: "Cloudflare Workers", description: "Serverless compute at the edge", href: "https://developers.cloudflare.com/workers/wrangler/configuration/" }]
  }
};

// ../../docs/types/text/toml/known/fly/index.js
var plugin8 = {
  id: "fly-toml",
  label: "Fly.io",
  tags: ["fly", "deploy", "paas"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "fly.toml";
  },
  loadRenderer: () => import("../types/text/toml/known/fly/renderer.js"),
  about: {
    description: "Fly.io application configuration — defines your app name, region, build, services, and scaling.",
    usedFor: [{ label: "Fly.io deployment", description: "Deploy apps globally with Fly.io", href: "https://fly.io/docs/reference/configuration/" }]
  }
};
var fly_default = plugin8;

// ../../docs/types/text/toml/known/cliff/index.js
var plugin9 = {
  id: "cliff-toml",
  label: "cliff.toml",
  tags: ["git-cliff", "changelog", "toml"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "cliff.toml";
  },
  renderer: () => import("../types/text/toml/known/cliff/renderer.js"),
  loadRenderer: () => import("../types/text/toml/known/cliff/renderer.js"),
  about: {
    description: "git-cliff changelog generator configuration — defines templates, commit parsers, and output format.",
    usedFor: [{ label: "Changelog generation", description: "Highly customizable changelog generator", href: "https://git-cliff.org/docs/configuration" }]
  }
};
var cliff_default = plugin9;

// ../../docs/types/text/json/known/releaserc/index.js
var releaserc_default = {
  id: "releaserc",
  label: "semantic-release config",
  match: (intake, baseType) => {
    if (baseType.id !== "json") return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return [".releaserc", ".releaserc.json", "release.config.json"].includes(name);
  },
  loadRenderer: () => import("../types/text/json/known/releaserc/renderer.js"),
  about: {
    description: "semantic-release configuration — automates versioning and package publishing based on conventional commits.",
    usedFor: [{ label: "Automated releases", description: "Fully automated semantic versioning and publishing", href: "https://semantic-release.gitbook.io/semantic-release/usage/configuration" }]
  }
};

// ../../docs/types/text/json/known/lerna/index.js
var lerna_default = {
  id: "lerna",
  label: "Lerna config",
  match: (intake, baseType) => {
    if (baseType.id !== "json") return false;
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return name === "lerna.json";
  },
  loadRenderer: () => import("../types/text/json/known/lerna/renderer.js"),
  about: {
    description: "Lerna monorepo configuration — manages versioning and publishing of multiple npm packages in a single repository.",
    usedFor: [{ label: "Monorepo management", description: "JavaScript/TypeScript monorepo tool for versioning and publishing", href: "https://lerna.js.org/" }]
  }
};

// ../../docs/types/text/json/known/nx/index.js
var nx_default = {
  id: "nx",
  label: "Nx config",
  match: (intake, baseType) => {
    if (baseType.id !== "json") return false;
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return name === "nx.json";
  },
  loadRenderer: () => import("../types/text/json/known/nx/renderer.js"),
  about: {
    description: "Nx monorepo workspace configuration — defines targets, task runners, affected computation, and plugin settings.",
    usedFor: [{ label: "Monorepo tooling", description: "Smart, extensible build framework for monorepos", href: "https://nx.dev/reference/nx-json" }]
  }
};

// ../../docs/types/text/json/known/biome/index.js
var biome_default = {
  id: "biome",
  label: "Biome config",
  match: (intake, baseType) => {
    if (baseType.id !== "json") return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name === "biome.json" || name === "biome.jsonc";
  },
  loadRenderer: () => import("../types/text/json/known/biome/renderer.js"),
  about: {
    description: "Biome unified toolchain configuration — formatter, linter, and import organizer for JavaScript, TypeScript, and CSS.",
    usedFor: [{ label: "Code formatting & linting", description: "Fast formatter and linter replacing Prettier and ESLint", href: "https://biomejs.dev/reference/configuration/" }]
  }
};

// ../../docs/types/text/yaml/known/codecov/index.js
var codecov_default = {
  id: "codecov",
  label: "Codecov config",
  match: (intake, baseType) => {
    if (!["yaml", "docker-compose", "github-actions"].includes(baseType.id)) return false;
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return ["codecov.yml", "codecov.yaml", ".codecov.yml"].includes(name);
  },
  loadRenderer: () => import("../types/text/yaml/known/codecov/renderer.js"),
  about: {
    description: "Codecov CI coverage configuration — sets coverage targets, flags, ignore paths, and PR comment behavior.",
    usedFor: [{ label: "Coverage reporting", description: "Code coverage reporting and enforcement for CI/CD", href: "https://docs.codecov.com/docs/codecovyml-reference" }]
  }
};

// ../../docs/types/text/yaml/known/serverless/index.js
var serverless_default = {
  id: "serverless",
  label: "Serverless Framework config",
  match: (intake, baseType) => {
    if (!["yaml", "docker-compose", "github-actions"].includes(baseType.id)) return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return ["serverless.yml", "serverless.yaml"].includes(name);
  },
  loadRenderer: () => import("../types/text/yaml/known/serverless/renderer.js"),
  about: {
    description: "Serverless Framework configuration — defines cloud functions, providers, events, and infrastructure as code.",
    usedFor: [{ label: "Serverless deployment", description: "Deploy cloud functions to AWS Lambda, Azure Functions, Google Cloud, and more", href: "https://www.serverless.com/framework/docs/providers/aws/guide/serverless.yml" }]
  }
};

// ../../docs/types/text/yaml/known/azure-pipelines/index.js
var azure_pipelines_default = {
  id: "azure-pipelines",
  label: "Azure Pipelines config",
  match: (intake, baseType) => {
    if (!["yaml", "docker-compose", "github-actions"].includes(baseType.id)) return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return ["azure-pipelines.yml", "azure-pipelines.yaml"].includes(name);
  },
  loadRenderer: () => import("../types/text/yaml/known/azure-pipelines/renderer.js"),
  about: {
    description: "Azure DevOps Pipelines configuration — defines CI/CD stages, jobs, steps, triggers, and pool settings.",
    usedFor: [{ label: "Azure CI/CD", description: "Build, test, and deploy with Azure DevOps Pipelines", href: "https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema" }]
  }
};

// ../../docs/types/text/json/known/vscode-settings/index.js
var vscode_settings_default = {
  id: "vscode-settings",
  label: "VS Code settings",
  match: (intake, baseType) => {
    if (baseType.id !== "json") return false;
    const p = (intake.filename || "").toLowerCase().replace(/\\/g, "/");
    const name = p.split("/").pop();
    return p.includes("/.vscode/") && name === "settings.json" || name === "vscode-settings.json";
  },
  loadRenderer: () => import("../types/text/json/known/vscode-settings/renderer.js"),
  about: {
    description: "VS Code workspace settings — per-project editor configuration, formatter defaults, and extension settings.",
    usedFor: [{ label: "Editor config", description: "Workspace-level VS Code settings", href: "https://code.visualstudio.com/docs/getstarted/settings" }]
  }
};

// ../../docs/types/text/json/known/vscode-extensions/index.js
var vscode_extensions_default = {
  id: "vscode-extensions",
  label: "VS Code extensions",
  match: (intake, baseType) => {
    if (baseType.id !== "json") return false;
    const p = (intake.filename || "").toLowerCase().replace(/\\/g, "/");
    const name = p.split("/").pop();
    return p.includes("/.vscode/") && name === "extensions.json" || name === "vscode-extensions.json";
  },
  loadRenderer: () => import("../types/text/json/known/vscode-extensions/renderer.js"),
  about: {
    description: "VS Code recommended extensions — lists extensions the workspace suggests installing for contributors.",
    usedFor: [{ label: "Extension recommendations", description: "Workspace extension suggestions", href: "https://code.visualstudio.com/docs/editor/extension-marketplace#_workspace-recommended-extensions" }]
  }
};

// ../../docs/types/text/json/known/vscode-launch/index.js
var vscode_launch_default = {
  id: "vscode-launch",
  label: "VS Code launch config",
  match: (intake, baseType) => {
    if (baseType.id !== "json") return false;
    const p = (intake.filename || "").toLowerCase().replace(/\\/g, "/");
    const name = p.split("/").pop();
    return p.includes("/.vscode/") && name === "launch.json" || name === "vscode-launch.json";
  },
  loadRenderer: () => import("../types/text/json/known/vscode-launch/renderer.js"),
  about: {
    description: "VS Code debug launch configurations — defines how to start and attach the debugger for different scenarios.",
    usedFor: [{ label: "Debugging", description: "VS Code debugger launch and attach configs", href: "https://code.visualstudio.com/docs/editor/debugging#_launch-configurations" }]
  }
};

// ../../docs/types/text/json/known/vscode-tasks/index.js
var vscode_tasks_default = {
  id: "vscode-tasks",
  label: "VS Code tasks",
  match: (intake, baseType) => {
    if (baseType.id !== "json") return false;
    const p = (intake.filename || "").toLowerCase().replace(/\\/g, "/");
    const name = p.split("/").pop();
    return p.includes("/.vscode/") && name === "tasks.json" || name === "vscode-tasks.json";
  },
  loadRenderer: () => import("../types/text/json/known/vscode-tasks/renderer.js"),
  about: {
    description: "VS Code tasks configuration — automates build, test, lint, and other shell commands from within the editor.",
    usedFor: [{ label: "Task automation", description: "VS Code integrated task runner", href: "https://code.visualstudio.com/docs/editor/tasks" }]
  }
};

// ../../docs/types/text/yaml/known/travis/index.js
var travis_default = {
  id: "travis",
  label: "Travis CI config",
  match: (intake, baseType) => {
    if (!["yaml", "docker-compose", "github-actions"].includes(baseType.id)) return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name === ".travis.yml" || name === "travis.yml";
  },
  loadRenderer: () => import("../types/text/yaml/known/travis/renderer.js"),
  about: {
    description: "Travis CI configuration — shows language, build matrix, stages, and branch triggers.",
    usedFor: [{ label: "CI/CD", description: "Continuous integration with Travis CI", href: "https://docs.travis-ci.com/user/travis-yml-overview/" }]
  }
};

// ../../docs/types/text/yaml/known/circleci/index.js
var plugin10 = {
  id: "circleci-config",
  label: "CircleCI Config",
  tags: ["circleci", "ci", "yaml"],
  match(intake, baseType) {
    if (baseType && !["yaml", "docker-compose", "github-actions"].includes(baseType.id)) return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const path = (intake.name || intake.filename || "").toLowerCase();
    if (n === "config.yml" && path.includes(".circleci")) return true;
    if ([".circleci.yml", "circleci.yml", "circleci-config.yml"].includes(n)) return true;
    const text = intake.textSample || intake.text || "";
    return n === "config.yml" && text.includes("version:") && (text.includes("orbs:") || text.includes("jobs:") && text.includes("workflows:"));
  },
  renderer: () => import("../types/text/yaml/known/circleci/renderer.js"),
  loadRenderer: () => import("../types/text/yaml/known/circleci/renderer.js"),
  about: {
    description: "CircleCI configuration — shows version, orbs, workflows, and jobs overview.",
    usedFor: [{ label: "CI/CD", description: "Cloud-native continuous integration with CircleCI", href: "https://circleci.com/docs/configuration-reference/" }]
  }
};

// ../../docs/types/text/yaml/known/amplify/index.js
var amplify_default = {
  id: "amplify",
  label: "AWS Amplify config",
  match: (intake, baseType) => {
    if (!["yaml", "docker-compose", "github-actions"].includes(baseType.id)) return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name === "amplify.yml" || name === "amplify.yaml";
  },
  loadRenderer: () => import("../types/text/yaml/known/amplify/renderer.js"),
  about: {
    description: "AWS Amplify build specification — defines preBuild, build, and postBuild phases.",
    usedFor: [{ label: "AWS hosting", description: "Fullstack CI/CD with AWS Amplify Hosting", href: "https://docs.aws.amazon.com/amplify/latest/userguide/build-settings.html" }]
  }
};

// ../../docs/types/text/yaml/known/codebuild/index.js
var codebuild_default = {
  id: "codebuild",
  label: "AWS CodeBuild buildspec",
  match: (intake, baseType) => {
    if (!["yaml", "docker-compose", "github-actions"].includes(baseType.id)) return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name === "buildspec.yml" || name === "buildspec.yaml" || /^buildspec\..+\.ya?ml$/.test(name);
  },
  loadRenderer: () => import("../types/text/yaml/known/codebuild/renderer.js"),
  about: {
    description: "AWS CodeBuild buildspec — defines install, pre_build, build, and post_build phases.",
    usedFor: [{ label: "AWS CI/CD", description: "Build and test with AWS CodeBuild", href: "https://docs.aws.amazon.com/codebuild/latest/userguide/build-spec-ref.html" }]
  }
};

// ../../docs/types/text/json/known/jsconfig/index.js
var jsconfig_default = {
  id: "jsconfig",
  label: "jsconfig.json",
  match: (intake, baseType) => {
    if (baseType.id !== "json") return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name === "jsconfig.json";
  },
  loadRenderer: () => import("../types/text/json/known/jsconfig/renderer.js"),
  about: {
    description: "jsconfig.json — JavaScript project configuration for editor IntelliSense (based on TypeScript compiler options).",
    usedFor: [{ label: "JS project config", description: "Configure editor IntelliSense for JavaScript projects", href: "https://code.visualstudio.com/docs/languages/jsconfig" }]
  }
};

// ../../docs/types/text/json/known/deno/index.js
var deno_default = {
  id: "deno-json",
  label: "deno.json config",
  match: (intake, baseType) => {
    if (baseType.id !== "json") return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return ["deno.json", "deno.jsonc"].includes(name);
  },
  loadRenderer: () => import("../types/text/json/known/deno/renderer.js"),
  about: {
    description: "Deno configuration — import map, tasks, lint/fmt settings, and compiler options.",
    usedFor: [{ label: "Deno runtime", description: "Configure Deno projects including import maps and built-in tasks", href: "https://docs.deno.com/runtime/fundamentals/configuration/" }]
  }
};

// ../../docs/types/text/known/nvmrc/index.js
var nvmrc_default = {
  id: "nvmrc",
  label: ".nvmrc",
  match: (intake) => /(^|\/)\.?nvmrc$/i.test(intake.filename || ""),
  loadRenderer: () => import("../types/text/known/nvmrc/renderer.js"),
  about: {
    description: ".nvmrc — pins the Node.js version for the project, used by nvm and compatible tooling.",
    usedFor: [{ label: "Node version pin", description: "Automatically switch to the correct Node.js version", href: "https://github.com/nvm-sh/nvm#nvmrc" }]
  }
};

// ../../docs/types/text/known/browserslist/index.js
var browserslist_default = {
  id: "browserslistrc",
  label: ".browserslistrc",
  match: (intake) => {
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return [".browserslistrc", "browserslistrc", "browserslist"].includes(name);
  },
  loadRenderer: () => import("../types/text/known/browserslist/renderer.js"),
  about: {
    description: ".browserslistrc — defines target browsers for Autoprefixer, Babel, ESLint, and other frontend tools.",
    usedFor: [{ label: "Browser targets", description: "Shared config for compatible browser targets across frontend tools", href: "https://browsersl.ist/" }]
  }
};

// ../../docs/types/text/yaml/known/pre-commit/index.js
var pre_commit_default = {
  id: "pre-commit",
  label: "pre-commit config",
  match: (intake, baseType) => {
    if (!["yaml", "docker-compose", "github-actions"].includes(baseType.id)) return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return [
      ".pre-commit-config.yaml",
      ".pre-commit-config.yml",
      "pre-commit-config.yaml",
      "pre-commit-config.yml"
    ].includes(name);
  },
  loadRenderer: () => import("../types/text/yaml/known/pre-commit/renderer.js"),
  about: {
    description: "pre-commit configuration — lists repos and hooks that enforce code quality on git commit.",
    usedFor: [{ label: "Git hooks", description: "Run automated checks before each commit", href: "https://pre-commit.com" }]
  }
};

// ../../docs/types/text/json/known/pyrightconfig/index.js
var pyrightconfig_default = {
  id: "pyrightconfig",
  label: "pyrightconfig.json",
  match: (intake, baseType) => {
    if (baseType.id !== "json") return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name === "pyrightconfig.json";
  },
  loadRenderer: () => import("../types/text/json/known/pyrightconfig/renderer.js"),
  about: {
    description: "Pyright configuration — strict Python static type checking settings for VS Code and language servers.",
    usedFor: [{ label: "Python type checking", description: "Static type analysis for Python with Pyright", href: "https://github.com/microsoft/pyright/blob/main/docs/configuration.md" }]
  }
};

// ../../docs/types/text/known/tox/index.js
var tox_default = {
  id: "tox",
  label: "tox.ini",
  match: (intake) => {
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name === "tox.ini";
  },
  loadRenderer: () => import("../types/text/known/tox/renderer.js"),
  about: {
    description: "tox.ini — Python test automation: defines test environments, dependencies, and commands across multiple Python versions.",
    usedFor: [{ label: "Python testing", description: "Run tests in isolated environments across Python versions", href: "https://tox.wiki" }]
  }
};

// ../../docs/types/text/known/tox-ini/index.js
var plugin11 = {
  id: "tox-ini",
  label: "tox Config",
  tags: ["tox", "python", "testing", "virtualenv"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "tox.ini") return true;
    const t = intake.text || "";
    return /^\[tox\]/m.test(t) && /^envlist/m.test(t);
  },
  renderer: () => import("../types/text/known/tox-ini/renderer.js"),
  loadRenderer: () => import("../types/text/known/tox-ini/renderer.js"),
  about: {
    description: "tox.ini — Python test automation: defines test environments, dependencies, and commands across multiple Python versions.",
    usedFor: [{ label: "tox", description: "Automated Python testing across multiple interpreters and environments", href: "https://tox.wiki" }]
  }
};

// ../../docs/types/text/known/pytest-ini/index.js
var plugin12 = {
  id: "pytest-ini",
  label: "pytest Config",
  tags: ["pytest", "python", "testing"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "pytest.ini") return true;
    if (n === "setup.cfg") return false;
    const t = intake.text || "";
    return /^\[pytest\]/m.test(t) || /^\[tool:pytest\]/m.test(t);
  },
  renderer: () => import("../types/text/known/pytest-ini/renderer.js"),
  loadRenderer: () => import("../types/text/known/pytest-ini/renderer.js"),
  about: {
    description: "pytest.ini — pytest configuration: test paths, markers, addopts, coverage thresholds, and warning filters.",
    usedFor: [{ label: "pytest", description: "Python testing framework configuration", href: "https://docs.pytest.org/en/stable/reference/customize.html" }]
  }
};

// ../../docs/types/text/known/mypy-ini/index.js
var mypy_ini_default = {
  id: "mypy-ini",
  label: "mypy config",
  match: (intake) => {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (name === "mypy.ini" || name === ".mypy.ini") return true;
    if (name === "setup.cfg") return false;
    const text = intake.text || "";
    return /^\[mypy\]/m.test(text);
  },
  loadRenderer: () => import("../types/text/known/mypy-ini/renderer.js"),
  about: {
    description: "mypy.ini — mypy static type checker configuration for Python, including strictness flags and per-module overrides.",
    usedFor: [{ label: "Python type checking", description: "Optional static type checking for Python with mypy.", href: "https://mypy.readthedocs.io/en/stable/config_file.html" }]
  }
};

// ../../docs/types/text/json/known/angular/index.js
var angular_default = {
  id: "angular",
  label: "Angular workspace",
  match: (intake, baseType) => {
    if (baseType.id !== "json") return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name === "angular.json";
  },
  loadRenderer: () => import("../types/text/json/known/angular/renderer.js"),
  about: { description: "Angular CLI workspace configuration" }
};

// ../../docs/types/text/json/known/capacitor/index.js
var capacitor_default = {
  id: "capacitor",
  label: "capacitor.config.json",
  match: (intake, baseType) => {
    if (baseType.id !== "json") return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name === "capacitor.config.json";
  },
  loadRenderer: () => import("../types/text/json/known/capacitor/renderer.js"),
  about: {
    description: "capacitor.config.json — Capacitor framework configuration for building native iOS/Android apps from web projects.",
    usedFor: [{ label: "Mobile app config", description: "Cross-platform native mobile app configuration with Capacitor", href: "https://capacitorjs.com/docs/config" }]
  }
};

// ../../docs/types/text/json/known/nycrc/index.js
var nycrc_default = {
  id: "nycrc",
  label: ".nycrc.json",
  match: (intake, baseType) => {
    if (baseType.id !== "json") return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name === ".nycrc.json" || name === "nycrc.json";
  },
  loadRenderer: () => import("../types/text/json/known/nycrc/renderer.js"),
  about: {
    description: ".nycrc.json — NYC (Istanbul) code coverage configuration: thresholds, reporters, include/exclude patterns.",
    usedFor: [{ label: "Coverage config", description: "Istanbul/nyc code coverage thresholds and reporter configuration", href: "https://github.com/istanbuljs/nyc" }]
  }
};

// ../../docs/types/text/json/known/devcontainer/index.js
var devcontainer_default = {
  id: "devcontainer",
  label: "Dev Container",
  match: (intake, baseType) => {
    if (baseType.id !== "json") return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name === "devcontainer.json" || name === ".devcontainer.json";
  },
  loadRenderer: () => import("../types/text/json/known/devcontainer/renderer.js"),
  about: { description: "VS Code / GitHub Codespaces development container configuration" }
};

// ../../docs/types/text/json/known/knip/index.js
var knip_default = {
  id: "knip",
  label: "Knip config",
  match: (intake, baseType) => {
    if (baseType.id !== "json") return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name === "knip.json" || name === ".knip.json";
  },
  loadRenderer: () => import("../types/text/json/known/knip/renderer.js"),
  about: { description: "Knip dead code and unused dependency finder configuration" }
};

// ../../docs/types/text/json/known/mocha/index.js
var mocha_default = {
  id: "mocha",
  label: "Mocha config",
  match: (intake, baseType) => {
    if (baseType.id !== "json") return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name === ".mocharc.json" || name === ".mocharc.jsonc";
  },
  loadRenderer: () => import("../types/text/json/known/mocha/renderer.js"),
  about: { description: "Mocha JavaScript test runner configuration" }
};

// ../../docs/types/text/yaml/known/gitlab-ci/index.js
var gitlab_ci_default = {
  id: "gitlab-ci",
  label: "GitLab CI",
  match: (intake, baseType) => {
    if (baseType.id !== "yaml") return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name === ".gitlab-ci.yml";
  },
  loadRenderer: () => import("../types/text/yaml/known/gitlab-ci/renderer.js"),
  about: { description: "GitLab CI/CD pipeline configuration" }
};

// ../../docs/types/text/yaml/known/pnpm-workspace/index.js
var pnpm_workspace_default = {
  id: "pnpm-workspace",
  label: "pnpm workspace",
  match: (intake, baseType) => {
    if (baseType.id !== "yaml") return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name === "pnpm-workspace.yaml" || name === "pnpm-workspace.yml";
  },
  loadRenderer: () => import("../types/text/yaml/known/pnpm-workspace/renderer.js"),
  about: { description: "pnpm monorepo workspace configuration" }
};

// ../../docs/types/text/json/known/package-lock/index.js
var package_lock_default = {
  id: "package-lock",
  label: "package-lock.json",
  match: (intake, baseType) => baseType.id === "json" && /(^|\/)package-lock\.json$/i.test(intake.filename || ""),
  loadRenderer: () => import("../types/text/json/known/package-lock/renderer.js")
};

// ../../docs/types/text/json/known/composer-lock/index.js
var composer_lock_default = {
  id: "composer-lock",
  label: "composer.lock",
  match: (intake, baseType) => baseType.id === "json" && /(^|\/)composer\.lock$/i.test(intake.filename || ""),
  loadRenderer: () => import("../types/text/json/known/composer-lock/renderer.js")
};

// ../../docs/types/text/yaml/known/pnpm-lock/index.js
var pnpm_lock_default = {
  id: "pnpm-lock",
  label: "pnpm-lock.yaml",
  match: (intake, baseType) => {
    if (baseType.id !== "yaml") return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name === "pnpm-lock.yaml" || name === "pnpm-lock.yml";
  },
  loadRenderer: () => import("../types/text/yaml/known/pnpm-lock/renderer.js")
};

// ../../docs/types/text/toml/known/cargo-lock/index.js
var cargo_lock_default = {
  id: "cargo-lock",
  label: "Cargo.lock",
  match: (intake, baseType) => baseType.id === "toml" && /(^|\/)Cargo\.lock$/.test(intake.filename || ""),
  loadRenderer: () => import("../types/text/toml/known/cargo-lock/renderer.js")
};

// ../../docs/types/text/toml/known/poetry-lock/index.js
var poetry_lock_default = {
  id: "poetry-lock",
  label: "poetry.lock",
  match: (intake, baseType) => baseType.id === "toml" && /(^|\/)poetry\.lock$/i.test(intake.filename || ""),
  loadRenderer: () => import("../types/text/toml/known/poetry-lock/renderer.js")
};

// ../../docs/types/text/known/go-sum/index.js
var go_sum_default = {
  id: "go-sum",
  label: "go.sum",
  match: (intake) => /(^|\/)go\.sum$/i.test(intake.filename || ""),
  loadRenderer: () => import("../types/text/known/go-sum/renderer.js")
};

// ../../docs/types/text/json/known/vitest/index.js
var vitest_default = {
  id: "vitest",
  label: "Vitest config",
  match: (intake, baseType) => {
    if (baseType.id !== "json") return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name === "vitest.config.json";
  },
  loadRenderer: () => import("../types/text/json/known/vitest/renderer.js"),
  about: {
    description: "Vitest unit test configuration — shows test match patterns, coverage thresholds, and reporters.",
    usedFor: [{ label: "Unit testing", description: "Fast Vite-native unit test runner configuration", href: "https://vitest.dev/config/" }]
  }
};

// ../../docs/types/text/json/known/graphql-config/index.js
var graphql_config_default = {
  id: "graphql-config",
  label: "GraphQL Config",
  match: (intake, baseType) => {
    if (baseType.id !== "json") return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name === "graphql.config.json" || name === ".graphqlrc.json";
  },
  loadRenderer: () => import("../types/text/json/known/graphql-config/renderer.js"),
  about: {
    description: "GraphQL Config — shows schema path, documents glob, and extensions.",
    usedFor: [{ label: "GraphQL tooling", description: "Shared config for GraphQL tools and editors", href: "https://the-guild.dev/graphql/config" }]
  }
};

// ../../docs/types/text/yaml/known/graphql-codegen/index.js
var plugin13 = {
  id: "graphql-codegen",
  label: "GraphQL Code Generator",
  tags: ["graphql", "codegen", "typescript"],
  match(intake, baseType) {
    if (!["yaml", "docker-compose", "github-actions"].includes(baseType?.id)) return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "codegen.yml" || n === "codegen.yaml" || n === ".codegenrc" || n === ".codegenrc.yml" || n === ".codegenrc.yaml";
  },
  loadRenderer: () => import("../types/text/yaml/known/graphql-codegen/renderer.js"),
  about: {
    description: "GraphQL Code Generator configuration — defines schema sources, document globs, and output targets with plugins for generating TypeScript types, resolvers, and operation-specific hooks.",
    usedFor: [{ label: "GraphQL Code Generator", description: "Generate strongly-typed TypeScript code from GraphQL schemas and operations.", href: "https://the-guild.dev/graphql/codegen" }]
  }
};
var graphql_codegen_default = plugin13;

// ../../docs/types/text/yaml/known/tspconfig/index.js
var plugin14 = {
  id: "tspconfig",
  label: "TypeSpec config",
  tags: ["typespec", "microsoft", "api", "openapi"],
  match(intake, baseType) {
    if (!["yaml", "docker-compose", "github-actions"].includes(baseType?.id)) return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "tspconfig.yaml" || n === "tspconfig.yml";
  },
  loadRenderer: () => import("../types/text/yaml/known/tspconfig/renderer.js"),
  about: {
    description: "TypeSpec compiler configuration — controls emitters (OpenAPI 3, Autorest, etc.), output directories, imports, and environment variables for API definition compilation.",
    usedFor: [{ label: "TypeSpec", description: "Microsoft's API definition language that compiles to OpenAPI, JSON Schema, gRPC, and more.", href: "https://typespec.io/docs/handbook/configuration" }]
  }
};
var tspconfig_default = plugin14;

// ../../docs/types/text/json/known/apollo/index.js
var apollo_default = {
  id: "apollo",
  label: "Apollo Config",
  match: (intake, baseType) => {
    if (baseType.id !== "json") return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name === "apollo.config.json";
  },
  loadRenderer: () => import("../types/text/json/known/apollo/renderer.js"),
  about: {
    description: "Apollo GraphQL configuration — shows client, service endpoints, and schema locations.",
    usedFor: [{ label: "Apollo Client/Server", description: "Configure Apollo GraphQL client and service definitions", href: "https://www.apollographql.com/docs/devtools/apollo-config/" }]
  }
};

// ../../docs/types/text/json/known/storybook/index.js
var storybook_default = {
  id: "storybook",
  label: "Storybook config",
  match: (intake, baseType) => {
    if (baseType.id !== "json") return false;
    const fn = intake.filename || "";
    const name = fn.split("/").pop().toLowerCase();
    if (name === "storybook.config.json" || name === "storybook.main.json") return true;
    return name === "main.json" && /\.storybook[\\/]/i.test(fn);
  },
  loadRenderer: () => import("../types/text/json/known/storybook/renderer.js"),
  about: {
    description: "Storybook configuration — shows stories glob, addons, and framework.",
    usedFor: [{ label: "Component development", description: "Storybook UI component sandbox configuration", href: "https://storybook.js.org/docs/configure" }]
  }
};

// ../../docs/types/text/yaml/known/drone/index.js
var drone_default = {
  id: "drone",
  label: "Drone CI config",
  match: (intake, baseType) => {
    if (!["yaml", "docker-compose", "github-actions"].includes(baseType.id)) return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name === ".drone.yml" || name === "drone.yml";
  },
  loadRenderer: () => import("../types/text/yaml/known/drone/renderer.js"),
  about: {
    description: "Drone CI pipeline — shows kind, steps, services, and trigger configuration.",
    usedFor: [{ label: "CI/CD", description: "Container-native CI/CD with Drone", href: "https://docs.drone.io/" }]
  }
};

// ../../docs/types/text/yaml/known/buildkite/index.js
var buildkite_default = {
  id: "buildkite",
  label: "Buildkite pipeline",
  match: (intake, baseType) => {
    if (!["yaml", "docker-compose", "github-actions"].includes(baseType.id)) return false;
    const fn = intake.filename || "";
    const name = fn.split("/").pop().toLowerCase();
    if (name === "buildkite.yml" || name === "buildkite.yaml") return true;
    return (name === "pipeline.yml" || name === "pipeline.yaml") && /\.buildkite[\\/]/i.test(fn);
  },
  loadRenderer: () => import("../types/text/yaml/known/buildkite/renderer.js"),
  about: {
    description: "Buildkite CI pipeline — shows steps, agents, and environment configuration.",
    usedFor: [{ label: "CI/CD", description: "Buildkite pipeline configuration", href: "https://buildkite.com/docs/pipelines" }]
  }
};

// ../../docs/types/text/yaml/known/skaffold/index.js
var skaffold_default = {
  id: "skaffold",
  label: "Skaffold config",
  match: (intake, baseType) => {
    if (!["yaml", "docker-compose", "github-actions"].includes(baseType.id)) return false;
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return name === "skaffold.yaml" || name === "skaffold.yml";
  },
  loadRenderer: () => import("../types/text/yaml/known/skaffold/renderer.js"),
  about: {
    description: "Google Skaffold config — shows build artifacts, deploy targets, and profiles.",
    usedBy: [{ label: "Kubernetes dev", description: "Continuous development for Kubernetes apps", href: "https://skaffold.dev/docs/" }]
  }
};

// ../../docs/types/text/yaml/known/hadolint/index.js
var hadolint_default = {
  id: "hadolint",
  label: "Hadolint config",
  match(intake, baseType) {
    if (!["yaml", "docker-compose", "github-actions"].includes(baseType?.id)) return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === ".hadolint.yaml" || n === ".hadolint.yml" || n === "hadolint.yaml";
  },
  loadRenderer: () => import("../types/text/yaml/known/hadolint/renderer.js"),
  about: {
    description: "Hadolint Dockerfile linter config — shows ignored rules, allowed registries, and failure threshold.",
    usedFor: [{ label: "Dockerfile linting", description: "Dockerfile best-practice linter configuration", href: "https://github.com/hadolint/hadolint" }]
  }
};

// ../../docs/types/text/yaml/known/helm-chart/index.js
var helm_chart_default = {
  id: "helm-chart",
  label: "Helm Chart",
  match: (intake, baseType) => {
    if (baseType.id !== "yaml") return false;
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return name === "chart.yaml" || name === "chart.yml";
  },
  loadRenderer: () => import("../types/text/yaml/known/helm-chart/renderer.js"),
  about: {
    description: "Helm chart metadata and dependency manifest.",
    usedFor: [{ label: "Kubernetes package manager", description: "Define Helm chart metadata, version, and chart dependencies.", href: "https://helm.sh/docs/topics/charts/" }]
  }
};

// ../../docs/types/text/yaml/known/kustomize/index.js
var kustomize_default = {
  id: "kustomize",
  label: "Kustomize overlay",
  match: (intake, baseType) => {
    if (baseType.id !== "yaml") return false;
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return name === "kustomization.yaml" || name === "kustomization.yml";
  },
  loadRenderer: () => import("../types/text/yaml/known/kustomize/renderer.js"),
  about: {
    description: "Kustomize overlay configuration — resources, patches, image overrides, and generators.",
    usedFor: [{ label: "Kubernetes configuration management", description: "Customize Kubernetes manifests without templates using overlays and patches.", href: "https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/" }]
  }
};

// ../../docs/types/text/yaml/known/ansible-playbook/index.js
var ansible_playbook_default = {
  id: "ansible-playbook",
  label: "Ansible playbook",
  match: (intake, baseType) => {
    if (baseType.id !== "yaml") return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    const knownNames = /* @__PURE__ */ new Set(["playbook.yml", "playbook.yaml", "site.yml", "site.yaml", "main.yml", "main.yaml"]);
    if (!knownNames.has(name) && !name.includes("ansible")) return false;
    const text = intake.textSample || intake.text || "";
    return /^\s*-?\s*hosts\s*:/m.test(text);
  },
  loadRenderer: () => import("../types/text/yaml/known/ansible-playbook/renderer.js"),
  about: {
    description: "Ansible playbook — shows plays, hosts, and task list.",
    usedFor: [{ label: "IT automation", description: "Define Ansible plays targeting hosts with ordered task lists.", href: "https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_intro.html" }]
  }
};

// ../../docs/types/text/yaml/known/ansible-inventory/index.js
var ansible_inventory_default = {
  id: "ansible-inventory",
  label: "Ansible Inventory",
  match: (intake, baseType) => {
    if (baseType?.id !== "yaml") return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    if (name === "inventory.yml" || name === "inventory.yaml" || name === "hosts.yml" || name === "hosts.yaml") return true;
    const t = intake.textSample || intake.text || "";
    return /\bhosts\s*:/.test(t) && /\bansible_host\s*:/.test(t);
  },
  loadRenderer: () => import("../types/text/yaml/known/ansible-inventory/renderer.js"),
  about: {
    description: "Ansible inventory — shows host groups, hosts, and variables.",
    usedFor: [{ label: "Infrastructure inventory", description: "Define Ansible host groups and variables.", href: "https://docs.ansible.com/ansible/latest/inventory_guide/intro_inventory.html" }]
  }
};

// ../../docs/types/text/yaml/known/ansible-requirements/index.js
var ansible_requirements_default = {
  id: "ansible-requirements",
  label: "Ansible Requirements",
  match: (intake, baseType) => {
    if (baseType?.id !== "yaml") return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    if (name !== "requirements.yml" && name !== "requirements.yaml") return false;
    const t = intake.textSample || intake.text || "";
    return t.includes("roles:") || t.includes("collections:");
  },
  loadRenderer: () => import("../types/text/yaml/known/ansible-requirements/renderer.js"),
  about: {
    description: "Ansible Galaxy requirements — lists roles and collections to install.",
    usedFor: [{ label: "Galaxy dependencies", description: "Specify Ansible Galaxy roles and collections required by your project.", href: "https://docs.ansible.com/ansible/latest/galaxy/user_guide.html" }]
  }
};

// ../../docs/types/text/yaml/known/artifactory-system/index.js
var artifactory_system_default = {
  id: "artifactory-system",
  label: "Artifactory system config",
  match(intake, baseType) {
    if (baseType?.id !== "yaml") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const t = intake.text || "";
    return n === "system.yaml" && (t.includes("artifactory") || t.includes("jfrog"));
  },
  loadRenderer: () => import("../types/text/yaml/known/artifactory-system/renderer.js"),
  about: {
    description: "JFrog Artifactory system.yaml configuration — database, security, router, and service ports.",
    usedFor: [{ label: "JFrog Artifactory", description: "Universal artifact repository manager supporting all major package formats.", href: "https://jfrog.com/help/r/jfrog-installation-setup-documentation/system-yaml-configuration-parameters" }]
  }
};

// ../../docs/types/text/known/eleventy-config/index.js
var eleventy_config_default = {
  id: "eleventy-config",
  label: "Eleventy Config",
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return name === ".eleventy.js" || name === "eleventy.config.js" || name === "eleventy.config.mjs" || name === ".eleventy.cjs";
  },
  loadRenderer: () => import("../types/text/known/eleventy-config/renderer.js"),
  about: { description: "Eleventy (11ty) static site generator configuration — defines template formats, plugins, and directory settings." }
};

// ../../docs/types/text/known/gatsby-config/index.js
var gatsby_config_default = {
  id: "gatsby-config",
  label: "Gatsby Config",
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return name === "gatsby-config.js" || name === "gatsby-config.ts" || name === "gatsby-config.mjs";
  },
  loadRenderer: () => import("../types/text/known/gatsby-config/renderer.js"),
  about: { description: "Gatsby static site generator configuration — defines site metadata, plugins, and flags." }
};

// ../../docs/types/text/known/jvm-options/index.js
var jvm_options_default = {
  id: "jvm-options",
  label: "JVM Options",
  match: (intake) => {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "jvm.options" || n === "jvm-default.options") return true;
    if (n.endsWith(".options") && n.startsWith("jvm")) return true;
    const text = intake.text || "";
    return n.endsWith(".options") && (text.includes("-Xms") || text.includes("-Xmx") || text.includes("-XX:"));
  },
  loadRenderer: () => import("../types/text/known/jvm-options/renderer.js"),
  about: { description: "JVM options file (Elasticsearch, Logstash, etc.) — heap sizing, GC configuration, system properties, and other JVM tuning flags." }
};

// ../../docs/types/text/yaml/known/pulumi/index.js
var pulumi_default = {
  id: "pulumi",
  label: "Pulumi project",
  match: (intake, baseType) => {
    if (baseType.id !== "yaml") return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name === "pulumi.yaml" || /^pulumi\.[a-z0-9_-]+\.yaml$/.test(name);
  },
  loadRenderer: () => import("../types/text/yaml/known/pulumi/renderer.js"),
  about: {
    description: "Pulumi project or stack configuration — name, runtime, and config values.",
    usedFor: [{ label: "Infrastructure as Code", description: "Define Pulumi infrastructure projects with runtime and config settings.", href: "https://www.pulumi.com/docs/concepts/projects/" }]
  }
};

// ../../docs/types/text/json/known/packer/index.js
var packer_default = {
  id: "packer",
  label: "HashiCorp Packer",
  match: (intake, baseType) => {
    if (baseType.id !== "json") return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    if (name !== "packer.json" && name !== "template.json") return false;
    const text = intake.textSample || intake.text || "";
    return /"builders"\s*:\s*\[/.test(text);
  },
  loadRenderer: () => import("../types/text/json/known/packer/renderer.js"),
  about: {
    description: "HashiCorp Packer machine image template — builders, provisioners, and variables.",
    usedFor: [{ label: "Machine image automation", description: "Build identical machine images for multiple platforms from a single source config.", href: "https://developer.hashicorp.com/packer/docs/templates/legacy_json_templates" }]
  }
};

// ../../docs/types/text/toml/known/ruff-toml/index.js
var ruff_toml_default = {
  id: "ruff-toml",
  label: "Ruff config",
  match: (intake, baseType) => {
    if (baseType.id !== "toml") return false;
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return name === "ruff.toml" || name === ".ruff.toml";
  },
  loadRenderer: () => import("../types/text/toml/known/ruff-toml/renderer.js"),
  about: {
    description: "Ruff Python linter and formatter configuration — rules, ignores, per-file settings, and format options.",
    usedFor: [{ label: "Python linting", description: "Extremely fast Python linter and code formatter written in Rust.", href: "https://docs.astral.sh/ruff/configuration/" }]
  }
};

// ../../docs/types/text/toml/known/uv/index.js
var uv_default = {
  id: "uv",
  label: "uv config",
  match: (intake, baseType) => {
    if (baseType.id !== "toml") return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name === "uv.toml";
  },
  loadRenderer: () => import("../types/text/toml/known/uv/renderer.js"),
  about: {
    description: "uv Python package manager configuration — Python version, dependencies, and tool settings.",
    usedFor: [{ label: "Python package management", description: "Extremely fast Python package and project manager written in Rust.", href: "https://docs.astral.sh/uv/reference/settings/" }]
  }
};

// ../../docs/types/text/yaml/known/kube-helm-values/index.js
var kube_helm_values_default = {
  id: "kube-helm-values",
  label: "Helm Values",
  tags: ["helm", "kubernetes", "yaml"],
  match: (intake, baseType) => {
    if (baseType && baseType.id !== "yaml") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n !== "values.yaml" && n !== "values.yml") return false;
    const text = intake.text || "";
    return text.includes("replicaCount") || text.includes("image:") || text.includes("service:") || text.includes("ingress:");
  },
  loadRenderer: () => import("../types/text/yaml/known/kube-helm-values/renderer.js"),
  about: {
    description: "Helm chart values file — configurable defaults for chart templates.",
    usedFor: [{ label: "Helm chart configuration", description: "Default values that can be overridden at deploy time for Helm chart templates.", href: "https://helm.sh/docs/chart_template_guide/values_files/" }]
  }
};

// ../../docs/types/text/json/known/firebase/index.js
var firebase_default = {
  id: "firebase",
  label: "Firebase Config",
  match: (intake, baseType) => {
    if (baseType.id !== "json") return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name === "firebase.json";
  },
  loadRenderer: () => import("../types/text/json/known/firebase/renderer.js"),
  about: { description: "Firebase project configuration — hosting, functions, emulators, and security rules." }
};

// ../../docs/types/text/json/known/expo/index.js
var expo_default = {
  id: "expo",
  label: "Expo App Config",
  match: (intake, baseType) => {
    if (baseType.id !== "json") return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    if (name !== "app.json") return false;
    try {
      const parsed = JSON.parse(intake.text || "{}");
      return parsed && typeof parsed.expo === "object" && parsed.expo !== null;
    } catch {
      return false;
    }
  },
  loadRenderer: () => import("../types/text/json/known/expo/renderer.js"),
  about: { description: "Expo React Native application configuration — app metadata, SDK version, platform settings." }
};

// ../../docs/types/text/json/known/tailwind/index.js
var tailwind_default = {
  id: "tailwind",
  label: "Tailwind CSS Config",
  match: (intake, baseType) => {
    if (baseType.id !== "json") return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name === "tailwind.config.json";
  },
  loadRenderer: () => import("../types/text/json/known/tailwind/renderer.js"),
  about: { description: "Tailwind CSS configuration — content paths, theme extensions, and plugins." }
};

// ../../docs/types/text/json/known/postcss/index.js
var postcss_default = {
  id: "postcss",
  label: "PostCSS Config",
  match: (intake, baseType) => {
    if (baseType.id !== "json") return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name === "postcss.config.json";
  },
  loadRenderer: () => import("../types/text/json/known/postcss/renderer.js"),
  about: { description: "PostCSS configuration — plugin pipeline for CSS transformation." }
};

// ../../docs/types/text/json/known/husky/index.js
var husky_default = {
  id: "husky",
  label: "Husky Git Hooks",
  match: (intake, baseType) => {
    if (baseType.id !== "json") return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name === ".huskyrc.json" || name === "huskyrc.json";
  },
  loadRenderer: () => import("../types/text/json/known/husky/renderer.js"),
  about: { description: "Husky git hooks configuration — pre-commit, commit-msg, pre-push and other hooks." }
};

// ../../docs/types/text/json/known/lint-staged/index.js
var lint_staged_default = {
  id: "lint-staged",
  label: "lint-staged Config",
  match: (intake, baseType) => {
    if (baseType.id !== "json") return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name === ".lintstagedrc.json" || name === "lint-staged.config.json";
  },
  loadRenderer: () => import("../types/text/json/known/lint-staged/renderer.js"),
  about: { description: "lint-staged configuration — glob patterns mapped to commands run on staged files." }
};

// ../../docs/types/text/json/known/nest-cli/index.js
var nest_cli_default = {
  id: "nest-cli",
  label: "NestJS CLI Config",
  match: (intake, baseType) => {
    if (baseType.id !== "json") return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name === "nest-cli.json";
  },
  loadRenderer: () => import("../types/text/json/known/nest-cli/renderer.js"),
  about: { description: "NestJS CLI configuration — monorepo projects, compiler options, and build settings." }
};

// ../../docs/types/text/json/known/swcrc/index.js
var swcrc_default = {
  id: "swcrc",
  label: "SWC Config",
  match: (intake, baseType) => {
    if (baseType.id !== "json") return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name === ".swcrc";
  },
  loadRenderer: () => import("../types/text/json/known/swcrc/renderer.js"),
  about: { description: "SWC compiler configuration — JavaScript/TypeScript transpiler settings, module output, and source maps." }
};

// ../../docs/types/text/known/makefile/index.js
var makefile_default = {
  id: "makefile",
  label: "Makefile",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "makefile" || n === "gnumakefile" || n === "makefile.am" || n === "makefile.in" || n.endsWith(".mk");
  },
  loadRenderer: () => import("../types/text/known/makefile/renderer.js"),
  about: {
    description: "GNU Make build file — defines targets, dependencies, and shell recipes for building software.",
    usedFor: [{ label: "GNU Make", description: "Classic build automation tool", href: "https://www.gnu.org/software/make/manual/" }]
  }
};

// ../../docs/types/text/known/justfile/index.js
var justfile_default = {
  id: "justfile",
  label: "Justfile",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "justfile" || n === ".justfile") return true;
    if (n === "exim4.conf") return false;
    if (n.endsWith(".yml") || n.endsWith(".yaml")) return false;
    const text = intake.textSample || intake.text || "";
    if (text.match(/^[a-z][\w-]*(\s+\S+)*:$/m) && text.includes("{{")) return true;
    if (text.match(/^set \w+ := /m) && text.match(/^[a-z][\w-]*.*:$/m)) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/justfile/renderer.js"),
  about: {
    description: "Just command runner — task automation recipes similar to make but simpler.",
    tags: ["just", "justfile", "build", "automation", "config"]
  }
};

// ../../docs/types/text/known/procfile/index.js
var procfile_default = {
  id: "procfile",
  label: "Procfile",
  match: (intake) => {
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name === "procfile";
  },
  loadRenderer: () => import("../types/text/known/procfile/renderer.js"),
  about: { description: "Heroku/foreman Procfile — defines process types and their startup commands." }
};

// ../../docs/types/text/known/env-example/index.js
var env_example_default = {
  id: "env-example",
  label: "Env Template",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === ".env.example" || n === ".env.sample" || n === ".env.template" || n === ".env.dist" || n === "env.example" || n === "env.sample";
  },
  loadRenderer: () => import("../types/text/known/env-example/renderer.js"),
  about: {
    description: "Environment variable template file — shows required configuration keys with placeholder values.",
    usedFor: [{ label: ".env", description: "Environment variable configuration template", href: "https://www.dotenv.org/docs/security/env-example" }]
  }
};

// ../../docs/types/text/known/envrc/index.js
var envrc_default = {
  id: "envrc",
  label: ".envrc",
  match: (intake) => {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return name === ".envrc";
  },
  loadRenderer: () => import("../types/text/known/envrc/renderer.js"),
  about: { description: "direnv environment file — exports variables and sets up project environment." }
};

// ../../docs/types/text/known/etc-environment/index.js
var etc_environment_default = {
  id: "etc-environment",
  label: "/etc/environment",
  tags: ["linux", "environment", "system", "configuration"],
  match(intake) {
    const fullPath = intake.name || intake.filename || "";
    const n = fullPath.split("/").pop().toLowerCase();
    if (n === "environment" && /\/etc\//.test(fullPath)) return true;
    if (/\/etc\/default\//.test(fullPath)) {
      const text = intake.textSample || intake.text || "";
      return /^[A-Z_][A-Z_0-9]*=/.test(text.replace(/^#[^\n]*\n/mg, "").trim());
    }
    if (n === "locale.conf" && /\/etc\//.test(fullPath)) return true;
    if (n === "environment") {
      const text = intake.textSample || intake.text || "";
      if (/^[A-Z_][A-Z_0-9]*=/m.test(text) && !text.includes("export ") && !text.includes("$(") && !/\$[A-Z_]/.test(text)) return true;
    }
    return false;
  },
  loadRenderer: () => import("../types/text/known/etc-environment/renderer.js"),
  about: {
    description: "/etc/environment — system-wide environment variables set for all processes, using simple KEY=VALUE syntax (no shell expansion).",
    usedFor: [{ label: "PAM env module", description: "pam_env reads /etc/environment for system-wide env vars", href: "https://man.archlinux.org/man/pam_env.8" }]
  }
};

// ../../docs/types/text/toml/known/mise/index.js
var mise_default = {
  id: "mise-config",
  label: "mise config",
  match: (intake) => {
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name === "mise.toml" || name === ".mise.toml";
  },
  loadRenderer: () => import("../types/text/toml/known/mise/renderer.js"),
  about: { description: "mise (formerly rtx) tool version manager config — tools, tasks, and environment." }
};

// ../../docs/types/text/known/tool-versions/index.js
var plugin15 = {
  id: "tool-versions",
  label: ".tool-versions",
  tags: ["asdf", "version-manager", "runtime"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === ".tool-versions";
  },
  renderer: () => import("../types/text/known/tool-versions/renderer.js"),
  loadRenderer: () => import("../types/text/known/tool-versions/renderer.js"),
  about: { description: "asdf .tool-versions file — pins tool versions for the project directory." }
};
var tool_versions_default = plugin15;

// ../../docs/types/text/json/known/devbox-json/index.js
var devbox_json_default = {
  id: "devbox-json",
  label: "Devbox config",
  match: (intake, baseType) => baseType && baseType.id === "json" && (intake.filename || "").split("/").pop().toLowerCase() === "devbox.json",
  loadRenderer: () => import("../types/text/json/known/devbox-json/renderer.js"),
  about: { description: "Devbox project configuration — nix packages, shell init hooks, env variables, and scripts." }
};

// ../../docs/types/text/toml/known/proto-config/index.js
var proto_config_default = {
  id: "proto-config",
  label: "proto toolchain config",
  match: (intake, baseType) => {
    if (!baseType || baseType.id !== "toml") return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name === ".prototools";
  },
  loadRenderer: () => import("../types/text/toml/known/proto-config/renderer.js"),
  about: { description: "proto toolchain manager configuration — pinned tool versions for the current directory." }
};

// ../../docs/types/text/yaml/known/aqua-config/index.js
var aqua_config_default = {
  id: "aqua-config",
  label: "aqua config",
  match(intake, baseType) {
    if (!baseType || baseType.id !== "yaml") return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name === "aqua.yaml" || name === ".aqua.yaml";
  },
  loadRenderer: () => import("../types/text/yaml/known/aqua-config/renderer.js"),
  about: { description: "aqua declarative CLI version manager configuration — registries and pinned tool versions." }
};

// ../../docs/types/text/toml/known/pixi-config/index.js
var pixi_config_default = {
  id: "pixi-config",
  label: "pixi project",
  match: (intake, baseType) => baseType && baseType.id === "toml" && (intake.filename || "").split("/").pop().toLowerCase() === "pixi.toml",
  loadRenderer: () => import("../types/text/toml/known/pixi-config/renderer.js"),
  about: { description: "pixi project configuration — conda/PyPI dependencies, tasks, platforms, and channels." }
};

// ../../docs/types/text/known/django-settings/index.js
var django_settings_default = {
  id: "django-settings",
  label: "Django Settings",
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop();
    if (name !== "settings.py") return false;
    const text = intake.textSample || intake.text || "";
    return text.includes("INSTALLED_APPS") && text.includes("DATABASES");
  },
  loadRenderer: () => import("../types/text/known/django-settings/renderer.js"),
  about: {
    description: "Django settings module — installed apps, database config, middleware, debug flag, allowed hosts, and secret key status.",
    usedFor: [{ label: "Django", description: "Python web framework configuration via settings.py", href: "https://docs.djangoproject.com/en/stable/topics/settings/" }]
  }
};

// ../../docs/types/text/yaml/known/spring-profiles/index.js
var spring_profiles_default = {
  id: "spring-profiles",
  label: "Spring Boot profiles",
  match(intake, baseType) {
    if (baseType?.id !== "yaml") return false;
    const rawName = (intake.name || intake.filename || "").split("/").pop();
    const nameMatch = rawName === "application.yml" || rawName === "application.yaml" || /^application-[^/]+\.ya?ml$/.test(rawName);
    if (!nameMatch) return false;
    const text = intake.textSample || intake.text || "";
    return text.includes("spring:") && (text.includes("datasource:") || text.includes("server:") || text.includes("profiles:"));
  },
  loadRenderer: () => import("../types/text/yaml/known/spring-profiles/renderer.js"),
  about: {
    description: "Spring Boot profile YAML — active profiles, server port, datasource (password masked), security, Redis, and logging levels.",
    usedFor: [{ label: "Spring Boot", description: "Externalised application configuration for Spring Boot", href: "https://docs.spring.io/spring-boot/docs/current/reference/html/application-properties.html" }]
  }
};

// ../../docs/types/text/yaml/known/rails-credentials/index.js
var rails_credentials_default = {
  id: "rails-credentials",
  label: "Rails Credentials",
  match(intake, baseType) {
    if (baseType?.id !== "yaml") return false;
    const name = (intake.name || intake.filename || "").split("/").pop();
    if (name === "credentials.yml.enc") return true;
    if (name === "credentials.yml") {
      const text = intake.textSample || intake.text || "";
      return text.includes("secret_key_base:");
    }
    return false;
  },
  loadRenderer: () => import("../types/text/yaml/known/rails-credentials/renderer.js"),
  about: {
    description: "Rails encrypted credentials file — shows structure for plaintext credentials.yml, or an info message for encrypted .yml.enc files.",
    usedFor: [{ label: "Rails Credentials", description: "Rails encrypted credentials management", href: "https://guides.rubyonrails.org/security.html#custom-credentials" }]
  }
};

// ../../docs/types/text/known/puma-config/index.js
var puma_config_default = {
  id: "puma-config",
  label: "Puma config",
  match(intake) {
    const fullPath = intake.name || intake.filename || "";
    const name = fullPath.split("/").pop();
    if (name !== "puma.rb") return false;
    const dir = fullPath.slice(0, fullPath.length - name.length);
    return dir === "" || /^(.*\/)?config\/?$/.test(dir);
  },
  loadRenderer: () => import("../types/text/known/puma-config/renderer.js"),
  about: {
    description: "Puma web server configuration — workers, threads, port, environment, preload_app, and plugins.",
    usedFor: [{ label: "Puma", description: "Concurrent web server for Ruby/Rack applications", href: "https://puma.io/" }]
  }
};

// ../../docs/types/text/known/gitattributes/index.js
var gitattributes_default = {
  id: "gitattributes",
  label: ".gitattributes",
  match: (intake) => /(^|\/)\.gitattributes$/i.test(intake.filename || ""),
  loadRenderer: () => import("../types/text/known/gitattributes/render.js"),
  loadDiffRenderer: () => import("../core/diff-renderer.js")
};

// ../../docs/types/text/known/gemfile-lock/index.js
var gemfile_lock_default = {
  id: "gemfile-lock",
  label: "Gemfile.lock (Bundler)",
  match: (intake) => (intake.filename || "").split("/").pop() === "Gemfile.lock",
  loadRenderer: () => import("../types/text/known/gemfile-lock/renderer.js"),
  about: { description: "Bundler lockfile — pinned gem versions, platforms, and top-level dependencies." }
};

// ../../docs/types/text/known/sonar/index.js
var sonar_default = {
  id: "sonar",
  label: "SonarQube config",
  match: (intake) => {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "sonar-project.properties") return true;
    const t = intake.text || "";
    return t.startsWith("sonar.projectKey=") || t.includes("sonar.host.url=");
  },
  loadRenderer: () => import("../types/text/known/sonar/renderer.js"),
  about: { description: "SonarQube project configuration — project key, sources, exclusions, and analysis settings." }
};

// ../../docs/types/text/toml/known/hatch/index.js
var hatch_default = {
  id: "hatch",
  label: "Hatch (Python build)",
  match: (intake) => (intake.filename || "").split("/").pop().toLowerCase() === "hatch.toml",
  loadRenderer: () => import("../types/text/toml/known/hatch/renderer.js"),
  about: { description: "Hatch Python build system config — build targets, environments, scripts, and versioning." }
};

// ../../docs/types/text/known/mailmap/index.js
var plugin16 = {
  id: "mailmap",
  label: ".mailmap",
  tags: ["git", "mailmap", "authors"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === ".mailmap";
  },
  renderer: () => import("../types/text/known/mailmap/renderer.js"),
  loadRenderer: () => import("../types/text/known/mailmap/renderer.js"),
  loadDiffRenderer: () => import("../core/diff-renderer.js")
};
var mailmap_default = plugin16;

// ../../docs/types/text/known/npmignore/index.js
var npmignore_default = {
  id: "npmignore",
  label: ".npmignore",
  match: (intake) => /(^|\/)\.npmignore$/i.test(intake.filename || ""),
  loadRenderer: () => import("../types/text/known/npmignore/renderer.js"),
  loadDiffRenderer: () => import("../core/diff-renderer.js")
};

// ../../docs/types/text/known/dockerignore/index.js
var dockerignore_default = {
  id: "dockerignore",
  label: ".dockerignore",
  match: (intake) => /(^|\/)\.dockerignore$/i.test(intake.filename || ""),
  loadRenderer: () => import("../types/text/known/dockerignore/renderer.js"),
  loadDiffRenderer: () => import("../core/diff-renderer.js")
};

// ../../docs/types/text/known/gcloudignore/index.js
var plugin17 = {
  id: "gcloudignore",
  label: ".gcloudignore",
  tags: ["gcloud", "google-cloud", "deploy"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === ".gcloudignore";
  },
  renderer: () => import("../types/text/known/gcloudignore/renderer.js"),
  loadRenderer: () => import("../types/text/known/gcloudignore/renderer.js"),
  loadDiffRenderer: () => import("../core/diff-renderer.js")
};
var gcloudignore_default = plugin17;

// ../../docs/types/text/known/eslintignore/index.js
var plugin18 = {
  id: "eslintignore",
  label: ".eslintignore",
  tags: ["eslint", "javascript", "linting"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === ".eslintignore";
  },
  renderer: () => import("../types/text/known/eslintignore/renderer.js"),
  loadRenderer: () => import("../types/text/known/eslintignore/renderer.js"),
  loadDiffRenderer: () => import("../core/diff-renderer.js")
};
var eslintignore_default = plugin18;

// ../../docs/types/text/known/prettierignore/index.js
var plugin19 = {
  id: "prettierignore",
  label: ".prettierignore",
  tags: ["prettier", "javascript", "formatting"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === ".prettierignore";
  },
  renderer: () => import("../types/text/known/prettierignore/renderer.js"),
  loadRenderer: () => import("../types/text/known/prettierignore/renderer.js"),
  loadDiffRenderer: () => import("../core/diff-renderer.js")
};
var prettierignore_default = plugin19;

// ../../docs/types/text/yaml/known/appveyor/index.js
var appveyor_default = {
  id: "appveyor",
  label: "AppVeyor CI config",
  match: (intake, baseType) => {
    if (!["yaml", "docker-compose", "github-actions"].includes(baseType.id)) return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name === "appveyor.yml" || name === ".appveyor.yml";
  },
  loadRenderer: () => import("../types/text/yaml/known/appveyor/renderer.js"),
  about: {
    description: "AppVeyor CI configuration — shows build image, scripts, branch filters, environment variables, and artifacts.",
    usedFor: [{ label: "CI/CD", description: "Continuous integration with AppVeyor", href: "https://www.appveyor.com/docs/appveyor-yml/" }]
  }
};

// ../../docs/types/text/yaml/known/rubocop/index.js
var rubocop_default = {
  id: "rubocop",
  label: "RuboCop config",
  match: (intake, baseType) => {
    if (!["yaml", "docker-compose", "github-actions"].includes(baseType.id)) return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name === ".rubocop.yml" || name === "rubocop.yml";
  },
  loadRenderer: () => import("../types/text/yaml/known/rubocop/renderer.js"),
  about: {
    description: "RuboCop configuration — shows target Ruby version, global settings, and configured cop categories.",
    usedFor: [{ label: "Linting", description: "Ruby static analysis with RuboCop", href: "https://docs.rubocop.org/rubocop/configuration.html" }]
  }
};

// ../../docs/types/text/yaml/known/rubocop-todo/index.js
var rubocop_todo_default = {
  id: "rubocop-todo",
  label: "RuboCop TODO",
  match: (intake, baseType) => {
    if (!["yaml", "docker-compose", "github-actions"].includes(baseType.id)) return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === ".rubocop_todo.yml";
  },
  loadRenderer: () => import("../types/text/yaml/known/rubocop-todo/renderer.js"),
  about: {
    description: "RuboCop auto-generated TODO file — lists cops with known violations to progressively fix.",
    usedFor: [{ label: "RuboCop", description: "Ruby linter auto-generated TODO list", href: "https://docs.rubocop.org/rubocop/configuration.html#automatically-generated-configuration" }]
  }
};

// ../../docs/types/text/yaml/known/taskfile/index.js
var taskfile_default = {
  id: "taskfile",
  label: "Taskfile (Task runner)",
  match: (intake, baseType) => {
    if (!["yaml", "docker-compose", "github-actions"].includes(baseType.id)) return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name === "taskfile.yml" || name === "taskfile.yaml";
  },
  loadRenderer: () => import("../types/text/yaml/known/taskfile/renderer.js"),
  about: {
    description: "Taskfile configuration — shows version, dotenv files, and all defined tasks with descriptions and dependencies.",
    usedFor: [{ label: "Build tool", description: "Task runner using Taskfile", href: "https://taskfile.dev/usage/" }]
  }
};

// ../../docs/types/text/yaml/known/mkdocs/index.js
var mkdocs_default = {
  id: "mkdocs",
  label: "MkDocs config",
  match: (intake, baseType) => {
    if (!["yaml", "docker-compose", "github-actions"].includes(baseType.id)) return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name === "mkdocs.yml" || name === "mkdocs.yaml";
  },
  loadRenderer: () => import("../types/text/yaml/known/mkdocs/renderer.js"),
  about: {
    description: "MkDocs configuration — shows site name, theme, navigation structure, plugins, and markdown extensions.",
    usedFor: [{ label: "Documentation", description: "Static site generator for project docs with MkDocs", href: "https://www.mkdocs.org/user-guide/configuration/" }]
  }
};

// ../../docs/types/text/json/known/rush/index.js
var rush_default = {
  id: "rush",
  label: "Rush monorepo config",
  match: (intake, baseType) => {
    if (baseType.id !== "json") return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name === "rush.json";
  },
  loadRenderer: () => import("../types/text/json/known/rush/renderer.js"),
  about: {
    description: "Rush monorepo configuration — Microsoft Rush Stack tool for managing large-scale JavaScript/TypeScript monorepos with fast, parallelized builds and fine-grained dependency management.",
    usedFor: [{ label: "Monorepo management", description: "Enterprise-scale JavaScript/TypeScript monorepo orchestration", href: "https://rushjs.io/" }]
  }
};

// ../../docs/types/text/json/known/markdownlint/index.js
var markdownlint_default = {
  id: "markdownlint",
  label: "Markdownlint config",
  match: (intake, baseType) => {
    if (baseType.id !== "json") return false;
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return name === ".markdownlint.json" || name === ".markdownlint.jsonc" || name === ".markdownlintrc.json" || name === "markdownlint.json";
  },
  loadRenderer: () => import("../types/text/json/known/markdownlint/renderer.js"),
  about: {
    description: "Markdownlint configuration — rules for linting and enforcing consistent Markdown style. Controls which rules are enabled, disabled, or configured with custom options.",
    usedFor: [{ label: "Markdown linting", description: "Style checker and linter for Markdown/CommonMark files", href: "https://github.com/DavidAnson/markdownlint" }]
  }
};

// ../../docs/types/text/yaml/known/markdownlint/index.js
var markdownlint_default2 = {
  id: "markdownlint-yaml",
  label: "Markdownlint config",
  match: (intake, baseType) => {
    if (baseType.id !== "yaml" && baseType.id !== "docker-compose") return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name === ".markdownlint.yml" || name === ".markdownlint.yaml" || name === ".markdownlintrc.yml" || name === ".markdownlintrc.yaml";
  },
  loadRenderer: () => import("../types/text/yaml/known/markdownlint/renderer.js"),
  about: {
    description: "Markdownlint configuration — rules for linting and enforcing consistent Markdown style. Controls which rules are enabled, disabled, or configured with custom options.",
    usedFor: [{ label: "Markdown linting", description: "Style checker and linter for Markdown/CommonMark files", href: "https://github.com/DavidAnson/markdownlint" }]
  }
};

// ../../docs/types/text/yaml/known/clang-format/index.js
var clang_format_default = {
  id: "clang-format",
  label: "clang-format config",
  match: (intake, baseType) => {
    if (baseType.id !== "yaml" && baseType.id !== "docker-compose") return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name === ".clang-format" || name === "_clang-format";
  },
  loadRenderer: () => import("../types/text/yaml/known/clang-format/renderer.js"),
  about: {
    description: "clang-format configuration — controls C/C++/Java/JavaScript/Objective-C/Protobuf/C# code formatting style. Integrates with editors and CI pipelines to enforce consistent code style.",
    usedFor: [{ label: "Code formatting", description: "Automatic code formatter for C-family languages by LLVM", href: "https://clang.llvm.org/docs/ClangFormat.html" }]
  }
};

// ../../docs/types/text/yaml/known/clang-tidy/index.js
var clang_tidy_default = {
  id: "clang-tidy",
  label: ".clang-tidy",
  tags: ["clang", "llvm", "cpp", "linting"],
  match(intake, baseType) {
    if (baseType && baseType.id !== "yaml" && baseType.id !== "docker-compose") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === ".clang-tidy";
  },
  loadRenderer: () => import("../types/text/yaml/known/clang-tidy/renderer.js"),
  about: {
    description: ".clang-tidy configuration — controls the Clang-Tidy static analysis linter for C/C++ code. Enables/disables checks from modernize, cppcoreguidelines, readability, performance, and other check families.",
    usedFor: [{ label: "Static analysis", description: "Clang-Tidy linter for C/C++ (LLVM project)", href: "https://clang.llvm.org/extra/clang-tidy/" }]
  }
};

// ../../docs/types/text/yaml/known/moonrepo/index.js
var moonrepo_default = {
  id: "moonrepo",
  label: "Moon (Moonrepo)",
  match: (intake, baseType) => {
    if (baseType.id !== "yaml" && baseType.id !== "docker-compose") return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    const path = (intake.filename || "").replace(/\\/g, "/");
    return name === "moon.yml" || path.endsWith(".moon/workspace.yml") || path.endsWith(".moon/toolchain.yml");
  },
  loadRenderer: () => import("../types/text/yaml/known/moonrepo/renderer.js"),
  about: {
    description: "Moon (Moonrepo) configuration — a fast, reliable build system and monorepo management tool for JavaScript/TypeScript projects. Handles task orchestration, caching, and workspace configuration.",
    usedFor: [{ label: "Build system", description: "Moon build system and monorepo management for JS/TS projects", href: "https://moonrepo.dev/" }]
  }
};

// ../../docs/types/text/known/brewfile/index.js
var plugin20 = {
  id: "brewfile",
  label: "Brewfile",
  tags: ["homebrew", "brew", "macos"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "brewfile";
  },
  renderer: () => import("../types/text/known/brewfile/renderer.js"),
  loadRenderer: () => import("../types/text/known/brewfile/renderer.js"),
  about: {
    description: "Homebrew Brewfile — declarative macOS package manifest for taps, formulae, casks, Mac App Store apps, and VS Code extensions.",
    usedFor: [{ label: "Homebrew Bundle", description: "Reproducible macOS dev environment setup", href: "https://github.com/Homebrew/homebrew-bundle" }]
  }
};
var brewfile_default = plugin20;

// ../../docs/types/text/known/license/index.js
var license_default = {
  id: "license",
  label: "LICENSE",
  match: (intake) => {
    const name = (intake.filename || "").split("/").pop();
    return name === "LICENSE" || name === "LICENSE.txt" || name === "LICENSE.md" || name === "LICENCE";
  },
  loadRenderer: () => import("../types/text/known/license/renderer.js"),
  about: {
    description: "Software license file — identifies the open-source license type, copyright holder, and year."
  }
};

// ../../docs/types/text/known/ansible-cfg/index.js
var ansible_cfg_default = {
  id: "ansible-cfg",
  label: "Ansible Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "ansible.cfg") return true;
    const text = intake.textSample || intake.text || "";
    if (text.includes("[defaults]") && (text.includes("inventory") || text.includes("remote_user"))) return true;
    if (text.includes("[privilege_escalation]") && text.includes("become")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/ansible-cfg/renderer.js"),
  about: {
    description: "Ansible automation configuration — inventory, connection, privilege escalation, and plugin settings.",
    tags: ["ansible", "devops", "automation", "config"]
  }
};

// ../../docs/types/text/known/ansible-hosts/index.js
var ansible_hosts_default = {
  id: "ansible-hosts",
  label: "Ansible Inventory",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const text = intake.textSample || intake.text || "";
    if (n === "hosts" && (text.includes("[") || text.includes("ansible_host"))) return true;
    if (n === "inventory" && text.includes("ansible_host")) return true;
    if ((n === "hosts.ini" || n === "inventory.ini") && text.includes("[")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/ansible-hosts/renderer.js"),
  about: {
    description: "Ansible inventory file — defines hosts and groups for playbook targeting.",
    usedFor: [{ label: "Ansible", description: "IT automation inventory", href: "https://docs.ansible.com/ansible/latest/inventory_guide/intro_inventory.html" }]
  }
};

// ../../docs/types/text/known/makepkg-conf/index.js
var makepkg_conf_default = {
  id: "makepkg-conf",
  label: "makepkg Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "makepkg.conf") return true;
    const text = intake.textSample || intake.text || "";
    if (text.includes("CFLAGS=") && text.includes("MAKEFLAGS=") && text.includes("BUILDENV=")) return true;
    if (text.includes("PKGEXT=") && text.includes("SRCEXT=") && text.includes("CARCH=")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/makepkg-conf/renderer.js"),
  about: {
    description: "Arch Linux makepkg build system configuration — compiler flags, build environment, and package options.",
    tags: ["makepkg", "arch", "linux", "build", "config"]
  }
};

// ../../docs/types/text/known/gemspec/index.js
var gemspec_default = {
  id: "gemspec",
  label: "Gemspec",
  match: (intake) => (intake.filename || "").endsWith(".gemspec"),
  loadRenderer: () => import("../types/text/known/gemspec/renderer.js"),
  about: {
    description: "Ruby gem specification — defines name, version, authors, dependencies, and metadata for a RubyGems package.",
    usedFor: [{ label: "RubyGems", description: "Package specification for distributing Ruby libraries", href: "https://guides.rubygems.org/specification-reference/" }]
  }
};

// ../../docs/types/text/toml/known/typos/index.js
var typos_default = {
  id: "typos",
  label: "typos spell checker config",
  match: (intake) => {
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name === "typos.toml" || name === "_typos.toml";
  },
  loadRenderer: () => import("../types/text/toml/known/typos/renderer.js"),
  about: {
    description: "typos source code spell checker configuration — word overrides, file ignores, and check settings.",
    usedFor: [{ label: "Spell checking", description: "Fast source code spell checker that finds common typos.", href: "https://github.com/crate-ci/typos/blob/master/docs/reference.md" }]
  }
};

// ../../docs/types/text/toml/known/cargo-deny/index.js
var cargo_deny_default = {
  id: "cargo-deny",
  label: "cargo-deny config",
  match: (intake) => {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return name === "deny.toml" || name === "cargo-deny.toml";
  },
  loadRenderer: () => import("../types/text/toml/known/cargo-deny/renderer.js"),
  about: {
    description: "cargo-deny security and license auditing configuration — license allow/deny lists, banned crates, and advisory settings.",
    usedFor: [{ label: "Cargo security auditing", description: "Lint Rust dependencies for licenses, security advisories, and duplicate crates.", href: "https://embarkstudios.github.io/cargo-deny/checks/index.html" }]
  }
};

// ../../docs/types/text/toml/known/cargo-config/index.js
var cargo_config_default = {
  id: "cargo-config",
  label: "Cargo config",
  match: (intake) => {
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    const p = intake.path || "";
    return name === "config.toml" && p.includes("/.cargo/") || name === "cargo.config.toml";
  },
  loadRenderer: () => import("../types/text/toml/known/cargo-config/renderer.js"),
  about: {
    description: "Cargo workspace configuration — build targets, linker settings, registry sources, and network options.",
    usedFor: [{ label: "Cargo build config", description: "Per-project or global Cargo configuration for build settings and registry sources.", href: "https://doc.rust-lang.org/cargo/reference/config.html" }]
  }
};

// ../../docs/types/text/toml/known/rustfmt-toml/index.js
var rustfmt_toml_default = {
  id: "rustfmt-toml",
  label: "rustfmt config",
  match: (intake, baseType) => {
    if (baseType.id !== "toml") return false;
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return name === "rustfmt.toml" || name === ".rustfmt.toml";
  },
  loadRenderer: () => import("../types/text/toml/known/rustfmt-toml/renderer.js"),
  about: {
    description: "rustfmt Rust code formatter configuration — line width, indentation, import ordering, and style options.",
    usedFor: [{ label: "Rust formatting", description: "Official Rust code formatter for consistent style enforcement.", href: "https://rust-lang.github.io/rustfmt/" }]
  }
};

// ../../docs/types/text/toml/known/clippy-toml/index.js
var clippy_toml_default = {
  id: "clippy-toml",
  label: "Clippy config",
  match: (intake, baseType) => {
    if (baseType.id !== "toml") return false;
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return name === "clippy.toml" || name === ".clippy.toml";
  },
  loadRenderer: () => import("../types/text/toml/known/clippy-toml/renderer.js"),
  about: {
    description: "Clippy Rust linter configuration — complexity thresholds, size limits, test allowances, and custom identifiers.",
    usedFor: [{ label: "Rust linting", description: "The official Rust linter for catching common mistakes and enforcing best practices.", href: "https://doc.rust-lang.org/clippy/configuration.html" }]
  }
};

// ../../docs/types/text/toml/known/rust-toolchain/index.js
var rust_toolchain_default = {
  id: "rust-toolchain",
  label: "rust-toolchain",
  match: (intake, baseType) => {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "rust-toolchain.toml") return true;
    if (n === "rust-toolchain") return true;
    return false;
  },
  loadRenderer: () => import("../types/text/toml/known/rust-toolchain/renderer.js"),
  about: {
    description: "Rust toolchain pinning file — specifies the Rust channel, components, and target triples for rustup.",
    usedFor: [{ label: "Rust toolchain", description: "Pin the exact Rust toolchain version, components, and targets used in a project.", href: "https://rust-lang.github.io/rustup/overrides.html" }]
  }
};

// ../../docs/types/text/known/htaccess/index.js
var plugin21 = {
  id: "htaccess",
  label: ".htaccess",
  tags: ["apache", "web", "config"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === ".htaccess";
  },
  loadRenderer: () => import("../types/text/known/htaccess/renderer.js"),
  about: {
    description: "Apache per-directory configuration file — controls URL rewriting, authentication, redirects, and server options for a directory tree.",
    usedFor: [{ label: "Apache config", description: "Per-directory Apache HTTP Server configuration", href: "https://httpd.apache.org/docs/current/howto/htaccess.html" }]
  }
};
var htaccess_default = plugin21;

// ../../docs/types/text/known/htpasswd/index.js
var plugin22 = {
  id: "htpasswd",
  label: ".htpasswd",
  tags: ["apache", "auth", "security", "credentials"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === ".htpasswd" || n === "htpasswd";
  },
  loadRenderer: () => import("../types/text/known/htpasswd/renderer.js"),
  about: {
    description: "Apache HTTP authentication file — stores username and hashed password pairs for HTTP Basic and Digest authentication.",
    usedFor: [{ label: "Apache auth", description: "HTTP Basic/Digest authentication credential store for Apache", href: "https://httpd.apache.org/docs/current/programs/htpasswd.html" }]
  }
};

// ../../docs/types/text/known/robots-txt/index.js
var plugin23 = {
  id: "robots-txt",
  label: "robots.txt",
  tags: ["web", "seo", "crawl"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "robots.txt";
  },
  loadRenderer: () => import("../types/text/known/robots-txt/renderer.js"),
  about: {
    description: "Web crawler access control file — instructs search engine bots which pages to crawl or skip, and references XML sitemaps.",
    usedFor: [{ label: "robots.txt spec", description: "The Robots Exclusion Protocol for search engine crawlers", href: "https://developers.google.com/search/docs/crawling-indexing/robots/intro" }]
  }
};

// ../../docs/types/text/known/nginx-conf/index.js
var nginx_conf_default = {
  id: "nginx-conf",
  label: "Nginx Config",
  tags: ["nginx", "webserver", "config"],
  match(intake) {
    const lower = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const path = (intake.name || intake.filename || "").toLowerCase();
    const text = intake.text || intake.textSample || "";
    if (lower === "nginx.conf") return true;
    if (lower.startsWith("nginx-") && lower.endsWith(".conf")) return true;
    if ((path.includes("sites-available/") || path.includes("sites-enabled/") || path.includes("conf.d/")) && lower.endsWith(".conf")) return true;
    if (text.includes("server {") && (text.includes("listen ") || text.includes("location "))) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/nginx-conf/renderer.js"),
  about: {
    description: "Nginx web server configuration — defines server blocks, upstreams, locations, and proxy settings.",
    usedFor: [{ label: "Nginx", description: "High-performance web server and reverse proxy", href: "https://nginx.org/en/docs/beginners_guide.html" }]
  }
};

// ../../docs/types/text/known/apache-conf/index.js
var apache_conf_default = {
  id: "apache-conf",
  label: "Apache Config",
  tags: ["apache", "httpd", "webserver", "config"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const text = intake.text || intake.textSample || "";
    if (["httpd.conf", "apache2.conf", "apache.conf", ".htaccess"].includes(n)) return true;
    if (n.startsWith("apache-") && n.endsWith(".conf")) return true;
    if (text.includes("<VirtualHost") || text.includes("ServerName") && text.includes("DocumentRoot")) return true;
    if (n.endsWith(".htaccess") && (text.includes("RewriteEngine") || text.includes("AuthType") || text.includes("Options "))) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/apache-conf/renderer.js"),
  about: {
    description: "Apache HTTP Server configuration — virtual hosts, directory access, SSL, modules, and rewrite rules.",
    usedFor: [{ label: "Apache", description: "Apache HTTP Server configuration", href: "https://httpd.apache.org/docs/2.4/configuring.html" }]
  }
};

// ../../docs/types/text/known/lighttpd-conf/index.js
var lighttpd_conf_default = {
  id: "lighttpd-conf",
  label: "Lighttpd Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const text = intake.textSample || intake.text || "";
    if (n === "lighttpd.conf" || n.startsWith("lighttpd") && n.endsWith(".conf")) return true;
    if (text.includes("server.document-root") && text.includes("server.port")) return true;
    if (text.includes("mod_fastcgi") || text.includes("mod_proxy")) {
      if (text.includes("server.modules")) return true;
    }
    return false;
  },
  loadRenderer: () => import("../types/text/known/lighttpd-conf/renderer.js"),
  about: {
    description: "Lighttpd web server configuration — a lightweight, high-performance HTTP server popular for embedded systems and high-traffic sites.",
    usedFor: [{ label: "Lighttpd", description: "High-performance web server optimized for low memory usage", href: "https://www.lighttpd.net/" }]
  }
};

// ../../docs/types/text/known/vsftpd-conf/index.js
var plugin24 = {
  id: "vsftpd-conf",
  label: "vsftpd Config",
  tags: ["vsftpd", "ftp", "server", "linux"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "vsftpd.conf";
  },
  loadRenderer: () => import("../types/text/known/vsftpd-conf/renderer.js")
};

// ../../docs/types/text/known/proftpd-conf/index.js
var plugin25 = {
  id: "proftpd-conf",
  label: "ProFTPD Config",
  tags: ["proftpd", "ftp", "server", "linux"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "proftpd.conf";
  },
  loadRenderer: () => import("../types/text/known/proftpd-conf/renderer.js")
};

// ../../docs/types/text/known/rsyslog-conf/index.js
var rsyslog_conf_default = {
  id: "rsyslog-conf",
  label: "rsyslog Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const text = intake.textSample || intake.text || "";
    if (n === "rsyslog.conf" || n === "rsyslog.d" || n.startsWith("rsyslog") && n.endsWith(".conf")) return true;
    if ((text.includes("$ModLoad") || text.includes("module(load=")) && (text.includes("*.info") || text.includes("local") || text.includes("auth"))) return true;
    if (text.includes("$FileOwner") && text.includes("$FileGroup")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/rsyslog-conf/renderer.js"),
  about: {
    description: "rsyslog logging configuration — defines log sources, filters, transformations, and output destinations.",
    usedFor: [{ label: "rsyslog", description: "Rocket-fast System for LOG processing", href: "https://www.rsyslog.com/" }]
  }
};

// ../../docs/types/text/yaml/known/netplan/index.js
var plugin26 = {
  id: "netplan",
  label: "Netplan",
  tags: ["network", "netplan", "ubuntu", "networking"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (/^\d{2}-.*\.ya?ml$/.test(n)) {
      const t = intake.text || "";
      return t.includes("network:") && (t.includes("ethernets:") || t.includes("wifis:") || t.includes("bonds:") || t.includes("bridges:") || t.includes("vlans:"));
    }
    return n === "netplan.yaml" || n === "netplan.yml" || n === "01-netcfg.yaml" || n === "00-installer-config.yaml";
  },
  loadRenderer: () => import("../types/text/yaml/known/netplan/renderer.js"),
  about: {
    description: "Ubuntu Netplan network configuration — declarative YAML rendered to networkd or NetworkManager.",
    usedFor: [{ label: "Netplan", description: "The network configuration abstraction renderer for Ubuntu", href: "https://netplan.io/" }]
  }
};
var netplan_default = plugin26;

// ../../docs/types/text/known/syslog-ng/index.js
var plugin27 = {
  id: "syslog-ng",
  label: "syslog-ng",
  tags: ["logging", "syslog", "system"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "syslog-ng.conf") return true;
    const t = intake.text || intake.textSample || "";
    return t.includes("@version:") && (t.includes("source(") || t.includes("destination(") || t.includes("log {"));
  },
  loadRenderer: () => import("../types/text/known/syslog-ng/renderer.js"),
  about: {
    description: "syslog-ng system logging daemon configuration — defines sources, destinations, filters, and log paths.",
    usedFor: [{ label: "syslog-ng", description: "A high-performance log management solution", href: "https://www.syslog-ng.com/" }]
  }
};
var syslog_ng_default = plugin27;

// ../../docs/types/text/known/haproxy-config/index.js
var haproxy_config_default = {
  id: "haproxy-config",
  label: "HAProxy config",
  match(intake) {
    const n = (intake.filename || intake.name || "").split("/").pop().toLowerCase();
    return n === "haproxy.cfg" || n === "haproxy.conf";
  },
  loadRenderer: () => import("../types/text/known/haproxy-config/renderer.js"),
  about: {
    description: "HAProxy load balancer configuration — global settings, defaults, frontends, and backends.",
    usedFor: [{ label: "HAProxy", description: "High availability load balancer and proxy server", href: "http://www.haproxy.org/download/2.8/doc/configuration.txt" }]
  }
};

// ../../docs/types/text/known/haproxy-conf/index.js
var haproxy_conf_default = {
  id: "haproxy-conf",
  label: "HAProxy Config",
  tags: ["haproxy", "load-balancer", "proxy", "config"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "haproxy.cfg" || n === "haproxy.conf") return true;
    const t = intake.text || "";
    return /^frontend\b/m.test(t) && /^backend\b/m.test(t);
  },
  loadRenderer: () => import("../types/text/known/haproxy-conf/renderer.js"),
  about: {
    description: "HAProxy load balancer configuration — global settings, defaults, frontends, backends, and listen blocks.",
    usedFor: [{ label: "HAProxy", description: "High availability load balancer and proxy server", href: "http://www.haproxy.org/download/2.8/doc/configuration.txt" }]
  }
};

// ../../docs/types/text/known/haproxy-cfg/index.js
var plugin28 = {
  id: "haproxy-cfg",
  label: "HAProxy Config",
  tags: ["haproxy", "load-balancer", "proxy", "config"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "haproxy.cfg" || n === "haproxy.conf") return true;
    const t = intake.text || "";
    return /^frontend\b/m.test(t) && /^backend\b/m.test(t);
  },
  loadRenderer: () => import("../types/text/known/haproxy-cfg/renderer.js"),
  about: {
    description: "HAProxy load balancer configuration — global settings, defaults, frontends, backends, and listen blocks.",
    usedFor: [{ label: "HAProxy", description: "High availability load balancer and proxy server", href: "http://www.haproxy.org/download/2.8/doc/configuration.txt" }]
  }
};

// ../../docs/types/text/known/squid-conf/index.js
var squid_conf_default = {
  id: "squid-conf",
  label: "Squid proxy config",
  match(intake) {
    const n = (intake.filename || intake.name || "").split("/").pop().toLowerCase();
    return n === "squid.conf";
  },
  loadRenderer: () => import("../types/text/known/squid-conf/renderer.js"),
  about: {
    description: "Squid HTTP proxy and web cache configuration — ports, ACLs, access rules, and cache settings.",
    usedFor: [{ label: "Squid Cache", description: "Caching proxy for HTTP, HTTPS, FTP, and more", href: "http://www.squid-cache.org/Doc/config/" }]
  }
};

// ../../docs/types/text/known/varnish-vcl/index.js
var varnish_vcl_default = {
  id: "varnish-vcl",
  label: "Varnish VCL",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const text = intake.textSample || intake.text || "";
    if (n.endsWith(".vcl")) return true;
    if (n === "default.vcl" || n === "varnish.vcl") return true;
    if (text.includes("vcl 4") || text.includes("vcl 4.1")) return true;
    if (text.includes("sub vcl_recv") || text.includes("sub vcl_backend_response") || text.includes("sub vcl_hash")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/varnish-vcl/renderer.js"),
  about: {
    description: "Varnish Configuration Language (VCL) — defines caching logic, backend routing, and HTTP manipulation for the Varnish HTTP accelerator.",
    usedFor: [{ label: "Varnish Cache", description: "High-performance HTTP accelerator / caching reverse proxy", href: "https://varnish-cache.org/" }]
  }
};

// ../../docs/types/text/yaml/known/moon/index.js
var plugin29 = {
  id: "moon-yml",
  label: "Moon",
  tags: ["moon", "monorepo", "build", "yaml"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "moon.yml";
  },
  renderer: () => import("../types/text/yaml/known/moon/renderer.js"),
  // Legacy alias for registry compatibility
  loadRenderer: () => import("../types/text/yaml/known/moon/renderer.js"),
  about: {
    description: "Moonrepo project configuration — defines tasks, language, dependencies, and project metadata for a monorepo project.",
    usedFor: [{ label: "Moonrepo", description: "Powerful monorepo management and task runner", href: "https://moonrepo.dev/docs/config/project" }]
  }
};
var moon_default = plugin29;

// ../../docs/types/text/known/vagrantfile/index.js
var plugin30 = {
  id: "vagrantfile",
  label: "Vagrantfile",
  tags: ["vagrant", "hashicorp", "vm", "virtualbox"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "vagrantfile";
  },
  renderer: () => import("../types/text/known/vagrantfile/renderer.js"),
  loadRenderer: () => import("../types/text/known/vagrantfile/renderer.js"),
  about: {
    description: "Vagrant VM configuration (Ruby DSL) — defines base box, networking, shared folders, and provisioners.",
    usedFor: [{ label: "Vagrant", description: "Development environment automation with VMs", href: "https://developer.hashicorp.com/vagrant/docs/vagrantfile" }]
  }
};
var vagrantfile_default = plugin30;

// ../../docs/types/text/known/berksfile/index.js
var plugin31 = {
  id: "berksfile",
  label: "Berksfile",
  tags: ["berkshelf", "chef", "cookbook", "ruby"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "berksfile";
  },
  renderer: () => import("../types/text/known/berksfile/renderer.js"),
  loadRenderer: () => import("../types/text/known/berksfile/renderer.js"),
  about: {
    description: "Berkshelf Berksfile — Chef cookbook dependency manager that declares cookbook sources and version constraints.",
    usedFor: [{ label: "Berkshelf", description: "Chef cookbook dependency management", href: "https://docs.chef.io/workstation/berkshelf/" }]
  }
};
var berksfile_default = plugin31;

// ../../docs/types/text/known/caddyfile/index.js
var caddyfile_default = {
  id: "caddyfile",
  label: "Caddyfile",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "corefile") return false;
    if (n === "caddyfile") return true;
    const text = intake.textSample || intake.text || "";
    if (text.match(/^https?:\/\/[\w.-]+\s*\{/m) || text.match(/^[\w.-]+:\d+\s*\{/m)) return true;
    if (text.includes("reverse_proxy") && text.includes("tls") && text.match(/^\S+\s*\{/m)) return true;
    if (text.includes("encode gzip") && text.includes("file_server") && text.match(/^\S+\s*\{/m)) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/caddyfile/renderer.js"),
  about: {
    description: "Caddy web server configuration — automatic HTTPS, reverse proxy, file server, and routes.",
    tags: ["caddy", "webserver", "proxy", "https", "config"]
  }
};

// ../../docs/types/text/known/consul-config/index.js
var consul_config_default = {
  id: "consul-config",
  label: "Consul Config",
  match(intake) {
    const name = (intake.filename || "").split("/").pop();
    return name === "consul.hcl" || name === "consul.json" || name === "consul-server.hcl" || name === "consul-agent.hcl";
  },
  loadRenderer: () => import("../types/text/known/consul-config/renderer.js"),
  about: {
    description: "HashiCorp Consul agent/server configuration — datacenter, networking, TLS, and retry-join settings.",
    usedFor: [{ label: "Consul service mesh", description: "Configure Consul agents and servers for service discovery and service mesh.", href: "https://developer.hashicorp.com/consul/docs/agent/config" }]
  }
};

// ../../docs/types/text/yaml/known/render-yaml/index.js
var render_yaml_default = {
  id: "render-yaml",
  label: "Render.com config",
  match: (intake, baseType) => {
    if (!["yaml", "docker-compose", "github-actions"].includes(baseType.id)) return false;
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (name !== "render.yaml") return false;
    const text = intake.text || "";
    return /services\s*:/m.test(text) && /(type|runtime|startCommand|buildCommand)\s*:/m.test(text);
  },
  loadRenderer: () => import("../types/text/yaml/known/render-yaml/renderer.js"),
  about: {
    description: "Render.com deployment configuration — services (web, worker, cron), databases, and environment variables.",
    usedFor: [{ label: "Render.com", description: "Cloud platform for web services, workers, and managed databases", href: "https://render.com/docs/yaml-spec" }]
  }
};

// ../../docs/types/text/json/known/railway-json/index.js
var railway_json_default = {
  id: "railway-json",
  label: "Railway config",
  match: (intake, baseType) => {
    if (baseType.id !== "json") return false;
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return name === "railway.json";
  },
  loadRenderer: () => import("../types/text/json/known/railway-json/renderer.js"),
  about: {
    description: "Railway deployment configuration — build system, start command, restart policy, and cron schedule.",
    usedFor: [{ label: "Railway", description: "Deploy apps to Railway cloud platform", href: "https://docs.railway.com/reference/config-as-code" }]
  }
};

// ../../docs/types/text/json/known/app-json/index.js
var plugin32 = {
  id: "app-json",
  label: "app.json",
  tags: ["heroku", "deploy", "paas"],
  match(intake, baseType) {
    if (baseType && baseType.id !== "json") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n !== "app.json" && n !== "heroku-app.json") return false;
    try {
      const parsed = intake.parsed ?? JSON.parse(intake.text || "{}");
      if (parsed && typeof parsed.expo === "object" && parsed.expo !== null) return false;
      return parsed && typeof parsed.name === "string";
    } catch {
      return false;
    }
  },
  renderer: () => import("../types/text/json/known/app-json/renderer.js"),
  loadRenderer: () => import("../types/text/json/known/app-json/renderer.js"),
  about: {
    description: "Heroku app manifest — app metadata, buildpacks, formation, addons, environment variables, and deploy scripts.",
    usedFor: [{ label: "Heroku", description: "Deploy apps to Heroku PaaS", href: "https://devcenter.heroku.com/articles/app-json-schema" }]
  }
};
var app_json_default = plugin32;

// ../../docs/types/text/yaml/known/crowdin-yml/index.js
var crowdin_yml_default = {
  id: "crowdin-yml",
  label: "Crowdin config",
  match: (intake, baseType) => {
    if (!["yaml", "docker-compose", "github-actions"].includes(baseType.id)) return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name === "crowdin.yml" || name === ".crowdin.yml";
  },
  loadRenderer: () => import("../types/text/yaml/known/crowdin-yml/renderer.js"),
  about: {
    description: "Crowdin configuration — defines i18n/translation management settings, file mappings, and API connection for Crowdin localization platform.",
    usedFor: [
      { label: "Localization", description: "Maps source files to translation file patterns across languages", href: "https://developer.crowdin.com/configuration-file/" }
    ]
  }
};

// ../../docs/types/text/yaml/known/crowdsec-config/index.js
var crowdsec_config_default = {
  id: "crowdsec-config",
  label: "CrowdSec Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n !== "config.yaml" && n !== "crowdsec-config.yaml") return false;
    const text = intake.text || "";
    return text.includes("db_config:") && (text.includes("crowdsec") || text.includes("cscli") || text.includes("credentials_path:"));
  },
  loadRenderer: () => import("../types/text/yaml/known/crowdsec-config/renderer.js")
};

// ../../docs/types/text/yaml/known/crowdsec-acquis/index.js
var crowdsec_acquis_default = {
  id: "crowdsec-acquis",
  label: "CrowdSec Acquis",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "acquis.yaml" || n === "acquis.yml";
  },
  loadRenderer: () => import("../types/text/yaml/known/crowdsec-acquis/renderer.js")
};

// ../../docs/types/text/known/matchfile/index.js
var matchfile_default = {
  id: "matchfile",
  label: "Matchfile",
  match: (intake) => {
    const name = (intake.filename || "").split("/").pop();
    return name === "Matchfile";
  },
  loadRenderer: () => import("../types/text/known/matchfile/renderer.js"),
  about: {
    description: "Fastlane Match configuration — manages Apple code-signing certificates and provisioning profiles centrally.",
    usedFor: [
      { label: "Code signing", description: "Syncs certificates and provisioning profiles via a shared git/S3/Google Cloud repo", href: "https://docs.fastlane.tools/actions/match/" }
    ]
  }
};

// ../../docs/types/text/known/appfile/index.js
var appfile_default = {
  id: "appfile",
  label: "Appfile",
  match: (intake) => {
    const name = (intake.filename || "").split("/").pop();
    return name === "Appfile";
  },
  loadRenderer: () => import("../types/text/known/appfile/renderer.js"),
  about: {
    description: "Fastlane Appfile — stores app configuration (bundle ID, Apple ID, team info) shared across all Fastlane tools and lanes.",
    usedFor: [
      { label: "Fastlane config", description: "Centralises Apple credentials and app identifiers for Fastlane automation", href: "https://docs.fastlane.tools/advanced/Appfile/" }
    ]
  }
};

// ../../docs/types/text/known/ruby-version/index.js
var ruby_version_default = {
  id: "ruby-version",
  label: ".ruby-version",
  match: (intake) => {
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name === ".ruby-version";
  },
  loadRenderer: () => import("../types/text/known/ruby-version/renderer.js"),
  about: {
    description: ".ruby-version — pins the Ruby version for the project, used by rbenv, rvm, asdf, and chruby.",
    usedFor: [
      { label: "Ruby version pin", description: "Automatically switch to the correct Ruby version with rbenv/rvm/asdf", href: "https://github.com/rbenv/rbenv#readme" }
    ]
  }
};

// ../../docs/types/text/known/rspec-config/index.js
var rspec_config_default = {
  id: "rspec-config",
  label: "RSpec config",
  match: (intake) => {
    const name = (intake.filename || "").split("/").pop();
    return name === ".rspec";
  },
  loadRenderer: () => import("../types/text/known/rspec-config/renderer.js"),
  about: {
    description: ".rspec — RSpec options file: CLI flags applied to every test run.",
    usedFor: [
      { label: "Testing", description: "RSpec behaviour-driven testing for Ruby", href: "https://rspec.info/documentation/" }
    ]
  }
};

// ../../docs/types/text/known/sorbet-config/index.js
var sorbet_config_default = {
  id: "sorbet-config",
  label: "Sorbet config",
  match: (intake) => {
    const n = (intake.filename || intake.name || "").split("/").pop();
    const p = intake.filename || intake.name || "";
    const t = intake.text || "";
    return n === "sorbet.config" || n === "config" && p.includes("sorbet") || n === "config" && t.includes("--dir") && t.includes("--ignore");
  },
  loadRenderer: () => import("../types/text/known/sorbet-config/renderer.js"),
  about: {
    description: "sorbet/config — Sorbet type checker configuration: source dirs, ignore patterns, and feature flags.",
    usedFor: [
      { label: "Type checking", description: "Sorbet: gradual type checker for Ruby", href: "https://sorbet.org/docs/cli" }
    ]
  }
};

// ../../docs/types/text/yaml/known/bundler-audit-config/index.js
var bundler_audit_config_default = {
  id: "bundler-audit-config",
  label: "Bundler Audit config",
  match: (intake, baseType) => {
    if (baseType?.id !== "yaml") return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name === ".bundler-audit.yml" || name === ".bundler-audit.yaml";
  },
  loadRenderer: () => import("../types/text/yaml/known/bundler-audit-config/renderer.js"),
  about: {
    description: ".bundler-audit.yml — bundler-audit configuration: ignored CVEs and update sources.",
    usedFor: [
      { label: "Security", description: "Scan Gemfile.lock for known vulnerabilities", href: "https://github.com/rubysec/bundler-audit" }
    ]
  }
};

// ../../docs/types/text/yaml/known/standardrb-config/index.js
var standardrb_config_default = {
  id: "standardrb-config",
  label: "Standard Ruby config",
  match: (intake, baseType) => {
    if (baseType?.id !== "yaml") return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name === ".standard.yml" || name === ".standard.yaml";
  },
  loadRenderer: () => import("../types/text/yaml/known/standardrb-config/renderer.js"),
  about: {
    description: ".standard.yml — StandardRB linter config: zero-config Ruby linter based on RuboCop.",
    usedFor: [
      { label: "Linting", description: "StandardRB: opinionated Ruby linter", href: "https://github.com/standardrb/standard" }
    ]
  }
};

// ../../docs/types/text/known/python-version/index.js
var python_version_default = {
  id: "python-version",
  label: ".python-version",
  match: (intake) => {
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name === ".python-version";
  },
  loadRenderer: () => import("../types/text/known/python-version/renderer.js"),
  about: {
    description: ".python-version — pins one or more Python versions for pyenv (one per line). The first entry is the default active version.",
    usedFor: [
      { label: "Python version pin", description: "pyenv reads this file to auto-switch Python versions in the directory", href: "https://github.com/pyenv/pyenv#readme" }
    ]
  }
};

// ../../docs/types/text/known/earthfile/index.js
var earthfile_default = {
  id: "earthfile",
  label: "Earthfile (Earthly)",
  match: (intake) => {
    const name = (intake.name || intake.filename || "").split("/").pop();
    return name === "Earthfile";
  },
  loadRenderer: () => import("../types/text/known/earthfile/renderer.js"),
  about: { description: "Earthfile — Earthly CI/CD build targets (Dockerfile-like syntax)." }
};

// ../../docs/types/text/known/gitmodules/index.js
var gitmodules_default = {
  id: "gitmodules",
  label: ".gitmodules (submodules)",
  match: (intake) => {
    const name = (intake.filename || "").split("/").pop();
    return name === ".gitmodules";
  },
  loadRenderer: () => import("../types/text/known/gitmodules/renderer.js"),
  about: { description: ".gitmodules file — declares Git submodule paths and remote URLs." }
};

// ../../docs/types/text/known/gitconfig/index.js
var gitconfig_default = {
  id: "gitconfig",
  label: "Git config",
  match: (intake) => {
    const f = (intake.filename || "").split("/").pop();
    return f === ".gitconfig" || f === "config" && /\.git\/config$/.test(intake.filename || "") || /^gitconfig$/.test(f);
  },
  loadRenderer: () => import("../types/text/known/gitconfig/render.js")
};

// ../../docs/types/text/known/tfvars/index.js
var tfvars_default = {
  id: "tfvars",
  label: "Terraform variables (.tfvars)",
  match: (intake) => {
    const name = (intake.filename || "").split("/").pop();
    return /\.tfvars$/.test(name);
  },
  loadRenderer: () => import("../types/text/known/tfvars/renderer.js"),
  about: { description: "Terraform .tfvars file — variable assignments for Terraform configurations." }
};

// ../../docs/types/text/known/podfile/index.js
var podfile_default = {
  id: "podfile",
  label: "Podfile",
  tags: ["cocoapods", "ios", "macos", "swift"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "podfile";
  },
  loadRenderer: () => import("../types/text/known/podfile/renderer.js"),
  about: {
    description: "CocoaPods Podfile — declares iOS/macOS library dependencies for Xcode projects.",
    usedFor: [{ label: "CocoaPods", description: "Dependency manager for Swift and Objective-C projects", href: "https://cocoapods.org" }]
  }
};

// ../../docs/types/text/known/fastfile/index.js
var fastfile_default = {
  id: "fastfile",
  label: "Fastfile",
  match: (intake) => (intake.filename || "").split("/").pop() === "Fastfile",
  loadRenderer: () => import("../types/text/known/fastfile/renderer.js"),
  about: {
    description: "Fastlane Fastfile — defines lanes (CI/CD workflows) for automating iOS/Android builds, tests, and deployments.",
    usedFor: [
      { label: "CI automation", description: "Automates building, testing, and releasing mobile apps", href: "https://docs.fastlane.tools/advanced/Fastfile/" }
    ]
  }
};

// ../../docs/types/text/known/snapfile/index.js
var snapfile_default = {
  id: "snapfile",
  label: "Snapfile",
  match: (intake) => {
    const name = (intake.filename || "").split("/").pop();
    return name === "Snapfile";
  },
  loadRenderer: () => import("../types/text/known/snapfile/renderer.js"),
  about: {
    description: "Fastlane Snapshot Snapfile — configures automated screenshot capture for iOS apps across devices and locales.",
    usedFor: [{ label: "Fastlane Snapshot", description: "Automate app screenshots for the App Store", href: "https://docs.fastlane.tools/actions/snapshot/" }]
  }
};

// ../../docs/types/text/toml/known/supabase-config/index.js
var supabase_config_default = {
  id: "supabase-config",
  label: "Supabase config",
  match: (intake, baseType) => {
    if (baseType.id !== "toml") return false;
    const filename = (intake.filename || "").split("/").pop().toLowerCase();
    if (filename !== "config.toml" && filename !== "supabase-config.toml") return false;
    const text = intake.text || "";
    return /\[api\]/.test(text) && /\[db\]/.test(text);
  },
  loadRenderer: () => import("../types/text/toml/known/supabase-config/renderer.js"),
  about: {
    description: "Supabase project configuration — defines database, API, auth, and storage settings for a local Supabase project.",
    usedFor: [{ label: "Supabase", description: "Open-source Firebase alternative", href: "https://supabase.com/docs/guides/cli/config" }]
  }
};

// ../../docs/types/text/known/redirects/index.js
var redirects_default = {
  id: "redirects",
  label: "Netlify _redirects",
  match: (intake) => {
    const name = (intake.filename || "").split("/").pop();
    return name === "_redirects";
  },
  loadRenderer: () => import("../types/text/known/redirects/renderer.js"),
  about: {
    description: "Netlify _redirects file — defines URL redirect and rewrite rules in plain text format.",
    usedFor: [{ label: "Netlify Redirects", description: "URL redirect rules for Netlify deployments", href: "https://docs.netlify.com/routing/redirects/" }]
  }
};

// ../../docs/types/text/known/cmake/index.js
var cmake_default = {
  id: "cmake",
  label: "CMakeLists",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "cmakelists.txt" || n === "cmakelists" || n.endsWith(".cmake");
  },
  loadRenderer: () => import("../types/text/known/cmake/renderer.js"),
  about: {
    description: "CMake build system configuration — defines targets, dependencies, compiler options, and installation rules.",
    usedFor: [{ label: "CMake", description: "Cross-platform build system generator", href: "https://cmake.org/cmake/help/latest/manual/cmake-language.7.html" }]
  }
};

// ../../docs/types/text/known/jenkinsfile/index.js
var plugin33 = {
  id: "jenkinsfile",
  label: "Jenkinsfile",
  tags: ["jenkins", "ci", "pipeline"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "jenkinsfile" || n === "jenkinsfile.groovy";
  },
  renderer: () => import("../types/text/known/jenkinsfile/renderer.js"),
  loadRenderer: () => import("../types/text/known/jenkinsfile/renderer.js"),
  about: {
    description: "Jenkins declarative or scripted pipeline — shows pipeline stages, agents, and post conditions.",
    usedFor: [{ label: "CI/CD", description: "Continuous delivery pipelines with Jenkins", href: "https://www.jenkins.io/doc/book/pipeline/syntax/" }]
  }
};

// ../../docs/types/text/known/bazel/index.js
var bazel_default = {
  id: "bazel",
  label: "Bazel BUILD / WORKSPACE",
  match: (intake) => {
    const base = (intake.filename || "").split("/").pop();
    return /^(BUILD|BUILD\.bazel|WORKSPACE|WORKSPACE\.bazel)$/.test(base);
  },
  loadRenderer: () => import("../types/text/known/bazel/renderer.js"),
  about: { description: "Bazel build file — defines targets, dependencies, and build rules for the Bazel build system." }
};

// ../../docs/types/text/known/bazelrc/index.js
var bazelrc_default = {
  id: "bazelrc",
  label: ".bazelrc",
  match: (intake) => {
    const base = (intake.filename || "").split("/").pop();
    return base === ".bazelrc" || base === "bazelrc";
  },
  loadRenderer: () => import("../types/text/known/bazelrc/renderer.js"),
  about: { description: "Bazel RC configuration file — defines option groups and flags for Bazel commands." }
};

// ../../docs/types/text/known/ninja-build/index.js
var ninja_build_default = {
  id: "ninja-build",
  label: "Ninja build file",
  match: (intake) => {
    const base = (intake.filename || "").split("/").pop().toLowerCase();
    return base === "build.ninja" || base.endsWith(".ninja");
  },
  loadRenderer: () => import("../types/text/known/ninja-build/renderer.js"),
  about: { description: "Ninja build file — defines build rules, targets and dependencies for the Ninja build system." }
};

// ../../docs/types/text/known/package-swift/index.js
var package_swift_default = {
  id: "package-swift",
  label: "Swift Package",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop();
    return n === "Package.swift";
  },
  loadRenderer: () => import("../types/text/known/package-swift/renderer.js"),
  about: { description: "Swift Package Manager manifest — defines package name, products, targets, dependencies, and supported platforms." }
};

// ../../docs/types/text/known/mix-exs/index.js
var mix_exs_default = {
  id: "mix-exs",
  label: "Mix",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "mix.exs") return true;
    const t = intake.text || "";
    return /defmodule/.test(t) && (/use Mix\.Project/.test(t) || /def project do/.test(t));
  },
  loadRenderer: () => import("../types/text/known/mix-exs/renderer.js"),
  about: { description: "Elixir Mix build file — defines the project name, version, Elixir requirement, dependencies, and OTP application configuration." }
};

// ../../docs/types/text/known/build-sbt/index.js
var build_sbt_default = {
  id: "build-sbt",
  label: "Scala/SBT",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop();
    return n === "build.sbt";
  },
  loadRenderer: () => import("../types/text/known/build-sbt/renderer.js"),
  about: { description: "SBT build definition for a Scala project — project name, version, Scala version, organization, and library dependencies." }
};

// ../../docs/types/text/known/dune-build/index.js
var dune_build_default = {
  id: "dune-build",
  label: "Dune Build",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const text = intake.textSample || intake.text || "";
    if (n === "dune-project" || n === "dune") return true;
    if (text.includes("(lang dune") || text.includes("(library") && text.includes("(name")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/dune-build/renderer.js"),
  about: {
    description: "Dune build system configuration — defines libraries, executables, and project settings for OCaml projects.",
    usedFor: [{ label: "Dune", description: "Fast, portable build system for OCaml", href: "https://dune.build/" }]
  }
};

// ../../docs/types/text/known/scalafmt-conf/index.js
var plugin34 = {
  id: "scalafmt-conf",
  label: ".scalafmt.conf",
  tags: ["scala", "scalafmt", "formatting"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === ".scalafmt.conf") return true;
    const text = intake.textSample || intake.text || "";
    if (text.includes("version = ") && text.includes("runner.dialect") && text.includes("maxColumn")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/scalafmt-conf/renderer.js"),
  about: {
    description: "Scalafmt formatter configuration — defines formatting rules for Scala code.",
    usedFor: [{ label: "Scalafmt", description: "Code formatter for Scala", href: "https://scalameta.org/scalafmt/" }]
  }
};
var scalafmt_conf_default = plugin34;

// ../../docs/types/text/known/scalafix-conf/index.js
var plugin35 = {
  id: "scalafix-conf",
  label: ".scalafix.conf",
  tags: ["scala", "scalafix", "linting", "rewriting"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === ".scalafix.conf";
  },
  loadRenderer: () => import("../types/text/known/scalafix-conf/renderer.js"),
  about: {
    description: "Scalafix linter and rewriter configuration — defines rules for automated Scala code linting and refactoring.",
    usedFor: [{ label: "Scalafix", description: "Linting and rewriting tool for Scala", href: "https://scalacenter.github.io/scalafix/" }]
  }
};
var scalafix_conf_default = plugin35;

// ../../docs/types/text/known/playwright-config/index.js
var playwright_config_default = {
  id: "playwright-config",
  label: "Playwright Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return /^playwright\.config\.(js|ts|mjs|cjs)$/.test(n);
  },
  loadRenderer: () => import("../types/text/known/playwright-config/renderer.js"),
  about: { description: "Playwright end-to-end test configuration — defines browsers, test directories, timeouts, reporters, and web server settings." }
};

// ../../docs/types/text/known/cypress-config/index.js
var cypress_config_default = {
  id: "cypress-config",
  label: "Cypress Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return /^cypress\.config\.(js|ts|mjs|cjs)$/.test(n) || n === "cypress.json";
  },
  loadRenderer: () => import("../types/text/known/cypress-config/renderer.js"),
  about: { description: "Cypress end-to-end and component test configuration — defines base URL, spec patterns, viewport, video, screenshots, and timeouts." }
};

// ../../docs/types/text/json/known/vcpkg/index.js
var vcpkg_default = {
  id: "vcpkg",
  label: "vcpkg",
  match(intake, baseType) {
    if (baseType?.id !== "json") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "vcpkg.json";
  },
  loadRenderer: () => import("../types/text/json/known/vcpkg/renderer.js"),
  about: {
    description: "vcpkg manifest — Microsoft C++ package manager dependency list with optional features and overrides.",
    usedFor: [
      { label: "C++ dependencies", description: "Declare C++ library dependencies for vcpkg to install", href: "https://vcpkg.io/" }
    ]
  }
};

// ../../docs/types/text/json/known/cmake-presets/index.js
var cmake_presets_default = {
  id: "cmake-presets",
  label: "CMake Presets",
  match(intake, baseType) {
    if (baseType?.id !== "json") return false;
    const n = (intake.filename || "").split("/").pop();
    return n === "CMakePresets.json" || n === "CMakeUserPresets.json";
  },
  loadRenderer: () => import("../types/text/json/known/cmake-presets/renderer.js"),
  about: {
    description: "CMakePresets.json — reusable named presets for configuring, building, testing, and packaging CMake projects.",
    usedFor: [
      { label: "CMake build configuration", description: "Share and reuse CMake configure/build/test settings", href: "https://cmake.org/cmake/help/latest/manual/cmake-presets.7.html" }
    ]
  }
};

// ../../docs/types/text/known/conanfile/index.js
var conanfile_default = {
  id: "conanfile",
  label: "Conan",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "conanfile.txt" || n === "conanfile.py";
  },
  loadRenderer: () => import("../types/text/known/conanfile/renderer.js"),
  about: {
    description: "Conan C/C++ package manager manifest — declares dependencies, generators, and build options.",
    usedFor: [
      { label: "C/C++ dependencies", description: "Manage C/C++ library dependencies with Conan", href: "https://conan.io/" }
    ]
  }
};

// ../../docs/types/text/yaml/known/prometheus-config/index.js
var prometheus_config_default = {
  id: "prometheus-config",
  label: "Prometheus config",
  match(intake, baseType) {
    if (baseType?.id !== "yaml") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "prometheus.yml" || n === "prometheus.yaml";
  },
  loadRenderer: () => import("../types/text/yaml/known/prometheus-config/renderer.js"),
  about: {
    description: "Prometheus server configuration — scrape jobs, alerting rules, and remote write/read targets.",
    usedFor: [{ label: "Metrics collection", description: "Configure Prometheus scrape intervals, jobs, alerting rules, and remote storage.", href: "https://prometheus.io/docs/prometheus/latest/configuration/configuration/" }]
  }
};

// ../../docs/types/text/yaml/known/alertmanager/index.js
var alertmanager_default = {
  id: "alertmanager",
  label: "Alertmanager config",
  match(intake, baseType) {
    if (baseType?.id !== "yaml") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "alertmanager.yml" || n === "alertmanager.yaml") return true;
    const t = intake.text || "";
    return t.includes("route:") && t.includes("receivers:");
  },
  loadRenderer: () => import("../types/text/yaml/known/alertmanager/renderer.js"),
  about: {
    description: "Prometheus Alertmanager configuration — routes, receivers, and inhibit rules.",
    usedFor: [{ label: "Alert routing", description: "Define how Prometheus alerts are routed to receivers like Slack, PagerDuty, or email.", href: "https://prometheus.io/docs/alerting/latest/configuration/" }]
  }
};

// ../../docs/types/text/yaml/known/ejabberd-config/index.js
var ejabberd_config_default = {
  id: "ejabberd-config",
  label: "ejabberd config",
  match(intake, baseType) {
    if (baseType?.id !== "yaml") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "ejabberd.yml" || n === "ejabberd.yaml";
  },
  loadRenderer: () => import("../types/text/yaml/known/ejabberd-config/renderer.js"),
  about: {
    description: "ejabberd XMPP server configuration — controls hosts, listeners, modules, authentication, and database backends.",
    usedFor: [{ label: "ejabberd", description: "Robust, scalable, and extensible XMPP/MQTT/SIP server", href: "https://docs.ejabberd.im/admin/configuration/" }]
  }
};

// ../../docs/types/text/yaml/known/blackbox/index.js
var plugin36 = {
  id: "blackbox",
  label: "Blackbox Exporter",
  tags: ["prometheus", "monitoring", "probes"],
  match(intake, baseType) {
    if (baseType && baseType.id !== "yaml") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "blackbox.yml" || n === "blackbox.yaml";
  },
  loadRenderer: () => import("../types/text/yaml/known/blackbox/renderer.js"),
  about: {
    description: "Prometheus Blackbox Exporter configuration — probe modules for HTTP, TCP, DNS, ICMP, and gRPC endpoints.",
    usedFor: [{ label: "Endpoint probing", description: "Define probe modules to check external endpoints via HTTP, TCP, DNS, ICMP or gRPC.", href: "https://github.com/prometheus/blackbox_exporter" }]
  }
};
var blackbox_default = plugin36;

// ../../docs/types/text/yaml/known/snmp-exporter/index.js
var plugin37 = {
  id: "snmp-exporter",
  label: "SNMP Exporter",
  tags: ["prometheus", "monitoring", "snmp", "network"],
  match(intake, baseType) {
    if (baseType && baseType.id !== "yaml") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "snmp.yml" || n === "snmp.yaml";
  },
  loadRenderer: () => import("../types/text/yaml/known/snmp-exporter/renderer.js"),
  about: {
    description: "Prometheus SNMP Exporter configuration — modules defining OID walks, metric mappings, and auth profiles.",
    usedFor: [{ label: "SNMP metrics collection", description: "Configure SNMP modules with OID walks, metric definitions, and authentication for network device monitoring.", href: "https://github.com/prometheus/snmp_exporter" }]
  }
};
var snmp_exporter_default = plugin37;

// ../../docs/types/text/yaml/known/victoria-metrics-config/index.js
var victoria_metrics_config_default = {
  id: "victoria-metrics-config",
  label: "VictoriaMetrics Config",
  match(intake, baseType) {
    if (!baseType || baseType.id !== "yaml") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const text = intake.textSample || intake.text || "";
    if (n === "victoria-metrics.yml" || n === "vmagent.yml" || n === "vmalert.yml" || n === "victoriametrics.yml") return true;
    if (text.includes("scrape_configs:") && text.includes("remote_write:")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/yaml/known/victoria-metrics-config/renderer.js"),
  about: {
    description: "VictoriaMetrics configuration — scrape configs, remote write, and alerting rules for the time-series database.",
    usedFor: [{ label: "VictoriaMetrics", description: "Fast Prometheus-compatible time series database", href: "https://docs.victoriametrics.com/" }]
  }
};

// ../../docs/types/text/yaml/known/thanos-config/index.js
var thanos_config_default = {
  id: "thanos-config",
  label: "Thanos Config",
  match(intake, baseType) {
    if (!baseType || baseType.id !== "yaml") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const text = intake.textSample || intake.text || "";
    if (n === "thanos.yaml" || n === "thanos.yml" || n === "thanos-config.yml" || n === "bucket.yml" || n === "objstore.yaml" || n === "objstore.yml") return true;
    if ((text.includes("type: GCS") || text.includes("type: S3") || text.includes("type: AZURE")) && text.includes("bucket:")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/yaml/known/thanos-config/renderer.js"),
  about: {
    description: "Thanos object storage configuration — connects Prometheus data to long-term object storage (S3, GCS, etc.).",
    usedFor: [{ label: "Thanos", description: "Highly available Prometheus setup with long-term storage", href: "https://thanos.io/tip/thanos/storage.md/" }]
  }
};

// ../../docs/types/text/yaml/known/datadog-config/index.js
var datadog_config_default = {
  id: "datadog-config",
  label: "Datadog agent config",
  match(intake, baseType) {
    if (baseType?.id !== "yaml") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "datadog.yaml";
  },
  loadRenderer: () => import("../types/text/yaml/known/datadog-config/renderer.js"),
  about: {
    description: "Datadog agent configuration — API key, tags, log collection, APM, and feature flags.",
    usedFor: [{ label: "Observability", description: "Configure the Datadog agent for metrics, logs, APM, and infrastructure monitoring.", href: "https://docs.datadoghq.com/agent/configuration/agent-configuration-files/" }]
  }
};

// ../../docs/types/text/known/vite-config/index.js
var vite_config_default = {
  id: "vite-config",
  label: "Vite Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return /^vite\.config\.(js|ts|mjs|cjs)$/.test(n);
  },
  loadRenderer: () => import("../types/text/known/vite-config/renderer.js"),
  about: { description: "Vite build tool configuration — defines plugins, server options, build targets, and bundler behavior." }
};

// ../../docs/types/text/known/webpack-config/index.js
var webpack_config_default = {
  id: "webpack-config",
  label: "Webpack Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return /^webpack\.config\.(js|ts|mjs|cjs)$/.test(n);
  },
  loadRenderer: () => import("../types/text/known/webpack-config/renderer.js"),
  about: { description: "Webpack bundler configuration — defines entry points, output, loaders, plugins, and optimization settings." }
};

// ../../docs/types/text/known/rollup-config/index.js
var rollup_config_default = {
  id: "rollup-config",
  label: "Rollup Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return /^rollup\.config\.(js|ts|mjs|cjs)$/.test(n);
  },
  loadRenderer: () => import("../types/text/known/rollup-config/renderer.js"),
  about: { description: "Rollup module bundler configuration — defines input, output format, plugins, and tree-shaking behavior." }
};

// ../../docs/types/text/known/next-config/index.js
var next_config_default = {
  id: "next-config",
  label: "Next.js Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return /^next\.config\.(js|ts|mjs)$/.test(n);
  },
  loadRenderer: () => import("../types/text/known/next-config/renderer.js"),
  about: { description: "Next.js framework configuration — defines routing, image handling, redirects, internationalization, and build options." }
};

// ../../docs/types/text/known/astro-config/index.js
var astro_config_default = {
  id: "astro-config",
  label: "Astro Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return /^astro\.config\.(mjs|ts|js)$/.test(n);
  },
  loadRenderer: () => import("../types/text/known/astro-config/renderer.js"),
  about: { description: "Astro framework configuration — defines integrations, output mode, adapter, and site settings." }
};

// ../../docs/types/text/known/svelte-config/index.js
var svelte_config_default = {
  id: "svelte-config",
  label: "SvelteKit Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return /^svelte\.config\.(js|ts)$/.test(n);
  },
  loadRenderer: () => import("../types/text/known/svelte-config/renderer.js"),
  about: { description: "SvelteKit configuration — defines adapter, prerendering, CSP, and aliases." }
};

// ../../docs/types/text/known/nuxt-config/index.js
var nuxt_config_default = {
  id: "nuxt-config",
  label: "Nuxt Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return /^nuxt\.config\.(ts|js|mjs)$/.test(n);
  },
  loadRenderer: () => import("../types/text/known/nuxt-config/renderer.js"),
  about: { description: "Nuxt 3 configuration — defines modules, plugins, SSR mode, router, and dev server settings." }
};

// ../../docs/types/text/known/remix-config/index.js
var remix_config_default = {
  id: "remix-config",
  label: "Remix Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return /^remix\.config\.(js|ts)$/.test(n);
  },
  loadRenderer: () => import("../types/text/known/remix-config/renderer.js"),
  about: { description: "Remix framework configuration — defines app directory, routes, server build path, and dev server options." }
};

// ../../docs/types/text/known/hugo-config/index.js
var hugo_config_default = {
  id: "hugo-config",
  label: "Hugo config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (["hugo.toml", "hugo.yaml", "hugo.json"].includes(n)) return true;
    if (["config.toml", "config.yaml", "config.json"].includes(n)) {
      const text = intake.text || "";
      return (text.includes("baseURL") || text.includes("baseUrl")) && (text.includes("theme") || text.includes("languageCode") || text.includes("enableRobotsTXT"));
    }
    return false;
  },
  loadRenderer: () => import("../types/text/known/hugo-config/renderer.js"),
  about: {
    description: "Hugo static site configuration — base URL, theme, languages, menu structure, taxonomy, and build settings.",
    usedFor: [{ label: "Hugo", description: "Fast static site generator", href: "https://gohugo.io/documentation/" }]
  }
};

// ../../docs/types/text/toml/known/air-config/index.js
var air_config_default = {
  id: "air-config",
  label: "Air (Go)",
  match(intake, baseType) {
    if (baseType?.id !== "toml") return false;
    const n = (intake.filename || "").split("/").pop().toLowerCase();
    return n === ".air.toml";
  },
  loadRenderer: () => import("../types/text/toml/known/air-config/renderer.js"),
  about: { description: "Air live-reload config for Go — defines build command, binary path, watch extensions, and log options." }
};

// ../../docs/types/text/yaml/known/spectral/index.js
var spectral_default = {
  id: "spectral",
  label: "Spectral",
  match(intake, baseType) {
    if (baseType?.id !== "yaml") return false;
    const n = (intake.filename || "").split("/").pop().toLowerCase();
    return [".spectral.yml", ".spectral.yaml"].includes(n);
  },
  loadRenderer: () => import("../types/text/yaml/known/spectral/renderer.js"),
  about: { description: "Stoplight Spectral API linter config — extends rulesets, defines custom rules, and targets OpenAPI/AsyncAPI documents." }
};

// ../../docs/types/text/known/tiltfile/index.js
var tiltfile_default = {
  id: "tiltfile",
  label: "Tiltfile",
  match(intake) {
    const n = (intake.filename || "").split("/").pop();
    return n === "Tiltfile";
  },
  loadRenderer: () => import("../types/text/known/tiltfile/renderer.js"),
  about: { description: "Tilt Kubernetes dev-loop config (Starlark) — defines Docker builds, k8s resources, live updates, and local tasks." }
};

// ../../docs/types/text/known/meson-build/index.js
var meson_build_default = {
  id: "meson-build",
  label: "Meson build",
  match(intake) {
    const n = (intake.filename || "").split("/").pop().toLowerCase();
    return n === "meson.build" || n === "meson.options";
  },
  loadRenderer: () => import("../types/text/known/meson-build/renderer.js"),
  about: { description: "Meson build system file — defines project, executables, libraries, dependencies, subdirectories, and tests." }
};

// ../../docs/types/text/yaml/known/goreleaser/index.js
var goreleaser_default = {
  id: "goreleaser",
  label: "GoReleaser",
  match: (intake, baseType) => {
    if (!["yaml", "docker-compose", "github-actions"].includes(baseType?.id)) return false;
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return [".goreleaser.yaml", ".goreleaser.yml", "goreleaser.yaml", "goreleaser.yml"].includes(name);
  },
  loadRenderer: () => import("../types/text/yaml/known/goreleaser/renderer.js"),
  about: {
    description: "GoReleaser configuration — automates building, packaging, and publishing Go releases to GitHub, GitLab, and more.",
    usedFor: [{ label: "Release automation", description: "Build and publish Go binaries with a single command", href: "https://goreleaser.com" }]
  }
};

// ../../docs/types/text/yaml/known/golangci-lint/index.js
var golangci_lint_default = {
  id: "golangci-lint",
  label: "GolangCI-Lint config",
  match: (intake, baseType) => {
    if (!["yaml", "docker-compose", "github-actions"].includes(baseType?.id)) return false;
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return [".golangci.yml", ".golangci.yaml", "golangci.yml", ".golangci.json", ".golangci.toml"].includes(name);
  },
  loadRenderer: () => import("../types/text/yaml/known/golangci-lint/renderer.js"),
  about: {
    description: "golangci-lint configuration — defines enabled/disabled linters, run options, and issue exclusion rules for Go projects.",
    usedBy: [{ label: "Linter aggregator", description: "Fast linters runner for Go", href: "https://golangci-lint.run" }]
  }
};

// ../../docs/types/text/yaml/known/buf-config/index.js
var buf_config_default = {
  id: "buf-config",
  label: "Buf config",
  match: (intake, baseType) => {
    if (!["yaml", "docker-compose", "github-actions"].includes(baseType?.id)) return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name === "buf.yaml" || name === "buf.gen.yaml";
  },
  loadRenderer: () => import("../types/text/yaml/known/buf-config/renderer.js"),
  about: {
    description: "Buf configuration — manages Protobuf linting, breaking change detection, and code generation for gRPC/protobuf projects.",
    usedFor: [{ label: "Protobuf toolchain", description: "Build, lint, and generate code from Protocol Buffers", href: "https://buf.build/docs/configuration/v2/buf-yaml" }]
  }
};

// ../../docs/types/text/yaml/known/buf-gen/index.js
var plugin38 = {
  id: "buf-gen",
  label: "Buf code generation",
  tags: ["protobuf", "grpc", "buf", "codegen"],
  match(intake, baseType) {
    if (!["yaml", "docker-compose", "github-actions"].includes(baseType?.id)) return false;
    const name = (intake.filename || intake.name || "").split("/").pop().toLowerCase();
    return name === "buf.gen.yaml";
  },
  loadRenderer: () => import("../types/text/yaml/known/buf-gen/renderer.js"),
  about: {
    description: "Buf code generation configuration — defines plugins, output paths, options, managed mode settings, and input sources for protobuf code generation.",
    usedFor: [{ label: "Buf", description: "Generate code from Protocol Buffers with the Buf CLI", href: "https://buf.build/docs/configuration/v2/buf-gen-yaml" }]
  }
};
var buf_gen_default = plugin38;

// ../../docs/types/text/yaml/known/mockery-config/index.js
var mockery_config_default = {
  id: "mockery-config",
  label: "mockery",
  match: (intake, baseType) => {
    if (baseType?.id !== "yaml") return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name === ".mockery.yaml" || name === "mockery.yaml";
  },
  loadRenderer: () => import("../types/text/yaml/known/mockery-config/renderer.js"),
  about: {
    description: "mockery configuration — generates Go mock implementations of interfaces for use in tests.",
    usedFor: [{ label: "Go mock generation", description: "Auto-generate mock structs from Go interfaces", href: "https://vektra.github.io/mockery/latest/" }]
  }
};

// ../../docs/types/text/yaml/known/ko-config/index.js
var ko_config_default = {
  id: "ko-config",
  label: "ko",
  match: (intake, baseType) => {
    if (baseType?.id !== "yaml") return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name === ".ko.yaml";
  },
  loadRenderer: () => import("../types/text/yaml/known/ko-config/renderer.js"),
  about: {
    description: "ko configuration — builds and publishes Go container images without a Dockerfile.",
    usedFor: [{ label: "Go container builds", description: "Build minimal container images for Go binaries", href: "https://ko.build" }]
  }
};

// ../../docs/types/text/yaml/known/sqlc-config/index.js
var sqlc_config_default = {
  id: "sqlc-config",
  label: "sqlc",
  match: (intake, baseType) => {
    if (baseType?.id !== "yaml") return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name === "sqlc.yaml" || name === "sqlc.yml";
  },
  loadRenderer: () => import("../types/text/yaml/known/sqlc-config/renderer.js"),
  about: {
    description: "sqlc configuration — generates type-safe Go code from SQL queries and schema definitions.",
    usedFor: [{ label: "SQL code generation", description: "Generate type-safe database query code from SQL", href: "https://sqlc.dev" }]
  }
};

// ../../docs/types/text/yaml/known/nfpm-config/index.js
var nfpm_config_default = {
  id: "nfpm-config",
  label: "nfpm",
  match: (intake, baseType) => {
    if (baseType?.id !== "yaml") return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name === "nfpm.yaml" || name === "nfpm.yml" || name === ".nfpm.yaml";
  },
  loadRenderer: () => import("../types/text/yaml/known/nfpm-config/renderer.js"),
  about: {
    description: "nfpm configuration — packages Go binaries and files into .deb, .rpm, .apk, and .ipk archives.",
    usedFor: [{ label: "Native package creation", description: "Build Linux packages from Go binaries without FPM", href: "https://nfpm.goreleaser.com" }]
  }
};

// ../../docs/types/text/yaml/known/heroku/index.js
var heroku_default = {
  id: "heroku",
  label: "Heroku config",
  match: (intake, baseType) => {
    if (!["yaml", "docker-compose", "github-actions"].includes(baseType?.id)) return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name === "heroku.yml";
  },
  loadRenderer: () => import("../types/text/yaml/known/heroku/renderer.js"),
  about: {
    description: "Heroku deployment configuration — defines Docker images, release commands, and process types for Heroku apps.",
    usedFor: [{ label: "PaaS deployment", description: "Deploy containerized apps to Heroku", href: "https://devcenter.heroku.com/articles/build-docker-images-heroku-yml" }]
  }
};

// ../../docs/types/text/yaml/known/readthedocs/index.js
var readthedocs_default = {
  id: "readthedocs",
  label: "ReadTheDocs config",
  match(intake, baseType) {
    if (!["yaml", "docker-compose", "github-actions"].includes(baseType?.id)) return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name === ".readthedocs.yaml" || name === ".readthedocs.yml";
  },
  loadRenderer: () => import("../types/text/yaml/known/readthedocs/renderer.js"),
  about: {
    description: "ReadTheDocs build configuration — specifies the build OS, Python/Node versions, documentation tool (Sphinx or MkDocs), output formats, and search settings.",
    usedFor: [{ label: "Documentation hosting", description: "Automated documentation build and hosting on ReadTheDocs", href: "https://docs.readthedocs.io/en/stable/config-file/v2.html" }]
  }
};

// ../../docs/types/text/yaml/known/citation-cff/index.js
var citation_cff_default = {
  id: "citation-cff",
  label: "Citation File Format",
  match(intake, baseType) {
    if (!["yaml", "docker-compose", "github-actions"].includes(baseType?.id)) return false;
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return name === "citation.cff";
  },
  loadRenderer: () => import("../types/text/yaml/known/citation-cff/renderer.js"),
  about: {
    description: "Citation File Format (CFF) — machine-readable software or dataset citation metadata including authors, DOI, version, and license.",
    usedFor: [{ label: "Software citation", description: "Standard format for citing software and datasets", href: "https://citation-file-format.github.io/" }]
  }
};

// ../../docs/types/text/yaml/known/yamllint/index.js
var plugin39 = {
  id: "yamllint",
  label: ".yamllint",
  tags: ["yaml", "yamllint", "linting"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === ".yamllint" || n === ".yamllint.yml" || n === ".yamllint.yaml";
  },
  renderer: () => import("../types/text/yaml/known/yamllint/renderer.js"),
  loadRenderer: () => import("../types/text/yaml/known/yamllint/renderer.js"),
  about: {
    description: "yamllint configuration — defines YAML linting rules including line length, indentation, truthy values, and other style checks.",
    usedFor: [{ label: "YAML linting", description: "Linter for YAML files to enforce style and correctness", href: "https://yamllint.readthedocs.io/en/stable/configuration.html" }]
  }
};

// ../../docs/types/text/yaml/known/coderabbit/index.js
var coderabbit_default = {
  id: "coderabbit",
  label: "CodeRabbit config",
  match(intake, baseType) {
    if (!["yaml", "docker-compose", "github-actions"].includes(baseType?.id)) return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name === ".coderabbit.yaml" || name === ".coderabbit.yml";
  },
  loadRenderer: () => import("../types/text/yaml/known/coderabbit/renderer.js"),
  about: {
    description: "CodeRabbit AI code review configuration — controls auto-review behavior, draft PR handling, path filters, language models, and integrated tools.",
    usedFor: [{ label: "AI code review", description: "Automated AI-powered pull request reviews with CodeRabbit", href: "https://docs.coderabbit.ai/getting-started/configure-coderabbit/" }]
  }
};

// ../../docs/types/text/known/vale-ini/index.js
var plugin40 = {
  id: "vale-ini",
  label: "vale.ini",
  tags: ["vale", "prose", "linting", "writing"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "vale.ini" || n === ".vale.ini";
  },
  renderer: () => import("../types/text/known/vale-ini/renderer.js"),
  loadRenderer: () => import("../types/text/known/vale-ini/renderer.js"),
  about: {
    description: "Vale prose linter configuration — StylesPath, MinAlertLevel, Packages, and per-glob style rules for enforcing writing standards.",
    usedFor: [{ label: "Vale prose linter", description: "Enforce prose style and grammar rules in documentation", href: "https://vale.sh/docs/topics/config/" }]
  }
};

// ../../docs/types/text/json/known/ionic-config/index.js
var ionic_config_default = {
  id: "ionic-config",
  label: "Ionic",
  match(intake, baseType) {
    if (baseType?.id !== "json") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "ionic.config.json";
  },
  loadRenderer: () => import("../types/text/json/known/ionic-config/renderer.js"),
  about: { description: "Ionic framework project configuration — app name, ID, integrations (Capacitor, Cordova), and project type." }
};

// ../../docs/types/text/known/metro-config/index.js
var metro_config_default = {
  id: "metro-config",
  label: "Metro (React Native)",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "metro.config.js" || n === "metro.config.ts";
  },
  loadRenderer: () => import("../types/text/known/metro-config/renderer.js"),
  about: { description: "Metro bundler configuration for React Native — transformer, resolver, server, and file extension settings." }
};

// ../../docs/types/text/known/react-native-config/index.js
var react_native_config_default = {
  id: "react-native-config",
  label: "React Native CLI",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "react-native.config.js" || n === "react-native.config.ts";
  },
  loadRenderer: () => import("../types/text/known/react-native-config/renderer.js"),
  about: { description: "React Native CLI configuration — native dependencies, platform overrides, registered assets, and project-level settings." }
};

// ../../docs/types/text/json/known/dotnet-global/index.js
var dotnet_global_default = {
  id: "dotnet-global",
  label: ".NET global.json",
  match(intake, baseType) {
    if (baseType?.id !== "json") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n !== "global.json") return false;
    const text = intake.text || intake.textSample || "";
    return /"sdk"\s*:/.test(text) || /"msbuild-sdks"\s*:/.test(text);
  },
  loadRenderer: () => import("../types/text/json/known/dotnet-global/renderer.js"),
  about: {
    description: "global.json — pins the .NET SDK version for the project, controlling which SDK version dotnet commands use.",
    usedFor: [{ label: ".NET SDK pin", description: "Control which .NET SDK version is used for builds", href: "https://learn.microsoft.com/en-us/dotnet/core/tools/global-json" }]
  }
};

// ../../docs/types/text/known/prisma-schema/index.js
var prisma_schema_default = {
  id: "prisma-schema",
  label: "Prisma Schema",
  match(intake) {
    const n = (intake.filename || intake.name || "").split("/").pop().toLowerCase();
    return n === "schema.prisma" || n.endsWith(".prisma");
  },
  loadRenderer: () => import("../types/text/known/prisma-schema/renderer.js"),
  about: {
    description: "Prisma schema file — defines the data model, datasource, and generator configuration for Prisma ORM.",
    usedFor: [{ label: "Prisma ORM", description: "Define database models and generate a type-safe client", href: "https://www.prisma.io/docs/concepts/components/prisma-schema" }]
  }
};

// ../../docs/types/text/xml/known/nuget-config/index.js
var nuget_config_default = {
  id: "nuget-config",
  label: "NuGet Config",
  match(intake, baseType) {
    if (baseType?.id !== "xml") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n !== "nuget.config" && n !== "nuget.config.xml") return false;
    const text = intake.text || "";
    return !text || /<packageSources|<configuration>/i.test(text);
  },
  loadRenderer: () => import("../types/text/xml/known/nuget-config/renderer.js"),
  about: {
    description: "NuGet.Config — configures package sources, credentials, and behavior for the NuGet package manager.",
    usedFor: [{ label: "NuGet", description: "Configure package sources and restore behavior for .NET projects", href: "https://learn.microsoft.com/en-us/nuget/reference/nuget-config-file" }]
  }
};

// ../../docs/types/text/known/sentry-props/index.js
var sentry_props_default = {
  id: "sentry-props",
  label: "Sentry",
  match(intake) {
    return (intake.name || intake.filename || "").split("/").pop().toLowerCase() === "sentry.properties";
  },
  loadRenderer: () => import("../types/text/known/sentry-props/renderer.js"),
  about: {
    description: "Sentry SDK configuration — DSN, release, environment, and source upload settings for Android/Java.",
    usedFor: [{ label: "Error tracking", description: "Configure Sentry DSN, release, environment, and native symbol upload options.", href: "https://docs.sentry.io/platforms/android/configuration/options/" }]
  }
};

// ../../docs/types/text/yaml/known/otel-collector/index.js
var otel_collector_default = {
  id: "otel-collector",
  label: "OTel Collector",
  match(intake, baseType) {
    if (baseType?.id !== "yaml") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return [
      "otel-collector-config.yaml",
      "otel-collector-config.yml",
      "otelcol.yaml",
      "otelcol.yml",
      "otelcol-config.yaml",
      "otelcol-config.yml",
      "collector.yaml",
      "collector.yml",
      "opentelemetry-collector.yaml",
      "opentelemetry-collector.yml"
    ].includes(n);
  },
  loadRenderer: () => import("../types/text/yaml/known/otel-collector/renderer.js"),
  about: {
    description: "OpenTelemetry Collector configuration — receivers, processors, exporters, and service pipelines.",
    usedFor: [{ label: "Observability pipeline", description: "Configure OTel Collector receivers, processors, exporters, and telemetry pipelines.", href: "https://opentelemetry.io/docs/collector/configuration/" }]
  }
};

// ../../docs/types/text/xml/known/logback/index.js
var logback_default = {
  id: "logback",
  label: "Logback",
  match(intake, baseType) {
    if (baseType?.id !== "xml") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "logback.xml" || n === "logback-spring.xml" || n === "logback-test.xml";
  },
  loadRenderer: () => import("../types/text/xml/known/logback/renderer.js"),
  about: {
    description: "Logback logging configuration — appenders, root log level, and named logger overrides.",
    usedFor: [{ label: "Java logging", description: "Configure Logback appenders, encoders, log levels, and Spring profile-based logging.", href: "https://logback.qos.ch/manual/configuration.html" }]
  }
};

// ../../docs/types/text/xml/known/log4j2/index.js
var log4j2_default = {
  id: "log4j2",
  label: "Log4j2",
  match(intake, baseType) {
    if (baseType?.id !== "xml") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "log4j2.xml" || n === "log4j2-spring.xml" || n === "log4j2-test.xml";
  },
  loadRenderer: () => import("../types/text/xml/known/log4j2/renderer.js"),
  about: {
    description: "Log4j2 logging configuration — appenders, root logger level, and logger overrides.",
    usedFor: [{ label: "Java logging", description: "Configure Log4j2 appenders, layouts, log levels, and async logging.", href: "https://logging.apache.org/log4j/2.x/manual/configuration.html" }]
  }
};

// ../../docs/types/text/xml/known/checkstyle-xml/index.js
var checkstyle_xml_default = {
  id: "checkstyle-xml",
  label: "Checkstyle Config",
  match(intake, baseType) {
    if (baseType?.id !== "xml") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const nameOk = n === "checkstyle.xml" || n.includes("checkstyle");
    const text = intake.text || "";
    const contentOk = text.includes('<module name="Checker"') || text.includes("DOCTYPE module PUBLIC") || text.includes("checkstyle");
    return nameOk && contentOk;
  },
  loadRenderer: () => import("../types/text/xml/known/checkstyle-xml/renderer.js"),
  about: {
    description: "Checkstyle configuration — module tree of code-style rules applied to Java source files.",
    usedFor: [{ label: "Checkstyle", description: "Static analysis tool that checks Java source code for style issues.", href: "https://checkstyle.org/" }]
  }
};

// ../../docs/types/text/xml/known/spotbugs-config/index.js
var spotbugs_config_default = {
  id: "spotbugs-config",
  label: "SpotBugs Filter",
  match(intake, baseType) {
    if (baseType?.id !== "xml") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const nameOk = n === "spotbugs.xml" || n === "findbugs.xml" || n === "spotbugs-exclude.xml" || n === "spotbugs-include.xml" || n === "findbugs-exclude.xml";
    const text = intake.text || "";
    const contentOk = text.includes("<FindBugsFilter") || text.includes("<BugPattern") || text.includes("<Match") && (text.includes("<Bug") || text.includes("<Class"));
    return nameOk && contentOk;
  },
  loadRenderer: () => import("../types/text/xml/known/spotbugs-config/renderer.js"),
  about: {
    description: "SpotBugs/FindBugs filter — rules that include or exclude specific bug patterns, classes, and methods from analysis.",
    usedFor: [{ label: "SpotBugs", description: "Static analysis tool that finds bugs in Java programs.", href: "https://spotbugs.github.io/" }]
  }
};

// ../../docs/types/text/yaml/known/prometheus-rules/index.js
var prometheus_rules_default = {
  id: "prometheus-rules",
  label: "Prometheus Rules",
  match(intake, baseType) {
    if (baseType?.id !== "yaml") return false;
    const text = intake.text || "";
    return text.includes("groups:") && (text.includes("alert:") || text.includes("record:")) && text.includes("expr:");
  },
  loadRenderer: () => import("../types/text/yaml/known/prometheus-rules/renderer.js"),
  about: {
    description: "Prometheus alerting and recording rules — groups of alert conditions and derived metrics expressions.",
    usedFor: [{ label: "Alert rules", description: "Define Prometheus alerting rules with conditions, severity labels, and summary annotations.", href: "https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/" }]
  }
};

// ../../docs/types/text/json/known/grafana-dashboard/index.js
var grafana_dashboard_default = {
  id: "grafana-dashboard",
  label: "Grafana Dashboard",
  match(intake, baseType) {
    if (baseType?.id !== "json") return false;
    const text = intake.text || "";
    return text.includes('"panels"') && text.includes('"schemaVersion"');
  },
  loadRenderer: () => import("../types/text/json/known/grafana-dashboard/renderer.js"),
  about: {
    description: "Grafana dashboard definition — panels, variables, time range, and visualization settings.",
    usedFor: [{ label: "Dashboards", description: "Grafana dashboard JSON model with panels, templating variables, and time range configuration.", href: "https://grafana.com/docs/grafana/latest/dashboards/" }]
  }
};

// ../../docs/types/text/yaml/known/jaeger-config/index.js
var jaeger_config_default = {
  id: "jaeger-config",
  label: "Jaeger config",
  match(intake, baseType) {
    if (baseType?.id !== "yaml") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return ["jaeger.yml", "jaeger.yaml", "jaeger-config.yml", "jaeger-config.yaml", "jaeger-all-in-one.yml", "jaeger-all-in-one.yaml"].includes(n);
  },
  loadRenderer: () => import("../types/text/yaml/known/jaeger-config/renderer.js"),
  about: {
    description: "Jaeger distributed tracing configuration — query port, collector endpoints, storage backend, and sampling strategies.",
    usedFor: [{ label: "Distributed tracing", description: "Configure Jaeger all-in-one or components for distributed tracing with various storage backends.", href: "https://www.jaegertracing.io/docs/latest/deployment/" }]
  }
};

// ../../docs/types/text/yaml/known/opentelemetry-k8s/index.js
var opentelemetry_k8s_default = {
  id: "opentelemetry-k8s",
  label: "OTel Operator resource",
  match(intake, baseType) {
    if (baseType?.id !== "yaml") return false;
    const text = intake.text || "";
    return text.includes("opentelemetry.io") && (text.includes("kind: OpenTelemetryCollector") || text.includes("kind: Instrumentation"));
  },
  loadRenderer: () => import("../types/text/yaml/known/opentelemetry-k8s/renderer.js"),
  about: {
    description: "OpenTelemetry Operator Kubernetes resource — collector deployment mode, pipeline config, or auto-instrumentation settings.",
    usedFor: [{ label: "OTel Operator", description: "Kubernetes custom resources for the OpenTelemetry Operator: OpenTelemetryCollector and Instrumentation CRDs.", href: "https://opentelemetry.io/docs/kubernetes/operator/" }]
  }
};

// ../../docs/types/text/yaml/known/scorecard/index.js
var scorecard_default = {
  id: "scorecard",
  label: "OpenSSF Scorecard",
  match(intake, baseType) {
    if (baseType?.id !== "yaml") return false;
    const n = (intake.filename || intake.name || "").split("/").pop().toLowerCase();
    return ["scorecard.yml", "scorecard.yaml", ".scorecard.yml", ".scorecard.yaml"].includes(n);
  },
  loadRenderer: () => import("../types/text/yaml/known/scorecard/renderer.js"),
  about: {
    description: "OpenSSF Scorecard configuration — automated security health metrics for open source projects.",
    usedFor: [{ label: "Supply chain security", description: "OpenSSF Scorecard checks for security best practices", href: "https://github.com/ossf/scorecard" }]
  }
};

// ../../docs/types/text/yaml/known/socket-security/index.js
var socket_security_default = {
  id: "socket-security",
  label: "Socket Security",
  match(intake, baseType) {
    if (baseType?.id !== "yaml") return false;
    const n = (intake.filename || intake.name || "").split("/").pop().toLowerCase();
    return n === "socket.yml" || n === ".socket.yml" || n === "socket.yaml";
  },
  loadRenderer: () => import("../types/text/yaml/known/socket-security/renderer.js"),
  about: {
    description: "Socket.dev security configuration — protects against supply chain attacks in npm, PyPI, and other package ecosystems.",
    usedFor: [{ label: "Supply chain security", description: "Socket.dev monitors packages for malware, typosquatting, and vulnerabilities", href: "https://docs.socket.dev/docs/socket-yml" }]
  }
};

// ../../docs/types/text/yaml/known/trivy-config/index.js
var trivy_config_default = {
  id: "trivy-config",
  label: "Trivy",
  tags: ["trivy", "security", "scanning"],
  match(intake, baseType) {
    if (baseType?.id !== "yaml") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (!["trivy.yaml", "trivy.yml", ".trivy.yaml", ".trivy.yml", "trivy-config.yaml", "trivy-config.yml"].includes(n)) return false;
    const text = intake.text || "";
    return text.includes("severity:") || text.includes("vulnerability:") || text.includes("scan:") || text.includes("format:") || text.includes("scanners:");
  },
  loadRenderer: () => import("../types/text/yaml/known/trivy-config/renderer.js"),
  about: {
    description: "Trivy security scanner configuration — scans for vulnerabilities, secrets, misconfigurations, and license issues.",
    usedFor: [{ label: "Security scanning", description: "Aqua Trivy all-in-one open source vulnerability scanner", href: "https://aquasecurity.github.io/trivy/latest/docs/references/configuration/config-file/" }]
  }
};

// ../../docs/types/text/known/snyk-config/index.js
var snyk_config_default = {
  id: "snyk-config",
  label: "Snyk",
  match(intake) {
    return (intake.name || intake.filename || "").split("/").pop().toLowerCase() === ".snyk";
  },
  loadRenderer: () => import("../types/text/known/snyk-config/renderer.js"),
  about: {
    description: ".snyk policy file — Snyk vulnerability and license ignore rules, patches, and language settings.",
    usedFor: [{ label: "Vulnerability management", description: "Snyk policy for ignoring false positives and applying patches", href: "https://docs.snyk.io/manage-risk/policies/the-.snyk-file" }]
  }
};

// ../../docs/types/text/yaml/known/grype/index.js
var plugin41 = {
  id: "grype",
  label: "Grype config",
  tags: ["security", "vulnerability", "sbom", "containers"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === ".grype.yaml" || n === ".grype.yml" || n === "grype.yaml";
  },
  loadRenderer: () => import("../types/text/yaml/known/grype/renderer.js"),
  about: {
    description: "Anchore Grype vulnerability scanner configuration — severity thresholds, ignore rules, registry auth, and output settings.",
    usedFor: [{ label: "Vulnerability scanning", description: "Grype is a vulnerability scanner for container images and filesystems by Anchore.", href: "https://github.com/anchore/grype" }]
  }
};

// ../../docs/types/text/yaml/known/tetragon/index.js
var plugin42 = {
  id: "tetragon",
  label: "Tetragon policy",
  tags: ["security", "ebpf", "runtime", "cilium"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "tetragon.yaml" || n === "tetragon.yml") return true;
    const t = intake.text || "";
    return /kind:\s*(TracingPolicy|TracingPolicyNamespaced)/m.test(t) && /apiVersion:\s*cilium\.io/m.test(t);
  },
  loadRenderer: () => import("../types/text/yaml/known/tetragon/renderer.js"),
  about: {
    description: "Cilium Tetragon TracingPolicy — eBPF-based runtime security policy for tracing kernel functions, syscalls, and user-space probes.",
    usedFor: [{ label: "Runtime security", description: "Tetragon is a Cilium project providing eBPF-based security observability and enforcement.", href: "https://tetragon.io/docs/" }]
  }
};

// ../../docs/types/text/known/gradle-props/index.js
var gradle_props_default = {
  id: "gradle-props",
  label: "Gradle properties",
  match: (intake) => (intake.name || intake.filename || "").split("/").pop().toLowerCase() === "gradle.properties",
  loadRenderer: () => import("../types/text/known/gradle-props/renderer.js"),
  about: { description: "Gradle project properties — JVM args, parallel builds, daemon settings, Kotlin/Android SDK versions, and custom project properties." }
};

// ../../docs/types/text/known/gradle-wrapper/index.js
var gradle_wrapper_default = {
  id: "gradle-wrapper",
  label: "Gradle Wrapper",
  match: (intake) => (intake.name || intake.filename || "").split("/").pop().toLowerCase() === "gradle-wrapper.properties",
  loadRenderer: () => import("../types/text/known/gradle-wrapper/renderer.js"),
  about: { description: "Gradle Wrapper configuration — the Gradle version, distribution URL, and download settings used to bootstrap Gradle in the project." }
};

// ../../docs/types/text/known/settings-gradle/index.js
var settings_gradle_default = {
  id: "settings-gradle",
  label: "Gradle Settings",
  tags: ["gradle", "build", "java", "kotlin"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "settings.gradle" || n === "settings.gradle.kts";
  },
  loadRenderer: () => import("../types/text/known/settings-gradle/renderer.js"),
  about: { description: "Gradle multi-project settings — root project name, included subprojects, plugin management repositories, and dependency resolution settings." }
};

// ../../docs/types/text/known/spring-app/index.js
var spring_app_default = {
  id: "spring-app",
  label: "Spring Boot config",
  match: (intake) => {
    if ((intake.filename || intake.name || "").split("/").pop().toLowerCase() !== "application.properties") return false;
    const text = intake.text || (intake.bytes ? new TextDecoder().decode(intake.bytes.slice(0, 2e3)) : "");
    return /^spring\.|^server\.port|^management\.|^logging\.level/m.test(text);
  },
  loadRenderer: () => import("../types/text/known/spring-app/renderer.js"),
  about: { description: "Spring Boot application configuration — server port, active profiles, application name, datasource, cache, and logging settings." }
};

// ../../docs/types/text/yaml/known/spring-app/index.js
var spring_app_default2 = {
  id: "spring-app-yml",
  label: "Spring Boot config (YAML)",
  match: (intake, baseType) => {
    if (baseType?.id !== "yaml") return false;
    const n = (intake.filename || intake.name || "").split("/").pop().toLowerCase();
    if (n !== "application.yml" && n !== "application.yaml") return false;
    const text = intake.text || (intake.bytes ? new TextDecoder().decode(intake.bytes.slice(0, 2e3)) : "");
    return /\bspring\b|\bserver:\s*$|\bmanagement\b|\blogging\b/m.test(text);
  },
  loadRenderer: () => import("../types/text/yaml/known/spring-app/renderer.js"),
  about: { description: "Spring Boot YAML application configuration — server port, active profiles, datasource, logging, and other Spring properties." }
};

// ../../docs/types/text/xml/known/csproj/index.js
var csproj_default = {
  id: "csproj",
  label: ".NET Project",
  match(intake, baseType) {
    if (baseType?.id !== "xml") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n.endsWith(".csproj") || n.endsWith(".vbproj") || n.endsWith(".fsproj");
  },
  loadRenderer: () => import("../types/text/xml/known/csproj/renderer.js")
};

// ../../docs/types/text/xml/known/directory-build/index.js
var directory_build_default = {
  id: "directory-build",
  label: "MSBuild Shared Props",
  match(intake, baseType) {
    if (baseType?.id !== "xml") return false;
    const n = (intake.name || intake.filename || "").toLowerCase();
    const base = n.split("/").pop();
    return base === "directory.build.props" || base === "directory.build.targets" || base === "directory.packages.props";
  },
  loadRenderer: () => import("../types/text/xml/known/directory-build/renderer.js")
};

// ../../docs/types/text/xml/known/msbuild-props/index.js
var msbuild_props_default = {
  id: "msbuild-props",
  label: "MSBuild",
  match(intake, baseType) {
    if (baseType?.id !== "xml") return false;
    const n = (intake.name || intake.filename || "").toLowerCase();
    const base = n.split("/").pop();
    if (!base.endsWith(".props") && !base.endsWith(".targets")) return false;
    if (base.endsWith(".csproj") || base.endsWith(".vbproj") || base.endsWith(".fsproj")) return false;
    if (base === "directory.build.props" || base === "directory.build.targets" || base === "directory.packages.props") return false;
    const text = intake.text || "";
    return /<Project[\s>]/i.test(text);
  },
  loadRenderer: () => import("../types/text/xml/known/msbuild-props/renderer.js")
};

// ../../docs/types/text/xml/known/nuspec/index.js
var nuspec_default = {
  id: "nuspec",
  label: "NuGet Package Spec",
  match(intake, baseType) {
    if (baseType?.id !== "xml") return false;
    return (intake.name || intake.filename || "").toLowerCase().endsWith(".nuspec");
  },
  loadRenderer: () => import("../types/text/xml/known/nuspec/renderer.js")
};

// ../../docs/types/text/yaml/known/stack-yaml/index.js
var stack_yaml_default = {
  id: "stack-yaml",
  label: "Haskell Stack",
  match(intake, baseType) {
    if (baseType?.id !== "yaml") return false;
    const n = (intake.filename || intake.name || "").split("/").pop().toLowerCase();
    return n === "stack.yaml";
  },
  loadRenderer: () => import("../types/text/yaml/known/stack-yaml/renderer.js"),
  about: {
    description: "Haskell Stack build configuration — defines the resolver/snapshot, local packages, extra dependencies, and GHC options.",
    usedFor: [
      { label: "Haskell projects", description: "Reproducible Haskell builds using the Stack tool" }
    ]
  }
};

// ../../docs/types/text/known/cabal/index.js
var cabal_default = {
  id: "cabal",
  label: "Haskell Cabal",
  match(intake) {
    return (intake.filename || intake.name || "").split("/").pop().toLowerCase().endsWith(".cabal");
  },
  loadRenderer: () => import("../types/text/known/cabal/renderer.js"),
  about: {
    description: "Haskell Cabal package descriptor — defines the package metadata, dependencies, library, executables, test suites, and benchmarks.",
    usedFor: [
      { label: "Haskell packages", description: "Haskell library and application package definitions" }
    ]
  }
};

// ../../docs/types/text/known/opam-file/index.js
var plugin43 = {
  id: "opam-file",
  label: "opam",
  tags: ["ocaml", "opam", "package", "dependency"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "opam" || n.endsWith(".opam")) return true;
    const t = intake.text || "";
    return /^opam-version:/m.test(t);
  },
  renderer: () => import("../types/text/known/opam-file/renderer.js"),
  loadRenderer: () => import("../types/text/known/opam-file/renderer.js")
};
var opam_file_default = plugin43;

// ../../docs/types/text/json/known/package-resolved/index.js
var package_resolved_default = {
  id: "package-resolved",
  label: "Swift Package.resolved",
  match(intake, baseType) {
    if (baseType?.id !== "json") return false;
    return (intake.filename || intake.name || "").split("/").pop() === "Package.resolved";
  },
  loadRenderer: () => import("../types/text/json/known/package-resolved/renderer.js"),
  about: {
    description: "Swift Package Manager lock file — records the resolved versions of all package dependencies.",
    usedFor: [
      { label: "Swift packages", description: "iOS, macOS, and cross-platform Swift projects using SwiftPM" }
    ]
  }
};

// ../../docs/types/text/known/rebar-config/index.js
var rebar_config_default = {
  id: "rebar-config",
  label: "Erlang rebar3",
  match(intake) {
    const n = (intake.filename || intake.name || "").split("/").pop().toLowerCase();
    return n === "rebar.config" || n === "rebar3.config";
  },
  loadRenderer: () => import("../types/text/known/rebar-config/renderer.js"),
  about: {
    description: "Erlang rebar3 build configuration — defines project dependencies, OTP version requirements, plugins, profiles, and dialyzer settings.",
    usedFor: [
      { label: "Erlang projects", description: "OTP applications and libraries built with rebar3" }
    ]
  }
};

// ../../docs/types/text/known/erlang-sys-config/index.js
var erlang_sys_config_default = {
  id: "erlang-sys-config",
  label: "Erlang sys.config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const text = intake.textSample || intake.text || "";
    if (n === "sys.config" || n === "sys.config.src") return true;
    if (text.trim().startsWith("[") && text.includes("{") && text.match(/\[\s*\{\s*\w+\s*,\s*\[/)) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/erlang-sys-config/renderer.js"),
  about: {
    description: "Erlang/OTP application configuration — a list of {ApplicationName, [{Key, Value}]} tuples configuring OTP applications at runtime.",
    usedFor: [
      { label: "Erlang/OTP", description: "Concurrent, distributed runtime system", href: "https://www.erlang.org/doc/man/config.html" },
      { label: "Elixir", description: "Uses sys.config via Mix releases", href: "https://hexdocs.pm/mix/Mix.Tasks.Release.html" }
    ]
  }
};

// ../../docs/types/text/known/erlang-vm-args/index.js
var erlang_vm_args_default = {
  id: "erlang-vm-args",
  label: "Erlang vm.args",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const text = intake.textSample || intake.text || "";
    if (n === "vm.args" || n === "vm.args.src") return true;
    if ((text.includes("-name ") || text.includes("-sname ")) && text.includes("-setcookie")) return true;
    if (text.includes("+K true") || text.includes("+P ") || text.includes("+W w")) {
      if (text.includes("-name") || text.includes("-sname")) return true;
    }
    return false;
  },
  loadRenderer: () => import("../types/text/known/erlang-vm-args/renderer.js"),
  about: {
    description: "Erlang VM startup arguments — configures the node name, cookie, scheduler threads, memory, and other BEAM virtual machine settings.",
    usedFor: [
      { label: "Erlang/OTP", description: "Configure BEAM virtual machine startup", href: "https://www.erlang.org/doc/man/erl.html" },
      { label: "Elixir", description: "Used in Mix releases to configure the runtime", href: "https://hexdocs.pm/mix/Mix.Tasks.Release.html" }
    ]
  }
};

// ../../docs/types/text/known/cpanfile/index.js
var cpanfile_default = {
  id: "cpanfile",
  label: "cpanfile",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const text = intake.textSample || intake.text || "";
    if (n === "cpanfile" || n === "cpanfile.snapshot") return true;
    if ((text.includes("requires ") || text.includes("recommends ") || text.includes("suggests ")) && text.match(/requires\s+['"][\w:]+['"]/)) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/cpanfile/renderer.js"),
  about: {
    description: "Perl cpanfile — declares CPAN module dependencies with version constraints and optional/recommended requirements.",
    usedFor: [
      { label: "Carton", description: "Perl module dependency manager", href: "https://metacpan.org/pod/Carton" },
      { label: "cpanm", description: "CPAN module installer", href: "https://metacpan.org/pod/App::cpanminus" }
    ]
  }
};

// ../../docs/types/text/known/r-description/index.js
var r_description_default = {
  id: "r-description",
  label: "R DESCRIPTION",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop();
    return n === "DESCRIPTION";
  },
  loadRenderer: () => import("../types/text/known/r-description/renderer.js"),
  about: { description: "R package DESCRIPTION file — package name, version, authors, dependencies, and license metadata." }
};

// ../../docs/types/text/known/r-profile/index.js
var r_profile_default = {
  id: "r-profile",
  label: "R Profile",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === ".rprofile" || n === "rprofile.site";
  },
  loadRenderer: () => import("../types/text/known/r-profile/renderer.js"),
  about: { description: "R startup configuration file — options, environment variables, and packages loaded on R startup." }
};

// ../../docs/types/text/known/docusaurus-config/index.js
var docusaurus_config_default = {
  id: "docusaurus-config",
  label: "Docusaurus Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "docusaurus.config.js" || n === "docusaurus.config.ts" || n === "docusaurus.config.mjs";
  },
  loadRenderer: () => import("../types/text/known/docusaurus-config/renderer.js"),
  about: { description: "Docusaurus documentation site configuration — defines site metadata, plugins, themes, and navigation." }
};

// ../../docs/types/text/known/vitepress-config/index.js
var vitepress_config_default = {
  id: "vitepress-config",
  label: "VitePress Config",
  match(intake) {
    const path = (intake.path || intake.filename || intake.name || "").toLowerCase();
    const name = path.split("/").pop();
    const isConfigFile = name === "config.ts" || name === "config.mts" || name === "config.js" || name === "vitepress.config.ts" || name === "vitepress.config.mts" || name === "vitepress.config.js";
    if (!isConfigFile) return false;
    if (path.includes(".vitepress")) return true;
    const text = intake.text || intake.textSample || "";
    return /from\s+['"]vitepress['"]/.test(text);
  },
  loadRenderer: () => import("../types/text/known/vitepress-config/renderer.js"),
  about: { description: "VitePress documentation site configuration — defines site title, description, theme config, and navigation." }
};

// ../../docs/types/text/known/sphinx-conf/index.js
var sphinx_conf_default = {
  id: "sphinx-conf",
  label: "Sphinx Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n !== "conf.py") return false;
    const text = intake.text || (intake.bytes ? new TextDecoder().decode(intake.bytes) : "");
    return /extensions\s*=/.test(text) || /html_theme\s*=/.test(text) || /sphinx/i.test(text);
  },
  loadRenderer: () => import("../types/text/known/sphinx-conf/renderer.js"),
  about: { description: "Sphinx documentation generator configuration — defines project metadata, extensions, and HTML theme." }
};

// ../../docs/types/text/known/doxyfile/index.js
var doxyfile_default = {
  id: "doxyfile",
  label: "Doxyfile",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "doxyfile" || n === "doxyfile.in" || n === "doxygen.conf";
  },
  loadRenderer: () => import("../types/text/known/doxyfile/renderer.js"),
  about: { description: "Doxygen documentation generator configuration — defines project name, input sources, and output formats." }
};

// ../../docs/types/text/known/drizzle-config/index.js
var drizzle_config_default = {
  id: "drizzle-config",
  label: "Drizzle ORM Config",
  match(intake) {
    const n = (intake.filename || intake.name || "").split("/").pop().toLowerCase();
    return n === "drizzle.config.ts" || n === "drizzle.config.js";
  },
  loadRenderer: () => import("../types/text/known/drizzle-config/renderer.js"),
  about: {
    description: "Drizzle ORM configuration — defines the dialect, schema path, output directory, and database credentials for Drizzle Kit.",
    usedFor: [{ label: "Drizzle ORM", description: "Type-safe SQL ORM with schema migrations", href: "https://orm.drizzle.team/docs/drizzle-config-file" }]
  }
};

// ../../docs/types/text/known/knexfile/index.js
var knexfile_default = {
  id: "knexfile",
  label: "Knex.js Config",
  match(intake) {
    const n = (intake.filename || intake.name || "").split("/").pop().toLowerCase();
    return n === "knexfile.js" || n === "knexfile.ts" || n === "knexfile.mjs";
  },
  loadRenderer: () => import("../types/text/known/knexfile/renderer.js"),
  about: {
    description: "Knex.js database configuration — defines client adapters, connection details, migration directories, and seed paths per environment.",
    usedFor: [{ label: "Knex.js", description: "SQL query builder and migration tool for Node.js", href: "https://knexjs.org/guide/" }]
  }
};

// ../../docs/types/text/ini/known/alembic/index.js
var alembic_default = {
  id: "alembic",
  label: "Alembic Migrations",
  match(intake, baseType) {
    if (baseType?.id !== "ini") return false;
    const n = (intake.filename || intake.name || "").split("/").pop().toLowerCase();
    return n === "alembic.ini";
  },
  loadRenderer: () => import("../types/text/ini/known/alembic/renderer.js"),
  about: {
    description: "Alembic configuration file — defines the migration script location, database URL, and logging settings for SQLAlchemy database migrations.",
    usedFor: [{ label: "Alembic", description: "Database migration tool for SQLAlchemy", href: "https://alembic.sqlalchemy.org/en/latest/tutorial.html" }]
  }
};

// ../../docs/types/text/known/flyway-conf/index.js
var flyway_conf_default = {
  id: "flyway-conf",
  label: "Flyway Config",
  match(intake) {
    const n = (intake.filename || intake.name || "").split("/").pop().toLowerCase();
    return n === "flyway.conf" || n === "flyway.properties" || n === "flyway.toml";
  },
  loadRenderer: () => import("../types/text/known/flyway-conf/renderer.js"),
  about: {
    description: "Flyway database migration configuration — defines the JDBC URL, credentials, migration locations, baseline settings, and schema targets.",
    usedFor: [{ label: "Flyway", description: "Database version control and migration tool", href: "https://documentation.red-gate.com/fd/flyway-documentation-138346877.html" }]
  }
};

// ../../docs/types/text/yaml/known/dbt-project/index.js
var dbt_project_default = {
  id: "dbt-project",
  label: "dbt project",
  match(intake, baseType) {
    if (!baseType || baseType.id !== "yaml") return false;
    const name = (intake.filename || intake.name || "").split("/").pop().toLowerCase();
    return name === "dbt_project.yml";
  },
  loadRenderer: () => import("../types/text/yaml/known/dbt-project/renderer.js"),
  about: {
    description: "dbt (data build tool) project configuration — defines the project name, version, profile, model paths, seed paths, and model-level configurations such as materializations, schemas, and tags.",
    usedFor: [{ label: "dbt", description: "Analytics engineering framework for data transformations", href: "https://docs.getdbt.com/reference/dbt_project.yml" }]
  }
};

// ../../docs/types/text/known/liquibase-props/index.js
var liquibase_props_default = {
  id: "liquibase-props",
  label: "Liquibase Config",
  match(intake) {
    const name = (intake.filename || intake.name || "").split("/").pop().toLowerCase();
    return name === "liquibase.properties";
  },
  loadRenderer: () => import("../types/text/known/liquibase-props/renderer.js"),
  about: {
    description: "Liquibase database migration configuration — defines the changelog file, JDBC URL, credentials, driver class, and output settings for the Liquibase migration tool.",
    usedFor: [{ label: "Liquibase", description: "Database schema change management and versioning tool", href: "https://docs.liquibase.com/concepts/connections/creating-config-properties.html" }]
  }
};

// ../../docs/types/text/known/sqitch-conf/index.js
var sqitch_conf_default = {
  id: "sqitch-conf",
  label: "Sqitch Config",
  match(intake) {
    const name = (intake.filename || intake.name || "").split("/").pop().toLowerCase();
    return name === "sqitch.conf";
  },
  loadRenderer: () => import("../types/text/known/sqitch-conf/renderer.js"),
  about: {
    description: "Sqitch database change management configuration — defines the core engine, plan file, top directory, and target database connection settings with engine-specific options.",
    usedFor: [{ label: "Sqitch", description: "Sensible database change management tool", href: "https://sqitch.org/docs/manual/sqitch-config/" }]
  }
};

// ../../docs/types/text/known/atlas-hcl/index.js
var atlas_hcl_default = {
  id: "atlas-hcl",
  label: "Atlas Config",
  match(intake) {
    const name = (intake.filename || intake.name || "").split("/").pop().toLowerCase();
    return name === "atlas.hcl" || name === "atlas.sum";
  },
  loadRenderer: () => import("../types/text/known/atlas-hcl/renderer.js"),
  about: {
    description: "Atlas schema migration tool configuration — defines environment blocks with database URLs, schema sources, migration directories, and variable declarations. Also handles atlas.sum integrity files.",
    usedFor: [{ label: "Atlas", description: "Database schema-as-code migration tool", href: "https://atlasgo.io/atlas-schema/projects" }]
  }
};

// ../../docs/types/text/known/waypoint/index.js
var plugin44 = {
  id: "waypoint",
  label: "HashiCorp Waypoint",
  tags: ["deployment", "hashicorp", "devops"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "waypoint.hcl";
  },
  loadRenderer: () => import("../types/text/known/waypoint/renderer.js"),
  about: {
    description: "HashiCorp Waypoint application deployment configuration — defines projects, apps, build plugins, deploy platforms, release methods, and URL service settings.",
    usedFor: [{ label: "Waypoint", description: "HashiCorp application deployment and delivery platform", href: "https://developer.hashicorp.com/waypoint/docs" }]
  }
};
var waypoint_default = plugin44;

// ../../docs/types/text/known/project-clj/index.js
var project_clj_default = {
  id: "project-clj",
  label: "Leiningen",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop();
    return n.toLowerCase() === "project.clj";
  },
  loadRenderer: () => import("../types/text/known/project-clj/renderer.js"),
  about: { description: "Leiningen build file for Clojure projects — defines project name, version, dependencies, plugins, and build profiles." }
};

// ../../docs/types/text/known/deps-edn/index.js
var deps_edn_default = {
  id: "deps-edn",
  label: "Clojure CLI",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop();
    return n.toLowerCase() === "deps.edn";
  },
  loadRenderer: () => import("../types/text/known/deps-edn/renderer.js"),
  about: { description: "Clojure CLI / tools.deps dependency spec — defines library dependencies, source paths, and alias configurations." }
};

// ../../docs/types/text/known/shadow-cljs/index.js
var shadow_cljs_default = {
  id: "shadow-cljs",
  label: "Shadow-cljs",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop();
    return n.toLowerCase() === "shadow-cljs.edn";
  },
  loadRenderer: () => import("../types/text/known/shadow-cljs/renderer.js"),
  about: { description: "Shadow-cljs build tool configuration — source paths, npm dependencies, and build targets for ClojureScript." }
};

// ../../docs/types/text/known/wdio-config/index.js
var wdio_config_default = {
  id: "wdio-config",
  label: "WebdriverIO Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "wdio.conf.js" || n === "wdio.conf.ts" || n === "wdio.conf.mjs";
  },
  loadRenderer: () => import("../types/text/known/wdio-config/renderer.js"),
  about: { description: "WebdriverIO test runner configuration — defines framework, browser capabilities, spec patterns, reporters, and concurrency settings." }
};

// ../../docs/types/text/yaml/known/artillery-yml/index.js
var artillery_yml_default = {
  id: "artillery-yml",
  label: "Artillery Config",
  match(intake, baseType) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return baseType.id === "yaml" && (n === "artillery.yml" || n === "artillery.yaml" || n === ".artillery.yml");
  },
  loadRenderer: () => import("../types/text/yaml/known/artillery-yml/renderer.js"),
  about: { description: "Artillery load testing configuration — defines target URL, load phases (arrival rates / ramp-up), and scenario flows." }
};

// ../../docs/types/text/known/k6-config/index.js
var k6_config_default = {
  id: "k6-config",
  label: "k6 Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "k6.config.js" || n === "k6.config.ts";
  },
  loadRenderer: () => import("../types/text/known/k6-config/renderer.js"),
  about: { description: "k6 performance test configuration — defines virtual users, duration, load stages, and threshold rules." }
};

// ../../docs/types/text/known/gatling-conf/index.js
var gatling_conf_default = {
  id: "gatling-conf",
  label: "Gatling Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "gatling.conf") return true;
    if (n === "application.conf") {
      const head = (intake.text || (intake.bytes ? new TextDecoder().decode(intake.bytes.slice(0, 500)) : "")).slice(0, 500);
      return /gatling/i.test(head);
    }
    return false;
  },
  loadRenderer: () => import("../types/text/known/gatling-conf/renderer.js"),
  about: { description: "Gatling load testing configuration — HOCON format defining simulation directories, output paths, HTTP settings, and data writers." }
};

// ../../docs/types/text/known/cursor-rules/index.js
var cursor_rules_default = {
  id: "cursor-rules",
  label: "Cursor AI Rules",
  match(intake) {
    const path = intake.filename || "";
    const name = path.split("/").pop().toLowerCase();
    return name === ".cursorrules" || path.toLowerCase().includes(".cursor/rules/") && name.endsWith(".mdc");
  },
  loadRenderer: () => import("../types/text/known/cursor-rules/renderer.js"),
  about: {
    description: "Cursor AI rules file — project-specific instructions and context for the Cursor AI code editor.",
    usedFor: [{ label: "AI coding assistant", description: "Rules and context for Cursor AI", href: "https://docs.cursor.com/context/rules-for-ai" }]
  }
};

// ../../docs/types/text/known/claude-md/index.js
var claude_md_default = {
  id: "claude-md",
  label: "Claude Code config",
  match(intake) {
    const path = intake.filename || "";
    const name = path.split("/").pop().toLowerCase();
    return name === "claude.md" && (name === "claude.md" || path.toLowerCase().endsWith(".claude/claude.md"));
  },
  loadRenderer: () => import("../types/text/known/claude-md/renderer.js"),
  about: {
    description: "Claude Code CLAUDE.md — project-specific instructions, conventions, and context for the Claude Code AI assistant.",
    usedFor: [{ label: "AI coding assistant", description: "System prompt and instructions for Claude Code", href: "https://docs.anthropic.com/en/docs/claude-code/overview" }]
  }
};

// ../../docs/types/text/known/copilot-instructions/index.js
var copilot_instructions_default = {
  id: "copilot-instructions",
  label: "GitHub Copilot instructions",
  match(intake) {
    const path = intake.filename || "";
    const name = path.split("/").pop().toLowerCase();
    return name === "copilot-instructions.md";
  },
  loadRenderer: () => import("../types/text/known/copilot-instructions/renderer.js"),
  about: {
    description: "GitHub Copilot instructions file — custom guidelines and context for GitHub Copilot in this repository.",
    usedFor: [{ label: "AI coding assistant", description: "Custom instructions for GitHub Copilot", href: "https://docs.github.com/en/copilot/customizing-copilot/adding-repository-custom-instructions-for-github-copilot" }]
  }
};

// ../../docs/types/text/yaml/known/aider-conf/index.js
var aider_conf_default = {
  id: "aider-conf",
  label: "Aider AI config",
  match(intake, baseType) {
    if (!baseType || !["yaml"].includes(baseType.id)) return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name === "aider.conf.yml" || name === ".aider.conf.yml";
  },
  loadRenderer: () => import("../types/text/yaml/known/aider-conf/renderer.js"),
  about: {
    description: "Aider AI configuration file — settings for the Aider AI pair programming tool, including model selection, edit format, and git integration.",
    usedFor: [{ label: "AI coding assistant", description: "Aider AI pair programmer configuration", href: "https://aider.chat/docs/config/aider_conf.html" }]
  }
};

// ../../docs/types/text/yaml/known/gae-app/index.js
var gae_app_default = {
  id: "gae-app",
  label: "Google App Engine",
  match: (intake, baseType) => {
    if (baseType?.id !== "yaml") return false;
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (name !== "app.yaml") return false;
    const text = intake.text || "";
    return /\bruntime\s*:/m.test(text) || /\bservice\s*:/m.test(text) || /\benv\s*:\s*(standard|flex)/m.test(text);
  },
  loadRenderer: () => import("../types/text/yaml/known/gae-app/renderer.js"),
  about: {
    description: "Google App Engine configuration — runtime, service name, environment, URL handlers, and scaling settings.",
    usedFor: [{ label: "PaaS deployment", description: "Deploy apps to Google App Engine", href: "https://cloud.google.com/appengine/docs/standard/reference/app-yaml" }]
  }
};

// ../../docs/types/text/yaml/known/cloudbuild/index.js
var cloudbuild_default = {
  id: "cloudbuild",
  label: "Google Cloud Build",
  match: (intake, baseType) => {
    if (baseType?.id !== "yaml") return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name === "cloudbuild.yaml" || name === "cloudbuild.yml";
  },
  loadRenderer: () => import("../types/text/yaml/known/cloudbuild/renderer.js"),
  about: {
    description: "Google Cloud Build configuration — build steps, substitutions, artifacts, and timeout.",
    usedFor: [{ label: "CI/CD on GCP", description: "Build and test with Google Cloud Build", href: "https://cloud.google.com/build/docs/build-config-file-schema" }]
  }
};

// ../../docs/types/text/json/known/google-services/index.js
var google_services_default = {
  id: "google-services",
  label: "Google Services (Firebase)",
  match: (intake, baseType) => {
    if (baseType?.id !== "json") return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name === "google-services.json";
  },
  loadRenderer: () => import("../types/text/json/known/google-services/renderer.js"),
  about: {
    description: "Firebase/Google Services configuration for Android — project info, API keys, OAuth clients, and Firebase sender IDs.",
    usedFor: [{ label: "Firebase Android", description: "Connect Android app to Firebase and Google APIs", href: "https://firebase.google.com/docs/android/setup" }]
  }
};

// ../../docs/types/text/yaml/known/catalog-info/index.js
var catalog_info_default = {
  id: "catalog-info",
  label: "Backstage Catalog Entity",
  match: (intake, baseType) => {
    if (baseType?.id !== "yaml") return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name === "catalog-info.yaml" || name === "catalog-info.yml";
  },
  loadRenderer: () => import("../types/text/yaml/known/catalog-info/renderer.js"),
  about: {
    description: "Backstage service catalog entity descriptor — kind, metadata, spec (type, lifecycle, owner, dependencies).",
    usedFor: [{ label: "Backstage catalog", description: "Register services in the Backstage developer portal", href: "https://backstage.io/docs/features/software-catalog/descriptor-format" }]
  }
};

// ../../docs/types/text/xml/known/phpunit/index.js
var phpunit_default = {
  id: "phpunit",
  label: "PHPUnit Config",
  match(intake, baseType) {
    if (baseType?.id !== "xml") return false;
    const n = (intake.filename || "").split("/").pop().toLowerCase();
    if (n === "phpunit.xml" || n === "phpunit.xml.dist") return null;
    return n === "phpunit.dist.xml";
  },
  loadRenderer: () => import("../types/text/xml/known/phpunit/renderer.js"),
  about: {
    description: "PHPUnit configuration file — defines test suites, coverage settings, and PHP environment for the PHPUnit testing framework.",
    usedFor: [{ label: "PHP testing", description: "PHPUnit is the de-facto standard testing framework for PHP", href: "https://phpunit.de/documentation.html" }]
  }
};

// ../../docs/types/text/known/phpstan/index.js
var phpstan_default = {
  id: "phpstan",
  label: "PHPStan Config",
  match(intake) {
    const n = (intake.filename || "").split("/").pop().toLowerCase();
    return n === "phpstan.neon" || n === "phpstan.dist.neon" || n === "phpstan.neon.dist";
  },
  loadRenderer: () => import("../types/text/known/phpstan/renderer.js"),
  about: {
    description: "PHPStan configuration file (NEON format) — static analysis level, analysed paths, ignored errors, and extensions.",
    usedFor: [{ label: "PHP static analysis", description: "PHPStan finds bugs in PHP code without running it", href: "https://phpstan.org/config-reference" }]
  }
};

// ../../docs/types/text/known/php-cs-fixer/index.js
var php_cs_fixer_default = {
  id: "php-cs-fixer",
  label: "PHP CS Fixer Config",
  match(intake) {
    const n = (intake.filename || "").split("/").pop().toLowerCase();
    return n === ".php-cs-fixer.php" || n === ".php-cs-fixer.dist.php";
  },
  loadRenderer: () => import("../types/text/known/php-cs-fixer/renderer.js"),
  about: {
    description: "PHP CS Fixer configuration file — defines coding standards, finder paths, and fixers for automatic PHP code style correction.",
    usedFor: [{ label: "PHP code style", description: "PHP CS Fixer automatically fixes PHP coding standards issues", href: "https://cs.symfony.com/" }]
  }
};

// ../../docs/types/text/yaml/known/behat/index.js
var behat_default = {
  id: "behat",
  label: "Behat Config",
  match(intake, baseType) {
    if (baseType?.id !== "yaml") return false;
    const n = (intake.filename || "").split("/").pop().toLowerCase();
    return n === "behat.yml" || n === "behat.yaml";
  },
  loadRenderer: () => import("../types/text/yaml/known/behat/renderer.js"),
  about: {
    description: "Behat configuration file — defines test suites, contexts, formatters, and step definitions for BDD (Behavior-Driven Development) testing in PHP.",
    usedFor: [{ label: "PHP BDD testing", description: "Behat is a BDD framework for PHP inspired by Cucumber", href: "https://docs.behat.org/en/latest/userguide/configuration.html" }]
  }
};

// ../../docs/types/text/ini/known/php-ini/index.js
var php_ini_default = {
  id: "php-ini",
  label: "PHP Configuration",
  match(intake, baseType) {
    if (baseType?.id !== "ini") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "php.ini" || n === "php.ini-production" || n === "php.ini-development";
  },
  loadRenderer: () => import("../types/text/ini/known/php-ini/renderer.js"),
  about: {
    description: "PHP runtime configuration — memory limits, execution timeouts, upload sizes, error reporting, date settings, and session handling.",
    usedFor: [{ label: "PHP config", description: "php.ini controls PHP runtime behaviour: memory, timeouts, uploads, errors, and extensions.", href: "https://www.php.net/manual/en/configuration.file.php" }]
  }
};

// ../../docs/types/text/xml/known/psalm-config/index.js
var psalm_config_default = {
  id: "psalm-config",
  label: "Psalm Config",
  match(intake, baseType) {
    if (baseType?.id !== "xml") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "psalm.xml" || n === "psalm.xml.dist") return true;
    const text = intake.text || "";
    return /<psalm[\s>]/.test(text);
  },
  loadRenderer: () => import("../types/text/xml/known/psalm-config/renderer.js"),
  about: {
    description: "Psalm static analysis configuration — error level, PHP version target, project roots, plugins, stubs, and per-issue suppressions.",
    usedFor: [{ label: "Psalm static analyzer", description: "Psalm finds type errors and bugs in PHP code without running it.", href: "https://psalm.dev/docs/running_psalm/configuration/" }]
  }
};

// ../../docs/types/text/xml/known/phpunit-config/index.js
var phpunit_config_default = {
  id: "phpunit-config",
  label: "PHPUnit Config",
  match(intake, baseType) {
    if (baseType?.id !== "xml") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n !== "phpunit.xml" && n !== "phpunit.xml.dist") return false;
    const text = intake.text || "";
    return /<phpunit[\s>]/.test(text);
  },
  loadRenderer: () => import("../types/text/xml/known/phpunit-config/renderer.js"),
  about: {
    description: "PHPUnit configuration — test suites, bootstrap file, PHP ini settings, coverage source paths, and extensions.",
    usedFor: [{ label: "PHPUnit testing", description: "PHPUnit is the de-facto standard testing framework for PHP.", href: "https://phpunit.de/documentation.html" }]
  }
};

// ../../docs/types/text/known/rector-config/index.js
var rector_config_default = {
  id: "rector-config",
  label: "Rector Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n !== "rector.php" && n !== "config.php") return false;
    const text = intake.text || "";
    return text.includes("->withRules(") || text.includes("RectorConfig") || text.includes("->withPhpSets(");
  },
  loadRenderer: () => import("../types/text/known/rector-config/renderer.js"),
  about: {
    description: "Rector automated PHP refactoring configuration — upgrade rules, PHP version target, dead code removal, and rule sets.",
    usedFor: [{ label: "Rector PHP upgrader", description: "Rector automatically upgrades PHP code to newer versions and applies coding standard rules.", href: "https://getrector.com/documentation" }]
  }
};

// ../../docs/types/text/known/terragrunt/index.js
var terragrunt_default = {
  id: "terragrunt",
  label: "Terragrunt Config",
  match(intake, _baseType) {
    const n = (intake.name || intake.filename || "").split("/").pop();
    return n === "terragrunt.hcl";
  },
  loadRenderer: () => import("../types/text/known/terragrunt/renderer.js"),
  about: {
    description: "Terragrunt IaC wrapper configuration — module source, includes, inputs, and dependencies.",
    usedFor: [{ label: "Terragrunt", description: "Terragrunt DRY wrapper for Terraform: module source, includes, inputs, and dependencies.", href: "https://terragrunt.gruntwork.io/docs/reference/config-blocks-and-attributes/" }]
  }
};

// ../../docs/types/text/known/tflint/index.js
var tflint_default = {
  id: "tflint",
  label: "TFLint Config",
  match(intake, _baseType) {
    const n = (intake.name || intake.filename || "").split("/").pop();
    return n === ".tflint.hcl" || n === "tflint.hcl";
  },
  loadRenderer: () => import("../types/text/known/tflint/renderer.js"),
  about: {
    description: "TFLint Terraform linter configuration — rules, plugins, and settings.",
    usedFor: [{ label: "TFLint", description: "TFLint Terraform linter: rules, plugins, and configuration settings.", href: "https://github.com/terraform-linters/tflint/blob/master/docs/user-guide/config.md" }]
  }
};

// ../../docs/types/text/known/tf-lock/index.js
var tf_lock_default = {
  id: "tf-lock",
  label: "Terraform Lock File",
  match(intake, _baseType) {
    const n = (intake.name || intake.filename || "").split("/").pop();
    return n === ".terraform.lock.hcl";
  },
  loadRenderer: () => import("../types/text/known/tf-lock/renderer.js"),
  about: {
    description: "Terraform provider lock file — pinned provider versions and integrity hashes.",
    usedFor: [{ label: "Terraform", description: "Terraform dependency lock file: pinned provider versions, constraints, and integrity hashes.", href: "https://developer.hashicorp.com/terraform/language/files/dependency-lock" }]
  }
};

// ../../docs/types/text/known/versions-tf/index.js
var versions_tf_default = {
  id: "versions-tf",
  label: "Terraform Versions",
  match(intake, _baseType) {
    const n = (intake.name || intake.filename || "").split("/").pop();
    if (n === "versions.tf") return true;
    if (n === "providers.tf") {
      const text = intake.textSample || intake.text || "";
      return text.includes("required_providers");
    }
    return false;
  },
  loadRenderer: () => import("../types/text/known/versions-tf/renderer.js"),
  about: {
    description: "Terraform version constraints and required provider declarations.",
    usedFor: [{ label: "Terraform", description: "Terraform version constraints and required provider source/version declarations.", href: "https://developer.hashicorp.com/terraform/language/settings" }]
  }
};

// ../../docs/types/text/known/tsup-config/index.js
var tsup_config_default = {
  id: "tsup-config",
  label: "tsup Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "tsup.config.ts" || n === "tsup.config.js" || n === "tsup.config.mts" || n === "tsup.config.mjs";
  },
  loadRenderer: () => import("../types/text/known/tsup-config/renderer.js"),
  about: { description: "tsup bundler configuration — defines entry points, output formats, TypeScript declarations, and build options." }
};

// ../../docs/types/text/known/rspack-config/index.js
var rspack_config_default = {
  id: "rspack-config",
  label: "Rspack Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "rspack.config.js" || n === "rspack.config.ts" || n === "rspack.config.mjs";
  },
  loadRenderer: () => import("../types/text/known/rspack-config/renderer.js"),
  about: { description: "Rspack bundler configuration — a Rust-powered webpack-compatible bundler; defines entry, output, loaders, plugins, and mode." }
};

// ../../docs/types/text/known/esbuild-config/index.js
var esbuild_config_default = {
  id: "esbuild-config",
  label: "esbuild config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "esbuild.config.mjs" || n === "esbuild.config.js" || n === "esbuild.config.ts" || n === "esbuild.config.cjs" || n === "build.mjs";
  },
  loadRenderer: () => import("../types/text/known/esbuild-config/renderer.js"),
  about: {
    description: "esbuild configuration — entry points, bundle output, minification, target environments, and plugins for the esbuild JavaScript bundler.",
    usedFor: [{ label: "esbuild", description: "Fast JavaScript bundler and minifier", href: "https://esbuild.github.io/api/" }]
  }
};

// ../../docs/types/text/json/known/parcelrc/index.js
var parcelrc_default = {
  id: "parcelrc",
  label: "Parcel Config",
  match(intake, baseType) {
    if (baseType?.id !== "json") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === ".parcelrc";
  },
  loadRenderer: () => import("../types/text/json/known/parcelrc/renderer.js"),
  about: { description: "Parcel bundler configuration — defines transformers, resolvers, packagers, optimizers, and reporters as named plugins." }
};

// ../../docs/types/text/toml/known/bunfig/index.js
var bunfig_default = {
  id: "bunfig-toml",
  label: "Bun Config",
  match(intake, baseType) {
    if (baseType?.id !== "toml") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "bunfig.toml";
  },
  loadRenderer: () => import("../types/text/toml/known/bunfig/renderer.js"),
  about: { description: "Bun runtime configuration — install registry, test preloads, serve port, run settings, and telemetry preferences." }
};

// ../../docs/types/text/toml/known/shopify-app/index.js
var plugin45 = {
  id: "shopify-app",
  label: "Shopify app",
  tags: ["shopify", "ecommerce", "app"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "shopify.app.toml";
  },
  loadRenderer: () => import("../types/text/toml/known/shopify-app/renderer.js"),
  about: {
    description: "Shopify app configuration for the Shopify CLI v3+ — defines app identity, OAuth scopes, webhooks, extensions, and redirect URLs.",
    usedFor: [
      { label: "Shopify apps", description: "Configure and deploy Shopify apps using the Shopify CLI", href: "https://shopify.dev/docs/apps/build/cli-for-apps/app-configuration" }
    ]
  }
};
var shopify_app_default = plugin45;

// ../../docs/types/text/json/known/lighthouserc/index.js
var plugin46 = {
  id: "lighthouserc",
  label: "Lighthouse CI",
  tags: ["lighthouse", "performance", "ci", "lhci"],
  match(intake, baseType) {
    if (baseType?.id !== "json") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === ".lighthouserc.json" || n === "lighthouserc.json" || n === ".lighthouserc.js" || n === "lighthouserc.js";
  },
  loadRenderer: () => import("../types/text/json/known/lighthouserc/renderer.js"),
  about: {
    description: "Google Lighthouse CI configuration — defines how to collect, assert, and upload Lighthouse audit results in a CI pipeline.",
    usedFor: [
      { label: "Lighthouse CI", description: "Automate Lighthouse performance audits in your CI workflow", href: "https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/configuration.md" }
    ]
  }
};
var lighthouserc_default = plugin46;

// ../../docs/types/text/yaml/known/atlantis/index.js
var atlantis_default = {
  id: "atlantis",
  label: "Atlantis config",
  match: (intake, baseType) => {
    if (baseType?.id !== "yaml") return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name === "atlantis.yaml" || name === "atlantis.yml";
  },
  loadRenderer: () => import("../types/text/yaml/known/atlantis/renderer.js"),
  about: {
    description: "Atlantis Terraform PR automation config — shows projects, workflows, and parallel plan/apply settings.",
    usedFor: [{ label: "Terraform PR automation", description: "Atlantis automates Terraform plan/apply in pull requests", href: "https://www.runatlantis.io/docs/repo-level-atlantis-yaml.html" }]
  }
};

// ../../docs/types/text/yaml/known/spacelift-config/index.js
var plugin47 = {
  id: "spacelift-config",
  label: "Spacelift Config",
  tags: ["spacelift", "iac", "terraform", "pulumi", "ci", "yaml"],
  match(intake, baseType) {
    if (baseType?.id !== "yaml") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const full = (intake.name || intake.filename || "").toLowerCase();
    return n === "config.yml" && full.includes(".spacelift") || n === "spacelift-config.yml";
  },
  loadRenderer: () => import("../types/text/yaml/known/spacelift-config/renderer.js"),
  about: {
    description: "Spacelift IaC CI/CD configuration — shows stacks, backend, branch, project root, and auto-apply settings.",
    usedFor: [{ label: "IaC CI/CD automation", description: "Spacelift automates Terraform, Pulumi, and other IaC workflows", href: "https://docs.spacelift.io/" }]
  }
};
var spacelift_config_default = plugin47;

// ../../docs/types/text/yaml/known/kamal-config/index.js
var plugin48 = {
  id: "kamal-config",
  label: "Kamal 2 Deploy Config",
  tags: ["kamal", "deploy", "docker", "devops", "yaml"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "kamal.yml" || n === "kamal.yaml") return true;
    if (n === "deploy.yml") {
      const text = intake.textSample || intake.text || "";
      return /service\s*:/m.test(text) && /image\s*:/m.test(text) && !/jobs\s*:/m.test(text);
    }
    return false;
  },
  loadRenderer: () => import("../types/text/yaml/known/kamal-config/renderer.js"),
  about: {
    description: "Kamal 2 deployment configuration — service, image, servers, env vars (secrets masked), volumes, proxy, and accessories.",
    usedFor: [{ label: "Kamal 2", description: "Deploy containerized apps anywhere with zero downtime using Docker and SSH", href: "https://kamal-deploy.org/" }]
  }
};
var kamal_config_default = plugin48;

// ../../docs/types/text/yaml/known/prefect-config/index.js
var plugin49 = {
  id: "prefect-config",
  label: "Prefect Config",
  tags: ["prefect", "workflow", "orchestration", "devops", "yaml"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "prefect.yaml" || n === "prefect.yml";
  },
  loadRenderer: () => import("../types/text/yaml/known/prefect-config/renderer.js"),
  about: {
    description: "Prefect 2 workflow orchestration configuration — project, deployments, work pools, schedules, build/pull/push steps.",
    usedFor: [{ label: "Prefect 2", description: "Modern workflow orchestration platform for data and ML pipelines", href: "https://docs.prefect.io/" }]
  }
};
var prefect_config_default = plugin49;

// ../../docs/types/text/yaml/known/checkov/index.js
var checkov_default = {
  id: "checkov",
  label: "Checkov config",
  match: (intake, baseType) => {
    if (baseType?.id !== "yaml") return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name === ".checkov.yaml" || name === ".checkov.yml" || name === "checkov.yaml";
  },
  loadRenderer: () => import("../types/text/yaml/known/checkov/renderer.js"),
  about: {
    description: "Checkov IaC security scanner config — shows frameworks, check filters, output format, and scan directories.",
    usedFor: [{ label: "IaC security scanning", description: "Checkov scans Terraform, CloudFormation, Kubernetes and more for misconfigurations", href: "https://www.checkov.io/2.Basics/CLI%20Command%20Reference.html" }]
  }
};

// ../../docs/types/text/yaml/known/terraform-docs/index.js
var terraform_docs_default = {
  id: "terraform-docs",
  label: "terraform-docs config",
  match: (intake, baseType) => {
    if (baseType?.id !== "yaml") return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name === ".terraform-docs.yml" || name === ".terraform-docs.yaml";
  },
  loadRenderer: () => import("../types/text/yaml/known/terraform-docs/renderer.js"),
  about: {
    description: "terraform-docs config — shows formatter, output file, and enabled documentation sections.",
    usedFor: [{ label: "Terraform documentation", description: "terraform-docs generates documentation from Terraform modules", href: "https://terraform-docs.io/user-guide/configuration/" }]
  }
};

// ../../docs/types/text/yaml/known/infracost/index.js
var infracost_default = {
  id: "infracost",
  label: "Infracost config",
  match: (intake, baseType) => {
    if (baseType?.id !== "yaml") return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name === "infracost.yml" || name === "infracost.yaml";
  },
  loadRenderer: () => import("../types/text/yaml/known/infracost/renderer.js"),
  about: {
    description: "Infracost cloud cost estimation config — shows projects, currency, and Terraform variable paths.",
    usedFor: [{ label: "Cloud cost estimation", description: "Infracost shows cloud cost estimates for Terraform changes in pull requests", href: "https://www.infracost.io/docs/features/config_file/" }]
  }
};

// ../../docs/types/text/yaml/known/opencost-config/index.js
var opencost_config_default = {
  id: "opencost-config",
  label: "OpenCost config",
  match(intake, baseType) {
    if (baseType?.id !== "yaml") return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name === "opencost.yaml" || name === "opencost.yml";
  },
  loadRenderer: () => import("../types/text/yaml/known/opencost-config/renderer.js"),
  about: {
    description: "OpenCost configuration — shows cluster, Prometheus endpoint, exporter settings, and UI status.",
    usedFor: [{ label: "Kubernetes cost monitoring", description: "OpenCost is an open-source cost monitoring tool for Kubernetes workloads.", href: "https://www.opencost.io/docs/" }]
  }
};

// ../../docs/types/text/yaml/known/crossplane-config/index.js
var crossplane_config_default = {
  id: "crossplane-config",
  label: "Crossplane config",
  match(intake, baseType) {
    if (baseType?.id !== "yaml") return false;
    const t = intake.text || intake.textSample || "";
    return t.includes("crossplane.io") && (t.includes("kind: Configuration") || t.includes("kind: Provider") || t.includes("kind: CompositeResourceDefinition") || t.includes("kind: Composition"));
  },
  loadRenderer: () => import("../types/text/yaml/known/crossplane-config/renderer.js"),
  about: {
    description: "Crossplane resource manifest — shows kind, apiVersion, name, and spec summary for Providers, Configurations, XRDs, and Compositions.",
    usedFor: [{ label: "Cloud infrastructure control plane", description: "Crossplane extends Kubernetes to provision and manage cloud infrastructure as custom resources.", href: "https://docs.crossplane.io/" }]
  }
};

// ../../docs/types/text/yaml/known/keda-config/index.js
var keda_config_default = {
  id: "keda-config",
  label: "KEDA config",
  match(intake, baseType) {
    if (baseType?.id !== "yaml") return false;
    const t = intake.text || intake.textSample || "";
    return t.includes("keda.sh") || t.includes("kind: ScaledObject") || t.includes("kind: ScaledJob");
  },
  loadRenderer: () => import("../types/text/yaml/known/keda-config/renderer.js"),
  about: {
    description: "KEDA ScaledObject/ScaledJob manifest — shows scaling target, replica bounds, polling interval, and trigger summary.",
    usedFor: [{ label: "Kubernetes event-driven autoscaling", description: "KEDA provides event-driven autoscaling for Kubernetes workloads using external event sources.", href: "https://keda.sh/docs/" }]
  }
};

// ../../docs/types/text/yaml/known/velero-config/index.js
var velero_config_default = {
  id: "velero-config",
  label: "Velero config",
  match(intake, baseType) {
    if (baseType?.id !== "yaml") return false;
    const t = intake.text || intake.textSample || "";
    return t.includes("velero.io") || t.includes("kind: BackupStorageLocation") || t.includes("kind: Schedule") && t.includes("velero") || t.includes("kind: Backup");
  },
  loadRenderer: () => import("../types/text/yaml/known/velero-config/renderer.js"),
  about: {
    description: "Velero backup manifest — shows kind, storage provider, bucket, schedule (cron), TTL, and namespace filters.",
    usedFor: [{ label: "Kubernetes backup and restore", description: "Velero backs up and restores Kubernetes cluster resources and persistent volumes.", href: "https://velero.io/docs/" }]
  }
};

// ../../docs/types/text/xml/known/android-manifest/index.js
var android_manifest_default = {
  id: "android-manifest",
  label: "Android Manifest",
  match(intake, baseType) {
    if (baseType?.id !== "xml") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "androidmanifest.xml";
  },
  loadRenderer: () => import("../types/text/xml/known/android-manifest/renderer.js"),
  about: {
    description: "Android app manifest — declares the app package, version, permissions, and components (activities, services, receivers, providers).",
    usedFor: [{ label: "Android", description: "Required configuration file for every Android application", href: "https://developer.android.com/guide/topics/manifest/manifest-intro" }]
  }
};

// ../../docs/types/text/xml/known/app-config/index.js
var app_config_default = {
  id: "app-config",
  label: ".NET App Config",
  match(intake, baseType) {
    if (baseType?.id !== "xml") return false;
    return (intake.filename || intake.name || "").split("/").pop().toLowerCase() === "app.config";
  },
  loadRenderer: () => import("../types/text/xml/known/app-config/renderer.js"),
  about: {
    description: "app.config — .NET Framework application configuration file. Stores connection strings, app settings, supported runtime versions, and custom config sections.",
    usedFor: [{ label: ".NET Framework", description: "Configure .NET Framework desktop/console/WCF apps", href: "https://learn.microsoft.com/en-us/dotnet/framework/configure-apps/file-schema/application-configuration-file" }]
  }
};

// ../../docs/types/text/known/build-zig-zon/index.js
var build_zig_zon_default = {
  id: "build-zig-zon",
  label: "Zig Package Manifest",
  match(intake) {
    const n = (intake.filename || "").split("/").pop();
    return n === "build.zig.zon";
  },
  loadRenderer: () => import("../types/text/known/build-zig-zon/renderer.js"),
  about: {
    description: "Zig package manager manifest (ZON format) — defines the package name, version, and dependencies with URLs and hashes.",
    usedFor: [
      { label: "Zig packages", description: "Libraries and executables using the Zig package manager", href: "https://ziglang.org/learn/build-system/" }
    ]
  }
};

// ../../docs/types/text/known/zig-zon/index.js
var zig_zon_default = {
  id: "zig-zon",
  label: "Zig Package Manifest",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "build.zig.zon") return true;
    const text = intake.textSample || intake.text || "";
    if (text.includes(".name =") && text.includes(".version =") && text.includes(".dependencies")) return true;
    if (text.includes(".url =") && text.includes(".hash =") && n.endsWith(".zon")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/zig-zon/renderer.js"),
  about: {
    description: "Zig build.zig.zon package manifest — name, version, and dependencies in ZON format.",
    tags: ["zig", "zon", "package", "manifest", "build"]
  }
};

// ../../docs/types/text/known/cartfile/index.js
var cartfile_default = {
  id: "cartfile",
  label: "Carthage Cartfile",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "cartfile" || n === "cartfile.resolved";
  },
  loadRenderer: () => import("../types/text/known/cartfile/renderer.js"),
  about: {
    description: "Carthage dependency file — lists GitHub, git, or binary dependencies with version constraints.",
    usedFor: [{ label: "Carthage", description: "Decentralized dependency manager for Cocoa", href: "https://github.com/Carthage/Carthage" }]
  }
};

// ../../docs/types/text/yaml/known/electron-builder/index.js
var electron_builder_default = {
  id: "electron-builder",
  label: "Electron Builder",
  match(intake, baseType) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (baseType?.id === "yaml" || baseType?.id === "json") {
      return n === "electron-builder.yml" || n === "electron-builder.yaml" || n === "electron-builder.json";
    }
    return false;
  },
  loadRenderer: () => import("../types/text/yaml/known/electron-builder/renderer.js"),
  about: {
    description: "electron-builder.yml — Electron Builder configuration for packaging and distributing Electron apps.",
    usedFor: [{ label: "Electron app packaging", description: "Build installers for Windows, macOS, and Linux", href: "https://www.electron.build/configuration/configuration" }]
  }
};

// ../../docs/types/text/json/known/elm-json/index.js
var elm_json_default = {
  id: "elm-json",
  label: "Elm Package / Application",
  match: (intake, baseType) => {
    if (baseType?.id !== "json") return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name === "elm.json";
  },
  loadRenderer: () => import("../types/text/json/known/elm-json/renderer.js"),
  about: {
    description: "Elm language project manifest — describes whether this is a package or application, the Elm version, and dependencies.",
    usedFor: [
      { label: "Elm applications", description: "Browser applications built with the Elm language", href: "https://elm-lang.org/" },
      { label: "Elm packages", description: "Libraries published to the Elm package catalog", href: "https://package.elm-lang.org/" }
    ]
  }
};

// ../../docs/types/text/yaml/known/external-secrets/index.js
var external_secrets_default = {
  id: "external-secrets",
  label: "External Secrets",
  match(intake, baseType) {
    if (baseType?.id !== "yaml") return false;
    const text = intake.textSample || intake.text || "";
    return /kind:\s*(ExternalSecret|SecretStore|ClusterExternalSecret|ClusterSecretStore)\b/.test(text);
  },
  loadRenderer: () => import("../types/text/yaml/known/external-secrets/renderer.js"),
  about: {
    description: "External Secrets Operator manifest — synchronises secrets from external providers (AWS SSM, Vault, GCP Secret Manager, etc.) into Kubernetes Secrets.",
    usedFor: [{ label: "Secret management", description: "Define ExternalSecret, SecretStore, or ClusterExternalSecret resources for External Secrets Operator.", href: "https://external-secrets.io/latest/" }]
  }
};

// ../../docs/types/text/known/fluent-bit/index.js
var fluent_bit_default = {
  id: "fluent-bit",
  label: "Fluent Bit config",
  match(intake, baseType) {
    const n = (intake.filename || intake.name || "").split("/").pop().toLowerCase();
    return n === "fluent-bit.conf";
  },
  loadRenderer: () => import("../types/text/known/fluent-bit/renderer.js"),
  about: {
    description: "Fluent Bit log processor configuration — defines SERVICE settings, INPUT sources, FILTER plugins, and OUTPUT destinations.",
    usedFor: [{ label: "Fluent Bit", description: "Lightweight and high-performance log processor and forwarder", href: "https://docs.fluentbit.io/manual/administration/configuring-fluent-bit" }]
  }
};

// ../../docs/types/text/known/logstash-conf/index.js
var logstash_conf_default = {
  id: "logstash-conf",
  label: "Logstash pipeline config",
  match(intake) {
    const n = (intake.filename || intake.name || "").split("/").pop().toLowerCase();
    return n === "logstash.conf" || n.startsWith("logstash-") && n.endsWith(".conf") || n === "logstash.yml" || n === "logstash.yaml";
  },
  loadRenderer: () => import("../types/text/known/logstash-conf/renderer.js"),
  about: {
    description: "Logstash pipeline configuration — defines input sources, filter transformations, and output destinations using a Ruby-like DSL.",
    usedFor: [{ label: "Logstash", description: "Server-side data processing pipeline for ingesting, transforming, and forwarding log data", href: "https://www.elastic.co/guide/en/logstash/current/configuration.html" }]
  }
};

// ../../docs/types/text/known/fluentd-conf/index.js
var fluentd_conf_default = {
  id: "fluentd-conf",
  label: "Fluentd config",
  match(intake) {
    const n = (intake.filename || intake.name || "").split("/").pop().toLowerCase();
    return n === "fluent.conf" || n === "fluentd.conf";
  },
  loadRenderer: () => import("../types/text/known/fluentd-conf/renderer.js"),
  about: {
    description: "Fluentd configuration — defines source inputs, filter rules, and match destinations using an XML-like tag syntax.",
    usedFor: [{ label: "Fluentd", description: "Open-source data collector for unified log management and forwarding", href: "https://docs.fluentd.org/configuration" }]
  }
};

// ../../docs/types/text/known/graylog-conf/index.js
var graylog_conf_default = {
  id: "graylog-conf",
  label: "Graylog server config",
  match(intake) {
    const n = (intake.filename || intake.name || "").split("/").pop().toLowerCase();
    return n === "graylog.conf" || n === "graylog-server.conf";
  },
  loadRenderer: () => import("../types/text/known/graylog-conf/renderer.js"),
  about: {
    description: "Graylog log management server configuration — defines node identity, HTTP bindings, Elasticsearch hosts, MongoDB connection, and data retention settings.",
    usedFor: [{ label: "Graylog", description: "Open-source log management platform for collecting, indexing, and analyzing log data.", href: "https://docs.graylog.org/docs/server-configuration" }]
  }
};

// ../../docs/types/text/yaml/known/loki-config/index.js
var loki_config_default = {
  id: "loki-config",
  label: "Loki config",
  match(intake, baseType) {
    if (baseType?.id !== "yaml") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "loki-config.yaml" || n === "loki-config.yml" || n === "loki.yaml" || n === "loki.yml";
  },
  loadRenderer: () => import("../types/text/yaml/known/loki-config/renderer.js"),
  about: {
    description: "Grafana Loki configuration — defines server settings, storage backends, schema, ingestion limits, and compaction.",
    usedFor: [{ label: "Loki", description: "Horizontally-scalable, highly-available log aggregation system by Grafana Labs", href: "https://grafana.com/docs/loki/latest/configuration/" }]
  }
};

// ../../docs/types/text/yaml/known/promtail-config/index.js
var promtail_config_default = {
  id: "promtail-config",
  label: "Promtail config",
  match(intake, baseType) {
    if (baseType?.id !== "yaml") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "promtail-config.yaml" || n === "promtail-config.yml" || n === "promtail.yaml" || n === "promtail.yml";
  },
  loadRenderer: () => import("../types/text/yaml/known/promtail-config/renderer.js"),
  about: {
    description: "Promtail configuration — defines the Loki client endpoint, server settings, and log scrape configurations.",
    usedFor: [{ label: "Promtail", description: "Log shipping agent for Grafana Loki — scrapes logs and forwards them to Loki", href: "https://grafana.com/docs/loki/latest/send-data/promtail/configuration/" }]
  }
};

// ../../docs/types/text/yaml/known/tempo/index.js
var tempo_default = {
  id: "tempo",
  label: "Grafana Tempo",
  match(intake, baseType) {
    if (baseType?.id !== "yaml") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "tempo.yaml" || n === "tempo.yml" || n === "tempo-config.yaml" || n === "tempo-config.yml";
  },
  loadRenderer: () => import("../types/text/yaml/known/tempo/renderer.js"),
  about: {
    description: "Grafana Tempo distributed tracing configuration — server ports, receivers, ingester, storage backend, query frontend, and metrics generator.",
    usedFor: [{ label: "Distributed tracing", description: "Configure Grafana Tempo for distributed tracing with multiple receiver protocols (OTLP, Jaeger, Zipkin) and various storage backends.", href: "https://grafana.com/docs/tempo/latest/configuration/" }]
  }
};

// ../../docs/types/text/yaml/known/mimir/index.js
var mimir_default = {
  id: "mimir",
  label: "Grafana Mimir",
  match(intake, baseType) {
    if (baseType?.id !== "yaml") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "mimir.yaml" || n === "mimir.yml" || n === "mimir-config.yaml" || n === "mimir-config.yml";
  },
  loadRenderer: () => import("../types/text/yaml/known/mimir/renderer.js"),
  about: {
    description: "Grafana Mimir metrics configuration — server, blocks storage, distributor, ingester, store gateway, compactor, and per-tenant limits.",
    usedFor: [{ label: "Metrics storage", description: "Configure Grafana Mimir for horizontally-scalable, highly-available Prometheus-compatible metrics storage.", href: "https://grafana.com/docs/mimir/latest/configure/" }]
  }
};

// ../../docs/types/text/yaml/known/cortex/index.js
var plugin50 = {
  id: "cortex",
  label: "Grafana Cortex",
  tags: ["observability", "metrics", "prometheus", "grafana"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "cortex.yaml" || n === "cortex.yml" || n === "cortex-config.yaml";
  },
  loadRenderer: () => import("../types/text/yaml/known/cortex/renderer.js"),
  about: {
    description: "Grafana Cortex horizontally-scalable Prometheus configuration — server, blocks storage, distributor, ingester, store gateway, compactor, and ruler storage.",
    usedFor: [{ label: "Grafana Cortex", description: "Horizontally-scalable, highly-available, multi-tenant, long-term Prometheus metrics storage.", href: "https://cortexmetrics.io/docs/" }]
  }
};
var cortex_default = plugin50;

// ../../docs/types/text/known/grafana-alloy/index.js
var plugin51 = {
  id: "grafana-alloy",
  label: "Grafana Alloy",
  tags: ["observability", "telemetry", "grafana", "pipeline"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "config.alloy" || n.endsWith(".alloy");
  },
  loadRenderer: () => import("../types/text/known/grafana-alloy/renderer.js"),
  about: {
    description: "Grafana Alloy (River syntax) telemetry pipeline configuration — defines component blocks for scraping, forwarding, receiving, and processing observability data.",
    usedFor: [{ label: "Grafana Alloy", description: "OpenTelemetry Collector distribution and Grafana Agent successor for metrics, logs, traces, and profiles.", href: "https://grafana.com/docs/alloy/latest/" }]
  }
};
var grafana_alloy_default = plugin51;

// ../../docs/types/text/known/forge-config/index.js
var forge_config_default = {
  id: "forge-config",
  label: "Electron Forge Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "forge.config.js" || n === "forge.config.ts" || n === "electron-forge.config.js";
  },
  loadRenderer: () => import("../types/text/known/forge-config/renderer.js"),
  about: {
    description: "forge.config.js — Electron Forge configuration for building, packaging, and publishing Electron apps.",
    usedFor: [{ label: "Electron Forge", description: "Complete toolchain for Electron app development and packaging", href: "https://www.electronforge.io/configuration" }]
  }
};

// ../../docs/types/text/toml/known/gradle-version-catalog/index.js
var gradle_version_catalog_default = {
  id: "gradle-version-catalog",
  label: "Gradle Version Catalog",
  match(intake, baseType) {
    if (baseType?.id !== "toml") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n !== "libs.versions.toml") return false;
    const text = intake.text || "";
    return text.includes("[versions]") && text.includes("[libraries]");
  },
  loadRenderer: () => import("../types/text/toml/known/gradle-version-catalog/renderer.js"),
  about: {
    description: "Gradle version catalog — centralised dependency versions, library aliases, bundles, and plugin aliases.",
    usedFor: [{ label: "Gradle build", description: "Centralise and share dependency versions across Gradle multi-project builds.", href: "https://docs.gradle.org/current/userguide/version_catalogs.html" }]
  }
};

// ../../docs/types/text/toml/known/gleam-toml/index.js
var gleam_toml_default = {
  id: "gleam-toml",
  label: "Gleam Package",
  match: (intake, baseType) => {
    if (baseType?.id !== "toml") return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name === "gleam.toml";
  },
  loadRenderer: () => import("../types/text/toml/known/gleam-toml/renderer.js"),
  about: {
    description: "Gleam language package manifest — defines the package name, version, target (Erlang/JavaScript), and dependencies.",
    usedFor: [
      { label: "Gleam packages", description: "Libraries and applications built with the Gleam language", href: "https://gleam.run/" }
    ]
  }
};

// ../../docs/types/text/known/go-work/index.js
var go_work_default = {
  id: "go-work",
  label: "Go Workspace",
  match(intake) {
    const n = (intake.filename || "").split("/").pop();
    return n === "go.work" || n === "go.work.sum";
  },
  loadRenderer: () => import("../types/text/known/go-work/renderer.js"),
  about: {
    description: "Go workspace file — defines a multi-module workspace with shared module replacements and Go version.",
    usedFor: [
      { label: "Go workspaces", description: "Multi-module Go projects managed with go work", href: "https://go.dev/ref/mod#go-work-files" }
    ]
  }
};

// ../../docs/types/text/ini/known/grafana-ini/index.js
var grafana_ini_default = {
  id: "grafana-ini",
  label: "Grafana config",
  match(intake, baseType) {
    if (baseType?.id !== "ini") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "grafana.ini" || n === "grafana-config.ini") return true;
    if (n === "defaults.ini") {
      const t = intake.text || "";
      return t.includes("[server]") && (t.includes("http_port") || t.includes("[database]") && t.includes("type ="));
    }
    return false;
  },
  loadRenderer: () => import("../types/text/ini/known/grafana-ini/renderer.js"),
  about: {
    description: "Grafana server configuration — HTTP settings, auth providers, database backend, and data paths.",
    usedFor: [{ label: "Grafana config", description: "Configure Grafana server HTTP port, auth providers, database, and plugin paths.", href: "https://grafana.com/docs/grafana/latest/setup-grafana/configure-grafana/" }]
  }
};

// ../../docs/types/text/ini/known/podman-quadlet/index.js
var podman_quadlet_default = {
  id: "podman-quadlet",
  label: "Podman Quadlet",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (!n.endsWith(".container") && !n.endsWith(".pod") && !n.endsWith(".kube") && !n.endsWith(".network")) return false;
    const text = intake.text || "";
    return text.includes("[Container]") || text.includes("[Pod]") || text.includes("[Kube]");
  },
  loadRenderer: () => import("../types/text/ini/known/podman-quadlet/renderer.js"),
  about: {
    description: "Podman Quadlet systemd unit file — defines a container, pod, Kubernetes workload, or network managed by systemd via Podman.",
    usedFor: [{ label: "Podman Quadlet", description: "Run Podman containers as systemd services using declarative unit files.", href: "https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html" }]
  }
};

// ../../docs/types/text/json/known/growthbook/index.js
var growthbook_default = {
  id: "growthbook",
  label: "GrowthBook config",
  match(intake, baseType) {
    if (baseType?.id !== "json") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === ".growthbook.json" || n === "growthbook.json";
  },
  loadRenderer: () => import("../types/text/json/known/growthbook/renderer.js"),
  about: {
    description: "GrowthBook feature flag SDK configuration — API host, client key, and feature definitions.",
    usedFor: [{ label: "Feature flags", description: "Configure GrowthBook SDK for feature flag and A/B test management.", href: "https://docs.growthbook.io/lib/js" }]
  }
};

// ../../docs/types/text/yaml/known/jekyll-config/index.js
var jekyll_config_default = {
  id: "jekyll-config",
  label: "Jekyll Config",
  match(intake, baseType) {
    if (!baseType || baseType.id !== "yaml") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "_config.yml" || n === "_config.yaml";
  },
  loadRenderer: () => import("../types/text/yaml/known/jekyll-config/renderer.js"),
  about: {
    description: "Jekyll static site configuration — defines site title, URL, theme, plugins, and content settings.",
    usedFor: [
      { label: "Static sites", description: "Build static websites with Jekyll on GitHub Pages or self-hosted servers" }
    ]
  }
};

// ../../docs/types/text/toml/known/julia-project/index.js
var julia_project_default = {
  id: "julia-project",
  label: "Julia Project",
  match(intake, baseType) {
    if (baseType?.id !== "toml") return false;
    const n = (intake.filename || "").split("/").pop();
    if (n !== "Project.toml") return false;
    const t = intake.text || "";
    return /uuid\s*=|authors\s*=|\[compat\]|\[deps\]/.test(t);
  },
  loadRenderer: () => import("../types/text/toml/known/julia-project/renderer.js"),
  about: {
    description: "Julia package manifest — defines the package name, UUID, version, dependencies, and compatibility bounds.",
    usedFor: [
      { label: "Julia packages", description: "Libraries and applications managed by Pkg.jl", href: "https://pkgdocs.julialang.org/v1/toml-files/" }
    ]
  }
};

// ../../docs/types/text/toml/known/julia-manifest/index.js
var julia_manifest_default = {
  id: "julia-manifest",
  label: "Julia Manifest",
  match(intake, baseType) {
    if (baseType?.id !== "toml") return false;
    const n = (intake.filename || "").split("/").pop();
    if (n !== "Manifest.toml") return false;
    const t = intake.text || "";
    return /\[\[deps\./.test(t) || /julia_version\s*=/.test(t) || /uuid\s*=/.test(t) && /git-tree-sha1\s*=/.test(t);
  },
  loadRenderer: () => import("../types/text/toml/known/julia-manifest/renderer.js"),
  about: {
    description: "Julia package manifest — exact snapshot of the dependency tree with resolved versions and content hashes.",
    usedFor: [
      { label: "Julia packages", description: "Libraries and applications managed by Pkg.jl", href: "https://pkgdocs.julialang.org/v1/toml-files/" }
    ]
  }
};

// ../../docs/types/text/yaml/known/kong-config/index.js
var kong_config_default = {
  id: "kong-config",
  label: "Kong Gateway config",
  match(intake, baseType) {
    if (baseType?.id !== "yaml") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "kong.yaml" || n === "kong.yml" || n === "kong.conf.yaml";
  },
  loadRenderer: () => import("../types/text/yaml/known/kong-config/renderer.js"),
  about: {
    description: "Kong API Gateway declarative configuration — services, routes, plugins, and consumers.",
    usedFor: [{ label: "Kong API Gateway", description: "Declarative config for Kong services, routes, plugins, and upstreams.", href: "https://docs.konghq.com/gateway/latest/production/deployment-topologies/db-less-and-declarative-config/" }]
  }
};

// ../../docs/types/text/yaml/known/apisix-config/index.js
var apisix_config_default = {
  id: "apisix-config",
  label: "APISIX config",
  match(intake, baseType) {
    if (baseType?.id !== "yaml") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "apisix.yaml" || n === "apisix.yml" || n === "config.yaml" && (intake.text || "").includes("apisix");
  },
  loadRenderer: () => import("../types/text/yaml/known/apisix-config/renderer.js"),
  about: {
    description: "Apache APISIX API gateway configuration — deployment mode, listeners, plugins, and etcd settings.",
    usedFor: [{ label: "Apache APISIX", description: "Cloud-native API gateway configuration", href: "https://apisix.apache.org/docs/apisix/configuration-guide/" }]
  }
};

// ../../docs/types/text/yaml/known/envoy-config/index.js
var envoy_config_default = {
  id: "envoy-config",
  label: "Envoy proxy config",
  match(intake, baseType) {
    if (baseType?.id !== "yaml") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n !== "envoy.yaml" && n !== "envoy.yml") return false;
    return (intake.text || "").includes("static_resources") || (intake.text || "").includes("node:");
  },
  loadRenderer: () => import("../types/text/yaml/known/envoy-config/renderer.js"),
  about: {
    description: "Envoy proxy static configuration — node identity, listeners, routes, and clusters.",
    usedFor: [{ label: "Envoy Proxy", description: "High-performance L7 proxy and service mesh data plane", href: "https://www.envoyproxy.io/docs/envoy/latest/configuration/overview/examples" }]
  }
};

// ../../docs/types/text/json/known/launch-settings/index.js
var launch_settings_default = {
  id: "launch-settings",
  label: "ASP.NET Core Launch Settings",
  match(intake, baseType) {
    if (baseType?.id !== "json") return false;
    return (intake.filename || intake.name || "").split("/").pop().toLowerCase() === "launchsettings.json";
  },
  loadRenderer: () => import("../types/text/json/known/launch-settings/renderer.js"),
  about: {
    description: "launchSettings.json — defines launch profiles for ASP.NET Core applications. Controls how the app starts during development (URLs, environment variables, command name).",
    usedFor: [{ label: "ASP.NET Core", description: "Configure development launch profiles for ASP.NET Core apps", href: "https://learn.microsoft.com/en-us/aspnet/core/fundamentals/environments" }]
  }
};

// ../../docs/types/text/json/known/appsettings/index.js
var appsettings_default = {
  id: "appsettings",
  label: "ASP.NET Core appsettings",
  match(intake, baseType) {
    if (baseType?.id !== "json") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (!(n === "appsettings.json" || /^appsettings\.[a-z]+\.json$/.test(n))) return false;
    const text = intake.text || intake.textSample || "";
    return /Logging|ConnectionStrings|AllowedHosts/.test(text);
  },
  loadRenderer: () => import("../types/text/json/known/appsettings/renderer.js"),
  about: {
    description: "appsettings.json — ASP.NET Core application configuration file. Controls logging levels, connection strings, feature flags, and environment-specific settings.",
    usedFor: [{ label: "ASP.NET Core", description: "Application settings for ASP.NET Core apps", href: "https://learn.microsoft.com/en-us/aspnet/core/fundamentals/configuration" }]
  }
};

// ../../docs/types/text/known/nimble/index.js
var nimble_default = {
  id: "nimble",
  label: "Nim Package",
  match: (intake) => {
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name.endsWith(".nimble");
  },
  loadRenderer: () => import("../types/text/known/nimble/renderer.js"),
  about: {
    description: "Nimble package specification for the Nim language — defines package metadata and dependencies using a NimScript-based DSL.",
    usedFor: [
      { label: "Nim packages", description: "Libraries and applications built with the Nim language", href: "https://nimble.directory/" }
    ]
  }
};

// ../../docs/types/text/xml/known/packages-config/index.js
var packages_config_default = {
  id: "packages-config",
  label: "NuGet packages.config",
  match(intake, baseType) {
    if (baseType?.id !== "xml") return false;
    return (intake.filename || intake.name || "").split("/").pop().toLowerCase() === "packages.config";
  },
  loadRenderer: () => import("../types/text/xml/known/packages-config/renderer.js"),
  about: {
    description: "packages.config — legacy NuGet package reference format for .NET Framework projects. Lists all installed packages with their versions and target framework.",
    usedFor: [{ label: "NuGet", description: "Manage NuGet packages for .NET Framework projects", href: "https://learn.microsoft.com/en-us/nuget/reference/packages-config" }]
  }
};

// ../../docs/types/text/known/podspec/index.js
var podspec_default = {
  id: "podspec",
  label: "CocoaPods Podspec",
  match(intake) {
    return (intake.name || intake.filename || "").endsWith(".podspec");
  },
  loadRenderer: () => import("../types/text/known/podspec/renderer.js"),
  about: {
    description: "CocoaPods pod specification — describes a library's metadata, source, and dependencies for distribution via CocoaPods.",
    usedFor: [{ label: "CocoaPods", description: "Package specification for the CocoaPods dependency manager for iOS/macOS", href: "https://guides.cocoapods.org/syntax/podspec.html" }]
  }
};

// ../../docs/types/text/known/redis-conf/index.js
var redis_conf_default = {
  id: "redis-conf",
  label: "Redis config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "redis.conf" || n === "redis.conf.example";
  },
  loadRenderer: () => import("../types/text/known/redis-conf/renderer.js"),
  about: {
    description: "Redis server configuration — port, bind addresses, memory limits, persistence settings, and security.",
    usedFor: [{ label: "Redis config", description: "Configure Redis port, memory policy, persistence (RDB/AOF), and access control.", href: "https://redis.io/docs/latest/operate/oss_and_stack/management/config/" }]
  }
};

// ../../docs/types/text/known/redis-sentinel/index.js
var redis_sentinel_default = {
  id: "redis-sentinel",
  label: "Redis Sentinel config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "sentinel.conf") return true;
    if (n.endsWith("sentinel.conf")) {
      const t = intake.text || intake.textSample || "";
      return t.includes("sentinel monitor");
    }
    return false;
  },
  loadRenderer: () => import("../types/text/known/redis-sentinel/renderer.js"),
  about: {
    description: "Redis Sentinel configuration — sentinel port, monitored masters, quorum, failover timeouts, and notification scripts.",
    usedFor: [{ label: "Redis Sentinel", description: "Configure Redis Sentinel for high-availability monitoring and automatic failover.", href: "https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/" }]
  }
};

// ../../docs/types/text/yaml/known/cassandra-config/index.js
var cassandra_config_default = {
  id: "cassandra-config",
  label: "Cassandra config",
  match(intake, baseType) {
    if (baseType?.id !== "yaml") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n !== "cassandra.yaml") return false;
    const t = intake.text || intake.textSample || "";
    return t.includes("cluster_name:") && t.includes("seed_provider:");
  },
  loadRenderer: () => import("../types/text/yaml/known/cassandra-config/renderer.js"),
  about: {
    description: "Apache Cassandra configuration — cluster name, seeds, listen address, data/commitlog directories, compaction, and authentication.",
    usedFor: [{ label: "Apache Cassandra", description: "Configure Cassandra cluster topology, storage, compaction throughput, and security.", href: "https://cassandra.apache.org/doc/latest/cassandra/configuration/cass_yaml_file.html" }]
  }
};

// ../../docs/types/text/yaml/known/elasticsearch-config/index.js
var elasticsearch_config_default = {
  id: "elasticsearch-config",
  label: "Elasticsearch config",
  match(intake, baseType) {
    if (baseType?.id !== "yaml") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n !== "elasticsearch.yml") return false;
    const t = intake.text || intake.textSample || "";
    return t.includes("cluster.name:") && t.includes("node.name:");
  },
  loadRenderer: () => import("../types/text/yaml/known/elasticsearch-config/renderer.js"),
  about: {
    description: "Elasticsearch configuration — cluster/node identity, network, discovery, and X-Pack security settings.",
    usedFor: [{ label: "Elasticsearch", description: "Configure Elasticsearch cluster topology, network binding, discovery, and X-Pack security.", href: "https://www.elastic.co/guide/en/elasticsearch/reference/current/settings.html" }]
  }
};

// ../../docs/types/text/yaml/known/kibana/index.js
var plugin52 = {
  id: "kibana",
  label: "Kibana",
  tags: ["elastic", "kibana", "visualization", "logging"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "kibana.yml" || n === "kibana.yaml";
  },
  loadRenderer: () => import("../types/text/yaml/known/kibana/renderer.js"),
  about: {
    description: "Kibana configuration — server, Elasticsearch connection, security, and plugin settings.",
    usedFor: [{ label: "Kibana", description: "Configure Kibana: server endpoint, Elasticsearch hosts, X-Pack security, logging, Fleet, and Reporting.", href: "https://www.elastic.co/guide/en/kibana/current/settings.html" }]
  }
};
var kibana_default = plugin52;

// ../../docs/types/text/xml/known/clickhouse-config/index.js
var clickhouse_config_default = {
  id: "clickhouse-config",
  label: "ClickHouse config",
  match(intake, baseType) {
    if (baseType?.id !== "xml") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n !== "config.xml" && n !== "users.xml") return false;
    const t = intake.text || intake.textSample || "";
    return t.includes("<clickhouse>") || t.includes("<yandex>");
  },
  loadRenderer: () => import("../types/text/xml/known/clickhouse-config/renderer.js"),
  about: {
    description: "ClickHouse server or users configuration — listen host/port, max connections, memory limits, logging, and user quotas.",
    usedFor: [{ label: "ClickHouse", description: "Configure ClickHouse server network, memory, logging, users, and access management.", href: "https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings" }]
  }
};

// ../../docs/types/text/known/mongod-conf/index.js
var mongod_conf_default = {
  id: "mongod-conf",
  label: "MongoDB config",
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return name === "mongod.conf";
  },
  loadRenderer: () => import("../types/text/known/mongod-conf/renderer.js"),
  about: {
    description: "MongoDB server configuration — storage path, networking, replication set, security, and system log.",
    usedFor: [{ label: "MongoDB config", description: "Configure MongoDB storage engine, network bindings, replica set, and access control.", href: "https://www.mongodb.com/docs/manual/reference/configuration-options/" }]
  }
};

// ../../docs/types/text/known/my-cnf/index.js
var my_cnf_default = {
  id: "my-cnf",
  label: "MySQL config",
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return name === "my.cnf" || name === "mysql.cnf" || name === "my.ini" || name === "mysql.ini";
  },
  loadRenderer: () => import("../types/text/known/my-cnf/renderer.js"),
  about: {
    description: "MySQL / MariaDB server configuration — port, buffer sizes, networking, and character sets.",
    usedFor: [{ label: "MySQL config", description: "Configure MySQL port, InnoDB buffer pool, max connections, and character set.", href: "https://dev.mysql.com/doc/refman/8.0/en/server-configuration.html" }]
  }
};

// ../../docs/types/text/known/postgresql-conf/index.js
var postgresql_conf_default = {
  id: "postgresql-conf",
  label: "PostgreSQL config",
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return name === "postgresql.conf";
  },
  loadRenderer: () => import("../types/text/known/postgresql-conf/renderer.js"),
  about: {
    description: "PostgreSQL server configuration — connections, memory, WAL settings, logging, and timezone.",
    usedFor: [{ label: "PostgreSQL config", description: "Configure PostgreSQL listen addresses, memory, WAL level, and logging settings.", href: "https://www.postgresql.org/docs/current/runtime-config.html" }]
  }
};

// ../../docs/types/text/ini/known/odoo-conf/index.js
var odoo_conf_default = {
  id: "odoo-conf",
  label: "Odoo ERP server config",
  match(intake, baseType) {
    if (baseType?.id !== "ini") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "odoo.conf" || n === "odoo-server.conf" || n === "openerp-server.conf" || n === "odoo.cfg";
  },
  loadRenderer: () => import("../types/text/ini/known/odoo-conf/renderer.js"),
  about: {
    description: "Odoo ERP server configuration — defines database connection, HTTP ports, worker counts, memory limits, and addon paths.",
    usedFor: [{ label: "Odoo", description: "Open-source ERP and CRM platform for business applications.", href: "https://www.odoo.com/documentation/17.0/administration/install/deploy.html" }]
  }
};

// ../../docs/types/text/known/pgbouncer-ini/index.js
var pgbouncer_ini_default = {
  id: "pgbouncer-ini",
  label: "PgBouncer config",
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return name === "pgbouncer.ini";
  },
  loadRenderer: () => import("../types/text/known/pgbouncer-ini/renderer.js"),
  about: {
    description: "PgBouncer connection pooler configuration — databases, pool mode, connection limits, and auth settings.",
    usedFor: [{ label: "PgBouncer config", description: "Configure PgBouncer pool mode, client/server connection limits, and database routing.", href: "https://www.pgbouncer.org/config.html" }]
  }
};

// ../../docs/types/text/known/pgbackrest-conf/index.js
var pgbackrest_conf_default = {
  id: "pgbackrest-conf",
  label: "pgBackRest Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const text = intake.textSample || intake.text || "";
    if (n === "pgbackrest.conf") return true;
    if (text.includes("[global]") && (text.includes("repo1-path") || text.includes("repo1-type") || text.includes("pg1-path"))) return true;
    if (text.includes("[stanza:") && text.includes("pg1-path")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/pgbackrest-conf/renderer.js"),
  about: {
    description: "pgBackRest configuration — defines backup repositories, PostgreSQL instances (stanzas), and backup policies.",
    usedFor: [{ label: "pgBackRest", description: "Reliable PostgreSQL backup & restore solution", href: "https://pgbackrest.org/" }]
  }
};

// ../../docs/types/text/yaml/known/patroni-config/index.js
var patroni_config_default = {
  id: "patroni-config",
  label: "Patroni Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const text = intake.textSample || intake.text || "";
    if (n === "patroni.yml" || n === "patroni.yaml" || n === "patroni.conf") return true;
    if (text.includes("bootstrap:") && text.includes("dcs:") && (text.includes("postgresql:") || text.includes("etcd:") || text.includes("consul:"))) return true;
    if (text.includes("restapi:") && text.includes("listen:") && text.includes("bootstrap:") && text.includes("postgresql:")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/yaml/known/patroni-config/renderer.js"),
  about: {
    description: "Patroni HA configuration — defines PostgreSQL high-availability cluster settings including DCS backend, bootstrap, and replication.",
    usedFor: [{ label: "Patroni", description: "Template for PostgreSQL HA with automatic failover", href: "https://patroni.readthedocs.io/" }]
  }
};

// ../../docs/types/text/yaml/known/shard-yml/index.js
var shard_yml_default = {
  id: "shard-yml",
  label: "Crystal Shard",
  match(intake, baseType) {
    if (baseType?.id !== "yaml") return false;
    const n = (intake.filename || "").split("/").pop();
    return n === "shard.yml";
  },
  loadRenderer: () => import("../types/text/yaml/known/shard-yml/renderer.js"),
  about: {
    description: "Crystal language shard manifest — defines the shard name, version, dependencies, and dev dependencies.",
    usedFor: [
      { label: "Crystal shards", description: "Libraries and tools built with the Crystal language", href: "https://crystal-lang.org/reference/guides/writing_shards.html" }
    ]
  }
};

// ../../docs/types/text/yaml/known/crystal-shard/index.js
var crystal_shard_default = {
  id: "crystal-shard",
  label: "Crystal Shard",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n !== "shard.yml" && n !== "shard.lock") return false;
    const text = intake.textSample || intake.text || "";
    if (text.includes("crystal:") || text.includes("dependencies:") && text.includes("github:")) return true;
    if (n === "shard.lock" && text.includes("version:") && text.includes("git:")) return true;
    if (text.match(/^name:\s*\S+/m) && text.includes("authors:") && text.includes("version:")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/yaml/known/crystal-shard/renderer.js"),
  about: {
    description: "Crystal language shard.yml package manifest — dependencies, version, and build targets.",
    tags: ["crystal", "shard", "package", "manifest"]
  }
};

// ../../docs/types/text/json/known/tauri-conf/index.js
var tauri_conf_default = {
  id: "tauri-conf",
  label: "Tauri Config",
  match(intake, baseType) {
    if (baseType?.id !== "json") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "tauri.conf.json" || n === "tauri.conf.json5";
  },
  loadRenderer: () => import("../types/text/json/known/tauri-conf/renderer.js"),
  about: {
    description: "tauri.conf.json — Tauri desktop app configuration for building cross-platform desktop apps from web frontends.",
    usedFor: [{ label: "Tauri desktop apps", description: "Cross-platform desktop app config (windows, bundle, permissions)", href: "https://tauri.app/v1/api/config/" }]
  }
};

// ../../docs/types/text/yaml/known/traefik-config/index.js
var traefik_config_default = {
  id: "traefik-config",
  label: "Traefik proxy config",
  match(intake, baseType) {
    if (baseType?.id !== "yaml") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "traefik.yml" || n === "traefik.yaml";
  },
  loadRenderer: () => import("../types/text/yaml/known/traefik-config/renderer.js"),
  about: {
    description: "Traefik reverse proxy configuration — entrypoints, providers, certificate resolvers, and access logs.",
    usedFor: [{ label: "Traefik proxy", description: "Configure Traefik HTTP/HTTPS entrypoints, Docker/Kubernetes providers, and ACME TLS.", href: "https://doc.traefik.io/traefik/reference/static-configuration/file/" }]
  }
};

// ../../docs/types/text/known/traefik-conf/index.js
var plugin53 = {
  id: "traefik-conf",
  label: "Traefik Config",
  tags: ["traefik", "proxy", "reverse-proxy", "config"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n !== "traefik.yml" && n !== "traefik.yaml" && n !== "traefik.toml") return false;
    const text = intake.text || intake.textSample || "";
    return /entrypoints?\s*:/i.test(text) || /\[entrypoints?\]/i.test(text);
  },
  loadRenderer: () => import("../types/text/known/traefik-conf/renderer.js"),
  about: {
    description: "Traefik v2/v3 static configuration — entryPoints, providers, TLS resolvers, dashboard, and logging.",
    usedFor: [{ label: "Traefik proxy", description: "Configure Traefik HTTP/HTTPS entrypoints, Docker/Kubernetes providers, and ACME TLS.", href: "https://doc.traefik.io/traefik/reference/static-configuration/file/" }]
  }
};

// ../../docs/types/text/known/unleash-config/index.js
var unleash_config_default = {
  id: "unleash-config",
  label: "Unleash config",
  match(intake, baseType) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "unleash.config.js" || n === "unleash.config.ts";
  },
  loadRenderer: () => import("../types/text/known/unleash-config/renderer.js"),
  about: {
    description: "Unleash feature toggle client configuration — app name, URL, environment, and toggle settings.",
    usedFor: [{ label: "Feature toggles", description: "Configure the Unleash SDK for feature flag evaluation.", href: "https://docs.getunleash.io/reference/sdks/javascript-browser" }]
  }
};

// ../../docs/types/text/known/vault-hcl/index.js
var vault_hcl_default = {
  id: "vault-hcl",
  label: "Vault config",
  match(intake, _baseType) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "vault.hcl" || n === "vault-config.hcl") return true;
    if (n === "config.hcl") {
      const text = intake.textSample || intake.text || "";
      return text.includes('storage "') || text.includes("storage '") || /listener\s+"tcp"/.test(text) || /listener\s+'tcp'/.test(text);
    }
    return false;
  },
  loadRenderer: () => import("../types/text/known/vault-hcl/renderer.js"),
  about: {
    description: "HashiCorp Vault server configuration — storage backend, listeners, seals, HA settings, and telemetry.",
    usedFor: [{ label: "Secret management", description: "Configure HashiCorp Vault server: storage, listeners, TLS, seals, and cluster settings.", href: "https://developer.hashicorp.com/vault/docs/configuration" }]
  }
};

// ../../docs/types/text/known/nomad-job/index.js
var nomad_job_default = {
  id: "nomad-job",
  label: "Nomad Job",
  match(intake) {
    const n = (intake.filename || intake.name || "").split("/").pop().toLowerCase();
    if (n.endsWith(".nomad") || n.endsWith(".nomad.hcl")) return true;
    const text = intake.textSample || intake.text || "";
    return text.includes('job "') && text.includes('group "') && text.includes('task "');
  },
  loadRenderer: () => import("../types/text/known/nomad-job/renderer.js"),
  about: {
    description: "HashiCorp Nomad job specification — defines job name, type, datacenters, task groups, drivers, resource requirements, and service registrations.",
    usedFor: [{ label: "HashiCorp Nomad", description: "Schedule and run containerized, non-containerized, and batch workloads across a cluster.", href: "https://developer.hashicorp.com/nomad/docs/job-specification" }]
  }
};

// ../../docs/types/text/toml/known/vector-toml/index.js
var vector_toml_default = {
  id: "vector-toml",
  label: "Vector config",
  match(intake, baseType) {
    if (baseType?.id !== "toml") return false;
    const n = (intake.filename || intake.name || "").split("/").pop().toLowerCase();
    return n === "vector.toml";
  },
  loadRenderer: () => import("../types/text/toml/known/vector-toml/renderer.js"),
  about: {
    description: "Vector.dev log pipeline configuration — defines sources, transforms, and sinks for data collection and routing.",
    usedFor: [{ label: "Vector", description: "High-performance observability data pipeline for logs, metrics, and traces", href: "https://vector.dev/docs/reference/configuration/" }]
  }
};

// ../../docs/types/text/known/vector-config/index.js
var vector_config_default = {
  id: "vector-config",
  label: "Vector Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const text = intake.textSample || intake.text || "";
    if (n === "vector.toml" || n === "vector.yaml" || n === "vector.yml" || n === "vector.json") return true;
    if (text.includes("[sources.") && (text.includes("[transforms.") || text.includes("[sinks."))) return true;
    if (text.includes("sources:") && text.includes("sinks:") && (text.includes('type: "file"') || text.includes('type: "kafka"') || text.includes('type: "http"') || text.includes("type: 'file'"))) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/vector-config/renderer.js"),
  about: {
    description: "Vector data pipeline configuration — defines sources, transforms, and sinks for log, metric, and trace processing.",
    usedFor: [{ label: "Vector", description: "High-performance observability data pipeline", href: "https://vector.dev/" }]
  }
};

// ../../docs/types/text/known/keepalived-conf/index.js
var keepalived_conf_default = {
  id: "keepalived-conf",
  label: "Keepalived Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const text = intake.textSample || intake.text || "";
    if (n === "keepalived.conf") return true;
    if (text.includes("vrrp_instance") && (text.includes("virtual_router_id") || text.includes("virtual_ipaddress"))) return true;
    if (text.includes("global_defs") && text.includes("vrrp_instance")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/keepalived-conf/renderer.js"),
  about: {
    description: "Keepalived configuration — implements VRRP protocol for Linux to provide high availability via virtual IP addresses.",
    usedFor: [{ label: "Keepalived", description: "Routing software providing load balancing and high availability for Linux", href: "https://keepalived.org/" }]
  }
};

// ../../docs/types/text/json/known/wails-json/index.js
var wails_json_default = {
  id: "wails-json",
  label: "Wails Config",
  match(intake, baseType) {
    if (baseType?.id !== "json") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "wails.json";
  },
  loadRenderer: () => import("../types/text/json/known/wails-json/renderer.js"),
  about: {
    description: "wails.json — Wails project configuration for building cross-platform desktop apps with Go and web technologies.",
    usedFor: [{ label: "Wails desktop apps", description: "Go + web frontend desktop app configuration", href: "https://wails.io/docs/reference/project-config" }]
  }
};

// ../../docs/types/text/xml/known/web-config/index.js
var web_config_default = {
  id: "web-config",
  label: "IIS/ASP.NET Config",
  match(intake, baseType) {
    if (baseType?.id !== "xml") return false;
    return (intake.filename || intake.name || "").split("/").pop().toLowerCase() === "web.config";
  },
  loadRenderer: () => import("../types/text/xml/known/web-config/renderer.js"),
  about: {
    description: "web.config — IIS and ASP.NET Framework application configuration file. Controls authentication, connection strings, app settings, HTTP handlers, and more.",
    usedFor: [{ label: "ASP.NET / IIS", description: "Configure ASP.NET Framework apps and IIS server settings", href: "https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/iis/web-config" }]
  }
};

// ../../docs/types/text/known/xcconfig/index.js
var xcconfig_default = {
  id: "xcconfig",
  label: "Xcode Config",
  match(intake) {
    return (intake.name || intake.filename || "").endsWith(".xcconfig");
  },
  loadRenderer: () => import("../types/text/known/xcconfig/renderer.js"),
  about: {
    description: "Xcode build configuration file — key=value build settings that can be shared across targets and schemes.",
    usedFor: [{ label: "Xcode", description: "Configure iOS/macOS build settings like Swift version, deployment targets, and compiler flags", href: "https://developer.apple.com/documentation/xcode/adding-a-build-configuration-file-to-your-project" }]
  }
};

// ../../docs/types/text/yaml/known/bitbucket-pipelines/index.js
var bitbucket_pipelines_default = {
  id: "bitbucket-pipelines",
  label: "Bitbucket Pipelines",
  match(intake, baseType) {
    if (baseType?.id !== "yaml") return false;
    const name = (intake.filename || "").split("/").pop();
    return name === "bitbucket-pipelines.yml";
  },
  loadRenderer: () => import("../types/text/yaml/known/bitbucket-pipelines/renderer.js"),
  about: {
    description: "Bitbucket Pipelines config — shows Docker image, pipeline steps, and branch/PR trigger structure.",
    usedFor: [{ label: "CI/CD automation", description: "Define automated build and deploy pipelines for Bitbucket repositories.", href: "https://support.atlassian.com/bitbucket-cloud/docs/get-started-with-bitbucket-pipelines/" }]
  }
};

// ../../docs/types/text/yaml/known/tekton-pipeline/index.js
var tekton_pipeline_default = {
  id: "tekton-pipeline",
  label: "Tekton Pipeline / Task",
  match(intake, baseType) {
    if (baseType?.id !== "yaml") return false;
    const t = intake.text || intake.textSample || "";
    return t.includes("tekton.dev") || t.includes("kind: Pipeline") && t.includes("tasks:");
  },
  loadRenderer: () => import("../types/text/yaml/known/tekton-pipeline/renderer.js"),
  about: {
    description: "Tekton Pipeline or Task manifest — shows params, tasks, and steps for cloud-native CI/CD.",
    usedFor: [{ label: "Kubernetes-native CI/CD", description: "Define reusable Tekton Pipelines and Tasks that run on Kubernetes.", href: "https://tekton.dev/docs/" }]
  }
};

// ../../docs/types/text/yaml/known/argo-cd-app/index.js
var argo_cd_app_default = {
  id: "argo-cd-app",
  label: "Argo CD Application",
  match(intake, baseType) {
    if (baseType?.id !== "yaml") return false;
    const t = intake.text || intake.textSample || "";
    return t.includes("argoproj.io") && (t.includes("kind: Application") || t.includes("kind: AppProject") || t.includes("kind: ApplicationSet"));
  },
  loadRenderer: () => import("../types/text/yaml/known/argo-cd-app/renderer.js"),
  about: {
    description: "Argo CD Application manifest — shows source repo, destination cluster, and sync policy.",
    usedFor: [{ label: "GitOps continuous delivery", description: "Declare Argo CD Application, AppProject, or ApplicationSet resources for GitOps-driven deployments.", href: "https://argo-cd.readthedocs.io/en/stable/" }]
  }
};

// ../../docs/types/text/yaml/known/flux-kustomization/index.js
var flux_kustomization_default = {
  id: "flux-kustomization",
  label: "Flux Kustomization",
  match(intake, baseType) {
    if (baseType?.id !== "yaml") return false;
    const t = intake.text || intake.textSample || "";
    if (!t.includes("kustomize.toolkit.fluxcd.io")) return false;
    return t.includes("kind: Kustomization") || t.includes("kind: 'Kustomization'");
  },
  loadRenderer: () => import("../types/text/yaml/known/flux-kustomization/renderer.js"),
  about: {
    description: "Flux CD Kustomization CRD — shows source ref, path, sync settings, health checks, and dependencies.",
    usedFor: [{ label: "GitOps with Flux Kustomization", description: "Define Flux Kustomization resources for automated Kubernetes delivery from a Git repository path.", href: "https://fluxcd.io/flux/components/kustomize/kustomizations/" }]
  }
};

// ../../docs/types/text/yaml/known/flux-helm-release/index.js
var flux_helm_release_default = {
  id: "flux-helm-release",
  label: "Flux CD resource",
  match(intake, baseType) {
    if (baseType?.id !== "yaml") return false;
    const t = intake.text || intake.textSample || "";
    return t.includes("fluxcd.io") || t.includes("flux-system");
  },
  loadRenderer: () => import("../types/text/yaml/known/flux-helm-release/renderer.js"),
  about: {
    description: "Flux CD resource — shows HelmRelease, HelmRepository, or Kustomization manifest details.",
    usedFor: [{ label: "GitOps with Flux", description: "Define Flux HelmRelease, HelmRepository, or Kustomization resources for automated Kubernetes delivery.", href: "https://fluxcd.io/flux/concepts/" }]
  }
};

// ../../docs/types/text/yaml/known/docker-stack/index.js
var docker_stack_default = {
  id: "docker-stack",
  label: "Docker Stack",
  match(intake, baseType) {
    if (baseType?.id !== "yaml") return false;
    const t = intake.text || intake.textSample || "";
    if (!t.includes("deploy:") || !t.includes("replicas:")) return false;
    return t.includes("mode: replicated") || t.includes("mode: global") || t.includes("restart_policy:");
  },
  loadRenderer: () => import("../types/text/yaml/known/docker-stack/renderer.js"),
  about: {
    description: "Docker Swarm stack file — shows services with replica counts, update config, restart policy, placement constraints, and secrets/configs used.",
    usedFor: [{ label: "Docker Swarm orchestration", description: "Define multi-service stacks for deployment on Docker Swarm clusters using compose-format stack files.", href: "https://docs.docker.com/engine/swarm/stack-deploy/" }]
  }
};

// ../../docs/types/text/yaml/known/semgrep-config/index.js
var semgrep_config_default = {
  id: "semgrep-config",
  label: "Semgrep config",
  match(intake, baseType) {
    if (baseType?.id !== "yaml") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === ".semgrep.yml" || n === ".semgrep.yaml" || n === "semgrep.yml" || n === "semgrep.yaml";
  },
  loadRenderer: () => import("../types/text/yaml/known/semgrep-config/renderer.js"),
  about: {
    description: "Semgrep static analysis configuration — rules with severity, language targets, and pattern definitions.",
    usedFor: [{ label: "Semgrep", description: "Static analysis tool for finding bugs and security issues", href: "https://semgrep.dev/docs/writing-rules/rule-syntax/" }]
  }
};

// ../../docs/types/text/yaml/known/codeclimate-config/index.js
var codeclimate_config_default = {
  id: "codeclimate-config",
  label: "Code Climate config",
  match(intake, baseType) {
    if (baseType?.id !== "yaml") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === ".codeclimate.yml" || n === ".codeclimate.yaml";
  },
  loadRenderer: () => import("../types/text/yaml/known/codeclimate-config/renderer.js"),
  about: {
    description: "Code Climate quality configuration — engines, exclude patterns, checks, and maintainability thresholds.",
    usedFor: [{ label: "Code Climate", description: "Automated code review and quality metrics platform", href: "https://docs.codeclimate.com/docs/advanced-configuration" }]
  }
};

// ../../docs/types/text/toml/known/gitleaks-config/index.js
var gitleaks_config_default = {
  id: "gitleaks-config",
  label: "Gitleaks config",
  match(intake, baseType) {
    if (baseType?.id !== "toml") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === ".gitleaks.toml" || n === "gitleaks.toml";
  },
  loadRenderer: () => import("../types/text/toml/known/gitleaks-config/renderer.js"),
  about: {
    description: "Gitleaks secrets detection configuration — rules for detecting hardcoded secrets, passwords, and API keys in git history.",
    usedFor: [{ label: "Gitleaks", description: "Fast, lightweight, configurable secret scanner for git repositories", href: "https://github.com/gitleaks/gitleaks#configuration" }]
  }
};

// ../../docs/types/text/yaml/known/trufflehog-config/index.js
var trufflehog_config_default = {
  id: "trufflehog-config",
  label: "TruffleHog config",
  tags: ["trufflehog", "security", "secrets", "scanning", "yaml"],
  match(intake, baseType) {
    if (baseType?.id !== "yaml") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === ".trufflehog.yaml" || n === ".trufflehog.yml" || n === "trufflehog.yaml" || n === "trufflehog.yml";
  },
  loadRenderer: () => import("../types/text/yaml/known/trufflehog-config/renderer.js"),
  about: {
    description: "TruffleHog secrets scanning configuration — detectors, include/exclude paths, and scan settings.",
    usedFor: [{ label: "TruffleHog", description: "Find and verify credentials across git history and filesystems", href: "https://github.com/trufflesecurity/trufflehog#configuration" }]
  }
};

// ../../docs/types/text/toml/known/osv-scanner/index.js
var osv_scanner_default = {
  id: "osv-scanner",
  label: "OSV-Scanner config",
  match(intake, baseType) {
    if (baseType?.id !== "toml") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "osv-scanner.toml" || n === ".osv-scanner.toml";
  },
  loadRenderer: () => import("../types/text/toml/known/osv-scanner/renderer.js"),
  about: {
    description: "OSV-Scanner vulnerability scanner configuration — ignored vulnerabilities, Go version overrides, and Maven settings.",
    usedFor: [{ label: "OSV-Scanner", description: "Google's open source vulnerability scanner using the OSV database", href: "https://google.github.io/osv-scanner/configuration/" }]
  }
};

// ../../docs/types/text/yaml/known/conda-env/index.js
var conda_env_default = {
  id: "conda-env",
  label: "environment.yml",
  match: (intake, baseType) => {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (name !== "environment.yml" && name !== "environment.yaml") return false;
    if (baseType && baseType.id !== "yaml") return false;
    const text = intake.text || "";
    return text.includes("channels:") || text.includes("dependencies:") || text.includes("conda");
  },
  loadRenderer: () => import("../types/text/yaml/known/conda-env/renderer.js"),
  about: {
    description: "environment.yml — Conda environment specification defining name, channels, and package dependencies.",
    usedFor: [
      { label: "Conda environment", description: "Create or update a Conda environment with conda env create -f environment.yml", href: "https://docs.conda.io/projects/conda/en/latest/user-guide/tasks/manage-environments.html" }
    ]
  }
};

// ../../docs/types/text/known/pip-conf/index.js
var pip_conf_default = {
  id: "pip-conf",
  label: "pip.conf",
  match: (intake) => {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return name === "pip.conf" || name === "pip.ini";
  },
  loadRenderer: () => import("../types/text/known/pip-conf/renderer.js"),
  about: {
    description: "pip.conf / pip.ini — pip configuration file controlling index servers, trusted hosts, timeouts, and install options.",
    usedFor: [
      { label: "pip config", description: "Per-user or per-project pip configuration applied to all pip install commands", href: "https://pip.pypa.io/en/stable/topics/configuration/" }
    ]
  }
};

// ../../docs/types/text/known/node-version-file/index.js
var node_version_file_default = {
  id: "node-version-file",
  label: ".node-version",
  match: (intake) => {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return name === ".node-version";
  },
  loadRenderer: () => import("../types/text/known/node-version-file/renderer.js"),
  about: {
    description: ".node-version — pins a Node.js version for fnm, volta, and other version managers (alternative to .nvmrc).",
    usedFor: [
      { label: "Node version pin", description: "fnm, volta, and other tools read this file to auto-switch Node.js versions", href: "https://github.com/jdx/mise#tool-version-files" }
    ]
  }
};

// ../../docs/types/text/known/docker-bake/index.js
var docker_bake_default = {
  id: "docker-bake",
  label: "docker-bake.hcl",
  match: (intake) => {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return name === "docker-bake.hcl" || name === "docker-bake.json" || name === "bake.hcl";
  },
  loadRenderer: () => import("../types/text/known/docker-bake/renderer.js"),
  about: {
    description: "docker-bake.hcl / docker-bake.json — Docker Buildx Bake build definition file, specifying multiple build targets with shared configuration.",
    usedFor: [
      { label: "Docker Buildx Bake", description: "Build multiple Docker images in parallel with shared configuration", href: "https://docs.docker.com/build/bake/" }
    ]
  }
};

// ../../docs/types/text/ini/known/flake8/index.js
var flake8_default = {
  id: "flake8",
  label: "Flake8 config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === ".flake8";
  },
  loadRenderer: () => import("../types/text/ini/known/flake8/renderer.js"),
  about: {
    description: "Flake8 style and lint configuration — max line length, complexity threshold, ignored error codes, and per-file exclusions.",
    usedFor: [{ label: "Flake8", description: "Python style guide enforcement and lint tool", href: "https://flake8.pycqa.org/en/latest/user/configuration.html" }]
  }
};

// ../../docs/types/text/ini/known/pylintrc/index.js
var pylintrc_default = {
  id: "pylintrc",
  label: "Pylint config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === ".pylintrc" || n === "pylintrc" || n === ".pylint";
  },
  loadRenderer: () => import("../types/text/ini/known/pylintrc/renderer.js"),
  about: {
    description: "Pylint static analysis configuration — controls which checks run, naming conventions, line length, and output scoring.",
    usedFor: [{ label: "Pylint", description: "Static analysis tool for Python code", href: "https://pylint.readthedocs.io/en/stable/user_guide/configuration/index.html" }]
  }
};

// ../../docs/types/text/ini/known/setup-cfg/index.js
var setup_cfg_default = {
  id: "setup-cfg",
  label: "setup.cfg",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "setup.cfg";
  },
  loadRenderer: () => import("../types/text/ini/known/setup-cfg/renderer.js"),
  about: {
    description: "Python package configuration — metadata, dependencies, tool settings for pytest, mypy, flake8, and more.",
    usedFor: [{ label: "setuptools", description: "Python package build and distribution configuration", href: "https://setuptools.pypa.io/en/latest/userguide/declarative_config.html" }]
  }
};

// ../../docs/types/text/ini/known/aws-credentials/index.js
var aws_credentials_default = {
  id: "aws-credentials",
  label: "AWS Credentials",
  match(intake) {
    const name = (intake.filename || intake.name || "").split("/").pop().toLowerCase();
    const text = intake.textSample || intake.text || "";
    return (name === "credentials" || name === "aws-credentials") && text.includes("aws_access_key_id");
  },
  loadRenderer: () => import("../types/text/ini/known/aws-credentials/renderer.js"),
  about: {
    description: "AWS credentials file — profiles with access key IDs and masked secret access keys.",
    usedFor: [{ label: "AWS CLI", description: "Configure AWS credentials for CLI and SDK access", href: "https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html" }]
  }
};

// ../../docs/types/text/ini/known/aws-config/index.js
var aws_config_default = {
  id: "aws-config",
  label: "AWS Config",
  match(intake) {
    const name = (intake.filename || intake.name || "").split("/").pop().toLowerCase();
    const text = intake.textSample || intake.text || "";
    return (name === "config" || name === "aws-config") && (text.includes("[default]") || text.includes("[profile ")) && text.includes("region");
  },
  loadRenderer: () => import("../types/text/ini/known/aws-config/renderer.js"),
  about: {
    description: "AWS CLI config file — per-profile region, output format, role chains, and MFA configuration.",
    usedFor: [{ label: "AWS CLI", description: "Configure AWS CLI behaviour and default settings per profile", href: "https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html" }]
  }
};

// ../../docs/types/text/yaml/known/kubeconfig/index.js
var kubeconfig_default = {
  id: "kubeconfig",
  label: "Kubeconfig",
  match(intake, baseType) {
    if (baseType?.id !== "yaml") return false;
    const rawName = (intake.filename || intake.name || "").split("/").pop().toLowerCase();
    const name = rawName.replace(/\.ya?ml$/, "");
    const text = intake.textSample || intake.text || "";
    if (name === "kubeconfig" || rawName === "kubeconfig" || rawName.endsWith(".kubeconfig")) return true;
    if (rawName === "kube.yaml" || rawName === "kube.yml") return true;
    if ((name === "config" || rawName === "config") && text.includes("apiVersion: v1") && text.includes("kind: Config") && text.includes("clusters:")) return true;
    if (intake.parsed?.clusters !== void 0 && intake.parsed?.contexts !== void 0) return true;
    if (text.includes("apiVersion: v1") && text.includes("kind: Config") && text.includes("clusters:")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/yaml/known/kubeconfig/renderer.js"),
  about: {
    description: "Kubernetes kubeconfig — cluster endpoints, user credentials, and named contexts.",
    usedFor: [{ label: "kubectl", description: "Connect to Kubernetes clusters and manage contexts", href: "https://kubernetes.io/docs/concepts/configuration/organize-cluster-access-kubeconfig/" }]
  }
};

// ../../docs/types/text/json/known/gcp-service-account/index.js
var gcp_service_account_default = {
  id: "gcp-service-account",
  label: "GCP Service Account",
  match(intake, baseType) {
    if (baseType?.id !== "json") return false;
    const name = (intake.filename || intake.name || "").split("/").pop().toLowerCase();
    if (!name.endsWith(".json")) return false;
    const text = intake.textSample || intake.text || "";
    return text.includes('"type": "service_account"') || text.includes('"type":"service_account"');
  },
  loadRenderer: () => import("../types/text/json/known/gcp-service-account/renderer.js"),
  about: {
    description: "GCP service account key file — project identity, client email, and redacted private key.",
    usedFor: [{ label: "Google Cloud", description: "Authenticate service accounts to GCP APIs", href: "https://cloud.google.com/iam/docs/service-account-creds" }]
  }
};

// ../../docs/types/text/yaml/known/bandit-yaml/index.js
var bandit_yaml_default = {
  id: "bandit-yaml",
  label: "Bandit config",
  match(intake, baseType) {
    if (baseType?.id !== "yaml") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === ".bandit" || n === "bandit.yaml" || n === "bandit.yml";
  },
  loadRenderer: () => import("../types/text/yaml/known/bandit-yaml/renderer.js"),
  about: {
    description: "Bandit security linter configuration — skipped test IDs, excluded directories, severity and confidence filters.",
    usedFor: [{ label: "Bandit", description: "Security linting tool for Python code", href: "https://bandit.readthedocs.io/en/latest/config.html" }]
  }
};

// ../../docs/types/text/yaml/known/istio-config/index.js
var istio_config_default = {
  id: "istio-config",
  label: "Istio Config",
  match(intake, baseType) {
    if (baseType?.id !== "yaml") return false;
    const t = intake.text || intake.textSample || "";
    return t.includes("networking.istio.io") || t.includes("security.istio.io") || t.includes("VirtualService") && t.includes("istio");
  },
  loadRenderer: () => import("../types/text/yaml/known/istio-config/renderer.js"),
  about: {
    description: "Istio service mesh configuration — VirtualService, DestinationRule, Gateway, PeerAuthentication and other Istio networking/security resources.",
    usedFor: [{ label: "Istio service mesh", description: "Define traffic management, security policies, and observability for microservices.", href: "https://istio.io/latest/docs/reference/config/" }]
  }
};

// ../../docs/types/text/yaml/known/linkerd-config/index.js
var linkerd_config_default = {
  id: "linkerd-config",
  label: "Linkerd Config",
  match(intake, baseType) {
    if (baseType?.id !== "yaml") return false;
    const t = intake.text || intake.textSample || "";
    return t.includes("linkerd.io") || t.includes("linkerd2");
  },
  loadRenderer: () => import("../types/text/yaml/known/linkerd-config/renderer.js"),
  about: {
    description: "Linkerd service mesh configuration — Server, ServerAuthorization, MeshTLSAuthentication and other policy resources.",
    usedFor: [{ label: "Linkerd service mesh", description: "Define zero-trust authorization policies and mTLS configuration for Linkerd-meshed services.", href: "https://linkerd.io/2.x/reference/authorization-policy/" }]
  }
};

// ../../docs/types/text/yaml/known/etcd-config/index.js
var etcd_config_default = {
  id: "etcd-config",
  label: "etcd Config",
  match(intake, baseType) {
    if (baseType?.id !== "yaml") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "etcd.yml" || n === "etcd.yaml" || n === "etcd.conf";
  },
  loadRenderer: () => import("../types/text/yaml/known/etcd-config/renderer.js"),
  about: { description: "etcd distributed key-value store configuration — member identity, peer/client endpoints, TLS settings, and cluster initialization." }
};

// ../../docs/types/text/known/kafka-server-props/index.js
var kafka_server_props_default = {
  id: "kafka-server-props",
  label: "Kafka Server Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n !== "server.properties" && n !== "kafka-server.properties") return false;
    const t = intake.text || "";
    return t.includes("zookeeper.connect") || t.includes("broker.id") || t.includes("kafka");
  },
  loadRenderer: () => import("../types/text/known/kafka-server-props/renderer.js"),
  about: { description: "Apache Kafka broker configuration — broker ID, listener addresses, replication, log retention, and Zookeeper connection." }
};

// ../../docs/types/text/known/rabbitmq-conf/index.js
var rabbitmq_conf_default = {
  id: "rabbitmq-conf",
  label: "RabbitMQ Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "rabbitmq.conf" || n === "rabbitmq-env.conf";
  },
  loadRenderer: () => import("../types/text/known/rabbitmq-conf/renderer.js"),
  about: { description: "RabbitMQ message broker configuration — network listeners, TLS, resource limits, authentication, and management plugin settings." }
};

// ../../docs/types/text/known/nats-config/index.js
var nats_config_default = {
  id: "nats-config",
  label: "NATS Server Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "nats.conf" || n === "nats-server.conf";
  },
  loadRenderer: () => import("../types/text/known/nats-config/renderer.js"),
  about: { description: "NATS messaging server configuration — host, port, cluster settings, authentication, TLS, and JetStream persistence." }
};

// ../../docs/types/text/known/mosquitto-conf/index.js
var mosquitto_conf_default = {
  id: "mosquitto-conf",
  label: "Mosquitto Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "mosquitto.conf";
  },
  loadRenderer: () => import("../types/text/known/mosquitto-conf/renderer.js"),
  about: { description: "Eclipse Mosquitto MQTT broker configuration — listeners, TLS, authentication, persistence, and logging." }
};

// ../../docs/types/text/known/zookeeper-config/index.js
var zookeeper_config_default = {
  id: "zookeeper-config",
  label: "ZooKeeper Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "zoo.cfg";
  },
  loadRenderer: () => import("../types/text/known/zookeeper-config/renderer.js"),
  about: { description: "Apache ZooKeeper configuration — data directory, client ports, tick time, session timeouts, and ensemble server addresses." }
};

// ../../docs/types/text/known/rdp-config/index.js
var rdp_config_default = {
  id: "rdp-config",
  label: "RDP Config",
  match(intake) {
    const n = (intake.filename || intake.name || "").split("/").pop().toLowerCase();
    if (n.endsWith(".rdp")) return true;
    const text = intake.textSample || intake.text || "";
    if (text.includes("full address:s:")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/rdp-config/renderer.js"),
  about: {
    description: "Windows Remote Desktop Protocol configuration file — connection settings, credentials, and display options.",
    usedFor: [{ label: "mstsc", description: "Windows Remote Desktop Connection client", href: "https://learn.microsoft.com/en-us/windows-server/remote/remote-desktop-services/clients/remote-desktop-clients" }]
  }
};

// ../../docs/types/text/known/hosts-file/index.js
var hosts_file_default = {
  id: "hosts-file",
  label: "Hosts File",
  match(intake) {
    const fullPath = intake.name || intake.filename || "";
    const n = fullPath.split("/").pop().toLowerCase();
    const text = intake.textSample || intake.text || "";
    if (n === "hosts" && (text.includes("localhost") || text.includes("127.0.0.1"))) return true;
    if (n === "hosts.txt") return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/hosts-file/renderer.js"),
  about: {
    description: "Host name resolution table — maps IP addresses to hostnames, bypassing DNS for local overrides.",
    usedFor: [{ label: "/etc/hosts", description: "System hostname resolution", href: "https://man7.org/linux/man-pages/man5/hosts.5.html" }]
  }
};

// ../../docs/types/text/known/resolv-conf/index.js
var resolv_conf_default = {
  id: "resolv-conf",
  label: "resolv.conf",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const text = intake.textSample || intake.text || "";
    if (n === "resolv.conf") return true;
    if (text.includes("nameserver ") && text.includes("search ")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/resolv-conf/renderer.js"),
  about: {
    description: "DNS resolver configuration — defines nameservers, search domains, and resolver options.",
    usedFor: [{ label: "resolv.conf", description: "Linux DNS resolver configuration", href: "https://man7.org/linux/man-pages/man5/resolv.conf.5.html" }]
  }
};

// ../../docs/types/text/known/sshd-config/index.js
var sshd_config_default = {
  id: "sshd-config",
  label: "sshd_config",
  match: (intake) => {
    const name = (intake.filename || "").split("/").pop();
    return name === "sshd_config";
  },
  loadRenderer: () => import("../types/text/known/sshd-config/renderer.js"),
  about: {
    description: "SSH daemon configuration — controls SSH server listening ports, authentication methods, and access restrictions.",
    usedFor: [{ label: "sshd_config", description: "OpenSSH daemon configuration file", href: "https://man.openbsd.org/sshd_config.5" }]
  }
};

// ../../docs/types/text/known/ssh-config/index.js
var ssh_config_default = {
  id: "ssh-client-config",
  label: "SSH Client Config",
  match(intake, baseType) {
    if (baseType && baseType.id === "ssh-config") return false;
    const fullPath = intake.name || intake.filename || "";
    const n = fullPath.split("/").pop().toLowerCase();
    if (n === "ssh_config") return true;
    if (n === "config" && fullPath.includes(".ssh/")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/ssh-config/renderer.js"),
  about: {
    description: "SSH client configuration — host aliases, connection settings, key paths, and proxy configuration.",
    usedFor: [{ label: "ssh_config", description: "OpenSSH client configuration file", href: "https://man.openbsd.org/ssh_config.5" }]
  }
};

// ../../docs/types/text/known/ssh-known-hosts/index.js
var ssh_known_hosts_default = {
  id: "ssh-known-hosts",
  label: "SSH Known Hosts",
  tags: ["ssh", "security", "host-keys", "network"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "known_hosts" || n === "known_hosts2") return true;
    if (n === "ssh_known_hosts" || n === "ssh_known_hosts2") return true;
    const text = intake.textSample || intake.text || "";
    if (/(^|\n)[\w\[*,.-]+\s+(ssh-rsa|ssh-ed25519|ecdsa-sha2-nistp|ssh-dss|sk-ssh-ed25519)\s+[A-Za-z0-9+/]+=*/.test(text)) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/ssh-known-hosts/renderer.js"),
  about: {
    description: "SSH known hosts file — stores fingerprints of trusted SSH server host keys to prevent MITM attacks.",
    usedBy: [{ label: "OpenSSH", description: "SSH client known hosts database", href: "https://man.openbsd.org/ssh_known_hosts.5" }]
  }
};

// ../../docs/types/text/json/known/mcp-config/index.js
var mcp_config_default = {
  id: "mcp-config",
  label: "MCP Config",
  match(intake, baseType) {
    if (!baseType || baseType.id !== "json") return false;
    const n = (intake.filename || "").split("/").pop().toLowerCase();
    if (["claude_desktop_config.json", "mcp.json", ".mcp.json", "mcp_servers.json", "claude.json"].includes(n)) return true;
    return intake.parsed != null && typeof intake.parsed === "object" && "mcpServers" in intake.parsed;
  },
  loadRenderer: () => import("../types/text/json/known/mcp-config/renderer.js"),
  about: {
    description: "MCP (Model Context Protocol) server configuration — tool servers, transports, and environment configuration for AI assistants.",
    usedFor: [
      { label: "claude_desktop_config.json", description: "Claude Desktop MCP configuration", href: "https://modelcontextprotocol.io/quickstart/user" },
      { label: "mcp.json", description: "MCP server configuration file", href: "https://modelcontextprotocol.io/" }
    ]
  }
};

// ../../docs/types/text/known/sudoers/index.js
var sudoers_default = {
  id: "sudoers",
  label: "sudoers",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const text = intake.textSample || intake.text || "";
    if (n === "sudoers" || n === "sudoers.d" || n.endsWith(".sudoers")) return true;
    if (text.includes("ALL=(ALL") && (text.includes("NOPASSWD") || text.includes("ALL) ALL"))) return true;
    if (text.includes("Defaults") && text.includes("env_reset") && text.includes("ALL=")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/sudoers/renderer.js"),
  about: {
    description: "Sudo access control rules — specifies which users and groups can run which commands as which users.",
    usedFor: [{ label: "sudo", description: "Allows permitted users to run commands as superuser", href: "https://www.sudo.ws/" }]
  }
};

// ../../docs/types/text/known/nfs-exports/index.js
var nfs_exports_default = {
  id: "nfs-exports",
  label: "NFS Exports",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const text = intake.textSample || intake.text || "";
    if (n === "exports") return true;
    if (text.includes("(rw,") || text.includes("(ro,")) {
      if (text.includes("no_root_squash") || text.includes("sync") || text.includes("subtree_check") || text.includes("no_subtree_check")) return true;
    }
    return false;
  },
  loadRenderer: () => import("../types/text/known/nfs-exports/renderer.js"),
  about: {
    description: "NFS export configuration — defines which directories are shared over NFS and the access permissions for each client.",
    usedFor: [{ label: "NFS", description: "Network File System — protocol for sharing filesystems over a network", href: "https://linux.die.net/man/5/exports" }]
  }
};

// ../../docs/types/text/yaml/known/sam-template/index.js
var sam_template_default = {
  id: "sam-template",
  label: "AWS SAM",
  match: (intake, baseType) => {
    if (baseType?.id !== "yaml") return false;
    const name = (intake.filename || intake.name || "").split("/").pop().toLowerCase();
    if (name !== "template.yaml" && name !== "template.yml" && name !== "sam-template.yaml" && name !== "sam-template.yml") return false;
    const t = intake.text || "";
    return t.includes("AWS::Serverless");
  },
  loadRenderer: () => import("../types/text/yaml/known/sam-template/renderer.js"),
  about: {
    description: "AWS Serverless Application Model template — defines serverless functions, APIs, and event sources.",
    usedFor: [{ label: "AWS SAM", description: "Framework for building serverless applications on AWS.", href: "https://docs.aws.amazon.com/serverless-application-model/" }]
  }
};

// ../../docs/types/text/yaml/known/cfn-template/index.js
var cfn_template_default = {
  id: "cfn-template",
  label: "CloudFormation",
  match: (intake, baseType) => {
    if (baseType?.id !== "yaml") return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    if (!["template.yaml", "template.yml", "cloudformation.yml", "cloudformation.yaml"].includes(name)) return false;
    const t = intake.text || "";
    return t.includes("AWSTemplateFormatVersion") || t.includes("AWS::");
  },
  loadRenderer: () => import("../types/text/yaml/known/cfn-template/renderer.js"),
  about: {
    description: "AWS CloudFormation template — defines infrastructure resources to provision and manage.",
    usedFor: [{ label: "AWS CloudFormation", description: "Infrastructure as Code for AWS resources.", href: "https://docs.aws.amazon.com/cloudformation/" }]
  }
};

// ../../docs/types/text/json/known/cdk-json/index.js
var cdk_json_default = {
  id: "cdk-json",
  label: "AWS CDK",
  match: (intake, baseType) => {
    if (baseType?.id !== "json") return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name === "cdk.json";
  },
  loadRenderer: () => import("../types/text/json/known/cdk-json/renderer.js"),
  about: {
    description: "AWS CDK app configuration — defines the CDK app entry point, context, and toolkit settings.",
    usedFor: [{ label: "AWS CDK", description: "Cloud Development Kit for defining cloud infrastructure in code.", href: "https://docs.aws.amazon.com/cdk/" }]
  }
};

// ../../docs/types/text/json/known/release-please-config/index.js
var plugin54 = {
  id: "release-please",
  label: "Release Please",
  tags: ["release-please", "release", "json"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "release-please-config.json";
  },
  renderer: () => import("../types/text/json/known/release-please-config/renderer.js"),
  loadRenderer: () => import("../types/text/json/known/release-please-config/renderer.js"),
  about: {
    description: "Release Please configuration — automates changelog generation and GitHub release creation following Conventional Commits.",
    usedFor: [{ label: "Automated releases", description: "Google Release Please bot for automated versioning and changelog generation", href: "https://github.com/googleapis/release-please" }]
  }
};
var release_please_config_default = plugin54;

// ../../docs/types/text/toml/known/aws-sam-config/index.js
var aws_sam_config_default = {
  id: "aws-sam-config",
  label: "SAM Config",
  match: (intake, baseType) => {
    if (baseType?.id !== "toml") return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name === "samconfig.toml";
  },
  loadRenderer: () => import("../types/text/toml/known/aws-sam-config/renderer.js"),
  about: {
    description: "AWS SAM CLI configuration file — stores deployment parameters for SAM CLI commands.",
    usedFor: [{ label: "AWS SAM CLI", description: "SAM CLI samconfig.toml stores per-environment deploy parameters.", href: "https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-config.html" }]
  }
};

// ../../docs/types/text/yaml/known/analysis-options/index.js
var analysis_options_default = {
  id: "analysis-options",
  label: "Dart Analysis Options",
  match: (intake, baseType) => {
    if (!baseType || baseType.id !== "yaml") return false;
    const name = (intake.filename || "").split("/").pop();
    return name === "analysis_options.yaml";
  },
  loadRenderer: () => import("../types/text/yaml/known/analysis-options/renderer.js"),
  about: {
    description: "Flutter/Dart static analysis configuration — linter rules, analyzer options, and error severity overrides.",
    usedFor: [
      { label: "Flutter apps", description: "Enforces lint rules and code style in Flutter projects" },
      { label: "Dart packages", description: "Configures the Dart analyzer for libraries and CLI tools" }
    ]
  }
};

// ../../docs/types/text/known/podfile-lock/index.js
var podfile_lock_default = {
  id: "podfile-lock",
  label: "Podfile.lock",
  tags: ["cocoapods", "ios", "lockfile"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "podfile.lock";
  },
  loadRenderer: () => import("../types/text/known/podfile-lock/renderer.js"),
  about: {
    description: "CocoaPods lockfile — records exact pod versions, dependencies, spec checksums, and the CocoaPods version used.",
    usedFor: [
      { label: "iOS apps", description: "Locks CocoaPods dependency versions for reproducible iOS builds" },
      { label: "macOS apps", description: "Used in macOS Xcode projects managed with CocoaPods" }
    ]
  }
};

// ../../docs/types/text/xml/known/xcode-scheme/index.js
var xcode_scheme_default = {
  id: "xcode-scheme",
  label: "Xcode Scheme",
  match: (intake, baseType) => {
    if (!baseType || baseType.id !== "xml") return false;
    const name = (intake.filename || "").split("/").pop();
    return name.endsWith(".xcscheme");
  },
  loadRenderer: () => import("../types/text/xml/known/xcode-scheme/renderer.js"),
  about: {
    description: "Xcode scheme file — defines how Xcode builds, runs, tests, profiles, and archives a target.",
    usedFor: [
      { label: "iOS/macOS apps", description: "Controls build configurations and test settings for Xcode targets" }
    ]
  }
};

// ../../docs/types/text/json/known/eas-json/index.js
var eas_json_default = {
  id: "eas-json",
  label: "eas.json (Expo EAS)",
  match: (intake, baseType) => {
    if (!baseType || baseType.id !== "json") return false;
    const name = (intake.filename || "").split("/").pop();
    return name === "eas.json";
  },
  loadRenderer: () => import("../types/text/json/known/eas-json/renderer.js"),
  about: {
    description: "Expo Application Services build/submit configuration — defines build profiles for development, preview, and production.",
    usedFor: [
      { label: "Expo apps", description: "Configures EAS Build for iOS and Android cloud builds" },
      { label: "React Native apps", description: "Manages submit profiles for App Store and Google Play" }
    ]
  }
};

// ../../docs/types/text/json/known/dprint/index.js
var dprint_default = {
  id: "dprint",
  label: "dprint config",
  tags: ["formatter", "code-style"],
  match(intake, baseType) {
    if (!baseType || baseType.id !== "json") return false;
    const n = (intake.filename || "").split("/").pop().toLowerCase();
    return n === "dprint.json" || n === ".dprint.json" || n === "dprint.jsonc";
  },
  loadRenderer: () => import("../types/text/json/known/dprint/renderer.js"),
  about: {
    description: "dprint code formatter configuration — defines plugins, include/exclude globs, and per-plugin formatting rules.",
    usedFor: [
      { label: "Code formatting", description: "Fast pluggable code formatter supporting TypeScript, JSON, Markdown, TOML, and more", href: "https://dprint.dev/config/" }
    ]
  }
};

// ../../docs/types/text/known/opa-policy/index.js
var opa_policy_default = {
  id: "opa-policy",
  label: "OPA Policy",
  match: (intake) => {
    return (intake.filename || "").toLowerCase().endsWith(".rego");
  },
  loadRenderer: () => import("../types/text/known/opa-policy/renderer.js"),
  about: {
    description: "Open Policy Agent (OPA) Rego policy files define authorization logic using rules, functions, and data queries.",
    usedFor: [{ label: "OPA Policy Language", description: "Write allow/deny rules and helper functions for fine-grained authorization using the Rego policy language.", href: "https://www.openpolicyagent.org/docs/latest/policy-language/" }]
  }
};

// ../../docs/types/text/yaml/known/falco-rules/index.js
var falco_rules_default = {
  id: "falco-rules",
  label: "Falco Rules",
  match(intake, baseType) {
    if (baseType?.id !== "yaml") return false;
    const text = intake.text || "";
    return text.includes("- rule:") && text.includes("condition:") && text.includes("output:") && (text.includes("syscall") || text.includes("evt.type"));
  },
  loadRenderer: () => import("../types/text/yaml/known/falco-rules/renderer.js"),
  about: {
    description: "Falco runtime security rules define conditions for detecting suspicious behavior in containers and Linux systems, with output templates and priority levels.",
    usedFor: [{ label: "Falco Rules", description: "Define runtime security rules with conditions, output templates, and priorities for container and syscall-level threat detection.", href: "https://falco.org/docs/rules/" }]
  }
};

// ../../docs/types/text/yaml/known/falco-config/index.js
var falco_config_default = {
  id: "falco-config",
  label: "Falco Config",
  tags: ["falco", "security", "runtime", "cloud-native", "yaml"],
  match(intake, baseType) {
    if (baseType?.id !== "yaml") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const text = intake.text || "";
    const hasContent = text.includes("rules_file") || text.includes("output_timeout") || text.includes("falco_libs");
    return n === "falco.yaml" || n === "falco.yml" || n === "config.yaml" && hasContent;
  },
  loadRenderer: () => import("../types/text/yaml/known/falco-config/renderer.js"),
  about: {
    description: "Falco runtime security configuration file controlling rules files, outputs (stdout, file, program, gRPC), log level, and syscall event handling.",
    usedFor: [{ label: "Falco Config", description: "Configure Falco runtime security engine: rules files, alert outputs, gRPC API, and syscall monitoring settings.", href: "https://falco.org/docs/configuration/" }]
  }
};

// ../../docs/types/text/yaml/known/borgmatic-config/index.js
var plugin55 = {
  id: "borgmatic-config",
  label: "Borgmatic Config",
  tags: ["borgmatic", "backup", "borg", "yaml"],
  match(intake, baseType) {
    if (baseType?.id !== "yaml") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const text = intake.textSample || intake.text || "";
    if (n === "borgmatic.yaml" || n === "borgmatic.yml") return true;
    if (n === "config.yaml" && text.includes("source_directories:")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/yaml/known/borgmatic-config/renderer.js"),
  about: {
    description: "Borgmatic backup configuration defining source directories, Borg repositories, retention policy, consistency checks, and hooks.",
    usedFor: [{ label: "Borgmatic", description: "Configure borgmatic to run Borg backups: source directories, repositories, retention policy, and lifecycle hooks.", href: "https://torsion.org/borgmatic/" }]
  }
};
var borgmatic_config_default = plugin55;

// ../../docs/types/text/yaml/known/suricata-config/index.js
var plugin56 = {
  id: "suricata-config",
  label: "Suricata Config",
  tags: ["suricata", "ids", "ips", "security", "yaml"],
  match(intake, baseType) {
    if (baseType?.id !== "yaml") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "suricata.yaml" || n === "suricata.yml";
  },
  loadRenderer: () => import("../types/text/yaml/known/suricata-config/renderer.js"),
  about: {
    description: "Suricata IDS/IPS configuration defining network variables, capture interfaces, rule files, and output settings.",
    usedFor: [{ label: "Suricata IDS/IPS", description: "Configure Suricata network threat detection: HOME_NET, capture interfaces, rule-files, and alert outputs.", href: "https://suricata.io/documentation/" }]
  }
};
var suricata_config_default = plugin56;

// ../../docs/types/text/yaml/known/kyverno-policy/index.js
var kyverno_policy_default = {
  id: "kyverno-policy",
  label: "Kyverno Policy",
  match(intake, baseType) {
    if (baseType?.id !== "yaml") return false;
    const text = intake.text || "";
    return text.includes("kyverno.io") && (text.includes("kind: Policy") || text.includes("kind: ClusterPolicy"));
  },
  loadRenderer: () => import("../types/text/yaml/known/kyverno-policy/renderer.js"),
  about: {
    description: "Kyverno policy resources define Kubernetes admission control rules for validating, mutating, and generating resources without writing code.",
    usedFor: [{ label: "Kyverno Policy", description: "Define ClusterPolicy or Policy resources to enforce, audit, or mutate Kubernetes resources using pattern-based rules.", href: "https://kyverno.io/docs/" }]
  }
};

// ../../docs/types/text/yaml/known/gatekeeper-config/index.js
var gatekeeper_config_default = {
  id: "gatekeeper-config",
  label: "Gatekeeper",
  match(intake, baseType) {
    if (baseType?.id !== "yaml") return false;
    const text = intake.text || "";
    return text.includes("constraints.gatekeeper.sh") || text.includes("gatekeeper.sh/v1beta1");
  },
  loadRenderer: () => import("../types/text/yaml/known/gatekeeper-config/renderer.js"),
  about: {
    description: "OPA Gatekeeper constraint templates and constraints enforce policy as code on Kubernetes clusters using Open Policy Agent.",
    usedFor: [{ label: "OPA Gatekeeper", description: "Define ConstraintTemplates with Rego logic and Constraint resources to enforce policies on Kubernetes admission requests.", href: "https://open-policy-agent.github.io/gatekeeper/" }]
  }
};

// ../../docs/types/text/xml/known/jetbrains-workspace/index.js
var jetbrains_workspace_default = {
  id: "jetbrains-workspace",
  label: "JetBrains Workspace",
  match: (intake, baseType) => baseType.id === "xml" && /(^|\/)workspace\.xml$/.test(intake.filename || "") && (intake.text || "").includes("<project") && (intake.text || "").includes('<component name="'),
  loadRenderer: () => import("../types/text/xml/known/jetbrains-workspace/renderer.js")
};

// ../../docs/types/text/known/neovim-config/index.js
var neovim_config_default = {
  id: "neovim-config",
  label: "Neovim Config",
  match: (intake) => {
    const name = (intake.filename || "").replace(/^.*[\\/]/, "");
    const text = intake.text || "";
    if (name === "init.lua") {
      return text.includes("require(") && (text.includes("vim.keymap") || text.includes("vim.opt") || text.includes("nvim") || text.includes("lazy") || text.includes("packer"));
    }
    if (name === "init.vim") {
      return text.includes("set ") && (text.includes("plug") || text.includes("lua"));
    }
    return false;
  },
  loadRenderer: () => import("../types/text/known/neovim-config/renderer.js")
};

// ../../docs/types/text/known/vim-config/index.js
var vim_config_default = {
  id: "vim-config",
  label: "Vim Config",
  match: (intake) => {
    const name = (intake.filename || "").replace(/^.*[\\/]/, "");
    const text = intake.text || "";
    if (name === ".vimrc" || name === "_vimrc") return true;
    if (name === "init.vim" && !text.includes("lua") && text.includes("set ")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/vim-config/renderer.js")
};

// ../../docs/types/text/known/alacritty-conf/index.js
var alacritty_conf_default = {
  id: "alacritty-conf",
  label: "Alacritty Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const text = intake.textSample || intake.text || "";
    if (n === "alacritty.toml" || n === "alacritty.yml" || n === "alacritty.yaml") return true;
    if (text.includes("[font]") && text.includes("[window]") && (text.includes("[colors]") || text.includes("[env]"))) return true;
    if (text.includes("font:") && text.includes("window:") && text.includes("colors:") && text.includes("normal:")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/alacritty-conf/renderer.js"),
  about: {
    description: "Alacritty terminal emulator configuration — controls font, window decorations, colors, scrolling, and keyboard bindings.",
    usedFor: [{ label: "Alacritty", description: "GPU-accelerated terminal emulator focused on simplicity and performance", href: "https://alacritty.org/" }]
  }
};

// ../../docs/types/text/known/kitty-conf/index.js
var kitty_conf_default = {
  id: "kitty-conf",
  label: "kitty Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const text = intake.textSample || intake.text || "";
    if (n === "kitty.conf") return true;
    if (text.includes("font_family ") && text.includes("font_size ") && (text.includes("map ") || text.includes("background "))) return true;
    if (text.includes("# vim: ft=kitty") || text.includes("begin_kitty_theme") || text.includes("# kitty color scheme")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/kitty-conf/renderer.js"),
  about: {
    description: "kitty terminal emulator configuration — controls fonts, colors, window layout, keyboard shortcuts, and tab behavior.",
    usedFor: [{ label: "kitty", description: "Fast, feature-rich, GPU based terminal emulator", href: "https://sw.kovidgoyal.net/kitty/conf/" }]
  }
};

// ../../docs/types/text/toml/known/starship-config/index.js
var starship_config_default = {
  id: "starship-config",
  label: "Starship Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "starship.toml";
  },
  loadRenderer: () => import("../types/text/toml/known/starship-config/renderer.js"),
  about: {
    description: "Starship cross-shell prompt configuration — modules, palette, format string, and character symbols.",
    tags: ["starship", "prompt", "shell", "terminal", "toml"]
  }
};

// ../../docs/types/text/known/emacs-config/index.js
var emacs_config_default = {
  id: "emacs-config",
  label: "Emacs Config",
  match: (intake) => {
    const name = (intake.filename || "").replace(/^.*[\\/]/, "");
    return name === ".emacs" || name === "init.el";
  },
  loadRenderer: () => import("../types/text/known/emacs-config/renderer.js")
};

// ../../docs/types/text/known/tmux-conf/index.js
var tmux_conf_default = {
  id: "tmux-conf",
  label: "tmux Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const text = intake.textSample || intake.text || "";
    if (n === ".tmux.conf" || n === "tmux.conf") return true;
    if (text.includes("set -g prefix") || text.includes("set-option -g prefix") || text.includes("bind-key") && text.includes("send-prefix")) return true;
    if (text.includes("set -g status-") && text.includes("bind ")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/tmux-conf/renderer.js"),
  about: {
    description: "tmux terminal multiplexer configuration — defines keybindings, status bar, colors, and session behavior.",
    usedFor: [{ label: "tmux", description: "Terminal multiplexer — multiple windows and panes in a single terminal", href: "https://github.com/tmux/tmux/wiki" }]
  }
};

// ../../docs/types/text/known/screenrc/index.js
var screenrc_default = {
  id: "screenrc",
  label: "GNU Screen Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const text = intake.textSample || intake.text || "";
    if (n === ".screenrc" || n === "screenrc" || n === ".screen") return true;
    if ((text.includes("startup_message") || text.includes("defscrollback") || text.includes("termcapinfo")) && text.includes("escape ")) return true;
    if (text.includes("hardstatus") && text.includes("caption")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/screenrc/renderer.js"),
  about: {
    description: "GNU Screen configuration — defines the escape key, scrollback buffer, status line, and keybindings for the Screen terminal multiplexer.",
    usedFor: [{ label: "GNU Screen", description: "Terminal multiplexer allowing multiple virtual terminals in a single session", href: "https://www.gnu.org/software/screen/" }]
  }
};

// ../../docs/types/text/known/i3-config/index.js
var i3_config_default = {
  id: "i3-config",
  label: "i3 Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const text = intake.textSample || intake.text || "";
    if (text.includes("output * bg ") || text.includes("swaymsg") || text.includes("swaylock") || text.includes("swaybar")) return false;
    if (n === "config" || n === "i3.conf") {
      if (text.includes("# i3") || text.includes("set $mod") && text.includes("bindsym") || text.includes("workspace") && text.includes("bindsym") && text.includes("exec")) return true;
    }
    if (text.includes("set $mod Mod") && text.includes("bindsym $mod") && text.includes("font pango:")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/i3-config/renderer.js"),
  about: {
    description: "i3 tiling window manager configuration — defines keybindings, workspaces, layouts, colors, and startup applications.",
    usedFor: [{ label: "i3", description: "Improved tiling window manager for X11", href: "https://i3wm.org/docs/userguide.html" }]
  }
};

// ../../docs/types/text/known/sway-config/index.js
var sway_config_default = {
  id: "sway-config",
  label: "Sway Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const text = intake.textSample || intake.text || "";
    if (n === "sway" || n === "sway.conf") return true;
    if (n === "config") {
      if (text.includes("# sway") || text.includes("output ") && text.includes("resolution") && text.includes("bindsym")) return true;
      if (text.includes("set $mod") && text.includes("input ") && text.includes("bindsym") && text.includes("swaymsg")) return true;
    }
    if (text.includes("output * bg ") || text.includes("swaymsg") || text.includes("swaylock") || text.includes("swaybar")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/sway-config/renderer.js"),
  about: {
    description: "Sway tiling Wayland compositor configuration — defines keybindings, outputs, inputs, workspaces, and startup applications for the i3-compatible Wayland compositor.",
    usedFor: [{ label: "Sway", description: "i3-compatible tiling Wayland compositor", href: "https://swaywm.org/" }]
  }
};

// ../../docs/types/text/known/dunstrc/index.js
var dunstrc_default = {
  id: "dunstrc",
  label: "dunst Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const text = intake.textSample || intake.text || "";
    if (n === "dunstrc" || n === "dunst.conf") return true;
    if (text.includes("[global]") && text.includes("notification_limit") && text.includes("font")) return true;
    if (text.includes("[urgency_low]") || text.includes("[urgency_normal]") || text.includes("[urgency_critical]")) {
      if (text.includes("[global]")) return true;
    }
    return false;
  },
  loadRenderer: () => import("../types/text/known/dunstrc/renderer.js"),
  about: {
    description: "dunst notification daemon configuration — controls notification appearance, urgency levels, timeouts, and keyboard shortcuts.",
    usedFor: [{ label: "dunst", description: "Customizable and lightweight notification daemon", href: "https://dunst-project.org/documentation/" }]
  }
};

// ../../docs/types/text/known/polybar-conf/index.js
var polybar_conf_default = {
  id: "polybar-conf",
  label: "Polybar Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const text = intake.textSample || intake.text || "";
    if (n === "config.ini" || n === "polybar.ini" || n === "polybar.conf" || n === "config") {
      if (text.includes("[bar/") && (text.includes("modules-left") || text.includes("modules-right"))) return true;
    }
    if (text.includes("[bar/") && text.includes("[module/") && text.includes("type = ")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/polybar-conf/renderer.js"),
  about: {
    description: "Polybar status bar configuration — defines bars and modules for a highly customizable Linux status bar.",
    usedFor: [{ label: "Polybar", description: "Fast and easy to use tool for creating status bars", href: "https://polybar.readthedocs.io/" }]
  }
};

// ../../docs/types/text/json/known/waybar-config/index.js
var waybar_config_default = {
  id: "waybar-config",
  label: "Waybar Config",
  match(intake, baseType) {
    if (baseType?.id !== "json") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const validName = n === "config" || n === "config.jsonc" || n === "config.json" || n === "waybar-config.json" || n === "waybar.config.json";
    if (!validName) return false;
    const text = intake.text || "";
    return text.includes('"modules-left"') || text.includes('"modules-center"') || text.includes('"modules-right"');
  },
  loadRenderer: () => import("../types/text/json/known/waybar-config/renderer.js"),
  about: {
    description: "Waybar status bar configuration — module layout, display settings, and per-module options.",
    usedFor: [{ label: "Waybar", description: "Highly customizable Wayland bar for Sway and wlroots-based compositors", href: "https://github.com/Alexays/Waybar" }]
  }
};

// ../../docs/types/text/yaml/known/woodpecker-ci/index.js
var woodpecker_ci_default = {
  id: "woodpecker-ci",
  label: "Woodpecker CI",
  match: (intake, baseType) => {
    if (baseType.id !== "yaml") return false;
    const fn = intake.filename || "";
    const name = fn.split("/").pop().toLowerCase();
    return name === ".woodpecker.yml" || name === ".woodpecker.yaml" || name === "woodpecker.yml" || fn.includes(".woodpecker/");
  },
  loadRenderer: () => import("../types/text/yaml/known/woodpecker-ci/renderer.js"),
  about: {
    description: "Woodpecker CI pipeline — shows steps, when conditions, matrix builds, and secrets used.",
    usedFor: [{ label: "CI/CD", description: "Lightweight CI/CD for Gitea and Forgejo with Woodpecker", href: "https://woodpecker-ci.org/docs/usage/pipeline-syntax" }]
  }
};

// ../../docs/types/text/yaml/known/codefresh-config/index.js
var codefresh_config_default = {
  id: "codefresh-config",
  label: "Codefresh config",
  match: (intake, baseType) => {
    if (baseType.id !== "yaml") return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name === "codefresh.yml" || name === "codefresh.yaml";
  },
  loadRenderer: () => import("../types/text/yaml/known/codefresh-config/renderer.js"),
  about: {
    description: "Codefresh pipeline — shows version, steps, triggers, and variables.",
    usedFor: [{ label: "CI/CD", description: "Codefresh GitOps CD platform pipeline definition", href: "https://codefresh.io/docs/docs/configure-ci-cd-pipeline/introduction-to-codefresh-pipelines/" }]
  }
};

// ../../docs/types/text/yaml/known/harness-pipeline/index.js
var harness_pipeline_default = {
  id: "harness-pipeline",
  label: "Harness Pipeline",
  match: (intake, baseType) => {
    if (baseType.id !== "yaml") return false;
    const text = intake.textSample || intake.text || "";
    return text.includes("pipeline:") && text.includes("identifier:") && (text.includes("stages:") || text.includes("stage:")) && (text.includes("type: CI") || text.includes("type: CD"));
  },
  loadRenderer: () => import("../types/text/yaml/known/harness-pipeline/renderer.js"),
  about: {
    description: "Harness pipeline — shows pipeline name, identifier, stages, and execution steps.",
    usedFor: [{ label: "CI/CD", description: "Enterprise CI/CD with Harness Platform", href: "https://developer.harness.io/docs/platform/pipelines/pipeline-settings" }]
  }
};

// ../../docs/types/text/known/act-config/index.js
var act_config_default = {
  id: "act-config",
  label: "act config",
  match: (intake, baseType) => {
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name === ".actrc" || name === "act.config";
  },
  loadRenderer: () => import("../types/text/known/act-config/renderer.js"),
  about: {
    description: "act local GitHub Actions runner config — shows platform mappings, env vars, and secrets.",
    usedFor: [{ label: "Dev Tools", description: "Run GitHub Actions locally with act", href: "https://github.com/nektos/act#configuration" }]
  }
};

// ../../docs/types/text/known/actrc/index.js
var plugin57 = {
  id: "actrc",
  label: "act config",
  tags: ["github-actions", "ci", "local", "act"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === ".actrc";
  },
  loadRenderer: () => import("../types/text/known/actrc/renderer.js"),
  about: {
    description: "act local GitHub Actions runner config — platform image mappings, secrets/env files, bind options, and CLI flags.",
    usedFor: [{ label: "Dev Tools", description: "Run GitHub Actions locally with act", href: "https://github.com/nektos/act#configuration" }]
  }
};
var actrc_default = plugin57;

// ../../docs/types/text/known/pulsar-conf/index.js
var plugin58 = {
  id: "pulsar-conf",
  label: "Apache Pulsar Config",
  tags: ["pulsar", "messaging", "streaming", "broker"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n !== "standalone.conf" && n !== "broker.conf" && n !== "pulsar.conf") return false;
    const t = intake.text || "";
    return t.includes("zookeeperServers=") || t.includes("managedLedgerDefaultEnsembleSize=") || t.includes("brokerServicePort=") || t.includes("pulsarMetadataStoreUrl=");
  },
  loadRenderer: () => import("../types/text/known/pulsar-conf/renderer.js"),
  about: {
    description: "Apache Pulsar broker configuration — cluster, ports, BookKeeper storage, authentication, TLS, and tiered storage offload settings.",
    usedFor: [{ label: "Messaging", description: "Apache Pulsar distributed messaging platform", href: "https://pulsar.apache.org/docs/administration-configuration/" }]
  }
};
var pulsar_conf_default = plugin58;

// ../../docs/types/text/json/known/cyclonedx-sbom/index.js
var cyclonedx_sbom_default = {
  id: "cyclonedx-sbom",
  label: "CycloneDX SBOM",
  match(intake, baseType) {
    if (baseType?.id !== "json") return false;
    const text = intake.text || intake.textSample || "";
    return text.includes('"bomFormat":"CycloneDX"') || text.includes('"bomFormat": "CycloneDX"');
  },
  loadRenderer: () => import("../types/text/json/known/cyclonedx-sbom/renderer.js"),
  about: {
    description: "CycloneDX Software Bill of Materials — components, licenses, and vulnerabilities.",
    usedFor: [{ label: "SBOM", description: "CycloneDX is a lightweight software bill of materials standard for application security contexts and supply chain component analysis.", href: "https://cyclonedx.org/" }]
  }
};

// ../../docs/types/text/known/spdx-sbom/index.js
var spdx_sbom_default = {
  id: "spdx-sbom",
  label: "SPDX SBOM",
  match(intake, _baseType) {
    const fn = intake.filename || "";
    const text = intake.text || intake.textSample || "";
    if (/\.spdx$/i.test(fn)) return true;
    return text.startsWith("SPDXVersion:") || text.includes("SPDXID: SPDXRef-DOCUMENT");
  },
  loadRenderer: () => import("../types/text/known/spdx-sbom/renderer.js"),
  about: {
    description: "SPDX Software Bill of Materials — packages, licenses, and document info.",
    usedFor: [{ label: "SBOM", description: "SPDX (Software Package Data Exchange) is an open standard for communicating software bill of material information.", href: "https://spdx.dev/" }]
  }
};

// ../../docs/types/text/json/known/slsa-provenance/index.js
var slsa_provenance_default = {
  id: "slsa-provenance",
  label: "SLSA Provenance",
  match(intake, baseType) {
    if (baseType?.id !== "json") return false;
    const text = intake.text || intake.textSample || "";
    if (text.includes('"_type":"https://in-toto.io/Statement/v0.1"') || text.includes('"_type": "https://in-toto.io/Statement/v0.1"')) return true;
    return text.includes('"buildType"') && text.includes('"builder"') && (text.includes("slsa") || text.includes("provenance"));
  },
  loadRenderer: () => import("../types/text/json/known/slsa-provenance/renderer.js"),
  about: {
    description: "SLSA provenance attestation — build info, subject digests, and dependency materials.",
    usedFor: [{ label: "Supply chain security", description: "SLSA (Supply-chain Levels for Software Artifacts) provenance describes how a software artifact was built.", href: "https://slsa.dev/" }]
  }
};

// ../../docs/types/text/yaml/known/syft-config/index.js
var syft_config_default = {
  id: "syft-config",
  label: "Syft config",
  match(intake, baseType) {
    if (baseType?.id !== "yaml") return false;
    const fn = (intake.filename || "").replace(/^.*\//, "");
    return fn === ".syft.yaml" || fn === "syft.yaml";
  },
  loadRenderer: () => import("../types/text/yaml/known/syft-config/renderer.js"),
  about: {
    description: "Syft SBOM generation configuration — output formats, catalogers, and secret scanning settings.",
    usedFor: [{ label: "SBOM generation", description: "Syft is a CLI tool and Go library for generating a Software Bill of Materials from container images and filesystems.", href: "https://github.com/anchore/syft" }]
  }
};

// ../../docs/types/text/known/proguard-rules/index.js
var proguard_rules_default = {
  id: "proguard-rules",
  label: "ProGuard Rules",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "proguard-rules.pro" || n === "consumer-rules.pro" || n === "proguard-rules.txt";
  },
  loadRenderer: () => import("../types/text/known/proguard-rules/renderer.js"),
  about: {
    description: "Android ProGuard/R8 obfuscation rules — controls which classes and members are kept, shrunk, or obfuscated during the build.",
    usedFor: [
      { label: "ProGuard", description: "Code shrinking, obfuscation, and optimization rules for Android apps", href: "https://developer.android.com/build/shrink-code" }
    ]
  }
};

// ../../docs/types/text/xml/known/android-strings/index.js
var android_strings_default = {
  id: "android-strings",
  label: "Android Strings",
  match(intake, baseType) {
    if (baseType?.id !== "xml") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "strings.xml") return true;
    const text = intake.text || "";
    return /<resources[\s>]/.test(text) && /<string\s+name=/.test(text);
  },
  loadRenderer: () => import("../types/text/xml/known/android-strings/renderer.js"),
  about: {
    description: "Android string resources — defines localizable text strings, string arrays, and plural rules for an Android application.",
    usedFor: [
      { label: "Android", description: "String resource definitions for UI text, supporting localization and pluralization", href: "https://developer.android.com/guide/topics/resources/string-resource" }
    ]
  }
};

// ../../docs/types/text/json/known/keycloak-realm/index.js
var keycloak_realm_default = {
  id: "keycloak-realm",
  label: "Keycloak Realm",
  match(intake, baseType) {
    if (baseType?.id !== "json") return false;
    try {
      const cfg = JSON.parse(intake.text || "{}");
      return typeof cfg.realm === "string" && Array.isArray(cfg.clients) && cfg.roles != null && typeof cfg.roles === "object" && !Array.isArray(cfg.roles);
    } catch {
      return false;
    }
  },
  loadRenderer: () => import("../types/text/json/known/keycloak-realm/renderer.js"),
  about: {
    description: "Keycloak realm export — realm settings, clients, roles, and identity providers.",
    usedFor: [{ label: "Keycloak", description: "Keycloak realm configuration export with clients, roles, and identity provider settings.", href: "https://www.keycloak.org/docs/latest/server_admin/#exporting-and-importing-a-realm" }]
  }
};

// ../../docs/types/text/yaml/known/authelia-config/index.js
var authelia_config_default = {
  id: "authelia-config",
  label: "Authelia config",
  match(intake, baseType) {
    if (baseType?.id !== "yaml") return false;
    const text = intake.text || "";
    return text.includes("authentication_backend:") && (text.includes("access_control:") || text.includes("identity_providers:"));
  },
  loadRenderer: () => import("../types/text/yaml/known/authelia-config/renderer.js"),
  about: {
    description: "Authelia configuration — authentication backend, access control rules, and OIDC providers.",
    usedFor: [{ label: "Authelia", description: "Authelia SSO and 2FA authentication gateway configuration with LDAP/file backend and access control policies.", href: "https://www.authelia.com/configuration/prologue/introduction/" }]
  }
};

// ../../docs/types/text/known/oauth2-proxy-config/index.js
var oauth2_proxy_config_default = {
  id: "oauth2-proxy-config",
  label: "OAuth2 Proxy config",
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (name === "rclone.conf") return false;
    if (name === "oauth2-proxy.cfg") return true;
    const text = intake.text || "";
    return (text.includes("client_id =") || text.includes("client_id=")) && (text.includes("provider =") || text.includes("provider="));
  },
  loadRenderer: () => import("../types/text/known/oauth2-proxy-config/renderer.js"),
  about: {
    description: "OAuth2 Proxy configuration — provider, upstream URLs, cookie settings, and allowed domains.",
    usedFor: [{ label: "OAuth2 Proxy", description: "OAuth2 Proxy reverse proxy configuration supporting GitHub, Google, OIDC, and other providers.", href: "https://oauth2-proxy.github.io/oauth2-proxy/configuration/overview" }]
  }
};

// ../../docs/types/text/yaml/known/authentik-config/index.js
var authentik_config_default = {
  id: "authentik-blueprint",
  label: "Authentik blueprint",
  match(intake, baseType) {
    if (baseType?.id !== "yaml") return false;
    const text = intake.text || "";
    if (!text.includes("version:") || !text.includes("entries:")) return false;
    return text.includes("authentik_") || text.includes("model:");
  },
  loadRenderer: () => import("../types/text/yaml/known/authentik-config/renderer.js"),
  about: {
    description: "Authentik blueprint — versioned entries defining applications, providers, flows, and stages.",
    usedFor: [{ label: "Authentik", description: "Authentik identity provider blueprint for declarative configuration of applications, OAuth2 providers, flows, and policy bindings.", href: "https://docs.goauthentik.io/docs/advanced/blueprints" }]
  }
};

// ../../docs/types/text/known/authentik-config/index.js
var authentik_config_default2 = {
  id: "authentik-config",
  label: "Authentik Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "authentik.env") return true;
    return (intake.text || "").includes("AUTHENTIK_SECRET_KEY");
  },
  loadRenderer: () => import("../types/text/known/authentik-config/renderer.js"),
  about: {
    description: "Authentik identity provider environment configuration — secrets, database, Redis, email, and listener settings.",
    usedFor: [{ label: "Authentik", description: "Self-hosted identity provider and SSO platform.", href: "https://goauthentik.io" }]
  }
};

// ../../docs/types/text/yaml/known/synapse-config/index.js
var synapse_config_default = {
  id: "synapse-config",
  label: "Matrix Synapse config",
  match(intake, baseType) {
    if (baseType?.id !== "yaml") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "synapse.yaml") return true;
    if (n === "homeserver.yaml") {
      const text = intake.text || "";
      return text.includes("server_name:") && (text.includes("listeners:") || text.includes("database:"));
    }
    return false;
  },
  loadRenderer: () => import("../types/text/yaml/known/synapse-config/renderer.js"),
  about: {
    description: "Matrix Synapse homeserver configuration — federation, database, listeners, authentication, and media settings.",
    usedFor: [{ label: "Matrix Synapse", description: "Matrix Synapse homeserver configuration file controlling federation, database, listeners, and authentication.", href: "https://matrix-org.github.io/synapse/latest/usage/configuration/config_documentation.html" }]
  }
};

// ../../docs/types/text/yaml/known/gotosocial-config/index.js
var gotosocial_config_default = {
  id: "gotosocial-config",
  label: "GoToSocial Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n !== "config.yaml" && n !== "gotosocial-config.yaml") return false;
    const text = intake.text || "";
    return (text.includes("account-domain:") || text.includes("db-type:")) && text.includes("protocol:");
  },
  loadRenderer: () => import("../types/text/yaml/known/gotosocial-config/renderer.js"),
  about: {
    description: "GoToSocial ActivityPub social server configuration — server, database, storage, email, and OIDC settings.",
    usedFor: [{ label: "GoToSocial", description: "GoToSocial is a lightweight ActivityPub social network server.", href: "https://gotosocial.org/" }]
  }
};

// ../../docs/types/text/yaml/known/searxng-config/index.js
var searxng_config_default = {
  id: "searxng-config",
  label: "SearXNG Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n !== "settings.yml" && n !== "searxng-settings.yml") return false;
    const text = intake.text || "";
    return text.includes("instance_name:") || text.includes("engines:") && text.includes("searx");
  },
  loadRenderer: () => import("../types/text/yaml/known/searxng-config/renderer.js"),
  about: {
    description: "SearXNG privacy-respecting metasearch engine configuration — server, search, engines, UI, and outgoing settings.",
    usedFor: [{ label: "SearXNG", description: "SearXNG is a free internet metasearch engine which aggregates results from various search services and databases.", href: "https://docs.searxng.org/" }]
  }
};

// ../../docs/types/text/yaml/known/newrelic-config/index.js
var newrelic_config_default = {
  id: "newrelic-config",
  label: "New Relic Agent",
  match(intake, baseType) {
    if (baseType?.id !== "yaml") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const t = intake.text || intake.textSample || "";
    return (n === "newrelic.yml" || n === "newrelic.yaml") && t.includes("common");
  },
  loadRenderer: () => import("../types/text/yaml/known/newrelic-config/renderer.js"),
  about: {
    description: "New Relic agent configuration — app name, license key, log level, and environment overrides.",
    usedFor: [{ label: "APM monitoring", description: "Configure New Relic APM agent: app name, license key, tracing, and per-environment settings.", href: "https://docs.newrelic.com/docs/apm/agents/" }]
  }
};

// ../../docs/types/text/yaml/known/dynatrace-config/index.js
var dynatrace_config_default = {
  id: "dynatrace-config",
  label: "Dynatrace OneAgent",
  match(intake, baseType) {
    if (baseType?.id !== "yaml") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const t = intake.text || intake.textSample || "";
    return n === "dtconfig.yaml" || t.includes("dynatrace:") && t.includes("apiUrl:");
  },
  loadRenderer: () => import("../types/text/yaml/known/dynatrace-config/renderer.js"),
  about: {
    description: "Dynatrace OneAgent configuration — API URL, environment ID, tokens, network zones, and feature flags.",
    usedFor: [{ label: "Observability", description: "Configure Dynatrace OneAgent: API URL, environment ID, API tokens, network zones, and storage settings.", href: "https://docs.dynatrace.com/docs/setup-and-configuration/dynatrace-oneagent/configuration" }]
  }
};

// ../../docs/types/text/known/elastic-apm-config/index.js
var elastic_apm_config_default = {
  id: "elastic-apm-config",
  label: "Elastic APM Agent",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const t = intake.text || intake.textSample || "";
    if (n === "elastic-apm-agent.properties") return true;
    if (n === "elastic-apm.yaml" && (t.includes("service_name") || t.includes("service_name:"))) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/elastic-apm-config/renderer.js"),
  about: {
    description: "Elastic APM agent configuration — service name, server URLs, environment, sampling, and secret token.",
    usedFor: [{ label: "APM tracing", description: "Configure the Elastic APM agent: service identity, server connection, sampling rate, and logging.", href: "https://www.elastic.co/guide/en/apm/agent/" }]
  }
};

// ../../docs/types/text/yaml/known/filebeat/index.js
var filebeat_default = {
  id: "filebeat",
  label: "Filebeat",
  match(intake, baseType) {
    if (baseType?.id !== "yaml") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "filebeat.yml" || n === "filebeat.yaml";
  },
  loadRenderer: () => import("../types/text/yaml/known/filebeat/renderer.js"),
  about: {
    description: "Elastic Filebeat configuration — log/filestream inputs, modules, Elasticsearch/Logstash/Kafka output, and processors.",
    usedFor: [{ label: "Log shipping", description: "Configure Filebeat to collect log files, stdin, TCP/UDP streams, Kafka topics, or S3 objects and forward them to Elasticsearch, Logstash, Kafka, or other outputs.", href: "https://www.elastic.co/guide/en/beats/filebeat/current/filebeat-overview.html" }]
  }
};

// ../../docs/types/text/yaml/known/heartbeat/index.js
var heartbeat_default = {
  id: "heartbeat",
  label: "Heartbeat",
  match(intake, baseType) {
    if (baseType?.id !== "yaml") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "heartbeat.yml" || n === "heartbeat.yaml";
  },
  loadRenderer: () => import("../types/text/yaml/known/heartbeat/renderer.js"),
  about: {
    description: "Elastic Heartbeat configuration — uptime monitors (HTTP, TCP, ICMP), scheduler settings, and output.",
    usedFor: [{ label: "Uptime monitoring", description: "Configure Heartbeat to probe HTTP endpoints, TCP ports, and ICMP hosts on a schedule and ship availability data to Elasticsearch for use in Kibana Uptime.", href: "https://www.elastic.co/guide/en/beats/heartbeat/current/heartbeat-overview.html" }]
  }
};

// ../../docs/types/text/yaml/known/beats-config/index.js
var beats_config_default = {
  id: "beats-config",
  label: "Elastic Beats",
  match(intake, baseType) {
    if (baseType?.id !== "yaml") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "filebeat.yml" || n === "metricbeat.yml" || n === "heartbeat.yml" || n === "auditbeat.yml";
  },
  loadRenderer: () => import("../types/text/yaml/known/beats-config/renderer.js"),
  about: {
    description: "Elastic Beats configuration — inputs/modules, output (Elasticsearch/Logstash/Kafka), and processors.",
    usedFor: [{ label: "Data shipping", description: "Configure Elastic Beats agents to collect logs, metrics, uptime, or audit events and ship to Elasticsearch, Logstash, or Kafka.", href: "https://www.elastic.co/guide/en/beats/libbeat/current/beats-reference.html" }]
  }
};

// ../../docs/types/text/known/hardhat-config/index.js
var hardhat_config_default = {
  id: "hardhat-config",
  label: "Hardhat Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "hardhat.config.js" || n === "hardhat.config.ts";
  },
  loadRenderer: () => import("../types/text/known/hardhat-config/renderer.js"),
  about: {
    description: "Hardhat Ethereum/EVM development framework configuration — defines networks, Solidity compiler settings, paths, plugins, and gas reporter options.",
    usedFor: [{ label: "Hardhat", description: "Ethereum development environment for professionals", href: "https://hardhat.org/docs" }]
  }
};

// ../../docs/types/text/known/truffle-config/index.js
var truffle_config_default = {
  id: "truffle-config",
  label: "Truffle Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n !== "truffle-config.js" && n !== "truffle.config.js") return false;
    const text = intake.text || (intake.bytes ? new TextDecoder().decode(intake.bytes) : "");
    return /\bnetworks\s*[=:]/.test(text);
  },
  loadRenderer: () => import("../types/text/known/truffle-config/renderer.js"),
  about: {
    description: "Truffle Ethereum smart contract development framework configuration — defines networks, Solidity compiler settings, and migration paths.",
    usedFor: [{ label: "Truffle", description: "Smart contract development framework for Ethereum", href: "https://trufflesuite.com/docs/truffle/reference/configuration/" }]
  }
};

// ../../docs/types/text/toml/known/foundry-toml/index.js
var foundry_toml_default = {
  id: "foundry-toml",
  label: "Foundry Config",
  match(intake, baseType) {
    if (baseType && baseType.id !== "toml") return false;
    const name = (intake.filename || intake.name || "").split("/").pop().toLowerCase();
    if (name !== "foundry.toml") return false;
    const text = intake.text || (intake.bytes ? new TextDecoder().decode(intake.bytes) : "");
    return /\[profile\.default\]/.test(text);
  },
  loadRenderer: () => import("../types/text/toml/known/foundry-toml/renderer.js"),
  about: {
    description: "Foundry Solidity testing framework configuration — defines profiles, compiler settings, RPC endpoints, and Etherscan keys.",
    usedFor: [{ label: "Foundry", description: "Blazing fast, portable and modular toolkit for Ethereum application development", href: "https://book.getfoundry.sh/reference/config/overview" }]
  }
};

// ../../docs/types/text/toml/known/anchor-toml/index.js
var anchor_toml_default = {
  id: "anchor-toml",
  label: "Anchor Config",
  match(intake, baseType) {
    if (baseType && baseType.id !== "toml") return false;
    const name = (intake.filename || intake.name || "").split("/").pop();
    if (name !== "Anchor.toml") return false;
    const text = intake.text || (intake.bytes ? new TextDecoder().decode(intake.bytes) : "");
    return /\[programs\.(localnet|devnet|mainnet|testnet)\]/.test(text);
  },
  loadRenderer: () => import("../types/text/toml/known/anchor-toml/renderer.js"),
  about: {
    description: "Anchor Solana smart contract framework configuration — defines program IDs per cluster, provider settings, and workspace members.",
    usedFor: [{ label: "Anchor", description: "Framework for Solana's Sealevel runtime", href: "https://www.anchor-lang.com/docs" }]
  }
};

// ../../docs/types/text/known/wireguard-conf/index.js
var wireguard_conf_default = {
  id: "wireguard-conf",
  label: "WireGuard VPN",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (/^wg\d+\.conf$/.test(n)) return true;
    const text = intake.text || "";
    return text.includes("[Interface]") && text.includes("PrivateKey");
  },
  loadRenderer: () => import("../types/text/known/wireguard-conf/renderer.js"),
  about: {
    description: "WireGuard VPN configuration — interface settings and peer definitions for a WireGuard tunnel.",
    usedFor: [{ label: "wg-quick", description: "WireGuard VPN configuration file used by wg-quick and the wg tool", href: "https://www.wireguard.com/quickstart/" }]
  }
};

// ../../docs/types/text/known/coturn-conf/index.js
var coturn_conf_default = {
  id: "coturn-conf",
  label: "coturn TURN/STUN server",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "coturn.conf" || n === "turnserver.conf";
  },
  loadRenderer: () => import("../types/text/known/coturn-conf/renderer.js"),
  about: {
    description: "Coturn TURN/STUN server configuration — relay ports, credentials, TLS settings, and networking.",
    usedFor: [{ label: "coturn", description: "Coturn TURN and STUN server for WebRTC relay", href: "https://github.com/coturn/coturn/wiki/turnserver" }]
  }
};

// ../../docs/types/text/json/known/netbird-config/index.js
var netbird_config_default = {
  id: "netbird-config",
  label: "NetBird Config",
  match(intake, baseType) {
    if (baseType?.id !== "json") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "netbird.json";
  },
  loadRenderer: () => import("../types/text/json/known/netbird-config/renderer.js"),
  about: {
    description: "NetBird client configuration — management/signal URLs, WireGuard interface, peer key, and connectivity settings.",
    usedFor: [{ label: "NetBird", description: "WireGuard-based overlay VPN client configuration", href: "https://netbird.io/docs/" }]
  }
};

// ../../docs/types/text/json/known/tailscale-acl/index.js
var tailscale_acl_default = {
  id: "tailscale-acl",
  label: "Tailscale ACL",
  match(intake, baseType) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (["acls.hujson", "acls.json", "policy.hujson", "tailscale-acl.json"].includes(n)) return true;
    if (n.endsWith(".hujson")) {
      const text = intake.text || "";
      if (text.includes('"acls"')) return true;
    }
    if (n === "acls.json") {
      const text = intake.text || "";
      if (text.includes('"tagOwners"') || text.includes('"groups"') && text.includes('"tag:')) return true;
    }
    if (baseType?.id === "json") {
      const text = intake.text || "";
      if (text.includes('"acls"') && text.includes('"action"') && text.includes('"src"') && text.includes('"dst"')) return true;
    }
    return false;
  },
  loadRenderer: () => import("../types/text/json/known/tailscale-acl/renderer.js"),
  about: {
    description: "Tailscale network ACL policy — access control rules, groups, hosts, tag owners, and SSH access rules.",
    usedFor: [{ label: "Tailscale", description: "ACL policy file controlling network access in a Tailscale tailnet", href: "https://tailscale.com/kb/1018/acls/" }]
  }
};

// ../../docs/types/text/yaml/known/headscale-config/index.js
var headscale_config_default = {
  id: "headscale-config",
  label: "Headscale Config",
  match(intake, baseType) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const nameMatch = n === "headscale.yaml" || n === "headscale.yml" || n === "headscale-config.yaml" || n === "headscale-config.yml";
    const cfg = intake.parsed || {};
    const text = intake.text || intake.textSample || "";
    const contentMatch = !!cfg.server_url && !!cfg.noise || text.includes("server_url:") && text.includes("noise:") || text.includes("private_key_path:") && text.includes("ip_prefixes:");
    if (n === "config.yaml" || n === "config.yml") return contentMatch;
    return nameMatch || contentMatch;
  },
  loadRenderer: () => import("../types/text/yaml/known/headscale-config/renderer.js"),
  about: {
    description: "Headscale configuration — self-hosted Tailscale-compatible WireGuard VPN control plane server settings, database, DERP relays, DNS, and security keys.",
    usedFor: [
      { label: "Headscale", description: "Open-source self-hosted Tailscale-compatible WireGuard VPN control plane server.", href: "https://headscale.net/docs/ref/configuration/" }
    ]
  }
};

// ../../docs/types/text/known/openvpn-config/index.js
var openvpn_config_default = {
  id: "openvpn-config",
  label: "OpenVPN config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "stunnel.conf" || n === "rclone.conf") return false;
    if (n.endsWith(".ovpn")) return true;
    if (n.endsWith(".conf")) {
      const text = intake.text || "";
      return text.includes("remote ") && (text.includes("client") || text.includes("tls-auth") || text.includes("cipher"));
    }
    return false;
  },
  loadRenderer: () => import("../types/text/known/openvpn-config/renderer.js"),
  about: {
    description: "OpenVPN configuration — server/client mode, remote endpoint, encryption, certificates, and tunnel settings.",
    usedFor: [{ label: "OpenVPN", description: "Open source VPN solution", href: "https://openvpn.net/community-resources/reference-manual-for-openvpn-2-4/" }]
  }
};

// ../../docs/types/text/known/openssl-conf/index.js
var openssl_conf_default = {
  id: "openssl-conf",
  label: "OpenSSL Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const text = intake.textSample || intake.text || "";
    if (n === "openssl.cnf" || n === "openssl.conf" || n === "openssl-ca.cnf" || n === "openssl-server.cnf") return true;
    if (text.includes("[ req ]") && text.includes("distinguished_name") && text.includes("[ CA_default ]")) return true;
    if (text.includes("[req]") && text.includes("distinguished_name") && (text.includes("x509_extensions") || text.includes("[v3_ca]"))) return true;
    if (text.includes("[ v3_ca ]") && text.includes("basicConstraints") && text.includes("CA:true")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/openssl-conf/renderer.js"),
  about: {
    description: "OpenSSL configuration — defines certificate request settings, CA policies, and x509v3 extensions for PKI management.",
    usedFor: [{ label: "OpenSSL", description: "Cryptography library and toolkit for TLS/SSL", href: "https://www.openssl.org/docs/manmaster/man5/config.html" }]
  }
};

// ../../docs/types/text/known/krb5-conf/index.js
var krb5_conf_default = {
  id: "krb5-conf",
  label: "Kerberos Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const text = intake.textSample || intake.text || "";
    if (n === "krb5.conf" || n === "krb5.ini") return true;
    if (text.includes("[libdefaults]") && (text.includes("default_realm") || text.includes("kdc"))) return true;
    if (text.includes("[realms]") && text.includes("kdc") && text.includes("[domain_realm]")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/krb5-conf/renderer.js"),
  about: {
    description: "Kerberos client configuration — defines realms, KDC servers, encryption types, and domain-to-realm mappings for Kerberos authentication.",
    usedFor: [{ label: "MIT Kerberos", description: "Kerberos V5 network authentication protocol implementation", href: "https://web.mit.edu/kerberos/krb5-latest/doc/admin/conf_files/krb5_conf.html" }]
  }
};

// ../../docs/types/text/known/gpg-conf/index.js
var gpg_conf_default = {
  id: "gpg-conf",
  label: "GnuPG Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const text = intake.textSample || intake.text || "";
    if (n === "gpg.conf" || n === "gpg2.conf" || n === "dirmngr.conf" || n === "gpg-agent.conf") return true;
    if ((text.includes("keyserver ") || text.includes("default-key ")) && (text.includes("keyserver-options") || text.includes("use-agent") || text.includes("cert-digest-algo"))) return true;
    if (text.includes("default-key") && text.includes("keyid-format")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/gpg-conf/renderer.js"),
  about: {
    description: "GnuPG configuration — controls key servers, algorithms, display preferences, and default keys for GnuPG operations.",
    usedFor: [{ label: "GnuPG", description: "GNU Privacy Guard — free implementation of the OpenPGP standard", href: "https://www.gnupg.org/documentation/manuals/gnupg/GPG-Configuration-Options.html" }]
  }
};

// ../../docs/types/text/known/gitea-conf/index.js
var gitea_conf_default = {
  id: "gitea-conf",
  label: "Gitea/Forgejo Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const text = intake.textSample || intake.text || "";
    if (n === "app.ini") {
      if (text.includes("[server]") && (text.includes("APP_NAME") || text.includes("ROOT_URL") || text.includes("HTTP_PORT"))) return true;
      if (text.includes("[repository]") && text.includes("[database]") && text.includes("[server]")) return true;
    }
    return false;
  },
  loadRenderer: () => import("../types/text/known/gitea-conf/renderer.js"),
  about: {
    description: "Gitea/Forgejo self-hosted Git service configuration — controls server settings, database, repositories, authentication, and mail.",
    usedFor: [
      { label: "Gitea", description: "Lightweight self-hosted Git service", href: "https://docs.gitea.io/en-us/config-cheat-sheet/" },
      { label: "Forgejo", description: "Community-driven Gitea fork", href: "https://forgejo.org/" }
    ]
  }
};

// ../../docs/types/text/known/stunnel-conf/index.js
var stunnel_conf_default = {
  id: "stunnel-conf",
  label: "stunnel Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const text = intake.textSample || intake.text || "";
    if (n === "stunnel.conf" || n === "stunnel.cfg" || n.endsWith(".stunnel")) return true;
    if (text.includes("[") && text.includes("accept") && text.includes("connect") && (text.includes("cert") || text.includes("key") || text.includes("client"))) {
      if (text.includes("sslVersion") || text.includes("sslversion") || text.includes("ciphers") || text.includes("CAfile") || text.includes("verify")) return true;
    }
    return false;
  },
  loadRenderer: () => import("../types/text/known/stunnel-conf/renderer.js"),
  about: {
    description: "stunnel SSL/TLS tunnel configuration — wraps plain text connections with SSL/TLS encryption for legacy protocols.",
    usedFor: [{ label: "stunnel", description: "Universal TLS/SSL tunneling proxy", href: "https://www.stunnel.org/static/stunnel.html" }]
  }
};

// ../../docs/types/text/known/supervisord-conf/index.js
var supervisord_conf_default = {
  id: "supervisord-conf",
  label: "Supervisord Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const text = intake.textSample || intake.text || "";
    if (n === "supervisord.conf" || n === "supervisor.conf") return true;
    if (n.endsWith(".conf") && text.includes("[supervisord]")) return true;
    if (n.endsWith(".conf") && text.includes("[program:")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/supervisord-conf/renderer.js"),
  about: {
    description: "Supervisor process manager configuration — defines programs, groups, and the supervisord daemon settings.",
    usedFor: [{ label: "Supervisor", description: "A process control system for Unix", href: "http://supervisord.org/configuration.html" }]
  }
};

// ../../docs/types/text/known/logrotate-conf/index.js
var logrotate_conf_default = {
  id: "logrotate-conf",
  label: "Logrotate Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const text = intake.textSample || intake.text || "";
    if (n === "logrotate.conf") return true;
    if ((n.endsWith(".conf") || !n.includes(".")) && (text.includes("rotate ") || text.includes("compress") || text.includes("postrotate")) && text.includes("{")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/logrotate-conf/renderer.js"),
  about: {
    description: "Logrotate configuration — controls automatic rotation, compression, and archival of log files.",
    usedFor: [{ label: "logrotate", description: "System utility for automatic log file management", href: "https://linux.die.net/man/8/logrotate" }]
  }
};

// ../../docs/types/text/known/tlp-conf/index.js
var tlp_conf_default = {
  id: "tlp-conf",
  label: "TLP Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "tlp.conf") return true;
    const text = intake.textSample || intake.text || "";
    if (text.includes("CPU_SCALING_GOVERNOR_ON_AC") || text.includes("CPU_SCALING_GOVERNOR_ON_BAT")) return true;
    if (text.includes("TLP_ENABLE") && text.includes("CPU_ENERGY_PERF_POLICY")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/tlp-conf/renderer.js"),
  about: {
    description: "TLP Linux Advanced Power Management configuration — CPU, battery, disk, and PCI settings.",
    tags: ["tlp", "power", "laptop", "linux", "config"]
  }
};

// ../../docs/types/text/known/shell-rc/index.js
var shell_rc_default = {
  id: "shell-rc",
  label: "Shell config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return [".bashrc", ".zshrc", ".bash_profile", ".bash_aliases", ".profile", ".zprofile", ".zshenv", ".kshrc", ".tcshrc"].includes(n);
  },
  loadRenderer: () => import("../types/text/known/shell-rc/renderer.js"),
  about: {
    description: "Shell configuration file — aliases, functions, exports, and PATH modifications for interactive shell sessions.",
    usedFor: [{ label: "Shell config", description: "Bash/Zsh/Ksh/Tcsh configuration", href: "https://www.gnu.org/software/bash/manual/bash.html" }]
  }
};

// ../../docs/types/text/known/nix-daemon-conf/index.js
var plugin59 = {
  id: "nix-daemon-conf",
  label: "Nix config",
  tags: ["nix", "nixos", "package-manager"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n !== "nix.conf") return false;
    const t = intake.text || "";
    return t.includes("substituters") || t.includes("trusted-users") || t.includes("experimental-features") || t.includes("max-jobs");
  },
  loadRenderer: () => import("../types/text/known/nix-daemon-conf/renderer.js"),
  about: {
    description: "Nix daemon configuration — controls binary caches, trusted users, experimental features, build concurrency, and sandboxing.",
    usedFor: [
      { label: "nix.conf", description: "System-wide Nix daemon settings at /etc/nix/nix.conf or per-user at ~/.config/nix/nix.conf.", href: "https://nixos.org/manual/nix/stable/command-ref/conf-file" }
    ]
  }
};
var nix_daemon_conf_default = plugin59;

// ../../docs/types/text/known/nix-config/index.js
var nix_config_default = {
  id: "nix-config",
  label: "Nix config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return ["flake.nix", "shell.nix", "default.nix", "configuration.nix", "home.nix"].includes(n);
  },
  loadRenderer: () => import("../types/text/known/nix-config/renderer.js"),
  about: {
    description: "Nix configuration file — package definitions, flake inputs/outputs, development shells, or NixOS system configuration."
  }
};

// ../../docs/types/text/known/nix-flake/index.js
var nix_flake_default = {
  id: "nix-flake",
  label: "Nix Flake",
  tags: ["nix", "nixos", "flake", "package-manager", "reproducible"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (name !== "flake.nix") return false;
    const text = (intake.textSample || intake.text || "").slice(0, 2e3);
    return text.includes("outputs =") || text.includes("inputs.") || text.includes("nixpkgs");
  },
  loadRenderer: () => import("../types/text/known/nix-flake/renderer.js"),
  about: {
    description: "Nix flake — reproducible, composable Nix configuration with pinned inputs and declared outputs.",
    usedFor: [{ label: "Nix flakes", description: "Nix flake reference documentation", href: "https://nix.dev/concepts/flakes" }]
  }
};

// ../../docs/types/text/xml/known/maven-settings/index.js
var maven_settings_default = {
  id: "maven-settings",
  label: "Maven settings",
  match(intake, baseType) {
    if (baseType?.id !== "xml") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n !== "settings.xml") return false;
    const text = intake.text || "";
    return text.includes("<settings") && text.includes("maven");
  },
  loadRenderer: () => import("../types/text/xml/known/maven-settings/renderer.js"),
  about: {
    description: "Maven global/user settings — repository mirrors, proxy configuration, server credentials, and active profiles."
  }
};

// ../../docs/types/text/known/pg-hba/index.js
var pg_hba_default = {
  id: "pg-hba",
  label: "PostgreSQL pg_hba",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "pg_hba.conf";
  },
  loadRenderer: () => import("../types/text/known/pg-hba/renderer.js"),
  about: {
    description: "PostgreSQL host-based authentication — defines which database users can connect to which databases from which hosts."
  }
};

// ../../docs/types/text/yaml/known/dvc-pipeline/index.js
var dvc_pipeline_default = {
  id: "dvc-pipeline",
  label: "DVC Pipeline",
  match(intake, baseType) {
    if (!baseType || baseType.id !== "yaml") return false;
    const name = (intake.filename || intake.name || "").split("/").pop().toLowerCase();
    const text = intake.textSample || intake.text || "";
    return name === "dvc.yaml" && text.includes("stages:");
  },
  loadRenderer: () => import("../types/text/yaml/known/dvc-pipeline/renderer.js"),
  about: {
    description: "DVC pipeline definition — declares stages with commands, dependencies, outputs, and parameters for reproducible ML pipelines.",
    usedFor: [{ label: "DVC", description: "Data Version Control — ML pipeline orchestration and data management", href: "https://dvc.org/doc/user-guide/project-structure/dvcyaml-files" }]
  }
};

// ../../docs/types/text/yaml/known/hydra-config/index.js
var hydra_config_default = {
  id: "hydra-config",
  label: "Hydra Config",
  match(intake, baseType) {
    if (!baseType || baseType.id !== "yaml") return false;
    const text = intake.textSample || intake.text || "";
    if (text.includes("_target_:")) return true;
    if (text.includes("defaults:") && text.includes("_self_")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/yaml/known/hydra-config/renderer.js"),
  about: {
    description: "Hydra configuration file — uses defaults lists, config groups, and _target_ for dynamic object instantiation in ML experiments.",
    usedFor: [{ label: "Hydra", description: "Framework for elegantly configuring complex applications", href: "https://hydra.cc/docs/intro/" }]
  }
};

// ../../docs/types/text/yaml/known/mlflow-project/index.js
var mlflow_project_default = {
  id: "mlflow-project",
  label: "MLflow Project",
  match(intake, baseType) {
    if (!baseType || baseType.id !== "yaml") return false;
    const name = (intake.filename || intake.name || "").split("/").pop().toLowerCase();
    const text = intake.textSample || intake.text || "";
    const isMLproject = name === "mlproject" || name === "mlflow.yaml";
    const hasEntryPoints = text.includes("entry_points:");
    const hasEnv = text.includes("conda_env:") || text.includes("python_env:");
    return isMLproject || hasEntryPoints && hasEnv;
  },
  loadRenderer: () => import("../types/text/yaml/known/mlflow-project/renderer.js"),
  about: {
    description: "MLflow project definition — specifies the project name, environment, and entry points for packaging and running ML code.",
    usedFor: [{ label: "MLflow", description: "Open-source platform for the ML lifecycle", href: "https://mlflow.org/docs/latest/projects.html" }]
  }
};

// ../../docs/types/text/yaml/known/meltano-config/index.js
var plugin60 = {
  id: "meltano-config",
  label: "Meltano Config",
  tags: ["elt", "data"],
  match(intake, baseType) {
    if (!baseType || baseType.id !== "yaml") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "meltano.yml" || n === "meltano.yaml";
  },
  loadRenderer: () => import("../types/text/yaml/known/meltano-config/renderer.js"),
  about: {
    description: "Meltano ELT platform configuration — defines the project name, environments, plugin definitions (extractors, loaders, transforms, orchestrators), schedules, and jobs.",
    usedFor: [{ label: "Meltano", description: "Open-source ELT platform for data integration and transformation", href: "https://docs.meltano.com/concepts/project" }]
  }
};
var meltano_config_default = plugin60;

// ../../docs/types/text/yaml/known/dagster-config/index.js
var plugin61 = {
  id: "dagster-config",
  label: "Dagster Config",
  tags: ["orchestration", "data"],
  match(intake, baseType) {
    if (!baseType || baseType.id !== "yaml") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "dagster.yaml") return true;
    if (n === "workspace.yaml") {
      const text = intake.textSample || intake.text || "";
      return text.includes("load_from:");
    }
    return false;
  },
  loadRenderer: () => import("../types/text/yaml/known/dagster-config/renderer.js"),
  about: {
    description: "Dagster data orchestration configuration — dagster.yaml configures storage, logging, and compute backends; workspace.yaml defines code locations (python packages, files, or gRPC servers).",
    usedFor: [{ label: "Dagster", description: "Open-source data orchestration platform", href: "https://docs.dagster.io/deployment/dagster-instance" }]
  }
};
var dagster_config_default = plugin61;

// ../../docs/types/text/ini/known/wandb-config/index.js
var wandb_config_default = {
  id: "wandb-config",
  label: "W&B Config",
  match(intake) {
    const fullPath = intake.filename || intake.name || "";
    const name = fullPath.split("/").pop().toLowerCase();
    const text = intake.textSample || intake.text || "";
    const isWandbDir = name === "settings" && (fullPath.includes(".wandb/") || fullPath.includes("wandb/"));
    const isWandbNamed = name === "wandb-settings" || name === "wandb_settings";
    const hasWandbContent = text.includes("api.wandb.ai") || text.includes("wandb.ai") || text.includes("entity") && text.includes("project") && (text.includes("base_url") || text.includes("run_mode"));
    return isWandbDir || isWandbNamed || hasWandbContent;
  },
  loadRenderer: () => import("../types/text/ini/known/wandb-config/renderer.js"),
  about: {
    description: "Weights & Biases settings file — stores entity, project, run mode, API base URL, and other W&B client configuration.",
    usedFor: [{ label: "W&B", description: "Weights & Biases — ML experiment tracking and collaboration", href: "https://docs.wandb.ai/ref/python/init" }]
  }
};

// ../../docs/types/text/json/known/mintlify/index.js
var plugin62 = {
  id: "mintlify",
  label: "Mintlify docs",
  tags: ["documentation", "mintlify", "docs"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "mint.json";
  },
  loadRenderer: () => import("../types/text/json/known/mintlify/renderer.js"),
  about: {
    description: "Mintlify documentation platform configuration — defines branding, navigation, API settings, and integrations for a Mintlify-powered docs site.",
    usedFor: [{ label: "Mintlify", description: "Beautiful documentation, built to convert", href: "https://mintlify.com/docs/quickstart" }]
  }
};
var mintlify_default = plugin62;

// ../../docs/types/text/json/known/postman-collection/index.js
var postman_collection_default = {
  id: "postman-collection",
  label: "Postman Collection",
  match(intake, baseType) {
    if (!baseType || baseType.id !== "json") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n.endsWith(".postman_collection.json")) return true;
    const text = intake.text || intake.textSample || "";
    if (/"_postman_id"/.test(text) && /"item"\s*:/.test(text)) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/json/known/postman-collection/renderer.js"),
  about: {
    description: "Postman collection — a group of API requests with environments, pre-request scripts, and test assertions.",
    usedFor: [{ label: "Postman", description: "API platform for building and using APIs", href: "https://learning.postman.com/docs/collections/collections-overview/" }]
  }
};

// ../../docs/types/text/json/known/har/index.js
var har_default = {
  id: "har",
  label: "HTTP Archive (HAR)",
  match(intake, baseType) {
    if (!baseType || baseType.id !== "json") return false;
    const obj = intake.parsed ?? null;
    if (obj && obj.log && Array.isArray(obj.log.entries)) return true;
    const t = intake.textSample || intake.text || "";
    if (t.includes('"log"') && t.includes('"entries"')) {
      try {
        const parsed = JSON.parse(intake.text || "{}");
        return !!(parsed.log && Array.isArray(parsed.log.entries));
      } catch {
        return false;
      }
    }
    return false;
  },
  loadRenderer: () => import("../types/text/json/known/har/renderer.js"),
  about: {
    description: "Browser network traffic capture — all HTTP requests, timings, headers, and response sizes from a page load or session.",
    usedFor: [
      { label: "Chrome DevTools", description: "Export from Network tab → Save all as HAR with content", href: "https://developer.chrome.com/docs/devtools/network/reference/" },
      { label: "Firefox DevTools", description: "Network tab → Save All As HAR", href: "https://firefox-source-docs.mozilla.org/devtools-user/network_monitor/" }
    ]
  }
};

// ../../docs/types/text/json/known/avro-schema/index.js
var avro_schema_default = {
  id: "avro-schema",
  label: "Avro Schema",
  tags: ["avro", "schema", "data"],
  match(intake, baseType) {
    if (!baseType || baseType.id !== "json") return false;
    const filename = (intake.name || intake.filename || "").toLowerCase();
    if (filename.endsWith(".avsc")) return true;
    const t = intake.textSample || intake.text || "";
    if (t.includes('"type"') && t.includes('"record"') && t.includes('"fields"')) {
      try {
        const obj = intake.parsed ?? JSON.parse(intake.text || "{}");
        const root = Array.isArray(obj) ? obj[0] : obj;
        return root && root.type === "record" && Array.isArray(root.fields) && typeof root.namespace === "string";
      } catch {
        return false;
      }
    }
    return false;
  },
  loadRenderer: () => import("../types/text/json/known/avro-schema/renderer.js"),
  about: {
    description: "Apache Avro schema definition — describes record types, field names, types, defaults, and documentation for data serialization.",
    usedFor: [
      { label: "Apache Avro", description: "Data serialization framework with rich data structures and schema evolution", href: "https://avro.apache.org/docs/current/spec.html" },
      { label: ".avsc files", description: "Avro schema files used in Kafka, Spark, and data pipelines", href: "https://avro.apache.org/docs/current/spec.html#schemas" }
    ]
  }
};

// ../../docs/types/text/json/known/bruno/index.js
var plugin63 = {
  id: "bruno",
  label: "Bruno workspace",
  tags: ["api", "rest", "bruno", "testing"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "bruno.json";
  },
  loadRenderer: () => import("../types/text/json/known/bruno/renderer.js"),
  about: {
    description: "Bruno workspace configuration — collection metadata, ignore patterns, proxy, global headers, and scripting.",
    usedFor: [{ label: "Bruno", description: "Open-source IDE for exploring and testing APIs.", href: "https://www.usebruno.com/docs/" }]
  }
};
var bruno_default = plugin63;

// ../../docs/types/text/yaml/known/insomnia/index.js
var plugin64 = {
  id: "insomnia",
  label: "Insomnia workspace",
  tags: ["api", "rest", "insomnia", "testing"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "insomnia.yaml" || n === "insomnia.yml" || n === ".insomnia.yaml") return true;
    const t = intake.text || "";
    return /^type:\s*(Collection|Workspace|Request|Environment)/m.test(t) && /^name:/m.test(t);
  },
  loadRenderer: () => import("../types/text/yaml/known/insomnia/renderer.js"),
  about: {
    description: "Insomnia REST API client workspace or collection export — defines API requests, folders, environments, and authentication in YAML format.",
    usedFor: [{ label: "Insomnia", description: "The collaborative API client and design tool", href: "https://docs.insomnia.rest/" }]
  }
};
var insomnia_default = plugin64;

// ../../docs/types/text/yaml/known/openapi-generator/index.js
var plugin65 = {
  id: "openapi-generator",
  label: "OpenAPI Generator config",
  tags: ["openapi", "codegen", "sdk", "api"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "openapi-generator-config.yaml" || n === "openapi-generator-config.yml" || n === "openapi-generator.yaml" || n === ".openapi-generator-ignore" || n === "generator-config.yaml";
  },
  loadRenderer: () => import("../types/text/yaml/known/openapi-generator/renderer.js"),
  about: {
    description: "OpenAPI Generator CLI configuration — specifies the generator (language/framework), input spec, output directory, and code generation options such as package names, model property naming, and language-specific properties.",
    usedFor: [
      { label: "OpenAPI Generator", description: "Generate client SDKs, server stubs, and documentation from OpenAPI specifications.", href: "https://openapi-generator.tech" }
    ]
  }
};
var openapi_generator_default = plugin65;

// ../../docs/types/text/known/graphql-schema/index.js
var graphql_schema_default = {
  id: "graphql-schema",
  label: "GraphQL Schema",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const text = intake.textSample || intake.text || "";
    if (n.endsWith(".graphql") || n.endsWith(".gql")) return true;
    if (n === "schema.graphql" || n === "schema.gql") return true;
    if (text.includes("type Query") || text.includes("type Mutation") || text.includes("type Subscription")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/graphql-schema/renderer.js"),
  about: {
    description: "GraphQL schema definition — declares types, queries, mutations, and subscriptions for a GraphQL API.",
    usedFor: [{ label: "GraphQL", description: "A query language for APIs", href: "https://graphql.org/learn/schema/" }]
  }
};

// ../../docs/types/text/known/fstab/index.js
var fstab_default = {
  id: "fstab",
  label: "fstab",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const text = intake.textSample || intake.text || "";
    if (n === "fstab") return true;
    if (/\.(eps|ps|log|md|txt|yaml|yml|json|xml|html|css|js|ts|py|rb|sh)$/.test(n)) return false;
    const fstabDevice = /^(\/dev\/|UUID=|LABEL=|PARTUUID=|tmpfs$|proc$|sysfs$|devpts$|none$|overlay$|nfs|cifs|\/\/)/i;
    const nonCommentLines = text.split("\n").filter((l) => l.trim() && !l.trim().startsWith("#"));
    const looksLikeFstab = nonCommentLines.filter((l) => {
      const parts = l.trim().split(/\s+/);
      return parts.length >= 4 && fstabDevice.test(parts[0]) && parts[1].startsWith("/");
    }).length;
    return looksLikeFstab >= 2;
  },
  loadRenderer: () => import("../types/text/known/fstab/renderer.js"),
  about: {
    description: "Linux filesystem table — defines how disk partitions, devices, and remote file systems should be mounted.",
    usedFor: [{ label: "fstab", description: "Linux file system mount configuration", href: "https://man7.org/linux/man-pages/man5/fstab.5.html" }]
  }
};

// ../../docs/types/text/known/crypttab/index.js
var crypttab_default = {
  id: "crypttab",
  label: "crypttab",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const text = intake.textSample || intake.text || "";
    if (n === "crypttab") return true;
    if (text.includes("luks") && text.includes("UUID=")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/crypttab/renderer.js"),
  about: {
    description: "Linux encrypted device table — maps encrypted block devices (LUKS) to their unlock targets.",
    usedFor: [{ label: "crypttab", description: "Linux disk encryption configuration", href: "https://www.freedesktop.org/software/systemd/man/crypttab.html" }]
  }
};

// ../../docs/types/text/known/sysctl-conf/index.js
var sysctl_conf_default = {
  id: "sysctl-conf",
  label: "sysctl Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const text = intake.textSample || intake.text || "";
    if (n === "sysctl.conf" || n === "sysctl.d" || n.endsWith(".conf") && n.includes("sysctl")) return true;
    if (text.match(/^(net\.|vm\.|kernel\.|fs\.|dev\.)\S+\s*=/m)) return true;
    if (text.includes("net.ipv4.ip_forward") || text.includes("vm.swappiness") || text.includes("kernel.sysrq")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/sysctl-conf/renderer.js"),
  about: {
    description: "sysctl configuration — sets Linux kernel parameters for networking, memory management, security, and system behavior.",
    usedFor: [{ label: "sysctl", description: "Linux kernel parameter runtime configuration", href: "https://www.kernel.org/doc/html/latest/admin-guide/sysctl/" }]
  }
};

// ../../docs/types/text/known/modprobe-conf/index.js
var modprobe_conf_default = {
  id: "modprobe-conf",
  label: "modprobe Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const text = intake.textSample || intake.text || "";
    if (n === "named.conf" || n === "ranger.conf" || n === "wsl.conf") return false;
    if (n === "modprobe.conf" || n === "modules.conf") return true;
    if (n.endsWith(".conf") && text.match(/^(blacklist|options|alias|install|remove)\s+\S/m)) return true;
    if (text.includes("blacklist ") && (text.includes("options ") || text.includes("alias "))) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/modprobe-conf/renderer.js"),
  about: {
    description: "Kernel module configuration — controls which kernel modules are blacklisted, what options they receive, and module aliases.",
    usedFor: [{ label: "modprobe", description: "Linux kernel module loading and configuration", href: "https://linux.die.net/man/5/modprobe.d" }]
  }
};

// ../../docs/types/text/known/systemd-unit/index.js
var systemd_unit_default = {
  id: "systemd-unit",
  label: "systemd Unit",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const text = intake.textSample || intake.text || "";
    if (n.endsWith(".service") || n.endsWith(".timer") || n.endsWith(".socket") || n.endsWith(".mount") || n.endsWith(".target") || n.endsWith(".path") || n.endsWith(".scope") || n.endsWith(".slice")) return true;
    if (text.includes("[Unit]") && (text.includes("[Service]") || text.includes("[Timer]") || text.includes("[Socket]"))) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/systemd-unit/renderer.js"),
  about: {
    description: "systemd unit file — defines a service, timer, socket, or other system unit for the init system.",
    usedFor: [{ label: "systemd", description: "Linux service manager and init system", href: "https://www.freedesktop.org/software/systemd/man/systemd.unit.html" }]
  }
};

// ../../docs/types/text/known/openrc-init/index.js
var openrc_init_default = {
  id: "openrc-init",
  label: "OpenRC Init Script",
  tags: ["openrc", "init", "service", "gentoo", "alpine"],
  match(intake) {
    const fullPath = intake.name || intake.filename || "";
    const n = fullPath.split("/").pop().toLowerCase();
    const text = intake.textSample || intake.text || "";
    if (/\/etc\/init\.d\//.test(fullPath) || /\/etc\/conf\.d\//.test(fullPath)) {
      return text.includes("start()") || text.includes("stop()") || text.includes("depend()") || text.includes(". /etc/rc") || text.includes('. "${RC_LIBEXECDIR}') || text.includes("openrc-run") || text.includes("rc-service");
    }
    if (text.startsWith("#!/sbin/openrc-run") || text.startsWith("#!/usr/sbin/openrc-run")) return true;
    if (text.includes("start()") && text.includes("stop()") && text.includes("depend()") && (text.includes("ebegin") || text.includes("eend") || text.includes("eerror") || text.includes("checkpath"))) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/openrc-init/renderer.js"),
  about: {
    description: "OpenRC init script — defines service start/stop/depend functions for the OpenRC init system used by Gentoo and Alpine Linux.",
    usedFor: [{ label: "OpenRC", description: "Dependency-based init system", href: "https://github.com/OpenRC/openrc" }]
  }
};

// ../../docs/types/text/known/crontab/index.js
var crontab_default = {
  id: "crontab",
  label: "Crontab",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const text = intake.textSample || intake.text || "";
    if (n === "crontab" || n === "cron" || n === "crontabs") return true;
    if (n.startsWith("cron.") || n.endsWith(".cron")) return true;
    if (/\.(log|md|txt|yaml|yml|json|xml|html|css|js|ts|py|rb|sh|conf|cfg|ini)$/.test(n)) return false;
    const cronTimeField = /^(\*(?:\/\d{1,2})?|\d{1,2}(?:[-,]\d{1,2})*(?:\/\d{1,2})?)$/;
    const cronLines = text.split("\n").filter((l) => {
      const t = l.trim();
      if (!t || t.startsWith("#")) return false;
      const parts = t.split(/\s+/);
      if (parts.length < 6) return false;
      return parts.slice(0, 5).every((p) => cronTimeField.test(p));
    });
    return cronLines.length >= 2;
  },
  loadRenderer: () => import("../types/text/known/crontab/renderer.js"),
  about: {
    description: "Crontab schedule file — defines recurring jobs for the cron daemon to run at scheduled times.",
    usedFor: [{ label: "cron", description: "Time-based job scheduler", href: "https://man7.org/linux/man-pages/man5/crontab.5.html" }]
  }
};

// ../../docs/types/text/yaml/known/cluster-config/index.js
var cluster_config_default = {
  id: "cluster-config",
  label: "K8s Cluster Config",
  match(intake, baseType) {
    if (!baseType || baseType.id !== "yaml") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const text = intake.textSample || intake.text || "";
    if (n === "cluster.yaml" || n === "cluster-config.yaml") return true;
    if (text.includes("kind: StorageClass") && text.includes("apiVersion")) return true;
    if (text.includes("kind: PriorityClass") && text.includes("apiVersion")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/yaml/known/cluster-config/renderer.js"),
  about: {
    description: "Kubernetes cluster-level configuration — StorageClass, PriorityClass, and cluster-wide resource policies.",
    usedFor: [{ label: "Kubernetes", description: "Container orchestration cluster config", href: "https://kubernetes.io/docs/concepts/cluster-administration/" }]
  }
};

// ../../docs/types/text/yaml/known/cert-manager/index.js
var cert_manager_default = {
  id: "cert-manager",
  label: "cert-manager",
  match(intake, baseType) {
    if (!baseType || baseType.id !== "yaml") return false;
    const text = intake.textSample || intake.text || "";
    if (text.includes("cert-manager.io/") || text.includes("kind: Certificate") && text.includes("secretName") || text.includes("kind: ClusterIssuer") && text.includes("letsencrypt") || text.includes("kind: Issuer")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/yaml/known/cert-manager/renderer.js"),
  about: {
    description: "cert-manager Certificate resource — defines TLS certificates to be issued and renewed automatically.",
    usedFor: [{ label: "cert-manager", description: "Kubernetes native certificate management", href: "https://cert-manager.io/docs/concepts/" }]
  }
};

// ../../docs/types/text/known/iptables-rules/index.js
var iptables_rules_default = {
  id: "iptables-rules",
  label: "iptables Rules",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const text = intake.textSample || intake.text || "";
    if (n === "iptables.rules" || n === "rules.v4" || n === "rules.v6" || n === "iptables") return true;
    if (text.includes("*filter") && text.includes("-A INPUT") && text.includes("COMMIT")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/iptables-rules/renderer.js"),
  about: {
    description: "iptables firewall rules — packet filter rules saved in iptables-save format.",
    usedFor: [{ label: "iptables", description: "Linux kernel firewall rule management", href: "https://man7.org/linux/man-pages/man8/iptables.8.html" }]
  }
};

// ../../docs/types/text/known/udev-rules/index.js
var udev_rules_default = {
  id: "udev-rules",
  label: "udev Rules",
  tags: ["udev", "linux", "device", "rules", "kernel"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (!n.endsWith(".rules")) return false;
    const t = intake.text || "";
    return /^SUBSYSTEM\b/m.test(t) || /^KERNEL\b/m.test(t) || /^ACTION\b/m.test(t);
  },
  loadRenderer: () => import("../types/text/known/udev-rules/renderer.js"),
  about: {
    description: "Linux udev rules file — device matching rules for permissions, naming, and automation.",
    usedFor: [{ label: "udev", description: "Linux dynamic device management system", href: "https://man7.org/linux/man-pages/man7/udev.7.html" }]
  }
};

// ../../docs/types/text/known/grub-conf/index.js
var grub_conf_default = {
  id: "grub-conf",
  label: "GRUB Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const text = intake.textSample || intake.text || "";
    if (n === "grub" || n === "grub.cfg" || n === "grub2.cfg" || n === "40_custom" || n === "10_linux") return true;
    if (text.includes("GRUB_DEFAULT=") || text.includes("GRUB_TIMEOUT=") || text.includes("GRUB_CMDLINE_LINUX")) return true;
    if (text.includes("menuentry ") && (text.includes("linux ") || text.includes("linuxefi "))) return true;
    if (text.includes("set default=") && text.includes("set timeout=") && text.includes("menuentry")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/grub-conf/renderer.js"),
  about: {
    description: "GRUB bootloader configuration — controls boot menu entries, kernel parameters, timeout, and EFI/BIOS boot settings.",
    usedFor: [{ label: "GRUB2", description: "GNU GRand Unified Bootloader v2 — standard bootloader for most Linux systems", href: "https://www.gnu.org/software/grub/manual/grub/grub.html" }]
  }
};

// ../../docs/types/text/known/nftables-rules/index.js
var nftables_rules_default = {
  id: "nftables-rules",
  label: "nftables Rules",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const text = intake.textSample || intake.text || "";
    if (n === "nftables.conf" || n === "nftables.rules" || n.endsWith(".nft")) return true;
    if (text.includes("table ") && text.includes("chain ") && (text.includes("type filter") || text.includes("type nat"))) return true;
    if ((text.includes("nft ") || text.includes("#!/usr/sbin/nft")) && text.includes("table")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/nftables-rules/renderer.js"),
  about: {
    description: "nftables firewall rules — the modern Linux packet filtering framework replacing iptables with a unified syntax for filter, NAT, and mangle operations.",
    usedFor: [{ label: "nftables", description: "Linux kernel packet classification framework replacing iptables/ip6tables/ebtables", href: "https://nftables.org/projects/nftables/index.html" }]
  }
};

// ../../docs/types/text/known/ufw-conf/index.js
var ufw_conf_default = {
  id: "ufw-conf",
  label: "UFW Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const text = intake.textSample || intake.text || "";
    if (n === "ufw.conf" || n === "before.rules" || n === "before6.rules" || n === "after.rules") {
      if (text.includes("DEFAULT_INPUT_POLICY") || text.includes("ufw") || text.includes("*filter")) return true;
    }
    if (n === "user.rules" && text.includes("### tuple ###")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/ufw-conf/renderer.js"),
  about: {
    description: "UFW (Uncomplicated Firewall) configuration — manages iptables rules through a simplified interface.",
    usedFor: [{ label: "UFW", description: "Ubuntu Uncomplicated Firewall", href: "https://help.ubuntu.com/community/UFW" }]
  }
};

// ../../docs/types/text/known/fail2ban-conf/index.js
var fail2ban_conf_default = {
  id: "fail2ban-conf",
  label: "Fail2ban Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const text = intake.textSample || intake.text || "";
    if (n === "jail.conf" || n === "jail.local" || n === "fail2ban.conf") return true;
    if (text.includes("[DEFAULT]") && text.includes("bantime") && text.includes("maxretry")) return true;
    if (text.includes("[sshd]") && text.includes("bantime")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/fail2ban-conf/renderer.js"),
  about: {
    description: "Fail2ban jail configuration — defines ban rules, detection filters, and action backends for intrusion prevention.",
    usedFor: [{ label: "Fail2ban", description: "Intrusion prevention software for Linux", href: "https://www.fail2ban.org/wiki/index.php/MANUAL_0_8" }]
  }
};

// ../../docs/types/text/known/apparmor-profile/index.js
var apparmor_profile_default = {
  id: "apparmor-profile",
  label: "AppArmor Profile",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const text = intake.textSample || intake.text || "";
    if (n.startsWith("usr.bin.") || n.startsWith("usr.sbin.") || n.startsWith("usr.lib.")) return true;
    if (text.includes("#include <tunables/global>") || text.includes("#include<tunables/global>")) return true;
    if (text.includes("profile ") && (text.includes("flags=(complain)") || text.includes("flags=(enforce)"))) return true;
    if (text.match(/^\/[a-z].*\{$/m) && (text.includes("capability") || text.includes("network") || text.includes("#include"))) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/apparmor-profile/renderer.js"),
  about: {
    description: "AppArmor security profile — defines mandatory access control rules restricting file access, capabilities, and network permissions for a program.",
    usedFor: [{ label: "AppArmor", description: "Linux kernel security module for mandatory access control", href: "https://apparmor.net/" }]
  }
};

// ../../docs/types/text/known/smb-conf/index.js
var smb_conf_default = {
  id: "smb-conf",
  label: "Samba Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const text = intake.textSample || intake.text || "";
    if (n === "smb.conf" || n === "samba.conf") return true;
    if (text.includes("[global]") && (text.includes("workgroup") || text.includes("netbios name"))) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/smb-conf/renderer.js"),
  about: {
    description: "Samba configuration file — defines Windows-compatible file sharing, authentication, and network browser settings.",
    usedFor: [{ label: "Samba", description: "SMB/CIFS file sharing for Linux", href: "https://www.samba.org/samba/docs/current/man-html/smb.conf.5.html" }]
  }
};

// ../../docs/types/text/known/corefile/index.js
var corefile_default = {
  id: "corefile",
  label: "Corefile",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const text = intake.textSample || intake.text || "";
    if (n === "corefile") return true;
    if (n === "named.conf" || n.startsWith("named.conf.")) return false;
    if (text.includes("forward") && (text.includes("cache") || text.includes("health")) && text.includes("{")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/corefile/renderer.js"),
  about: {
    description: "CoreDNS Corefile — defines DNS server zones, forwarders, plugins, and health endpoints.",
    usedFor: [{ label: "CoreDNS", description: "DNS server used in Kubernetes and beyond", href: "https://coredns.io/manual/toc/" }]
  }
};

// ../../docs/types/text/known/containerd-config/index.js
var containerd_config_default = {
  id: "containerd-config",
  label: "containerd Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const text = intake.textSample || intake.text || "";
    if (n === "config.toml" && (text.includes('[plugins."io.containerd') || text.includes("containerd"))) return true;
    if (n === "containerd.toml") return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/containerd-config/renderer.js"),
  about: {
    description: "containerd configuration — container runtime settings, snapshotter, CRI plugin, and registry mirrors.",
    usedFor: [{ label: "containerd", description: "Industry-standard container runtime", href: "https://github.com/containerd/containerd/blob/main/docs/man/containerd-config.toml.5.md" }]
  }
};

// ../../docs/types/text/known/bind-zone/index.js
var bind_zone_default = {
  id: "bind-zone",
  label: "DNS Zone File",
  tags: ["dns", "zone", "bind", "config"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const text = (intake.textSample || intake.text || "").slice(0, 2e3);
    if (n.endsWith(".zone") || n.endsWith(".db") || n.startsWith("db.")) {
      if (/\bSOA\b/.test(text) || /\bIN\s+NS\b/.test(text) || /\bIN\tNS\b/.test(text)) return true;
      if (n.endsWith(".zone")) return true;
    }
    if (text.includes("IN SOA") || text.includes("	SOA	") || /^\s*@\s+IN\s+SOA/.test(text)) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/bind-zone/renderer.js"),
  about: {
    description: "DNS zone file — defines resource records (SOA, NS, A, MX, TXT, CNAME, SRV) for a DNS zone managed by BIND or compatible nameservers.",
    usedFor: [{ label: "BIND DNS zone", description: "Zone data file containing DNS resource records for a domain", href: "https://www.isc.org/bind/" }]
  }
};

// ../../docs/types/text/known/postfix-main/index.js
var postfix_main_default = {
  id: "postfix-main",
  label: "Postfix Main",
  tags: ["postfix", "mail", "smtp", "config"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const text = (intake.textSample || intake.text || "").slice(0, 1e3);
    if (n === "main.cf" || n === "master.cf") return true;
    if (n.startsWith("postfix-") && n.endsWith(".cf")) return true;
    if (n.endsWith(".cf") && /smtpd_|smtp_|postfix/i.test(text)) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/postfix-main/renderer.js"),
  about: {
    description: "Postfix mail server configuration — main.cf defines hostname, TLS settings, relay configuration, and restriction lists; master.cf defines service processes.",
    usedFor: [{ label: "Postfix", description: "Free open-source mail transfer agent (MTA)", href: "https://www.postfix.org/postconf.5.html" }]
  }
};

// ../../docs/types/text/known/postfix-conf/index.js
var postfix_conf_default = {
  id: "postfix-conf",
  label: "Postfix Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const text = intake.textSample || intake.text || "";
    if (n === "main.cf" && text.includes("myhostname")) return true;
    if (n === "master.cf" && text.includes("smtp") && text.includes("pickup")) return true;
    if (n === "postfix.conf" || n === "postfix-main.cf") return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/postfix-conf/renderer.js"),
  about: {
    description: "Postfix mail server configuration — defines hostname, network settings, TLS, and SASL authentication.",
    usedFor: [{ label: "Postfix", description: "Free open-source mail transfer agent", href: "https://www.postfix.org/postconf.5.html" }]
  }
};

// ../../docs/types/text/known/dovecot-conf/index.js
var dovecot_conf_default = {
  id: "dovecot-conf",
  label: "Dovecot Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const text = intake.textSample || intake.text || "";
    if (n === "dovecot.conf" || n === "10-auth.conf" || n === "10-mail.conf" || n === "10-ssl.conf" || n === "10-master.conf") return true;
    if (text.includes("mail_location") && (text.includes("imap") || text.includes("pop3") || text.includes("auth_mechanisms"))) return true;
    if (text.includes("protocols") && (text.includes("imap") || text.includes("pop3")) && text.includes("ssl")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/dovecot-conf/renderer.js"),
  about: {
    description: "Dovecot IMAP/POP3 server configuration — controls email retrieval protocols, authentication, TLS, and mailbox storage.",
    usedFor: [{ label: "Dovecot", description: "Secure and highly configurable IMAP and POP3 server", href: "https://www.dovecot.org/" }]
  }
};

// ../../docs/types/text/known/nagios-conf/index.js
var nagios_conf_default = {
  id: "nagios-conf",
  label: "Nagios Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "nagios.cfg" || n === "nagios-server.cfg";
  },
  loadRenderer: () => import("../types/text/known/nagios-conf/renderer.js"),
  about: {
    description: "Nagios monitoring server configuration — defines log paths, check timeouts, notification settings, and external command handling.",
    usedFor: [{ label: "Nagios", description: "Open-source IT infrastructure monitoring system.", href: "https://assets.nagios.com/downloads/nagioscore/docs/nagioscore/4/en/configmain.html" }]
  }
};

// ../../docs/types/text/known/zabbix-conf/index.js
var zabbix_conf_default = {
  id: "zabbix-conf",
  label: "Zabbix Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "zabbix_agentd.conf" || n === "zabbix_agent2.conf" || n === "zabbix_server.conf" || n === "zabbix_proxy.conf";
  },
  loadRenderer: () => import("../types/text/known/zabbix-conf/renderer.js"),
  about: {
    description: "Zabbix monitoring agent/server/proxy configuration — controls server addresses, monitoring targets, TLS, and remote command settings.",
    usedFor: [{ label: "Zabbix", description: "Enterprise-class open source distributed monitoring solution", href: "https://www.zabbix.com/documentation/current/en/manual/config/items/itemtypes/zabbix_agent" }]
  }
};

// ../../docs/types/text/known/exim-conf/index.js
var exim_conf_default = {
  id: "exim-conf",
  label: "Exim Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const text = intake.textSample || intake.text || "";
    if (n === "exim4.conf" || n === "exim.conf" || n === "configure" || n === "update-exim4.conf.conf") return true;
    if (text.includes("begin routers") && text.includes("begin transports")) return true;
    if (text.includes("primary_hostname") && text.includes("domainlist") && text.includes("begin acl")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/exim-conf/renderer.js"),
  about: {
    description: "Exim MTA configuration — controls mail routing, transport, access control, and TLS for the Exim mail transfer agent.",
    usedFor: [{ label: "Exim", description: "Message transfer agent widely used on Unix systems", href: "https://www.exim.org/exim-html-current/doc/html/spec_html/" }]
  }
};

// ../../docs/types/text/known/chrony-conf/index.js
var chrony_conf_default = {
  id: "chrony-conf",
  label: "Chrony Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const text = intake.textSample || intake.text || "";
    if (n === "chrony.conf" || n === "chronyc.conf") return true;
    if (text.includes("server ") && text.includes("iburst") && text.includes("makestep")) return true;
    if (text.includes("pool ") && text.includes("iburst") && (text.includes("driftfile") || text.includes("rtcsync"))) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/chrony-conf/renderer.js"),
  about: {
    description: "Chrony NTP configuration — configures time servers, drift correction, and hardware clock synchronization.",
    usedFor: [{ label: "chrony", description: "Versatile NTP client and server", href: "https://chrony-project.org/doc/4.3/chrony.conf.html" }]
  }
};

// ../../docs/types/text/known/named-conf/index.js
var named_conf_default = {
  id: "named-conf",
  label: "BIND DNS Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const text = intake.textSample || intake.text || "";
    if (n === "named.conf" || n === "named.conf.local" || n === "named.conf.options" || n === "named.conf.default-zones") return true;
    if (text.includes("options {") && text.includes("directory") && text.includes("listen-on")) return true;
    if (text.includes('zone "') && (text.includes("type master") || text.includes("type primary") || text.includes("type slave") || text.includes("type secondary"))) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/named-conf/renderer.js"),
  about: {
    description: "BIND DNS server configuration — defines zones, options, and ACLs for the Berkeley Internet Name Domain server.",
    usedFor: [{ label: "BIND9", description: "Berkeley Internet Name Domain — most common DNS server software", href: "https://www.isc.org/bind/" }]
  }
};

// ../../docs/types/text/known/unbound-conf/index.js
var plugin66 = {
  id: "unbound-conf",
  label: "Unbound DNS",
  tags: ["dns", "unbound", "resolver", "networking"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "unbound.conf") return true;
    const t = intake.textSample || intake.text || "";
    return /^server:\s*$/m.test(t) && /^\s+(verbosity|interface|access-control|root-hints):/m.test(t);
  },
  loadRenderer: () => import("../types/text/known/unbound-conf/renderer.js"),
  about: {
    description: "Unbound DNS resolver configuration — defines server settings, access controls, forwarders, and DNSSEC validation for the NLnet Labs Unbound resolver.",
    usedFor: [{ label: "Unbound", description: "NLnet Labs validating, recursive, caching DNS resolver", href: "https://nlnetlabs.nl/projects/unbound/about/" }]
  }
};
var unbound_conf_default = plugin66;

// ../../docs/types/text/known/pihole-setupvars/index.js
var pihole_setupvars_default = {
  id: "pihole-setupvars",
  label: "Pi-hole Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop();
    const nl = n.toLowerCase();
    if (nl === "pihole-ftl.conf") return true;
    if (nl.endsWith("setupvars.conf")) {
      const text = intake.text || "";
      return text.includes("PIHOLE_INTERFACE=") || text.includes("PIHOLE_DNS_1=");
    }
    return false;
  },
  loadRenderer: () => import("../types/text/known/pihole-setupvars/renderer.js"),
  about: {
    description: "Pi-hole DNS ad-blocker configuration — network interface, upstream DNS servers, blocking status, and DNSSEC settings.",
    usedFor: [{ label: "Pi-hole", description: "Pi-hole DNS-level ad blocker configuration file", href: "https://docs.pi-hole.net/" }]
  }
};

// ../../docs/types/text/known/dhcpd-conf/index.js
var dhcpd_conf_default = {
  id: "dhcpd-conf",
  label: "DHCP Server Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const text = intake.textSample || intake.text || "";
    if (n === "dhcpd.conf" || n === "dhcp.conf") return true;
    if (text.includes("subnet") && text.includes("netmask") && (text.includes("range") || text.includes("default-lease-time"))) return true;
    if (text.includes("ddns-update-style") && text.includes("subnet")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/dhcpd-conf/renderer.js"),
  about: {
    description: "ISC DHCP server configuration — defines IP address pools, lease times, and host reservations for a DHCP server.",
    usedFor: [{ label: "ISC DHCP", description: "Internet Systems Consortium DHCP Server", href: "https://www.isc.org/dhcp/" }]
  }
};

// ../../docs/types/text/known/netdata-conf/index.js
var netdata_conf_default = {
  id: "netdata-conf",
  label: "Netdata Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const text = intake.textSample || intake.text || "";
    if (n === "netdata.conf") return true;
    if (text.includes("[global]") && text.includes("memory mode") && (text.includes("history") || text.includes("update every"))) return true;
    if (text.includes("[health]") && text.includes("[backend]") && text.includes("[plugins]")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/netdata-conf/renderer.js"),
  about: {
    description: "Netdata monitoring configuration — controls data collection intervals, retention, health checks, and streaming/export settings.",
    usedFor: [{ label: "Netdata", description: "Real-time infrastructure monitoring with thousands of built-in metrics", href: "https://www.netdata.cloud/" }]
  }
};

// ../../docs/types/text/known/yarnrc/index.js
var yarnrc_default = {
  id: "yarnrc",
  label: "Yarn Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const text = intake.textSample || intake.text || "";
    if (n === ".yarnrc" || n === ".yarnrc.yml" || n === ".yarnrc.yaml") return true;
    if (text.includes("nodeLinker:") || text.includes("yarnPath:") || text.includes("npmRegistryServer:")) return true;
    if (n === ".yarnrc" && (text.includes("registry ") || text.includes("yarn-path "))) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/yarnrc/renderer.js"),
  about: {
    description: "Yarn package manager configuration — controls registry, workspace settings, PnP mode, and other package resolution behavior.",
    usedFor: [{ label: "Yarn", description: "Fast, reliable, and secure package manager for JavaScript", href: "https://yarnpkg.com/" }]
  }
};

// ../../docs/types/text/known/hyprland-conf/index.js
var hyprland_conf_default = {
  id: "hyprland-conf",
  label: "Hyprland Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const text = intake.textSample || intake.text || "";
    if (n === "hyprland.conf" || n === "hypr.conf") return true;
    if (text.includes("$mainMod") && (text.includes("bind = ") || text.includes("bindm = "))) return true;
    if (text.includes("monitor=") && text.includes("general {") && text.includes("decoration {")) return true;
    if (text.includes("exec-once") && (text.includes("waybar") || text.includes("hyprpaper") || text.includes("hyprlock"))) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/hyprland-conf/renderer.js"),
  about: {
    description: "Hyprland dynamic tiling Wayland compositor configuration — defines monitors, keybindings, animations, window rules, and startup applications.",
    usedFor: [{ label: "Hyprland", description: "Highly customizable dynamic tiling Wayland compositor", href: "https://wiki.hyprland.org/Configuring/Configuring-Hyprland/" }]
  }
};

// ../../docs/types/text/known/lxc-config/index.js
var lxc_config_default = {
  id: "lxc-config",
  label: "LXC Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const text = intake.textSample || intake.text || "";
    if (n === "config" || n === "lxc.conf") {
      if (text.includes("lxc.uts.name") || text.includes("lxc.utsname") || text.includes("lxc.rootfs") || text.includes("lxc.net.0") || text.includes("lxc.network.type")) return true;
    }
    if (text.match(/^lxc\.\w/m) && (text.includes("lxc.rootfs") || text.includes("lxc.net") || text.includes("lxc.arch"))) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/lxc-config/renderer.js"),
  about: {
    description: "LXC container configuration — defines container identity, network, resource limits, mounts, and security settings.",
    usedFor: [{ label: "LXC", description: "Linux Containers — operating system-level virtualization", href: "https://linuxcontainers.org/lxc/getting-started/" }]
  }
};

// ../../docs/types/text/known/muttrc/index.js
var muttrc_default = {
  id: "muttrc",
  label: "Mutt/NeoMutt Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === ".muttrc" || n === "muttrc" || n === ".neomuttrc" || n === "neomuttrc") return true;
    if (n === "muttrc" || n.endsWith(".muttrc")) return true;
    const text = intake.textSample || intake.text || "";
    if (text.includes("set folder") && text.includes("set from") && text.includes("@")) return true;
    if (text.includes("set imap_user") || text.includes("set smtp_url")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/muttrc/renderer.js"),
  about: {
    description: "NeoMutt/Mutt email client configuration — defines mail accounts, keybindings, color schemes, and hooks.",
    tags: ["email", "mutt", "neomutt", "config", "cli"]
  }
};

// ../../docs/types/text/known/foot-config/index.js
var foot_config_default = {
  id: "foot-config",
  label: "foot Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "foot.ini" || n === "foot.conf" || n === "footrc") return true;
    const text = intake.textSample || intake.text || "";
    if (text.includes("[foot]") && text.includes("font=")) return true;
    if (text.includes("[colors]") && text.includes("alpha=") && (text.includes("[main]") || text.includes("[cursor]"))) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/foot-config/renderer.js"),
  about: {
    description: "foot Wayland terminal emulator configuration — font, colors, key bindings, and scroll settings.",
    tags: ["terminal", "foot", "wayland", "config"]
  }
};

// ../../docs/types/text/known/rofi-config/index.js
var rofi_config_default = {
  id: "rofi-config",
  label: "Rofi Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "config.rasi" || n.endsWith(".rasi")) return true;
    const text = intake.textSample || intake.text || "";
    if (text.includes("configuration {") && text.includes("modi:")) return true;
    if (text.includes("* {") && text.includes("background-color:") && text.includes("text-color:") && n.endsWith(".rasi")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/rofi-config/renderer.js"),
  about: {
    description: "Rofi window switcher, application launcher, and dmenu replacement configuration.",
    tags: ["rofi", "launcher", "wayland", "x11", "config"]
  }
};

// ../../docs/types/text/known/mako-conf/index.js
var mako_conf_default = {
  id: "mako-conf",
  label: "mako Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "makorc") return true;
    if (n === "mako") return true;
    const text = intake.textSample || intake.text || "";
    if (text.includes("default-timeout=") && text.includes("background-color=") && !text.includes("[server]")) return true;
    if (text.includes("max-visible=") && text.includes("sort=-time") || text.includes("anchor=") && text.includes("border-color=")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/mako-conf/renderer.js"),
  about: {
    description: "mako Wayland notification daemon configuration — appearance, timeout, and criteria.",
    tags: ["mako", "notification", "wayland", "config"]
  }
};

// ../../docs/types/text/known/pulseaudio-conf/index.js
var pulseaudio_conf_default = {
  id: "pulseaudio-conf",
  label: "PulseAudio Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "daemon.conf" || n === "default.pa" || n === "client.conf" || n === "system.pa") return true;
    const text = intake.textSample || intake.text || "";
    if (text.includes("default-sample-format") && text.includes("default-sample-rate")) return true;
    if (n === "daemon.conf" && text.includes("resample-method")) return true;
    if (text.includes("load-module module-") && text.includes("set-default-sink")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/pulseaudio-conf/renderer.js"),
  about: {
    description: "PulseAudio sound server configuration — daemon settings, modules, sinks, and sources.",
    tags: ["audio", "pulseaudio", "sound", "linux", "config"]
  }
};

// ../../docs/types/text/known/pipewire-conf/index.js
var pipewire_conf_default = {
  id: "pipewire-conf",
  label: "PipeWire Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "pipewire.conf" || n === "client.conf" || n === "jack.conf" || n === "client-rt.conf") return true;
    const text = intake.textSample || intake.text || "";
    if (text.includes("context.properties") && (text.includes("core.daemon") || text.includes("link.max-buffers"))) return true;
    if (text.includes("context.modules") && text.includes("libpipewire-module-")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/pipewire-conf/renderer.js"),
  about: {
    description: "PipeWire audio/video server configuration — properties, modules, and session management.",
    tags: ["audio", "video", "pipewire", "wayland", "linux", "config"]
  }
};

// ../../docs/types/text/known/wezterm-conf/index.js
var wezterm_conf_default = {
  id: "wezterm-conf",
  label: "WezTerm Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === ".wezterm.lua" || n === "wezterm.lua") return true;
    const text = intake.textSample || intake.text || "";
    if (text.includes("wezterm.action") || text.includes("wezterm.font")) return true;
    if (text.includes("require('wezterm')") || text.includes('require("wezterm")')) return true;
    if (text.includes("config.font") && text.includes("config.color_scheme") && text.includes("wezterm")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/wezterm-conf/renderer.js"),
  about: {
    description: "WezTerm GPU-accelerated terminal emulator Lua configuration — fonts, colors, keybindings, and multiplexing.",
    tags: ["terminal", "wezterm", "lua", "config", "gpu"]
  }
};

// ../../docs/types/text/known/aria2-conf/index.js
var aria2_conf_default = {
  id: "aria2-conf",
  label: "aria2 Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "aria2.conf" || n === ".aria2.conf" || n === "aria2rc") return true;
    const text = intake.textSample || intake.text || "";
    if (text.includes("max-concurrent-downloads=") && text.includes("continue=")) return true;
    if (text.includes("dir=") && (text.includes("split=") || text.includes("max-connection-per-server="))) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/aria2-conf/renderer.js"),
  about: {
    description: "aria2 multi-protocol download manager configuration — concurrency, BitTorrent, RPC, and proxy settings.",
    tags: ["aria2", "download", "torrent", "config"]
  }
};

// ../../docs/types/text/known/picom-conf/index.js
var picom_conf_default = {
  id: "picom-conf",
  label: "picom Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "picom.conf" || n === "compton.conf") return true;
    const text = intake.textSample || intake.text || "";
    if (text.includes("shadow-radius") && text.includes("backend")) return true;
    if (text.includes("corner-radius") && (text.includes("blur-method") || text.includes("shadow-offset"))) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/picom-conf/renderer.js"),
  about: {
    description: "picom X11 compositor configuration — shadows, blur, opacity, fading, and animations.",
    tags: ["picom", "compositor", "x11", "config"]
  }
};

// ../../docs/types/text/known/mpd-conf/index.js
var mpd_conf_default = {
  id: "mpd-conf",
  label: "MPD Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "mpd.conf") return true;
    const text = intake.textSample || intake.text || "";
    if (text.includes("music_directory") && text.includes("audio_output")) return true;
    if (text.includes("bind_to_address") && text.includes("music_directory") && text.includes("db_file")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/mpd-conf/renderer.js"),
  about: {
    description: "Music Player Daemon (MPD) configuration — music library, audio outputs, and network settings.",
    tags: ["mpd", "music", "audio", "config"]
  }
};

// ../../docs/types/text/known/ncmpcpp-conf/index.js
var ncmpcpp_conf_default = {
  id: "ncmpcpp-conf",
  label: "ncmpcpp Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "config") {
      const text = intake.textSample || intake.text || "";
      if (text.includes("ncmpcpp_directory") || text.includes("mpd_host") && text.includes("lyrics_directory")) return true;
      if (text.includes("media_library_primary_tag") || text.includes("visualizer_data_source")) return true;
    }
    if (n === "ncmpcpp.conf" || n === ".ncmpcpprc") return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/ncmpcpp-conf/renderer.js"),
  about: {
    description: "ncmpcpp MPD music player client configuration — display, colors, visualizer, and keybindings.",
    tags: ["ncmpcpp", "mpd", "music", "cli", "config"]
  }
};

// ../../docs/types/text/known/newsboat-conf/index.js
var newsboat_conf_default = {
  id: "newsboat-conf",
  label: "newsboat Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "config") {
      const text = intake.textSample || intake.text || "";
      if (text.includes("auto-reload") && text.includes("refresh-on-startup") && text.includes("reload-time")) return true;
      if (text.includes("bind-key") && text.includes("newsboat")) return true;
    }
    if (n === "newsboat.conf") return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/newsboat-conf/renderer.js"),
  about: {
    description: "newsboat RSS/Atom feed reader configuration — auto-reload, display, and key bindings.",
    tags: ["newsboat", "rss", "atom", "news", "cli", "config"]
  }
};

// ../../docs/types/text/known/xresources/index.js
var xresources_default = {
  id: "xresources",
  label: "Xresources",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === ".xresources" || n === "xresources" || n === ".xdefaults" || n === "xdefaults") return true;
    const text = intake.textSample || intake.text || "";
    if (text.includes("Xft.dpi") || text.includes("Xft.antialias")) return true;
    if (text.match(/^[A-Z*][A-Za-z*]+\.[A-Za-z]+:/m) && text.includes("color")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/xresources/renderer.js"),
  about: {
    description: "X11 .Xresources resource database — terminal colors, fonts, DPI, and application settings.",
    tags: ["x11", "xresources", "xdefaults", "terminal", "colors", "config"]
  }
};

// ../../docs/types/text/known/xorg-conf/index.js
var xorg_conf_default = {
  id: "xorg-conf",
  label: "Xorg Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "xorg.conf" || n.endsWith(".conf") && n.startsWith("xorg.conf")) return true;
    if (n.match(/^\d{2}-\w+\.conf$/) || n === "xorg.conf") return true;
    const text = intake.textSample || intake.text || "";
    if (text.includes('Section "ServerLayout"') || text.includes('Section "Screen"')) return true;
    if (text.includes('Section "Device"') && (text.includes("Driver") || text.includes("Option"))) return true;
    if (text.includes('Section "InputClass"') && text.includes("MatchIsPointer")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/xorg-conf/renderer.js"),
  about: {
    description: "Xorg X11 server configuration — display, monitor, GPU driver, and input device settings.",
    tags: ["xorg", "x11", "display", "gpu", "config"]
  }
};

// ../../docs/types/text/known/bspwmrc/index.js
var bspwmrc_default = {
  id: "bspwmrc",
  label: "bspwm Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "bspwmrc") return true;
    const text = intake.textSample || intake.text || "";
    if (text.includes("bspc monitor") || text.includes("bspc config") || text.includes("bspc rule")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/bspwmrc/renderer.js"),
  about: {
    description: "bspwm binary space partitioning window manager configuration script.",
    tags: ["bspwm", "wm", "tiling", "x11", "config"]
  }
};

// ../../docs/types/text/known/sxhkdrc/index.js
var sxhkdrc_default = {
  id: "sxhkdrc",
  label: "sxhkd Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "sxhkdrc") return true;
    const text = intake.textSample || intake.text || "";
    if (text.match(/^super \+ \w/m) && text.match(/^\s+\w/m)) return true;
    if (text.includes("super + {") && text.match(/^\s+bspc /m)) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/sxhkdrc/renderer.js"),
  about: {
    description: "sxhkd simple X hotkey daemon configuration — keyboard shortcut bindings.",
    tags: ["sxhkd", "hotkeys", "keybindings", "x11", "bspwm", "config"]
  }
};

// ../../docs/types/text/known/mpv-conf/index.js
var mpv_conf_default = {
  id: "mpv-conf",
  label: "mpv Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "mpv.conf") return true;
    if (n === "input.conf") {
      const text2 = intake.textSample || intake.text || "";
      if (text2.match(/^[A-Z_]+\s+\w/m) && text2.includes("seek") || text2.includes("playlist")) return true;
    }
    const text = intake.textSample || intake.text || "";
    if (text.includes("video-output") || text.includes("vo=") || text.includes("hwdec=")) return true;
    if (text.includes("profile=") && (text.includes("sub-font") || text.includes("audio-channels"))) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/mpv-conf/renderer.js"),
  about: {
    description: "mpv media player configuration — video output, audio, subtitles, and profiles.",
    tags: ["mpv", "video", "media", "config"]
  }
};

// ../../docs/types/text/known/ytdlp-conf/index.js
var ytdlp_conf_default = {
  id: "ytdlp-conf",
  label: "yt-dlp Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "yt-dlp.conf" || n === ".yt-dlp.conf" || n === "youtube-dl.conf" || n === ".youtube-dl.conf") return true;
    const text = intake.textSample || intake.text || "";
    if (text.includes("--format") && text.includes("--output") && text.includes("--merge-output-format")) return true;
    if ((text.includes("--format") || text.includes("-f ")) && text.includes("--embed-thumbnail") && text.includes("--add-metadata")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/ytdlp-conf/renderer.js"),
  about: {
    description: "yt-dlp/youtube-dl video downloader configuration — format selection, output paths, and metadata.",
    tags: ["yt-dlp", "youtube-dl", "download", "video", "config"]
  }
};

// ../../docs/types/text/known/rclone-conf/index.js
var rclone_conf_default = {
  id: "rclone-conf",
  label: "rclone Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "frpc.toml" || n === "listmonk-config.toml") return false;
    if (n === "rclone.conf") return true;
    const text = intake.textSample || intake.text || "";
    if (text.match(/^\[[\w-]+\]/m) && text.includes("type = ")) return true;
    if (text.includes("type = s3") || text.includes("type = drive") || text.includes("type = dropbox")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/rclone-conf/renderer.js"),
  about: {
    description: "rclone cloud storage configuration — remote definitions for S3, Google Drive, Dropbox, and more.",
    tags: ["rclone", "cloud", "backup", "sync", "config"]
  }
};

// ../../docs/types/text/known/restic-config/index.js
var restic_config_default = {
  id: "restic-config",
  label: "resticprofile Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "profiles.toml" || n === "resticprofile.toml" || n === "profiles.yaml" || n === "profiles.json") return true;
    const text = intake.textSample || intake.text || "";
    if (text.includes("repository") && text.includes("password-file") && (text.includes("[global]") || text.match(/^\[\w[\w-]*\]$/m))) return true;
    if (text.includes("initialize") && text.includes("backup") && text.includes("repository")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/restic-config/renderer.js"),
  about: {
    description: "resticprofile backup configuration — repository, schedule, and backup profile definitions.",
    tags: ["restic", "resticprofile", "backup", "config"]
  }
};

// ../../docs/types/text/known/taskrc/index.js
var taskrc_default = {
  id: "taskrc",
  label: "Taskwarrior Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === ".taskrc" || n === "taskrc") return true;
    const text = intake.textSample || intake.text || "";
    if (text.includes("data.location=") && text.includes("dateformat=")) return true;
    if (text.includes("task.version.") || text.includes("urgency.") && text.includes("coefficient")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/taskrc/renderer.js"),
  about: {
    description: "Taskwarrior task manager configuration — data location, dates, colors, and urgency settings.",
    tags: ["taskwarrior", "task", "productivity", "config"]
  }
};

// ../../docs/types/text/known/curlrc/index.js
var curlrc_default = {
  id: "curlrc",
  label: "curlrc",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === ".curlrc" || n === "curlrc" || n === "_curlrc") return true;
    const text = intake.textSample || intake.text || "";
    if ((text.includes("user-agent") || text.includes("max-time")) && (text.includes("retry") || text.includes("location"))) return true;
    if (text.includes("# curl") && text.includes("silent") && text.includes("location")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/curlrc/renderer.js"),
  about: {
    description: "curl default options file — sets global defaults for all curl invocations.",
    tags: ["curl", "curlrc", "http", "config"]
  }
};

// ../../docs/types/text/known/inputrc/index.js
var inputrc_default = {
  id: "inputrc",
  label: "inputrc",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === ".inputrc" || n === "inputrc") return true;
    const text = intake.textSample || intake.text || "";
    if (text.includes("set editing-mode") || text.includes("set completion-ignore-case")) return true;
    if (text.includes("set bell-style") && (text.includes("set vi-mode") || text.includes("$if "))) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/inputrc/renderer.js"),
  about: {
    description: "GNU readline configuration — editing mode, completion, key bindings, and display settings.",
    tags: ["readline", "inputrc", "bash", "terminal", "config"]
  }
};

// ../../docs/types/text/known/wgetrc/index.js
var wgetrc_default = {
  id: "wgetrc",
  label: "wgetrc",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === ".wgetrc" || n === "wgetrc") return true;
    const text = intake.textSample || intake.text || "";
    if (text.includes("follow_ftp") || text.includes("content_disposition")) return true;
    if (text.includes("tries") && text.includes("timeout") && text.includes("user_agent")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/wgetrc/renderer.js"),
  about: {
    description: "wget download tool default configuration — timeouts, retries, user agent, and proxy settings.",
    tags: ["wget", "wgetrc", "download", "config"]
  }
};

// ../../docs/types/text/toml/known/helix-config/index.js
var helix_config_default = {
  id: "helix-config",
  label: "Helix Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "config.toml" || n === "helix.toml") {
      const text = intake.textSample || intake.text || "";
      if (text.includes("[editor]") && (text.includes("theme") || text.includes("cursor-shape") || text.includes("line-number"))) return true;
      if (text.includes("[keys.normal]") || text.includes("[keys.insert]")) return true;
    }
    return false;
  },
  loadRenderer: () => import("../types/text/toml/known/helix-config/renderer.js"),
  about: {
    description: "Helix modal text editor configuration — theme, editor behavior, LSP, and key mappings.",
    tags: ["helix", "editor", "modal", "config", "toml"]
  }
};

// ../../docs/types/text/known/lfrc/index.js
var lfrc_default = {
  id: "lfrc",
  label: "lf Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "lfrc") return true;
    const text = intake.textSample || intake.text || "";
    if (text.includes("set icons") || text.includes("set previewer")) return true;
    if (text.match(/^set \w/m) && text.match(/^map \w/m) && text.includes("lf")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/lfrc/renderer.js"),
  about: {
    description: "lf terminal file manager configuration — settings, keymaps, and custom commands.",
    tags: ["lf", "filemanager", "terminal", "config"]
  }
};

// ../../docs/types/text/known/ranger-conf/index.js
var ranger_conf_default = {
  id: "ranger-conf",
  label: "Ranger Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "rc.conf") {
      const text = intake.textSample || intake.text || "";
      if (text.includes("set preview_images") || text.includes("set column_ratios")) return true;
      if (text.includes("set vcs_aware") || text.includes("map <C-f> fzf_select")) return true;
    }
    if (n === "ranger.conf") return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/ranger-conf/renderer.js"),
  about: {
    description: "Ranger terminal file manager configuration — settings, key mappings, and preview options.",
    tags: ["ranger", "filemanager", "terminal", "config"]
  }
};

// ../../docs/types/text/known/zathurarc/index.js
var zathurarc_default = {
  id: "zathurarc",
  label: "Zathura Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "zathurarc") return true;
    const text = intake.textSample || intake.text || "";
    if (text.includes("set recolor") || text.includes("set adjust-open")) return true;
    if (text.includes("set statusbar-h-padding") && text.includes("set default-bg")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/zathurarc/renderer.js"),
  about: {
    description: "Zathura PDF and document viewer configuration — colors, recolor mode, and key bindings.",
    tags: ["zathura", "pdf", "viewer", "config"]
  }
};

// ../../docs/types/text/known/wsl-conf/index.js
var wsl_conf_default = {
  id: "wsl-conf",
  label: "WSL Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "wsl.conf") return true;
    const text = intake.textSample || intake.text || "";
    if (text.includes("[automount]") && text.includes("enabled") && text.includes("[network]")) return true;
    if (text.includes("[boot]") && (text.includes("systemd") || text.includes("command")) && text.includes("[wsl2]")) return true;
    if (text.includes("[automount]") && text.includes("root = /mnt")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/wsl-conf/renderer.js"),
  about: {
    description: "WSL2 (Windows Subsystem for Linux) per-distribution configuration — automount, network, boot, and interop settings.",
    tags: ["wsl", "wsl2", "windows", "linux", "config"]
  }
};

// ../../docs/types/text/known/loader-conf/index.js
var loader_conf_default = {
  id: "loader-conf",
  label: "systemd-boot Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "loader.conf") return true;
    if (n.endsWith(".conf")) {
      const text2 = intake.textSample || intake.text || "";
      if ((text2.includes("linux ") || text2.includes("efi ")) && (text2.includes("initrd ") || text2.includes("options "))) return true;
    }
    const text = intake.textSample || intake.text || "";
    if (text.includes("default ") && text.includes("timeout ") && text.includes("console-mode")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/loader-conf/renderer.js"),
  about: {
    description: "systemd-boot bootloader configuration — default entry, timeout, and boot options.",
    tags: ["systemd-boot", "bootloader", "linux", "config"]
  }
};

// ../../docs/types/text/known/cmus-conf/index.js
var cmus_conf_default = {
  id: "cmus-conf",
  label: "cmus Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "rc" || n === "cmusrc") {
      const text = intake.textSample || intake.text || "";
      if (text.includes("set color_") || text.includes("set output_plugin") || text.includes("bind -f")) return true;
      if (text.includes("colorscheme ") && text.includes("set show_hidden")) return true;
    }
    if (n === "cmus.conf") return true;
    if (n === "cmus.rc") return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/cmus-conf/renderer.js"),
  about: {
    description: "cmus terminal music player configuration — output plugin, colors, key bindings, and library settings.",
    tags: ["cmus", "music", "audio", "terminal", "config"]
  }
};

// ../../docs/types/text/known/pacman-conf/index.js
var pacman_conf_default = {
  id: "pacman-conf",
  label: "pacman Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "pacman.conf") return true;
    const text = intake.textSample || intake.text || "";
    if (text.includes("[options]") && text.includes("HoldPkg") && text.includes("SyncFirst")) return true;
    if (text.includes("[core]") && text.includes("[extra]") && text.includes("Include = ")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/pacman-conf/renderer.js"),
  about: {
    description: "Arch Linux pacman package manager configuration — repositories, options, and security settings.",
    tags: ["pacman", "arch", "linux", "package", "config"]
  }
};

// ../../docs/types/text/known/dnf-conf/index.js
var dnf_conf_default = {
  id: "dnf-conf",
  label: "DNF Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "dnf.conf" || n === "yum.conf") return true;
    const text = intake.textSample || intake.text || "";
    if (text.includes("[main]") && text.includes("gpgcheck") && (text.includes("cachedir") || text.includes("keepcache"))) return true;
    if (text.includes("fastestmirror") && text.includes("max_parallel_downloads")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/dnf-conf/renderer.js"),
  about: {
    description: "DNF/YUM package manager configuration — cache, GPG verification, parallel downloads, and proxy settings.",
    tags: ["dnf", "yum", "fedora", "rhel", "linux", "package", "config"]
  }
};

// ../../docs/types/text/known/gdbinit/index.js
var gdbinit_default = {
  id: "gdbinit",
  label: "GDB Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === ".gdbinit" || n === "gdbinit") return true;
    const text = intake.textSample || intake.text || "";
    if (text.includes("set print pretty") || text.includes("set pagination off")) return true;
    if (text.includes("python") && text.includes("gdb.") || text.includes("define hook-stop")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/gdbinit/renderer.js"),
  about: {
    description: "GDB (GNU Debugger) initialization file — pretty printing, Python extensions, custom commands, and display settings.",
    tags: ["gdb", "debugger", "c", "c++", "config"]
  }
};

// ../../docs/types/text/yaml/known/pre-commit-config/index.js
var plugin67 = {
  id: "pre-commit-config",
  label: "pre-commit config",
  match(intake, baseType) {
    if (!["yaml", "docker-compose", "github-actions"].includes(baseType?.id)) return false;
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return name === ".pre-commit-config.yaml" || name === ".pre-commit-config.yml" || name === "pre-commit-config.yaml" || name === "pre-commit-config.yml";
  },
  loadRenderer: () => import("../types/text/yaml/known/pre-commit-config/renderer.js"),
  about: {
    description: "pre-commit framework configuration — defines repositories and hooks that run automatically before each git commit to enforce code quality.",
    usedFor: [{ label: "pre-commit", description: "A framework for managing and maintaining multi-language pre-commit hooks", href: "https://pre-commit.com" }]
  }
};

// ../../docs/types/text/known/conky-conf/index.js
var plugin68 = {
  id: "conky-conf",
  label: "Conky config",
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (name === "conky.conf" || name === ".conkyrc" || name === "conkyrc") return true;
    const sample = intake.textSample || intake.text || "";
    if (/^conky\.config\s*=/m.test(sample) || /^conky\.text\s*=/m.test(sample)) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/conky-conf/renderer.js"),
  about: {
    description: "Conky system monitor configuration — controls the desktop overlay display of CPU, memory, network, and other system statistics.",
    usedFor: [{ label: "Conky", description: "Lightweight system monitor for X and Wayland that renders stats on the desktop", href: "https://github.com/brndnmtthws/conky" }]
  }
};

// ../../docs/types/text/yaml/known/semaphore-ci/index.js
var plugin69 = {
  id: "semaphore-ci",
  label: "Semaphore CI",
  tags: ["semaphore", "ci", "yaml"],
  match(intake, baseType) {
    if (baseType && baseType.id !== "yaml") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const path = (intake.name || intake.filename || "").toLowerCase();
    if (n !== "semaphore.yml" && n !== "semaphore.yaml") return false;
    const text = intake.text || "";
    return path.includes(".semaphore") || text.includes("version: v1.0") || text.includes("blocks:") && text.includes("agent:");
  },
  loadRenderer: () => import("../types/text/yaml/known/semaphore-ci/renderer.js"),
  about: {
    description: "Semaphore CI pipeline — shows agent, blocks, jobs, global config, and promotions.",
    usedFor: [{ label: "Semaphore CI", description: "Fast and flexible CI/CD platform", href: "https://docs.semaphoreci.com/reference/pipeline-yaml-reference/" }]
  }
};

// ../../docs/types/text/known/nanorc/index.js
var nanorc_default = {
  id: "nanorc",
  label: "nanorc",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === ".nanorc" || n === "nanorc" || n.endsWith(".nanorc");
  },
  loadRenderer: () => import("../types/text/known/nanorc/renderer.js"),
  about: {
    description: ".nanorc — GNU nano editor configuration: behaviour flags, tab settings, color themes, syntax highlighting includes, and custom key bindings.",
    usedFor: [{ label: "GNU nano config", description: "Configure the nano terminal text editor", href: "https://www.nano-editor.org/dist/latest/nanorc.5.html" }]
  }
};

// ../../docs/types/text/yaml/known/ansible-lint/index.js
var plugin70 = {
  id: "ansible-lint",
  label: ".ansible-lint",
  tags: ["ansible", "ansible-lint", "yaml"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === ".ansible-lint" || n === ".ansible-lint.yml" || n === ".ansible-lint.yaml";
  },
  loadRenderer: () => import("../types/text/yaml/known/ansible-lint/renderer.js")
};

// ../../docs/types/text/yaml/known/molecule/index.js
var plugin71 = {
  id: "molecule",
  label: "Molecule",
  tags: ["molecule", "ansible", "testing"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n !== "molecule.yml" && n !== "molecule.yaml") return false;
    const text = intake.text || "";
    return text.includes("driver:") || text.includes("platforms:") || text.includes("provisioner:");
  },
  loadRenderer: () => import("../types/text/yaml/known/molecule/renderer.js")
};

// ../../docs/types/text/yaml/known/helmfile/index.js
var plugin72 = {
  id: "helmfile",
  label: "Helmfile",
  tags: ["kubernetes", "helm", "deployment"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "helmfile.yaml" || n === "helmfile.yml";
  },
  loadRenderer: () => import("../types/text/yaml/known/helmfile/renderer.js"),
  about: {
    description: "Helmfile — declarative spec for deploying Helm charts to Kubernetes clusters.",
    usedFor: [{ label: "Helm deployment management", description: "Helmfile manages multiple Helm releases across environments", href: "https://helmfile.readthedocs.io/" }]
  }
};

// ../../docs/types/text/yaml/known/release-it/index.js
var plugin73 = {
  id: "release-it",
  label: "release-it config",
  tags: ["release", "versioning", "changelog", "npm"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === ".release-it.yml" || n === ".release-it.yaml" || n === ".release-it.json" || n === ".release-it.js" || n === "release-it.config.js" || n === "release-it.config.ts";
  },
  loadRenderer: () => import("../types/text/yaml/known/release-it/renderer.js"),
  about: {
    description: "release-it config — automates version bumps, changelog generation, git tagging, and package publishing.",
    usedFor: [{ label: "Release automation", description: "release-it handles versioning, changelogs, git tags, GitHub/GitLab releases, and npm publishes", href: "https://github.com/release-it/release-it" }]
  }
};

// ../../docs/types/text/yaml/known/benthos/index.js
var plugin74 = {
  id: "benthos",
  label: "Benthos / Redpanda Connect",
  tags: ["streaming", "data-pipeline", "messaging"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "benthos.yaml" || n === "benthos.yml" || n === "redpanda-connect.yaml" || n === "connect.yaml";
  },
  loadRenderer: () => import("../types/text/yaml/known/benthos/renderer.js"),
  about: {
    description: "Benthos / Redpanda Connect pipeline configuration — input, output, pipeline processors, buffer, logger, and metrics.",
    usedFor: [{ label: "Data streaming", description: "Configure Benthos (Redpanda Connect) to move data between sources and sinks with configurable processors, buffers, and observability.", href: "https://www.benthos.dev/docs/configuration/about" }]
  }
};
var benthos_default = plugin74;

// ../../docs/types/text/yaml/known/test-kitchen/index.js
var plugin75 = {
  id: "test-kitchen",
  label: "Test Kitchen",
  tags: ["chef", "testing", "infrastructure"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === ".kitchen.yml" || n === ".kitchen.yaml" || n === "kitchen.yml" || n === "kitchen.yaml";
  },
  loadRenderer: () => import("../types/text/yaml/known/test-kitchen/renderer.js"),
  about: {
    description: "Test Kitchen configuration — driver, provisioner, verifier, platforms, and test suites for Chef infrastructure testing.",
    usedFor: [{ label: "Infrastructure testing", description: "Configure Test Kitchen to create sandbox environments and run integration tests against Chef cookbooks and infrastructure code.", href: "https://kitchen.ci/docs/getting-started/introduction/" }]
  }
};
var test_kitchen_default = plugin75;

// ../../docs/types/text/yaml/known/harbor/index.js
var plugin76 = {
  id: "harbor",
  label: "Harbor registry",
  tags: ["container", "registry", "docker"],
  match(intake, baseType) {
    if (baseType?.id !== "yaml") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "harbor.yml" || n === "harbor.yaml";
  },
  loadRenderer: () => import("../types/text/yaml/known/harbor/renderer.js"),
  about: {
    description: "Harbor container registry configuration — hostname, TLS, storage, database, auth, and security settings.",
    usedFor: [{ label: "Container registry", description: "Harbor is an open-source container registry that secures artifacts with policies and role-based access control.", href: "https://goharbor.io/" }]
  }
};
var harbor_default = plugin76;

// ../../docs/types/text/yaml/known/harbor-config/index.js
var harbor_config_default = {
  id: "harbor-config",
  label: "Harbor Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const nameMatch = n === "harbor.yml" || n === "harbor.yaml";
    const cfg = intake.parsed || {};
    const contentMatch = !!cfg.hostname && cfg.harbor_admin_password !== void 0;
    return nameMatch || contentMatch;
  },
  loadRenderer: () => import("../types/text/yaml/known/harbor-config/renderer.js"),
  about: {
    description: "Harbor container registry YAML configuration — server, TLS, admin, database, storage, Redis, Trivy, logging, and proxy settings.",
    tags: ["harbor", "container", "registry", "docker", "self-hosted", "devops"]
  }
};

// ../../docs/types/text/yaml/known/garden-io/index.js
var plugin77 = {
  id: "garden-io",
  label: "Garden.io config",
  tags: ["garden", "devops", "orchestration", "kubernetes"],
  match(intake, baseType) {
    if (baseType?.id !== "yaml") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "garden.yml" || n === "garden.yaml") return true;
    const t = intake.text || "";
    return /^kind:\s*(Project|Module|Deploy|Build|Run|Test|Workflow)/m.test(t) && /^apiVersion:\s*garden\.io/m.test(t);
  },
  loadRenderer: () => import("../types/text/yaml/known/garden-io/renderer.js"),
  about: {
    description: "Garden.io development orchestration configuration — project, module, service, task, and test definitions.",
    usedFor: [{ label: "Dev orchestration", description: "Garden automates building, testing, and deploying across microservices with a unified config.", href: "https://garden.io/" }]
  }
};
var garden_io_default = plugin77;

// ../../docs/types/text/json/known/stryker/index.js
var stryker_default = {
  id: "stryker",
  label: "Stryker mutation testing",
  match(intake, baseType) {
    if (baseType?.id !== "json") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "stryker.conf.json" || n === ".stryker.conf.json" || n === "stryker.config.json";
  },
  loadRenderer: () => import("../types/text/json/known/stryker/renderer.js"),
  about: {
    description: "Stryker mutation testing configuration — defines mutate globs, test runner, thresholds, reporters, and timeouts.",
    usedFor: [{ label: "Mutation testing", description: "Stryker is a mutation testing framework for JavaScript, TypeScript, and more.", href: "https://stryker-mutator.io/docs/stryker-js/configuration/" }]
  }
};

// ../../docs/types/text/json/known/volta/index.js
var volta_default = {
  id: "volta",
  label: "Volta pins",
  match: (intake, baseType) => {
    if (baseType.id !== "json") return false;
    const name = (intake.filename || "").split("/").pop().toLowerCase();
    return name === "volta.json" || name === "package.json" && (intake.text || "").includes('"volta"');
  },
  loadRenderer: () => import("../types/text/json/known/volta/renderer.js"),
  about: { description: "Volta tool pinning configuration — shows pinned Node, npm, and yarn versions." }
};

// ../../docs/types/text/known/windsurfrules/index.js
var windsurfrules_default = {
  id: "windsurfrules",
  label: ".windsurfrules",
  match: (intake) => {
    return (intake.filename || "").split("/").pop() === ".windsurfrules";
  },
  loadRenderer: () => import("../types/text/known/windsurfrules/renderer.js"),
  about: { description: "Windsurf AI editor rules file — shows coding standards and rule sections for the AI assistant." }
};

// ../../docs/types/text/ini/known/airflow/index.js
var airflow_default = {
  id: "airflow-cfg",
  label: "Apache Airflow config",
  match(intake, baseType) {
    if (baseType?.id !== "ini") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "airflow.cfg";
  },
  loadRenderer: () => import("../types/text/ini/known/airflow/renderer.js"),
  about: {
    description: "Apache Airflow configuration file — defines executor, DAG folder, parallelism, database, webserver, and scheduler settings.",
    usedFor: [{ label: "Apache Airflow", description: "Open-source workflow orchestration platform for data pipelines and task scheduling.", href: "https://airflow.apache.org/docs/apache-airflow/stable/howto/set-config.html" }]
  }
};

// ../../docs/types/text/ini/known/radicale-config/index.js
var radicale_config_default = {
  id: "radicale-config",
  label: "Radicale Config",
  match(intake, baseType) {
    if (baseType?.id !== "ini") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "radicale.conf") return true;
    if (n === "config") {
      const text = intake.textSample || intake.text || "";
      return text.includes("[server]") && text.includes("[auth]") && text.includes("[storage]");
    }
    return false;
  },
  loadRenderer: () => import("../types/text/ini/known/radicale-config/renderer.js"),
  about: {
    description: "Radicale CalDAV/CardDAV server configuration — defines server binding, authentication, storage backend, and logging settings.",
    usedFor: [{ label: "Radicale", description: "Free and open-source CalDAV and CardDAV server.", href: "https://radicale.org/v3.html#configuration" }]
  }
};

// ../../docs/types/text/toml/known/registries-conf/index.js
var plugin78 = {
  id: "registries-conf",
  label: "Container registries",
  tags: ["podman", "containers", "registry", "oci"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "registries.conf";
  },
  loadRenderer: () => import("../types/text/toml/known/registries-conf/renderer.js"),
  about: {
    description: "OCI/Podman container image registry configuration — defines search registries, mirrors, insecure registries, and blocked registries.",
    usedFor: [{ label: "Podman / Buildah / CRI-O registry config", description: "Controls how container tools resolve image names and where they pull from", href: "https://github.com/containers/image/blob/main/docs/containers-registries.conf.5.md" }]
  }
};
var registries_conf_default = plugin78;

// ../../docs/types/text/toml/known/storage-conf/index.js
var plugin79 = {
  id: "storage-conf",
  label: "Containers storage",
  tags: ["podman", "buildah", "cri-o", "containers", "storage", "overlay"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "storage.conf";
  },
  loadRenderer: () => import("../types/text/toml/known/storage-conf/renderer.js"),
  about: {
    description: "containers/storage configuration for Podman, Buildah, and CRI-O — defines the storage driver, graph root, and overlay options.",
    usedFor: [{ label: "containers/storage config", description: "Controls where and how container images and layers are stored on disk", href: "https://github.com/containers/storage/blob/main/docs/containers-storage.conf.5.md" }]
  }
};
var storage_conf_default = plugin79;

// ../../docs/types/text/yaml/known/asyncapi/index.js
var plugin80 = {
  id: "asyncapi",
  label: "AsyncAPI",
  tags: ["api", "event-driven", "messaging", "schema"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "asyncapi.yml" || n === "asyncapi.yaml") return true;
    const t = intake.text || "";
    return /^asyncapi:\s*['"]?\d/m.test(t);
  },
  loadRenderer: () => import("../types/text/yaml/known/asyncapi/renderer.js"),
  about: {
    description: "AsyncAPI specification — defines event-driven APIs and messaging systems (Kafka, MQTT, AMQP, WebSocket, etc.).",
    usedFor: [{ label: "AsyncAPI", description: "Specification format for event-driven and asynchronous APIs, similar to OpenAPI for REST.", href: "https://www.asyncapi.com/docs" }]
  }
};
var asyncapi_default = plugin80;

// ../../docs/types/text/toml/known/telegraf/index.js
var plugin81 = {
  id: "telegraf",
  label: "Telegraf",
  tags: ["metrics", "monitoring", "influxdb", "telegraf"],
  match(intake, baseType) {
    if (baseType?.id !== "toml" && baseType?.id !== "ini") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "telegraf.conf" || n === "telegraf.toml";
  },
  loadRenderer: () => import("../types/text/toml/known/telegraf/renderer.js"),
  about: {
    description: "InfluxData Telegraf metrics agent configuration — defines input plugins, output destinations, and processing pipelines.",
    usedFor: [{ label: "Telegraf", description: "Plugin-driven server agent for collecting and sending metrics to InfluxDB and other destinations.", href: "https://docs.influxdata.com/telegraf/latest/configuration/" }]
  }
};
var telegraf_default = plugin81;

// ../../docs/types/text/yaml/known/devfile/index.js
var plugin82 = {
  id: "devfile",
  label: "Devfile",
  tags: ["devworkspace", "openshift", "che", "development"],
  match(intake, baseType) {
    if (baseType?.id !== "yaml") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "devfile.yaml" || n === "devfile.yml") return true;
    const t = intake.text || "";
    return /^schemaVersion:\s*2\./m.test(t) && /^(components|commands|projects):/m.test(t);
  },
  loadRenderer: () => import("../types/text/yaml/known/devfile/renderer.js"),
  about: {
    description: "Devfile v2 — developer workspace specification used by Red Hat OpenShift Dev Spaces, Eclipse Che, and compatible tooling.",
    usedFor: [{ label: "Developer workspaces", description: "Define portable, reproducible development environments with components, commands, and starter projects.", href: "https://devfile.io/" }]
  }
};
var devfile_default = plugin82;

// ../../docs/types/text/json/known/ncurc/index.js
var plugin83 = {
  id: "ncurc",
  label: "npm-check-updates config",
  tags: ["npm", "dependencies", "updates"],
  match(intake, baseType) {
    if (baseType?.id !== "json") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === ".ncurc" || n === ".ncurc.json" || n === ".ncurc.yml" || n === ".ncurc.yaml" || n === ".ncurc.js";
  },
  loadRenderer: () => import("../types/text/json/known/ncurc/renderer.js"),
  about: {
    description: "npm-check-updates (ncu) configuration — controls which packages to upgrade, version targets, and filters.",
    usedFor: [{ label: "Dependency upgrades", description: "Configure ncu to target specific version ranges, filter packages, and automate dependency updates.", href: "https://github.com/raineorshine/npm-check-updates" }]
  }
};
var ncurc_default = plugin83;

// ../../docs/types/text/toml/known/influxdb/index.js
var plugin84 = {
  id: "influxdb",
  label: "InfluxDB",
  tags: ["influxdb", "time-series", "database"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "influxdb.conf" || n === "influxdb.toml";
  },
  loadRenderer: () => import("../types/text/toml/known/influxdb/renderer.js"),
  about: {
    description: "InfluxDB v1.x configuration — storage paths, HTTP listener, authentication, and retention policies.",
    usedFor: [{ label: "InfluxDB v1.x config", description: "Controls data/WAL directories, HTTP API settings, auth, and subscriber options", href: "https://docs.influxdata.com/influxdb/v1/administration/config/" }]
  }
};
var influxdb_default = plugin84;

// ../../docs/types/text/yaml/known/influxdb-config/index.js
var influxdb_config_default = {
  id: "influxdb-config",
  label: "InfluxDB Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "influxdb.yml" || n === "influxdb.yaml") return true;
    const cfg = intake.parsed || {};
    return cfg["bolt-path"] !== void 0 && cfg["engine-path"] !== void 0;
  },
  loadRenderer: () => import("../types/text/yaml/known/influxdb-config/renderer.js")
};

// ../../docs/types/text/known/nsq-conf/index.js
var plugin85 = {
  id: "nsq-conf",
  label: "NSQ config",
  tags: ["nsq", "messaging", "queue"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "nsqd.cfg" || n === "nsqlookupd.cfg" || n === "nsq.conf";
  },
  loadRenderer: () => import("../types/text/known/nsq-conf/renderer.js"),
  about: {
    description: "NSQ distributed messaging system configuration — network addresses, storage, timeouts, TLS, and message limits.",
    usedFor: [{ label: "nsqd / nsqlookupd config", description: "Controls TCP/HTTP listener addresses, data path, message timeouts, and TLS settings", href: "https://nsq.io/components/nsqd.html" }]
  }
};
var nsq_conf_default = plugin85;

// ../../docs/types/text/yaml/known/cloudflared/index.js
var plugin86 = {
  id: "cloudflared",
  label: "Cloudflare Tunnel",
  tags: ["cloudflare", "tunnel", "zero-trust", "networking"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "cloudflared.yml" || n === "cloudflared.yaml") return true;
    if (n === "config.yml" || n === "config.yaml") {
      const t = intake.text || intake.textSample || "";
      return t.includes("tunnel:") && (t.includes("ingress:") || t.includes("credentials-file:"));
    }
    return false;
  },
  loadRenderer: () => import("../types/text/yaml/known/cloudflared/renderer.js"),
  about: {
    description: "Cloudflare Tunnel (cloudflared) configuration — defines tunnel ID, credentials, and ingress routing rules.",
    usedFor: [{ label: "Cloudflare Tunnel", description: "Zero-trust network tunneling without opening firewall ports", href: "https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/" }]
  }
};
var cloudflared_default = plugin86;

// ../../docs/types/text/known/dnsmasq/index.js
var plugin87 = {
  id: "dnsmasq",
  label: "dnsmasq",
  tags: ["dns", "dhcp", "networking", "dnsmasq"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "dnsmasq.conf";
  },
  loadRenderer: () => import("../types/text/known/dnsmasq/renderer.js"),
  about: {
    description: "dnsmasq configuration — DNS forwarding, local DNS overrides, and DHCP server settings.",
    usedFor: [{ label: "dnsmasq", description: "Lightweight DNS forwarder and DHCP server for small networks", href: "https://thekelleys.org.uk/dnsmasq/doc.html" }]
  }
};
var dnsmasq_default = plugin87;

// ../../docs/types/text/toml/known/frpc-config/index.js
var plugin88 = {
  id: "frpc-config",
  label: "FRP Client Config",
  tags: ["frp", "proxy", "tunnel", "toml"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "frpc.toml" || n === "frpc.ini";
  },
  loadRenderer: () => import("../types/text/toml/known/frpc-config/renderer.js")
};

// ../../docs/types/text/toml/known/frps-config/index.js
var plugin89 = {
  id: "frps-config",
  label: "FRP Server Config",
  tags: ["frp", "proxy", "server", "toml"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "frps.toml" || n === "frps.ini";
  },
  loadRenderer: () => import("../types/text/toml/known/frps-config/renderer.js")
};

// ../../docs/types/text/known/pdns-conf/index.js
var plugin90 = {
  id: "pdns-conf",
  label: "PowerDNS Authoritative Config",
  tags: ["powerdns", "pdns", "dns", "authoritative"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "pdns.conf";
  },
  loadRenderer: () => import("../types/text/known/pdns-conf/renderer.js")
};

// ../../docs/types/text/known/pdns-recursor-conf/index.js
var plugin91 = {
  id: "pdns-recursor-conf",
  label: "PowerDNS Recursor Config",
  tags: ["powerdns", "pdns", "dns", "recursor", "resolver"],
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "recursor.conf" || n === "pdns-recursor.conf";
  },
  loadRenderer: () => import("../types/text/known/pdns-recursor-conf/renderer.js")
};

// ../../docs/types/text/known/corosync-conf/index.js
var corosync_conf_default = {
  id: "corosync-conf",
  label: "Corosync Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "corosync.conf") return true;
    const text = intake.textSample || intake.text || "";
    if (text.includes("totem {") && text.includes("quorum {")) return true;
    if (text.includes("cluster_name:") && (text.includes("transport:") || text.includes("provider:"))) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/corosync-conf/renderer.js"),
  about: {
    description: "Corosync cluster messaging layer configuration — defines totem ring settings, quorum policy, node list, and logging for high-availability Linux clusters.",
    usedFor: [{ label: "Corosync", description: "Cluster messaging layer implementing the Totem Single-Ring Ordering and Membership protocol", href: "https://corosync.github.io/corosync/" }]
  }
};

// ../../docs/types/text/known/nushell-config/index.js
var nushell_config_default = {
  id: "nushell-config",
  label: "Nushell Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "config.nu" || n === "env.nu" || n === "login.nu") return true;
    const text = intake.textSample || intake.text || "";
    if (text.includes("$env.config") || text.includes("use std") || text.includes("let-env")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/nushell-config/renderer.js"),
  about: {
    description: "Nushell shell configuration — defines settings, keybindings, menus, aliases, and custom commands for the Nu shell.",
    usedFor: [{ label: "Nushell", description: "A new type of shell that works with structured data", href: "https://www.nushell.sh/" }]
  }
};

// ../../docs/types/text/known/gitolite-conf/index.js
var gitolite_conf_default = {
  id: "gitolite-conf",
  label: "Gitolite config",
  match(intake) {
    const f = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return f === "gitolite.conf" || (intake.filename || "").replace(/\\/g, "/").endsWith("conf/gitolite.conf");
  },
  loadRenderer: () => import("../types/text/known/gitolite-conf/renderer.js"),
  about: {
    description: "Gitolite git repository hosting configuration — defines groups, repos, and per-user/group access permissions.",
    usedFor: [
      { label: "Gitolite", description: "Highly customisable git server access control, managed entirely via git.", href: "https://gitolite.com/gitolite/conf.html" }
    ]
  }
};

// ../../docs/types/text/yaml/known/homer-config/index.js
var homer_config_default = {
  id: "homer-config",
  label: "Homer Dashboard",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n !== "config.yml" && n !== "homer.yml") return false;
    const text = intake.text || "";
    return text.includes("services:") && (text.includes("subtitle:") || text.includes("logo:") || text.includes("header:"));
  },
  loadRenderer: () => import("../types/text/yaml/known/homer-config/renderer.js"),
  about: {
    description: "Homer self-hosted dashboard configuration — defines title, services, links, and appearance settings.",
    usedFor: [
      { label: "Self-hosted dashboards", description: "Configure a Homer startpage with service groups, links, and theme settings.", href: "https://github.com/bastienwirtz/homer" }
    ]
  }
};

// ../../docs/types/text/json/known/uptime-kuma-config/index.js
var uptime_kuma_config_default = {
  id: "uptime-kuma-config",
  label: "Uptime Kuma Config",
  match(intake, baseType) {
    if (baseType?.id !== "json") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n !== "config.json" && n !== "uptime-kuma.json") return false;
    const parsed = intake.parsed ?? (() => {
      try {
        return JSON.parse(intake.text || "{}");
      } catch {
        return {};
      }
    })();
    return "disableAuth" in parsed || "trustProxy" in parsed || "port" in parsed && "demoMode" in parsed;
  },
  loadRenderer: () => import("../types/text/json/known/uptime-kuma-config/renderer.js"),
  about: {
    description: "Uptime Kuma monitoring server configuration — auth, proxy, rate limiting, and server settings.",
    usedFor: [
      { label: "Uptime monitoring", description: "Self-hosted uptime monitoring tool configuration with server and auth settings.", href: "https://github.com/louislam/uptime-kuma" }
    ]
  }
};

// ../../docs/types/text/known/miniflux-conf/index.js
var miniflux_conf_default = {
  id: "miniflux-conf",
  label: "Miniflux Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "miniflux.conf";
  },
  loadRenderer: () => import("../types/text/known/miniflux-conf/renderer.js"),
  about: {
    description: "Miniflux RSS reader environment-variable configuration (key=value style).",
    tags: ["miniflux", "rss", "atom", "feed-reader", "config"]
  }
};

// ../../docs/types/text/json/known/ghost-config/index.js
var ghost_config_default = {
  id: "ghost-config",
  label: "Ghost CMS Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "config.production.json" || n === "config.development.json";
  },
  loadRenderer: () => import("../types/text/json/known/ghost-config/renderer.js"),
  about: {
    description: "Ghost CMS configuration — server, database, mail, storage, and logging settings.",
    tags: ["ghost", "cms", "blog", "config"]
  }
};

// ../../docs/types/text/known/mealie-config/index.js
var mealie_config_default = {
  id: "mealie-config",
  label: "Mealie Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "mealie.env";
  },
  loadRenderer: () => import("../types/text/known/mealie-config/renderer.js"),
  about: {
    description: "Mealie recipe manager environment-variable configuration (key=value style).",
    tags: ["mealie", "recipe", "meal-planning", "self-hosted", "config"]
  }
};

// ../../docs/types/text/known/immich-config/index.js
var immich_config_default = {
  id: "immich-config",
  label: "Immich Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "immich.env";
  },
  loadRenderer: () => import("../types/text/known/immich-config/renderer.js"),
  about: {
    description: "Immich photo/video management environment-variable configuration (key=value style).",
    tags: ["immich", "photos", "video", "self-hosted", "config"]
  }
};

// ../../docs/types/text/yaml/known/photoprism-config/index.js
var photoprism_config_default = {
  id: "photoprism-config",
  label: "PhotoPrism Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n !== "options.yml" && n !== "photoprism-options.yml") return false;
    const text = intake.text || "";
    return text.includes("AdminPassword") || text.includes("OriginalsPath") || text.includes("ThumbnailsPath");
  },
  loadRenderer: () => import("../types/text/yaml/known/photoprism-config/renderer.js"),
  about: {
    description: "PhotoPrism photo management configuration — server, storage, database, and content settings.",
    tags: ["photoprism", "photos", "gallery", "config"]
  }
};

// ../../docs/types/text/known/paperless-conf/index.js
var paperless_conf_default = {
  id: "paperless-conf",
  label: "Paperless-ngx Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "paperless.conf";
  },
  loadRenderer: () => import("../types/text/known/paperless-conf/renderer.js"),
  about: {
    description: "Paperless-ngx document management configuration — database, OCR, storage, and admin settings.",
    tags: ["paperless", "paperless-ngx", "documents", "ocr", "config"]
  }
};

// ../../docs/types/text/known/bookstack-config/index.js
var bookstack_config_default = {
  id: "bookstack-config",
  label: "BookStack Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "bookstack.env") return true;
    const text = intake.text || "";
    return text.includes("APP_KEY") && text.includes("APP_URL") && text.toLowerCase().includes("bookstack");
  },
  loadRenderer: () => import("../types/text/known/bookstack-config/renderer.js"),
  about: {
    description: "BookStack self-hosted wiki/documentation platform environment config (Laravel-based) — app, database, mail, auth, cache, and storage settings.",
    tags: ["bookstack", "wiki", "knowledge-base", "laravel", "env", "self-hosted"]
  }
};

// ../../docs/types/text/known/bookstack-env/index.js
var bookstack_env_default = {
  id: "bookstack-env",
  label: "BookStack Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "bookstack.env";
  },
  loadRenderer: () => import("../types/text/known/bookstack-env/renderer.js"),
  about: {
    description: "BookStack wiki/knowledge-base Laravel .env — application, database, email, cache, and storage settings.",
    tags: ["bookstack", "wiki", "knowledge-base", "laravel", "env"]
  }
};

// ../../docs/types/text/json/known/mattermost-config/index.js
var mattermost_config_default = {
  id: "mattermost-config",
  label: "Mattermost Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n !== "config.json" && n !== "mattermost-config.json") return false;
    const parsed = intake.parsed ?? (() => {
      try {
        return JSON.parse(intake.text || "{}");
      } catch {
        return {};
      }
    })();
    return "ServiceSettings" in parsed && ("SqlSettings" in parsed || "TeamSettings" in parsed);
  },
  loadRenderer: () => import("../types/text/json/known/mattermost-config/renderer.js"),
  about: {
    description: "Mattermost team messaging server configuration — service, database, email, file storage, and team settings.",
    tags: ["mattermost", "team-messaging", "chat", "config"]
  }
};

// ../../docs/types/text/json/known/filebrowser-config/index.js
var filebrowser_config_default = {
  id: "filebrowser-config",
  label: "File Browser Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "filebrowser.json" || n === ".filebrowser.json") return true;
    const cfg = intake.parsed || {};
    return cfg.address !== void 0 && cfg.root !== void 0 && cfg.database !== void 0;
  },
  loadRenderer: () => import("../types/text/json/known/filebrowser-config/renderer.js"),
  about: {
    description: "File Browser self-hosted web file manager configuration — server, auth, TLS, and access settings.",
    tags: ["filebrowser", "file-manager", "self-hosted", "config"]
  }
};

// ../../docs/types/text/known/netbox-config/index.js
var netbox_config_default = {
  id: "netbox-config",
  label: "NetBox Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n !== "configuration.py" && n !== "netbox-configuration.py") return false;
    const text = intake.text || "";
    return text.includes("ALLOWED_HOSTS") && (text.includes("DATABASE") || text.includes("REDIS")) && text.includes("SECRET_KEY");
  },
  loadRenderer: () => import("../types/text/known/netbox-config/renderer.js"),
  about: {
    description: "NetBox DCIM/IPAM network documentation tool Django configuration — database, Redis, secrets, allowed hosts, localization, and plugins.",
    tags: ["netbox", "dcim", "ipam", "django", "network", "config"]
  }
};

// ../../docs/types/text/known/vaultwarden-env/index.js
var vaultwarden_env_default = {
  id: "vaultwarden-env",
  label: "Vaultwarden Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "vaultwarden.env";
  },
  loadRenderer: () => import("../types/text/known/vaultwarden-env/renderer.js"),
  about: {
    description: "Vaultwarden (Bitwarden_RS fork) environment-variable configuration — server, security, database, email, and logging settings.",
    tags: ["vaultwarden", "bitwarden", "password-manager", "self-hosted", "config"]
  }
};

// ../../docs/types/text/yaml/known/ntfy-config/index.js
var ntfy_config_default = {
  id: "ntfy-config",
  label: "ntfy Server Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n !== "server.yml" && n !== "ntfy-server.yml") return false;
    const text = intake.text || "";
    return text.includes("base-url:") && (text.includes("listen-http:") || text.includes("auth-default-access:") || text.includes("upstream-base-url:"));
  },
  loadRenderer: () => import("../types/text/yaml/known/ntfy-config/renderer.js")
};

// ../../docs/types/text/yaml/known/wakapi-config/index.js
var wakapi_config_default = {
  id: "wakapi-config",
  label: "Wakapi Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "wakapi.yaml" || n === "wakapi.yml" || n === "wakapi.cfg") return true;
    const text = intake.text || "";
    if (text.includes("security.password_salt:") || text.includes("password_salt:")) return true;
    if (text.includes("aggregation_time:") && text.includes("server:") && text.includes("db:")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/yaml/known/wakapi-config/renderer.js"),
  about: {
    description: "Wakapi self-hosted coding activity tracker (WakaTime-compatible) configuration file.",
    tags: ["wakapi", "wakatime", "coding-stats", "self-hosted", "config"]
  }
};

// ../../docs/types/text/known/outline-config/index.js
var outline_config_default = {
  id: "outline-config",
  label: "Outline Wiki Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "outline.env";
  },
  loadRenderer: () => import("../types/text/known/outline-config/renderer.js"),
  about: {
    description: "Outline wiki server environment-variable configuration — server, security, database, Redis, S3 storage, OIDC auth, and email settings.",
    tags: ["outline", "wiki", "knowledge-base", "self-hosted", "config"]
  }
};

// ../../docs/types/text/known/linkding-config/index.js
var linkding_config_default = {
  id: "linkding-config",
  label: "Linkding Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "linkding.env";
  },
  loadRenderer: () => import("../types/text/known/linkding-config/renderer.js"),
  about: {
    description: "Linkding bookmark manager environment-variable configuration — admin, server, database, auth proxy, and feature settings.",
    tags: ["linkding", "bookmarks", "self-hosted", "config"]
  }
};

// ../../docs/types/text/known/plausible-config/index.js
var plausible_config_default = {
  id: "plausible-config",
  label: "Plausible Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "plausible.env") return true;
    const text = intake.text || intake.textSample || "";
    return text.includes("SECRET_KEY_BASE") && text.includes("BASE_URL") && text.includes("CLICKHOUSE_DATABASE_URL");
  },
  loadRenderer: () => import("../types/text/known/plausible-config/renderer.js"),
  about: {
    description: "Plausible Analytics self-hosted server environment configuration — server, security, database, email, and OAuth settings.",
    usedFor: [
      { label: "Plausible Analytics", description: "Privacy-friendly open-source web analytics, self-hosted edition.", href: "https://plausible.io/docs/self-hosting-configuration" }
    ]
  }
};

// ../../docs/types/text/known/umami-config/index.js
var umami_config_default = {
  id: "umami-config",
  label: "Umami Analytics Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "umami.env";
  },
  loadRenderer: () => import("../types/text/known/umami-config/renderer.js"),
  about: {
    description: "Umami website analytics self-hosted server environment configuration — server, security, database, privacy, and embed settings.",
    tags: ["umami", "analytics", "self-hosted", "config"]
  }
};

// ../../docs/types/text/yaml/known/stirling-pdf-config/index.js
var stirling_pdf_config_default = {
  id: "stirling-pdf-config",
  label: "Stirling-PDF Settings",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "stirling-pdf-settings.yml" || n === "stirling-pdf-settings.yaml") return true;
    const nameMatch = n === "settings.yml" || n === "settings.yaml";
    if (!nameMatch) return false;
    const cfg = intake.parsed || {};
    const hasUi = cfg.ui && typeof cfg.ui === "object" && (cfg.ui.appName || cfg.ui["app-name"] || cfg.ui.homeDescription);
    const hasSecurity = cfg.security && typeof cfg.security === "object";
    return !!(hasUi && hasSecurity);
  },
  loadRenderer: () => import("../types/text/yaml/known/stirling-pdf-config/renderer.js"),
  about: {
    description: "Stirling PDF self-hosted PDF tools web application settings — security, UI, system, endpoints, and metrics.",
    tags: ["stirling-pdf", "pdf", "self-hosted", "config"]
  }
};

// ../../docs/types/text/known/monica-config/index.js
var monica_config_default = {
  id: "monica-config",
  label: "Monica CRM Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "monica.env";
  },
  loadRenderer: () => import("../types/text/known/monica-config/renderer.js"),
  about: {
    description: "Monica Personal CRM environment-variable configuration — application, database, email, limits, and features.",
    tags: ["monica", "crm", "personal", "self-hosted", "config"]
  }
};

// ../../docs/types/text/known/n8n-config/index.js
var n8n_config_default = {
  id: "n8n-config",
  label: "n8n Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "n8n.env";
  },
  loadRenderer: () => import("../types/text/known/n8n-config/renderer.js"),
  about: {
    description: "n8n workflow automation server environment-variable configuration — server, auth, database, execution, and logging settings.",
    tags: ["n8n", "workflow", "automation", "self-hosted", "config"]
  }
};

// ../../docs/types/text/known/nocodb-config/index.js
var nocodb_config_default = {
  id: "nocodb-config",
  label: "NocoDB Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "nocodb.env";
  },
  loadRenderer: () => import("../types/text/known/nocodb-config/renderer.js"),
  about: {
    description: "NocoDB open-source Airtable alternative environment-variable configuration — server, security, database, Redis, and email settings.",
    tags: ["nocodb", "airtable", "database", "self-hosted", "config"]
  }
};

// ../../docs/types/text/known/plane-config/index.js
var plane_config_default = {
  id: "plane-config",
  label: "Plane Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "plane.env";
  },
  loadRenderer: () => import("../types/text/known/plane-config/renderer.js"),
  about: {
    description: "Plane project management .env — server, security, database, Redis, S3/MinIO storage, email, and auth settings.",
    tags: ["plane", "project-management", "jira-alternative", "linear-alternative", "env"]
  }
};

// ../../docs/types/text/known/infisical-config/index.js
var infisical_config_default = {
  id: "infisical-config",
  label: "Infisical Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "infisical.env";
  },
  loadRenderer: () => import("../types/text/known/infisical-config/renderer.js"),
  about: {
    description: "Infisical secrets management platform .env — server, security/JWT, MongoDB, Redis, SMTP email, and signup settings.",
    tags: ["infisical", "secrets", "secrets-management", "env"]
  }
};

// ../../docs/types/text/yaml/known/diun-config/index.js
var diun_config_default = {
  id: "diun-config",
  label: "Diun Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "diun.yaml" || n === "diun.yml") return true;
    const cfg = intake.parsed || {};
    return !!cfg.watch && !!(cfg.providers || cfg.notif);
  },
  loadRenderer: () => import("../types/text/yaml/known/diun-config/renderer.js"),
  about: {
    description: "Diun (Docker Image Update Notifier) configuration — watch schedule, providers, and notification channels.",
    usedFor: [{ label: "Docker image update notifications", description: "Monitor Docker image updates and notify via Slack, Telegram, Discord, mail, and more.", href: "https://crazymax.dev/diun/" }]
  }
};

// ../../docs/types/text/known/hoppscotch-config/index.js
var hoppscotch_config_default = {
  id: "hoppscotch-config",
  label: "Hoppscotch Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "hoppscotch.env";
  },
  loadRenderer: () => import("../types/text/known/hoppscotch-config/renderer.js")
};

// ../../docs/types/text/known/twenty-crm-config/index.js
var twenty_crm_config_default = {
  id: "twenty-crm-config",
  label: "Twenty CRM Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "twenty.env";
  },
  loadRenderer: () => import("../types/text/known/twenty-crm-config/renderer.js")
};

// ../../docs/types/text/yaml/known/vikunja-config/index.js
var vikunja_config_default = {
  id: "vikunja-config",
  label: "Vikunja Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n !== "config.yml" && n !== "vikunja.yml") return false;
    const text = intake.text || "";
    return text.includes("jwtttl") || text.includes("frontendurl") && text.includes("database:");
  },
  loadRenderer: () => import("../types/text/yaml/known/vikunja-config/renderer.js"),
  about: {
    description: "Vikunja task management server configuration — service, database, Redis, mail, and file storage settings.",
    usedFor: [{ label: "Vikunja", description: "Vikunja is an open-source, self-hosted task management server (Todoist/TickTick alternative).", href: "https://vikunja.io/" }]
  }
};

// ../../docs/types/text/known/grist-config/index.js
var grist_config_default = {
  id: "grist-config",
  label: "Grist Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "grist.env") return true;
    return (intake.text || "").includes("GRIST_SESSION_SECRET");
  },
  loadRenderer: () => import("../types/text/known/grist-config/renderer.js"),
  about: {
    description: "Grist self-hosted spreadsheet/database environment configuration — app, auth, database, storage, sandbox, and OAuth settings.",
    usedFor: [{ label: "Grist", description: "Grist is an open-source, self-hosted modern relational spreadsheet and collaborative database.", href: "https://www.getgrist.com/" }]
  }
};

// ../../docs/types/text/known/appsmith-config/index.js
var appsmith_config_default = {
  id: "appsmith-config",
  label: "Appsmith Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "appsmith.env";
  },
  loadRenderer: () => import("../types/text/known/appsmith-config/renderer.js"),
  about: {
    description: "Appsmith low-code app builder environment configuration — encryption, database, Redis, email, OAuth, and feature flags.",
    usedFor: [{ label: "Appsmith", description: "Appsmith is an open-source low-code platform for building internal tools.", href: "https://www.appsmith.com/" }]
  }
};

// ../../docs/types/text/known/glitchtip-config/index.js
var glitchtip_config_default = {
  id: "glitchtip-config",
  label: "GlitchTip Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "glitchtip.env";
  },
  loadRenderer: () => import("../types/text/known/glitchtip-config/renderer.js"),
  about: {
    description: "GlitchTip open-source error tracking (Sentry alternative) environment configuration — server, security, database, Redis, email, and OAuth settings.",
    usedFor: [{ label: "GlitchTip", description: "GlitchTip is an open-source Sentry-alternative error tracking platform.", href: "https://glitchtip.com/" }]
  }
};

// ../../docs/types/text/known/archivebox-config/index.js
var archivebox_config_default = {
  id: "archivebox-config",
  label: "ArchiveBox Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "archivebox.conf") return true;
    if (n === "archivebox.conf") return true;
    const nRaw = (intake.name || intake.filename || "").split("/").pop();
    if (nRaw === "ArchiveBox.conf") return true;
    if (n === ".env" || n.endsWith(".conf") || n.endsWith(".env")) {
      const text = intake.text || "";
      return text.includes("SAVE_WGET") && text.includes("SAVE_PDF");
    }
    return false;
  },
  loadRenderer: () => import("../types/text/known/archivebox-config/renderer.js"),
  about: {
    description: "ArchiveBox web archiving tool configuration — server, security, admin, archiving formats, limits, and binaries.",
    usedFor: [{ label: "ArchiveBox", description: "ArchiveBox is an open-source self-hosted web archiving tool.", href: "https://archivebox.io/" }]
  }
};

// ../../docs/types/text/known/memos-config/index.js
var memos_config_default = {
  id: "memos-config",
  label: "Memos Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "memos.env") return true;
    if (n === ".env" || n.endsWith(".env")) {
      const text = intake.text || "";
      if (text.includes("MEMOS_PORT")) return true;
      if (text.includes("MEMOS_MODE") && text.includes("MEMOS_DSN")) return true;
    }
    return false;
  },
  loadRenderer: () => import("../types/text/known/memos-config/renderer.js"),
  about: {
    description: "Memos self-hosted lightweight note-taking server configuration — server, database, auth, and metrics settings.",
    usedFor: [{ label: "Memos", description: "Memos is an open-source self-hosted lightweight note-taking server.", href: "https://usememos.com/" }]
  }
};

// ../../docs/types/text/yaml/known/dex-config/index.js
var dex_config_default = {
  id: "dex-config",
  label: "Dex OIDC Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n !== "dex.yaml" && n !== "dex.yml" && n !== "config.yaml") return false;
    const text = intake.text || "";
    return text.includes("issuer:") && (text.includes("connectors:") || text.includes("staticClients:") || text.includes("enablePasswordDB:"));
  },
  loadRenderer: () => import("../types/text/yaml/known/dex-config/renderer.js")
};

// ../../docs/types/text/toml/known/lldap-config/index.js
var lldap_config_default = {
  id: "lldap-config",
  label: "LLDAP Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "lldap_config.toml";
  },
  loadRenderer: () => import("../types/text/toml/known/lldap-config/renderer.js")
};

// ../../docs/types/text/yaml/known/invidious-config/index.js
var invidious_config_default = {
  id: "invidious-config",
  label: "Invidious Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "invidious-config.yml" || n === "invidious-config.yaml" || n === "invidious.yml") return true;
    const cfg = intake.parsed || {};
    return !!cfg.db && typeof cfg.db === "object" && cfg.hmac_key !== void 0;
  },
  loadRenderer: () => import("../types/text/yaml/known/invidious-config/renderer.js"),
  about: {
    description: "Invidious self-hosted YouTube frontend configuration — server binding, PostgreSQL database, security keys, performance threads, feature flags, and default user preferences.",
    usedFor: [{ label: "Invidious", description: "Privacy-respecting self-hosted YouTube frontend", href: "https://github.com/iv-org/invidious" }]
  }
};

// ../../docs/types/text/toml/known/listmonk-config/index.js
var listmonk_config_default = {
  id: "listmonk-config",
  label: "Listmonk Config",
  match(intake, baseType) {
    if (baseType?.id !== "toml") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n !== "config.toml" && n !== "listmonk-config.toml") return false;
    const text = intake.text || "";
    const hasApp = /^\s*\[app\]/m.test(text);
    const hasDb = /^\s*\[db\]/m.test(text);
    const hasSmtp = /^\s*\[\[?smtp/m.test(text);
    const hasAdminUser = /^\s*admin_username\s*=/m.test(text);
    return hasApp && hasDb && (hasSmtp || hasAdminUser);
  },
  loadRenderer: () => import("../types/text/toml/known/listmonk-config/renderer.js"),
  about: {
    description: "Listmonk self-hosted newsletter and mailing list manager configuration — app server, database, and SMTP settings.",
    tags: ["listmonk", "newsletter", "mailing-list", "self-hosted", "config"]
  }
};

// ../../docs/types/text/known/windmill-config/index.js
var windmill_config_default = {
  id: "windmill-config",
  label: "Windmill Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "windmill.env";
  },
  loadRenderer: () => import("../types/text/known/windmill-config/renderer.js"),
  about: {
    description: "Windmill workflow automation platform environment configuration — server, security, database, workers, and runtime paths.",
    tags: ["windmill", "workflow", "automation", "self-hosted", "config"]
  }
};

// ../../docs/types/text/yaml/known/komga-config/index.js
var komga_config_default = {
  id: "komga-config",
  label: "Komga Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n !== "application.yml" && n !== "komga.yml") return false;
    const text = intake.text || "";
    return text.includes("komga:") || text.includes("komga.");
  },
  loadRenderer: () => import("../types/text/yaml/known/komga-config/renderer.js"),
  about: {
    description: "Komga comic/manga server (Spring Boot YAML) configuration — server port, library scan schedule, database backup, and OAuth2 client registrations.",
    tags: ["komga", "comics", "manga", "media-server", "spring-boot", "self-hosted", "config"]
  }
};

// ../../docs/types/text/known/coder-config/index.js
var coder_config_default = {
  id: "coder-config",
  label: "Coder Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "coder.env";
  },
  loadRenderer: () => import("../types/text/known/coder-config/renderer.js"),
  about: {
    description: "Coder cloud development environment platform configuration — access URL, TLS, PostgreSQL, Prometheus observability, GitHub OAuth2, and OIDC settings.",
    tags: ["coder", "dev-environments", "remote-development", "self-hosted", "config"]
  }
};

// ../../docs/types/text/known/cal-com-config/index.js
var cal_com_config_default = {
  id: "cal-com-config",
  label: "Cal.com Config",
  match(intake) {
    const text = intake.text || "";
    return text.includes("CALENDSO_ENCRYPTION_KEY") || text.includes("NEXT_PUBLIC_WEBAPP_URL");
  },
  loadRenderer: () => import("../types/text/known/cal-com-config/renderer.js"),
  about: {
    description: "Cal.com self-hosted scheduling platform environment configuration — server URL, auth secrets, database, email, storage, and Stripe integration.",
    tags: ["cal.com", "calendso", "scheduling", "self-hosted", "nextjs", "env"]
  }
};

// ../../docs/types/text/known/rallly-config/index.js
var rallly_config_default = {
  id: "rallly-config",
  label: "Rallly Config",
  match(intake) {
    const text = intake.text || "";
    return text.includes("SECRET_PASSWORD") && text.includes("NEXT_PUBLIC_BASE_URL") && (text.includes("NOREPLY_EMAIL") || text.includes("SMTP_HOST"));
  },
  loadRenderer: () => import("../types/text/known/rallly-config/renderer.js"),
  about: {
    description: "Rallly open-source scheduling and poll app environment configuration — base URL, auth, database, email/SMTP, and access control.",
    tags: ["rallly", "scheduling", "doodle", "polls", "self-hosted", "nextjs", "env"]
  }
};

// ../../docs/types/text/known/woodpecker-agent-config/index.js
var woodpecker_agent_config_default = {
  id: "woodpecker-agent-config",
  label: "Woodpecker CI Agent Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "woodpecker-agent.env";
  },
  loadRenderer: () => import("../types/text/known/woodpecker-agent-config/renderer.js"),
  about: {
    description: "Woodpecker CI agent environment configuration — server connection, authentication, capacity, backend, and pipeline settings.",
    tags: ["woodpecker", "ci", "agent", "pipeline", "self-hosted", "config"]
  }
};

// ../../docs/types/text/yaml/known/act-runner-config/index.js
var act_runner_config_default = {
  id: "act-runner-config",
  label: "Act Runner Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "act_runner.yaml" || n === "act-runner.yaml";
  },
  loadRenderer: () => import("../types/text/yaml/known/act-runner-config/renderer.js"),
  about: {
    description: "Gitea Act Runner configuration — the GitHub Actions-compatible CI runner for Gitea. Controls log level, runner capacity, labels, cache, container networking, and host workdir settings.",
    usedFor: [{ label: "Gitea CI", description: "Act Runner for Gitea GitHub Actions-compatible pipelines", href: "https://gitea.com/gitea/act_runner" }]
  }
};

// ../../docs/types/text/known/vaultwarden-config/index.js
var vaultwarden_config_default = {
  id: "vaultwarden-config",
  label: "Vaultwarden Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "vaultwarden.env") return true;
    const text = intake.text || "";
    return text.includes("ADMIN_TOKEN") && text.includes("SIGNUPS_ALLOWED");
  },
  loadRenderer: () => import("../types/text/known/vaultwarden-config/renderer.js"),
  about: {
    description: "Vaultwarden (self-hosted Bitwarden) environment configuration — server, admin, database, attachments, SMTP, push notifications, and security settings.",
    usedFor: [{ label: "Self-hosted passwords", description: "Vaultwarden Bitwarden-compatible self-hosted server", href: "https://github.com/dani-garcia/vaultwarden" }]
  }
};

// ../../docs/types/text/known/keycloak-config/index.js
var keycloak_config_default = {
  id: "keycloak-config",
  label: "Keycloak Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "keycloak.conf" || n === "keycloak.properties") return true;
    const text = intake.text || "";
    return text.includes("KC_DB") && (text.includes("KC_HOSTNAME") || text.includes("KC_HTTP_PORT"));
  },
  loadRenderer: () => import("../types/text/known/keycloak-config/renderer.js"),
  about: {
    description: "Keycloak identity and access management server configuration — database, hostname, admin credentials, features, cache, proxy, and TLS settings.",
    usedFor: [{ label: "Identity & Access Management", description: "Keycloak open-source IAM solution", href: "https://www.keycloak.org/" }]
  }
};

// ../../docs/types/text/known/minio-config/index.js
var minio_config_default = {
  id: "minio-config",
  label: "MinIO Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "minio.env") return true;
    const text = intake.text || "";
    return text.includes("MINIO_ROOT_USER") && text.includes("MINIO_ROOT_PASSWORD");
  },
  loadRenderer: () => import("../types/text/known/minio-config/renderer.js"),
  about: {
    description: "MinIO object storage environment-variable configuration (key=value style).",
    tags: ["minio", "object-storage", "s3", "self-hosted", "config"]
  }
};

// ../../docs/types/text/known/drone-config/index.js
var drone_config_default = {
  id: "drone-config",
  label: "Drone CI Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "drone.env") return true;
    return (intake.text || "").includes("DRONE_RPC_SECRET");
  },
  loadRenderer: () => import("../types/text/known/drone-config/renderer.js"),
  about: {
    description: "Drone CI server environment-variable configuration — server, RPC, OAuth providers, database, S3, and logging settings.",
    tags: ["drone", "drone-ci", "ci", "cd", "continuous-integration", "config"]
  }
};

// ../../docs/types/text/json/known/sftpgo-config/index.js
var sftpgo_config_default = {
  id: "sftpgo-config",
  label: "SFTPGo Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "sftpgo.json" || n === "sftpgo.yaml" || n === "sftpgo.yml") return true;
    const cfg = intake.parsed || {};
    return !!cfg.data_provider && !!(cfg.httpd || cfg.sftpd);
  },
  loadRenderer: () => import("../types/text/json/known/sftpgo-config/renderer.js"),
  about: {
    description: "SFTPGo SFTP/FTP/WebDAV server configuration — data provider, listeners, HTTP admin UI, telemetry, and connection limits.",
    tags: ["sftpgo", "sftp", "ftp", "webdav", "file-transfer", "self-hosted", "config"]
  }
};

// ../../docs/types/text/known/sonarqube-config/index.js
var sonarqube_config_default = {
  id: "sonarqube-config",
  label: "SonarQube Server Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return n === "sonar.properties" || n === "sonarqube.properties";
  },
  loadRenderer: () => import("../types/text/known/sonarqube-config/renderer.js"),
  about: {
    description: "SonarQube code quality server configuration — web host, database connection, Elasticsearch, authentication, and logging settings.",
    tags: ["sonarqube", "code-quality", "static-analysis", "devops", "config"]
  }
};

// ../../docs/types/text/known/concourse-config/index.js
var concourse_config_default = {
  id: "concourse-config",
  label: "Concourse CI Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "concourse.env") return true;
    const text = intake.text || "";
    return text.includes("CONCOURSE_") && (text.includes("CONCOURSE_POSTGRES_HOST") || text.includes("CONCOURSE_EXTERNAL_URL"));
  },
  loadRenderer: () => import("../types/text/known/concourse-config/renderer.js"),
  about: {
    description: "Concourse CI server environment configuration — external URL, database, authentication, keys, workers, and TLS settings.",
    tags: ["concourse", "ci", "pipeline", "devops", "config"]
  }
};

// ../../docs/types/text/known/invoiceninja-config/index.js
var invoiceninja_config_default = {
  id: "invoiceninja-config",
  label: "Invoice Ninja Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "invoiceninja.env") return true;
    const text = intake.text || "";
    return text.includes("APP_KEY") && text.includes("APP_URL") && (text.toLowerCase().includes("ninja") || text.includes("NINJA_ENVIRONMENT"));
  },
  loadRenderer: () => import("../types/text/known/invoiceninja-config/renderer.js"),
  about: {
    description: "Invoice Ninja self-hosted invoicing platform environment configuration — app, security, database, mail, storage, PDF, and queue settings.",
    tags: ["invoiceninja", "invoice", "invoicing", "self-hosted", "laravel", "config"]
  }
};

// ../../docs/types/text/toml/known/conduit-config/index.js
var conduit_config_default = {
  id: "conduit-config",
  label: "Conduit Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "conduit.toml") return true;
    const g = (intake.parsed || {}).global || {};
    return !!g.server_name && !!g.database_backend;
  },
  loadRenderer: () => import("../types/text/toml/known/conduit-config/renderer.js")
};

// ../../docs/types/text/yaml/known/zitadel-config/index.js
var zitadel_config_default = {
  id: "zitadel-config",
  label: "ZITADEL Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "zitadel.yaml" || n === "zitadel.yml") return true;
    const cfg = intake.parsed || {};
    return !!cfg.Database && !!cfg.ExternalDomain;
  },
  loadRenderer: () => import("../types/text/yaml/known/zitadel-config/renderer.js")
};

// ../../docs/types/text/yaml/known/dendrite-config/index.js
var dendrite_config_default = {
  id: "dendrite-config",
  label: "Dendrite Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "dendrite.yaml" || n === "dendrite.yml") return true;
    const cfg = intake.parsed || {};
    return !!(cfg.global && cfg.global.server_name) && !!cfg.client_api;
  },
  loadRenderer: () => import("../types/text/yaml/known/dendrite-config/renderer.js"),
  about: {
    description: "Matrix Dendrite server configuration — controls server identity, database backends, client API, media API, federation, metrics, and logging.",
    usedFor: [{ label: "Matrix Dendrite", description: "Second-generation Matrix homeserver written in Go", href: "https://github.com/matrix-org/dendrite" }]
  }
};

// ../../docs/types/text/known/watchtower-config/index.js
var watchtower_config_default = {
  id: "watchtower-config",
  label: "Watchtower Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "watchtower.env") return true;
    const text = intake.text || "";
    return text.includes("WATCHTOWER_CLEANUP") || text.includes("WATCHTOWER_SCHEDULE") || text.includes("WATCHTOWER_POLL_INTERVAL");
  },
  loadRenderer: () => import("../types/text/known/watchtower-config/renderer.js"),
  about: {
    description: "Watchtower automatic Docker container updater configuration — controls update schedule, cleanup behavior, notifications, registry credentials, and HTTP API.",
    usedFor: [{ label: "Watchtower", description: "Automatically update running Docker containers", href: "https://containrrr.dev/watchtower/" }]
  }
};

// ../../docs/types/text/known/changedetection-config/index.js
var changedetection_config_default = {
  id: "changedetection-config",
  label: "changedetection.io Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "changedetection.env") return true;
    const text = intake.text || "";
    return text.includes("PLAYWRIGHT_DRIVER_URL") || text.includes("WEBDRIVER_URL") && text.includes("HIDE_REFERER");
  },
  loadRenderer: () => import("../types/text/known/changedetection-config/renderer.js"),
  about: {
    description: "changedetection.io web page change monitoring environment configuration — app, browser, notification, proxy, and logging settings.",
    tags: ["changedetection", "monitoring", "web-scraping", "self-hosted", "config"]
  }
};

// ../../docs/types/text/json/known/semaphore-config/index.js
var semaphore_config_default = {
  id: "semaphore-config",
  label: "Semaphore Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "semaphore-config.json") return true;
    const cfg = intake.parsed || {};
    return !!cfg.web_host && !!(cfg.mysql || cfg.postgres || cfg.bolt) && !!cfg.cookie_hash;
  },
  loadRenderer: () => import("../types/text/json/known/semaphore-config/renderer.js"),
  about: {
    description: "Ansible Semaphore CI/CD task runner configuration — web, database, security, email, OIDC, Git, and LDAP settings.",
    tags: ["semaphore", "ansible", "ci-cd", "task-runner", "self-hosted", "config"]
  }
};

// ../../docs/types/text/json/known/actual-budget-config/index.js
var actual_budget_config_default = {
  id: "actual-budget-config",
  label: "Actual Budget Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "actual-config.json") return true;
    const cfg = intake.parsed || {};
    if (cfg.dataDir !== void 0 && cfg.serverFiles !== void 0) return true;
    const text = intake.text || "";
    return text.includes("ACTUAL_PORT") && text.includes("ACTUAL_DATA_DIR");
  },
  loadRenderer: () => import("../types/text/json/known/actual-budget-config/renderer.js"),
  about: {
    description: "Actual Budget personal finance server configuration — server, HTTPS, login, and upload settings.",
    tags: ["actual-budget", "finance", "self-hosted", "config"]
  }
};

// ../../docs/types/text/known/wallos-config/index.js
var wallos_config_default = {
  id: "wallos-config",
  label: "Wallos Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "wallos.env") return true;
    const text = intake.text || "";
    return text.includes("APP_NAME=Wallos") || text.includes("APP_NAME='Wallos'") || text.includes('APP_NAME="Wallos"');
  },
  loadRenderer: () => import("../types/text/known/wallos-config/renderer.js"),
  about: {
    description: "Wallos self-hosted subscription and expense tracker environment configuration.",
    tags: ["wallos", "subscriptions", "finance", "self-hosted", "env"]
  }
};

// ../../docs/types/text/known/open-webui-config/index.js
var open_webui_config_default = {
  id: "open-webui-config",
  label: "Open WebUI Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "open-webui.env") return true;
    return (intake.text || "").includes("WEBUI_SECRET_KEY");
  },
  loadRenderer: () => import("../types/text/known/open-webui-config/renderer.js"),
  about: {
    description: "Open WebUI self-hosted AI chat interface (for Ollama/OpenAI) environment configuration — server, backend, security, API keys, database, RAG, storage, and admin settings.",
    tags: ["open-webui", "ollama", "openai", "ai", "self-hosted", "env", "config"]
  }
};

// ../../docs/types/text/known/maybe-config/index.js
var maybe_config_default = {
  id: "maybe-config",
  label: "Maybe Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "maybe.env") return true;
    return (intake.text || "").includes("ACTIVE_RECORD_ENCRYPTION_DETERMINISTIC_KEY");
  },
  loadRenderer: () => import("../types/text/known/maybe-config/renderer.js"),
  about: {
    description: "Maybe Finance self-hosted personal finance app (Rails) environment configuration — app, security, database, email, features, and synth settings.",
    tags: ["maybe", "finance", "rails", "self-hosted", "env", "config"]
  }
};

// ../../docs/types/text/ini/known/netdata-config/index.js
var netdata_config_default = {
  id: "netdata-config",
  label: "Netdata Config (INI)",
  match(intake, baseType) {
    if (baseType?.id !== "ini") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "netdata.conf" || n === "netdata.conf.d") return true;
    const t = intake.text || "";
    if (t.includes("[global]") && t.includes("hostname") && t.includes("update every")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/ini/known/netdata-config/renderer.js"),
  about: {
    description: "Netdata real-time monitoring agent configuration — global settings, web API, plugins, and database engine.",
    usedFor: [{ label: "Netdata", description: "Real-time infrastructure monitoring with thousands of built-in metrics", href: "https://www.netdata.cloud/" }]
  }
};

// ../../docs/types/text/known/pocket-id-config/index.js
var pocket_id_config_default = {
  id: "pocket-id-config",
  label: "Pocket ID Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "pocket-id.env") return true;
    if (n === ".env") {
      const t = intake.text || "";
      if (t.includes("PUBLIC_APP_URL") && t.includes("TRUST_PROXY")) return true;
    }
    return false;
  },
  loadRenderer: () => import("../types/text/known/pocket-id-config/renderer.js"),
  about: {
    description: "Pocket ID OIDC identity provider configuration — application URL, security, SMTP, and auth settings.",
    usedFor: [{ label: "Pocket ID", description: "Simple OIDC identity provider with passkey support", href: "https://github.com/stonith404/pocket-id" }]
  }
};

// ../../docs/types/text/known/nzbget-config/index.js
var nzbget_config_default = {
  id: "nzbget-config",
  label: "NZBGet Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "nzbget.conf") return true;
    const text = intake.textSample || intake.text || "";
    if (text.includes("MainDir") && text.includes("TempDir") && text.includes("DestDir")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/nzbget-config/renderer.js"),
  about: {
    description: "NZBGet Usenet downloader configuration — paths, news servers, web control, and post-processing settings.",
    tags: ["nzbget", "usenet", "download", "config"]
  }
};

// ../../docs/types/text/ini/known/sabnzbd-config/index.js
var sabnzbd_config_default = {
  id: "sabnzbd-config",
  label: "SABnzbd Config",
  match(intake, baseType) {
    if (baseType?.id !== "ini") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "sabnzbd.ini") return true;
    const text = intake.textSample || intake.text || "";
    if (text.includes("[misc]") && text.includes("host =") && text.includes("port =") && text.includes("download_dir")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/ini/known/sabnzbd-config/renderer.js"),
  about: {
    description: "SABnzbd Usenet downloader configuration — web interface, paths, news servers, and sorting settings.",
    tags: ["sabnzbd", "usenet", "download", "config"]
  }
};

// ../../docs/types/text/known/joplin-server-config/index.js
var joplin_server_config_default = {
  id: "joplin-server-config",
  label: "Joplin Server",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "joplin.env") return true;
    const text = intake.text || "";
    if (n === ".env" && text.includes("JOPLIN_BASE_URL")) return true;
    if (n === ".env" && text.includes("APP_PORT") && text.includes("APP_BASE_URL") && text.includes("DB_CLIENT")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/joplin-server-config/renderer.js"),
  about: {
    description: "Joplin Server self-hosted note-taking server environment configuration — app, database, mailer, storage, and security settings.",
    tags: ["joplin", "notes", "note-taking", "self-hosted", "config"]
  }
};

// ../../docs/types/text/known/speedtest-tracker-config/index.js
var speedtest_tracker_config_default = {
  id: "speedtest-tracker-config",
  label: "Speedtest Tracker",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "speedtest-tracker.env") return true;
    const text = intake.text || "";
    if (n === ".env" && text.includes("SPEEDTEST_SCHEDULE")) return true;
    if (n === ".env" && text.includes("APP_KEY") && text.includes("SPEEDTEST_SERVER_IDS")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/speedtest-tracker-config/renderer.js"),
  about: {
    description: "Speedtest Tracker automated internet speed monitoring environment configuration — app, speedtest, database, auth, and notification settings.",
    tags: ["speedtest-tracker", "speedtest", "monitoring", "network", "self-hosted", "config"]
  }
};

// ../../docs/types/text/yaml/known/dozzle-config/index.js
var dozzle_config_default = {
  id: "dozzle-config",
  label: "Dozzle Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "dozzle.yaml" || n === "dozzle.yml") return true;
    const text = intake.textSample || intake.text || "";
    return text.includes("level:") && text.includes("auth:") && text.includes("addr:");
  },
  loadRenderer: () => import("../types/text/yaml/known/dozzle-config/renderer.js"),
  about: {
    description: "Dozzle Docker log viewer configuration — controls listen address, authentication, log level, analytics, hostname, and remote agent hosts.",
    usedFor: [
      { label: "Dozzle", description: "Real-time Docker log viewer", href: "https://dozzle.dev/" }
    ]
  }
};

// ../../docs/types/text/ini/known/forgejo-config/index.js
var forgejo_config_default = {
  id: "forgejo-config",
  label: "Forgejo Config",
  match(intake, baseType) {
    if (baseType?.id !== "ini") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "forgejo.ini") return true;
    return false;
  },
  loadRenderer: () => import("../types/text/ini/known/forgejo-config/renderer.js"),
  about: {
    description: "Forgejo self-hosted Git service configuration — server, database, repository, security, and service settings.",
    usedFor: [
      { label: "Forgejo", description: "Community-driven self-hosted Git service", href: "https://forgejo.org/" }
    ]
  }
};

// ../../docs/types/text/ini/known/glances-config/index.js
var glances_config_default = {
  id: "glances-config",
  label: "Glances config",
  match(intake, baseType) {
    if (baseType?.id !== "ini") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "glances.conf") return true;
    const t = intake.text || "";
    const hasGlancesSection = t.includes("[outputs]") || t.includes("[webserver]");
    const hasGlancesKey = t.includes("refresh") || t.includes("cached");
    return hasGlancesSection && hasGlancesKey;
  },
  loadRenderer: () => import("../types/text/ini/known/glances-config/renderer.js"),
  about: {
    description: "Glances cross-platform system monitoring tool configuration — defines refresh rates, webserver settings, stat sections, and thresholds.",
    usedFor: [
      { label: "Glances config", description: "Configure Glances system monitor refresh intervals, web interface, and enabled stat sections.", href: "https://glances.readthedocs.io/en/latest/config.html" }
    ]
  }
};

// ../../docs/types/text/yaml/known/homarr-config/index.js
var homarr_config_default = {
  id: "homarr-config",
  label: "Homarr dashboard config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "homarr.yaml" || n === "homarr.yml") return true;
    const t = intake.text || "";
    return t.includes("apps:") && t.includes("widgets:") && t.includes("sections:") && t.includes("name:");
  },
  loadRenderer: () => import("../types/text/yaml/known/homarr-config/renderer.js"),
  about: {
    description: "Homarr self-hosted application dashboard configuration — defines apps, widgets, integrations, and board layout.",
    usedFor: [
      { label: "Homarr dashboard", description: "Configure a Homarr startpage with application tiles, widgets, and service integrations.", href: "https://homarr.dev/docs/getting-started/after-the-installation/" }
    ]
  }
};

// ../../docs/types/text/json/known/kavita-config/index.js
var kavita_config_default = {
  id: "kavita-config",
  label: "Kavita Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "kavita-config.json" || n === "kavita-appsettings.json") return true;
    if (n === "appsettings.json") {
      const parsed = intake.parsed ?? (() => {
        try {
          return JSON.parse(intake.text || "{}");
        } catch {
          return {};
        }
      })();
      return parsed.TokenKey !== void 0 && parsed.Port !== void 0 && parsed.LoggingLevel !== void 0;
    }
    return false;
  },
  loadRenderer: () => import("../types/text/json/known/kavita-config/renderer.js"),
  about: {
    description: "Kavita self-hosted comic and book reader server configuration — port, security keys, logging level, cache, and backup settings.",
    tags: ["kavita", "comics", "books", "media-server", "self-hosted", "config"]
  }
};

// ../../docs/types/text/known/tandoor-config/index.js
var tandoor_config_default = {
  id: "tandoor-config",
  label: "Tandoor Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "tandoor.env") return true;
    const text = intake.text || "";
    if (text.includes("TANDOOR_PORT")) return true;
    if (text.includes("SECRET_KEY") && text.includes("POSTGRES_DB") && text.includes("POSTGRES_USER") && text.includes("TANDOOR")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/tandoor-config/renderer.js"),
  about: {
    description: "Tandoor self-hosted recipe manager environment configuration — app, database, Django, storage, and email settings.",
    usedFor: [{ label: "Tandoor", description: "Self-hosted recipe manager and meal planner.", href: "https://tandoor.dev" }]
  }
};

// ../../docs/types/text/known/audiobookshelf-config/index.js
var audiobookshelf_config_default = {
  id: "audiobookshelf-config",
  label: "Audiobookshelf Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "audiobookshelf.env" || n === "abs.env") return true;
    const text = intake.text || "";
    if (text.includes("AUDIOBOOKSHELF_UID")) return true;
    if (text.includes("CONFIG_PATH") && text.includes("METADATA_PATH") && /PORT\s*=\s*13378/.test(text)) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/audiobookshelf-config/renderer.js"),
  about: {
    description: "Audiobookshelf self-hosted audiobook and podcast server environment configuration — server, paths, auth, and system settings.",
    usedFor: [{ label: "Audiobookshelf", description: "Self-hosted audiobook and podcast server.", href: "https://www.audiobookshelf.org" }]
  }
};

// ../../docs/types/text/yaml/known/dashy-config/index.js
var dashy_config_default = {
  id: "dashy-config",
  label: "Dashy Dashboard",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "dashy.yml" || n === "dashy.yaml") {
      const text = intake.text || "";
      return text.includes("pageInfo") && text.includes("sections");
    }
    if (n === "conf.yml") {
      const parsed = intake.parsed || {};
      return typeof parsed.pageInfo === "object" && parsed.pageInfo !== null && Array.isArray(parsed.sections);
    }
    return false;
  },
  loadRenderer: () => import("../types/text/yaml/known/dashy-config/renderer.js"),
  about: {
    description: "Dashy self-hosted personal dashboard configuration — defines pages, sections, items, and app settings.",
    usedFor: [
      { label: "Self-hosted dashboards", description: "Configure a Dashy startpage with service sections, items, theming, and appearance settings.", href: "https://dashy.to" }
    ]
  }
};

// ../../docs/types/text/json/known/jellyseerr-config/index.js
var jellyseerr_config_default = {
  id: "jellyseerr-config",
  label: "Jellyseerr Config",
  match(intake, baseType) {
    if (baseType?.id !== "json") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "jellyseerr-settings.json") {
      return true;
    }
    if (n === "settings.json") {
      return intake.parsed && intake.parsed.clientId !== void 0 && intake.parsed.main !== void 0 && intake.parsed.main.apiKey !== void 0;
    }
    return false;
  },
  loadRenderer: () => import("../types/text/json/known/jellyseerr-config/renderer.js"),
  about: {
    description: "Jellyseerr media request manager configuration — app settings, security, Jellyfin integration, and notification agents.",
    usedFor: [
      { label: "Media requests", description: "Self-hosted media request and discovery manager for Jellyfin and Plex.", href: "https://github.com/Fallenbagel/jellyseerr" }
    ]
  }
};

// ../../docs/types/text/yaml/known/bazarr-config/index.js
var bazarr_config_default = {
  id: "bazarr-config",
  label: "Bazarr Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "bazarr.yaml" || n === "bazarr.yml") return true;
    const t = intake.text || "";
    const hasUseSonarr = t.includes("use_sonarr:") && t.includes("general:");
    const hasBothServices = t.includes("sonarr:") && t.includes("radarr:") && t.includes("general:") && t.includes("port:");
    return hasUseSonarr || hasBothServices;
  },
  loadRenderer: () => import("../types/text/yaml/known/bazarr-config/renderer.js"),
  about: {
    description: "Bazarr automatic subtitle downloader configuration for Sonarr and Radarr — defines server, integration, and subtitle preferences.",
    usedFor: [
      { label: "Bazarr", description: "Configure Bazarr to automatically download subtitles for your media library managed by Sonarr and Radarr.", href: "https://wiki.bazarr.media/Getting-Started/Setup-Guide/" }
    ]
  }
};

// ../../docs/types/text/yaml/known/scrutiny-config/index.js
var scrutiny_config_default = {
  id: "scrutiny-config",
  label: "Scrutiny Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "scrutiny.yaml" || n === "scrutiny.yml") return true;
    const t = intake.text || "";
    return t.includes("version:") && t.includes("web:") && t.includes("listen:") && t.includes("notify:");
  },
  loadRenderer: () => import("../types/text/yaml/known/scrutiny-config/renderer.js"),
  about: {
    description: "Scrutiny hard drive health monitoring dashboard configuration — defines web server, notifications, and logging settings.",
    usedFor: [
      { label: "Scrutiny", description: "Configure Scrutiny to monitor hard drive S.M.A.R.T. data and send health alerts.", href: "https://github.com/AnalogJ/scrutiny/blob/master/docs/CONFIGURATION.md" }
    ]
  }
};

// ../../docs/types/text/yaml/known/homepage-config/index.js
var homepage_config_default = {
  id: "homepage-config",
  label: "Homepage Dashboard Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const text = intake.text || "";
    if (n.endsWith("services.yaml") || n.endsWith("bookmarks.yaml")) {
      return /^-\s+\S.*:\s*$/m.test(text);
    }
    if (n.endsWith("widgets.yaml")) {
      return /^-\s+\S+:/m.test(text);
    }
    if (n.endsWith("settings.yaml")) {
      return /^title:/m.test(text) && /^background:/m.test(text);
    }
    return false;
  },
  loadRenderer: () => import("../types/text/yaml/known/homepage-config/renderer.js"),
  about: {
    description: "Homepage dashboard configuration — services, bookmarks, widgets, or settings YAML files.",
    tags: ["homepage", "dashboard", "self-hosted", "config"]
  }
};

// ../../docs/types/text/json/known/overseerr-config/index.js
var overseerr_config_default = {
  id: "overseerr-config",
  label: "Overseerr Config",
  match(intake, baseType) {
    if (baseType?.id !== "json") return false;
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "overseerr-settings.json") {
      return true;
    }
    if (n === "settings.json") {
      return intake.parsed && intake.parsed.clientId !== void 0 && intake.parsed.main !== void 0 && intake.parsed.plex !== void 0;
    }
    return false;
  },
  loadRenderer: () => import("../types/text/json/known/overseerr-config/renderer.js"),
  about: {
    description: "Overseerr media request manager configuration — app settings, security, Plex integration, and notification agents.",
    usedFor: [
      { label: "Media requests", description: "Self-hosted media request and discovery manager for Plex.", href: "https://overseerr.dev" }
    ]
  }
};

// ../../docs/types/text/known/freshrss-config/index.js
var freshrss_config_default = {
  id: "freshrss-config",
  label: "FreshRSS Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "freshrss.env") {
      return true;
    }
    if (n === ".env") {
      const text = intake.text || "";
      return text.includes("FRESHRSS_ENV") || text.includes("DATA_PATH") && text.includes("CRON_MIN") && text.includes("FRESHRSS");
    }
    return false;
  },
  loadRenderer: () => import("../types/text/known/freshrss-config/renderer.js"),
  about: {
    description: "FreshRSS self-hosted RSS feed aggregator environment configuration — app, auth, data, and database settings.",
    usedFor: [
      { label: "RSS aggregation", description: "Self-hosted RSS and Atom feed reader/aggregator.", href: "https://freshrss.org" }
    ]
  }
};

// ../../docs/types/text/known/wallabag-config/index.js
var wallabag_config_default = {
  id: "wallabag-config",
  label: "Wallabag Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "wallabag.env") return true;
    if (n === ".env") {
      const t = intake.text || "";
      return t.includes("SYMFONY__ENV__DATABASE_DRIVER") || t.includes("WALLABAG_URL") || t.includes("SYMFONY__ENV__SECRET");
    }
    return false;
  },
  loadRenderer: () => import("../types/text/known/wallabag-config/renderer.js"),
  about: {
    description: "Wallabag self-hosted read-it-later application Symfony .env — app, database, security, email, and Redis settings.",
    tags: ["wallabag", "read-it-later", "self-hosted", "symfony", "env"]
  }
};

// ../../docs/types/text/known/linkwarden-config/index.js
var linkwarden_config_default = {
  id: "linkwarden-config",
  label: "Linkwarden Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "linkwarden.env") return true;
    if (n === ".env") {
      const t = intake.text || "";
      return t.includes("NEXTAUTH_SECRET") && t.includes("PAGINATION_TAKE_COUNT");
    }
    return false;
  },
  loadRenderer: () => import("../types/text/known/linkwarden-config/renderer.js"),
  about: {
    description: "Linkwarden self-hosted bookmark manager and link archiver environment configuration — auth, database, storage, pagination, and SSO settings.",
    tags: ["linkwarden", "bookmarks", "self-hosted", "nextjs", "env"]
  }
};

// ../../docs/types/text/known/hoarder-config/index.js
var hoarder_config_default = {
  id: "hoarder-config",
  label: "Hoarder / Karakeep Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "hoarder.env" || n === "karakeep.env") return true;
    const text = intake.text || "";
    if (text.includes("HOARDER_SERVER_SECRET_KEY")) return true;
    if (text.includes("NEXTAUTH_SECRET") && text.includes("MEILI_ADDR")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/hoarder-config/renderer.js"),
  about: {
    description: "Hoarder (Karakeep) self-hosted bookmark manager with AI tagging configuration.",
    tags: ["hoarder", "karakeep", "bookmarks", "self-hosted", "config"]
  }
};

// ../../docs/types/text/yaml/known/frigate-config/index.js
var frigate_config_default = {
  id: "frigate-config",
  label: "Frigate NVR Config",
  match(intake) {
    const n = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (n === "frigate.yml" || n === "frigate.yaml") return true;
    if (n === "config.yml" || n === "config.yaml") {
      const t = intake.text || "";
      return t.includes("cameras:") && (t.includes("detectors:") || t.includes("mqtt:") || t.includes("ffmpeg:"));
    }
    return false;
  },
  loadRenderer: () => import("../types/text/yaml/known/frigate-config/renderer.js"),
  about: {
    description: "Frigate NVR (Network Video Recorder) configuration — defines cameras, detectors, MQTT, recording, and object tracking.",
    usedFor: [
      { label: "Frigate NVR", description: "Configure Frigate, the open source AI-powered network video recorder with real-time object detection.", href: "https://docs.frigate.video/" }
    ]
  }
};

// ../../docs/types/text/known/plist/index.js
var plist_default = {
  id: "plist-config",
  label: "Apple Property List",
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const text = intake.text || "";
    return name.endsWith(".plist") || text.includes("<!DOCTYPE plist") || text.includes("<plist version=");
  },
  loadRenderer: () => import("../types/text/known/plist/renderer.js"),
  about: {
    description: "Apple Property List file — structured data format used by macOS and iOS for configuration and preferences.",
    usedFor: [{ label: "macOS / iOS", description: "Application configuration and preferences on Apple platforms", href: "https://developer.apple.com/library/archive/documentation/General/Reference/InfoPlistKeyReference/Introduction/Introduction.html" }]
  }
};

// ../../docs/types/text/known/steam-acf/index.js
var steam_acf_default = {
  id: "steam-acf",
  label: "Steam App Manifest",
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const text = intake.text || "";
    return name.endsWith(".acf") || text.includes('"AppState"') && text.includes('"appid"');
  },
  loadRenderer: () => import("../types/text/known/steam-acf/renderer.js"),
  about: {
    description: "Steam App Cache File — Valve's KeyValues format used by Steam to track installed game state, depots, and update metadata.",
    usedFor: [{ label: "Steam", description: "Steam game installation manifest", href: "https://partner.steamgames.com/doc/store/application" }]
  }
};

// ../../docs/types/text/known/security-txt/index.js
var plugin92 = {
  id: "security-txt",
  label: "security.txt",
  tags: ["security", "web", "vulnerability-disclosure"],
  match(intake) {
    const name = (intake.name || intake.filename || "").toLowerCase();
    const basename = name.split("/").pop();
    if (basename === "security.txt") return true;
    if (name.includes(".well-known/security.txt")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/security-txt/renderer.js"),
  about: {
    description: "RFC 9116 security contact file — tells security researchers how to report vulnerabilities and provides contact, policy, encryption, and expiry information.",
    usedFor: [{ label: "RFC 9116", description: "A File Format to Aid in Security Vulnerability Disclosure", href: "https://www.rfc-editor.org/rfc/rfc9116" }]
  }
};
var security_txt_default = plugin92;

// ../../docs/types/text/known/humans-txt/index.js
var plugin93 = {
  id: "humans-txt",
  label: "humans.txt",
  tags: ["web", "credits", "team"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return name === "humans.txt";
  },
  loadRenderer: () => import("../types/text/known/humans-txt/renderer.js"),
  about: {
    description: "humans.txt — a file crediting the people and technologies behind a website, organized into sections like TEAM, THANKS, and SITE.",
    usedFor: [{ label: "humanstxt.org", description: "The humans.txt initiative", href: "https://humanstxt.org/" }]
  }
};
var humans_txt_default = plugin93;

// ../../docs/types/text/known/jsonnet/index.js
var plugin94 = {
  id: "jsonnet",
  label: "Jsonnet",
  tags: ["jsonnet", "data", "templating", "configuration"],
  match(intake) {
    const name = (intake.name || intake.filename || "").toLowerCase();
    return name.endsWith(".jsonnet") || name.endsWith(".libsonnet");
  },
  loadRenderer: () => import("../types/text/known/jsonnet/renderer.js"),
  about: {
    description: "Jsonnet is a data templating language that extends JSON with comments, variables, functions, conditionals, and imports, producing plain JSON output.",
    usedFor: [{ label: "jsonnet.org", description: "The Jsonnet data templating language", href: "https://jsonnet.org/" }]
  }
};
var jsonnet_default = plugin94;

// ../../docs/types/text/known/cue-lang/index.js
var plugin95 = {
  id: "cue-lang",
  label: "CUE",
  tags: ["cue", "configuration", "validation", "schema"],
  match(intake) {
    const name = (intake.name || intake.filename || "").toLowerCase();
    if (!name.endsWith(".cue")) return false;
    const text = intake.text || "";
    const head = text.slice(0, 2048);
    if (/^FILE\s+"/im.test(head) && /^TRACK\s+/im.test(head)) return false;
    if (/^\s*package\s+\w/m.test(text)) return true;
    if (/^\s*import\s+"/m.test(text)) return true;
    if (/:\s/.test(text) && !/^FILE\s+/im.test(head)) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/cue-lang/renderer.js"),
  about: {
    description: "CUE is an open-source data validation language and inference engine with its roots in logic programming, used for configuration, schema definition, and data validation.",
    usedFor: [{ label: "cuelang.org", description: "The CUE configuration language", href: "https://cuelang.org/" }]
  }
};
var cue_lang_default = plugin95;

// ../../docs/types/text/known/terraform-hcl/index.js
var plugin96 = {
  id: "terraform-hcl",
  label: "Terraform HCL",
  tags: ["infrastructure", "iac", "hashicorp", "terraform"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (!/\.tf$/.test(name)) return false;
    if (name === "versions.tf" || name === "providers.tf") return false;
    return true;
  },
  loadRenderer: () => import("../types/text/known/terraform-hcl/renderer.js"),
  about: {
    description: "HashiCorp Configuration Language (HCL) Terraform file — defines infrastructure resources, variables, outputs, providers, modules, and data sources.",
    usedFor: [{ label: "Terraform docs", description: "Infrastructure as Code using the Terraform HCL format", href: "https://developer.hashicorp.com/terraform/language" }]
  }
};

// ../../docs/types/text/known/nix-expr/index.js
var plugin97 = {
  id: "nix-expr",
  label: "Nix expression",
  tags: ["nix", "nixos", "package-manager", "functional"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (["flake.nix", "shell.nix", "default.nix", "configuration.nix", "home.nix"].includes(name)) return false;
    return /\.nix$/.test(name);
  },
  loadRenderer: () => import("../types/text/known/nix-expr/renderer.js"),
  about: {
    description: "Nix expression language file — functional, lazy, purely declarative expressions for packages, modules, or configuration.",
    usedFor: [{ label: "Nix language docs", description: "The Nix expression language reference", href: "https://nix.dev/manual/nix/stable/language/" }]
  }
};

// ../../docs/types/text/known/azure-bicep/index.js
var plugin98 = {
  id: "azure-bicep",
  label: "Azure Bicep",
  tags: ["azure", "bicep", "arm", "infrastructure", "iac", "microsoft"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return /\.(bicep|bicepparam)$/.test(name);
  },
  loadRenderer: () => import("../types/text/known/azure-bicep/renderer.js"),
  about: {
    description: "Azure Bicep template — a domain-specific language for deploying Azure resources, abstracting Azure Resource Manager (ARM) JSON templates.",
    usedFor: [{ label: "Bicep docs", description: "Azure Bicep language documentation and resource reference", href: "https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/overview" }]
  }
};

// ../../docs/types/text/known/kdl-doc/index.js
var plugin99 = {
  id: "kdl-doc",
  label: "KDL document",
  tags: ["kdl", "document", "config", "data"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return /\.kdl$/.test(name);
  },
  loadRenderer: () => import("../types/text/known/kdl-doc/renderer.js"),
  about: {
    description: "KDL (Cuddly Document Language) file — a node-based document language with typed arguments and key-value properties, suitable for config files and data serialization.",
    usedFor: [{ label: "KDL spec", description: "The KDL document language specification", href: "https://kdl.dev" }]
  }
};

// ../../docs/types/text/known/mermaid-diagram/index.js
var MERMAID_KEYWORDS = [
  "graph",
  "flowchart",
  "sequenceDiagram",
  "classDiagram",
  "stateDiagram",
  "erDiagram",
  "gantt",
  "pie",
  "gitGraph",
  "mindmap",
  "timeline",
  "xychart",
  "quadrantChart"
];
function hasMermaidContent(text) {
  if (!text) return false;
  const lines = text.split("\n").slice(0, 5);
  for (const line of lines) {
    const cleaned = line.replace(/^\s*%%[^\n]*/, "").trim().toLowerCase();
    if (!cleaned) continue;
    if (MERMAID_KEYWORDS.some((kw) => cleaned.startsWith(kw.toLowerCase()))) return true;
    break;
  }
  return false;
}
var plugin100 = {
  id: "mermaid-diagram",
  label: "Mermaid Diagram",
  tags: ["diagram", "visualization", "graph"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const ext = name.includes(".") ? name.split(".").pop() : "";
    if (ext === "mmd" || ext === "mermaid") return true;
    return hasMermaidContent(intake.text);
  },
  loadRenderer: () => import("../types/text/known/mermaid-diagram/renderer.js"),
  about: {
    description: "Mermaid diagram DSL — define flowcharts, sequence diagrams, class diagrams, ER diagrams, Gantt charts, and more using plain text syntax.",
    usedFor: [
      { label: "Mermaid.js", description: "Generate diagrams from text using Mermaid DSL", href: "https://mermaid.js.org/" },
      { label: "Mermaid Live Editor", description: "Paste your diagram and render it interactively", href: "https://mermaid.live/" }
    ]
  }
};
var mermaid_diagram_default = plugin100;

// ../../docs/types/text/known/plantuml/index.js
var plugin101 = {
  id: "plantuml",
  label: "PlantUML",
  tags: ["diagram", "uml", "visualization"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const ext = name.includes(".") ? name.split(".").pop() : "";
    if (["puml", "plantuml", "pu", "uml"].includes(ext)) return true;
    const text = intake.text || "";
    return /@startuml/.test(text) || /@enduml/.test(text);
  },
  loadRenderer: () => import("../types/text/known/plantuml/renderer.js"),
  about: {
    description: "PlantUML diagram definition file — describe sequence, class, use case, activity, component, state, deployment, timing, wireframe, mindmap, WBS, Gantt, or ER diagrams using simple text syntax.",
    usedFor: [
      { label: "PlantUML", description: "Generate UML and other diagrams from plain text descriptions", href: "https://plantuml.com/" },
      { label: "PlantUML Online Server", description: "Render PlantUML diagrams interactively in the browser", href: "https://www.plantuml.com/plantuml/uml/" }
    ]
  }
};
var plantuml_default = plugin101;

// ../../docs/types/text/known/rego-policy/index.js
var plugin102 = {
  id: "rego-policy",
  label: "Rego Policy",
  tags: ["opa", "policy", "authorization", "security"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const ext = name.includes(".") ? name.split(".").pop() : "";
    return ext === "rego";
  },
  loadRenderer: () => import("../types/text/known/rego-policy/renderer.js"),
  about: {
    description: "Open Policy Agent (OPA) Rego policy file — defines authorization logic using rules, functions, imports, and data queries for fine-grained access control.",
    usedFor: [
      { label: "OPA Policy Language", description: "Write allow/deny rules, functions, and helper rules using the Rego policy language.", href: "https://www.openpolicyagent.org/docs/latest/policy-language/" },
      { label: "Rego Playground", description: "Test and debug Rego policies interactively", href: "https://play.openpolicyagent.org/" }
    ]
  }
};
var rego_policy_default = plugin102;

// ../../docs/types/text/known/asciidoc/index.js
function isPgpArmored(text) {
  return /^-----BEGIN PGP/.test((text || "").trimStart());
}
var plugin103 = {
  id: "asciidoc",
  label: "AsciiDoc",
  tags: ["documentation", "markup", "asciidoc"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const ext = name.includes(".") ? name.split(".").pop() : "";
    if (["adoc", "asciidoc", "ad"].includes(ext)) return true;
    if (ext === "asc" && !isPgpArmored(intake.text)) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/asciidoc/renderer.js"),
  about: {
    description: "AsciiDoc is a lightweight markup language for writing documentation, books, and articles. It supports sections, tables, code blocks, attributes, includes, and rich formatting.",
    usedFor: [
      { label: "AsciiDoc", description: "Lightweight markup language for technical documentation", href: "https://asciidoc.org/" },
      { label: "Asciidoctor", description: "Convert AsciiDoc documents to HTML, PDF, DocBook and more", href: "https://asciidoctor.org/" }
    ]
  }
};
var asciidoc_default = plugin103;

// ../../docs/types/text/known/capnp/index.js
var plugin104 = {
  id: "capnp",
  label: "Cap'n Proto",
  tags: ["capnproto", "schema", "serialization", "rpc"],
  match(intake) {
    const name = (intake.name || intake.filename || "").toLowerCase();
    return name.endsWith(".capnp");
  },
  loadRenderer: () => import("../types/text/known/capnp/renderer.js"),
  about: {
    description: "Cap'n Proto is an extremely fast data interchange format and capability-based RPC system. Schema files define structs, interfaces, enums, and constants.",
    usedFor: [{ label: "capnproto.org", description: "Cap'n Proto serialization and RPC schema format", href: "https://capnproto.org/" }]
  }
};
var capnp_default = plugin104;

// ../../docs/types/text/known/flatbuffers/index.js
var plugin105 = {
  id: "flatbuffers",
  label: "FlatBuffers",
  tags: ["flatbuffers", "schema", "serialization", "binary"],
  match(intake) {
    const name = (intake.name || intake.filename || "").toLowerCase();
    return name.endsWith(".fbs");
  },
  loadRenderer: () => import("../types/text/known/flatbuffers/renderer.js"),
  about: {
    description: "FlatBuffers is an efficient cross-platform serialization library. Schema files (.fbs) define tables, structs, enums, unions, and the root type for binary encoding.",
    usedFor: [{ label: "flatbuffers.dev", description: "FlatBuffers serialization schema format", href: "https://flatbuffers.dev/" }]
  }
};
var flatbuffers_default = plugin105;

// ../../docs/types/text/known/dhall-config/index.js
var plugin106 = {
  id: "dhall-config",
  label: "Dhall",
  tags: ["dhall", "configuration", "functional", "typed"],
  match(intake) {
    const name = (intake.name || intake.filename || "").toLowerCase();
    return name.endsWith(".dhall");
  },
  loadRenderer: () => import("../types/text/known/dhall-config/renderer.js"),
  about: {
    description: "Dhall is a programmable configuration language that is not Turing-complete. It guarantees termination, supports imports, and provides strong typing for generating JSON/YAML configs.",
    usedFor: [{ label: "dhall-lang.org", description: "The Dhall configuration language", href: "https://dhall-lang.org/" }]
  }
};
var dhall_config_default = plugin106;

// ../../docs/types/text/known/wgsl-shader/index.js
var plugin107 = {
  id: "wgsl-shader",
  label: "WGSL Shader",
  tags: ["wgsl", "webgpu", "shader", "graphics"],
  match(intake) {
    const name = (intake.name || intake.filename || "").toLowerCase();
    return name.endsWith(".wgsl");
  },
  loadRenderer: () => import("../types/text/known/wgsl-shader/renderer.js"),
  about: {
    description: "WGSL (WebGPU Shading Language) is the shading language for WebGPU. Shader files define vertex, fragment, and compute entry points with typed bindings and built-in functions.",
    usedFor: [{ label: "WebGPU WGSL spec", description: "W3C WebGPU Shading Language specification", href: "https://www.w3.org/TR/WGSL/" }]
  }
};
var wgsl_shader_default = plugin107;

// ../../docs/types/text/known/glsl-shader/index.js
var GLSL_EXTS = /* @__PURE__ */ new Set([".glsl", ".vert", ".frag", ".geom", ".comp", ".tese", ".tesc"]);
var plugin108 = {
  id: "glsl-shader",
  label: "GLSL Shader",
  tags: ["glsl", "opengl", "shader", "graphics", "gpu"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const dot = name.lastIndexOf(".");
    if (dot !== -1 && GLSL_EXTS.has(name.slice(dot))) return true;
    if (dot !== -1) return false;
    const text = intake.text || "";
    if (/void\s+main\s*\(\s*\)/.test(text)) {
      if (/gl_Position|gl_FragColor|gl_FragDepth|uniform\s|attribute\s|varying\s|\bin\s+\w|\bout\s+\w|texture\s*\(|sampler2D|samplerCube/.test(text)) return true;
    }
    return false;
  },
  loadRenderer: () => import("../types/text/known/glsl-shader/renderer.js"),
  about: {
    description: "GLSL (OpenGL Shading Language) is the C-like shading language for OpenGL. Shader programs run on the GPU and transform vertex positions, shade fragments, and perform compute operations.",
    usedFor: [{ label: "GLSL specification", description: "Khronos OpenGL Shading Language reference", href: "https://registry.khronos.org/OpenGL/specs/gl/GLSLangSpec.4.60.pdf" }]
  }
};
var glsl_shader_default = plugin108;

// ../../docs/types/text/known/hlsl-shader/index.js
var HLSL_EXTS = /* @__PURE__ */ new Set([".hlsl", ".fx", ".vsh", ".psh"]);
var plugin109 = {
  id: "hlsl-shader",
  label: "HLSL Shader",
  tags: ["hlsl", "directx", "shader", "graphics", "gpu"],
  match(intake) {
    const name = (intake.name || intake.filename || "").toLowerCase();
    const dot = name.lastIndexOf(".");
    if (dot !== -1 && HLSL_EXTS.has(name.slice(dot))) return true;
    const text = intake.text || "";
    if (/SV_Position|SV_Target|SV_Depth/.test(text)) return true;
    if (/cbuffer\s+\w+/.test(text)) return true;
    if (/Texture2D\s|Texture3D\s|SamplerState\s/.test(text)) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/hlsl-shader/renderer.js"),
  about: {
    description: "HLSL (High-Level Shading Language) is the shading language for DirectX. Shader programs define vertex, pixel, and compute entry points with typed constant buffers, textures, and semantic annotations.",
    usedFor: [{ label: "HLSL reference", description: "Microsoft DirectX HLSL documentation", href: "https://learn.microsoft.com/en-us/windows/win32/direct3dhlsl/dx-graphics-hlsl" }]
  }
};
var hlsl_shader_default = plugin109;

// ../../docs/types/text/known/restructuredtext/index.js
var RST_EXTS = /* @__PURE__ */ new Set([".rst", ".rest"]);
var plugin110 = {
  id: "restructuredtext",
  label: "reStructuredText",
  tags: ["rst", "restructuredtext", "sphinx", "documentation"],
  match(intake) {
    const name = (intake.name || intake.filename || "").toLowerCase();
    const dot = name.lastIndexOf(".");
    if (dot !== -1 && RST_EXTS.has(name.slice(dot))) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/restructuredtext/renderer.js"),
  about: {
    description: "reStructuredText (RST) is a lightweight markup language used extensively in Python documentation and Sphinx projects. It supports sections, directives, roles, code blocks, and cross-references.",
    usedFor: [{ label: "RST specification", description: "Docutils reStructuredText specification", href: "https://docutils.sourceforge.io/rst.html" }]
  }
};
var restructuredtext_default = plugin110;

// ../../docs/types/text/known/org-mode/index.js
var plugin111 = {
  id: "org-mode",
  label: "Org-mode",
  tags: ["org", "emacs", "orgmode", "documentation", "literate"],
  match(intake) {
    const name = (intake.name || intake.filename || "").toLowerCase().split("/").pop();
    if (name.endsWith(".org")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/org-mode/renderer.js"),
  about: {
    description: "Emacs Org-mode is a plain-text system for notes, task management, and literate programming. Files contain hierarchical headings, TODO items, code blocks, tables, and links.",
    usedFor: [{ label: "Org-mode manual", description: "The Org-mode manual for Emacs", href: "https://orgmode.org/manual/" }]
  }
};
var org_mode_default = plugin111;

// ../../docs/types/text/known/liquid-template/index.js
var plugin112 = {
  id: "liquid-template",
  label: "Liquid Template",
  tags: ["liquid", "shopify", "jekyll", "template", "web"],
  match(intake) {
    const name = (intake.name || intake.filename || "").toLowerCase();
    return name.endsWith(".liquid");
  },
  loadRenderer: () => import("../types/text/known/liquid-template/renderer.js"),
  about: {
    description: "Liquid is a template language created by Shopify, also used by Jekyll for static sites. It uses {{ output }} tags for variable output and {% logic %} tags for control flow, filters, and includes.",
    usedFor: [
      { label: "Shopify Liquid docs", description: "Official Liquid templating reference for Shopify themes", href: "https://shopify.dev/docs/api/liquid" },
      { label: "Jekyll Liquid usage", description: "Liquid templates in Jekyll static sites", href: "https://jekyllrb.com/docs/liquid/" }
    ]
  }
};
var liquid_template_default = plugin112;

// ../../docs/types/text/known/handlebars-template/index.js
var plugin113 = {
  id: "handlebars-template",
  label: "Handlebars Template",
  tags: ["handlebars", "hbs", "mustache", "template", "javascript"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (name.endsWith(".hbs") || name.endsWith(".handlebars") || name.endsWith(".mustache.hbs")) return true;
    const ext = name.includes(".") ? name.slice(name.lastIndexOf(".") + 1) : "";
    if (ext && ext !== "hbs" && ext !== "handlebars") return false;
    const text = intake.text || "";
    return /\{\{#(?:if|each|with|unless|>)/.test(text) || /\{\{>\s*\w/.test(text);
  },
  loadRenderer: () => import("../types/text/known/handlebars-template/renderer.js"),
  about: {
    description: "Handlebars is a logic-minimal templating language that extends Mustache. It supports block helpers like {{#if}}, {{#each}}, partials via {{> name}}, and custom helper registration.",
    usedFor: [
      { label: "Handlebars.js docs", description: "Official Handlebars.js documentation", href: "https://handlebarsjs.com/" },
      { label: "Ember.js templates", description: "Handlebars is the basis of Ember.js component templates", href: "https://guides.emberjs.com/release/components/" }
    ]
  }
};
var handlebars_template_default = plugin113;

// ../../docs/types/text/known/jinja2-template/index.js
var plugin114 = {
  id: "jinja2-template",
  label: "Jinja2 Template",
  tags: ["jinja2", "jinja", "ansible", "python", "template"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (name.endsWith(".j2") || name.endsWith(".jinja") || name.endsWith(".jinja2")) return true;
    const ext = name.includes(".") ? name.slice(name.lastIndexOf(".") + 1) : "";
    if (ext && ext !== "j2" && ext !== "jinja" && ext !== "jinja2") return false;
    const text = intake.text || "";
    const hasOutput = /\{\{\s/.test(text);
    const hasBlock = /\{%\s/.test(text);
    const hasComment = /\{#\s/.test(text);
    const tagTypeCount = [hasOutput, hasBlock, hasComment].filter(Boolean).length;
    return tagTypeCount >= 2;
  },
  loadRenderer: () => import("../types/text/known/jinja2-template/renderer.js"),
  about: {
    description: "Jinja2 is a Python templating engine used in Flask, Ansible, SaltStack, and Kubernetes tooling. It supports template inheritance via {% extends %}, macros, filters, and control flow.",
    usedFor: [
      { label: "Jinja2 docs", description: "Official Jinja2 templating engine documentation", href: "https://jinja.palletsprojects.com/" },
      { label: "Ansible templating", description: "Ansible uses Jinja2 for variable substitution and templates", href: "https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_templating.html" }
    ]
  }
};
var jinja2_template_default = plugin114;

// ../../docs/types/text/known/mustache-template/index.js
var plugin115 = {
  id: "mustache-template",
  label: "Mustache Template",
  tags: ["mustache", "template", "logic-less"],
  match(intake) {
    const name = (intake.name || intake.filename || "").toLowerCase();
    if (name.endsWith(".mustache") || name.endsWith(".mst") || name.endsWith(".ms")) return true;
    const text = intake.text || "";
    return /\{\{#(\w+)\}[\s\S]*?\{\{\/\1\}/.test(text);
  },
  loadRenderer: () => import("../types/text/known/mustache-template/renderer.js"),
  about: {
    description: "Mustache is a logic-less templating language available across many languages. It uses {{variable}}, {{#section}}...{{/section}} blocks, {{^inverted}} sections, {{> partials}}, and {{{unescaped}}} triple-stache for raw HTML.",
    usedFor: [
      { label: "Mustache spec", description: "The Mustache logic-less template specification", href: "https://mustache.github.io/mustache.5.html" },
      { label: "mustache.js", description: "JavaScript implementation of Mustache templates", href: "https://github.com/janl/mustache.js" }
    ]
  }
};
var mustache_template_default = plugin115;

// ../../docs/types/text/known/sparql-query/index.js
var SPARQL_CONTENT_KWS = ["prefix", "select", "construct", "ask", "describe"];
function hasSparqlContent(text) {
  if (!text) return false;
  const lines = text.split(/\r?\n/);
  let first = "";
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    first = trimmed.toLowerCase();
    break;
  }
  if (!SPARQL_CONTENT_KWS.some((kw) => first.startsWith(kw))) return false;
  if (first.startsWith("prefix")) return true;
  const lower = text.toLowerCase();
  const hasWhereBlock = /\bwhere\s*\{/.test(lower);
  const hasVar = /\?[a-z_][\w-]*/i.test(text);
  const hasRdfName = /(?:^|\s)[a-z_][\w-]*:[\w-]+/i.test(text) || /<https?:\/\//i.test(text);
  return hasWhereBlock && hasVar && hasRdfName;
}
var plugin116 = {
  id: "sparql-query",
  label: "SPARQL Query",
  tags: ["rdf", "sparql", "semantic-web", "query"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const ext = name.includes(".") ? name.split(".").pop() : "";
    if (ext === "sparql" || ext === "rq") return true;
    return hasSparqlContent(intake.text);
  },
  loadRenderer: () => import("../types/text/known/sparql-query/renderer.js"),
  about: {
    description: "SPARQL query file — a W3C standard query language for RDF data, supporting SELECT, CONSTRUCT, ASK, and DESCRIBE query forms with PREFIX declarations, triple patterns, FILTER, OPTIONAL, and aggregation.",
    usedFor: [
      { label: "SPARQL 1.1 Spec", description: "W3C specification for the SPARQL RDF query language", href: "https://www.w3.org/TR/sparql11-query/" },
      { label: "Wikidata SPARQL", description: "Run live SPARQL queries against Wikidata", href: "https://query.wikidata.org/" }
    ]
  }
};
var sparql_query_default = plugin116;

// ../../docs/types/text/known/sql-query/index.js
var SQL_START = /^(with|select|insert|update|delete|create|alter|drop|truncate|merge|grant|revoke)\b/i;
var SQL_STRUCTURE = /\b(from|join|where|group\s+by|order\s+by|create\s+table|insert\s+into|update\s+[\w".[\]]+|delete\s+from)\b/i;
function firstCodeLine(text) {
  const withoutBlockComments = String(text || "").replace(/\/\*[\s\S]*?\*\//g, "");
  for (const line of withoutBlockComments.split(/\r?\n/)) {
    const trimmed = line.replace(/--.*$/, "").trim();
    if (trimmed) return trimmed;
  }
  return "";
}
function looksLikeSql(text) {
  const first = firstCodeLine(text);
  if (!SQL_START.test(first)) return false;
  return SQL_STRUCTURE.test(text || "");
}
var plugin117 = {
  id: "sql-query",
  label: "SQL Query",
  tags: ["sql", "database", "query"],
  match(intake, baseType) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const ext = name.includes(".") ? name.split(".").pop() : "";
    if (ext === "sparql" || ext === "rq") return false;
    if (ext === "sql") return true;
    if (baseType?.id !== "code") return false;
    return looksLikeSql(intake.textSample || intake.text || "");
  },
  loadRenderer: () => import("../types/text/known/sql-query/renderer.js"),
  about: {
    description: "SQL query file — schema definitions and database queries, summarized by statements, referenced tables, joins, aliases, CTEs, and query modifiers.",
    usedFor: [
      { label: "SQL", description: "Structured Query Language for relational databases", href: "https://en.wikipedia.org/wiki/SQL" }
    ]
  }
};
var sql_query_default = plugin117;

// ../../docs/types/text/known/turtle-rdf/index.js
function hasTurtleContent(text) {
  if (!text) return false;
  return /@prefix\s+/i.test(text) || /^\s*@base\s+/im.test(text);
}
var plugin118 = {
  id: "turtle-rdf",
  label: "Turtle RDF",
  tags: ["rdf", "turtle", "semantic-web", "ontology", "linked-data"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const ext = name.includes(".") ? name.split(".").pop() : "";
    if (ext === "ttl" || ext === "n3") return true;
    return hasTurtleContent(intake.text);
  },
  loadRenderer: () => import("../types/text/known/turtle-rdf/renderer.js"),
  about: {
    description: "Turtle (Terse RDF Triple Language) file — a compact, human-friendly syntax for representing RDF data and ontologies, supporting namespace prefixes, blank nodes, and literal types.",
    usedFor: [
      { label: "Turtle Spec (W3C)", description: "W3C Recommendation for the Turtle RDF syntax", href: "https://www.w3.org/TR/turtle/" },
      { label: "Protégé", description: "Open-source ontology editor with Turtle support", href: "https://protege.stanford.edu/" }
    ]
  }
};
var turtle_rdf_default = plugin118;

// ../../docs/types/text/known/graphviz-dot/index.js
function hasDotContent(text) {
  if (!text) return false;
  const stripped = (text || "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "").trimStart();
  return /^(strict\s+)?(di)?graph\b/i.test(stripped);
}
var plugin119 = {
  id: "graphviz-dot",
  label: "Graphviz DOT",
  tags: ["graph", "visualization", "dot", "graphviz"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const ext = name.includes(".") ? name.split(".").pop() : "";
    if (ext === "dot" || ext === "gv") return true;
    return hasDotContent(intake.text);
  },
  loadRenderer: () => import("../types/text/known/graphviz-dot/renderer.js"),
  about: {
    description: "Graphviz DOT language file — defines directed and undirected graphs with nodes, edges, attributes, and subgraphs for automatic layout and visualization.",
    usedFor: [
      { label: "Graphviz", description: "Open-source graph visualization software", href: "https://graphviz.org/" },
      { label: "Graphviz Online", description: "Render DOT graphs interactively in the browser", href: "https://dreampuf.github.io/GraphvizOnline/" }
    ]
  }
};
var graphviz_dot_default = plugin119;

// ../../docs/types/text/known/verilog/index.js
function isCoq(text) {
  return /\b(Theorem|Proof\.|Qed\.|Lemma)\b/.test(text || "");
}
function hasVerilogContent(text) {
  if (!text) return false;
  if (isCoq(text)) return false;
  if (!/\bmodule\s+\w/.test(text)) return false;
  return /\b(endmodule|always|assign|wire\b|reg\b|input\b|output\b|inout\b|parameter\b|localparam\b|posedge|negedge|initial\b)\b/.test(text);
}
var plugin120 = {
  id: "verilog",
  label: "Verilog / SystemVerilog",
  tags: ["hdl", "verilog", "systemverilog", "hardware", "fpga", "rtl"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const ext = name.includes(".") ? name.split(".").pop() : "";
    if (ext === "sv" || ext === "svh") {
      return hasVerilogContent(intake.text);
    }
    if (ext === "v") {
      return hasVerilogContent(intake.text);
    }
    const configExts = /* @__PURE__ */ new Set(["yml", "yaml", "json", "toml", "ini", "cfg", "conf", "md", "rst", "txt", "xml", "html", "css", "sh", "bash", "py", "rb", "go", "rs", "ts", "js"]);
    if (configExts.has(ext)) return false;
    return hasVerilogContent(intake.text);
  },
  loadRenderer: () => import("../types/text/known/verilog/renderer.js"),
  about: {
    description: "Verilog / SystemVerilog hardware description language file — describes digital circuits at the RTL or behavioral level for simulation and FPGA/ASIC synthesis.",
    usedFor: [
      { label: "IEEE Verilog (1364)", description: "Original Verilog hardware description language standard", href: "https://ieeexplore.ieee.org/document/954909" },
      { label: "IEEE SystemVerilog (1800)", description: "Extended superset adding OOP, assertions, and design verification", href: "https://ieeexplore.ieee.org/document/10458102" }
    ]
  }
};
var verilog_default = plugin120;

// ../../docs/types/text/known/xslt-stylesheet/index.js
var plugin121 = {
  id: "xslt-stylesheet",
  label: "XSLT Stylesheet",
  tags: ["xslt", "xsl", "xml", "transform", "stylesheet"],
  match(intake) {
    const name = (intake.name || intake.filename || "").toLowerCase();
    if (name.endsWith(".xsl") || name.endsWith(".xslt")) return true;
    const text = intake.text || "";
    return /<xsl:stylesheet[\s>]/.test(text) || /<xsl:transform[\s>]/.test(text);
  },
  loadRenderer: () => import("../types/text/known/xslt-stylesheet/renderer.js"),
  about: {
    description: "XSLT (Extensible Stylesheet Language Transformations) is a language for transforming XML documents into other XML, HTML, or plain-text formats. It uses template rules matched against source nodes.",
    usedFor: [
      { label: "XSLT spec (W3C)", description: "XSLT 2.0 specification from W3C", href: "https://www.w3.org/TR/xslt20/" },
      { label: "MDN XSLT", description: "XSLT reference on MDN", href: "https://developer.mozilla.org/en-US/docs/Web/XSLT" }
    ]
  }
};
var xslt_stylesheet_default = plugin121;

// ../../docs/types/text/known/svelte-component/index.js
var plugin122 = {
  id: "svelte-component",
  label: "Svelte Component",
  tags: ["svelte", "sfc", "component", "frontend"],
  match(intake) {
    const name = (intake.name || intake.filename || "").toLowerCase();
    return name.endsWith(".svelte");
  },
  loadRenderer: () => import("../types/text/known/svelte-component/renderer.js"),
  about: {
    description: "A Svelte single-file component (.svelte) combines script, style, and HTML template in one file. Svelte compiles components to highly optimised vanilla JavaScript at build time.",
    usedFor: [
      { label: "Svelte docs", description: "Official Svelte documentation", href: "https://svelte.dev/docs" },
      { label: "SvelteKit", description: "Full-stack framework built on Svelte", href: "https://kit.svelte.dev/" }
    ]
  }
};
var svelte_component_default = plugin122;

// ../../docs/types/text/known/nunjucks/index.js
var plugin123 = {
  id: "nunjucks",
  label: "Nunjucks Template",
  tags: ["nunjucks", "njk", "mozilla", "jinja", "template"],
  match(intake) {
    const name = (intake.name || intake.filename || "").toLowerCase();
    if (name.endsWith(".njk") || name.endsWith(".nunjucks")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/nunjucks/renderer.js"),
  about: {
    description: "Nunjucks is a Mozilla templating language for JavaScript, inspired by Jinja2. It supports template inheritance, macros, async rendering, and a rich set of filters.",
    usedFor: [
      { label: "Nunjucks docs", description: "Official Mozilla Nunjucks documentation", href: "https://mozilla.github.io/nunjucks/" },
      { label: "Eleventy", description: "Static site generator with first-class Nunjucks support", href: "https://www.11ty.dev/docs/languages/nunjucks/" }
    ]
  }
};
var nunjucks_default = plugin123;

// ../../docs/types/text/known/haskell-lang/index.js
var plugin124 = {
  id: "haskell-lang",
  label: "Haskell",
  tags: ["haskell", "hs", "lhs", "functional", "ml"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (name.endsWith(".hs") || name.endsWith(".lhs")) return true;
    const ext = name.includes(".") ? name.slice(name.lastIndexOf(".") + 1) : "";
    if (ext && ext !== "hs" && ext !== "lhs") return false;
    const text = intake.text || "";
    const hits = [/\bmodule\s+[A-Z]/.test(text), /\bimport\s+(qualified\s+)?[A-Z]/.test(text), /\bdata\s+[A-Z]/.test(text), /\btype\s+[A-Z]/.test(text), /\bnewtype\s+[A-Z]/.test(text), /\bclass\s+[A-Z]/.test(text), /\binstance\s+/.test(text)].filter(Boolean).length;
    return hits >= 3;
  },
  loadRenderer: () => import("../types/text/known/haskell-lang/renderer.js"),
  about: {
    description: "Haskell is a purely functional programming language with static typing and lazy evaluation. .hs files are regular source; .lhs (literate Haskell) interleaves prose and code, with code lines prefixed by >.",
    usedFor: [
      { label: "Haskell.org", description: "Official Haskell language home", href: "https://www.haskell.org/" },
      { label: "GHC User Guide", description: "Glasgow Haskell Compiler documentation", href: "https://downloads.haskell.org/ghc/latest/docs/users_guide/" }
    ]
  }
};
var haskell_lang_default = plugin124;

// ../../docs/types/text/known/zig-lang/index.js
var plugin125 = {
  id: "zig-lang",
  label: "Zig",
  tags: ["zig", "systems", "compiled", "low-level"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (name.endsWith(".zig.zon")) return false;
    return name.endsWith(".zig");
  },
  loadRenderer: () => import("../types/text/known/zig-lang/renderer.js"),
  about: {
    description: "Zig source file — a general-purpose systems programming language focusing on robustness, optimality, and maintainability.",
    usedFor: [
      { label: "Zig language reference", description: "Official Zig language documentation and reference", href: "https://ziglang.org/documentation/master/" },
      { label: "Zig standard library", description: "Zig standard library documentation", href: "https://ziglang.org/documentation/master/std/" }
    ]
  }
};
var zig_lang_default = plugin125;

// ../../docs/types/text/known/elixir-lang/index.js
function hasElixirContent(text) {
  if (!text) return false;
  return /\b(defmodule|def |defp |use |alias |import )\b/.test(text);
}
var plugin126 = {
  id: "elixir-lang",
  label: "Elixir",
  tags: ["elixir", "functional", "beam", "erlang", "phoenix"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (name === "mix.exs") return false;
    const ext = name.includes(".") ? name.split(".").pop() : "";
    if (ext === "ex" || ext === "exs") {
      return hasElixirContent(intake.text);
    }
    return false;
  },
  loadRenderer: () => import("../types/text/known/elixir-lang/renderer.js"),
  about: {
    description: "Elixir source file — a dynamic, functional language designed for building scalable and maintainable applications on the Erlang VM (BEAM).",
    usedFor: [
      { label: "Elixir documentation", description: "Official Elixir language documentation", href: "https://elixir-lang.org/docs.html" },
      { label: "Phoenix Framework", description: "The popular Elixir web framework", href: "https://www.phoenixframework.org/" }
    ]
  }
};
var elixir_lang_default = plugin126;

// ../../docs/types/text/known/pug-template/index.js
var plugin127 = {
  id: "pug-template",
  label: "Pug / Jade",
  tags: ["pug", "jade", "template", "html", "view"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const ext = name.includes(".") ? name.split(".").pop() : "";
    return ext === "pug" || ext === "jade";
  },
  loadRenderer: () => import("../types/text/known/pug-template/renderer.js"),
  about: {
    description: "Pug (formerly Jade) template file — an indentation-based HTML templating engine commonly used with Node.js and Express.",
    usedFor: [
      { label: "Pug documentation", description: "Official Pug template engine documentation", href: "https://pugjs.org/api/getting-started.html" }
    ]
  }
};
var pug_template_default = plugin127;

// ../../docs/types/text/known/ejs-template/index.js
var plugin128 = {
  id: "ejs-template",
  label: "EJS",
  tags: ["ejs", "template", "html", "javascript", "view"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const ext = name.includes(".") ? name.split(".").pop() : "";
    return ext === "ejs";
  },
  loadRenderer: () => import("../types/text/known/ejs-template/renderer.js"),
  about: {
    description: "EJS (Embedded JavaScript) template file — generates HTML markup with plain JavaScript, widely used with Node.js and Express.",
    usedFor: [
      { label: "EJS documentation", description: "Official EJS template language documentation", href: "https://ejs.co/" }
    ]
  }
};
var ejs_template_default = plugin128;

// ../../docs/types/text/known/ocaml-lang/index.js
var plugin129 = {
  id: "ocaml-lang",
  label: "OCaml",
  tags: ["ocaml", "ml", "mli", "functional", "ml-family"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (name.endsWith(".ml") || name.endsWith(".mli")) return true;
    const ext = name.includes(".") ? name.slice(name.lastIndexOf(".") + 1) : "";
    if (ext && ext !== "ml" && ext !== "mli") return false;
    const text = intake.text || "";
    const hits = [
      /\blet\s+/.test(text),
      /\bmodule\s+[A-Z]/.test(text),
      /\btype\s+\w/.test(text),
      /\bopen\s+[A-Z]/.test(text),
      /\bstruct\b/.test(text),
      /\bsig\b/.test(text),
      /\bmatch\s+\w/.test(text)
    ].filter(Boolean).length;
    return hits >= 3;
  },
  loadRenderer: () => import("../types/text/known/ocaml-lang/renderer.js"),
  about: {
    description: "OCaml is a general-purpose functional programming language with static typing, type inference, and a powerful module system. .ml files are implementations; .mli files are module interfaces/signatures.",
    usedFor: [
      { label: "OCaml.org", description: "Official OCaml language home", href: "https://ocaml.org/" },
      { label: "OCaml Manual", description: "The OCaml language reference", href: "https://v2.ocaml.org/api/" }
    ]
  }
};
var ocaml_lang_default = plugin129;

// ../../docs/types/text/known/fsharp-lang/index.js
var plugin130 = {
  id: "fsharp-lang",
  label: "F#",
  tags: ["fsharp", "fs", "fsi", "fsx", "functional", "dotnet", "ml-family"],
  match(intake) {
    const name = (intake.name || intake.filename || "").toLowerCase();
    const isFs = name.endsWith(".fs");
    const isFsi = name.endsWith(".fsi");
    const isFsx = name.endsWith(".fsx");
    if (!isFs && !isFsi && !isFsx) return false;
    const text = intake.text || "";
    if (isFs && (/void\s+main\s*\(/.test(text) || /gl_FragColor/.test(text) || /\#version\s+\d/.test(text))) {
      return null;
    }
    if (isFsi || isFsx) return true;
    const hits = [
      /^module\s+/m.test(text),
      /^let\s+/m.test(text),
      /^type\s+/m.test(text),
      /^open\s+/m.test(text),
      /\|>/i.test(text),
      /\bmember\b/.test(text)
    ].filter(Boolean).length;
    return hits >= 2;
  },
  loadRenderer: () => import("../types/text/known/fsharp-lang/renderer.js"),
  about: {
    description: "F# is a functional-first programming language on the .NET platform. .fs files are source, .fsi are interface/signature files, and .fsx are interactive scripts. Note: .fs is also used for GLSL fragment shaders — the plugin skips those.",
    usedFor: [
      { label: "F# Software Foundation", description: "Official F# language home", href: "https://fsharp.org/" },
      { label: "F# Docs", description: "Microsoft F# documentation", href: "https://learn.microsoft.com/en-us/dotnet/fsharp/" }
    ]
  }
};
var fsharp_lang_default = plugin130;

// ../../docs/types/text/known/clojure-lang/index.js
var plugin131 = {
  id: "clojure-lang",
  label: "Clojure",
  tags: ["clojure", "clj", "cljs", "cljc", "edn", "functional", "lisp", "jvm"],
  match(intake) {
    const name = (intake.name || intake.filename || "").toLowerCase();
    const base = name.split("/").pop();
    if (base === "project.clj") return false;
    if (base === "deps.edn") return false;
    if (base === "shadow-cljs.edn") return false;
    return name.endsWith(".clj") || name.endsWith(".cljs") || name.endsWith(".cljc") || name.endsWith(".edn");
  },
  loadRenderer: () => import("../types/text/known/clojure-lang/renderer.js"),
  about: {
    description: "Clojure is a dynamic, functional Lisp dialect on the JVM. .clj runs on JVM, .cljs compiles to JavaScript, .cljc is cross-platform. .edn (Extensible Data Notation) is Clojure's data exchange format.",
    usedFor: [
      { label: "Clojure.org", description: "Official Clojure language home", href: "https://clojure.org/" },
      { label: "ClojureScript", description: "Clojure compiled to JavaScript", href: "https://clojurescript.org/" },
      { label: "EDN Format", description: "Extensible Data Notation spec", href: "https://github.com/edn-format/edn" }
    ]
  }
};
var clojure_lang_default = plugin131;

// ../../docs/types/text/known/elm-lang/index.js
var plugin132 = {
  id: "elm-lang",
  label: "Elm",
  tags: ["elm", "functional", "frontend", "tea"],
  match(intake) {
    const name = (intake.name || intake.filename || "").toLowerCase();
    if (!name.endsWith(".elm")) return false;
    const text = intake.text || "";
    if (/^module\s+/m.test(text) || /^import\s+/m.test(text) || /^type\s+/m.test(text) || /^type\s+alias\s+/m.test(text)) {
      return true;
    }
    return true;
  },
  loadRenderer: () => import("../types/text/known/elm-lang/renderer.js"),
  about: {
    description: "Elm is a purely functional language for building web UIs. It compiles to JavaScript and enforces The Elm Architecture (TEA) pattern of Model/Update/View. .elm files are Elm source modules.",
    usedFor: [
      { label: "Elm-lang.org", description: "Official Elm language home", href: "https://elm-lang.org/" },
      { label: "Elm Guide", description: "An Introduction to Elm", href: "https://guide.elm-lang.org/" }
    ]
  }
};
var elm_lang_default = plugin132;

// ../../docs/types/text/known/kotlin-lang/index.js
var plugin133 = {
  id: "kotlin-lang",
  label: "Kotlin",
  tags: ["kotlin", "kt", "kts", "jvm", "android"],
  match(intake) {
    const name = (intake.name || intake.filename || "").toLowerCase();
    if (name.endsWith(".kt") || name.endsWith(".kts")) return true;
    const text = intake.text || "";
    const hits = [
      /^\s*package\s+[\w.]+/m.test(text),
      /^\s*fun\s+\w+/m.test(text),
      /\bdata\s+class\s+\w+/.test(text),
      /\bsealed\s+class\s+\w+/.test(text),
      /\bobject\s+\w+/.test(text)
    ].filter(Boolean).length;
    return hits >= 3;
  },
  loadRenderer: () => import("../types/text/known/kotlin-lang/renderer.js"),
  about: {
    description: "Kotlin is a statically typed programming language for the JVM, Android, and multiplatform targets. .kt files are regular source; .kts files are Kotlin Scripts.",
    usedFor: [
      { label: "kotlinlang.org", description: "Official Kotlin language home", href: "https://kotlinlang.org/" },
      { label: "Android + Kotlin", description: "Official Android development with Kotlin", href: "https://developer.android.com/kotlin" }
    ]
  }
};
var kotlin_lang_default = plugin133;

// ../../docs/types/text/known/scala-lang/index.js
var plugin134 = {
  id: "scala-lang",
  label: "Scala",
  tags: ["scala", "sc", "jvm", "functional", "ammonite"],
  match(intake) {
    const name = (intake.name || intake.filename || "").toLowerCase();
    if (name.endsWith(".scala") || name.endsWith(".sc")) return true;
    const text = intake.text || "";
    const hits = [
      /^\s*object\s+\w+/.test(text),
      /^\s*class\s+\w+/.test(text),
      /^\s*trait\s+\w+/.test(text),
      /^\s*def\s+\w+/.test(text),
      /^\s*val\s+\w+/.test(text)
    ].filter(Boolean).length;
    return hits >= 3;
  },
  loadRenderer: () => import("../types/text/known/scala-lang/renderer.js"),
  about: {
    description: "Scala is a strong statically typed high-level general-purpose programming language that supports both object-oriented programming and functional programming. .scala files are regular source; .sc files are Ammonite scripts.",
    usedFor: [
      { label: "scala-lang.org", description: "Official Scala language home", href: "https://www.scala-lang.org/" },
      { label: "Ammonite", description: "Ammonite Scala REPL and scripts", href: "https://ammonite.io/" }
    ]
  }
};
var scala_lang_default = plugin134;

// ../../docs/types/text/known/nim-lang/index.js
var plugin135 = {
  id: "nim-lang",
  label: "Nim",
  tags: ["nim", "systems", "compiled"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (name.endsWith(".nimble")) return null;
    if (!name.endsWith(".nim")) return false;
    return true;
  },
  loadRenderer: () => import("../types/text/known/nim-lang/renderer.js"),
  about: {
    description: "Nim is a statically typed compiled systems programming language. .nim source files define modules that can be imported or run directly.",
    usedFor: [
      { label: "nim-lang.org", description: "Official Nim language home", href: "https://nim-lang.org/" },
      { label: "Nimble packages", description: "Nim package directory", href: "https://nimble.directory/" }
    ]
  }
};
var nim_lang_default = plugin135;

// ../../docs/types/text/known/dart-lang/index.js
var plugin136 = {
  id: "dart-lang",
  label: "Dart",
  tags: ["dart", "flutter", "mobile", "web"],
  match(intake) {
    const name = (intake.name || intake.filename || "").toLowerCase();
    if (!name.endsWith(".dart")) return false;
    const text = intake.text || "";
    if (/void\s+main\s*\(/.test(text)) return true;
    if (/import\s+'package:/.test(text)) return true;
    if (/^\s*class\s+\w+/m.test(text)) return true;
    if (/void\s+main\s*\(\s*\)\s*async/.test(text)) return true;
    return true;
  },
  loadRenderer: () => import("../types/text/known/dart-lang/renderer.js"),
  about: {
    description: "Dart is a client-optimized programming language for fast apps on any platform, developed by Google. Used extensively with Flutter for mobile and web development.",
    usedFor: [
      { label: "dart.dev", description: "Official Dart language home", href: "https://dart.dev/" },
      { label: "flutter.dev", description: "Flutter framework built on Dart", href: "https://flutter.dev/" }
    ]
  }
};
var dart_lang_default = plugin136;

// ../../docs/types/text/known/groovy-lang/index.js
var GROOVY_EXTS = /* @__PURE__ */ new Set(["groovy", "gvy", "gy", "gsh", "gradle"]);
var plugin137 = {
  id: "groovy-lang",
  label: "Groovy",
  tags: ["groovy", "gvy", "gy", "gsh", "jvm", "scripting"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (name === "build.gradle" || name === "build.gradle.kts" || name === "settings.gradle" || name === "settings.gradle.kts") return false;
    if (name.endsWith(".groovy") || name.endsWith(".gvy") || name.endsWith(".gy") || name.endsWith(".gsh") || name.endsWith(".gradle")) return true;
    const ext = name.includes(".") ? name.slice(name.lastIndexOf(".") + 1) : "";
    if (ext && !GROOVY_EXTS.has(ext)) return false;
    const text = intake.text || "";
    const hits = [
      /^def\s+/m.test(text),
      /^class\s+/m.test(text),
      /^import\s+/m.test(text),
      /^package\s+/m.test(text)
    ].filter(Boolean).length;
    return hits >= 2;
  },
  loadRenderer: () => import("../types/text/known/groovy-lang/renderer.js"),
  about: {
    description: "Groovy is a dynamic JVM language with optional typing, closures, and a concise syntax. .groovy and .gvy files are regular source; .gy is a shorthand extension; .gsh files are Groovy shell scripts.",
    usedFor: [
      { label: "groovy-lang.org", description: "Official Apache Groovy language home", href: "https://groovy-lang.org/" },
      { label: "Gradle + Groovy", description: "Groovy DSL in Gradle build scripts", href: "https://docs.gradle.org/current/userguide/groovy_build_script_primer.html" }
    ]
  }
};
var groovy_lang_default = plugin137;

// ../../docs/types/text/known/crystal-lang/index.js
var plugin138 = {
  id: "crystal-lang",
  label: "Crystal",
  tags: ["crystal", "cr", "ruby-like", "systems"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (!name.endsWith(".cr")) return false;
    const text = intake.text || "";
    if (/^#include\b/m.test(text) || /^typedef\b/m.test(text)) return false;
    const hits = [
      /^def\s+/m.test(text),
      /^class\s+/m.test(text),
      /^module\s+/m.test(text),
      /^require\s+/m.test(text),
      /^struct\s+/m.test(text)
    ].filter(Boolean).length;
    return hits >= 1;
  },
  loadRenderer: () => import("../types/text/known/crystal-lang/renderer.js"),
  about: {
    description: "Crystal is a statically typed, compiled language with Ruby-like syntax, native performance, and built-in concurrency via fibers. .cr files are Crystal source files.",
    usedFor: [
      { label: "crystal-lang.org", description: "Official Crystal language home", href: "https://crystal-lang.org/" },
      { label: "Crystal API docs", description: "Standard library documentation", href: "https://crystal-lang.org/api/" }
    ]
  }
};
var crystal_lang_default = plugin138;

// ../../docs/types/text/known/julia-lang/index.js
var plugin139 = {
  id: "julia-lang",
  label: "Julia",
  tags: ["julia", "jl", "scientific", "numerical"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (!name.endsWith(".jl")) return false;
    const text = intake.text || "";
    const firstLine = text.trimStart().slice(0, 200);
    if (/^name\s*=/.test(firstLine) || /^\[deps\]/.test(firstLine) || /^\[compat\]/.test(firstLine)) return false;
    const hits = [
      /^function\s+/m.test(text),
      /^module\s+/m.test(text),
      /^import\s+/m.test(text),
      /^using\s+/m.test(text),
      /^struct\s+/m.test(text)
    ].filter(Boolean).length;
    return hits >= 1;
  },
  loadRenderer: () => import("../types/text/known/julia-lang/renderer.js"),
  about: {
    description: "Julia is a high-performance dynamic language for scientific computing, with first-class support for numerical analysis, machine learning, and parallel execution. .jl files are Julia source files.",
    usedFor: [
      { label: "julialang.org", description: "Official Julia language home", href: "https://julialang.org/" },
      { label: "Julia Packages", description: "Julia package registry", href: "https://juliapackages.com/" }
    ]
  }
};
var julia_lang_default = plugin139;

// ../../docs/types/text/known/r-lang/index.js
var plugin140 = {
  id: "r-lang",
  label: "R",
  tags: ["r", "rlang", "statistics", "datascience"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop();
    if (name.toLowerCase() !== name.replace(/\.r$/i, "") + ".r" && !name.toLowerCase().endsWith(".r")) return false;
    if (!/\.r$/i.test(name)) return false;
    const text = intake.text || "";
    const preview = text.slice(0, 3e3);
    if (!/<-/.test(preview) && !/library\(/.test(preview) && !/function\(/.test(preview)) return false;
    return true;
  },
  loadRenderer: () => import("../types/text/known/r-lang/renderer.js"),
  about: {
    description: "R is a language and environment for statistical computing and graphics, widely used in data science, bioinformatics, and academic research. .R files are R source scripts.",
    usedFor: [
      { label: "r-project.org", description: "Official R language home", href: "https://www.r-project.org/" },
      { label: "CRAN", description: "Comprehensive R Archive Network — packages", href: "https://cran.r-project.org/" }
    ]
  }
};
var r_lang_default = plugin140;

// ../../docs/types/text/known/lua-lang/index.js
var plugin141 = {
  id: "lua-lang",
  label: "Lua",
  tags: ["lua", "scripting", "embedded", "gamedev"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (!name.endsWith(".lua")) return false;
    if (name === ".wezterm.lua" || name === "wezterm.lua") return null;
    const text = intake.text || "";
    if (name === "init.lua" && (text.includes("vim.opt") || text.includes("vim.keymap") || text.includes("vim.g.mapleader"))) return false;
    const hits = [
      /\bfunction\s+\w+/.test(text),
      /\blocal\s+\w+/.test(text),
      /\brequire\s*\(/.test(text),
      /\breturn\s+/.test(text)
    ].filter(Boolean).length;
    return hits >= 1;
  },
  loadRenderer: () => import("../types/text/known/lua-lang/renderer.js"),
  about: {
    description: "Lua is a lightweight, high-level scripting language designed for embedded use in applications. It is popular in game development (Roblox, LÖVE, World of Warcraft addons) and as a configuration language.",
    usedFor: [
      { label: "lua.org", description: "Official Lua language home", href: "https://www.lua.org/" },
      { label: "LuaRocks", description: "Lua package manager", href: "https://luarocks.org/" }
    ]
  }
};
var lua_lang_default = plugin141;

// ../../docs/types/text/known/purescript-lang/index.js
var plugin142 = {
  id: "purescript-lang",
  label: "PureScript",
  tags: ["purescript", "purs", "functional", "haskell", "javascript"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (!name.endsWith(".purs")) return false;
    const text = intake.text || "";
    const hits = [
      /^module\s+[A-Z]/m.test(text),
      /^import\s+[A-Z]/m.test(text),
      /^\s*type\s+\w/m.test(text),
      /^\s*data\s+\w/m.test(text)
    ].filter(Boolean).length;
    return hits >= 1;
  },
  loadRenderer: () => import("../types/text/known/purescript-lang/renderer.js"),
  about: {
    description: "PureScript is a strongly-typed, purely functional programming language that compiles to JavaScript. It is inspired by Haskell but designed specifically for web development.",
    usedFor: [
      { label: "purescript.org", description: "Official PureScript language home", href: "https://www.purescript.org/" },
      { label: "Pursuit", description: "PureScript package search", href: "https://pursuit.purescript.org/" }
    ]
  }
};
var purescript_lang_default = plugin142;

// ../../docs/types/text/known/swift-lang/index.js
var plugin143 = {
  id: "swift-lang",
  label: "Swift",
  tags: ["swift", "ios", "macos", "apple", "swiftui"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop();
    const lower = name.toLowerCase();
    if (lower === "package.swift") return null;
    if (!lower.endsWith(".swift")) return false;
    const text = intake.text || "";
    const hits = [
      /\bimport\s+\w+/.test(text),
      /\bclass\s+\w+/.test(text),
      /\bstruct\s+\w+/.test(text),
      /\bfunc\s+\w+/.test(text),
      /\bprotocol\s+\w+/.test(text)
    ].filter(Boolean).length;
    return hits >= 1;
  },
  loadRenderer: () => import("../types/text/known/swift-lang/renderer.js"),
  about: {
    description: "Swift is a general-purpose, compiled programming language developed by Apple. It is used for iOS, macOS, watchOS, tvOS, and server-side development.",
    usedFor: [
      { label: "swift.org", description: "Official Swift language home", href: "https://swift.org/" },
      { label: "Apple Developer", description: "Apple developer documentation", href: "https://developer.apple.com/swift/" }
    ]
  }
};
var swift_lang_default = plugin143;

// ../../docs/types/text/known/erlang-source/index.js
var plugin144 = {
  id: "erlang-source",
  label: "Erlang",
  tags: ["erlang", "erl", "hrl", "otp", "functional", "concurrent"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const isErl = name.endsWith(".erl");
    const isHrl = name.endsWith(".hrl");
    if (!isErl && !isHrl) return false;
    const text = intake.text || "";
    if (isErl) {
      const hasErlangMarker = /-module\s*\(/.test(text) || /-export\s*\(/.test(text) || /-import\s*\(/.test(text);
      if (!hasErlangMarker) return false;
    }
    return true;
  },
  loadRenderer: () => import("../types/text/known/erlang-source/renderer.js"),
  about: {
    description: "Erlang is a general-purpose, concurrent, functional programming language originally designed for telecom systems. It is known for fault tolerance and the OTP framework.",
    usedFor: [
      { label: "erlang.org", description: "Official Erlang language home", href: "https://www.erlang.org/" },
      { label: "OTP Design Principles", description: "Erlang/OTP documentation", href: "https://www.erlang.org/doc/design_principles/des_princ.html" }
    ]
  }
};
var erlang_source_default = plugin144;

// ../../docs/types/text/known/tcl-lang/index.js
var plugin145 = {
  id: "tcl-lang",
  label: "Tcl",
  tags: ["tcl", "tk", "scripting", "embedded"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (!name.endsWith(".tcl") && !name.endsWith(".tk")) return false;
    const text = (intake.text || "").slice(0, 2e3);
    if (!text.includes("proc ") && !text.includes("namespace") && !text.includes("package")) return null;
    return true;
  },
  loadRenderer: () => import("../types/text/known/tcl-lang/renderer.js"),
  about: {
    description: "Tcl (Tool Command Language) is a dynamic scripting language. Tk is its GUI toolkit extension, used to build cross-platform desktop applications.",
    usedFor: [
      { label: "tcl.tk", description: "Tcl/Tk scripting language", href: "https://www.tcl.tk/" },
      { label: "wiki.tcl-lang.org", description: "Tcl community wiki", href: "https://wiki.tcl-lang.org/" }
    ]
  }
};
var tcl_lang_default = plugin145;

// ../../docs/types/text/known/scheme-lang/index.js
var plugin146 = {
  id: "scheme-lang",
  label: "Scheme",
  tags: ["scheme", "lisp", "functional", "r7rs"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (!name.endsWith(".scm") && !name.endsWith(".ss")) return false;
    const text = (intake.text || "").slice(0, 2e3);
    if (!text.includes("(define") && !text.includes("(lambda")) return null;
    return true;
  },
  loadRenderer: () => import("../types/text/known/scheme-lang/renderer.js"),
  about: {
    description: "Scheme is a minimalist dialect of Lisp, known for its clean semantics, tail-call optimization, and first-class continuations. R7RS is the current standard.",
    usedFor: [
      { label: "r7rs.org", description: "R7RS Scheme standard", href: "http://r7rs.org/" },
      { label: "schemers.org", description: "Scheme community resources", href: "https://schemers.org/" }
    ]
  }
};
var scheme_lang_default = plugin146;

// ../../docs/types/text/known/racket-lang/index.js
var plugin147 = {
  id: "racket-lang",
  label: "Racket",
  tags: ["racket", "lisp", "scheme", "functional"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (!name.endsWith(".rkt") && !name.endsWith(".rktl") && !name.endsWith(".rktd")) return false;
    const text = (intake.text || "").slice(0, 2e3);
    if (!text.includes("#lang") && !text.includes("(require") && !text.includes("(define")) return null;
    return true;
  },
  loadRenderer: () => import("../types/text/known/racket-lang/renderer.js"),
  about: {
    description: "Racket is a general-purpose programming language and platform in the Lisp/Scheme family, known for its macro system, language-oriented programming, and the DrRacket IDE.",
    usedFor: [
      { label: "racket-lang.org", description: "Official Racket language home", href: "https://racket-lang.org/" },
      { label: "docs.racket-lang.org", description: "Racket documentation", href: "https://docs.racket-lang.org/" }
    ]
  }
};
var racket_lang_default = plugin147;

// ../../docs/types/text/known/fortran-lang/index.js
var plugin148 = {
  id: "fortran-lang",
  label: "Fortran",
  tags: ["fortran", "scientific", "numerical", "hpc"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const fortranExts = [".f90", ".f95", ".f03", ".f08", ".f", ".for", ".f77"];
    if (!fortranExts.some((ext) => name.endsWith(ext))) return false;
    const text = (intake.text || "").slice(0, 3e3);
    if (!/PROGRAM|MODULE|SUBROUTINE|FUNCTION|END/i.test(text)) return null;
    return true;
  },
  loadRenderer: () => import("../types/text/known/fortran-lang/renderer.js"),
  about: {
    description: "Fortran is a compiled, statically typed programming language historically used for numerical and scientific computing, high-performance computing (HPC), and simulation.",
    usedFor: [
      { label: "fortran-lang.org", description: "Modern Fortran community", href: "https://fortran-lang.org/" },
      { label: "j3-fortran.org", description: "Fortran standards committee", href: "https://j3-fortran.org/" }
    ]
  }
};
var fortran_lang_default = plugin148;

// ../../docs/types/text/known/ruby-lang/index.js
var plugin149 = {
  id: "ruby-lang",
  label: "Ruby",
  tags: ["ruby", "scripting", "oop", "rb"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const RESERVED = ["gemfile", "rakefile", "guardfile", "berksfile", "podfile", "fastfile", "snapfile", "matchfile", "appfile", "puma.rb"];
    if (RESERVED.includes(name)) return null;
    if (!name.endsWith(".rb")) return false;
    return true;
  },
  loadRenderer: () => import("../types/text/known/ruby-lang/renderer.js"),
  about: {
    description: "Ruby is a dynamic, object-oriented scripting language known for its elegant syntax and the Ruby on Rails web framework. .rb files are Ruby source files.",
    usedFor: [
      { label: "ruby-lang.org", description: "Official Ruby language home", href: "https://www.ruby-lang.org/" },
      { label: "RubyGems", description: "Ruby gem hosting and package manager", href: "https://rubygems.org/" }
    ]
  }
};
var ruby_lang_default = plugin149;

// ../../docs/types/text/known/perl-lang/index.js
var plugin150 = {
  id: "perl-lang",
  label: "Perl",
  tags: ["perl", "scripting", "pl", "pm", "pod"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (name.endsWith(".pm") || name.endsWith(".pod")) return true;
    if (name.endsWith(".pl")) {
      const sample = (intake.text || "").slice(0, 2e3);
      if (!sample.includes("use ") && !sample.includes("my ") && !sample.includes("sub ")) return null;
      return true;
    }
    return false;
  },
  loadRenderer: () => import("../types/text/known/perl-lang/renderer.js"),
  about: {
    description: "Perl is a high-level, general-purpose, interpreted, dynamic programming language. .pl files are Perl scripts, .pm files are Perl modules, .pod files contain Plain Old Documentation.",
    usedFor: [
      { label: "perldoc.perl.org", description: "Official Perl documentation", href: "https://perldoc.perl.org/" },
      { label: "CPAN", description: "Comprehensive Perl Archive Network", href: "https://www.cpan.org/" }
    ]
  }
};
var perl_lang_default = plugin150;

// ../../docs/types/text/known/php-lang/index.js
var plugin151 = {
  id: "php-lang",
  label: "PHP",
  tags: ["php", "web", "scripting", "phtml"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (!name.endsWith(".php") && !name.endsWith(".phtml") && !name.endsWith(".php5") && !name.endsWith(".php8")) return false;
    if (name === "rector.php" || name === "config.php") return null;
    const sample = (intake.text || "").slice(0, 500);
    if (!sample.includes("<?php") && !sample.includes("<?")) return null;
    return true;
  },
  loadRenderer: () => import("../types/text/known/php-lang/renderer.js"),
  about: {
    description: "PHP is a server-side scripting language designed for web development. .php files are PHP source files; .phtml files mix PHP and HTML templates.",
    usedFor: [
      { label: "php.net", description: "Official PHP documentation", href: "https://www.php.net/" },
      { label: "Packagist", description: "PHP package repository", href: "https://packagist.org/" }
    ]
  }
};
var php_lang_default = plugin151;

// ../../docs/types/text/known/powershell-lang/index.js
var plugin152 = {
  id: "powershell-lang",
  label: "PowerShell",
  tags: ["powershell", "ps1", "psm1", "psd1", "windows", "scripting"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (name.endsWith(".ps1") || name.endsWith(".psm1") || name.endsWith(".psd1")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/powershell-lang/renderer.js"),
  about: {
    description: "PowerShell is a cross-platform task automation shell and scripting language. .ps1 are scripts, .psm1 are modules, .psd1 are module manifests/data files.",
    usedFor: [
      { label: "PowerShell Docs", description: "Official Microsoft PowerShell documentation", href: "https://learn.microsoft.com/en-us/powershell/" },
      { label: "PowerShell Gallery", description: "Community module repository", href: "https://www.powershellgallery.com/" }
    ]
  }
};
var powershell_lang_default = plugin152;

// ../../docs/types/text/known/solidity-lang/index.js
var plugin153 = {
  id: "solidity-lang",
  label: "Solidity",
  tags: ["solidity", "ethereum", "smart-contract", "blockchain", "evm"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (!name.endsWith(".sol")) return false;
    const text = (intake.text || "").slice(0, 2e3);
    if (!text.includes("pragma solidity") && !text.includes("contract ")) return null;
    return true;
  },
  loadRenderer: () => import("../types/text/known/solidity-lang/renderer.js"),
  about: {
    description: "Solidity is the primary object-oriented programming language for writing Ethereum smart contracts.",
    usedFor: [
      { label: "soliditylang.org", description: "Official Solidity language documentation", href: "https://soliditylang.org/" },
      { label: "Ethereum Smart Contracts", description: "Solidity is the most popular language for EVM smart contracts", href: "https://ethereum.org/en/developers/docs/smart-contracts/" }
    ]
  }
};
var solidity_lang_default = plugin153;

// ../../docs/types/text/known/vhdl-lang/index.js
var plugin154 = {
  id: "vhdl-lang",
  label: "VHDL",
  tags: ["vhdl", "hdl", "hardware", "fpga", "rtl", "digital-design"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (!name.endsWith(".vhd") && !name.endsWith(".vhdl")) return false;
    const text = (intake.text || "").slice(0, 3e3);
    if (!/entity\s/i.test(text) && !/architecture\s/i.test(text)) return null;
    return true;
  },
  loadRenderer: () => import("../types/text/known/vhdl-lang/renderer.js"),
  about: {
    description: "VHDL (VHSIC Hardware Description Language) is a hardware description language used to model and simulate digital circuits for FPGA and ASIC design.",
    usedFor: [
      { label: "IEEE VHDL (1076)", description: "IEEE standard for VHDL hardware description language", href: "https://ieeexplore.ieee.org/document/8938196" },
      { label: "VHDL Guide", description: "VHDL language reference and tutorials", href: "https://vhdlguide.com/" }
    ]
  }
};
var vhdl_lang_default = plugin154;

// ../../docs/types/text/known/arduino-sketch/index.js
var plugin155 = {
  id: "arduino-sketch",
  label: "Arduino Sketch",
  tags: ["arduino", "embedded", "microcontroller", "iot", "c++"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (!name.endsWith(".ino")) return false;
    const text = (intake.text || "").slice(0, 2e3);
    if (!text.includes("void setup()") && !text.includes("void loop()") && !text.includes("#include")) return null;
    return true;
  },
  loadRenderer: () => import("../types/text/known/arduino-sketch/renderer.js"),
  about: {
    description: "Arduino sketches are C++ programs for Arduino microcontrollers, always containing setup() (runs once) and loop() (runs repeatedly) functions.",
    usedFor: [
      { label: "arduino.cc", description: "Official Arduino language reference and documentation", href: "https://www.arduino.cc/reference/en/" },
      { label: "Arduino IDE", description: "Development environment for Arduino sketches", href: "https://www.arduino.cc/en/software" }
    ]
  }
};
var arduino_sketch_default = plugin155;

// ../../docs/types/text/known/cobol-lang/index.js
var plugin156 = {
  id: "cobol-lang",
  label: "COBOL",
  tags: ["cobol", "mainframe", "business", "legacy", "enterprise"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (!name.endsWith(".cob") && !name.endsWith(".cbl") && !name.endsWith(".cpy") && !name.endsWith(".cobol")) return false;
    const text = (intake.text || "").slice(0, 3e3);
    if (!/DIVISION/i.test(text)) return null;
    return true;
  },
  loadRenderer: () => import("../types/text/known/cobol-lang/renderer.js"),
  about: {
    description: "COBOL (Common Business-Oriented Language) is a legacy compiled programming language designed for business, finance, and administrative systems. Still widely used in mainframe environments.",
    usedFor: [
      { label: "GnuCOBOL", description: "Free COBOL compiler and runtime", href: "https://gnucobol.sourceforge.io/" },
      { label: "IBM COBOL", description: "Enterprise COBOL for IBM Z mainframes", href: "https://www.ibm.com/products/cobol-compiler-zos" }
    ]
  }
};
var cobol_lang_default = plugin156;

// ../../docs/types/text/known/gleam-lang/index.js
var plugin157 = {
  id: "gleam-lang",
  label: "Gleam",
  tags: ["gleam", "functional", "erlang", "beam"],
  match(intake) {
    const name = (intake.name || intake.filename || "").toLowerCase();
    if (name.endsWith(".gleam")) return true;
    const text = intake.text || "";
    const hits = [
      /^import\s+/m.test(text),
      /^pub\s+fn\s+\w+/m.test(text),
      /^type\s+\w+/m.test(text),
      /^pub\s+type\s+\w+/m.test(text)
    ].filter(Boolean).length;
    return hits >= 2;
  },
  loadRenderer: () => import("../types/text/known/gleam-lang/renderer.js"),
  about: {
    description: "Gleam is a friendly functional programming language that compiles to Erlang and JavaScript. .gleam files are source modules featuring strong static typing and pattern matching.",
    usedFor: [
      { label: "gleam.run", description: "Official Gleam language home", href: "https://gleam.run/" },
      { label: "Gleam Tour", description: "Interactive language tour", href: "https://tour.gleam.run/" }
    ]
  }
};
var gleam_lang_default = plugin157;

// ../../docs/types/text/known/odin-lang/index.js
var plugin158 = {
  id: "odin-lang",
  label: "Odin",
  tags: ["odin", "systems", "native", "c-alternative"],
  match(intake) {
    const name = (intake.name || intake.filename || "").toLowerCase();
    if (name.endsWith(".odin")) return true;
    const text = intake.text || "";
    const hits = [
      /^package\s+\w+/m.test(text),
      /^import\s+/m.test(text),
      /\bproc\s+\w+/m.test(text),
      /\bstruct\s*\{/.test(text)
    ].filter(Boolean).length;
    return hits >= 3;
  },
  loadRenderer: () => import("../types/text/known/odin-lang/renderer.js"),
  about: {
    description: "Odin is a general-purpose, systems programming language built with the intent of creating an alternative to C. .odin files are source files using packages as the organisational unit.",
    usedFor: [
      { label: "odin-lang.org", description: "Official Odin language home", href: "https://odin-lang.org/" },
      { label: "Odin Overview", description: "Language overview and documentation", href: "https://odin-lang.org/docs/overview/" }
    ]
  }
};
var odin_lang_default = plugin158;

// ../../docs/types/text/known/haxe-lang/index.js
var plugin159 = {
  id: "haxe-lang",
  label: "Haxe",
  tags: ["haxe", "hx", "multi-target", "cross-platform"],
  match(intake) {
    const name = (intake.name || intake.filename || "").toLowerCase();
    if (name.endsWith(".hx")) {
      const preview = (intake.text || "").slice(0, 2e3);
      if (!preview.includes("class ") && !preview.includes("import ") && !preview.includes("package ")) return false;
      return true;
    }
    const text = intake.text || "";
    const hits = [
      /^class\s+\w+/m.test(text),
      /^import\s+[\w.]+/m.test(text),
      /^package\s+[\w.]+/m.test(text),
      /^function\s+\w+/m.test(text)
    ].filter(Boolean).length;
    return hits >= 3;
  },
  loadRenderer: () => import("../types/text/known/haxe-lang/renderer.js"),
  about: {
    description: "Haxe is an open-source high-level strictly-typed programming language that can compile to multiple targets including JavaScript, C++, Java, Python, and more. .hx files are Haxe source files.",
    usedFor: [
      { label: "haxe.org", description: "Official Haxe language home", href: "https://haxe.org/" },
      { label: "Haxe Manual", description: "Official Haxe manual", href: "https://haxe.org/manual/" }
    ]
  }
};
var haxe_lang_default = plugin159;

// ../../docs/types/text/known/ada-lang/index.js
var plugin160 = {
  id: "ada-lang",
  label: "Ada",
  tags: ["ada", "safety-critical", "embedded", "military"],
  match(intake) {
    const name = (intake.name || intake.filename || "").toLowerCase();
    if (name.endsWith(".ads") || name.endsWith(".adb")) {
      const preview = (intake.text || "").slice(0, 3e3);
      if (!/package\s/i.test(preview) && !/procedure\s/i.test(preview) && !/function\s/i.test(preview)) return false;
      return true;
    }
    const text = intake.text || "";
    const hits = [
      /\bpackage\s+\w+/i.test(text),
      /\bprocedure\s+\w+/i.test(text),
      /\bfunction\s+\w+/i.test(text),
      /\bwith\s+[\w.]+\s*;/i.test(text),
      /\bpragma\s+\w+/i.test(text)
    ].filter(Boolean).length;
    return hits >= 3;
  },
  loadRenderer: () => import("../types/text/known/ada-lang/renderer.js"),
  about: {
    description: "Ada is a structured, statically typed, imperative, and object-oriented high-level programming language designed for safety-critical and large-scale systems. .ads files are package specs; .adb files are package bodies.",
    usedFor: [
      { label: "ada-lang.io", description: "Ada community hub", href: "https://ada-lang.io/" },
      { label: "AdaCore", description: "Ada tools and documentation", href: "https://www.adacore.com/" }
    ]
  }
};
var ada_lang_default = plugin160;

// ../../docs/types/text/known/prolog-lang/index.js
var plugin161 = {
  id: "prolog-lang",
  label: "Prolog",
  tags: ["prolog", "logic", "pl", "pro", "dcg"],
  match(intake) {
    const name = intake.name || intake.filename || "";
    const lower = name.toLowerCase();
    const text = intake.text || "";
    const basename = lower.split("/").pop();
    if (basename === "proguard-rules.pro" || basename === "consumer-rules.pro" || basename === "proguard-rules.txt") return false;
    if (lower.endsWith(".pro")) return true;
    if (name.endsWith(".P")) return true;
    if (lower.endsWith(".pl")) {
      if (!text.includes(":-")) return false;
      const lines = text.split(/\r?\n/);
      for (const line of lines) {
        const t = line.trimStart();
        if (t.startsWith("use ") || t.startsWith("sub ") || t.startsWith("my ")) return false;
      }
      return true;
    }
    return false;
  },
  loadRenderer: () => import("../types/text/known/prolog-lang/renderer.js"),
  about: {
    description: "Prolog is a logic programming language. Programs consist of facts, rules, and queries. The :- operator (neck) separates a rule head from its body. DCG (Definite Clause Grammars) use --> for grammar rules.",
    usedFor: [
      { label: "SWI-Prolog", description: "Popular open-source Prolog implementation", href: "https://www.swi-prolog.org/" },
      { label: "GNU Prolog", description: "GNU Prolog compiler and interpreter", href: "http://www.gprolog.org/" }
    ]
  }
};
var prolog_lang_default = plugin161;

// ../../docs/types/text/known/asm-lang/index.js
var plugin162 = {
  id: "asm-lang",
  label: "Assembly",
  tags: ["asm", "assembly", "nasm", "gas", "x86", "s", "nas"],
  match(intake) {
    const name = intake.name || intake.filename || "";
    const lower = name.toLowerCase();
    const text = intake.text || "";
    if (lower.endsWith(".asm") || lower.endsWith(".nasm") || lower.endsWith(".nas")) return true;
    if (lower.endsWith(".s") || name.endsWith(".S")) {
      const head = text.slice(0, 2e3);
      return head.includes(";") || head.includes("#") || head.includes(".section") || head.includes(".global") || head.includes("SECTION");
    }
    return false;
  },
  loadRenderer: () => import("../types/text/known/asm-lang/renderer.js"),
  about: {
    description: "Assembly language is a low-level programming language with a strong correspondence to machine code instructions. Common flavors include NASM (Intel syntax), GAS/AT&T syntax (used by GCC), and Intel syntax.",
    usedFor: [
      { label: "NASM", description: "Netwide Assembler — popular Intel-syntax assembler", href: "https://nasm.us/" },
      { label: "GAS", description: "GNU Assembler — part of GNU Binutils, AT&T syntax", href: "https://www.gnu.org/software/binutils/" }
    ]
  }
};
var asm_lang_default = plugin162;

// ../../docs/types/text/known/objc-lang/index.js
var plugin163 = {
  id: "objc-lang",
  label: "Objective-C",
  tags: ["objc", "objectivec", "m", "mm", "cocoa", "ios", "macos"],
  match(intake) {
    const name = intake.name || intake.filename || "";
    const lower = name.toLowerCase();
    const text = intake.text || "";
    if (lower.endsWith(".mm")) return true;
    if (lower.endsWith(".m")) {
      const head = text.slice(0, 3e3);
      return head.includes("@implementation") || head.includes("#import") || head.includes("@interface");
    }
    if (lower.endsWith(".h")) {
      const head = text.slice(0, 3e3);
      return head.includes("@interface") || head.includes("@protocol");
    }
    return false;
  },
  loadRenderer: () => import("../types/text/known/objc-lang/renderer.js"),
  about: {
    description: "Objective-C is a superset of C that adds Smalltalk-style messaging. .m files are implementation files; .mm files are Objective-C++ (mixed ObjC and C++); .h files can declare ObjC interfaces and protocols.",
    usedFor: [
      { label: "Apple Developer", description: "Objective-C documentation from Apple", href: "https://developer.apple.com/library/archive/documentation/Cocoa/Conceptual/ProgrammingWithObjectiveC/Introduction/Introduction.html" },
      { label: "Clang", description: "Clang compiler with Objective-C support", href: "https://clang.llvm.org/" }
    ]
  }
};
var objc_lang_default = plugin163;

// ../../docs/types/text/known/d-lang/index.js
var plugin164 = {
  id: "d-lang",
  label: "D",
  tags: ["dlang", "d", "dmd", "phobos"],
  match(intake) {
    const name = intake.name || intake.filename || "";
    const lower = name.toLowerCase();
    if (!lower.endsWith(".d")) return false;
    const text = intake.text || "";
    const head = text.slice(0, 2e3);
    const firstNonEmpty = text.split(/\r?\n/).find((l) => l.trim().length > 0) || "";
    if (/^[a-zA-Z0-9_./\\-]+:\s/.test(firstNonEmpty.trim())) return false;
    const lines = head.split(/\r?\n/);
    for (const line of lines) {
      const t = line.trimStart();
      if (t.startsWith("module ") || t.startsWith("import ") || t.startsWith("class ") || t.startsWith("void ") || t.startsWith("auto ") || t.startsWith("struct ") || t.startsWith("interface ") || t.startsWith("enum ") || t.startsWith("template ")) {
        return true;
      }
    }
    return false;
  },
  loadRenderer: () => import("../types/text/known/d-lang/renderer.js"),
  about: {
    description: "D is a systems programming language with C-like syntax, combining the power of C++ with modern safety and productivity features. It supports garbage collection, templates, contracts, and built-in unit tests.",
    usedFor: [
      { label: "dlang.org", description: "Official D programming language website", href: "https://dlang.org/" },
      { label: "DMD", description: "Digital Mars D Compiler — the reference D compiler", href: "https://dlang.org/dmd.html" }
    ]
  }
};
var d_lang_default = plugin164;

// ../../docs/types/text/known/coffeescript-lang/index.js
var COFFEE_EXTS = /* @__PURE__ */ new Set(["coffee", "litcoffee"]);
var plugin165 = {
  id: "coffeescript-lang",
  label: "CoffeeScript",
  tags: ["coffeescript", "coffee", "javascript", "literate"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (name.endsWith(".coffee") || name.endsWith(".litcoffee") || name.endsWith(".coffee.md")) return true;
    const ext = name.includes(".") ? name.slice(name.lastIndexOf(".") + 1) : "";
    if (ext && !COFFEE_EXTS.has(ext)) return false;
    const text = intake.text || "";
    const hits = [
      /->/.test(text),
      /=>/.test(text),
      /\bclass\s+\w+/.test(text),
      /\brequire\s+['"]/.test(text)
    ].filter(Boolean).length;
    return hits >= 2;
  },
  loadRenderer: () => import("../types/text/known/coffeescript-lang/renderer.js"),
  about: {
    description: "CoffeeScript is a little language that compiles into JavaScript, offering a clean syntax with significant whitespace. .litcoffee and .coffee.md are Literate CoffeeScript files where code is embedded in Markdown.",
    usedFor: [
      { label: "CoffeeScript", description: "Official CoffeeScript language site", href: "https://coffeescript.org/" }
    ]
  }
};
var coffeescript_lang_default = plugin165;

// ../../docs/types/text/known/livescript-lang/index.js
function hasLiveScriptContent(text) {
  if (!text) return false;
  const sample = text.slice(0, 2e3);
  return /->/.test(sample) || /<-/.test(sample) || /\bfunction\s+\w+/.test(sample) || /\bclass\s+\w+/.test(sample);
}
var plugin166 = {
  id: "livescript-lang",
  label: "LiveScript",
  tags: ["livescript", "ls", "javascript", "functional"],
  match(intake) {
    const name = (intake.name || intake.filename || "").toLowerCase();
    if (name.endsWith(".ls")) {
      return hasLiveScriptContent(intake.text);
    }
    return false;
  },
  loadRenderer: () => import("../types/text/known/livescript-lang/renderer.js"),
  about: {
    description: "LiveScript is a language which compiles to JavaScript. It has a straightforward mapping to JavaScript and allows you to write expressive code with less typing. It is inspired by Haskell and CoffeeScript.",
    usedFor: [
      { label: "LiveScript", description: "Official LiveScript language site", href: "https://livescript.net/" },
      { label: "prelude.ls", description: "Functional utility library for LiveScript", href: "https://www.preludels.com/" }
    ]
  }
};
var livescript_lang_default = plugin166;

// ../../docs/types/text/known/rescript-lang/index.js
var plugin167 = {
  id: "rescript-lang",
  label: "ReScript",
  tags: ["rescript", "res", "resi", "ocaml", "react"],
  match(intake) {
    const name = (intake.name || intake.filename || "").toLowerCase();
    if (name.endsWith(".resi")) return true;
    if (name.endsWith(".res")) {
      const sample = (intake.text || "").slice(0, 1e3);
      return /\blet\s+/.test(sample) || /\btype\s+/.test(sample) || /\bopen\s+/.test(sample);
    }
    return false;
  },
  loadRenderer: () => import("../types/text/known/rescript-lang/renderer.js"),
  about: {
    description: "ReScript is a robustly typed language that compiles to efficient and human-readable JavaScript. It has first-class JSX support and is popular for React applications.",
    usedFor: [
      { label: "ReScript", description: "Official ReScript language site", href: "https://rescript-lang.org/" },
      { label: "ReScript React", description: "React bindings for ReScript", href: "https://rescript-lang.org/docs/react/latest/introduction" }
    ]
  }
};
var rescript_lang_default = plugin167;

// ../../docs/types/text/known/reason-lang/index.js
function hasReasonContent(text) {
  if (!text) return false;
  const sample = text.slice(0, 2e3);
  return /\blet\s+/.test(sample) && (/\bmodule\s+/.test(sample) || /\btype\s+/.test(sample) || /\bopen\s+/.test(sample));
}
var plugin168 = {
  id: "reason-lang",
  label: "Reason",
  tags: ["reason", "re", "rei", "ocaml", "react", "reasonml"],
  match(intake) {
    const name = (intake.name || intake.filename || "").toLowerCase();
    if (name.endsWith(".rei")) return true;
    if (name.endsWith(".re")) {
      return hasReasonContent(intake.text);
    }
    return false;
  },
  loadRenderer: () => import("../types/text/known/reason-lang/renderer.js"),
  about: {
    description: "Reason (ReasonML) is a syntax extension and toolchain for OCaml. It provides a familiar JavaScript-like syntax while retaining the strong type system of OCaml, popular for React development via ReasonReact.",
    usedFor: [
      { label: "Reason", description: "Official Reason language site", href: "https://reasonml.github.io/" },
      { label: "ReasonReact", description: "React bindings for Reason", href: "https://reasonml.github.io/reason-react/" }
    ]
  }
};
var reason_lang_default = plugin168;

// ../../docs/types/text/known/pony-lang/index.js
var plugin169 = {
  id: "pony-lang",
  label: "Pony",
  tags: ["pony", "actor", "concurrent", "capability"],
  match(intake) {
    const name = (intake.name || intake.filename || "").toLowerCase();
    if (name.endsWith(".pony")) return true;
    const text = intake.text || "";
    const head = text.slice(0, 2e3);
    const boosts = [
      head.includes("actor "),
      head.includes("class "),
      head.includes("primitive "),
      head.includes("interface "),
      head.includes("trait ")
    ].filter(Boolean).length;
    if (boosts < 2) return false;
    const hits = [
      /^\s*actor\s+\w+/m.test(text),
      /^\s*class\s+\w+/m.test(text),
      /^\s*fun\s+\w+/m.test(text),
      /^\s*be\s+\w+/m.test(text),
      /^\s*primitive\s+\w+/m.test(text)
    ].filter(Boolean).length;
    return hits >= 2;
  },
  loadRenderer: () => import("../types/text/known/pony-lang/renderer.js"),
  about: {
    description: "Pony is an open-source, object-oriented, actor-model, capabilities-secure, high-performance programming language. .pony files are source modules featuring actors, classes, primitives, and capability types.",
    usedFor: [
      { label: "ponylang.io", description: "Official Pony language home", href: "https://www.ponylang.io/" },
      { label: "Pony Tutorial", description: "Official Pony language tutorial", href: "https://tutorial.ponylang.io/" }
    ]
  }
};
var pony_lang_default = plugin169;

// ../../docs/types/text/known/wren-lang/index.js
var plugin170 = {
  id: "wren-lang",
  label: "Wren Script",
  tags: ["wren", "scripting", "embedded", "class-based"],
  match(intake) {
    const name = (intake.name || intake.filename || "").toLowerCase();
    if (name.endsWith(".wren")) return true;
    const text = intake.text || "";
    const head = text.slice(0, 2e3);
    if (!head.includes("class ") && !head.includes("import ") && !head.includes("construct ")) return null;
    const hits = [
      /^import\s+"/m.test(text),
      /^\s*class\s+\w+/m.test(text),
      /\bconstruct\s+\w+\s*\(/.test(text),
      /\bSystem\.print\b/.test(text)
    ].filter(Boolean).length;
    return hits >= 2;
  },
  loadRenderer: () => import("../types/text/known/wren-lang/renderer.js"),
  about: {
    description: "Wren is a small, fast, class-based scripting language designed to be easily embedded in applications. .wren files are source scripts featuring classes with constructors, methods, and static members.",
    usedFor: [
      { label: "wren.io", description: "Official Wren language home", href: "https://wren.io/" },
      { label: "Wren Cookbook", description: "Practical Wren examples", href: "https://wren.io/cookbook/" }
    ]
  }
};
var wren_lang_default = plugin170;

// ../../docs/types/text/known/mojo-lang/index.js
var plugin171 = {
  id: "mojo-lang",
  label: "Mojo",
  tags: ["mojo", "python", "ai", "ml", "systems"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (name.endsWith(".mojo") || name.endsWith(".🔥")) return true;
    const ext = name.includes(".") ? name.slice(name.lastIndexOf(".") + 1) : "";
    if (ext && ext !== "mojo" && ext !== "🔥") return null;
    const text = intake.text || "";
    const head = text.slice(0, 2e3);
    if (!head.includes("fn ") && !head.includes("struct ") && !head.includes("from ")) return null;
    const hits = [
      /^\s*fn\s+\w+/m.test(text),
      /^\s*struct\s+\w+/m.test(text),
      /^\s*from\s+\w+\s+import\b/m.test(text),
      /\balias\s+\w+/.test(text),
      /\b@value\b/.test(text)
    ].filter(Boolean).length;
    return hits >= 2;
  },
  loadRenderer: () => import("../types/text/known/mojo-lang/renderer.js"),
  about: {
    description: "Mojo is a programming language that is a superset of Python, designed for AI/ML workloads with systems-level performance. .mojo files are source modules featuring structs, typed functions, and Python interop.",
    usedFor: [
      { label: "docs.modular.com", description: "Official Mojo language documentation", href: "https://docs.modular.com/mojo/" },
      { label: "Modular Platform", description: "Modular AI development platform", href: "https://www.modular.com/" }
    ]
  }
};
var mojo_lang_default = plugin171;

// ../../docs/types/text/known/janet-lang/index.js
var plugin172 = {
  id: "janet-lang",
  label: "Janet Script",
  tags: ["janet", "lisp", "scripting", "functional"],
  match(intake) {
    const name = (intake.name || intake.filename || "").toLowerCase();
    if (name.endsWith(".janet")) return true;
    const text = intake.text || "";
    const head = text.slice(0, 2e3);
    if (!head.includes("(defn") && !head.includes("(def")) return null;
    const hits = [
      /\(defn\s+\w+/.test(text),
      /\(def\s+\w+/.test(text),
      /\(import\s+/.test(text),
      /\(defmacro\s+\w+/.test(text),
      /\(module\s+/.test(text)
    ].filter(Boolean).length;
    return hits >= 2;
  },
  loadRenderer: () => import("../types/text/known/janet-lang/renderer.js"),
  about: {
    description: "Janet is a functional and imperative programming language and bytecode interpreter. It is a modern Lisp with macros, closures, and a rich standard library. .janet files are source modules.",
    usedFor: [
      { label: "janet-lang.org", description: "Official Janet language home", href: "https://janet-lang.org/" },
      { label: "Janet API Docs", description: "Janet standard library documentation", href: "https://janet-lang.org/api/index.html" }
    ]
  }
};
var janet_lang_default = plugin172;

// ../../docs/types/text/known/awk-script/index.js
var plugin173 = {
  id: "awk-script",
  label: "AWK Script",
  tags: ["awk", "gawk", "nawk", "mawk", "text-processing", "script"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (name.endsWith(".awk") || name === "awkscript") return true;
    const text = intake.text || "";
    const hits = [
      /^\s*BEGIN\s*\{/m.test(text),
      /^\s*END\s*\{/m.test(text),
      /\{[\s\S]*?print[\s\S]*?\}/m.test(text),
      /\bFS\s*=/.test(text),
      /\/[^/]+\/\s*\{/.test(text)
    ].filter(Boolean).length;
    return hits >= 2;
  },
  loadRenderer: () => import("../types/text/known/awk-script/renderer.js"),
  about: {
    description: "AWK is a text-processing language that operates on records and fields. Scripts define pattern-action rules applied line by line to input.",
    usedFor: [
      { label: "GNU AWK", description: "Feature-rich AWK implementation", href: "https://www.gnu.org/software/gawk/manual/gawk.html" },
      { label: "AWK one-liners", description: "Common AWK patterns", href: "https://www.pement.org/awk/awk1line.txt" }
    ]
  }
};
var awk_script_default = plugin173;

// ../../docs/types/text/known/sed-script/index.js
var plugin174 = {
  id: "sed-script",
  label: "sed Script",
  tags: ["sed", "text-processing", "script", "stream-editor"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (name.endsWith(".sed")) return true;
    const text = intake.text || "";
    const hits = [
      /\bs\/[^/]/.test(text),
      /^[0-9$,]+d$/m.test(text),
      /^[0-9$,]+p$/m.test(text),
      /\by\/[^/]/.test(text),
      /\b[0-9]+,[0-9]+[dpq]/.test(text)
    ].filter(Boolean).length;
    return hits >= 2;
  },
  loadRenderer: () => import("../types/text/known/sed-script/renderer.js"),
  about: {
    description: "sed (stream editor) is a Unix utility for filtering and transforming text. Scripts contain commands like substitution (s///) and deletion (d) applied to each input line.",
    usedFor: [
      { label: "GNU sed manual", description: "Official GNU sed documentation", href: "https://www.gnu.org/software/sed/manual/sed.html" },
      { label: "sed one-liners", description: "Common sed idioms and patterns", href: "https://www.pement.org/sed/sed1line.txt" }
    ]
  }
};
var sed_script_default = plugin174;

// ../../docs/types/text/known/m4-macro/index.js
var plugin175 = {
  id: "m4-macro",
  label: "M4 Macro",
  tags: ["m4", "autoconf", "macro", "build", "text-processing"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (name.endsWith(".m4") || name === "configure.ac" || name === "configure.in") return true;
    const text = intake.text || "";
    const hits = [
      /\bAC_INIT\s*\(/.test(text),
      /\bAC_PREREQ\s*\(/.test(text),
      /\bdefine\s*\(/.test(text),
      /\bdnl\b/.test(text),
      /\bm4_define\s*\(/.test(text),
      /\bAM_INIT_AUTOMAKE\s*\(/.test(text)
    ].filter(Boolean).length;
    return hits >= 2;
  },
  loadRenderer: () => import("../types/text/known/m4-macro/renderer.js"),
  about: {
    description: "M4 is a general-purpose macro processor. It is the foundation of GNU Autoconf and is used to generate configure scripts and other build files from .m4 templates.",
    usedFor: [
      { label: "GNU M4", description: "GNU M4 macro processor documentation", href: "https://www.gnu.org/software/m4/manual/m4.html" },
      { label: "GNU Autoconf", description: "Autoconf — uses M4 macros for configure scripts", href: "https://www.gnu.org/software/autoconf/manual/autoconf.html" }
    ]
  }
};
var m4_macro_default = plugin175;

// ../../docs/types/text/known/lex-yacc/index.js
var plugin176 = {
  id: "lex-yacc",
  label: "Lex/Yacc Grammar",
  tags: ["lex", "flex", "yacc", "bison", "parser", "lexer", "grammar"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (name.endsWith(".l") || name.endsWith(".ll") || name.endsWith(".lex") || name.endsWith(".y") || name.endsWith(".yy") || name.endsWith(".ypp") || name.endsWith(".yacc")) return true;
    const text = intake.text || "";
    const hits = [
      /^%%$/m.test(text),
      /^%\{/.test(text),
      /^%token\b/m.test(text),
      /^%union\b/m.test(text),
      /^%lex-param\b/m.test(text),
      /\byylval\b/.test(text),
      /\byylex\b/.test(text),
      /\byyparse\b/.test(text)
    ].filter(Boolean).length;
    return hits >= 2;
  },
  loadRenderer: () => import("../types/text/known/lex-yacc/renderer.js"),
  about: {
    description: "Lex (or Flex) defines lexical analyzers via regular expression rules. Yacc (or Bison) defines parsers via grammar rules in BNF form. These tools generate C/C++ source for compilers and interpreters.",
    usedFor: [
      { label: "GNU Flex", description: "The Fast Lexical Analyzer generator", href: "https://www.gnu.org/software/flex/manual/" },
      { label: "GNU Bison", description: "Parser generator compatible with Yacc", href: "https://www.gnu.org/software/bison/manual/bison.html" }
    ]
  }
};
var lex_yacc_default = plugin176;

// ../../docs/types/text/known/elvish-script/index.js
var plugin177 = {
  id: "elvish-script",
  label: "Elvish Script",
  tags: ["elvish", "elv", "shell", "script"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (name.endsWith(".elv")) return true;
    const text = intake.textSample || intake.text || "";
    const hits = [
      /^fn\s+\w+/m.test(text),
      /^var\s+\w+/m.test(text),
      /^use\s+\S+/m.test(text),
      /^set\s+\w+/m.test(text)
    ].filter(Boolean).length;
    return hits >= 2;
  },
  loadRenderer: () => import("../types/text/known/elvish-script/renderer.js"),
  about: {
    description: "Elvish is a modern, expressive shell scripting language with structured data, exceptions, and pipelines. .elv files contain Elvish code.",
    usedFor: [
      { label: "Elvish Shell", description: "Friendly interactive shell and scripting language", href: "https://elv.sh/" }
    ]
  }
};
var elvish_script_default = plugin177;

// ../../docs/types/text/known/fish-script/index.js
var plugin178 = {
  id: "fish-script",
  label: "Fish Script",
  tags: ["fish", "shell", "script", "config"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (name.endsWith(".fish")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/fish-script/renderer.js"),
  about: {
    description: "Fish (Friendly Interactive Shell) script. .fish files define functions, variables, event handlers, and abbreviations for the fish shell.",
    usedFor: [
      { label: "Fish Shell", description: "Friendly interactive shell", href: "https://fishshell.com/" }
    ]
  }
};
var fish_script_default = plugin178;

// ../../docs/types/text/known/zsh-script/index.js
var plugin179 = {
  id: "zsh-script",
  label: "Zsh Script",
  tags: ["zsh", "shell", "script", "z-shell"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (name.endsWith(".zsh") && !name.endsWith("rc")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/zsh-script/renderer.js"),
  about: {
    description: "Zsh (Z Shell) script file. .zsh scripts define functions, autoloads, completions, keybindings, and zstyle settings for the Zsh environment.",
    usedFor: [
      { label: "Zsh", description: "Z Shell — extended Bourne shell", href: "https://www.zsh.org/" },
      { label: "Oh My Zsh", description: "Zsh configuration framework", href: "https://ohmyz.sh/" }
    ]
  }
};
var zsh_script_default = plugin179;

// ../../docs/types/text/known/nushell-script/index.js
var plugin180 = {
  id: "nushell-script",
  label: "Nushell Script",
  tags: ["nushell", "nu", "shell", "script"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (!name.endsWith(".nu")) return false;
    if (name === "config.nu" || name === "env.nu" || name === "login.nu") return false;
    const text = intake.textSample || intake.text || "";
    if (/^\s*(?:export\s+)?def\s+/m.test(text)) return true;
    if (/\$env\.config/.test(text) || /\$env\./.test(text)) return false;
    return false;
  },
  loadRenderer: () => import("../types/text/known/nushell-script/renderer.js"),
  about: {
    description: "Nushell script file. .nu scripts define commands with `def`, export public commands, declare type-checked parameters, and pipeline-compose structured data.",
    usedFor: [
      { label: "Nushell", description: "A new type of shell that works with structured data", href: "https://www.nushell.sh/" }
    ]
  }
};
var nushell_script_default = plugin180;

// ../../docs/types/text/known/gdscript-lang/index.js
var plugin181 = {
  id: "gdscript-lang",
  label: "GDScript",
  tags: ["gdscript", "godot", "gamedev", "gd"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (!name.endsWith(".gd")) return false;
    const text = (intake.text || "").slice(0, 2e3);
    if (!text.includes("extends ") && !text.includes("func ") && !text.includes("class_name ")) return null;
    return true;
  },
  loadRenderer: () => import("../types/text/known/gdscript-lang/renderer.js"),
  about: {
    description: "GDScript is a high-level, dynamically typed scripting language built into the Godot game engine. It has a Python-like syntax and is designed for fast iteration in game development.",
    usedFor: [
      { label: "godotengine.org", description: "Official Godot Engine home", href: "https://godotengine.org/" },
      { label: "GDScript reference", description: "GDScript language reference", href: "https://docs.godotengine.org/en/stable/tutorials/scripting/gdscript/" }
    ]
  }
};
var gdscript_lang_default = plugin181;

// ../../docs/types/text/known/ink-script/index.js
var plugin182 = {
  id: "ink-script",
  label: "Ink Story",
  tags: ["ink", "inkle", "narrative", "interactive fiction", "ink2"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (!name.endsWith(".ink") && !name.endsWith(".ink2")) return false;
    const text = (intake.text || "").slice(0, 2e3);
    if (!text.includes("->") && !text.includes("===") && !text.includes("VAR ")) return null;
    return true;
  },
  loadRenderer: () => import("../types/text/known/ink-script/renderer.js"),
  about: {
    description: `Ink is a scripting language for writing interactive narrative games and stories. Developed by Inkle Studios, it powers games like "80 Days" and "Heaven's Vault".`,
    usedFor: [
      { label: "inklestudios.com/ink", description: "Official Ink language home", href: "https://www.inklestudios.com/ink/" },
      { label: "Ink on GitHub", description: "Ink source and documentation", href: "https://github.com/inkle/ink" }
    ]
  }
};
var ink_script_default = plugin182;

// ../../docs/types/text/known/fennel-lang/index.js
var plugin183 = {
  id: "fennel-lang",
  label: "Fennel Script",
  tags: ["fennel", "lua", "lisp", "fnl"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (!name.endsWith(".fnl")) return false;
    const text = (intake.text || "").slice(0, 2e3);
    if (!text.includes("(fn") && !text.includes("(local") && !text.includes("(require")) return null;
    return true;
  },
  loadRenderer: () => import("../types/text/known/fennel-lang/renderer.js"),
  about: {
    description: "Fennel is a programming language that runs on the Lua runtime. It combines the simplicity and speed of Lua with the power of a Lisp macro system.",
    usedFor: [
      { label: "fennel-lang.org", description: "Official Fennel language home", href: "https://fennel-lang.org/" },
      { label: "Fennel on GitHub", description: "Fennel source repository", href: "https://github.com/bakpakin/Fennel" }
    ]
  }
};
var fennel_lang_default = plugin183;

// ../../docs/types/text/known/ballerina-lang/index.js
var plugin184 = {
  id: "ballerina-lang",
  label: "Ballerina",
  tags: ["ballerina", "bal", "wso2", "cloud-native", "integration"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (!name.endsWith(".bal")) return false;
    const text = (intake.text || "").slice(0, 2e3);
    if (!text.includes("import ") && !text.includes("service ") && !text.includes("function ")) return null;
    return true;
  },
  loadRenderer: () => import("../types/text/known/ballerina-lang/renderer.js"),
  about: {
    description: "Ballerina is an open-source, cloud-native programming language designed for integration and microservices. It has built-in support for network protocols, data transformation, and concurrency.",
    usedFor: [
      { label: "ballerina.io", description: "Official Ballerina language home", href: "https://ballerina.io/" },
      { label: "Ballerina Central", description: "Ballerina package registry", href: "https://central.ballerina.io/" }
    ]
  }
};
var ballerina_lang_default = plugin184;

// ../../docs/types/text/known/typst-doc/index.js
var plugin185 = {
  id: "typst-doc",
  label: "Typst Document",
  tags: ["typst", "typ", "markup", "documentation", "typesetting"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (!name.endsWith(".typ")) return false;
    const text = (intake.text || "").slice(0, 2e3);
    return /^#(import|let|set|show)\b/m.test(text);
  },
  loadRenderer: () => import("../types/text/known/typst-doc/renderer.js"),
  about: {
    description: "Typst is a modern typesetting system and markup language for creating documents, papers, and presentations. .typ files contain Typst source with scripting, styling, and content.",
    usedFor: [
      { label: "Typst", description: "Modern typesetting system — alternative to LaTeX", href: "https://typst.app/" },
      { label: "Typst Docs", description: "Typst language reference and tutorials", href: "https://typst.app/docs/" }
    ]
  }
};
var typst_doc_default = plugin185;

// ../../docs/types/text/known/textile-markup/index.js
var plugin186 = {
  id: "textile-markup",
  label: "Textile",
  tags: ["textile", "markup", "wiki", "redmine", "documentation"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    return name.endsWith(".textile");
  },
  loadRenderer: () => import("../types/text/known/textile-markup/renderer.js"),
  about: {
    description: "Textile is a lightweight markup language used in Redmine, older blogging platforms, and wiki systems. .textile files contain structured text with headings, links, images, and tables.",
    usedFor: [
      { label: "Textile Reference", description: "Original Textile specification by Dean Allen", href: "https://textile-lang.com/" },
      { label: "Redmine", description: "Project management tool that uses Textile for formatting", href: "https://www.redmine.org/projects/redmine/wiki/RedmineTextFormattingTextile" }
    ]
  }
};
var textile_markup_default = plugin186;

// ../../docs/types/text/known/mediawiki-markup/index.js
var plugin187 = {
  id: "mediawiki-markup",
  label: "MediaWiki",
  tags: ["mediawiki", "wiki", "markup", "wikipedia"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (name.endsWith(".mediawiki")) return true;
    if (name.endsWith(".wiki")) {
      const preview = (intake.text || "").slice(0, 1e3);
      return /\[\[/.test(preview) || /\{\{/.test(preview) || /==/.test(preview);
    }
    return false;
  },
  loadRenderer: () => import("../types/text/known/mediawiki-markup/renderer.js"),
  about: {
    description: "MediaWiki markup is the wikitext language used by Wikipedia, Wikimedia projects, and MediaWiki installations. .wiki and .mediawiki files contain structured text with templates, links, and headings.",
    usedFor: [
      { label: "MediaWiki", description: "The wiki engine powering Wikipedia", href: "https://www.mediawiki.org/" },
      { label: "Help:Wikitext", description: "Wikipedia wikitext formatting guide", href: "https://en.wikipedia.org/wiki/Help:Wikitext" }
    ]
  }
};
var mediawiki_markup_default = plugin187;

// ../../docs/types/text/known/bbcode-text/index.js
var plugin188 = {
  id: "bbcode-text",
  label: "BBCode",
  tags: ["bbcode", "bbc", "forum", "markup", "phpbb", "vbulletin"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (name.endsWith(".bbc") || name.endsWith(".bbcode")) return true;
    const preview = (intake.text || "").slice(0, 2e3);
    const hits = [
      /\[b\]/i.test(preview),
      /\[url=/i.test(preview),
      /\[img\]/i.test(preview),
      /\[quote/i.test(preview),
      /\[code\]/i.test(preview),
      /\[color=/i.test(preview),
      /\[size=/i.test(preview)
    ].filter(Boolean).length;
    return hits >= 2;
  },
  loadRenderer: () => import("../types/text/known/bbcode-text/renderer.js"),
  about: {
    description: "BBCode (Bulletin Board Code) is a lightweight markup language used in web forums and bulletin boards (phpBB, vBulletin, etc.). Tags use square-bracket syntax like [b], [url=], and [img].",
    usedFor: [
      { label: "BBCode", description: "Forum markup language overview", href: "https://en.wikipedia.org/wiki/BBCode" },
      { label: "phpBB BBCode", description: "BBCode reference for phpBB forums", href: "https://www.phpbb.com/community/help/bbcode" }
    ]
  }
};
var bbcode_text_default = plugin188;

// ../../docs/types/text/known/vala-lang/index.js
var plugin189 = {
  id: "vala-lang",
  label: "Vala",
  tags: ["vala", "gnome", "compiled", "object-oriented"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (name.endsWith(".vala") || name.endsWith(".vapi")) return true;
    const text = intake.text || "";
    return /using\s+GLib|using\s+Gtk|public\s+static\s+int\s+main|\bpublic\s+class\s+\w|\bprivate\s+class\s+\w/.test(text);
  },
  loadRenderer: () => import("../types/text/known/vala-lang/renderer.js"),
  about: {
    description: "Vala source file — a modern programming language using the GObject type system, designed for GNOME development with C performance.",
    usedFor: [
      { label: "Vala reference", description: "Official Vala language reference manual", href: "https://docs.vala.dev/" },
      { label: "GNOME developer documentation", description: "GNOME platform development resources", href: "https://developer.gnome.org/" }
    ]
  }
};
var vala_lang_default = plugin189;

// ../../docs/types/text/known/idris-lang/index.js
var plugin190 = {
  id: "idris-lang",
  label: "Idris",
  tags: ["idris", "functional", "dependent-types", "total"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (name.endsWith(".idr") || name.endsWith(".idr2")) return true;
    const ext = name.includes(".") ? name.slice(name.lastIndexOf(".") + 1) : "";
    if (ext && ext !== "idr" && ext !== "idr2") return false;
    const text = intake.text || "";
    return /^module\s+\w/m.test(text) && (/^import\s+/m.test(text) || /^data\s+/m.test(text) || /:\s*Type\b/.test(text) || /\btotal\b/.test(text) || /\bpartial\b/.test(text));
  },
  loadRenderer: () => import("../types/text/known/idris-lang/renderer.js"),
  about: {
    description: "Idris source file — a purely functional programming language with dependent types and optional totality checking.",
    usedFor: [
      { label: "Idris documentation", description: "Official Idris 2 documentation and tutorials", href: "https://idris2.readthedocs.io/" },
      { label: "Type-Driven Development with Idris", description: "Book on type-driven development in Idris", href: "https://www.manning.com/books/type-driven-development-with-idris" }
    ]
  }
};
var idris_lang_default = plugin190;

// ../../docs/types/text/known/sml-lang/index.js
var plugin191 = {
  id: "sml-lang",
  label: "Standard ML",
  tags: ["sml", "functional", "statically-typed", "ml"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (name.endsWith(".sml") || name.endsWith(".fun")) return true;
    if (name.endsWith(".sig")) {
      const text = intake.text || "";
      return /\b(?:structure|signature|functor|val\s+\w|fun\s+\w)\b/.test(text);
    }
    return false;
  },
  loadRenderer: () => import("../types/text/known/sml-lang/renderer.js"),
  about: {
    description: "Standard ML source file — a statically typed functional programming language with a formal definition and module system.",
    usedFor: [
      { label: "Standard ML of New Jersey", description: "SML/NJ compiler and documentation", href: "https://www.smlnj.org/" },
      { label: "Programming in Standard ML", description: "Comprehensive SML textbook by Robert Harper", href: "http://www.cs.cmu.edu/~rwh/isml/book.pdf" }
    ]
  }
};
var sml_lang_default = plugin191;

// ../../docs/types/text/known/tex-doc/index.js
var plugin192 = {
  id: "tex-doc",
  label: "LaTeX",
  tags: ["latex", "tex", "typesetting", "document"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (!name.endsWith(".tex")) return false;
    const text = intake.text || "";
    return /\\documentclass|\\begin\{document\}|\\usepackage|\\section/.test(text);
  },
  loadRenderer: () => import("../types/text/known/tex-doc/renderer.js"),
  about: {
    description: "LaTeX/TeX document — a high-quality typesetting system widely used for scientific, academic, and technical documents.",
    usedFor: [
      { label: "LaTeX project", description: "Official LaTeX documentation and resources", href: "https://www.latex-project.org/" },
      { label: "Overleaf documentation", description: "LaTeX guides and tutorials on Overleaf", href: "https://www.overleaf.com/learn" }
    ]
  }
};
var tex_doc_default = plugin192;

// ../../docs/types/text/known/forth-lang/index.js
var plugin193 = {
  id: "forth-lang",
  label: "Forth",
  tags: ["forth", "fth", "4th", "stack", "concatenative"],
  match(intake) {
    const name = (intake.name || intake.filename || "").toLowerCase();
    if (name.endsWith(".forth") || name.endsWith(".fth") || name.endsWith(".4th")) return true;
    if (name.endsWith(".factor")) return false;
    const text = intake.text || "";
    const hits = [/^: [A-Z_a-z]/m.test(text), /\bVARIABLE\b/.test(text), /\bCONSTANT\b/.test(text), /\bDO\b.*\bLOOP\b/s.test(text), /\bIF\b/.test(text) && /\bTHEN\b/.test(text), /\bBEGIN\b.*\bUNTIL\b/s.test(text)].filter(Boolean).length;
    return hits >= 2;
  },
  loadRenderer: () => import("../types/text/known/forth-lang/renderer.js"),
  about: {
    description: "Forth is a stack-based, concatenative programming language with a minimal syntax. Words (functions) are defined with `: NAME ... ;` and the language uses Reverse Polish Notation.",
    usedFor: [
      { label: "Forth Standard", description: "Official Forth programming language standard", href: "https://forth-standard.org/" },
      { label: "Gforth Manual", description: "GNU Forth implementation documentation", href: "https://gforth.org/manual/" }
    ]
  }
};
var forth_lang_default = plugin193;

// ../../docs/types/text/known/lean-lang/index.js
var plugin194 = {
  id: "lean-lang",
  label: "Lean 4",
  tags: ["lean", "lean4", "theorem-prover", "dependent-types", "functional"],
  match(intake) {
    const name = (intake.name || intake.filename || "").toLowerCase();
    if (name.endsWith(".lean")) return true;
    if (name.endsWith(".nu")) return false;
    const text = intake.text || "";
    const hits = [/\btheorem\s+/.test(text), /\blemma\s+/.test(text), /\bimport\s+/.test(text), /\bnamespace\s+/.test(text), /\bopen\s+/.test(text), /\bdef\s+/.test(text), /#check\b/.test(text)].filter(Boolean).length;
    return hits >= 3;
  },
  loadRenderer: () => import("../types/text/known/lean-lang/renderer.js"),
  about: {
    description: "Lean 4 is a functional programming language and interactive theorem prover developed at Microsoft Research. It is used to write formally verified mathematics and software.",
    usedFor: [
      { label: "Lean 4 documentation", description: "Official Lean 4 programming language reference", href: "https://lean-lang.org/" },
      { label: "Mathlib4", description: "Mathematical library for Lean 4", href: "https://leanprover-community.github.io/mathlib4_docs/" }
    ]
  }
};
var lean_lang_default = plugin194;

// ../../docs/types/text/known/agda-lang/index.js
var plugin195 = {
  id: "agda-lang",
  label: "Agda",
  tags: ["agda", "dependent-types", "theorem-prover", "functional"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (name.endsWith(".agda") || name.endsWith(".lagda")) return true;
    const ext = name.includes(".") ? name.slice(name.lastIndexOf(".") + 1) : "";
    if (ext && ext !== "agda" && ext !== "lagda") return false;
    const text = intake.text || "";
    const hits = [/^module\s+\S+\s+where/m.test(text), /^import\s+/m.test(text), /^data\s+\S+/m.test(text), /^record\s+\S+/m.test(text), /^postulate\b/m.test(text), /\bwhere\b/.test(text)].filter(Boolean).length;
    return hits >= 3;
  },
  loadRenderer: () => import("../types/text/known/agda-lang/renderer.js"),
  about: {
    description: "Agda is a dependently typed functional programming language and proof assistant. It is used for writing formally verified programs and mathematical proofs.",
    usedFor: [
      { label: "Agda documentation", description: "Official Agda language reference", href: "https://agda.readthedocs.io/" },
      { label: "Agda Standard Library", description: "Agda standard library documentation", href: "https://agda.github.io/agda-stdlib/" }
    ]
  }
};
var agda_lang_default = plugin195;

// ../../docs/types/text/known/chapel-lang/index.js
var plugin196 = {
  id: "chapel-lang",
  label: "Chapel",
  tags: ["chapel", "chpl", "parallel", "hpc", "compiled"],
  match(intake) {
    const name = (intake.name || intake.filename || "").toLowerCase();
    if (name.endsWith(".chpl")) return true;
    const text = intake.text || "";
    const hits = [/\bmodule\s+\w+/.test(text), /\bproc\s+\w+/.test(text), /\bconfig\b/.test(text), /\bcoforall\b/.test(text), /\bforall\b/.test(text), /\bon\s+/.test(text) && /\bvar\b/.test(text)].filter(Boolean).length;
    return hits >= 3;
  },
  loadRenderer: () => import("../types/text/known/chapel-lang/renderer.js"),
  about: {
    description: "Chapel is a parallel programming language developed at Cray. It is designed for productivity and performance in high-performance computing (HPC), supporting task and data parallelism natively.",
    usedFor: [
      { label: "Chapel documentation", description: "Official Chapel language documentation", href: "https://chapel-lang.org/docs/" },
      { label: "Chapel GitHub", description: "Chapel language source and resources", href: "https://github.com/chapel-lang/chapel" }
    ]
  }
};
var chapel_lang_default = plugin196;

// ../../docs/types/text/known/koka-lang/index.js
var plugin197 = {
  id: "koka-lang",
  label: "Koka",
  tags: ["koka", "functional", "effects", "compiled"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (name.endsWith(".koka")) return true;
    const txt = intake.textSnippet || "";
    return /\beffect\b/.test(txt) && /\bfun\b/.test(txt) && /\bhandle\b/.test(txt);
  },
  loadRenderer: () => import("../types/text/known/koka-lang/renderer.js"),
  about: {
    description: "Koka source file — a strongly typed functional language with effect types and handlers.",
    usedFor: [
      { label: "Koka language", description: "Official Koka programming language site", href: "https://koka-lang.github.io/" }
    ]
  }
};
var koka_lang_default = plugin197;

// ../../docs/types/text/known/carbon-lang/index.js
var plugin198 = {
  id: "carbon-lang",
  label: "Carbon",
  tags: ["carbon", "systems", "compiled", "cpp-successor"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (name.endsWith(".carbon")) return true;
    const txt = intake.textSnippet || "";
    return /\bpackage\b/.test(txt) && /\bfn\b/.test(txt) && (/\bclass\b/.test(txt) || /\binterface\b/.test(txt) || /\bimpl\b/.test(txt));
  },
  loadRenderer: () => import("../types/text/known/carbon-lang/renderer.js"),
  about: {
    description: "Carbon source file — Google's experimental successor to C++ with modern language design.",
    usedFor: [
      { label: "Carbon language", description: "Official Carbon programming language repository", href: "https://github.com/carbon-language/carbon-lang" }
    ]
  }
};
var carbon_lang_default = plugin198;

// ../../docs/types/text/known/grain-lang/index.js
var plugin199 = {
  id: "grain-lang",
  label: "Grain",
  tags: ["grain", "functional", "webassembly", "compiled"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (name.endsWith(".gr")) return true;
    const txt = intake.textSnippet || "";
    return /\bmodule\b/.test(txt) && /\blet\b/.test(txt) && (/\bimport\b/.test(txt) || /\bexport\b/.test(txt) || /\brecord\b/.test(txt));
  },
  loadRenderer: () => import("../types/text/known/grain-lang/renderer.js"),
  about: {
    description: "Grain source file — a functional language that compiles to WebAssembly.",
    usedFor: [
      { label: "Grain language", description: "Official Grain programming language site", href: "https://grain-lang.org/" }
    ]
  }
};
var grain_lang_default = plugin199;

// ../../docs/types/text/known/factor-lang/index.js
var plugin200 = {
  id: "factor-lang",
  label: "Factor",
  tags: ["factor", "concatenative", "stack-based", "functional"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (name.endsWith(".factor")) return true;
    const txt = intake.textSnippet || "";
    return /\bUSING:/.test(txt) && /\bIN:/.test(txt);
  },
  loadRenderer: () => import("../types/text/known/factor-lang/renderer.js"),
  about: {
    description: "Factor source file — a concatenative stack-based programming language.",
    usedFor: [
      { label: "Factor language", description: "Official Factor programming language site", href: "https://factorcode.org/" }
    ]
  }
};
var factor_lang_default = plugin200;

// ../../docs/types/text/known/apt-sources/index.js
var plugin201 = {
  id: "apt-sources",
  label: "APT Sources",
  tags: ["apt", "debian", "ubuntu", "package-manager", "linux"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop();
    const path = intake.name || intake.filename || "";
    if (name === "sources.list") return true;
    if (path.includes("apt/sources")) return true;
    if (name.endsWith(".list")) {
      const sample = intake.textSample || intake.text || "";
      return /^deb(-src)?\s/m.test(sample);
    }
    return false;
  },
  loadRenderer: () => import("../types/text/known/apt-sources/renderer.js"),
  about: {
    description: "APT sources.list file — defines Debian/Ubuntu package repository locations, including enabled and disabled repository entries.",
    usedFor: [
      { label: "APT documentation", description: "Official Debian APT documentation", href: "https://wiki.debian.org/SourcesList" },
      { label: "Ubuntu repositories", description: "Ubuntu software repository information", href: "https://help.ubuntu.com/community/Repositories" }
    ]
  }
};
var apt_sources_default = plugin201;

// ../../docs/types/text/known/pkgbuild/index.js
var plugin202 = {
  id: "pkgbuild",
  label: "PKGBUILD",
  tags: ["arch", "linux", "package", "pkgbuild", "makepkg"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop();
    return name === "PKGBUILD" || name === ".SRCINFO";
  },
  loadRenderer: () => import("../types/text/known/pkgbuild/renderer.js"),
  about: {
    description: "Arch Linux PKGBUILD — a shell script read by makepkg to build a package for the Arch Linux package manager (pacman).",
    usedFor: [
      { label: "PKGBUILD reference", description: "Official Arch Linux PKGBUILD documentation", href: "https://wiki.archlinux.org/title/PKGBUILD" },
      { label: "AUR submission guidelines", description: "Arch User Repository submission guidelines", href: "https://wiki.archlinux.org/title/AUR_submission_guidelines" }
    ]
  }
};
var pkgbuild_default = plugin202;

// ../../docs/types/text/known/limits-conf/index.js
var plugin203 = {
  id: "limits-conf",
  label: "Limits Config",
  tags: ["pam", "limits", "security", "linux", "ulimit"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop();
    const path = intake.name || intake.filename || "";
    if (name === "limits.conf") return true;
    if (name.endsWith(".conf") && path.includes("security/limits")) return true;
    const sample = intake.textSample || intake.text || "";
    const matches = sample.split(/\r?\n/).filter((l) => /^\s*[*@\w]+\s+(soft|hard|-)\s+\w/.test(l));
    return matches.length >= 3;
  },
  loadRenderer: () => import("../types/text/known/limits-conf/renderer.js"),
  about: {
    description: "PAM limits configuration file — defines resource limits (e.g. open files, processes, memory) for users and groups.",
    usedFor: [
      { label: "limits.conf manual", description: "Linux PAM limits.conf documentation", href: "https://man7.org/linux/man-pages/man5/limits.conf.5.html" }
    ]
  }
};
var limits_conf_default = plugin203;

// ../../docs/types/text/known/audit-rules/index.js
var plugin204 = {
  id: "audit-rules",
  label: "Audit Rules",
  tags: ["audit", "linux", "security", "auditd", "syscall"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop();
    const path = intake.name || intake.filename || "";
    if (name === "audit.rules") return true;
    if (name.endsWith(".rules") && path.includes("audit")) return true;
    const sample = intake.textSample || intake.text || "";
    return /^(-a always,exit|-A always,exit|-w |-b |-D )/m.test(sample);
  },
  loadRenderer: () => import("../types/text/known/audit-rules/renderer.js"),
  about: {
    description: "Linux audit rules file — defines rules for the auditd daemon to log kernel-level security events such as file accesses and system calls.",
    usedFor: [
      { label: "auditd documentation", description: "Linux audit framework documentation", href: "https://man7.org/linux/man-pages/man8/auditd.8.html" },
      { label: "audit.rules manual", description: "Linux audit rules file format", href: "https://man7.org/linux/man-pages/man7/audit.rules.7.html" }
    ]
  }
};
var audit_rules_default = plugin204;

// ../../docs/types/text/known/common-lisp/index.js
var plugin205 = {
  id: "common-lisp",
  label: "Common Lisp",
  tags: ["lisp", "common-lisp", "functional", "interpreted"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (name.endsWith(".lisp") || name.endsWith(".cl") || name.endsWith(".lsp")) return true;
    if (name.endsWith(".el")) return false;
    const text = intake.text || "";
    return text.includes("(defun ") || text.includes("(defvar ") || text.includes("(defclass ") || text.includes("(defpackage ") || text.includes("(in-package ");
  },
  loadRenderer: () => import("../types/text/known/common-lisp/renderer.js"),
  about: {
    description: "Common Lisp source file — a multi-paradigm, general-purpose programming language with powerful macro system and dynamic typing.",
    usedFor: [
      { label: "Common Lisp HyperSpec", description: "Official Common Lisp language specification", href: "http://www.lispworks.com/documentation/HyperSpec/Front/" },
      { label: "Quicklisp", description: "Common Lisp package manager", href: "https://www.quicklisp.org/" }
    ]
  }
};
var common_lisp_default = plugin205;

// ../../docs/types/text/known/emacs-lisp/index.js
var plugin206 = {
  id: "emacs-lisp",
  label: "Emacs Lisp",
  tags: ["emacs", "lisp", "elisp", "editor"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (name === ".emacs" || name === "init.el" || name === "early-init.el") return false;
    if (name.endsWith(".el")) return true;
    const text = intake.text || "";
    return text.includes("(defun ") || text.includes("(defvar ") || text.includes("(defcustom ") || text.includes("(require '") || text.includes("(use-package ");
  },
  loadRenderer: () => import("../types/text/known/emacs-lisp/renderer.js"),
  about: {
    description: "Emacs Lisp source file — the extension language for the GNU Emacs text editor, used to configure and extend Emacs.",
    usedFor: [
      { label: "Emacs Lisp Reference", description: "Official GNU Emacs Lisp reference manual", href: "https://www.gnu.org/software/emacs/manual/html_node/elisp/" },
      { label: "MELPA", description: "Community Emacs Lisp package archive", href: "https://melpa.org/" }
    ]
  }
};
var emacs_lisp_default = plugin206;

// ../../docs/types/text/known/squirrel-lang/index.js
var plugin207 = {
  id: "squirrel-lang",
  label: "Squirrel",
  tags: ["squirrel", "scripting", "game", "source-engine"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (name.endsWith(".nut")) return true;
    const text = intake.text || "";
    if (text.includes("<?php") || text.includes("<?=")) return false;
    if (/^\s*(namespace|use |require_once|declare\s*\()/m.test(text)) return false;
    if (/\$[a-zA-Z_]/.test(text)) return false;
    const signals = [
      text.includes("local "),
      /\bforeach\s*\(/.test(text) && !text.includes("for each"),
      /\b[A-Za-z_]\w*\s*<-\s/.test(text),
      // Squirrel slot assignment
      text.includes("::") && text.includes("function ")
    ].filter(Boolean).length;
    return signals >= 2;
  },
  loadRenderer: () => import("../types/text/known/squirrel-lang/renderer.js"),
  about: {
    description: "Squirrel script file — a high-level, imperative, object-oriented scripting language designed for embedding in games and applications.",
    usedFor: [
      { label: "Squirrel language reference", description: "Official Squirrel language documentation", href: "http://squirrel-lang.org/doc/squirrel3.html" },
      { label: "Squirrel on GitHub", description: "Squirrel language source and examples", href: "https://github.com/albertodemichelis/squirrel" }
    ]
  }
};
var squirrel_lang_default = plugin207;

// ../../docs/types/text/known/red-lang/index.js
var plugin208 = {
  id: "red-lang",
  label: "Red",
  tags: ["red", "rebol", "scripting", "functional"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (name.endsWith(".red") || name.endsWith(".reds")) return true;
    const text = intake.text || "";
    return text.includes("Red [") || text.includes("func [") || text.includes("function [") || text.includes("context [") || text.includes("object [");
  },
  loadRenderer: () => import("../types/text/known/red-lang/renderer.js"),
  about: {
    description: "Red language source file — a Rebol-inspired full-stack programming language with a homoiconic syntax and built-in GUI system.",
    usedFor: [
      { label: "Red language homepage", description: "Official Red language documentation and downloads", href: "https://www.red-lang.org/" },
      { label: "Red on GitHub", description: "Red language source code and examples", href: "https://github.com/red/red" }
    ]
  }
};
var red_lang_default = plugin208;

// ../../docs/types/text/known/journald-conf/index.js
var JOURNAL_KEYS = [
  "Storage",
  "Compress",
  "Seal",
  "SplitMode",
  "RateLimitIntervalSec",
  "RateLimitBurst",
  "SystemMaxUse",
  "SystemKeepFree",
  "SystemMaxFileSize",
  "SystemMaxFiles",
  "RuntimeMaxUse",
  "RuntimeKeepFree",
  "RuntimeMaxFileSize",
  "RuntimeMaxFiles",
  "MaxRetentionSec",
  "MaxFileSec",
  "ForwardToSyslog",
  "ForwardToKMsg",
  "ForwardToConsole",
  "ForwardToWall",
  "TTYPath",
  "MaxLevelStore",
  "MaxLevelSyslog",
  "MaxLevelKMsg",
  "MaxLevelConsole",
  "MaxLevelWall",
  "LineMax",
  "ReadKMsg",
  "Audit"
];
var journald_conf_default = {
  id: "journald-conf",
  label: "journald.conf",
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (name === "journald.conf") return true;
    const text = intake.text || "";
    if (!text.includes("[Journal]")) return false;
    const hits = JOURNAL_KEYS.filter((k) => text.includes(k + "=")).length;
    return hits >= 2;
  },
  loadRenderer: () => import("../types/text/known/journald-conf/renderer.js"),
  about: {
    description: "systemd-journald configuration — controls how the system journal collects, stores, and forwards log entries.",
    usedFor: [
      { label: "journald.conf(5)", description: "Manual page for journald configuration", href: "https://www.freedesktop.org/software/systemd/man/journald.conf.html" }
    ]
  }
};

// ../../docs/types/text/known/tmpfiles-d/index.js
function looksLikeTmpfiles(text) {
  const lines = (text || "").split(/\r?\n/).filter((l) => l.trim() && !l.trim().startsWith("#"));
  const hits = lines.filter((l) => /^[fdDlLctCwpsumaAeEv+!\-?:^] /.test(l.trim())).length;
  return hits >= 2;
}
var tmpfiles_d_default = {
  id: "tmpfiles-d",
  label: "tmpfiles.d",
  match(intake) {
    const name = (intake.name || intake.filename || "").toLowerCase();
    if (/tmpfiles\.d\/[^/]+\.conf$/.test(name)) return true;
    const base = name.split("/").pop();
    if (base.endsWith(".conf") && looksLikeTmpfiles(intake.text)) return true;
    if (base.endsWith(".tmpfiles") || base.endsWith(".tmpfiles-d")) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/tmpfiles-d/renderer.js"),
  about: {
    description: "systemd tmpfiles.d configuration — manages creation, deletion, and cleanup of volatile and temporary files and directories.",
    usedFor: [
      { label: "tmpfiles.d(5)", description: "Manual page for tmpfiles.d configuration format", href: "https://www.freedesktop.org/software/systemd/man/tmpfiles.d.html" }
    ]
  }
};

// ../../docs/types/text/known/nsswitch-conf/index.js
var COMMON_DBS = [
  "passwd",
  "group",
  "shadow",
  "hosts",
  "networks",
  "services",
  "protocols",
  "rpc",
  "ethers",
  "netmasks",
  "bootparams",
  "automount",
  "aliases",
  "resolv",
  "publickey",
  "netgroup"
];
var nsswitch_conf_default = {
  id: "nsswitch-conf",
  label: "nsswitch.conf",
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (name === "nsswitch.conf") return true;
    const ext = name.includes(".") ? name.split(".").pop() : "";
    if (["yaml", "yml", "json", "toml", "xml", "html", "ini", "cfg", "conf", "md", "rst"].includes(ext)) return false;
    const text = intake.text || "";
    const lines = text.split(/\r?\n/).filter((l) => /^\w+:\s+\w+/.test(l.trim()));
    if (lines.length < 3) return false;
    const dbHits = COMMON_DBS.filter((db) => text.includes(db + ":")).length;
    return dbHits >= 2;
  },
  loadRenderer: () => import("../types/text/known/nsswitch-conf/renderer.js"),
  about: {
    description: "Name Service Switch configuration — controls how the system resolves names for databases like passwd, hosts, and services.",
    usedFor: [
      { label: "nsswitch.conf(5)", description: "Manual page for Name Service Switch configuration", href: "https://man7.org/linux/man-pages/man5/nsswitch.conf.5.html" }
    ]
  }
};

// ../../docs/types/text/known/mkinitcpio-conf/index.js
var mkinitcpio_conf_default = {
  id: "mkinitcpio-conf",
  label: "mkinitcpio.conf",
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (name === "mkinitcpio.conf") return true;
    const text = intake.text || "";
    const keys = ["MODULES=", "BINARIES=", "FILES=", "HOOKS="];
    const hits = keys.filter((k) => text.includes(k)).length;
    return hits >= 2;
  },
  loadRenderer: () => import("../types/text/known/mkinitcpio-conf/renderer.js"),
  about: {
    description: "mkinitcpio configuration — Arch Linux initramfs generation tool settings controlling kernel modules, hooks, and compression.",
    usedFor: [
      { label: "mkinitcpio(8)", description: "Arch Wiki: mkinitcpio", href: "https://wiki.archlinux.org/title/Mkinitcpio" }
    ]
  }
};

// ../../docs/types/text/known/wpa-supplicant-conf/index.js
var plugin209 = {
  id: "wpa-supplicant-conf",
  label: "wpa_supplicant",
  tags: ["wpa_supplicant", "wifi", "wireless", "network", "linux"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (name === "wpa_supplicant.conf" || /^wpa_supplicant[-_].+\.conf$/.test(name)) return true;
    const text = intake.text || "";
    return /ctrl_interface\s*=/i.test(text) && /network\s*=\s*\{/i.test(text);
  },
  loadRenderer: () => import("../types/text/known/wpa-supplicant-conf/renderer.js"),
  about: {
    description: "wpa_supplicant configuration file — manages wireless network connections on Linux systems.",
    usedFor: [
      { label: "wpa_supplicant man page", description: "Official wpa_supplicant configuration reference", href: "https://linux.die.net/man/5/wpa_supplicant.conf" }
    ]
  }
};
var wpa_supplicant_conf_default = plugin209;

// ../../docs/types/text/known/sssd-conf/index.js
var plugin210 = {
  id: "sssd-conf",
  label: "SSSD",
  tags: ["sssd", "ldap", "authentication", "identity", "linux", "kerberos"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (name === "sssd.conf") return true;
    const text = intake.text || "";
    return /^\[sssd\]/m.test(text) && (/domains\s*=/m.test(text) || /services\s*=/m.test(text));
  },
  loadRenderer: () => import("../types/text/known/sssd-conf/renderer.js"),
  about: {
    description: "SSSD (System Security Services Daemon) configuration file — provides access to identity and authentication resources.",
    usedFor: [
      { label: "SSSD documentation", description: "Official SSSD project documentation", href: "https://sssd.io/docs/introduction.html" },
      { label: "sssd.conf man page", description: "sssd.conf configuration reference", href: "https://linux.die.net/man/5/sssd.conf" }
    ]
  }
};
var sssd_conf_default = plugin210;

// ../../docs/types/text/known/pascal-lang/index.js
var PASCAL_EXTS = /* @__PURE__ */ new Set(["pas", "pp", "dpr", "dpk"]);
var plugin211 = {
  id: "pascal-lang",
  label: "Pascal",
  tags: ["pascal", "freepascal", "delphi", "compiled", "language"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (/\.(pas|pp|dpr|dpk)$/.test(name)) return true;
    const ext = name.includes(".") ? name.slice(name.lastIndexOf(".") + 1) : "";
    if (ext && !PASCAL_EXTS.has(ext)) return false;
    const text = intake.text || "";
    const kws = ["program ", "unit ", "interface", "implementation", "procedure ", "function ", "begin", "end."];
    const matched = kws.filter((k) => text.toLowerCase().includes(k.toLowerCase()));
    return matched.length >= 4;
  },
  loadRenderer: () => import("../types/text/known/pascal-lang/renderer.js"),
  about: {
    description: "Pascal / Free Pascal / Delphi source file — a strongly-typed, procedural and object-oriented programming language.",
    usedFor: [
      { label: "Free Pascal documentation", description: "Free Pascal Compiler reference manual", href: "https://www.freepascal.org/docs.html" },
      { label: "Delphi reference", description: "Embarcadero Delphi language reference", href: "https://docwiki.embarcadero.com/RADStudio/en/Delphi_Language_Reference" }
    ]
  }
};
var pascal_lang_default = plugin211;

// ../../docs/types/text/known/eiffel-lang/index.js
var plugin212 = {
  id: "eiffel-lang",
  label: "Eiffel",
  tags: ["eiffel", "oop", "design-by-contract", "compiled", "language"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (name.endsWith(".e")) return true;
    const ext = name.includes(".") ? name.slice(name.lastIndexOf(".") + 1) : "";
    if (ext && ext !== "e") return false;
    const text = intake.text || "";
    const hits = [
      /^\s*(deferred\s+)?class\s+[A-Z][A-Z0-9_]*\b/im.test(text),
      /^\s*feature(?:\s|$)/im.test(text),
      /^\s*create\s+[A-Za-z_][\w, ]*$/im.test(text),
      /^\s*inherit\s+[A-Z][A-Z0-9_]*\b/im.test(text),
      /^\s*(require|ensure)\b/im.test(text),
      /^\s*do\s*$/im.test(text),
      /^\s*end\s*(?:--.*)?$/im.test(text)
    ].filter(Boolean).length;
    return hits >= 4;
  },
  loadRenderer: () => import("../types/text/known/eiffel-lang/renderer.js"),
  about: {
    description: "Eiffel source file — an object-oriented language designed around Design by Contract principles.",
    usedFor: [
      { label: "Eiffel language reference", description: "Official Eiffel language documentation", href: "https://www.eiffel.org/doc/eiffel/Eiffel" },
      { label: "EiffelStudio", description: "The main Eiffel development environment", href: "https://www.eiffel.org/eiffelstudio" }
    ]
  }
};
var eiffel_lang_default = plugin212;

// ../../docs/types/text/known/avahi-daemon-conf/index.js
var plugin213 = {
  id: "avahi-daemon-conf",
  label: "Avahi Daemon Config",
  tags: ["avahi", "mdns", "zeroconf", "networking", "linux"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (name === "avahi-daemon.conf") return true;
    const text = intake.text || "";
    return /^\[server\]/m.test(text) && /(host-name=|domain-name=)/.test(text) && /(use-ipv4=|use-ipv6=)/.test(text);
  },
  loadRenderer: () => import("../types/text/known/avahi-daemon-conf/renderer.js"),
  about: {
    description: "Avahi mDNS/Zeroconf daemon configuration — controls hostname advertisement, network interface binding, and service publishing on the local network.",
    usedFor: [
      { label: "Avahi documentation", description: "Official Avahi daemon configuration reference", href: "https://avahi.org/doxygen/html/" }
    ]
  }
};
var avahi_daemon_conf_default = plugin213;

// ../../docs/types/text/known/neomutt-conf/index.js
var plugin214 = {
  id: "neomutt-conf",
  label: "NeoMutt Config",
  tags: ["neomutt", "mutt", "email", "mail-client", "config"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (name === ".muttrc" || name === "muttrc") return false;
    if (name === ".neomuttrc" || name === "neomuttrc") return true;
    const text = intake.text || "";
    const neomuttSpecific = [
      /sidebar_width/,
      /sidebar_format/,
      /color sidebar/,
      /virtual-mailboxes/,
      /set sidebar_visible/,
      /bind index,pager/
    ];
    const matchCount = neomuttSpecific.filter((re) => re.test(text)).length;
    return matchCount >= 2 && /set realname/.test(text) && /set from/.test(text);
  },
  loadRenderer: () => import("../types/text/known/neomutt-conf/renderer.js"),
  about: {
    description: "NeoMutt mail client configuration — defines identity, mailboxes, sidebar layout, key bindings, and color schemes.",
    usedFor: [
      { label: "NeoMutt documentation", description: "NeoMutt user guide and configuration reference", href: "https://neomutt.org/guide/" }
    ]
  }
};
var neomutt_conf_default = plugin214;

// ../../docs/types/text/known/msmtp-conf/index.js
var plugin215 = {
  id: "msmtp-conf",
  label: "msmtp Config",
  tags: ["msmtp", "smtp", "email", "mail-sender", "config"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (name === ".msmtprc" || name === "msmtprc") return true;
    const text = intake.text || "";
    return /^account /m.test(text) && /^host /m.test(text) && /^port /m.test(text) && /^from /m.test(text);
  },
  loadRenderer: () => import("../types/text/known/msmtp-conf/renderer.js"),
  about: {
    description: "msmtp SMTP client configuration — defines accounts for sending mail, including server, authentication, and TLS settings.",
    usedFor: [
      { label: "msmtp documentation", description: "msmtp user guide and configuration reference", href: "https://marlam.de/msmtp/msmtp.html" }
    ]
  }
};
var msmtp_conf_default = plugin215;

// ../../docs/types/text/known/openldap-conf/index.js
var plugin216 = {
  id: "openldap-conf",
  label: "OpenLDAP Config",
  tags: ["openldap", "ldap", "slapd", "directory", "config"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (name === "slapd.conf" || name === "ldap.conf") return true;
    const text = intake.text || "";
    if (/^database /m.test(text) && /^suffix /m.test(text) && /^rootdn /m.test(text)) return true;
    if (/^BASE /m.test(text) && /^URI ldap/m.test(text)) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/openldap-conf/renderer.js"),
  about: {
    description: "OpenLDAP configuration — either a slapd.conf server config (database, schema, overlays) or an ldap.conf client config (URI, BASE, TLS).",
    usedFor: [
      { label: "OpenLDAP documentation", description: "OpenLDAP Administrator's Guide", href: "https://www.openldap.org/doc/admin26/" }
    ]
  }
};
var openldap_conf_default = plugin216;

// ../../docs/types/text/known/gnuplot-script/index.js
var plugin217 = {
  id: "gnuplot-script",
  label: "gnuplot",
  tags: ["gnuplot", "plotting", "visualization", "data"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const text = intake.text || "";
    if (name.endsWith(".gnuplot") || name.endsWith(".gp")) return true;
    if (name.endsWith(".plt")) {
      return /set terminal|^plot /m.test(text);
    }
    return false;
  },
  loadRenderer: () => import("../types/text/known/gnuplot-script/renderer.js"),
  about: {
    description: "gnuplot script — a portable command-line driven graphing utility for data visualization.",
    usedFor: [
      { label: "gnuplot documentation", description: "Official gnuplot documentation and tutorials", href: "http://www.gnuplot.info/documentation.html" }
    ]
  }
};
var gnuplot_script_default = plugin217;

// ../../docs/types/text/known/wolfram-lang/index.js
var plugin218 = {
  id: "wolfram-lang",
  label: "Wolfram Language",
  tags: ["wolfram", "mathematica", "symbolic", "computation"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const text = intake.text || "";
    if (name.endsWith(".wl")) return true;
    if (name.endsWith(".m")) {
      return text.includes("(*") && (text.includes("Module[") || text.includes("Function[") || text.includes("Plot[") || text.includes("Table[") || text.includes(":=") || text.includes("->"));
    }
    return false;
  },
  loadRenderer: () => import("../types/text/known/wolfram-lang/renderer.js"),
  about: {
    description: "Wolfram Language script — a symbolic computation language used in Mathematica and the Wolfram Engine.",
    usedFor: [
      { label: "Wolfram Language documentation", description: "Official Wolfram Language reference and tutorials", href: "https://reference.wolfram.com/language/" },
      { label: "Wolfram Engine", description: "Free Wolfram Engine for developers", href: "https://www.wolfram.com/engine/" }
    ]
  }
};
var wolfram_lang_default = plugin218;

// ../../docs/types/text/known/stata-do/index.js
var STATA_KEYWORDS = ["use ", "keep ", "drop ", "gen ", "reg ", "summarize", "merge", "reshape", "xtset"];
var plugin219 = {
  id: "stata-do",
  label: "Stata",
  tags: ["stata", "statistics", "econometrics", "data-analysis"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const text = intake.text || "";
    if (name.endsWith(".ado")) return true;
    if (name.endsWith(".do")) {
      const hits = STATA_KEYWORDS.filter((kw) => text.includes(kw));
      return hits.length >= 2;
    }
    return false;
  },
  loadRenderer: () => import("../types/text/known/stata-do/renderer.js"),
  about: {
    description: "Stata do-file or ado-file — scripts for the Stata statistical analysis software.",
    usedFor: [
      { label: "Stata documentation", description: "Official Stata documentation and command reference", href: "https://www.stata.com/features/documentation/" }
    ]
  }
};
var stata_do_default = plugin219;

// ../../docs/types/text/known/tla-plus/index.js
var plugin220 = {
  id: "tla-plus",
  label: "TLA+",
  tags: ["tla+", "formal-methods", "specification", "verification"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (!name.endsWith(".tla")) return false;
    const text = intake.text || "";
    return /----\s*MODULE\s+\w+/.test(text) || /====/.test(text) || /\bVARIABLES\b/.test(text) || /\bCONSTANTS\b/.test(text) || /\\E\b/.test(text) || /\\A\b/.test(text);
  },
  loadRenderer: () => import("../types/text/known/tla-plus/renderer.js"),
  about: {
    description: "TLA+ specification — a formal specification language for describing and verifying concurrent and distributed systems.",
    usedFor: [
      { label: "TLA+ documentation", description: "Official TLA+ documentation and tutorials by Leslie Lamport", href: "https://lamport.azurewebsites.net/tla/tla.html" },
      { label: "TLA+ tools", description: "TLC model checker and other TLA+ tools", href: "https://github.com/tlaplus/tlaplus" }
    ]
  }
};
var tla_plus_default = plugin220;

// ../../docs/types/text/known/rpm-spec/index.js
var plugin221 = {
  id: "rpm-spec",
  label: "RPM Spec",
  tags: ["rpm", "packaging", "linux", "spec"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (name.endsWith(".spec")) return true;
    const text = intake.text || "";
    const hasSections = /%description|%build|%install|%files/.test(text);
    const hasHeaders = /^Name:\s/m.test(text) && /^Version:\s/m.test(text) && /^Release:\s/m.test(text);
    return hasSections || hasHeaders;
  },
  loadRenderer: () => import("../types/text/known/rpm-spec/renderer.js"),
  about: {
    description: "RPM package specification file — defines how to build and package software for RPM-based Linux distributions.",
    usedFor: [
      { label: "RPM Packaging Guide", description: "Official Fedora RPM packaging guide", href: "https://rpm-packaging-guide.github.io/" },
      { label: "RPM Reference Manual", description: "RPM reference documentation", href: "https://rpm.org/documentation.html" }
    ]
  }
};
var rpm_spec_default = plugin221;

// ../../docs/types/text/known/debian-control/index.js
var plugin222 = {
  id: "debian-control",
  label: "Debian Control",
  tags: ["debian", "packaging", "linux", "dpkg"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const path = intake.name || intake.filename || "";
    if (name === "control") {
      if (/\/debian\/|\/DEBIAN\//.test(path) || name === "control") return true;
    }
    const text = intake.text || "";
    if (intake.isBinary || text.startsWith("!<arch>")) return false;
    return /^Package:\s/m.test(text) && /^Version:\s/m.test(text) && /^Architecture:\s/m.test(text) && /^Description:\s/m.test(text);
  },
  loadRenderer: () => import("../types/text/known/debian-control/renderer.js"),
  about: {
    description: "Debian package control file — defines package metadata for .deb packages used in Debian-based Linux distributions.",
    usedFor: [
      { label: "Debian Policy Manual", description: "Debian Policy Manual covering control file format", href: "https://www.debian.org/doc/debian-policy/ch-controlfields.html" },
      { label: "Debian Developer Reference", description: "Debian Developer Reference", href: "https://www.debian.org/doc/manuals/developers-reference/" }
    ]
  }
};
var debian_control_default = plugin222;

// ../../docs/types/text/known/cups-conf/index.js
var plugin223 = {
  id: "cups-conf",
  label: "CUPS",
  tags: ["cups", "printing", "linux", "config"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (name === "cupsd.conf") return true;
    const text = intake.text || "";
    if (/^LoadModule\s/m.test(text) || /<VirtualHost\b/m.test(text)) return false;
    return /^ServerName\s/m.test(text) && /^Listen\s/m.test(text) && /<Location\s/m.test(text);
  },
  loadRenderer: () => import("../types/text/known/cups-conf/renderer.js"),
  about: {
    description: "CUPS printing service configuration file — controls the Common Unix Printing System daemon.",
    usedFor: [
      { label: "CUPS Documentation", description: "Official CUPS documentation and configuration reference", href: "https://www.cups.org/doc/man-cupsd.conf.html" },
      { label: "OpenPrinting", description: "OpenPrinting CUPS project", href: "https://openprinting.github.io/cups/" }
    ]
  }
};
var cups_conf_default = plugin223;

// ../../docs/types/text/known/dafny/index.js
var plugin224 = {
  id: "dafny",
  label: "Dafny",
  tags: ["dafny", "verification", "formal", "specification"],
  match(intake, baseType) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (name.endsWith(".dfy")) return true;
    if (baseType?.id === "markdown") return false;
    const text = intake.text || "";
    const decls = ["method ", "function ", "predicate ", "class "].filter((kw) => text.includes(kw)).length;
    const specs = ["ensures ", "requires ", "modifies ", "invariant "].filter((kw) => text.includes(kw)).length;
    return decls >= 1 && specs >= 1 && decls + specs >= 3;
  },
  loadRenderer: () => import("../types/text/known/dafny/renderer.js"),
  about: {
    description: "Dafny verification-aware programming language — supports formal specification with preconditions, postconditions, and loop invariants.",
    usedFor: [
      { label: "Dafny Language Reference", description: "Official Dafny language reference manual", href: "https://dafny.org/dafny/DafnyRef/DafnyRef" },
      { label: "Dafny Project", description: "Dafny programming language project site", href: "https://dafny.org/" }
    ]
  }
};
var dafny_default = plugin224;

// ../../docs/types/text/known/xdg-desktop-entry/index.js
var plugin225 = {
  id: "xdg-desktop-entry",
  label: "Desktop Entry",
  tags: ["linux", "freedesktop", "xdg", "desktop", "launcher"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (!name.endsWith(".desktop")) return false;
    const text = intake.text || "";
    return /\[Desktop Entry\]/.test(text) && /^Type=/m.test(text);
  },
  loadRenderer: () => import("../types/text/known/xdg-desktop-entry/renderer.js"),
  about: {
    description: "XDG Desktop Entry file — a freedesktop.org standard for defining application launchers, directory entries, and links on Linux desktops.",
    usedFor: [
      { label: "Desktop Entry Specification", description: "Official freedesktop.org specification for .desktop files", href: "https://specifications.freedesktop.org/desktop-entry-spec/latest/" }
    ]
  }
};
var xdg_desktop_entry_default = plugin225;

// ../../docs/types/text/known/isabelle-thy/index.js
var plugin226 = {
  id: "isabelle-thy",
  label: "Isabelle/HOL",
  tags: ["isabelle", "hol", "theorem-prover", "formal-methods", "proof"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (!name.endsWith(".thy")) return false;
    const text = intake.text || "";
    return /\btheory\s+\w/.test(text) && /\bbegin\b/.test(text) && /\bend\b/.test(text) && /\b(lemma|theorem|proof|qed|by\s|fixes|assumes|shows)\b/.test(text);
  },
  loadRenderer: () => import("../types/text/known/isabelle-thy/renderer.js"),
  about: {
    description: "Isabelle/HOL theory file — a proof document for the Isabelle interactive theorem prover, containing definitions, lemmas, theorems, and their machine-checked proofs.",
    usedFor: [
      { label: "Isabelle documentation", description: "Official Isabelle theorem prover documentation", href: "https://isabelle.in.tum.de/documentation.html" },
      { label: "Archive of Formal Proofs", description: "Collection of peer-reviewed Isabelle theories", href: "https://www.isa-afp.org/" }
    ]
  }
};
var isabelle_thy_default = plugin226;

// ../../docs/types/text/known/alloy-lang/index.js
var plugin227 = {
  id: "alloy-lang",
  label: "Alloy",
  tags: ["alloy", "formal-methods", "specification", "model-checking", "relational-logic"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (!name.endsWith(".als")) return false;
    const text = intake.text || "";
    return /\b(module|sig\s|pred\s|fact\s|assert\s|check\s|run\s)\b/.test(text);
  },
  loadRenderer: () => import("../types/text/known/alloy-lang/renderer.js"),
  about: {
    description: "Alloy formal specification file — a declarative language based on relational logic for modeling and analyzing software designs and protocols.",
    usedFor: [
      { label: "Alloy documentation", description: "Official Alloy language documentation and tutorial", href: "https://alloytools.org/documentation.html" },
      { label: "Alloy Analyzer", description: "The Alloy model checking tool", href: "https://alloytools.org/" }
    ]
  }
};
var alloy_lang_default = plugin227;

// ../../docs/types/text/known/coq-lang/index.js
function hasVerilogKeywords(text) {
  return /\b(endmodule|always\s*@|wire\s+|assign\s+)\b/.test(text || "");
}
function hasCoqSignals(text) {
  if (!text) return false;
  return /\bInductive\s+/.test(text) || /\bTheorem\s+/.test(text) && /\bProof\b/.test(text) || /\bFixpoint\s+/.test(text) || /\bLemma\s+/.test(text) && /\bQed\./.test(text);
}
var plugin228 = {
  id: "coq-lang",
  label: "Coq",
  tags: ["coq", "theorem-prover", "formal-methods", "proof-assistant", "dependent-types"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const ext = name.includes(".") ? name.split(".").pop() : "";
    if (ext === "coq") return true;
    if (ext !== "v") return false;
    const text = intake.text || "";
    if (hasVerilogKeywords(text)) return false;
    return hasCoqSignals(text);
  },
  loadRenderer: () => import("../types/text/known/coq-lang/renderer.js"),
  about: {
    description: "Coq proof assistant source file — a formal proof management system supporting dependent type theory, used for verified software, mathematics, and certified compilation.",
    usedFor: [
      { label: "Coq documentation", description: "Official Coq proof assistant documentation", href: "https://coq.inria.fr/documentation" },
      { label: "Software Foundations", description: "Classic Coq-based textbook series on formal verification", href: "https://softwarefoundations.cis.upenn.edu/" }
    ]
  }
};
var coq_lang_default = plugin228;

// ../../docs/types/text/known/flatpak-manifest/index.js
var FLATPAK_APP_ID_RE = /^[a-z][a-z0-9_-]*\.[a-z][a-z0-9_-]*(\.[a-z][a-z0-9_-]*)+$/i;
function looksLikeFlatpakFilename(name) {
  return FLATPAK_APP_ID_RE.test(name.replace(/\.(ya?ml|json)$/i, ""));
}
function looksLikeFlatpakContent(text) {
  const hasAppId = /^\s*app-id\s*:/m.test(text) || /^\s*id\s*:/m.test(text);
  const hasRuntime = /^\s*runtime\s*:/m.test(text);
  const hasSdk = /^\s*sdk\s*:/m.test(text);
  const hasModules = /^\s*modules\s*:/m.test(text);
  const hasJsonAppId = /"app-id"\s*:/.test(text) || /"id"\s*:/.test(text);
  const hasJsonRuntime = /"runtime"\s*:/.test(text);
  const hasJsonSdk = /"sdk"\s*:/.test(text);
  const hasJsonModules = /"modules"\s*:/.test(text);
  return hasAppId && hasRuntime && hasSdk && hasModules || hasJsonAppId && hasJsonRuntime && hasJsonSdk && hasJsonModules;
}
var flatpak_manifest_default = {
  id: "flatpak-manifest",
  label: "Flatpak Manifest",
  tags: ["flatpak", "linux", "packaging", "manifest"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    const ext = name.replace(/.*\./, ".");
    if (ext !== ".yaml" && ext !== ".yml" && ext !== ".json") return false;
    const text = intake.textSample || intake.text || "";
    if (looksLikeFlatpakFilename(name) && looksLikeFlatpakContent(text)) return true;
    if (looksLikeFlatpakContent(text)) return true;
    return false;
  },
  loadRenderer: () => import("../types/text/known/flatpak-manifest/renderer.js"),
  about: {
    description: "Flatpak application manifest — defines app-id, runtime, SDK, modules (build recipes), and finish-args (sandbox permissions).",
    usedFor: [
      { label: "Flatpak documentation", description: "Official Flatpak documentation", href: "https://docs.flatpak.org/" },
      { label: "Flathub", description: "Flatpak app repository", href: "https://flathub.org/" }
    ]
  }
};

// ../../docs/types/text/known/snapcraft-yaml/index.js
function looksLikeSnapContent(text) {
  return /^\s*name\s*:/m.test(text) && /^\s*version\s*:/m.test(text) && /^\s*grade\s*:/m.test(text) && /^\s*confinement\s*:/m.test(text) && /^\s*parts\s*:/m.test(text);
}
var snapcraft_yaml_default = {
  id: "snapcraft-yaml",
  label: "Snapcraft",
  tags: ["snap", "snapcraft", "linux", "packaging"],
  match(intake) {
    const filename = intake.name || intake.filename || "";
    const base = filename.split("/").pop().toLowerCase();
    if (base === "snapcraft.yaml" || base === ".snapcraft.yaml") return true;
    if (/\/snap\//.test(filename) && base === "snapcraft.yaml") return true;
    const text = intake.textSample || intake.text || "";
    return looksLikeSnapContent(text);
  },
  loadRenderer: () => import("../types/text/known/snapcraft-yaml/renderer.js"),
  about: {
    description: "Snapcraft manifest — defines the snap package name, version, confinement, apps, and build parts.",
    usedFor: [
      { label: "Snapcraft documentation", description: "Official Snapcraft documentation", href: "https://snapcraft.io/docs" },
      { label: "Snap Store", description: "Browse available snaps", href: "https://snapcraft.io/store" }
    ]
  }
};

// ../../docs/types/text/known/smtlib/index.js
var SMT_KEYWORDS = ["(set-logic ", "(declare-fun ", "(assert ", "(check-sat", "(get-model"];
function looksLikeSmtLib(text) {
  let hits = 0;
  for (const kw of SMT_KEYWORDS) {
    if (text.includes(kw)) hits++;
  }
  return hits >= 2;
}
var smtlib_default = {
  id: "smtlib",
  label: "SMT-LIB 2",
  tags: ["smt", "smt-lib", "formal-verification", "solver", "logic"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (!name.endsWith(".smt2") && !name.endsWith(".smt")) return false;
    const text = intake.textSample || intake.text || "";
    return looksLikeSmtLib(text);
  },
  loadRenderer: () => import("../types/text/known/smtlib/renderer.js"),
  about: {
    description: "SMT-LIB 2 input file — a standard format for Satisfiability Modulo Theories (SMT) solvers such as Z3, CVC5, and Yices.",
    usedFor: [
      { label: "SMT-LIB standard", description: "The SMT-LIB standard website", href: "https://smtlib.cs.uiowa.edu/" },
      { label: "Z3 SMT solver", description: "Z3 theorem prover by Microsoft Research", href: "https://github.com/Z3Prover/z3" }
    ]
  }
};

// ../../docs/types/text/known/promela/index.js
var PROMELA_KEYWORDS = ["proctype ", "init {", "chan ", "atomic {", ":: ", "do ::", "if ::"];
function looksLikePromela(text) {
  let hits = 0;
  for (const kw of PROMELA_KEYWORDS) {
    if (text.includes(kw)) hits++;
  }
  return hits >= 2;
}
var promela_default = {
  id: "promela",
  label: "PROMELA",
  tags: ["promela", "spin", "model-checking", "formal-verification", "concurrency"],
  match(intake) {
    const name = (intake.name || intake.filename || "").split("/").pop().toLowerCase();
    if (!name.endsWith(".pml") && !name.endsWith(".promela") && !name.endsWith(".prm")) return false;
    const text = intake.textSample || intake.text || "";
    return looksLikePromela(text);
  },
  loadRenderer: () => import("../types/text/known/promela/renderer.js"),
  about: {
    description: "PROMELA (Process Meta Language) model file — the input language for the SPIN model checker, used for formal verification of concurrent systems.",
    usedFor: [
      { label: "SPIN model checker", description: "Official SPIN model checker documentation", href: "https://spinroot.com/" },
      { label: "PROMELA reference", description: "PROMELA language reference", href: "https://spinroot.com/spin/Man/Manual.html" }
    ]
  }
};

// ../../docs/known/registry.js
var KNOWN = [
  glsl_shader_default,
  hlsl_shader_default,
  restructuredtext_default,
  org_mode_default,
  liquid_template_default,
  handlebars_template_default,
  jinja2_template_default,
  mustache_template_default,
  sparql_query_default,
  sql_query_default,
  turtle_rdf_default,
  graphviz_dot_default,
  verilog_default,
  xslt_stylesheet_default,
  svelte_component_default,
  nunjucks_default,
  // Extension-specific language plugins — listed BEFORE broad content-heuristic matchers to avoid interception.
  // Within this block: more-specific (fewer heuristics) goes first to avoid false-positive interception.
  // forth-lang before factor-lang (factor uses VARIABLE/CONSTANT which forth also has)
  // agda, chapel, grain BEFORE idris (idris heuristic is broad: module+import)
  // sml BEFORE ocaml (sml heuristic can overlap ocaml)
  agda_lang_default,
  chapel_lang_default,
  grain_lang_default,
  koka_lang_default,
  carbon_lang_default,
  lean_lang_default,
  idris_lang_default,
  sml_lang_default,
  forth_lang_default,
  factor_lang_default,
  vala_lang_default,
  tex_doc_default,
  common_lisp_default,
  emacs_lisp_default,
  squirrel_lang_default,
  red_lang_default,
  pascal_lang_default,
  eiffel_lang_default,
  coffeescript_lang_default,
  livescript_lang_default,
  rescript_lang_default,
  reason_lang_default,
  gdscript_lang_default,
  ink_script_default,
  fennel_lang_default,
  ballerina_lang_default,
  typst_doc_default,
  textile_markup_default,
  mediawiki_markup_default,
  bbcode_text_default,
  gnuplot_script_default,
  wolfram_lang_default,
  stata_do_default,
  tla_plus_default,
  avahi_daemon_conf_default,
  neomutt_conf_default,
  msmtp_conf_default,
  openldap_conf_default,
  apt_sources_default,
  pkgbuild_default,
  limits_conf_default,
  audit_rules_default,
  journald_conf_default,
  tmpfiles_d_default,
  nsswitch_conf_default,
  mkinitcpio_conf_default,
  wpa_supplicant_conf_default,
  sssd_conf_default,
  rpm_spec_default,
  debian_control_default,
  cups_conf_default,
  dafny_default,
  xdg_desktop_entry_default,
  isabelle_thy_default,
  alloy_lang_default,
  coq_lang_default,
  flatpak_manifest_default,
  snapcraft_yaml_default,
  smtlib_default,
  promela_default,
  haskell_lang_default,
  zig_lang_default,
  elixir_lang_default,
  pug_template_default,
  ejs_template_default,
  ocaml_lang_default,
  fsharp_lang_default,
  clojure_lang_default,
  elm_lang_default,
  kotlin_lang_default,
  scala_lang_default,
  nim_lang_default,
  dart_lang_default,
  groovy_lang_default,
  crystal_lang_default,
  julia_lang_default,
  r_lang_default,
  lua_lang_default,
  purescript_lang_default,
  swift_lang_default,
  erlang_source_default,
  tcl_lang_default,
  scheme_lang_default,
  racket_lang_default,
  fortran_lang_default,
  ruby_lang_default,
  perl_lang_default,
  php_lang_default,
  powershell_lang_default,
  solidity_lang_default,
  vhdl_lang_default,
  arduino_sketch_default,
  cobol_lang_default,
  gleam_lang_default,
  odin_lang_default,
  haxe_lang_default,
  ada_lang_default,
  prolog_lang_default,
  asm_lang_default,
  objc_lang_default,
  d_lang_default,
  pony_lang_default,
  wren_lang_default,
  mojo_lang_default,
  janet_lang_default,
  plist_default,
  steam_acf_default,
  security_txt_default,
  humans_txt_default,
  jsonnet_default,
  cue_lang_default,
  plugin97,
  plugin98,
  plugin99,
  mermaid_diagram_default,
  plantuml_default,
  rego_policy_default,
  asciidoc_default,
  capnp_default,
  flatbuffers_default,
  dhall_config_default,
  wgsl_shader_default,
  package_json_default,
  cargo_toml_default,
  tsconfig_default,
  dockerfile_default,
  gitignore_default,
  docker_compose_default,
  requirements_txt_default,
  go_mod_default,
  composer_json_default,
  gemfile_default,
  codeowners_default,
  editorconfig_default,
  ant_build_default,
  maven_pom_default,
  pom_xml_default,
  build_gradle_default,
  pipfile_default,
  openapi_default,
  github_actions_default,
  k8s_rbac_default,
  k8s_network_policy_default,
  k8s_hpa_default,
  k8s_ingress_default,
  k8s_manifest_default,
  pubspec_default,
  pubspec_lock_default,
  netlify_default,
  vercel_default,
  sitemap_default,
  pyproject_default,
  npmrc_default,
  renovate_default,
  prettierrc_default,
  turbo_default,
  dependabot_default,
  eslint_default,
  jest_default,
  plugin7,
  stylelint_default,
  plugin6,
  babel_default,
  commitlint_default,
  lefthook_default,
  wrangler_default,
  fly_default,
  cliff_default,
  releaserc_default,
  lerna_default,
  nx_default,
  biome_default,
  codecov_default,
  serverless_default,
  azure_pipelines_default,
  vscode_settings_default,
  vscode_extensions_default,
  vscode_launch_default,
  vscode_tasks_default,
  travis_default,
  plugin10,
  amplify_default,
  codebuild_default,
  jsconfig_default,
  deno_default,
  nvmrc_default,
  browserslist_default,
  pre_commit_default,
  pyrightconfig_default,
  plugin11,
  plugin12,
  tox_default,
  mypy_ini_default,
  angular_default,
  capacitor_default,
  nycrc_default,
  devcontainer_default,
  knip_default,
  mocha_default,
  gitlab_ci_default,
  pnpm_workspace_default,
  vitest_default,
  graphql_config_default,
  graphql_codegen_default,
  tspconfig_default,
  apollo_default,
  storybook_default,
  drone_default,
  buildkite_default,
  skaffold_default,
  hadolint_default,
  helm_chart_default,
  kustomize_default,
  ansible_inventory_default,
  ansible_requirements_default,
  ansible_playbook_default,
  pulumi_default,
  packer_default,
  ruff_toml_default,
  uv_default,
  kube_helm_values_default,
  eleventy_config_default,
  gatsby_config_default,
  jvm_options_default,
  artifactory_system_default,
  firebase_default,
  expo_default,
  tailwind_default,
  postcss_default,
  husky_default,
  lint_staged_default,
  nest_cli_default,
  swcrc_default,
  package_lock_default,
  composer_lock_default,
  pnpm_lock_default,
  cargo_lock_default,
  poetry_lock_default,
  go_sum_default,
  makefile_default,
  justfile_default,
  procfile_default,
  env_example_default,
  envrc_default,
  etc_environment_default,
  mise_default,
  tool_versions_default,
  gitattributes_default,
  gemfile_lock_default,
  sonar_default,
  hatch_default,
  mailmap_default,
  npmignore_default,
  dockerignore_default,
  gcloudignore_default,
  eslintignore_default,
  prettierignore_default,
  appveyor_default,
  rubocop_default,
  rubocop_todo_default,
  taskfile_default,
  mkdocs_default,
  rush_default,
  markdownlint_default,
  markdownlint_default2,
  clang_format_default,
  clang_tidy_default,
  moonrepo_default,
  brewfile_default,
  license_default,
  ansible_cfg_default,
  ansible_hosts_default,
  makepkg_conf_default,
  gemspec_default,
  typos_default,
  cargo_deny_default,
  cargo_config_default,
  rustfmt_toml_default,
  clippy_toml_default,
  rust_toolchain_default,
  htaccess_default,
  plugin22,
  plugin23,
  nginx_conf_default,
  apache_conf_default,
  lighttpd_conf_default,
  plugin24,
  plugin25,
  plugin28,
  haproxy_config_default,
  haproxy_conf_default,
  squid_conf_default,
  varnish_vcl_default,
  moon_default,
  vagrantfile_default,
  berksfile_default,
  caddyfile_default,
  render_yaml_default,
  railway_json_default,
  app_json_default,
  rsyslog_conf_default,
  netplan_default,
  syslog_ng_default,
  crowdin_yml_default,
  matchfile_default,
  appfile_default,
  ruby_version_default,
  rspec_config_default,
  sorbet_config_default,
  bundler_audit_config_default,
  standardrb_config_default,
  python_version_default,
  earthfile_default,
  gitmodules_default,
  gitconfig_default,
  tfvars_default,
  podfile_default,
  fastfile_default,
  snapfile_default,
  supabase_config_default,
  redirects_default,
  cmake_default,
  plugin33,
  awk_script_default,
  sed_script_default,
  m4_macro_default,
  lex_yacc_default,
  elvish_script_default,
  fish_script_default,
  zsh_script_default,
  nushell_script_default,
  bazel_default,
  bazelrc_default,
  ninja_build_default,
  package_swift_default,
  mix_exs_default,
  build_sbt_default,
  scalafmt_conf_default,
  scalafix_conf_default,
  playwright_config_default,
  cypress_config_default,
  vcpkg_default,
  cmake_presets_default,
  conanfile_default,
  prometheus_config_default,
  alertmanager_default,
  blackbox_default,
  snmp_exporter_default,
  victoria_metrics_config_default,
  thanos_config_default,
  datadog_config_default,
  ejabberd_config_default,
  vite_config_default,
  webpack_config_default,
  rollup_config_default,
  next_config_default,
  astro_config_default,
  svelte_config_default,
  nuxt_config_default,
  remix_config_default,
  hugo_config_default,
  air_config_default,
  spectral_default,
  tiltfile_default,
  meson_build_default,
  goreleaser_default,
  golangci_lint_default,
  buf_gen_default,
  buf_config_default,
  mockery_config_default,
  ko_config_default,
  sqlc_config_default,
  nfpm_config_default,
  heroku_default,
  readthedocs_default,
  citation_cff_default,
  plugin39,
  plugin40,
  coderabbit_default,
  ionic_config_default,
  metro_config_default,
  react_native_config_default,
  dotnet_global_default,
  prisma_schema_default,
  nuget_config_default,
  sentry_props_default,
  otel_collector_default,
  logback_default,
  log4j2_default,
  checkstyle_xml_default,
  spotbugs_config_default,
  prometheus_rules_default,
  grafana_dashboard_default,
  jaeger_config_default,
  opentelemetry_k8s_default,
  scorecard_default,
  socket_security_default,
  trivy_config_default,
  snyk_config_default,
  plugin41,
  plugin42,
  gradle_version_catalog_default,
  gradle_props_default,
  gradle_wrapper_default,
  settings_gradle_default,
  spring_app_default,
  spring_app_default2,
  csproj_default,
  directory_build_default,
  msbuild_props_default,
  nuspec_default,
  stack_yaml_default,
  cabal_default,
  opam_file_default,
  dune_build_default,
  package_resolved_default,
  rebar_config_default,
  erlang_sys_config_default,
  erlang_vm_args_default,
  cpanfile_default,
  r_description_default,
  r_profile_default,
  docusaurus_config_default,
  vitepress_config_default,
  sphinx_conf_default,
  doxyfile_default,
  drizzle_config_default,
  knexfile_default,
  alembic_default,
  flyway_conf_default,
  dbt_project_default,
  liquibase_props_default,
  sqitch_conf_default,
  atlas_hcl_default,
  waypoint_default,
  wdio_config_default,
  artillery_yml_default,
  k6_config_default,
  gatling_conf_default,
  gae_app_default,
  cloudbuild_default,
  google_services_default,
  catalog_info_default,
  cursor_rules_default,
  claude_md_default,
  copilot_instructions_default,
  aider_conf_default,
  phpunit_default,
  phpstan_default,
  php_cs_fixer_default,
  behat_default,
  php_ini_default,
  psalm_config_default,
  phpunit_config_default,
  rector_config_default,
  terragrunt_default,
  tflint_default,
  tf_lock_default,
  versions_tf_default,
  plugin96,
  tsup_config_default,
  rspack_config_default,
  esbuild_config_default,
  parcelrc_default,
  bunfig_default,
  shopify_app_default,
  lighthouserc_default,
  shadow_cljs_default,
  project_clj_default,
  deps_edn_default,
  atlantis_default,
  spacelift_config_default,
  kamal_config_default,
  prefect_config_default,
  checkov_default,
  terraform_docs_default,
  infracost_default,
  opencost_config_default,
  crossplane_config_default,
  keda_config_default,
  velero_config_default,
  android_manifest_default,
  app_config_default,
  build_zig_zon_default,
  zig_zon_default,
  cartfile_default,
  electron_builder_default,
  elm_json_default,
  external_secrets_default,
  fluent_bit_default,
  logstash_conf_default,
  fluentd_conf_default,
  graylog_conf_default,
  loki_config_default,
  promtail_config_default,
  tempo_default,
  mimir_default,
  cortex_default,
  grafana_alloy_default,
  forge_config_default,
  gleam_toml_default,
  go_work_default,
  grafana_ini_default,
  podman_quadlet_default,
  growthbook_default,
  jekyll_config_default,
  julia_project_default,
  julia_manifest_default,
  kong_config_default,
  apisix_config_default,
  envoy_config_default,
  launch_settings_default,
  appsettings_default,
  nimble_default,
  packages_config_default,
  podspec_default,
  redis_conf_default,
  redis_sentinel_default,
  mongod_conf_default,
  my_cnf_default,
  postgresql_conf_default,
  odoo_conf_default,
  pgbouncer_ini_default,
  pgbackrest_conf_default,
  patroni_config_default,
  cassandra_config_default,
  elasticsearch_config_default,
  kibana_default,
  clickhouse_config_default,
  shard_yml_default,
  crystal_shard_default,
  tauri_conf_default,
  traefik_config_default,
  plugin53,
  unleash_config_default,
  vault_hcl_default,
  nomad_job_default,
  consul_config_default,
  vector_toml_default,
  vector_config_default,
  keepalived_conf_default,
  corosync_conf_default,
  wails_json_default,
  web_config_default,
  xcconfig_default,
  bitbucket_pipelines_default,
  tekton_pipeline_default,
  argo_cd_app_default,
  flux_kustomization_default,
  flux_helm_release_default,
  docker_stack_default,
  semgrep_config_default,
  codeclimate_config_default,
  gitleaks_config_default,
  trufflehog_config_default,
  osv_scanner_default,
  conda_env_default,
  pip_conf_default,
  node_version_file_default,
  docker_bake_default,
  flake8_default,
  pylintrc_default,
  setup_cfg_default,
  aws_credentials_default,
  aws_config_default,
  kubeconfig_default,
  gcp_service_account_default,
  bandit_yaml_default,
  istio_config_default,
  linkerd_config_default,
  etcd_config_default,
  kafka_server_props_default,
  nats_config_default,
  rabbitmq_conf_default,
  mosquitto_conf_default,
  zookeeper_config_default,
  sam_template_default,
  cfn_template_default,
  cdk_json_default,
  aws_sam_config_default,
  release_please_config_default,
  analysis_options_default,
  podfile_lock_default,
  xcode_scheme_default,
  eas_json_default,
  dprint_default,
  rdp_config_default,
  hosts_file_default,
  resolv_conf_default,
  sshd_config_default,
  ssh_config_default,
  ssh_known_hosts_default,
  sudoers_default,
  nfs_exports_default,
  fstab_default,
  crypttab_default,
  mcp_config_default,
  sysctl_conf_default,
  modprobe_conf_default,
  jetbrains_workspace_default,
  neovim_config_default,
  vim_config_default,
  alacritty_conf_default,
  kitty_conf_default,
  starship_config_default,
  emacs_config_default,
  tmux_conf_default,
  nushell_config_default,
  screenrc_default,
  i3_config_default,
  sway_config_default,
  dunstrc_default,
  polybar_conf_default,
  waybar_config_default,
  nanorc_default,
  devbox_json_default,
  proto_config_default,
  aqua_config_default,
  pixi_config_default,
  django_settings_default,
  spring_profiles_default,
  rails_credentials_default,
  puma_config_default,
  woodpecker_ci_default,
  codefresh_config_default,
  opa_policy_default,
  falco_rules_default,
  falco_config_default,
  kyverno_policy_default,
  gatekeeper_config_default,
  harness_pipeline_default,
  actrc_default,
  act_config_default,
  pulsar_conf_default,
  cyclonedx_sbom_default,
  spdx_sbom_default,
  slsa_provenance_default,
  syft_config_default,
  proguard_rules_default,
  android_strings_default,
  keycloak_realm_default,
  authelia_config_default,
  oauth2_proxy_config_default,
  authentik_config_default2,
  authentik_config_default,
  synapse_config_default,
  gotosocial_config_default,
  searxng_config_default,
  newrelic_config_default,
  dynatrace_config_default,
  elastic_apm_config_default,
  filebeat_default,
  heartbeat_default,
  beats_config_default,
  hardhat_config_default,
  truffle_config_default,
  foundry_toml_default,
  anchor_toml_default,
  wireguard_conf_default,
  netbird_config_default,
  tailscale_acl_default,
  headscale_config_default,
  openvpn_config_default,
  openssl_conf_default,
  krb5_conf_default,
  gpg_conf_default,
  gitea_conf_default,
  stunnel_conf_default,
  supervisord_conf_default,
  logrotate_conf_default,
  tlp_conf_default,
  shell_rc_default,
  nix_daemon_conf_default,
  nix_flake_default,
  nix_config_default,
  maven_settings_default,
  pg_hba_default,
  dvc_pipeline_default,
  hydra_config_default,
  mlflow_project_default,
  meltano_config_default,
  dagster_config_default,
  wandb_config_default,
  mintlify_default,
  postman_collection_default,
  har_default,
  avro_schema_default,
  bruno_default,
  insomnia_default,
  openapi_generator_default,
  graphql_schema_default,
  systemd_unit_default,
  openrc_init_default,
  crontab_default,
  cluster_config_default,
  cert_manager_default,
  iptables_rules_default,
  udev_rules_default,
  grub_conf_default,
  nftables_rules_default,
  ufw_conf_default,
  fail2ban_conf_default,
  apparmor_profile_default,
  suricata_config_default,
  smb_conf_default,
  corefile_default,
  containerd_config_default,
  bind_zone_default,
  postfix_main_default,
  postfix_conf_default,
  dovecot_conf_default,
  nagios_conf_default,
  zabbix_conf_default,
  exim_conf_default,
  chrony_conf_default,
  named_conf_default,
  unbound_conf_default,
  pihole_setupvars_default,
  dhcpd_conf_default,
  netdata_config_default,
  netdata_conf_default,
  yarnrc_default,
  hyprland_conf_default,
  lxc_config_default,
  muttrc_default,
  foot_config_default,
  rofi_config_default,
  mako_conf_default,
  pulseaudio_conf_default,
  pipewire_conf_default,
  wezterm_conf_default,
  aria2_conf_default,
  picom_conf_default,
  mpd_conf_default,
  ncmpcpp_conf_default,
  newsboat_conf_default,
  bspwmrc_default,
  sxhkdrc_default,
  mpv_conf_default,
  ytdlp_conf_default,
  xresources_default,
  xorg_conf_default,
  rclone_conf_default,
  restic_config_default,
  borgmatic_config_default,
  taskrc_default,
  curlrc_default,
  inputrc_default,
  wgetrc_default,
  helix_config_default,
  lfrc_default,
  ranger_conf_default,
  zathurarc_default,
  wsl_conf_default,
  loader_conf_default,
  cmus_conf_default,
  pacman_conf_default,
  dnf_conf_default,
  gdbinit_default,
  plugin67,
  plugin68,
  plugin69,
  plugin70,
  plugin71,
  plugin72,
  plugin73,
  benthos_default,
  test_kitchen_default,
  harbor_default,
  harbor_config_default,
  garden_io_default,
  stryker_default,
  volta_default,
  windsurfrules_default,
  airflow_default,
  registries_conf_default,
  storage_conf_default,
  asyncapi_default,
  telegraf_default,
  devfile_default,
  ncurc_default,
  influxdb_default,
  influxdb_config_default,
  nsq_conf_default,
  cloudflared_default,
  dnsmasq_default,
  plugin88,
  plugin89,
  plugin90,
  plugin91,
  coturn_conf_default,
  radicale_config_default,
  gitolite_conf_default,
  miniflux_conf_default,
  ghost_config_default,
  mealie_config_default,
  immich_config_default,
  crowdsec_config_default,
  crowdsec_acquis_default,
  homer_config_default,
  uptime_kuma_config_default,
  photoprism_config_default,
  paperless_conf_default,
  bookstack_config_default,
  bookstack_env_default,
  mattermost_config_default,
  filebrowser_config_default,
  netbox_config_default,
  vaultwarden_env_default,
  ntfy_config_default,
  wakapi_config_default,
  outline_config_default,
  linkding_config_default,
  plausible_config_default,
  umami_config_default,
  stirling_pdf_config_default,
  monica_config_default,
  n8n_config_default,
  nocodb_config_default,
  plane_config_default,
  infisical_config_default,
  diun_config_default,
  hoppscotch_config_default,
  twenty_crm_config_default,
  vikunja_config_default,
  grist_config_default,
  appsmith_config_default,
  glitchtip_config_default,
  archivebox_config_default,
  memos_config_default,
  dex_config_default,
  lldap_config_default,
  invidious_config_default,
  listmonk_config_default,
  windmill_config_default,
  komga_config_default,
  coder_config_default,
  cal_com_config_default,
  rallly_config_default,
  woodpecker_agent_config_default,
  act_runner_config_default,
  vaultwarden_config_default,
  keycloak_config_default,
  minio_config_default,
  drone_config_default,
  sftpgo_config_default,
  sonarqube_config_default,
  concourse_config_default,
  invoiceninja_config_default,
  conduit_config_default,
  zitadel_config_default,
  dendrite_config_default,
  watchtower_config_default,
  changedetection_config_default,
  semaphore_config_default,
  actual_budget_config_default,
  wallos_config_default,
  open_webui_config_default,
  maybe_config_default,
  pocket_id_config_default,
  nzbget_config_default,
  sabnzbd_config_default,
  joplin_server_config_default,
  speedtest_tracker_config_default,
  dozzle_config_default,
  forgejo_config_default,
  glances_config_default,
  homarr_config_default,
  kavita_config_default,
  tandoor_config_default,
  audiobookshelf_config_default,
  dashy_config_default,
  jellyseerr_config_default,
  bazarr_config_default,
  scrutiny_config_default,
  overseerr_config_default,
  freshrss_config_default,
  homepage_config_default,
  wallabag_config_default,
  linkwarden_config_default,
  hoarder_config_default,
  frigate_config_default
];
function matchKnown(intake, baseType) {
  for (const k of KNOWN) {
    try {
      if (k.match(intake, baseType)) return k;
    } catch {
    }
  }
  return null;
}
function matchAllKnown(intake, ranking) {
  const seen = /* @__PURE__ */ new Set();
  const results = [];
  for (const { type } of ranking) {
    for (const k of KNOWN) {
      if (seen.has(k.id)) continue;
      try {
        if (k.match(intake, type)) {
          seen.add(k.id);
          results.push({ known: k, baseType: type });
        }
      } catch {
      }
    }
  }
  return results;
}
export {
  KNOWN,
  matchAllKnown,
  matchKnown
};
