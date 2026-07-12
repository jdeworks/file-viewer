# EmulatorJS vendored runtime provenance

This directory contains an unmodified subset of the official EmulatorJS 4.2.3 release archive.
The upstream tag resolves to commit `e150dc0491ae747028919fb82d6598954976ede6`; the release asset
and every installed file are hash-locked in `LOCK.json`. The refresh helper refuses any archive
whose SHA-256 differs from the published GitHub release digest.

Only the frontend, compression helpers, reports, and normal/legacy non-threaded variants needed by
the six file-viewer mappings are retained. Threaded cores, BIOS/firmware, ROMs, advertisements,
netplay components, and localization files are deliberately excluded. File Viewer disables
threads and automatic language loading and blocks EmulatorJS CDN/netplay hosts at runtime.

## Licenses and corresponding source

- EmulatorJS frontend: GPL-3.0; `LICENSE`, source tag
  <https://github.com/EmulatorJS/EmulatorJS/tree/e150dc0491ae747028919fb82d6598954976ede6>.
- FCEUmm: GPL-2.0; `licenses/fceumm-GPL-2.0.txt`, source snapshot
  <https://github.com/EmulatorJS/libretro-fceumm/tree/d9d7e141274d07186b6a871ca2919b6f13cfb2f9>.
- Gambatte: GPL-2.0; `licenses/gambatte-GPL-2.0.txt`, source snapshot
  <https://github.com/EmulatorJS/gambatte-libretro/tree/811b1f7a56c16f8588caada36d7a3f9a56cb16d4>.
- mGBA: MPL-2.0; `licenses/mgba-MPL-2.0.txt`, source snapshot
  <https://github.com/EmulatorJS/mgba/tree/57678d6180e7020798809703283e02d2bba18b63>.
- Snes9x: upstream Snes9x non-commercial license; `licenses/snes9x-license.txt`, source snapshot
  <https://github.com/EmulatorJS/snes9x/tree/6ca2343e5f3b0acbea49ca958251e3a0af58a81d>.
- Genesis Plus GX: upstream non-commercial license with component notices;
  `licenses/genesis-plus-gx-license.txt`, source snapshot
  <https://github.com/EmulatorJS/Genesis-Plus-GX/tree/def3a7c0e413ef35a7d9d4430e5c9c9a5698b4fe>.
- Stella 2014: GPL-2.0; `licenses/stella2014-GPL-2.0.txt`, source snapshot
  <https://github.com/EmulatorJS/stella2014-libretro/tree/1f578c36382bb5a86a0fe245973fa557f369738b>.
- libunrar.js helper: UnRAR license; `licenses/libunrar-license.txt`, source snapshot
  <https://github.com/tnikolai2/libunrar-js/tree/294e362691041b70bef818628e7dfb012b2474aa>.

Core reports record builds on 2025-06-14. The source snapshots above are the respective repository
heads at those build times and are retained with their full license texts. File Viewer does not
modify the upstream core binaries.
