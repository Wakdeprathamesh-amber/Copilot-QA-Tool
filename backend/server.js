#!/usr/bin/env node

// Simple Node.js server starter
// Load environment variables and run TypeScript code

const path = require('path');
const dotenv = require('dotenv');

// Load .env explicitly with absolute path
const envPath = path.join(__dirname, '.env');
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('❌ Failed to load .env file:', result.error);
  console.error('Looking for .env at:', envPath);
  process.exit(1);
}

console.log('✓ Environment loaded from:', envPath);
console.log('DB_HOST:', process.env.DB_HOST || '❌ NOT SET');
console.log('DB_NAME:', process.env.DB_NAME || '❌ NOT SET');
console.log('DB_USER:', process.env.DB_USER || '❌ NOT SET');
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '✓ Set' : '❌ NOT SET');

// Use ts-node to run TypeScript
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs'
  }
});

require('./src/index.ts');
