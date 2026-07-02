# Capability Matrix

Master overview of all file types supported by the viewer. Columns:

- **Type** — display name (linked to readme if available)
- **Extensions** — main file extensions / filenames
- **Preview depth** — `Full` (rich, interactive) / `Partial` (structured subset) / `Basic` (card/metadata) / `Fallback` (raw text only)
- **Edit** — `Monaco` (raw editor) / `Structured` (form/table) / `None`
- **Export** — download or transform options
- **Known-file plugins** — enhanced sub-renderers matched by filename
- **Gap** — biggest missing feature

> Preview depth mapping from `compatibility.json`: `rich` → **Full**, `structure-only` / `metadata-only` → **Partial**, `basic` → **Basic**, `none` → **Fallback**

---

## Text & Config

| Type | Extensions | Preview depth | Edit | Export | Known-file plugins | Gap |
|------|-----------|---------------|------|--------|--------------------|-----|
| [JSON](json.md) | `.json` `.frag` | Basic | Monaco | download | package.json, tsconfig, composer.json, vercel.json, renovate, prettier, turbo, eslint, jest, stylelint, babel, commitlint, releaserc, lerna, nx, biome, vscode-settings, vscode-extensions, vscode-launch, vscode-tasks, jsconfig, deno.json, pyrightconfig, angular, capacitor, nycrc, devcontainer, knip, mocha (29) | Schema validation |
| [YAML](yaml.md) | `.yaml` `.yml` | Basic | Monaco | download | docker-compose, github-actions, k8s-manifest, pubspec, netlify.toml→, dependabot, lefthook, codecov, serverless, azure-pipelines, travis, circleci, amplify, codebuild, pre-commit, gitlab-ci, pnpm-workspace (17) | Schema validation |
| [TOML](toml.md) | `.toml` `Pipfile` | Basic | Monaco / form | JSON, YAML, download | Cargo.toml, netlify.toml, wrangler.toml, fly.toml, cliff.toml, pyproject.toml + more (46) | Semantic diff |
| [XML](xml.md) | `.xml` | Basic | Monaco | download | pom.xml (1) | XPath query |
| [INI](ini.md) | `.ini` | Basic | Monaco | download | tox.ini (1) | — |
| [Markdown](markdown.md) | `.md` `.markdown` `.mdown` `.mkd` | Full | Monaco / WYSIWYG | HTML, DOCX, download | CODEOWNERS, Gemfile (2) | Math / Mermaid |
| [HTML](html.md) | `.html` | Basic | Monaco | download | — | Sandboxed render |
| [Plain text](/) | `.txt` `.bin` `.gradle` `.mod` | Basic | Monaco | download | requirements.txt, go.mod, build.gradle, .npmrc, .nvmrc, .browserslistrc (6) | — |
| [Log](log.md) | `.log` | Basic | Monaco | download | — | Filter/tail |
| [CSV / TSV](csv.md) | `.csv` | Basic | Monaco | download | — | Sort/filter |
| [JSON Lines](jsonl.md) | `.jsonl` `.ndjson` | Basic | Monaco | download | — | Row limit |
| [Code](/) | `.py` `.js` `.ts` `.tsx` `.go` `.rs` `.java` `.c` `.cpp` `.cs` `.rb` `.php` `.sh` + 25 more | Fallback | Monaco | download | Dockerfile, .gitignore, .editorconfig (3) | — |
| [Dockerfile](dockerfile.md) | `Dockerfile` `.dockerfile` | Basic | Monaco | download | Dockerfile (1) | Multi-stage viz |
| [Docker Compose](/) | `docker-compose.yml` | Basic | Monaco | download | docker-compose (1) | Service graph |
| [EditorConfig](editorconfig.md) | `.editorconfig` | Basic | Monaco | download | .editorconfig (1) | — |
| [.gitignore](gitignore.md) | `.gitignore` | Basic | Monaco | download | .gitignore (1) | — |
| [Git Attributes](gitattributes.md) | `.gitattributes` | Basic | Monaco | download | — | — |
| [Patch / Diff](patch.md) | `.patch` | Basic | Monaco | download | — | — |
| [Crash Report](crash.md) | `.crash` | Basic | Monaco | download | — | — |
| [SSH Config](ssh-config.md) | `ssh-config` | Basic | Monaco | download | — | — |
| [RDP Connection](rdp.md) | `.rdp` | Basic | Monaco | download | — | — |
| [MCP Server Config](mcp-config.md) | `.json` (claude_desktop_config.json) | Basic | Monaco | download | — | — |
| [Kubernetes Config](kubeconfig.md) | `kubeconfig` | Basic | Monaco | download | k8s-manifest (1) | — |
| [Environment Variables](/) | `.env` | Basic | Monaco | download | — | Secret masking |
| [Property List](plist.md) | `.plist` | Basic | Monaco | download | — | Binary plist |
| [Localization Strings](strings.md) | `.strings` | Basic | Monaco | download | — | — |
| [HAR](har.md) | `.har` | Basic | Monaco | download | — | Waterfall chart |
| [SARIF](sarif.md) | `.sarif` | Basic | Monaco | download | — | — |
| [Subtitles](subtitle.md) | `.srt` `.vtt` | Basic | Monaco | SRT/VTT conversion, download | — | ASS support |
| [Apache Thrift](thrift.md) | `.thrift` | Basic | Monaco | download | — | Include resolution |
| [URL Inspector](url.md) | `.url` | Basic | Monaco | download | — | — |
| [Steam ACF](/) | `.acf` | Basic | Monaco | download | — | — |
| [PostScript / EPS](/) | `.ps` `.eps` `.ai` | Basic | Monaco | download | — | No PS render |
| [KiCad EDA](/) | `.kicad_pcb` `.kicad_sch` `.kicad_pro` | Basic | Monaco | download | — | Board render |
| [G-code](/) | `.gcode` | Basic | Monaco | download | — | Tool path viz |
| [MusicXML](/) | `.musicxml` `.mxl` | Basic | Monaco | download | — | Score render |
| [ABC Music](/) | `.abc` | Basic | Monaco | download | — | Score render |
| [Chat Export](/) | `.txt` `.json` (Telegram/WhatsApp/Discord) | Basic | None | download | — | Facebook schema |
| [Hydrogen](/) | `.h2song` `.h2pattern` `.h2drumkit` | Basic | Monaco | download | — | — |
| [FITS Astronomy](/) | `.fits` `.fit` `.fts` | Basic | None | download | — | Image render |

