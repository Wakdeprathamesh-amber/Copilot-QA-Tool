import * as fs from 'fs';
import * as path from 'path';

const envPath = path.join(__dirname, '../../.env');

console.log('🔍 Checking .env file...\n');

if (!fs.existsSync(envPath)) {
  console.error('❌ .env file not found at:', envPath);
  console.error('\nPlease create backend/.env file with:');
  console.error('DB_HOST=redshift-prod.amber-data.com');
  console.error('DB_PORT=5439');
  console.error('DB_NAME=amberdb');
  console.error('DB_USER=data_engg');
  console.error('DB_PASSWORD=your_password_here');
  console.error('DB_SSL=false');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf-8');
const lines = envContent.split('\n');

console.log('📄 .env file found\n');
console.log('Current contents:');
console.log('─'.repeat(50));

const requiredVars = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'DB_SSL'];
const foundVars: string[] = [];
const missingVars: string[] = [];

const issues: string[] = [];

lines.forEach((line, index) => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    // Check for colon instead of equals (common mistake)
    if (trimmed.includes(':') && !trimmed.includes('=')) {
      const [key] = trimmed.split(':');
      if (key && key.startsWith('DB_')) {
        issues.push(`Line ${index + 1}: Uses ':' instead of '=' - should be: ${key.trim()}=...`);
      }
    }
    
    // Parse with equals sign
    const [key] = trimmed.split('=');
    if (key) {
      const cleanKey = key.trim();
      foundVars.push(cleanKey);
      // Show line (hide password value)
      if (cleanKey === 'DB_PASSWORD') {
        const [varName, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=');
        console.log(`${index + 1}: ${varName}=${value ? '***SET***' : 'NOT SET'}`);
      } else {
        console.log(`${index + 1}: ${trimmed}`);
      }
    }
  }
});

console.log('─'.repeat(50));
console.log('');

// Show issues first
if (issues.length > 0) {
  console.error('⚠️  Format issues found:');
  issues.forEach(issue => console.error(`   ${issue}`));
  console.error('\n❌ .env file must use = (equals) not : (colon)');
  console.error('\nFix your .env file:');
  console.error('   Change: DB_HOST: value');
  console.error('   To:     DB_HOST=value');
  console.error('');
  process.exit(1);
}

// Check for required variables
requiredVars.forEach(varName => {
  if (!foundVars.includes(varName)) {
    missingVars.push(varName);
  }
});

if (missingVars.length > 0) {
  console.error('❌ Missing required variables:');
  missingVars.forEach(v => console.error(`   - ${v}`));
  console.error('\nPlease add these to your .env file.');
  process.exit(1);
}

// Check for wrong variable names
const wrongNames: string[] = [];
if (foundVars.includes('DB_PASS') && !foundVars.includes('DB_PASSWORD')) {
  wrongNames.push('DB_PASS (should be DB_PASSWORD)');
}

if (wrongNames.length > 0) {
  console.error('⚠️  Wrong variable names found:');
  wrongNames.forEach(v => console.error(`   - ${v}`));
  console.error('\nPlease rename in your .env file.');
  process.exit(1);
}

console.log('✅ All required variables found!');
console.log('\nVariables:');
requiredVars.forEach(v => {
  const isSet = foundVars.includes(v);
  console.log(`   ${isSet ? '✅' : '❌'} ${v}`);
});
