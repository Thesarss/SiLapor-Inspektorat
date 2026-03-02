-- Seed data for testing (MySQL)
-- Password for all users: password123
-- Hash generated with bcrypt (10 rounds)

USE evaluation_reporting;

-- Seed data for testing (MySQL)
-- Password for all users: password123
-- Hash generated with bcrypt (10 rounds)

USE evaluation_reporting;

INSERT INTO users (id, username, email, password_hash, name, role, institution) VALUES
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'admin', 'admin@example.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Admin User', 'admin', NULL),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'user1', 'user1@example.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'User One', 'user', 'Dinas Pendidikan'),
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'user2', 'user2@example.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'User Two', 'user', 'Dinas Kesehatan'),
    ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'user3', 'user3@example.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'User Three', 'user', 'Dinas Pekerjaan Umum'),
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'user4', 'user4@example.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'User Four', 'user', 'Dinas Sosial'),
    ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a66', 'user5', 'user5@example.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'User Five', 'user', 'Dinas Lingkungan Hidup'),
    ('g0eebc99-9c0b-4ef8-bb6d-6bb9bd380a77', 'user6', 'user6@example.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'User Six', 'user', 'Dinas Perhubungan'),
    ('h0eebc99-9c0b-4ef8-bb6d-6bb9bd380a88', 'user7', 'user7@example.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'User Seven', 'user', 'Dinas Koperasi dan UKM')
ON DUPLICATE KEY UPDATE 
    username = VALUES(username),
    institution = VALUES(institution);

-- Sample reports with different years and institutions
INSERT INTO reports (id, title, description, created_by, assigned_to, status, created_at) VALUES
    ('r1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Laporan Evaluasi Q1 2024', 'Ditemukan ketidaksesuaian pada laporan keuangan Q1', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'pending', '2024-03-15 10:00:00'),
    ('r2eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Audit Internal Kesehatan', 'Perlu tindak lanjut hasil audit internal', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'approved', '2024-06-20 14:30:00'),
    ('r3eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'Evaluasi Infrastruktur 2023', 'Laporan evaluasi infrastruktur tahun 2023', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'rejected', '2023-12-10 09:15:00'),
    ('r4eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'Audit Program Sosial', 'Audit program bantuan sosial', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'pending', '2024-01-25 11:45:00'),
    ('r5eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'Evaluasi Lingkungan 2023', 'Evaluasi program lingkungan hidup', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a66', 'approved', '2023-08-30 16:20:00'),
    ('r6eebc99-9c0b-4ef8-bb6d-6bb9bd380a66', 'Audit Transportasi', 'Audit sistem transportasi publik', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'g0eebc99-9c0b-4ef8-bb6d-6bb9bd380a77', 'needs_revision', '2024-09-12 13:10:00'),
    ('r7eebc99-9c0b-4ef8-bb6d-6bb9bd380a77', 'Evaluasi UKM 2022', 'Evaluasi program pemberdayaan UKM', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'h0eebc99-9c0b-4ef8-bb6d-6bb9bd380a88', 'approved', '2022-11-18 08:30:00'),
    ('r8eebc99-9c0b-4ef8-bb6d-6bb9bd380a88', 'Laporan Pendidikan Q2 2024', 'Evaluasi program pendidikan Q2', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'pending', '2024-07-05 15:45:00')
ON DUPLICATE KEY UPDATE title = title;