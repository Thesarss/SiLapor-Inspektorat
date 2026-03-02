const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function updateEnvironmentFiles() {
  console.log('🔧 Updating environment files for ngrok tunneling\n');
  
  // Get ngrok URLs from user
  const backendUrl = await askQuestion('Enter your backend ngrok URL (e.g., https://abc123.ngrok.io): ');
  const frontendUrl = await askQuestion('Enter your frontend ngrok URL (e.g., https://def456.ngrok.io): ');
  
  // Update backend .env
  console.log('\n📝 Updating backend/.env...');
  let backendEnv = '';
  if (fs.existsSync('backend/.env')) {
    backendEnv = fs.readFileSync('backend/.env', 'utf8');
  }
  
  // Update or add FRONTEND_URL and CORS_ORIGIN
  backendEnv = updateEnvVar(backendEnv, 'FRONTEND_URL', frontendUrl);
  backendEnv = updateEnvVar(backendEnv, 'CORS_ORIGIN', frontendUrl);
  
  fs.writeFileSync('backend/.env', backendEnv);
  console.log('✅ Backend .env updated');
  
  // Update frontend .env
  console.log('\n📝 Updating frontend/.env...');
  let frontendEnv = '';
  if (fs.existsSync('frontend/.env')) {
    frontendEnv = fs.readFileSync('frontend/.env', 'utf8');
  }
  
  // Update or add VITE_API_URL
  frontendEnv = updateEnvVar(frontendEnv, 'VITE_API_URL', `${backendUrl}/api`);
  
  fs.writeFileSync('frontend/.env', frontendEnv);
  console.log('✅ Frontend .env updated');
  
  console.log('\n🎉 Environment files updated successfully!');
  console.log('\n📋 Next steps:');
  console.log('1. Restart backend server: cd backend && npm run dev');
  console.log('2. Restart frontend server: cd frontend && npm run dev');
  console.log('3. Test access from external devices using the ngrok URLs');
  console.log(`\n🌐 Your Matrix Audit System will be accessible at: ${frontendUrl}`);
  
  rl.close();
}

function updateEnvVar(envContent, key, value) {
  const regex = new RegExp(`^${key}=.*$`, 'm');
  const newLine = `${key}=${value}`;
  
  if (regex.test(envContent)) {
    return envContent.replace(regex, newLine);
  } else {
    return envContent + (envContent.endsWith('\n') ? '' : '\n') + newLine + '\n';
  }
}

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

updateEnvironmentFiles().catch(console.error);