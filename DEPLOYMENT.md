# Cocoa Inventory System - Deployment Guide

## Prerequisites
- Node.js 16+ installed on server
- MySQL 8.0+ installed and running
- Git (for code deployment)
- PM2 (for process management)

## Step 1: Server Setup

### Install Node.js and PM2
```bash
# Install Node.js (if not already installed)
# Download from https://nodejs.org/

# Install PM2 globally
npm install -g pm2
```

### Install MySQL
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install mysql-server

# CentOS/RHEL
sudo yum install mysql-server

# Windows
# Download MySQL installer from https://dev.mysql.com/downloads/
```

## Step 2: Database Setup

### Create Database and User
```sql
-- Connect to MySQL as root
mysql -u root -p

-- Create database
CREATE DATABASE cocoa_inventory_prod;

-- Create user (replace with secure password)
CREATE USER 'cocoa_user'@'localhost' IDENTIFIED BY 'your_secure_password';

-- Grant permissions
GRANT ALL PRIVILEGES ON cocoa_inventory_prod.* TO 'cocoa_user'@'localhost';
FLUSH PRIVILEGES;

-- Exit MySQL
EXIT;
```

### Import Database Schema
```bash
mysql -u cocoa_user -p cocoa_inventory_prod < database_schema_update.sql
```

## Step 3: Application Deployment

### Clone/Upload Code
```bash
# Option 1: Git clone
git clone <your-repo-url> /opt/cocoa-inventory
cd /opt/cocoa-inventory

# Option 2: Upload files manually to /opt/cocoa-inventory
```

### Create Production Environment File
Create `/opt/cocoa-inventory/.env`:
```env
# Production Environment Variables
DB_HOST=localhost
DB_USER=cocoa_user
DB_PASS=your_secure_password
DB_NAME=cocoa_inventory_prod
JWT_SECRET=your_super_secure_jwt_secret_key_here_make_it_long_and_random
PORT=5000
NODE_ENV=production
```

### Install Dependencies and Build
```bash
cd /opt/cocoa-inventory

# Install frontend dependencies
npm install

# Build frontend for production
npm run build

# Install backend dependencies
cd Backend
npm install
```

## Step 4: Start Application with PM2

### Start Backend
```bash
cd /opt/cocoa-inventory/Backend

# Start with PM2
pm2 start server.js --name cocoa-backend --env production

# Save PM2 configuration
pm2 save
pm2 startup
```

### Verify Application
```bash
# Check if backend is running
pm2 status

# Check logs
pm2 logs cocoa-backend

# Test API endpoint
curl http://localhost:5000/health
```

## Step 5: Network Configuration

### Firewall Setup (Ubuntu/Debian)
```bash
# Allow HTTP and HTTPS
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 5000

# Enable firewall
sudo ufw enable
```

### Firewall Setup (CentOS/RHEL)
```bash
# Allow HTTP and HTTPS
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --permanent --add-port=5000/tcp

# Reload firewall
sudo firewall-cmd --reload
```

### DNS Configuration
Add an A record in your company DNS:
```
inventory.company.local  A  <your-server-ip>
```

## Step 6: SSL/HTTPS Setup (Recommended)

### Install Certbot (Let's Encrypt)
```bash
# Ubuntu/Debian
sudo apt install certbot

# CentOS/RHEL
sudo yum install certbot
```

### Generate SSL Certificate
```bash
sudo certbot certonly --standalone -d inventory.company.local
```

### Configure Nginx (Optional)
If using Nginx as reverse proxy:
```nginx
server {
    listen 80;
    server_name inventory.company.local;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name inventory.company.local;
    
    ssl_certificate /etc/letsencrypt/live/inventory.company.local/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/inventory.company.local/privkey.pem;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Step 7: Initial User Setup

### Create Admin User
```sql
-- Connect to MySQL
mysql -u cocoa_user -p cocoa_inventory_prod

-- Insert admin user (password will be 'admin123')
INSERT INTO users (staffName, staffId, password, role) 
VALUES ('admin', 'ADMIN001', '$2b$10$your_hashed_password_here', 'admin');

-- Exit MySQL
EXIT;
```

### Or use the application
1. Access http://inventory.company.local
2. Login with test credentials
3. Use admin panel to create users

## Step 8: Monitoring and Maintenance

### PM2 Monitoring
```bash
# Monitor application
pm2 monit

# View logs
pm2 logs cocoa-backend

# Restart application
pm2 restart cocoa-backend
```

### Database Backup
```bash
# Create backup script
cat > /opt/cocoa-inventory/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -u cocoa_user -p'your_password' cocoa_inventory_prod > /opt/backups/cocoa_inventory_$DATE.sql
find /opt/backups -name "cocoa_inventory_*.sql" -mtime +7 -delete
EOF

# Make executable
chmod +x /opt/cocoa-inventory/backup.sh

# Add to crontab for daily backup
crontab -e
# Add line: 0 2 * * * /opt/cocoa-inventory/backup.sh
```

## Troubleshooting

### Common Issues
1. **Port 5000 not accessible**: Check firewall settings
2. **Database connection failed**: Verify MySQL is running and credentials are correct
3. **PM2 not starting**: Check logs with `pm2 logs cocoa-backend`
4. **Frontend not loading**: Ensure `npm run build` completed successfully

### Useful Commands
```bash
# Check if port is in use
netstat -tulpn | grep :5000

# Check MySQL status
sudo systemctl status mysql

# Check PM2 status
pm2 status

# View application logs
pm2 logs cocoa-backend --lines 100
```

## Security Considerations
- Use strong passwords for database and JWT secret
- Regularly update dependencies
- Monitor logs for suspicious activity
- Consider using HTTPS even for internal networks
- Restrict database access to application server only 