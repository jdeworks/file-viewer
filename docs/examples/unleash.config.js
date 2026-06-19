import { initialize } from 'unleash-client';

const unleash = initialize({
  url: 'https://unleash.example.com/api',
  appName: 'my-application',
  environment: process.env.NODE_ENV || 'production',
  instanceId: process.env.UNLEASH_INSTANCE_ID,
  customHeaders: {
    Authorization: process.env.UNLEASH_API_TOKEN,
  },
  refreshInterval: 15000,
  metricsInterval: 60000,
  strategies: [],
  bootstrap: {
    data: [],
  },
});

export default unleash;
