terraform {
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "2.32.0"
    } 
  }
}

provider "digitalocean" {
  token = var.do_token
}

locals {
  managers = [for key, value in var.floating_ip_details : "${key} ips=${value.floating_ip}" if value.role == "manager"]
  workers = [for key, value in var.floating_ip_details : "${key} ips=${value.floating_ip}" if value.role == "worker"]
}

resource "null_resource" "update_ssh_config" {
  triggers = {
    managers_config = join("\n", local.managers)
    workers_config = join("\n", local.workers)
    ssh_key_path = var.ssh_private_key_path
    always_run = timestamp()
  }

  provisioner "local-exec" {
    command = "bash ${path.module}/update_ssh_config.sh '${self.triggers.managers_config}' '${self.triggers.workers_config}' '${self.triggers.ssh_key_path}'"
  }
}   
