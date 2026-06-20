job "web-api" {
  type        = "service"
  datacenters = ["dc1", "dc2"]

  group "api" {
    count = 3

    network {
      port "http" {
        to = 8080
      }
    }

    task "server" {
      driver = "docker"

      config {
        image = "myorg/web-api:latest"
        ports = ["http"]
      }

      resources {
        cpu    = 500
        memory = 256
      }

      service {
        name = "web-api"
        port = "http"

        check {
          type     = "http"
          path     = "/healthz"
          interval = "10s"
          timeout  = "2s"
        }
      }

      service {
        name = "web-api-health"
        port = "http"

        check {
          type     = "http"
          path     = "/ready"
          interval = "15s"
          timeout  = "3s"
        }
      }
    }

    task "postgres-sidecar" {
      driver = "docker"

      config {
        image = "postgres:15-alpine"
      }

      resources {
        cpu    = 200
        memory = 128
      }

      env {
        POSTGRES_USER     = "api"
        POSTGRES_DB       = "webapi"
        POSTGRES_PASSWORD = "changeme"
      }
    }
  }

  group "worker" {
    count = 2

    task "job-processor" {
      driver = "exec"

      config {
        command = "/usr/local/bin/worker"
        args    = ["--queue", "default"]
      }

      resources {
        cpu    = 500
        memory = 256
      }
    }
  }
}
