import React from "react";
import { NavLink, useNavigate, Outlet } from "react-router-dom";
import { FaUserCircle, FaSignOutAlt, FaSun, FaMoon } from "react-icons/fa";
import { useAuth } from "../contextapi/AuthContext";
import "../admin/admincss/AdminNavbar.css";

export default function StaffNavBar() {
  const navigate = useNavigate();
  const { logout, darkMode, toggleTheme } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/stafflogin", { replace: true });
  };

  return (
    <>
      <nav className="admin-navbar">
        <div className="logo">
          <NavLink to="/dashboard" style={{ color: 'inherit', textDecoration: 'none' }}>
            💼 Nexus Staff Portal
          </NavLink>
        </div>

        <div className="nav-links">
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/transactions">Transactions</NavLink>
          <NavLink to="/staffloans">Loan Approvals</NavLink>
          <NavLink to="/customers">Customers</NavLink>
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

          <NavLink to="/profile" className="profile-icon-link" title="Staff Profile">
            <FaUserCircle size={22} />
          </NavLink>

          <button className="logout-btn" onClick={handleLogout} title="Log Out">
            <FaSignOutAlt />
          </button>
        </div>
      </nav>

      {/* Routed Content via Outlet */}
      <main className="content" style={{ padding: '24px', maxWidth: '1280px', margin: '0 auto', minHeight: '85vh' }}>
        <Outlet />
      </main>
    </>
  );
}
