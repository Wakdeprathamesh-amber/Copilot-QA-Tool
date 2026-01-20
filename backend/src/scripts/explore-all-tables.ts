import dotenv from 'dotenv';
import { query } from '../db/connection';

dotenv.config();

async function exploreAllTables() {
  console.log('🔍 Exploring All Tables for Zoho Source...\n');

  try {
    // 1. Explore whatsapp_conversations table structure
    console.log('='.repeat(80));
    console.log('1. WHATSAPP_CONVERSATIONS TABLE');
    console.log('='.repeat(80));
    
    const conversationsStructure = `
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
        CASE 
          WHEN wc.source_details IS NOT NULL AND wc.source_details NOT IN ('', 'null') AND wc.source_details LIKE '{%' 
          THEN JSON_PARSE(wc.source_details) 
          ELSE NULL 
        END AS source_details_parsed,
        CASE 
          WHEN wc.conversation_evaluation IS NOT NULL AND wc.conversation_evaluation NOT IN ('', 'null') AND wc.conversation_evaluation LIKE '{%' 
          THEN JSON_PARSE(wc.conversation_evaluation) 
          ELSE NULL 
        END AS conversation_evaluation_parsed,
        CASE 
          WHEN wc.meta IS NOT NULL AND wc.meta NOT IN ('', 'null') AND wc.meta LIKE '{%' 
          THEN JSON_PARSE(wc.meta) 
          ELSE NULL 
        END AS meta_parsed
      FROM whatsapp_conversations wc
      WHERE wc.source_details LIKE '%"source": "zoho"%'
      LIMIT 3;
    `;

    const convResult = await query(conversationsStructure);
    console.log(`\nSample Conversations (${convResult.rows.length}):\n`);
    
    convResult.rows.forEach((row, idx) => {
      console.log(`--- Conversation ${idx + 1} ---`);
      console.log(`ID: ${row.conversation_id}`);
      console.log(`Created: ${row.created_at}`);
      console.log(`Last Message: ${row.last_message_at}`);
      console.log(`Automation Enabled: ${row.automation_enabled}`);
      console.log(`Phone: ${row.phone_number}`);
      console.log(`Email: ${row.email}`);
      console.log(`User ID: ${row.user_id}`);
      
      if (row.source_details_parsed) {
        console.log(`\nSource Details:`);
        console.log(JSON.stringify(row.source_details_parsed, null, 2));
      }
      
      if (row.conversation_evaluation_parsed) {
        console.log(`\nConversation Evaluation:`);
        console.log(JSON.stringify(row.conversation_evaluation_parsed, null, 2));
      }
      
      if (row.meta_parsed) {
        console.log(`\nMeta:`);
        console.log(JSON.stringify(row.meta_parsed, null, 2));
      }
      
      console.log('\n' + '-'.repeat(80) + '\n');
    });

    // 2. Analyze conversation fields for filtering
    console.log('\n' + '='.repeat(80));
    console.log('2. CONVERSATION FIELDS ANALYSIS FOR FILTERING');
    console.log('='.repeat(80));
    
    const convAnalysis = `
      SELECT
        COUNT(*) as total,
        COUNT(DISTINCT JSON_EXTRACT_PATH_TEXT(wc.source_details, 'channel')) as distinct_channels,
        COUNT(DISTINCT CASE 
          WHEN wc.conversation_evaluation IS NOT NULL AND wc.conversation_evaluation NOT IN ('', 'null') AND wc.conversation_evaluation LIKE '{%' 
          THEN JSON_EXTRACT_PATH_TEXT(wc.conversation_evaluation, 'customer_satisfaction')
          ELSE NULL 
        END) as distinct_csat,
        COUNT(DISTINCT CASE 
          WHEN wc.conversation_evaluation IS NOT NULL AND wc.conversation_evaluation NOT IN ('', 'null') AND wc.conversation_evaluation LIKE '{%' 
          THEN JSON_EXTRACT_PATH_TEXT(wc.conversation_evaluation, 'resolution_status')
          ELSE NULL 
        END) as distinct_outcomes,
        COUNT(DISTINCT CASE 
          WHEN wc.conversation_evaluation IS NOT NULL AND wc.conversation_evaluation NOT IN ('', 'null') AND wc.conversation_evaluation LIKE '{%' 
          THEN JSON_EXTRACT_PATH_TEXT(wc.conversation_evaluation, 'main_intent')
          ELSE NULL 
        END) as distinct_intents,
        COUNT(DISTINCT CASE 
          WHEN wc.meta IS NOT NULL AND wc.meta NOT IN ('', 'null') AND wc.meta LIKE '{%' 
          THEN JSON_EXTRACT_PATH_TEXT(wc.meta, 'able_to_create_lead')
          ELSE NULL 
        END) as distinct_lead_created,
        COUNT(DISTINCT wc.automation_enabled) as distinct_automation_enabled
      FROM whatsapp_conversations wc
      WHERE wc.source_details LIKE '%"source": "zoho"%';
    `;

    const analysisResult = await query(convAnalysis);
    console.log('\nFilterable Fields Analysis:');
    console.log(JSON.stringify(analysisResult.rows[0], null, 2));

    // 3. Get distinct values for key fields
    console.log('\n' + '='.repeat(80));
    console.log('3. DISTINCT VALUES FOR KEY FIELDS');
    console.log('='.repeat(80));
    
    // Channels
    const channelsQuery = `
      SELECT DISTINCT
        JSON_EXTRACT_PATH_TEXT(wc.source_details, 'channel') as channel,
        COUNT(*) as count
      FROM whatsapp_conversations wc
      WHERE wc.source_details LIKE '%"source": "zoho"%'
        AND JSON_EXTRACT_PATH_TEXT(wc.source_details, 'channel') IS NOT NULL
      GROUP BY channel
      ORDER BY count DESC;
    `;
    
    const channelsResult = await query(channelsQuery);
    console.log('\nChannels:');
    channelsResult.rows.forEach(row => {
      console.log(`  ${row.channel || '(null)'}: ${row.count}`);
    });

    // CSAT values
    const csatQuery = `
      SELECT DISTINCT
        JSON_EXTRACT_PATH_TEXT(wc.conversation_evaluation, 'customer_satisfaction') as csat,
        COUNT(*) as count
      FROM whatsapp_conversations wc
      WHERE wc.source_details LIKE '%"source": "zoho"%'
        AND wc.conversation_evaluation IS NOT NULL
        AND wc.conversation_evaluation NOT IN ('', 'null')
        AND wc.conversation_evaluation LIKE '{%'
      GROUP BY csat
      ORDER BY count DESC
      LIMIT 10;
    `;
    
    const csatResult = await query(csatQuery);
    console.log('\nCSAT Values:');
    csatResult.rows.forEach(row => {
      console.log(`  ${row.csat || '(null)'}: ${row.count}`);
    });

    // Outcomes
    const outcomeQuery = `
      SELECT DISTINCT
        JSON_EXTRACT_PATH_TEXT(wc.conversation_evaluation, 'resolution_status') as outcome,
        COUNT(*) as count
      FROM whatsapp_conversations wc
      WHERE wc.source_details LIKE '%"source": "zoho"%'
        AND wc.conversation_evaluation IS NOT NULL
        AND wc.conversation_evaluation NOT IN ('', 'null')
        AND wc.conversation_evaluation LIKE '{%'
      GROUP BY outcome
      ORDER BY count DESC;
    `;
    
    const outcomeResult = await query(outcomeQuery);
    console.log('\nOutcomes:');
    outcomeResult.rows.forEach(row => {
      console.log(`  ${row.outcome || '(null)'}: ${row.count}`);
    });

    // Intents
    const intentQuery = `
      SELECT DISTINCT
        JSON_EXTRACT_PATH_TEXT(wc.conversation_evaluation, 'main_intent') as intent,
        COUNT(*) as count
      FROM whatsapp_conversations wc
      WHERE wc.source_details LIKE '%"source": "zoho"%'
        AND wc.conversation_evaluation IS NOT NULL
        AND wc.conversation_evaluation NOT IN ('', 'null')
        AND wc.conversation_evaluation LIKE '{%'
        AND JSON_EXTRACT_PATH_TEXT(wc.conversation_evaluation, 'main_intent') IS NOT NULL
      GROUP BY intent
      ORDER BY count DESC
      LIMIT 20;
    `;
    
    const intentResult = await query(intentQuery);
    console.log('\nTop Intents:');
    intentResult.rows.forEach(row => {
      console.log(`  ${row.intent || '(null)'}: ${row.count}`);
    });

    // Lead Created
    const leadQuery = `
      SELECT DISTINCT
        JSON_EXTRACT_PATH_TEXT(wc.meta, 'able_to_create_lead') as lead_created,
        COUNT(*) as count
      FROM whatsapp_conversations wc
      WHERE wc.source_details LIKE '%"source": "zoho"%'
        AND wc.meta IS NOT NULL
        AND wc.meta NOT IN ('', 'null')
        AND wc.meta LIKE '{%'
      GROUP BY lead_created
      ORDER BY count DESC;
    `;
    
    const leadResult = await query(leadQuery);
    console.log('\nLead Created:');
    leadResult.rows.forEach(row => {
      console.log(`  ${row.lead_created || '(null)'}: ${row.count}`);
    });

    // 4. Explore whatsapp_messages table for message-level filters
    console.log('\n' + '='.repeat(80));
    console.log('4. WHATSAPP_MESSAGES TABLE - MESSAGE LEVEL FILTERS');
    console.log('='.repeat(80));
    
    const messagesAnalysis = `
      SELECT
        COUNT(*) as total_messages,
        COUNT(DISTINCT wm.direction) as distinct_directions,
        COUNT(DISTINCT wm.message_type) as distinct_message_types,
        COUNT(DISTINCT wm.intent) as distinct_intents,
        COUNT(DISTINCT wm.agent_id) as distinct_agents,
        COUNT(DISTINCT CASE 
          WHEN wm.intent IS NOT NULL AND wm.intent != '' AND wm.intent NOT IN ('null', '[]', '{}')
          THEN wm.intent 
          ELSE NULL 
        END) as distinct_intent_values
      FROM whatsapp_messages wm
      JOIN whatsapp_conversations wc ON wm.conversation_id = wc.conversation_id
      WHERE wc.source_details LIKE '%"source": "zoho"%';
    `;
    
    const msgAnalysis = await query(messagesAnalysis);
    console.log('\nMessage Fields Analysis:');
    console.log(JSON.stringify(msgAnalysis.rows[0], null, 2));

    // Message directions
    const directionQuery = `
      SELECT
        wm.direction,
        COUNT(*) as count
      FROM whatsapp_messages wm
      JOIN whatsapp_conversations wc ON wm.conversation_id = wc.conversation_id
      WHERE wc.source_details LIKE '%"source": "zoho"%'
      GROUP BY wm.direction
      ORDER BY count DESC;
    `;
    
    const directionResult = await query(directionQuery);
    console.log('\nMessage Directions:');
    directionResult.rows.forEach(row => {
      console.log(`  ${row.direction || '(null)'}: ${row.count}`);
    });

    // 5. Explore chatbot_user_preferences table
    console.log('\n' + '='.repeat(80));
    console.log('5. CHATBOT_USER_PREFERENCES TABLE');
    console.log('='.repeat(80));
    
    const preferencesCheck = `
      SELECT COUNT(*) as total_preferences
      FROM chatbot_user_preferences cup
      WHERE EXISTS (
        SELECT 1 FROM whatsapp_conversations wc
        WHERE wc.user_id = cup.user_id
          AND wc.source_details LIKE '%"source": "zoho"%'
      );
    `;
    
    try {
      const prefCheck = await query(preferencesCheck);
      console.log(`\nTotal User Preferences linked to Zoho conversations: ${prefCheck.rows[0].total_preferences}`);
      
      if (parseInt(prefCheck.rows[0].total_preferences) > 0) {
        const prefSample = `
          SELECT *
          FROM chatbot_user_preferences cup
          WHERE EXISTS (
            SELECT 1 FROM whatsapp_conversations wc
            WHERE wc.user_id = cup.user_id
              AND wc.source_details LIKE '%"source": "zoho"%'
          )
          LIMIT 3;
        `;
        
        const prefSampleResult = await query(prefSample);
        console.log(`\nSample User Preferences (${prefSampleResult.rows.length}):\n`);
        prefSampleResult.rows.forEach((row, idx) => {
          console.log(`--- Preference ${idx + 1} ---`);
          console.log(`User ID: ${row.user_id}`);
          console.log(`Columns: ${Object.keys(row).join(', ')}`);
          console.log(`Data:`, JSON.stringify(row, null, 2));
          console.log('\n' + '-'.repeat(80) + '\n');
        });
      }
    } catch (error: any) {
      console.log(`\n⚠️  Could not query chatbot_user_preferences: ${error.message}`);
      console.log('   (Table might not exist or not accessible)');
    }

    // 6. Date/Time analysis
    console.log('\n' + '='.repeat(80));
    console.log('6. DATE/TIME RANGES FOR FILTERING');
    console.log('='.repeat(80));
    
    const dateRange = `
      SELECT
        MIN(wc.created_at) as earliest_conversation,
        MAX(wc.created_at) as latest_conversation,
        COUNT(*) as total_conversations,
        COUNT(CASE WHEN wc.last_message_at IS NOT NULL THEN 1 END) as ended_conversations,
        COUNT(CASE WHEN wc.last_message_at IS NULL THEN 1 END) as ongoing_conversations
      FROM whatsapp_conversations wc
      WHERE wc.source_details LIKE '%"source": "zoho"%';
    `;
    
    const dateResult = await query(dateRange);
    console.log('\nDate Range:');
    console.log(JSON.stringify(dateResult.rows[0], null, 2));

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
}

exploreAllTables();
