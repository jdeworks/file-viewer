const { join } = require('path');

exports.config = {
  runner: 'local',
  hostname: 'localhost',
  port: 4444,

  specs: [
    './test/specs/**/*.spec.js',
    './test/e2e/**/*.test.js',
  ],
  exclude: [],

  maxInstances: 4,

  capabilities: [{
    maxInstances: 2,
    browserName: 'chrome',
    'goog:chromeOptions': {
      args: ['--headless', '--disable-gpu', '--no-sandbox'],
    },
    acceptInsecureCerts: true,
  }, {
    maxInstances: 1,
    browserName: 'firefox',
    'moz:firefoxOptions': {
      args: ['-headless'],
    },
  }],

  logLevel: 'info',

  baseUrl: 'http://localhost:3000',

  waitforTimeout: 10000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,

  framework: 'mocha',

  reporters: ['spec', 'allure'],

  mochaOpts: {
    ui: 'bdd',
    timeout: 60000,
    require: ['@babel/register'],
  },

  services: ['chromedriver', 'firefox-profile'],

  before() {
    require('./test/helpers/setup');
  },

  afterTest(test, context, { error, result, duration, passed }) {
    if (!passed) {
      browser.takeScreenshot();
    }
  },
};
