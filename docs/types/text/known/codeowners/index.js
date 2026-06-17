// CODEOWNERS enhancement (GitHub/GitLab): each rule maps a path pattern to its owners. We list
// the rules and link @user / @org/team owners to their profile/team page. Email owners are shown.
export default {
  id: 'codeowners',
  label: 'CODEOWNERS',
  match: (intake) => /(^|\/)(\.github\/|\.gitlab\/|docs\/)?CODEOWNERS$/i.test(intake.filename || ''),
  loadRenderer: () => import('./render.js'),
  loadMetadata: () => import('./metadata.js'),
};
