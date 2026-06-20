import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import {
  createVirtualCard,
  deleteVirtualCard,
  getCardControlState,
  setCardChannel,
  setCardLimits,
  setCardLockStatus
} from '../api/cardControlStore';

export default function CardDetailsPage() {
  const { auth } = useAuth();
  const [card, setCard] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [controls, setControls] = useState(null);
  const [limits, setLimits] = useState({ daily: '', weekly: '', monthly: '' });

  useEffect(() => {
    Promise.all([
      axiosClient.get(`/api/cards/${auth.customerId}`),
      axiosClient.get(`/api/cards/${auth.customerId}/transactions`)
    ]).then(([cardRes, transactionRes]) => {
      setCard(cardRes.data);
      setTransactions(transactionRes.data);
      const state = getCardControlState(auth.customerId, cardRes.data);
      setControls(state);
      setLimits({
        daily: String(state.limits.daily),
        weekly: String(state.limits.weekly),
        monthly: String(state.limits.monthly)
      });
    });
  }, [auth.customerId]);

  const onToggleLock = () => {
    if (!card || !controls) {
      return;
    }
    const next = setCardLockStatus(auth.customerId, card, controls.lockStatus === 'LOCKED' ? 'UNLOCKED' : 'LOCKED');
    setControls(next);
  };

  const onToggleChannel = (channel) => {
    if (!card || !controls) {
      return;
    }
    const next = setCardChannel(auth.customerId, card, channel, !controls.channels[channel]);
    setControls(next);
  };

  const onSaveLimits = (event) => {
    event.preventDefault();
    if (!card) {
      return;
    }
    const next = setCardLimits(auth.customerId, card, limits);
    setControls(next);
  };

  const onCreateVirtualCard = () => {
    if (!card) {
      return;
    }
    const next = createVirtualCard(auth.customerId, card);
    setControls(next);
  };

  const onDeleteVirtualCard = (virtualCardId) => {
    if (!card) {
      return;
    }
    const next = deleteVirtualCard(auth.customerId, card, virtualCardId);
    setControls(next);
  };

  if (!card || !controls) return <div className="page-shell"><Navbar /><main className="content">Loading...</main></div>;

  return (
    <div className="page-shell">
      <Navbar />
      <main className="content">
        <section className="page-hero">
          <h2>Card Details</h2>
          <p className="note">Review card profile, controls, virtual cards, and audit trail in one place.</p>
        </section>
        <div className="bank-card">
          <div className="chip" />
          <div className="card-number">{card.maskedCardNumber}</div>
          <div className="card-meta">
            <span>{card.cardHolderName}</span>
            <span>{card.expiryDate}</span>
            <span>{card.cardType}</span>
          </div>
        </div>
        <div className="detail-row"><span>Credit Limit</span><strong>EUR {Number(card.creditLimit).toFixed(2)}</strong></div>
        <div className="detail-row"><span>Available Credit</span><strong>EUR {Number(card.availableCredit).toFixed(2)}</strong></div>
        <div className="detail-row"><span>Status</span><strong className={card.status === 'ACTIVE' ? 'badge ok' : 'badge warn'}>{card.status}</strong></div>
        <div className="detail-row"><span>Control Lock</span><strong className={controls.lockStatus === 'LOCKED' ? 'badge warn' : 'badge ok'}>{controls.lockStatus}</strong></div>
        <div className="detail-row"><span>CVV</span><strong title="For security reasons only hint is shown">{card.cvvHint}</strong></div>

        <section className="card-control-panel">
          <h3>Card Management Console</h3>
          <p className="note">Control lock status, channel permissions, limits, and virtual cards.</p>

          <div className="card-control-grid">
            <div className="detail-row"><span>Card Lock / Unlock</span><button type="button" onClick={onToggleLock}>{controls.lockStatus === 'LOCKED' ? 'Unlock Card' : 'Lock Card'}</button></div>
            <div className="detail-row"><span>ATM Channel</span><button type="button" className="ui-btn--secondary" onClick={() => onToggleChannel('ATM')}>{controls.channels.ATM ? 'Disable' : 'Enable'}</button></div>
            <div className="detail-row"><span>Ecommerce Channel</span><button type="button" className="ui-btn--secondary" onClick={() => onToggleChannel('ECOMMERCE')}>{controls.channels.ECOMMERCE ? 'Disable' : 'Enable'}</button></div>
            <div className="detail-row"><span>POS Channel</span><button type="button" className="ui-btn--secondary" onClick={() => onToggleChannel('POS')}>{controls.channels.POS ? 'Disable' : 'Enable'}</button></div>
          </div>

          <form className="card-limit-form" onSubmit={onSaveLimits}>
            <label>Daily Limit</label>
            <input type="number" min="0" step="0.01" value={limits.daily} onChange={(event) => setLimits({ ...limits, daily: event.target.value })} required />
            <label>Weekly Limit</label>
            <input type="number" min="0" step="0.01" value={limits.weekly} onChange={(event) => setLimits({ ...limits, weekly: event.target.value })} required />
            <label>Monthly Limit</label>
            <input type="number" min="0" step="0.01" value={limits.monthly} onChange={(event) => setLimits({ ...limits, monthly: event.target.value })} required />
            <button type="submit">Save Limits</button>
          </form>

          <div className="detail-row"><span>Spent / Daily</span><strong>EUR {Number(controls.spent.daily).toFixed(2)} / {Number(controls.limits.daily).toFixed(2)}</strong></div>
          <div className="detail-row"><span>Spent / Weekly</span><strong>EUR {Number(controls.spent.weekly).toFixed(2)} / {Number(controls.limits.weekly).toFixed(2)}</strong></div>
          <div className="detail-row"><span>Spent / Monthly</span><strong>EUR {Number(controls.spent.monthly).toFixed(2)} / {Number(controls.limits.monthly).toFixed(2)}</strong></div>
        </section>

        <section className="virtual-card-panel">
          <div className="panel-header-row">
            <h3>Virtual Cards</h3>
            <button type="button" className="ui-btn--secondary" onClick={onCreateVirtualCard}>Create Virtual Card</button>
          </div>
          <p className="note">Use disposable cards for safer online spending.</p>
          <table>
            <thead>
              <tr><th>Virtual Card ID</th><th>Masked Number</th><th>Status</th><th>Created</th><th>Action</th></tr>
            </thead>
            <tbody>
              {controls.virtualCards.length === 0 && (
                <tr><td colSpan="5">No virtual cards created yet.</td></tr>
              )}
              {controls.virtualCards.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.maskedNumber}</td>
                  <td>{item.status}</td>
                  <td>{new Date(item.createdAt).toLocaleString()}</td>
                  <td><button type="button" className="danger" onClick={() => onDeleteVirtualCard(item.id)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="audit-panel">
          <h3>Card Control Audit Trail</h3>
          <table>
            <thead>
              <tr><th>Time</th><th>Action</th><th>Payload</th></tr>
            </thead>
            <tbody>
              {controls.auditTrail.length === 0 && <tr><td colSpan="3">No control updates captured yet.</td></tr>}
              {controls.auditTrail.map((item) => (
                <tr key={item.id}>
                  <td>{new Date(item.timestamp).toLocaleString()}</td>
                  <td>{item.action}</td>
                  <td><code>{JSON.stringify(item.payload)}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <h3>Card Transactions</h3>
        <table>
          <thead>
            <tr>
              <th>Time</th><th>Payee</th><th>Reference</th><th>Mode</th><th>Amount</th><th>Status</th><th>Available Credit</th><th>Failure Reason</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.cardTransactionId} className={tx.status === 'FAILED' ? 'debit' : 'credit'}>
                <td>{tx.timestamp}</td>
                <td>{tx.payeeId}</td>
                <td>{tx.reference}</td>
                <td>{tx.settlementType}</td>
                <td>EUR {Number(tx.amount).toFixed(2)}</td>
                <td>{tx.status}</td>
                <td>EUR {Number(tx.availableCreditAfter).toFixed(2)}</td>
                <td>{tx.failureReason || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </div>
  );
}
