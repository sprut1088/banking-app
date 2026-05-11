import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';

export default function PaymentPage() {
  const { auth } = useAuth();
  const [payees, setPayees] = useState([]);
  const [history, setHistory] = useState([]);
  const [accountNumber, setAccountNumber] = useState('');
  const [form, setForm] = useState({ toPayeeId: 'PAY001', amount: '25.00', reference: 'Monthly payment', currency: 'EUR' });
  const [message, setMessage] = useState(null);

  const loadData = async () => {
    const [payeeRes, historyRes, accountRes] = await Promise.all([
      axiosClient.get('/api/payments/payees'),
      axiosClient.get(`/api/payments/${auth.customerId}/history`),
      axiosClient.get(`/api/accounts/${auth.customerId}`)
    ]);
    setPayees(payeeRes.data);
    setHistory(historyRes.data);
    setAccountNumber(accountRes.data.accountNumber);
  };

  useEffect(() => {
    loadData().catch(console.error);
  }, [auth.customerId]);

  const submitPayment = async (e) => {
    e.preventDefault();
    setMessage(null);
    try {
      const response = await axiosClient.post('/api/payments/submit', {
        customerId: auth.customerId,
        fromAccount: accountNumber,
        toPayeeId: form.toPayeeId,
        amount: Number(form.amount),
        reference: form.reference,
        currency: form.currency
      });
      setMessage({ type: 'success', text: `Payment submitted: ${response.data.paymentId}` });
      await loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Payment failed' });
    }
  };

  return (
    <div className="page-shell">
      <Navbar />
      <main className="content">
        <h2>Payments</h2>
        <form className="payment-form" onSubmit={submitPayment}>
          <label>From Account</label>
          <input value={accountNumber} readOnly />
          <label>Payee</label>
          <select value={form.toPayeeId} onChange={(e) => setForm({ ...form, toPayeeId: e.target.value })}>
            {payees.map((p) => <option key={p.payeeId} value={p.payeeId}>{p.name}</option>)}
          </select>
          <label>Amount</label>
          <input type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <label>Reference</label>
          <input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
          <label>Currency</label>
          <input value={form.currency} readOnly />
          <button type="submit">Submit Payment</button>
        </form>

        {message && <div className={message.type === 'success' ? 'success-banner' : 'error-banner'}>{message.text}</div>}

        <h3>Payment History</h3>
        <table>
          <thead>
            <tr><th>Time</th><th>Payment ID</th><th>Payee</th><th>Reference</th><th>Amount</th><th>Status</th></tr>
          </thead>
          <tbody>
            {history.map((h) => (
              <tr key={h.paymentId}>
                <td>{h.timestamp}</td>
                <td>{h.paymentId}</td>
                <td>{h.toPayeeId}</td>
                <td>{h.reference}</td>
                <td>EUR {Number(h.amount).toFixed(2)}</td>
                <td>{h.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </div>
  );
}
