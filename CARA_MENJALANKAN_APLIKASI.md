# Cara Menjalankan Aplikasi SiLapor Inspektorat

## Status Saat Ini ✅
- ✅ Database MySQL sudah di-setup dan migrasi berhasil
- ✅ Backend berjalan di port 3000
- ✅ Frontend berjalan di port 5173
- ✅ File .env sudah dikonfigurasi dengan benar

## Prasyarat
1. XAMPP MySQL harus berjalan
2. Node.js sudah terinstall
3. Database `evaluation_reporting` sudah dibuat dan di-migrate

## Cara Menjalankan

### 1. Pastikan MySQL Berjalan
- Buka XAMPP Control Panel
- Start Apache dan MySQL

### 2. Jalankan Backend
```bash
cd backend
npm run dev
```
Backend akan berjalan di: http://localhost:3000

### 3. Jalankan Frontend (Terminal Baru)
```bash
cd frontend
npm run dev
```
Frontend akan berjalan di: http://localhost:5173

## Login Default
Setelah migrasi dan seed berhasil, gunakan kredensial berikut:

**PENTING:** Jika login gagal, jalankan script berikut untuk update password:
```bash
cd backend
Get-Content update-passwords.sql | C:\xampp\mysql\bin\mysql.exe -u root
```

### Admin
- Username: `admin`
- Password: `password123`

### User OPD (7 user tersedia)
- Username: `user1` sampai `user7`
- Password: `password123`

Institusi yang tersedia:
- user1: Dinas Pendidikan
- user2: Dinas Kesehatan
- user3: Dinas Pekerjaan Umum
- user4: Dinas Sosial
- user5: Dinas Lingkungan Hidup
- user6: Dinas Perhubungan
- user7: Dinas Koperasi dan UKM

## Troubleshooting

### Error: Port 3000 sudah digunakan
```bash
# Windows - Cari proses yang menggunakan port 3000
netstat -ano | findstr :3000

# Stop proses tersebut
taskkill /PID <process_id> /F
```

### Error: Database connection failed
1. Pastikan MySQL di XAMPP sudah berjalan
2. Cek file `backend/.env`:
   - DB_HOST=localhost
   - DB_USER=root
   - DB_PASSWORD= (kosong untuk default XAMPP)
   - DB_NAME=evaluation_reporting

### Error: JWT_REFRESH_SECRET
File `.env` sudah dikonfigurasi dengan JWT secret yang valid. Jika masih error, pastikan file `.env` ada di folder `backend/`.

## Struktur Database
Database `evaluation_reporting` berisi tabel-tabel berikut:
- users (user dan admin)
- reports (laporan evaluasi)
- follow_ups (tindak lanjut)
- followup_items (item tindak lanjut)
- followup_item_recommendations (rekomendasi)
- evidence_files (file bukti)
- matrix_reports (laporan matrix)
- matrix_items (item matrix)
- matrix_assignments (penugasan matrix)
- Dan tabel-tabel pendukung lainnya

## API Endpoints
Backend menyediakan endpoint berikut:
- `/health` - Health check
- `/api/auth/*` - Authentication
- `/api/reports/*` - Laporan
- `/api/follow-ups/*` - Tindak lanjut
- `/api/dashboard/*` - Dashboard
- `/api/matrix/*` - Matrix audit
- `/api/evidence/*` - Evidence files
- Dan endpoint lainnya

## Build untuk Production

### Backend
```bash
cd backend
npm run build
npm start
```

### Frontend
```bash
cd frontend
npm run build
```
File hasil build akan ada di `frontend/dist/`

## Catatan Penting
1. Jangan commit file `.env` ke git (sudah ada di .gitignore)
2. Ganti JWT_SECRET dan JWT_REFRESH_SECRET untuk production
3. Untuk production, gunakan password MySQL yang kuat
4. Update CORS_ORIGIN di `.env` sesuai domain production

## Kontak Support
Jika ada masalah, hubungi tim development.
