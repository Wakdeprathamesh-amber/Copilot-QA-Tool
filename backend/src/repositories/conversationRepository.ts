import { query } from '../db/connection';
import { Conversation, Message, ConversationFilters, StudentCSAT } from '../types';
import { logger } from '../utils/logger';

type QARatingFilterValue = 'good' | 'okay' | 'bad' | null;

// Helper function to map channel
const mapChannel = (sourceDetails: any): 'website' | 'whatsapp' => {
  const channel = sourceDetails?.channel;
  if (channel === 'whatsapp') return 'whatsapp';
  return 'website'; // Default for all others
};

// Helper to extract main_intent from conversation_intent (stores JSON like {"main_intent": "x", "needs_human": false})
const parseConversationIntent = (conversationIntent: string | null | undefined): string | null => {
  const parsed = parseConversationIntentFull(conversationIntent);
  return parsed.mainIntent;
};

// Extract both main_intent and needs_human from conversation_intent JSON
const parseConversationIntentFull = (conversationIntent: string | null | undefined): { mainIntent: string | null; needsHuman: boolean | null } => {
  if (!conversationIntent || !conversationIntent.trim()) return { mainIntent: null, needsHuman: null };
  const s = conversationIntent.trim();
  if (!s.startsWith('{')) return { mainIntent: s, needsHuman: null };
  try {
    const parsed = JSON.parse(s);
    const main = parsed?.main_intent;
    const mainIntent = (typeof main === 'string' && main.trim()) ? main.trim() : null;
    let needsHuman: boolean | null = null;
    if (typeof parsed?.needs_human === 'boolean') {
      needsHuman = parsed.needs_human;
    } else if (parsed?.needs_human === 'true' || parsed?.needs_human === true) {
      needsHuman = true;
    } else if (parsed?.needs_human === 'false' || parsed?.needs_human === false) {
      needsHuman = false;
    }
    return { mainIntent, needsHuman };
  } catch {
    return { mainIntent: null, needsHuman: null };
  }
};

// Helper function to map CSAT (numeric customer_satisfaction score from conversation_evaluation)
const mapCSAT = (evaluation: any): 'good' | 'bad' | null => {
  const satisfaction = evaluation?.customer_satisfaction;
  if (!satisfaction) return null;
  const score = parseInt(satisfaction);
  if (score >= 4) return 'good';
  if (score <= 2) return 'bad';
  return null; // 3 is neutral
};

// Helper function to map Student CSAT from meta.feedback.value
const mapStudentCSAT = (meta: any): StudentCSAT => {
  try {
    const value = meta?.feedback?.value;
    if (value === true || value === 'true') return 'positive';
    if (value === false || value === 'false') return 'negative';
    return 'no_feedback';
  } catch {
    return 'no_feedback';
  }
};

// URL bases for external links (SalesIQ, CRM lead, Zoho Desk)
const SALESIQ_BASE = 'https://salesiq.zoho.com/amber_student/mychats';
const LEAD_BASE = 'https://amberstudent.com/dashboard/leads';
const ZOHO_DESK_BASE = 'https://desk.zoho.com/agent/amberstudent1/amberstudent/tickets/details';

function buildLinkUrls(row: { salesiq_conversation_id?: string | null; lead_id?: string | null; zoho_ticket_id?: string | null }) {
  return {
    salesiqConversationUrl: row.salesiq_conversation_id ? `${SALESIQ_BASE}/${row.salesiq_conversation_id}` : null,
    leadUrl: row.lead_id ? `${LEAD_BASE}/${row.lead_id}` : null,
    zohoDeskTicketUrl: row.zoho_ticket_id ? `${ZOHO_DESK_BASE}/${row.zoho_ticket_id}` : null,
  };
}

