const fs = require('fs');
const path = require('path');
const axios = require('axios');

class ProductionReadinessCheck {
  constructor() {
    this.checks = [];
    this.score = 0;
    this.maxScore = 0;
  }

  log(message, type = 'info') {
    const prefix = {
      info: '📋',
      success: '✅',
      error: '❌',
      warning: '⚠️'
    }[type];
    console.log(`${prefix} ${message}`);
  }

  addCheck(name, passed, weight = 1, details = '') {
    this.checks.push({ name, passed, weight, details });
    this.maxScore += weight;
    if (passed) this.score += weight;
  }

  // Security Checks
  async checkSecurity() {
    this.log('🔒 Checking Security Configuration...');
    
    // Check JWT secrets
    const backendEnv = path.join('backend', '.env');
    if (fs.existsSync(backendEnv)) {
      const envContent = fs.readFileSync(backendEnv, 'utf8');
      
      const jwtSecret = envContent.match(/JWT_SECRET=(.+)/)?.[1];
      const jwtRefreshSecret = envContent.match(/JWT_REFRESH_SECRET=(.+)/)?.[1];
      
      const hasStrongJWT = jwtSecret && jwtSecret.length >= 32 && !jwtSecret.includes('development');
      const hasStrongRefreshJWT = jwtRefreshSecret && jwtRefreshSecret.length >= 32 && !jwtRefreshSecret.includes('development');
      
      this.addCheck('Strong JWT Secret', hasStrongJWT, 3, 
        hasStrongJWT ? 'JWT secret is strong' : 'JWT secret is weak or contains "development"');
      
      this.addCheck('Strong Refresh JWT Secret', hasStrongRefreshJWT, 3,
        hasStrongRefreshJWT ? 'Refresh JWT secret is strong' : 'Refresh JWT secret is weak or contains "development"');
      
      // Check if default passwords are changed
      const hasDefaultPassword = envContent.includes('password123') || envContent.includes('DevSecure2024');
      this.addCheck('Default Passwords Changed', !hasDefaultPassword, 2,
        !hasDefaultPassword ? 'No default passwords found' : 'Default passwords still present in .env');
    } else {
      this.addCheck('Environment File Exists', false, 1, 'Backend .env file not found');
    }

    // Check HTTPS configuration
    const frontendEnv = path.join('frontend', '.env.production');
    if (fs.existsSync(frontendEnv)) {
      const envContent = fs.readFileSync(frontendEnv, 'utf8');
      const hasHTTPS = envContent.includes('https://');
      this.addCheck('HTTPS Configuration', hasHTTPS, 2,
        hasHTTPS ? 'Production uses HTTPS' : 'Production should use HTTPS');
    }
  }

  // Database Checks
  async checkDatabase() {
    this.log('🗄️ Checking Database Configuration...');
    
    try {
      // Check database integrity
      const { spawn } = require('child_process');
      const result = await new Promise((resolve) => {
        const child = spawn('node', ['scripts/check-database-integrity.js'], {
          stdio: 'pipe',
          cwd: path.join(__dirname, '..', 'backend')
        });
        
        let output = '';
        child.stdout.on('data', (data) => output += data.toString());
        child.on('close', (code) => resolve({ code, output }));
      });
      
      const hasAllTables = result.output.includes('✅ Database connected');
      this.addCheck('Database Connectivity', hasAllTables, 3,
        hasAllTables ? 'Database is accessible and has required tables' : 'Database connection issues');
      
      const hasUsers = result.output.includes('Found') && result.output.includes('users');
      this.addCheck('User Data Present', hasUsers, 2,
        hasUsers ? 'User data is present' : 'No user data found');
        
    } catch (error) {
      this.addCheck('Database Check', false, 3, `Database check failed: ${error.message}`);
    }
  }

  // Performance Checks
  async checkPerformance() {
    this.log('⚡ Checking Performance...');
    
    // Check file sizes
    const frontendDist = path.join('frontend', 'dist');
    if (fs.existsSync(frontendDist)) {
      const files = fs.readdirSync(frontendDist, { recursive: true });
      const jsFiles = files.filter(f => f.endsWith('.js'));
      
      let totalSize = 0;
      jsFiles.forEach(file => {
        const filePath = path.join(frontendDist, file);
        if (fs.existsSync(filePath)) {
          totalSize += fs.statSync(filePath).size;
        }
      });
      
      const sizeInMB = totalSize / (1024 * 1024);
      const isOptimized = sizeInMB < 5; // Less than 5MB total JS
      
      this.addCheck('Frontend Bundle Size', isOptimized, 2,
        `Total JS size: ${sizeInMB.toFixed(2)}MB ${isOptimized ? '(Good)' : '(Consider optimization)'}`);
    }

    // Check for production build
    const packageJson = path.join('frontend', 'package.json');
    if (fs.existsSync(packageJson)) {
      const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf8'));
      const hasBuildScript = pkg.scripts && pkg.scripts.build;
      this.addCheck('Build Script Available', hasBuildScript, 1,
        hasBuildScript ? 'Build script is configured' : 'No build script found');
    }
  }

