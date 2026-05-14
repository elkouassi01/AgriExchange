const express = require('express');
const router = express.Router();
const mysqlUserRepository = require('../repositories/mysqlUserRepository');
const mysqlProductRepository = require('../repositories/mysqlProductRepository');
const { isMysql } = require('../utils/authHelpers');
const subscriptionQuotas = { BLEU: 1, GOLD: 5, PLATINUM: Infinity };

router.get(
  '/products/:productId/can-access',
  async (req, res) => {
    try {
      const userId = req.user.id || req.user._id;

      const user = isMysql()
        ? await mysqlUserRepository.findUserById(userId)
        : null;

      if (!user) {
        return res.status(401).json({ message: "Utilisateur non trouvé" });
      }

      if (user.role !== 'consommateur') {
        return res.status(403).json({ message: "Accès réservé aux consommateurs" });
      }

      const abonnement = isMysql()
        ? await mysqlUserRepository.getActiveSubscriptionForUser(userId)
        : null;

      if (!abonnement || abonnement.statut !== 'actif') {
        return res.status(403).json({ message: "Abonnement inactif ou inexistant" });
      }

      const formule = abonnement.formule;
      const quotaTotal = subscriptionQuotas[formule] || 0;

      const vuesUtilisees = isMysql()
        ? await mysqlUserRepository.countMonthlyViews(userId)
        : 0;

      if (quotaTotal !== Infinity && vuesUtilisees >= quotaTotal) {
        return res.status(403).json({
          message: "Vous avez atteint votre limite mensuelle de consultations de denrées.",
          quotaTotal,
          vuesUtilisees,
        });
      }

      await mysqlUserRepository.createProductView(userId, req.params.productId);

      return res.json({
        accessGranted: true,
        vuesRestantes: quotaTotal === Infinity ? Infinity : quotaTotal - vuesUtilisees - 1,
      });
    } catch (err) {
      console.error("Erreur vérification accès produit :", err);
      return res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

module.exports = router;