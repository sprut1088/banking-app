const PROFILE_KEY_PREFIX = 'banking-demo-profile-';

function profileKey(customerId) {
  return `${PROFILE_KEY_PREFIX}${customerId}`;
}

function defaultTimeline() {
  return [
    { id: 'doc-1', documentType: 'Passport', status: 'VERIFIED', date: '2026-03-12' },
    { id: 'doc-2', documentType: 'Address Proof', status: 'VERIFIED', date: '2026-03-13' },
    { id: 'doc-3', documentType: 'Sanctions Screening', status: 'CLEARED', date: '2026-03-13' }
  ];
}

function defaultProfile({ customerId, customerName, residencyCountry = 'DE' }) {
  return {
    customerId,
    fullName: customerName || 'Customer',
    kycLevel: 'LEVEL_2',
    riskBand: 'LOW',
    residencyCountry,
    verificationStatus: 'VERIFIED',
    preferredChannel: 'EMAIL',
    email: `${String(customerName || 'customer').toLowerCase().replace(/\s+/g, '.')}@banking.demo`,
    phone: '+49-000-000-0000',
    contactPreferences: {
      email: true,
      sms: false,
      push: true
    },
    documentTimeline: defaultTimeline(),
    updatedAt: new Date().toISOString()
  };
}

export function getCustomerProfile({ customerId, customerName, residencyCountry }) {
  const raw = localStorage.getItem(profileKey(customerId));
  if (!raw) {
    const initial = defaultProfile({ customerId, customerName, residencyCountry });
    localStorage.setItem(profileKey(customerId), JSON.stringify(initial));
    return initial;
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      ...defaultProfile({ customerId, customerName, residencyCountry }),
      ...parsed,
      contactPreferences: {
        ...defaultProfile({ customerId, customerName, residencyCountry }).contactPreferences,
        ...(parsed.contactPreferences || {})
      },
      documentTimeline: parsed.documentTimeline?.length ? parsed.documentTimeline : defaultTimeline()
    };
  } catch (error) {
    const fallback = defaultProfile({ customerId, customerName, residencyCountry });
    localStorage.setItem(profileKey(customerId), JSON.stringify(fallback));
    return fallback;
  }
}

export function saveCustomerProfile(profile) {
  const next = {
    ...profile,
    updatedAt: new Date().toISOString()
  };
  localStorage.setItem(profileKey(profile.customerId), JSON.stringify(next));
  return next;
}

export function getPaymentEligibility(profile) {
  const verificationStatus = profile?.verificationStatus || 'PENDING';
  const riskBand = profile?.riskBand || 'MEDIUM';
  const blocked = verificationStatus === 'BLOCKED';
  const sepaEnabled = verificationStatus === 'VERIFIED' && riskBand !== 'HIGH';

  return {
    instantEnabled: !blocked,
    sepaEnabled,
    canSubmit: !blocked,
    reason: blocked
      ? 'Customer is blocked by KYC policy. Payments and transfers are not eligible.'
      : !sepaEnabled
        ? 'SEPA is disabled until KYC is VERIFIED and risk is not HIGH.'
        : 'Instant and SEPA are eligible for this customer.'
  };
}
