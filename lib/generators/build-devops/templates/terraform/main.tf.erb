terraform {
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "2.32.0"
    }
    time = {
      source = "hashicorp/time"
      version = "~> 0.9.0"
    }
  }
}

provider "digitalocean" {
  token = var.do_token
}

module "digitalocean_ssh_key" {
  source = "./modules/digitalocean_ssh_key"
  
  app_name = var.app_name
  ssh_key = var.ssh_key
  do_token = var.do_token
}

module "droplets" {
  source = "./modules/droplets"

  app_name = var.app_name
  ssh_fingerprint = module.digitalocean_ssh_key.ssh_key_fingerprint
  do_token = var.do_token
}

module "floating_ips" {
  source = "./modules/floating_ips"

  do_region = var.do_region
  do_token = var.do_token
  droplet_details = module.droplets.droplet_details
}

module "domain" {
  source = "./modules/domain"
  
  do_token = var.do_token
  domains  = var.domains
  lb_ip    = module.floating_ips.floating_ip_details["manager1"].floating_ip
}

# Wait for DNS propagation
resource "time_sleep" "wait_for_dns" {
  depends_on = [module.domain]

  create_duration = "30s"
}

module "certificate" {
  source = "./modules/certificate"
  
  app_name = var.app_name
  do_token = var.do_token
  domains  = var.domains
  depends_on = [time_sleep.wait_for_dns]
}

module "loadbalancer" {
  source = "./modules/loadbalancer"

  app_name         = var.app_name
  do_region        = var.do_region
  do_token         = var.do_token
  droplet_ids      = [for _, details in module.droplets.droplet_details : details.id]
  certificate_name = "${var.app_name}-cert"

  depends_on = [module.certificate]
}

module "spaces" {
  source = "./modules/spaces"
  
  app_name = var.app_name
  do_token = var.do_token
  do_region = var.space_region
  spaces_access_id = var.spaces_access_id
  spaces_secret_key = var.spaces_secret_key
}


module "ansible_setup" {
  source = "./modules/ansible_setup"
  
  do_token = var.do_token
  floating_ip_details = module.floating_ips.floating_ip_details
  ssh_private_key_path = var.ssh_key
  lb_ip = module.loadbalancer.lb_ip
}

module "ssh_automate" {
  source = "./modules/ssh_automate"
  
  do_token = var.do_token
  floating_ip_details = module.floating_ips.floating_ip_details
  ssh_private_key_path = module.ansible_setup.ssh_private_key_path
}

module "github_secrets" {
  source = "./modules/github_secrets"
  
  repositories = var.repositories
  bucket_details = module.spaces.bucket_details
  droplet_ip = module.floating_ips.floating_ip_details["manager1"].floating_ip
  ssh_private_key_path = var.ssh_key
  github_username = var.github_username
  repo_access_token = var.repo_access_token
  app_name = var.app_name
}

module "vault_secrets" {
  source = "./modules/vault_secrets"

  bucket_details = module.spaces.bucket_details
  droplet_ip = module.floating_ips.floating_ip_details["manager1"].floating_ip
  ssh_private_key_path = var.ssh_key
  repo_access_token = var.repo_access_token
  spaces_access_id = var.spaces_access_id
  spaces_secret_key = var.spaces_secret_key
  spaces_region = var.space_region
  app_name = var.app_name
  domains = var.domains
  github_username = var.github_username
  app_support_email = var.app_support_email
  mailer_from_address = var.mailer_from_address
  mailer_from_name = var.mailer_from_name
  postmark_api_key = var.postmark_api_key
  dockerhub_username = var.dockerhub_username
  dockerhub_password = var.dockerhub_password
  mongodb_host = var.mongodb_host
  mongodb_database = var.mongodb_database
  mongodb_user = var.mongodb_user
  mongodb_password = var.mongodb_password
  app_domain = var.app_domain
}

