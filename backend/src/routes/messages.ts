import { Router, Request, Response } from 'express';
import { query } from '../db/connection';
import { authenticate } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();
router.use(authenticate);

const getLangSmithUrl = (traceId: string | null): string | null => {
  const id = traceId?.trim();
  if (!id) return null;

  // Require proper configuration instead of falling back to "demo" values.
  const org = process.env.LANGSMITH_ORG;
  const project = process.env.LANGSMITH_PROJECT;

  // If not configured, don't generate a broken URL.
  if (!org || !project) {
    return null;
  }

  const encoded = encodeURIComponent(id);
  // Duration defaults to 7d to match typical LangSmith UI links; override via LANGSMITH_DURATION if needed.
  const duration = process.env.LANGSMITH_DURATION || '7d';
  const timeModel = encodeURIComponent(JSON.stringify({ duration }));

  return `https://smith.langchain.com/o/${org}/projects/${project}?timeModel=${timeModel}&peek=${encoded}&peeked_trace=${encoded}`;
};

// GET /api/messages/:id/debug - Get debug info for a message
router.get('/:id/debug', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Query message to get trace_id
    const messageQuery = `
      SELECT 
        wm.trace_id,
        wm.id,
        wm.message_id,
        wm.direction,
        wm.agent_id
      FROM whatsapp_messages wm
      JOIN whatsapp_conversations wc
        ON wm.conversation_id = wc.conversation_id
      WHERE (wm.id::varchar = $1 OR wm.message_id = $1)
        AND wc.source_details LIKE '%"source": "zoho"%'
      LIMIT 1;
    `;

    const result = await query(messageQuery, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const message = result.rows[0];
    const traceId = message.trace_id;
    
    // Generate LangSmith URL if trace_id exists
    const langsmithUrl = getLangSmithUrl(traceId);

    // For now, return available info. In the future, this could query LangSmith API
    // or a debug data table for prompt, RAG context, model output, etc.
    res.json({
      traceId: traceId || null,
      prompt: null, // Not available in whatsapp_messages table
      ragContext: null, // Not available in whatsapp_messages table
      modelOutput: null, // Not available in whatsapp_messages table
      toolCalls: null, // Not available in whatsapp_messages table
      latency: null, // Not available in whatsapp_messages table
      langsmithUrl: langsmithUrl,
    });
  } catch (error) {
    logger.error('Error fetching message debug info', { messageId: req.params.id, error });
    res.status(500).json({ error: 'Failed to fetch debug info' });
  }
});

export default router;
