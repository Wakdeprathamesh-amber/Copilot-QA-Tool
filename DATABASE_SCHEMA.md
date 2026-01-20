# Database Schema Documentation

**Last Updated:** 2026-01-16  
**Database:** Redshift (`redshift-prod.amber-data.com:5439/amberdb`)  
**Purpose:** Track actual table structures, columns, and relationships as discovered

---

## Table: `whatsapp_conversations`

**Purpose:** Stores conversation metadata and evaluation data

### Columns

| Column Name | Data Type | Nullable | Description | Notes |
|------------|-----------|----------|-------------|-------|
| `id` | integer | NO | Primary key | Auto-increment |
| `conversation_id` | character varying | YES | Unique conversation identifier | Used as foreign key in messages |
| `created_at` | timestamp without time zone | YES | Conversation start time | Used for sorting/filtering |
| `updated_at` | timestamp without time zone | YES | Last update timestamp | |
| `last_message_at` | timestamp without time zone | YES | Timestamp of last message | May be null or incorrect (use MAX from messages) |
| `user_id` | character varying | YES | User identifier | |
| `phone_number` | character varying | YES | User phone number | |
| `email` | character varying | YES | User email | |
| `sbase_user_id` | integer | YES | SBase user ID | |
| `status` | character varying | YES | Conversation status | Values: 'open', 'closed', etc. |
| `automation_enabled` | character varying | YES | Automation flag | VARCHAR (not boolean) |
| `source_inventory_id` | character varying | YES | Source inventory reference | |
| `zendesk_ticket_id` | character varying | YES | Zendesk ticket reference | |
| `chatbot_user_preferences_id` | integer | YES | FK to chatbot_user_preferences | |
| `lead_id` | integer | YES | Lead identifier | |
| `brand_id` | character varying | YES | Brand identifier | |
| `source_details` | character varying | YES | **JSON stored as VARCHAR** | Contains channel info |
| `conversation_evaluation` | character varying | YES | **JSON stored as VARCHAR** | Contains evaluation data |
| `meta` | character varying | YES | **JSON stored as VARCHAR** | Additional metadata (versions, config, etc.) - **NOT CURRENTLY READ** |

### JSON Column Structures

#### `source_details` (VARCHAR containing JSON)
```json
{
  "channel": "whatsapp" | "zd:answerBot" | "web" | "zd:agentWorkspace" | "android" | "ios"
}
```

**Discovered Channel Values:**
- `android`
- `ios`
- `web`
- `whatsapp`
- `zd:agentWorkspace`
- `zd:answerBot`

**Query Example (Redshift Pattern):**
```sql
-- Extract channel using CTE/subquery pattern
WITH parsed AS (
  SELECT JSON_PARSE(source_details) AS sd
  FROM whatsapp_conversations
  WHERE source_details IS NOT NULL
    AND source_details NOT IN ('', 'null')
)
SELECT sd.channel::varchar AS channel
FROM parsed;
```

#### `conversation_evaluation` (VARCHAR containing JSON)
```json
{
  "summary": "string",
  "customer_satisfaction": "1" | "2" | "3" | "4" | "5",
  "resolution_status": "resolved" | "unresolved" | "escalated",
  "theme": {
    "main_theme": "string"
  }
}
```

**Query Examples (Redshift Pattern):**
```sql
-- Extract summary using CTE/subquery pattern
WITH parsed AS (
  SELECT JSON_PARSE(conversation_evaluation) AS ce
  FROM whatsapp_conversations
  WHERE conversation_evaluation IS NOT NULL
    AND conversation_evaluation NOT IN ('', 'null')
)
SELECT 
  ce.summary::varchar AS summary,
  ce.customer_satisfaction::varchar AS csat,
  ce.resolution_status::varchar AS resolution,
  ce.theme.main_theme::varchar AS intent
FROM parsed;
```

**Key Pattern:**
1. Parse JSON in subquery/CTE: `JSON_PARSE(column) AS alias`
2. Access with dot notation: `alias.property::varchar`
3. For nested: `alias.nested.property::varchar`

#### `meta` (VARCHAR containing JSON)
**Status:** ✅ **ANALYZED - NOT USED FOR VERSIONS**

**Actual Structure (discovered via database analysis):**
```json
{
  "able_to_create_lead": true | false,
  "lead_creation_block_reason": "error message string"
}
```

**Key Findings:**
- Only 8.06% of conversations have meta data (20,874 out of 259,072)
- 99.8% of meta entries are empty objects `{}`
- **NO version fields found** (`agent_version`, `prompt_version`, `kb_version` do NOT exist)
- Only contains lead creation tracking fields
- Version information is **NOT stored in meta column**

**Query Examples (Redshift Pattern):**
```sql
-- Extract lead creation fields (if needed)
WITH parsed AS (
  SELECT JSON_PARSE(meta) AS m
  FROM whatsapp_conversations
  WHERE meta IS NOT NULL
    AND meta NOT IN ('', 'null')
    AND meta LIKE '{%'
)
SELECT 
  m.able_to_create_lead::varchar AS able_to_create_lead,
  m.lead_creation_block_reason::varchar AS block_reason
FROM parsed;
```

