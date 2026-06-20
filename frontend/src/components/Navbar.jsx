import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosClient from '../api/axiosClient';
import { Button } from './ui';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Overview', aliases: ['home', 'dashboard', 'summary'] },
  { to: '/accounts', label: 'Accounts', aliases: ['account', 'iban', 'balance'] },
  { to: '/cards', label: 'Cards', aliases: ['card', 'credit'] },
  { to: '/payments', label: 'Payments', aliases: ['payment', 'payee'] },
  { to: '/transfers', label: 'Transfers', aliases: ['transfer', 'sepa', 'instant'] },
  { to: '/statements', label: 'Statements', aliases: ['statement', 'history', 'transactions'] },
  { to: '/security', label: 'Security', aliases: ['security', '2fa', 'password'] },
  { to: '/support', label: 'Support', aliases: ['help', 'support', 'contact'] }
];

const CONTEXT_META = {
  '/dashboard': { title: 'Overview', subtitle: 'Portfolio snapshot, spending signals, and quick banking actions.' },
  '/accounts': { title: 'Accounts', subtitle: 'View account profile, identifiers, and available balance.' },
  '/cards': { title: 'Cards', subtitle: 'Review card limits, status, and card-side transaction outcomes.' },
  '/payments': { title: 'Payments', subtitle: 'Submit payments and inspect rail-specific processing outcomes.' },
  '/transfers': { title: 'Transfers', subtitle: 'Manage account-to-account and beneficiary transfer journeys.' },
  '/statements': { title: 'Statements', subtitle: 'Browse transaction-ledger records and downloadable history.' },
  '/security': { title: 'Security', subtitle: 'Manage authentication posture and account access controls.' },
  '/support': { title: 'Support', subtitle: 'Get help, report issues, and track service-health advisories.' }
};

function getContextMeta(pathname) {
  const direct = CONTEXT_META[pathname];
  if (direct) {
    return direct;
  }
  const fallbackKey = Object.keys(CONTEXT_META).find((key) => pathname.startsWith(key));
  if (fallbackKey) {
    return CONTEXT_META[fallbackKey];
  }
  return { title: 'Banking', subtitle: 'Secure digital banking workspace.' };
}

export default function Navbar() {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [theme, setTheme] = useState(() => localStorage.getItem('banking-demo-theme') || 'light');
  const [query, setQuery] = useState('');

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

  const contextMeta = getContextMeta(location.pathname);
  const normalizedQuery = query.trim().toLowerCase();
  const searchResults = normalizedQuery
    ? NAV_ITEMS.filter((item) =>
      item.label.toLowerCase().includes(normalizedQuery)
      || item.aliases.some((alias) => alias.includes(normalizedQuery)))
    : [];

  const onSearchSubmit = (event) => {
    event.preventDefault();
    if (!searchResults.length) {
      return;
    }
    navigate(searchResults[0].to);
    setQuery('');
  };

  return (
    <header className="nav-shell">
      <div className="nav-top-row">
        <div className="brand">Demo Banking App</div>
        <form className="global-search" onSubmit={onSearchSubmit}>
          <label className="ui-sr-only" htmlFor="global-search-input">Global search</label>
          <input
            id="global-search-input"
            className="global-search-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search sections: cards, transfers, support..."
          />
          <Button type="submit" variant="secondary">Go</Button>
          {searchResults.length > 0 && (
            <div className="search-results" role="listbox" aria-label="Search results">
              {searchResults.slice(0, 5).map((item) => (
                <button
                  key={item.to}
                  type="button"
                  className="search-result-item"
                  onClick={() => {
                    navigate(item.to);
                    setQuery('');
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </form>
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
      </div>

      <nav className="section-nav" aria-label="Primary banking navigation">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to}>{item.label}</NavLink>
        ))}
        <NavLink to="/load-control">Load Control</NavLink>
      </nav>

      <div className="page-context">
        <p className="breadcrumbs">Banking / {contextMeta.title}</p>
        <h1>{contextMeta.title}</h1>
        <p>{contextMeta.subtitle}</p>
      </div>
    </header>
  );
}
