# 🚀 Manual Render Deployment Guide (No Blueprint)

This guide shows you how to deploy manually by creating services one by one. This is often easier than using Blueprints!

---

## Step 1: Deploy Backend (Web Service)

### 1.1 Create New Web Service

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** button (top right)
3. Select **"Web Service"**

### 1.2 Connect Repository

1. Click **"Connect GitHub"** (if first time) or select your repository
2. Choose: `Wakdeprathamesh-amber/Copilot-QA-Tool`
3. Click **"Connect"**

### 1.3 Configure Backend Service

Fill in these settings:

**Basic Settings:**
- **Name:** `qa-tool-backend` (or any name you prefer)
- **Region:** Choose closest to you (e.g., `Oregon (US West)`)
- **Branch:** `main`
- **Root Directory:** Leave empty (or set to `.`)

**Build & Deploy:**
- **Runtime:** `Node`
- **Build Command:** `cd backend && npm install && npm run build`
- **Start Command:** `cd backend && npm start`

**Plan:**
- **Free** (for testing) or **Starter** ($7/month - recommended for production)

### 1.4 Set Environment Variables

Click **"Advanced"** → **"Add Environment Variable"** and add:

| Key | Value | Notes |
|-----|-------|-------|
| `NODE_ENV` | `production` | |
| `PORT` | `5000` | Render sets this automatically, but include it |
| `DB_HOST` | `your-redshift-host.com` | Your Redshift endpoint |
| `DB_PORT` | `5439` | Usually 5439 |
| `DB_NAME` | `your_database` | Your database name |
| `DB_USER` | `your_username` | Redshift username |
| `DB_PASSWORD` | `your_password` | ⚠️ Click "Secret" checkbox |
| `DB_SSL` | `true` | Required for production |
| `FRONTEND_URL` | `https://your-frontend-url.onrender.com` | ⚠️ Update after frontend deploys |
| `JWT_SECRET` | (leave empty or generate) | Optional - can generate later |
| `JWT_EXPIRES_IN` | `8h` | Optional |

