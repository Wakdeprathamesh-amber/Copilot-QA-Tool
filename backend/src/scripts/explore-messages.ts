import dotenv from 'dotenv';
import { query } from '../db/connection';
import fs from 'fs';
import path from 'path';

dotenv.config();

async function exploreMessages() {
  console.log('🔍 Exploring Message Structure from Zoho Conversations...\n');

  try {
    // Query to get sample messages with all fields
    const exploreQuery = `
      SELECT
        wm.*,
        wc.source_details,
        CASE 
          WHEN wc.meta IS NOT NULL AND wc.meta NOT IN ('', 'null') AND wc.meta LIKE '{%' 
          THEN JSON_PARSE(wc.meta) 
          ELSE NULL 
        END AS conversation_meta,
        CASE 
          WHEN wc.conversation_evaluation IS NOT NULL AND wc.conversation_evaluation NOT IN ('', 'null') AND wc.conversation_evaluation LIKE '{%' 
          THEN JSON_PARSE(wc.conversation_evaluation) 
          ELSE NULL 
        END AS conversation_evaluation
      FROM whatsapp_messages wm
      JOIN whatsapp_conversations wc
        ON wm.conversation_id = wc.conversation_id
      WHERE wc.source_details LIKE '%"source": "zoho"%'
      ORDER BY wm.created_at DESC
      LIMIT 10;
    `;

    console.log('Fetching sample messages...');
    const result = await query(exploreQuery);

    console.log(`\n✅ Found ${result.rows.length} messages\n`);

    // Analyze structure
    const analysis: any = {
      totalMessages: result.rows.length,
      messageContentFormats: {},
      metaFieldUsage: 0,
      intentFormats: {},
      messageTypes: {},
      directions: {},
      columns: result.rows.length > 0 ? Object.keys(result.rows[0]) : [],
    };

    // Sample messages to display
    const samples: any[] = [];

    for (let i = 0; i < Math.min(5, result.rows.length); i++) {
      const row = result.rows[i];
      
      // Analyze message_content format
      if (row.message_content) {
        const content = row.message_content;
        let format = 'unknown';
        
        if (typeof content === 'string') {
          if (content.trim().startsWith('[')) {
            format = 'json_array';
          } else if (content.trim().startsWith('{')) {
            format = 'json_object';
          } else {
            format = 'plain_text';
          }
        }
        
        analysis.messageContentFormats[format] = (analysis.messageContentFormats[format] || 0) + 1;
      }

      // Analyze meta field
      if (row.meta) {
        try {
          let meta = row.meta;
          if (typeof meta === 'string') {
            meta = JSON.parse(meta);
          }
          if (meta && typeof meta === 'object' && meta.text) {
            analysis.metaFieldUsage++;
          }
        } catch (e) {
          // Ignore
        }
      }

      // Analyze intent format
      if (row.intent) {
        let intentFormat = 'unknown';
        try {
          const parsed = JSON.parse(row.intent);
          if (Array.isArray(parsed)) {
            intentFormat = 'json_array';
          } else if (typeof parsed === 'string') {
            intentFormat = 'json_string';
          } else {
            intentFormat = 'json_object';
          }
        } catch (e) {
          intentFormat = 'plain_string';
        }
        analysis.intentFormats[intentFormat] = (analysis.intentFormats[intentFormat] || 0) + 1;
      }

      // Count message types
      analysis.messageTypes[row.message_type || 'null'] = (analysis.messageTypes[row.message_type || 'null'] || 0) + 1;
      analysis.directions[row.direction || 'null'] = (analysis.directions[row.direction || 'null'] || 0) + 1;

      // Store sample
      samples.push({
        id: row.id,
        conversation_id: row.conversation_id,
        message_id: row.message_id,
        message_content: row.message_content ? (row.message_content.length > 200 ? row.message_content.substring(0, 200) + '...' : row.message_content) : null,
        message_content_length: row.message_content ? row.message_content.length : 0,
        message_type: row.message_type,
        direction: row.direction,
        agent_id: row.agent_id,
        intent: row.intent,
        meta: row.meta ? (typeof row.meta === 'string' ? row.meta.substring(0, 300) : JSON.stringify(row.meta).substring(0, 300)) : null,
        created_at: row.created_at,
        source: row.source,
      });
    }

    // Display analysis
    console.log('='.repeat(80));
    console.log('STRUCTURE ANALYSIS');
    console.log('='.repeat(80));
    console.log(`\nTotal Messages Analyzed: ${analysis.totalMessages}`);
    console.log(`\nAvailable Columns (${analysis.columns.length}):`);
    analysis.columns.forEach((col: string) => console.log(`  - ${col}`));

    console.log(`\n📝 Message Content Formats:`);
    Object.entries(analysis.messageContentFormats).forEach(([format, count]: [string, any]) => {
      console.log(`  ${format}: ${count}`);
    });

    console.log(`\n📊 Message Types:`);
    Object.entries(analysis.messageTypes).forEach(([type, count]: [string, any]) => {
      console.log(`  ${type}: ${count}`);
    });

    console.log(`\n📤 Directions:`);
    Object.entries(analysis.directions).forEach(([direction, count]: [string, any]) => {
      console.log(`  ${direction}: ${count}`);
    });

    console.log(`\n🎯 Intent Formats:`);
    Object.entries(analysis.intentFormats).forEach(([format, count]: [string, any]) => {
      console.log(`  ${format}: ${count}`);
    });

    console.log(`\n📦 Meta Field Usage:`);
    console.log(`  Messages with meta.text: ${analysis.metaFieldUsage}/${analysis.totalMessages}`);

    // Display sample messages
    console.log('\n' + '='.repeat(80));
    console.log('SAMPLE MESSAGES');
    console.log('='.repeat(80));

    samples.forEach((sample, idx) => {
      console.log(`\n--- Sample ${idx + 1} ---`);
      console.log(`ID: ${sample.id}`);
      console.log(`Message ID: ${sample.message_id}`);
      console.log(`Conversation ID: ${sample.conversation_id}`);
      console.log(`Direction: ${sample.direction}`);
      console.log(`Agent ID: ${sample.agent_id} (${sample.agent_id ? 'Human' : 'AI'})`);
      console.log(`Type: ${sample.message_type}`);
      console.log(`Intent: ${sample.intent}`);
      console.log(`Created: ${sample.created_at}`);
      console.log(`Source: ${sample.source}`);
      console.log(`\nMessage Content (${sample.message_content_length} chars):`);
      console.log(`${sample.message_content}`);
      
      if (sample.meta) {
        console.log(`\nMeta (first 300 chars):`);
        console.log(`${sample.meta}`);
        
        // Try to parse and show meta.text if available
        try {
          const meta = typeof sample.meta === 'string' ? JSON.parse(sample.meta) : sample.meta;
          if (meta && meta.text) {
            console.log(`\n✨ Meta.text (clean text): ${meta.text}`);
          }
        } catch (e) {
          // Ignore
        }
      }
    });

    // Save detailed JSON output
    const outputPath = path.join(__dirname, '../../message_structure_analysis.json');
    fs.writeFileSync(outputPath, JSON.stringify({
      analysis,
      samples,
      timestamp: new Date().toISOString(),
    }, null, 2));

    console.log(`\n✅ Detailed analysis saved to: ${outputPath}`);

  } catch (error: any) {
    console.error('❌ Error exploring messages:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

exploreMessages();
