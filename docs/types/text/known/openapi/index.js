// OpenAPI / Swagger spec enhancement (.yaml or .json): show the API title/version and a grouped
// list of its endpoints (METHOD + path + summary). Matches by filename OR an `openapi:`/`swagger:`
// key in the content, so a spec named anything still gets the enhanced view.
const looksLikeSpec = (intake) => /(^|\/)(openapi|swagger)\.(ya?ml|json)$/i.test(intake.filename || '')
  || /(^|\n)\s*["']?(openapi|swagger)["']?\s*:/.test(intake.textSample || '');

export default {
  id: 'openapi',
  label: 'OpenAPI / Swagger',
  match: (intake, baseType) => (baseType.id === 'yaml' || baseType.id === 'json') && looksLikeSpec(intake),
  loadRenderer: () => import('./render.js'),
};
