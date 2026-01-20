# Demo Data

This folder contains demo data fixtures used when `USE_DEMO_DATA` is enabled.

## Files

- `conversations.json` - Sample conversations with metadata
- `messages.json` - Messages grouped by conversation ID
- `langsmith-traces.json` - Debug trace data for messages

## Usage

The demo data service (`src/services/demoDataService.ts`) uses these files to simulate API responses. This allows frontend development without requiring a backend connection.

## Switching to Real API

To switch from demo data to real API:

1. Set `VITE_USE_DEMO_DATA=false` in `.env` file, OR
2. Change `USE_DEMO_DATA` constant in `src/services/api.ts` to `false`

## Data Structure

### Conversations
- Channel: `"website"` or `"whatsapp"` (zd:answerBot maps to website)
- CSAT: `"good"`, `"bad"`, or `null`
- Outcome: `"qualified"`, `"dropped"`, `"escalated"`, or `"ongoing"`
- Includes conversation evaluation, user preferences, and metadata

### Messages
- Grouped by `conversationId`
- Sender: `"user"`, `"ai"`, or `"human"`
- Includes timestamps, processing latency, and LangSmith trace IDs

### LangSmith Traces
- Keyed by trace ID
- Contains prompt, RAG context, model output, tool calls, and performance metrics
