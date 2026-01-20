# Redshift Connection Information

## Current Configuration

**Database Type**: Amazon Redshift
**Connection Library**: redshift-connector (Python)

### Credentials (from config.yaml)
```yaml
HOST: redshift-prod.amber-data.com
PORT: 5439
USER: data_engg
PASS: Data_engg_123
NAME: amberdb
```

## Connection Code

The connection is established in `database.py`:

```python
import redshift_connector

connection = redshift_connector.connect(
    database="amberdb",
    user="data_engg",
    password="Data_engg_123",
    host="redshift-prod.amber-data.com",
    port=5439
)
```

## Expected Tables

Our application expects these tables:
- `whatsapp_conversations`
- `whatsapp_messages`

## Testing the Connection

### Quick Test (Browser)
Open `test_api.html` in your browser and click "Test Health Endpoint"

### Command Line Test
```bash
curl http://localhost:5000/health
```

### Python Test Script
```bash
cd python-api
source venv/bin/activate
python test_connection.py
```

## Server Status

The Python API server is currently running:
- **URL**: http://localhost:5000
- **Process**: Background process (ID: 7)
- **Status**: Active and waiting for requests

To check server logs:
```bash
# View recent output
tail -f python-api/logs.txt  # if logging to file

# Or check the process output in Kiro
```

## What Happens Next

1. You test the connection using one of the methods above
2. If successful: We verify the data and test the frontend
3. If failed: We debug based on the error message

## Common Issues

### Authentication Error
- Check username/password in config.yaml
- Verify credentials with your team

### Connection Timeout
- Check if host/port are correct
- Verify firewall/security group settings
- Confirm Redshift cluster is publicly accessible

### Table Not Found
- Run test script to see available tables
- Update SQL queries if table names differ

### JSON Column Issues
- Redshift handles JSON differently than PostgreSQL
- May need to adjust JSON queries in app.py
