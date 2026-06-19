# KiCad EDA File

> KiCad schematic and PCB inspector — component count, net count, footprints, design rules, and board dimensions.

## Format Details

| Field | Value |
|-------|-------|
| Extension(s) | `.kicad_sch`, `.kicad_pcb`, `.kicad_mod`, `.kicad_sym`, `.sch`, `.brd` |
| MIME type | `text/plain` |
| Binary / Text | Text (S-expression) |
| Common use | Electronic schematics, PCB layouts, component libraries |

## Capabilities Matrix

### View
| Capability | Status | Notes |
|------------|--------|-------|
| File type detection | ✅ | Schematic / PCB / module / symbol detected from header |
| Component count | ✅ | Symbols (schematic) or footprints (PCB) counted |
| Net count | ✅ | Named nets extracted from schematic |
| Board dimensions | ✅ | Board outline bounding box from PCB files |
| Layer usage | ✅ | Active copper and silkscreen layers listed |
| Title block | ✅ | Project title, revision, author from `title_block` |
| Source view | ✅ | Monaco editor (plaintext mode) |
| Text diff | ✅ | Standard line diff |
| Metadata | ✅ | File type, component count, net count, dimensions |

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
- Legacy KiCad 4 (`.sch`/`.brd`) format parsing may be limited

## Gap Analysis

| Feature | Priority | Difficulty | Notes |
|---------|----------|------------|-------|
| Schematic SVG rendering | Med | Hard | Parse symbols and wires; draw on SVG |
| Bill of Materials export | Med | Med | Extract component references and values as CSV |
| PCB layer view | Low | Hard | Render copper layers on canvas |
