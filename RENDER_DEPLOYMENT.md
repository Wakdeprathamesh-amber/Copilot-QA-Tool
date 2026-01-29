# Render Deployment Guide

Complete guide for deploying the QA Tool for AI Chatbot on Render.

---

## 🚀 Quick Start

### Option 1: Using Render Blueprint (Recommended)

1. **Push your code to GitHub/GitLab/Bitbucket**
2. **Connect to Render:**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New +" → "Blueprint"
   - Connect your repository
   - Render will automatically detect `render.yaml` and create services

3. **Configure Environment Variables:**
   - Backend: Set `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `FRONTEND_URL`
   - Frontend: Set `VITE_API_URL` to your backend URL (e.g., `https://qa-tool-backend.onrender.com/api`)

4. **Deploy:**
   - Render will automatically build and deploy both services

### Option 2: Manual Setup

#### Frontend Deployment Options

**Option A: Static Site (Recommended for Render)**

Render's static site hosting is simpler and more cost-effective:

1. **Create Static Site:**
   - Go to Render Dashboard → "New +" → "Static Site"
   - Connect your repository
   - Configure:
     - **Name:** `qa-tool-frontend`
     - **Build Command:** `cd frontend && npm install && npm run build`
     - **Publish Directory:** `frontend/dist`
     - **Environment:** `Node 20`

2. **Set Environment Variable:**
   ```
   VITE_API_URL=https://qa-tool-backend.onrender.com/api
   ```

3. **Deploy:**
   - Click "Create Static Site"
   - Frontend will be available at `https://qa-tool-frontend.onrender.com`

**Option B: Docker Web Service**

If you prefer Docker for frontend:

1. **Create Web Service:**
   - Use `Dockerfile.frontend.render` instead of `Dockerfile.frontend`
   - Set `BACKEND_URL` environment variable to your backend URL
   - See Docker section below for details

#### Step 1: Deploy Backend

**Recommended: Native Node.js (Faster & Simpler)**

1. **Create Web Service:**
   - Go to Render Dashboard → "New +" → "Web Service"
   - Connect your repository
   - Configure:
     - **Name:** `qa-tool-backend`
     - **Runtime:** Node
     - **Build Command:** `cd backend && npm install && npm run build`
     - **Start Command:** `cd backend && npm start`
     - **Plan:** Starter (or higher for production)

**Alternative: Docker (if you prefer containerization)**

1. **Create Web Service:**
   - Go to Render Dashboard → "New +" → "Web Service"
   - Connect your repository
   - Configure:
     - **Name:** `qa-tool-backend`
     - **Runtime:** Docker
     - **Dockerfile Path:** `Dockerfile.backend`
     - **Docker Context:** `.` (root directory)
     - **Plan:** Starter (or higher for production)

2. **Set Environment Variables:**
   ```
   NODE_ENV=production
   PORT=5000
   DB_HOST=your-redshift-host.com
   DB_PORT=5439
   DB_NAME=your_database
   DB_USER=your_username
   DB_PASSWORD=your_password (use Secret)
   DB_SSL=true
   FRONTEND_URL=https://your-frontend-url.onrender.com
   JWT_SECRET=your-secret-key (use Secret, or let Render generate)
   JWT_EXPIRES_IN=8h
   ```

3. **Health Check:**
   - Path: `/health`
   - Render will automatically check this endpoint

4. **Deploy:**
   - Click "Create Web Service"
   - Wait for build to complete
   - Note your backend URL (e.g., `https://qa-tool-backend.onrender.com`)

#### Step 2: Deploy Frontend (Static Site - Recommended)

1. **Create Static Site:**
   - Go to Render Dashboard → "New +" → "Static Site"
   - Connect your repository
   - Configure:
     - **Name:** `qa-tool-frontend`
     - **Build Command:** `cd frontend && npm install && npm run build`
     - **Publish Directory:** `frontend/dist`
     - **Environment:** `Node 20`
     - **Plan:** Free (or Starter for better performance)

