const BENEFICIARY_KEY_PREFIX = 'banking-demo-beneficiaries-';

const COUNTRY_OPTIONS = ['DE', 'NL', 'FR', 'ES', 'IE'];
const RISK_OPTIONS = ['LOW', 'MEDIUM', 'HIGH'];

function key(customerId) {
  return `${BENEFICIARY_KEY_PREFIX}${customerId}`;
}

function safeParse(raw) {
  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

function inferCountry(index) {
  return COUNTRY_OPTIONS[index % COUNTRY_OPTIONS.length];
}

function inferRisk(index) {
  return RISK_OPTIONS[index % RISK_OPTIONS.length];
}

function defaultBeneficiary(payee, index) {
  const seq = String(index + 1).padStart(6, '0');
  return {
    beneficiaryId: payee.payeeId,
    payeeId: payee.payeeId,
    name: payee.name,
    alias: `${payee.name.split(' ')[0]} Main`,
    iban: `DE89370400440532${seq}`,
    accountNumber: `DEMO${seq}`,
    bankCode: `BANK${String((index + 1) * 11).padStart(4, '0')}`,
    country: inferCountry(index),
    riskFlag: inferRisk(index),
    verificationStatus: 'VERIFIED',
    isCustom: false
  };
}

export function getBeneficiaries(customerId, apiPayees) {
  const existing = safeParse(localStorage.getItem(key(customerId)));

  if (!existing || !Array.isArray(existing)) {
    const seeded = apiPayees.map((payee, index) => defaultBeneficiary(payee, index));
    localStorage.setItem(key(customerId), JSON.stringify(seeded));
    return seeded;
  }

  const byPayeeId = new Map(existing.map((item) => [item.payeeId || item.beneficiaryId, item]));

  const mergedBase = apiPayees.map((payee, index) => {
    const found = byPayeeId.get(payee.payeeId);
    return {
      ...defaultBeneficiary(payee, index),
      ...(found || {}),
      beneficiaryId: found?.beneficiaryId || payee.payeeId,
      payeeId: payee.payeeId,
      name: payee.name,
      isCustom: false
    };
  });

  const custom = existing.filter((item) => item.isCustom);
  const merged = [...mergedBase, ...custom];
  localStorage.setItem(key(customerId), JSON.stringify(merged));
  return merged;
}

export function saveBeneficiaries(customerId, items) {
  localStorage.setItem(key(customerId), JSON.stringify(items));
  return items;
}

export function createBeneficiary(customerId, input) {
  const current = getStored(customerId);
  const nextId = `BEN${String(Date.now()).slice(-6)}`;
  const created = {
    beneficiaryId: nextId,
    payeeId: nextId,
    name: input.name,
    alias: input.alias,
    iban: input.iban,
    accountNumber: input.accountNumber,
    bankCode: input.bankCode,
    country: input.country,
    riskFlag: input.riskFlag,
    verificationStatus: input.verificationStatus,
    isCustom: true
  };
  const next = [...current, created];
  saveBeneficiaries(customerId, next);
  return { created, all: next };
}

export function updateBeneficiary(customerId, beneficiaryId, patch) {
  const current = getStored(customerId);
  const next = current.map((item) => (item.beneficiaryId === beneficiaryId ? { ...item, ...patch } : item));
  saveBeneficiaries(customerId, next);
  return next;
}

export function deleteBeneficiary(customerId, beneficiaryId) {
  const current = getStored(customerId);
  const next = current.filter((item) => item.beneficiaryId !== beneficiaryId);
  saveBeneficiaries(customerId, next);
  return next;
}

export function getStored(customerId) {
  const existing = safeParse(localStorage.getItem(key(customerId)));
  if (!existing || !Array.isArray(existing)) {
    return [];
  }
  return existing;
}
