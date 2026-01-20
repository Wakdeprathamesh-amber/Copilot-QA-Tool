import { readFileSync } from 'fs';
import { join } from 'path';
import { query } from '../db/connection';
import { logger } from '../utils/logger';

const setupQATables = async () => {
  try {
    logger.info('Setting up QA assessment tables...');
    logger.info('This will create separate tables for QA data without touching existing production tables.');
    
    // Create table (safe with IF NOT EXISTS)
    // Note: Redshift doesn't support traditional indexes - it uses sort keys instead
    logger.info('Creating qa_assessments table...');
    await query(`
      CREATE TABLE IF NOT EXISTS qa_assessments (
        id VARCHAR(255) PRIMARY KEY,
        conversation_id VARCHAR(255) NOT NULL UNIQUE,
        reviewer_id VARCHAR(255) NOT NULL DEFAULT 'system',
        rating VARCHAR(10),
        tags VARCHAR(1000) DEFAULT '',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
      SORTKEY(conversation_id, updated_at);
    `);
    
    logger.info('✅ Table created successfully with sort keys for query performance');
    logger.info('ℹ️  Note: Redshift uses sort keys instead of traditional indexes');
    
    // Verify tables were created
    const result = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'qa_assessments'
      ORDER BY table_name;
    `);
    
    const createdTables = result.rows.map((r: any) => r.table_name);
    logger.info(`✅ Verified tables exist: ${createdTables.join(', ')}`);
    
    // Verify no conflicts with existing tables
    const allTables = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND (table_name LIKE '%qa%' OR table_name LIKE '%conversation%')
      ORDER BY table_name;
    `);
    
    logger.info('ℹ️  QA-related tables in database:', allTables.rows.map((r: any) => r.table_name).join(', '));
    
    logger.info('✅ Setup complete! QA tables are ready to use.');
    process.exit(0);
  } catch (error: any) {
    logger.error('Failed to setup QA tables', {
      error: error.message,
      code: error.code,
      detail: error.detail,
    });
    
    // Check if it's a permission issue
    if (error.code === '42501') {
      logger.error('❌ Permission denied. Check if your DB user has CREATE TABLE permissions.');
      logger.error('   Required permissions: CREATE TABLE');
    } else if (error.code === '42P07') {
      logger.info('ℹ️  Some tables already exist. This is normal if you run the script multiple times.');
    } else if (error.code === '42710') {
      logger.info('ℹ️  Table already exists with the same name. This is expected on subsequent runs.');
    }
    
    process.exit(1);
  }
};

setupQATables();
