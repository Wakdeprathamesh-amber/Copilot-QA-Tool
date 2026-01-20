# Manual Setup Instructions for Python API

## Step-by-Step Guide

### 1. Check Python Installation

Open Terminal and run:
```bash
python3 --version
```

You should see something like `Python 3.x.x`. If not, install Python first:
- **Mac**: `brew install python3` or download from python.org
- **Windows**: Download from python.org
- **Linux**: `sudo apt install python3 python3-pip`

### 2. Navigate to python-api folder

```bash
cd "/Users/amberuser/Desktop/QA Tool for AI chatbot/python-api"
```

### 3. Install Dependencies

```bash
pip3 install flask flask-cors psycopg2-binary python-dotenv pyyaml
```

Wait for installation to complete. You should see "Successfully installed..." messages.

### 4. Run the API

```bash
python3 app.py
```

### 5. Check if it's running

You should see output like:
```
 * Serving Flask app 'app'
 * Debug mode: on
 * Running on http://0.0.0.0:5000
```

### 6. Test the Connection

Open a NEW terminal window and run:

```bash
curl http://localhost:5000/health
```

**If you see:**
```json
{"status":"ok","database":"connected"}
```
✅ **SUCCESS!** The API connected to the database!

**If you see:**
```json
{"status":"error","database":"disconnected"}
```
❌ **Network issue** - You need VPN or special access (ask your team tomorrow)

### 7. Test Getting Conversations

```bash
curl "http://localhost:5000/api/conversations?page=1&pageSize=5"
```

If this returns JSON with conversations, you're all set!

### 8. Use with Frontend

1. Keep the Python API running in one terminal
2. Open another terminal
3. Go to frontend folder:
   ```bash
   cd "/Users/amberuser/Desktop/QA Tool for AI chatbot/frontend"
   ```
4. Make sure `USE_DEMO_DATA = false` in `src/services/api.ts`
5. Start frontend:
   ```bash
   npm run dev
   ```
6. Open browser: http://localhost:3000

You should see real data from staging database!

## Troubleshooting

### "command not found: python3"

**Solution:** Install Python 3
- Mac: `brew install python3`
- Or download from https://www.python.org/downloads/

### "No module named 'flask'"

**Solution:** Install dependencies again
```bash
pip3 install flask flask-cors psycopg2-binary python-dotenv pyyaml
```

### "Permission denied"

**Solution:** Use sudo or install in user space
```bash
pip3 install --user flask flask-cors psycopg2-binary python-dotenv pyyaml
```

### "Connection timeout" or "Connection refused"

**Solution:** Network access issue
- Check if you need VPN
- Ask your team for network access details
- Try running from a server that can reach the database

### "Port 5000 already in use"

**Solution:** Stop other services or change port

Stop Node.js backend if running, or edit `config.yaml`:
```yaml
server:
  PORT: 5001  # Change to different port
```

Then update frontend API URL to match.

## What to Expect

### If Connection Works:
- ✅ Health endpoint returns "connected"
- ✅ You can fetch 8,463 conversations
- ✅ Frontend shows real data
- ✅ Filters and search work
- ✅ You can view conversation details

### If Connection Fails:
- ❌ Health endpoint returns "disconnected"
- ❌ Need VPN or network access
- ❌ Ask team tomorrow for:
  - VPN details
  - SSH tunnel configuration
  - Where to deploy this API

## Next Steps

1. **Try running the API** following steps above
2. **Test the health endpoint**
3. **If it works** - use with frontend!
4. **If it doesn't** - ask team tomorrow about network access

Good luck! 🚀