---

## Documents

| Type | Extensions | Preview depth | Edit | Export | Known-file plugins | Gap |
|------|-----------|---------------|------|--------|--------------------|-----|
| [PDF](pdf.md) | `.pdf` | Basic | None | download | — | Text search |
| [Word](office.md) | `.docx` | Basic | None | download | — | Track changes |
| [PowerPoint](office.md) | `.pptx` | Basic | None | download | — | Animation |
| [OpenDocument](office.md) | `.odt` | Basic | None | download | — | — |
| [Apple iWork](office.md) | `.pages` | Basic | None | download | — | Numbers/Keynote |
| [RTF](rtf.md) | `.rtf` | Basic | Monaco | download | — | — |
| [DjVu Document](ebook.md) | `.djvu` | Basic | None | download | — | — |
| [Jupyter Notebook](ipynb.md) | `.ipynb` | Basic | Monaco | download | — | Cell execution |
| [Email](eml.md) | `.eml` | Basic | Monaco | download | — | MIME tree |
| [Outlook Email](/) | `.msg` | Basic | None | download | — | — |
| [Mailbox](mbox.md) | `.mbox` | Partial | Monaco | download | — | Expandable message bodies |
| [Adobe Premiere Project](/) | `.prproj` | Basic | None | download | — | Timeline view |

---

## Spreadsheet

| Type | Extensions | Preview depth | Edit | Export | Known-file plugins | Gap |
|------|-----------|---------------|------|--------|--------------------|-----|
| [Spreadsheet](xlsx.md) | `.xlsx` `.xls` `.xlsm` `.xlsb` `.ods` | Basic | Cell grid | XLSX, CSV, JSON, download | — | Formula text |
| [CSV / TSV](csv.md) | `.csv` `.tsv` | Basic | Monaco | download | — | Column types |

---

## Ebook

