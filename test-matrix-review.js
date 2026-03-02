#!/usr/bin/env node

/**
 * Test Matrix Item Review Endpoint
 * Tests the approve/reject functionality for matrix items
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

// You need to replace this with a valid token from your login
const TOKEN = 'YOUR_TOKEN_HERE';

async function testMatrixReview() {
  console.log('🧪 Testing Matrix Item Review Endpoint\n');

  // Test data - replace with actual item ID from your database
  const testItemId = 'ebb37055-73ae-43cd-a3f9-8dbba6842d8e'; // From your error screenshot
  
  try {
    console.log('📊 Test 1: Approve Matrix Item');
    console.log('─────────────────────────────────');
    
    const approveResponse = await axios.post(
      `${BASE_URL}/matrix/item/${testItemId}/review`,
      {
        status: 'approved',
        reviewNotes: 'Test approval'
      },
      {
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Success:', approveResponse.data);
    
  } catch (error) {
    console.error('❌ Error Details:');
    console.error('Status:', error.response?.status);
    console.error('Status Text:', error.response?.statusText);
    console.error('Error Message:', error.response?.data?.error || error.message);
    console.error('Full Response:', JSON.stringify(error.response?.data, null, 2));
    
    // Check if it's a database error
    if (error.response?.status === 500) {
      console.error('\n🔍 Possible Issues:');
      console.error('1. Database connection problem');
      console.error('2. Table "matrix_items" might not exist');
      console.error('3. Column mismatch in UPDATE query');
      console.error('4. Item ID not found in database');
      console.error('\n💡 Check backend console for detailed error');
    }
  }
}

async function checkDatabase() {
  console.log('\n🔍 Database Check Commands:');
  console.log('─────────────────────────────────');
  console.log('Run these in MySQL:');
  console.log('');
  console.log('-- Check if table exists');
  console.log('SHOW TABLES LIKE \'matrix_items\';');
  console.log('');
  console.log('-- Check table structure');
  console.log('DESCRIBE matrix_items;');
  console.log('');
  console.log('-- Check if item exists');
  console.log(`SELECT * FROM matrix_items WHERE id = 'ebb37055-73ae-43cd-a3f9-8dbba6842d8e';`);
  console.log('');
  console.log('-- Check all matrix items');
  console.log('SELECT id, status, reviewed_by, reviewed_at FROM matrix_items LIMIT 5;');
}

// Instructions
console.log('📝 INSTRUCTIONS:');
console.log('1. Login to get your token');
console.log('2. Replace TOKEN variable in this script');
console.log('3. Replace testItemId with actual item ID');
console.log('4. Run: node test-matrix-review.js');
console.log('');

if (TOKEN === 'YOUR_TOKEN_HERE') {
  console.log('⚠️  Please set TOKEN variable first!');
  console.log('');
  checkDatabase();
} else {
  testMatrixReview().then(() => {
    checkDatabase();
  });
}
