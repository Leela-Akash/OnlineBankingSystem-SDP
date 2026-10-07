import { useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { useAuth } from '../contextapi/AuthContext';
import './maincss/style.css';

export default function MainNavBar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { darkMode, toggleTheme } = useAuth();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
    if (!isMenuOpen) {
      setIsDropdownOpen(false);
    }
  };

  const toggleDropdown = (e) => {
    e.preventDefault();
    setIsDropdownOpen(!isDropdownOpen);
  };

  return (
    <div className="app-container" style={{ width: '100%', margin: 0, padding: 0 }}>
      <nav className="navbar">
        <div className="logo">
          <Link to="/" style={{ color: 'inherit', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🏦 Nexus Bank
          </Link>
        </div>

        {/* Hamburger menu for mobile */}
        <button className="menu-toggle" onClick={toggleMenu} aria-label="Toggle Navigation">
          {isMenuOpen ? <CloseIcon /> : <MenuIcon />}
        </button>

        <ul className={`nav-links ${isMenuOpen ? 'active' : ''}`}>
          <li>
            <Link to="/" onClick={() => setIsMenuOpen(false)}>Home</Link>
          </li>
          <li>
            <Link to="/customerregistration" onClick={() => setIsMenuOpen(false)}>Register</Link>
          </li>
          <li className={`dropdown ${isDropdownOpen ? 'active' : ''}`}>
            <button className="dropdown-toggle" onClick={toggleDropdown}>
              Portals <KeyboardArrowDownIcon className={`dropdown-icon ${isDropdownOpen ? 'rotate' : ''}`} />
            </button>
            <ul className="dropdown-menu">
              <li>
                <Link to="/customerlogin" onClick={() => setIsMenuOpen(false)}>Customer Portal</Link>
              </li>
              <li>
                <Link to="/stafflogin" onClick={() => setIsMenuOpen(false)}>Staff Portal</Link>
              </li>
              <li>
                <Link to="/adminlogin" onClick={() => setIsMenuOpen(false)}>Admin Portal</Link>
              </li>
            </ul>
          </li>
          <li>
            <Link to="/about" onClick={() => setIsMenuOpen(false)}>About</Link>
          </li>
          <li>
            <Link to="/contact" onClick={() => setIsMenuOpen(false)}>Contact</Link>
          </li>
          <li>
            <button
              onClick={toggleTheme}
              className="theme-toggle-btn"
              title="Toggle Dark/Light Mode"
              style={{ fontSize: '16px', background: 'none', border: 'none', cursor: 'pointer', padding: '6px' }}
            >
              {darkMode ? '☀️ Light' : '🌙 Dark'}
            </button>
          </li>
        </ul>
      </nav>

      {/* Render child route inside layout */}
      <main className="content" style={{ minHeight: '80vh', padding: '20px' }}>
        <Outlet />
      </main>
    </div>
  );
}