2. **Set Environment Variables:**
   ```
   VITE_API_URL=https://qa-tool-backend.onrender.com/api
   ```
   ⚠️ **Important:** Replace with your actual backend URL from Step 1

3. **Deploy:**
   - Click "Create Static Site"
   - Wait for build to complete
   - Your frontend will be available at `https://qa-tool-frontend.onrender.com`

4. **Update Backend CORS:**
   - Go back to backend service settings
   - Update `FRONTEND_URL` to match your frontend URL (e.g., `https://qa-tool-frontend.onrender.com`)
   - Redeploy backend

**Alternative: Docker Web Service**

If you prefer Docker for frontend:

1. **Create Web Service:**
   - Go to Render Dashboard → "New +" → "Web Service"
   - Connect your repository
   - Configure:
     - **Name:** `qa-tool-frontend`
     - **Runtime:** Docker
     - **Dockerfile Path:** `Dockerfile.frontend.render` (use Render-specific Dockerfile)
     - **Docker Context:** `.` (root directory)
     - **Plan:** Starter (or higher for production)

2. **Set Environment Variables:**
   ```
   VITE_API_URL=https://qa-tool-backend.onrender.com/api
   BACKEND_URL=https://qa-tool-backend.onrender.com
   ```
   ⚠️ **Important:** Replace with your actual backend URL from Step 1

3. **Deploy:**
   - Click "Create Web Service"
   - Wait for build to complete
   - Your frontend will be available at `https://qa-tool-frontend.onrender.com`

---

## 🔧 Environment Variables

### Backend Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DB_HOST` | Redshift cluster endpoint | `your-cluster.redshift.amazonaws.com` |
| `DB_PORT` | Redshift port | `5439` |
| `DB_NAME` | Database name | `your_database` |
| `DB_USER` | Database username | `your_username` |
| `DB_PASSWORD` | Database password | `your_password` (use Secret) |
| `DB_SSL` | Enable SSL | `true` |
| `FRONTEND_URL` | Frontend URL for CORS | `https://qa-tool-frontend.onrender.com` |
| `PORT` | Server port | `5000` (Render sets this automatically) |
| `NODE_ENV` | Environment | `production` |

### Backend Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `JWT_SECRET` | JWT secret key | Auto-generated if not set |
| `JWT_EXPIRES_IN` | JWT expiration | `8h` |
| `REDIS_HOST` | Redis host (if using) | Not used |
| `REDIS_PORT` | Redis port (if using) | `6379` |

### Frontend Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `https://qa-tool-backend.onrender.com/api` |

⚠️ **Important:** `VITE_API_URL` must include `/api` at the end.

---

## 🐳 Docker Deployment

Both Dockerfiles are already configured for Render:

- **Backend:** `Dockerfile.backend` - Node.js 20 Alpine, optimized for production
- **Frontend:** `Dockerfile.frontend` - Multi-stage build with Nginx

Render will automatically:
- Build Docker images
- Run containers
- Handle port mapping
- Provide HTTPS certificates

---

## 🌐 Network Configuration

### Redshift Access

Render services can connect to external databases. Ensure:

1. **Redshift Security Groups:**
   - Allow inbound connections from Render's IP ranges
   - Or use VPC peering if available

2. **Network Access:**
   - Render services have outbound internet access
   - Redshift cluster is publicly accessible (or use VPN/VPC)

3. **SSL Connection:**
   - Set `DB_SSL=true` in production
   - Redshift requires SSL for secure connections

### Finding Render IP Ranges

Render services use dynamic IPs. For Redshift access:

1. **Option 1:** Allow all IPs (0.0.0.0/0) - Less secure but simpler
2. **Option 2:** Use Redshift's public endpoint with security groups
3. **Option 3:** Contact Render support for static IP (if available)

---

## 📊 Health Checks

Render automatically monitors:

- **Backend:** `GET /health` endpoint
- **Frontend:** HTTP 200 response on root path

### Manual Health Check

