import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

async function testConnection() {
  console.log('🔍 Testing Redshift Connection...\n');
  
  // Display connection info (without password)
  console.log('Connection Details:');
  console.log(`  Host: ${process.env.DB_HOST || 'NOT SET'}`);
  console.log(`  Port: ${process.env.DB_PORT || 'NOT SET'}`);
  console.log(`  Database: ${process.env.DB_NAME || 'NOT SET'}`);
  console.log(`  User: ${process.env.DB_USER || 'NOT SET'}`);
  console.log(`  Password: ${process.env.DB_PASSWORD ? '***SET***' : 'NOT SET'}`);
  console.log(`  SSL: ${process.env.DB_SSL || 'false'}`);
  console.log('');

  // Check if all required vars are set
  const required = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\nPlease check your backend/.env file');
    process.exit(1);
  }

  // Create connection pool
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { 
      rejectUnauthorized: false,
      checkServerIdentity: () => undefined,
    } : false,
    connectionTimeoutMillis: 30000,
  });

  try {
    console.log('Attempting connection...');
    const result = await pool.query('SELECT 1 as test, current_database() as db, current_user as user');
    
    console.log('✅ Connection successful!');
    console.log(`   Database: ${result.rows[0].db}`);
    console.log(`   User: ${result.rows[0].user}`);
    console.log('');
    
    // Test a simple query
    console.log('Testing query...');
    const testQuery = await pool.query('SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = \'public\'');
    console.log(`✅ Query successful! Found ${testQuery.rows[0].count} tables in public schema`);
    
    await pool.end();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Connection failed!');
    console.error(`   Error: ${error.message}`);
    console.error(`   Code: ${error.code || 'N/A'}`);
    
    if (error.code === '28000') {
      console.error('\n🔐 Authentication Error:');
      console.error('   - Check DB_USER and DB_PASSWORD in .env');
      console.error('   - Verify password is correct (no extra spaces)');
      console.error('   - Check if password needs quotes for special characters');
      console.error('   - Verify user exists in Redshift');
    } else if (error.code === 'ENOTFOUND') {
      console.error('\n🌐 Network Error:');
      console.error('   - Cannot resolve hostname');
      console.error('   - Check DB_HOST is correct');
      console.error('   - Verify network/VPN access');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('\n⏱️  Timeout Error:');
      console.error('   - Connection timed out');
      console.error('   - Check network connectivity');
      console.error('   - Verify security group allows your IP');
    }
    
    await pool.end();
    process.exit(1);
  }
}

testConnection();
