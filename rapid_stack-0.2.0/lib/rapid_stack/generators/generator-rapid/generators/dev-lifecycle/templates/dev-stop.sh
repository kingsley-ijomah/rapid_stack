#!/bin/bash

# Function to show usage
show_help() {
    echo "Usage: $0 [-c|--clean]"
    echo "Options:"
    echo "  -c, --clean    Remove all volumes for a fresh start"
}

# Parse command line arguments
CLEAN=false
while [[ $# -gt 0 ]]; do
    case $1 in
        -c|--clean)
            CLEAN=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

echo "🛑 Stopping development environment..."

# Force stop all containers that might be using our volumes
echo "Stopping all related containers..."
docker ps -q -f name=mongodb -f name=graylog -f name=elastic -f name=portainer -f name=vault | xargs -r docker stop

# Stop all stacks simultaneously
echo "Bringing down docker-compose stacks..."
docker-compose -f devops/docker-compose.yml down --volumes --remove-orphans
docker-compose -f devops/docker-compose.portainer.yml down --volumes --remove-orphans
docker-compose -f devops/docker-compose.graylog.yml down --volumes --remove-orphans
docker-compose -f devops/docker-compose.vault.yml down --volumes --remove-orphans

if [ "$CLEAN" = true ]; then
    echo "🧹 Cleaning up volumes..."
    
    echo "Listing current volumes..."
    docker volume ls
    
    echo "Attempting to remove volumes..."
    # Remove specific volumes by their exact names
    for volume in \
        devops_mongodb_data \
        devops_mongo_data_graylog \
        devops_es_data \
        devops_graylog_data \
        portainer_data \
        vault_vault-data \
        vault_vault-logs; do
        echo "Removing $volume..."
        docker volume rm -f "$volume" || echo "Failed to remove $volume"
    done
    
    echo "Checking for remaining volumes..."
    REMAINING_VOLUMES=$(docker volume ls -q -f name=mongodb -f name=graylog -f name=elastic -f name=portainer -f name=vault)
    if [ -n "$REMAINING_VOLUMES" ]; then
        echo "Removing remaining volumes..."
        echo "$REMAINING_VOLUMES" | xargs -r docker volume rm -f
    fi
    
    echo "Final volume list:"
    docker volume ls
fi

echo "✨ All services stopped successfully!" 