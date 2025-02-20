#!/bin/bash
# deploy-services.sh

# Check if required environment variables are set
if [ -z "$SSH_PRIVATE_KEY" ] || [ -z "$DROPLET_IP" ]; then
    echo "❌ Required environment variables SSH_PRIVATE_KEY and DROPLET_IP must be set"
    exit 1
fi

echo "🔑 Setting up SSH..."
mkdir -p ~/.ssh
echo "$SSH_PRIVATE_KEY" > ~/.ssh/id_rsa
chmod 600 ~/.ssh/id_rsa
ssh-keyscan -H "$DROPLET_IP" >> ~/.ssh/known_hosts

echo "📂 Copying files to server..."
scp docker-compose.prod.yml deployuser@"$DROPLET_IP":/home/deployuser/
scp docker-compose.graylog.yml deployuser@"$DROPLET_IP":/home/deployuser/
scp docker-compose.portainer.yml deployuser@"$DROPLET_IP":/home/deployuser/
scp deploy-services.sh deployuser@"$DROPLET_IP":/home/deployuser/

echo "🚀 Deploying services..."
ssh deployuser@"$DROPLET_IP" "bash -s" << 'ENDSSH'
cd /home/deployuser

# Read Vault credentials
if [ ! -f ~/.vault/vault_credentials.txt ]; then
    echo "❌ Vault credentials not found"
    exit 1
fi

VAULT_TOKEN=$(cat ~/.vault/vault_credentials.txt | jq -r .root_token)
if [ -z "$VAULT_TOKEN" ]; then
    echo "❌ Failed to get Vault token"
    exit 1
fi

echo "🔐 Reading secrets from Vault..."
# Get vault token and data using vault CLI
VAULT_CONTAINER=$(docker ps -q -f name=vault | head -n1)
if [ -z "$VAULT_CONTAINER" ]; then
    echo "❌ Vault container not found"
    exit 1
fi

# Get secrets from Vault
VAULT_SECRETS=$(docker exec -e VAULT_ADDR="http://127.0.0.1:8200" -e VAULT_TOKEN="$VAULT_TOKEN" "$VAULT_CONTAINER" vault kv get -mount=secret -format=json config | jq -r '.data.data')

# Export required variables from Vault
# App credentials
export APP_NAME=$(echo "$VAULT_SECRETS" | jq -r '.app_name')
export APP_DOMAIN=$(echo "$VAULT_SECRETS" | jq -r '.app_domain')
export APP_SUPPORT_EMAIL=$(echo "$VAULT_SECRETS" | jq -r '.app_support_email')

# Mailer credentials
export MAILER_FROM_ADDRESS=$(echo "$VAULT_SECRETS" | jq -r '.mailer_from_address')
export MAILER_FROM_NAME=$(echo "$VAULT_SECRETS" | jq -r '.mailer_from_name')

# MongoDB credentials
export MONGODB_HOST=$(echo "$VAULT_SECRETS" | jq -r '.mongodb_host')
export MONGODB_DATABASE=$(echo "$VAULT_SECRETS" | jq -r '.mongodb_database')
export MONGODB_USER=$(echo "$VAULT_SECRETS" | jq -r '.mongodb_user')
export MONGODB_PASSWORD=$(echo "$VAULT_SECRETS" | jq -r '.mongodb_password')

# MongoDB container
export MONGO_INITDB_DATABASE=${MONGODB_DATABASE}
export MONGO_INITDB_ROOT_USERNAME=${MONGODB_USER}
export MONGO_INITDB_ROOT_PASSWORD=${MONGODB_PASSWORD}

# JWT and Rails credentials
export JWT_SECRET_KEY=$(echo "$VAULT_SECRETS" | jq -r '.jwt_secret_key')
export SECRET_KEY_BASE=$(echo "$VAULT_SECRETS" | jq -r '.secret_key_base')
export RAILS_MASTER_KEY=$(echo "$VAULT_SECRETS" | jq -r '.rails_master_key')

# Postmark
export POSTMARK_API_TOKEN=$(echo "$VAULT_SECRETS" | jq -r '.postmark_api_token')

