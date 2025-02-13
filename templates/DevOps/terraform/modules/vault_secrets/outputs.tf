output "secrets_file_path" {
  description = "Path to the generated Vault secrets file"
  value       = abspath(local_file.vault_secrets.filename)
}

output "secrets_content" {
  description = "Content of the Vault secrets file"
  value       = local.secrets_content
  sensitive   = true
} 