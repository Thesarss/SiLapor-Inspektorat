# 🔄 Instruksi Restart Backend

## Masalah
Endpoint masih mengembalikan 404 karena backend belum di-restart setelah perubahan kode.

## Perubahan yang Sudah Dilakukan
✅ Route mounting di `backend/src/index.ts` sudah diperbaiki:
```typescript
// SEBELUM (SALAH):
app.use('/api', followupRecommendationRouter);

// SESUDAH (BENAR):
app.use('/api/followup-recommendations', followupRecommendationRouter);
```

## Langkah-Langkah Restart Backend

### Opsi 1: Restart Manual
1. **Stop backend server** yang sedang berjalan:
   - Tekan `Ctrl + C` di terminal backend
   
2. **Start ulang backend**:
   ```bash
   cd backend
   npm run dev
   ```

3. **Tunggu sampai muncul pesan**:
   ```
   ✅ Server running on port 3000
   ✅ Database connected
   ```

### Opsi 2: Kill Process dan Restart
Jika backend tidak bisa di-stop dengan Ctrl+C:

1. **Kill process di port 3000**:
   ```bash
   # Windows PowerShell
   Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force
   ```

2. **Start ulang backend**:
   ```bash
   cd backend
   npm run dev
   ```

## Verifikasi Setelah Restart

### Test 1: Jalankan Script Test
```bash
node test-approve-endpoint.js
```

**Expected Output:**
```
✅ APPROVE endpoint SUCCESS!
```

### Test 2: Test di Browser
1. Login sebagai Inspektorat
2. Buka halaman "Review Laporan"
3. Klik tombol "Setujui" atau "Tolak"
4. Seharusnya berhasil tanpa error 404

## Endpoint yang Sekarang Tersedia

✅ **Approve Recommendation:**
```
POST /api/followup-recommendations/recommendations/:id/approve
```

✅ **Reject Recommendation:**
```
POST /api/followup-recommendations/recommendations/:id/reject
```

✅ **Get Recommendations for Followup Item:**
```
GET /api/followup-recommendations/followup-items/:followupItemId/recommendations
```

✅ **Upload Files for Recommendation:**
```
POST /api/followup-recommendations/recommendations/:id/files
```

## Troubleshooting

### Jika masih 404 setelah restart:
1. Pastikan backend benar-benar sudah di-restart (cek timestamp log)
2. Clear browser cache atau hard refresh (Ctrl + Shift + R)
3. Periksa console browser untuk melihat URL yang dipanggil
4. Jalankan test script untuk memverifikasi endpoint

### Jika ada error lain:
1. Periksa log backend untuk error message
2. Pastikan database sudah running (XAMPP MySQL)
3. Periksa file `.env` di backend untuk konfigurasi database

## Status Perbaikan

✅ Frontend endpoint sudah diperbaiki di:
- `frontend/src/pages/ApprovalsPage.tsx`
- `frontend/src/components/ReportProgressDetail.tsx`

✅ Backend route mounting sudah diperbaiki di:
- `backend/src/index.ts`

⏳ **NEXT STEP: RESTART BACKEND!**
