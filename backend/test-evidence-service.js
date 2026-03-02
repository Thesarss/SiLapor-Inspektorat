// Test script to check EvidenceService methods
const path = require('path');

async function testEvidenceService() {
  try {
    // Import the service
    const { EvidenceService } = require('./dist/services/evidence.service.js');
    
    console.log('✅ EvidenceService imported successfully');
    console.log('Available methods:', Object.getOwnPropertyNames(EvidenceService));
    
    // Check if new methods exist
    const requiredMethods = ['uploadMatrixEvidence', 'getMatrixProgress', 'getMatrixEvidenceTracking'];
    
    for (const method of requiredMethods) {
      if (typeof EvidenceService[method] === 'function') {
        console.log(`✅ ${method} method exists`);
      } else {
        console.log(`❌ ${method} method missing`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing EvidenceService:', error.message);
  }
}

testEvidenceService();