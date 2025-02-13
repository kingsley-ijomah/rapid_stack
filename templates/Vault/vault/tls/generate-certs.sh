#!/bin/bash

# Generate private key
openssl genrsa -out vault.key 4096

# Generate CSR
openssl req -new -key vault.key -out vault.csr -subj "/CN=vault.local/O=Your Organization/C=US"

# Generate self-signed certificate
openssl x509 -req -in vault.csr -signkey vault.key -out vault.crt -days 365

# Set proper permissions
chmod 600 vault.key
chmod 644 vault.crt

# Clean up CSR
rm vault.csr

echo "TLS certificates generated successfully!" 