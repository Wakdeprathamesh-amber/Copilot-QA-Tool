import { readFileSync } from 'fs';
import { join } from 'path';
import { db } from '../config/database';
import { logger } from '../utils/logger';

const runMigrations = async () => {
  try {
    const migrationPath = join(__dirname, '../db/migrations/001_initial_schema.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    
    logger.info('Running database migrations...');
    await db.query(migrationSQL);
    logger.info('Database migrations completed successfully');
  } catch (error) {
    logger.error('Migration failed', { error });
    throw error;
  }
};

const setupDatabase = async () => {
  try {
    await runMigrations();
    process.exit(0);
  } catch (error) {
    logger.error('Database setup failed', { error });
    process.exit(1);
  }
};

setupDatabase();
