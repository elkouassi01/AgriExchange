// CinetPay v1 via SDK officiel cinetpay-js
// Remplace la gestion manuelle JWT par le SDK (token auto-refresh, validation, logs)
const { CinetPayClient, AuthenticationError, ApiError } = require('cinetpay-js');
const settings = require('../repositories/mysqlAppSettingsRepository');

// Cache du client SDK (token géré en interne par le SDK)
let _clientCache = null;
let _clientCfgHash = '';

function cfgHash(cfg) {
  return `${cfg.apikey}|${cfg.country}|${cfg.baseUrl}`;
}

// NOTE : le préfixe sk_live_/sk_test_ de la clé ne reflète pas toujours l'environnement réel
// du compte marchand CinetPay. On pilote donc l'URL via CINETPAY_ENV explicitement.
async function getCfg() {
  let apikey, password, country, enabled, env;
  try {
    const db = await settings.getMany([
      'cinetpay_apikey', 'cinetpay_password', 'cinetpay_country', 'cinetpay_enabled', 'cinetpay_env',
    ]);
    apikey   = db.cinetpay_apikey    || process.env.CINETPAY_APIKEY;
    password = db.cinetpay_password  || process.env.CINETPAY_API_PASSWORD;
    country  = db.cinetpay_country   || process.env.CINETPAY_COUNTRY || 'CI';
    enabled  = db.cinetpay_enabled !== 'false';
    env      = db.cinetpay_env       || process.env.CINETPAY_ENV || 'production';
  } catch {
    apikey   = process.env.CINETPAY_APIKEY;
    password = process.env.CINETPAY_API_PASSWORD;
    country  = process.env.CINETPAY_COUNTRY || 'CI';
    enabled  = true;
    env      = process.env.CINETPAY_ENV || 'production';
  }
  const baseUrl = env === 'sandbox'
    ? 'https://api.cinetpay.net'
    : 'https://api.cinetpay.co';
  return { apikey, password, country, baseUrl, enabled, env };
}

async function getClient() {
  const cfg = await getCfg();
  const hash = cfgHash(cfg);

  if (_clientCache && _clientCfgHash === hash) {
    return _clientCache;
  }

  if (!cfg.apikey || !cfg.password) {
    throw new Error('CinetPay : clé API ou mot de passe non configuré');
  }

  const client = new CinetPayClient({
    credentials: {
      [cfg.country]: {
        apiKey: cfg.apikey,
        apiPassword: cfg.password,
      },
    },
    baseUrl: cfg.baseUrl,
  });

  _clientCache = client;
  _clientCfgHash = hash;
  return client;
}

// L'API v1 n'accepte que ces 3 canaux (l'ancien "REDIRECT" de la v2 n'existe plus).
// PUSH + paymentUrl/mustBeRedirected reproduit le comportement "page hébergée" de l'ancienne API.
const VALID_CHANNELS = new Set(['PUSH', 'OTP', 'QRCODE']);

// Numéro local (ex: 0700000000) -> format international +225700000000 exigé par l'API.
// Retourne undefined si non normalisable : le champ est alors omis (optionnel côté SDK
// tant que directPay n'est pas utilisé), plutôt que d'envoyer une valeur invalide.
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

async function initPayment({ merchantTransactionId, amount, designation, clientFirstName,
  clientLastName, clientEmail, clientPhone, successUrl, failedUrl, notifyUrl, channel = 'PUSH' }) {
  const cfg = await getCfg();
  if (!cfg.enabled) throw new Error('CinetPay : paiements désactivés par l\'administrateur');

  const client = await getClient();
  const safeChannel = VALID_CHANNELS.has(channel) ? channel : 'PUSH';
  const phone = normalizePhone(clientPhone, cfg.country === 'CI' ? '225' : undefined);

  const payload = {
    currency: 'XOF',
    merchantTransactionId: String(merchantTransactionId).substring(0, 30),
    amount,
    lang: 'fr',
    designation: ensureMinLength(designation, 1, 'Paiement VivriMarket').substring(0, 255),
    clientFirstName: ensureMinLength(clientFirstName, 2, 'Client'),
    clientLastName: ensureMinLength(clientLastName, 2, 'NA'),
    clientEmail: clientEmail || 'guest@vivrimarket.com',
    successUrl,
    failedUrl,
    notifyUrl,
    channel: safeChannel,
    country: cfg.country,
  };
  if (phone) payload.clientPhoneNumber = phone;

  const result = await client.payment.initialize(payload, cfg.country);

  return result;
}

async function checkPayment(merchantTransactionId) {
  const cfg = await getCfg();
  const client = await getClient();
  const result = await client.payment.getStatus(merchantTransactionId, cfg.country);
  return result;
}

function isAccepted(result) {
  return result?.status === 'SUCCESS';
}

function invalidateTokenCache() {
  _clientCache = null;
  _clientCfgHash = '';
}

async function testCredentials(apikey, password, country = 'CI', env = 'production') {
  const baseUrl = env === 'sandbox' ? 'https://api.cinetpay.net' : 'https://api.cinetpay.co';
  const client = new CinetPayClient({
    credentials: {
      [country]: { apiKey: apikey, apiPassword: password },
    },
    baseUrl,
  });

  try {
    await client.payment.getStatus('TEST_AUTH', country);
    return { ok: true, code: 200, status: 'OK', env };
  } catch (e) {
    if (e instanceof AuthenticationError) {
      return { ok: false, code: e.apiCode || 1005, status: e.apiStatus || 'INVALID_CREDENTIALS', message: e.message, env };
    }
    return { ok: true, code: e.apiCode || e.code || 404, status: e.apiStatus || 'OK', env };
  }
}

module.exports = { initPayment, checkPayment, isAccepted, getCfg, invalidateTokenCache, testCredentials };
