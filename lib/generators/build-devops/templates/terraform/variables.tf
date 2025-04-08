variable "github_username" {
  description = "GitHub username"
  type = string
}

variable "app_name" {
  description = "Application name"
  type        = string
}

variable "do_region" {
  description = "DigitalOcean region"
  type        = string
}

variable "space_region" {
  description = "DigitalOcean Spaces region"
  type        = string
}

variable "do_token" {
  description = "DigitalOcean API token"
  type = string
  sensitive = true
}

variable "ssh_key" {
  description = "SSH key path"
  type = string
}

variable "email" {
  description = "Email address"
  type = string
}

variable "ssh_fingerprint" {
  description = "SSH key fingerprint"
  type = string
}

variable "spaces_access_id" {
  description = "DigitalOcean Spaces access key ID"
  type = string
  sensitive = true
}

variable "spaces_secret_key" {
  description = "DigitalOcean Spaces secret key"
  type = string
  sensitive = true
}

variable "domains" {
  description = "Domains to be used for the application"
  type = list(string)
}

variable "repo_access_token" {
  description = "GitHub repository access token"
  type = string
  sensitive = true
}

variable "repositories" {
  description = "List of GitHub repositories to create secrets for"
  type = list(string)
}

variable "environment" {
  description = "Environment (e.g., production, staging)"
  type        = string
  default     = "production"
}

variable "app_support_email" {
  description = "Application support email"
  type = string
}

variable "mailer_from_address" {
  description = "Mailer from address"
  type = string
}

variable "mailer_from_name" {
  description = "Mailer from name"
  type = string
}

variable "postmark_api_key" {
  description = "Postmark API key"
  type = string
  sensitive = true
}

variable "dockerhub_username" {
  description = "DockerHub username"
  type = string
}

variable "dockerhub_password" {
  description = "DockerHub password"
  type = string
  sensitive = true
}

variable "mongodb_host" {
  description = "MongoDB host"
  type = string
}

variable "mongodb_database" {
  description = "MongoDB database"
  type = string
}

variable "mongodb_user" {
  description = "MongoDB user"
  type = string
}

variable "mongodb_password" {
  description = "MongoDB password"
  type = string
  sensitive = true
}

variable "app_domain" {
  description = "Application domain extracted from mailer address"
  type        = string
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
