terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  type        = string
  default     = "us-east-1"
  description = "AWS region to deploy resources into"
}

variable "environment" {
  type        = string
  description = "Deployment environment (e.g. dev, staging, prod)"
}

variable "bucket_name" {
  type        = string
  default     = "my-app-assets"
  description = "Base name for the S3 bucket"
}

resource "aws_s3_bucket" "assets" {
  bucket = "${var.bucket_name}-${var.environment}"

  tags = {
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

resource "aws_s3_bucket_versioning" "assets" {
  bucket = aws_s3_bucket.assets.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_instance" "web" {
  ami           = "ami-0c02fb55956c7d316"
  instance_type = "t3.micro"

  tags = {
    Name        = "web-${var.environment}"
    Environment = var.environment
  }
}

output "bucket_id" {
  value       = aws_s3_bucket.assets.id
  description = "The ID of the created S3 bucket"
}

output "instance_public_ip" {
  value       = aws_instance.web.public_ip
  description = "Public IP address of the web instance"
}
