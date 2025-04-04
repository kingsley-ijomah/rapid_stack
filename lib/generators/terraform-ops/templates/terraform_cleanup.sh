#!/bin/bash

# Function to display usage
show_usage() {
    echo "Usage: $0 [--app APP_NAME]" > /dev/tty
    echo "  --app      Application name" > /dev/tty
    exit 1
}

# Function to read repositories from config
get_repositories() {
    local file="$1"
    # Extract all repository values from the repos section
    sed -n '/^repos:/,/^[a-z]/p' "$file" | grep "^  " | cut -d':' -f2 | tr -d ' "' | tr '\n' ',' | sed 's/,$//'
}

# Function to delete GitHub repositories
delete_github_repos() {
    local username="$1"
    local token="$2"
    local repos="$3"
    
    echo "🗑️  Deleting GitHub repositories..." > /dev/tty
    
    # Convert comma-separated list to array
    IFS=',' read -ra REPO_ARRAY <<< "$repos"
    
    for repo in "${REPO_ARRAY[@]}"; do
        # Trim whitespace
        repo=$(echo "$repo" | xargs)
        
        # Delete repository using GitHub API
        response=$(curl -s -X DELETE \
            -H "Authorization: token $token" \
            -H "Accept: application/vnd.github+json" \
            "https://api.github.com/repos/$username/$repo")
        
        if [ -z "$response" ]; then
            echo "✅ Repository '$repo' deleted successfully." > /dev/tty
        else
            echo "❌ Failed to delete repository '$repo': $response" > /dev/tty
        fi
    done
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
config_file="$HOME/.rapid_stack/${app_name}_project.yml"

echo "🧹 Starting cleanup process..." > /dev/tty

# Path to terraform.tfvars
TFVARS_PATH="DevOps/terraform/terraform.tfvars"

if [ -f "$config_file" ]; then
    # Read GitHub credentials from config
    github_username=$(grep "github_username:" "$config_file" | cut -d':' -f2 | tr -d ' "')
    repo_access_token=$(grep "repo_access_token:" "$config_file" | cut -d':' -f2 | tr -d ' "')
    repositories=$(get_repositories "$config_file")

    # Ask if user wants to delete GitHub repositories
    echo "⚠️  Warning: This will delete all associated GitHub repositories!" > /dev/tty
    echo "Repositories to be deleted:" > /dev/tty
    IFS=',' read -ra REPO_ARRAY <<< "$repositories"
    for repo in "${REPO_ARRAY[@]}"; do
        echo "  - $repo" > /dev/tty
    done
    echo "" > /dev/tty
    read -p "Do you want to delete these GitHub repositories? [y/N] " response
    response=${response:-N}
    
    if [[ $response =~ ^[Yy]$ ]]; then
        delete_github_repos "$github_username" "$repo_access_token" "$repositories"
    else
        echo "⚠️  Skipping GitHub repository deletion" > /dev/tty
    fi

    # Ask if user wants to destroy infrastructure
    echo "" > /dev/tty
    echo "⚠️  Warning: This will destroy all infrastructure resources in DigitalOcean!" > /dev/tty
    echo "This includes:" > /dev/tty
    echo "  - Droplets (Manager and Worker nodes)" > /dev/tty
    echo "  - Floating IPs (Load balancer and node IPs)" > /dev/tty
    echo "  - SSH Keys (For server access)" > /dev/tty
    echo "  - Domain Records (DNS configurations)" > /dev/tty
    echo "  - SSL Certificates (Let's Encrypt certificates)" > /dev/tty
    echo "  - Load Balancer (HAProxy configuration)" > /dev/tty
    echo "  - Spaces Buckets (Object storage)" > /dev/tty
    echo "  - Ansible Configuration (Server setup files)" > /dev/tty
    echo "  - GitHub Secrets (Repository configurations)" > /dev/tty
    echo "  - Vault Secrets (Application secrets)" > /dev/tty
    echo "" > /dev/tty
    echo "⚠️  This action cannot be undone!" > /dev/tty
    echo "" > /dev/tty
    read -p "Do you want to destroy all infrastructure resources? [y/N] " response
    response=${response:-N}
    
    if [[ $response =~ ^[Yy]$ ]]; then
        echo "🚀 Running terraform destroy..." > /dev/tty
        terraform -chdir=DevOps/terraform destroy -auto-approve
        if [ $? -eq 0 ]; then
            echo "✅ Infrastructure destroyed successfully!" > /dev/tty
            
            # Clear terraform.tfvars after successful destroy
            echo "🗑️  Clearing terraform.tfvars..." > /dev/tty
            echo "# Terraform variables" > "$TFVARS_PATH"
            echo "✓ terraform.tfvars has been cleared" > /dev/tty
        else
            echo "❌ Failed to destroy infrastructure!" > /dev/tty
            echo "⚠️  Skipping terraform.tfvars cleanup" > /dev/tty
        fi
    else
        echo "⚠️  Skipping infrastructure destruction" > /dev/tty
        echo "⚠️  Skipping terraform.tfvars cleanup" > /dev/tty
    fi
else
    echo "ℹ️  Configuration file not found at: $config_file" > /dev/tty
    echo "ℹ️  Expected file: ${app_name}_project.yml" > /dev/tty
    exit 1
fi

echo "✅ Cleanup completed!" > /dev/tty 