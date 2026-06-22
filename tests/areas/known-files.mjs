// known-files smoke area — split into 18 family slices under ./known/ for
// maintainability (was a single ~6.3k-line run()). This file stays the registered area
// ('known-files') and the entry smoke-known.mjs imports; it calls each slice in the ORIGINAL
// order on the SAME ctx, so the harness openCount reload cadence and any sequential state are
// byte-identical to the old single file. Slices are line-for-line copies of the original body.
import { run as p01 } from './known/part-01-package-json.mjs';
import { run as p02 } from './known/part-02-wrangler-toml.mjs';
import { run as p03 } from './known/part-03-lintstagedrc-json.mjs';
import { run as p04 } from './known/part-04-moon-yml.mjs';
import { run as p05 } from './known/part-05-package-resolved.mjs';
import { run as p06 } from './known/part-06-setup-cfg.mjs';
import { run as p07 } from './known/part-07-opentelemetry-k8s-yaml-otel-.mjs';
import { run as p08 } from './known/part-08-example-nomad-nomad-job.mjs';
import { run as p09 } from './known/part-09-nuget-config.mjs';
import { run as p10 } from './known/part-10-settings-gradle.mjs';
import { run as p11 } from './known/part-11-picom-conf.mjs';
import { run as p12 } from './known/part-12-global-json.mjs';
import { run as p13 } from './known/part-13-windsurfrules.mjs';
import { run as p14 } from './known/part-14-miniflux-conf.mjs';
import { run as p15 } from './known/part-15-speedtest-tracker-env.mjs';
import { run as p16 } from './known/part-16-sample-rst.mjs';
import { run as p17 } from './known/part-17-sample-php.mjs';
import { run as p18 } from './known/part-18-sample-agda.mjs';

export async function run(ctx) {
  await p01(ctx);
  await p02(ctx);
  await p03(ctx);
  await p04(ctx);
  await p05(ctx);
  await p06(ctx);
  await p07(ctx);
  await p08(ctx);
  await p09(ctx);
  await p10(ctx);
  await p11(ctx);
  await p12(ctx);
  await p13(ctx);
  await p14(ctx);
  await p15(ctx);
  await p16(ctx);
  await p17(ctx);
  await p18(ctx);
}
