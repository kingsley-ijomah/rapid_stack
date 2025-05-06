variable "domains" {
  description = "Domains to be used for the application"
  type = list(string)
}

variable "cloudflare_api_key" {
  description = "Cloudflare API key"
  type = string
  sensitive = true
}

variable "cloudflare_account_id" {
  description = "Cloudflare account ID"
  type        = string
  sensitive   = true
}

variable "app_name" {
  description = "Name of the application"
  type        = string
}