```bash
# Backend
curl https://qa-tool-backend.onrender.com/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2026-01-29T...",
  "database": "connected"
}
```

---

## 🔄 Continuous Deployment

Render supports automatic deployments:

1. **Auto Deploy:** Enabled by default
   - Deploys on every push to main branch
   - Can be disabled in service settings

2. **Pull Request Previews:**
   - Frontend service supports PR previews
   - Each PR gets its own preview URL

3. **Manual Deploy:**
   - Go to service → "Manual Deploy"
   - Select branch/commit to deploy

---

## 🛠️ Troubleshooting

### Backend Won't Start

1. **Check Build Logs:**
   - Go to service → "Logs"
   - Look for build errors

2. **Verify Environment Variables:**
   - Ensure all required variables are set
   - Check `DB_PASSWORD` is set as Secret

3. **Test Database Connection:**
   - Check Redshift security groups
   - Verify credentials are correct
   - Test connection from local machine first

### Frontend Can't Connect to Backend

1. **Check `VITE_API_URL`:**
   - Must match backend URL exactly
   - Must include `/api` at the end
   - Must use `https://` (not `http://`)

2. **Rebuild Frontend:**
   - Vite env vars are baked in at build time
   - After changing `VITE_API_URL`, trigger a new deploy

3. **Check CORS:**
   - Verify `FRONTEND_URL` in backend matches frontend URL
   - Check browser console for CORS errors

### Database Connection Issues

1. **Network Access:**
   - Verify Redshift security groups allow Render IPs
   - Check if Redshift is publicly accessible

2. **SSL Configuration:**
   - Set `DB_SSL=true` for production
   - Redshift requires SSL for secure connections

3. **Credentials:**
   - Verify `DB_USER` and `DB_PASSWORD` are correct
   - Check password doesn't have special characters that need escaping

### Build Failures

1. **Docker Build:**
   - Check Dockerfile syntax
   - Verify all files are in repository
   - Check build logs for specific errors

2. **Dependencies:**
   - Ensure `package.json` files are correct
   - Check for version conflicts

---

## 💰 Pricing & Plans

### Free Tier (Starter Plan)

- **Backend:** 750 hours/month free
- **Frontend:** 750 hours/month free
- **Limitations:**
  - Services spin down after 15 minutes of inactivity
  - Cold starts on first request after spin-down
  - Limited resources

### Paid Plans

- **Starter:** $7/month per service
  - Always-on services
  - Better performance
  - More resources

- **Standard:** $25/month per service
  - Higher limits
  - Better performance
  - Priority support

**Recommendation:** Use Starter plan for production ($14/month total for both services).

---

## 🔒 Security Best Practices

1. **Environment Variables:**
   - Use Render's "Secret" feature for sensitive values
   - Never commit secrets to repository

2. **HTTPS:**
   - Render provides free SSL certificates
   - Automatically enabled for all services

3. **CORS:**
   - Set `FRONTEND_URL` to exact frontend domain
   - Don't use wildcards in production

4. **Database:**
   - Use SSL (`DB_SSL=true`)
   - Restrict Redshift security groups when possible
   - Use strong passwords

---

## 📝 Post-Deployment Checklist

- [ ] Backend health check passes (`/health`)
- [ ] Frontend loads correctly
- [ ] Frontend can connect to backend API
- [ ] Database connection works
- [ ] CORS is configured correctly
- [ ] Environment variables are set
- [ ] SSL certificates are active (automatic)
- [ ] Auto-deploy is configured
- [ ] Monitoring is set up (optional)

---

## 🔗 Useful Links

- [Render Documentation](https://render.com/docs)
- [Render Dashboard](https://dashboard.render.com)
- [Render Status](https://status.render.com)

---

## 📞 Support

For deployment issues:

1. Check Render service logs
2. Review this guide
3. Check `DEPLOYMENT.md` for general deployment info
4. Review `ARCHITECTURE.md` for system design
5. Contact Render support if needed

---

**Last Updated:** January 29, 2026
