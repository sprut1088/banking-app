import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import { Button, Card, InputField } from '../components/ui';
import { getCustomerProfile, saveCustomerProfile } from '../api/customerProfileStore';

export default function AccountDetailsPage() {
  const { auth } = useAuth();
  const [account, setAccount] = useState(null);
  const [profile, setProfile] = useState(null);
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
