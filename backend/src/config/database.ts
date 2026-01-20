import { Pool } from 'pg';
import { logger } from '../utils/logger';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'ai_eval_console',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle client', { error: err });
});

export const db = pool;

// Test database connection
export const testConnection = async (): Promise<boolean> => {
  try {
    const result = await pool.query('SELECT NOW()');
    logger.info('Database connection successful', { time: result.rows[0].now });
    return true;
  } catch (error: any) {
    logger.error('Database connection failed', { 
      error: error?.message || String(error),
      code: error?.code,
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'ai_eval_console',
    });
    return false;
  }
};
