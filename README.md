# QA Tool for AI Chatbot Conversations

Quality Assurance tool for reviewing and rating AI chatbot conversations from Redshift.

---

## 🚀 For DevOps / Deployment

**👉 See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for complete production deployment guide.**

### Quick Deployment Checklist:

**Backend Environment Variables (Required):**
```bash
DB_HOST=your-redshift-host.com
DB_PORT=5439
DB_NAME=your_database
DB_USER=your_username
DB_PASSWORD=your_password
DB_SSL=true
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://your-frontend-domain.com  # ⚠️ Required for CORS
```

**Frontend Environment Variables (Required):**
```bash
VITE_API_URL=https://your-backend-api.com/api  # ⚠️ Must include /api
```

**Important Notes:**
- Frontend must be **rebuilt** after changing `VITE_API_URL` (Vite env vars are baked in at build time)
- `FRONTEND_URL` in backend must match frontend domain exactly (CORS)
- All URLs are environment-based (no hardcoded localhost in production code)
- Health check endpoint: `/health`

See `DEPLOYMENT.md` for detailed deployment instructions, Docker configs, CI/CD examples, and troubleshooting.

---

## 🚀 Quick Start (Development)

### 1. Start Backend (Node.js)
```bash
cd backend
npm run dev
```

Backend runs on **http://localhost:5000**

### 2. Start Frontend (React)
```bash
cd frontend
npm run dev
```

Frontend runs on **http://localhost:5173**

### 3. Open Browser
Navigate to **http://localhost:5173**

---

## ✨ Features

- 📋 **Browse Conversations** - Paginated list of WhatsApp/Website conversations
- 🔍 **Search & Filter** - By channel, CSAT, handover, dates, etc.
- ⭐ **Rate Conversations** - Good/Okay/Bad ratings
- 🏷️ **Tag System** - Add custom tags for categorization
- 📝 **Reviewer Notes** - Save notes with manual "Save Notes" button
- 📊 **Bulk Actions** - Rate or tag multiple conversations at once
- 💾 **Data Persistence** - All QA data saved to separate Redshift table

---

## 🏗️ Architecture

### Tech Stack:
- **Frontend:** React 18 + TypeScript + Tailwind CSS + Vite
- **Backend:** Node.js + Express + TypeScript
- **Database:** AWS Redshift (PostgreSQL-compatible)
- **State:** React Query + Zustand
- **API:** REST

### Database Tables:
- `whatsapp_conversations` - Production conversations (read-only)
- `whatsapp_messages` - Production messages (read-only)
- `qa_assessments` - QA ratings, tags, notes (read-write)

See `ARCHITECTURE.md` for detailed architecture docs.

---

## 📋 Requirements

- Node.js 18+
- npm or yarn
- Access to Redshift database
- Valid credentials in `backend/.env`

---

## 🔧 Setup

### 1. Clone & Install

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Environment

Copy the example files and configure:

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your credentials

# Frontend (optional for dev, uses localhost by default)
cp frontend/.env.example frontend/.env
# Edit frontend/.env if needed
```

**Backend `.env` file:**
```bash
# Database (Redshift)
DB_HOST=your-redshift-host.com
DB_PORT=5439
DB_NAME=your_db
DB_USER=your_user
DB_PASSWORD=your_password
DB_SSL=false

