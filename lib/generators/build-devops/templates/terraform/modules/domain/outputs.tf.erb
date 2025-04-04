output "domain_names" {
  description = "The domain names that were created"
  value       = [for domain in digitalocean_domain.domain : domain.name]
}

output "domain_records" {
  description = "The DNS records that were created"
  value = {
    for domain in local.root_domains : domain => {
      a_record = digitalocean_record.a_record[domain].fqdn
      www_record = digitalocean_record.www[domain].fqdn
    }
  }
} 