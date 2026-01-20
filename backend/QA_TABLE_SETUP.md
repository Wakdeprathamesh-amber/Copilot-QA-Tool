# QA Assessment Tables Setup

This guide explains how to create the QA assessment tables in your database without touching any existing production tables.

## Overview

The QA assessment tables are completely separate from your production tables:
- ✅ **No foreign keys** to production tables
- ✅ **No modifications** to existing tables
- ✅ **Safe to run** multiple times (uses `IF NOT EXISTS`)
- ✅ **Uses same credentials** as your existing database connection

## Tables Created

1. **`qa_assessments`** - Stores ratings, tags, and notes for conversations
   - `conversation_id` (VARCHAR) - References production conversation IDs (no FK)
   - `reviewer_id` (VARCHAR) - Reviewer identifier
   - `rating` - good/okay/bad
   - `tags` - Comma-separated tags
   - `notes` - Text notes

2. **`conversation_tags`** - Optional many-to-many tags table
   - For advanced tag querying if needed

## Setup Instructions

### Step 1: Ensure Database Connection

Make sure your `backend/.env` file has the correct database credentials:

```env
DB_HOST=redshift-prod.amber-data.com
DB_PORT=5439
DB_NAME=amberdb
DB_USER=your_username
DB_PASSWORD=your_password
DB_SSL=false
```

### Step 2: Run the Setup Script

```bash
cd backend
npm run setup-qa-tables
```

### Step 3: Verify Tables Created

The script will automatically verify that tables were created. You should see:

```
✅ QA assessment tables created successfully
✅ Verified tables exist: conversation_tags, qa_assessments
```

### Step 4: Test the Setup

After running the script, your QA assessments will now be persisted to the database instead of in-memory storage.

## What This Does

1. **Creates `qa_assessments` table** - Stores all QA data
2. **Creates `conversation_tags` table** - Optional tag storage
3. **Creates indexes** - For performance optimization
4. **Creates triggers** - Auto-updates `updated_at` timestamp
5. **Verifies creation** - Confirms tables exist

## Safety Features

- ✅ Uses `IF NOT EXISTS` - Won't fail if tables already exist
- ✅ No foreign keys - Won't interfere with production tables
- ✅ Separate table names - Won't conflict with existing tables
- ✅ Same database connection - Uses your existing credentials

## Troubleshooting

### Permission Denied Error

If you see `Permission denied (42501)`:
- Your database user needs `CREATE TABLE` permission
- Contact your DBA to grant permissions

### Tables Already Exist

If tables already exist, the script will:
- Skip creation (safe)
- Verify they exist
- Continue normally

### Redshift Compatibility

The schema is designed to work with Redshift:
- Uses VARCHAR instead of UUID
- Uses comma-separated strings for tags
- Compatible with Redshift SQL syntax

## After Setup

Once tables are created:
1. QA assessments will be **persisted** to database
2. Data will **survive server restarts**
3. Can **scale horizontally** (shared database)
4. All existing functionality continues to work

## Migration from In-Memory

The repository has been updated to use the database automatically. No code changes needed - just run the setup script!
