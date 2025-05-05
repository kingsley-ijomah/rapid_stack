#!/bin/bash

# Function to check DigitalOcean domain permissions
check_domain_permissions() {
    local token="$1"
    local domain="$2"
    
    # Try to list domain records to check permissions
    response=$(curl -s -X GET \
        -H "Authorization: Bearer $token" \
        -H "Content-Type: application/json" \
        "https://api.digitalocean.com/v2/domains/$domain/records")
    
    if echo "$response" | grep -q "You are not allowed to perform this operation"; then
        return 1
    fi
    return 0
}

# Function to run Ansible playbook
run_ansible_playbook() {
    echo "🚀 Running Ansible playbook..." > /dev/tty
    if [ -f "devops/ansible/playbook.yml" ] && [ -f "devops/ansible/inventory.ini" ]; then
        ansible-playbook -i devops/ansible/inventory.ini devops/ansible/playbook.yml -v
        if [ $? -eq 0 ]; then
            echo "✅ Ansible playbook completed successfully!" > /dev/tty
        else
            echo "❌ Ansible playbook failed!" > /dev/tty
        fi
    else
        echo "❌ Error: Ansible playbook or inventory file not found!" > /dev/tty
        echo "Expected files:" > /dev/tty
        echo "  - devops/ansible/playbook.yml" > /dev/tty
        echo "  - devops/ansible/inventory.ini" > /dev/tty
    fi
}

# Write initial messages directly to the terminal
echo "🚀 Terraform Setup Script" > /dev/tty
echo "This script will help you configure your terraform.tfvars file" > /dev/tty
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" > /dev/tty

# Function to read YAML value from a file
get_yaml_value() {
    local file="$1"
    local key="$2"
    local section="$3"
    if [ -n "$section" ]; then
        # Read from a specific section (e.g., config or repos)
        sed -n "/^$section:/,/^[a-z]/p" "$file" | grep "^  $key:" | cut -d':' -f2 | tr -d ' "'
    else
        # Read from root level
        grep "^$key:" "$file" | cut -d':' -f2 | tr -d ' "'
    fi
}

# Function to get value from either config file, with project config taking precedence
get_config_value() {
    local global_file="$1"
    local project_file="$2"
    local key="$3"
    local section="$4"
    
    # Try to get value from project config first
    local project_value=$(get_yaml_value "$project_file" "$key" "$section")
    if [ -n "$project_value" ]; then
        echo "$project_value"
        return
    fi
    
    # If not found in project config, try global config
    local global_value=$(get_yaml_value "$global_file" "$key" "$section")
    if [ -n "$global_value" ]; then
        echo "$global_value"
        return
    fi
    
    # If not found in either, return empty
    echo ""
}

# Function to prompt for yes/no with default
prompt_yes_no() {
    local prompt="$1"
    local default="$2"
    local response

    if [ "$default" = "yes" ]; then
        read -p "$prompt [Y/n] " response
        response=${response:-Y}
    else
        read -p "$prompt [y/N] " response
        response=${response:-N}
    fi

    case "$response" in
        [yY][eE][sS]|[yY]) return 0 ;;
        *) return 1 ;;
    esac
}

# Parse command line arguments
GLOBAL_CONFIG_FILE=""
PROJECT_CONFIG_FILE=""
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --global-config) GLOBAL_CONFIG_FILE="$2"; shift ;;
        --project-config) PROJECT_CONFIG_FILE="$2"; shift ;;
        *) echo "Unknown parameter: $1" > /dev/tty; exit 1 ;;
    esac
    shift
done

# Check if config files exist
if [ -z "$GLOBAL_CONFIG_FILE" ] || [ ! -f "$GLOBAL_CONFIG_FILE" ]; then
    echo "❌ Error: Global configuration file not found" > /dev/tty
    exit 1
fi

if [ -z "$PROJECT_CONFIG_FILE" ] || [ ! -f "$PROJECT_CONFIG_FILE" ]; then
    echo "❌ Error: Project configuration file not found" > /dev/tty
    exit 1
fi

# Create terraform directory if it doesn't exist
mkdir -p DevOps/terraform

# Clear or create terraform.tfvars
> DevOps/terraform/terraform.tfvars

