module "digitalocean_ssh_key" {
  source = "./modules/digitalocean_ssh_key"
  
  app_name = var.app_name
  ssh_key = var.ssh_key
  do_token = var.do_token
}

module "certificate" {
  source = "./modules/certificate"
  
  app_name = var.app_name
  do_token = var.do_token
  domains  = var.domains
}

module "spaces" {
  source = "./modules/spaces"
  
  app_name = var.app_name
  do_token = var.do_token
  do_region = var.space_region
  spaces_access_id = var.spaces_access_id
  spaces_secret_key = var.spaces_secret_key
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

module "loadbalancer" {
  source = "./modules/loadbalancer"

  app_name = var.app_name
  do_region = var.do_region
  do_token = var.do_token
  droplet_ids = [for _, details in module.droplets.droplet_details : details.id]
  certificate_name = "${var.app_name}-cert"
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
}

module "vault_secrets" {
  source = "./modules/vault_secrets"

  bucket_details = module.spaces.bucket_details
  droplet_ip = module.floating_ips.floating_ip_details["manager1"].floating_ip
  ssh_private_key_path = var.ssh_key
  docker_hub_username = var.docker_hub_username
  docker_hub_password = var.docker_hub_password
  repo_access_token = var.repo_access_token
  spaces_access_id = var.spaces_access_id
  spaces_secret_key = var.spaces_secret_key
  aws_region = var.aws_region
  spaces_region = var.space_region
  app_name = var.app_name
  rails_master_key = var.rails_master_key
  domains = var.domains
  github_username = var.github_username
  devops_repo = var.devops_repo
}
