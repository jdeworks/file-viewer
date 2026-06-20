export default {
  id: 'airflow-cfg',
  label: 'Apache Airflow config',
  match(intake, baseType) {
    if (baseType?.id !== 'ini') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return n === 'airflow.cfg';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Apache Airflow configuration file — defines executor, DAG folder, parallelism, database, webserver, and scheduler settings.',
    usedFor: [{ label: 'Apache Airflow', description: 'Open-source workflow orchestration platform for data pipelines and task scheduling.', href: 'https://airflow.apache.org/docs/apache-airflow/stable/howto/set-config.html' }],
  },
};
