# Render Quick Start Guide

Get your QA Tool deployed on Render in 5 minutes!

---

## 🚀 Step-by-Step Deployment

### 1. Push to GitHub

```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

### 2. Connect to Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Blueprint"
3. Connect your GitHub repository
4. Render will auto-detect `render.yaml`

### 3. Configure Environment Variables

#### Backend Service

Set these in the backend service settings:

```
DB_HOST=your-redshift-host.com
DB_PORT=5439
DB_NAME=your_database
DB_USER=your_username
DB_PASSWORD=your_password (use Secret)
DB_SSL=true
FRONTEND_URL=https://qa-tool-frontend.onrender.com (set after frontend deploys)
```

#### Frontend Service

Set this in the frontend service settings:

```
VITE_API_URL=https://qa-tool-backend.onrender.com/api
```

⚠️ **Important:** Replace `qa-tool-backend.onrender.com` with your actual backend URL!

### 4. Deploy

1. Click "Apply" or "Create Services"
2. Wait for builds to complete (~5-10 minutes)
3. Note your service URLs

### 5. Update CORS

After both services are deployed:

1. Go to backend service → Environment
2. Update `FRONTEND_URL` to match your frontend URL
3. Redeploy backend

---

## ✅ Verify Deployment

### Backend Health Check

```bash
curl https://your-backend.onrender.com/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "...",
  "database": "connected"
}
```

### Frontend

Open your frontend URL in a browser. You should see the QA Tool interface.

---

## 🔧 Troubleshooting

### Backend won't start

- Check build logs in Render dashboard
- Verify all environment variables are set
- Ensure `DB_PASSWORD` is set as Secret (not plain text)

### Frontend can't connect

- Verify `VITE_API_URL` includes `/api` at the end
- Check backend URL is correct
- Rebuild frontend after changing `VITE_API_URL`

### Database connection fails

- Verify Redshift security groups allow Render IPs
- Check `DB_SSL=true` is set
- Test credentials locally first

---

## 📚 More Information

- **Detailed Guide:** See [`RENDER_DEPLOYMENT.md`](./RENDER_DEPLOYMENT.md)
- **General Deployment:** See [`DEPLOYMENT.md`](./DEPLOYMENT.md)
- **Architecture:** See [`ARCHITECTURE.md`](./ARCHITECTURE.md)

---

**That's it! Your app should be live on Render.** 🎉