// Helper to normalize message-level intent which may be stored as plain text or JSON
const parseMessageIntent = (intent: any): string | string[] | null => {
  if (intent === null || intent === undefined) return null;

  // If it's already an array, stringify elements and return
  if (Array.isArray(intent)) {
    const values = intent
      .map((v) => (typeof v === 'string' ? v.trim() : String(v)))
      .filter((v) => v);
    return values.length ? values : null;
  }

  let raw = intent;
  if (typeof raw !== 'string') {
    try {
      raw = JSON.stringify(raw);
    } catch {
      return null;
    }
  }

  const s = raw.trim();
  if (!s) return null;

  // If it looks like JSON, try to parse
  if (s.startsWith('{') || s.startsWith('[')) {
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) {
        const values = parsed
          .map((v) => (typeof v === 'string' ? v.trim() : String(v)))
          .filter((v) => v);
        return values.length ? values : null;
      }
      // For objects, fall back to stringified form
      return JSON.stringify(parsed);
    } catch {
      // If JSON parsing fails, just return the raw string
      return s;
    }
  }

  // Plain string intent
  return s;
};

// Helper to flatten sub_intent JSON into a human-readable string
const parseSubIntent = (subIntent: any): string | null => {
  if (subIntent === null || subIntent === undefined) return null;

  let raw = subIntent;
  if (typeof raw !== 'string') {
    try {
      raw = JSON.stringify(raw);
    } catch {
      return null;
    }
  }

  const s = raw.trim();
  if (!s) return null;

  // If it does not look like JSON, return as-is
  if (!(s.startsWith('{') || s.startsWith('['))) {
    return s;
  }

  try {
    const parsed = JSON.parse(s);
    const parts: string[] = [];

    const walk = (value: any, prefix: string = '') => {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        for (const [key, v] of Object.entries(value)) {
          const nextPrefix = prefix ? `${prefix}.${key}` : key;
          if (v !== null && typeof v === 'object') {
            walk(v, nextPrefix);
          } else if (v !== undefined && String(v).trim() !== '') {
            parts.push(`${nextPrefix}=${String(v)}`);
          }
        }
      } else if (value !== undefined && value !== null) {
        parts.push(String(value));
      }
    };

    walk(parsed);
    return parts.length ? parts.join('; ') : null;
  } catch {
    // Fallback to the raw string if JSON parsing fails
    return s;
  }
};

// Simple in-memory cache for total count
let totalCountCache: { count: number; timestamp: number; filters: string } | null = null;
const CACHE_TTL = 60000; // 60 seconds

