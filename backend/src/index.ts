import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

// Load environment variables FIRST
dotenv.config();

import pool from './db/connection';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    await pool.query('SELECT 1');
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// API routes (auth is public; data routes require JWT)
import authRoutes from './routes/auth';
import conversationRoutes from './routes/conversations';
import messageRoutes from './routes/messages';
import qaAssessmentRoutes from './routes/qaAssessments';

app.use('/api/auth', authRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/qa-assessments', qaAssessmentRoutes);

// Error handling middleware (must be last)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// Initialize server
const startServer = async () => {
  try {
    // Test database connection
    console.log('Testing database connection...');
    console.log(`Connecting to: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
    console.log(`User: ${process.env.DB_USER}`);
    
    await pool.query('SELECT 1');
    console.log('✓ Database connection successful');

    app.listen(PORT, () => {
      console.log(`✓ Server running on port ${PORT}`);
      console.log(`✓ Health check: /health`);
      console.log(`✓ API endpoint: /api`);
      if (process.env.NODE_ENV === 'development') {
        console.log(`✓ Local access: http://localhost:${PORT}`);
      }
    });
  } catch (error: any) {
    console.error('✗ Failed to start server:', error.message);
    
    // Provide specific guidance based on error code
    if (error.code === '28000') {
      console.error('\n🔐 Authentication Error (28000): Password authentication failed');
      console.error('\nTroubleshooting steps:');
      console.error('1. Verify DB_USER and DB_PASSWORD in backend/.env');
      console.error('2. Check if password has special characters (may need quotes or escaping)');
      console.error('3. Ensure password is correct (no extra spaces)');
      console.error('4. Verify user exists and has proper permissions in Redshift');
      console.error('5. Try connecting with psql to verify credentials:');
      console.error(`   psql -h ${process.env.DB_HOST} -p ${process.env.DB_PORT} -U ${process.env.DB_USER} -d ${process.env.DB_NAME}`);
    } else if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      console.error('\n🌐 Network Error: Cannot reach database host');
      console.error(`   Host: ${process.env.DB_HOST}:${process.env.DB_PORT}`);
      console.error('\nTroubleshooting:');
      console.error('1. Check if Redshift cluster is running');
      console.error('2. Verify network/VPN access');
      console.error('3. Check security group allows your IP');
    } else {
      console.error(`\nError code: ${error.code || 'UNKNOWN'}`);
    }
    
    console.error('\nPlease check your database credentials in backend/.env');
    process.exit(1);
  }
};

startServer();

export default app;
