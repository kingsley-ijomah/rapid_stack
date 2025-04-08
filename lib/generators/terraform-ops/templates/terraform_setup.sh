#!/bin/bash

# Function to create GitHub repositories
create_github_repos() {
    local username="$1"
    local token="$2"
    local repos="$3"
    local is_public="$4"
    
    echo "Creating GitHub repositories..." > /dev/tty
    
    # Convert comma-separated list to array
    IFS=',' read -ra REPO_ARRAY <<< "$repos"
    
    for repo in "${REPO_ARRAY[@]}"; do
        # Trim whitespace
        repo=$(echo "$repo" | xargs)
        
        # Create repository using GitHub API
        response=$(curl -s -X POST \
            -H "Authorization: token $token" \
            -H "Accept: application/vnd.github+json" \
            "https://api.github.com/user/repos" \
            -d "{\"name\":\"$repo\",\"private\":$is_public}")
        
        if echo "$response" | grep -q "already exists"; then
            echo "Repository '$repo' already exists." > /dev/tty
        elif echo "$response" | grep -q "created_at"; then
            echo "Repository '$repo' created successfully." > /dev/tty
        else
            echo "Failed to create repository '$repo': $response" > /dev/tty
        fi
    done
}

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

# Function to read YAML value
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

# Function to read repositories from config
get_repositories() {
    local file="$1"
    # Extract all repository values from the repos section
    sed -n '/^repos:/,/^[a-z]/p' "$file" | grep "^  " | cut -d':' -f2 | tr -d ' "' | tr '\n' ',' | sed 's/,$//'
}

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
CONFIG_FILE=""
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --config) CONFIG_FILE="$2"; shift ;;
        *) echo "Unknown parameter: $1" > /dev/tty; exit 1 ;;
    esac
    shift
done

# Check if config file exists
if [ -z "$CONFIG_FILE" ] || [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ Error: Configuration file not found" > /dev/tty
    exit 1
fi

# Create terraform directory if it doesn't exist
mkdir -p DevOps/terraform

# Clear or create terraform.tfvars
> DevOps/terraform/terraform.tfvars

# Read values from config file
app_name=$(get_yaml_value "$CONFIG_FILE" "app_name" "config")
do_token=$(get_yaml_value "$CONFIG_FILE" "do_token" "config")
do_region=$(get_yaml_value "$CONFIG_FILE" "do_region" "config")
space_region=$(get_yaml_value "$CONFIG_FILE" "space_region" "config")
email=$(get_yaml_value "$CONFIG_FILE" "email" "config")
spaces_access_id=$(get_yaml_value "$CONFIG_FILE" "spaces_access_id" "config")
spaces_secret_key=$(get_yaml_value "$CONFIG_FILE" "spaces_secret_key" "config")
github_username=$(get_yaml_value "$CONFIG_FILE" "github_username" "config")
repo_access_token=$(get_yaml_value "$CONFIG_FILE" "repo_access_token" "config")
domains=$(get_yaml_value "$CONFIG_FILE" "domains" "config")
app_support_email=$(get_yaml_value "$CONFIG_FILE" "app_support_email" "config")
mailer_from_name=$(get_yaml_value "$CONFIG_FILE" "mailer_from_name" "config")
mailer_from_address=$(get_yaml_value "$CONFIG_FILE" "mailer_from_address" "config")
postmark_api_key=$(get_yaml_value "$CONFIG_FILE" "postmark_api_key" "config")
dockerhub_username=$(get_yaml_value "$CONFIG_FILE" "dockerhub_username" "config")
dockerhub_password=$(get_yaml_value "$CONFIG_FILE" "dockerhub_password" "config")
cloudflare_api_key=$(get_yaml_value "$CONFIG_FILE" "cloudflare_api_key" "config")
cloudflare_account_id=$(get_yaml_value "$CONFIG_FILE" "cloudflare_account_id" "config")

# Get repositories from config
repositories=$(get_repositories "$CONFIG_FILE")

# Ask if user wants to create GitHub repositories
if prompt_yes_no "Do you want to create GitHub repositories?" "yes"; then
    # Ask if repositories should be public
    if prompt_yes_no "Do you want the repositories to be public?" "no"; then
        is_public="true"
    else
        is_public="false"
    fi
    
    # Create repositories
    create_github_repos "$github_username" "$repo_access_token" "$repositories" "$is_public"
fi

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
repositories = [$(echo $repositories | sed 's/,/","/g' | sed 's/.*/"&"/')]
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
