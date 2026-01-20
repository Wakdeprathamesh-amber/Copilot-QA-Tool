# Requirements Document

## Introduction

The AI Eval & QA Console is an internal tool for Amber to systematically review, debug, and improve AI chatbot quality across Website and WhatsApp channels. The system provides a centralized interface for conversation analysis, quality assessment, and debugging to enable data-driven decisions about AI performance and improvements.

## Glossary

- **AI_Console**: The AI Eval & QA Console system
- **Conversation**: A complete interaction session between a user and AI chatbot
- **Message**: Individual communication unit within a conversation
- **CSAT**: Customer Satisfaction score (good/bad/null)
- **Intent**: Detected purpose or goal of user communication
- **QA_Action**: Manual quality assessment performed by reviewers
- **RAG**: Retrieval-Augmented Generation context
- **LangSmith**: External tracing system for AI model interactions
- **Reviewer**: Human user performing quality assessment
- **Channel**: Communication platform (Website or WhatsApp)

## Requirements

### Requirement 1: Conversation Explorer Interface

**User Story:** As a QA reviewer, I want to browse and filter AI conversations, so that I can efficiently find conversations worth reviewing.

#### Acceptance Criteria

1. THE AI_Console SHALL display a list of all AI conversations in an inbox-style interface
2. WHEN a reviewer applies CSAT filters, THE AI_Console SHALL show only conversations matching the selected CSAT values (good/bad/null)
3. WHEN a reviewer applies intent filters, THE AI_Console SHALL show only conversations matching the selected intents
4. WHEN a reviewer applies agent version filters, THE AI_Console SHALL show only conversations from the specified AI agent or prompt versions
5. WHEN a reviewer applies channel filters, THE AI_Console SHALL show only conversations from the selected channels (Website/WhatsApp)
6. WHEN a reviewer applies date range filters, THE AI_Console SHALL show only conversations within the specified time period
7. WHEN a reviewer applies human handover filters, THE AI_Console SHALL show only conversations that were escalated to human agents
8. THE AI_Console SHALL allow combining multiple filter criteria simultaneously

### Requirement 2: Conversation Detail View

**User Story:** As a QA reviewer, I want to see complete conversation details with metadata and QA tools, so that I can thoroughly assess conversation quality.

#### Acceptance Criteria

1. WHEN a reviewer selects a conversation, THE AI_Console SHALL display the full chat history in a WhatsApp-like interface on the left side
2. THE AI_Console SHALL display user messages, AI responses, and human agent messages in chronological order
3. THE AI_Console SHALL display conversation metadata on the right side including auto summary, detected intent, and outcome
4. WHEN a reviewer marks a conversation quality rating, THE AI_Console SHALL store the rating (good/okay/bad) with the conversation
5. WHEN a reviewer adds structured tags, THE AI_Console SHALL associate the tags with the conversation for categorization
6. WHEN a reviewer adds notes, THE AI_Console SHALL store the reviewer notes with the conversation
7. THE AI_Console SHALL display system metadata including AI agent version, prompt version, and knowledge base version

### Requirement 3: Message-Level Debug Interface

**User Story:** As a QA reviewer, I want to inspect individual message processing details, so that I can debug AI behavior and identify improvement opportunities.

#### Acceptance Criteria

1. WHEN a reviewer clicks on any message, THE AI_Console SHALL display the prompt used for that message
2. WHEN a reviewer inspects a message, THE AI_Console SHALL show the retrieved RAG context used
3. WHEN a reviewer inspects a message, THE AI_Console SHALL display the raw model output
4. WHEN a reviewer inspects a message, THE AI_Console SHALL show any tool calls made during processing
5. WHEN a reviewer inspects a message, THE AI_Console SHALL display latency metrics and any errors encountered
6. THE AI_Console SHALL provide deep links to corresponding LangSmith traces for external detailed analysis

### Requirement 4: Data Management and Storage

**User Story:** As a system administrator, I want conversation data to be properly stored and retrieved, so that reviewers can access historical conversations and analysis.

#### Acceptance Criteria

1. THE AI_Console SHALL store all conversation data including messages, metadata, and QA assessments
2. WHEN conversations are imported, THE AI_Console SHALL preserve all original timestamps and participant information
3. THE AI_Console SHALL maintain referential integrity between conversations, messages, and QA data
4. WHEN QA data is updated, THE AI_Console SHALL track revision history for audit purposes
5. THE AI_Console SHALL support efficient querying across large conversation datasets

### Requirement 5: Authentication and Access Control

**User Story:** As a system administrator, I want to control access to the QA console, so that only authorized personnel can review sensitive conversation data.

#### Acceptance Criteria

1. THE AI_Console SHALL require user authentication before granting access
2. WHEN an unauthorized user attempts access, THE AI_Console SHALL deny access and redirect to authentication
3. THE AI_Console SHALL maintain user session security throughout usage
4. THE AI_Console SHALL log all user actions for audit purposes
5. THE AI_Console SHALL support role-based access if multiple user types are needed

### Requirement 6: Performance and Scalability

**User Story:** As a QA reviewer, I want the console to respond quickly when browsing conversations, so that I can efficiently perform quality assessments.

#### Acceptance Criteria

1. WHEN loading the conversation list, THE AI_Console SHALL display results within 2 seconds for up to 10,000 conversations
2. WHEN applying filters, THE AI_Console SHALL update results within 1 second
3. WHEN opening conversation details, THE AI_Console SHALL load the complete view within 1 second
4. THE AI_Console SHALL support pagination for large conversation datasets
5. THE AI_Console SHALL cache frequently accessed data to improve response times

### Requirement 7: Data Integration

**User Story:** As a system administrator, I want the console to integrate with existing AI infrastructure, so that conversation data flows automatically into the QA system.

#### Acceptance Criteria

1. THE AI_Console SHALL integrate with existing conversation logging systems to import AI interactions
2. THE AI_Console SHALL synchronize with LangSmith for trace data access
3. WHEN new conversations occur, THE AI_Console SHALL automatically import them within 5 minutes
4. THE AI_Console SHALL handle data format variations between Website and WhatsApp channels
5. IF external system integration fails, THEN THE AI_Console SHALL log errors and continue operating with available data