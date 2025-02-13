FROM nginx:alpine

# Install gettext for envsubst
RUN apk add --no-cache gettext jq

# Copy nginx configuration template
COPY nginx.conf /etc/nginx/conf.d/default.conf.template

# Create startup script
COPY <<'EOF' /docker-entrypoint.sh
#!/bin/sh
# Parse DOMAINS JSON array and create server_name string
# Debug: Print raw values
echo "Raw DOMAINS value: $DOMAINS"

# Parse comma-separated string into space-separated string
DOMAIN_LIST=$(echo $DOMAINS | tr ',' ' ')

# Debug: Print parsed value
echo "Parsed DOMAIN_LIST: $DOMAIN_LIST"

# Debug: Print bucket and region values
echo "FRONTEND_BUCKET_NAME: $FRONTEND_BUCKET_NAME"
echo "SPACES_REGION: $SPACES_REGION"
echo "Constructed URL: ${FRONTEND_BUCKET_NAME}.${SPACES_REGION}.digitaloceanspaces.com"

# Export variables for envsubst
export DOMAIN_LIST
export APP_NAME
export FRONTEND_BUCKET_NAME
export SPACES_REGION

# Debug: Print all exported variables
env | grep -E 'DOMAIN_LIST|APP_NAME|FRONTEND_BUCKET_NAME|SPACES_REGION'

# Replace variables in nginx config
envsubst '${DOMAIN_LIST} ${APP_NAME} ${FRONTEND_BUCKET_NAME} ${SPACES_REGION}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

# Debug: Print final nginx config
echo "Final nginx config:"
cat /etc/nginx/conf.d/default.conf

# Start nginx
nginx -g 'daemon off;'
EOF

RUN chmod +x /docker-entrypoint.sh

EXPOSE 80

# Set the entrypoint
ENTRYPOINT ["/docker-entrypoint.sh"]
