import dotenv from 'dotenv';
import { query } from '../db/connection';

dotenv.config();

async function findTextField() {
  console.log('🔍 Searching for messages with text field...\n');

  try {
    // Check if preference has text field
    const checkPreference = `
      SELECT
        wm.id,
        wm.message_id,
        wm.message_content,
        wm.preference,
        wm.meta,
        wm.raw_payload
      FROM whatsapp_messages wm
      JOIN whatsapp_conversations wc
        ON wm.conversation_id = wc.conversation_id
      WHERE wc.source_details LIKE '%"source": "zoho"%'
        AND wm.preference IS NOT NULL
        AND wm.preference != ''
        AND wm.preference != 'null'
        AND wm.preference != '{}'
        AND wm.preference LIKE '%"text"%'
      ORDER BY wm.created_at DESC
      LIMIT 5;
    `;

    console.log('Searching for preference field with text...\n');
    const prefResult = await query(checkPreference);
    
    if (prefResult.rows.length > 0) {
      console.log(`✅ Found ${prefResult.rows.length} messages with preference.text:\n`);
      prefResult.rows.forEach((row, idx) => {
        console.log(`=== Message ${idx + 1} ===`);
        console.log(`ID: ${row.id}, Message ID: ${row.message_id}`);
        if (row.preference && typeof row.preference === 'string') {
          try {
            const parsed = JSON.parse(row.preference);
            console.log('Preference:', JSON.stringify(parsed, null, 2));
            if (parsed.text) {
              console.log(`\n✨ TEXT FOUND: ${parsed.text}`);
            }
          } catch (e) {
            console.log('Preference (raw):', row.preference.substring(0, 500));
          }
        }
        console.log('\n' + '-'.repeat(80) + '\n');
      });
    } else {
      console.log('❌ No messages found with preference.text field.\n');
    }

    // Also check raw_payload - might have the text there
    console.log('\n=== Checking raw_payload field ===\n');
    
    const checkRawPayload = `
      SELECT
        wm.id,
        wm.message_id,
        wm.message_content,
        wm.raw_payload
      FROM whatsapp_messages wm
      JOIN whatsapp_conversations wc
        ON wm.conversation_id = wc.conversation_id
      WHERE wc.source_details LIKE '%"source": "zoho"%'
        AND wm.raw_payload IS NOT NULL
        AND wm.raw_payload != ''
        AND wm.raw_payload != 'null'
        AND wm.raw_payload != '{}'
        AND wm.raw_payload LIKE '%"text"%'
      ORDER BY wm.created_at DESC
      LIMIT 3;
    `;

    const payloadResult = await query(checkRawPayload);
    if (payloadResult.rows.length > 0) {
      console.log(`Found ${payloadResult.rows.length} messages with raw_payload containing text:\n`);
      payloadResult.rows.forEach((row, idx) => {
        console.log(`=== Raw Payload Message ${idx + 1} ===`);
        if (row.raw_payload && typeof row.raw_payload === 'string') {
          try {
            const parsed = JSON.parse(row.raw_payload);
            console.log('Raw Payload:', JSON.stringify(parsed, null, 2));
          } catch (e) {
            console.log('Raw Payload (raw, first 500 chars):', row.raw_payload.substring(0, 500));
          }
        }
        console.log('\n' + '-'.repeat(80) + '\n');
      });
    }

    // Let's also check a specific message ID from user's example
    console.log('\n=== Checking specific conversation from user example ===\n');
    
    const specificQuery = `
      SELECT
        wm.id,
        wm.message_id,
        wm.message_content,
        wm.preference,
        wm.meta,
        wm.intent,
        wm.direction,
        wm.agent_id,
        wm.raw_payload
      FROM whatsapp_messages wm
      JOIN whatsapp_conversations wc
        ON wm.conversation_id = wc.conversation_id
      WHERE wc.conversation_id = '1087415000000414537'
        AND wc.source_details LIKE '%"source": "zoho"%'
      ORDER BY wm.created_at ASC
      LIMIT 10;
    `;

    const specificResult = await query(specificQuery);
    console.log(`Found ${specificResult.rows.length} messages in conversation 1087415000000414537:\n`);
    
    specificResult.rows.forEach((row, idx) => {
      console.log(`=== Message ${idx + 1} ===`);
      console.log(`ID: ${row.id}`);
      console.log(`Message ID: ${row.message_id}`);
      console.log(`Direction: ${row.direction}, Agent: ${row.agent_id ? 'Human' : 'AI'}`);
      console.log(`Intent: ${row.intent}`);
      console.log(`\nMessage Content (first 150 chars):`);
      console.log(row.message_content ? (row.message_content.length > 150 ? row.message_content.substring(0, 150) + '...' : row.message_content) : 'NULL');
      
      if (row.preference && row.preference !== '{}') {
        console.log(`\nPreference:`);
        if (typeof row.preference === 'string') {
          try {
            const parsed = JSON.parse(row.preference);
            console.log(JSON.stringify(parsed, null, 2));
            if (parsed.text) {
              console.log(`\n✨ Found preference.text: ${parsed.text}`);
            }
          } catch (e) {
            console.log(row.preference.substring(0, 300));
          }
        }
      }
      
      if (row.meta && row.meta !== '{}') {
        console.log(`\nMeta:`);
        if (typeof row.meta === 'string') {
          try {
            const parsed = JSON.parse(row.meta);
            console.log(JSON.stringify(parsed, null, 2));
          } catch (e) {
            console.log(row.meta.substring(0, 300));
          }
        }
      }
      
      console.log('\n' + '-'.repeat(80) + '\n');
    });

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
}

findTextField();
