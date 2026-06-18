terraform {
  required_version = ">= 1.6.0"
}

variable "environment" {
  type    = string
  default = "preview"
}

locals {
  tags = {
    app         = "file-viewer"
    environment = var.environment
  }
}

resource "aws_s3_bucket" "previews" {
  bucket = "file-viewer-${var.environment}-previews"
  tags   = local.tags
}

output "preview_bucket" {
  value = aws_s3_bucket.previews.id
}
