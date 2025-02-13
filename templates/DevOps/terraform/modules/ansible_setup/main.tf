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
  managers = [for key, value in var.floating_ip_details : "${key} ansible_host=${value.floating_ip} ansible_ssh_user=root ansible_ssh_private_key_file=${var.ssh_private_key_path}" if value.role == "manager"]
  workers = [for key, value in var.floating_ip_details : "${key} ansible_host=${value.floating_ip} ansible_ssh_user=root ansible_ssh_private_key_file=${var.ssh_private_key_path}" if value.role == "worker"]
  inventory_content = templatefile("${path.module}/../../templates/inventory.tpl", {
    managers = join("\n", local.managers)
    workers = join("\n", local.workers)
    lb_ip = var.lb_ip
  })
}

resource "null_resource" "ansible_inventory" {
  triggers = {
    always_run = timestamp()
  }

  provisioner "local-exec" {
    command = "echo '${local.inventory_content}' > ../ansible/inventory.ini"
  }
}