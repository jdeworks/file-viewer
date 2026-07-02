const TYPE_INFO = {
  markdown: ['Markdown', 'used for readable plain-text documents with lightweight formatting.', 'https://www.markdownguide.org/'],
  pdf: ['PDF', 'used for fixed-layout documents that should look the same across devices.', 'https://en.wikipedia.org/wiki/PDF'],
  csv: ['CSV', 'used for tabular data exchanged between spreadsheets, databases, and scripts.', 'https://en.wikipedia.org/wiki/Comma-separated_values'],
  xlsx: ['Excel workbook', 'used for spreadsheet tables, formulas, charts, and multi-sheet workbooks.', 'https://en.wikipedia.org/wiki/Office_Open_XML'],
  docx: ['Word document', 'used for editable rich text documents in the Office Open XML format.', 'https://en.wikipedia.org/wiki/Office_Open_XML'],
  pptx: ['PowerPoint deck', 'used for slide presentations in the Office Open XML format.', 'https://en.wikipedia.org/wiki/Office_Open_XML'],
  odf: ['OpenDocument', 'used for office documents from LibreOffice, OpenOffice, and other ODF tools.', 'https://en.wikipedia.org/wiki/OpenDocument'],
  rtf: ['RTF', 'used for portable rich text with basic formatting across word processors.', 'https://en.wikipedia.org/wiki/Rich_Text_Format'],
  html: ['HTML', 'used for web pages and structured hypertext documents.', 'https://developer.mozilla.org/docs/Web/HTML'],
  eml: ['EML email', 'used for single RFC 5322 email messages with headers and MIME bodies.', 'https://en.wikipedia.org/wiki/Email'],
  mbox: ['Mbox mailbox', 'used for storing multiple email messages in one mailbox file.', 'https://en.wikipedia.org/wiki/Mbox'],
  msg: ['Outlook MSG', 'used for Microsoft Outlook email messages and attachments.', 'https://en.wikipedia.org/wiki/Outlook.com'],
  exe: ['Executable binary', 'used for native application and library binaries such as ELF, PE/COFF, and Mach-O files.', 'https://en.wikipedia.org/wiki/Executable'],
  exr: ['OpenEXR image', 'used for high dynamic range image data in visual effects, animation, and compositing workflows.', 'https://openexr.com/'],
  f3d: ['Fusion 360 design', 'used for Autodesk Fusion 360 CAD designs and assemblies stored as ZIP-backed project archives.', 'https://help.autodesk.com/view/fusion360/ENU/'],
  fbx: ['FBX 3D animation', 'used for proprietary 3D scene, model, rigging, and animation exchange across DCC and game tools.', 'https://en.wikipedia.org/wiki/FBX'],
  hdf5: ['HDF5 scientific data', 'used for hierarchical scientific datasets, machine-learning weights, climate data, and genomics data.', 'https://www.hdfgroup.org/solutions/hdf5/'],
  ics: ['iCalendar', 'used for calendar events, invites, reminders, and recurring schedules.', 'https://en.wikipedia.org/wiki/ICalendar'],
  kubeconfig: ['Kubernetes config', 'used to describe clusters, users, contexts, and credentials for kubectl.', 'https://kubernetes.io/docs/concepts/configuration/organize-cluster-access-kubeconfig/'],
  yaml: ['YAML', 'used for human-readable configuration, manifests, and structured data.', 'https://yaml.org/'],
  toml: ['TOML', 'used for readable configuration files with typed values and tables.', 'https://toml.io/'],
  plist: ['Property list', 'used by Apple platforms for preferences and structured app data.', 'https://en.wikipedia.org/wiki/Property_list'],
  strings: ['Apple strings', 'used for app localization strings on Apple platforms.', 'https://developer.apple.com/library/archive/documentation/Cocoa/Conceptual/LoadingResources/Strings/Strings.html'],
  xml: ['XML', 'used for structured documents, data exchange, feeds, and configuration.', 'https://developer.mozilla.org/docs/Web/XML/XML_introduction'],
  als: ['Ableton Live Set', 'used by Ableton Live projects to store tracks, clips, devices, and timing.', 'https://help.ableton.com/hc/en-us/articles/209773265-File-types-used-by-Ableton-Live'],
  env: ['Environment file', 'used to store environment variables for local apps and services.', 'https://en.wikipedia.org/wiki/Environment_variable'],
  ini: ['INI config', 'used for simple sectioned key-value configuration.', 'https://en.wikipedia.org/wiki/INI_file'],
  patch: ['Patch/diff', 'used to describe line-based source changes that can be reviewed or applied.', 'https://en.wikipedia.org/wiki/Diff'],
  log: ['Log file', 'used to record timestamped events, diagnostics, and application activity.', 'https://en.wikipedia.org/wiki/Log_file'],
  crash: ['Crash report', 'used to diagnose application or operating-system failures.', 'https://en.wikipedia.org/wiki/Core_dump'],
  subtitle: ['Subtitle file', 'used to time captions or translated dialogue for video.', 'https://en.wikipedia.org/wiki/SubRip'],
  vcard: ['vCard', 'used for contact cards with names, organizations, phone numbers, and email.', 'https://en.wikipedia.org/wiki/VCard'],
  geo: ['Geo data', 'used for tracks, waypoints, routes, and geospatial features.', 'https://en.wikipedia.org/wiki/GeoJSON'],
  ipynb: ['Jupyter notebook', 'used for executable code, rich outputs, and narrative analysis.', 'https://docs.jupyter.org/en/latest/'],
  fb2: ['FictionBook', 'used for XML-based ebooks with structured book metadata and chapters.', 'https://en.wikipedia.org/wiki/FictionBook'],
  mobi: ['MOBI ebook', 'used for older Kindle and Mobipocket ebooks.', 'https://en.wikipedia.org/wiki/Mobipocket'],
  lrf: ['Sony LRF', 'used by older Sony Reader BBeB ebooks.', 'https://en.wikipedia.org/wiki/BBeB'],
  'mcp-config': ['MCP config', 'used to configure Model Context Protocol servers for desktop clients.', 'https://modelcontextprotocol.io/'],
  har: ['HAR', 'used to capture browser network requests and timings for debugging.', 'https://en.wikipedia.org/wiki/HAR_(file_format)'],
  json: ['JSON', 'used for structured data interchange and configuration.', 'https://developer.mozilla.org/docs/Learn_web_development/Core/Scripting/JSON'],
  mbtiles: ['MBTiles map tileset', 'used to package offline raster or vector map tiles and map metadata in a SQLite database.', 'https://github.com/mapbox/mbtiles-spec'],
  kmz: ['KMZ map archive', 'used to share compressed KML geographic places, paths, overlays, and Google Earth map data.', 'https://developers.google.com/kml/documentation/kmzarchives'],
  layered: ['Layered image', 'used by design and painting tools to store editable layers.', 'https://en.wikipedia.org/wiki/Adobe_Photoshop'],
  heif: ['HEIF/HEIC', 'used for high-efficiency photos and image sequences.', 'https://en.wikipedia.org/wiki/High_Efficiency_Image_File_Format'],
  ico: ['ICO icon', 'used for Windows icons and website favicons.', 'https://en.wikipedia.org/wiki/ICO_(file_format)'],
  procreate: ['Procreate artwork', 'used by Procreate to store layered illustration documents.', 'https://help.procreate.com/procreate/handbook/interface-gestures/file-types'],
  sketch: ['Sketch document', 'used by Sketch for UI and vector design documents.', 'https://www.sketch.com/docs/workspaces/document-basics/'],
  image: ['Raster image', 'used for photos, screenshots, graphics, and bitmap artwork.', 'https://developer.mozilla.org/docs/Web/Media/Guides/Formats/Image_types'],
  midi: ['MIDI', 'used for musical note, instrument, timing, and control events.', 'https://en.wikipedia.org/wiki/MIDI'],
  media: ['Audio/video', 'used for playable or transcodable media streams.', 'https://developer.mozilla.org/docs/Web/Media/Guides/Formats'],
  mcworld: ['Minecraft Bedrock package', 'used for Minecraft Bedrock world exports, templates, resource packs, and behavior packs.', 'https://minecraft.wiki/w/Bedrock_Edition_level_format'],
  font: ['Font', 'used to package glyph outlines and typographic metadata.', 'https://developer.mozilla.org/docs/Web/CSS/@font-face'],
  stl: ['STL mesh', 'used for 3D printing and triangle mesh exchange.', 'https://en.wikipedia.org/wiki/STL_(file_format)'],
  obj: ['OBJ mesh', 'used for 3D model geometry and simple material references.', 'https://en.wikipedia.org/wiki/Wavefront_.obj_file'],
  gltf: ['glTF', 'used for efficient 3D scene and model exchange.', 'https://www.khronos.org/gltf/'],
  ply: ['PLY mesh', 'used for polygon meshes and scan data with vertex attributes.', 'https://en.wikipedia.org/wiki/PLY_(file_format)'],
  '3mf': ['3MF', 'used for 3D manufacturing models, materials, and print metadata.', 'https://3mf.io/'],
  clip: ['Clip Studio Paint', 'used for layered illustration documents.', 'https://www.clipstudio.net/'],
  sqlite: ['SQLite database', 'used for embedded relational databases in a single file.', 'https://www.sqlite.org/fileformat.html'],
  msgpack: ['MessagePack', 'used for compact binary serialisation in APIs, caches, and inter-process communication.', 'https://msgpack.org/'],
  netcdf: ['NetCDF scientific data', 'used for climate, oceanography, and atmospheric model datasets with dimensions, variables, and attributes.', 'https://www.unidata.ucar.edu/software/netcdf/'],
  epub: ['EPUB', 'used for reflowable ebooks with chapters, metadata, and resources.', 'https://www.w3.org/publishing/epub3/'],
  comic: ['Comic archive', 'used for page-image comics packaged as ZIP/RAR/7z/tar archives.', 'https://en.wikipedia.org/wiki/Comic_book_archive'],
  djvu: ['DjVu', 'used for scanned documents with high compression and optional OCR text.', 'https://en.wikipedia.org/wiki/DjVu'],
  archive: ['Archive', 'used to package files and folders, often with compression.', 'https://en.wikipedia.org/wiki/Archive_file'],
  deb: ['Debian package', 'used to distribute installable software packages for Debian, Ubuntu, and derivatives.', 'https://www.debian.org/doc/manuals/debian-faq/pkg-basics.en.html'],
  ipa: ['iOS app package', 'used to distribute iPhone and iPad apps as ZIP-backed bundles with app metadata and signed executable payloads.', 'https://en.wikipedia.org/wiki/.ipa'],
  iwork: ['Apple iWork', 'used by Pages, Numbers, and Keynote documents.', 'https://en.wikipedia.org/wiki/IWork'],
  iso: ['ISO 9660 disc image', 'used for CD, DVD, boot media, operating-system installers, and software distribution images.', 'https://en.wikipedia.org/wiki/ISO_9660'],
  zip: ['ZIP archive', 'used to package and compress files, sometimes with encryption.', 'https://en.wikipedia.org/wiki/ZIP_(file_format)'],
  torrent: ['BitTorrent metadata', 'used to describe files, trackers, and piece hashes for BitTorrent.', 'https://en.wikipedia.org/wiki/Torrent_file'],
  wad: ['Doom WAD', 'used to bundle id Tech 1 (Doom-engine) game data — levels, textures, sprites, and audio — into a single IWAD/PWAD archive.', 'https://doomwiki.org/wiki/WAD'],
  'java-class': ['Java class', 'used for compiled Java bytecode loaded by the JVM.', 'https://docs.oracle.com/javase/specs/jvms/se21/html/jvms-4.html'],
  wasm: ['WebAssembly', 'used for portable low-level modules that run in browsers and runtimes.', 'https://webassembly.org/'],
  npy: ['NumPy array', 'used to store Python NumPy arrays and array archives.', 'https://numpy.org/doc/stable/reference/generated/numpy.lib.format.html'],
  lnk: ['Windows shortcut', 'used by Windows Shell to point to files, folders, apps, or URLs.', 'https://learn.microsoft.com/openspecs/windows_protocols/ms-shllink/'],
  dmp: ['Windows minidump', 'used to capture compact Windows process crash diagnostics, exception data, and system information.', 'https://learn.microsoft.com/windows/win32/debug/minidump-files'],
  dwg: ['AutoCAD DWG drawing', 'used for proprietary AutoCAD 2D/3D drawing files in architecture, engineering, and CAD workflows.', 'https://en.wikipedia.org/wiki/.dwg'],
  reg: ['Windows Registry export', 'used to export or import Windows Registry keys and values.', 'https://learn.microsoft.com/windows-server/administration/windows-commands/reg-import'],
  url: ['Internet shortcut', 'used to store a URL or target location as a small shortcut file.', 'https://en.wikipedia.org/wiki/Internet_shortcut'],
  asciiart: ['ANSI/ASCII art', 'used for terminal-style text art, often with ANSI color codes.', 'https://en.wikipedia.org/wiki/ANSI_art'],
  gcode: ['G-code', 'used to drive CNC machines and 3D printers with motion commands.', 'https://en.wikipedia.org/wiki/G-code'],
  gitignore: ['Git ignore rules', 'used to exclude generated or local files from Git tracking.', 'https://git-scm.com/docs/gitignore'],
  gitattributes: ['Git attributes', 'used to control path-specific Git behavior such as diff, merge, and text normalization.', 'https://git-scm.com/docs/gitattributes'],
  editorconfig: ['EditorConfig', 'used to share editor formatting rules across tools and projects.', 'https://editorconfig.org/'],
  'ssh-config': ['SSH config', 'used to define SSH hosts, identities, jumps, and connection options.', 'https://man.openbsd.org/ssh_config'],
  rdp: ['RDP connection file', 'used by Remote Desktop clients to store connection settings.', 'https://learn.microsoft.com/windows-server/remote/remote-desktop-services/clients/rdp-files'],
  pem: ['PEM certificate/key', 'used to wrap certificates, public keys, and private keys in base64 text.', 'https://en.wikipedia.org/wiki/Privacy-Enhanced_Mail'],
  gamerom: ['Game ROM', 'used to store console cartridge images and metadata for NES, SNES, Game Boy, and Nintendo 64 emulators.', 'https://en.wikipedia.org/wiki/ROM_image'],
  dicom: ['DICOM medical image', 'used for medical imaging studies from CT, MRI, X-ray, ultrasound, and related equipment.', 'https://www.dicomstandard.org/'],
  nifti: ['NIfTI neuroimaging', 'used to store MRI, fMRI, and DTI brain volumes with header metadata for neuroimaging analysis tools.', 'https://nifti.nimh.nih.gov/'],
  ruffle: ['Flash movie', 'used for SWF animation, games, and interactive Flash content.', 'https://en.wikipedia.org/wiki/SWF'],
  v86: ['PC disk image', 'used to boot legacy operating systems or disks in an x86 emulator.', 'https://en.wikipedia.org/wiki/Disk_image'],
  emulatorjs: ['Emulator ROM', 'used by web emulators to run supported console/game images.', 'https://emulatorjs.org/'],
  proto: ['Protocol Buffer', 'used for gRPC service contracts, message types, and API definitions.', 'https://protobuf.dev/'],
  thrift: ['Apache Thrift', 'used for cross-language RPC service definitions with structs, exceptions, and services.', 'https://thrift.apache.org/'],
  code: ['Source code', 'used for programs, scripts, configuration, and markup edited as text.', 'https://en.wikipedia.org/wiki/Source_code'],
  raw: ['Plain text', 'used for unstructured text or unsupported text-like files.', 'https://en.wikipedia.org/wiki/Text_file'],
  chat: ['Chat export', 'used to archive exported conversations from messaging apps like WhatsApp, Telegram, Discord, and Messenger.', 'https://en.wikipedia.org/wiki/Instant_messaging'],
  cif: ['CIF crystallographic data', 'used to store crystal structure data from X-ray, neutron, and electron diffraction experiments.', 'https://en.wikipedia.org/wiki/Crystallographic_Information_File'],
  bio: ['Bioinformatics data', 'used to store DNA/RNA/protein sequences, sequencer reads, and genomic variants for bioinformatics pipelines.', 'https://en.wikipedia.org/wiki/FASTA_format'],
};

