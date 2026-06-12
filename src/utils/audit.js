const AUDIT_LOG_KEY = 'admin_audit_logs';

export const logAudit = ({
  user,
  action,
  module,
  description,
  isSuspicious = false
}) => {
  if (typeof window === 'undefined') return;

  try {
    const raw = localStorage.getItem(AUDIT_LOG_KEY);
    const logs = raw ? JSON.parse(raw) : [];
    const entry = {
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userName: user?.name || user?.username || user?.email || 'Unknown',
      userRole: user?.role || 'N/A',
      action,
      module,
      description,
      ipAddress: 'Local',
      device: (typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent : 'Unknown',
      isSuspicious
    };

    const nextLogs = [entry, ...(Array.isArray(logs) ? logs : [])];
    localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(nextLogs));
    window.dispatchEvent(new CustomEvent('app-storage-updated', { detail: { key: AUDIT_LOG_KEY } }));
  } catch (error) {
    return;
  }
};
