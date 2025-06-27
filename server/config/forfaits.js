// config/forfaits.js
module.exports = {
  consommateur: {
    BLEU: { dureeJours: 30, maxContacts: 1 },
    GOLD: { dureeJours: 90, maxContacts: 5 },
    PLATINUM: { dureeJours: 180, maxContacts: 9999 },
  },
  agriculteur: {
    BLEU: { dureeJours: 30, maxContacts: 2 },
    GOLD: { dureeJours: 90, maxContacts: 5 },
    PLATINUM: { dureeJours: 180, maxContacts: 9999 },
  },
};
