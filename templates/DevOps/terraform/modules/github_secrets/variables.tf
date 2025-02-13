variable "repositories" {
  description = "List of GitHub repositories to create secrets for"
  type = list(string)
}

variable "droplet_ip" {
  description = "IP address of the droplet"
}

variable "ssh_private_key_path" {
  description = "Path to SSH private key"
}

variable "github_username" {
  description = "GitHub username"
  type = string
}

variable "bucket_details" {
  description = "Details of all Space buckets"
  type = object({
    frontend = object({
      name = string
      endpoint = string
    })
    # Add other buckets as needed
  })
}

variable "repo_access_token" {
  description = "GitHub repository access token"
  type = string
  sensitive = true
}

# variable "docker_hub_password" {
#   description = "Docker Hub password"
#   sensitive   = true
# }

# variable "spaces_access_id" {
#   description = "DigitalOcean Spaces access ID"
#   type = string
# }

# variable "spaces_secret_key" {
#   description = "DigitalOcean Spaces secret key"
#   type = string
# }

# variable "aws_region" {
#   description = "AWS region"
#   type = string
# }

# variable "spaces_region" {
#   description = "DigitalOcean Spaces region"
#   type = string
# }

# variable "app_name" {
#   description = "Name of the application"
#   type = string
# }

# variable "rails_master_key" {
#   description = "Rails master key"
#   type = string
# }

# variable "domains" {
#   description = "List of domains for the application"
#   type = list(string)
# }

# variable "docker_hub_username" {
#   description = "Docker Hub username"
# }