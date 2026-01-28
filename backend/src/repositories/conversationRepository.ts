import { query } from '../db/connection';
import { Conversation, Message, ConversationFilters } from '../types';

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

    // Build WHERE clause
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Sorting
    let orderBy = 'wc.created_at DESC'; // Default
    if (sortBy === 'oldest') orderBy = 'wc.created_at ASC';
    else if (sortBy === 'newest') orderBy = 'wc.created_at DESC';

    // Count total
    const countQuery = `
      SELECT COUNT(DISTINCT wc.conversation_id) as total
      FROM whatsapp_conversations wc
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
          status
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
        langsmithTraceId: null,
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