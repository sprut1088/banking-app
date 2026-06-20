import Navbar from '../components/Navbar';
import { Card } from '../components/ui';

export default function SupportPage() {
  return (
    <div className="page-shell">
      <Navbar />
      <main className="content">
        <Card title="Support Hub" subtitle="Get help for payments, cards, onboarding, and incident escalation.">
          <p className="note">This section is intentionally lightweight now and serves as the global support entry point for demo flows.</p>
          <div className="details">
            <div className="detail-row"><span>Payments Helpdesk</span><strong>support-payments@banking.demo</strong></div>
            <div className="detail-row"><span>Card Operations</span><strong>support-cards@banking.demo</strong></div>
            <div className="detail-row"><span>SRE Hotline</span><strong>+00 1234 5678</strong></div>
            <div className="detail-row"><span>Case Status Portal</span><strong className="badge ok">Available</strong></div>
          </div>
        </Card>
      </main>
    </div>
  );
}
