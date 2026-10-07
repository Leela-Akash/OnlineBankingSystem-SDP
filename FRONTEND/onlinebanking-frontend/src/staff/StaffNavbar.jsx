import React, { useState } from "react";
import { NavLink, useNavigate, Outlet } from "react-router-dom";
import { FaUserCircle, FaSignOutAlt, FaSun, FaMoon, FaBars, FaTimes } from "react-icons/fa";
import { useAuth } from "../contextapi/AuthContext";
import "../admin/admincss/AdminNavbar.css";

export default function StaffNavBar() {
  const navigate = useNavigate();
  const { logout, darkMode, toggleTheme, user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/stafflogin", { replace: true });
  };

  const closeMenu = () => setMobileMenuOpen(false);

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
              padding: '4px'
            }}
          >
            {mobileMenuOpen ? <FaTimes /> : <FaBars />}
          </button>

          <div className="logo">
            <NavLink to="/dashboard" style={{ color: 'inherit', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
              💼 <span>Nexus Staff Portal</span>
            </NavLink>
          </div>
        </div>

        <div className={`nav-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          <NavLink to="/dashboard" onClick={closeMenu}>Dashboard</NavLink>
          <NavLink to="/transactions" onClick={closeMenu}>Transactions</NavLink>
          <NavLink to="/staffloans" onClick={closeMenu}>Loan Approvals</NavLink>
          <NavLink to="/customers" onClick={closeMenu}>Customers</NavLink>
        </div>

        <div className="navbar-right" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span className="welcome-text" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>
            {user?.username ? `Staff: @${user.username}` : 'Branch Staff'}
          </span>

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

          <NavLink to="/profile" className="profile-icon-link" title="Staff Profile" onClick={closeMenu}>
            <FaUserCircle size={22} />
          </NavLink>

          <button className="logout-btn" onClick={handleLogout} title="Log Out">
            <FaSignOutAlt />
          </button>
        </div>
      </nav>

      {/* Routed Content via Outlet */}
      <main className="content" style={{ padding: '24px 20px', maxWidth: '1280px', margin: '0 auto', minHeight: '85vh' }}>
        <Outlet />
      </main>
    </>
  );
}
