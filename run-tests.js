#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class TestRunner {
  constructor() {
    this.testResults = [];
  }

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

  async runCommand(command, args = [], cwd = process.cwd()) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd,
        stdio: 'pipe',
        shell: true
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        resolve({
          code,
          stdout,
          stderr,
          success: code === 0
        });
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  async checkPrerequisites() {
    this.log('🔍 Checking prerequisites...');
    
    // Check if backend is running
    try {
      const response = await fetch('http://localhost:3000/health');
      if (response.ok) {
        this.log('Backend is running ✅', 'success');
      } else {
        throw new Error('Backend not responding');
      }
    } catch (error) {
      this.log('Backend is not running ❌', 'error');
      this.log('Please start backend with: cd backend && npm run dev', 'warning');
      return false;
    }

    // Check if frontend is running
    try {
      const response = await fetch('http://localhost:5173');
      if (response.ok) {
        this.log('Frontend is running ✅', 'success');
      } else {
        throw new Error('Frontend not responding');
      }
    } catch (error) {
      this.log('Frontend is not running ❌', 'error');
      this.log('Please start frontend with: cd frontend && npm run dev', 'warning');
      return false;
    }

    return true;
  }

  async runIndividualTests() {
    this.log('🧪 Running individual test files...');
    
    const testFiles = [
      'tests/test-matrix-upload.js',
      'tests/test-matrix-assignments.js',
      'tests/test-all-users.js'
    ];

    for (const testFile of testFiles) {
      if (fs.existsSync(testFile)) {
        this.log(`Running ${testFile}...`);
        try {
          const result = await this.runCommand('node', [testFile]);
          if (result.success) {
            this.log(`${testFile} - PASSED`, 'success');
            this.testResults.push({ test: testFile, passed: true });
          } else {
            this.log(`${testFile} - FAILED`, 'error');
            this.testResults.push({ test: testFile, passed: false, error: result.stderr });
          }
        } catch (error) {
          this.log(`${testFile} - ERROR: ${error.message}`, 'error');
          this.testResults.push({ test: testFile, passed: false, error: error.message });
        }
      }
    }
  }

  async runComprehensiveTest() {
    this.log('🚀 Running comprehensive test suite...');
    
    try {
      const result = await this.runCommand('node', ['tests/comprehensive-test-suite.js']);
      if (result.success) {
        this.log('Comprehensive test suite - PASSED', 'success');
        return true;
      } else {
        this.log('Comprehensive test suite - FAILED', 'error');
        console.log(result.stdout);
        return false;
      }
    } catch (error) {
      this.log(`Comprehensive test suite - ERROR: ${error.message}`, 'error');
      return false;
    }
  }

  async runBackendTests() {
    this.log('🔧 Running backend unit tests...');
    
    try {
      const result = await this.runCommand('npm', ['test'], 'backend');
      if (result.success) {
        this.log('Backend unit tests - PASSED', 'success');
        return true;
      } else {
        this.log('Backend unit tests - FAILED', 'error');
        console.log(result.stdout);
        return false;
      }
    } catch (error) {
      this.log(`Backend unit tests - ERROR: ${error.message}`, 'error');
      return false;
    }
  }

  async runDatabaseIntegrityCheck() {
    this.log('🗄️ Running database integrity check...');
    
    try {
      const result = await this.runCommand('node', ['scripts/check-database-integrity.js']);
      if (result.success) {
        this.log('Database integrity check - PASSED', 'success');
        return true;
      } else {
        this.log('Database integrity check - FAILED', 'error');
        console.log(result.stdout);
        return false;
      }
    } catch (error) {
      this.log(`Database integrity check - ERROR: ${error.message}`, 'error');
      return false;
    }
  }

  generateSummaryReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 COMPLETE TEST SUMMARY');
    console.log('='.repeat(60));
    
    const passed = this.testResults.filter(t => t.passed).length;
    const failed = this.testResults.filter(t => !t.passed).length;
    const total = this.testResults.length;
    
    console.log(`📋 Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    
    if (total > 0) {
      const successRate = ((passed / total) * 100).toFixed(1);
      console.log(`📈 Success Rate: ${successRate}%`);
      
      if (failed > 0) {
        console.log('\n❌ FAILED TESTS:');
        this.testResults
          .filter(t => !t.passed)
          .forEach(test => {
            console.log(`   • ${test.test}: ${test.error || 'Unknown error'}`);
          });
      }
      
      console.log('\n🎯 RECOMMENDATIONS:');
      if (successRate >= 90) {
        console.log('   ✅ System is in excellent condition');
        console.log('   🚀 Ready for production deployment');
      } else if (successRate >= 75) {
        console.log('   ⚠️  System needs minor fixes');
        console.log('   🔧 Address failed tests before deployment');
      } else {
        console.log('   ❌ System needs major attention');
        console.log('   🛠️  Significant issues need to be resolved');
      }
    }
    
    console.log('\n📄 Detailed reports available in:');
    console.log('   • tests/test-report.json - Comprehensive test results');
    console.log('   • Backend test results in backend/coverage/');
    
    console.log('\n🔗 Next Steps:');
    console.log('   1. Fix any failed tests');
    console.log('   2. Run tests again to verify fixes');
    console.log('   3. Deploy to staging environment');
    console.log('   4. Run production readiness checklist');
    
    console.log('='.repeat(60));
  }

  async runAllTests() {
    console.log('🚀 SILAPOR Complete Test Suite');
    console.log('='.repeat(60));
    
    const startTime = Date.now();
    
    // Check prerequisites
    const prerequisitesOk = await this.checkPrerequisites();
    if (!prerequisitesOk) {
      this.log('Prerequisites not met. Exiting.', 'error');
      return;
    }

    // Run all test categories
    await this.runDatabaseIntegrityCheck();
    await this.runIndividualTests();
    await this.runComprehensiveTest();
    
    // Try to run backend tests (may not exist)
    try {
      await this.runBackendTests();
    } catch (error) {
      this.log('Backend tests not configured, skipping...', 'warning');
    }
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(`\n⏱️  Total test duration: ${duration} seconds`);
    
    this.generateSummaryReport();
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const testRunner = new TestRunner();
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🧪 SILAPOR Test Runner

Usage: node run-tests.js [options]

Options:
  --help, -h          Show this help message
  --comprehensive     Run only comprehensive test suite
  --individual        Run only individual tests
  --backend           Run only backend tests
  --database          Run only database integrity check
  --quick             Run quick tests only (no comprehensive)

Examples:
  node run-tests.js                    # Run all tests
  node run-tests.js --comprehensive    # Run comprehensive suite only
  node run-tests.js --quick            # Run quick tests only
    `);
    process.exit(0);
  }
  
  if (args.includes('--comprehensive')) {
    testRunner.checkPrerequisites().then(ok => {
      if (ok) testRunner.runComprehensiveTest();
    });
  } else if (args.includes('--individual')) {
    testRunner.runIndividualTests();
  } else if (args.includes('--backend')) {
    testRunner.runBackendTests();
  } else if (args.includes('--database')) {
    testRunner.runDatabaseIntegrityCheck();
  } else if (args.includes('--quick')) {
    testRunner.checkPrerequisites().then(ok => {
      if (ok) {
        testRunner.runDatabaseIntegrityCheck();
        testRunner.runIndividualTests();
      }
    });
  } else {
    testRunner.runAllTests().catch(console.error);
  }
}

module.exports = TestRunner;