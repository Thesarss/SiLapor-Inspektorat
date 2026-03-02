const fs = require('fs');

function fixMatrixUrls() {
  console.log('🔧 Fixing Matrix URLs in frontend files...\n');
  
  const filesToFix = [
    'frontend/src/pages/MatrixPage.tsx',
    'frontend/src/pages/MatrixWorkPage.tsx'
  ];
  
  for (const filePath of filesToFix) {
    if (fs.existsSync(filePath)) {
      console.log(`Processing: ${filePath}`);
      
      let content = fs.readFileSync(filePath, 'utf8');
      let changes = 0;
      
      // Replace all instances of /api/matrix with /matrix
      const originalContent = content;
      content = content.replace(/\/api\/matrix/g, '/matrix');
      
      // Count changes
      const matches = originalContent.match(/\/api\/matrix/g);
      if (matches) {
        changes = matches.length;
      }
      
      if (changes > 0) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`  ✅ Fixed ${changes} instances of /api/matrix → /matrix`);
      } else {
        console.log(`  ✅ No changes needed (already correct)`);
      }
    } else {
      console.log(`  ❌ File not found: ${filePath}`);
    }
  }
  
  console.log('\n🎉 URL fixing completed!');
  console.log('\n📋 Next steps:');
  console.log('1. Restart frontend server: cd frontend && npm run dev');
  console.log('2. Hard refresh browser (Ctrl+Shift+R)');
  console.log('3. Test Matrix page');
}

fixMatrixUrls();