const AUTH_ACCOUNTS_KEY = 'admin_accounts_v1';
const RESET_REQUESTS_KEY = 'admin_password_resets_v1';
const OTP_EXPIRY_MS = 10 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

const DEMO_ACCOUNTS = [
  { username: 'superadmin', password: 'super123', role: 'superadmin', name: 'Super Admin' },
  { username: 'admin', password: 'admin123', role: 'admin', name: 'Admin User' },
  { username: 'manager', password: 'manager123', role: 'manager', name: 'Store Manager' },
  { username: 'cashier', password: 'cashier123', role: 'cashier', name: 'Cashier' }
];

const loadJson = (key, fallback) => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    return fallback;
  }
};

const saveJson = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const toHex = (buffer) => Array.from(new Uint8Array(buffer))
  .map((byte) => byte.toString(16).padStart(2, '0'))
  .join('');

const createSalt = () => {
  const bytes = new Uint8Array(16);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
};

const sha256 = async (value) => {
  const data = new TextEncoder().encode(value);
  const hash = await window.crypto.subtle.digest('SHA-256', data);
  return toHex(hash);
};

const hashPassword = async (password, salt) => sha256(`${salt}:${password}`);

const createId = () => {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
};

export const ensureDemoAccounts = async () => {
  const existing = loadJson(AUTH_ACCOUNTS_KEY, null);
  if (existing && Object.keys(existing).length) {
    return existing;
  }

  const accounts = {};
  for (const demo of DEMO_ACCOUNTS) {
    const salt = createSalt();
    const passwordHash = await hashPassword(demo.password, salt);
    const username = demo.username.toLowerCase();
    accounts[username] = {
      id: createId(),
      username,
      email: `${username}@miansons.com`,
      name: demo.name,
      role: demo.role,
      passwordHash,
      passwordSalt: salt,
      createdAt: new Date().toISOString()
    };
  }

  saveJson(AUTH_ACCOUNTS_KEY, accounts);
  return accounts;
};

export const getAccountByIdentifier = async (identifier) => {
  const accounts = await ensureDemoAccounts();
  const normalized = identifier.trim().toLowerCase();

  const match = Object.values(accounts).find((account) => (
    account.username === normalized || account.email?.toLowerCase() === normalized
  ));

  return { accounts, account: match || null };
};

export const verifyAccountPassword = async (identifier, password) => {
  const { accounts, account } = await getAccountByIdentifier(identifier);
  if (!account) {
    return { ok: false, reason: 'not_found' };
  }

  if (account.passwordHash && account.passwordSalt) {
    const hash = await hashPassword(password, account.passwordSalt);
    return hash === account.passwordHash
      ? { ok: true, account }
      : { ok: false, reason: 'invalid' };
  }

  if (account.password && account.password === password) {
    const salt = createSalt();
    const passwordHash = await hashPassword(password, salt);
    accounts[account.username] = {
      ...account,
      passwordHash,
      passwordSalt: salt
    };
    delete accounts[account.username].password;
    saveJson(AUTH_ACCOUNTS_KEY, accounts);
    return { ok: true, account: accounts[account.username] };
  }

  return { ok: false, reason: 'invalid' };
};

const loadResetRequests = () => loadJson(RESET_REQUESTS_KEY, {});

export const createPasswordReset = async (identifier) => {
  const { account } = await getAccountByIdentifier(identifier);
  if (!account) {
    return { ok: false, reason: 'not_found' };
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpSalt = createSalt();
  const otpHash = await hashPassword(otp, otpSalt);
  const requestId = createId();

  const requests = loadResetRequests();
  requests[requestId] = {
    id: requestId,
    username: account.username,
    email: account.email,
    otpHash,
    otpSalt,
    createdAt: Date.now(),
    expiresAt: Date.now() + OTP_EXPIRY_MS,
    attempts: 0,
    verified: false
  };

  saveJson(RESET_REQUESTS_KEY, requests);
  return { ok: true, requestId, otp, expiresAt: requests[requestId].expiresAt };
};

export const verifyPasswordResetOtp = async (requestId, otp) => {
  const requests = loadResetRequests();
  const request = requests[requestId];

  if (!request) {
    return { ok: false, reason: 'not_found' };
  }

  if (Date.now() > request.expiresAt) {
    delete requests[requestId];
    saveJson(RESET_REQUESTS_KEY, requests);
    return { ok: false, reason: 'expired' };
  }

  if (request.attempts >= MAX_OTP_ATTEMPTS) {
    delete requests[requestId];
    saveJson(RESET_REQUESTS_KEY, requests);
    return { ok: false, reason: 'locked' };
  }

  const hash = await hashPassword(otp, request.otpSalt);
  if (hash !== request.otpHash) {
    requests[requestId] = { ...request, attempts: request.attempts + 1 };
    saveJson(RESET_REQUESTS_KEY, requests);
    return { ok: false, reason: 'invalid' };
  }

  requests[requestId] = { ...request, verified: true };
  saveJson(RESET_REQUESTS_KEY, requests);
  return { ok: true };
};

export const completePasswordReset = async (requestId, newPassword) => {
  const requests = loadResetRequests();
  const request = requests[requestId];

  if (!request) {
    return { ok: false, reason: 'not_found' };
  }

  if (!request.verified) {
    return { ok: false, reason: 'not_verified' };
  }

  if (Date.now() > request.expiresAt) {
    delete requests[requestId];
    saveJson(RESET_REQUESTS_KEY, requests);
    return { ok: false, reason: 'expired' };
  }

  const accounts = await ensureDemoAccounts();
  const account = accounts[request.username];
  if (!account) {
    delete requests[requestId];
    saveJson(RESET_REQUESTS_KEY, requests);
    return { ok: false, reason: 'not_found' };
  }

  const salt = createSalt();
  const passwordHash = await hashPassword(newPassword, salt);
  accounts[request.username] = {
    ...account,
    passwordHash,
    passwordSalt: salt
  };
  delete accounts[request.username].password;

  saveJson(AUTH_ACCOUNTS_KEY, accounts);
  delete requests[requestId];
  saveJson(RESET_REQUESTS_KEY, requests);
  return { ok: true };
};
