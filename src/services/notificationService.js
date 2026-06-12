import api from './api';

const normalizeNotification = (item) => {
  if (!item || typeof item !== 'object') {
    return null;
  }

  const id = item.id ?? item._id ?? item.uuid ?? item.notificationId;
  if (!id) {
    return null;
  }

  const type = String(item.type || item.level || item.severity || 'info').toLowerCase();
  const rawTitle = item.title || item.subject || item.name || 'Notification';
  const rawMessage = item.message || item.body || item.description || '';

  const sanitizeSender = (text) => {
    if (!text || typeof text !== 'string') return text;
    // Replace explicit "Super Admin" mentions
    let out = text.replace(/\bSuper\s+Admin\b/gi, 'Mian & Sons Hardware Store');
    // Replace patterns like "by Some Admin" -> "by Mian & Sons Hardware Store"
    out = out.replace(/\bby\s+[A-Za-z0-9 &_.-]*?Admin\b/gi, 'by Mian & Sons Hardware Store');
    return out;
  };

  const title = sanitizeSender(rawTitle);
  const message = sanitizeSender(rawMessage);
  const target = item.target || item.link || item.url || null;
  const createdAt = item.createdAt || item.created_at || item.timestamp || item.date || null;
  const read = Boolean(item.read || item.isRead || item.readAt);
  const products = Array.isArray(item.products) ? item.products.filter(Boolean).map((name) => String(name)) : [];
  const deliveryEstimate = item.delivery_estimate || item.deliveryEstimate || null;
  const deliveryMessage = item.delivery_message || item.deliveryMessage || null;

  return {
    id,
    type,
    title,
    message,
    target,
    createdAt,
    read,
    products,
    deliveryEstimate,
    deliveryMessage
  };
};

export const notificationService = {
  list: async (params = {}) => {
    const response = await api.get('/notifications', { params });
    const payload = response?.data;
    const items = Array.isArray(payload) ? payload : payload?.data || [];
    return items.map(normalizeNotification).filter(Boolean);
  },
  markRead: async (notificationId) => {
    await api.patch(`/notifications/${notificationId}/read`);
  }
};