const KNOWN_INFO = {
  'package-json': ['package.json', 'describes a Node.js package, scripts, dependencies, and package metadata.', 'https://docs.npmjs.com/cli/v10/configuring-npm/package-json'],
  'cargo-toml': ['Cargo.toml', 'describes a Rust package, workspace, dependencies, and build settings.', 'https://doc.rust-lang.org/cargo/reference/manifest.html'],
  tsconfig: ['tsconfig.json', 'configures TypeScript compiler options and project files.', 'https://www.typescriptlang.org/tsconfig/'],
  dockerfile: ['Dockerfile', 'defines instructions for building a container image.', 'https://docs.docker.com/reference/dockerfile/'],
  gitignore: ['.gitignore', 'lists files and patterns Git should leave untracked.', 'https://git-scm.com/docs/gitignore'],
  'docker-compose': ['Docker Compose', 'defines multi-container services, networks, volumes, and builds.', 'https://docs.docker.com/compose/compose-file/'],
  'requirements-txt': ['requirements.txt', 'lists Python packages for pip installation.', 'https://pip.pypa.io/en/stable/reference/requirements-file-format/'],
  'go-mod': ['go.mod', 'defines a Go module path, Go version, and module requirements.', 'https://go.dev/ref/mod'],
  'composer-json': ['composer.json', 'describes PHP Composer package metadata and dependencies.', 'https://getcomposer.org/doc/04-schema.md'],
  gemfile: ['Gemfile', 'lists Ruby gems and dependency groups for Bundler.', 'https://bundler.io/gemfile.html'],
  codeowners: ['CODEOWNERS', 'assigns review ownership for paths in a repository.', 'https://docs.github.com/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners'],
  editorconfig: ['.editorconfig', 'shares indentation and formatting rules between editors.', 'https://editorconfig.org/'],
  'pom-xml': ['pom.xml', 'describes a Maven project, dependencies, plugins, and build metadata.', 'https://maven.apache.org/pom.html'],
  'build-gradle': ['build.gradle', 'defines Gradle build logic, plugins, and dependencies.', 'https://docs.gradle.org/current/userguide/writing_build_scripts.html'],
  pipfile: ['Pipfile', 'describes Python project packages and Python version for Pipenv.', 'https://pipenv.pypa.io/en/latest/pipfile.html'],
  openapi: ['OpenAPI', 'describes HTTP APIs, schemas, operations, and examples.', 'https://spec.openapis.org/oas/latest.html'],
};

