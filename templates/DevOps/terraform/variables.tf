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

variable "docker_hub_username" {
  description = "Docker Hub username"
  type = string
}

variable "docker_hub_password" {
  description = "Docker Hub password"
  type = string
  sensitive = true
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

variable "aws_region" {
  description = "AWS region"
  type = string
}

variable "rails_master_key" {
  description = "Rails master key"
  type = string
}

variable "environment" {
  description = "Environment (e.g., production, staging)"
  type        = string
  default     = "production"
}

variable "devops_repo" {
  description = "GitHub repository name"
  type = string
}