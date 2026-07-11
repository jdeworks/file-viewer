// Human judgments from individual, original-resolution inspection of the final format corpus.
// The binding script verifies every screenshot hash and requires an observation per screenshot.
export const judgments = {
  "01-markdown": {
    "verdict": "pass",
    "perShot": {
      "shell": "Balanced desktop tree, source, and rendered panes are visible together; the first split is no longer compressed and no beta/offline overlay covers content.",
      "primarySurface": "The Welcome heading, explanatory prose, list, and emphasis are crisp, nonblank, and fully contained."
    },
    "defects": []
  },
  "07-sqlite": {
    "verdict": "pass",
    "perShot": {
      "shell": "Table navigation, SQL input, actions, and populated query grid are all visible without overlap in the light desktop shell.",
      "primarySurface": "Albums and artists navigation plus the five-row result table are nonblank and comfortably legible."
    },
    "defects": []
  },
  "13-pdf": {
    "verdict": "pass",
    "perShot": {
      "shell": "A real rendered first page, the start of page two, page count, zoom, layout, and Edit controls are all visible.",
      "primarySurface": "Rendered page canvases contain readable text and vertical continuation rather than blank sheets."
    },
    "defects": []
  },
  "19-archive": {
    "verdict": "pass",
    "perShot": {
      "shell": "The real 7z shell reports four files and 296 bytes, with complete nested paths and individual sizes.",
      "primarySurface": "data/people.csv, docs/guide.txt, README.md, and src/example.js are all present in a clean, nonempty table."
    },
    "defects": []
  },
  "25-font": {
    "verdict": "pass",
    "perShot": {
      "shell": "The font specimen input, size/color controls, large sample, alphabet, symbols, and size ramp form a coherent light page.",
      "primarySurface": "Ubuntu Mono glyphs render distinctly across sizes; the nested font document provides its own scroll path to lower weights and metadata."
    },
    "defects": []
  },
  "31-dicom": {
    "verdict": "pass",
    "perShot": {
      "shell": "DICOM modality, PHI warning, study, patient, equipment, and image fields are clearly grouped in the light shell.",
      "primarySurface": "The structured metadata is readable and explicitly identifies this as computed tomography rather than presenting a blank image.",
      "previewBottom": "The bottom capture reaches dimensions, bit depth, spacing, thickness, and the honest notice that pixel data is not rendered."
    },
    "defects": []
  },
  "37-exe": {
    "verdict": "pass",
    "perShot": {
      "shell": "Raw ELF bytes and the structured executable summary use a balanced light split and intact type controls.",
      "primarySurface": "The styled ELF badge, architecture, width, endian, ABI, headers, and entry point are separated and readable."
    },
    "defects": []
  },
  "43-pem": {
    "verdict": "pass",
    "perShot": {
      "shell": "Certificate source and the ISRG Root X1 summary form a balanced split; the date-window badge is visible alongside explicit signature caveats.",
      "primarySurface": "Subject, issuer, 2015–2035 validity, RSA 4096-bit key, algorithm, serial, and version are legible; Self-issued (signature not verified) and Signature and trust chain are not verified prevent a false trust verdict."
    },
    "defects": []
  },
  "02-csv": {
    "verdict": "pass",
    "perShot": {
      "shell": "Dark desktop split keeps a practical source width while the six-row table and all toolbar actions remain unobscured.",
      "primarySurface": "Headers and five populated data rows are legible with stable column alignment and usable contrast."
    },
    "defects": []
  },
  "08-ipynb": {
    "verdict": "pass",
    "perShot": {
      "shell": "The notebook source and rendered cells form a balanced dark split with saved output and error content visible.",
      "primarySurface": "Markdown, code, tabular output, stdout, and the intentional ZeroDivisionError retain clear notebook hierarchy and contrast."
    },
    "defects": []
  },
  "14-xlsx": {
    "verdict": "pass",
    "perShot": {
      "shell": "The exercised Totals sheet is selected and its populated grid is visible with workbook navigation intact.",
      "primarySurface": "People and Totals tabs remain available and the quarter/value cells are aligned and legible."
    },
    "defects": []
  },
  "20-zip": {
    "verdict": "pass",
    "perShot": {
      "shell": "The dark ZIP tree and four-file listing agree, with selected entry, sizes, packed sizes, and dates visible.",
      "primarySurface": "All actionable archive paths are readable in a structured table without blank names."
    },
    "defects": []
  },
  "26-stl": {
    "verdict": "pass",
    "perShot": {
      "shell": "The dark STL stage centers a visibly faceted eight-triangle solid with all model controls in view.",
      "primarySurface": "The shaded 3D geometry is nonblank, well contrasted, and paired with region, face, group, export, color, and reset controls."
    },
    "defects": []
  },
  "32-netcdf": {
    "verdict": "pass",
    "perShot": {
      "shell": "The repaired NetCDF dark view shows global attributes, dimensions, and variables with strong contrast and no badge overlap.",
      "primarySurface": "The five global attributes, fixed time=3, latitude=4, and longitude=6 dimensions, and five typed variable rows are visually distinguishable.",
      "previewBottom": "The lower table remains readable through temperature and pressure, with their (time, latitude, longitude) shapes and long attributes contained inside stable columns."
    },
    "defects": []
  },
  "38-apk": {
    "verdict": "pass",
    "perShot": {
      "shell": "The dark APK shell shows one manifest, one DEX, arm64-v8a and x86_64 native ABIs, one asset, and five total entries without clipping.",
      "primarySurface": "The aligned inventory explicitly says No recognized signature material (package may be unsigned), avoiding an unsupported signing or trust claim."
    },
    "defects": []
  },
  "44-patch": {
    "verdict": "pass",
    "perShot": {
      "shell": "The dark patch split shows readable source and three selectable, color-coded hunks without corner-overlay interference.",
      "primarySurface": "File headers, include checkboxes, hunk coordinates, removals, and additions retain clear contrast.",
      "previewBottom": "The bottom capture reaches the README hunk and filtered-patch textarea, proving the long preview is scrollable."
    },
    "defects": []
  },
  "03-json": {
    "verdict": "pass",
    "perShot": {
      "shell": "Standalone mobile intake opens directly on the preview rather than under a sidebar, and the Raw/Preview tabs and search controls fit 390 px.",
      "primarySurface": "The expanded JSON hierarchy, paths, scalar colors, and nested arrays are readable without horizontal shell overflow."
    },
    "defects": []
  },
  "09-image": {
    "verdict": "pass",
    "perShot": {
      "shell": "The mobile image toolbar wraps into two usable rows while the flower remains centered and fully visible.",
      "primarySurface": "Decoded raster pixels are colorful, sharp, nonblank, and contained with no overlay obstruction."
    },
    "defects": []
  },
  "15-docx": {
    "verdict": "pass",
    "perShot": {
      "shell": "The mobile Word preview, Edit action, and download action fit without a sidebar or overlay covering the document.",
      "primarySurface": "Heading, paragraph, bold run, and subheading render with clear document spacing and no blank page."
    },
    "defects": []
  },
  "21-epub": {
    "verdict": "pass",
    "perShot": {
      "shell": "Mobile EPUB navigation, 1 of 3 status, title, author, and cover fit without sidebar obstruction.",
      "primarySurface": "The Gift of the Magi cover page is nonblank, legible, and contained at 390 px."
    },
    "defects": []
  },
  "27-gltf": {
    "verdict": "pass",
    "perShot": {
      "shell": "The mobile 3D toolbar wraps cleanly into two rows and the shaded 12-triangle model remains centered.",
      "primarySurface": "Model dimensions, export actions, color, reset, and discernible facets fit the 390 px light viewport without overlap."
    },
    "defects": []
  },
  "33-pdb": {
    "verdict": "pass",
    "perShot": {
      "shell": "The mobile PDB metadata, chain and ligand sections, and representation controls are styled, readable, and vertically reachable.",
      "primarySurface": "Protein identity, statistics, metadata, chains, ligand count, and the start of the 3D controls fit without horizontal overflow.",
      "nestedBottom": "At scrollTop 488 of 488, the loaded 366 by 360 stage visibly frames both polymer chains at useful scale after excluding distant HETATM coordinates from the default camera."
    },
    "defects": []
  },
  "39-torrent": {
    "verdict": "pass",
    "perShot": {
      "shell": "The mobile v1 torrent summary fits the light shell and wraps its exact SHA-1 info hash and magnet link within the viewport.",
      "primarySurface": "The 214-byte total, three file paths and sizes, 64-byte piece size, magnet, and both HTTPS and UDP trackers are complete and selectable."
    },
    "defects": []
  },
  "45-code": {
    "verdict": "pass",
    "perShot": {
      "shell": "The mobile Swift enhancement is nonblank and the repaired Show default view control remains accessible above the Raw/Preview tabs.",
      "primarySurface": "Import and type summaries, statistics, Foundation, Release, Codable, String, and Date landmarks fit cleanly.",
      "base": "The default raw Monaco view now appears after the toggle, with readable Swift source and a reachable horizontal scrollbar instead of a blank body."
    },
    "defects": []
  },
  "04-yaml": {
    "verdict": "pass",
    "perShot": {
      "shell": "The dark enhanced Stack summary and source share a well-sized desktop split with intact controls.",
      "primarySurface": "Resolver, packages, dependencies, settings, and options have clear grouping and strong dark-theme contrast.",
      "base": "The default YAML tree remains nonblank, searchable, and legible after disabling the enhancement."
    },
    "defects": []
  },
  "10-svg": {
    "verdict": "pass",
    "perShot": {
      "shell": "Source, SVG editor preview, dimensions, copy action, and zoom control all remain visible in the dark desktop layout.",
      "primarySurface": "The sanitized vector produces the expected colored shapes and label rather than fallback text or a blank canvas."
    },
    "defects": []
  },
  "16-pptx": {
    "verdict": "pass",
    "perShot": {
      "shell": "The exercised second slide fills the dark presentation stage while navigation and 2 of 2 status remain visible.",
      "primarySurface": "Title, three bullet lines, and blue shape are readable and fully framed as actual slide pixels."
    },
    "defects": []
  },
  "22-comic": {
    "verdict": "pass",
    "perShot": {
      "shell": "Spread mode shows two detailed illustrated pages with panel borders and large lettering; the header reports three pages plus the on-demand, concurrency, URL, and byte caps.",
      "primarySurface": "Pages 01 and 02 are crisp, distinct, fully colored comic layouts with readable OPEN, INSPECT, OFFLINE, COMPARE, LIGHT, and DARK lettering.",
      "nestedBottom": "The nested scroller reaches the separately loaded PAGE 10 artwork, whose THE END and KEEP EXPLORING lettering proves natural page ordering and lower-page rendering."
    },
    "defects": []
  },
  "28-dxf": {
    "verdict": "pass",
    "perShot": {
      "shell": "The repaired dark DXF shell shows high-contrast badges, drawing geometry, section chips, and entity rows without the prior washout.",
      "primarySurface": "Drawing lines, labels, zoom controls, section state, and entity counts are legible on the dark canvas.",
      "previewBottom": "The lower capture reaches all entity types, layers, named block, and header variables with usable dark-theme contrast."
    },
    "defects": []
  },
  "34-fits": {
    "verdict": "pass",
    "perShot": {
      "shell": "The FITS dark shell balances raw cards with the FV-GRADIENT summary and visibly states that image pixels are not decoded or rendered.",
      "primarySurface": "The 64 by 48 dimensions, two axes, 16-bit integer type, FileViewer telescope, DemoCam instrument, observation fields, and 18 header cards are legible."
    },
    "defects": [
      "The fixture contains a valid nonzero 16-bit image plane, but this renderer intentionally exposes only header metadata and does not render astronomy pixels."
    ]
  },
  "40-dockerfile": {
    "verdict": "pass",
    "perShot": {
      "shell": "The enhanced dark Dockerfile split shows source and a complete, high-contrast instruction explanation without corner overlays.",
      "primarySurface": "Twenty instructions and two stages render with distinct directive badges and readable explanations.",
      "previewBottom": "The bottom capture reaches ports, environment, user, healthcheck, and command instructions, proving full vertical access.",
      "base": "The default overview remains meaningful with stages, images, ports, variables, labels, and RUN commands, despite compact label/value spacing."
    },
    "defects": [
      "The optional default Dockerfile overview still concatenates several labels and values, such as Stages2, Base imagenode:20-alpine, and maintainerdemo@example.com."
    ]
  },
  "05-xml": {
    "verdict": "pass",
    "perShot": {
      "shell": "The Ant enhancement and XML source use a balanced desktop split; the project and target cards are not clipped.",
      "primarySurface": "MyApp metadata and all five target rows are visually distinct and readable.",
      "base": "The default XML tree exposes attributes, nested targets, and source landmarks with usable indentation."
    },
    "defects": []
  },
  "11-tiff": {
    "verdict": "pass",
    "perShot": {
      "shell": "The TIFF flower is decoded and centered beneath a complete light-theme image toolbar.",
      "primarySurface": "The pixel-bearing preview is colorful, sharp, nonblank, and fully contained."
    },
    "defects": []
  },
  "17-odf": {
    "verdict": "pass",
    "perShot": {
      "shell": "The OpenDocument page is centered in the light shell with the selected file state intact.",
      "primarySurface": "Title, explanatory paragraph, two-item list, and closing line are crisp and unclipped."
    },
    "defects": []
  },
  "23-media": {
    "verdict": "pass",
    "perShot": {
      "shell": "The final light shell shows a decoded video frame, native controls, workspace tabs, and matching 0:00 / 0:01 duration after the metadata-race repair.",
      "primarySurface": "A real 320 by 180 animal frame is visible; native and workspace duration readouts agree and no beta badge covers Compare.",
      "previewBottom": "The scrolled view exposes Download, speed presets, picture-in-picture, and frame-step controls, proving lower actions are reachable."
    },
    "defects": []
  },
  "29-geojson": {
    "verdict": "pass",
    "perShot": {
      "shell": "The repaired TopoJSON enhancement has styled badges, stat cards, and object chips beside a balanced source pane.",
      "primarySurface": "TopoJSON identity, three geometries, two objects, districts, and transit are separated into a clear nonblank hierarchy."
    },
    "defects": []
  },
  "35-wasm": {
    "verdict": "pass",
    "perShot": {
      "shell": "The light WebAssembly summary has clear module, section, import, export, and size groupings.",
      "primarySurface": "Version, four sections, no-import state, exported add function, and summary values are nonblank and readable."
    },
    "defects": []
  },
  "41-docker-compose": {
    "verdict": "pass",
    "perShot": {
      "shell": "The light enhanced Compose split presents source and structured service cards without badge or secret-text overlap.",
      "primarySurface": "Web, API, database, and cache configuration, ports, dependencies, masked secrets, and hints are readable.",
      "previewBottom": "The lower capture reaches all ten review findings and the Source disclosure with no obstruction.",
      "base": "The default overview shows all four services, host ports, images, volumes, and dependency arrows in coherent cards."
    },
    "defects": [
      "The optional default Compose overview still joins a few summary labels and values, notably Services4 and Compose version3.9."
    ]
  },
  "06-jsonl": {
    "verdict": "pass",
    "perShot": {
      "shell": "The new mobile record-card layout fits the dark 390 px shell with no standalone sidebar or right-edge table loss.",
      "primarySurface": "Record totals plus timestamp, level, service, and message fields wrap cleanly across the meaningful log entries."
    },
    "defects": []
  },
  "12-layered": {
    "verdict": "pass",
    "perShot": {
      "shell": "The repaired PSD view composites the white, green, and red layers on the main checkerboard stage and exposes all layer toggles.",
      "primarySurface": "The composite and three layer rows are meaningful and usable on mobile; only the trailing dimension readout is hidden by the Layers pane."
    },
    "defects": [
      "At 390 px, the 100 by 100 dimension/status readout is clipped where the fixed Layers pane begins, although the fit/zoom controls and composite remain usable."
    ]
  },
  "18-rtf": {
    "verdict": "pass",
    "perShot": {
      "shell": "The mobile dark WYSIWYG toolbar wraps into usable rows and the formatted paper remains readable beneath it.",
      "primarySurface": "Headings, bold and italic spans, accented text, and long prose keep coherent typography and contrast.",
      "previewBottom": "The bottom capture reaches the longer passage, author credit, and support note, proving the document can be scrolled end to end; the sticky toolbar state is also represented."
    },
    "defects": []
  },
  "24-midi": {
    "verdict": "pass",
    "perShot": {
      "shell": "The corrected dark mobile cards fit 390 px; the Instruments used label wraps only at the word boundary and stays separate from the program value.",
      "primarySurface": "Type 1, three tracks, 480 PPQN, 120 BPM, 8.00-second duration, 48 notes, and the conductor and piano rows remain readable without horizontal overlap.",
      "previewBottom": "The bottom capture reaches all three track cards and cleanly shows Acoustic Grand Piano (ch 1), Acoustic Bass (ch 2), and their 32/16 note counts."
    },
    "defects": []
  },
  "30-kml": {
    "verdict": "pass",
    "perShot": {
      "shell": "The repaired mobile KML view fits the title, description, statistic cards, and full placemark table inside 390 px.",
      "primarySurface": "All five geometry rows and wrapped descriptions are legible in dark mode with no lost right-hand column."
    },
    "defects": []
  },
  "36-npy": {
    "verdict": "pass",
    "perShot": {
      "shell": "The repaired dark NumPy cards, array metadata, and 12-value grid fit the mobile viewport with strong contrast.",
      "primarySurface": "Shape, dtype, version, order, size, and every float value are legible without the former white-on-white metadata."
    },
    "defects": []
  },
  "42-sarif": {
    "verdict": "pass",
    "perShot": {
      "shell": "The dark SARIF shell exposes overview counts, filters, pagination, and labeled severity cards without fixed badges or right-edge clipping.",
      "primarySurface": "All severity chips and the first findings cards are readable at 390 px; level, rule, wrapped message, and location remain visible without horizontal scrolling.",
      "previewBottom": "The lower capture reaches additional labeled findings with consistent red, amber, and blue contrast while pagination stays visible above the cards."
    },
    "defects": []
  }
};
