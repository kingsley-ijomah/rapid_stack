#!/bin/bash
# deploy-vault.sh

# Check if required environment variables are set
if [ -z "$SSH_PRIVATE_KEY" ] || [ -z "$DROPLET_IP" ]; then
    echo "❌ Required environment variables SSH_PRIVATE_KEY and DROPLET_IP must be set"
    exit 1
fi

# Check for optional force redeploy flag
FORCE_DEPLOY=false
if [ "$1" = "--redeploy" ]; then
    FORCE_DEPLOY=true
fi

echo "🔑 Setting up SSH..."
mkdir -p ~/.ssh
echo "$SSH_PRIVATE_KEY" > ~/.ssh/id_rsa
chmod 600 ~/.ssh/id_rsa
ssh-keyscan -H "$DROPLET_IP" >> ~/.ssh/known_hosts

echo "📂 Copying files to server..."
scp docker-compose.vault.yml deployuser@"$DROPLET_IP":/home/deployuser/
scp deploy-vault.sh deployuser@"$DROPLET_IP":/home/deployuser/

echo "🚀 Deploying Vault..."
# Pass the FORCE_DEPLOY flag to the remote script via the first argument.
ssh deployuser@"$DROPLET_IP" "bash -s" "$FORCE_DEPLOY" << 'ENDSSH'
# Retrieve the FORCE_DEPLOY flag from the first argument on the remote host.
FORCE_DEPLOY="$1"
shift

# Create the Docker network if it doesn't exist
docker network create app-network 2>/dev/null || true

# Check if the Vault container is already running
VAULT_CONTAINER=$(docker ps -qf "name=vault" | head -n1)
if [ -n "$VAULT_CONTAINER" ]; then
    if [ "$FORCE_DEPLOY" != "true" ]; then
        echo "ℹ️  Vault is already up and running. Skipping redeployment."
        exit 0
    else
        echo "🔄 Force redeploy flag detected. Pulling latest changes and rebuilding Vault..."
        cd /home/deployuser
        docker-compose -f docker-compose.vault.yml pull
        docker-compose -f docker-compose.vault.yml up -d --build
    fi
else
    echo "ℹ️  Vault is not currently running. Deploying Vault..."
    cd /home/deployuser
    docker-compose -f docker-compose.vault.yml up -d
fi

echo "⏳ Waiting for Vault to start..."
sleep 10

VAULT_CONTAINER=$(docker ps -qf "name=vault" | head -n1)
if [ -z "$VAULT_CONTAINER" ]; then
    echo "❌ Vault container not found"
    exit 1
fi

echo "🔍 Found Vault container: $(docker ps --format '{{.Names}}' -f "id=$VAULT_CONTAINER")"

# Check if Vault is initialized
INIT_STATUS=$(docker exec "$VAULT_CONTAINER" vault status -format=json 2>/dev/null | jq -r .initialized || echo "false")
if [ "$INIT_STATUS" = "false" ]; then
    echo "🔐 Initializing Vault..."
    INIT_OUTPUT=$(docker exec "$VAULT_CONTAINER" vault operator init -key-shares=1 -key-threshold=1 -format=json)
    mkdir -p ~/.vault
    echo "$INIT_OUTPUT" > ~/.vault/vault_credentials.txt
    chmod 600 ~/.vault/vault_credentials.txt
    UNSEAL_KEY=$(echo "$INIT_OUTPUT" | jq -r .unseal_keys_b64[0])
    ROOT_TOKEN=$(echo "$INIT_OUTPUT" | jq -r .root_token)
    docker exec "$VAULT_CONTAINER" vault operator unseal "$UNSEAL_KEY"
    echo "✅ Vault initialized and unsealed"

    echo "Enabling KV secrets engine..."
    docker exec -e VAULT_TOKEN="$ROOT_TOKEN" "$VAULT_CONTAINER" vault secrets enable -path=secret -version=2 kv || true

    echo "Creating access policy..."
    POLICY='path "secret/data/*" { capabilities = ["create", "read", "update", "delete", "list"] }'
    docker exec -i -e VAULT_TOKEN="$ROOT_TOKEN" "$VAULT_CONTAINER" vault policy write app-policy - <<EOF
