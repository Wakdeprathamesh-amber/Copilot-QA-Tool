# Architecture Overview

## Technology Stack

### ✅ **Backend (Node.js)** - ACTIVE
**Location:** `backend/`  
**Tech Stack:**
- Node.js 18+
- Express.js (REST API)
- TypeScript
- PostgreSQL/Redshift (AWS Data Warehouse)
- pg (node-postgres driver)

**Port:** 5000  
**Start:** `cd backend && npm run dev`

**Key Files:**
- `server.js` - Entry point (uses ts-node)
- `src/index.ts` - Main Express app
- `src/routes/` - API endpoints
- `src/repositories/` - Database layer
- `src/db/connection.ts` - Redshift connection pool

### ✅ **Frontend (React)** - ACTIVE
**Location:** `frontend/`  
**Tech Stack:**
- React 18
- TypeScript
- Vite (build tool)
- Tailwind CSS
- React Query (data fetching)
- React Router (routing)
- Axios (HTTP client)

**Port:** 5173  
**Start:** `cd frontend && npm run dev`

**Key Files:**
- `src/main.tsx` - Entry point
- `src/App.tsx` - Main app component
- `src/components/` - React components
- `src/services/api.ts` - API client
- `src/hooks/useConversations.ts` - Data hooks

### ❌ **Python API** - INACTIVE / NOT USED
**Location:** `python-api/`  
**Status:** Old/alternative implementation, not currently used  
**Action:** Can be safely removed

---

## Database

**Type:** AWS Redshift (PostgreSQL-compatible)  
**Production Tables:**
- `whatsapp_conversations` - Customer conversations (read-only)
- `whatsapp_messages` - Conversation messages (read-only)

**QA Tables:**
- `qa_assessments` - QA ratings, tags, notes (read-write)

**Connection:**
- Configured in `backend/.env`
- Uses SSL: false for internal network
- Pool size: 20 connections
- Query timeout: 120 seconds (Redshift can be slow)

---

## API Endpoints

### Conversations
- `GET /api/conversations` - List conversations (paginated, 50/page)
- `GET /api/conversations/:id?messages=true` - Get conversation with messages
- `GET /api/conversations/filters` - Get filter options

### QA Assessments
- `GET /api/qa-assessments` - List all assessments
- `GET /api/qa-assessments/:conversationId` - Get assessment for conversation
- `POST /api/qa-assessments/:conversationId/rating` - Set rating
- `POST /api/qa-assessments/:conversationId/tags` - Add tags
- `DELETE /api/qa-assessments/:conversationId/tags` - Remove tags
- `POST /api/qa-assessments/:conversationId/notes` - Save notes
- `POST /api/qa-assessments/bulk/rating` - Bulk set ratings
- `POST /api/qa-assessments/bulk/tags` - Bulk add tags

### Health
- `GET /health` - Server health check

---

## Data Flow

```
Frontend (React) 
  ↓ HTTP/REST
Backend (Express)
  ↓ SQL
Redshift (PostgreSQL)
```

### Example: Loading Conversations
1. User opens frontend → `ConversationExplorer.tsx`
2. `useConversations` hook calls `api.conversations.list()`
3. Axios sends `GET http://localhost:5000/api/conversations?page=1&pageSize=50`
4. Backend route `/api/conversations` handles request
5. `conversationRepository.list()` queries Redshift
6. SQL returns 50 conversations (with count cache for performance)
7. Backend sends JSON response
8. Frontend displays conversations

### Example: Saving QA Rating
1. User clicks "Good" → `QAToolsPanel.tsx`
2. `ratingMutation.mutate('good')` calls `api.qaAssessments.setRating()`
3. Axios sends `POST http://localhost:5000/api/qa-assessments/{id}/rating`
4. Backend route validates and calls `qaAssessmentRepository.setRating()`
5. SQL `INSERT` or `UPDATE` to `qa_assessments` table
6. Backend sends updated assessment
7. Frontend shows "Saved!" confirmation

---

## Performance Optimizations

### Backend:
1. **Message Limit:** Only loads first 200 messages per conversation
2. **Pagination:** 50 conversations per page
3. **Count Caching:** Caches total count for 60 seconds
4. **Connection Pooling:** Reuses database connections
5. **Sort Keys:** Redshift uses `DISTKEY` and `SORTKEY` for fast queries

### Frontend:
1. **React Query:** Automatic caching and background updates
2. **Pagination:** Only loads 50 conversations at a time
3. **Lazy Loading:** Conversation details load on demand
4. **Debouncing:** Tag search debounced (if implemented)

---

## File Structure

```
/
├── backend/                 # Node.js API (ACTIVE)
│   ├── server.js           # Entry point
│   ├── src/
│   │   ├── index.ts        # Express app
│   │   ├── routes/         # API endpoints
│   │   ├── repositories/   # Database queries
│   │   ├── db/             # Database connection
│   │   ├── middleware/     # Auth, error handling
│   │   └── types/          # TypeScript types
│   ├── .env                # Environment config
│   └── package.json
│
├── frontend/               # React UI (ACTIVE)
│   ├── src/
│   │   ├── main.tsx       # Entry point
│   │   ├── App.tsx        # Main component
│   │   ├── components/    # React components
│   │   ├── services/      # API client
│   │   └── hooks/         # Custom hooks
│   └── package.json
│
├── python-api/            # Flask API (INACTIVE - can delete)
│
└── *.md                   # Documentation
```

---

## Environment Variables

### Backend (.env):
```bash
# Database (Redshift)
DB_HOST=redshift-prod.amber-data.com
DB_PORT=5439
DB_NAME=amberdb
DB_USER=data_engg
DB_PASSWORD=***
DB_SSL=false

# Server
PORT=5000
NODE_ENV=development

# Optional (not currently used)
JWT_SECRET=***
JWT_EXPIRES_IN=24h
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Frontend (.env):
```bash
VITE_API_URL=http://localhost:5000/api
```

---

## Deployment

**Current:** Development only (localhost)

**Production Ready Checklist:**
- [ ] Add authentication (JWT tokens)
- [ ] Enable CORS properly
- [ ] Set up environment-specific configs
- [ ] Use connection pooling for Redshift
- [ ] Add rate limiting
- [ ] Set up logging/monitoring
- [ ] Build frontend for production
- [ ] Deploy to Render/AWS/etc.

---

## Key Decisions

### Why Node.js instead of Python?
- TypeScript for type safety
- Better async performance for I/O-heavy operations
- Unified JavaScript/TypeScript across frontend and backend
- Rich ecosystem for REST APIs

### Why Redshift?
- That's where your production data already lives
- Designed for analytical queries
- Can handle millions of conversations

### Why Separate QA Table?
- Don't modify production tables
- Independent schema evolution
- Easy to reset/clear QA data
- No foreign keys (Redshift performance)

---

## Common Issues & Solutions

### Backend won't start:
- Check `.env` file exists in `backend/`
- Verify Redshift credentials
- Check port 5000 is not in use

### Frontend can't connect:
- Ensure backend is running on port 5000
- Check `VITE_API_URL` in frontend config
- Verify no CORS issues

### Slow queries:
- Redshift is a data warehouse, can be slow
- We've optimized with limits and caching
- Consider adding more specific filters

### Connection timeouts:
- Increased to 120 seconds in connection pool
- Check Redshift cluster performance
- Consider query optimization

---

**Last Updated:** Jan 19, 2026
