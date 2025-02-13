ui = true

storage "file" {
  path = "/vault/file"
}

listener "tcp" {
  address     = "0.0.0.0:8200"
  tls_disable = 1
}

disable_mlock = true
api_addr = "http://0.0.0.0:8200"

cluster_addr = "https://0.0.0.0:8201"

log_level = "INFO"

telemetry {
  disable_hostname = true
  prometheus_retention_time = "24h"
}

# Enable automatic unsealing using cloud KMS (uncomment and configure for your cloud provider)
# seal "awskms" {
#   region     = "us-west-2"
#   kms_key_id = "alias/vault-unseal-key"
# } 