# Server
PORT=5000
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000
```

**Frontend `.env` file (optional for dev):**
```bash
VITE_API_URL=http://localhost:5000/api
```

### 3. Create QA Tables

```bash
cd backend
npm run setup-qa-tables
```

This creates the `qa_assessments` table in your Redshift database.

### 4. Start Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### 5. Open Application

Navigate to **http://localhost:5173**

---

## 📖 Usage

### Rating Conversations

1. Browse conversations in the list
2. Click on a conversation to open details
3. Use the QA Tools Panel on the right to:
   - Set rating (Good/Okay/Bad)
   - Add tags
   - Write reviewer notes
   - Click "Save Notes" button to save

### Bulk Actions

1. Select multiple conversations using checkboxes
2. Use the Bulk Actions Bar at the bottom to:
   - Set rating for all selected
   - Add tags to all selected
3. Click "Clear Selection" when done

### Filtering

Use the sidebar to filter by:
- **Channel:** WhatsApp, Website
- **CSAT:** Good, Bad, No Rating
- **Handover:** AI-only or Escalated
- **Lead Created:** Yes/No
- **Date Range:** Custom date picker
- **Search:** By conversation ID

---

## 🎯 Performance

### Optimizations Applied:
- ✅ Message limit: 200 per conversation
- ✅ Pagination: 50 conversations per page
- ✅ Count caching: 60-second cache
- ✅ Connection pooling: 20 connections
- ✅ Query timeout: 120 seconds (for Redshift)
- ✅ Manual save: Notes save on button click (no auto-save)

### Expected Load Times:
- Conversation list (first page): 4-6 seconds
- Conversation list (next pages): 2-3 seconds (cached!)
- Conversation detail: 1-3 seconds
- QA save operations: <500ms

---

## 🛠️ Development

### Backend Scripts

```bash
npm run dev          # Start dev server with ts-node
npm run build        # Compile TypeScript to JavaScript
npm run start        # Run compiled JavaScript
npm run setup-qa-tables  # Create QA tables in Redshift
```

### Frontend Scripts

```bash
npm run dev          # Start Vite dev server
npm run build        # Build for production
npm run preview      # Preview production build
```

### Key Files

**Backend:**
- `server.js` - Entry point (uses ts-node)
- `src/index.ts` - Express app setup
- `src/routes/` - API endpoints
- `src/repositories/` - Database queries
- `src/db/connection.ts` - Redshift connection

**Frontend:**
- `src/main.tsx` - Entry point
- `src/App.tsx` - Main app component
- `src/components/ConversationExplorer.tsx` - Main UI
- `src/components/QAToolsPanel.tsx` - QA assessment panel
- `src/services/api.ts` - API client

---

## 📚 Documentation

- `DEPLOYMENT.md` - Production deployment guide (environment variables, Docker, troubleshooting)
- `ARCHITECTURE.md` - Detailed architecture and tech stack

---

## 🐛 Troubleshooting

### Backend won't start

**Check .env file:**
```bash
ls backend/.env
```

**View logs:**
```bash
cd backend
npm run dev
```

**Common issues:**
- Missing `.env` file
- Invalid Redshift credentials
- Port 5000 already in use

### Frontend can't connect

**Check backend is running:**
```bash
curl http://localhost:5000/health
```

**Expected response:**
```json
{"status":"ok","timestamp":"..."}
```

### Redshift Connection Issues

**Password Authentication Failed (28000):**
- Verify DB_USER and DB_PASSWORD in backend/.env
- Check if password has special characters (may need quotes)
- Ensure user exists and has proper permissions in Redshift

**Network/Timeout Errors:**
- Check if Redshift cluster is running
- Verify network/VPN access
- Check security group allows your IP
- Query timeout is set to 120 seconds

### Performance Issues

- Redshift is a data warehouse (slower than transactional DB)
- We've optimized with message limits, pagination, caching, and increased timeouts
- Consider adding more specific filters for large datasets

---

## 🔄 Recent Updates

### January 28, 2026
- ✅ **Production Docker Setup** → Complete containerized deployment ready
- ✅ **Documentation Cleanup** → Removed 12+ outdated docs, kept only essentials
- ✅ **Nginx Configuration** → Fixed API routing for production
- ✅ **Environment Variables** → Production-ready configuration
- ✅ **Health Checks** → All services monitored and tested

### January 19, 2026
- ✅ **Added DEPLOYMENT.md** → Complete production deployment guide
- ✅ **Removed hardcoded localhost** → All URLs use environment variables
- ✅ **Added environment variable examples** → `.env.example` files
- ✅ Fixed notes auto-save timeout issue → Added "Save Notes" button
- ✅ Optimized message loading → Limited to 200 messages
- ✅ Added pagination count caching → 50% faster navigation
- ✅ Increased Redshift query timeout → 120 seconds

---

## 📝 License

Internal tool for Amber Data QA team.

---

## 👥 Support

For issues or questions, see:
- **`DEPLOYMENT.md`** - Production deployment guide
- `ARCHITECTURE.md` - System design and architecture

---

**Last Updated:** January 28, 2026
