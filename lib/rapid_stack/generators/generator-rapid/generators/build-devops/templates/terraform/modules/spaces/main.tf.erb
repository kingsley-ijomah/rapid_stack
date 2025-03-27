terraform {
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "2.32.0"
    }
  }
}

provider "digitalocean" {
  token = var.do_token
  spaces_access_id  = var.spaces_access_id
  spaces_secret_key = var.spaces_secret_key
}

resource "digitalocean_spaces_bucket" "frontend_site" {
  name   = "${var.app_name}-frontend-site-assets"
  region = var.do_region
  acl    = "public-read"
  versioning {
    enabled = true
  }
}

# Bucket policies
resource "digitalocean_spaces_bucket_policy" "frontend_site" {
  region = digitalocean_spaces_bucket.frontend_site.region
  bucket = digitalocean_spaces_bucket.frontend_site.name
  policy = jsonencode({
    "Version" : "2012-10-17",
    "Statement" : [
      {
        "Sid" : "PublicReadGetObject",
        "Effect" : "Allow",
        "Principal" : "*",
        "Action" : [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ],
        "Resource" : ["arn:aws:s3:::${digitalocean_spaces_bucket.frontend_site.name}/*"]
      }
    ]
  })
}