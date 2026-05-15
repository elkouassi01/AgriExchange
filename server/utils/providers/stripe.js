// Stripe adapter
// Config fields: secret_key, publishable_key, webhook_secret, currency (default XOF)
// Note: Stripe doesn't support XOF natively — use EUR or USD for international payments

const initPayment = async (cfg, params) => {
  const currency = cfg.currency || 'eur';
  const amount = currency === 'xof'
    ? params.amount  // XOF: no conversion needed but Stripe may not support
    : Math.round(params.amount / 655.957); // Convert FCFA → EUR (approximate)

  const body = new URLSearchParams({
    'payment_method_types[]': 'card',
    'line_items[0][price_data][currency]': currency,
    'line_items[0][price_data][unit_amount]': String(amount * 100),
    'line_items[0][price_data][product_data][name]': params.description,
    'line_items[0][quantity]': '1',
    mode: 'payment',
    success_url: `${params.successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: params.failedUrl,
    'metadata[transaction_id]': params.transactionId,
    'customer_email': params.clientEmail || '',
  });

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${cfg.secret_key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });
  const data = await res.json();
  return { paymentUrl: data.url, raw: data };
};

const checkPayment = async (cfg, transactionId) => {
  // Search by metadata.transaction_id
  const res = await fetch(
    `https://api.stripe.com/v1/checkout/sessions?metadata[transaction_id]=${transactionId}&limit=1`,
    { headers: { Authorization: `Bearer ${cfg.secret_key}` } }
  );
  const data = await res.json();
  const session = data.data?.[0];
  const accepted = session?.payment_status === 'paid';
  return { accepted, raw: data };
};

const testConnection = async (cfg) => {
  try {
    const res = await fetch('https://api.stripe.com/v1/balance', {
      headers: { Authorization: `Bearer ${cfg.secret_key}` },
    });
    const data = await res.json();
    const ok = !data.error;
    return ok
      ? { ok: true, message: `Stripe connecté (${cfg.secret_key?.startsWith('sk_live_') ? 'production' : 'test'})` }
      : { ok: false, message: data.error?.message || 'Clé Stripe invalide' };
  } catch (e) {
    return { ok: false, message: e.message };
  }
};

module.exports = { initPayment, checkPayment, testConnection };
