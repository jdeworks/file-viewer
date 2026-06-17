export function detect(intake) {
  if (intake.isBinary) return 0;
  const n = intake.filename || '';
  if (/(?:^|\.)(?:gitignore|dockerignore|npmignore|eslintignore|prettierignore|hgignore)$/.test(n)) return 0.95;
  return 0;
}
