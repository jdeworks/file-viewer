// sample.jsonnet — a Jsonnet template for a web service configuration
local utils = import 'utils.libsonnet';

local defaultPort = 8080;
local defaultReplicas = 3;

local makeService = function(name, port, replicas) {
  name: name,
  port: port,
  replicas: replicas,
  labels: { app: name, version: 'v1' },
  resources: utils.resourceLimits(replicas),
};

local env = std.extVar('env');

{
  services: [
    makeService('api', defaultPort, defaultReplicas),
    makeService('worker', 9000, if env == 'prod' then 5 else 1),
    makeService('metrics', 9090, 1),
  ],
  config: {
    logLevel: if env == 'prod' then 'warn' else 'debug',
    tracing: env == 'prod',
    version: std.extVar('version'),
  },
}
