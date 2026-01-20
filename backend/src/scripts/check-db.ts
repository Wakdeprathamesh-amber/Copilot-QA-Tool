import { db } from '../config/database';
import { logger } from '../utils/logger';

const checkDatabase = async () => {
  try {
    // Test connection
    const result = await db.query('SELECT NOW()');
    logger.info('✓ Database connection successful', { time: result.rows[0].now });

    // Check if tables exist
    const tablesResult = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('conversations', 'messages', 'qa_assessments', 'users')
      ORDER BY table_name
    `);

    const existingTables = tablesResult.rows.map(row => row.table_name);
    const requiredTables = ['conversations', 'messages', 'qa_assessments', 'users'];
    const missingTables = requiredTables.filter(t => !existingTables.includes(t));

    if (missingTables.length > 0) {
      logger.warn('⚠️  Missing tables:', { missingTables });
      logger.info('Run migrations: npm run setup-db');
      return false;
    }

    logger.info('✓ All required tables exist', { tables: existingTables });

    // Check if conversations table has data
    const countResult = await db.query('SELECT COUNT(*) as count FROM conversations');
    const count = parseInt(countResult.rows[0].count);
    logger.info(`✓ Conversations table has ${count} records`);

    return true;
  } catch (error: any) {
    logger.error('✗ Database check failed', {
      error: error?.message || String(error),
      code: error?.code,
      detail: error?.detail,
    });

    if (error?.code === '42P01') {
      logger.info('💡 Tip: Tables do not exist. Run: npm run setup-db');
    } else if (error?.code === '3D000') {
      logger.info('💡 Tip: Database does not exist. Create it first:');
      logger.info('   createdb ai_eval_console');
    } else if (error?.code === '28P01') {
      logger.info('💡 Tip: Authentication failed. Check DB_USER and DB_PASSWORD in .env');
    } else if (error?.code === 'ECONNREFUSED') {
      logger.info('💡 Tip: Cannot connect to database. Is PostgreSQL running?');
    }

    return false;
  } finally {
    await db.end();
  }
};

checkDatabase()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    logger.error('Unexpected error', { error });
    process.exit(1);
  });
