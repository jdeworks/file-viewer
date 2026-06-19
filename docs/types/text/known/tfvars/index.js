export default {
  id: 'tfvars',
  label: 'Terraform variables (.tfvars)',
  match: (intake) => {
    const name = (intake.filename || '').split('/').pop();
    return /\.tfvars$/.test(name);
  },
  loadRenderer: () => import('./renderer.js'),
  about: { description: 'Terraform .tfvars file — variable assignments for Terraform configurations.' },
};