# Read values from both config files
app_name=$(get_config_value "$GLOBAL_CONFIG_FILE" "$PROJECT_CONFIG_FILE" "app_name" "config")
do_token=$(get_config_value "$GLOBAL_CONFIG_FILE" "$PROJECT_CONFIG_FILE" "do_token" "config")
do_region=$(get_config_value "$GLOBAL_CONFIG_FILE" "$PROJECT_CONFIG_FILE" "do_region" "config")
space_region=$(get_config_value "$GLOBAL_CONFIG_FILE" "$PROJECT_CONFIG_FILE" "space_region" "config")
email=$(get_config_value "$GLOBAL_CONFIG_FILE" "$PROJECT_CONFIG_FILE" "email" "config")
spaces_access_id=$(get_config_value "$GLOBAL_CONFIG_FILE" "$PROJECT_CONFIG_FILE" "spaces_access_id" "config")
spaces_secret_key=$(get_config_value "$GLOBAL_CONFIG_FILE" "$PROJECT_CONFIG_FILE" "spaces_secret_key" "config")
github_username=$(get_config_value "$GLOBAL_CONFIG_FILE" "$PROJECT_CONFIG_FILE" "github_username" "config")
repo_access_token=$(get_config_value "$GLOBAL_CONFIG_FILE" "$PROJECT_CONFIG_FILE" "repo_access_token" "config")
domains=$(get_config_value "$GLOBAL_CONFIG_FILE" "$PROJECT_CONFIG_FILE" "domains" "config")
app_support_email=$(get_config_value "$GLOBAL_CONFIG_FILE" "$PROJECT_CONFIG_FILE" "app_support_email" "config")
mailer_from_name=$(get_config_value "$GLOBAL_CONFIG_FILE" "$PROJECT_CONFIG_FILE" "mailer_from_name" "config")
mailer_from_address=$(get_config_value "$GLOBAL_CONFIG_FILE" "$PROJECT_CONFIG_FILE" "mailer_from_address" "config")
postmark_api_key=$(get_config_value "$GLOBAL_CONFIG_FILE" "$PROJECT_CONFIG_FILE" "postmark_api_key" "config")
dockerhub_username=$(get_config_value "$GLOBAL_CONFIG_FILE" "$PROJECT_CONFIG_FILE" "dockerhub_username" "config")
dockerhub_password=$(get_config_value "$GLOBAL_CONFIG_FILE" "$PROJECT_CONFIG_FILE" "dockerhub_password" "config")
cloudflare_api_key=$(get_config_value "$GLOBAL_CONFIG_FILE" "$PROJECT_CONFIG_FILE" "cloudflare_api_key" "config")
cloudflare_account_id=$(get_config_value "$GLOBAL_CONFIG_FILE" "$PROJECT_CONFIG_FILE" "cloudflare_account_id" "config")

# Function to generate SSH key if it doesn't exist
generate_ssh_key() {
    local email="$1"
    local ssh_key_path="$HOME/.ssh/rapid_stack_ed25519"
    
    # Check if the key already exists
    if [ -f "$ssh_key_path" ]; then
        echo "SSH key already exists at $ssh_key_path" > /dev/tty
        echo "$ssh_key_path"
        return
    fi

    echo "Generating new SSH key for RapidStack..." > /dev/tty
    # Create .ssh directory if it doesn't exist
    mkdir -p "$HOME/.ssh"
    
    # Generate the SSH key
    ssh-keygen -t ed25519 -C "$email" -f "$ssh_key_path" -N "" > /dev/tty

    if [ $? -eq 0 ]; then
        echo "SSH key generated successfully at $ssh_key_path" > /dev/tty
        # Set correct permissions
        chmod 600 "$ssh_key_path"
        chmod 644 "$ssh_key_path.pub"
        echo "$ssh_key_path"
    else
        echo "Failed to generate SSH key" > /dev/tty
        exit 1
    fi
}

# Ask if user wants to generate SSH key
if prompt_yes_no "Do you want to generate a new SSH key?" "yes"; then
    # Generate SSH key and get the path
    ssh_key=$(generate_ssh_key "$email")
else
    echo "⚠️  Skipping SSH key generation" > /dev/tty
    ssh_key="$HOME/.ssh/rapid_stack_ed25519"
fi

# Get SSH fingerprint
ssh_fingerprint=$(ssh-keygen -l -E md5 -f "${ssh_key}.pub" | awk '{print $2}' | sed 's/MD5://')

# mongodb_host=mongodb:27017"
mongodb_host="mongodb:27017"

# database name by prepending app_name with underscore
mongodb_database="$(echo ${app_name} | sed 's/ /_/g')_prod"
mongodb_user="$(echo ${app_name} | sed 's/ /_/g')_user"
mongodb_password=$(openssl rand -hex 16)