| Type | Extensions | Preview depth | Edit | Export | Known-file plugins | Gap |
|------|-----------|---------------|------|--------|--------------------|-----|
| [E-book](ebook.md) | `.epub` | Basic | None | download | — | Pagination |
| [Kindle / MOBI](ebook.md) | `.mobi` | Basic | None | download | — | — |
| [FictionBook (FB2)](ebook.md) | `.fb2` | Basic | Monaco | download | — | — |
| [DjVu Document](ebook.md) | `.djvu` | Basic | None | download | — | — |
| [Sony LRF](ebook.md) | `.lrf` | Basic | None | download | — | — |
| [Comic Book](/) | `.cbz` | Basic | None | download | — | Page turn |

---

## Image

| Type | Extensions | Preview depth | Edit | Export | Known-file plugins | Gap |
|------|-----------|---------------|------|--------|--------------------|-----|
| [Image](image.md) | `.png` `.jpg` `.jpeg` `.gif` `.webp` `.bmp` `.jxl` | Full | Image editor | PNG/JPEG/WebP/AVIF | — | EXIF editor |
| [SVG image](image.md) | `.svg` `.svgz` | Full | Monaco split editor | download | — | Visual vector editing |
| [TIFF](tiff.md) | `.tiff` `.tif` | Basic | Image editor | PNG/JPEG/WebP/AVIF, download | — | Multi-page |
| [HEIC/HEIF](image.md) | `.heic` `.avif` | Basic | None | download | — | — |
| [Icon File](/) | `.ico` | Fallback | None | download | — | Multi-size preview |
| [Layered Image](layered.md) | `.psd` `.psb` `.kra` `.ora` `.xcf` | Fallback | None | download | — | Layer tree |
| [OpenEXR](/) | `.exr` | Basic | None | download | — | Pixel decode |
| [ASCII / ANSI Art](/) | `.ans` | Basic | Monaco | download | — | — |

---

## 3D Models

| Type | Extensions | Preview depth | Edit | Export | Known-file plugins | Gap |
|------|-----------|---------------|------|--------|--------------------|-----|
| [3D](3d.md) | `.stl` | Basic | None | OBJ/PLY, download | — | — |
| [3D](3d.md) | `.obj` | Basic | Monaco | STL/PLY, colored OBJ/MTL, download | — | — |
| [3D](3d.md) | `.glb` `.gltf` | Basic | None | OBJ/PLY, download | — | Animation playback |
| [3D](3d.md) | `.ply` | Basic | None | STL/OBJ, download | — | — |
| [3D Manufacturing (3MF)](3mf.md) | `.3mf` | Basic | None | download | — | Mesh render |
| [STEP CAD](/) | `.stp` `.step` `.p21` | Full | Monaco | download | — | 3D geometry |
| [AutoCAD DXF](/) | `.dxf` | Partial | None | download | — | 2D render |
| [AutoCAD DWG](dwg.md) | `.dwg` | Basic | None | download | — | Geometry |
| [Blender Scene](blend.md) | `.blend` `.blend1` `.blend2` | Basic | None | download | — | Scene tree |
| [FBX Animation](/) | `.fbx` | Basic | None | download | — | Mesh data |
| [Fusion 360](/) | `.f3d` `.f3z` | Basic | None | download | — | 3D geometry |
| [G-code (3D Print)](/) | `.gcode` | Basic | Monaco | download | — | Tool path viz |

---

## Audio / Video

| Type | Extensions | Preview depth | Edit | Export | Known-file plugins | Gap |
|------|-----------|---------------|------|--------|--------------------|-----|
| [Audio / Video](media.md) | `.mp3` `.mp4` `.aac` `.flac` `.m4a` `.mkv` `.mov` `.avi` `.ogg` `.wav` `.webm` | Basic | None | download | — | Clip export |
| [MIDI Sequence](media.md) | `.mid` | Basic | None | download | — | Piano roll |
| [Ableton Live Set](/) | `.als` | Basic | None | download | — | Track list |
| [LMMS Project](/) | `.mmp` `.mmpz` | Full | None | download | — | Automation |
| [Hydrogen Drum](/) | `.h2song` `.h2pattern` `.h2drumkit` | Basic | Monaco | download | — | — |
| [Guitar Pro](/) | `.gp3` `.gp4` `.gp5` `.gpx` | Basic | None | download | — | Tab render |
| [Subtitles](subtitle.md) | `.srt` `.vtt` | Basic | Monaco | SRT/VTT conversion, download | — | ASS support |
| [Flash (SWF / Ruffle)](/) | `.swf` | Basic | None | download | — | — |

---

## Archive

