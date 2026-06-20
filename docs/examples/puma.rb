# Puma configuration file
# See: https://puma.io/puma/Puma/DSL.html

workers Integer(ENV.fetch('WEB_CONCURRENCY', 2))
threads 2, 16

environment ENV.fetch('RACK_ENV', 'production')

port ENV.fetch('PORT', 3000)

pidfile ENV.fetch('PIDFILE', 'tmp/pids/server.pid')
state_path ENV.fetch('STATEFILE', 'tmp/pids/puma.state')

# Load app before forking workers for fast boot and COW
preload_app!

on_worker_boot do
  # Re-establish ActiveRecord connections after fork
  ActiveRecord::Base.establish_connection if defined?(ActiveRecord)
end

plugin :tmp_restart
plugin :telemetry
