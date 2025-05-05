#!/bin/bash

# Write initial messages directly to the terminal
echo "🚀 Cloudflare Terraform Setup Script" > /dev/tty
echo "This script will help you configure your terraform.tfvars file for Cloudflare" > /dev/tty
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
mkdir -p static-devops/terraform

# Clear or create terraform.tfvars
> static-devops/terraform/terraform.tfvars

# Read values from both config files
app_name=$(get_config_value "$GLOBAL_CONFIG_FILE" "$PROJECT_CONFIG_FILE" "app_name" "config")
cloudflare_api_key=$(get_config_value "$GLOBAL_CONFIG_FILE" "$PROJECT_CONFIG_FILE" "cloudflare_api_key" "config")
cloudflare_account_id=$(get_config_value "$GLOBAL_CONFIG_FILE" "$PROJECT_CONFIG_FILE" "cloudflare_account_id" "config")
domains=$(get_config_value "$GLOBAL_CONFIG_FILE" "$PROJECT_CONFIG_FILE" "domains" "config")

# Ask if user wants to update terraform.tfvars
if prompt_yes_no "Do you want to update terraform.tfvars with required credentials?" "yes"; then
    # Write the captured values into terraform.tfvars without any extra prompt messages
    cat << EOF > static-devops/terraform/terraform.tfvars
app_name = "${app_name}"
cloudflare_api_key = "${cloudflare_api_key}"
cloudflare_account_id = "${cloudflare_account_id}"
domains = [$(echo $domains | sed 's/,/","/g' | sed 's/.*/"&"/')]
EOF

    echo "✅ terraform.tfvars has been created successfully!" > /dev/tty
    echo "📁 Location: static-devops/terraform/terraform.tfvars" > /dev/tty
    echo "🔒 Note: This file contains sensitive information. Make sure it's git-ignored!" > /dev/tty
else
    echo "⚠️  Skipping terraform.tfvars update" > /dev/tty
    echo "ℹ️  Using existing terraform.tfvars file" > /dev/tty
fi

# Ask if user wants to run terraform init
if prompt_yes_no "Do you want to run terraform init now?" "yes"; then
    echo "🚀 Running terraform init..." > /dev/tty
    terraform -chdir=static-devops/terraform init

    # Ask if user wants to run terraform apply
    if prompt_yes_no "Do you want to run terraform apply now?" "yes"; then
        echo "🚀 Running terraform apply..." > /dev/tty
        terraform -chdir=static-devops/terraform apply
    else
        echo "⚠️  Skipping terraform apply" > /dev/tty
    fi
else
    echo "⚠️  Skipping terraform init" > /dev/tty
fi
