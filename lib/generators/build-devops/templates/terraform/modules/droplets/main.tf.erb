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

resource "digitalocean_droplet" "node" {
  for_each   = var.nodes
  name       = "${var.app_name}-${each.key}-droplet"
  image      = each.value.image
  size       = each.value.size
  region     = each.value.region
  ssh_keys   = [var.ssh_fingerprint]
}