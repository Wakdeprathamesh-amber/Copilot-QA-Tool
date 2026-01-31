import { query } from '../db/connection';
import { Conversation, Message, ConversationFilters } from '../types';

type QARatingFilterValue = 'good' | 'okay' | 'bad' | null;

// Helper function to map channel
const mapChannel = (sourceDetails: any): 'website' | 'whatsapp' => {
  const channel = sourceDetails?.channel;
  if (channel === 'whatsapp') return 'whatsapp';
  return 'website'; // Default for all others
};

// Helper function to map CSAT
const mapCSAT = (evaluation: any): 'good' | 'bad' | null => {
  const satisfaction = evaluation?.customer_satisfaction;
  if (!satisfaction) return null;
  const score = parseInt(satisfaction);
  if (score >= 4) return 'good';
  if (score <= 2) return 'bad';
  return null; // 3 is neutral
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

    // Intent filter - from meta or conversation_evaluation
    if (filters.intent && filters.intent.length > 0) {
      whereConditions.push(`(
        JSON_EXTRACT_PATH_TEXT(wc.meta, 'main_intent') IN (${filters.intent.map((_, i) => `$${paramIndex + i}`).join(', ')})
        OR JSON_EXTRACT_PATH_TEXT(wc.conversation_evaluation, 'main_intent') IN (${filters.intent.map((_, i) => `$${paramIndex + filters.intent!.length + i}`).join(', ')})
      )`);
      params.push(...filters.intent, ...filters.intent);
      paramIndex += filters.intent.length * 2;
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
        wc.automation_enabled,
        wc.phone_number,
        wc.email,
        wc.user_id,
        COUNT(wm.id) as message_count
      FROM whatsapp_conversations wc
      LEFT JOIN whatsapp_messages wm ON wc.conversation_id = wm.conversation_id
      ${qaJoin}
      ${whereClause}
      GROUP BY wc.conversation_id, wc.created_at, wc.last_message_at, 
               wc.source_details, wc.conversation_evaluation, wc.meta,
               wc.automation_enabled, wc.phone_number, wc.email, wc.user_id
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

      return {
        id: row.conversation_id,
        channel: mapChannel(sourceDetails),
        startTime: row.created_at,
        endTime: row.last_message_at,
        participantCount: 2, // Simplified: user + AI
        aiAgentVersion: 'v1.0', // Placeholder
        promptVersion: 'v1.0', // Placeholder
        kbVersion: 'v1.0', // Placeholder
        detectedIntent: (meta as any).main_intent || (evaluation as any).theme?.main_theme || null,
        outcome: 'ongoing',
        csat: mapCSAT(evaluation),
        humanHandover: !!((meta as any).agent_id),
        interactionType: ((meta as any).agent_id ? 'ai_to_human_handover' : 'ai_only'),
        autoSummary: (evaluation as any).summary || null,
        createdAt: row.created_at,
        updatedAt: row.last_message_at || row.created_at,
        messageCount: parseInt(row.message_count) || 0,
        lastMessageTime: row.last_message_at,
        leadCreated: (meta as any).able_to_create_lead === true || (meta as any).able_to_create_lead === 'true'
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
        wc.automation_enabled,
        wc.phone_number,
        wc.email,
        wc.user_id,
        COUNT(wm.id) as message_count
      FROM whatsapp_conversations wc
      LEFT JOIN whatsapp_messages wm ON wc.conversation_id = wm.conversation_id
      WHERE wc.conversation_id = $1
      GROUP BY wc.conversation_id, wc.created_at, wc.last_message_at, 
               wc.source_details, wc.conversation_evaluation, wc.meta,
               wc.automation_enabled, wc.phone_number, wc.email, wc.user_id
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

    const conversation: Conversation = {
      id: row.conversation_id,
      channel: mapChannel(sourceDetails),
      startTime: row.created_at,
      endTime: row.last_message_at,
      participantCount: 2, // Simplified: user + AI
      aiAgentVersion: 'v1.0', // Placeholder
      promptVersion: 'v1.0', // Placeholder
      kbVersion: 'v1.0', // Placeholder
      detectedIntent: (meta as any).main_intent || (evaluation as any).theme?.main_theme || null,
      outcome: 'ongoing', // Simplified
      csat: mapCSAT(evaluation),
      humanHandover: !!((meta as any).agent_id),
      interactionType: ((meta as any).agent_id ? 'ai_to_human_handover' : 'ai_only'),
      autoSummary: (evaluation as any).summary || null,
      createdAt: row.created_at,
      updatedAt: row.last_message_at || row.created_at,
      messageCount: parseInt(row.message_count) || 0,
      lastMessageTime: row.last_message_at,
      leadCreated: (meta as any).able_to_create_lead === true || (meta as any).able_to_create_lead === 'true'
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
          trace_id
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
        intent: null, // Simplified
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
    // Return filter options in the format expected by frontend
    return {
      csatOptions: [
        { value: 'good', label: 'Good' },
        { value: 'okay', label: 'Okay' },
        { value: 'bad', label: 'Bad' },
        { value: null, label: 'No Rating' }
      ],
      intentOptions: ['general_inquiry', 'support', 'sales', 'billing'],
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