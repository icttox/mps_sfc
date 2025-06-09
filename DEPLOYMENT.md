# Production Schedule - Deployment Guide

## Overview
This document describes the CI/CD pipeline setup for the Production Schedule application using GitLab CI/CD with automatic staging and manual production deployments.

## Architecture
- **Frontend**: React with Vite (Nginx container)
- **Backend**: Node.js/Express (Node.js container)
- **Database**: PostgreSQL
- **Container Registry**: GitLab Container Registry
- **Deployment**: Docker Compose on remote servers

## Pipeline Stages

### 1. Test Stage
- Runs on all branches (main, develop, merge_requests)
- Installs dependencies for both client and server
- Runs linting on client code
- Builds client application to verify build process
- Generates test artifacts

### 2. Build Stage
- Runs only on main and develop branches
- Builds Docker images for both client and server
- Tags images with commit SHA and 'latest'
- Pushes images to GitLab Container Registry
- Cleans up local images to save space

### 3. Deploy Staging Stage
- **Automatic deployment** on main and develop branches
- Deploys to staging environment using SSH
- Creates staging-specific Docker Compose configuration
- Pulls latest images and starts containers
- Provides staging environment URL

### 4. Deploy Production Stage
- **Manual deployment** (requires approval) on main branch only
- Creates backup of current production deployment
- Deploys to production environment using SSH
- Includes health checks post-deployment
- Provides production environment URL
- Includes rollback job for emergency situations

## Required Environment Variables

Add these variables in GitLab CI/CD Settings > Variables:

### Docker Registry
- `CI_REGISTRY_USER`: GitLab registry username
- `CI_REGISTRY_PASSWORD`: GitLab registry password

### Staging Environment
- `STAGING_HOST`: Staging server hostname/IP
- `STAGING_USER`: SSH username for staging server
- `STAGING_SSH_PRIVATE_KEY`: SSH private key for staging access

### Production Environment
- `PRODUCTION_HOST`: Production server hostname/IP
- `PRODUCTION_USER`: SSH username for production server
- `PRODUCTION_SSH_PRIVATE_KEY`: SSH private key for production access

## Server Setup Requirements

Both staging and production servers need:

1. **Docker and Docker Compose installed**
2. **SSH access configured**
3. **Directory structure**:
   - Staging: `/opt/production-schedule-staging/`
   - Production: `/opt/production-schedule/`
4. **Environment files**:
   - `server/.env` (environment configuration)

## Deployment Process

### Staging Deployment
1. Push to `main` or `develop` branch
2. Pipeline automatically runs test → build → deploy-staging
3. Application available at staging URL
4. Test features in staging environment

### Production Deployment
1. Ensure staging tests pass
2. Navigate to GitLab CI/CD pipeline
3. Click "Play" button on `deploy_production` job
4. Monitor deployment logs
5. Verify health checks pass
6. Application available at production URL

### Rollback Process
1. Navigate to GitLab CI/CD pipeline
2. Click "Play" button on `rollback_production` job
3. System restores previous backup automatically

## File Structure

```
/opt/production-schedule/          # Production
├── docker-compose.yml            # Main compose file
├── docker-compose.backup.yml     # Automatic backup
└── server/
    └── .env                      # Environment config

/opt/production-schedule-staging/  # Staging
├── docker-compose.staging.yml    # Staging compose file
└── server/
    └── .env                      # Environment config
```

## Health Checks

The production deployment includes automatic health checks:
- Server health endpoint: `http://localhost:5001/health`
- Client availability: `http://localhost:8090`

If health checks fail, the deployment will be marked as failed.

## Security Considerations

1. **SSH Keys**: Store as GitLab CI/CD variables with protection enabled
2. **Registry Access**: Use GitLab CI tokens for Docker registry authentication
3. **Environment Files**: Ensure `.env` files contain proper database credentials
4. **Firewall**: Configure servers to allow only necessary ports (5001, 8090)

## Monitoring and Logs

- **Container Logs**: `docker-compose logs -f`
- **System Resources**: Monitor CPU, memory, and disk usage
- **Application Logs**: Check application-specific logs in containers

## Troubleshooting

### Common Issues
1. **SSH Connection Failed**: Verify SSH keys and host access
2. **Docker Build Failed**: Check Dockerfile syntax and dependencies
3. **Health Check Failed**: Verify application is responding on expected ports
4. **Registry Push Failed**: Check registry credentials and permissions

### Debug Commands
```bash
# Check container status
docker-compose ps

# View container logs
docker-compose logs [service-name]

# Restart services
docker-compose restart

# Check system resources
docker system df
```

## Best Practices

1. **Test in Staging**: Always test changes in staging before production
2. **Monitor Deployments**: Watch pipeline logs during deployments
3. **Backup Strategy**: Regular backups are created automatically
4. **Resource Management**: Monitor server resources and clean up unused images
5. **Documentation**: Keep this deployment guide updated with any changes

## Contact

For deployment issues or questions, contact the development team or check GitLab CI/CD pipeline logs for detailed error information.
