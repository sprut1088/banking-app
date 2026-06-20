import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';

export default function CardDetailsPage() {
  const { auth } = useAuth();
  const [card, setCard] = useState(null);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    Promise.all([
      axiosClient.get(`/api/cards/${auth.customerId}`),
      axiosClient.get(`/api/cards/${auth.customerId}/transactions`)
    ]).then(([cardRes, transactionRes]) => {
      setCard(cardRes.data);
      setTransactions(transactionRes.data);
    });
  }, [auth.customerId]);

  if (!card) return <div className="page-shell"><Navbar /><main className="content">Loading...</main></div>;

  return (
    <div className="page-shell">
      <Navbar />
      <main className="content">
        <h2>Card Details</h2>
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
        <div className="detail-row"><span>CVV</span><strong title="For security reasons only hint is shown">{card.cvvHint}</strong></div>

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
