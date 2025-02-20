locals {
  # Format all secrets in Vault key-value format
  secrets = {
    "droplet_ip"                         = var.droplet_ip
    "ssh_private_key_path"               = var.ssh_private_key_path
    "repo_access_token"                  = var.repo_access_token
    "spaces_access_id"                   = var.spaces_access_id
    "spaces_secret_key"                  = var.spaces_secret_key
    "spaces_region"                      = var.spaces_region
    "frontend_bucket_name"               = var.bucket_details.frontend.name
    "frontend_bucket_endpoint"           = var.bucket_details.frontend.endpoint
    "app_name"                           = var.app_name
    "domains"                            = join(",", var.domains)
    "github_username"                    = var.github_username
    "app_support_email"                  = var.app_support_email
    "mailer_from_address"                = var.mailer_from_address
    "mailer_from_name"                   = var.mailer_from_name
    "postmark_api_key"                   = var.postmark_api_key
    "dockerhub_username"                 = var.dockerhub_username
    "dockerhub_password"                 = var.dockerhub_password
    "mongodb_host"                       = var.mongodb_host
    "mongodb_database"                   = var.mongodb_database
    "mongodb_user"                       = var.mongodb_user
    "mongodb_password"                   = var.mongodb_password
    "app_domain"                         = var.app_domain
  }

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

  # Use a simple fixed filename for vault secrets
  vault_secrets_filename = ".vault_secrets.vault"
  home_dir = pathexpand("~")
  full_vault_path = "${local.home_dir}/${local.vault_secrets_filename}"
}

# Create a local file with the secrets in Vault KV v2 format in user's home directory
resource "local_file" "vault_secrets" {
  filename = local.full_vault_path
  content  = replace(jsonencode(local.secrets), "\\u0026", "&")
  file_permission = "0600"

  # Add a more visible local-exec provisioner output
  provisioner "local-exec" {
    command = <<-EOT
      echo "=================================================="
      echo "VAULT SECRETS FILE CREATED"
      echo "=================================================="
      echo "Location: ${local.full_vault_path}"
      echo "File details:"
      ls -la ${local.full_vault_path}
      echo "=================================================="
    EOT
  }
}

# Create action.yml
resource "local_file" "action_yml" {
  filename = "${path.module}/../../../../Actions/.github/actions/vault-secrets/action.yml"
  content  = local.action_template
  file_permission = "0644"
} 