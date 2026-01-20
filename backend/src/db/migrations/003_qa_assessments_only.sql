-- QA Assessments Only Schema
-- This creates ONLY the qa_assessments table and related structures
-- Does NOT create users table (to avoid conflicts with existing tables)
-- conversation_id is VARCHAR(255) - no foreign key constraints to production tables

-- QA Assessments table
-- conversation_id references the ID from Amber's database (not a foreign key)
-- Using VARCHAR for IDs to be compatible with Redshift
-- ID will be generated in application code
-- Redshift uses SORTKEY instead of traditional indexes for query optimization
CREATE TABLE IF NOT EXISTS qa_assessments (
  id VARCHAR(255) PRIMARY KEY,
  conversation_id VARCHAR(255) NOT NULL UNIQUE,
  reviewer_id VARCHAR(255) NOT NULL DEFAULT 'system',
  rating VARCHAR(10),
  tags VARCHAR(1000) DEFAULT '',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
SORTKEY(conversation_id, updated_at);

-- Note: Tags are stored as comma-separated strings in qa_assessments.tags column
-- Note: Redshift doesn't support traditional CREATE INDEX, triggers, or PL/pgSQL functions
-- The updated_at timestamp is managed in application code (see qaAssessmentRepository.ts)
-- Query performance is optimized using SORTKEY on conversation_id and updated_at
