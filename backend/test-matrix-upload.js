const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testMatrixUpload() {
  console.log('🧪 Testing Matrix Upload Endpoint\n');

  // First, login to get token
  console.log('1️⃣ Logging in...');
  try {
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      identifier: 'inspektorat1',
      password: 'password123'
    });

    const token = loginResponse.data.token;
    console.log('✅ Login successful');
    console.log('   User:', loginResponse.data.user.name);
    console.log('   Role:', loginResponse.data.user.role);
    console.log('   Token:', token.substring(0, 20) + '...\n');

    // Check if test file exists
    const testFilePath = path.join(__dirname, 'test-matrix.xlsx');
    if (!fs.existsSync(testFilePath)) {
      console.log('❌ Test file not found:', testFilePath);
      console.log('   Please create a test Excel file with columns: Temuan, Penyebab, Rekomendasi\n');
      return;
    }

    console.log('2️⃣ Preparing upload...');
    console.log('   File:', testFilePath);
    console.log('   Size:', fs.statSync(testFilePath).size, 'bytes\n');

    // Create form data
    const form = new FormData();
    form.append('file', fs.createReadStream(testFilePath));
    form.append('title', 'Test Matrix Upload ' + new Date().toISOString());
    form.append('description', 'Testing matrix upload functionality');
    form.append('targetOPD', 'Dinas Pendidikan');
    form.append('useAutoMapping', 'true');

    console.log('3️⃣ Uploading matrix...');
    console.log('   Endpoint: POST /api/matrix/upload-auto');
    console.log('   Form data:');
    console.log('     - file: test-matrix.xlsx');
    console.log('     - title: Test Matrix Upload');
    console.log('     - targetOPD: Dinas Pendidikan');
    console.log('     - useAutoMapping: true\n');

    const uploadResponse = await axios.post(
      'http://localhost:3000/api/matrix/upload-auto',
      form,
      {
        headers: {
          ...form.getHeaders(),
          'Authorization': `Bearer ${token}`
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    );

    console.log('✅ Upload successful!');
    console.log('   Response:', JSON.stringify(uploadResponse.data, null, 2));

  } catch (error) {
    console.error('❌ Error occurred:');
    
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Status Text:', error.response.statusText);
      console.error('   Error Data:', JSON.stringify(error.response.data, null, 2));
      console.error('   Headers:', JSON.stringify(error.response.headers, null, 2));
    } else if (error.request) {
      console.error('   No response received from server');
      console.error('   Request:', error.request);
    } else {
      console.error('   Error:', error.message);
    }
    
    console.error('\n📋 Full error:', error);
  }
}

testMatrixUpload();
