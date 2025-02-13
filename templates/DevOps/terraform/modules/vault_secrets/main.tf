locals {
  # Format all secrets in Vault key-value format
  secrets = {
    "droplet_ip"                         = var.droplet_ip
    "ssh_private_key_path"               = var.ssh_private_key_path
    "docker_hub_username"                = var.docker_hub_username
    "docker_hub_password"                = var.docker_hub_password
    "repo_access_token"                  = var.repo_access_token
    "spaces_access_id"                   = var.spaces_access_id
    "spaces_secret_key"                  = var.spaces_secret_key
    "spaces_region"                      = var.spaces_region
    "aws_region"                         = var.aws_region
    "frontend_bucket_name"               = var.bucket_details.frontend.name
    "frontend_bucket_endpoint"           = var.bucket_details.frontend.endpoint
    "app_name"                           = var.app_name
    "rails_master_key"                   = var.rails_master_key
    "domains"                            = join(",", var.domains)
    "github_username"                    = var.github_username
    "devops_repo"                        = var.devops_repo
  }

  # Create the content for the secrets file, handling different value types
  secrets_content = join("\n", [
    for key, value in local.secrets : 
    "${key} = ${tostring(value)}"
  ])

  # Generate outputs directly from the secrets structure
  action_outputs = [
    for key, value in local.secrets : {
      name = key
      description = title(replace(key, "_", " "))
    }
  ]
  
  action_template = templatefile("${path.module}/templates/action.yml.tpl", {
    outputs = local.action_outputs
  })
}

# Create a local file with the secrets in Vault KV v2 format
resource "local_file" "vault_secrets" {
  filename = "${path.module}/../../../ansible/vault_secrets.vault"
  content  = jsonencode(local.secrets)
  file_permission = "0600"
}

# Create action.yml
resource "local_file" "action_yml" {
  filename = "${path.module}/../../../../Actions/.github/actions/vault-secrets/action.yml"
  content  = local.action_template
  file_permission = "0644"
} 