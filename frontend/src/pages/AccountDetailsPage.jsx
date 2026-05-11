import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';

export default function AccountDetailsPage() {
  const { auth } = useAuth();
  const [account, setAccount] = useState(null);

  useEffect(() => {
    axiosClient.get(`/api/accounts/${auth.customerId}`).then((res) => setAccount(res.data));
  }, [auth.customerId]);

  if (!account) return <div className="page-shell"><Navbar /><main className="content">Loading...</main></div>;

  return (
    <div className="page-shell">
      <Navbar />
      <main className="content details">
        <h2>Account Details</h2>
        <div className="detail-row"><span>Account Holder</span><strong>{account.accountHolderName}</strong></div>
        <div className="detail-row"><span>Account Number</span><strong>{account.accountNumber}</strong></div>
        <div className="detail-row"><span>IBAN</span><strong>{account.iban}</strong></div>
        <div className="detail-row"><span>BIC</span><strong>{account.bic}</strong></div>
        <div className="detail-row"><span>Branch Code</span><strong>{account.branchCode}</strong></div>
        <div className="detail-row"><span>Account Type</span><strong className="badge">{account.accountType}</strong></div>
        <div className="big-balance">EUR {Number(account.balance).toFixed(2)}</div>
        <div className="detail-row"><span>Currency</span><strong>{account.currency}</strong></div>
        <div className="detail-row"><span>Status</span><strong className="badge ok">{account.status}</strong></div>
      </main>
    </div>
  );
}
