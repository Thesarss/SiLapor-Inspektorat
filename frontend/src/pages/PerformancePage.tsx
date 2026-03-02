import { useAuth } from '../context/AuthContext';

export function PerformancePage() {
  console.log('🚀 PerformancePage rendered');
  const { user, isSuperAdmin, isInspektorat } = useAuth();
  
  console.log('👤 User in PerformancePage:', user);
  console.log('🔑 isSuperAdmin:', isSuperAdmin);
  console.log('🔑 isInspektorat:', isInspektorat);
  
  return (
    <div style={{ padding: '20px', minHeight: '100vh', background: 'white' }}>
      <h1>🚀 Performance Dashboard Debug</h1>
      <div style={{ marginBottom: '20px', padding: '15px', background: '#f0f0f0', borderRadius: '8px' }}>
        <h3>Debug Info:</h3>
        <p><strong>User:</strong> {user?.name || 'No user'}</p>
        <p><strong>Role:</strong> {user?.role || 'No role'}</p>
        <p><strong>Is Super Admin:</strong> {isSuperAdmin ? 'Yes' : 'No'}</p>
        <p><strong>Is Inspektorat:</strong> {isInspektorat ? 'Yes' : 'No'}</p>
      </div>
      
      {(isSuperAdmin || isInspektorat) ? (
        <div style={{ padding: '15px', background: '#e8f5e8', borderRadius: '8px' }}>
          <h3>✅ Access Granted</h3>
          <p>You have permission to view the performance dashboard.</p>
          <p>The actual dashboard component would load here.</p>
        </div>
      ) : (
        <div style={{ padding: '15px', background: '#ffe8e8', borderRadius: '8px' }}>
          <h3>❌ Access Denied</h3>
          <p>You don't have permission to view the performance dashboard.</p>
          <p>Only Super Admin and Inspektorat can access this page.</p>
        </div>
      )}
    </div>
  );
}