# Stop and remove all deployuser containers specifically
cd /home/deployuser &&
docker-compose -f docker-compose.prod.yml ps -a

docker rm -f deployuser-backend-1 deployuser-mongo-init-1 deployuser-mongo-replica-init-1 deployuser-mongodb-1 deployuser-nginx-1

# Remove the specific images
docker rmi kingsleyijomah/dog-walk-app-backend:latest
docker rmi kingsleyijomah/dog-walk-app-nginx:latest
docker rmi mongo:7.0

# Remove associated volumes
docker volume rm deployuser_mongodb_data deployuser_mongodb_keyfile deployuser_nginx_logs 

# logs
cd /home/deployuser &&
docker-compose -f docker-compose.prod.yml logs -f nginx

cd /home/deployuser &&
docker-compose -f docker-compose.prod.yml ps -a

cd /home/deployuser &&
docker-compose -f docker-compose.prod.yml logs backend

cd /home/deployuser &&
docker-compose -f docker-compose.portainer.yml up -d
docker-compose -f docker-compose.prod.yml ps -a

cd /home/deployuser &&
docker-compose -f docker-compose.vault.yml logs graylog



docker rmi -f $(docker images -aq) &&
docker volume rm -f $(docker volume ls -q) &&
docker network prune -f &&
docker system prune -af --volumes

docker logs deployuser-backend-1

cd /home/deployuser
echo "Stopping and removing all containers..."
docker-compose -f docker-compose.prod.yml down -v
docker-compose -f docker-compose.graylog.yml down -v
docker-compose -f docker-compose.vault.yml down -v
docker-compose -f docker-compose.portainer.yml down -v

echo "Removing all related images..."
docker rmi $(docker images -q) -f || true

echo "Cleaning up system..."
docker system prune -af --volumes

echo "Creating fresh network..."
docker network create app-network || true

