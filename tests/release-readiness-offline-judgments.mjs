// Human judgments from original-resolution inspection of the final offline-modal captures.
export const offlineModalJudgments = {
  'phone-light-top': 'Phone light top state keeps the title, close control, preset buttons, total, bundle rows, scrollbar, and sticky save footer visible without horizontal clipping.',
  'phone-light-bottom': 'Phone light bottom state exposes the final bundle groups and selected total while preserving the header, presets, internal scrollbar, and save action.',
  'phone-dark-top': 'Phone dark top state preserves readable contrast and the complete control hierarchy, with selected and heavy states visually distinct.',
  'phone-dark-bottom': 'Phone dark bottom state keeps the final groups, internal scroll position, total, and save action readable without overlap.',
  'tablet-light-top': 'Tablet light top modal fits all preset controls and provides a clearly bounded scroll region above the sticky footer.',
  'tablet-light-bottom': 'Tablet light bottom state exposes every final bundle group with the footer and save action still visible and unobscured.',
  'tablet-dark-top': 'Tablet dark top state retains strong text and control contrast, clear selection states, and a visible internal scrollbar.',
  'tablet-dark-bottom': 'Tablet dark bottom state preserves group labels, sizes, heavy badges, scroll affordance, and footer contrast.',
  'desktop-light-top': 'Desktop light top modal is compact, with the toolbar, total, bundle list, scrollbar, and footer aligned without overflow.',
  'desktop-light-bottom': 'Desktop light bottom state shows the end of the bundle list and sticky footer while the modal bounds remain clean.',
  'desktop-dark-top': 'Desktop dark top state keeps all controls, rows, badges, and scrollbar legible at the intended modal width.',
  'desktop-dark-bottom': 'Desktop dark bottom state keeps the final groups and save footer readable with no clipping, overlap, or compositor artifacts.',
};
