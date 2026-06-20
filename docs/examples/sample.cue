// sample.cue — CUE schema for a web service configuration
package webservice

import (
	"strings"
	"net"
)

// #Service defines the schema for a single service.
#Service: {
	name:     string & strings.MinRunes(1)
	port:     int & >=1024 & <=65535
	replicas: int & >=1 & <=20
	image:    string
	labels:   [string]: string
}

// #Config is the top-level configuration schema.
#Config: {
	services: [string]: #Service
	logLevel: "debug" | "info" | "warn" | "error"
	tracing:  bool
	version:  string
	listenAddr: net.IP
}

// A concrete configuration that must satisfy #Config.
config: #Config & {
	services: {
		api: {
			name:     "api"
			port:     8080
			replicas: 3
			image:    "example/api:latest"
			labels: { app: "api", tier: "backend" }
		}
		worker: {
			name:     "worker"
			port:     9000
			replicas: 1
			image:    "example/worker:latest"
			labels: { app: "worker", tier: "backend" }
		}
	}
	logLevel:   "info"
	tracing:    false
	version:    "1.2.0"
	listenAddr: "0.0.0.0"
}
