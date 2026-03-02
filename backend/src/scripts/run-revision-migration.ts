import { query } from '../config/database';

async function runMigration() {
  console.log('Running revision migrations...\n');

  try {
    // Migration 1: Create revision_items table
    console.log('Creating revision_items table...');
    await query(`
      CREATE TABLE IF NOT EXISTS revision_items (
        id VARCHAR(36) PRIMARY KEY,
        report_id VARCHAR(36) NOT NULL,
        item_number INT NOT NULL,
        description TEXT NOT NULL,
        status ENUM('pending', 'completed', 'approved') NOT NULL DEFAULT 'pending',
        user_response TEXT NULL,
        admin_notes TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ revision_items table created\n');

    // Migration 2: Create revision_files table
    console.log('Creating revision_files table...');
    await query(`
      CREATE TABLE IF NOT EXISTS revision_files (
        id VARCHAR(36) PRIMARY KEY,
        revision_item_id VARCHAR(36) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        stored_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_size INT NOT NULL,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (revision_item_id) REFERENCES revision_items(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ revision_files table created\n');

    // Migration 3: Create indexes
    console.log('Creating indexes...');
    try {
      await query('CREATE INDEX idx_revision_items_report_id ON revision_items(report_id)');
    } catch (e: any) {
      if (!e.message.includes('Duplicate')) console.log('Index already exists or error:', e.message);
    }
    try {
      await query('CREATE INDEX idx_revision_items_status ON revision_items(status)');
    } catch (e: any) {
      if (!e.message.includes('Duplicate')) console.log('Index already exists or error:', e.message);
    }
    try {
      await query('CREATE INDEX idx_revision_files_revision_item_id ON revision_files(revision_item_id)');
    } catch (e: any) {
      if (!e.message.includes('Duplicate')) console.log('Index already exists or error:', e.message);
    }
    console.log('✅ Indexes created\n');

    // Migration 4: Add needs_revision status
    console.log('Adding needs_revision status to reports...');
    try {
      await query(`
        ALTER TABLE reports 
        MODIFY COLUMN status ENUM('pending', 'in_progress', 'approved', 'rejected', 'needs_revision') NOT NULL DEFAULT 'pending'
      `);
      console.log('✅ needs_revision status added\n');
    } catch (e: any) {
      console.log('Status enum might already include needs_revision:', e.message);
    }

    console.log('🎉 All migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