| Type | Extensions | Preview depth | Edit | Export | Known-file plugins | Gap |
|------|-----------|---------------|------|--------|--------------------|-----|
| [Archive (ZIP)](zip.md) | `.zip` `.jar` `.war` `.nupkg` `.cbz` `.whl` | Basic | Entry edits | modified ZIP, CSV, download | — | Add files |
| [Archive](archive.md) | `.7z` `.rar` `.tar` `.tar.gz` `.tgz` `.tar.bz2` `.tbz2` `.tar.xz` `.txz` `.tar.zst` | Basic | None | download | — | Entry preview |
| [Torrent](torrent.md) | `.torrent` | Basic | Monaco | download | — | Magnet link |
| [Minecraft World](/) | `.mcworld` `.mctemplate` `.mcpack` | Partial | None | download | — | Java edition |
| [KMZ Map Archive](geo.md) | `.kmz` | Basic | None | download | — | Overlay render |
| [ISO Disc Image](/) | `.iso` | Basic | None | download | — | File listing |
| [Doom WAD](wad.md) | `.wad` | Basic | None | download | — | Lump decode |
| [BSP Game Map](bsp.md) | `.bsp` | Full | None | download | — | Header/entity inspection |

---

## Database

| Type | Extensions | Preview depth | Edit | Export | Known-file plugins | Gap |
|------|-----------|---------------|------|--------|--------------------|-----|
| [SQLite](sqlite.md) | `.sqlite` `.db` | Basic | None | download | — | CSV/JSON export |
| [Apache Parquet](parquet.md) | `.parquet` | Basic | None | download | — | Row data |
| [Apache Arrow / Feather](arrow.md) | `.arrow` `.feather` `.ipc` | Basic | None | download | — | Column types |
| [Apache Avro](avro.md) | `.avro` | Full | None | download | — | Record decode |
| [HDF5 Scientific](/) | `.h5` `.hdf5` `.hdf` `.he5` | Basic | None | download | — | Dataset contents |
| [dBase / DBF](dbf.md) | `.dbf` | Full | None | download | — | Memo fields |
| [BSON](bson.md) | `.bson` | Full | None | download | — | Multi-doc |
| [CBOR](cbor.md) | `.cbor` | Full | None | download | — | Tag display |
| [MessagePack](/) | `.msgpack` `.mpk` | Full | None | download | — | Ext types |
| [MATLAB MAT-file](mat.md) | `.mat` | Partial | None | download | — | v7.3 / compressed payloads |
| [MBTiles](mbtiles.md) | `.mbtiles` | Partial | None | download | — | Tile preview |
| [NetCDF](/) | `.nc` `.nc4` `.netcdf` | Partial | None | download | — | NetCDF-4 |

---

## Font

| Type | Extensions | Preview depth | Edit | Export | Known-file plugins | Gap |
|------|-----------|---------------|------|--------|--------------------|-----|
| [Font](font.md) | `.ttf` `.otf` `.woff` `.woff2` | Basic | None | download | — | Glyph browser |

---

## Binary & Scientific

| Type | Extensions | Preview depth | Edit | Export | Known-file plugins | Gap |
|------|-----------|---------------|------|--------|--------------------|-----|
| [WebAssembly](wasm.md) | `.wasm` | Basic | None | download | — | WAT disassembly |
| [DICOM Medical](dicom.md) | `.dcm` `.dicom` | Partial | None | download | — | Pixel render |
| [NIfTI Brain](/) | `.nii` `.hdr` `.img` | Full | None | download | — | Voxel render |
| [NumPy Array](/) | `.npy` `.npz` | Basic | None | download | — | Data values |
| [FITS Astronomy](/) | `.fits` `.fit` `.fts` | Basic | None | download | — | Image render |
| [Protein Structure](/) | `.pdb` `.ent` | Basic | Monaco | download | — | 3D viz |
| [Molecular Structure XYZ](xyz.md) | `.xyz` | Basic | Monaco | download | — | Trajectory playback |
| [CIF Crystallographic](/) | `.cif` `.mmcif` `.cif2` | Full | None | download | — | 3D render |
| [SDF / MDL Molfile](/) | `.sdf` `.sd` `.mol` | Full | None | download | — | 3D viz |
| [Python Bytecode](/) | `.pyc` `.pyo` | Basic | None | download | — | Bytecode disasm |
| [Java Class](java-class.md) | `.class` | Basic | None | download | — | No disassembly |
| [Executable (ELF/PE/Mach-O)](exe.md) | `.elf` `.exe` `.dll` `.dylib` `.so` | Basic | None | download | — | Section listing |
| [Windows Shortcut](/) | `.lnk` | Basic | None | download | — | — |
| [Windows Minidump](dmp.md) | `.dmp` `.mdmp` | Basic | None | download | — | — |
| [Network Capture](/) | `.pcap` `.pcapng` `.cap` | Basic | None | download | — | Protocol decode |