# Extract domain from mailer_from_address
app_domain=$(echo "${mailer_from_address}" | cut -d'@' -f2)

# Check domain permissions
echo "Checking DigitalOcean domain permissions..." > /dev/tty
if ! check_domain_permissions "$do_token" "$app_domain"; then
    echo "⚠️  Warning: Your DigitalOcean token doesn't have domain management permissions." > /dev/tty
    echo "This means the script cannot automatically create DNS records." > /dev/tty
    echo "You'll need to manually create the following DNS records:" > /dev/tty
    echo "1. A record for $app_domain pointing to your droplet's IP" > /dev/tty
    echo "2. CNAME records for www.$app_domain pointing to $app_domain" > /dev/tty
    echo "" > /dev/tty
    echo "To fix this:" > /dev/tty
    echo "1. Go to your DigitalOcean account" > /dev/tty
    echo "2. Navigate to API > Tokens" > /dev/tty
    echo "3. Edit your token to include 'write' permissions for domains" > /dev/tty
    echo "4. Update the token in your project configuration" > /dev/tty
    echo "" > /dev/tty
fi

# Ask if user wants to update terraform.tfvars
if prompt_yes_no "Do you want to update terraform.tfvars with required credentials?" "yes"; then
    # Write the captured values into terraform.tfvars without any extra prompt messages
    cat << EOF > DevOps/terraform/terraform.tfvars
app_name = "${app_name}"
do_token = "${do_token}"
do_region = "${do_region}"
space_region = "${space_region}"
email = "${email}"
spaces_access_id = "${spaces_access_id}"
spaces_secret_key = "${spaces_secret_key}"
github_username = "${github_username}"
repo_access_token = "${repo_access_token}"
domains = [$(echo $domains | sed 's/,/","/g' | sed 's/.*/"&"/')]
ssh_key = "${ssh_key}"
ssh_fingerprint = "${ssh_fingerprint}"
app_support_email = "${app_support_email}"
mailer_from_name = "${mailer_from_name}"
mailer_from_address = "${mailer_from_address}"
app_domain = "${app_domain}"
postmark_api_key = "${postmark_api_key}"
dockerhub_username = "${dockerhub_username}"
dockerhub_password = "${dockerhub_password}"
mongodb_host = "${mongodb_host}"
mongodb_database = "${mongodb_database}"
mongodb_user = "${mongodb_user}"
mongodb_password = "${mongodb_password}"
cloudflare_api_key = "${cloudflare_api_key}"
cloudflare_account_id = "${cloudflare_account_id}"
EOF

    echo "✅ terraform.tfvars has been created successfully!" > /dev/tty
    echo "📁 Location: DevOps/terraform/terraform.tfvars" > /dev/tty
    echo "🔒 Note: This file contains sensitive information. Make sure it's git-ignored!" > /dev/tty
    echo "🔑 SSH key location: ${ssh_key}" > /dev/tty
    echo "🔑 SSH public key:" > /dev/tty
    cat "${ssh_key}.pub" > /dev/tty
    echo -e "\n⚠️  SSH key will be added to your DigitalOcean account!" > /dev/tty
else
    echo "⚠️  Skipping terraform.tfvars update" > /dev/tty
    echo "ℹ️  Using existing terraform.tfvars file" > /dev/tty
fi

# Ask if user wants to run terraform init
if prompt_yes_no "Do you want to run terraform init now?" "yes"; then
    echo "🚀 Running terraform init..." > /dev/tty
    terraform -chdir=DevOps/terraform init

    # Ask if user wants to run terraform apply
    if prompt_yes_no "Do you want to run terraform apply now?" "yes"; then
        echo "🚀 Running terraform apply..." > /dev/tty
        # Skip domain module if permissions are missing
        if ! check_domain_permissions "$do_token" "$app_domain"; then
            echo "⚠️  Skipping domain record creation due to missing permissions" > /dev/tty
            terraform -chdir=DevOps/terraform apply -target=module.droplet -target=module.floating_ips -target=module.ssh_key
        else
            terraform -chdir=DevOps/terraform apply
        fi
    else
        echo "⚠️  Skipping terraform apply" > /dev/tty
    fi
else
    echo "⚠️  Skipping terraform init" > /dev/tty
fi

# Ask if user wants to run Ansible playbook
if prompt_yes_no "Do you want to run Ansible playbook for server configuration?" "yes"; then
    run_ansible_playbook
else
    echo "⚠️  Skipping Ansible playbook" > /dev/tty
fi
