project = "my-platform"

variable "registry_url" {
  type    = "string"
  default = "registry.example.com"
}

variable "namespace" {
  type    = "string"
  default = "production"
}

app "api-server" {
  build {
    use "docker" {
      dockerfile = "Dockerfile"
    }

    registry {
      use "docker" {
        image = "${var.registry_url}/my-platform/api-server"
        tag   = "latest"
      }
    }
  }

  deploy {
    use "kubernetes" {
      namespace       = var.namespace
      service_account = "api-server"

      probe_path = "/healthz"

      resources {
        cpu    = "250m"
        memory = "256Mi"
      }
    }
  }

  release {
    use "kubernetes" {
      load_balancer = true
      port          = 80
    }
  }

  url {
    managed = true
  }
}

app "worker" {
  build {
    use "pack" {
      builder = "heroku/buildpacks:20"
    }

    registry {
      use "docker" {
        image = "${var.registry_url}/my-platform/worker"
        tag   = "latest"
      }
    }
  }

  deploy {
    use "nomad" {
      datacenter = "dc1"
      count      = 2

      resources {
        cpu    = 500
        memory = 512
      }
    }
  }

  release {
    use "nomad" {}
  }

  url {
    managed = false
  }
}
