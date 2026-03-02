# 📊 Matrix Auto Upload - Panduan Lengkap

## 🎯 Fitur Baru: Upload Matrix Otomatis

Sistem SILAPOR sekarang dilengkapi dengan fitur **Matrix Auto Upload** yang memungkinkan Inspektorat mengupload file Excel matrix audit dan sistem akan **otomatis mendeteksi dan memproses** kolom-kolom yang diperlukan.

## ✨ Keunggulan Fitur Baru

### 🔍 **Deteksi Otomatis Kolom**
- Sistem otomatis mendeteksi kolom **Temuan**, **Penyebab**, dan **Rekomendasi**
- Tidak perlu mapping manual kolom
- Mendukung berbagai variasi nama header (Temuan Audit, Finding, Kondisi, dll.)

### 📋 **Format Fleksibel**
- Header bisa berada di baris manapun (sistem akan mendeteksi otomatis)
- Baris kosong akan dilewati secara otomatis
- Kolom tambahan seperti "No", "Keterangan" akan diabaikan

### ⚡ **Proses Cepat**
- Upload dan parsing dalam satu langkah
- Validasi data real-time
- Preview hasil parsing sebelum disimpan

## 🚀 Cara Menggunakan

### 1. **Login sebagai Inspektorat**
```
Username: inspektorat_kepala
Password: password123
```

### 2. **Akses Menu Matrix**
- Buka halaman **Matrix Audit System**
- Klik tombol **"➕ Upload Matrix Baru"**

### 3. **Isi Form Upload**
- **Judul Matrix**: Nama matrix audit (contoh: "Matrix Audit Keuangan Q1 2024")
- **Deskripsi**: Deskripsi singkat (opsional)
- **Target OPD**: Pilih OPD yang akan mengerjakan matrix
- **Mode Pembacaan**: Pilih **"Otomatis (Direkomendasikan)"**

### 4. **Upload File Excel**
- Drag & drop file Excel atau klik untuk memilih
- Format yang didukung: `.xlsx`, `.xls`
- Ukuran maksimal: 10MB

### 5. **Klik Upload Matrix**
- Sistem akan otomatis memproses file
- Menampilkan hasil parsing dan preview data
- Matrix langsung tersedia untuk OPD

## 📄 Format Excel yang Didukung

### ✅ **Header yang Dikenali Sistem**

**Untuk Kolom Temuan:**
- "Temuan"
- "Temuan Audit" 
- "Finding"
- "Audit Finding"
- "Kondisi"
- "Permasalahan"

**Untuk Kolom Penyebab:**
- "Penyebab"
- "Sebab"
- "Cause"
- "Root Cause"
- "Akar Masalah"

**Untuk Kolom Rekomendasi:**
- "Rekomendasi"
- "Recommendation"
- "Saran"
- "Usulan"
- "Tindak Lanjut"

### 📊 **Contoh Format Excel**

```
| No | Temuan Audit                    | Penyebab                  | Rekomendasi                |
|----|--------------------------------|---------------------------|----------------------------|
| 1  | Tidak ada dokumentasi prosedur | Belum ada SOP yang jelas  | Membuat SOP dokumentasi    |
| 2  | Laporan keuangan terlambat     | Kurang koordinasi tim     | Meningkatkan koordinasi    |
| 3  | Aset tidak terinventarisir     | Sistem pencatatan manual  | Implementasi sistem digital|
```

## 🔧 Fitur Teknis

### **Backend Processing**
- **Service**: `MatrixParserService` - Parsing Excel otomatis
- **Endpoint**: `/api/matrix/upload-auto` - Upload dengan auto mapping
- **Validasi**: Format file, ukuran, dan struktur data

### **Frontend Components**
- **Component**: `MatrixUploadComponent` - UI upload yang user-friendly
- **Features**: Drag & drop, progress tracking, preview hasil

### **Database Integration**
- Otomatis membuat `matrix_reports` dan `matrix_items`
- Assignment otomatis ke user OPD yang sesuai
- Tracking progress dan status

## 🎯 Testing

### **Test Otomatis**
```bash
node test-matrix-upload.js
```

### **Test Manual**
1. Login sebagai `inspektorat_kepala`
2. Buka Matrix page
3. Upload file Excel dengan format yang sesuai
4. Verifikasi hasil parsing

## 📈 Hasil yang Diharapkan

### **Setelah Upload Berhasil:**
- ✅ Matrix report tersimpan di database
- ✅ Items matrix terparsing dengan benar
- ✅ Assignment otomatis ke OPD target
- ✅ Notifikasi sukses dengan preview data
- ✅ OPD dapat langsung mengerjakan matrix

### **Data yang Tersimpan:**
```json
{
  "reportId": "uuid",
  "title": "Matrix Audit Title",
  "targetOPD": "Dinas Pendidikan", 
  "totalItems": 3,
  "detectedHeaders": {
    "temuan": "Temuan Audit",
    "penyebab": "Penyebab", 
    "rekomendasi": "Rekomendasi"
  },
  "itemsPreview": [...]
}
```

## 🔄 Fallback ke Manual

Jika deteksi otomatis gagal:
- Sistem akan memberikan pesan error yang jelas
- User dapat memilih mode **"Manual"** 
- Akan diminta untuk mapping kolom secara manual

## 🎉 Kesimpulan

Fitur **Matrix Auto Upload** ini membuat proses upload matrix audit menjadi:
- **Lebih Cepat**: Tidak perlu mapping manual
- **Lebih Mudah**: Drag & drop dengan deteksi otomatis
- **Lebih Akurat**: Validasi dan preview sebelum disimpan
- **User-Friendly**: Interface yang intuitif dengan notifikasi yang jelas

Sekarang Inspektorat dapat mengupload matrix audit dengan mudah dan OPD dapat langsung mengerjakan tugas yang diberikan! 🚀