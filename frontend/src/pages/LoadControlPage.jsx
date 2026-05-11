import { useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';

const FLOW_NAMES = ['LOGIN_FLOW', 'PAYMENT_FLOW', 'CARD_FLOW', 'ACCOUNT_FLOW', 'TRANSACTION_FLOW'];
const LOAD_API = 'http://10.235.21.132:8090';

export default function LoadControlPage() {
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  const refreshStatus = async () => {
    const response = await fetch(`${LOAD_API}/load/status`);
    const data = await response.json();
    setStatus(data);
  };

  useEffect(() => {
    refreshStatus().catch(console.error);
    const timer = setInterval(() => refreshStatus().catch(console.error), 5000);
    return () => clearInterval(timer);
  }, []);

  const postJson = async (path, body) => {
    setBusy(true);
    try {
      await fetch(`${LOAD_API}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined
      });
      await refreshStatus();
    } finally {
      setBusy(false);
    }
  };

  const activeFlowCount = useMemo(() => {
    if (!status?.flows_active) return 0;
    return Object.values(status.flows_active).filter(Boolean).length;
  }, [status]);

  const fmtUptime = (seconds) => {
    const s = Number(seconds || 0);
    const hh = String(Math.floor(s / 3600)).padStart(2, '0');
    const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  };

  return (
    <div className="page-shell">
      <Navbar />
      <main className="content load-grid">
        <section>
          <h2>Flow Controls</h2>
          <div className="control-actions">
            <button disabled={busy} onClick={() => postJson('/load/start', { flows: FLOW_NAMES })}>START ALL</button>
            <button disabled={busy} className="danger" onClick={() => postJson('/load/stop-all')}>STOP ALL</button>
          </div>
          {FLOW_NAMES.map((flow) => {
            const active = !!status?.flows_active?.[flow];
            return (
              <div className="flow-row" key={flow}>
                <strong>{flow}</strong>
                <span className={active ? 'pill active' : 'pill'}>{active ? 'ACTIVE' : 'INACTIVE'}</span>
                <button disabled={busy} onClick={() => postJson('/load/start', { flows: [flow] })}>ON</button>
                <button disabled={busy} onClick={() => postJson('/load/stop', { flows: [flow] })}>OFF</button>
              </div>
            );
          })}
          <button disabled={busy} onClick={() => postJson('/load/reset-metrics')} className="warn">Reset Metrics</button>
        </section>

        <section>
          <h2>Live Metrics</h2>
          <div className="metrics-grid">
            <MetricCard tone="green" label="Total Logins" value={status?.total_logins ?? 0} />
            <MetricCard tone="green" label="Total Payments" value={status?.total_payments_submitted ?? 0} />
            <MetricCard tone="green" label="Payments Last 10min" value={status?.payments_last_10_min_count ?? 0} />
            <MetricCard tone="green" label="Total Card Views" value={status?.total_card_views ?? 0} />

            <MetricCard tone="green" label="Successful Payments" value={status?.successful_payments ?? 0} />
            <MetricCard tone="amber" label="Failed Payments" value={status?.failed_payments ?? 0} />
            <MetricCard tone="green" label="Account Views" value={status?.total_account_views ?? 0} />
            <MetricCard tone="green" label="Transaction Views" value={status?.total_transaction_views ?? 0} />

            <MetricCard tone="blue" label="Avg Payment Latency (ms)" value={Number(status?.avg_payment_latency_ms ?? 0).toFixed(2)} />
            <MetricCard tone="blue" label="P95 Payment Latency (ms)" value={Number(status?.p95_payment_latency_ms ?? 0).toFixed(2)} />
            <MetricCard tone="blue" label="Avg Login Latency (ms)" value={Number(status?.avg_login_latency_ms ?? 0).toFixed(2)} />
            <MetricCard tone="blue" label="Avg Card Latency (ms)" value={Number(status?.avg_card_latency_ms ?? 0).toFixed(2)} />

            <MetricCard tone="purple" label="Distinct Users Logged In" value={status?.distinct_users_count ?? 0} />
            <MetricCard tone="purple" label="Distinct Card Customers" value={status?.distinct_card_customers_count ?? 0} />
            <MetricCard tone="purple" label="Uptime" value={fmtUptime(status?.uptime_seconds)} />
            <MetricCard tone="purple" label="Active Flows Count" value={activeFlowCount} />
          </div>
          <p className="note">These metrics are also exported to Prometheus at http://localhost:8090/metrics and can be visualised in Grafana.</p>
        </section>
      </main>
    </div>
  );
}

function MetricCard({ label, value, tone }) {
  return (
    <article className={`metric-card ${tone}`}>
      <h4>{label}</h4>
      <p>{value}</p>
    </article>
  );
}
