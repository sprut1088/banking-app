import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';

export default function PaymentPage() {
  const { auth } = useAuth();
  const [payees, setPayees] = useState([]);
  const [history, setHistory] = useState([]);
  const [card, setCard] = useState(null);
  const [accountNumber, setAccountNumber] = useState('');
  const [form, setForm] = useState({
    toPayeeId: 'PAY001',
    amount: '25.00',
    reference: 'Monthly payment',
    currency: 'EUR',
    paymentRail: 'ACCOUNT',
    settlementType: 'INSTANT'
  });
  const [message, setMessage] = useState(null);

  const loadData = async () => {
    const [payeeRes, historyRes, accountRes, cardRes] = await Promise.all([
      axiosClient.get('/api/payments/payees'),
      axiosClient.get(`/api/payments/${auth.customerId}/history`),
      axiosClient.get(`/api/accounts/${auth.customerId}`),
      axiosClient.get(`/api/cards/${auth.customerId}`)
    ]);
    setPayees(payeeRes.data);
    setHistory(historyRes.data);
    setAccountNumber(accountRes.data.accountNumber);
    setCard(cardRes.data);
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
        currency: form.currency,
        paymentRail: form.paymentRail,
        settlementType: form.settlementType
      });
      const outcome = response.data.status === 'SUCCESS' ? 'success' : 'error';
      setMessage({
        type: outcome,
        text: `${response.data.status}: ${response.data.message} (${response.data.paymentId})`
      });
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
        <p className="note">Demo failure shortcuts: set reference including "FAIL", or submit SEPA payments above EUR 2000.</p>
        <form className="payment-form" onSubmit={submitPayment}>
          <label>From Account</label>
          <input value={accountNumber} readOnly />

          <label>Payment Rail</label>
          <select value={form.paymentRail} onChange={(e) => setForm({ ...form, paymentRail: e.target.value })}>
            <option value="ACCOUNT">ACCOUNT</option>
            <option value="CARD">CARD</option>
          </select>

          <label>Settlement Type</label>
          <select value={form.settlementType} onChange={(e) => setForm({ ...form, settlementType: e.target.value })}>
            <option value="INSTANT">INSTANT</option>
            <option value="SEPA">SEPA</option>
          </select>

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

          <label>Available Card Credit</label>
          <input value={card ? `EUR ${Number(card.availableCredit).toFixed(2)}` : 'Loading...'} readOnly />
          <button type="submit">Submit Payment</button>
        </form>

        {message && <div className={message.type === 'success' ? 'success-banner' : 'error-banner'}>{message.text}</div>}

        <h3>Payment History</h3>
        <table>
          <thead>
            <tr><th>Time</th><th>Payment ID</th><th>Rail</th><th>Mode</th><th>Payee</th><th>Reference</th><th>Amount</th><th>Status</th><th>Failure Reason</th></tr>
          </thead>
          <tbody>
            {history.map((h) => (
              <tr key={h.paymentId} className={h.status === 'FAILED' ? 'debit' : 'credit'}>
                <td>{h.timestamp}</td>
                <td>{h.paymentId}</td>
                <td>{h.paymentRail || 'ACCOUNT'}</td>
                <td>{h.settlementType || 'INSTANT'}</td>
                <td>{h.toPayeeId}</td>
                <td>{h.reference}</td>
                <td>EUR {Number(h.amount).toFixed(2)}</td>
                <td>{h.status}</td>
                <td>{h.failureReason || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </div>
  );
}
