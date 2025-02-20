#!/bin/bash

# Write initial messages directly to the terminal
echo "🚀 Terraform Setup Script" > /dev/tty
echo "This script will help you configure your terraform.tfvars file" > /dev/tty
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" > /dev/tty

# Function to prompt for input
get_input() {
    local prompt="$1"
    local help_text="$2"
    local default="$3"
    
    # Print prompt messages to the terminal (not stdout)
    echo -e "\n${prompt}" > /dev/tty
    [ -n "$help_text" ] && echo "${help_text}" > /dev/tty
    [ -n "$default" ] && echo "(Default: ${default})" > /dev/tty

    # Read input from the terminal
    read -p "Enter ${prompt}: " value < /dev/tty
    # Echo only the final value (or default if empty)
    echo "${value:-$default}"
}

# Function to generate repository names based on app name
generate_repo_names() {
    local app_name="$1"
    local components=("frontend" "backend" "devops" "nginx" "actions")
    local repos=()
    
    for component in "${components[@]}"; do
        repos+=("${app_name}-${component}")
    done
    
    # Join array with commas
    local IFS=","
    echo "${repos[*]}"
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

# Function to check if a GitHub repository exists and create it if not.
create_github_repo() {
    local repo_name="$1"
    local is_public="$2"  # this is "true" if repos should be public
    echo "Processing repository: $repo_name" > /dev/tty

    # Determine the value for the "private" field:
    if [ "$is_public" = "true" ]; then
        private_field=false
    else
        private_field=true
    fi

    # Check if repository exists by making a GET request to the repo URL
    http_code=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Authorization: token ${repo_access_token}" \
        "https://api.github.com/repos/${github_username}/${repo_name}")

    if [ "$http_code" -eq 200 ]; then
        echo "Repository '${repo_name}' already exists." > /dev/tty
    else
        # Create repository using GitHub API
        response=$(curl -s -X POST \
            -H "Authorization: token ${repo_access_token}" \
            -H "Accept: application/vnd.github+json" \
            "https://api.github.com/user/repos" \
            -d "{\"name\": \"${repo_name}\", \"private\": ${private_field}}")

        # Check if the response contains "full_name", indicating success.
        if echo "$response" | grep -q '"full_name":'; then
            echo "Repository '${repo_name}' created successfully." > /dev/tty
        else
            echo "Failed to create repository '${repo_name}'. Response: $response" > /dev/tty
        fi
    fi
}


# Parse command line arguments
PUBLIC_REPOS=false
CLEAN_MODE=false
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --pub-repo) PUBLIC_REPOS=true ;;
        --clean) CLEAN_MODE=true ;;
        *) echo "Unknown parameter: $1" > /dev/tty; exit 1 ;;
    esac
    shift
done

# If clean mode is enabled, run cleanup and exit
if [ "$CLEAN_MODE" = true ]; then
    echo "🧹 Cleaning up..." > /dev/tty
    # Clear terraform.tfvars
    > DevOps/terraform/terraform.tfvars
    echo "✅ terraform.tfvars has been cleared" > /dev/tty
    exit 0
fi

# Show repository visibility status
if [ "$PUBLIC_REPOS" = true ]; then
    echo "📢 Repositories will be created as PUBLIC" > /dev/tty
else
    echo "🔒 Repositories will be created as PRIVATE" > /dev/tty
fi

# Clear or create terraform.tfvars
> DevOps/terraform/terraform.tfvars

