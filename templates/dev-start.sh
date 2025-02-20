#!/bin/bash

echo "🚀 Starting development environment..."

# Function to check if a container is healthy
wait_for_healthy() {
    local service_name=$1
    local max_attempts=$2
    local attempt=1

    echo "⏳ Waiting for $service_name to be ready..."
    while [ $attempt -le $max_attempts ]; do
        if docker ps | grep "$service_name" | grep -q "healthy"; then
            echo "✅ $service_name is ready!"
            return 0
        fi
        echo "⏳ Attempt $attempt/$max_attempts - waiting for $service_name..."
        attempt=$((attempt + 1))
        sleep 5
    done
    echo "❌ $service_name failed to become healthy after $max_attempts attempts"
    return 1
}

# Function to initialize and unseal Vault
setup_vault() {
    echo "🔐 Setting up Vault..."
    VAULT_CONTAINER=$(docker ps -q -f name=vault)
    
    INIT_STATUS=$(docker exec "$VAULT_CONTAINER" vault status -format=json 2>/dev/null | jq -r .initialized)
    SEALED_STATUS=$(docker exec "$VAULT_CONTAINER" vault status -format=json 2>/dev/null | jq -r .sealed)
    
    if [ "$INIT_STATUS" = "false" ]; then
        echo "Initializing Vault..."
        INIT_OUTPUT=$(docker exec "$VAULT_CONTAINER" vault operator init -key-shares=1 -key-threshold=1 -format=json)
        
        UNSEAL_KEY=$(echo "$INIT_OUTPUT" | jq -r '.unseal_keys_b64[0]')
        ROOT_TOKEN=$(echo "$INIT_OUTPUT" | jq -r '.root_token')
        
        echo "
🔑 Vault Credentials (Development Only)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Unseal Key: $UNSEAL_KEY
Root Token: $ROOT_TOKEN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  Make note of these credentials if needed for development!
"
        echo "Unsealing Vault..."
        docker exec "$VAULT_CONTAINER" vault operator unseal "$UNSEAL_KEY"
        sleep 5
        configure_vault_secrets
    elif [ "$SEALED_STATUS" = "true" ]; then
        echo "Vault is initialized but sealed. Please provide the unseal key:"
        read -p "Unseal Key: " UNSEAL_KEY
        ROOT_TOKEN="<your-root-token>"  # Provide manually if needed
        echo "Unsealing Vault..."
        docker exec "$VAULT_CONTAINER" vault operator unseal "$UNSEAL_KEY"
    fi
    
    echo "✅ Vault setup complete!"
}

# Function to prompt for and store secrets in Vault
configure_vault_secrets() {
    echo "
🔐 Let's configure your application secrets
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    VAULT_CONTAINER=$(docker ps -q -f name=vault)
    
    echo "Enabling KV secrets engine..."
    docker exec -e VAULT_TOKEN="$ROOT_TOKEN" "$VAULT_CONTAINER" vault secrets enable -path=secret -version=2 kv || true
    
    echo "Creating access policy..."
    POLICY='path "secret/data/*" { capabilities = ["create", "read", "update", "delete", "list"] }'
    docker exec -i -e VAULT_TOKEN="$ROOT_TOKEN" "$VAULT_CONTAINER" vault policy write app-policy - <<EOF
${POLICY}
EOF

    echo "Generating new Rails credentials..."
    RAILS_MASTER_KEY=$(openssl rand -hex 16)
    echo "✅ Generated new Rails development key: $RAILS_MASTER_KEY"

    # Prompt for app settings
    read -p "App Name: " APP_NAME
    read -p "Domain: " DOMAIN
    read -p "Support Email: " SUPPORT_EMAIL
    read -p "Mailer From Address: " MAILER_FROM
    read -p "Mailer From Name: " MAILER_NAME
    echo ""

    echo "Generating secure keys..."
    JWT_SECRET=$(openssl rand -hex 64)
    SECRET_KEY_BASE=$(openssl rand -hex 64)

    # Generate Graylog credentials
    echo "Generating Graylog credentials..."
    GRAYLOG_PASSWORD_SECRET=$(openssl rand -hex 48)  # 48 hex bytes = 96 characters
    GRAYLOG_ROOT_PASSWORD=$(openssl rand -base64 12)  # Generate random password
    GRAYLOG_ROOT_PASSWORD_SHA2=$(echo -n "$GRAYLOG_ROOT_PASSWORD" | sha256sum | cut -d' ' -f1)

    echo "Storing secrets in Vault..."
    docker exec -e VAULT_TOKEN="$ROOT_TOKEN" -e VAULT_ADDR="http://127.0.0.1:8200" "$VAULT_CONTAINER" vault kv put secret/config \
        app_name="$APP_NAME" \
        app_domain="$DOMAIN" \
        app_support_email="$SUPPORT_EMAIL" \
        mailer_from_address="$MAILER_FROM" \
        mailer_from_name="$MAILER_NAME" \
        jwt_secret_key="$JWT_SECRET" \
        secret_key_base="$SECRET_KEY_BASE" \
        rails_master_key="$RAILS_MASTER_KEY" \
        vault_token="$ROOT_TOKEN" \
        rails_env="development" \
        mongodb_host="mongodb:27017" \
        mongodb_database="database_dev" \
        mongodb_user="mongouser" \
        mongodb_password="mongopass" \
        graylog_password_secret="$GRAYLOG_PASSWORD_SECRET" \
        graylog_root_password_sha2="$GRAYLOG_ROOT_PASSWORD_SHA2" \
        graylog_root_password="$GRAYLOG_ROOT_PASSWORD" \
        graylog_root_username="admin"

    echo "✅ Secrets stored successfully in Vault!"
    echo "🔑 Graylog login credentials:"
    echo "Username: admin"
    echo "Password: $GRAYLOG_ROOT_PASSWORD"
}

