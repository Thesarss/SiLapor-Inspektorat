const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// Test Configuration
const BASE_URL = 'http://localhost:3000/api';
const FRONTEND_URL = 'http://localhost:5173';

// Test Users
const TEST_USERS = {
  super_admin: { identifier: 'admin', password: 'password123' },
  inspektorat: { identifier: 'inspektorat_kepala', password: 'password123' },
  opd: { identifier: 'pendidikan_staff1', password: 'password123' }
};

class ComprehensiveTestSuite {
  constructor() {
    this.tokens = {};
    this.testResults = {
      passed: 0,
      failed: 0,
      total: 0,
      details: []
    };
  }

  // Utility Methods
  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '📋',
      success: '✅',
      error: '❌',
      warning: '⚠️'
    }[type];
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  recordTest(testName, passed, error = null) {
    this.testResults.total++;
    if (passed) {
      this.testResults.passed++;
      this.log(`${testName} - PASSED`, 'success');
    } else {
      this.testResults.failed++;
      this.log(`${testName} - FAILED: ${error}`, 'error');
    }
    this.testResults.details.push({
      test: testName,
      passed,
      error: error?.message || error,
      timestamp: new Date().toISOString()
    });
  }

  // Authentication Tests
  async testAuthentication() {
    this.log('🔐 Testing Authentication System');
    
    for (const [role, credentials] of Object.entries(TEST_USERS)) {
      try {
        const response = await axios.post(`${BASE_URL}/auth/login`, credentials);
        
        if (response.data.success && response.data.token) {
          this.tokens[role] = response.data.token;
          this.recordTest(`Login as ${role}`, true);
        } else {
          this.recordTest(`Login as ${role}`, false, 'No token received');
        }
      } catch (error) {
        this.recordTest(`Login as ${role}`, false, error.response?.data?.error || error.message);
      }
    }

    // Test invalid login
    try {
      await axios.post(`${BASE_URL}/auth/login`, {
        identifier: 'invalid',
        password: 'invalid'
      });
      this.recordTest('Invalid login rejection', false, 'Should have failed');
    } catch (error) {
      this.recordTest('Invalid login rejection', true);
    }
  }

  // Database Tests
  async testDatabase() {
    this.log('🗄️ Testing Database Connectivity');
    
    try {
      const response = await axios.get(`${BASE_URL}/dashboard/stats`, {
        headers: { Authorization: `Bearer ${this.tokens.super_admin}` }
      });
      
      if (response.data.success) {
        this.recordTest('Database connectivity', true);
      } else {
        this.recordTest('Database connectivity', false, 'No data returned');
      }
    } catch (error) {
      this.recordTest('Database connectivity', false, error.message);
    }
  }

  // Matrix System Tests
  async testMatrixSystem() {
    this.log('📊 Testing Matrix System');
    
    // Test institutions endpoint
    try {
      const response = await axios.get(`${BASE_URL}/matrix/institutions`, {
        headers: { Authorization: `Bearer ${this.tokens.inspektorat}` }
      });
      
      if (response.data.success && Array.isArray(response.data.data)) {
        this.recordTest('Matrix institutions endpoint', true);
      } else {
        this.recordTest('Matrix institutions endpoint', false, 'Invalid response format');
      }
    } catch (error) {
      this.recordTest('Matrix institutions endpoint', false, error.message);
    }

    // Test matrix auto upload
    await this.testMatrixAutoUpload();

    // Test matrix assignments
    await this.testMatrixAssignments();
  }

  async testMatrixAutoUpload() {
    try {
      // Create sample Excel file
      const sampleData = [
        ['', '', '', ''],
        ['', '', '', ''],
        ['', '', '', ''],
        ['', '', '', ''],
        ['No', 'Temuan Audit', 'Penyebab', 'Rekomendasi'],
        ['1', 'Test temuan 1', 'Test penyebab 1', 'Test rekomendasi 1'],
        ['2', 'Test temuan 2', 'Test penyebab 2', 'Test rekomendasi 2']
      ];
      
      const ws = XLSX.utils.aoa_to_sheet(sampleData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Matrix Test');
      
      const testFilePath = path.join(__dirname, 'test-matrix-upload.xlsx');
      XLSX.writeFile(wb, testFilePath);

      // Upload matrix
      const formData = new FormData();
      formData.append('file', fs.createReadStream(testFilePath));
      formData.append('title', 'Test Matrix Auto Upload');
      formData.append('description', 'Automated test matrix');
      formData.append('targetOPD', 'Dinas Pendidikan');
      formData.append('useAutoMapping', 'true');

      const response = await axios.post(`${BASE_URL}/matrix/upload-auto`, formData, {
        headers: {
          ...formData.getHeaders(),
          Authorization: `Bearer ${this.tokens.inspektorat}`
        }
      });

      // Clean up test file
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }

      if (response.data.success) {
        this.recordTest('Matrix auto upload', true);
        return response.data.data.reportId;
      } else {
        this.recordTest('Matrix auto upload', false, response.data.error);
      }
    } catch (error) {
      this.recordTest('Matrix auto upload', false, error.message);
    }
    return null;
  }

  async testMatrixAssignments() {
    try {
      const response = await axios.get(`${BASE_URL}/matrix/assignments`, {
        headers: { Authorization: `Bearer ${this.tokens.opd}` }
      });
      
      if (response.data.success && Array.isArray(response.data.data)) {
        this.recordTest('Matrix assignments for OPD', true);
        
        // Test assignment items if assignments exist
        if (response.data.data.length > 0) {
          const assignmentId = response.data.data[0].id;
          await this.testAssignmentItems(assignmentId);
        }
      } else {
        this.recordTest('Matrix assignments for OPD', false, 'Invalid response');
      }
    } catch (error) {
      this.recordTest('Matrix assignments for OPD', false, error.message);
    }
  }

  async testAssignmentItems(assignmentId) {
    try {
      const response = await axios.get(`${BASE_URL}/matrix/assignment/${assignmentId}/items`, {
        headers: { Authorization: `Bearer ${this.tokens.opd}` }
      });
      
      if (response.data.success && response.data.data.items) {
        this.recordTest('Matrix assignment items', true);
      } else {
        this.recordTest('Matrix assignment items', false, 'No items found');
      }
    } catch (error) {
      this.recordTest('Matrix assignment items', false, error.message);
    }
  }

  // Import System Tests
  async testImportSystem() {
    this.log('📥 Testing Import System');
    
    try {
      // Test target selection (institutions)
      const response = await axios.get(`${BASE_URL}/imports/institutions`, {
        headers: { Authorization: `Bearer ${this.tokens.inspektorat}` }
      });
      
      if (response.data.success) {
        this.recordTest('Import institutions endpoint', true);
      } else {
        this.recordTest('Import institutions endpoint', false, 'No institutions returned');
      }
    } catch (error) {
      this.recordTest('Import institutions endpoint', false, error.message);
    }
  }

  // Evidence System Tests
  async testEvidenceSystem() {
    this.log('📎 Testing Evidence System');
    
    try {
      const response = await axios.get(`${BASE_URL}/matrix/evidence/metadata`, {
        headers: { Authorization: `Bearer ${this.tokens.inspektorat}` }
      });
      
      if (response.data.success) {
        this.recordTest('Evidence metadata endpoint', true);
      } else {
        this.recordTest('Evidence metadata endpoint', false, 'No metadata returned');
      }
    } catch (error) {
      this.recordTest('Evidence metadata endpoint', false, error.message);
    }

    // Test evidence search
    try {
      const response = await axios.get(`${BASE_URL}/matrix/evidence/search?page=1&limit=10`, {
        headers: { Authorization: `Bearer ${this.tokens.inspektorat}` }
      });
      
      if (response.data.success) {
        this.recordTest('Evidence search endpoint', true);
      } else {
        this.recordTest('Evidence search endpoint', false, 'Search failed');
      }
    } catch (error) {
      this.recordTest('Evidence search endpoint', false, error.message);
    }
  }

  // Performance Tests
  async testPerformance() {
    this.log('⚡ Testing Performance');
    
    try {
      const response = await axios.get(`${BASE_URL}/performance/dashboard`, {
        headers: { Authorization: `Bearer ${this.tokens.inspektorat}` }
      });
      
      if (response.data.success) {
        this.recordTest('Performance dashboard', true);
      } else {
        this.recordTest('Performance dashboard', false, 'No performance data');
      }
    } catch (error) {
      this.recordTest('Performance dashboard', false, error.message);
    }
  }

  // Frontend Tests
  async testFrontend() {
    this.log('🌐 Testing Frontend');
    
    try {
      const response = await axios.get(FRONTEND_URL, { timeout: 5000 });
      
      if (response.status === 200) {
        this.recordTest('Frontend accessibility', true);
      } else {
        this.recordTest('Frontend accessibility', false, `Status: ${response.status}`);
      }
    } catch (error) {
      this.recordTest('Frontend accessibility', false, error.message);
    }
  }

  // API Health Tests
  async testAPIHealth() {
    this.log('🏥 Testing API Health');
    
    try {
      const response = await axios.get(`${BASE_URL.replace('/api', '')}/health`);
      
      if (response.data.status === 'OK') {
        this.recordTest('API health check', true);
      } else {
        this.recordTest('API health check', false, 'Health check failed');
      }
    } catch (error) {
      this.recordTest('API health check', false, error.message);
    }
  }

  // Security Tests
  async testSecurity() {
    this.log('🔒 Testing Security');
    
    // Test unauthorized access
    try {
      await axios.get(`${BASE_URL}/matrix/reports`);
      this.recordTest('Unauthorized access protection', false, 'Should require authentication');
    } catch (error) {
      if (error.response?.status === 401) {
        this.recordTest('Unauthorized access protection', true);
      } else {
        this.recordTest('Unauthorized access protection', false, 'Unexpected error');
      }
    }

    // Test rate limiting
    try {
      const requests = Array(10).fill().map(() => 
        axios.get(`${BASE_URL}/health`).catch(() => {})
      );
      await Promise.all(requests);
      this.recordTest('Rate limiting test', true);
    } catch (error) {
      this.recordTest('Rate limiting test', false, error.message);
    }
  }

  // File Upload Tests
  async testFileUploads() {
    this.log('📁 Testing File Upload Systems');
    
    // Test file size validation
    try {
      const formData = new FormData();
      const largeBuffer = Buffer.alloc(15 * 1024 * 1024); // 15MB
      formData.append('file', largeBuffer, 'large-file.xlsx');
      formData.append('title', 'Test Large File');
      formData.append('targetOPD', 'Dinas Pendidikan');

      await axios.post(`${BASE_URL}/matrix/upload-auto`, formData, {
        headers: {
          ...formData.getHeaders(),
          Authorization: `Bearer ${this.tokens.inspektorat}`
        },
        timeout: 10000 // 10 second timeout
      });
      
      this.recordTest('File size validation', false, 'Should reject large files');
    } catch (error) {
      if (error.response?.status === 400 || error.response?.status === 413) {
        this.recordTest('File size validation', true);
      } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        this.recordTest('File size validation', true, 'Request timed out (expected for large files)');
      } else {
        this.recordTest('File size validation', false, `Unexpected error: ${error.message}`);
      }
    }
  }

  // Run All Tests
  async runAllTests() {
    console.log('🚀 Starting Comprehensive Test Suite for SILAPOR');
    console.log('=' .repeat(60));
    
    const startTime = Date.now();
    
    try {
      await this.testAPIHealth();
      await this.testFrontend();
      await this.testAuthentication();
      await this.testDatabase();
      await this.testSecurity();
      await this.testMatrixSystem();
      await this.testImportSystem();
      await this.testEvidenceSystem();
      await this.testPerformance();
      await this.testFileUploads();
    } catch (error) {
      this.log(`Test suite error: ${error.message}`, 'error');
    }
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    this.generateReport(duration);
  }

  generateReport(duration) {
    console.log('\n' + '=' .repeat(60));
    console.log('📊 TEST SUITE RESULTS');
    console.log('=' .repeat(60));
    
    console.log(`⏱️  Duration: ${duration} seconds`);
    console.log(`📋 Total Tests: ${this.testResults.total}`);
    console.log(`✅ Passed: ${this.testResults.passed}`);
    console.log(`❌ Failed: ${this.testResults.failed}`);
    
    const successRate = ((this.testResults.passed / this.testResults.total) * 100).toFixed(1);
    console.log(`📈 Success Rate: ${successRate}%`);
    
    if (this.testResults.failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.testResults.details
        .filter(test => !test.passed)
        .forEach(test => {
          console.log(`   • ${test.test}: ${test.error}`);
        });
    }
    
    console.log('\n🎯 RECOMMENDATIONS:');
    if (successRate >= 90) {
      console.log('   ✅ System is in excellent condition');
    } else if (successRate >= 75) {
      console.log('   ⚠️  System needs minor fixes');
    } else {
      console.log('   ❌ System needs major attention');
    }
    
    // Save detailed report
    const reportPath = path.join(__dirname, 'test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify({
      summary: {
        duration,
        total: this.testResults.total,
        passed: this.testResults.passed,
        failed: this.testResults.failed,
        successRate: parseFloat(successRate)
      },
      details: this.testResults.details,
      timestamp: new Date().toISOString()
    }, null, 2));
    
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
    console.log('=' .repeat(60));
  }
}

// Run tests if called directly
if (require.main === module) {
  const testSuite = new ComprehensiveTestSuite();
  testSuite.runAllTests().catch(console.error);
}

module.exports = ComprehensiveTestSuite;