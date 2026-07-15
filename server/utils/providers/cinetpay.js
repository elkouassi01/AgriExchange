// CinetPay new API adapter via SDK officiel cinetpay-js
// Config fields: api_key, api_password, country, env ('sandbox' | 'production')

const { CinetPayClient, AuthenticationError } = require('cinetpay-js');

let _cache = null;

// La config vient de la table payment_providers (saisie admin). Si elle n'a pas
// encore été renseignée (déploiement existant, ou admin n'a jamais ouvert l'onglet),
// on retombe sur les variables d'environnement — mêmes valeurs que cinetpayService.js —
// pour ne jamais casser les paiements réels en production.
function resolveCfg(cfg = {}) {
  return {
    api_key: cfg.api_key || process.env.CINETPAY_APIKEY,
    api_password: cfg.api_password || process.env.CINETPAY_API_PASSWORD,
    country: cfg.country || process.env.CINETPAY_COUNTRY || 'CI',
    env: cfg.env || process.env.CINETPAY_ENV || 'production',
  };
}

async function getClient(cfgIn) {
  const cfg = resolveCfg(cfgIn);
  const cacheKey = `${cfg.api_key}:${cfg.country}:${cfg.env}`;
  if (_cache && _cache.cfgKey === cacheKey && Date.now() < _cache.expiresAt) {
    return _cache.client;
  }
  const baseUrl = cfg.env === 'sandbox' ? 'https://api.cinetpay.net' : 'https://api.cinetpay.co';
  const client = new CinetPayClient({
    credentials: {
      [cfg.country]: {
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

const initPayment = async (cfgIn, params) => {
  const cfg = resolveCfg(cfgIn);
  const client = await getClient(cfgIn);
  const phone = normalizePhone(params.clientPhone, cfg.country === 'CI' ? '225' : undefined);
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
    country: cfg.country,
  };
  if (phone) payload.clientPhoneNumber = phone;
  const result = await client.payment.initialize(payload, cfg.country);
  return { paymentUrl: result.paymentUrl, raw: result };
};

const checkPayment = async (cfgIn, transactionId) => {
  const cfg = resolveCfg(cfgIn);
  const client = await getClient(cfgIn);
  const result = await client.payment.getStatus(transactionId, cfg.country);
  const accepted = result.status === 'SUCCESS';
  return { accepted, raw: result };
};

const testConnection = async (cfgIn) => {
  try {
    const cfg = resolveCfg(cfgIn);
    invalidateTokenCache();
    const client = await getClient(cfgIn);
    await client.payment.getStatus('TEST_AUTH', cfg.country);
    return { ok: true, message: 'Connexion CinetPay réussie' };
  } catch (e) {
    // TEST_AUTH n'est pas une vraie transaction — une erreur API "normale" (ex: 404
    // Not Found) après ce point signifie que l'authentification a réussi (le SDK a
    // obtenu un token) ; seule une AuthenticationError signifie que les identifiants
    // sont réellement invalides.
    if (e instanceof AuthenticationError) {
      return { ok: false, message: e.message };
    }
    return { ok: true, message: 'Connexion CinetPay réussie' };
  }
};

module.exports = { initPayment, checkPayment, testConnection, invalidateTokenCache };
