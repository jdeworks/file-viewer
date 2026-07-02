# KiCad EDA File

> KiCad schematic, PCB, project, footprint, and symbol-library inspector — component counts, nets, layers, title block, and library contents.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.kicad_sch`, `.kicad_pcb`, `.kicad_pro`, `.kicad_mod`, `.kicad_sym`, `.kicad_wks`, `.kicad_dru`, `.kicad_prl` |
| MIME type | `text/plain` |
| Binary / Text | Text (S-expression) |
| Common use | Electronic schematics, PCB layouts, component libraries |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| File type detection | ✅ | Schematic / PCB / module / symbol detected from header |
| Component count | ✅ | Symbols (schematic) or footprints (PCB) counted |
| Net count | ✅ | PCB nets and schematic labels counted |
| Board dimensions | ❌ | Board outline bounding box is not computed yet |
| Layer usage | ✅ | Active copper and silkscreen layers listed |
| Title block | ✅ | Project title, revision, author from `title_block` |
| Project files | ✅ | `.kicad_pro` summary shows board/schematic presence |
| Library contents | ✅ | Symbol/footprint names shown as chips |
| Source view | ✅ | Monaco editor (plaintext mode) |
| Text diff | ✅ | Standard line diff |
| Metadata | ⚠️ | Side panel reports format, KiCad version, title, and company when present |

### Edit
| Capability | Status | Notes |
|------------|--------|-------|
| Source editing | ✅ | Full Monaco editor |
| Save (Companion) | ✅ | Write-back to local file |

### Export
| Capability | Status | Notes |
|------------|--------|-------|
| Download original | ✅ | Always available |

## Known Limitations

- Schematic and PCB graphics are not rendered — text inspection only
- Legacy KiCad 4 (`.sch`/`.brd`) files are not registered by this type
- S-expression parsing is capped for preview responsiveness

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Schematic SVG rendering | Med | Hard | Parse symbols and wires; draw on SVG |
| Bill of Materials export | Med | Med | Extract component references and values as CSV |
| PCB layer view | Low | Hard | Render copper layers on canvas |
| Board dimensions | Low | Med | Compute PCB outline bounding box from edge cuts |
