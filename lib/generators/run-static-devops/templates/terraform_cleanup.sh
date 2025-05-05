#!/bin/bash

# Function to display usage
show_usage() {
    echo "Usage: $0 [--app APP_NAME]" > /dev/tty
    echo "  --app      Application name" > /dev/tty
    exit 1
}

# Parse command line arguments
app_name=""
while [[ $# -gt 0 ]]; do
    case $1 in
        --app)
            app_name="$2"
            shift 2
            ;;
        -h|--help)
            show_usage
            ;;
        *)
            echo "Unknown option: $1" > /dev/tty
            show_usage
            ;;
    esac
done

# Check if app name is provided
if [ -z "$app_name" ]; then
    echo "Error: --app parameter is required" > /dev/tty
    show_usage
fi

# Construct config file path
config_file="$HOME/.rapid_stack/config.yml"

echo "🧹 Starting Cloudflare cleanup process..." > /dev/tty

# Path to terraform.tfvars
TFVARS_PATH="static-devops/terraform/terraform.tfvars"

if [ -f "$config_file" ]; then
    # Ask if user wants to proceed with cleanup
    echo "⚠️  Warning: This will clean up all Cloudflare resources!" > /dev/tty
    read -p "Do you want to proceed with cleanup? [y/N] " response
    response=${response:-N}
    
    if [[ $response =~ ^[Yy]$ ]]; then
        echo "✅ Proceeding with cleanup..." > /dev/tty
    else
        echo "⚠️  Skipping cleanup" > /dev/tty
        exit 0
    fi

    # Ask if user wants to destroy Cloudflare resources
    echo "" > /dev/tty
    echo "⚠️  Warning: This will destroy all Cloudflare resources!" > /dev/tty
    echo "This includes:" > /dev/tty
    echo "  - DNS Records" > /dev/tty
    echo "  - SSL/TLS Certificates" > /dev/tty
    echo "  - Page Rules" > /dev/tty
    echo "  - Worker Scripts" > /dev/tty
    echo "" > /dev/tty
    echo "⚠️  This action cannot be undone!" > /dev/tty
    echo "" > /dev/tty
    read -p "Do you want to destroy all Cloudflare resources? [y/N] " response
    response=${response:-N}
    
    if [[ $response =~ ^[Yy]$ ]]; then
        echo "🚀 Running terraform destroy..." > /dev/tty
        terraform -chdir=static-devops/terraform destroy -auto-approve
        if [ $? -eq 0 ]; then
            echo "✅ Cloudflare resources destroyed successfully!" > /dev/tty
            
            # Clear terraform.tfvars after successful destroy
            echo "🗑️  Clearing terraform.tfvars..." > /dev/tty
            echo "# Terraform variables" > "$TFVARS_PATH"
            echo "✓ terraform.tfvars has been cleared" > /dev/tty
        else
            echo "❌ Failed to destroy Cloudflare resources!" > /dev/tty
            echo "⚠️  Skipping terraform.tfvars cleanup" > /dev/tty
        fi
    else
        echo "⚠️  Skipping Cloudflare resources destruction" > /dev/tty
        echo "⚠️  Skipping terraform.tfvars cleanup" > /dev/tty
    fi
else
    echo "ℹ️  Configuration file not found at: $config_file" > /dev/tty
    echo "ℹ️  Expected file: config.yml" > /dev/tty
    exit 1
fi

echo "✅ Cleanup completed!" > /dev/tty 