const FILE_EXAMPLES_GUIDES_BY_ID = {
  pdf: 'pdf',
  docx: 'docx',
  json: 'json',
  xml: 'xml',
  html: 'html',
  yaml: 'yaml',
  csv: 'csv',
  xlsx: 'xlsx',
  zip: 'zip',
  clip: 'clip',
  dbf: 'dbf',
  deb: 'deb',
  dicom: 'dicom',
  dmp: 'dmp',
  dwg: 'dwg',
  exe: 'exe',
  exr: 'exr',
  f3d: 'f3d',
  fbx: 'fbx',
  hdf5: 'hdf5',
  gamerom: 'nes',
};

const FILE_EXAMPLES_GUIDES_BY_EXTENSION = {
  pdf: 'pdf',
  docx: 'docx',
  json: 'json',
  xml: 'xml',
  html: 'html',
  htm: 'html',
  yml: 'yaml',
  yaml: 'yaml',
  csv: 'csv',
  xlsx: 'xlsx',
  png: 'png',
  jpg: 'jpg',
  jpeg: 'jpg',
  svg: 'svg',
  gif: 'gif',
  webp: 'webp',
  mp4: 'mp4',
  m4v: 'mp4',
  mp3: 'mp3',
  zip: 'zip',
  clip: 'clip',
  dbf: 'dbf',
  deb: 'deb',
  udeb: 'deb',
  ipa: 'ipa',
  iso: 'iso',
  dcm: 'dicom',
  dicom: 'dicom',
  dmp: 'dmp',
  mdmp: 'dmp',
  dwg: 'dwg',
  elf: 'exe',
  exe: 'exe',
  dll: 'exe',
  dylib: 'exe',
  so: 'exe',
  exr: 'exr',
  f3d: 'f3d',
  f3z: 'f3d',
  fbx: 'fbx',
  h5: 'hdf5',
  hdf: 'hdf5',
  hdf5: 'hdf5',
  he5: 'hdf5',
  nes: 'nes',
  sfc: 'sfc',
  smc: 'sfc',
  gb: 'gb',
  gbc: 'gb',
  n64: 'n64',
  z64: 'n64',
  v64: 'n64',
};

