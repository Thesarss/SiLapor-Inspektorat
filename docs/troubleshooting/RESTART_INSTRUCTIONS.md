# 🔄 Instruksi Restart Servers

## ✅ Perbaikan Selesai - Siap Restart

Semua perbaikan untuk bug progress 111% sudah selesai:
- ✅ Backend code fixed dan compiled
- ✅ Frontend code fixed
- ✅ Database cleaned dan synced
- ✅ Progress reset ke 0%

## 🚀 Cara Restart

### Opsi 1: Menggunakan Script (RECOMMENDED)

Jalankan file batch yang sudah disediakan:

```bash
restart-all-servers.bat
```

Script ini akan:
1. Kill semua proses Node.js yang berjalan
2. Start backend server (port 3000)
3. Start frontend server (port 5173)

### Opsi 2: Manual Restart

Jika script tidak bekerja, restart manual:

#### Step 1: Stop Semua Servers
- Tekan **Ctrl+C** di terminal backend
- Tekan **Ctrl+C** di terminal frontend
- Atau tutup semua terminal

#### Step 2: Start Backend
Buka terminal baru:
```bash
cd backend
npm start
```

Tunggu sampai muncul:
```
✅ Server running on port 3000
✅ Database connected
```

#### Step 3: Start Frontend
Buka terminal baru (jangan tutup terminal backend):
```bash
cd frontend
npm run dev
```

Tunggu sampai muncul:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

## 🌐 Akses Aplikasi

Setelah kedua server berjalan:

1. **Buka browser** (Chrome/Edge/Firefox)
2. **Akses**: http://localhost:5173
3. **Clear cache**: Tekan **Ctrl + Shift + R**
4. **Login** dengan kredensial OPD Dinas Pendidikan

## 🧪 Verifikasi

### 1. Check Backend
Buka: http://localhost:3000/api/health

Seharusnya muncul:
```json
{
  "status": "ok",
  "timestamp": "..."
}
```

### 2. Check Frontend
Buka: http://localhost:5173

Seharusnya muncul halaman login.

### 3. Check Dashboard Progress
1. Login sebagai user OPD Dinas Pendidikan
2. Buka Dashboard
3. Progress seharusnya menunjukkan **0%**
4. Status: **Belum Dikerjakan**

## ❌ Troubleshooting

### Problem: Port Already in Use

**Backend (Port 3000):**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Atau gunakan port lain
set PORT=3001
npm start
```

**Frontend (Port 5173):**
```bash
# Vite akan otomatis mencari port lain
# Atau edit vite.config.ts untuk set port manual
```

### Problem: Database Connection Error

Check file `.env` di folder backend:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=evaluation_reporting
DB_PORT=3306
```

Pastikan MySQL/MariaDB sudah running:
```bash
# Check MySQL service
net start | findstr MySQL
```

### Problem: Module Not Found

Install dependencies lagi:
```bash
# Backend
cd backend
npm install

# Frontend
cd frontend
npm install
```

### Problem: TypeScript Errors

Compile ulang backend:
```bash
cd backend
npm run build
```

## 📱 Login Credentials

### OPD Dinas Pendidikan Users:
1. **User Dinas Pendidikan**
   - Email: `DinasKesehatan@example.com`
   - Password: (sesuai yang di-set)

2. **Kepala Dinas Pendidikan**
   - Email: `kepala.pendidikan@tanjungpinang.go.id`
   - Password: (sesuai yang di-set)

3. **Staff Evaluasi Pendidikan**
   - Email: `staff1.pendidikan@tanjungpinang.go.id`
   - Password: (sesuai yang di-set)

### Inspektorat (untuk monitoring):
- **Inspektorat User 1**
  - Email: `inspektorat1@tanjungpinang.go.id`
  - Password: (sesuai yang di-set)

## 🎯 Expected Results

Setelah restart dan login:

### Dashboard OPD:
```
📊 Dashboard OPD
Selamat Datang, User Dinas Pendidikan! 👋

📋 Total Matrix: 1
⏳ Belum Dikerjakan: 1
🔄 Sedang Dikerjakan: 0
✅ Selesai: 0

Matrix yang Ditugaskan:
┌─────────┬──────────┬────────┬────────────────────┐
│ Judul   │ Progress │ Status │ Aksi               │
├─────────┼──────────┼────────┼────────────────────┤
│ SMP 6   │ 0%       │ Pending│ [Kerjakan]         │
└─────────┴──────────┴────────┴────────────────────┘
```

### Matrix Work Page:
- 18 items ditampilkan
- Semua status: Pending
- Belum ada evidence
- Tombol "Upload Evidence" tersedia

## 🧪 Test Upload Evidence

Untuk test apakah calculation sudah benar:

1. **Klik "Kerjakan"** pada matrix SMP 6
2. **Pilih 1 item** (misalnya item #1)
3. **Upload evidence** (file PDF/gambar)
4. **Kembali ke Dashboard**
5. **Refresh** (Ctrl+R)
6. **Check progress**: Seharusnya **5.56%** (1/18 × 100)

## ✅ Success Indicators

Restart berhasil jika:
- ✅ Backend running di port 3000
- ✅ Frontend running di port 5173
- ✅ Login berhasil
- ✅ Dashboard menampilkan progress 0%
- ✅ Tidak ada error di console browser
- ✅ Upload evidence berhasil update progress

## 📞 Need Help?

Jika masih ada masalah:

1. **Check console logs**:
   - Backend: Lihat terminal backend
   - Frontend: Buka DevTools (F12) → Console

2. **Run diagnostic scripts**:
   ```bash
   node backend/check-opd-pendidikan-progress.js
   node backend/check-all-users-assignments.js
   ```

3. **Re-run data sync**:
   ```bash
   node backend/complete-data-sync-fix.js
   ```

---

**Ready to restart!** 🚀

Jalankan `restart-all-servers.bat` atau restart manual, lalu test di browser.
