#!/bin/bash

# Wait for Vault to start
sleep 5

# Check if Vault is initialized
INIT_STATUS=$(curl -s http://127.0.0.1:8200/v1/sys/init | jq -r .initialized)

if [ "$INIT_STATUS" = "false" ]; then
    echo "Initializing Vault..."
    
    # Initialize Vault and capture the output
    INIT_RESPONSE=$(curl -s -X PUT -d '{"secret_shares": 1, "secret_threshold": 1}' \
                        http://127.0.0.1:8200/v1/sys/init)
    
    # Extract unseal key and root token
    UNSEAL_KEY=$(echo "$INIT_RESPONSE" | jq -r .keys[0])
    ROOT_TOKEN=$(echo "$INIT_RESPONSE" | jq -r .root_token)
    
    echo "Vault initialized!"
    echo "Unseal Key: $UNSEAL_KEY"
    echo "Root Token: $ROOT_TOKEN"
    
    # Store these securely (you'll need them for future operations)
    echo "$INIT_RESPONSE" > /vault/file/init.json
    chmod 600 /vault/file/init.json
else
    echo "Vault is already initialized"
    if [ -f /vault/file/init.json ]; then
        UNSEAL_KEY=$(cat /vault/file/init.json | jq -r .keys[0])
        ROOT_TOKEN=$(cat /vault/file/init.json | jq -r .root_token)
    else
        echo "Error: Cannot find initialization data"
        exit 1
    fi
fi

# Check if Vault is sealed
SEAL_STATUS=$(curl -s http://127.0.0.1:8200/v1/sys/seal-status | jq -r .sealed)

if [ "$SEAL_STATUS" = "true" ]; then
    echo "Unsealing Vault..."
    curl -s -X PUT -d "{\"key\": \"$UNSEAL_KEY\"}" http://127.0.0.1:8200/v1/sys/unseal
fi

# Wait for Vault to be ready
sleep 2

# Enable KV secrets engine version 2
curl -s -X POST -H "X-Vault-Token: $ROOT_TOKEN" \
     -d '{"type": "kv", "options": {"version": "2"}}' \
     http://127.0.0.1:8200/v1/sys/mounts/secret

# Store MongoDB credentials
curl -s -X POST -H "X-Vault-Token: $ROOT_TOKEN" \
     -d '{"data": {"username": "mongouser", "password": "mongopass"}}' \
     http://127.0.0.1:8200/v1/secret/data/mongodb

echo "Vault setup completed!" 