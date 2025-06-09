#!/bin/bash

# Production Schedule Deployment Script
# Usage: ./deploy.sh [staging|production] [tag]

set -e

# Configuration
DOCKER_REGISTRY="registry.gitlab.gebesaia.com"
PROJECT_NAME="gebesa/mps_sfc"
SERVER_IMAGE="$DOCKER_REGISTRY/$PROJECT_NAME/server"
CLIENT_IMAGE="$DOCKER_REGISTRY/$PROJECT_NAME/client"

# Default values
ENVIRONMENT=${1:-staging}
IMAGE_TAG=${2:-latest}

# Environment-specific configuration
if [ "$ENVIRONMENT" = "production" ]; then
    DEPLOY_HOST="$PRODUCTION_HOST"
    DEPLOY_USER="$PRODUCTION_USER"
    DEPLOY_PATH="/opt/production-schedule"
    COMPOSE_FILE="docker-compose.yml"
    SSH_KEY="$PRODUCTION_SSH_PRIVATE_KEY"
elif [ "$ENVIRONMENT" = "staging" ]; then
    DEPLOY_HOST="$STAGING_HOST"
    DEPLOY_USER="$STAGING_USER"
    DEPLOY_PATH="/opt/production-schedule-staging"
    COMPOSE_FILE="docker-compose.staging.yml"
    SSH_KEY="$STAGING_SSH_PRIVATE_KEY"
else
    echo "Error: Environment must be 'staging' or 'production'"
    exit 1
fi

echo "================================================"
echo "Deploying Production Schedule to $ENVIRONMENT"
echo "Environment: $ENVIRONMENT"
echo "Host: $DEPLOY_HOST"
echo "User: $DEPLOY_USER"
echo "Image Tag: $IMAGE_TAG"
echo "================================================"

# Verify required environment variables
if [ -z "$DEPLOY_HOST" ] || [ -z "$DEPLOY_USER" ]; then
    echo "Error: Missing required environment variables"
    echo "Required: ${ENVIRONMENT^^}_HOST, ${ENVIRONMENT^^}_USER"
    exit 1
fi

# Setup SSH
setup_ssh() {
    echo "Setting up SSH connection..."
    eval $(ssh-agent -s)
    
    if [ -n "$SSH_KEY" ]; then
        echo "$SSH_KEY" | tr -d '\r' | ssh-add -
    fi
    
    mkdir -p ~/.ssh
    chmod 700 ~/.ssh
    ssh-keyscan -H $DEPLOY_HOST >> ~/.ssh/known_hosts 2>/dev/null || true
}

# Create docker-compose file
create_compose_file() {
    echo "Creating Docker Compose configuration..."
    
    local server_port=5001
    local client_port=8090
    local network_name="mps_network"
    local server_container="production_server"
    local client_container="production_client"
    
    if [ "$ENVIRONMENT" = "staging" ]; then
        network_name="mps_network_staging"
        server_container="production_server_staging"
        client_container="production_client_staging"
    fi
    
    ssh $DEPLOY_USER@$DEPLOY_HOST "
        cd $DEPLOY_PATH || mkdir -p $DEPLOY_PATH
        cd $DEPLOY_PATH
        
        cat > $COMPOSE_FILE << 'EOF'
version: '3.8'
services:
  server:
    image: $SERVER_IMAGE:$IMAGE_TAG
    container_name: $server_container
    restart: always
    environment:
      NODE_ENV: $ENVIRONMENT
      PORT: $server_port
    ports:
      - '$server_port:$server_port'
    volumes:
      - ./production_schedule.json:/app/production_schedule.json
      - ./server/.env:/app/.env
    networks:
      - $network_name

  client:
    image: $CLIENT_IMAGE:$IMAGE_TAG
    container_name: $client_container
    restart: always
    depends_on:
      - server
    ports:
      - '$client_port:8090'
    networks:
      - $network_name

networks:
  $network_name:
    driver: bridge

volumes:
  shared_data${ENVIRONMENT:+_$ENVIRONMENT}:
EOF
    "
}

# Deploy application
deploy() {
    echo "Deploying to $ENVIRONMENT environment..."
    
    # Create backup for production
    if [ "$ENVIRONMENT" = "production" ]; then
        echo "Creating backup..."
        ssh $DEPLOY_USER@$DEPLOY_HOST "
            cd $DEPLOY_PATH
            if [ -f docker-compose.yml ]; then
                cp docker-compose.yml docker-compose.backup.yml
                echo 'Backup created successfully'
            fi
        " || echo "No existing deployment to backup"
    fi
    
    # Stop existing containers
    echo "Stopping existing containers..."
    ssh $DEPLOY_USER@$DEPLOY_HOST "
        cd $DEPLOY_PATH 2>/dev/null || mkdir -p $DEPLOY_PATH
        cd $DEPLOY_PATH
        docker-compose -f $COMPOSE_FILE down 2>/dev/null || true
        docker system prune -f
    "
    
    # Create new compose file
    create_compose_file
    
    # Pull and start services
    echo "Pulling images and starting services..."
    ssh $DEPLOY_USER@$DEPLOY_HOST "
        cd $DEPLOY_PATH
        docker-compose -f $COMPOSE_FILE pull
        docker-compose -f $COMPOSE_FILE up -d
        sleep 30
        docker-compose -f $COMPOSE_FILE ps
    "
    
    # Health checks for production
    if [ "$ENVIRONMENT" = "production" ]; then
        echo "Running health checks..."
        ssh $DEPLOY_USER@$DEPLOY_HOST "
            sleep 60
            if curl -f http://localhost:5001/api/health > /dev/null 2>&1; then
                echo 'Server health check passed'
            else
                echo 'Server health check failed'
                exit 1
            fi
            if curl -f http://localhost:8090 > /dev/null 2>&1; then
                echo 'Client health check passed'
            else
                echo 'Client health check failed'
                exit 1
            fi
        "
    fi
}

# Rollback function (production only)
rollback() {
    if [ "$ENVIRONMENT" != "production" ]; then
        echo "Rollback is only available for production environment"
        exit 1
    fi
    
    echo "Rolling back production deployment..."
    ssh $DEPLOY_USER@$DEPLOY_HOST "
        cd $DEPLOY_PATH
        if [ -f docker-compose.backup.yml ]; then
            docker-compose down
            cp docker-compose.backup.yml docker-compose.yml
            docker-compose up -d
            echo 'Rollback completed successfully'
        else
            echo 'No backup found for rollback'
            exit 1
        fi
    "
}

# Main execution
main() {
    case "$1" in
        rollback)
            setup_ssh
            rollback
            ;;
        *)
            setup_ssh
            deploy
            ;;
    esac
    
    echo "================================================"
    echo "Deployment completed successfully!"
    echo "Environment: $ENVIRONMENT"
    if [ "$ENVIRONMENT" = "staging" ]; then
        echo "Application URL: http://$DEPLOY_HOST:8090"
    else
        echo "Application URL: http://$DEPLOY_HOST:8090"
    fi
    echo "================================================"
}

# Handle rollback command
if [ "$1" = "rollback" ]; then
    main rollback
else
    main
fi
