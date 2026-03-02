import { Router } from 'express';
import { query } from '../config/database';
import { authMiddleware as authenticateToken, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

// Seed sample data for testing
router.post('/seed-data', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Check if data already exists
    const existingReports = await query('SELECT COUNT(*) as count FROM reports');
    const reportCount = existingReports.rows[0].count;

    if (reportCount > 0) {
      return res.json({
        success: true,
        message: 'Data sudah ada di database',
        reportCount
      });
    }

    // Insert sample reports
    const sampleReports = [
      {
        id: 'r1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        title: 'Laporan Evaluasi Q1 2024',
        description: 'Ditemukan ketidaksesuaian pada laporan keuangan Q1',
        created_by: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        assigned_to: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
        status: 'pending',
        created_at: '2024-03-15 10:00:00'
      },
      {
        id: 'r2eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
        title: 'Audit Internal Kesehatan',
        description: 'Perlu tindak lanjut hasil audit internal',
        created_by: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        assigned_to: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
        status: 'approved',
        created_at: '2024-06-20 14:30:00'
      },
      {
        id: 'r3eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
        title: 'Evaluasi Infrastruktur 2023',
        description: 'Laporan evaluasi infrastruktur tahun 2023',
        created_by: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        assigned_to: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
        status: 'rejected',
        created_at: '2023-12-10 09:15:00'
      },
      {
        id: 'r4eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
        title: 'Audit Program Sosial',
        description: 'Audit program bantuan sosial',
        created_by: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        assigned_to: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55',
        status: 'pending',
        created_at: '2024-01-25 11:45:00'
      },
      {
        id: 'r5eebc99-9c0b-4ef8-bb6d-6bb9bd380a55',
        title: 'Evaluasi Lingkungan 2023',
        description: 'Evaluasi program lingkungan hidup',
        created_by: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        assigned_to: 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a66',
        status: 'approved',
        created_at: '2023-08-30 16:20:00'
      }
    ];

    // Insert reports
    for (const report of sampleReports) {
      await query(
        'INSERT INTO reports (id, title, description, created_by, assigned_to, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE title = title',
        [report.id, report.title, report.description, report.created_by, report.assigned_to, report.status, report.created_at]
      );
    }

    res.json({
      success: true,
      message: 'Sample data berhasil ditambahkan',
      reportsAdded: sampleReports.length
    });

  } catch (error) {
    console.error('Error seeding data:', error);
    res.status(500).json({
      success: false,
      error: 'Gagal menambahkan sample data'
    });
  }
});

// Get database status
router.get('/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [users, reports] = await Promise.all([
      query('SELECT COUNT(*) as count FROM users'),
      query('SELECT COUNT(*) as count FROM reports')
    ]);

    res.json({
      success: true,
      data: {
        users: users.rows[0].count,
        reports: reports.rows[0].count
      }
    });
  } catch (error) {
    console.error('Error getting status:', error);
    res.status(500).json({
      success: false,
      error: 'Gagal mengambil status database'
    });
  }
});

export { router as seedRouter };
export default router;