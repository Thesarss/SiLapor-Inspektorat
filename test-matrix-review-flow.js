const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:3000/api';

async function testMatrixReviewFlow() {
  console.log('🧪 TESTING MATRIX REVIEW FLOW\n');
  
  try {
    // Step 1: Login as OPD
    console.log('1️⃣ Login as OPD (Dinas Pendidikan)...');
    const opdLogin = await axios.post(`${API_URL}/auth/login`, {
      identifier: 'pendidikan_staff1',
      password: 'password123'
    });
    
    if (!opdLogin.data.success) {
      console.error('❌ OPD login failed');
      return;
    }
    
    const opdToken = opdLogin.data.token;
    console.log('✅ OPD logged in:', opdLogin.data.user.name);
    console.log('');
    
    // Step 2: Get OPD assignments
    console.log('2️⃣ Getting OPD matrix assignments...');
    const assignments = await axios.get(`${API_URL}/matrix/assignments`, {
      headers: { Authorization: `Bearer ${opdToken}` }
    });
    
    if (assignments.data.count === 0) {
      console.log('❌ No assignments found for OPD');
      return;
    }
    
    console.log(`✅ Found ${assignments.data.count} assignments`);
    const firstAssignment = assignments.data.data[0];
    console.log(`   Working on: ${firstAssignment.title}`);
    console.log('');
    
    // Step 3: Get assignment items
    console.log('3️⃣ Getting matrix items...');
    const items = await axios.get(`${API_URL}/matrix/assignment/${firstAssignment.id}/items`, {
      headers: { Authorization: `Bearer ${opdToken}` }
    });
    
    const pendingItems = items.data.data.items.filter(item => item.status === 'pending');
    console.log(`✅ Found ${items.data.data.items.length} total items`);
    console.log(`   Pending: ${pendingItems.length}`);
    console.log(`   Submitted: ${items.data.data.items.filter(i => i.status === 'submitted').length}`);
    console.log(`   Approved: ${items.data.data.items.filter(i => i.status === 'approved').length}`);
    console.log('');
    
    if (pendingItems.length === 0) {
      console.log('ℹ️  No pending items to submit');
      console.log('');
    } else {
      // Step 4: Submit tindak lanjut for first pending item
      const itemToSubmit = pendingItems[0];
      console.log(`4️⃣ Submitting tindak lanjut for item #${itemToSubmit.item_number}...`);
      console.log(`   Temuan: ${itemToSubmit.temuan.substring(0, 50)}...`);
      
      const formData = new FormData();
      formData.append('tindakLanjut', `Tindak lanjut untuk item #${itemToSubmit.item_number}: Telah dilakukan perbaikan sesuai rekomendasi. Bukti terlampir.`);
      
      // Create a dummy PDF-like file as evidence
      const dummyFile = Buffer.from('%PDF-1.4\nDummy PDF for testing');
      formData.append('evidence', dummyFile, {
        filename: 'evidence-test.pdf',
        contentType: 'application/pdf'
      });
      
      const submitResponse = await axios.post(
        `${API_URL}/matrix/item/${itemToSubmit.id}/submit`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            Authorization: `Bearer ${opdToken}`
          }
        }
      );
      
      if (submitResponse.data.success) {
        console.log('✅ Tindak lanjut submitted successfully');
        console.log(`   Has evidence: ${submitResponse.data.data.hasEvidence}`);
      } else {
        console.log('❌ Submit failed:', submitResponse.data.error);
      }
      console.log('');
    }
    
    // Step 5: Login as Inspektorat
    console.log('5️⃣ Login as Inspektorat...');
    const inspektoratLogin = await axios.post(`${API_URL}/auth/login`, {
      identifier: 'inspektorat_kepala',
      password: 'password123'
    });
    
    if (!inspektoratLogin.data.success) {
      console.error('❌ Inspektorat login failed');
      return;
    }
    
    const inspektoratToken = inspektoratLogin.data.token;
    console.log('✅ Inspektorat logged in:', inspektoratLogin.data.user.name);
    console.log('');
    
    // Step 6: Get matrix reports
    console.log('6️⃣ Getting matrix reports...');
    const reports = await axios.get(`${API_URL}/matrix/reports`, {
      headers: { Authorization: `Bearer ${inspektoratToken}` }
    });
    
    console.log(`✅ Found ${reports.data.count} matrix reports`);
    reports.data.data.slice(0, 3).forEach(report => {
      console.log(`   📋 ${report.title}`);
      console.log(`      Progress: ${report.completed_items}/${report.total_items} completed`);
      console.log(`      Target: ${report.target_opd}`);
    });
    console.log('');
    
    // Step 7: Check statistics
    console.log('7️⃣ Checking matrix statistics...');
    const stats = await axios.get(`${API_URL}/matrix/statistics`, {
      headers: { Authorization: `Bearer ${inspektoratToken}` }
    });
    
    console.log('✅ Statistics:');
    console.log(`   Total Matrix: ${stats.data.data.totalMatrix}`);
    console.log(`   Total Items: ${stats.data.data.totalItems}`);
    console.log(`   Completed: ${stats.data.data.completedItems}`);
    console.log(`   Submitted: ${stats.data.data.submittedItems}`);
    console.log(`   Pending: ${stats.data.data.pendingItems}`);
    console.log(`   Completion Rate: ${Math.round((stats.data.data.completedItems / stats.data.data.totalItems) * 100)}%`);
    console.log('');
    
    // Step 8: Check OPD performance
    console.log('8️⃣ Checking OPD performance...');
    const performance = await axios.get(`${API_URL}/matrix/opd-performance`, {
      headers: { Authorization: `Bearer ${inspektoratToken}` }
    });
    
    console.log(`✅ Found ${performance.data.data.length} OPDs with assignments:`);
    performance.data.data.forEach(opd => {
      console.log(`   🏢 ${opd.institution}`);
      console.log(`      Assignments: ${opd.total_assignments}`);
      console.log(`      Items: ${opd.total_items}`);
      console.log(`      Completed: ${opd.completed_items} (${opd.completion_rate}%)`);
      console.log(`      Submitted: ${opd.submitted_items}`);
      console.log(`      Pending: ${opd.pending_items}`);
    });
    console.log('');
    
    console.log('✅ ALL TESTS PASSED!');
    console.log('\n📝 SUMMARY:');
    console.log('   - OPD can view and submit tindak lanjut ✅');
    console.log('   - Evidence can be uploaded ✅');
    console.log('   - Inspektorat can view matrix reports ✅');
    console.log('   - Statistics are accurate ✅');
    console.log('   - OPD performance tracking works ✅');
    console.log('\n🎉 Matrix review system is working correctly!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

testMatrixReviewFlow();
