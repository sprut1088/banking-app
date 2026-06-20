import Navbar from '../components/Navbar';
import { Card } from '../components/ui';

export default function SecurityPage() {
  return (
    <div className="page-shell">
      <Navbar />
      <main className="content">
        <Card title="Security Center" subtitle="Harden account access and monitor authentication posture.">
          <p className="note">This starter page establishes the Information Architecture section for future P5/P7 security features.</p>
          <div className="details">
            <div className="detail-row"><span>Two-factor Authentication</span><strong className="badge ok">Enabled</strong></div>
            <div className="detail-row"><span>Last Password Rotation</span><strong>2026-05-28</strong></div>
            <div className="detail-row"><span>Trusted Devices</span><strong>3</strong></div>
            <div className="detail-row"><span>Suspicious Login Alerts</span><strong className="badge">Active</strong></div>
          </div>
        </Card>
      </main>
    </div>
  );
}
