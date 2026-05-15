// Nouvelle API CinetPay — credentials configurables via admin (DB) ou .env (fallback)
// Clé sk_live_* → https://api.cinetpay.co  |  sk_test_* → https://api.cinetpay.net

const settings = require('../repositories/mysqlAppSettingsRepository');

// Cache JWT : { token, expiresAt }
let _tokenCache = null;

// Charge les credentials depuis la DB, fallback sur .env
async function getCfg() {
  let apikey, password, country, enabled;
  try {
    const db = await settings.getMany([
      'cinetpay_apikey', 'cinetpay_password', 'cinetpay_country', 'cinetpay_enabled',
    ]);
    apikey   = db.cinetpay_apikey    || process.env.CINETPAY_APIKEY;
    password = db.cinetpay_password  || process.env.CINETPAY_API_PASSWORD;
    country  = db.cinetpay_country   || process.env.CINETPAY_COUNTRY || 'CI';
    enabled  = db.cinetpay_enabled !== 'false'; // true par défaut
  } catch {
    // DB pas encore dispo (premier démarrage) → env vars
    apikey   = process.env.CINETPAY_APIKEY;
    password = process.env.CINETPAY_API_PASSWORD;
    country  = process.env.CINETPAY_COUNTRY || 'CI';
    enabled  = true;
  }
  const baseUrl = apikey?.startsWith('sk_live_')
    ? 'https://api.cinetpay.co'
    : 'https://api.cinetpay.net';
  return { apikey, password, country, baseUrl, enabled };
}

async function getToken() {
  if (_tokenCache && Date.now() < _tokenCache.expiresAt) return _tokenCache.token;

  const { apikey, password, baseUrl } = await getCfg();
  if (!apikey || !password) throw new Error('CinetPay : clé API ou mot de passe non configuré');

  const res = await fetch(`${baseUrl}/v1/oauth/login`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ api_key: apikey, api_password: password }),
  });
  const data = await res.json();
  const token = data.token ?? data.data?.token;
  if (!token) throw new Error(`CinetPay auth échoué : ${JSON.stringify(data)}`);

  _tokenCache = { token, expiresAt: Date.now() + 23 * 60 * 60 * 1000 };
  return token;
}

// Invalide le cache JWT (à appeler quand les credentials changent)
function invalidateTokenCache() {
  _tokenCache = null;
}

async function initPayment({ merchantTransactionId, amount, designation, clientFirstName,
  clientLastName, clientEmail, clientPhone, successUrl, failedUrl, notifyUrl, channel = 'REDIRECT' }) {
  const { country, baseUrl, enabled } = await getCfg();
  if (!enabled) throw new Error('CinetPay : paiements désactivés par l\'administrateur');
  const token = await getToken();

  const res = await fetch(`${baseUrl}/v1/payment`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      currency:                'XOF',
      merchant_transaction_id: merchantTransactionId,
      amount,
      lang:                    'fr',
      designation,
      client_first_name:       clientFirstName,
      client_last_name:        clientLastName,
      client_email:            clientEmail,
      client_phone_number:     clientPhone || '',
      success_url:             successUrl,
      failed_url:              failedUrl,
      notify_url:              notifyUrl,
      channel,
      country,
    }),
  });
  return res.json();
}

async function checkPayment(merchantTransactionId) {
  const { country, baseUrl } = await getCfg();
  const token = await getToken();

  const res = await fetch(`${baseUrl}/v1/payment/check`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body:    JSON.stringify({ merchant_transaction_id: merchantTransactionId, country }),
  });
  return res.json();
}

function isAccepted(result) {
  return result?.data?.status === 'ACCEPTED'
    || result?.status === 'ACCEPTED'
    || result?.code === '00'
    || result?.code === 200;
}

// Teste les credentials fournis sans modifier la config actuelle
async function testCredentials(apikey, password, country = 'CI') {
  const baseUrl = apikey?.startsWith('sk_live_')
    ? 'https://api.cinetpay.co'
    : 'https://api.cinetpay.net';
  const res = await fetch(`${baseUrl}/v1/oauth/login`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ api_key: apikey, api_password: password }),
  });
  const data = await res.json();
  const ok = !!(data.token ?? data.data?.token);
  return { ok, code: data.code, status: data.status, env: apikey?.startsWith('sk_live_') ? 'production' : 'sandbox' };
}

module.exports = { initPayment, checkPayment, isAccepted, getCfg, invalidateTokenCache, testCredentials };
