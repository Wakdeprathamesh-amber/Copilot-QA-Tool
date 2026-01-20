import dotenv from 'dotenv';
import { query } from '../db/connection';

dotenv.config();

async function exploreMetadataFields() {
  console.log('🔍 Exploring Metadata Fields for Filtering...\n');

  try {
    // 1. Explore Meta field structure in detail
    console.log('='.repeat(80));
    console.log('1. META FIELD - DISTINCT VALUES FOR POTENTIAL FILTERS');
    console.log('='.repeat(80));
    
    // Country
    const countryQuery = `
      SELECT DISTINCT
        JSON_EXTRACT_PATH_TEXT(wc.meta, 'country') as country,
        COUNT(*) as count
      FROM whatsapp_conversations wc
      WHERE wc.source_details LIKE '%"source": "zoho"%'
        AND wc.meta IS NOT NULL
        AND wc.meta NOT IN ('', 'null')
        AND wc.meta LIKE '{%'
        AND JSON_EXTRACT_PATH_TEXT(wc.meta, 'country') IS NOT NULL
      GROUP BY country
      ORDER BY count DESC;
    `;
    
    const countryResult = await query(countryQuery);
    console.log('\nCountries:');
    countryResult.rows.forEach(row => {
      console.log(`  ${row.country}: ${row.count}`);
    });

    // Locality
    const localityQuery = `
      SELECT DISTINCT
        JSON_EXTRACT_PATH_TEXT(wc.meta, 'locality') as locality,
        COUNT(*) as count
      FROM whatsapp_conversations wc
      WHERE wc.source_details LIKE '%"source": "zoho"%'
        AND wc.meta IS NOT NULL
        AND wc.meta NOT IN ('', 'null')
        AND wc.meta LIKE '{%'
        AND JSON_EXTRACT_PATH_TEXT(wc.meta, 'locality') IS NOT NULL
      GROUP BY locality
      ORDER BY count DESC
      LIMIT 20;
    `;
    
    const localityResult = await query(localityQuery);
    console.log('\nLocalities (Top 20):');
    localityResult.rows.forEach(row => {
      console.log(`  ${row.locality}: ${row.count}`);
    });

    // University
    const universityQuery = `
      SELECT DISTINCT
        JSON_EXTRACT_PATH_TEXT(wc.meta, 'university') as university,
        COUNT(*) as count
      FROM whatsapp_conversations wc
      WHERE wc.source_details LIKE '%"source": "zoho"%'
        AND wc.meta IS NOT NULL
        AND wc.meta NOT IN ('', 'null')
        AND wc.meta LIKE '{%'
        AND JSON_EXTRACT_PATH_TEXT(wc.meta, 'university') IS NOT NULL
      GROUP BY university
      ORDER BY count DESC
      LIMIT 20;
    `;
    
    const universityResult = await query(universityQuery);
    console.log('\nUniversities (Top 20):');
    universityResult.rows.forEach(row => {
      console.log(`  ${row.university}: ${row.count}`);
    });

    // Ended By
    const endedByQuery = `
      SELECT DISTINCT
        JSON_EXTRACT_PATH_TEXT(wc.meta, 'ended_by') as ended_by,
        COUNT(*) as count
      FROM whatsapp_conversations wc
      WHERE wc.source_details LIKE '%"source": "zoho"%'
        AND wc.meta IS NOT NULL
        AND wc.meta NOT IN ('', 'null')
        AND wc.meta LIKE '{%'
      GROUP BY ended_by
      ORDER BY count DESC;
    `;
    
    const endedByResult = await query(endedByQuery);
    console.log('\nEnded By:');
    endedByResult.rows.forEach(row => {
      console.log(`  ${row.ended_by || '(null)'}: ${row.count}`);
    });

    // Feedback
    const feedbackQuery = `
      SELECT DISTINCT
        JSON_EXTRACT_PATH_TEXT(wc.meta, 'feedback.value') as feedback_value,
        COUNT(*) as count
      FROM whatsapp_conversations wc
      WHERE wc.source_details LIKE '%"source": "zoho"%'
        AND wc.meta IS NOT NULL
        AND wc.meta NOT IN ('', 'null')
        AND wc.meta LIKE '{%'
      GROUP BY feedback_value
      ORDER BY count DESC;
    `;
    
    const feedbackResult = await query(feedbackQuery);
    console.log('\nFeedback:');
    feedbackResult.rows.forEach(row => {
      console.log(`  ${row.feedback_value || '(null)'}: ${row.count}`);
    });

    // Main Intent (from meta)
    const mainIntentQuery = `
      SELECT DISTINCT
        JSON_EXTRACT_PATH_TEXT(wc.meta, 'main_intent') as main_intent,
        COUNT(*) as count
      FROM whatsapp_conversations wc
      WHERE wc.source_details LIKE '%"source": "zoho"%'
        AND wc.meta IS NOT NULL
        AND wc.meta NOT IN ('', 'null')
        AND wc.meta LIKE '{%'
        AND JSON_EXTRACT_PATH_TEXT(wc.meta, 'main_intent') IS NOT NULL
      GROUP BY main_intent
      ORDER BY count DESC
      LIMIT 30;
    `;
    
    const mainIntentResult = await query(mainIntentQuery);
    console.log('\nMain Intents (from meta - Top 30):');
    mainIntentResult.rows.forEach(row => {
      console.log(`  ${row.main_intent}: ${row.count}`);
    });

    // Agent Name
    const agentQuery = `
      SELECT DISTINCT
        JSON_EXTRACT_PATH_TEXT(wc.meta, 'agent_name') as agent_name,
        COUNT(*) as count
      FROM whatsapp_conversations wc
      WHERE wc.source_details LIKE '%"source": "zoho"%'
        AND wc.meta IS NOT NULL
        AND wc.meta NOT IN ('', 'null')
        AND wc.meta LIKE '{%'
        AND JSON_EXTRACT_PATH_TEXT(wc.meta, 'agent_name') IS NOT NULL
      GROUP BY agent_name
      ORDER BY count DESC;
    `;
    
    const agentResult = await query(agentQuery);
    console.log('\nAgent Names:');
    agentResult.rows.forEach(row => {
      console.log(`  ${row.agent_name}: ${row.count}`);
    });

    // 2. Explore Source Details fields
    console.log('\n' + '='.repeat(80));
    console.log('2. SOURCE_DETAILS FIELD - DISTINCT VALUES');
    console.log('='.repeat(80));
    
    // UTM Source
    const utmSourceQuery = `
      SELECT DISTINCT
        JSON_EXTRACT_PATH_TEXT(wc.source_details, 'utm_source') as utm_source,
        COUNT(*) as count
      FROM whatsapp_conversations wc
      WHERE wc.source_details LIKE '%"source": "zoho"%'
        AND JSON_EXTRACT_PATH_TEXT(wc.source_details, 'utm_source') IS NOT NULL
        AND JSON_EXTRACT_PATH_TEXT(wc.source_details, 'utm_source') != ''
      GROUP BY utm_source
      ORDER BY count DESC
      LIMIT 20;
    `;
    
    const utmSourceResult = await query(utmSourceQuery);
    console.log('\nUTM Sources (Top 20):');
    utmSourceResult.rows.forEach(row => {
      console.log(`  ${row.utm_source}: ${row.count}`);
    });

    // Initial Referrer
    const referrerQuery = `
      SELECT DISTINCT
        JSON_EXTRACT_PATH_TEXT(wc.source_details, 'initial_referrer') as initial_referrer,
        COUNT(*) as count
      FROM whatsapp_conversations wc
      WHERE wc.source_details LIKE '%"source": "zoho"%'
        AND JSON_EXTRACT_PATH_TEXT(wc.source_details, 'initial_referrer') IS NOT NULL
        AND JSON_EXTRACT_PATH_TEXT(wc.source_details, 'initial_referrer') != ''
      GROUP BY initial_referrer
      ORDER BY count DESC
      LIMIT 10;
    `;
    
    const referrerResult = await query(referrerQuery);
    console.log('\nInitial Referrers (Top 10):');
    referrerResult.rows.forEach(row => {
      console.log(`  ${row.initial_referrer}: ${row.count}`);
    });

    // 3. Message-level intent analysis
    console.log('\n' + '='.repeat(80));
    console.log('3. MESSAGE-LEVEL INTENT VALUES');
    console.log('='.repeat(80));
    
    const msgIntentQuery = `
      SELECT DISTINCT
        wm.intent,
        COUNT(*) as count
      FROM whatsapp_messages wm
      JOIN whatsapp_conversations wc ON wm.conversation_id = wc.conversation_id
      WHERE wc.source_details LIKE '%"source": "zoho"%'
        AND wm.intent IS NOT NULL
        AND wm.intent != ''
        AND wm.intent NOT IN ('null', '[]', '{}')
      GROUP BY wm.intent
      ORDER BY count DESC;
    `;
    
    const msgIntentResult = await query(msgIntentQuery);
    console.log('\nMessage Intents:');
    msgIntentResult.rows.forEach(row => {
      console.log(`  ${row.intent}: ${row.count}`);
    });

    // 4. Human handover analysis
    console.log('\n' + '='.repeat(80));
    console.log('4. HUMAN HANDOVER ANALYSIS');
    console.log('='.repeat(80));
    
    const handoverQuery = `
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN JSON_EXTRACT_PATH_TEXT(wc.meta, 'agent_id') IS NOT NULL THEN 1 END) as has_agent,
        COUNT(CASE WHEN JSON_EXTRACT_PATH_TEXT(wc.meta, 'agent_joined_at') IS NOT NULL THEN 1 END) as agent_joined,
        COUNT(CASE WHEN JSON_EXTRACT_PATH_TEXT(wc.meta, 'ended_by') = 'agent' THEN 1 END) as ended_by_agent,
        COUNT(CASE WHEN JSON_EXTRACT_PATH_TEXT(wc.meta, 'ended_by') = 'visitor' THEN 1 END) as ended_by_visitor
      FROM whatsapp_conversations wc
      WHERE wc.source_details LIKE '%"source": "zoho"%';
    `;
    
    const handoverResult = await query(handoverQuery);
    console.log('\nHuman Handover Stats:');
    console.log(JSON.stringify(handoverResult.rows[0], null, 2));

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
}

exploreMetadataFields();
