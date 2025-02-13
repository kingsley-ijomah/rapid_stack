variable "droplet_ip" {
  description = "IP address of the droplet"
  type        = string
}

variable "ssh_private_key_path" {
  description = "Path to SSH private key"
  type        = string
}

variable "docker_hub_username" {
  description = "Docker Hub username"
  type        = string
}

variable "docker_hub_password" {
  description = "Docker Hub password"
  type        = string
  sensitive   = true
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

variable "aws_region" {
  description = "AWS region"
  type        = string
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

variable "rails_master_key" {
  description = "Rails master key"
  type        = string
  sensitive   = true
}

variable "domains" {
  description = "List of domains for the application"
  type        = list(string)
} 

variable "github_username" {
  description = "GitHub username"
  type = string
}

variable "devops_repo" {
  description = "GitHub repository name"
  type = string
}