const CASES = [
  ['storybook.main.json', 'storybook'],
  ['Chart.yaml', 'helm-chart'],
  ['kustomization.yaml', 'kustomize'],
  ['ansible-playbook.yml', 'ansible-playbook'],
  ['Pulumi.yaml', 'pulumi'],
  ['packer.json', 'packer'],
  ['uv.toml', 'uv'],
  ['values.yaml', 'kube-helm-values'],
  ['app.json', 'expo'],
  ['.gitmodules', 'gitmodules'],
  ['terraform.tfvars', 'tfvars'],
  ['.moon/workspace.yml', 'moonrepo'],
  ['phpunit.dist.xml', 'phpunit'],
  ['act.config', 'act-config'],
  ['metricbeat.yml', 'beats-config'],
  ['shell.nix', 'nix-config'],
  ['postfix.conf', 'postfix-conf'],
  ['vector.yaml', 'vector-config'],
  ['authentik.env', 'authentik-config'],
  ['drone.env', 'drone-config'],
  ['kavita-appsettings.json', 'kavita-config'],
  ['.Rprofile', 'r-profile'],
  ['cluster-config.yaml', 'cluster-config'],
  ['radicale.conf', 'radicale-config'],
  ['gitolite.conf', 'gitolite-conf'],
];

export async function run(ctx) {
  const { page, pass, fail, openExample } = ctx;
  for (const [file, expectedKnown] of CASES) {
    await openExample(file);
    const result = await page.evaluate(() => ({
      known: window.__fv?.state?.known?.id || null,
      forceBase: !!window.__fv?.state?.forceBase,
      previewChildren: document.querySelector('#previewHost')?.childElementCount || 0,
      text: document.querySelector('#previewHost')?.textContent || '',
    }));
    if (result.known === expectedKnown && !result.forceBase && result.previewChildren > 0
        && !/Preview failed|TypeError|ReferenceError/i.test(result.text)) {
      pass(`${file}: ${expectedKnown} fixture selects and renders its enhanced view`);
    } else {
      fail(`${file}: expected ${expectedKnown}, got ${JSON.stringify(result)}`);
    }
  }
}
