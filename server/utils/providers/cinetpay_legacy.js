// CinetPay legacy API adapter (numeric apikey + site_id)
// Config fields: apikey, site_id

const BASE = 'https://api-checkout.cinetpay.com/v2';

const initPayment = async (cfg, params) => {
  const res = await fetch(`${BASE}/payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apikey: cfg.apikey,
      site_id: cfg.site_id,
      transaction_id: params.transactionId,
      amount: params.amount,
      currency: 'XOF',
      description: params.description,
      customer_name: `${params.clientFirstName || ''} ${params.clientLastName || ''}`.trim() || 'Client',
      customer_email: params.clientEmail || 'guest@vivrimarket.com',
      customer_phone_number: params.clientPhone || '',
      notify_url: params.notifyUrl,
      return_url: params.successUrl,
      cancel_url: params.failedUrl,
      channels: 'ALL',
      lang: 'fr',
    }),
  });
  const data = await res.json();
  const paymentUrl = data.data?.payment_url;
  return { paymentUrl, raw: data };
};

const checkPayment = async (cfg, transactionId) => {
  const res = await fetch(`${BASE}/payment/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apikey: cfg.apikey, site_id: cfg.site_id, transaction_id: transactionId }),
  });
  const data = await res.json();
  const accepted = data?.data?.status === 'ACCEPTED' || data?.code === '00';
  return { accepted, raw: data };
};

const testConnection = async (cfg) => {
  try {
    const res = await fetch(`${BASE}/payment/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apikey: cfg.apikey, site_id: cfg.site_id, transaction_id: 'TEST' }),
    });
    const data = await res.json();
    // Codes 600/623/624 = auth OK but tx not found (expected for TEST)
    const authOk = ['600', '623', '624', '00', '201'].includes(String(data?.code));
    return authOk
      ? { ok: true, message: 'Connexion CinetPay Legacy réussie' }
      : { ok: false, message: `Code: ${data?.code} — ${data?.message || ''}` };
  } catch (e) {
    return { ok: false, message: e.message };
  }
};

module.exports = { initPayment, checkPayment, testConnection };
