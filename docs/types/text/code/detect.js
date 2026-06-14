import { isCode } from './langmap.js';

// Source code: matched by extension/filename. Scores below dedicated types (md/csv/json)
// so those win, but above the raw fallback. Never executes — it's a syntax-only raw view.
export function detect(intake) {
  if (intake.isBinary) return 0;
  return isCode(intake) ? 0.8 : 0;
}
