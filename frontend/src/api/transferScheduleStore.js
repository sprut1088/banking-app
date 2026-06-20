const TRANSFER_KEY_PREFIX = 'banking-demo-scheduled-transfers-';

function key(customerId) {
  return `${TRANSFER_KEY_PREFIX}${customerId}`;
}

function parse(raw) {
  try {
    return JSON.parse(raw);
  } catch (error) {
    return [];
  }
}

export function getScheduledTransfers(customerId) {
  const value = localStorage.getItem(key(customerId));
  if (!value) {
    return [];
  }
  const items = parse(value);
  if (!Array.isArray(items)) {
    return [];
  }
  return items;
}

export function saveScheduledTransfers(customerId, items) {
  localStorage.setItem(key(customerId), JSON.stringify(items));
  return items;
}

export function upsertScheduledTransfer(customerId, transfer) {
  const current = getScheduledTransfers(customerId);
  if (transfer.transferId) {
    const next = current.map((item) => (item.transferId === transfer.transferId ? { ...item, ...transfer } : item));
    saveScheduledTransfers(customerId, next);
    return next;
  }

  const created = {
    ...transfer,
    transferId: `TRF${String(Date.now()).slice(-7)}`,
    status: 'SCHEDULED',
    createdAt: new Date().toISOString()
  };

  const next = [created, ...current];
  saveScheduledTransfers(customerId, next);
  return next;
}

export function cancelScheduledTransfer(customerId, transferId) {
  const current = getScheduledTransfers(customerId);
  const next = current.map((item) => (item.transferId === transferId ? { ...item, status: 'CANCELLED' } : item));
  saveScheduledTransfers(customerId, next);
  return next;
}
