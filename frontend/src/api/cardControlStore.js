const CARD_CONTROL_KEY_PREFIX = 'banking-demo-card-controls-';

function key(customerId) {
  return `${CARD_CONTROL_KEY_PREFIX}${customerId}`;
}

function maskVirtualCard(index) {
  const suffix = String(1000 + index).slice(-4);
  return `**** **** **** ${suffix}`;
}

function defaultState(card) {
  return {
    lockStatus: 'UNLOCKED',
    channels: {
      ATM: true,
      ECOMMERCE: true,
      POS: true
    },
    limits: {
      daily: Number((card?.creditLimit || 1000) * 0.35).toFixed(2),
      weekly: Number((card?.creditLimit || 1000) * 0.65).toFixed(2),
      monthly: Number((card?.creditLimit || 1000) * 1.0).toFixed(2)
    },
    spent: {
      daily: 0,
      weekly: 0,
      monthly: 0
    },
    virtualCards: [],
    auditTrail: []
  };
}

function parse(raw) {
  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

function withDefaults(state, card) {
  const baseline = defaultState(card);
  return {
    ...baseline,
    ...(state || {}),
    channels: {
      ...baseline.channels,
      ...(state?.channels || {})
    },
    limits: {
      ...baseline.limits,
      ...(state?.limits || {})
    },
    spent: {
      ...baseline.spent,
      ...(state?.spent || {})
    },
    virtualCards: Array.isArray(state?.virtualCards) ? state.virtualCards : [],
    auditTrail: Array.isArray(state?.auditTrail) ? state.auditTrail : []
  };
}

function save(customerId, state) {
  localStorage.setItem(key(customerId), JSON.stringify(state));
  return state;
}

function appendAudit(state, action, payload) {
  const next = {
    ...state,
    auditTrail: [
      {
        id: `AUD${Date.now()}`,
        timestamp: new Date().toISOString(),
        action,
        payload
      },
      ...state.auditTrail
    ].slice(0, 60)
  };
  return next;
}

export function getCardControlState(customerId, card) {
  const parsed = parse(localStorage.getItem(key(customerId)));
  const state = withDefaults(parsed, card);
  if (!parsed) {
    save(customerId, state);
  }
  return state;
}

export function setCardLockStatus(customerId, card, lockStatus) {
  const current = getCardControlState(customerId, card);
  const next = appendAudit({ ...current, lockStatus }, 'LOCK_STATUS_CHANGED', { lockStatus });
  save(customerId, next);
  return next;
}

export function setCardChannel(customerId, card, channel, enabled) {
  const current = getCardControlState(customerId, card);
  const next = appendAudit({
    ...current,
    channels: { ...current.channels, [channel]: enabled }
  }, 'CHANNEL_UPDATED', { channel, enabled });
  save(customerId, next);
  return next;
}

export function setCardLimits(customerId, card, limits) {
  const current = getCardControlState(customerId, card);
  const next = appendAudit({
    ...current,
    limits: {
      daily: Number(limits.daily || 0).toFixed(2),
      weekly: Number(limits.weekly || 0).toFixed(2),
      monthly: Number(limits.monthly || 0).toFixed(2)
    }
  }, 'LIMITS_UPDATED', limits);
  save(customerId, next);
  return next;
}

export function createVirtualCard(customerId, card) {
  const current = getCardControlState(customerId, card);
  const nextCard = {
    id: `VC${Date.now()}`,
    maskedNumber: maskVirtualCard(current.virtualCards.length + 1),
    status: 'ACTIVE',
    createdAt: new Date().toISOString()
  };
  const next = appendAudit({
    ...current,
    virtualCards: [nextCard, ...current.virtualCards]
  }, 'VIRTUAL_CARD_CREATED', { virtualCardId: nextCard.id });
  save(customerId, next);
  return next;
}

export function deleteVirtualCard(customerId, card, virtualCardId) {
  const current = getCardControlState(customerId, card);
  const next = appendAudit({
    ...current,
    virtualCards: current.virtualCards.filter((item) => item.id !== virtualCardId)
  }, 'VIRTUAL_CARD_DELETED', { virtualCardId });
  save(customerId, next);
  return next;
}

export function evaluateCardAuthorization(controlState, amount, channel) {
  if (controlState.lockStatus === 'LOCKED') {
    return { allowed: false, reason: 'Card is locked.' };
  }

  if (!controlState.channels[channel]) {
    return { allowed: false, reason: `${channel} channel is disabled.` };
  }

  const numericAmount = Number(amount || 0);
  if (numericAmount <= 0) {
    return { allowed: false, reason: 'Amount must be greater than zero.' };
  }

  const checks = [
    { period: 'daily', next: controlState.spent.daily + numericAmount, limit: Number(controlState.limits.daily) },
    { period: 'weekly', next: controlState.spent.weekly + numericAmount, limit: Number(controlState.limits.weekly) },
    { period: 'monthly', next: controlState.spent.monthly + numericAmount, limit: Number(controlState.limits.monthly) }
  ];

  const violated = checks.find((item) => item.next > item.limit);
  if (violated) {
    return {
      allowed: false,
      reason: `${violated.period.toUpperCase()} limit exceeded (${violated.next.toFixed(2)} > ${violated.limit.toFixed(2)}).`
    };
  }

  return { allowed: true, reason: 'Authorization passed.' };
}

export function registerCardSpend(customerId, card, amount, channel) {
  const current = getCardControlState(customerId, card);
  const numericAmount = Number(amount || 0);
  const next = appendAudit({
    ...current,
    spent: {
      daily: Number((current.spent.daily + numericAmount).toFixed(2)),
      weekly: Number((current.spent.weekly + numericAmount).toFixed(2)),
      monthly: Number((current.spent.monthly + numericAmount).toFixed(2))
    }
  }, 'CARD_AUTHORIZATION_APPLIED', { amount: numericAmount, channel });
  save(customerId, next);
  return next;
}
