// known-files smoke area — split into 19 family slices under ./known/ for
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
import { run as p19 } from './known/part-19-compatibility-audit.mjs';

// Ordered full slice list — index N here == part-N. Slices 1–18 open ~40–77 distinct known-file
// plugins; slice 19 locks down the completed compatibility-audit gaps and distinct fixtures.
const SLICES = [p01, p02, p03, p04, p05, p06, p07, p08, p09, p10, p11, p12, p13, p14, p15, p16, p17, p18, p19];

// FV_KNOWN_SAMPLE=release (check.sh default release gate): the full 19-slice / ~850-open sweep is
// ~10–15 min, too heavy for a ~10-min gate. Run a fixed, auditable spread instead — the three
// generic language slices (16 rst/org/doc-formats, 17 php+langs, 18 agda+langs), which each render
// the widest variety of plugins, plus a config/data slice sampled across the alphabetical range
// (01, 06, 11). This is a REAL coverage tradeoff: the plugins in the un-run slices (02–05, 07–10,
// 12–15) are render-tested ONLY in the exhaustive gate — they mostly have no unit owner either, so
// the log line below names exactly which slices are skipped. Slice-granular by design: slices carry
// ordered intra-file state, so mid-slice capping is unsafe.
const RELEASE_SLICE_INDEXES = [1, 6, 11, 16, 17, 18, 19];

export async function run(ctx) {
  const release = process.env.FV_KNOWN_SAMPLE === 'release';
  const runIndexes = release ? RELEASE_SLICE_INDEXES : SLICES.map((_, i) => i + 1);
  if (release) {
    const skipped = SLICES.map((_, i) => i + 1).filter((n) => !RELEASE_SLICE_INDEXES.includes(n));
    ctx.pass(`known-files release sample: rendering slices ${RELEASE_SLICE_INDEXES.join(',')} of 18; slices ${skipped.join(',')} render-tested only in the exhaustive gate`);
  }
  for (const n of runIndexes) {
    await SLICES[n - 1](ctx);
  }
}
