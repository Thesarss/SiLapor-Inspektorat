const axios = require('axios');

async function testMatrixAssignments() {
  try {
    console.log('🧪 Testing Matrix Assignments');
    
    // 1. Login as OPD user
    console.log('\n1. Login as OPD user...');
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      identifier: 'pendidikan_staff1',
      password: 'password123'
    });
    
    if (!loginResponse.data.success) {
      throw new Error('Login failed');
    }
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful as OPD user');
    
    // 2. Get assignments
    console.log('\n2. Getting assignments...');
    const assignmentsResponse = await axios.get('http://localhost:3000/api/matrix/assignments', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Assignments:', JSON.stringify(assignmentsResponse.data, null, 2));
    
    if (assignmentsResponse.data.data.length > 0) {
      const assignmentId = assignmentsResponse.data.data[0].id;
      
      // 3. Get assignment items
      console.log(`\n3. Getting items for assignment ${assignmentId}...`);
      const itemsResponse = await axios.get(`http://localhost:3000/api/matrix/assignment/${assignmentId}/items`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('✅ Assignment items:', JSON.stringify(itemsResponse.data, null, 2));
    }
    
    console.log('\n🎉 Matrix assignments test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testMatrixAssignments();