**Current Code Status:**
- Version fields are hardcoded as `'v1.0.0'` in `conversationRepository.ts` (lines 347-349)
- `meta` column is NOT included in SELECT queries (not needed for current use cases)
- **Hardcoded versions are correct** - no database values available
- See `META_COLUMN_ANALYSIS.md` for complete analysis

**Key Pattern:**
1. Parse JSON in subquery/CTE: `JSON_PARSE(column) AS alias`
2. Access with dot notation: `alias.property::varchar`
3. For nested: `alias.nested.property::varchar`

### Indexes & Relationships

- **Primary Key:** `id`
- **Foreign Keys:**
  - `chatbot_user_preferences_id` → `chatbot_user_preferences.id`
- **Relationships:**
  - One-to-many with `whatsapp_messages` via `conversation_id`

### Usage Notes

- Use `MAX(wm.created_at)` from messages table instead of `last_message_at` (field may be incorrect)
- JSON columns must be parsed: `JSON_PARSE(column)` before extraction
- `automation_enabled` is VARCHAR, not boolean - handle accordingly

---

## Table: `whatsapp_messages`

**Purpose:** Stores individual messages within conversations

### Columns

| Column Name | Data Type | Nullable | Description | Notes |
|------------|-----------|----------|-------------|-------|
| `id` | integer | NO | Primary key | Auto-increment |
| `message_id` | character varying | YES | External message identifier | Alternative ID |
| `conversation_id` | character varying | YES | FK to whatsapp_conversations | Join key |
| `created_at` | timestamp without time zone | YES | Message timestamp | Used for ordering |
| `updated_at` | timestamp without time zone | YES | Last update timestamp | |
| `message_content` | character varying | YES | Message text content | Main message body |
| `message_type` | character varying | YES | Type of message | Values: 'text', 'file', etc. |
| `direction` | character varying | YES | Message direction | Values: 'inbound', 'outbound' |
| `status` | character varying | YES | Message status | |
| `from_number` | character varying | YES | Sender phone number | |
| `to_number` | character varying | YES | Recipient phone number | |
| `agent_id` | integer | YES | Agent ID if human message | NULL = AI message |
| `sbase_user_id` | integer | YES | SBase user ID | |
| `message_source` | character varying | YES | Source of message | |
| `intent` | character varying | YES | Detected intent | |
| `preference` | character varying | YES | User preference | |
| `talk_to_support_triggered` | character varying | YES | Support trigger flag | |
| `source` | character varying | YES | Message source | |
| `cost` | double precision | YES | Message cost | |
| `uploaded_files` | character varying | YES | File attachments JSON | |
| `raw_payload` | character varying | YES | Raw message payload JSON | |
| `meta` | character varying | YES | Additional metadata JSON | |

### Message Sender Logic

**Determining sender type:**
- `direction = 'inbound'` → **user**
- `direction = 'outbound' AND agent_id IS NOT NULL` → **human**
- `direction = 'outbound' AND agent_id IS NULL` → **ai**

**SQL Example:**
```sql
CASE 
  WHEN direction = 'inbound' THEN 'user'
  WHEN direction = 'outbound' AND agent_id IS NOT NULL THEN 'human'
  WHEN direction = 'outbound' THEN 'ai'
  ELSE 'user'
END as sender
```

### Indexes & Relationships

- **Primary Key:** `id`
- **Foreign Keys:**
  - `conversation_id` → `whatsapp_conversations.conversation_id`
- **Indexes:**
  - Should have index on `conversation_id` for JOIN performance

### Usage Notes

- Messages are ordered by `created_at ASC` for chronological display
- Use `agent_id IS NOT NULL` to detect human handover
- `message_id` may be used as alternative identifier

---

## Table: `chatbot_user_preferences`

**Purpose:** Stores user preferences and conversation context

### Columns

| Column Name | Data Type | Nullable | Description | Notes |
|------------|-----------|----------|-------------|-------|
| `id` | integer | NO | Primary key | Auto-increment |
| `sbase_user_id` | integer | YES | SBase user ID | |
| `sunshine_user_id` | character varying | YES | Sunshine user ID | |
| `created_at` | timestamp without time zone | YES | Creation timestamp | |
| `updated_at` | timestamp without time zone | YES | Last update timestamp | |
| `user_info` | character varying | YES | User information JSON | |
| `accommodation_preferences` | character varying | YES | Accommodation preferences JSON | |
| `conversation_context` | character varying | YES | Conversation context JSON | |
| `conversation_summary` | character varying | YES | Conversation summary | |
| `lead_qualified` | character varying | YES | Lead qualification status | |
| `source` | character varying | YES | Source identifier | |
| `others` | character varying | YES | Other preferences JSON | |
| `meta` | character varying | YES | Additional metadata JSON | |

### Relationships

- **Referenced by:** `whatsapp_conversations.chatbot_user_preferences_id`

### Usage Notes

