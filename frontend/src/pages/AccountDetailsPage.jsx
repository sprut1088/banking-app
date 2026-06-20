import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import { Button, Card, InputField } from '../components/ui';
import { getCustomerProfile, saveCustomerProfile } from '../api/customerProfileStore';
import { getAccountPortfolio, saveAccountPortfolioPreferences } from '../api/accountPortfolioStore';

function MiniBalanceChart({ data }) {
  if (!data || data.length < 2) {
    return null;
  }

  const width = 180;
  const height = 56;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = Math.max(1, max - min);

  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');

  return (
    <svg className="mini-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Balance trend">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export default function AccountDetailsPage() {
  const { auth } = useAuth();
  const [account, setAccount] = useState(null);
  const [profile, setProfile] = useState(null);
  const [portfolio, setPortfolio] = useState([]);
  const [trendWindow, setTrendWindow] = useState(7);
  const [form, setForm] = useState({
    email: '',
    phone: '',
    preferredChannel: 'EMAIL',
    prefersEmail: true,
    prefersSms: false,
    prefersPush: true
  });
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const load = async () => {
      const response = await axiosClient.get(`/api/accounts/${auth.customerId}`);
      setAccount(response.data);
      setPortfolio(getAccountPortfolio(auth.customerId, response.data));

      const profileData = getCustomerProfile({
        customerId: auth.customerId,
        customerName: response.data.accountHolderName,
        residencyCountry: 'DE'
      });
      setProfile(profileData);
      setForm({
        email: profileData.email,
        phone: profileData.phone,
        preferredChannel: profileData.preferredChannel,
        prefersEmail: profileData.contactPreferences.email,
        prefersSms: profileData.contactPreferences.sms,
        prefersPush: profileData.contactPreferences.push
      });
    };

    load().catch(console.error);
  }, [auth.customerId]);

  const onPortfolioChange = (accountId, patch) => {
    const next = portfolio.map((item) => (item.accountId === accountId ? { ...item, ...patch } : item));
    setPortfolio(next);
    saveAccountPortfolioPreferences(auth.customerId, next);
  };

  const onSavePreferences = (event) => {
    event.preventDefault();
    if (!profile) {
      return;
    }

    const updated = saveCustomerProfile({
      ...profile,
      email: form.email,
      phone: form.phone,
      preferredChannel: form.preferredChannel,
      contactPreferences: {
        email: form.prefersEmail,
        sms: form.prefersSms,
        push: form.prefersPush
      }
    });
    setProfile(updated);
    setMessage('Contact preferences updated successfully.');
  };

  if (!account || !profile) return <div className="page-shell"><Navbar /><main className="content">Loading...</main></div>;

  return (
    <div className="page-shell">
      <Navbar />
      <main className="content details profile-layout">
        <Card title="Account Details" className="profile-card">
          <div className="detail-row"><span>Account Holder</span><strong>{account.accountHolderName}</strong></div>
          <div className="detail-row"><span>Account Number</span><strong>{account.accountNumber}</strong></div>
          <div className="detail-row"><span>IBAN</span><strong>{account.iban}</strong></div>
          <div className="detail-row"><span>BIC</span><strong>{account.bic}</strong></div>
          <div className="detail-row"><span>Branch Code</span><strong>{account.branchCode}</strong></div>
          <div className="detail-row"><span>Account Type</span><strong className="badge">{account.accountType}</strong></div>
          <div className="big-balance">EUR {Number(account.balance).toFixed(2)}</div>
          <div className="detail-row"><span>Currency</span><strong>{account.currency}</strong></div>
          <div className="detail-row"><span>Status</span><strong className="badge ok">{account.status}</strong></div>
        </Card>

        <Card title="Account Portfolio" subtitle="Multi-product account view with trend and quick personalization controls." className="profile-card">
          <div className="portfolio-toolbar">
            <span className="note">Trend Window</span>
            <div className="window-switch">
              <Button type="button" variant={trendWindow === 7 ? 'primary' : 'secondary'} onClick={() => setTrendWindow(7)}>7D</Button>
              <Button type="button" variant={trendWindow === 30 ? 'primary' : 'secondary'} onClick={() => setTrendWindow(30)}>30D</Button>
            </div>
          </div>

          <div className="portfolio-grid">
            {portfolio.map((item) => {
              const trend = trendWindow === 7 ? item.trend7d : item.trend30d;
              const trendSeries = trendWindow === 7 ? item.history7d : item.history30d;
              const trendClass = trend > 0 ? 'trend-chip up' : trend < 0 ? 'trend-chip down' : 'trend-chip flat';
              const trendSign = trend > 0 ? '+' : '';

              return (
                <article key={item.accountId} className="portfolio-card-item">
                  <header className="portfolio-head">
                    <strong>{item.type}</strong>
                    <button
                      type="button"
                      className={item.favorite ? 'pin-btn pinned' : 'pin-btn'}
                      onClick={() => onPortfolioChange(item.accountId, { favorite: !item.favorite })}
                    >
                      {item.favorite ? 'Pinned' : 'Pin'}
                    </button>
                  </header>

                  <label className="ui-label" htmlFor={`nickname-${item.accountId}`}>Nickname</label>
                  <input
                    id={`nickname-${item.accountId}`}
                    className="ui-input"
                    value={item.nickname}
                    onChange={(event) => onPortfolioChange(item.accountId, { nickname: event.target.value })}
                  />

                  <div className="portfolio-balance">{item.currency} {Number(item.balance).toFixed(2)}</div>
                  <div className="portfolio-meta">
                    <span>{item.accountNumber}</span>
                    <span className={trendClass}>{trendSign}{trend}%</span>
                  </div>
                  <MiniBalanceChart data={trendSeries} />
                </article>
              );
            })}
          </div>
        </Card>

        <Card title="Customer Profile and KYC Snapshot" subtitle="Identity and eligibility posture used across payment and transfer decisions." className="profile-card">
          <div className="detail-row"><span>Customer ID</span><strong>{profile.customerId}</strong></div>
          <div className="detail-row"><span>Full Name</span><strong>{profile.fullName}</strong></div>
          <div className="detail-row"><span>Residency</span><strong>{profile.residencyCountry}</strong></div>
          <div className="detail-row"><span>KYC Level</span><strong className="badge">{profile.kycLevel}</strong></div>
          <div className="detail-row"><span>Verification Status</span><strong className={profile.verificationStatus === 'VERIFIED' ? 'badge ok' : 'badge warn'}>{profile.verificationStatus}</strong></div>
          <div className="detail-row"><span>Risk Band</span><strong className={profile.riskBand === 'LOW' ? 'badge ok' : 'badge warn'}>{profile.riskBand}</strong></div>
          <p className="note">Last Updated: {new Date(profile.updatedAt).toLocaleString()}</p>

          <h3>Document Verification Timeline</h3>
          <ul className="timeline-list">
            {profile.documentTimeline.map((item) => (
              <li key={item.id} className="timeline-item">
                <span>{item.date}</span>
                <strong>{item.documentType}</strong>
                <span className={item.status === 'VERIFIED' || item.status === 'CLEARED' ? 'badge ok' : 'badge warn'}>{item.status}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Contact Preferences" subtitle="Mock preference updates are persisted locally for demo continuity." className="profile-card">
          <form className="profile-form" onSubmit={onSavePreferences}>
            <InputField
              id="contact-email"
              label="Email"
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              required
            />
            <InputField
              id="contact-phone"
              label="Phone"
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
              required
            />

            <label className="ui-label" htmlFor="preferred-channel">Preferred Channel</label>
            <select
              id="preferred-channel"
              className="ui-select"
              value={form.preferredChannel}
              onChange={(event) => setForm({ ...form, preferredChannel: event.target.value })}
            >
              <option value="EMAIL">EMAIL</option>
              <option value="SMS">SMS</option>
              <option value="PUSH">PUSH</option>
            </select>

            <div className="pref-grid">
              <label><input type="checkbox" checked={form.prefersEmail} onChange={(event) => setForm({ ...form, prefersEmail: event.target.checked })} /> Email Alerts</label>
              <label><input type="checkbox" checked={form.prefersSms} onChange={(event) => setForm({ ...form, prefersSms: event.target.checked })} /> SMS Alerts</label>
              <label><input type="checkbox" checked={form.prefersPush} onChange={(event) => setForm({ ...form, prefersPush: event.target.checked })} /> Push Alerts</label>
            </div>

            <Button type="submit">Save Preferences</Button>
          </form>
          {message && <div className="success-banner">{message}</div>}
        </Card>
      </main>
    </div>
  );
}