---

## Game & Emulation

| Type | Extensions | Preview depth | Edit | Export | Known-file plugins | Gap |
|------|-----------|---------------|------|--------|--------------------|-----|
| [Console ROM (EmulatorJS)](/) | `.gba` `.snes` `.n64` `.nes` (via emulatorjs) | Basic | None | download | — | Save states |
| [Game ROM Header](/) | `.nes` | Basic | None | download | — | — |
| [x86 Disk Image (v86)](v86.md) | `.img` `.ima` `.iso` `.vhd` `.qcow2` | Basic | None | download | — | Large image streaming |
| [Flash (SWF / Ruffle)](/) | `.swf` | Basic | None | download | — | — |
| [Doom WAD](wad.md) | `.wad` | Basic | None | download | — | Lump decode |
| [BSP Game Map](bsp.md) | `.bsp` | Full | None | download | — | Header/entity inspection |
| [Minecraft World](/) | `.mcworld` `.mctemplate` `.mcpack` | Partial | None | download | — | Java edition |

---

## Security & Secrets

| Type | Extensions | Preview depth | Edit | Export | Known-file plugins | Gap |
|------|-----------|---------------|------|--------|--------------------|-----|
| [Certificate / Key (PEM)](pem.md) | `.pem` `.crt` `.key` | Basic | Monaco | download | — | Chain viewer |
| [Environment Variables](/) | `.env` | Basic | Monaco | download | — | Secret masking |
| [Windows Registry](reg.md) | `.reg` | Basic | Monaco | download | — | — |
| [SARIF Security Report](sarif.md) | `.sarif` | Basic | Monaco | download | — | — |
| [Network Capture](/) | `.pcap` `.pcapng` `.cap` | Basic | None | download | — | Protocol decode |

---

## Geo & Map

| Type | Extensions | Preview depth | Edit | Export | Known-file plugins | Gap |
|------|-----------|---------------|------|--------|--------------------|-----|
| [Map (GeoJSON/GPX)](geo.md) | `.geojson` `.gpx` | Basic | Monaco | download | — | Tile map render |
| [KML Map](/) | `.kml` | Basic | Monaco | download | — | Map tile render |
| [KMZ Archive](geo.md) | `.kmz` | Basic | None | download | — | Overlay render |
| [ESRI Shapefile](/) | `.shp` | Basic | None | download | — | Map render |
| [MBTiles](/) | `.mbtiles` | Basic | None | download | — | Tile decode |

---

## Domain Specific