function fileExtension(intake) {
  const name = String(intake?.filename || '');
  const m = /\.([A-Za-z0-9]+)$/.exec(name);
  return m ? m[1].toLowerCase() : '';
}

function fileExamplesHref(type, intake) {
  const slug = FILE_EXAMPLES_GUIDES_BY_EXTENSION[fileExtension(intake)] || FILE_EXAMPLES_GUIDES_BY_ID[type?.id];
  return slug ? `https://www.fileexamples.com/formats/${slug}` : '';
}

function fromEntry(entry, type, intake) {
  return { name: entry[0], description: entry[1], href: entry[2], fileExamplesHref: fileExamplesHref(type, intake) };
}

export function getTypeInfo(type, known = null, intake = null) {
  if (known && KNOWN_INFO[known.id]) return fromEntry(KNOWN_INFO[known.id], type, intake);
  if (type && TYPE_INFO[type.id]) return fromEntry(TYPE_INFO[type.id], type, intake);
  const label = type?.label || 'File format';
  return {
    name: label,
    description: 'used to store or exchange data in a format-specific structure.',
    href: 'https://en.wikipedia.org/wiki/File_format',
    fileExamplesHref: fileExamplesHref(type, intake),
  };
}

// Per-type editing surfaces not captured by the generic capability flags.
const EDIT_SURFACES = {
  markdown: 'Visual WYSIWYG editor (TipTap) with a formatting toolbar',
  html: 'Visual WYSIWYG HTML editor',
  csv: 'Spreadsheet-style table editor (edit cells in a grid)',
  env: 'Form editor — add / edit / remove variables',
  ini: 'Form editor — sections and key/value pairs',
  toml: 'Form editor — tables and typed values',
  yaml: 'Form editor — edit fields in a tree',
  office: 'Cell / rich-text editing with download-on-save',
  sqlite: 'Run SQL, edit rows, and download the modified database',
};

