-- Minimal QA-only database schema
-- This database only stores QA assessments, not conversation data
-- Conversation data is read from Amber's production database

-- Users table for reviewers
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  role VARCHAR(50) DEFAULT 'reviewer',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- QA Assessments table
-- conversation_id references the ID from Amber's database (not a foreign key)
CREATE TABLE IF NOT EXISTS qa_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id VARCHAR(255) NOT NULL, -- Reference to Amber DB conversation ID
  reviewer_id UUID NOT NULL REFERENCES users(id),
  rating VARCHAR(10) CHECK (rating IN ('good', 'okay', 'bad')),
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Conversation tags (many-to-many relationship)
CREATE TABLE IF NOT EXISTS conversation_tags (
  conversation_id VARCHAR(255) NOT NULL, -- Reference to Amber DB conversation ID
  tag VARCHAR(100) NOT NULL,
  PRIMARY KEY (conversation_id, tag)
);

-- Audit log for QA actions
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id VARCHAR(255) NOT NULL, -- Can reference Amber DB IDs
  changes JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_qa_assessments_conversation_id ON qa_assessments(conversation_id);
CREATE INDEX IF NOT EXISTS idx_qa_assessments_reviewer_id ON qa_assessments(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_conversation_tags_conversation_id ON conversation_tags(conversation_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_qa_assessments_updated_at BEFORE UPDATE ON qa_assessments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
