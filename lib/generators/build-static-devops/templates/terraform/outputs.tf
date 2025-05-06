output "cloudflare_nameservers" {
  description = "Cloudflare nameservers for each domain"
  value       = module.cloudflare_domain.nameservers
}