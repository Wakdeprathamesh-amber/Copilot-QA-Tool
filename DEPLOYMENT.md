# Deployment Guide

This guide provides instructions for deploying the QA Tool for AI Chatbot to production environments.

---

## 📋 Prerequisites

- Node.js 18+ installed on the server
- Access to AWS Redshift database
- Environment variables configured
- Network access to Redshift cluster

---

## 🔧 Environment Variables

### Backend Environment Variables

Create `backend/.env` file with the following variables:

```bash
# Database Configuration (Required)
DB_HOST=your-redshift-host.com
DB_PORT=5439
DB_NAME=your_database_name
DB_USER=your_username
DB_PASSWORD=your_password
DB_SSL=true

# Server Configuration
PORT=5000
NODE_ENV=production

# Frontend URL (Required for CORS)
FRONTEND_URL=https://your-frontend-domain.com

# JWT Configuration (for future auth)
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=8h

# Redis Configuration (optional)
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_URL=redis://your-redis-host:6379
```

**Important Notes:**
- `DB_HOST`: Your Redshift cluster endpoint (without `:5439`)
- `DB_PORT`: Usually `5439` for Redshift
- `DB_SSL`: Set to `true` for production
- `FRONTEND_URL`: Must match your frontend domain exactly (including protocol)
- `NODE_ENV`: Set to `production` for production deployments

### Frontend Environment Variables

Create `.env` file in the `frontend/` directory:

```bash
# Backend API URL (Required)
VITE_API_URL=https://your-backend-api.com/api
```

**Important Notes:**
- `VITE_API_URL`: Full URL to your backend API including `/api` path
- Must use `https://` in production
- No trailing slash

---

## 🚀 Deployment Steps

### 1. Backend Deployment

#### Option A: Direct Node.js Deployment

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install --production

# Build TypeScript
npm run build

# Start server
npm start
```

#### Option B: Using PM2 (Recommended for Production)

```bash
# Install PM2 globally
npm install -g pm2

# Navigate to backend directory
cd backend

# Install dependencies
npm install --production

# Build TypeScript
npm run build

# Start with PM2
pm2 start dist/index.js --name qa-tool-backend

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system reboot
pm2 startup
```

#### Option C: Docker Deployment

```dockerfile
# Create Dockerfile in backend/
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .
RUN npm run build

EXPOSE 5000

CMD ["npm", "start"]
```

```bash
# Build Docker image
docker build -t qa-tool-backend ./backend

# Run container
docker run -d \
  --name qa-tool-backend \
  -p 5000:5000 \
  --env-file backend/.env \
  qa-tool-backend
```

### 2. Frontend Deployment

#### Option A: Static Hosting (Vercel, Netlify, S3)

```bash
# Navigate to frontend directory
cd frontend

# Create .env file with production API URL
echo "VITE_API_URL=https://your-backend-api.com/api" > .env

# Build for production
npm run build

# The dist/ folder contains the production build
# Upload dist/ contents to your hosting provider
```

**Vercel Deployment:**
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd frontend
vercel --prod
```

**Netlify Deployment:**
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
cd frontend
netlify deploy --prod
```

#### Option B: Nginx Deployment

```bash
# Build frontend
cd frontend
npm run build

# Copy dist/ to nginx directory
sudo cp -r dist/* /var/www/qa-tool/

# Configure nginx (see nginx configuration below)
```

**Nginx Configuration:**

```nginx
server {
    listen 80;
    server_name your-frontend-domain.com;

    root /var/www/qa-tool;
    index index.html;

    # Serve static files
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to backend
    location /api {
        proxy_pass https://your-backend-api.com;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 🔒 Security Checklist

- [ ] `NODE_ENV=production` set in backend
- [ ] `DB_SSL=true` for database connections
- [ ] Strong `JWT_SECRET` configured
- [ ] `FRONTEND_URL` matches actual frontend domain
- [ ] HTTPS enabled for both frontend and backend
- [ ] Environment variables stored securely (not in code)
- [ ] Database credentials are secure
- [ ] CORS properly configured
- [ ] Firewall rules configured
- [ ] Rate limiting enabled (if needed)

---

## 🌐 Network Configuration

### Backend Requirements

- **Outbound:** Access to Redshift cluster (port 5439)
- **Inbound:** HTTP/HTTPS (port 80/443 or custom port)
- **Optional:** Redis connection (port 6379)

### Frontend Requirements

- **Outbound:** Access to backend API
- **Inbound:** HTTP/HTTPS (port 80/443)

### Redshift Access

Ensure your deployment server has network access to Redshift:
- Security groups allow inbound from your server IP
- VPC configuration allows connection
- VPN or direct network path configured

---

## 📊 Health Checks

### Backend Health Check

```bash
curl https://your-backend-api.com/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-19T10:00:00.000Z",
  "database": "connected"
}
```

### Frontend Health Check

Simply access the frontend URL in a browser. If the page loads, the frontend is healthy.

---

## 🔄 Database Setup

Before deploying, ensure the QA tables are created:

```bash
cd backend
npm run setup-qa-tables
```

This creates the `qa_assessments` table in your Redshift database.

---

## 🐛 Troubleshooting

### Backend won't start

1. **Check environment variables:**
   ```bash
   cd backend
   npm run check-env
   ```

2. **Test database connection:**
   ```bash
   npm run test-redshift
   ```

3. **Check logs:**
   ```bash
   # If using PM2
   pm2 logs qa-tool-backend
   ```

### Frontend can't connect to backend

1. **Verify `VITE_API_URL` is set correctly:**
   ```bash
   # Check .env file
   cat frontend/.env
   ```

2. **Rebuild frontend after changing env vars:**
   ```bash
   cd frontend
   npm run build
   ```

3. **Check CORS configuration:**
   - Ensure `FRONTEND_URL` in backend matches frontend domain
   - Check browser console for CORS errors

### Database connection issues

1. **Verify network access:**
   ```bash
   # Test connection
   psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME
   ```

2. **Check security groups:**
   - Ensure Redshift security group allows your server IP

3. **Verify credentials:**
   - Check `DB_USER` and `DB_PASSWORD` are correct
   - Ensure user has proper permissions

---

## 📝 Environment-Specific Configurations

### Development
```bash
NODE_ENV=development
DB_SSL=false
FRONTEND_URL=http://localhost:3000
VITE_API_URL=http://localhost:5000/api
```

### Staging
```bash
NODE_ENV=staging
DB_SSL=true
FRONTEND_URL=https://qa-tool-staging.example.com
VITE_API_URL=https://api-staging.example.com/api
```

### Production
```bash
NODE_ENV=production
DB_SSL=true
FRONTEND_URL=https://qa-tool.example.com
VITE_API_URL=https://api.example.com/api
```

---

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd backend && npm install && npm run build
      - name: Deploy to server
        run: |
          # Your deployment commands here
          
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd frontend && npm install
      - run: cd frontend && npm run build
      - name: Deploy to hosting
        run: |
          # Your deployment commands here
```

---

## 📞 Support

For deployment issues:
1. Check this guide
2. Review `ARCHITECTURE.md` for system design
3. Check `REDSHIFT_AUTH_TROUBLESHOOTING.md` for database issues
4. Review application logs

---

**Last Updated:** January 19, 2026
