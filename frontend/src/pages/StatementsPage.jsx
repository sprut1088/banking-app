import { useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import {
  appendExportAudit,
  buildCsv,
  buildPdfMock,
  buildStatementDataset,
  getExportAudit
} from '../api/statementStore';

function downloadTextFile(fileName, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function StatementsPage() {
  const { auth } = useAuth();
  const [months, setMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [audit, setAudit] = useState([]);
  const [filters, setFilters] = useState({
    amountMin: '',
    amountMax: '',
    merchant: '',
    category: 'ALL',
    status: 'ALL'
  });

  useEffect(() => {
    const load = async () => {
      const [accountRes, cardRes] = await Promise.all([
        axiosClient.get(`/api/transactions/${auth.customerId}`),
        axiosClient.get(`/api/cards/${auth.customerId}/transactions`)
      ]);

      const dataset = buildStatementDataset(auth.customerId, accountRes.data, cardRes.data);
      setMonths(dataset);
      if (dataset.length > 0) {
        setSelectedMonth(dataset[0].monthKey);
      }
      setAudit(getExportAudit(auth.customerId));
    };

    load().catch(console.error);
  }, [auth.customerId]);

  const selected = useMemo(() => months.find((item) => item.monthKey === selectedMonth) || null, [months, selectedMonth]);

  const totals = useMemo(() => {
    const monthCount = months.length;
    const accountRecords = months.reduce((sum, item) => sum + item.accountCount, 0);
    const cardRecords = months.reduce((sum, item) => sum + item.cardCount, 0);
    const exported = audit.length;
    return { monthCount, accountRecords, cardRecords, exported };
  }, [months, audit]);

  const categories = useMemo(() => {
    if (!selected) {
      return [];
    }
    return [...new Set(selected.entries.map((item) => item.category))].sort();
  }, [selected]);

  const filteredEntries = useMemo(() => {
    if (!selected) {
      return [];
    }
    return selected.entries.filter((entry) => {
      const min = Number(filters.amountMin || 0);
      const max = Number(filters.amountMax || Number.MAX_SAFE_INTEGER);
      const amountOk = entry.amount >= min && entry.amount <= max;
      const merchantQuery = filters.merchant.trim().toLowerCase();
      const merchantOk = !merchantQuery || entry.merchant.toLowerCase().includes(merchantQuery);
      const categoryOk = filters.category === 'ALL' || entry.category === filters.category;
      const statusOk = filters.status === 'ALL' || entry.status === filters.status;
      return amountOk && merchantOk && categoryOk && statusOk;
    });
  }, [selected, filters]);

  const onExportCsv = () => {
    if (!selected) {
      return;
    }
    const csv = buildCsv(filteredEntries);
    downloadTextFile(`statement-${selected.monthKey}.csv`, csv, 'text/csv;charset=utf-8;');
    setAudit(appendExportAudit(auth.customerId, {
      monthKey: selected.monthKey,
      exportType: 'CSV',
      recordCount: filteredEntries.length
    }));
  };

  const onExportPdf = () => {
    if (!selected) {
      return;
    }
    const content = buildPdfMock(selected.monthLabel, filteredEntries);
    downloadTextFile(`statement-${selected.monthKey}.pdf.txt`, content, 'text/plain;charset=utf-8;');
    setAudit(appendExportAudit(auth.customerId, {
      monthKey: selected.monthKey,
      exportType: 'PDF_MOCK',
      recordCount: filteredEntries.length
    }));
  };

  const onResetFilters = () => {
    setFilters({
      amountMin: '',
      amountMax: '',
      merchant: '',
      category: 'ALL',
      status: 'ALL'
    });
  };

  return (
    <div className="page-shell">
      <Navbar />
      <main className="content">
        <section className="statement-hero page-hero">
          <h2>Statements and Export Center</h2>
          <p className="note">Monthly account and card statement history with filters and export actions.</p>
        </section>

        <section className="statement-kpi-grid">
          <article className="statement-kpi-card">
            <h4>Statement Months</h4>
            <p>{totals.monthCount}</p>
          </article>
          <article className="statement-kpi-card">
            <h4>Account Records</h4>
            <p>{totals.accountRecords}</p>
          </article>
          <article className="statement-kpi-card">
            <h4>Card Records</h4>
            <p>{totals.cardRecords}</p>
          </article>
          <article className="statement-kpi-card">
            <h4>Exports Logged</h4>
            <p>{totals.exported}</p>
          </article>
        </section>

        <section className="statement-months-panel">
          <h3>Monthly Statements</h3>
          <table>
            <thead>
              <tr><th>Month</th><th>Account Records</th><th>Card Records</th><th>Total Credit</th><th>Total Debit</th><th>Action</th></tr>
            </thead>
            <tbody>
              {months.map((month) => (
                <tr key={month.monthKey} className={selectedMonth === month.monthKey ? 'statement-row-selected' : ''}>
                  <td>{month.monthLabel}</td>
                  <td>{month.accountCount}</td>
                  <td>{month.cardCount}</td>
                  <td>EUR {month.totalCredit.toFixed(2)}</td>
                  <td>EUR {month.totalDebit.toFixed(2)}</td>
                  <td><button type="button" className="ui-btn--secondary" onClick={() => setSelectedMonth(month.monthKey)}>View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {selected && (
          <section className="statement-detail-panel">
            <div className="detail-row"><span>Selected Statement</span><strong>{selected.monthLabel}</strong></div>
            <div className="statement-month-summary">
              <span className="badge ok">Credit EUR {selected.totalCredit.toFixed(2)}</span>
              <span className="badge warn">Debit EUR {selected.totalDebit.toFixed(2)}</span>
              <span className="badge">Account {selected.accountCount}</span>
              <span className="badge">Card {selected.cardCount}</span>
              <span className="badge">Filtered {filteredEntries.length}</span>
            </div>

            <div className="statement-filter-grid">
              <input
                type="number"
                placeholder="Min amount"
                value={filters.amountMin}
                onChange={(event) => setFilters({ ...filters, amountMin: event.target.value })}
              />
              <input
                type="number"
                placeholder="Max amount"
                value={filters.amountMax}
                onChange={(event) => setFilters({ ...filters, amountMax: event.target.value })}
              />
              <input
                placeholder="Merchant contains"
                value={filters.merchant}
                onChange={(event) => setFilters({ ...filters, merchant: event.target.value })}
              />
              <select value={filters.category} onChange={(event) => setFilters({ ...filters, category: event.target.value })}>
                <option value="ALL">All Categories</option>
                {categories.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
                <option value="ALL">All Statuses</option>
                <option value="SUCCESS">SUCCESS</option>
                <option value="FAILED">FAILED</option>
              </select>
            </div>

            <div className="statement-export-actions">
              <button type="button" className="ui-btn--secondary" onClick={onResetFilters}>Reset Filters</button>
              <button type="button" onClick={onExportCsv}>Export CSV</button>
              <button type="button" className="ui-btn--secondary" onClick={onExportPdf}>Export PDF (Mock)</button>
            </div>

            <table>
              <thead>
                <tr><th>Date</th><th>Source</th><th>Merchant</th><th>Category</th><th>Status</th><th>Direction</th><th>Amount</th><th>Reference</th></tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry) => (
                  <tr key={entry.id} className={entry.direction === 'DEBIT' ? 'debit' : 'credit'}>
                    <td>{entry.date}</td>
                    <td>{entry.source}</td>
                    <td>{entry.merchant}</td>
                    <td>{entry.category}</td>
                    <td>{entry.status}</td>
                    <td>{entry.direction}</td>
                    <td>EUR {entry.amount.toFixed(2)}</td>
                    <td>{entry.reference}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        <section className="statement-audit-panel">
          <h3>Export Audit Log</h3>
          <table>
            <thead>
              <tr><th>Time</th><th>Month</th><th>Format</th><th>Records</th></tr>
            </thead>
            <tbody>
              {audit.length === 0 && <tr><td colSpan="4">No exports yet.</td></tr>}
              {audit.map((item) => (
                <tr key={item.id}>
                  <td>{new Date(item.timestamp).toLocaleString()}</td>
                  <td>{item.monthKey}</td>
                  <td>{item.exportType}</td>
                  <td>{item.recordCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}
