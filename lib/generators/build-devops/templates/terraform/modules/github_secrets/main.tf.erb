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

resource "github_actions_secret" "app_name" {
  for_each        = toset(var.repositories)
  repository      = each.key
  secret_name     = "APP_NAME"
  plaintext_value = var.app_name
}

