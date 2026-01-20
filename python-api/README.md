# Python API Service for AI Eval Console

This is a temporary Python-based API service that connects to the PostgreSQL staging database and exposes REST endpoints for the frontend.

## Why Python API?

The Node.js backend can't connect directly to the staging database because it's on a private network (`10.0.1.236`). This Python service can be run from a location that HAS access to the database (like where Metabase runs).

## Setup

### 1. Install Dependencies

```bash
cd python-api
pip install -r requirements.txt
```

Or with virtual environment:
```bash
cd python-api
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure Database

Edit `config.yaml` if needed (credentials are already set):

```yaml
database:
  NAME: communication_service_db
  USER: comms_user
  PASS: 92aaHBwpSeODeoP
  HOST: 10.0.1.236
  PORT: 5432
```

### 3. Run the API

```bash
python app.py
```

You should see:
```
 * Running on http://0.0.0.0:5000
```

### 4. Test the API

```bash
# Health check
curl http://localhost:5000/health

# Get conversations
curl http://localhost:5000/api/conversations?page=1&pageSize=10
```

## API Endpoints

All the same endpoints as the Node.js backend:

- `GET /health` - Health check
- `GET /api/conversations` - List conversations with filters
- `GET /api/conversations/:id` - Get conversation detail
- `GET /api/conversations/:id?messages=true` - Get with messages
- `GET /api/conversations/filters` - Get filter options
- `GET /api/messages/:id/debug` - Get debug info
- `GET /api/qa-assessments/:id` - Get QA assessment
- `POST /api/qa-assessments/:id/rating` - Set rating
- `POST /api/qa-assessments/:id/tags` - Add tags
- `DELETE /api/qa-assessments/:id/tags` - Remove tags
- `POST /api/qa-assessments/:id/notes` - Set notes
- `PATCH /api/qa-assessments/:id` - Update assessment

## Using with Frontend

The frontend is already configured to use `http://localhost:5000/api`, so:

1. Make sure `USE_DEMO_DATA = false` in `frontend/src/services/api.ts`
2. Start this Python API: `python app.py`
3. Start frontend: `cd frontend && npm run dev`
4. Open http://localhost:3000

## Features

✅ Connects to PostgreSQL staging database
✅ All data mapping (channel, CSAT, sender, outcome)
✅ Filters (CSAT, channel, date, search)
✅ Pagination
✅ QA tools (in-memory storage)
✅ Hardcoded demo trace IDs for AI messages
✅ CORS enabled for frontend

## Troubleshooting

### "Connection refused"

**Problem:** Can't connect to database

**Solutions:**
1. Check if you're on VPN
2. Verify `config.yaml` has correct credentials
3. Try running from a server that can reach `10.0.1.236`

### "Module not found"

**Problem:** Dependencies not installed

**Solution:**
```bash
pip install -r requirements.txt
```

### "Port 5000 already in use"

**Problem:** Node.js backend is still running

**Solution:**
1. Stop Node.js backend
2. Or change port in `config.yaml`:
   ```yaml
   server:
     PORT: 5001
   ```
3. Update frontend API URL to match

## Deployment

To deploy this where it can reach the database:

### Option 1: Same Server as Metabase

If Metabase is on a server that can reach the database:

```bash
# SSH into that server
ssh user@metabase-server

# Copy these files
scp -r python-api user@metabase-server:~/

# On the server
cd python-api
pip install -r requirements.txt
python app.py
```

### Option 2: AWS EC2 in Same VPC

Deploy to an EC2 instance in the same VPC as the database:

```bash
# Launch EC2 instance in same VPC
# SSH into it
# Install Python and dependencies
# Run the API
```

### Option 3: Docker Container

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

CMD ["python", "app.py"]
```

## Next Steps

Once you get the correct network access details from your team:
1. Update the Node.js backend configuration
2. Switch back to Node.js backend
3. This Python API can be retired

## Notes

- QA assessments are stored in memory (lost on restart)
- Agent/Prompt/KB versions hardcoded to `v1.0.0`
- LangSmith trace ID hardcoded to `demo-trace-abc123`
- Debug data returns demo values only

These will be the same limitations until we locate where this data is stored in your system.
