const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

async function diagnoseMatrixUpload() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  DIAGNOSE MATRIX UPLOAD ISSUE                                ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  let token = null;
  let user = null;

  // Step 1: Check backend health
  console.log('📋 Step 1: Checking backend health...');
  try {
    const healthResponse = await axios.get('http://localhost:3000/health', { timeout: 5000 });
    console.log('   ✅ Backend is running');
    console.log('   ├─ Uptime:', Math.floor(healthResponse.data.uptime), 'seconds');
    console.log('   └─ Environment:', healthResponse.data.environment);
  } catch (error) {
    console.log('   ❌ Backend is NOT running or not responding');
    console.log('   └─ Error:', error.code || error.message);
    console.log('\n🔧 FIX: Run "restart-backend.bat" or "cd backend && npm run dev"\n');
    return;
  }

  // Step 2: Test login
  console.log('\n📋 Step 2: Testing login...');
  try {
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      identifier: 'inspektorat1',
      password: 'password123'
    });
    token = loginResponse.data.token;
    user = loginResponse.data.user;
    console.log('   ✅ Login successful');
    console.log('   ├─ User:', user.name);
    console.log('   ├─ Role:', user.role);
    console.log('   └─ Institution:', user.institution || 'N/A');
  } catch (error) {
    console.log('   ❌ Login failed');
    console.log('   └─ Error:', error.response?.data?.error || error.message);
    console.log('\n🔧 FIX: Check database for user "inspektorat1" with password "password123"\n');
    return;
  }

  // Step 3: Check user permissions
  console.log('\n📋 Step 3: Checking user permissions...');
  if (user.role === 'inspektorat' || user.role === 'super_admin') {
    console.log('   ✅ User has permission to upload matrix');
    console.log('   └─ Role:', user.role);
  } else {
    console.log('   ❌ User does NOT have permission');
    console.log('   ├─ Current role:', user.role);
    console.log('   └─ Required role: inspektorat or super_admin');
    console.log('\n🔧 FIX: Login with inspektorat account\n');
    return;
  }

  // Step 4: Check institutions
  console.log('\n📋 Step 4: Checking available institutions...');
  try {
    const institutionsResponse = await axios.get('http://localhost:3000/api/matrix/institutions', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const institutions = institutionsResponse.data.data;
    console.log('   ✅ Institutions loaded');
    console.log('   ├─ Count:', institutions.length);
    if (institutions.length > 0) {
      console.log('   └─ Available:', institutions.slice(0, 3).join(', '), institutions.length > 3 ? '...' : '');
    } else {
      console.log('   └─ WARNING: No institutions found in database');
    }
  } catch (error) {
    console.log('   ❌ Failed to load institutions');
    console.log('   └─ Error:', error.response?.data?.error || error.message);
  }

  // Step 5: Create test Excel file
  console.log('\n📋 Step 5: Creating test Excel file...');
  const testFilePath = path.join(__dirname, 'test-matrix-upload.xlsx');
  try {
    const workbook = XLSX.utils.book_new();
    const data = [
      ['Temuan', 'Penyebab', 'Rekomendasi'],
      ['Laporan keuangan tidak lengkap', 'Kurangnya SDM', 'Tambah personel akuntansi'],
      ['Data tidak akurat', 'Sistem manual', 'Implementasi sistem digital'],
      ['Dokumentasi kurang', 'Tidak ada SOP', 'Buat SOP dokumentasi']
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Matrix Audit');
    XLSX.writeFile(workbook, testFilePath);
    
    const fileSize = fs.statSync(testFilePath).size;
    console.log('   ✅ Test file created');
    console.log('   ├─ Path:', testFilePath);
    console.log('   ├─ Size:', fileSize, 'bytes');
    console.log('   └─ Rows: 3 data rows + 1 header');
  } catch (error) {
    console.log('   ❌ Failed to create test file');
    console.log('   └─ Error:', error.message);
    return;
  }

  // Step 6: Test matrix upload
  console.log('\n📋 Step 6: Testing matrix upload...');
  try {
    const form = new FormData();
    form.append('file', fs.createReadStream(testFilePath));
    form.append('title', 'Test Matrix Upload ' + new Date().toISOString());
    form.append('description', 'Automated test upload');
    form.append('targetOPD', 'Dinas Pendidikan');
    form.append('useAutoMapping', 'true');

    console.log('   📤 Uploading...');
    console.log('   ├─ Endpoint: POST /api/matrix/upload-auto');
    console.log('   ├─ Title: Test Matrix Upload');
    console.log('   ├─ Target OPD: Dinas Pendidikan');
    console.log('   └─ Auto Mapping: true');
    console.log('\n   ⏳ Please check BACKEND CONSOLE for detailed logs...\n');

    const uploadResponse = await axios.post(
      'http://localhost:3000/api/matrix/upload-auto',
      form,
      {
        headers: {
          ...form.getHeaders(),
          'Authorization': `Bearer ${token}`
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 30000
      }
    );

    console.log('   ✅ UPLOAD SUCCESSFUL!');
    console.log('   ├─ Report ID:', uploadResponse.data.data.reportId);
    console.log('   ├─ Total Items:', uploadResponse.data.data.totalItems);
    console.log('   ├─ Assignments:', uploadResponse.data.data.assignmentsCount);
    console.log('   └─ Message:', uploadResponse.data.message);
    
    if (uploadResponse.data.data.warnings && uploadResponse.data.data.warnings.length > 0) {
      console.log('\n   ⚠️  Warnings:');
      uploadResponse.data.data.warnings.forEach(w => console.log('      -', w));
    }

    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ ALL TESTS PASSED - Matrix upload is working!            ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

  } catch (error) {
    console.log('   ❌ UPLOAD FAILED');
    
    if (error.response) {
      console.log('   ├─ Status:', error.response.status, error.response.statusText);
      console.log('   ├─ Error:', error.response.data.error || 'Unknown error');
      
      if (error.response.data.details) {
        console.log('   └─ Details:');
        if (error.response.data.details.errors) {
          console.log('      Errors:');
          error.response.data.details.errors.forEach(e => console.log('      -', e));
        }
        if (error.response.data.details.warnings) {
          console.log('      Warnings:');
          error.response.data.details.warnings.forEach(w => console.log('      -', w));
        }
        if (error.response.data.details.detectedHeaders) {
          console.log('      Detected Headers:', JSON.stringify(error.response.data.details.detectedHeaders));
        }
      }

      console.log('\n╔══════════════════════════════════════════════════════════════╗');
      console.log('║  ❌ UPLOAD FAILED - Check error details above               ║');
      console.log('╚══════════════════════════════════════════════════════════════╝\n');

      // Provide specific fixes based on error
      const errorMsg = error.response.data.error || '';
      
      if (errorMsg.includes('Permission') || errorMsg.includes('Hanya Inspektorat')) {
        console.log('🔧 FIX: Login with inspektorat account');
      } else if (errorMsg.includes('File') && errorMsg.includes('tidak ditemukan')) {
        console.log('🔧 FIX: Ensure file is properly uploaded');
      } else if (errorMsg.includes('Title') || errorMsg.includes('Target OPD')) {
        console.log('🔧 FIX: Fill in all required fields (Title and Target OPD)');
      } else if (errorMsg.includes('tidak dapat mendeteksi')) {
        console.log('🔧 FIX: Excel file must have columns: Temuan, Penyebab, Rekomendasi');
      } else if (errorMsg.includes('terlalu besar')) {
        console.log('🔧 FIX: File size must be less than 10MB');
      } else {
        console.log('🔧 FIX: Check backend console for detailed error logs');
      }

      console.log('\n📋 IMPORTANT: Check BACKEND CONSOLE for detailed logs!');
      console.log('   Look for logs starting with: 🚀 📦 ✅ ❌\n');

    } else if (error.request) {
      console.log('   └─ No response from server');
      console.log('\n🔧 FIX: Backend may have crashed. Check backend console and restart.\n');
    } else {
      console.log('   └─ Error:', error.message);
    }
  }

  // Cleanup
  try {
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
      console.log('🧹 Cleaned up test file\n');
    }
  } catch (e) {
    // Ignore cleanup errors
  }
}

diagnoseMatrixUpload();
