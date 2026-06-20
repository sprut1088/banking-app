import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import { getCustomerProfile, getPaymentEligibility } from '../api/customerProfileStore';
import {
  createBeneficiary,
  deleteBeneficiary,
  getBeneficiaries,
  updateBeneficiary
} from '../api/beneficiaryStore';
import {
  cancelScheduledTransfer,
  getScheduledTransfers,
  upsertScheduledTransfer
} from '../api/transferScheduleStore';
import {
  evaluateCardAuthorization,
  getCardControlState,
  registerCardSpend
} from '../api/cardControlStore';

export default function PaymentPage() {
  const { auth } = useAuth();
  const location = useLocation();
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [apiPayeeIds, setApiPayeeIds] = useState([]);
  const [history, setHistory] = useState([]);
  const [card, setCard] = useState(null);
  const [accountNumber, setAccountNumber] = useState('');
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    toPayeeId: 'PAY001',
    amount: '25.00',
    reference: 'Monthly payment',
    currency: 'EUR',
    paymentRail: 'ACCOUNT',
    settlementType: 'INSTANT',
    cardChannel: 'ECOMMERCE'
  });
  const [message, setMessage] = useState(null);
  const [beneficiaryFilter, setBeneficiaryFilter] = useState({
    query: '',
    status: 'ALL',
    country: 'ALL'
  });
  const [beneficiaryForm, setBeneficiaryForm] = useState({
    beneficiaryId: null,
    name: '',
    alias: '',
    iban: '',
    accountNumber: '',
    bankCode: '',
    country: 'DE',
    riskFlag: 'LOW',
    verificationStatus: 'PENDING'
  });
  const [transferPlan, setTransferPlan] = useState({
    transferType: 'DOMESTIC_EXTERNAL',
    scheduleMode: 'NOW',
    scheduledDate: '',
    recurrence: 'WEEKLY',
    transferId: null
  });
  const [scheduledTransfers, setScheduledTransfers] = useState([]);

  const loadData = async () => {
    const [payeeRes, historyRes, accountRes, cardRes] = await Promise.all([
      axiosClient.get('/api/payments/payees'),
      axiosClient.get(`/api/payments/${auth.customerId}/history`),
      axiosClient.get(`/api/accounts/${auth.customerId}`),
      axiosClient.get(`/api/cards/${auth.customerId}`)
    ]);
    const resolvedBeneficiaries = getBeneficiaries(auth.customerId, payeeRes.data);
    setBeneficiaries(resolvedBeneficiaries);
    setApiPayeeIds(payeeRes.data.map((item) => item.payeeId));
    setHistory(historyRes.data);
    setAccountNumber(accountRes.data.accountNumber);
    setCard(cardRes.data);
    setProfile(getCustomerProfile({
      customerId: auth.customerId,
      customerName: accountRes.data.accountHolderName,
      residencyCountry: 'DE'
    }));
    setScheduledTransfers(getScheduledTransfers(auth.customerId));
  };

  useEffect(() => {
    loadData().catch(console.error);
  }, [auth.customerId]);

  const submitPayment = async (e) => {
    e.preventDefault();
    setMessage(null);

    const eligibility = getPaymentEligibility(profile);
    if (!eligibility.canSubmit) {
      setMessage({ type: 'error', text: eligibility.reason });
      return;
    }

    if (form.settlementType === 'SEPA' && !eligibility.sepaEnabled) {
      setMessage({ type: 'error', text: 'SEPA is not eligible for current KYC/risk state. Choose INSTANT settlement.' });
      return;
    }

    const selected = beneficiaries.find((item) => item.beneficiaryId === form.toPayeeId || item.payeeId === form.toPayeeId);
    if (!selected) {
      setMessage({ type: 'error', text: 'Selected beneficiary was not found. Please refresh and try again.' });
      return;
    }

    if (selected.verificationStatus === 'BLOCKED') {
      setMessage({ type: 'error', text: `Beneficiary ${selected.alias || selected.name} is BLOCKED and cannot be used for payments.` });
      return;
    }

    if (selected.verificationStatus === 'PENDING') {
      setMessage({ type: 'error', text: `Beneficiary ${selected.alias || selected.name} is PENDING verification. Complete verification before initiating payment.` });
      return;
    }

    if (!apiPayeeIds.includes(selected.payeeId)) {
      setMessage({ type: 'error', text: 'Custom beneficiary is saved locally but not onboarded in backend payee registry yet.' });
      return;
    }

    if (form.paymentRail === 'CARD') {
      const controlState = getCardControlState(auth.customerId, card);
      const decision = evaluateCardAuthorization(controlState, Number(form.amount), form.cardChannel || 'ECOMMERCE');
      if (!decision.allowed) {
        setMessage({ type: 'error', text: `Card authorization rejected: ${decision.reason}` });
        return;
      }
    }

    if (isTransferView && transferPlan.scheduleMode !== 'NOW') {
      const next = upsertScheduledTransfer(auth.customerId, {
        transferId: transferPlan.transferId,
        transferType: transferPlan.transferType,
        scheduleMode: transferPlan.scheduleMode,
        scheduledDate: transferPlan.scheduledDate,
        recurrence: transferPlan.recurrence,
        toPayeeId: selected.payeeId,
        alias: selected.alias,
        amount: Number(form.amount),
        reference: form.reference,
        currency: form.currency,
        settlementType: form.settlementType,
        paymentRail: form.paymentRail
      });
      setScheduledTransfers(next);
      setTransferPlan({
        transferType: 'DOMESTIC_EXTERNAL',
        scheduleMode: 'NOW',
        scheduledDate: '',
        recurrence: 'WEEKLY',
        transferId: null
      });
      setMessage({
        type: 'success',
        text: transferPlan.transferId ? 'Scheduled transfer updated successfully.' : 'Transfer scheduled successfully.'
      });
      return;
    }

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
      if (response.data.status === 'SUCCESS' && form.paymentRail === 'CARD') {
        registerCardSpend(auth.customerId, card, Number(form.amount), form.cardChannel || 'ECOMMERCE');
      }
      await loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Payment failed' });
    }
  };

  const isTransferView = location.pathname === '/transfers';
  const title = isTransferView ? 'Transfers' : 'Payments';
  const submitLabel = isTransferView ? 'Submit Transfer' : 'Submit Payment';
  const eligibility = getPaymentEligibility(profile);
  const selectedBeneficiary = beneficiaries.find((item) => item.beneficiaryId === form.toPayeeId || item.payeeId === form.toPayeeId);

  const filteredBeneficiaries = useMemo(() => {
    return beneficiaries.filter((item) => {
      const query = beneficiaryFilter.query.trim().toLowerCase();
      const matchesQuery = !query
        || item.name.toLowerCase().includes(query)
        || item.alias.toLowerCase().includes(query)
        || item.beneficiaryId.toLowerCase().includes(query);
      const matchesStatus = beneficiaryFilter.status === 'ALL' || item.verificationStatus === beneficiaryFilter.status;
      const matchesCountry = beneficiaryFilter.country === 'ALL' || item.country === beneficiaryFilter.country;
      return matchesQuery && matchesStatus && matchesCountry;
    });
  }, [beneficiaries, beneficiaryFilter]);

  const countryOptions = useMemo(() => {
    const set = new Set(beneficiaries.map((item) => item.country));
    return [...set].sort();
  }, [beneficiaries]);

  const onEditBeneficiary = (beneficiary) => {
    setBeneficiaryForm({
      beneficiaryId: beneficiary.beneficiaryId,
      name: beneficiary.name,
      alias: beneficiary.alias,
      iban: beneficiary.iban,
      accountNumber: beneficiary.accountNumber,
      bankCode: beneficiary.bankCode,
      country: beneficiary.country,
      riskFlag: beneficiary.riskFlag,
      verificationStatus: beneficiary.verificationStatus
    });
  };

  const resetBeneficiaryForm = () => {
    setBeneficiaryForm({
      beneficiaryId: null,
      name: '',
      alias: '',
      iban: '',
      accountNumber: '',
      bankCode: '',
      country: 'DE',
      riskFlag: 'LOW',
      verificationStatus: 'PENDING'
    });
  };

  const onSubmitBeneficiary = (event) => {
    event.preventDefault();
    setMessage(null);

    if (beneficiaryForm.beneficiaryId) {
      const next = updateBeneficiary(auth.customerId, beneficiaryForm.beneficiaryId, {
        ...beneficiaryForm,
        payeeId: beneficiaryForm.beneficiaryId
      });
      setBeneficiaries(next);
      setMessage({ type: 'success', text: 'Beneficiary updated successfully.' });
      return;
    }

    const result = createBeneficiary(auth.customerId, beneficiaryForm);
    setBeneficiaries(result.all);
    setForm((prev) => ({ ...prev, toPayeeId: result.created.beneficiaryId }));
    resetBeneficiaryForm();
    setMessage({ type: 'success', text: 'Beneficiary created. Verify and onboard before payment submission.' });
  };

  const onDeleteBeneficiary = (beneficiaryId) => {
    const next = deleteBeneficiary(auth.customerId, beneficiaryId);
    setBeneficiaries(next);
    if (form.toPayeeId === beneficiaryId && next.length > 0) {
      setForm((prev) => ({ ...prev, toPayeeId: next[0].beneficiaryId }));
    }
    setMessage({ type: 'success', text: 'Beneficiary deleted.' });
  };

  const onQuickStatusChange = (beneficiaryId, verificationStatus) => {
    const next = updateBeneficiary(auth.customerId, beneficiaryId, { verificationStatus });
    setBeneficiaries(next);
    setMessage({ type: 'success', text: `Beneficiary status changed to ${verificationStatus}.` });
  };

  const transferPreview = useMemo(() => {
    const amount = Number(form.amount || 0);
    if (!isTransferView || amount <= 0) {
      return null;
    }

    const feeRates = {
      OWN_ACCOUNT: 0,
      DOMESTIC_EXTERNAL: 0.0025,
      INTERNATIONAL_MOCK: 0.008
    };
    const fixedFees = {
      OWN_ACCOUNT: 0,
      DOMESTIC_EXTERNAL: 0.35,
      INTERNATIONAL_MOCK: 2.5
    };

    const variable = amount * (feeRates[transferPlan.transferType] ?? 0);
    const fee = Number((variable + (fixedFees[transferPlan.transferType] ?? 0)).toFixed(2));
    const total = Number((amount + fee).toFixed(2));

    let eta = 'Within seconds';
    if (transferPlan.scheduleMode === 'FUTURE_DATE') {
      eta = transferPlan.scheduledDate ? `Executes on ${transferPlan.scheduledDate}` : 'Choose a schedule date';
    } else if (transferPlan.scheduleMode === 'RECURRING_TEMPLATE') {
      eta = `Recurring (${transferPlan.recurrence}) from ${transferPlan.scheduledDate || 'selected start date'}`;
    } else if (form.settlementType === 'SEPA') {
      eta = 'By next banking day';
    }

    return {
      fee,
      total,
      eta
    };
  }, [form.amount, form.settlementType, isTransferView, transferPlan]);

  const onEditScheduledTransfer = (item) => {
    setTransferPlan({
      transferType: item.transferType,
      scheduleMode: item.scheduleMode,
      scheduledDate: item.scheduledDate,
      recurrence: item.recurrence,
      transferId: item.transferId
    });
    setForm((prev) => ({
      ...prev,
      toPayeeId: item.toPayeeId,
      amount: String(item.amount),
      reference: item.reference,
      settlementType: item.settlementType,
      paymentRail: item.paymentRail
    }));
    setMessage({ type: 'success', text: `Editing scheduled transfer ${item.transferId}.` });
  };

  const onCancelScheduledTransfer = (transferId) => {
    const next = cancelScheduledTransfer(auth.customerId, transferId);
    setScheduledTransfers(next);
    setMessage({ type: 'success', text: `Scheduled transfer ${transferId} cancelled.` });
  };

  return (
    <div className="page-shell">
      <Navbar />
      <main className="content">
        <section className="page-hero">
          <h2>{title}</h2>
          <p className="note">Initiate payments or transfers, validate recipient readiness, and review execution history.</p>
        </section>
        {profile && (
          <section className="eligibility-banner">
            <div className="eligibility-header">
              <span className="badge">KYC {profile.kycLevel}</span>
              <span className={profile.verificationStatus === 'VERIFIED' ? 'badge ok' : 'badge warn'}>{profile.verificationStatus}</span>
              <span className={profile.riskBand === 'LOW' ? 'badge ok' : 'badge warn'}>Risk {profile.riskBand}</span>
              <span className="badge">Residency {profile.residencyCountry}</span>
            </div>
            <p className="note">Eligibility: Instant {eligibility.instantEnabled ? 'enabled' : 'disabled'} | SEPA {eligibility.sepaEnabled ? 'enabled' : 'disabled'}.</p>
            <p className="note">{eligibility.reason}</p>
          </section>
        )}
        <p className="note">Demo failure shortcuts: set reference including "FAIL", or submit SEPA payments above EUR 2000.</p>
        <form className="payment-form" onSubmit={submitPayment}>
          <label>From Account</label>
          <input value={accountNumber} readOnly />

          <label>Payment Rail</label>
          <select value={form.paymentRail} onChange={(e) => setForm({ ...form, paymentRail: e.target.value })}>
            <option value="ACCOUNT">ACCOUNT</option>
            <option value="CARD">CARD</option>
          </select>

          {form.paymentRail === 'CARD' && (
            <>
              <label>Card Channel</label>
              <select value={form.cardChannel} onChange={(event) => setForm({ ...form, cardChannel: event.target.value })}>
                <option value="ECOMMERCE">ECOMMERCE</option>
                <option value="POS">POS</option>
                <option value="ATM">ATM</option>
              </select>
            </>
          )}

          <label>Settlement Type</label>
          <select value={form.settlementType} onChange={(e) => setForm({ ...form, settlementType: e.target.value })}>
            <option value="INSTANT">INSTANT</option>
            <option value="SEPA" disabled={!eligibility.sepaEnabled}>SEPA</option>
          </select>

          {isTransferView && (
            <>
              <label>Transfer Type</label>
              <select value={transferPlan.transferType} onChange={(event) => setTransferPlan({ ...transferPlan, transferType: event.target.value })}>
                <option value="OWN_ACCOUNT">Own Account</option>
                <option value="DOMESTIC_EXTERNAL">Domestic External</option>
                <option value="INTERNATIONAL_MOCK">International Mock</option>
              </select>

              <label>Schedule</label>
              <select value={transferPlan.scheduleMode} onChange={(event) => setTransferPlan({ ...transferPlan, scheduleMode: event.target.value })}>
                <option value="NOW">Now</option>
                <option value="FUTURE_DATE">Future Date</option>
                <option value="RECURRING_TEMPLATE">Recurring Template</option>
              </select>

              {transferPlan.scheduleMode !== 'NOW' && (
                <>
                  <label>Scheduled Date</label>
                  <input type="date" value={transferPlan.scheduledDate} onChange={(event) => setTransferPlan({ ...transferPlan, scheduledDate: event.target.value })} required />
                </>
              )}

              {transferPlan.scheduleMode === 'RECURRING_TEMPLATE' && (
                <>
                  <label>Recurrence</label>
                  <select value={transferPlan.recurrence} onChange={(event) => setTransferPlan({ ...transferPlan, recurrence: event.target.value })}>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                  </select>
                </>
              )}
            </>
          )}

          <label>Payee</label>
          <select value={form.toPayeeId} onChange={(e) => setForm({ ...form, toPayeeId: e.target.value })}>
            {beneficiaries.map((item) => (
              <option key={item.beneficiaryId} value={item.beneficiaryId}>
                {item.alias} ({item.verificationStatus})
              </option>
            ))}
          </select>
          <label>Amount</label>
          <input type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <label>Reference</label>
          <input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
          <label>Currency</label>
          <input value={form.currency} readOnly />

          <label>Available Card Credit</label>
          <input value={card ? `EUR ${Number(card.availableCredit).toFixed(2)}` : 'Loading...'} readOnly />
          <button type="submit" disabled={!eligibility.canSubmit}>{submitLabel}</button>
        </form>

        {isTransferView && transferPreview && (
          <section className="transfer-preview">
            <h3>Transfer Preview</h3>
            <div className="preview-grid">
              <div className="detail-row"><span>Beneficiary</span><strong>{selectedBeneficiary?.alias || '-'}</strong></div>
              <div className="detail-row"><span>Fee Estimate</span><strong>EUR {transferPreview.fee.toFixed(2)}</strong></div>
              <div className="detail-row"><span>Total Debit</span><strong>EUR {transferPreview.total.toFixed(2)}</strong></div>
              <div className="detail-row"><span>Execution ETA</span><strong>{transferPreview.eta}</strong></div>
            </div>
          </section>
        )}

        {message && <div className={message.type === 'success' ? 'success-banner' : 'error-banner'}>{message.text}</div>}

        <section className="beneficiary-panel">
          <h3>Beneficiaries and Payees</h3>
          <p className="note">Manage trusted recipients with verification workflow, risk flags, and country-based filtering.</p>

          <form className="beneficiary-form" onSubmit={onSubmitBeneficiary}>
            <label>Name</label>
            <input value={beneficiaryForm.name} onChange={(event) => setBeneficiaryForm({ ...beneficiaryForm, name: event.target.value })} required />

            <label>Alias</label>
            <input value={beneficiaryForm.alias} onChange={(event) => setBeneficiaryForm({ ...beneficiaryForm, alias: event.target.value })} required />

            <label>IBAN</label>
            <input value={beneficiaryForm.iban} onChange={(event) => setBeneficiaryForm({ ...beneficiaryForm, iban: event.target.value })} required />

            <label>Account Number</label>
            <input value={beneficiaryForm.accountNumber} onChange={(event) => setBeneficiaryForm({ ...beneficiaryForm, accountNumber: event.target.value })} required />

            <label>Bank Code</label>
            <input value={beneficiaryForm.bankCode} onChange={(event) => setBeneficiaryForm({ ...beneficiaryForm, bankCode: event.target.value })} required />

            <label>Country</label>
            <select value={beneficiaryForm.country} onChange={(event) => setBeneficiaryForm({ ...beneficiaryForm, country: event.target.value })}>
              <option value="DE">DE</option>
              <option value="NL">NL</option>
              <option value="FR">FR</option>
              <option value="ES">ES</option>
              <option value="IE">IE</option>
            </select>

            <label>Risk Flag</label>
            <select value={beneficiaryForm.riskFlag} onChange={(event) => setBeneficiaryForm({ ...beneficiaryForm, riskFlag: event.target.value })}>
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
            </select>

            <label>Verification Status</label>
            <select value={beneficiaryForm.verificationStatus} onChange={(event) => setBeneficiaryForm({ ...beneficiaryForm, verificationStatus: event.target.value })}>
              <option value="PENDING">PENDING</option>
              <option value="VERIFIED">VERIFIED</option>
              <option value="BLOCKED">BLOCKED</option>
            </select>

            <div className="beneficiary-actions">
              <button type="submit">{beneficiaryForm.beneficiaryId ? 'Update Beneficiary' : 'Create Beneficiary'}</button>
              <button type="button" className="ui-btn--secondary" onClick={resetBeneficiaryForm}>Reset</button>
            </div>
          </form>

          <div className="beneficiary-filters">
            <input
              placeholder="Search by name, alias or beneficiary id"
              value={beneficiaryFilter.query}
              onChange={(event) => setBeneficiaryFilter({ ...beneficiaryFilter, query: event.target.value })}
            />
            <select value={beneficiaryFilter.status} onChange={(event) => setBeneficiaryFilter({ ...beneficiaryFilter, status: event.target.value })}>
              <option value="ALL">All Statuses</option>
              <option value="PENDING">PENDING</option>
              <option value="VERIFIED">VERIFIED</option>
              <option value="BLOCKED">BLOCKED</option>
            </select>
            <select value={beneficiaryFilter.country} onChange={(event) => setBeneficiaryFilter({ ...beneficiaryFilter, country: event.target.value })}>
              <option value="ALL">All Countries</option>
              {countryOptions.map((country) => <option key={country} value={country}>{country}</option>)}
            </select>
          </div>

          <table className="beneficiary-table">
            <thead>
              <tr>
                <th>Beneficiary</th><th>Alias</th><th>IBAN</th><th>Bank Code</th><th>Country</th><th>Risk</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBeneficiaries.map((item) => (
                <tr key={item.beneficiaryId}>
                  <td>{item.name}</td>
                  <td>{item.alias}</td>
                  <td>{item.iban}</td>
                  <td>{item.bankCode}</td>
                  <td>{item.country}</td>
                  <td>{item.riskFlag}</td>
                  <td>{item.verificationStatus}</td>
                  <td className="beneficiary-row-actions">
                    <button type="button" className="ui-btn--secondary" onClick={() => onEditBeneficiary(item)}>Edit</button>
                    <button type="button" className="warn" onClick={() => onQuickStatusChange(item.beneficiaryId, 'PENDING')}>Pending</button>
                    <button type="button" className="ui-btn--secondary" onClick={() => onQuickStatusChange(item.beneficiaryId, 'VERIFIED')}>Verify</button>
                    <button type="button" className="danger" onClick={() => onQuickStatusChange(item.beneficiaryId, 'BLOCKED')}>Block</button>
                    <button type="button" className="danger" onClick={() => onDeleteBeneficiary(item.beneficiaryId)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {isTransferView && (
          <section className="scheduled-panel">
            <h3>Scheduled Transfers</h3>
            <p className="note">Future and recurring transfer templates can be edited or cancelled.</p>
            <table>
              <thead>
                <tr>
                  <th>Transfer ID</th><th>Type</th><th>Schedule</th><th>Date</th><th>Recurrence</th><th>Beneficiary</th><th>Amount</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {scheduledTransfers.length === 0 && (
                  <tr>
                    <td colSpan="9">No scheduled transfers yet.</td>
                  </tr>
                )}
                {scheduledTransfers.map((item) => (
                  <tr key={item.transferId}>
                    <td>{item.transferId}</td>
                    <td>{item.transferType}</td>
                    <td>{item.scheduleMode}</td>
                    <td>{item.scheduledDate || '-'}</td>
                    <td>{item.recurrence || '-'}</td>
                    <td>{item.alias}</td>
                    <td>EUR {Number(item.amount).toFixed(2)}</td>
                    <td>{item.status}</td>
                    <td className="beneficiary-row-actions">
                      <button type="button" className="ui-btn--secondary" onClick={() => onEditScheduledTransfer(item)} disabled={item.status === 'CANCELLED'}>Edit</button>
                      <button type="button" className="danger" onClick={() => onCancelScheduledTransfer(item.transferId)} disabled={item.status === 'CANCELLED'}>Cancel</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        <section className="audit-panel">
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
        </section>
      </main>
    </div>
  );
}