${POLICY}
EOF

    # Generate additional secrets
    VAULT_TOKEN_PAIR="vault_token=$ROOT_TOKEN"
    JWT_SECRET_KEY_PAIR="jwt_secret_key=$(openssl rand -hex 64)"
    SECRET_KEY_BASE_PAIR="secret_key_base=$(openssl rand -hex 64)"
    RAILS_ENV_PAIR="rails_env=production"
    RAILS_MASTER_KEY_PAIR="rails_master_key=$(openssl rand -hex 16)"

    # Generate Graylog credentials
    echo "Generating Graylog credentials..."
    GRAYLOG_PASSWORD_SECRET=$(openssl rand -hex 48)  # 48 hex bytes = 96 characters
    GRAYLOG_ROOT_PASSWORD=$(openssl rand -base64 12)  # Generate random password
    GRAYLOG_ROOT_PASSWORD_SHA2=$(echo -n "$GRAYLOG_ROOT_PASSWORD" | sha256sum | cut -d' ' -f1)
    
    # Add Graylog credentials to additional args
    GRAYLOG_ARGS="graylog_password_secret=$GRAYLOG_PASSWORD_SECRET \
        graylog_root_password_sha2=$GRAYLOG_ROOT_PASSWORD_SHA2 \
        graylog_root_password=$GRAYLOG_ROOT_PASSWORD \
        graylog_root_username=admin"

    ADDITIONAL_ARGS="$VAULT_TOKEN_PAIR $JWT_SECRET_KEY_PAIR $SECRET_KEY_BASE_PAIR $RAILS_ENV_PAIR $RAILS_MASTER_KEY_PAIR $GRAYLOG_ARGS"

    # Import secrets: merge file-based secrets (if any) with the additional secrets.
    if [ -f ~/.vault/vault_secrets.vault ]; then
        echo "📥 Found vault_secrets.vault file. Importing secrets..."
        SECRETS_CONTENT=$(cat ~/.vault/vault_secrets.vault | tr -d '\000-\031')
        VAULT_OBJECT=$(echo "$SECRETS_CONTENT" | jq -r 'if type=="string" then fromjson else . end')
        readarray -t VAULT_ARRAY < <(echo "$VAULT_OBJECT" | jq -r 'to_entries | .[] | "\(.key)=\(.value|tostring)"')
        # Import both the file secrets and the additional ones.
        docker exec -e VAULT_TOKEN="$ROOT_TOKEN" -e VAULT_ADDR="http://127.0.0.1:8200" "$VAULT_CONTAINER" \
            vault kv put secret/config "${VAULT_ARRAY[@]}" $ADDITIONAL_ARGS
        echo "✅ Secrets imported successfully!"
    else
        echo "No vault_secrets.vault file found. Importing additional secrets only..."
        docker exec -e VAULT_TOKEN="$ROOT_TOKEN" -e VAULT_ADDR="http://127.0.0.1:8200" "$VAULT_CONTAINER" \
            vault kv put secret/config $ADDITIONAL_ARGS
        echo "✅ Additional secrets imported successfully!"
    fi

else
    echo "ℹ️  Vault is already initialized"
    SEALED_STATUS=$(docker exec "$VAULT_CONTAINER" vault status -format=json 2>/dev/null | jq -r .sealed || echo "true")
    if [ "$SEALED_STATUS" = "true" ]; then
        echo "🔓 Unsealing Vault..."
        if [ -f ~/.vault/vault_credentials.txt ]; then
            UNSEAL_KEY=$(cat ~/.vault/vault_credentials.txt | jq -r .unseal_keys_b64[0])
            docker exec "$VAULT_CONTAINER" vault operator unseal "$UNSEAL_KEY"
            echo "✅ Vault unsealed"
        else
            echo "❌ Cannot find vault credentials file"
            exit 1
        fi
    else
        echo "✅ Vault is already unsealed"
    fi
fi

echo "📊 Checking Vault status..."
docker exec "$VAULT_CONTAINER" vault status || true
ENDSSH
