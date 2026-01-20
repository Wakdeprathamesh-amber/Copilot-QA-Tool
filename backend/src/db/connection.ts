import { Pool, PoolClient } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: false,
  } : false,
  max: 20,
  idleTimeoutMillis: 60000, // 60 seconds idle timeout
  connectionTimeoutMillis: 30000, // 30 seconds to establish connection
  statement_timeout: 120000, // 120 seconds for query execution (Redshift can be slow!)
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

// Test connection on startup
pool.on('connect', () => {
  // Connection established - minimal logging
});

pool.on('error', (err) => {
  console.error('✗ Database connection error:', err.message);
});

export const query = async (text: string, params?: any[]) => {
  try {
    const res = await pool.query(text, params);
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

export const getClient = (): Promise<PoolClient> => {
  return pool.connect();
};

export const closePool = async () => {
  await pool.end();
  console.log('Database pool closed');
};

export default pool;
