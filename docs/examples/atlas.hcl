variable "db_url" {
  type    = string
  default = "postgres://localhost:5432/appdb?sslmode=disable"
}

variable "dev_url" {
  type    = string
  default = "docker://postgres/16/dev"
}

env "local" {
  src = "file://schema.hcl"
  url = "postgres://atlas_user:devpassword@localhost:5432/appdb?sslmode=disable"
  dev = "docker://postgres/16/dev"
  migration_dir = "file://migrations"
}

env "staging" {
  src = "file://schema.hcl"
  url = "postgres://atlas_user:stgpassword@db-staging.example.com:5432/appdb"
  dev = "docker://postgres/16/dev"
  migration_dir = "file://migrations"
}

env "production" {
  src   = "file://schema.hcl"
  url   = var.db_url
  dev   = var.dev_url
  migration_dir = "file://migrations"
}

data "hcl_schema" "app" {
  path = "schema/"
  vars = {
    tenant_id = var.tenant_id
  }
}
