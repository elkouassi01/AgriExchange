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

// Providers dont le webhook de confirmation est implémenté et peuvent donc
// être sélectionnés comme provider actif pour le checkout. PayDunya et Stripe
// ont un format de notification différent et pas encore de récepteur — les
// activer romprait silencieusement la confirmation de paiement.
const CHECKOUT_CAPABLE = ['cinetpay', 'cinetpay_legacy'];

// Retourne le provider à utiliser pour initier un nouveau paiement : le premier
// provider "checkout capable" activé par l'admin (ordre = position), ou 'cinetpay'
// par défaut si aucun n'est activé.
const getActiveProviderId = async () => {
  const all = await repo.findAll();
  const active = all.find((p) => CHECKOUT_CAPABLE.includes(p.id) && p.enabled);
  return active?.id || 'cinetpay';
};

// Invalide les caches de token (après mise à jour des credentials)
const invalidateCaches = (providerId) => {
  if (providerId === 'cinetpay' || !providerId) {
    require('./providers/cinetpay').invalidateTokenCache?.();
  }
};

module.exports = {
  initPayment, checkPayment, testProvider, getEnabledProviders, invalidateCaches,
  getActiveProviderId, CHECKOUT_CAPABLE,
};
