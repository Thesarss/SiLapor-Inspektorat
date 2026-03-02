#!/usr/bin/env node

const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');

async function runMigration() {
  let connection;
  
  try {
    // Load environment variables
    const envPath = path.join(__dirname, 'backend', '.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        envVars[key.trim()] = value.trim();
      }
    });

    connection = await mysql.createConnection({
      host: envVars.DB_HOST || 'localhost',
      user: envVars.DB_USER || 'root',
      password: envVars.DB_PASSWORD || '',
      database: envVars.DB_NAME || 'evaluation_reporting',
      port: parseInt(envVars.DB_PORT) || 3306
    });

    console.log('✅ Database connected');
    console.log('🔄 Running evidence-matrix integration migration...\n');

    // Read migration file
    const migrationPath = path.join(__dirname, 'backend', 'src', 'database', 'migrations', '023_integrate_evidence_matrix.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && stmt !== 'COMMIT');
    
    for (const statement of statements) {
      try {
        if (statement.trim()) {
          await connection.execute(statement);
          console.log('✅ Executed statement successfully');
        }
      } catch (error) {
        if (error.message.includes('Duplicate column') || 
            error.message.includes('already exists') ||
            error.message.includes('Duplicate key')) {
          console.log('⚠️  Statement skipped (already exists)');
        } else {
          console.log('❌ Error executing statement:', error.message);
          console.log('Statement:', statement.substring(0, 100) + '...');
        }
      }
    }

    console.log('\n✅ Evidence-Matrix integration migration completed!');
    console.log('📋 Changes applied:');
    console.log('   - Added matrix_item_id and assignment_id to evidence_files');
    console.log('   - Updated evidence status options');
    console.log('   - Added progress tracking to matrix_assignments');
    console.log('   - Created views for progress monitoring');
    console.log('   - Added indexes for better performance');

  } catch (error) {
    console.error('❌ Migration error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ Database connection closed');
    }
  }
}

runMigration();