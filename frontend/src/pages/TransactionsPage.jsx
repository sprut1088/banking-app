import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';

export default function TransactionsPage() {
  const { auth } = useAuth();
  const [items, setItems] = useState([]);

  useEffect(() => {
    axiosClient.get(`/api/transactions/${auth.customerId}`).then((res) => setItems(res.data));
  }, [auth.customerId]);

  return (
    <div className="page-shell">
      <Navbar />
      <main className="content">
        <h2>Transactions ({items.length})</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th><th>Description</th><th>Reference</th><th>Type</th><th>Amount</th><th>Balance After</th>
            </tr>
          </thead>
          <tbody>
            {items.map((tx) => (
              <tr key={tx.transactionId} className={tx.type === 'DEBIT' ? 'debit' : 'credit'}>
                <td>{tx.date}</td>
                <td>{tx.description}</td>
                <td>{tx.reference}</td>
                <td>{tx.type}</td>
                <td>EUR {Number(tx.amount).toFixed(2)}</td>
                <td>EUR {Number(tx.balanceAfter).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </div>
  );
}