  // Code Quality Checks
  async checkCodeQuality() {
    this.log('🔍 Checking Code Quality...');
    
    // Check for TypeScript compilation
    const backendTsConfig = path.join('backend', 'tsconfig.json');
    const frontendTsConfig = path.join('frontend', 'tsconfig.json');
    
    this.addCheck('Backend TypeScript Config', fs.existsSync(backendTsConfig), 1,
      fs.existsSync(backendTsConfig) ? 'TypeScript configured for backend' : 'No TypeScript config for backend');
    
    this.addCheck('Frontend TypeScript Config', fs.existsSync(frontendTsConfig), 1,
      fs.existsSync(frontendTsConfig) ? 'TypeScript configured for frontend' : 'No TypeScript config for frontend');

    // Check for error handling
    const errorMiddleware = path.join('backend', 'src', 'middleware', 'error.middleware.ts');
    this.addCheck('Error Handling Middleware', fs.existsSync(errorMiddleware), 2,
      fs.existsSync(errorMiddleware) ? 'Error handling middleware exists' : 'No error handling middleware');

    // Check for security middleware
    const securityMiddleware = path.join('backend', 'src', 'middleware', 'security.middleware.ts');
    this.addCheck('Security Middleware', fs.existsSync(securityMiddleware), 2,
      fs.existsSync(securityMiddleware) ? 'Security middleware exists' : 'No security middleware');
  }

  // Documentation Checks
  async checkDocumentation() {
    this.log('📚 Checking Documentation...');
    
    const userGuide = path.join('user-guide', 'README.md');
    this.addCheck('User Guide Available', fs.existsSync(userGuide), 1,
      fs.existsSync(userGuide) ? 'User guide is available' : 'No user guide found');

    const setupGuide = path.join('user-guide', 'setup', 'QUICK_SETUP_GUIDE.md');
    this.addCheck('Setup Guide Available', fs.existsSync(setupGuide), 1,
      fs.existsSync(setupGuide) ? 'Setup guide is available' : 'No setup guide found');

    const deploymentGuide = path.join('user-guide', 'deployment');
    this.addCheck('Deployment Guide Available', fs.existsSync(deploymentGuide), 1,
      fs.existsSync(deploymentGuide) ? 'Deployment guides are available' : 'No deployment guides found');
  }

  // Testing Checks
  async checkTesting() {
    this.log('🧪 Checking Testing Setup...');
    
    const testsDir = 'tests';
    this.addCheck('Test Directory Exists', fs.existsSync(testsDir), 1,
      fs.existsSync(testsDir) ? 'Tests directory exists' : 'No tests directory');

    if (fs.existsSync(testsDir)) {
      const testFiles = fs.readdirSync(testsDir).filter(f => f.endsWith('.js'));
      this.addCheck('Test Files Available', testFiles.length > 0, 2,
        `${testFiles.length} test files found`);
    }

    const comprehensiveTest = path.join('tests', 'comprehensive-test-suite.js');
    this.addCheck('Comprehensive Test Suite', fs.existsSync(comprehensiveTest), 2,
      fs.existsSync(comprehensiveTest) ? 'Comprehensive test suite available' : 'No comprehensive test suite');
  }

  // Deployment Checks
  async checkDeployment() {
    this.log('🚀 Checking Deployment Readiness...');
    
    // Check for production environment files
    const prodEnv = path.join('frontend', '.env.production');
    this.addCheck('Production Environment File', fs.existsSync(prodEnv), 2,
      fs.existsSync(prodEnv) ? 'Production environment configured' : 'No production environment file');

    // Check for build output
    const distDir = path.join('frontend', 'dist');
    this.addCheck('Frontend Build Output', fs.existsSync(distDir), 2,
      fs.existsSync(distDir) ? 'Frontend build output exists' : 'No frontend build output (run npm run build)');

    // Check for package-lock files (dependency locking)
    const backendLock = path.join('backend', 'package-lock.json');
    const frontendLock = path.join('frontend', 'package-lock.json');
    
    this.addCheck('Backend Dependencies Locked', fs.existsSync(backendLock), 1,
      fs.existsSync(backendLock) ? 'Backend dependencies are locked' : 'Backend dependencies not locked');
    
    this.addCheck('Frontend Dependencies Locked', fs.existsSync(frontendLock), 1,
      fs.existsSync(frontendLock) ? 'Frontend dependencies are locked' : 'Frontend dependencies not locked');
  }

  // API Health Check
  async checkAPIHealth() {
    this.log('🏥 Checking API Health...');
    
    try {
      const response = await axios.get('http://localhost:3000/health', { timeout: 5000 });
      const isHealthy = response.data.status === 'OK';
      
      this.addCheck('API Health Endpoint', isHealthy, 2,
        isHealthy ? 'API health endpoint is working' : 'API health endpoint not working');
        
      if (isHealthy) {
        const hasUptime = response.data.uptime !== undefined;
        this.addCheck('API Uptime Tracking', hasUptime, 1,
          hasUptime ? 'API tracks uptime' : 'API does not track uptime');
      }
    } catch (error) {
      this.addCheck('API Accessibility', false, 3, 
        'API is not accessible. Make sure backend is running.');
    }
  }

