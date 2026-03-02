# 🗄️ Setup Database Manual - XAMPP

## 📋 Langkah Setup Database

### 1. Buka phpMyAdmin
1. **Buka browser** dan akses: http://localhost/phpmyadmin
2. **Login** dengan user: `root` (tanpa password)

### 2. Buat Database
1. **Klik "New"** di sidebar kiri
2. **Nama database**: `evaluation_reporting`
3. **Collation**: `utf8mb4_general_ci`
4. **Klik "Create"**

### 3. Import Schema
1. **Pilih database** `evaluation_reporting` yang baru dibuat
2. **Klik tab "Import"**
3. **Choose File** dan pilih file migration SQL satu per satu:

#### Urutan Import (PENTING - harus berurutan):
1. `backend/src/database/migrations/001_initial_schema.sql`
2. `backend/src/database/migrations/002_add_report_files.sql`
3. `backend/src/database/migrations/003_add_reje