import { query } from '../db/connection';
import { Conversation, Message, ConversationFilters } from '../types';

interface ConversationRow {
  conversation_id: string;
  created_at: Date;
  last_message_at: Date;
  // Note: status column doesn't exist in production table
  source_details: string; // VARCHAR containing JSON
  conversation_evaluation: string; // VARCHAR containing JSON
  automation_enabled: string; // VARCHAR, not boolean
  phone_number: string | null;
  email: string | null;
  user_id: string;
}

interface MessageRow {
  id: number;
  conversation_id: string;
  message_content: string;
  created_at: Date;
  message_type: string;
  direction: string | null;
  agent_id: string | null;
  from_number: string;
  to_number: string;
  status: string;
}

// Helper function to map channel
const mapChannel = (sourceDetails: any): 'website' | 'whatsapp' => {
  const channel = sourceDetails?.channel;
  if (channel === 'whatsapp') return 'whatsapp';
  if (channel === 'zd:answerBot' || channel === 'web' || channel === 'zd:agentWorkspace') return 'website';
  if (channel === 'android' || channel === 'ios') return 'website'; // Mobile apps map to website
  return 'website'; // Default
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

// Helper function to map outcome
// Note: status column doesn't exist, so we determine outcome from conversation_evaluation only
const mapOutcome = (evaluation: any): 'qualified' | 'dropped' | 'escalated' | 'ongoing' => {
  const resolutionStatus = evaluation?.resolution_status;
  if (resolutionStatus === 'resolved') return 'qualified';
  if (resolutionStatus === 'unresolved') return 'dropped';
  if (resolutionStatus === 'escalated') return 'escalated';
  // If no resolution_status, assume ongoing
  return 'ongoing'; // Default
};

// Helper function to map sender
const mapSender = (direction: string | null, agentId: string | null): 'user' | 'ai' | 'human' => {
  if (direction === 'inbound') return 'user';
  if (direction === 'outbound' && agentId) return 'human';
  if (direction === 'outbound') return 'ai';
  // Fallback: if no direction, guess based on agent_id
  return agentId ? 'human' : 'user';
};

// Simple in-memory cache for total count (valid for 60 seconds)
let totalCountCache: { count: number; timestamp: number; filters: string } | null = null;
const CACHE_TTL = 60000; // 60 seconds

export const conversationRepository = {
  async list(filters: ConversationFilters, page: number = 1, pageSize: number = 50, search?: string, sortBy?: string) {
    let whereConditions: string[] = [];
    let params: any[] = [];
    let paramIndex = 1;

    // Build WHERE conditions for parsed JSON
    // We'll use CTE to parse JSON first, then filter on parsed values

    // Base condition: only fetch conversations with valid channels
    // Channel values: android, ios, web, whatsapp, zd:agentWorkspace, zd:answerBot
    // Note: This filter is applied in the CTE WHERE clause, not here
    // We filter valid channels in the CTE itself

    // Search filter
    if (search && search.trim()) {
      const searchPattern = `%${search.trim().toLowerCase()}%`;
      whereConditions.push(`(
        LOWER(wc.conversation_id) LIKE $${paramIndex} OR
        LOWER(ce.summary::varchar) LIKE $${paramIndex} OR
        LOWER(m.main_intent::varchar) LIKE $${paramIndex}
      )`);
      params.push(searchPattern);
      paramIndex++;
    }

    // CSAT filter
    if (filters.csat && filters.csat.length > 0) {
      const csatConditions = filters.csat.map(csat => {
        if (csat === null) {
          return `(ce.customer_satisfaction::varchar IS NULL OR ce.customer_satisfaction::varchar = '3')`;
        } else if (csat === 'good') {
          return `CAST(ce.customer_satisfaction::varchar AS INTEGER) >= 4`;
        } else if (csat === 'bad') {
          return `CAST(ce.customer_satisfaction::varchar AS INTEGER) <= 2`;
        }
        return 'false';
      });
      whereConditions.push(`(${csatConditions.join(' OR ')})`);
    }

    // Channel filter
    if (filters.channel && filters.channel.length > 0) {
      const channelConditions = filters.channel.map(ch => {
        if (ch === 'website') {
          return `sd.channel::varchar IN ('zd:answerBot', 'web', 'zd:agentWorkspace', 'android', 'ios')`;
        } else if (ch === 'whatsapp') {
          return `sd.channel::varchar = 'whatsapp'`;
        }
        return 'false';
      });
      whereConditions.push(`(${channelConditions.join(' OR ')})`);
    }

    // Intent filter (use meta.main_intent instead of conversation_evaluation.theme.main_theme)
    if (filters.intent && filters.intent.length > 0) {
      const intentPlaceholders = filters.intent.map(() => `$${paramIndex++}`).join(', ');
      filters.intent.forEach(intent => params.push(intent));
      whereConditions.push(`m.main_intent::varchar IN (${intentPlaceholders})`);
    }

    // Human Handover filter (check meta.agent_id - more reliable than message agent_id)
    if (filters.humanHandover !== undefined) {
      if (filters.humanHandover) {
        whereConditions.push(`(m.agent_id IS NOT NULL AND m.agent_id::varchar != '')`);
      } else {
        whereConditions.push(`(m.agent_id IS NULL OR m.agent_id::varchar = '')`);
      }
    }

    // Lead created filter (from meta.able_to_create_lead)
    // Note: In Redshift SUPER type (parsed JSON), booleans are stored as actual booleans
    // We compare directly with boolean values, but also handle string representations
    if (filters.leadCreated !== undefined) {
      if (filters.leadCreated === true) {
        // Check for boolean true - try direct comparison first, then string comparison
        whereConditions.push(`(
          (m.able_to_create_lead = true)
          OR (m.able_to_create_lead::varchar IN ('true', 'True', 'TRUE'))
        )`);
      } else if (filters.leadCreated === false) {
        // Check for boolean false
        whereConditions.push(`(
          (m.able_to_create_lead = false)
          OR (m.able_to_create_lead::varchar IN ('false', 'False', 'FALSE'))
        )`);
      } else if (filters.leadCreated === null) {
        // Filter for conversations with no lead data
        whereConditions.push(`(m IS NULL OR m.able_to_create_lead IS NULL)`);
      }
    }

    // Date filters
    // dateFrom: Include from start of the day (00:00:00)
    // dateTo: Include until end of the day (23:59:59) by using next day and < comparison
    if (filters.dateFrom) {
      whereConditions.push(`DATE(wc.created_at) >= DATE($${paramIndex})`);
      params.push(filters.dateFrom);
      paramIndex++;
    }

    if (filters.dateTo) {
      // Include the entire end date by checking if created_at is before the next day
      whereConditions.push(`DATE(wc.created_at) <= DATE($${paramIndex})`);
      params.push(filters.dateTo);
      paramIndex++;
    }


    // Sorting - Note: For message count and duration sorting, we need to use the alias from SELECT
    let orderBy = 'wc.created_at DESC'; // Default
    if (sortBy === 'oldest') orderBy = 'wc.created_at ASC';
    else if (sortBy === 'newest') orderBy = 'wc.created_at DESC';
    else if (sortBy === 'most_messages') orderBy = 'message_count DESC';
    else if (sortBy === 'least_messages') orderBy = 'message_count ASC';
    else if (sortBy === 'longest_duration') {
      // Sort by duration: endTime - startTime (longest first)
      // Use the calculated duration_seconds from SELECT
      orderBy = `duration_seconds DESC`;
    }
    else if (sortBy === 'shortest_duration') {
      // Sort by duration: endTime - startTime (shortest first)
      // Use the calculated duration_seconds from SELECT
      orderBy = `duration_seconds ASC`;
    }
    else if (sortBy === 'highest_csat') {
      // Sort by CSAT: good (4-5) > neutral (3) > bad (1-2) > null
      // Will use csat_sort_value from SELECT
      orderBy = `csat_sort_value DESC, wc.created_at DESC`;
    }
    else if (sortBy === 'lowest_csat') {
      // Sort by CSAT: bad (1-2) > neutral (3) > good (4-5) > null
      // For lowest, we want: bad=3, neutral=2, good=1, null=0 (reverse of highest)
      // Will use csat_sort_value from SELECT, but need to reverse the logic
      orderBy = `CASE 
        WHEN csat_sort_value = 1 THEN 3  -- bad first
        WHEN csat_sort_value = 2 THEN 2  -- neutral second
        WHEN csat_sort_value = 3 THEN 1  -- good third
        ELSE 0  -- null last
      END DESC, wc.created_at DESC`;
    }
    else if (sortBy === 'recently_assessed' || sortBy === 'unassessed_first') {
      // Note: QA assessments are currently in memory, not in database
      // For now, we'll sort by created_at as fallback
      // TODO: When qa_assessments table is available, join and sort by qa.updated_at
      if (sortBy === 'recently_assessed') {
        orderBy = 'wc.created_at DESC'; // Fallback until qa_assessments table is available
      } else {
        orderBy = 'wc.created_at ASC'; // Fallback until qa_assessments table is available
      }
    }

    // Use CTE to parse JSON first, then filter and join
    const offset = (page - 1) * pageSize;
    
    // Combine all WHERE conditions (Zoho filter already applied in CTE)
    const allWhereConditions = [
      ...whereConditions // Additional filters
    ];
    const whereClause = allWhereConditions.length > 0 ? `WHERE ${allWhereConditions.join(' AND ')}` : '';
    
    // Count total with CTE
    const countQuery = `
      WITH parsed_conversations AS (
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
          JSON_PARSE(wc.source_details) AS sd,
          JSON_PARSE(wc.conversation_evaluation) AS ce,
          CASE 
            WHEN wc.meta IS NOT NULL AND wc.meta NOT IN ('', 'null') AND wc.meta LIKE '{%' 
            THEN JSON_PARSE(wc.meta) 
            ELSE NULL 
          END AS m
        FROM whatsapp_conversations wc
        WHERE wc.source_details IS NOT NULL
          AND wc.source_details NOT IN ('', 'null')
          AND wc.source_details LIKE '{%'
          AND wc.source_details LIKE '%"source": "zoho"%'
      )
      SELECT COUNT(DISTINCT wc.conversation_id) as total
      FROM parsed_conversations wc
      LEFT JOIN whatsapp_messages wm ON wc.conversation_id = wm.conversation_id
      ${whereClause}
    `;
    
    // Use cached total count if available and filters haven't changed
    const filterKey = JSON.stringify({ filters, search });
    let total: number;
    
    if (totalCountCache && 
        totalCountCache.filters === filterKey && 
        Date.now() - totalCountCache.timestamp < CACHE_TTL) {
      // Use cached count
      total = totalCountCache.count;
    } else {
      // Query for fresh count
      const countResult = await query(countQuery, params);
      total = parseInt(countResult.rows[0].total);
      
      // Cache it
      totalCountCache = {
        count: total,
        timestamp: Date.now(),
        filters: filterKey
      };
    }

    // Main query with CTE
    const listQuery = `
      WITH parsed_conversations AS (
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
          JSON_PARSE(wc.source_details) AS sd,
          JSON_PARSE(wc.conversation_evaluation) AS ce,
          CASE 
            WHEN wc.meta IS NOT NULL AND wc.meta NOT IN ('', 'null') AND wc.meta LIKE '{%' 
            THEN JSON_PARSE(wc.meta) 
            ELSE NULL 
          END AS m
        FROM whatsapp_conversations wc
        WHERE wc.source_details IS NOT NULL
          AND wc.source_details NOT IN ('', 'null')
          AND wc.source_details LIKE '{%'
          AND wc.source_details LIKE '%"source": "zoho"%'
      )
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
        COUNT(wm.id) as message_count,
        MAX(wm.created_at) as last_message_time,
        MAX(CASE WHEN wc.m.agent_id IS NOT NULL AND wc.m.agent_id::varchar != '' THEN 1 ELSE 0 END) as has_human_agent,
        -- Calculate duration for sorting (in seconds)
        COALESCE(EXTRACT(EPOCH FROM (MAX(wm.created_at) - wc.created_at)), 0) as duration_seconds,
        -- Calculate CSAT sort value: good (4-5)=3, neutral (3)=2, bad (1-2)=1, null=0
        CASE 
          WHEN wc.ce.customer_satisfaction::varchar IS NOT NULL 
            AND wc.ce.customer_satisfaction::varchar != '' 
            AND CAST(wc.ce.customer_satisfaction::varchar AS INTEGER) >= 4 THEN 3
          WHEN wc.ce.customer_satisfaction::varchar IS NOT NULL 
            AND wc.ce.customer_satisfaction::varchar != '' 
            AND CAST(wc.ce.customer_satisfaction::varchar AS INTEGER) = 3 THEN 2
          WHEN wc.ce.customer_satisfaction::varchar IS NOT NULL 
            AND wc.ce.customer_satisfaction::varchar != '' 
            AND CAST(wc.ce.customer_satisfaction::varchar AS INTEGER) <= 2 THEN 1
          ELSE 0
        END as csat_sort_value
      FROM parsed_conversations wc
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

    // Deduplicate conversations by ID (in case GROUP BY with parsed JSON objects causes duplicates)
    const seenIds = new Set<string>();
    const uniqueRows = result.rows.filter((row: any) => {
      if (seenIds.has(row.conversation_id)) {
        return false;
      }
      seenIds.add(row.conversation_id);
      return true;
    });

    const conversations: Conversation[] = uniqueRows.map((row: any) => {
      // Parse JSON strings from VARCHAR columns
      let evaluation = {};
      let sourceDetails = {};
      try {
        evaluation = row.conversation_evaluation ? JSON.parse(row.conversation_evaluation) : {};
      } catch (e) {
        // If parsing fails, use empty object
      }
      try {
        sourceDetails = row.source_details ? JSON.parse(row.source_details) : {};
      } catch (e) {
        // If parsing fails, use empty object
      }
      let meta = {};
      try {
        meta = row.meta ? JSON.parse(row.meta) : {};
      } catch (e) {
        // If parsing fails, use empty object
      }

      // Extract leadCreated from meta.able_to_create_lead
      // Note: In Redshift, boolean values in JSON are stored as strings "true"/"false"
      let leadCreated: boolean | null = null;
      if (meta && typeof meta === 'object' && 'able_to_create_lead' in meta) {
        const value = meta.able_to_create_lead;
        if (value === true || value === 'true') {
          leadCreated = true;
        } else if (value === false || value === 'false') {
          leadCreated = false;
        }
      }

      return {
        id: row.conversation_id,
        channel: mapChannel(sourceDetails),
        startTime: row.created_at,
        endTime: row.last_message_time || null,
        participantCount: 1, // Default for now
        aiAgentVersion: 'v1.0.0', // Hardcoded
        promptVersion: 'v1.0.0', // Hardcoded
        kbVersion: 'v1.0.0', // Hardcoded
        detectedIntent: (meta && typeof meta === 'object' && 'main_intent' in meta && meta.main_intent) 
          ? String(meta.main_intent) 
          : (evaluation && typeof evaluation === 'object' && 'theme' in evaluation && evaluation.theme && typeof evaluation.theme === 'object' && 'main_theme' in evaluation.theme && evaluation.theme.main_theme ? String(evaluation.theme.main_theme) : null),
        outcome: mapOutcome(evaluation),
        csat: mapCSAT(evaluation),
        humanHandover: row.has_human_agent === 1,
        interactionType: row.has_human_agent === 1 ? 'ai_to_human_handover' : 'ai_only',
        autoSummary: (evaluation && typeof evaluation === 'object' && 'summary' in evaluation && evaluation.summary) ? String(evaluation.summary) : null,
        createdAt: row.created_at,
        updatedAt: row.created_at,
        messageCount: parseInt(row.message_count) || 0,
        lastMessageTime: row.last_message_time || null,
        leadCreated: leadCreated,
      };
    });

    return {
      conversations,
      total,
      page,
      pageSize,
    };
  },

  async getById(conversationId: string, includeMessages: boolean = false) {
    const conversationQuery = `
      WITH parsed_conversation AS (
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
          JSON_PARSE(wc.source_details) AS sd,
          JSON_PARSE(wc.conversation_evaluation) AS ce,
          CASE 
            WHEN wc.meta IS NOT NULL AND wc.meta NOT IN ('', 'null') AND wc.meta LIKE '{%' 
            THEN JSON_PARSE(wc.meta) 
            ELSE NULL 
          END AS m
        FROM whatsapp_conversations wc
        WHERE wc.conversation_id = $1
          AND wc.source_details IS NOT NULL
          AND wc.source_details NOT IN ('', 'null')
          AND wc.source_details LIKE '{%'
          AND wc.source_details LIKE '%"source": "zoho"%'
      )
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
        COUNT(wm.id) as message_count,
        MAX(wm.created_at) as last_message_time,
        CASE WHEN wc.m.agent_id IS NOT NULL AND wc.m.agent_id::varchar != '' THEN 1 ELSE 0 END as has_human_agent
      FROM parsed_conversation wc
      LEFT JOIN whatsapp_messages wm ON wc.conversation_id = wm.conversation_id
      GROUP BY wc.conversation_id, wc.created_at, wc.last_message_at, 
               wc.source_details, wc.conversation_evaluation, wc.meta,
               wc.automation_enabled, wc.phone_number, wc.email, wc.user_id, wc.m
    `;

    const result = await query(conversationQuery, [conversationId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    // Parse JSON strings from VARCHAR columns
    let evaluation = {};
    let sourceDetails = {};
    let meta = {};
    try {
      evaluation = row.conversation_evaluation ? JSON.parse(row.conversation_evaluation) : {};
    } catch (e) {
      // If parsing fails, use empty object
    }
    try {
      sourceDetails = row.source_details ? JSON.parse(row.source_details) : {};
    } catch (e) {
      // If parsing fails, use empty object
    }
    try {
      meta = row.meta ? JSON.parse(row.meta) : {};
    } catch (e) {
      // If parsing fails, use empty object
    }

    const conversation: Conversation & { messages?: Message[] } = {
      id: row.conversation_id,
      channel: mapChannel(sourceDetails),
      startTime: row.created_at,
      endTime: row.last_message_time || null,
      participantCount: 1,
      aiAgentVersion: 'v1.0.0',
      promptVersion: 'v1.0.0',
      kbVersion: 'v1.0.0',
      detectedIntent: (meta && typeof meta === 'object' && 'main_intent' in meta && meta.main_intent) 
        ? String(meta.main_intent) 
        : (evaluation && typeof evaluation === 'object' && 'theme' in evaluation && evaluation.theme && typeof evaluation.theme === 'object' && 'main_theme' in evaluation.theme && evaluation.theme.main_theme ? String(evaluation.theme.main_theme) : null),
      outcome: mapOutcome(evaluation),
      csat: mapCSAT(evaluation),
      humanHandover: row.has_human_agent === 1,
      interactionType: row.has_human_agent === 1 ? 'ai_to_human_handover' : 'ai_only',
      autoSummary: (evaluation && typeof evaluation === 'object' && 'summary' in evaluation && evaluation.summary) ? String(evaluation.summary) : null,
      createdAt: row.created_at,
      updatedAt: row.created_at,
    };

    if (includeMessages) {
      // Optimization: Limit messages to prevent timeouts on large conversations
      const messagesQuery = `
        SELECT 
          wm.id,
          wm.conversation_id,
          wm.message_id,
          wm.message_content,
          wm.created_at,
          wm.message_type,
          wm.direction,
          wm.agent_id,
          wm.from_number,
          wm.to_number,
          wm.status,
          wm.intent,
          wm.trace_id,
          wm.raw_payload,
          wm.meta
        FROM whatsapp_messages wm
        WHERE wm.conversation_id = $1
        ORDER BY wm.created_at ASC
        LIMIT 200
      `;

      const messagesResult = await query(messagesQuery, [conversationId]);

      // Helper function to parse message content
      // Priority: 1. raw_payload.text (clean text), 2. Parse message_content JSON, 3. Plain text
      const parseMessageContent = (messageContent: string | null, rawPayload: string | null): string => {
        // First priority: Check if raw_payload.text exists (clean text version - best source!)
        if (rawPayload) {
          try {
            const payload = typeof rawPayload === 'string' ? JSON.parse(rawPayload) : rawPayload;
            if (payload && typeof payload === 'object' && payload.text && typeof payload.text === 'string') {
              return payload.text.trim();
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
        
        if (!messageContent) return '';
        
        try {
          // Try to parse as JSON
          const parsed = JSON.parse(messageContent);
          
          // If it's an array (like [{"content": {"type": "text", "data": "..."}}])
          if (Array.isArray(parsed) && parsed.length > 0) {
            const contentParts: string[] = [];
            
            for (const item of parsed) {
              if (item.content) {
                // Handle structure: {"content": {"type": "text", "data": "..."}}
                if (typeof item.content === 'object' && item.content.data) {
                  const data = item.content.data;
                  // If data contains HTML, extract text from it
                  if (typeof data === 'string') {
                    // Simple HTML tag stripping (basic approach)
                    const textContent = data
                      .replace(/<[^>]*>/g, '') // Remove HTML tags
                      .replace(/&nbsp;/g, ' ')
                      .replace(/&amp;/g, '&')
                      .replace(/&lt;/g, '<')
                      .replace(/&gt;/g, '>')
                      .replace(/&quot;/g, '"')
                      .replace(/&#39;/g, "'")
                      .replace(/\\u([0-9a-fA-F]{4})/g, (match, code) => String.fromCharCode(parseInt(code, 16))) // Handle unicode escapes
                      .trim();
                    if (textContent) contentParts.push(textContent);
                  } else {
                    contentParts.push(String(data));
                  }
                } else if (typeof item.content === 'string') {
                  contentParts.push(item.content);
                }
              } else if (typeof item === 'string') {
                // If item is directly a string
                contentParts.push(item);
              } else if (item.text || item.message) {
                // Other possible structures
                contentParts.push(item.text || item.message);
              }
            }
            
            return contentParts.join(' ').trim() || messageContent;
          }
          
          // If it's an object with text/message/content properties
          if (typeof parsed === 'object') {
            return parsed.text || parsed.message || parsed.content || parsed.data || messageContent;
          }
          
          // If parsed is a string, return it
          if (typeof parsed === 'string') {
            return parsed;
          }
          
          return messageContent;
        } catch (e) {
          // If parsing fails, return as-is (it's plain text)
          return messageContent;
        }
      };

      // Helper function to parse intent (might be JSON array like ["lead_details"])
      const parseIntent = (intent: string | null): string | null => {
        if (!intent) return null;
        
        try {
          const parsed = JSON.parse(intent);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed[0]; // Return first intent
          }
          if (typeof parsed === 'string') {
            return parsed;
          }
          return intent;
        } catch (e) {
          // If not JSON, return as-is
          return intent;
        }
      };

      conversation.messages = messagesResult.rows.map((msgRow: any) => {
        const sender = mapSender(msgRow.direction, msgRow.agent_id);
        
        // Parse meta JSON if needed
        let metaParsed = null;
        if (msgRow.meta && typeof msgRow.meta === 'string') {
          try {
            metaParsed = JSON.parse(msgRow.meta);
          } catch (e) {
            // Ignore parse errors
          }
        } else {
          metaParsed = msgRow.meta;
        }
        
        // Parse raw_payload if it's a string (contains clean text)
        let rawPayload = null;
        if (msgRow.raw_payload && typeof msgRow.raw_payload === 'string') {
          try {
            rawPayload = JSON.parse(msgRow.raw_payload);
          } catch (e) {
            // Ignore parse errors
          }
        } else if (msgRow.raw_payload) {
          rawPayload = msgRow.raw_payload;
        }
        
        // Parse meta for operator info (human messages)
        let operatorName = null;
        if (msgRow.meta_parsed && typeof msgRow.meta_parsed === 'object') {
          operatorName = msgRow.meta_parsed.operator_name || null;
        } else if (msgRow.meta && typeof msgRow.meta === 'string') {
          try {
            const meta = JSON.parse(msgRow.meta);
            operatorName = meta?.operator_name || null;
          } catch (e) {
            // Ignore parse errors
          }
        }
        
        const parsedContent = parseMessageContent(msgRow.message_content, rawPayload);
        const parsedIntent = parseIntent(msgRow.intent);
        
        // Use real trace_id from database, only for AI messages (outbound without agent_id)
        const traceId = (sender === 'ai' && msgRow.trace_id) ? msgRow.trace_id : null;
        
        return {
          id: msgRow.id?.toString() || msgRow.message_id || '',
          conversationId: msgRow.conversation_id,
          sender,
          content: parsedContent,
          timestamp: msgRow.created_at,
          messageType: (msgRow.message_type === 'text' || !msgRow.message_type) ? 'text' : 
                      msgRow.message_type === 'file' ? 'file' : 'text',
          intent: parsedIntent, // Parsed intent
          processingLatency: null, // Not available in whatsapp_messages table
          langsmithTraceId: traceId, // Real trace ID from database
          promptUsed: null, // Not available in whatsapp_messages table
          ragContext: null, // Not available in whatsapp_messages table
          modelOutput: null, // Not available in whatsapp_messages table
          toolCalls: null, // Not available in whatsapp_messages table
          errors: null, // Not available in whatsapp_messages table
          // Additional metadata for display
          operatorName: operatorName || undefined, // Operator name for human messages
        };
      });
    }

    return conversation;
  },

  async getFilterOptions() {
    // Get distinct intents from meta.main_intent (not conversation_evaluation.theme.main_theme)
    const intentsQuery = `
      WITH parsed_meta AS (
        SELECT
          CASE 
            WHEN meta IS NOT NULL AND meta NOT IN ('', 'null') AND meta LIKE '{%' 
            THEN JSON_PARSE(meta) 
            ELSE NULL 
          END AS m
        FROM whatsapp_conversations
        WHERE source_details IS NOT NULL
          AND source_details NOT IN ('', 'null')
          AND source_details LIKE '{%'
          AND source_details LIKE '%"source": "zoho"%'
          AND meta IS NOT NULL
          AND meta NOT IN ('', 'null')
          AND meta LIKE '{%'
      )
      SELECT DISTINCT m.main_intent::varchar as intent
      FROM parsed_meta
      WHERE m.main_intent::varchar IS NOT NULL
        AND m.main_intent::varchar != ''
      ORDER BY intent
    `;
    const intentsResult = await query(intentsQuery);
    const intents = intentsResult.rows.map(r => r.intent).filter(Boolean);

    return {
      csatOptions: [
        { value: 'good', label: 'Good' },
        { value: 'bad', label: 'Bad' },
        { value: null, label: 'No Rating' },
      ],
      intentOptions: intents,
      channelOptions: [
        { value: 'website', label: 'Website' },
        { value: 'whatsapp', label: 'WhatsApp' },
      ],
      leadCreatedOptions: [
        { value: true, label: 'Lead Created' },
        { value: false, label: 'Lead Not Created' },
        { value: null, label: 'No Lead Data' },
      ],
    };
  },
};
