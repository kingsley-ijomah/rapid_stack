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
}

resource "digitalocean_loadbalancer" "app_lb" {
  name   = "${var.app_name}-lb"
  region = "${var.do_region}"
  droplet_ids = var.droplet_ids

  forwarding_rule {
    entry_port     = 80
    entry_protocol = "http"

    target_port     = 80
    target_protocol = "http"
  }

  forwarding_rule {
    entry_port     = 443
    entry_protocol = "https"
    target_port     = 80
    target_protocol = "http"
    certificate_name = var.certificate_name
  }

  redirect_http_to_https = true

  healthcheck {
    port     = 80
    protocol = "tcp"
  }
} 