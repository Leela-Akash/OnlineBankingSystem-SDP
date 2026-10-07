import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../utils/axiosConfig';
import { useAuth } from '../contextapi/AuthContext';
import { useToast } from '../components/Toast';
import { useVisibilityPolling } from '../utils/useVisibilityPolling';
import Skeleton from '../components/Skeleton';
import './customercss/Notifications.css';

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState(null);
  const { addToast } = useToast();

  const fetchAll = useCallback(async (customerId) => {
    if (!customerId) return;
    try {
      const [listRes, countRes] = await Promise.all([
        apiClient.get(`/notification/customer/${customerId}`),
        apiClient.get(`/notification/customer/${customerId}/unread/count`),
      ]);
      setNotifications(listRes.data || []);
      setUnreadCount(countRes.data?.unreadCount || 0);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let stored = null;
    try {
      stored = JSON.parse(sessionStorage.getItem('customer'));
    } catch {}

    const custId = user?.id || stored?.id;
    if (custId) {
      setCustomer(stored || { id: custId });
      fetchAll(custId);
    } else {
      setLoading(false);
    }
  }, [user, fetchAll]);

  // Visibility-aware polling pauses when tab is hidden and refreshes on return
  useVisibilityPolling(
    () => {
      const custId = user?.id || customer?.id;
      if (custId) fetchAll(custId);
    },
    45000,
    Boolean(user?.id || customer?.id)
  );

  const markAsRead = async (notificationId) => {
    try {
      await apiClient.put(`/notification/read/${notificationId}`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      addToast('Marked notification as read', 'info');
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const markAllAsRead = async () => {
    const custId = user?.id || customer?.id;
    if (!custId) return;
    try {
      await apiClient.put(`/notification/customer/${custId}/read-all`);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      addToast('All notifications marked as read', 'success');
    } catch (err) {
      addToast('Failed to mark all as read', 'error');
    }
  };

  const getTypeIcon = (type) => {
    const icons = {
      transaction: '💳',
      loan: '💰',
      account: '🏦',
      security: '🔒',
    };
    return icons[type] || '📌';
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '720px', margin: '40px auto' }}>
        <Skeleton height="36px" width="220px" />
        <Skeleton height="80px" style={{ marginTop: '16px' }} />
        <Skeleton height="80px" style={{ marginTop: '12px' }} />
        <Skeleton height="80px" style={{ marginTop: '12px' }} />
      </div>
    );
  }

  return (
    <div className="notifications-container fintech-card" style={{ maxWidth: '760px', margin: '30px auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 700 }}>📬 Security & Alerts Inbox</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '2px' }}>
            Real-time transaction alerts, login notifications, and underwriting decisions
          </p>
        </div>

        {unreadCount > 0 && (
          <button onClick={markAllAsRead} className="fintech-btn-primary" style={{ padding: '8px 14px', fontSize: '13px' }}>
            ✓ Mark All Read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: '16px' }}>No notifications found</p>
          <span style={{ fontSize: '13px' }}>Your alerts and security updates will appear here</span>
        </div>
      ) : (
        <div className="notifications-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {notifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => !notification.isRead && markAsRead(notification.id)}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '14px',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                backgroundColor: notification.isRead ? 'var(--bg-card)' : 'var(--bg-main)',
                cursor: notification.isRead ? 'default' : 'pointer',
                transition: 'background-color 0.2s',
                position: 'relative',
              }}
            >
              <div style={{ fontSize: '24px', lineHeight: 1 }}>{getTypeIcon(notification.type)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h4 style={{ fontSize: '15px', fontWeight: notification.isRead ? 500 : 700, margin: 0 }}>
                    {notification.title}
                  </h4>
                  {!notification.isRead && (
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary)', display: 'inline-block' }} />
                  )}
                </div>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '4px 0 6px 0' }}>
                  {notification.message}
                </p>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {notification.createdAt ? new Date(notification.createdAt).toLocaleString() : 'Recent'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
