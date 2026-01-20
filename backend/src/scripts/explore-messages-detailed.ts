import dotenv from 'dotenv';
import { query } from '../db/connection';

dotenv.config();

async function exploreDetailed() {
  console.log('🔍 Detailed Message Exploration...\n');

  try {
    // Get messages with raw meta field (not parsed)
    const queryRaw = `
      SELECT
        wm.id,
        wm.message_id,
        wm.conversation_id,
        wm.message_content,
        wm.meta,
        wm.intent,
        wm.direction,
        wm.agent_id,
        wm.message_type,
        wm.created_at
      FROM whatsapp_messages wm
      JOIN whatsapp_conversations wc
        ON wm.conversation_id = wc.conversation_id
      WHERE wc.source_details LIKE '%"source": "zoho"%'
        AND wm.meta IS NOT NULL
        AND wm.meta NOT IN ('', 'null', '{}')
      ORDER BY wm.created_at DESC
      LIMIT 5;
    `;

    console.log('Checking messages with non-empty meta...\n');
    const result = await query(queryRaw);

    if (result.rows.length > 0) {
      console.log(`Found ${result.rows.length} messages with meta data:\n`);
      
      result.rows.forEach((row, idx) => {
        console.log(`=== Message ${idx + 1} ===`);
        console.log(`ID: ${row.id}`);
        console.log(`Message ID: ${row.message_id}`);
        console.log(`\nRaw Meta (type: ${typeof row.meta}):`);
        console.log(row.meta);
        console.log(`\nMeta Length: ${row.meta ? (typeof row.meta === 'string' ? row.meta.length : JSON.stringify(row.meta).length) : 0}`);
        
        // Try to parse meta
        if (row.meta && typeof row.meta === 'string') {
          try {
            const parsed = JSON.parse(row.meta);
            console.log(`\nParsed Meta:`);
            console.log(JSON.stringify(parsed, null, 2));
            if (parsed.text) {
              console.log(`\n✨ Found meta.text: ${parsed.text}`);
            }
          } catch (e) {
            console.log(`\n❌ Failed to parse meta as JSON: ${e}`);
          }
        }
        
        console.log(`\nMessage Content (first 200 chars):`);
        console.log(row.message_content ? (row.message_content.length > 200 ? row.message_content.substring(0, 200) + '...' : row.message_content) : 'NULL');
        console.log('\n' + '-'.repeat(80) + '\n');
      });
    } else {
      console.log('No messages found with non-empty meta field.\n');
      console.log('Let me check all messages to see meta field distribution...\n');
      
      const checkQuery = `
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN meta IS NULL OR meta = '' OR meta = 'null' OR meta = '{}' THEN 1 END) as empty_meta,
          COUNT(CASE WHEN meta IS NOT NULL AND meta != '' AND meta != 'null' AND meta != '{}' THEN 1 END) as has_meta
        FROM whatsapp_messages wm
        JOIN whatsapp_conversations wc
          ON wm.conversation_id = wc.conversation_id
        WHERE wc.source_details LIKE '%"source": "zoho"%';
      `;
      
      const checkResult = await query(checkQuery);
      console.log('Meta Field Distribution:');
      console.log(JSON.stringify(checkResult.rows[0], null, 2));
    }

    // Check preference field - might contain the text field!
    console.log('\n\n=== Checking Preference Field (might contain text!) ===\n');
    
    const preferenceQuery = `
      SELECT
        wm.id,
        wm.message_id,
        wm.message_content,
        wm.preference,
        wm.meta,
        wm.intent,
        wm.direction,
        wm.agent_id
      FROM whatsapp_messages wm
      JOIN whatsapp_conversations wc
        ON wm.conversation_id = wc.conversation_id
      WHERE wc.source_details LIKE '%"source": "zoho"%'
        AND wm.preference IS NOT NULL
        AND wm.preference != ''
        AND wm.preference != 'null'
        AND wm.preference != '{}'
      ORDER BY wm.created_at DESC
      LIMIT 5;
    `;
    
    const preferenceResult = await query(preferenceQuery);
    console.log(`Found ${preferenceResult.rows.length} messages with preference data:\n`);
    
    preferenceResult.rows.forEach((row, idx) => {
      console.log(`=== Preference Message ${idx + 1} ===`);
      console.log(`ID: ${row.id}`);
      console.log(`Message ID: ${row.message_id}`);
      console.log(`Direction: ${row.direction}, Agent ID: ${row.agent_id}`);
      console.log(`\nRaw Preference (type: ${typeof row.preference}):`);
      console.log(row.preference);
      
      if (row.preference && typeof row.preference === 'string') {
        try {
          const parsed = JSON.parse(row.preference);
          console.log(`\nParsed Preference:`);
          console.log(JSON.stringify(parsed, null, 2));
          
          if (parsed.text) {
            console.log(`\n✨ Found preference.text: ${parsed.text}`);
          }
        } catch (e) {
          console.log(`\n❌ Failed to parse preference: ${e}`);
        }
      }
      
      console.log(`\nMessage Content (first 200 chars):`);
      console.log(row.message_content ? (row.message_content.length > 200 ? row.message_content.substring(0, 200) + '...' : row.message_content) : 'NULL');
      console.log('\n' + '-'.repeat(80) + '\n');
    });
    
    // Also check message_content formats
    console.log('\n\n=== Checking Message Content Formats ===\n');
    
    const formatQuery = `
      SELECT
        wm.id,
        wm.message_id,
        wm.message_content,
        CASE 
          WHEN wm.message_content IS NULL THEN 'null'
          WHEN wm.message_content = '' THEN 'empty'
          WHEN LEFT(TRIM(wm.message_content), 1) = '[' THEN 'json_array'
          WHEN LEFT(TRIM(wm.message_content), 1) = '{' THEN 'json_object'
          ELSE 'plain_text'
        END as content_format
      FROM whatsapp_messages wm
      JOIN whatsapp_conversations wc
        ON wm.conversation_id = wc.conversation_id
      WHERE wc.source_details LIKE '%"source": "zoho"%'
      ORDER BY wm.created_at DESC
      LIMIT 10;
    `;
    
    const formatResult = await query(formatQuery);
    console.log('Message Content Formats:');
    formatResult.rows.forEach((row, idx) => {
      console.log(`${idx + 1}. Format: ${row.content_format}`);
      console.log(`   Content preview: ${row.message_content ? (row.message_content.length > 100 ? row.message_content.substring(0, 100) + '...' : row.message_content) : 'NULL'}`);
    });

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
}

exploreDetailed();
