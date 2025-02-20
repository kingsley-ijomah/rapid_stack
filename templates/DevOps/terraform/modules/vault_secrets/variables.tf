variable "droplet_ip" {
  description = "IP address of the droplet"
  type        = string
}

variable "ssh_private_key_path" {
  description = "Path to SSH private key"
  type        = string
}

variable "repo_access_token" {
  description = "GitHub repository access token"
  type        = string
  sensitive   = true
}

variable "spaces_access_id" {
  description = "DigitalOcean Spaces access ID"
  type        = string
}

variable "spaces_secret_key" {
  description = "DigitalOcean Spaces secret key"
  type        = string
  sensitive   = true
}

variable "bucket_details" {
  description = "Details of all Space buckets"
  type = object({
    frontend = object({
      name     = string
      endpoint = string
    })
  })
}

variable "spaces_region" {
  description = "DigitalOcean Spaces region"
  type        = string
}

variable "app_name" {
  description = "Name of the application"
  type        = string
}

variable "domains" {
  description = "List of domains for the application"
  type        = list(string)
} 

variable "github_username" {
  description = "GitHub username"
  type = string
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
  description = "Application domain"
  type = string
}
