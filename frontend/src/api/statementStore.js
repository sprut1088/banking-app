const EXPORT_AUDIT_KEY_PREFIX = 'banking-demo-statement-exports-';

function exportKey(customerId) {
  return `${EXPORT_AUDIT_KEY_PREFIX}${customerId}`;
}

function parse(raw) {
  try {
    return JSON.parse(raw);
  } catch (error) {
    return [];
  }
}

function monthKey(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function monthLabel(key) {
  const [year, month] = key.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, 1));
  return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

function categoryFromText(text) {
  const value = String(text || '').toLowerCase();
  if (value.includes('rent') || value.includes('housing')) return 'Housing';
  if (value.includes('utility') || value.includes('energy')) return 'Utilities';
  if (value.includes('salary') || value.includes('income')) return 'Income';
  if (value.includes('card') || value.includes('subscription')) return 'Card';
  if (value.includes('transfer') || value.includes('payment')) return 'Transfer';
  return 'General';
}

function merchantFromText(text) {
  const value = String(text || '').trim();
  if (!value) return 'Unknown';
  const parts = value.split(' ');
  return parts.slice(0, 3).join(' ');
}

function seededEntries(customerId, monthOffset) {
  const yearMonth = new Date();
  yearMonth.setUTCMonth(yearMonth.getUTCMonth() - monthOffset);
  const key = monthKey(yearMonth);

  return [
    {
      id: `${customerId}-${key}-seed-1`,
      source: 'ACCOUNT',
      date: `${key}-05`,
      merchant: 'Payroll Services',
      category: 'Income',
      status: 'SUCCESS',
      direction: 'CREDIT',
      amount: 2450.0,
      reference: `SALARY-${key}`
    },
    {
      id: `${customerId}-${key}-seed-2`,
      source: 'ACCOUNT',
      date: `${key}-09`,
      merchant: 'City Rent Services',
      category: 'Housing',
      status: 'SUCCESS',
      direction: 'DEBIT',
      amount: 980.0,
      reference: `RENT-${key}`
    },
    {
      id: `${customerId}-${key}-seed-3`,
      source: 'CARD',
      date: `${key}-18`,
      merchant: 'Digital Groceries',
      category: 'Card',
      status: 'SUCCESS',
      direction: 'DEBIT',
      amount: 126.4,
      reference: `CARD-${key}`
    }
  ];
}

function normalizeAccountTx(tx, idx) {
  const dateRaw = tx.date || tx.timestamp;
  const safeDate = String(dateRaw || '').slice(0, 10);
  return {
    id: tx.transactionId || `acct-${idx}`,
    source: 'ACCOUNT',
    date: safeDate,
    merchant: merchantFromText(tx.description),
    category: categoryFromText(tx.description),
    status: 'SUCCESS',
    direction: tx.type === 'CREDIT' ? 'CREDIT' : 'DEBIT',
    amount: Number(tx.amount || 0),
    reference: tx.reference || '-'
  };
}

function normalizeCardTx(tx, idx) {
  const dateRaw = tx.timestamp || tx.date;
  const safeDate = String(dateRaw || '').slice(0, 10);
  return {
    id: tx.cardTransactionId || `card-${idx}`,
    source: 'CARD',
    date: safeDate,
    merchant: tx.payeeId || 'Card Merchant',
    category: 'Card',
    status: tx.status || 'SUCCESS',
    direction: 'DEBIT',
    amount: Number(tx.amount || 0),
    reference: tx.reference || '-'
  };
}

export function buildStatementDataset(customerId, accountTransactions, cardTransactions) {
  const accountEntries = (accountTransactions || []).map(normalizeAccountTx);
  const cardEntries = (cardTransactions || []).map(normalizeCardTx);
  const all = [...accountEntries, ...cardEntries];

  const existingMonths = new Set(all.map((item) => item.date.slice(0, 7)).filter(Boolean));
  for (let offset = 0; offset < 6; offset += 1) {
    const d = new Date();
    d.setUTCMonth(d.getUTCMonth() - offset);
    const key = monthKey(d);
    if (!existingMonths.has(key)) {
      all.push(...seededEntries(customerId, offset));
    }
  }

  all.sort((a, b) => (a.date < b.date ? 1 : -1));

  const monthsMap = new Map();
  all.forEach((entry) => {
    const key = entry.date.slice(0, 7);
    if (!monthsMap.has(key)) {
      monthsMap.set(key, {
        monthKey: key,
        monthLabel: monthLabel(key),
        totalDebit: 0,
        totalCredit: 0,
        accountCount: 0,
        cardCount: 0,
        entries: []
      });
    }
    const bucket = monthsMap.get(key);
    if (entry.direction === 'CREDIT') {
      bucket.totalCredit += entry.amount;
    } else {
      bucket.totalDebit += entry.amount;
    }
    if (entry.source === 'ACCOUNT') {
      bucket.accountCount += 1;
    } else {
      bucket.cardCount += 1;
    }
    bucket.entries.push(entry);
  });

  const months = [...monthsMap.values()]
    .sort((a, b) => (a.monthKey < b.monthKey ? 1 : -1))
    .slice(0, 6)
    .map((item) => ({
      ...item,
      totalDebit: Number(item.totalDebit.toFixed(2)),
      totalCredit: Number(item.totalCredit.toFixed(2))
    }));

  return months;
}

export function getExportAudit(customerId) {
  return parse(localStorage.getItem(exportKey(customerId)));
}

export function appendExportAudit(customerId, item) {
  const current = getExportAudit(customerId);
  const next = [
    {
      id: `EXP${Date.now()}`,
      timestamp: new Date().toISOString(),
      ...item
    },
    ...current
  ].slice(0, 50);
  localStorage.setItem(exportKey(customerId), JSON.stringify(next));
  return next;
}

export function buildCsv(entries) {
  const header = 'Date,Source,Merchant,Category,Status,Direction,Amount,Reference';
  const rows = entries.map((item) => [
    item.date,
    item.source,
    item.merchant,
    item.category,
    item.status,
    item.direction,
    item.amount.toFixed(2),
    item.reference
  ].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','));
  return [header, ...rows].join('\n');
}

export function buildPdfMock(monthLabelText, entries) {
  const lines = [
    'Banking Demo Statement',
    `Statement Month: ${monthLabelText}`,
    '--------------------------------------',
    ...entries.map((item) => `${item.date} | ${item.source} | ${item.merchant} | ${item.status} | EUR ${item.amount.toFixed(2)}`)
  ];
  return lines.join('\n');
}
