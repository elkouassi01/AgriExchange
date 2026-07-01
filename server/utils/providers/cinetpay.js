// CinetPay new API adapter via SDK officiel cinetpay-js
// Config fields: api_key, api_password, country, env ('sandbox' | 'production')

const { CinetPayClient } = require('cinetpay-js');

let _cache = null;

async function getClient(cfg) {
  const cacheKey = `${cfg.api_key}:${cfg.country}:${cfg.env}`;
  if (_cache && _cache.cfgKey === cacheKey && Date.now() < _cache.expiresAt) {
    return _cache.client;
  }
  const baseUrl = cfg.env === 'sandbox' ? 'https://api.cinetpay.net' : 'https://api.cinetpay.co';
  const client = new CinetPayClient({
    credentials: {
      [cfg.country || 'CI']: {
        apiKey: cfg.api_key,
        apiPassword: cfg.api_password,
      },
    },
    baseUrl,
  });
  _cache = { client, cfgKey: cacheKey, expiresAt: Date.now() + 23 * 60 * 60 * 1000 };
  return client;
}

function invalidateTokenCache() { _cache = null; }

// L'API v1 n'accepte que PUSH, OTP, QRCODE (l'ancien "REDIRECT" de la v2 n'existe plus).
function normalizePhone(phone, defaultCallingCode = '225') {
  if (!phone) return undefined;
  let p = String(phone).trim().replace(/[\s().-]/g, '');
  if (p.startsWith('+')) {
    p = '+' + p.slice(1).replace(/\D/g, '');
  } else {
    p = p.replace(/\D/g, '');
    if (p.startsWith('00')) p = p.slice(2);
    if (p.startsWith('0')) p = defaultCallingCode + p.slice(1);
    else if (!p.startsWith(defaultCallingCode)) p = defaultCallingCode + p;
    p = '+' + p;
  }
  return /^\+\d{8,15}$/.test(p) ? p : undefined;
}

function ensureMinLength(str, min, fallback) {
  const s = (str || '').toString().trim();
  return s.length >= min ? s : fallback;
}

const initPayment = async (cfg, params) => {
  const client = await getClient(cfg);
  const phone = normalizePhone(params.clientPhone, (cfg.country || 'CI') === 'CI' ? '225' : undefined);
  const payload = {
    currency: 'XOF',
    merchantTransactionId: String(params.transactionId).substring(0, 30),
    amount: params.amount,
    lang: 'fr',
    designation: ensureMinLength(params.description, 1, 'Paiement VivriMarket').substring(0, 255),
    clientFirstName: ensureMinLength(params.clientFirstName, 2, 'Client'),
    clientLastName: ensureMinLength(params.clientLastName, 2, 'NA'),
    clientEmail: params.clientEmail || 'guest@vivrimarket.com',
    successUrl: params.successUrl,
    failedUrl: params.failedUrl,
    notifyUrl: params.notifyUrl,
    channel: 'PUSH',
    country: cfg.country || 'CI',
  };
  if (phone) payload.clientPhoneNumber = phone;
  const result = await client.payment.initialize(payload, cfg.country || 'CI');
  return { paymentUrl: result.paymentUrl, raw: result };
};

const checkPayment = async (cfg, transactionId) => {
  const client = await getClient(cfg);
  const result = await client.payment.getStatus(transactionId, cfg.country || 'CI');
  const accepted = result.status === 'SUCCESS';
  return { accepted, raw: result };
};

const testConnection = async (cfg) => {
  try {
    invalidateTokenCache();
    const client = await getClient(cfg);
    await client.payment.getStatus('TEST_AUTH', cfg.country || 'CI');
    return { ok: true, message: 'Connexion CinetPay réussie' };
  } catch (e) {
    return { ok: false, message: e.message };
  }
};

module.exports = { initPayment, checkPayment, testConnection, invalidateTokenCache };
