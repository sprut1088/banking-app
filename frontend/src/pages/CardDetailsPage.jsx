import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';

export default function CardDetailsPage() {
  const { auth } = useAuth();
  const [card, setCard] = useState(null);

  useEffect(() => {
    axiosClient.get(`/api/cards/${auth.customerId}`).then((res) => setCard(res.data));
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
      </main>
    </div>
  );
}
