// Shared "editor mode" for Monaco-backed code types: makes the raw Monaco view explicitly
// editable (readOnly → false) and wires Ctrl+S → download of the edited text with the filename
// preserved. This is additive — the read view and the Download button stay intact; editor mode
// only flips the editability flag and binds the save shortcut.
//
// rawpane.js already mounts an editable Monaco for every non-binary text type and binds a global
// Ctrl+S → downloadCurrent. This module centralises that contract for the code-oriented types so
// the behaviour is declared in one place (discoverable, and resilient if the global default ever
// changes) rather than relying on an implicit side effect. To enable editor mode for a new
// Monaco type, add its id to EDITOR_MODE_TYPES.

// Type ids that opt into explicit editor mode. These are plain code/text surfaces (no structured
// form/table editor of their own) that benefit from an editable Monaco + Ctrl+S download.
export const EDITOR_MODE_TYPES = new Set(['code', 'dockerfile', 'dxf', 'gcode']);

export function isEditorModeType(typeId) {
  return EDITOR_MODE_TYPES.has(typeId);
}

// Apply editor mode to a freshly-built rawview. Idempotent and safe to call unconditionally:
// it no-ops for binary intakes, for types not in EDITOR_MODE_TYPES, or when no rawview exists.
//  - rawview: the createRawView() controller (has updateOptions + addCommand).
//  - type:    the active type descriptor (uses type.id).
//  - isBinary: skip when the intake is binary (hex dump is read-only).
//  - onSave:  the download handler (Ctrl+S target), typically rawpane.downloadCurrent.
export function applyEditorMode(rawview, type, { isBinary, onSave } = {}) {
  if (!rawview || isBinary || !isEditorModeType(type?.id)) return false;
  rawview.updateOptions?.({ readOnly: false });
  if (typeof onSave === 'function') rawview.addCommand?.('ctrl+s', onSave);
  return true;
}