# Function to read secrets from Vault (for use later, if needed)
read_vault_secrets() {
    echo "📖 Reading secrets from Vault..."
    VAULT_CONTAINER=$(docker ps -q -f name=vault)
    VAULT_RESPONSE=$(docker exec -e VAULT_TOKEN="$ROOT_TOKEN" "$VAULT_CONTAINER" vault kv get -format=json secret/config)
    SECRETS=$(echo "$VAULT_RESPONSE" | jq -r '.data.data')
    
    export MONGODB_HOST=$(echo "$SECRETS" | jq -r '."mongodb_host"')
    export MONGODB_DATABASE=$(echo "$SECRETS" | jq -r '."mongodb_database"')
    export MONGODB_USER=$(echo "$SECRETS" | jq -r '."mongodb_user"')
    export MONGODB_PASSWORD=$(echo "$SECRETS" | jq -r '."mongodb_password"')
    export RAILS_MASTER_KEY=$(echo "$SECRETS" | jq -r '."rails_master_key"')
    export VAULT_TOKEN="$ROOT_TOKEN"
    
    # Export Graylog credentials
    export GRAYLOG_PASSWORD_SECRET=$(echo "$SECRETS" | jq -r '."graylog_password_secret"')
    export GRAYLOG_ROOT_PASSWORD_SHA2=$(echo "$SECRETS" | jq -r '."graylog_root_password_sha2"')
    export GRAYLOG_ROOT_USERNAME=$(echo "$SECRETS" | jq -r '."graylog_root_username"')
    export GRAYLOG_ROOT_PASSWORD=$(echo "$SECRETS" | jq -r '."graylog_root_password"')
    
    echo "✅ Secrets loaded from Vault"
}

# Function to export Vault token for services
export_variables() {
    echo "📖 Exporting Vault token..."
    export VAULT_TOKEN="$ROOT_TOKEN"
    echo "✅ Vault token exported"

    echo "📖 Exporting Vault Address..."
    export VAULT_ADDR="$VAULT_ADDR"
    echo "✅ Vault Address exported"
}

# Function to read MongoDB init credentials from Vault
read_mongodb_init_credentials() {
    echo "📖 Reading MongoDB init credentials from Vault..."
    VAULT_CONTAINER=$(docker ps -q -f name=vault)
    VAULT_RESPONSE=$(docker exec -e VAULT_TOKEN="$ROOT_TOKEN" "$VAULT_CONTAINER" vault kv get -format=json secret/config)
    SECRETS=$(echo "$VAULT_RESPONSE" | jq -r '.data.data')
    
    export MONGO_INITDB_DATABASE=$(echo "$SECRETS" | jq -r '."mongodb_database"')
    export MONGO_INITDB_ROOT_USERNAME=$(echo "$SECRETS" | jq -r '."mongodb_user"')
    export MONGO_INITDB_ROOT_PASSWORD=$(echo "$SECRETS" | jq -r '."mongodb_password"')
    
    # Check if any values are empty
    if [ -z "$MONGO_INITDB_DATABASE" ] || [ -z "$MONGO_INITDB_ROOT_USERNAME" ] || [ -z "$MONGO_INITDB_ROOT_PASSWORD" ]; then
        echo "❌ Error: One or more MongoDB credentials are empty!"
        return 1
    fi
    
    echo "✅ MongoDB init credentials loaded from Vault"
}

# Ensure the network exists
echo "🌐 Ensuring network exists..."
docker network create app-network 2>/dev/null || true

# Start Vault and wait for it
echo "🔒 Starting Vault..."
docker-compose -f devops/docker-compose.vault.yml up -d
sleep 5
setup_vault
wait_for_healthy "vault" 12

# Read MongoDB credentials and export Vault token
read_mongodb_init_credentials
read_vault_secrets
export_variables

echo "📝 Starting Graylog stack..."
docker-compose -f devops/docker-compose.graylog.yml up -d

echo "🐳 Starting Portainer..."
docker-compose -f devops/docker-compose.portainer.yml up -d

echo "🚀 Starting main application stack..."
docker-compose -f devops/docker-compose.yml up -d

# ----- Rails Credentials Initialization Block -----
echo "Initializing Rails credentials..."
docker-compose -f devops/docker-compose.yml run --rm \
  backend bash -c "cd /rails && \
    mkdir -p config/credentials && \
    rm -f config/credentials/development.* && \
    bin/rails credentials:edit --environment development"
# ----- End Credentials Block -----

echo "
✨ Development environment is ready!

🔒 Vault:      http://localhost:8200 (Token: $ROOT_TOKEN)
📊 Graylog:    http://localhost:9001 (admin/password123)
🐳 Portainer:  http://localhost:9000
🎯 Backend:    http://localhost:3000
🌐 Frontend:   http://localhost:8100

To view logs:
  All logs:     docker-compose -f devops/docker-compose.yml logs -f
  Backend:      docker-compose -f devops/docker-compose.yml logs -f backend
  Frontend:     docker-compose -f devops/docker-compose.yml logs -f frontend

To stop everything:
  ./dev-stop.sh
  ./dev-stop.sh --clean # to clean the volumes
"
