# Quick Start Guide

## Prerequisites

- Node.js 18+ and npm
- Access to Redshift database credentials
- Network access to `redshift-prod.amber-data.com:5439`

## Step 1: Install Dependencies

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd frontend
npm install
```

## Step 2: Configure Database

Create `backend/.env` file:

```env
DB_HOST=redshift-prod.amber-data.com
DB_PORT=5439
DB_NAME=amberdb
DB_USER=your_username
DB_PASSWORD=your_password
DB_SSL=false

PORT=5000
FRONTEND_URL=http://localhost:3000
```

**Important:**
- Replace `your_username` and `your_password` with actual credentials
- Variable name must be exactly `DB_PASSWORD` (not `DB_PASS`)
- No spaces around `=`
- Password on single line

## Step 3: Test Database Connection

```bash
cd backend
npm run test-redshift
```

Expected output:
```
✅ Connection successful!
```

If you see authentication errors, see [REDSHIFT_AUTH_TROUBLESHOOTING.md](./REDSHIFT_AUTH_TROUBLESHOOTING.md)

## Step 4: Start Backend Server

```bash
cd backend
npm run dev
```

You should see:
```
✓ Database connection successful
✓ Server running on port 5000
```

## Step 5: Configure Frontend (Optional)

By default, frontend uses demo data. To use real API:

**Option 1: Edit code**
Edit `frontend/src/services/api.ts`:
```typescript
const USE_DEMO_DATA = false; // Change from true to false
```

**Option 2: Environment variable**
Create `frontend/.env`:
```env
VITE_USE_DEMO_DATA=false
VITE_API_URL=http://localhost:5000/api
```

## Step 6: Start Frontend

```bash
cd frontend
npm run dev
```

Frontend will start on http://localhost:3000

## Step 7: Verify Installation

1. **Backend Health Check:**
   ```bash
   curl http://localhost:5000/health
   ```
   Should return: `{"status":"ok","database":"connected"}`

2. **Test Conversations API:**
   ```bash
   curl "http://localhost:5000/api/conversations?page=1&pageSize=10"
   ```

3. **Open Frontend:**
   - Navigate to http://localhost:3000
   - You should see the conversation explorer

## Troubleshooting

### Database Connection Failed

**Error: Password authentication failed**
- Check `DB_PASSWORD` in `backend/.env`
- Verify password is correct (no extra spaces)
- See [REDSHIFT_AUTH_TROUBLESHOOTING.md](./REDSHIFT_AUTH_TROUBLESHOOTING.md)

**Error: Connection timeout**
- Check network/VPN access to Redshift
- Verify security group allows your IP
- Check if Redshift cluster is running

### Frontend Not Loading Data

- Check if backend is running: `curl http://localhost:5000/health`
- Check browser console for errors
- Verify `USE_DEMO_DATA` is set correctly
- Check CORS settings in backend

### Port Already in Use

**Backend (port 5000):**
- Change `PORT` in `backend/.env`
- Or stop the process using port 5000

**Frontend (port 3000):**
- Change port in `frontend/vite.config.ts`
- Or stop the process using port 3000

## Next Steps

- Browse conversations in the explorer
- Test filters (CSAT, channel, date range)
- View conversation details
- Use QA assessment tools
- See [REDSHIFT_CONNECTION.md](./REDSHIFT_CONNECTION.md) for more details
