export const FORMAT_CONFIGS = [
  { id: '1440x900-light', width: 1440, height: 900, theme: 'light' },
  { id: '1280x720-dark', width: 1280, height: 720, theme: 'dark' },
  { id: '390x844-light', width: 390, height: 844, theme: 'light' },
  { id: '1440x900-dark', width: 1440, height: 900, theme: 'dark' },
  { id: '1280x720-light', width: 1280, height: 720, theme: 'light' },
  { id: '390x844-dark', width: 390, height: 844, theme: 'dark' },
];

const rows = [
  ['markdown', 'Text/data', 'docs/examples/welcome.md', ['Welcome to File Viewer', 'mobile-first']],
  ['csv', 'Text/data', 'docs/examples/sample.csv', ['Ada Lovelace', 'Katherine Johnson']],
  // composer.json is a useful known-file trial but does not exercise the base JSON renderer.
  // Use the checked-in generic sample for denominator credit and record the replacement in evidence.
  ['json', 'Text/data', 'docs/examples/sample.json', ['file-viewer', 'client-only'], { originalFile: 'docs/examples/composer.json', replacementReason: 'composer.json activates the composer-json enhancement; generic sample.json exercises the base JSON renderer' }],
  ['yaml', 'Text/data', 'docs/examples/stack.yaml', ['resolver', 'async-pool'], { requireBaseView: true }],
  ['xml', 'Text/data', 'docs/examples/build.xml', ['MyApp', 'compile'], { requireBaseView: true }],
  ['jsonl', 'Text/data', 'docs/examples/sample.jsonl', ['Server started', 'Slow query detected']],
  ['sqlite', 'Text/data', 'docs/examples/sample.sqlite', ['albums', 'artists']],
  ['ipynb', 'Text/data', 'docs/examples/sample.ipynb', ['Notebook demo', 'Hello from a saved notebook output']],
  ['image', 'Images', 'docs/examples/sample.png', [], { requirePixels: true }],
  ['svg', 'Images', 'docs/examples/example.svg', ['SVG, sanitized'], { requirePixels: true }],
  ['tiff', 'Images', 'docs/examples/sample.tiff', [], { requirePixels: true }],
  ['layered', 'Images', 'docs/examples/sample.psd', ['Layers'], { requirePixels: true }],
  ['pdf', 'Office/PDF', 'docs/examples/sample-pages.pdf', [], { requirePixels: true, minVisualItems: 2 }],
  ['xlsx', 'Office/PDF', 'docs/examples/sample.xlsx', ['People', 'Totals'], { minVisualItems: 2 }],
  ['docx', 'Office/PDF', 'docs/examples/sample.docx', ['Hello, File Viewer', 'A subheading']],
  ['pptx', 'Office/PDF', 'docs/examples/sample.pptx', [], { minVisualItems: 2, requirePixels: true }],
  ['odf', 'Office/PDF', 'docs/examples/sample.odt', ['OpenDocument Sample', 'First item']],
  ['rtf', 'Office/PDF', 'docs/examples/sample.rtf', ['Sample RTF Document', 'About RTF Parsing']],
  // The checked-in 33-byte 7z is a valid but empty archive. Preflight creates a deterministic,
  // content-rich tar.gz so the archive tree and scrolling surface can be judged meaningfully.
  ['archive', 'Archives/e-books', 'artifacts/v0.1.0-public-beta-readiness/format-fixtures/representative.tar.gz', ['README.md', 'nested/data.json'], { originalFile: 'docs/examples/Sample.7z', replacementReason: 'Sample.7z is an empty 33-byte archive and cannot exercise an archive tree' }],
  ['zip', 'Archives/e-books', 'docs/examples/sample.zip', ['README.txt', 'src/app.js']],
  ['epub', 'Archives/e-books', 'docs/examples/sample.epub', ['The Gift of the Magi', 'O. Henry']],
  ['comic', 'Archives/e-books', 'docs/examples/sample.cbz', [], { requirePixels: true, minVisualItems: 3 }],
  ['media', 'Media', 'docs/examples/sample.webm', [], { requirePixels: true, originalFile: 'docs/examples/sample.mp4', replacementReason: 'sample.mp4 decodes as a zero-dimension audio-only MP4 in Chromium; sample.webm has a real 320×180 video track for visual inspection' }],
  ['midi', 'Media', 'docs/examples/sample.mid', ['Type 1 Format', '2 Tracks']],
  ['font', 'Fonts', 'docs/examples/sample.ttf', ['quick brown fox', 'SIZE RAMP']],
  ['stl', '3D/CAD/GIS/science', 'docs/examples/sample.stl', ['8 triangles'], { requirePixels: true }],
  ['gltf', '3D/CAD/GIS/science', 'docs/examples/sample.glb', ['12 triangles'], { requirePixels: true }],
  ['dxf', '3D/CAD/GIS/science', 'docs/examples/sample.dxf', ['AutoCAD 2013', 'LINE'], { requirePixels: true }],
  ['geojson', '3D/CAD/GIS/science', 'artifacts/v0.1.0-public-beta-readiness/format-fixtures/representative.topojson', ['districts', 'TopoJSON'], { originalFile: 'docs/examples/sample.geojson', replacementReason: 'sample.geojson intentionally auto-detects as the distinct geo base type; a TopoJSON fixture exercises the registered geojson base type' }],
  ['kml', '3D/CAD/GIS/science', 'docs/examples/sample.kml', ['Googleplex', 'Apple Park']],
  ['dicom', '3D/CAD/GIS/science', 'docs/examples/sample.dcm', ['DICOM', 'Computed Tomography']],
  ['netcdf', '3D/CAD/GIS/science', 'docs/examples/sample.nc', ['NetCDF', 'temperature']],
  ['pdb', '3D/CAD/GIS/science', 'docs/examples/sample.pdb', ['DEMO', '1.80'], { requirePixels: true, nestedScrollSelector: '.pdb-doc' }],
  ['fits', '3D/CAD/GIS/science', 'docs/examples/sample.fits', ['FITS'], { requirePixels: true }],
  ['wasm', 'Binaries', 'docs/examples/sample.wasm', ['WebAssembly', 'export']],
  ['npy', 'Binaries', 'docs/examples/sample.npy', ['NumPy', 'float']],
  ['exe', 'Binaries', 'docs/examples/sample.elf', ['ELF', 'x86-64']],
  ['apk', 'Binaries', 'docs/examples/sample.apk', ['classes.dex', 'arm64-v8a']],
  ['torrent', 'Binaries', 'docs/examples/sample.torrent', ['tracker', 'sample.txt']],
  ['dockerfile', 'Developer/config', 'docs/examples/Dockerfile', ['builder', 'nginx'], { requireBaseView: true }],
  ['docker-compose', 'Developer/config', 'docs/examples/docker-compose.yml', ['web', 'postgres'], { requireBaseView: true }],
  ['sarif', 'Developer/config', 'docs/examples/sample.sarif', ['DemoScanner', 'SQL001']],
  ['pem', 'Developer/config', 'docs/examples/sample.pem', ['Certificate', 'ISRG Root X1']],
  ['patch', 'Developer/config', 'docs/examples/sample.patch', ['greet.js', 'Goodbye']],
  ['code', 'Developer/config', 'docs/examples/App.swift', ['Release', 'ISO8601DateFormatter'], { rawOnly: true, requireBaseView: true }],
];

