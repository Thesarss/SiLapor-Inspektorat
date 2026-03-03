# Fix Evidence Download Authentication Error ✅

## Problem
User mendapat error "No token provided" ketika membuka file evidence yang diupload. Error ini terjadi karena link evidence menggunakan `<a href>` yang membuka di tab baru tanpa menyertakan Authorization token.

## Root Cause
Di `ApprovalsPage.tsx`, link download evidence menggunakan:
```tsx
<a href={`/api/matrix/item/${item.id}/evidence`} target="_blank">
```

Ketika link dibuka di tab baru, browser tidak mengirim Authorization header yang berisi JWT token, sehingga backend menolak request dengan error "No token provided".

## Solution
Mengubah download evidence dari direct link menjadi API call dengan token:

### 1. Matrix Item Evidence
**Before:**
```tsx
<a href={`/api/matrix/item/${item.id}/evidence`} target="_blank">
  📎 {item.evidence_filename}
</a>
```

**After:**
```tsx
<button onClick={() => handleDownloadEvidence(item.id, item.evidence_filename)}>
  📎 {item.evidence_filename}
</button>
```

### 2. Evidence Files
**Before:**
```tsx
<a href={`/api/evidence/${item.id}/download`} target="_blank">
  📥 Download File
</a>
```

**After:**
```tsx
<button onClick={() => handleDownloadEvidenceFile(item.id, item.original_filename)}>
  📥 Download File
</button>
```

## Implementation Details

### handleDownloadEvidence Function
```typescript
const handleDownloadEvidence = async (itemId: string, filename: string) => {
  try {
    const response = await apiClient.get(`/matrix/item/${itemId}/evidence`, {
      responseType: 'blob'
    });
    
    // Create blob link to download
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    
    notify.success('File berhasil diunduh');
  } catch (error: any) {
    console.error('Failed to download evidence:', error);
    notify.error('Gagal mengunduh file evidence');
  }
};
```

### handleDownloadEvidenceFile Function
```typescript
const handleDownloadEvidenceFile = async (evidenceId: string, filename: string) => {
  try {
    const response = await apiClient.get(`/evidence/${evidenceId}/download`, {
      responseType: 'blob'
    });
    
    // Create blob link to download
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    
    notify.success('File berhasil diunduh');
  } catch (error: any) {
    console.error('Failed to download evidence file:', error);
    notify.error('Gagal mengunduh file evidence');
  }
};
```

## How It Works
1. User clicks download button
2. Function calls API with `apiClient.get()` which automatically includes Authorization token
3. Backend validates token and returns file as blob
4. Frontend creates temporary URL from blob
5. Programmatically triggers download
6. Cleans up temporary URL

## Benefits
✅ Secure - Token always included in API calls
✅ User-friendly - File downloads automatically without opening new tab
✅ Consistent - Same download behavior across all file types
✅ Error handling - Shows notification if download fails

## Files Modified
- `frontend/src/pages/ApprovalsPage.tsx`
  - Changed evidence links to buttons
  - Added `handleDownloadEvidence()` function
  - Added `handleDownloadEvidenceFile()` function

## Testing
1. Login as Inspektorat
2. Go to Review page
3. Click on evidence filename
4. File should download automatically with token authentication
5. No "No token provided" error

## Status: RESOLVED ✅
Evidence download now works correctly with proper authentication.
