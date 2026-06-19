// Plugin registry — the single source of truth for which file types exist.
//
// Client-side code cannot list directories, so adding a type means TWO touches:
//   1) create docs/types/<id>/  (index.js, detect.js, renderer.js, metadata.js, settings.default.json)
//   2) add ONE line below.
// Everything else about a type stays inside its own folder.
//
// ── Module descriptor contract (default export of types/<id>/index.js) ──────────
//   {
//     id: string,                       // unique, matches folder name
//     label: string,                    // human label for the type dropdown
//     detect(intake) => number,         // 0..1 confidence. MUST be cheap (runs for every file).
//     capabilities: {                   // what the core shell should offer for this type
//       rawView:   boolean,             // show Monaco raw editor
//       preview:   boolean,             // show rendered iframe preview
//       diff:      boolean,             // editable -> keep original, offer diff
//       magicSelector: boolean,         // source<->render mapping
//       screenshot:    boolean,         // rendered-content screenshot
//     },
//     syntaxLanguage: string|null,      // Monaco language id for highlighting
//     preferredMode?: 'raw'|'split'|'preview', // optional desktop default when raw+preview exist
//     loadRenderer() => Promise<{render}>,   // lazy: heavy deps live here, not at detect time
//     loadMetadata() => Promise<{extract}>,  // lazy per-type metadata extractor (optional)
//     about?: { description:string, usedFor?: [{label, description, href}] },
//     settingsUrl: URL,                 // settings.default.json location
//   }
//
// ── Intake object (passed to detect / render / extract) ─────────────────────────
//   { filename, mimeType, bytes:Uint8Array, text, textSample, isPaste, size, lastModified }

import pemType from '../types/text/pem/index.js';
import rawType from '../types/text/raw/index.js';
import urlType from '../types/text/url/index.js';
import asciiartType from '../types/text/asciiart/index.js';
import markdownType from '../types/markdown/index.js';
import pdfType from '../types/pdf/index.js';
import csvType from '../types/text/csv/index.js';
import xlsxType from '../types/office/xlsx/index.js';
import docxType from '../types/office/docx/index.js';
import pptxType from '../types/office/pptx/index.js';
import jsonType from '../types/text/json/index.js';
import harType from '../types/text/har/index.js';
import jsonlType from '../types/text/jsonl/index.js';
import ofxType from '../types/text/ofx/index.js';
import musicxmlType from '../types/text/musicxml/index.js';
import bioType from '../types/text/bio/index.js';
import ipynbType from '../types/ipynb/index.js';
import imageType from '../types/image/index.js';
import midiType from '../types/binary/midi/index.js';
import mediaType from '../types/media/index.js';
import codeType from '../types/text/code/index.js';
import htmlType from '../types/html/index.js';
import emlType from '../types/eml/index.js';
import mboxType from '../types/mbox/index.js';
import msgType from '../types/binary/msg/index.js';
import icsType from '../types/ics/index.js';
import yamlType from '../types/text/yaml/index.js';
import tomlType from '../types/text/toml/index.js';
import plistType from '../types/text/plist/index.js';
import stringsType from '../types/text/strings/index.js';
import xmlType from '../types/text/xml/index.js';
import alsType from '../types/text/als/index.js';
import iniType from '../types/text/ini/index.js';
import envType from '../types/text/env/index.js';
import patchType from '../types/text/patch/index.js';
import logType from '../types/text/log/index.js';
import crashType from '../types/text/crash/index.js';
import geoType from '../types/geo/index.js';
import fontType from '../types/font/index.js';
import stlType from '../types/3d/stl/index.js';
import objType from '../types/3d/obj/index.js';
import gltfType from '../types/3d/gltf/index.js';
import plyType from '../types/3d/ply/index.js';
import threemfType from '../types/3d/3mf/index.js';
import subtitleType from '../types/text/subtitle/index.js';
import vcardType from '../types/vcard/index.js';
import sqliteType from '../types/sqlite/index.js';
import clipType from '../types/binary/clip/index.js';
import iworkType from '../types/office/iwork/index.js';
import zipType from '../types/zip/index.js';
import archiveType from '../types/archive/index.js';
import epubType from '../types/ebook/epub/index.js';
import comicType from '../types/ebook/comic/index.js';
import djvuType from '../types/ebook/djvu/index.js';
import fb2Type from '../types/ebook/fb2/index.js';
import mobiType from '../types/ebook/mobi/index.js';
import odfType from '../types/office/odf/index.js';
import rtfType from '../types/text/rtf/index.js';
import lrfType from '../types/ebook/lrf/index.js';
import layeredType from '../types/layered/index.js';
import tiffType from '../types/image/tiff/index.js';
import icoType from '../types/image/ico/index.js';
import procreateType from '../types/image/procreate/index.js';
import sketchType from '../types/image/sketch/index.js';
import heifType from '../types/image/heif/index.js';
import torrentType from '../types/binary/torrent/index.js';
import gameromType from '../types/binary/gamerom/index.js';
import exeType from '../types/binary/exe/index.js';
import apkType from '../types/binary/apk/index.js';
import isoType from '../types/binary/iso/index.js';
import javaClassType from '../types/binary/class/index.js';
import wasmType from '../types/binary/wasm/index.js';
import npyType from '../types/binary/npy/index.js';
import lnkType from '../types/binary/lnk/index.js';
import dmpType from '../types/binary/dmp/index.js';
import dxfType from '../types/text/dxf/index.js';
import mcworldType from '../types/binary/mcworld/index.js';
import dicomType from '../types/binary/dicom/index.js';
import netcdfType from '../types/binary/netcdf/index.js';
import kmzType from '../types/binary/kmz/index.js';
import mbtilesType from '../types/binary/mbtiles/index.js';
import pdbType from '../types/text/pdb/index.js';
import pcapType from '../types/binary/pcap/index.js';
import regType from '../types/text/reg/index.js';
import gcodeType from '../types/text/gcode/index.js';
import gitignoreType from '../types/text/gitignore/index.js';
import gitattributesType from '../types/text/gitattributes/index.js';
import editorconfigType from '../types/text/editorconfig/index.js';
import sshConfigType from '../types/text/ssh-config/index.js';
import rdpType from '../types/text/rdp/index.js';
import mcpConfigType from '../types/text/mcp-config/index.js';
import kubeconfigType from '../types/text/kubeconfig/index.js';
import kicadType from '../types/text/kicad/index.js';
import chatType from '../types/text/chat/index.js';
import guitarProType from '../types/text/guitar-pro/index.js';
import postscriptType from '../types/text/postscript/index.js';
import acfType from '../types/text/acf/index.js';
import fitsType from '../types/text/fits/index.js';
import kmlType from '../types/text/kml/index.js';
import abcType from '../types/text/abc/index.js';
import hl7Type from '../types/text/hl7/index.js';
import hydrogenType from '../types/text/hydrogen/index.js';
import prprojType from '../types/text/prproj/index.js';
import ruffleType from '../types/emulator/ruffle/index.js';
import v86Type from '../types/emulator/v86/index.js';
import emulatorjsType from '../types/emulator/emulatorjs/index.js';