export const FORMAT_CASES = rows.map(([expectedType, family, file, tokens, options = {}], index) => ({
  index: index + 1,
  slug: `${String(index + 1).padStart(2, '0')}-${expectedType}`,
  expectedType,
  family,
  file,
  tokens,
  config: FORMAT_CONFIGS[index % FORMAT_CONFIGS.length],
  ...options,
}));

export const MIME_BY_EXTENSION = {
  md: 'text/markdown', csv: 'text/csv', json: 'application/json', yaml: 'application/yaml',
  yml: 'application/yaml', xml: 'application/xml', jsonl: 'application/x-ndjson',
  sqlite: 'application/vnd.sqlite3', ipynb: 'application/json', png: 'image/png',
  svg: 'image/svg+xml', tiff: 'image/tiff', psd: 'image/vnd.adobe.photoshop',
  pdf: 'application/pdf', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  odt: 'application/vnd.oasis.opendocument.text', rtf: 'application/rtf', gz: 'application/gzip',
  zip: 'application/zip', epub: 'application/epub+zip', cbz: 'application/vnd.comicbook+zip',
  mp4: 'video/mp4', mid: 'audio/midi', ttf: 'font/ttf', stl: 'model/stl',
  glb: 'model/gltf-binary', dxf: 'image/vnd.dxf', geojson: 'application/geo+json',
  kml: 'application/vnd.google-earth.kml+xml', dcm: 'application/dicom', nc: 'application/netcdf',
  pdb: 'chemical/x-pdb', fits: 'application/fits', wasm: 'application/wasm',
  npy: 'application/octet-stream', elf: 'application/x-executable', apk: 'application/vnd.android.package-archive',
  torrent: 'application/x-bittorrent', pem: 'application/x-pem-file', patch: 'text/x-diff', swift: 'text/x-swift',
};

export function mimeFor(file) {
  const ext = file.toLowerCase().split('.').pop();
  return MIME_BY_EXTENSION[ext] || 'application/octet-stream';
}
