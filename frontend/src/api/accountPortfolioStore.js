const PORTFOLIO_PREFS_PREFIX = 'banking-demo-portfolio-';

function prefsKey(customerId) {
  return `${PORTFOLIO_PREFS_PREFIX}${customerId}`;
}

function hashText(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function createSeries(baseValue, length, volatility, drift) {
  const values = [];
  for (let index = 0; index < length; index += 1) {
    const seasonality = Math.sin((index + 1) * 0.9) * volatility;
    const trendEffect = ((index + 1) / length) * drift;
    const value = Math.max(10, baseValue + seasonality + trendEffect);
    values.push(Number(value.toFixed(2)));
  }
  return values;
}

function trendPercent(series) {
  if (!series.length) {
    return 0;
  }
  const first = series[0];
  const last = series[series.length - 1];
  if (!first) {
    return 0;
  }
  return Number((((last - first) / first) * 100).toFixed(2));
}

function defaultAccounts(customerId, account) {
  const seed = hashText(`${customerId}-${account.accountNumber}`);
  const primaryBalance = Number(account.balance || 0);

  const currentBase = primaryBalance;
  const savingsBase = Math.max(200, primaryBalance * 0.62 + (seed % 300));
  const loanBase = Math.max(700, primaryBalance * 0.41 + 900 + (seed % 220));

  const current7 = createSeries(currentBase, 7, 48, 22);
  const current30 = createSeries(currentBase, 30, 62, 35);
  const savings7 = createSeries(savingsBase, 7, 24, 30);
  const savings30 = createSeries(savingsBase, 30, 38, 70);
  const loan7 = createSeries(loanBase, 7, 14, -22);
  const loan30 = createSeries(loanBase, 30, 20, -85);

  return [
    {
      accountId: 'CURRENT',
      type: 'CURRENT',
      accountNumber: account.accountNumber,
      iban: account.iban,
      currency: account.currency,
      balance: Number(current7[current7.length - 1].toFixed(2)),
      defaultNickname: 'Main Spending',
      history7d: current7,
      history30d: current30,
      trend7d: trendPercent(current7),
      trend30d: trendPercent(current30)
    },
    {
      accountId: 'SAVINGS',
      type: 'SAVINGS',
      accountNumber: `${account.accountNumber.slice(0, 10)}SAV`,
      iban: `${account.iban.slice(0, 18)}SAV`,
      currency: account.currency,
      balance: Number(savings7[savings7.length - 1].toFixed(2)),
      defaultNickname: 'Reserve Pot',
      history7d: savings7,
      history30d: savings30,
      trend7d: trendPercent(savings7),
      trend30d: trendPercent(savings30)
    },
    {
      accountId: 'LOAN',
      type: 'LOAN',
      accountNumber: `${account.accountNumber.slice(0, 9)}LOAN`,
      iban: `${account.iban.slice(0, 17)}LOAN`,
      currency: account.currency,
      balance: Number(loan7[loan7.length - 1].toFixed(2)),
      defaultNickname: 'Home Loan',
      history7d: loan7,
      history30d: loan30,
      trend7d: trendPercent(loan7),
      trend30d: trendPercent(loan30)
    }
  ];
}

function readPrefs(customerId) {
  const raw = localStorage.getItem(prefsKey(customerId));
  if (!raw) {
    return {};
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    return {};
  }
}

export function getAccountPortfolio(customerId, account) {
  const baseAccounts = defaultAccounts(customerId, account);
  const prefs = readPrefs(customerId);

  return baseAccounts.map((item) => ({
    ...item,
    nickname: prefs[item.accountId]?.nickname || item.defaultNickname,
    favorite: Boolean(prefs[item.accountId]?.favorite)
  }));
}

export function saveAccountPortfolioPreferences(customerId, portfolio) {
  const prefs = portfolio.reduce((acc, item) => {
    acc[item.accountId] = {
      nickname: item.nickname || item.defaultNickname,
      favorite: Boolean(item.favorite)
    };
    return acc;
  }, {});

  localStorage.setItem(prefsKey(customerId), JSON.stringify(prefs));
}
