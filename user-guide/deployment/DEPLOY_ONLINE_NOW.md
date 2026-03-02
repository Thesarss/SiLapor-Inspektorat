# 🚀 Deploy SILAPOR Online - Railway (5 Menit)

## 🎯 Langkah Cepat Deploy

### Step 1: Upload ke GitHub (3 menit)

**Jika belum punya Git:**
1. Download GitHub Desktop: https://desktop.github.com/
2. Install dan login dengan akun GitHub

**Upload code:**
1. **Buat repo baru** di https://github.com/ → "New repository"
2. **Nama**: `silapor-app` (atau nama lain)
3. **Public** → Create repository
4. **Clone** repo ke komputer
5. **Copy** semua file SILAPOR ke folder repo
6. **Commit** dan **Push**

### Step 2: Deploy ke Railway (2 menit)

1. **Buka**: https://railway.app/
2. **Login with GitHub**
3. **New Project** → **Deploy from GitHub repo**
4. **Pilih** repository `silapor-app`
5. Railway akan auto-detect dan setup:
   - Backend service (Node.js)
   - Frontend service (Static)
   - MySQL database

### Step 3: Configure Environment Variables

**Untuk Backend Service: