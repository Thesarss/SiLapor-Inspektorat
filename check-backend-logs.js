const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function checkBackendLogs() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  CHECK BACKEND RESPONSE DETAILS                              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  try {
    // Login
    console.log('1️⃣ Logging in...');
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      identifier: 'inspektorat1',
      password: 'password123'
    });
    const token = loginResponse.data.token;
    console.log('   ✅ Login successful\n');

    // Try to upload without file to see exact error
    console.log('2️⃣ Testing upload without file (to see validation)...');
    try {
      const form = new FormData();
      form.append('title', 'Test');
      form.append('targetOPD', 'Dinas Pendidikan');
      form.append('useAutoMapping', 'true');
      // No file attached

      await axios.post('http://localhost:3000/api/matrix/upload-auto', form, {
        headers: {
          ...form.getHeaders(),
          'Authorization': `Bearer ${token}`
        }
      });
    } catch (error) {
      console.log('   ❌ Expected error (no file):');
      console.log('   Status:', error.response?.status);
      console.log('   Error:', error.response?.data?.error);
      console.log('');
    }

    // Try to upload with file but no title
    console.log('3️⃣ Testing upload with file but no title...');
    try {
      // Create dummy file
      const testFile = path.join(__dirname, 'temp-test.txt');
      fs.writeFileSync(testFile, 'test');

      const form = new FormData();
      form.append('file', fs.createReadStream(testFile));
      form.append('targetOPD', 'Dinas Pendidikan');
      form.append('useAutoMapping', 'true');
      // No title

      await axios.post('http://localhost:3000/api/matrix/upload-auto', form, {
        headers: {
          ...form.getHeaders(),
          'Authorization': `Bearer ${token}`
        }
      });

      fs.unlinkSync(testFile);
    } catch (error) {
      console.log('   ❌ Expected error (no title):');
      console.log('   Status:', error.response?.status);
      console.log('   Error:', error.response?.data?.error);
      console.log('');
      
      // Clean up
      const testFile = path.join(__dirname, 'temp-test.txt');
      if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
    }

    // Check what frontend is actually sending
    console.log('4️⃣ Simulating frontend request...');
    console.log('   This simulates exactly what frontend sends\n');
    
    console.log('   📋 IMPORTANT: Check backend console NOW!');
    console.log('   Look for these logs:');
    console.log('   - 🚀 UPLOAD-AUTO ENDPOINT HIT');
    console.log('   - 📦 Multer middleware callback');
    console.log('   - ❌ Error messages\n');

    console.log('   If you DON\'T see those logs, backend needs restart!\n');

    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║  NEXT STEPS                                                  ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
    
    console.log('1. Check backend console for logs starting with 🚀 📦 ❌');
    console.log('2. If NO logs appear, backend needs restart:');
    console.log('   - Close backend terminal');
    console.log('   - Run: restart-backend.bat');
    console.log('   - Wait for "Server running on port 3000"');
    console.log('3. Try upload from frontend again');
    console.log('4. Watch backend console for detailed error\n');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

checkBackendLogs();
