-- Initial database schema for AI Eval & QA Console

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  role VARCHAR(50) DEFAULT 'reviewer',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('website', 'whatsapp')),
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  participant_count INTEGER DEFAULT 1,
  ai_agent_version VARCHAR(100),
  prompt_version VARCHAR(100),
  kb_version VARCHAR(100),
  detected_intent VARCHAR(255),
  outcome VARCHAR(20) CHECK (outcome IN ('qualified', 'dropped', 'escalated', 'ongoing')),
  csat VARCHAR(10) CHECK (csat IN ('good', 'bad')),
  human_handover BOOLEAN DEFAULT FALSE,
  auto_summary TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender VARCHAR(10) NOT NULL CHECK (sender IN ('user', 'ai', 'human')),
  content TEXT NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
  processing_latency INTEGER,
  langsmith_trace_id VARCHAR(255),
  prompt_used TEXT,
  rag_context TEXT,
  model_output TEXT,
  tool_calls JSONB,
  errors JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- QA Assessments table
CREATE TABLE IF NOT EXISTS qa_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES users(id),
  rating VARCHAR(10) CHECK (rating IN ('good', 'okay', 'bad')),
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Conversation tags (many-to-many relationship)
CREATE TABLE IF NOT EXISTS conversation_tags (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  tag VARCHAR(100) NOT NULL,
  PRIMARY KEY (conversation_id, tag)
);

-- Filter presets for users
CREATE TABLE IF NOT EXISTS filter_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  filters JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit log for QA actions
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID NOT NULL,
  changes JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_channel ON conversations(channel);
CREATE INDEX IF NOT EXISTS idx_conversations_csat ON conversations(csat);
CREATE INDEX IF NOT EXISTS idx_conversations_outcome ON conversations(outcome);
CREATE INDEX IF NOT EXISTS idx_conversations_start_time ON conversations(start_time);
CREATE INDEX IF NOT EXISTS idx_conversations_detected_intent ON conversations(detected_intent);
CREATE INDEX IF NOT EXISTS idx_conversations_human_handover ON conversations(human_handover);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender);
CREATE INDEX IF NOT EXISTS idx_messages_langsmith_trace_id ON messages(langsmith_trace_id);

CREATE INDEX IF NOT EXISTS idx_qa_assessments_conversation_id ON qa_assessments(conversation_id);
CREATE INDEX IF NOT EXISTS idx_qa_assessments_reviewer_id ON qa_assessments(reviewer_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Full-text search index on message content
CREATE INDEX IF NOT EXISTS idx_messages_content_fts ON messages USING gin(to_tsvector('english', content));

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

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_qa_assessments_updated_at BEFORE UPDATE ON qa_assessments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_filter_presets_updated_at BEFORE UPDATE ON filter_presets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
