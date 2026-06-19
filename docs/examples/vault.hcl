# HashiCorp Vault server configuration

storage "raft" {
  path    = "/opt/vault/data"
  node_id = "vault-node-1"

  retry_join {
    leader_api_addr = "https://vault-1.example.com:8200"
  }
  retry_join {
    leader_api_addr = "https://vault-2.example.com:8200"
  }
}

listener "tcp" {
  address            = "0.0.0.0:8200"
  tls_cert_file      = "/etc/vault/tls/vault.crt"
  tls_key_file       = "/etc/vault/tls/vault.key"
  tls_min_version    = "tls12"
}

seal "awskms" {
  region     = "us-east-1"
  kms_key_id = "alias/vault-unseal-key"
}

api_addr     = "https://vault.example.com:8200"
cluster_addr = "https://vault-node-1.example.com:8201"
cluster_name = "vault-prod"

ui            = true
log_level     = "info"
log_format    = "json"
max_lease_ttl = "768h"
