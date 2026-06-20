import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosClient from '../api/axiosClient';
import { Button } from './ui';

export default function Navbar() {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(() => localStorage.getItem('banking-demo-theme') || 'light');

  useEffect(() => {
    if (theme === 'light') {
      document.body.removeAttribute('data-theme');
    } else {
      document.body.setAttribute('data-theme', theme);
    }
    localStorage.setItem('banking-demo-theme', theme);
  }, [theme]);

  const handleLogout = async () => {
    try {
      await axiosClient.post('/api/auth/logout');
    } catch (e) {
      console.error(e);
    } finally {
      logout();
      navigate('/login');
    }
  };

  return (
    <header className="nav-shell">
      <div className="brand">Demo Banking App</div>
      <nav>
        <NavLink to="/dashboard">Dashboard</NavLink>
        <NavLink to="/accounts">Account</NavLink>
        <NavLink to="/transactions">Transactions</NavLink>
        <NavLink to="/cards">Cards</NavLink>
        <NavLink to="/payments">Payments</NavLink>
        <NavLink to="/load-control">Load Control</NavLink>
      </nav>
      <div className="nav-right">
        <label className="ui-sr-only" htmlFor="theme-select">Theme</label>
        <select
          id="theme-select"
          className="theme-select"
          value={theme}
          onChange={(event) => setTheme(event.target.value)}
          aria-label="Select theme"
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="contrast">High Contrast</option>
        </select>
        <span>{auth?.username}</span>
        <Button onClick={handleLogout}>Logout</Button>
      </div>
    </header>
  );
}
