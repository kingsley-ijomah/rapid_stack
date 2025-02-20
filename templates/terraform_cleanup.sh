#!/bin/bash

# Function to display usage
show_usage() {
    echo "Usage: $0 [--clean]" > /dev/tty
    echo "  --clean    Also delete GitHub repositories" > /dev/tty
    exit 1
}

# Function to delete a GitHub repository
delete_github_repo() {
    local repo_name="$1"
    local github_username="$2"
    local token="$3"

    echo "Attempting to delete repository: $repo_name" > /dev/tty

    response=$(curl -s -X DELETE \
        -H "Authorization: token ${token}" \
        -H "Accept: application/vnd.github+json" \
        "https://api.github.com/repos/${github_username}/${repo_name}")

    if [ -z "$response" ]; then
        echo "✓ Repository '${repo_name}' deleted successfully." > /dev/tty
    else
        echo "✗ Failed to delete repository '${repo_name}'. Response: $response" > /dev/tty
    fi
}

# Parse command line arguments
delete_repos=false
while [[ $# -gt 0 ]]; do
    case $1 in
        --clean)
            delete_repos=true
            shift
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

echo "🧹 Starting cleanup process..." > /dev/tty

# Path to terraform.tfvars
TFVARS_PATH="DevOps/terraform/terraform.tfvars"

if [ -f "$TFVARS_PATH" ]; then
    # If --clean flag is provided, delete GitHub repositories before clearing tfvars
    if [ "$delete_repos" = true ]; then
        echo "🗑️  Deleting GitHub repositories..." > /dev/tty
        
        # Extract values from terraform.tfvars
        eval "$(cat "$TFVARS_PATH" | grep -E '^(github_username|repo_access_token|repositories) = ' | sed 's/ = /=/')"
        
        # Remove quotes and brackets from repositories array
        repositories=$(echo $repositories | sed 's/[][]//g' | sed 's/"//g')
        
        # Remove quotes from other variables
        github_username=$(echo $github_username | sed 's/"//g')
        repo_access_token=$(echo $repo_access_token | sed 's/"//g')
        
        # Delete each repository
        IFS=',' read -ra repo_array <<< "$repositories"
        for repo in "${repo_array[@]}"; do
            # Trim any whitespace
            repo="$(echo "$repo" | xargs)"
            delete_github_repo "$repo" "$github_username" "$repo_access_token"
        done
    fi

    # Clear terraform.tfvars
    echo "🗑️  Clearing terraform.tfvars..." > /dev/tty
    echo "# Terraform variables" > "$TFVARS_PATH"
    echo "✓ terraform.tfvars has been cleared" > /dev/tty
else
    echo "ℹ️  terraform.tfvars not found, skipping..." > /dev/tty
fi

echo "✅ Cleanup completed!" > /dev/tty
if [ "$delete_repos" = false ]; then
    echo "Note: Use --clean flag to also delete GitHub repositories" > /dev/tty
fi 