- Multiple JSON columns for different preference types
- Linked to conversations via `chatbot_user_preferences_id`

---

## Data Mapping

### Channel Mapping
```typescript
source_details.channel → UI Channel
- "whatsapp" → "whatsapp"
- "zd:answerBot" → "website"
- "web" → "website"
```

### CSAT Mapping
```typescript
conversation_evaluation.customer_satisfaction → UI CSAT
- "4" | "5" → "good"
- "1" | "2" → "bad"
- "3" | null → null (no rating)
```

### Outcome Mapping
```typescript
conversation_evaluation.resolution_status + status → UI Outcome
- resolution_status = "resolved" → "qualified"
- resolution_status = "unresolved" → "dropped"
- resolution_status = "escalated" → "escalated"
- status = "open" → "ongoing"
```

### Sender Mapping
```typescript
direction + agent_id → UI Sender
- direction = "inbound" → "user"
- direction = "outbound" + agent_id → "human"
- direction = "outbound" + no agent_id → "ai"
```

---

## Query Patterns

### Get Conversations with Filters
```sql
SELECT 
  wc.conversation_id,
  wc.created_at,
  wc.status,
  wc.source_details,
  wc.conversation_evaluation,
  COUNT(wm.id) as message_count,
  MAX(wm.created_at) as last_message_time,
  MAX(CASE WHEN wm.agent_id IS NOT NULL THEN 1 ELSE 0 END) as has_human_agent
FROM whatsapp_conversations wc
LEFT JOIN whatsapp_messages wm ON wc.conversation_id = wm.conversation_id
WHERE wc.source_details IS NOT NULL
  AND wc.source_details NOT IN ('', 'null')
  AND wc.source_details LIKE '{%'
GROUP BY wc.conversation_id, wc.created_at, wc.status, wc.source_details, wc.conversation_evaluation
ORDER BY wc.created_at DESC
LIMIT 50 OFFSET 0;
```

### Get Messages for Conversation
```sql
SELECT 
  id,
  conversation_id,
  message_content,
  created_at,
  message_type,
  direction,
  agent_id
FROM whatsapp_messages
WHERE conversation_id = $1
ORDER BY created_at ASC;
```

### Extract JSON Fields (Redshift Pattern)
```sql
-- Using CTE pattern
WITH parsed AS (
  SELECT
    JSON_PARSE(source_details) AS sd,
    JSON_PARSE(conversation_evaluation) AS ce
  FROM whatsapp_conversations
  WHERE source_details IS NOT NULL
    AND source_details NOT IN ('', 'null')
)
SELECT
  sd.channel::varchar AS channel,
  ce.customer_satisfaction::varchar AS csat,
  ce.summary::varchar AS summary,
  ce.theme.main_theme::varchar AS intent
FROM parsed;
```

---

## Discovered Issues & Workarounds

1. **`last_message_at` field is unreliable**
   - **Workaround:** Use `MAX(wm.created_at)` from messages table

2. **JSON columns are VARCHAR, not SUPER type**
   - **Workaround:** Use CTE/subquery pattern: Parse JSON in CTE, then access with dot notation
   - **Pattern:** `WITH parsed AS (SELECT JSON_PARSE(column) AS alias FROM table) SELECT alias.property::varchar FROM parsed`

3. **No `tags` column in conversations table**
   - **Status:** Removed from queries

4. **`automation_enabled` is VARCHAR, not boolean**
   - **Status:** Updated type handling

---

## Future Discoveries

As we query more tables and discover additional structures, add them here:

### Tables to Explore
- [ ] Other conversation-related tables
- [ ] User/agent tables
- [ ] Analytics/metrics tables
- [ ] Audit/logging tables

### Fields to Verify
- [ ] Actual JSON structure in `source_details`
- [ ] Actual JSON structure in `conversation_evaluation`
- [ ] Complete list of `status` values
- [ ] Complete list of `message_type` values
- [ ] Complete list of `direction` values

---

## Notes

- All timestamps are `timestamp without time zone`
- JSON columns must be parsed before extraction in Redshift
- Use parameterized queries (`$1`, `$2`, etc.) for security
- Redshift uses `LIMIT` and `OFFSET` for pagination (not `FETCH`)

---

**Documentation Status:** ✅ Active - Updated as schema is discovered

---

## How to Update This Documentation

### Using the Discovery Script

Run the automated discovery script:
```bash
cd backend
npm run discover-schema
```

This will output:
- Table structures
- Column details
- Sample JSON structures
- Enum values
- Row counts
- Relationship information

### Manual Updates

1. **After running queries**, update relevant sections
2. **When discovering new tables**, add them to this document
3. **When finding new JSON structures**, update the JSON Column Structures section
4. **When discovering enum values**, update the appropriate sections
5. **Log findings** in `SCHEMA_DISCOVERY_LOG.md`

### Best Practices

- ✅ Document actual structures, not assumptions
- ✅ Include sample data when documenting JSON
- ✅ Note any workarounds or special handling
- ✅ Update both this file and the discovery log
- ✅ Keep timestamps on significant discoveries
