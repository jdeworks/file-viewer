datacenter = "us-east-1"
data_dir   = "/opt/consul"

server           = true
bootstrap_expect = 3

bind_addr   = "0.0.0.0"
client_addr = "0.0.0.0"

retry_join = [
  "10.0.1.10",
  "10.0.1.11",
  "10.0.1.12",
]

encrypt = "pUqJrVyVRj5jsiYEkM/tFQYfWyJIv4s3XkvDwy7Cu5s="

ui_config {
  enabled = true
}

tls {
  defaults {
    ca_file   = "/etc/consul.d/tls/ca.pem"
    cert_file = "/etc/consul.d/tls/consul.pem"
    key_file  = "/etc/consul.d/tls/consul-key.pem"

    verify_incoming = true
    verify_outgoing = true
  }

  internal_rpc {
    verify_server_hostname = true
  }
}

performance {
  raft_multiplier = 1
}

log_level = "INFO"
