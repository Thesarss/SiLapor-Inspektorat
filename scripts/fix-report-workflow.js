const mysql = require('mysql2/promise');

async function fixReportWorkflow() {
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            port: 3306,
            database: 'evaluation_reporting'
        });
        
        console.log('🔧 Fixing report workflow...');
        
        // Get user IDs
        const [users] = await connection.execute('SELECT id, username, role FROM users WHERE role IN ("inspektorat", "opd")');
        
        const inspektorat1 = users.find(u => u.username === 'inspektorat1');
        const user1 = users.find(u => u.username === 'user1');
        const user2 = users.find(u => u.username === 'user2');
        const user3 = users.find(u => u.username === 'user3');
        const user4 = users.find(u => u.username === 'user4');
        
        if (!inspektorat1) {
            console.error('❌ Inspektorat1 user not found');
            return;
        }
        
        console.log('📋 Updating report workflow:');
        console.log('   - Reports created by OPD users');
        console.log('   - Reports assigned to Inspektorat for review');
        
        // Update existing reports with correct workflow
        const reportUpdates = [
            {
                title: 'Laporan Evaluasi Q1 2024',
                created_by: user1?.id,
                assigned_to: inspektorat1.id,
                status: 'pending'
            },
            {
                title: 'Audit Internal Kesehatan', 
                created_by: user2?.id,
                assigned_to: inspektorat1.id,
                status: 'pending'
            },
            {
                title: 'Evaluasi Infrastruktur 2023',
                created_by: user3?.id,
                assigned_to: inspektorat1.id,
                status: 'needs_revision'
            },
            {
                title: 'Audit Program Sosial',
                created_by: user4?.id,
                assigned_to: inspektorat1.id,
                status: 'pending'
            },
            {
                title: 'Evaluasi Lingkungan 2023',
                created_by: user1?.id,
                assigned_to: inspektorat1.id,
                status: 'approved'
            }
        ];
        
        for (const update of reportUpdates) {
            if (update.created_by) {
                await connection.execute(
                    'UPDATE reports SET created_by = ?, assigned_to = ?, status = ? WHERE title = ?',
                    [update.created_by, update.assigned_to, update.status, update.title]
                );
                console.log(`✅ Updated: ${update.title}`);
            }
        }
        
        // Verify the updates
        console.log('\n🔍 Verifying updated reports:');
        const [updatedReports] = await connection.execute(`
            SELECT r.title, r.status, 
                   u1.username as creator, u1.role as creator_role,
                   u2.username as assignee, u2.role as assignee_role
            FROM reports r
            LEFT JOIN users u1 ON r.created_by = u1.id
            LEFT JOIN users u2 ON r.assigned_to = u2.id
            ORDER BY r.created_at DESC
        `);
        
        updatedReports.forEach((report, index) => {
            console.log(`${index + 1}. ${report.title}`);
            console.log(`   Status: ${report.status}`);
            console.log(`   Created by: ${report.creator} (${report.creator_role})`);
            console.log(`   Assigned to: ${report.assignee} (${report.assignee_role})`);
            console.log('');
        });
        
        await connection.end();
        
        console.log('🎉 Report workflow fixed!');
        console.log('');
        console.log('📋 Workflow Summary:');
        console.log('   - OPD users create reports');
        console.log('   - Reports are assigned to Inspektorat for review');
        console.log('   - Inspektorat can approve/reject/request revision');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

fixReportWorkflow();