const fs = require('fs');
const path = require('path');

// Create uploads directories
const directories = [
  path.join(__dirname, 'uploads'),
  path.join(__dirname, 'uploads/profile-photos'),
  path.join(__dirname, 'uploads/reports'),
  path.join(__dirname, 'uploads/evidence'),
  path.join(__dirname, 'uploads/matrix-evidence'),
];

console.log('📁 Creating upload directories...\n');

directories.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log('✅ Created:', dir);
  } else {
    console.log('✓  Exists:', dir);
  }
});

console.log('\n🎉 Upload directories ready!');
