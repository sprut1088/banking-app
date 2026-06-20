import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui';

export default function DashboardPage() {
  const { auth } = useAuth();
  const [summary, setSummary] = useState({ balance: '-', txCount: '-', cardStatus: '-', payees: '-' });

  useEffect(() => {
    const run = async () => {
      try {
        const [account, txs, card, payees] = await Promise.all([
          axiosClient.get(`/api/accounts/${auth.customerId}`),
          axiosClient.get(`/api/transactions/${auth.customerId}`),
          axiosClient.get(`/api/cards/${auth.customerId}`),
          axiosClient.get('/api/payments/payees')
        ]);
        setSummary({
          balance: `EUR ${Number(account.data.balance).toFixed(2)}`,
          txCount: txs.data.length,
          cardStatus: card.data.status,
          payees: payees.data.length
        });
      } catch (e) {
        console.error(e);
      }
    };
    run();
  }, [auth.customerId]);

  return (
    <div className="page-shell">
      <Navbar />
      <main className="content">
        <h2>Welcome, {auth.customerName}</h2>
        <div className="card-grid">
          <Card className="info-card" title="Account Balance"><p>{summary.balance}</p></Card>
          <Card className="info-card" title="Recent Transactions"><p>{summary.txCount}</p></Card>
          <Card className="info-card" title="Card Status"><p>{summary.cardStatus}</p></Card>
          <Card className="info-card" title="Quick Pay"><p>{summary.payees} Payees Ready</p></Card>
        </div>
      </main>
    </div>
  );
}
