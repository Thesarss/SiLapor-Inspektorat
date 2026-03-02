const fs = require('fs');
const path = require('path');

class FileCleanup {
  constructor() {
    this.filesToDelete = [];
    this.filesToMove = [];
    this.summary = {
      deleted: 0,
      moved: 0,
      kept: 0
    };
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

  // Identify files to clean up
  identifyUnusedFiles() {
    this.log('🔍 Identifying unused files...');
    
    // Files that are clearly temporary or debug files
    const debugFiles = [
      'SIMPLE_DEBUG.js',
      'COMPREHENSIVE_DEBUG.js',
      'DEEP_DIAGNOSIS.md',
      'BROWSER_CONSOLE_TEST.md',
      'FRONTEND_TEST_GUIDE.md',
      'SOLUTION_FOUND.md',
      'FINAL_TEST.md',
      'BROWSER_CACHE_FIX.md',
      'FRONTEND_BLANK_PAGE_FIX.md',
      'DATABASE_FIX_RESULT.md',
      'MATRIX_FIX_RESULT.md',
      'MATRIX_ENDPOINT_FIX_SUMMARY.md',
      'PERBAIKAN_ENDPOINT_SUMMARY.md',
      'FINAL_FIX_SUMMARY.md',
      'TASK_COMPLETION_SUMMARY.md',
      'CLEANUP_DEPLOYMENT_FILES.md',
      'MATRIX_SYSTEM_SETUP.md',
      'MATRIX_AUDIT_TROUBLESHOOTING.md',
      'QUICK_FIX_GUIDE.md',
      'FINAL_MATRIX_FIX_SOLUTION.md',
      'MULTI_USER_ACCESS_STRATEGY.md'
    ];

    // Test files that should be moved to tests folder
    const testFiles = [
      'test-recommendation-slidedown.js',
      'test-matrix-upload.js',
      'test-matrix-assignments.js',
      'backend/test-all-users.js',
      'backend/test-login-only.js',
      'backend/test-matrix-direct.js',
      'backend/test-backend-only.js',
      'backend/test-evidence-system.js',
      'backend/test-matrix-endpoints.js'
    ];

    // Utility scripts that should be moved to scripts folder
    const utilityFiles = [
      'fix-matrix-urls.js',
      'update-env-for-ngrok.js',
      'fix-report-workflow.js',
      'backend/check-users.js',
      'backend/verify-matrix-fix.js',
      'backend/check-reports-structure.js',
      'backend/create-report-files-table.js',
      'backend/restore-missing-tables.js',
      'backend/check-database-integrity.js',
      'backend/check-matrix-tables.js',
      'backend/fix-matrix-system.js'
    ];

    // Add files to deletion list
    debugFiles.forEach(file => {
      if (fs.existsSync(file)) {
        this.filesToDelete.push(file);
      }
    });

    // Add files to move list
    testFiles.forEach(file => {
      if (fs.existsSync(file)) {
        const filename = path.basename(file);
        this.filesToMove.push({
          source: file,
          destination: `tests/${filename}`,
          type: 'test'
        });
      }
    });

    utilityFiles.forEach(file => {
      if (fs.existsSync(file)) {
        const filename = path.basename(file);
        this.filesToMove.push({
          source: file,
          destination: `scripts/${filename}`,
          type: 'utility'
        });
      }
    });
  }

  // Create necessary directories
  createDirectories() {
    const dirs = ['tests', 'scripts', 'user-guide/troubleshooting'];
    
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        this.log(`Created directory: ${dir}`);
      }
    });
  }

  // Move files to appropriate folders
  moveFiles() {
    this.log('📁 Moving files to appropriate folders...');
    
    this.filesToMove.forEach(({ source, destination, type }) => {
      try {
        if (fs.existsSync(source)) {
          // Ensure destination directory exists
          const destDir = path.dirname(destination);
          if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
          }

          // Move file
          fs.renameSync(source, destination);
          this.log(`Moved ${type} file: ${source} → ${destination}`, 'success');
          this.summary.moved++;
        }
      } catch (error) {
        this.log(`Failed to move ${source}: ${error.message}`, 'error');
      }
    });
  }

  // Delete unused files
  deleteFiles() {
    this.log('🗑️ Deleting unused files...');
    
    this.filesToDelete.forEach(file => {
      try {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
          this.log(`Deleted: ${file}`, 'success');
          this.summary.deleted++;
        }
      } catch (error) {
        this.log(`Failed to delete ${file}: ${error.message}`, 'error');
      }
    });
  }

  // Clean up empty directories
  cleanupEmptyDirectories() {
    this.log('📂 Cleaning up empty directories...');
    
    const checkAndRemoveEmpty = (dir) => {
      try {
        if (fs.existsSync(dir)) {
          const files = fs.readdirSync(dir);
          if (files.length === 0) {
            fs.rmdirSync(dir);
            this.log(`Removed empty directory: ${dir}`, 'success');
          }
        }
      } catch (error) {
        // Directory not empty or other error, ignore
      }
    };

    // Check some common directories that might become empty
    ['temp', 'tmp', 'debug'].forEach(checkAndRemoveEmpty);
  }

  // Move remaining documentation files
  organizeDocumentation() {
    this.log('📚 Organizing remaining documentation...');
    
    // Move troubleshooting files to user-guide
    const troubleshootingFiles = [
      { source: 'README.md', dest: 'user-guide/README.md' }
    ];

    troubleshootingFiles.forEach(({ source, dest }) => {
      if (fs.existsSync(source) && !fs.existsSync(dest)) {
        try {
          const destDir = path.dirname(dest);
          if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
          }
          
          // Copy instead of move for README
          fs.copyFileSync(source, dest);
          this.log(`Copied documentation: ${source} → ${dest}`, 'success');
        } catch (error) {
          this.log(`Failed to copy ${source}: ${error.message}`, 'error');
        }
      }
    });
  }

  // Generate cleanup report
  generateReport() {
    this.log('\n📊 CLEANUP SUMMARY', 'success');
    console.log('=' .repeat(50));
    console.log(`🗑️  Files deleted: ${this.summary.deleted}`);
    console.log(`📁 Files moved: ${this.summary.moved}`);
    console.log(`📋 Files kept: ${this.summary.kept}`);
    
    console.log('\n📁 NEW STRUCTURE:');
    console.log('├── tests/           # All test files');
    console.log('├── scripts/         # Utility scripts');
    console.log('├── user-guide/      # Documentation');
    console.log('│   ├── setup/       # Setup guides');
    console.log('│   ├── features/    # Feature guides');
    console.log('│   ├── deployment/  # Deployment guides');
    console.log('│   └── troubleshooting/ # Troubleshooting');
    console.log('├── frontend/        # Frontend code');
    console.log('└── backend/         # Backend code');
    
    console.log('\n✅ Cleanup completed successfully!');
  }

  // Run complete cleanup
  async runCleanup() {
    console.log('🧹 Starting File Cleanup Process');
    console.log('=' .repeat(50));
    
    try {
      this.createDirectories();
      this.identifyUnusedFiles();
      this.moveFiles();
      this.deleteFiles();
      this.cleanupEmptyDirectories();
      this.organizeDocumentation();
      this.generateReport();
    } catch (error) {
      this.log(`Cleanup error: ${error.message}`, 'error');
    }
  }
}

// Run cleanup if called directly
if (require.main === module) {
  const cleanup = new FileCleanup();
  cleanup.runCleanup().catch(console.error);
}

module.exports = FileCleanup;