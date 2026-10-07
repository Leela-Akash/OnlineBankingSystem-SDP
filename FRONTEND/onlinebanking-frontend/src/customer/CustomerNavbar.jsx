import React, { useEffect, useState, useCallback } from "react";
import { NavLink, useNavigate, Outlet } from "react-router-dom";
import { FaSignOutAlt, FaUserCircle, FaBell, FaSun, FaMoon } from "react-icons/fa";
import { useAuth } from "../contextapi/AuthContext";
import apiClient from "../utils/axiosConfig";
import { useVisibilityPolling } from "../utils/useVisibilityPolling";
import "../admin/admincss/AdminNavbar.css";

export default function CustomerNavBar() {
  const navigate = useNavigate();
  const { logout, darkMode, toggleTheme, user } = useAuth();

  const [customer, setCustomer] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem("customer"));
    } catch {
      return null;
    }
  });
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchCustomerAndUnread = useCallback(async () => {
    const customerId = user?.id || customer?.id;
    if (!customerId) return;

    try {
      // Fetch fresh customer details if not present
      if (!customer) {
        const custRes = await apiClient.get(`/customer/${customerId}`);
        setCustomer(custRes.data);
        sessionStorage.setItem("customer", JSON.stringify(custRes.data));
      }

      // Fetch unread count
      const res = await apiClient.get(`/notification/customer/${customerId}/unread/count`);
      if (res.data && res.data.unreadCount !== undefined) {
        setUnreadCount(res.data.unreadCount);
      }
    } catch (err) {
      console.error("Error refreshing customer status:", err);
    }
  }, [user?.id, customer]);

  useEffect(() => {
    fetchCustomerAndUnread();
  }, [fetchCustomerAndUnread]);

  // Visibility-aware polling: automatically pauses when tab is hidden, refreshes on return
  useVisibilityPolling(fetchCustomerAndUnread, 45000, Boolean(user?.id || customer?.id));

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const closeMenu = () => setMobileMenuOpen(false);

  const handleLogout = () => {
    logout();
    navigate("/customerlogin", { replace: true });
  };

  return (
    <>
      <nav className="admin-navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            className="mobile-hamburger-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation"
            style={{
              display: 'none',
              background: 'none',
              border: 'none',
              color: '#ffffff',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>

          <div className="logo">
            <NavLink to="/customer/profile" style={{ color: 'inherit', textDecoration: 'none' }}>
              🏦 Nexus Banking
            </NavLink>
          </div>
        </div>

        <div className={`nav-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          <NavLink to="/customer/deposit-withdraw" onClick={closeMenu}>Deposit / Withdraw</NavLink>
          <NavLink to="/customer/statements" onClick={closeMenu}>Statements & Analytics</NavLink>
          <NavLink to="/funds" onClick={closeMenu}>Fund Transfer</NavLink>
          <NavLink to="/loans" onClick={closeMenu}>Loans</NavLink>
          <NavLink to="/notifications" onClick={closeMenu} style={{ position: 'relative' }}>
            <FaBell style={{ marginRight: '4px' }} />
            Notifications
            {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
          </NavLink>
        </div>

        <div className="navbar-right" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {customer && (
            <span className="welcome-text" style={{ fontSize: '14px', fontWeight: 500 }}>
              {customer.fullName}
            </span>
          )}

          <button
            onClick={toggleTheme}
            style={{
              background: 'none',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
            }}
            title="Toggle theme"
          >
            {darkMode ? <FaSun /> : <FaMoon />}
          </button>

          <NavLink to="/profile" className="profile-icon-link" title="My Profile">
            <FaUserCircle size={22} />
          </NavLink>

          <button className="logout-btn-icon" onClick={handleLogout} title="Log Out">
            <FaSignOutAlt size={18} />
          </button>
        </div>
      </nav>

      {/* Render child pages via Outlet */}
      <main className="content" style={{ padding: '24px', maxWidth: '1280px', margin: '0 auto', minHeight: '85vh' }}>
        <Outlet />
      </main>
    </>
  );
}
