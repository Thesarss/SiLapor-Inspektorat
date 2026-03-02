const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testMatrixUpload() {
  try {
    console.log('🧪 Testing Matrix Upload System');
    
    // 1. Login first
    console.log('\n1. Login...');
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      identifier: 'inspektorat_kepala',
      password: 'password123'
    });
    
    if (!loginResponse.data.success) {
      throw new Error('Login failed');
    }
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful');
    
    // 2. Test institutions endpoint
    console.log('\n2. Testing institutions endpoint...');
    const institutionsResponse = await axios.get('http://localhost:3000/api/matrix/institutions', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Institutions:', institutionsResponse.data);
    
    // 3. Create a sample Excel file for testing
    console.log('\n3. Creating sample Excel file...');
    const XLSX = require('xlsx');
    
    const sampleData = [
      ['', '', '', ''], // Empty rows
      ['', '', '', ''],
      ['', '', '', ''],
      ['', '', '', ''],
      ['No', 'Temuan Audit', 'Penyebab', 'Rekomendasi'], // Header row 5
      ['1', 'Tidak ada dokumentasi prosedur', 'Belum ada SOP yang jelas', 'Membuat SOP dokumentasi'],
      ['2', 'Laporan keuangan terlambat', 'Kurang koordinasi tim', 'Meningkatkan koordinasi'],
      ['3', 'Aset tidak terinventarisir', 'Sistem pencatatan manual', 'Implementasi sistem digital']
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Matrix Audit');
    
    const testFilePath = path.join(__dirname, 'test-matrix.xlsx');
    XLSX.writeFile(wb, testFilePath);
    console.log('✅ Sample Excel file created:', testFilePath);
    
    // 4. Test auto upload
    console.log('\n4. Testing auto upload...');
    const formData = new FormData();
    formData.append('file', fs.createReadStream(testFilePath));
    formData.append('title', 'Test Matrix Audit Auto');
    formData.append('description', 'Testing automatic matrix parsing');
    formData.append('targetOPD', 'Dinas Pendidikan');
    formData.append('useAutoMapping', 'true');
    
    const uploadResponse = await axios.post('http://localhost:3000/api/matrix/upload-auto', formData, {
      headers: {
        ...formData.getHeaders(),
        Authorization: `Bearer ${token}`
      }
    });
    
    console.log('✅ Auto upload result:', JSON.stringify(uploadResponse.data, null, 2));
    
    // 5. Clean up test file
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
      console.log('✅ Test file cleaned up');
    }
    
    console.log('\n🎉 All tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    // Clean up test file on error
    const testFilePath = path.join(__dirname, 'test-matrix.xlsx');
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  }
}

testMatrixUpload();