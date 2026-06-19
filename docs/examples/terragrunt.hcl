# Terragrunt configuration for the API service module
terraform {
  source = "git::https://github.com/acme/terraform-modules.git//modules/api-service?ref=v2.1.0"
}

include "root" {
  path = find_in_parent_folders()
}

include "env" {
  path = "${get_terragrunt_dir()}/../env.hcl"
}

dependency "vpc" {
  config_path = "../vpc"
}

dependency "database" {
  config_path = "../database"
}

remote_state {
  backend = "s3"
  config {
    bucket         = "acme-terraform-state"
    key            = "${path_relative_to_include()}/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}

inputs = {
  environment    = "production"
  instance_type  = "t3.medium"
  min_capacity   = 2
  max_capacity   = 10
  enable_logging = true
  tags = {
    Team    = "platform"
    Project = "api-service"
  }
}