// Order is fallback priority only when confidences tie. `raw` always present as last resort.
export const REGISTRY = [
  markdownType,
  pdfType,
  csvType,
  xlsxType,
  docxType,
  pptxType,
  odfType,
  rtfType,
  htmlType,
  emlType,
  mboxType,
  msgType,
  icsType,
  kubeconfigType,
  yamlType,
  tomlType,
  plistType,
  stringsType,
  musicxmlType,
  xmlType,
  alsType,
  envType,
  iniType,
  patchType,
  logType,
  crashType,
  subtitleType,
  vcardType,
  geoType,
  ipynbType,
  fb2Type,
  mobiType,
  lrfType,
  mcpConfigType,
  harType,
  jsonlType,
  ofxType,
  bioType,
  jsonType,
  layeredType,
  tiffType,
  heifType,
  icoType,
  procreateType,
  sketchType,
  imageType,
  midiType,
  mediaType,
  fontType,
  stlType,
  objType,
  gltfType,
  plyType,
  threemfType,
  clipType,
  sqliteType,
  epubType,
  comicType,
  djvuType,
  archiveType,
  iworkType,
  zipType,
  torrentType,
  javaClassType,
  wasmType,
  npyType,
  lnkType,
  dmpType,
  dxfType,
  mcworldType,
  dicomType,
  netcdfType,
  kmzType,
  mbtilesType,
  pdbType,
  pcapType,
  regType,
  urlType,
  asciiartType,
  kicadType,
  chatType,
  guitarProType,
  postscriptType,
  acfType,
  fitsType,
  kmlType,
  abcType,
  hl7Type,
  hydrogenType,
  prprojType,
  gcodeType,
  gitignoreType,
  gitattributesType,
  editorconfigType,
  sshConfigType,
  rdpType,
  pemType,
  gameromType,
  exeType,
  apkType,
  isoType,
  ruffleType,
  v86Type,
  emulatorjsType,
  codeType,
  rawType,
];

export function getType(id) {
  return REGISTRY.find((t) => t.id === id) || null;
}

export const FALLBACK_TYPE = rawType;
