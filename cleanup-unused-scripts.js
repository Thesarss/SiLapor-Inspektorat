#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Cleanup unused script and bat files
 * This script removes development/debugging files that are no longer needed
 */

const filesToRemove = [
  // Unused debugging scripts
  'backend/scripts/check-evidence-data.js',
  'backend/scripts/check-evidence-structure.js', 
  'backend/scripts/check-pending-reviews.js',
  'backend/scripts/create-sample-evidence.js',
  'backend/scripts/run-evidence-fix.js'
];

function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',    // Cyan
    success: '\x1b[32m', // Green
    warning: '\x1b[33m', // Yellow
    error: '\x1b[31m',   // Red
    reset: '\x1b[0m'     // Reset
  };
  
  const prefix = {
    info: '📋',
    success: '✅',
    warning: '⚠️',
    error: '❌'
  }[type];
  
  console.log(`${colors[type]}${prefix} ${message}${colors.reset}`);
}

function cleanupFiles() {
  log('🧹 Starting cleanup of unused script files');
  log('=' .repeat(50));
  
  let removedCount = 0;
  let skippedCount = 0;
  
  for (const filePath of filesToRemove) {
    const fullPath = path.resolve(filePath);
    
    if (fs.existsSync(fullPath)) {
      try {
        fs.unlinkSync(fullPath);
        log(`Removed: ${filePath}`, 'success');
        removedCount++;
      } catch (error) {
        log(`Failed to remove: ${filePath} - ${error.message}`, 'error');
      }
    } else {
      log(`Not found: ${filePath}`, 'warning');
      skippedCount++;
    }
  }
  
  log('=' .repeat(50));
  log(`Cleanup completed: ${removedCount} files removed, ${skippedCount} files not found`);
  
  if (removedCount > 0) {
    log('🎉 Unused script files have been cleaned up!', 'success');
    log('📋 Remaining useful files:', 'info');
    log('   - backend/scripts/check-database-integrity.js (used by tests)', 'info');
    log('   - backend/scripts/fix-evidence-safe.js (evidence system)', 'info');
    log('   - backend/scripts/create-manual-evidence.js (evidence setup)', 'info');
    log('   - backend/run-*.bat files (database migrations)', 'info');
  }
}

// Run cleanup
cleanupFiles();