export const conversationRepository = {
  async list(filters: ConversationFilters, page: number = 1, pageSize: number = 50, search?: string, sortBy?: string) {
    let whereConditions: string[] = [];
    let params: any[] = [];
    let paramIndex = 1;

    // Base condition: only Zoho source
    whereConditions.push(`wc.source_details LIKE '%"source": "zoho"%'`);

    // Search filter
    if (search && search.trim()) {
      const searchPattern = `%${search.trim().toLowerCase()}%`;
      whereConditions.push(`LOWER(wc.conversation_id) LIKE $${paramIndex}`);
      params.push(searchPattern);
      paramIndex++;
    }

    // CSAT/QA Rating filter - human QA assessments from qa_assessments (Good, Okay, Bad, No Rating)
    // Requires LEFT JOIN to qa_assessments - will be applied below
    const csatFilterActive = filters.csat && filters.csat.length > 0;
    let csatConditions: string[] = [];
    if (csatFilterActive) {
      const csatValues = filters.csat! as QARatingFilterValue[];
      if (csatValues.includes('good')) {
        csatConditions.push(`(qa.rating = 'good')`);
      }
      if (csatValues.includes('okay')) {
        csatConditions.push(`(qa.rating = 'okay')`);
      }
      if (csatValues.includes('bad')) {
        csatConditions.push(`(qa.rating = 'bad')`);
      }
      if (csatValues.includes(null)) {
        csatConditions.push(`(qa.conversation_id IS NULL)`);
      }
      if (csatConditions.length > 0) {
        whereConditions.push(`(${csatConditions.join(' OR ')})`);
      }
    }

    // Student CSAT filter - derived from whatsapp_conversations.meta.feedback.value
    if (filters.studentCsat && filters.studentCsat.length > 0) {
      const studentConditions: string[] = [];
      const selected = filters.studentCsat as StudentCSAT[];

      if (selected.includes('positive')) {
        studentConditions.push(`JSON_EXTRACT_PATH_TEXT(wc.meta, 'feedback', 'value') = 'true'`);
      }
      if (selected.includes('negative')) {
        studentConditions.push(`JSON_EXTRACT_PATH_TEXT(wc.meta, 'feedback', 'value') = 'false'`);
      }
      if (selected.includes('no_feedback')) {
        studentConditions.push(`JSON_EXTRACT_PATH_TEXT(wc.meta, 'feedback', 'value') IS NULL`);
      }

      if (studentConditions.length > 0) {
        whereConditions.push(`(${studentConditions.join(' OR ')})`);
      }
    }

    // Date range filters - filter by created_at
    if (filters.dateFrom) {
      whereConditions.push(`wc.created_at::date >= $${paramIndex}`);
      params.push(filters.dateFrom);
      paramIndex++;
    }
    if (filters.dateTo) {
      whereConditions.push(`wc.created_at::date <= $${paramIndex}`);
      params.push(filters.dateTo);
      paramIndex++;
    }

    // Channel filter - from source_details JSON (aligns with mapChannel: whatsapp explicit, else website)
    if (filters.channel && filters.channel.length > 0) {
      const channels = filters.channel.map((c) => c.toLowerCase());
      const hasWebsite = channels.includes('website');
      const hasWhatsapp = channels.includes('whatsapp');

      if (hasWebsite && hasWhatsapp) {
        // Both selected = no channel filter (show all)
      } else if (hasWhatsapp) {
        whereConditions.push(`LOWER(TRIM(COALESCE(JSON_EXTRACT_PATH_TEXT(wc.source_details, 'channel'), ''))) = 'whatsapp'`);
      } else if (hasWebsite) {
        // Website = whatsapp explicit OR null/empty/other (per mapChannel default)
        whereConditions.push(`(JSON_EXTRACT_PATH_TEXT(wc.source_details, 'channel') IS NULL OR TRIM(COALESCE(JSON_EXTRACT_PATH_TEXT(wc.source_details, 'channel'), '')) = '' OR LOWER(TRIM(JSON_EXTRACT_PATH_TEXT(wc.source_details, 'channel'))) != 'whatsapp')`);
      }
    }

    // Conversation intent filter - conversation_intent is JSON, extract main_intent for comparison
    if (filters.intent && filters.intent.length > 0) {
      whereConditions.push(`JSON_EXTRACT_PATH_TEXT(wc.conversation_intent, 'main_intent') IN (${filters.intent.map((_, i) => `$${paramIndex + i}`).join(', ')})`);
      params.push(...filters.intent);
      paramIndex += filters.intent.length;
    }

    // Needs human filter - from conversation_intent JSON (conversation-level intent classification)
    if (filters.needsHuman === true) {
      whereConditions.push(`LOWER(JSON_EXTRACT_PATH_TEXT(wc.conversation_intent, 'needs_human')) = 'true'`);
    } else if (filters.needsHuman === false) {
      whereConditions.push(`LOWER(JSON_EXTRACT_PATH_TEXT(wc.conversation_intent, 'needs_human')) = 'false'`);
    }

    // Human handover filter - from meta.agent_id presence
    if (filters.humanHandover === true) {
      whereConditions.push(`(wc.meta IS NOT NULL AND wc.meta NOT IN ('', 'null') AND wc.meta LIKE '{%' AND JSON_EXTRACT_PATH_TEXT(wc.meta, 'agent_id') IS NOT NULL AND JSON_EXTRACT_PATH_TEXT(wc.meta, 'agent_id') != '')`);
    } else if (filters.humanHandover === false) {
      whereConditions.push(`(
        wc.meta IS NULL OR wc.meta IN ('', 'null') OR wc.meta NOT LIKE '{%'
        OR JSON_EXTRACT_PATH_TEXT(wc.meta, 'agent_id') IS NULL
        OR JSON_EXTRACT_PATH_TEXT(wc.meta, 'agent_id') = ''
      )`);
    }

    // Lead created filter - from meta.able_to_create_lead
    if (filters.leadCreated === true) {
      whereConditions.push(`(wc.meta IS NOT NULL AND wc.meta NOT IN ('', 'null') AND wc.meta LIKE '{%' AND LOWER(JSON_EXTRACT_PATH_TEXT(wc.meta, 'able_to_create_lead')) = 'true')`);
    } else if (filters.leadCreated === false) {
      whereConditions.push(`(wc.meta IS NOT NULL AND wc.meta NOT IN ('', 'null') AND wc.meta LIKE '{%' AND LOWER(JSON_EXTRACT_PATH_TEXT(wc.meta, 'able_to_create_lead')) = 'false')`);
    } else if (filters.leadCreated === null) {
      whereConditions.push(`(
        wc.meta IS NULL OR wc.meta IN ('', 'null') OR wc.meta NOT LIKE '{%'
        OR JSON_EXTRACT_PATH_TEXT(wc.meta, 'able_to_create_lead') IS NULL
        OR JSON_EXTRACT_PATH_TEXT(wc.meta, 'able_to_create_lead') = ''
      )`);
    }

    // Build WHERE clause
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // QA assessments join (needed when filtering by human QA rating)
    const qaJoin = csatFilterActive
      ? `LEFT JOIN qa_assessments qa ON wc.conversation_id = qa.conversation_id`
      : '';

    // Sorting
    let orderBy = 'wc.created_at DESC'; // Default
    if (sortBy === 'oldest') orderBy = 'wc.created_at ASC';
    else if (sortBy === 'newest') orderBy = 'wc.created_at DESC';

    // Count total
    const countQuery = `
      SELECT COUNT(DISTINCT wc.conversation_id) as total
      FROM whatsapp_conversations wc
      ${qaJoin}
      ${whereClause}
    `;
    
    const filterKey = JSON.stringify({ filters, search });
    let total: number;
    
    if (totalCountCache && 
        totalCountCache.filters === filterKey && 
        Date.now() - totalCountCache.timestamp < CACHE_TTL) {
      total = totalCountCache.count;
    } else {
      const countResult = await query(countQuery, params);
      total = parseInt(countResult.rows[0].total);
      totalCountCache = {
        count: total,
        timestamp: Date.now(),
        filters: filterKey
      };
    }

    // Main query
    const offset = (page - 1) * pageSize;
    const listQuery = `
      SELECT 
        wc.conversation_id,
        wc.created_at,
        wc.last_message_at,
        wc.source_details,
        wc.conversation_evaluation,
        wc.meta,
        wc.conversation_intent,
        wc.automation_enabled,
        wc.phone_number,
        wc.email,
        wc.user_id,
        wc.salesiq_conversation_id,
        wc.lead_id,
        wc.zoho_ticket_id,
        COUNT(wm.id) as message_count
      FROM whatsapp_conversations wc
      LEFT JOIN whatsapp_messages wm ON wc.conversation_id = wm.conversation_id
      ${qaJoin}
      ${whereClause}
      GROUP BY wc.conversation_id, wc.created_at, wc.last_message_at, 
               wc.source_details, wc.conversation_evaluation, wc.meta,
               wc.conversation_intent, wc.automation_enabled, wc.phone_number, wc.email, wc.user_id,
               wc.salesiq_conversation_id, wc.lead_id, wc.zoho_ticket_id
      ORDER BY ${orderBy}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(pageSize, offset);

    const result = await query(listQuery, params);

    const conversations: Conversation[] = result.rows.map((row: any) => {
      // Parse JSON strings
      let evaluation = {};
      let sourceDetails = {};
      let meta = {};
      
      try {
        evaluation = row.conversation_evaluation ? JSON.parse(row.conversation_evaluation) : {};
      } catch (e) {}
      
      try {
        sourceDetails = row.source_details ? JSON.parse(row.source_details) : {};
      } catch (e) {}
      
      try {
        meta = row.meta ? JSON.parse(row.meta) : {};
      } catch (e) {}

      const intentData = parseConversationIntentFull(row.conversation_intent);

      return {
        id: row.conversation_id,
        channel: mapChannel(sourceDetails),
        startTime: row.created_at,
        endTime: row.last_message_at,
        participantCount: 2, // Simplified: user + AI
        aiAgentVersion: 'v1.0', // Placeholder
        promptVersion: 'v1.0', // Placeholder
        kbVersion: 'v1.0', // Placeholder
        detectedIntent: intentData.mainIntent,
        needsHuman: intentData.needsHuman,
        outcome: 'ongoing',
        csat: mapCSAT(evaluation),
        humanHandover: !!((meta as any).agent_id),
        interactionType: ((meta as any).agent_id ? 'ai_to_human_handover' : 'ai_only'),
        autoSummary: (evaluation as any).summary || null,
        createdAt: row.created_at,
        updatedAt: row.last_message_at || row.created_at,
        messageCount: parseInt(row.message_count) || 0,
        lastMessageTime: row.last_message_at,
        leadCreated: (meta as any).able_to_create_lead === true || (meta as any).able_to_create_lead === 'true',
        studentCsat: mapStudentCSAT(meta),
        ...buildLinkUrls(row)
      };
    });

    return {
      conversations,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  },

  async getById(id: string, includeMessages: boolean = false): Promise<Conversation | null> {
    const conversationQuery = `
      SELECT 
        wc.conversation_id,
        wc.created_at,
        wc.last_message_at,
        wc.source_details,
        wc.conversation_evaluation,
        wc.meta,
        wc.conversation_intent,
        wc.automation_enabled,
        wc.phone_number,
        wc.email,
        wc.user_id,
        wc.salesiq_conversation_id,
        wc.lead_id,
        wc.zoho_ticket_id,
        COUNT(wm.id) as message_count
      FROM whatsapp_conversations wc
      LEFT JOIN whatsapp_messages wm ON wc.conversation_id = wm.conversation_id
      WHERE wc.conversation_id = $1
      GROUP BY wc.conversation_id, wc.created_at, wc.last_message_at, 
               wc.source_details, wc.conversation_evaluation, wc.meta,
               wc.conversation_intent, wc.automation_enabled, wc.phone_number, wc.email, wc.user_id,
               wc.salesiq_conversation_id, wc.lead_id, wc.zoho_ticket_id
    `;

    const result = await query(conversationQuery, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    
    // Parse JSON strings
    let evaluation = {};
    let sourceDetails = {};
    let meta = {};
    
    try {
      evaluation = row.conversation_evaluation ? JSON.parse(row.conversation_evaluation) : {};
    } catch (e) {}
    
    try {
      sourceDetails = row.source_details ? JSON.parse(row.source_details) : {};
    } catch (e) {}
    
    try {
      meta = row.meta ? JSON.parse(row.meta) : {};
    } catch (e) {}

    const intentData = parseConversationIntentFull(row.conversation_intent);

    const conversation: Conversation = {
      id: row.conversation_id,
      channel: mapChannel(sourceDetails),
      startTime: row.created_at,
      endTime: row.last_message_at,
      participantCount: 2, // Simplified: user + AI
      aiAgentVersion: 'v1.0', // Placeholder
      promptVersion: 'v1.0', // Placeholder
      kbVersion: 'v1.0', // Placeholder
      detectedIntent: intentData.mainIntent,
      needsHuman: intentData.needsHuman,
      outcome: 'ongoing', // Simplified
      csat: mapCSAT(evaluation),
      humanHandover: !!((meta as any).agent_id),
      interactionType: ((meta as any).agent_id ? 'ai_to_human_handover' : 'ai_only'),
      autoSummary: (evaluation as any).summary || null,
      createdAt: row.created_at,
      updatedAt: row.last_message_at || row.created_at,
      messageCount: parseInt(row.message_count) || 0,
      lastMessageTime: row.last_message_at,
      leadCreated: (meta as any).able_to_create_lead === true || (meta as any).able_to_create_lead === 'true',
      studentCsat: mapStudentCSAT(meta),
      ...buildLinkUrls(row)
    };

    if (includeMessages) {
      const messagesQuery = `
        SELECT 
          id,
          conversation_id,
          message_content,
          created_at,
          message_type,
          direction,
          agent_id,
          from_number,
          to_number,
          status,
          trace_id,
          intent,
          sub_intent
        FROM whatsapp_messages 
        WHERE conversation_id = $1 
        ORDER BY created_at ASC
        LIMIT 200
      `;

      const messagesResult = await query(messagesQuery, [id]);
      
      (conversation as any).messages = messagesResult.rows.map((msgRow: any) => ({
        id: msgRow.id.toString(),
        conversationId: msgRow.conversation_id,
        sender: msgRow.direction === 'inbound' ? 'user' : (msgRow.agent_id ? 'human' : 'ai'),
        content: msgRow.message_content || '',
        timestamp: msgRow.created_at,
        messageType: msgRow.message_type || 'text',
        intent: parseMessageIntent(msgRow.intent),
        subIntent: parseSubIntent(msgRow.sub_intent),
        processingLatency: null,
        langsmithTraceId: msgRow.trace_id || null,
        promptUsed: null,
        ragContext: null,
        modelOutput: null,
        toolCalls: null,
        errors: null,
        operatorName: msgRow.agent_id ? 'Agent' : undefined
      }));
    }

    return conversation;
  },

  async getFilterOptions() {
    // Fetch Conversation intent options - conversation_intent stores JSON like {"main_intent": "booking_support_comp", "needs_human": false}
    // Extract distinct main_intent values for the filter dropdown
    let intentOptions: string[] = [];
    try {
      const intentResult = await query(
        `SELECT DISTINCT JSON_EXTRACT_PATH_TEXT(conversation_intent, 'main_intent') as main_intent
         FROM whatsapp_conversations
         WHERE source_details LIKE '%"source": "zoho"%'
           AND conversation_intent IS NOT NULL
           AND TRIM(conversation_intent) != ''
           AND conversation_intent LIKE '{%'
           AND JSON_EXTRACT_PATH_TEXT(conversation_intent, 'main_intent') IS NOT NULL
           AND TRIM(JSON_EXTRACT_PATH_TEXT(conversation_intent, 'main_intent')) != ''
         ORDER BY main_intent`,
        []
      );
      intentOptions = intentResult.rows
        .map((r: { main_intent: string }) => r.main_intent)
        .filter(Boolean);
    } catch (err: any) {
      logger.warn('Failed to fetch conversation_intent filter options', { error: err?.message });
    }

    return {
      csatOptions: [
        { value: 'good', label: 'Good' },
        { value: 'okay', label: 'Okay' },
        { value: 'bad', label: 'Bad' },
        { value: null, label: 'No Rating' }
      ],
      studentCsatOptions: [
        { value: 'positive', label: 'Student Positive' },
        { value: 'negative', label: 'Student Negative' },
        { value: 'no_feedback', label: 'No Student Feedback' }
      ],
      intentOptions,
      channelOptions: [
        { value: 'website', label: 'Website' },
        { value: 'whatsapp', label: 'WhatsApp' }
      ],
      leadCreatedOptions: [
        { value: true, label: 'Lead Created' },
        { value: false, label: 'Lead Not Created' },
        { value: null, label: 'No Lead Data' }
      ]
    };
  }
};