**Important:**
- Click **"Secret"** checkbox for `DB_PASSWORD`
- For `FRONTEND_URL`, use a placeholder for now (we'll update it later)

### 1.5 Deploy Backend

1. Scroll down and click **"Create Web Service"**
2. Wait for build to complete (3-5 minutes)
3. **Note your backend URL** (e.g., `https://qa-tool-backend-abc123.onrender.com`)

### 1.6 Test Backend

Open in browser: `https://your-backend-url.onrender.com/health`

Expected response:
```json
{
  "status": "ok",
  "timestamp": "...",
  "database": "connected"
}
```

✅ **Backend is deployed!**

---

## Step 2: Deploy Frontend (Static Site)

### 2.1 Create New Static Site

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** button
3. Select **"Static Site"**

### 2.2 Connect Repository

1. Select your repository: `Wakdeprathamesh-amber/Copilot-QA-Tool`
2. Click **"Connect"**

### 2.3 Configure Frontend Service

Fill in these settings:

**Basic Settings:**
- **Name:** `qa-tool-frontend` (or any name you prefer)
- **Branch:** `main`
- **Root Directory:** Leave empty

**Build Settings:**
- **Build Command:** `cd frontend && npm install && npm run build`
- **Publish Directory:** `frontend/dist`

**Plan:**
- **Free** (for testing) or **Starter** ($7/month - for better performance)

### 2.4 Set Environment Variables

Click **"Add Environment Variable"** and add:

| Key | Value | Notes |
|-----|-------|-------|
| `VITE_API_URL` | `https://your-backend-url.onrender.com/api` | ⚠️ Use the backend URL from Step 1.5 |

**Important:**
- Replace `your-backend-url.onrender.com` with your **actual backend URL**
- Must include `/api` at the end
- Must use `https://` (not `http://`)

**Example:**
```
VITE_API_URL = https://qa-tool-backend-abc123.onrender.com/api
```

### 2.5 Deploy Frontend

1. Click **"Create Static Site"**
2. Wait for build to complete (2-3 minutes)
3. **Note your frontend URL** (e.g., `https://qa-tool-frontend-xyz789.onrender.com`)

✅ **Frontend is deployed!**

---

## Step 3: Update CORS Configuration

### 3.1 Update Backend FRONTEND_URL

1. Go to **qa-tool-backend** service
2. Click **"Environment"** tab
3. Find `FRONTEND_URL`
4. Update value to your **actual frontend URL** from Step 2.5
5. Click **"Save Changes"**
6. Service will automatically redeploy (wait 2-3 minutes)

**Example:**
```
Old: https://your-frontend-url.onrender.com
New: https://qa-tool-frontend-xyz789.onrender.com
```

---

## Step 4: Verify Everything Works

### 4.1 Test Backend

```bash
curl https://your-backend-url.onrender.com/health
```

Should return:
```json
{
  "status": "ok",
  "timestamp": "...",
  "database": "connected"
}
```

### 4.2 Test Frontend

1. Open frontend URL in browser
2. You should see the QA Tool interface
3. Open browser console (F12) - check for errors
4. Try loading conversations

### 4.3 Test Full Flow

1. Browse conversations
2. Click on a conversation
3. Rate a conversation
4. Verify data saves correctly

---

## 🎉 Success!

Your QA Tool is now live on Render!

**Your URLs:**
- **Backend:** `https://your-backend-url.onrender.com`
- **Frontend:** `https://your-frontend-url.onrender.com`

---

## 🔄 Making Updates

### Update Code

1. Make changes locally
2. Commit and push:
   ```bash
   git add .
   git commit -m "Your changes"
   git push origin main
   ```
3. Render will automatically detect changes
4. Services will auto-redeploy (if auto-deploy is enabled)

### Update Environment Variables

1. Go to service → **"Environment"** tab
2. Add/Edit/Delete variables
3. Click **"Save Changes"**
4. Service automatically redeploys

---

## 🔧 Troubleshooting

### Backend Build Fails

**Check:**
- Build logs: Service → **"Logs"** tab
- Verify `buildCommand` is correct
- Check for TypeScript errors

**Fix:**
- Review error in logs
- Fix code issues
- Push to GitHub
- Service will auto-redeploy

### Backend Won't Start

**Check:**
- Runtime logs: Service → **"Logs"** tab
- Verify all environment variables are set
- Check database connection

**Fix:**
- Verify `DB_PASSWORD` is set as Secret
- Check all database variables are correct
- Test database connection locally first

### Frontend Can't Connect

**Check:**
- Browser console (F12) for errors
- Verify `VITE_API_URL` is correct:
  - Matches backend URL exactly
  - Includes `/api` at the end
  - Uses `https://`

**Fix:**
1. Update `VITE_API_URL` in frontend environment
2. Wait for rebuild (2-3 minutes)
3. Clear browser cache and reload

### Database Connection Fails

**Check:**
- Backend health check shows `"database": "disconnected"`
- Verify Redshift credentials
- Check Redshift security groups

**Fix:**
- Verify all DB environment variables
- Ensure `DB_SSL=true` is set
- Check Redshift security groups allow Render IPs

---

## 💰 Cost Comparison

### Free Tier
- **Backend:** 750 hours/month (spins down after 15 min inactivity)
- **Frontend:** Free (always on)
- **Total:** $0/month (good for testing)

### Starter Plan
- **Backend:** $7/month (always on)
- **Frontend:** Free or $7/month
- **Total:** $7-14/month (recommended for production)

---

## 📊 Service Management

### View Logs
- Service → **"Logs"** tab
- Real-time logs
- Filter by type

### View Metrics
- Service → **"Metrics"** tab
- CPU, Memory, Requests
- Response times

### Manual Deploy
- Service → **"Manual Deploy"** button
- Deploy specific commit

### Suspend/Resume
- Service → **"Settings"** → **"Suspend"**
- Free tier services auto-suspend after inactivity

---

## ✅ Final Checklist

- [ ] Backend service created and deployed
- [ ] Backend health check passes
- [ ] Frontend static site created and deployed
- [ ] Frontend loads correctly
- [ ] `VITE_API_URL` set correctly
- [ ] `FRONTEND_URL` updated in backend
- [ ] Frontend can connect to backend
- [ ] Database connection works
- [ ] Can browse conversations
- [ ] Can rate conversations
- [ ] Data saves correctly

---

**🎉 You're all set! Your QA Tool is live on Render!**

---

**Last Updated:** January 29, 2026
