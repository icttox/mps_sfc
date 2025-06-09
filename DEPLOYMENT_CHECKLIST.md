# Deployment Setup Checklist

## Pre-Deployment Setup

### 1. GitLab CI/CD Variables Configuration
Navigate to your GitLab project → Settings → CI/CD → Variables and add:

#### Docker Registry Variables
- [ ] `CI_REGISTRY_USER` - Your GitLab username
- [ ] `CI_REGISTRY_PASSWORD` - Your GitLab access token or password

#### Staging Environment Variables
- [ ] `STAGING_HOST` - Staging server IP/hostname (e.g., `192.168.1.100`)
- [ ] `STAGING_USER` - SSH username for staging (e.g., `deploy`)
- [ ] `STAGING_SSH_PRIVATE_KEY` - SSH private key content (mark as protected)

#### Production Environment Variables
- [ ] `PRODUCTION_HOST` - Production server IP/hostname (e.g., `192.168.1.101`)
- [ ] `PRODUCTION_USER` - SSH username for production (e.g., `deploy`)
- [ ] `PRODUCTION_SSH_PRIVATE_KEY` - SSH private key content (mark as protected)

### 2. Server Preparation

#### Both Staging and Production Servers:

##### Install Required Software
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installations
docker --version
docker-compose --version
```

##### Create Directory Structure
```bash
# For staging server
sudo mkdir -p /opt/production-schedule-staging/server
sudo chown -R $USER:$USER /opt/production-schedule-staging

# For production server
sudo mkdir -p /opt/production-schedule/server
sudo chown -R $USER:$USER /opt/production-schedule
```

##### Setup SSH Access
- [ ] Generate SSH key pair: `ssh-keygen -t rsa -b 4096 -C "deployment-key"`
- [ ] Copy public key to servers: `ssh-copy-id user@server-ip`
- [ ] Test SSH access: `ssh user@server-ip`
- [ ] Add private key to GitLab CI/CD variables

### 3. Environment Configuration

#### Create Environment Files on Servers

##### Staging Server (`/opt/production-schedule-staging/server/.env`)
```bash
NODE_ENV=staging
PORT=5001
DB_HOST=your_staging_db_host
DB_PORT=5432
DB_NAME=production_schedule_staging
DB_USER=your_staging_db_user
DB_PASSWORD=your_staging_db_password
```

##### Production Server (`/opt/production-schedule/server/.env`)
```bash
NODE_ENV=production
PORT=5001
DB_HOST=your_production_db_host
DB_PORT=5432
DB_NAME=production_schedule
DB_USER=your_production_db_user
DB_PASSWORD=your_production_db_password
```

### 4. Database Setup

#### PostgreSQL Database Configuration
- [ ] Create databases for staging and production
- [ ] Create database users with appropriate permissions
- [ ] Run any necessary database migrations
- [ ] Test database connectivity from servers

```sql
-- Example database setup
CREATE DATABASE production_schedule_staging;
CREATE DATABASE production_schedule;
CREATE USER staging_user WITH PASSWORD 'staging_password';
CREATE USER production_user WITH PASSWORD 'production_password';
GRANT ALL PRIVILEGES ON DATABASE production_schedule_staging TO staging_user;
GRANT ALL PRIVILEGES ON DATABASE production_schedule TO production_user;
```

### 5. Network Configuration

#### Firewall Rules
```bash
# Allow SSH (port 22)
sudo ufw allow 22

# Allow application ports
sudo ufw allow 5001  # Server API
sudo ufw allow 8090  # Client app

# Enable firewall
sudo ufw enable
```

#### DNS/Load Balancer (if applicable)
- [ ] Configure DNS records for your domains
- [ ] Setup SSL certificates
- [ ] Configure load balancer rules

## Deployment Process

### 1. Initial Deployment Test

#### Test the Pipeline
- [ ] Push a commit to `develop` branch
- [ ] Verify test stage passes
- [ ] Verify build stage completes
- [ ] Check staging deployment succeeds
- [ ] Test staging application functionality

#### Verify Staging Environment
- [ ] Access staging URL: `http://staging-server:8090`
- [ ] Test all major application features
- [ ] Check server health: `http://staging-server:5001/api/health`
- [ ] Review container logs: `docker-compose -f docker-compose.staging.yml logs`

### 2. Production Deployment

#### Pre-Production Checklist
- [ ] All tests pass in staging
- [ ] Database backups completed
- [ ] Stakeholder approval obtained
- [ ] Maintenance window scheduled (if needed)

#### Deploy to Production
- [ ] Merge changes to `main` branch
- [ ] Monitor pipeline progress
- [ ] Manually trigger production deployment
- [ ] Verify health checks pass
- [ ] Test production application

#### Post-Deployment Verification
- [ ] Access production URL: `http://production-server:8090`
- [ ] Run smoke tests on critical functionality
- [ ] Monitor application logs
- [ ] Check system resources usage

## Monitoring and Maintenance

### Daily Checks
- [ ] Monitor container status: `docker-compose ps`
- [ ] Check disk space: `df -h`
- [ ] Review application logs
- [ ] Monitor database connections

### Weekly Maintenance
- [ ] Clean up unused Docker images: `docker system prune -f`
- [ ] Review security updates
- [ ] Check backup integrity
- [ ] Update documentation if needed

### Emergency Procedures

#### Rollback Production
```bash
# Via GitLab CI/CD
1. Go to project pipeline
2. Click "Play" on rollback_production job

# Via manual script
./deploy.sh rollback
```

#### Container Recovery
```bash
# Restart specific service
docker-compose restart server
docker-compose restart client

# Full restart
docker-compose down
docker-compose up -d
```

## Troubleshooting Guide

### Common Issues and Solutions

#### Pipeline Failures
- **SSH Connection Failed**: Check SSH keys and server access
- **Docker Build Failed**: Verify Dockerfile syntax and dependencies
- **Registry Push Failed**: Check registry credentials

#### Application Issues
- **Health Check Failed**: Verify application ports and endpoints
- **Database Connection Failed**: Check database credentials and connectivity
- **Container Won't Start**: Review container logs and resource limits

#### Performance Issues
- **High Memory Usage**: Monitor container resources with `docker stats`
- **Slow Response**: Check database query performance
- **Disk Space**: Clean up logs and unused images

## Security Best Practices

- [ ] Use specific versions for Docker images (avoid `latest` in production)
- [ ] Regularly update base images for security patches
- [ ] Implement proper backup and disaster recovery procedures
- [ ] Monitor access logs and set up alerting
- [ ] Use secrets management for sensitive configuration
- [ ] Implement network segmentation where possible

## Support Contacts

- **DevOps Team**: [your-devops-email]
- **Database Admin**: [your-dba-email]
- **Security Team**: [your-security-email]
- **On-Call**: [your-oncall-contact]

---

**Last Updated**: $(date)
**Version**: 1.0
