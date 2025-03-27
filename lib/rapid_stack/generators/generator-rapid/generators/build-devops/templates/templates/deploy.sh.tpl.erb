#!/bin/bash

# Export environment variables
export DOCKERHUB_USERNAME="${dockerhub_username}"
export DOCKERHUB_PASSWORD="${dockerhub_password}"
export APP_NAME="${app_name}"
export DOMAINS='${domains}'
export RAILS_MASTER_KEY="${rails_master_key}"
export FRONTEND_BUCKET_NAME="${frontend_bucket_name}"
export SPACES_REGION="${spaces_region}"
export DROPLET_IP="${droplet_ip}"

# Docker login with error handling
if [ -n "${dockerhub_username}" ] && [ -n "${dockerhub_password}" ]; then
    echo "Logging into Docker Hub..."
    echo "${dockerhub_password}" | docker login -u "${dockerhub_username}" --password-stdin
else
    echo "Error: Docker Hub credentials not set properly"
    exit 1
fi

# Check and start Graylog stack if not running
if [ ! "$(docker ps -q -f name=graylog)" ]; then
    echo "Starting Graylog stack..."
    docker-compose -f docker-compose.graylog.yml pull
    docker compose -f docker-compose.graylog.yml up -d --build

    # Wait for Graylog to be healthy
    echo "Waiting for Graylog to become ready..."
    COUNTER=1
    MAX_ATTEMPTS=30
    
    while [ "$COUNTER" -le "$MAX_ATTEMPTS" ]; do
        echo "Waiting for Graylog... attempt $COUNTER/$MAX_ATTEMPTS"
        if curl -s -f http://localhost:9001/ > /dev/null 2>&1; then
            echo "Graylog is ready!"
            break
        fi
        
        if [ "$COUNTER" -eq "$MAX_ATTEMPTS" ]; then
            echo "Graylog failed to become ready after $MAX_ATTEMPTS attempts"
            exit 1
        fi
        
        COUNTER=$((COUNTER + 1))
        sleep 10
    done
else
    echo "Graylog is already running"
fi

# Pull latest images
echo "Pulling latest images..."
docker-compose -f docker-compose.prod.yml pull

echo "Recreating containers with new configuration..."
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d

# Add restart policy for nginx container
echo "Setting up NGINX restart policy..."
NGINX_CONTAINER=$(docker ps -q -f name=${APP_NAME}-nginx)
if [ ! -z "$NGINX_CONTAINER" ]; then
  docker update --restart unless-stopped $NGINX_CONTAINER
fi

# Start Portainer if not already running
if [ ! "$(docker ps -q -f name=portainer)" ]; then
    echo "Starting Portainer..."
    docker-compose -f docker-compose.portainer.yml pull
    docker-compose -f docker-compose.portainer.yml up -d
fi