  // Generate Report
  generateReport() {
    console.log('\n' + '='.repeat(70));
    console.log('🎯 PRODUCTION READINESS REPORT');
    console.log('='.repeat(70));
    
    const percentage = ((this.score / this.maxScore) * 100).toFixed(1);
    
    console.log(`📊 Overall Score: ${this.score}/${this.maxScore} (${percentage}%)`);
    
    // Determine readiness level
    let readinessLevel, recommendation, emoji;
    if (percentage >= 90) {
      readinessLevel = 'EXCELLENT';
      recommendation = 'Ready for production deployment';
      emoji = '🚀';
    } else if (percentage >= 80) {
      readinessLevel = 'GOOD';
      recommendation = 'Minor improvements needed before production';
      emoji = '✅';
    } else if (percentage >= 70) {
      readinessLevel = 'FAIR';
      recommendation = 'Several issues need to be addressed';
      emoji = '⚠️';
    } else {
      readinessLevel = 'POOR';
      recommendation = 'Significant work needed before production';
      emoji = '❌';
    }
    
    console.log(`${emoji} Readiness Level: ${readinessLevel}`);
    console.log(`💡 Recommendation: ${recommendation}`);
    
    // Group checks by category
    const categories = {
      'Security': this.checks.filter(c => c.name.includes('JWT') || c.name.includes('Password') || c.name.includes('HTTPS') || c.name.includes('Security')),
      'Database': this.checks.filter(c => c.name.includes('Database') || c.name.includes('User Data')),
      'Performance': this.checks.filter(c => c.name.includes('Bundle') || c.name.includes('Build')),
      'Code Quality': this.checks.filter(c => c.name.includes('TypeScript') || c.name.includes('Error') || c.name.includes('Middleware')),
      'Documentation': this.checks.filter(c => c.name.includes('Guide') || c.name.includes('Documentation')),
      'Testing': this.checks.filter(c => c.name.includes('Test')),
      'Deployment': this.checks.filter(c => c.name.includes('Production') || c.name.includes('Build Output') || c.name.includes('Dependencies')),
      'API Health': this.checks.filter(c => c.name.includes('API') || c.name.includes('Health'))
    };
    
    console.log('\n📋 DETAILED RESULTS BY CATEGORY:');
    console.log('-'.repeat(70));
    
    Object.entries(categories).forEach(([category, checks]) => {
      if (checks.length > 0) {
        const categoryScore = checks.reduce((sum, c) => sum + (c.passed ? c.weight : 0), 0);
        const categoryMax = checks.reduce((sum, c) => sum + c.weight, 0);
        const categoryPercentage = ((categoryScore / categoryMax) * 100).toFixed(1);
        
        console.log(`\n${category} (${categoryScore}/${categoryMax} - ${categoryPercentage}%):`);
        checks.forEach(check => {
          const status = check.passed ? '✅' : '❌';
          console.log(`  ${status} ${check.name} ${check.details ? `- ${check.details}` : ''}`);
        });
      }
    });
    
    // Failed checks
    const failedChecks = this.checks.filter(c => !c.passed);
    if (failedChecks.length > 0) {
      console.log('\n❌ ISSUES TO ADDRESS:');
      console.log('-'.repeat(70));
      failedChecks.forEach((check, index) => {
        console.log(`${index + 1}. ${check.name}`);
        if (check.details) {
          console.log(`   ${check.details}`);
        }
        console.log(`   Priority: ${check.weight >= 3 ? 'HIGH' : check.weight >= 2 ? 'MEDIUM' : 'LOW'}`);
        console.log('');
      });
    }
    
    // Next steps
    console.log('🔗 NEXT STEPS:');
    console.log('-'.repeat(70));
    
    if (percentage >= 90) {
      console.log('1. ✅ Run final production tests');
      console.log('2. ✅ Deploy to staging environment');
      console.log('3. ✅ Perform user acceptance testing');
      console.log('4. ✅ Deploy to production');
    } else {
      console.log('1. 🔧 Address high priority issues');
      console.log('2. 🧪 Run comprehensive tests');
      console.log('3. 🔄 Re-run production readiness check');
      console.log('4. 📋 Update documentation if needed');
      console.log('5. 🚀 Proceed with deployment when ready');
    }
    
    console.log('\n📄 Save this report and track progress on issues.');
    console.log('='.repeat(70));
  }

  // Run all checks
  async runAllChecks() {
    console.log('🔍 SILAPOR Production Readiness Check');
    console.log('='.repeat(70));
    
    const startTime = Date.now();
    
    await this.checkSecurity();
    await this.checkDatabase();
    await this.checkPerformance();
    await this.checkCodeQuality();
    await this.checkDocumentation();
    await this.checkTesting();
    await this.checkDeployment();
    await this.checkAPIHealth();
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(`\n⏱️  Check completed in ${duration} seconds`);
    
    this.generateReport();
  }
}

// Run if called directly
if (require.main === module) {
  const checker = new ProductionReadinessCheck();
  checker.runAllChecks().catch(console.error);
}

module.exports = ProductionReadinessCheck;