// "What you can do here" — a runtime, capability-driven feature list for the About modal.
// Derived from the type's declared capabilities + a few known editing surfaces, so it stays
// honest and automatically reflects features as they ship (e.g. a type gaining loadExports).
export function getTypeFeatures(type, known) {
  if (!type) return [];
  const caps = type.capabilities || {};
  const feats = [];
  if (caps.preview) feats.push(['Rendered preview', 'See the file rendered, not just as raw text.']);
  if (caps.rawView) feats.push(['Source editor', 'Edit the raw text (Monaco); save with Download / Ctrl+S.']);
  if (EDIT_SURFACES[type.id]) feats.push(['Visual editing', EDIT_SURFACES[type.id]]);
  if (type.loadExports) feats.push(['Export / convert', 'Download the content in other formats.']);
  if (caps.diff) feats.push(['Compare', 'Diff two versions side by side.']);
  if (caps.screenshot) feats.push(['Screenshot', 'Export the rendered view as a PNG image.']);
  if (caps.magicSelector) feats.push(['Region select', 'Select or extract regions interactively.']);
  if (known && (known.label || known.id)) feats.push(['Enhanced view', `Recognized as ${known.label || known.id} — a tailored summary view.`]);
  feats.push(['Download original', 'The original file can always be downloaded unchanged.']);
  return feats;
}

export function sampleDescription(example, info) {
  const label = example.label || example.file || 'Sample file';
  const typeName = info?.name || 'file';
  const parts = [`${label}: ${typeName} ${info?.description || 'sample file.'}`];
  const cats = example.categories || example.groups || example.category;
  const list = Array.isArray(cats) ? cats : cats ? [cats] : [];
  if (list.length > 1) parts.push('Groups: ' + list.join(', ') + '.');
  if (example.partial) parts.push('Partial support sample.');
  if (example.enhanced) parts.push('Enhanced viewer sample.');
  return parts.join(' ');
}
