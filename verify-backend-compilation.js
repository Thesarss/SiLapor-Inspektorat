#!/usr/bin/env node

/**
 * Verify Backend TypeScript Compilation
 * This script checks if the backend compiles without errors
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🔍 Verifying Backend TypeScript Compilation...\n');

try {
  // Change to backend directory
  process.chdir(path.join(__dirname, 'backend'));
  
  console.log('📁 Working directory:', process.cwd());
  console.log('⏳ Running TypeScript compiler check...\n');
  
  // Run TypeScript compiler in check mode (no emit)
  const output = execSync('npx tsc --noEmit', { 
    encoding: 'utf8',
    stdio: 'pipe'
  });
  
  console.log('✅ SUCCESS: Backend compiles without errors!');
  console.log('✅ No TypeScript errors found');
  console.log('\n🎉 You can now restart the backend server with: npm run dev');
  
} catch (error) {
  console.error('❌ COMPILATION FAILED\n');
  console.error('TypeScript Errors:');
  console.error(error.stdout || error.message);
  console.error('\n📝 Please fix the errors above before restarting the server.');
  process.exit(1);
}
