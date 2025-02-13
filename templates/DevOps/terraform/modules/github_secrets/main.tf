terraform {
  required_providers {
    github = {
      source  = "integrations/github"
      version = "~> 5.0"
    }
  }
}

provider "github" {
  token = var.repo_access_token
}

resource "github_actions_secret" "droplet_ip" {
  for_each        = toset(var.repositories)
  repository      = each.key
  secret_name     = "DROPLET_IP"
  plaintext_value = var.droplet_ip
}

resource "github_actions_secret" "ssh_private_key" {
  for_each        = toset(var.repositories)
  repository      = each.key
  secret_name     = "SSH_PRIVATE_KEY"
  plaintext_value = file(var.ssh_private_key_path)
}

resource "github_actions_secret" "repo_access_token" {
  for_each        = toset(var.repositories)
  repository      = each.key
  secret_name     = "REPO_ACCESS_TOKEN"
  plaintext_value = var.repo_access_token
}

resource "github_actions_secret" "github_username" {
  for_each        = toset(var.repositories)
  repository      = each.key
  secret_name     = "MY_GITHUB_USERNAME"
  plaintext_value = var.github_username
}

# resource "github_actions_secret" "docker_hub_username" {
#   for_each        = toset(var.repositories)
#   repository      = each.key
#   secret_name     = "DOCKERHUB_USERNAME"
#   plaintext_value = var.docker_hub_username
# }

# resource "github_actions_secret" "docker_hub_password" {
#   for_each        = toset(var.repositories)
#   repository      = each.key
#   secret_name     = "DOCKERHUB_PASSWORD"
#   plaintext_value = var.docker_hub_password
# }

# resource "github_actions_secret" "spaces_access_id" {
#   for_each        = toset(var.repositories)
#   repository      = each.key
#   secret_name     = "SPACES_ACCESS_ID"
#   plaintext_value = var.spaces_access_id
# }

# resource "github_actions_secret" "spaces_secret_key" {
#   for_each        = toset(var.repositories)
#   repository      = each.key
#   secret_name     = "SPACES_SECRET_KEY"
#   plaintext_value = var.spaces_secret_key
# }

# resource "github_actions_secret" "aws_region" {
#   for_each        = toset(var.repositories)
#   repository      = each.key
#   secret_name     = "AWS_REGION"
#   plaintext_value = var.aws_region
# }

# resource "github_actions_secret" "frontend_bucket_name" {
#   for_each        = toset(var.repositories)
#   repository      = each.key
#   secret_name     = "FRONTEND_BUCKET_NAME"
#   plaintext_value = var.bucket_details.frontend.name
# }

# resource "github_actions_secret" "spaces_region" {
#   for_each        = toset(var.repositories)
#   repository      = each.key
#   secret_name     = "SPACES_REGION"
#   plaintext_value = var.spaces_region
# }

# resource "github_actions_secret" "app_name" {
#   for_each        = toset(var.repositories)
#   repository      = each.key
#   secret_name     = "APP_NAME"
#   plaintext_value = var.app_name
# }

# resource "github_actions_secret" "rails_master_key" {
#   for_each        = toset(var.repositories)
#   repository      = each.key
#   secret_name     = "RAILS_MASTER_KEY"
#   plaintext_value = var.rails_master_key
# }

# resource "github_actions_secret" "domains" {
#   for_each        = toset(var.repositories)
#   repository      = each.key
#   secret_name     = "DOMAINS"
#   plaintext_value = jsonencode(var.domains)
# }


