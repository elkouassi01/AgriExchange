// Central payment service — dispatches to the configured provider
const repo = require('../repositories/mysqlPaymentProviderRepository');

const ADAPTERS = {
  cinetpay:        require('./providers/cinetpay'),
  cinetpay_legacy: require('./providers/cinetpay_legacy'),
  paydunya:        require('./providers/paydunya'),
  stripe:          require('./providers/stripe'),
};

function getAdapter(providerId) {
  const adapter = ADAPTERS[providerId];
  if (!adapter) throw new Error(`Provider inconnu : ${providerId}`);
  return adapter;
}

// Initialise un paiement — retourne { paymentUrl, transactionId }
const initPayment = async (providerId, params) => {
  const provider = await repo.findById(providerId);
  if (!provider?.enabled) throw new Error(`Provider "${providerId}" non activé`);
  const adapter = getAdapter(providerId);
  return adapter.initPayment(provider.config, params);
};

// Vérifie le statut d'un paiement
const checkPayment = async (providerId, transactionId) => {
  const provider = await repo.findById(providerId);
  if (!provider) throw new Error(`Provider "${providerId}" introuvable`);
  const adapter = getAdapter(providerId);
  return adapter.checkPayment(provider.config, transactionId);
};

// Teste la connexion avec les credentials en DB (ou fournis directement)
const testProvider = async (providerId, overrideConfig = null) => {
  const adapter = getAdapter(providerId);
  const cfg = overrideConfig || (await repo.findById(providerId))?.config || {};
  return adapter.testConnection(cfg);
};

// Retourne les providers actifs (pour le frontend)
const getEnabledProviders = async () => {
  const all = await repo.findAll();
  return all.filter((p) => p.enabled).map((p) => ({
    id: p.id, label: p.label, icon: p.icon, description: p.description,
  }));
};

// Invalide les caches de token (après mise à jour des credentials)
const invalidateCaches = (providerId) => {
  if (providerId === 'cinetpay' || !providerId) {
    require('./providers/cinetpay').invalidateCache?.();
  }
};

module.exports = { initPayment, checkPayment, testProvider, getEnabledProviders, invalidateCaches };