# Other existing exports
export DOCKERHUB_USERNAME=$(echo "$VAULT_SECRETS" | jq -r '.dockerhub_username')
export DOMAINS=$(echo "$VAULT_SECRETS" | jq -r '.domains')
export FRONTEND_BUCKET_NAME=$(echo "$VAULT_SECRETS" | jq -r '.frontend_bucket_name')
export SPACES_REGION=$(echo "$VAULT_SECRETS" | jq -r '.spaces_region')
export VAULT_TOKEN=$(echo "$VAULT_SECRETS" | jq -r '.vault_token')
export DROPLET_IP=$(echo "$VAULT_SECRETS" | jq -r '.droplet_ip')

# Export Graylog credentials
export GRAYLOG_PASSWORD_SECRET=$(echo "$VAULT_SECRETS" | jq -r '.graylog_password_secret')
export GRAYLOG_ROOT_PASSWORD_SHA2=$(echo "$VAULT_SECRETS" | jq -r '.graylog_root_password_sha2')
export GRAYLOG_ROOT_USERNAME=$(echo "$VAULT_SECRETS" | jq -r '.graylog_root_username')
export GRAYLOG_ROOT_PASSWORD=$(echo "$VAULT_SECRETS" | jq -r '.graylog_root_password')

# Check if required Graylog credentials exist
if [ -z "$GRAYLOG_PASSWORD_SECRET" ] || [ -z "$GRAYLOG_ROOT_PASSWORD_SHA2" ] || [ -z "$GRAYLOG_ROOT_USERNAME" ] || [ -z "$GRAYLOG_ROOT_PASSWORD" ]; then
    echo "❌ Required Graylog credentials are not set in Vault"
    exit 1
fi

# Update required secrets verification
REQUIRED_SECRETS=(
    "APP_NAME"
    "APP_DOMAIN"
    "APP_SUPPORT_EMAIL"
    "MAILER_FROM_ADDRESS"
    "MAILER_FROM_NAME"
    "MONGODB_HOST"
    "MONGODB_DATABASE"
    "MONGODB_USER"
    "MONGODB_PASSWORD"
    "JWT_SECRET_KEY"
    "SECRET_KEY_BASE"
    "RAILS_MASTER_KEY"
    "POSTMARK_API_TOKEN"
    "DOCKERHUB_USERNAME"
    "DOMAINS"
    "FRONTEND_BUCKET_NAME"
    "SPACES_REGION"
    "VAULT_TOKEN"
    "DROPLET_IP"
    "MONGO_INITDB_DATABASE"
    "MONGO_INITDB_ROOT_USERNAME"
    "MONGO_INITDB_ROOT_PASSWORD"
    "GRAYLOG_PASSWORD_SECRET"
    "GRAYLOG_ROOT_PASSWORD_SHA2"
    "GRAYLOG_ROOT_USERNAME"
    "GRAYLOG_ROOT_PASSWORD"
)

for secret in "${REQUIRED_SECRETS[@]}"; do
    if [ -z "${!secret}" ]; then
        echo "❌ Required secret $secret is not set in Vault"
        exit 1
    fi
done

echo "✅ Successfully loaded secrets from Vault"

# Create Docker network if it doesn't exist
docker network create app-network 2>/dev/null || true

# Start Graylog if not running
if [ -z "$(docker ps -q -f name=graylog)" ]; then
    echo "Starting Graylog stack..."
    docker-compose -f docker-compose.graylog.yml pull
    docker-compose -f docker-compose.graylog.yml up -d --build
fi

# Deploy main services
echo "Deploying main services..."
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d

# Start Portainer if not running
if [ -z "$(docker ps -q -f name=portainer)" ]; then
    echo "Starting Portainer..."
    docker-compose -f docker-compose.portainer.yml pull
    docker-compose -f docker-compose.portainer.yml up -d
fi

# Verify deployments
echo "Verifying deployments..."
docker ps

# Check service health
echo "Checking service health..."
for service in mongodb backend nginx; do
    if [ "$(docker-compose -f docker-compose.prod.yml ps -q $service)" ]; then
        echo "✅ $service is running"
    else
        echo "❌ $service failed to start"
        exit 1
    fi
done

echo "✨ All services deployed successfully!"
ENDSSH
