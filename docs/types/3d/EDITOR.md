# Editor Roadmap — 3D Models (GLTF/GLB · OBJ · STL · PLY · 3MF)

## Current state

STL, OBJ, PLY, and GLTF/GLB share `docs/core/meshview.js`: a dependency-free canvas renderer using the painter's algorithm with flat shading, orthographic projection, and mouse/touch orbit. 3MF currently uses its own structured package preview. The mesh toolbar already has:

- Global mesh color override (color picker)
- **Select-mode toggle (Region / Face / Group)** in the toolbar — controls what a click selects
  to color (touch-friendly buttons, not modifier keys):
  - **Region** (default) — flood-fills from the clicked triangle to the connected *coplanar* set
    (a flat cube side = its 2 fan-triangles), so a plain ungrouped cube can have its sides colored
    individually. Adjacency = welded-vertex edge map, built once and cached on the model
    (`docs/core/meshview-faces.js`).
  - **Face** — colors just the one clicked triangle.
  - **Group** — colors the whole OBJ/material group (the original behaviour).
- Per-face / per-region / per-group color picker (click a face, popover shows
  "Region (k faces)" / "Face #N" / group id; ✕ clears that selection)
- Reset all colors button (clears group **and** per-face colors)
- Color precedence: `faceColors[triIdx]` → `groupColors[groupIdx]` → global override → tri color → default
- **Colored OBJ export** promotes per-face/region colors into synthetic deduped materials
  (`newmtl fv_face_<rgb>` / `usemtl`) without clobbering real OBJ-derived group materials; PLY
  export already carries the resolved per-triangle color. (Benefits STL/PLY/GLTF too — all share
  meshview.)
- Download as PLY (with applied colors) via meshview.js inline export
- Download as OBJ + MTL (with applied colors) via meshview.js inline export
- Format conversion via `docs/core/mesh-export.js`: STL/OBJ/PLY round-trip for any mesh type

GLTF/GLB additionally: parses PBR `baseColorFactor` materials, scene node hierarchy with TRS transforms, and reports animationCount (animations parsed from asset metadata only — not played). 3MF is a separate non-mesh renderer: ZIP-based, shows thumbnail, objects table, and base materials with color swatches. No canvas 3D render for 3MF.

The renderer returns `{ parentNode }` (meshview host div). No Three.js — renderer is fully self-contained canvas 2D.

---

## Viewer enhancements (no write-back needed)

- **Wireframe overlay toggle** — add a button that draws triangle edges with `ctx.stroke()` after the fill pass, using a thin semi-transparent line; toggleable on/off — S

- **Face normals visualisation** — button to draw short line segments from each triangle centroid in the direction of its normal vector; useful for diagnosing inverted faces — S

- **Model stats panel** — collapsible side panel showing vertex count, face count, material/group count, and bounding-box dimensions (already in the info string, promote to structured UI) — S

- **Measurement tool (two-click distance)** — click two points on the mesh surface; unproject the 2D canvas click to the nearest triangle vertex using the stored `_lastFaces` projected coords, then compute 3D Euclidean distance and display it in model units — M

- **Zoom with scroll wheel / pinch** — currently the view is fixed-scale; add a `wheel` listener adjusting a `zoomFactor` multiplier on `scaleFit()`; touch pinch via `pointermove` distance delta — S

- **Bounding-box axes indicator** — small fixed-position XYZ axis widget in the corner that rotates with the model, drawn on a secondary small canvas overlay — S

- **GLTF animation playback** — gltflib.js already records `animationCount`; extend the parser to read `animations[].channels` and `samplers`, build a keyframe table, then add a play/pause button + scrub slider that lerps TRS transforms per frame and calls `draw()` on each `requestAnimationFrame` tick — L

- **UV / texture preview (GLTF)** — extract TEXCOORD_0 accessor and, for GLB with embedded images, decode the image bytes to a canvas `ImageBitmap`; map UV coords to a flat 2D triangulated UV layout displayed beside the 3D view — L

- **3MF interactive 3D render** — currently 3MF shows only a metadata card; parse triangle geometry from the `<mesh>/<vertices>/<triangles>` elements in `3D/3dmodel.model` and hand the resulting `tris` array to `mountMeshView()` the same way STL/OBJ do — M (key dependency: DOMParser already available; geometry extraction is straightforward XML traversal)

- **3MF print settings panel** — surface the `<metadata>` elements beyond Title/Designer (e.g. `CreationDate`, `Description`, `Copyright`, plus slicer-specific extension namespaces) in a structured table alongside the existing objects/materials view — S

---

## In-browser editing (download-on-save)

- **Section plane / cross-section** — add a draggable slider that sets a clip depth; in `draw()` skip any face whose projected centroid depth is below the threshold; renders a real-time cross-section without modifying geometry — M

- **Mesh simplification** — load `simplify-3d` or port Sven Forstmann's quadric-error-metrics algorithm (MIT, ~200 lines JS); add a "Simplify" button + ratio slider; rebuilds `model.tris` and re-renders; download result as OBJ/STL/PLY — L (key lib: `simplify-3d` npm package, or inline QEM port)

- **Export format conversion** — already partially present (OBJ+MTL and PLY downloads exist); complete the matrix by adding STL ASCII export for PLY/OBJ/GLTF inputs; `mesh-export.js` already has `toStl()`, `toObj()`, `toPly()` — just wire the buttons per format — S

- **GLTF → GLB packaging** — serialize the parsed mesh + materials back to a binary GLB container (12-byte header + JSON chunk + BIN chunk) without external libs; download as `.glb` — M

- **OBJ → GLB conversion** — parse OBJ+MTL, build a minimal GLTF JSON with a single mesh primitive, embed vertex/index buffers as base64 data URIs in the JSON chunk, download as `.glb` — M

- **Material property editor (GLTF PBR)** — for each group/material already exposed via the group-color picker, extend the popover to also edit metallic factor (0–1 slider) and roughness factor (0–1 slider); store overrides in a parallel map and encode them into a minimal GLTF JSON on export — M

- **Texture swap (GLTF)** — add a "Swap texture" file input per material group; replace the embedded base64 image bytes in the GLB BIN chunk with the new image bytes; re-encode and download the modified GLB — L

---

## Full write-back editing (companion required)

- **Save colored mesh in-place** — write the current PLY/OBJ with applied group colors back to the original file path via the Tauri/Axum companion write-back endpoint

- **Vertex editing** — drag individual vertices in 3D (requires unprojecting screen coords to 3D ray + nearest vertex hit test); save modified geometry back to source file

- **Non-destructive section-plane export** — clip geometry permanently at the section plane and save the resulting half-mesh back to disk

- **Watch for external edits** — companion file-watch endpoint; reload the mesh automatically when the source file changes (useful when editing in Blender/FreeCAD alongside)

---

## Shared toolbar / modular note

The meshview toolbar is built inline in `mountMeshView()`. As features grow, extract toolbar construction to a helper function (`buildMeshToolbar(host, model, callbacks)`) so per-format renderers can inject format-specific buttons (e.g. 3MF print settings, GLTF animation controls) without touching the shared draw loop. Keep the core `draw()` pure (no DOM side-effects) so the animation loop and the section-plane filter can both call it safely.