# Get input from the user (only the typed value is captured)
app_name=$(get_input "Application name" "The name of your application (e.g., my-app)")
do_token=$(get_input "DigitalOcean API token" "Generate this token at: https://cloud.digitalocean.com/account/api/tokens")
do_region=$(get_input "DigitalOcean region" "Available regions at: https://docs.digitalocean.com/products/platform/availability-matrix/" "lon1")
space_region=$(get_input "Space region" "Available regions at: https://docs.digitalocean.com/products/platform/availability-matrix/ (Note: not all regions support Spaces)" "fra1")
email=$(get_input "Email address" "Used for SSL certificates and notifications")
spaces_access_id=$(get_input "Spaces access ID" "Generate at: https://cloud.digitalocean.com/spaces/access_keys")
spaces_secret_key=$(get_input "Spaces secret key" "Generate at: https://cloud.digitalocean.com/spaces/access_keys")
github_username=$(get_input "GitHub username" "Your GitHub username")
repo_access_token=$(get_input "GitHub access token" "Generate at: https://github.com/settings/tokens with 'repo', 'workflow' and 'delete repo' permissions")
domains=$(get_input "Domains" "List your domains (comma-separated, e.g., example.com,www.example.com)")
app_support_email=$(get_input "Application support email" "The email address to use for application support: e.g., support@example.com")
mailer_from_name=$(get_input "Mailer from name" "The name to use for the mailer from name: e.g., Emeka Smith")
mailer_from_address=$(get_input "Mailer from address" "The email address to use for the mailer from address: e.g., info@example.com")
postmark_api_key=$(get_input "Postmark API key" "Generate at: https://postmarkapp.com/api-key")
dockerhub_username=$(get_input "DockerHub username" "Your DockerHub username at: https://hub.docker.com/")
dockerhub_password=$(get_input "DockerHub password" "Your DockerHub password")

# Generate repository names based on app name
repositories=$(generate_repo_names "$app_name")

# Generate SSH key and get the path
ssh_key=$(generate_ssh_key "$email")

# Get SSH fingerprint
ssh_fingerprint=$(ssh-keygen -l -E md5 -f "${ssh_key}.pub" | awk '{print $2}' | sed 's/MD5://')

# mongodb_host=mongodb:27017"
mongodb_host="mongodb:27017"

# database name by prepending app_name with underscore
mongodb_database="$(echo ${app_name} | sed 's/ /_/g')_prod"
mongodb_user="$(echo ${app_name} | sed 's/ /_/g')_user"
# mongodb_password="$(openssl rand -hex 16)"
mongodb_password=$(openssl rand -hex 16)

# Extract domain from mailer_from_address
app_domain=$(echo "${mailer_from_address}" | cut -d'@' -f2)

# Write the captured values into terraform.tfvars without any extra prompt messages
cat << EOF > DevOps/terraform/terraform.tfvars
app_name = "${app_name}"
do_token = "${do_token}"
do_region = "${do_region}"
space_region = "${space_region}"
email = "${email}"
spaces_access_id = "${spaces_access_id}"
spaces_secret_key = "${spaces_secret_key}"
repo_access_token = "${repo_access_token}"
github_username = "${github_username}"
domains = [$(echo $domains | sed 's/,/","/g' | sed 's/.*/"&"/')]
ssh_key = "${ssh_key}"
ssh_fingerprint = "${ssh_fingerprint}"
repositories = [$(echo $repositories | sed 's/,/","/g' | sed 's/.*/"&"/')]
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
EOF

echo "✅ terraform.tfvars has been created successfully!" > /dev/tty
echo "📁 Location: DevOps/terraform/terraform.tfvars" > /dev/tty
echo "🔒 Note: This file contains sensitive information. Make sure it's git-ignored!" > /dev/tty
echo "🔑 SSH key location: ${ssh_key}" > /dev/tty
echo "🔑 SSH public key:" > /dev/tty
cat "${ssh_key}.pub" > /dev/tty
echo -e "\n⚠️  SSH key will be added to your DigitalOcean account!" > /dev/tty
echo -e "\n📦 Repositories to be created:" > /dev/tty
echo "$repositories" | tr ',' '\n' | sed 's/^/  • /' > /dev/tty

# Create the GitHub repositories if they don't already exist
IFS=',' read -ra repo_array <<< "$repositories"
for repo in "${repo_array[@]}"; do
    # Trim any extra spaces around the repository name
    repo="$(echo "$repo" | xargs)"
    create_github_repo "$repo" "$PUBLIC_REPOS"
done

echo -e "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" > /dev/tty
echo "🧹 To clean up this setup later, you can run:" > /dev/tty
echo "  ./terraform_cleanup.sh         # Clear terraform.tfvars" > /dev/tty
echo "  ./terraform_cleanup.sh --clean # Also delete GitHub repositories" > /dev/tty
echo "💡 To create public repositories, use the --pub-repo flag" > /dev/tty
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" > /dev/tty

echo -e "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" > /dev/tty
echo "👉 Next step: Run the following command to apply your configuration:" > /dev/tty
echo "   cd DevOps" > /dev/tty
echo "   ansible-playbook -i ansible/inventory.ini ansible/playbook.yml -v" > /dev/tty
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" > /dev/tty
