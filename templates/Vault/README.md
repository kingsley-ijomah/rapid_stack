# Vault Deployment Guide

This document explains how the Vault deployment process works using our GitHub Actions workflow.

## Overview

The deployment process is automated through GitHub Actions and is triggered by:
- Pushes to the `main` branch
- Successful completion of the "Build and Push Vault Docker Image" workflow

## Deployment Process

The deployment workflow (`deploy.yml`) performs the following steps:

1. **File Transfer**
   - Copies `docker-compose.vault.yml` to the deployment server

2. **Container Deployment**
   - Stops and removes existing Vault containers
   - Cleans up unused Docker images
   - Pulls fresh images
   - Starts the Vault service
   - Sets up NGINX restart policies

3. **Vault Initialization**
   - Checks if Vault needs initialization
   - If uninitialized:
     - Generates encryption keys and root token
     - Saves credentials securely to `/home/deployuser/.vault/vault_credentials.txt`
     - Sets appropriate permissions on credential files
     - Formats credentials file with timestamp, keys, and usage notes

4. **Vault Unsealing**
   - Checks if Vault is sealed
   - If sealed:
     - Retrieves the most recent credentials
     - Uses 3 unseal keys to unlock Vault
     - Logs in using the root token

5. **Secret Population**
   - Checks for secrets file at `/home/deployuser/.vault/vault_secrets.vault`
   - If found:
     - Copies secrets into Vault container
     - Enables KV v2 secrets engine at path 'secret'
     - Loads secrets from JSON file into 'secret/config'
     - Cleans up temporary files

6. **Verifying Secret Storage**
   After SSH'ing into the server, navigate to the deployuser home directory and run these commands to verify secrets were stored correctly:
   ```bash
   # Get the Vault container ID
   VAULT_CONTAINER=$(docker ps -q -f name=vault)

   # Get the root token
   ROOT_TOKEN=$(grep "Initial Root Token:" /home/deployuser/.vault/vault_credentials.txt | cut -d' ' -f4)

   # List all secrets
   docker exec $VAULT_CONTAINER sh -c "VAULT_TOKEN=$ROOT_TOKEN vault kv list secret/"

   # Get specific secret
   docker exec $VAULT_CONTAINER sh -c "VAULT_TOKEN=$ROOT_TOKEN vault kv get secret/config"

   # Get specific path
   docker exec $VAULT_CONTAINER sh -c "VAULT_TOKEN=$ROOT_TOKEN vault kv get secret/config/infrastructure"
   ```

## Security Notes

- Vault credentials are stored securely on the deployment server
- The initialization process requires 3 out of 5 keys for unsealing
- Credentials are saved with restricted permissions (600)
- The root token should be securely stored and used only for initial setup
- Secrets are stored in KV v2 engine for versioning support
- All sensitive files are cleaned up after use

## Todo
- [x] unseal vault automatically
- [x] store secrets file in server
- [x] populate vault with secrets
- [x] read vault secrets into NGINX
- [x] read vault secrets into FrontEnd
- [ ] read vault secrets into DevOps
