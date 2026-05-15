// PayDunya adapter — West Africa payment gateway
// Config fields: master_key, private_key, public_key, token, mode (test|live)

const getBase = (cfg) =>
  cfg.mode === 'live' ? 'https://app.paydunya.com/api/v1' : 'https://app.paydunya.com/sandbox-api/v1';

const getHeaders = (cfg) => ({
  'Content-Type': 'application/json',
  'PAYDUNYA-MASTER-KEY': cfg.master_key || '',
  'PAYDUNYA-PRIVATE-KEY': cfg.private_key || '',
  'PAYDUNYA-PUBLIC-KEY': cfg.public_key || '',
  'PAYDUNYA-TOKEN': cfg.token || '',
});

const initPayment = async (cfg, params) => {
  const res = await fetch(`${getBase(cfg)}/checkout-invoice/create`, {
    method: 'POST',
    headers: getHeaders(cfg),
    body: JSON.stringify({
      invoice: {
        total_amount: params.amount,
        description: params.description,
      },
      store: { name: 'VivriMarket' },
      actions: {
        callback_url: params.notifyUrl,
        return_url: params.successUrl,
        cancel_url: params.failedUrl,
      },
      custom_data: { transaction_id: params.transactionId },
    }),
  });
  const data = await res.json();
  return { paymentUrl: data.response_text === 'success' ? data.checkout_url : null, raw: data };
};

const checkPayment = async (cfg, transactionId) => {
  const res = await fetch(`${getBase(cfg)}/checkout-invoice/confirm/${transactionId}`, {
    method: 'GET',
    headers: getHeaders(cfg),
  });
  const data = await res.json();
  const accepted = data?.status === 'completed';
  return { accepted, raw: data };
};

const testConnection = async (cfg) => {
  try {
    const res = await fetch(`${getBase(cfg)}/checkout-invoice/confirm/TEST`, {
      method: 'GET',
      headers: getHeaders(cfg),
    });
    const data = await res.json();
    // If we get a response (even 404), keys were accepted
    const ok = res.status !== 401 && res.status !== 403;
    return ok
      ? { ok: true, message: 'Connexion PayDunya réussie' }
      : { ok: false, message: `Auth refusée (${res.status})` };
  } catch (e) {
    return { ok: false, message: e.message };
  }
};

module.exports = { initPayment, checkPayment, testConnection };
