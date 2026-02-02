/**
 * Check if SalesIQ conversational URL, Zoho Desk ticket URL, or CRM lead URL
 * exist in whatsapp_conversations or whatsapp_messages (as columns or inside JSON).
 * Load .env first so DB_PORT etc. are set before the connection pool is created.
 */
import 'dotenv/config';
import { query } from '../db/connection';

const URL_KEY_PATTERNS = [
  { name: 'SalesIQ conversational URL', patterns: ['salesiq', 'sales_iq', 'conversational', 'conversation_url'] },
  { name: 'Zoho Desk ticket URL', patterns: ['desk', 'ticket', 'zoho_desk', 'ticket_url'] },
  { name: 'CRM lead URL', patterns: ['crm', 'lead_url', 'lead_id', 'lead_link', 'crm_lead'] },
];

async function checkUrlFields() {
  console.log('Checking for SalesIQ / Zoho Desk / CRM lead URL fields in DB...\n');

  try {
    // --- whatsapp_conversations ---
    console.log('='.repeat(60));
    console.log('whatsapp_conversations');
    console.log('='.repeat(60));

    const convColumns = await query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'whatsapp_conversations'
      ORDER BY ordinal_position;
    `);
    const convColNames = (convColumns.rows as { column_name: string }[]).map((r) => r.column_name.toLowerCase());
    console.log('Columns:', convColNames.join(', '));

    const urlRelatedCols = convColNames.filter((c) => /url|salesiq|sales_iq|desk|ticket|crm|lead/.test(c));
    if (urlRelatedCols.length > 0) {
      console.log('  URL-related columns:', urlRelatedCols.join(', '));
    } else {
      console.log('  No dedicated URL-related column names found.');
    }

    // Check JSON content in meta, source_details, conversation_evaluation
    const jsonCols = ['meta', 'source_details', 'conversation_evaluation'].filter((c) => convColNames.includes(c));
    for (const col of jsonCols) {
      for (const { name, patterns } of URL_KEY_PATTERNS) {
        const likeConditions = patterns.map((p) => `${col} ILIKE '%${p.replace(/'/g, "''")}%'`).join(' OR ');
        const q = `
          SELECT COUNT(*) as cnt
          FROM whatsapp_conversations
          WHERE (${likeConditions})
          LIMIT 1;
        `;
        try {
          const res = await query(q);
          const cnt = parseInt((res.rows[0] as { cnt: string }).cnt, 10);
          if (cnt > 0) {
            console.log(`  [JSON ${col}] ${name}: found in ${cnt}+ row(s)`);
          }
        } catch (e) {
          // column might not exist
        }
      }
    }

    // Sample keys from meta (Redshift may use different JSON functions)
    try {
      const sampleMeta = await query(`
        SELECT meta FROM whatsapp_conversations
        WHERE meta IS NOT NULL AND meta != '' AND meta NOT IN ('null', '{}')
        LIMIT 1;
      `);
      if (sampleMeta.rows.length > 0 && sampleMeta.rows[0].meta) {
        const metaStr = typeof sampleMeta.rows[0].meta === 'string' ? sampleMeta.rows[0].meta : JSON.stringify(sampleMeta.rows[0].meta);
        console.log('\n  Sample meta (first 500 chars):', metaStr.substring(0, 500));
      }
    } catch (e) {
      console.log('  (Could not sample meta)');
    }

    // --- whatsapp_messages ---
    console.log('\n' + '='.repeat(60));
    console.log('whatsapp_messages');
    console.log('='.repeat(60));

    const msgColumns = await query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'whatsapp_messages'
      ORDER BY ordinal_position;
    `);
    const msgColNames = (msgColumns.rows as { column_name: string }[]).map((r) => r.column_name.toLowerCase());
    console.log('Columns:', msgColNames.join(', '));

    const msgUrlCols = msgColNames.filter((c) => /url|salesiq|sales_iq|desk|ticket|crm|lead/.test(c));
    if (msgUrlCols.length > 0) {
      console.log('  URL-related columns:', msgUrlCols.join(', '));
    } else {
      console.log('  No dedicated URL-related column names found.');
    }

    const msgJsonCols = ['meta', 'metadata'].filter((c) => msgColNames.includes(c));
    for (const col of msgJsonCols) {
      for (const { name, patterns } of URL_KEY_PATTERNS) {
        const likeConditions = patterns.map((p) => `wm.${col} ILIKE '%${p.replace(/'/g, "''")}%'`).join(' OR ');
        const q = `
          SELECT COUNT(*) as cnt
          FROM whatsapp_messages wm
          WHERE wm.${col} IS NOT NULL AND wm.${col} != '' AND (${likeConditions});
        `;
        try {
          const res = await query(q);
          const cnt = parseInt((res.rows[0] as { cnt: string }).cnt, 10);
          if (cnt > 0) {
            console.log(`  [JSON ${col}] ${name}: found in ${cnt}+ row(s)`);
          }
        } catch (e) {
          // ignore
        }
      }
    }

    console.log('\nDone.');
  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

checkUrlFields();
