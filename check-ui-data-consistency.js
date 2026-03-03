/**
 * UI-Data Consistency Checker
 * Checks for common inconsistencies between frontend and backend
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Checking UI-Data Consistency...\n');

const issues = [];

// Issue 1: Check MatrixAnalyticsComponent for null safety
console.log('1️⃣  Checking MatrixAnalyticsComponent...');
const matrixAnalyticsPath = 'frontend/src/components/MatrixAnalyticsComponent.tsx';
const matrixAnalyticsContent = fs.readFileSync(matrixAnalyticsPath, 'utf8');

if (matrixAnalyticsContent.includes('opd.avg_response_time.toFixed') && 
    !matrixAnalyticsContent.includes('opd.avg_response_time != null')) {
  issues.push({
    severity: 'HIGH',
    file: matrixAnalyticsPath,
    issue: 'avg_response_time accessed without null check',
    fix: 'Add null check: opd.avg_response_time != null && opd.avg_response_time > 0'
  });
  console.log('   ❌ Found null pointer risk');
} else {
  console.log('   ✅ Null safety OK');
}

// Issue 2: Check for consistent status enums
console.log('\n2️⃣  Checking status enum consistency...');
const statusFiles = [
  'frontend/src/pages/MatrixReviewPage.tsx',
  'frontend/src/pages/DashboardPage.tsx',
  'frontend/src/components/OPDStatisticsComponent.tsx'
];

const statusValues = new Set();
statusFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    const matches = content.match(/status\s*===?\s*['"](\w+)['"]/g);
    if (matches) {
      matches.forEach(match => {
        const status = match.match(/['"](\w+)['"]/)[1];
        statusValues.add(status);
      });
    }
  }
});

console.log('   Found status values:', Array.from(statusValues).join(', '));
if (statusValues.size > 6) {
  issues.push({
    severity: 'MEDIUM',
    file: 'Multiple files',
    issue: 'Too many different status values used',
    fix: 'Standardize to: pending, in_progress, submitted, approved, rejected, completed'
  });
  console.log('   ⚠️  Too many status values');
} else {
  console.log('   ✅ Status values reasonable');
}

// Issue 3: Check for field name consistency
console.log('\n3️⃣  Checking field name consistency...');
const backendRoute = 'backend/src/routes/matrix-audit.routes.ts';
const frontendComponent = 'frontend/src/components/MatrixAnalyticsComponent.tsx';

if (fs.existsSync(backendRoute) && fs.existsSync(frontendComponent)) {
  const backendContent = fs.readFileSync(backendRoute, 'utf8');
  const frontendContent = fs.readFileSync(frontendComponent, 'utf8');
  
  // Check if backend returns opd_name and frontend uses it
  const backendHasOpdName = backendContent.includes('opd_name');
  const frontendUsesOpdName = frontendContent.includes('opd.opd_name') || frontendContent.includes('opd_name');
  
  if (backendHasOpdName && frontendUsesOpdName) {
    console.log('   ✅ Field names match (opd_name)');
  } else if (backendHasOpdName && !frontendUsesOpdName) {
    issues.push({
      severity: 'HIGH',
      file: frontendComponent,
      issue: 'Backend returns opd_name but frontend doesn\'t use it',
      fix: 'Update frontend to use opd.opd_name'
    });
    console.log('   ❌ Field name mismatch');
  }
}

// Issue 4: Check for calculation consistency
console.log('\n4️⃣  Checking calculation consistency...');
const opdStatsPath = 'frontend/src/components/OPDStatisticsComponent.tsx';
if (fs.existsSync(opdStatsPath)) {
  const content = fs.readFileSync(opdStatsPath, 'utf8');
  
  // Check if completion rate is calculated consistently
  const hasMatrixCompletion = content.includes('matrixStatistics.completedItems / matrixStatistics.totalItems');
  const hasRecommendationCompletion = content.includes('approvedRecommendations / totalRecommendations');
  
  if (hasMatrixCompletion && hasRecommendationCompletion) {
    console.log('   ⚠️  Multiple completion rate calculations found');
    issues.push({
      severity: 'MEDIUM',
      file: opdStatsPath,
      issue: 'Multiple different completion rate calculations',
      fix: 'Use consistent calculation method across all components'
    });
  } else {
    console.log('   ✅ Calculation consistency OK');
  }
}

// Issue 5: Check for missing fallback values
console.log('\n5️⃣  Checking for fallback values...');
const componentsToCheck = [
  'frontend/src/components/MatrixProgressDashboardComponent.tsx',
  'frontend/src/components/PerformanceDashboardComponent.tsx'
];

componentsToCheck.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    
    // Check for direct property access without optional chaining or fallback
    const riskyPatterns = [
      /\w+\.\w+\.\w+(?!\?)/g,  // nested property access without ?
      /\w+\['\w+'\](?!\s*\|\|)/g  // bracket notation without fallback
    ];
    
    let hasRiskyAccess = false;
    riskyPatterns.forEach(pattern => {
      if (pattern.test(content)) {
        hasRiskyAccess = true;
      }
    });
    
    if (hasRiskyAccess) {
      console.log(`   ⚠️  ${path.basename(file)} may have unsafe property access`);
      issues.push({
        severity: 'LOW',
        file: file,
        issue: 'Potential unsafe property access',
        fix: 'Add optional chaining (?.) or fallback values (|| default)'
      });
    }
  }
});

// Issue 6: Check for TypeScript type mismatches
console.log('\n6️⃣  Checking TypeScript interfaces...');
const interfaceFiles = [
  'frontend/src/components/MatrixAnalyticsComponent.tsx',
  'frontend/src/components/OPDStatisticsComponent.tsx'
];

interfaceFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    
    // Check if interfaces have optional properties
    const hasOptionalProps = content.match(/\w+\?:/g);
    
    if (!hasOptionalProps || hasOptionalProps.length < 2) {
      console.log(`   ⚠️  ${path.basename(file)} interfaces may need optional properties`);
      issues.push({
        severity: 'LOW',
        file: file,
        issue: 'Interfaces may need optional properties for safety',
        fix: 'Add ? to properties that may be undefined'
      });
    }
  }
});

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 SUMMARY');
console.log('='.repeat(60));

if (issues.length === 0) {
  console.log('✅ No critical issues found!');
} else {
  console.log(`Found ${issues.length} potential issues:\n`);
  
  const highIssues = issues.filter(i => i.severity === 'HIGH');
  const mediumIssues = issues.filter(i => i.severity === 'MEDIUM');
  const lowIssues = issues.filter(i => i.severity === 'LOW');
  
  if (highIssues.length > 0) {
    console.log(`🔴 HIGH PRIORITY (${highIssues.length}):`);
    highIssues.forEach((issue, index) => {
      console.log(`   ${index + 1}. ${issue.file}`);
      console.log(`      Issue: ${issue.issue}`);
      console.log(`      Fix: ${issue.fix}\n`);
    });
  }
  
  if (mediumIssues.length > 0) {
    console.log(`🟡 MEDIUM PRIORITY (${mediumIssues.length}):`);
    mediumIssues.forEach((issue, index) => {
      console.log(`   ${index + 1}. ${issue.file}`);
      console.log(`      Issue: ${issue.issue}`);
      console.log(`      Fix: ${issue.fix}\n`);
    });
  }
  
  if (lowIssues.length > 0) {
    console.log(`🟢 LOW PRIORITY (${lowIssues.length}):`);
    lowIssues.forEach((issue, index) => {
      console.log(`   ${index + 1}. ${issue.file}`);
      console.log(`      Issue: ${issue.issue}`);
      console.log(`      Fix: ${issue.fix}\n`);
    });
  }
}

console.log('='.repeat(60));
console.log('\n✅ Consistency check complete!');
console.log('\n💡 Recommendation: Run this check before each deployment\n');

// Exit with error code if high priority issues found
process.exit(issues.filter(i => i.severity === 'HIGH').length > 0 ? 1 : 0);
