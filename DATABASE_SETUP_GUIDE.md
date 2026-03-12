# Panduan Setup Database SiLapor Inspektorat

## Situasi Saat Ini

Aplikasi ini menggunakan database MySQL dengan nama **`evaluation_reporting`**.

## Jika Database Anda Berbeda

### Opsi 1: Gunakan Database yang Sudah Ada

Jika Anda sudah memiliki database dengan nama lain (misalnya `audit_system`, `inspektorat_db`, atau `silapor_db`), Anda bisa:

1. **Update file `.env`** di folder `backend/`:
   ```env
   DB_NAME=nama_database_anda
   ```

2. **Restart backend**:
   ```bash
   # Stop backend yang sedang running (Ctrl+C)
   cd backend
   npm run dev
   ```

### Opsi 2: Export Database Lama dan Import ke evaluation_reporting

Jika Anda ingin menggunakan `evaluation_reporting` tapi sudah punya data di database lain:

1. **Export database lama**:
   ```bash
   C:\xampp\mysql\bin\mysqldump.exe -u root nama_database_lama > backup.sql
   ```

2. **Import ke evaluation_reporting**:
   ```bash
   C:\xampp\mysql\bin\mysql.exe -u root evaluation_reporting < backup.sql
   ```

3. **Update password users** (jika perlu):
   ```bash
   cd backend
   Get-Content update-passwords.sql | C:\xampp\mysql\bin\mysql.exe -u root
   ```

### Opsi 3: Gunakan Script Otomatis

Jalankan script yang sudah saya buat:

```bash
setup-database.bat
```

Script ini akan membantu Anda:
- Melihat database yang tersedia
- Membuat database baru
- Export/Import database
- Setup migrasi otomatis

## Cek Database Saat Ini

Untuk melihat database apa yang Anda gunakan:

```bash
compare-databases.bat
```

Script ini akan menampilkan:
- Semua database yang relevan
- Tabel yang ada di `evaluation_reporting`
- Jumlah data di setiap tabel

## Struktur Database yang Benar

Database `evaluation_reporting` harus memiliki tabel-tabel berikut:

### Tabel Utama:
- `users` - Data user (admin, inspektorat, OPD)
- `reports` - Laporan evaluasi
- `follow_ups` - Tindak lanjut
- `followup_items` - Item tindak lanjut
- `followup_item_recommendations` - Rekomendasi

### Tabel Matrix:
- `matrix_reports` - Laporan matrix
- `matrix_items` - Item matrix
- `matrix_assignments` - Penugasan matrix
- `matrix_templates` - Template matrix

### Tabel Evidence:
- `evidence_files` - File bukti
- `evidence_tags` - Tag untuk evidence
- `evidence_file_tags` - Relasi evidence dan tag

### Tabel Lainnya:
- `metrics` - Metrik
- `revision_items` - Item revisi
- `report_files` - File laporan
- `sessions` - Session management

## Migrasi Database

Jika Anda ingin menjalankan migrasi dari awal:

```bash
cd backend
run-migrations-and-seed-auto.bat
```

Ini akan:
1. Menjalankan semua migrasi (001-026)
2. Membuat tabel-tabel yang diperlukan
3. Insert data seed (user default)

## Troubleshooting

### Database tidak ditemukan
```bash
C:\xampp\mysql\bin\mysql.exe -u root -e "CREATE DATABASE evaluation_reporting;"
```

### Tabel tidak ada
Jalankan migrasi:
```bash
cd backend
run-migrations-and-seed-auto.bat
```

### Data user tidak ada
Jalankan seed:
```bash
cd backend
Get-Content src/database/seed.sql | C:\xampp\mysql\bin\mysql.exe -u root
```

### Password tidak cocok
Update password:
```bash
cd backend
Get-Content update-passwords.sql | C:\xampp\mysql\bin\mysql.exe -u root
```

## Backup Database

Selalu backup database sebelum melakukan perubahan:

```bash
C:\xampp\mysql\bin\mysqldump.exe -u root evaluation_reporting > backup_$(date +%Y%m%d).sql
```

## Restore Database

Untuk restore dari backup:

```bash
C:\xampp\mysql\bin\mysql.exe -u root evaluation_reporting < backup_file.sql
```

## Kontak

Jika masih ada masalah, hubungi tim development.