| Type | Extensions | Preview depth | Edit | Export | Known-file plugins | Gap |
|------|-----------|---------------|------|--------|--------------------|-----|
| [Contacts (vCard)](vcard.md) | `.vcf` | Basic | Monaco | download | — | — |
| [Calendar](ics.md) | `.ics` | Basic | Monaco | download | — | — |
| [Mailbox](mbox.md) | `.mbox` | Basic | Monaco | download | — | Thread view |
| [Email](eml.md) | `.eml` | Basic | Monaco | download | — | MIME tree |
| [HL7 v2 Health](/) | `.hl7` | Basic | Monaco | download | — | FHIR support |
| [DICOM Medical](dicom.md) | `.dcm` `.dicom` | Partial | None | download | — | Pixel render |
| [Bioinformatics](/) | `.fasta` `.fa` `.fq` `.fastq` `.vcf` `.bed` | Basic | Monaco | download | — | Alignment view |
| [GFF/GTF Genomic](/) | `.gff` `.gff3` `.gtf` | Basic | Monaco | download | — | Genome browser |
| [OFX / QFX Financial](/) | `.ofx` `.qfx` `.ofc` | Basic | Monaco | download | — | — |
| [QIF Financial](/) | `.qif` `.qfx` | Full | Monaco | download | — | Split transactions |
| [MT940 Bank Statement](/) | `.mt940` `.mt942` `.sta` | Full | Monaco | download | — | Multi-statement |
| [HTTP Archive (HAR)](har.md) | `.har` | Basic | Monaco | download | — | Waterfall chart |
| [Protein Structure](/) | `.pdb` `.ent` | Basic | Monaco | download | — | 3D viz |
| [Molecular XYZ](xyz.md) | `.xyz` | Basic | Monaco | download | — | Trajectory playback |
| [CIF Crystallographic](/) | `.cif` `.mmcif` `.cif2` | Full | None | download | — | 3D render |
| [SDF / MDL Molfile](/) | `.sdf` `.sd` `.mol` | Full | None | download | — | 3D viz |
| [Torrent](torrent.md) | `.torrent` | Basic | Monaco | download | — | Magnet link |
| [Android Package](apk.md) | `.apk` `.aab` `.xapk` | Partial | None | download | — | Manifest parse |
| [iOS App (IPA)](/) | `.ipa` | Basic | None | download | — | Signature verify |
| [Debian Package](deb.md) | `.deb` `.udeb` | Full | None | download | — | control.tar |
| [RPM Package](/) | `.rpm` `.src.rpm` | Basic | None | download | — | Payload extract |
| [NuGet/VSIX/Wheel/JAR](/) | `.nupkg` `.vsix` `.whl` `.jar` | Basic | None | download | — | Class manifest |
| [ESRI Shapefile](/) | `.shp` | Basic | None | download | — | Map render |
| [NetCDF Scientific](/) | `.nc` `.nc4` `.netcdf` | Partial | None | download | — | NetCDF-4 |
| [NIfTI Brain Imaging](/) | `.nii` `.hdr` `.img` | Full | None | download | — | Voxel render |

---

## Creative

| Type | Extensions | Preview depth | Edit | Export | Known-file plugins | Gap |
|------|-----------|---------------|------|--------|--------------------|-----|
| [Clip Studio Paint](clip.md) | `.clip` | Basic | None | download | — | Layer detail |
| [Procreate](/) | `.procreate` | Basic | None | download | — | Layer tree |
| [Fusion 360](/) | `.f3d` `.f3z` | Basic | None | download | — | 3D geometry |
| [Sketch Design](/) | `.sketch` | Basic | None | download | — | Artboard view |
| [Layered Image](layered.md) | `.psd` `.psb` `.kra` `.ora` `.xcf` | Fallback | None | download | — | Layer tree |
| [Blender Scene](blend.md) | `.blend` `.blend1` `.blend2` | Basic | None | download | — | Scene tree |
| [Adobe Premiere](/) | `.prproj` | Basic | None | download | — | Timeline view |
| [LMMS Project](/) | `.mmp` `.mmpz` | Full | None | download | — | Automation |
| [Ableton Live Set](/) | `.als` | Basic | None | download | — | Track list |
| [Guitar Pro](/) | `.gp3` `.gp4` `.gp5` `.gpx` | Basic | None | download | — | Tab render |
| [ASCII / ANSI Art](/) | `.ans` | Basic | Monaco | download | — | — |

---

## Known-file plugin summary

Enhanced filename matchers are registered across the base types above. This table is a compact snapshot; the exhaustive known-plugin audit is tracked separately in `HELP_DOCS_AUDIT_PLAN.md`.

| Base type | Plugin count | Examples |
|-----------|-------------|---------|
| JSON | 29 | package.json, tsconfig, eslint, jest, babel, biome, renovate, prettier, vscode-* |
| YAML | 17 | docker-compose, github-actions, k8s-manifest, dependabot, lefthook, codecov, travis, circleci, gitlab-ci, pnpm-workspace |
| TOML | 46 | Cargo.toml, netlify.toml, wrangler.toml, fly.toml, cliff.toml, pyproject.toml |
| Text/Raw | 6 | requirements.txt, go.mod, build.gradle, .npmrc, .nvmrc, .browserslistrc |
| Markdown | 2 | CODEOWNERS, Gemfile |
| XML | 1 | pom.xml |
| Code | 1 | Dockerfile |
| EditorConfig | 1 | .editorconfig |
| gitignore | 1 | .gitignore |
| toml/ini | 1 | tox.ini |
| YAML/text | 4 | mypy.ini, pubspec.yaml, amplify, azure-pipelines |

Counts in this snapshot are hand-maintained and should be refreshed during the known-plugin audit.
