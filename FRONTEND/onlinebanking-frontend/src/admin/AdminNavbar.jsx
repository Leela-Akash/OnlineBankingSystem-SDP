import React from "react";
import { NavLink, useNavigate, Outlet } from "react-router-dom";
import { FaSignOutAlt, FaSun, FaMoon } from "react-icons/fa";
import { useAuth } from "../contextapi/AuthContext";
import "./admincss/AdminNavbar.css";

export default function AdminNavBar() {
  const navigate = useNavigate();
  const { logout, darkMode, toggleTheme } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const closeMenu = () => setMobileMenuOpen(false);

  const handleLogout = () => {
    logout();
    navigate("/adminlogin", { replace: true });
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
            <NavLink to="/admin/dashboard" style={{ color: 'inherit', textDecoration: 'none' }}>
              ⚡ Nexus Admin Control
            </NavLink>
          </div>
        </div>

        <div className={`nav-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          <NavLink to="/admin/dashboard" onClick={closeMenu}>Dashboard</NavLink>
          <NavLink to="/admin/all-transactions" onClick={closeMenu}>Transactions</NavLink>
          <NavLink to="/admin/manage-customers" onClick={closeMenu}>Customers</NavLink>
          <NavLink to="/admin/manage-staff" onClick={closeMenu}>Staff</NavLink>
          <NavLink to="/admin/add-staff" onClick={closeMenu}>Add Staff</NavLink>
          <NavLink to="/admin/reports" onClick={closeMenu}>Reports & Analytics</NavLink>
        </div>

        <div className="navbar-right" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
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

          <button className="logout-btn" onClick={handleLogout} title="Log Out">
            <FaSignOutAlt />
          </button>
        </div>
      </nav>

      {/* Routed Pages */}
      <main className="content" style={{ padding: '24px', maxWidth: '1280px', margin: '0 auto', minHeight: '85vh' }}>
        <Outlet />
      </main>
    </>
  );
}
