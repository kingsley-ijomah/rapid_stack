Backend will have its own .github workflow to push up a new image to dockerhub, the same will happen with Frontend, then all we need to do is perform a deployment here to Digital Ocean.

# Running Terraform

1. Install Terraform: https://learn.hashicorp.com/terraform/getting-started/install.html
2. Initialize Terraform: `terraform init`
3. Validate the configuration files: `terraform validate`
4. Plan the deployment: `terraform plan -out tfplan`
5. Apply the plan: `terraform apply tfplan`
6. Destroy the deployment: `terraform destroy`

terraform -chdir=terraform init | plan | apply

### Running Docker images
- docker-compose up --build
- docker-compose down
- docker-compose -f docker-compose.prod.yml up
- docker-compose -f docker-compose.prod.yml down -v


### TODO's

- [x] Provision DO Droplet with terraform
- [x] Install Docker locally
- [x] Dockerize rails application
- [x] Dockerize django database
- [x] Development compose file
- [x] Production compose file
- [x] Dockerize frontend application
- [x] Create docker compose
- [x] Push up images to docker hub
- [x] Setup SSL locally with "lets encrypt"
- [x] Install ansible within project
- [x] Deploy project into cloud

- [ ] Remove hard coded domain names ( frontend - backend - devops)
- [ ] Minimize building images if not required
- [ ] Trigger devops deploy automatically
- [ ] Combine nginx and frontend


cd /home/deployuser
docker-compose -f docker-compose.prod.yml down -v
docker rmi kingsleyijomah/codehance-backend:latest
docker rmi kingsleyijomah/codehance-frontend:latest
docker rmi kingsleyijomah/codehance-nginx:latest
docker rmi mongo:7.0
docker rmi $(docker images -q)
docker system prune -a --volumes
docker-compose -f docker-compose.prod.yml up -d

docker-compose -f docker-compose.prod.yml ps -a
watch 'docker logs --tail 50 deployuser-nginx-1'
docker exec deployuser-nginx-1 nginx -g 'daemon off;' -T
docker exec deployuser-nginx-1 ls -la /usr/share/nginx/html

docker exec deployuser-nginx-1 tail -f /var/log/nginx/coursehance.access.log
docker exec deployuser-nginx-1 tail -f /var/log/nginx/coursehance.error.log
docker exec deployuser-nginx-1 tail -f /var/log/nginx/coursehance-subdomain.access.log
docker exec deployuser-nginx-1 tail -f /var/log/nginx/coursehance-subdomain.error.log


# test process
docker-compose -f docker-compose.prod.yml up -d
#### gives ( give you unseal keys and root token )
docker exec -it <vault-container-id> vault operator init
#### Unseal Vault 
#### (needs after restart unless auto-unseal is configured)
docker exec -it <vault-container-id> vault operator unseal
