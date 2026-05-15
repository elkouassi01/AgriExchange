// CinetPay new API adapter (sk_live_ / sk_test_ keys)
// Config fields: api_key, api_password, country

let _cache = null;

async function getToken(cfg) {
  if (_cache && Date.now() < _cache.expiresAt) return _cache.token;
  const baseUrl = cfg.api_key?.startsWith('sk_live_') ? 'https://api.cinetpay.co' : 'https://api.cinetpay.net';
  const res = await fetch(`${baseUrl}/v1/oauth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: cfg.api_key, api_password: cfg.api_password }),
  });
  const data = await res.json();
  const token = data.token ?? data.data?.token;
  if (!token) throw new Error(`CinetPay auth failed: ${JSON.stringify(data)}`);
  _cache = { token, expiresAt: Date.now() + 23 * 60 * 60 * 1000 };
  return token;
}

function invalidateCache() { _cache = null; }

const initPayment = async (cfg, params) => {
  const baseUrl = cfg.api_key?.startsWith('sk_live_') ? 'https://api.cinetpay.co' : 'https://api.cinetpay.net';
  const token = await getToken(cfg);
  const res = await fetch(`${baseUrl}/v1/payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      currency: 'XOF',
      merchant_transaction_id: params.transactionId,
      amount: params.amount,
      lang: 'fr',
      designation: params.description,
      client_first_name: params.clientFirstName || 'Client',
      client_last_name: params.clientLastName || '-',
      client_email: params.clientEmail || 'guest@vivrimarket.com',
      client_phone_number: params.clientPhone || '',
      success_url: params.successUrl,
      failed_url: params.failedUrl,
      notify_url: params.notifyUrl,
      channel: 'REDIRECT',
      country: cfg.country || 'CI',
    }),
  });
  const data = await res.json();
  return { paymentUrl: data.payment_url, raw: data };
};

const checkPayment = async (cfg, transactionId) => {
  const baseUrl = cfg.api_key?.startsWith('sk_live_') ? 'https://api.cinetpay.co' : 'https://api.cinetpay.net';
  const token = await getToken(cfg);
  const res = await fetch(`${baseUrl}/v1/payment/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ merchant_transaction_id: transactionId, country: cfg.country || 'CI' }),
  });
  const data = await res.json();
  const accepted = data?.data?.status === 'ACCEPTED' || data?.status === 'ACCEPTED' || data?.code === '00';
  return { accepted, raw: data };
};

const testConnection = async (cfg) => {
  try {
    invalidateCache();
    await getToken(cfg);
    return { ok: true, message: 'Connexion CinetPay réussie' };
  } catch (e) {
    return { ok: false, message: e.message };
  }
};

module.exports = { initPayment, checkPayment, testConnection, invalidateCache };
