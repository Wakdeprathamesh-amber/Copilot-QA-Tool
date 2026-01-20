# Database Migrations

This directory contains SQL migration files for setting up the database schema.

## Running Migrations

### Using psql (PostgreSQL CLI)

```bash
psql -U postgres -d ai_eval_console -f src/db/migrations/001_initial_schema.sql
```

### Using a migration tool (recommended)

Consider using a migration tool like `node-pg-migrate` or `knex` for better migration management in production.

## Migration Files

- `001_initial_schema.sql` - Initial database schema with all core tables, indexes, and triggers

## Schema Overview

The schema includes:
- `users` - User accounts and authentication
- `conversations` - Core conversation data
- `messages` - Individual messages within conversations
- `qa_assessments` - Quality assessment data
- `conversation_tags` - Many-to-many tagging relationship
- `filter_presets` - Saved filter configurations
- `audit_logs` - Audit trail for all actions

All tables include proper indexes for performance optimization as specified in the design document.
