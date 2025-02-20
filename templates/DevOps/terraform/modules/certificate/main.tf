terraform {
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "2.32.0"
    }
  }
}

resource "digitalocean_certificate" "cert" {
  name    = "${var.app_name}-cert"
  type    = "lets_encrypt"
  domains = var.domains
}