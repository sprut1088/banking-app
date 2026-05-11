import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosClient from '../api/axiosClient';

export default function Navbar() {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();

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
      <div className="brand">Aster Bank</div>
      <nav>
        <NavLink to="/dashboard">Dashboard</NavLink>
        <NavLink to="/accounts">Account</NavLink>
        <NavLink to="/transactions">Transactions</NavLink>
        <NavLink to="/cards">Cards</NavLink>
        <NavLink to="/payments">Payments</NavLink>
        <NavLink to="/load-control">Load Control</NavLink>
      </nav>
      <div className="nav-right">
        <span>{auth?.username}</span>
        <button onClick={handleLogout}>Logout</button>
      </div>
    </header>
  );
}
