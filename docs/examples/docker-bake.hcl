group "default" {
  targets = ["api", "worker", "frontend"]
}

target "base" {
  context = "."
  dockerfile = "Dockerfile"
  cache-from = ["type=registry,ref=registry.example.com/myapp/cache"]
  cache-to = ["type=registry,ref=registry.example.com/myapp/cache,mode=max"]
}

target "api" {
  inherits = ["base"]
  target = "api"
  tags = [
    "registry.example.com/myapp/api:latest",
    "registry.example.com/myapp/api:1.2.0"
  ]
  platforms = ["linux/amd64", "linux/arm64"]
}

target "worker" {
  inherits = ["base"]
  target = "worker"
  tags = [
    "registry.example.com/myapp/worker:latest",
    "registry.example.com/myapp/worker:1.2.0"
  ]
  platforms = ["linux/amd64", "linux/arm64"]
}

target "frontend" {
  context = "./frontend"
  dockerfile = "Dockerfile.prod"
  tags = [
    "registry.example.com/myapp/frontend:latest"
  ]
  platforms = ["linux/amd64"]
}
