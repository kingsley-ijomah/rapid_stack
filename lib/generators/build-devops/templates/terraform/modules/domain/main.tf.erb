terraform {
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "2.32.0"
    }
  }
}

locals {
  # Filter out www. domains and get only root domains
  root_domains = toset([
    for domain in var.domains : 
    replace(domain, "www.", "") 
    if !startswith(domain, "www.")
  ])
}

resource "digitalocean_domain" "domain" {
  for_each = local.root_domains
  name     = each.value
}

# Add A record pointing to the load balancer
resource "digitalocean_record" "a_record" {
  for_each = local.root_domains
  domain   = each.value
  type     = "A"
  name     = "@"
  value    = var.lb_ip
  ttl      = 3600

  depends_on = [digitalocean_domain.domain]
}

# Add CNAME record for www subdomain
resource "digitalocean_record" "www" {
  for_each = local.root_domains
  domain   = each.value
  type     = "CNAME"
  name     = "www"
  value    = "@"
  ttl      = 3600

  depends_on = [digitalocean_domain.domain]
} 