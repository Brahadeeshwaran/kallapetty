import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function NoAccess() {
  const { logout } = useAuth();
  return (
    <div className="login-wrap" style={{ flexDirection: 'column', gap: '24px', textAlign: 'center' }}>
      <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '24px', borderRadius: '50%', marginBottom: '8px' }}>
        <ShieldAlert size={48} color="var(--danger)" />
      </div>
      <div>
        <h2 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Role Not Assigned</h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', lineHeight: '1.5' }}>
          You currently do not have any roles assigned to your account. Please contact your Business Owner or Manager to grant you access to a shop.
        </p>
      </div>
      <button onClick={logout} className="btn btn-primary" style={{ marginTop: '16px' }}>
        Sign Out
      </button>
    </div>
  );
}
